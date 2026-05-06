/**
 * Authentication service - magic link issuance and verification.
 *
 * Implements:
 *   - issueMagicLink(email): generate + store + email a magic link token (returns whether Resend accepted the send)
 *   - invalidatePriorTokens(artistId): mark all unused tokens as used
 *   - verifyMagicLink(rawToken): validate token, create session, return SessionData
 *
 * Requirements: 2.3, 2.5, 2.6, 2.7, 12.1, 12.2, 12.3, 12.4, 12.5
 */

import crypto from "crypto";
import { getDb } from "./db";
import { sendResendEmail } from "@/lib/resend-email";
import { buildEncryptedArtistPiiPayload, decryptArtistStoredContact } from "@/lib/artist-pii";
import {
  getPortalNameForEmail,
  transactionalEmailHtml,
  transactionalEmailPlainText,
} from "@/lib/email-templates";
import { emailLookupHash, normalizeEmailForLookup } from "@/lib/pii-crypto";
import { logSafeError } from "@/lib/safe-log";

// ---------------------------------------------------------------------------
// AuthError
// ---------------------------------------------------------------------------

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "LINK_INVALID"
      | "LINK_USED"
      | "LINK_EXPIRED"
      | "SESSION_EXPIRED"
      | "ACCOUNT_SUSPENDED",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------------
// SessionData
// ---------------------------------------------------------------------------

export interface SessionData {
  sessionId: string;
  artistId: string;
  role: "artist" | "admin";
  expiresAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function randomHex(bytes: number): string {
  return crypto.randomBytes(bytes).toString("hex");
}

function isAdminEmail(email: string): boolean {
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

async function findArtistByLoginEmail(email: string) {
  const normalized = normalizeEmailForLookup(email);
  const lookup = emailLookupHash(normalized);
  const db = getDb();
  return (
    (await db.artist.findUnique({ where: { emailLookupHash: lookup } })) ??
    (await db.artist.findFirst({
      where: {
        OR: [{ email: normalized }, { email: email.trim() }],
        emailLookupHash: null,
      },
    }))
  );
}

function slugifyArtistName(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "artist";
}

async function generateArtistSlug(fullName: string): Promise<string> {
  const base = slugifyArtistName(fullName);
  const db = getDb();
  const existing = await db.artist.findUnique({ where: { slug: base } });
  if (!existing) return base;

  for (let i = 1; i <= 999; i++) {
    const candidate = `${base}-${i}`;
    const conflict = await db.artist.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function deriveSystemAdminDisplayName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const humanized = local.replace(/[^a-z0-9]+/gi, " ").trim();
  if (!humanized || humanized.replace(/\s+/g, "").toLowerCase() === "noreply") {
    return "Portal Admin";
  }
  return humanized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function inferSystemAdminProvince(): Promise<string> {
  const seed = await getDb().artist.findFirst({
    where: { isSystemAccount: false },
    orderBy: { createdAt: "asc" },
    select: { province: true },
  });
  return seed?.province?.trim() || "System";
}

async function ensureAdminArtistForEmail(email: string) {
  const normalized = normalizeEmailForLookup(email);
  const existing = await findArtistByLoginEmail(normalized);
  if (existing) return existing;

  const artistId = crypto.randomUUID();
  const fullName = deriveSystemAdminDisplayName(normalized);
  const slug = await generateArtistSlug(`admin ${fullName}`);
  const pii = buildEncryptedArtistPiiPayload(artistId, normalized, "");
  const province = await inferSystemAdminProvince();

  try {
    return await getDb().artist.create({
      data: {
        id: artistId,
        slug,
        fullName,
        email: pii.emailPlaceholder,
        contactNumber: null,
        emailCipher: pii.emailCipher,
        emailLookupHash: pii.emailLookupHash,
        contactCipher: null,
        province,
        openToCollab: false,
        emailVisibility: "PRIVATE",
        contactVisibility: "PRIVATE",
        isSystemAccount: true,
      },
    });
  } catch {
    return findArtistByLoginEmail(normalized);
  }
}

// ---------------------------------------------------------------------------
// Task 5.1 - issueMagicLink & invalidatePriorTokens
// ---------------------------------------------------------------------------

/**
 * Invalidates all unused (usedAt IS NULL, expiresAt > now) tokens for an artist
 * by setting usedAt = now.
 *
 * @param artistId - The artist's ID.
 * @param _now - Optional "current time" override (used in tests).
 */
export async function invalidatePriorTokens(artistId: string, _now?: Date): Promise<void> {
  const now = _now ?? new Date();
  await getDb().magicLinkToken.updateMany({
    where: {
      artistId,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: {
      usedAt: now,
    },
  });
}

/**
 * Issues a magic link to the artist's email.
 * Silently returns if the email is not found (don't reveal whether email exists).
 * Invalidates all prior unused tokens first.
 *
 * @param email - The artist's email address.
 * @param _now - Optional "current time" override (used in tests).
 */
export type IssueMagicLinkResult =
  | { emailSent: true }
  | { emailSent: false; reason: "artist_not_found" | "resend_not_configured" | "send_failed" };

/** `admin_login_only`: shorter copy when an admin emails a link for an already-onboarded artist (not framed as a new approval). */
export type IssueMagicLinkOptions = {
  emailStyle?: "default" | "admin_login_only";
};

export async function issueMagicLink(
  email: string,
  _now?: Date,
  options?: IssueMagicLinkOptions,
): Promise<IssueMagicLinkResult> {
  const normalized = normalizeEmailForLookup(email);
  let artist = await findArtistByLoginEmail(normalized);
  if (!artist && isAdminEmail(normalized)) {
    artist = await ensureAdminArtistForEmail(normalized);
  }
  if (!artist) return { emailSent: false, reason: "artist_not_found" };

  const now = _now ?? new Date();

  // Invalidate all prior unused tokens
  await invalidatePriorTokens(artist.id, now);

  // Generate a cryptographically random 32-byte token
  const rawToken = randomHex(32);
  const tokenHash = sha256(rawToken);

  // Store the MagicLinkToken record (expiresAt = now + 72 hours)
  const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

  await getDb().magicLinkToken.create({
    data: {
      artistId: artist.id,
      tokenHash,
      expiresAt,
    },
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL ?? "noreply@artist-discovery.example";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const magicLinkUrl = `${appUrl}/auth/verify?token=${rawToken}`;

  const deliverTo = decryptArtistStoredContact(artist).email || normalized;

  // Skip send if not configured; MagicLinkToken row still exists for DB-level testing.
  // Never log raw tokens or magic URLs - secrets belong in DB rows only.
  // The login route always returns generic success, so this does not leak to the client.
  if (!resendApiKey) {
    console.warn("[auth] RESEND_API_KEY is not set - magic link email was not sent");
    return { emailSent: false, reason: "resend_not_configured" };
  }

  try {
    const portal = getPortalNameForEmail();
    const emailStyle = options?.emailStyle ?? "default";
    const magicContent =
      emailStyle === "admin_login_only"
        ? {
            title: `Sign in to ${portal}`,
            paragraphs: [
              "An administrator sent you this link so you can access your account.",
              "The button below opens the sign-in page. This link works once and expires in 72 hours.",
            ],
            primaryCta: { href: magicLinkUrl, label: "Sign in" },
            footnote: "If you did not expect this message, you can ignore it.",
          }
        : {
            title: `Sign in to ${portal}`,
            paragraphs: [
              `Use the button below to open the sign-in page, then tap Continue to finish. Some mail apps preview links in the background and can use the link up early - if that happens, request a new link from the login page.`,
              `For your security, each link works once and expires in 72 hours.`,
            ],
            primaryCta: { href: magicLinkUrl, label: "Open sign-in page" },
            footnote: "If you did not request this email, you can ignore it.",
          };
    const subject =
      emailStyle === "admin_login_only" ? `Sign in · ${portal}` : `Your sign-in link · ${portal}`;
    await sendResendEmail({
      apiKey: resendApiKey,
      from: fromEmail,
      to: deliverTo,
      subject,
      html: transactionalEmailHtml(magicContent),
      text: transactionalEmailPlainText(magicContent),
    });
    return { emailSent: true };
  } catch (err) {
    // Do not rethrow: we must not reveal send failures to the client,
    // and an unverified domain / bad API key should not turn the login
    // route into a 500. Log for operators (Resend errors may mention recipient - redacted).
    logSafeError("[auth] Failed to send magic link via Resend", err, {
      artistId: artist.id,
      resendFromConfigured: Boolean(fromEmail),
    });
    return { emailSent: false, reason: "send_failed" };
  }
}

// ---------------------------------------------------------------------------
// Task 5.2 - verifyMagicLink
// ---------------------------------------------------------------------------

export type MagicLinkTokenStatus =
  | { ok: true }
  | { ok: false; code: "LINK_INVALID" | "LINK_USED" | "LINK_EXPIRED" };

/**
 * Read-only check: does not consume the token. Used by the /auth/verify landing page
 * so email clients that prefetch GET requests cannot invalidate the link before the
 * user submits the confirmation form (POST).
 */
export async function getMagicLinkTokenStatus(
  rawToken: string,
  _now?: Date,
): Promise<MagicLinkTokenStatus> {
  const tokenHash = sha256(rawToken);
  const tokenRecord = await getDb().magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!tokenRecord) {
    return { ok: false, code: "LINK_INVALID" };
  }
  if (tokenRecord.usedAt !== null) {
    return { ok: false, code: "LINK_USED" };
  }
  const now = _now ?? new Date();
  if (tokenRecord.expiresAt < now) {
    return { ok: false, code: "LINK_EXPIRED" };
  }
  return { ok: true };
}

/**
 * Verifies a raw magic link token.
 * Returns SessionData on success.
 * Throws AuthError with appropriate code on failure.
 *
 * @param rawToken - The raw (unhashed) token from the magic link URL.
 * @param _now - Optional "current time" override (used in tests).
 */
export async function verifyMagicLink(rawToken: string, _now?: Date): Promise<SessionData> {
  const tokenHash = sha256(rawToken);

  // Look up the MagicLinkToken by hash
  const tokenRecord = await getDb().magicLinkToken.findUnique({
    where: { tokenHash },
    include: { artist: true },
  });

  if (!tokenRecord) {
    throw new AuthError("LINK_INVALID", "Magic link token is invalid.");
  }

  if (tokenRecord.usedAt !== null) {
    throw new AuthError("LINK_USED", "Magic link token has already been used.");
  }

  const now = _now ?? new Date();
  if (tokenRecord.expiresAt < now) {
    throw new AuthError("LINK_EXPIRED", "Magic link token has expired.");
  }

  // Mark token as used
  await getDb().magicLinkToken.update({
    where: { tokenHash },
    data: { usedAt: now },
  });

  const artist = tokenRecord.artist;
  const loginEmail = decryptArtistStoredContact(artist).email;
  const role: "artist" | "admin" = isAdminEmail(loginEmail) ? "admin" : "artist";

  // Generate a cryptographically random session token
  const rawSessionToken = randomHex(32);
  const sessionTokenHash = sha256(rawSessionToken);

  // Session expires in 30 days
  const sessionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Create Session record
  await getDb().session.create({
    data: {
      artistId: artist.id,
      sessionTokenHash,
      role,
      expiresAt: sessionExpiresAt,
      lastActiveAt: now,
    },
  });

  return {
    sessionId: rawSessionToken, // client stores this in a cookie
    artistId: artist.id,
    role,
    expiresAt: sessionExpiresAt,
  };
}
