import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/session-jwt";

/**
 * Lightweight session introspection endpoint for client UX state.
 * Returns only non-sensitive auth metadata used to toggle UI controls.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    role: session.role,
    expiresAt: session.expiresAt.toISOString(),
  });
}
