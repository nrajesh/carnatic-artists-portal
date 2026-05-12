import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  deleteManagedProfilePhotoBestEffort,
  isUploadedProfilePhotoFile,
  uploadArtistProfilePhoto,
} from "@/lib/profile-photo-storage";
import { verifySession } from "@/lib/session-jwt";
import { StorageError } from "@/lib/storage";
import { revalidateHomeMarketing } from "@/lib/cache/home-marketing";
import { logSafeError } from "@/lib/safe-log";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const sessionCookie = (await cookies()).get("session")?.value ?? null;
    const session = sessionCookie ? await verifySession(sessionCookie) : null;
    if (!session) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    if (session.role !== "admin" && session.artistId !== id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "INVALID_REQUEST", message: "Could not parse form data." },
        { status: 400 },
      );
    }

    const profilePhotoFileEntry = formData.get("profilePhotoFile");
    if (!isUploadedProfilePhotoFile(profilePhotoFileEntry)) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Choose a profile photo to upload.",
          fields: { profilePhotoFile: "Choose a profile photo to upload." },
        },
        { status: 400 },
      );
    }

    const profilePhotoRightsConfirmed = formData.get("profilePhotoRightsConfirmed") === "true";
    if (!profilePhotoRightsConfirmed) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Confirm that you have rights to use the profile photo.",
          fields: {
            profilePhotoRightsConfirmed: "Confirm that you have rights to use the profile photo.",
          },
        },
        { status: 400 },
      );
    }

    const db = getDb();
    const artist = await db.artist.findUnique({
      where: { id },
      select: { id: true, slug: true, profilePhotoObjectKey: true },
    });
    if (!artist) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    let uploadedProfilePhoto: { url: string; objectKey: string } | null = null;
    try {
      uploadedProfilePhoto = await uploadArtistProfilePhoto({
        artistId: artist.id,
        file: profilePhotoFileEntry,
      });
    } catch (err) {
      const message =
        err instanceof StorageError && err.code !== "STORAGE_UNAVAILABLE"
          ? err.message
          : "Profile photo upload is temporarily unavailable.";
      return NextResponse.json(
        {
          error: "PROFILE_PHOTO_UPLOAD_FAILED",
          message,
          fields: { profilePhotoFile: message },
        },
        { status: err instanceof StorageError && err.code !== "STORAGE_UNAVAILABLE" ? 400 : 503 },
      );
    }

    try {
      await db.artist.update({
        where: { id: artist.id },
        data: {
          profilePhotoUrl: uploadedProfilePhoto.url,
          profilePhotoSourceUrl: null,
          profilePhotoObjectKey: uploadedProfilePhoto.objectKey,
          profilePhotoRightsConfirmedAt: new Date(),
        },
      });
    } catch (err) {
      await deleteManagedProfilePhotoBestEffort(uploadedProfilePhoto.objectKey);
      throw err;
    }

    await deleteManagedProfilePhotoBestEffort(artist.profilePhotoObjectKey);

    try {
      revalidatePath("/dashboard");
      revalidatePath("/profile/edit");
      revalidatePath("/admin/artists");
      revalidatePath(`/admin/artists/${artist.id}`);
      revalidatePath(`/admin/artists/${artist.id}/edit`);
      revalidatePath(`/artists/${artist.id}`);
      revalidatePath(`/artists/${artist.slug}`);
      revalidateHomeMarketing();
    } catch (err) {
      logSafeError("[api/artists/profile-photo] Revalidation failed after successful upload", err);
    }

    return NextResponse.json({
      success: true,
      profilePhotoUrl: uploadedProfilePhoto.url,
    });
  } catch (err) {
    logSafeError("[api/artists/profile-photo] Unexpected failure", err);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: err instanceof Error ? err.message : "Profile photo upload failed.",
      },
      { status: 500 },
    );
  }
}
