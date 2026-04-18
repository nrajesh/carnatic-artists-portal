/**
 * POST /api/admin/artists/[id]/suspend
 * Admin-only. Persists isSuspended and records analytics.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
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

  let body: { suspended?: boolean };
  try {
    body = (await request.json()) as { suspended?: boolean };
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  if (typeof body.suspended !== "boolean") {
    return NextResponse.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const target = await getDb().artist.findUnique({ where: { id }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Never let an admin suspend their own account from the API
  if (body.suspended && id === session.artistId) {
    return NextResponse.json({ error: "CANNOT_SUSPEND_SELF" }, { status: 400 });
  }

  await getDb().artist.update({
    where: { id },
    data: { isSuspended: body.suspended },
  });

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
