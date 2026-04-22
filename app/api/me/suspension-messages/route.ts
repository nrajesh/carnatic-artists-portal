/**
 * POST /api/me/suspension-messages
 * Authenticated artist appends a remark to the suspension thread (must be suspended).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { appendArtistMessage, resolveSuspensionMessages } from "@/lib/suspension-thread";
import { verifySession } from "@/lib/session-jwt";

const BodySchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const artist = await getDb().artist.findUnique({
    where: { id: session.artistId },
    select: {
      isSuspended: true,
      suspensionComment: true,
      suspensionThread: true,
      updatedAt: true,
    },
  });

  if (!artist?.isSuspended) {
    return NextResponse.json({ error: "NOT_SUSPENDED" }, { status: 400 });
  }

  const baseline = resolveSuspensionMessages({
    isSuspended: true,
    suspensionComment: artist.suspensionComment,
    suspensionThread: artist.suspensionThread,
    updatedAt: artist.updatedAt,
  });

  const nextThread = appendArtistMessage(baseline, parsed.data.text);

  await getDb().artist.update({
    where: { id: session.artistId },
    data: { suspensionThread: nextThread },
  });

  return NextResponse.json({ success: true });
}
