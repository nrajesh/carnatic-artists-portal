/**
 * POST /api/admin/artists/[id]/send-login-link
 *
 * Admin-only: emails a simple sign-in link for an existing artist account.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendLoginLinkToArtist } from "@/lib/admin-artist-login-link";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import { verifySession } from "@/lib/session-jwt";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const html = isBrowserDocumentNavigation(request);

  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    if (html) return redirectPublicPath(request, "/auth/login");
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await sendLoginLinkToArtist(id);

  if (!result.ok) {
    if (result.error === "NOT_FOUND") {
      if (html) return redirectPublicPath(request, "/admin/artists?error=not_found");
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (html) return redirectPublicPath(request, `/admin/artists/${id}?error=send_link_no_email`);
    return NextResponse.json(
      { error: "NO_EMAIL", message: "This artist does not have an email address on file." },
      { status: 400 },
    );
  }

  if (html) {
    const warn = result.magicLinkEmailSent ? "" : "&email_warning=1";
    return redirectPublicPath(request, `/admin/artists/${id}?done=login_link_sent${warn}`);
  }
  return NextResponse.json({ success: true, magicLinkEmailSent: result.magicLinkEmailSent });
}
