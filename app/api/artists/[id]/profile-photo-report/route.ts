import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { isBrowserDocumentNavigation, redirectPublicPath } from "@/lib/http/document-navigation";
import { verifySession } from "@/lib/session-jwt";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const html = isBrowserDocumentNavigation(request);
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) {
    if (html) return redirectPublicPath(request, "/auth/login");
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const db = getDb();
  const [artist, reporter, admins] = await Promise.all([
    db.artist.findUnique({
      where: { id },
      select: { id: true, slug: true, fullName: true, profilePhotoUrl: true },
    }),
    db.artist.findUnique({
      where: { id: session.artistId },
      select: { id: true, fullName: true },
    }),
    db.artist.findMany({
      where: { isAdmin: true, isSuspended: false },
      select: { id: true },
    }),
  ]);

  if (!artist || !artist.profilePhotoUrl) {
    if (html) return redirectPublicPath(request, "/artists");
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (admins.length > 0) {
    const reporterName = reporter?.fullName ?? "A signed-in artist";
    await db.notification.createMany({
      data: admins.map((admin) => ({
        artistId: admin.id,
        type: "profile_photo_report",
        payload: {
          text: `${reporterName} reported ${artist.fullName}'s profile photo.`,
          href: `/admin/artists/${artist.id}/edit`,
          artistId: artist.id,
          artistName: artist.fullName,
          reporterId: session.artistId,
        },
        isRead: false,
      })),
    });
  }

  revalidatePath(`/artists/${artist.slug}`);

  if (html) return redirectPublicPath(request, `/artists/${artist.slug}?photo_reported=1`);
  return NextResponse.json({ success: true });
}
