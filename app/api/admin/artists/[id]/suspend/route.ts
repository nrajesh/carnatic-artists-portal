/**
 * POST /api/admin/artists/[id]/suspend
 * Admin-only. Persists isSuspended and records analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { decryptArtistStoredContact } from "@/lib/artist-pii";
import { getDb } from "@/lib/db";
import { sendSuspensionNoticeEmail } from "@/lib/suspension-email";
import { suspensionThreadPayloadFromAdminNote } from "@/lib/suspension-thread";
import { verifySession } from "@/lib/session-jwt";
import { analyticsServer } from "@/lib/analytics-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  let body: { suspended?: boolean; comment?: unknown };
  try {
    body = (await request.json()) as { suspended?: boolean; comment?: unknown };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const commentRaw = typeof body.comment === "string" ? body.comment.trim() : "";
  if (body.suspended && commentRaw.length === 0) {
    return NextResponse.json({ error: "COMMENT_REQUIRED" }, { status: 400 });
  }
  if (commentRaw.length > 2000) {
    return NextResponse.json({ error: "COMMENT_TOO_LONG" }, { status: 400 });
  }

  const target = await getDb().artist.findUnique({
    where: { id },
    select: {
      id: true,
      isSuspended: true,
      email: true,
      emailCipher: true,
      contactCipher: true,
      contactNumber: true,
    },
  });
  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Never let an admin suspend their own account from the API
  if (body.suspended && id === session.artistId) {
    return NextResponse.json({ error: "CANNOT_SUSPEND_SELF" }, { status: 400 });
  }

  const wasSuspended = target.isSuspended;
  const becomesSuspended = body.suspended && !wasSuspended;

  await getDb().artist.update({
    where: { id },
    data: {
      isSuspended: body.suspended,
      suspensionComment: body.suspended ? commentRaw : null,
      suspensionThread: body.suspended ? suspensionThreadPayloadFromAdminNote(commentRaw) : null,
    },
  });

  if (becomesSuspended) {
    const recipient = decryptArtistStoredContact(target).email;
    if (recipient) {
      void sendSuspensionNoticeEmail({ to: recipient, adminNote: commentRaw });
    }
  }

  revalidateHomeMarketing();

  try {
    analyticsServer?.capture({
      distinctId: session.artistId,
      event: "artist_suspension_changed",
      properties: { artist_id: id, suspended: body.suspended },
    });
  } catch {
    // ignore
  }

  return NextResponse.json({ success: true });
}
