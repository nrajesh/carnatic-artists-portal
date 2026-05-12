import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getArtistForEdit, listSpecialities } from "@/lib/queries/artists";
import { getDeploymentLocationConfig } from "@/lib/deployment-location";
import { ArtistProfileEditForm } from "@/components/artist-profile-edit-form";
import { AdminModerationPanel } from "./admin-moderation-panel";
import { removeAdminArtistProfilePhoto } from "./actions";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  const [artist, allSpecialities, collabsRatingsEnabled, locationConfig] = await Promise.all([
    getArtistForEdit(id),
    listSpecialities(),
    session?.artistId
      ? isArtistCollabsRatingsEnabledServer({ distinctId: session.artistId })
      : Promise.resolve(false),
    getDeploymentLocationConfig(),
  ]);
  if (!artist) notFound();

  const isSelf = session?.role === "admin" && session.artistId === artist.id;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link
        href={`/admin/artists/${artist.id}`}
        className="mb-6 inline-block text-sm text-amber-700 hover:text-amber-900"
      >
        ← Back to artist
      </Link>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-stone-800">Edit: {artist.fullName}</h1>
        <p className="mb-6 text-sm text-stone-500">
          Same fields as the artist profile editor. Changes apply to their public profile
          immediately.
        </p>

        <div className="mb-8 space-y-6">
          {collabsRatingsEnabled && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-4 text-sm text-stone-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Collaboration listing
                </span>
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                    artist.openToCollab
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-stone-200 bg-stone-100 text-stone-600"
                  }`}
                >
                  {artist.openToCollab ? "Open to collaborate" : "Not open"}
                </span>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Use <span className="font-medium text-stone-700">Open to collaborations</span> in
                the form below to change whether they appear in collaboration discovery.
              </p>
            </div>
          )}

          {artist.profilePhotoUrl ? (
            <form
              action={removeAdminArtistProfilePhoto.bind(null, artist.id)}
              className="rounded-xl border border-red-200 bg-white px-5 py-4 text-sm shadow-sm"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={artist.profilePhotoUrl}
                    alt={`${artist.fullName} profile`}
                    className="h-14 w-14 shrink-0 rounded-lg border border-stone-200 object-cover"
                  />
                  <div className="min-w-0">
                    <p className="font-semibold text-stone-800">Profile photo moderation</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-stone-500">
                      Removes the public profile photo immediately and deletes the managed R2 object
                      when available.
                    </p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Remove photo
                </button>
              </div>
            </form>
          ) : null}

          <ArtistProfileEditForm
            key={artist.profileRevision}
            variant="admin"
            initial={artist}
            allSpecialities={allSpecialities}
            locationAreaLabel="City"
            locationOptions={locationConfig.areaOptions}
            targetArtistId={artist.id}
            collabsRatingsEnabled={collabsRatingsEnabled}
          />

          <AdminModerationPanel
            artistId={artist.id}
            isSuspended={artist.isSuspended}
            suspensionComment={artist.suspensionComment}
            suspensionMessages={artist.suspensionMessages}
            isSelf={isSelf}
          />
        </div>
      </div>
    </main>
  );
}
