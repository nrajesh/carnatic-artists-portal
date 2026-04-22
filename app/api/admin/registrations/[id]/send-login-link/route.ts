/**
 * POST /api/admin/registrations/[id]/send-login-link
 *
 * For **approved** registrations only: emails a simple sign-in link to the applicant.
 * Does not change registration status or review fields (not an approval action).
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import { sendLoginLinkForApprovedRegistration } from "@/lib/admin-registration-route-handlers";
import { verifySession } from "@/lib/session-jwt";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const html = isBrowserDocumentNavigation(request);

  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    if (html) return redirectPublicPath(request, "/auth/login");
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const result = await sendLoginLinkForApprovedRegistration(id);

  if (!result.ok) {
    if (result.error === "NOT_FOUND") {
      if (html) return redirectPublicPath(request, "/admin/registrations?error=not_found");
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (result.error === "NOT_APPROVED") {
      if (html) return redirectPublicPath(request, `/admin/registrations/${id}?error=send_link_not_approved`);
      return NextResponse.json(
        { error: "NOT_APPROVED", message: "Sign-in link can only be sent after the registration is approved." },
        { status: 400 },
      );
    }
    if (html) return redirectPublicPath(request, `/admin/registrations/${id}?error=send_link_no_artist`);
    return NextResponse.json(
      { error: "NO_ARTIST", message: "No artist account found for this registration email." },
      { status: 404 },
    );
  }

  if (html) {
    const warn = result.magicLinkEmailSent ? "" : "&email_warning=1";
    return redirectPublicPath(request, `/admin/registrations/${id}?done=login_link_sent${warn}`);
  }
  return NextResponse.json({ success: true, magicLinkEmailSent: result.magicLinkEmailSent });
}
