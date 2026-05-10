/**
 * POST /api/admin/registrations/[id]/reject
 *
 * Rejects a pending RegistrationRequest (delegates to lib handler).
 */

import { NextRequest, NextResponse } from "next/server";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import { rejectPendingRegistrationRouteStyle } from "@/lib/admin-registration-route-handlers";
import { parseRegistrationReviewComment } from "@/lib/admin-review-comment";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const reviewerId = request.headers.get("x-artist-id");
  const html = isBrowserDocumentNavigation(request);

  const parsedComment = await parseRegistrationReviewComment(request, "reject");
  if (!parsedComment.ok) {
    if (html) return redirectPublicPath(request, `/admin/registrations/${id}?error=reject_comment_required`);
    return NextResponse.json({ error: parsedComment.error }, { status: parsedComment.status });
  }

  const result = await rejectPendingRegistrationRouteStyle({
    registrationId: id,
    reviewerId: reviewerId ?? undefined,
    reviewComment: parsedComment.comment,
    analyticsDistinctId: request.headers.get("x-artist-id") ?? "unknown-admin",
    baseUrl: request.nextUrl.origin,
  });

  if (result.ok === false) {
    if (result.error === "NOT_FOUND") {
      if (html) return redirectPublicPath(request, "/admin/registrations?error=not_found");
      return NextResponse.json({ error: "NOT_FOUND", message: "Registration not found." }, { status: 404 });
    }
    if (html) return redirectPublicPath(request, `/admin/registrations/${id}?error=already_processed`);
    return NextResponse.json(
      { error: "ALREADY_PROCESSED", message: "This registration has already been processed." },
      { status: 404 },
    );
  }

  if (html) return redirectPublicPath(request, `/admin/registrations/${id}?done=rejected`);
  return NextResponse.json({ success: true });
}
