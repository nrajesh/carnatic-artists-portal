import { issueMagicLink } from "@/lib/auth";
import { decryptArtistStoredContact } from "@/lib/artist-pii";
import { getDb } from "@/lib/db";

export type SendLoginLinkToArtistResult =
  | { ok: true; magicLinkEmailSent: boolean }
  | { ok: false; error: "NOT_FOUND" | "NO_EMAIL" };

/**
 * Admin-only helper: sends a fresh sign-in link for an existing artist account.
 */
export async function sendLoginLinkToArtist(
  artistIdOrSlug: string,
): Promise<SendLoginLinkToArtistResult> {
  const artist = await getDb().artist.findFirst({
    where: {
      OR: [{ id: artistIdOrSlug }, { slug: artistIdOrSlug }],
    },
    select: {
      email: true,
      emailCipher: true,
      contactNumber: true,
      contactCipher: true,
    },
  });

  if (!artist) return { ok: false, error: "NOT_FOUND" };

  const email = decryptArtistStoredContact(artist).email.trim();
  if (!email) return { ok: false, error: "NO_EMAIL" };

  const magicLinkResult = await issueMagicLink(email, undefined, {
    emailStyle: "admin_login_only",
  });
  return { ok: true, magicLinkEmailSent: magicLinkResult.emailSent };
}
