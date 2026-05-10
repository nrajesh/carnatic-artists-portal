/**
 * POST /api/admin/registrations/[id]/specialities
 *
 * Saves the editable speciality list on a pending/rejected registration before approval.
 */

import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import { updateRegistrationSpecialitiesRouteStyle } from "@/lib/admin-registration-route-handlers";
import { parseRegistrationSpecialitiesPayload } from "@/lib/admin-review-comment";
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

  const parsed = await parseRegistrationSpecialitiesPayload(request);
  if (!parsed.ok) {
    if (html)
      return redirectPublicPath(request, `/admin/registrations/${id}?error=invalid_specialities`);
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const result = await updateRegistrationSpecialitiesRouteStyle({
    registrationId: id,
    specialityNames: parsed.specialities,
  });

  if (!result.ok) {
    if (result.error === "NOT_FOUND") {
      if (html) return redirectPublicPath(request, "/admin/registrations?error=not_found");
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    if (html)
      return redirectPublicPath(request, `/admin/registrations/${id}?error=specialities_locked`);
    return NextResponse.json(
      { error: "ALREADY_APPROVED", message: "Approved registrations cannot be edited here." },
      { status: 400 },
    );
  }

  revalidatePath(`/admin/registrations/${id}`);
  revalidatePath("/admin/specialities");

  if (html)
    return redirectPublicPath(request, `/admin/registrations/${id}?done=specialities_updated`);
  return NextResponse.json({ success: true });
}
