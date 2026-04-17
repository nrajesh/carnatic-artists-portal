import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";

type PushBody = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: PushBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh?.trim();
  const auth = body.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  await getDb().pushSubscription.upsert({
    where: { endpoint },
    create: {
      artistId: session.artistId,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
    },
    update: {
      artistId: session.artistId,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const endpoint = body.endpoint?.trim();
  if (!endpoint) {
    return NextResponse.json({ error: "INVALID_SUBSCRIPTION" }, { status: 400 });
  }

  await getDb().pushSubscription.deleteMany({
    where: { endpoint, artistId: session.artistId },
  });

  return NextResponse.json({ ok: true });
}
