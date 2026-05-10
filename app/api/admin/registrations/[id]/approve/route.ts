/**
 * POST /api/admin/registrations/[id]/approve
 *
 * Approves a pending or rejected RegistrationRequest (delegates to lib handler).
 */

import { NextRequest, NextResponse } from "next/server";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import {
  approvePendingRegistrationRouteStyle,
  revalidateAfterRegistrationMutation,
} from "@/lib/admin-registration-route-handlers";
import { parseRegistrationApprovalPayload } from "@/lib/admin-review-comment";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reviewerId = request.headers.get("x-artist-id");
  const html = isBrowserDocumentNavigation(request);

  const parsedApproval = await parseRegistrationApprovalPayload(request);
  if (!parsedApproval.ok) {
    const errorParam =
      parsedApproval.error === "INVALID_SPECIALITIES" ? "invalid_specialities" : "invalid_comment";
    if (html) return redirectPublicPath(request, `/admin/registrations/${id}?error=${errorParam}`);
    return NextResponse.json({ error: parsedApproval.error }, { status: parsedApproval.status });
  }

  const result = await approvePendingRegistrationRouteStyle({
    registrationId: id,
    reviewerId: reviewerId ?? undefined,
    reviewComment: parsedApproval.comment,
    specialityNames: parsedApproval.specialities,
    analyticsDistinctId: request.headers.get("x-artist-id") ?? "unknown-admin",
    baseUrl: request.nextUrl.origin,
  });

  if (result.ok === false) {
    if (result.error === "NOT_FOUND") {
      if (html) return redirectPublicPath(request, "/admin/registrations?error=not_found");
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Registration not found." },
        { status: 404 },
      );
    }
    if (html)
      return redirectPublicPath(request, `/admin/registrations/${id}?error=already_processed`);
    return NextResponse.json(
      { error: "ALREADY_PROCESSED", message: "This registration has already been processed." },
      { status: 404 },
    );
  }

  revalidateAfterRegistrationMutation();

  if (html) {
    const warn = result.magicLinkEmailSent ? "" : "&email_warning=1";
    return redirectPublicPath(request, `/admin/registrations/${id}?done=approved${warn}`);
  }
  return NextResponse.json({ success: true, magicLinkEmailSent: result.magicLinkEmailSent });
}
