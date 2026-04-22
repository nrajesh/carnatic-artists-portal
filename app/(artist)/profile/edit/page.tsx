import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getArtistForEdit, listSpecialities } from "@/lib/queries/artists";
import { NL_DEFAULT_PROVINCES } from "@/lib/geo/nl-default-provinces";
import { ArtistAccountStatus } from "@/components/artist-account-status";
import { EditProfileForm } from "./edit-profile-form";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";

const NL_PROVINCES = [...NL_DEFAULT_PROVINCES];

export default async function EditProfilePage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");

  const [artist, allSpecialities, collabsRatingsEnabled] = await Promise.all([
    getArtistForEdit(session.artistId),
    listSpecialities(),
    isArtistCollabsRatingsEnabledServer({ distinctId: session.artistId }),
  ]);
  if (!artist) redirect("/auth/login");

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-2 inline-block">
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Edit Profile</h1>
          <p className="text-stone-500 mt-1 text-sm">
            Changes are visible on your public profile immediately.
          </p>
          <div className="mt-4">
            <ArtistAccountStatus isSuspended={artist.isSuspended} initialMessages={artist.suspensionMessages} />
          </div>
        </div>

        <EditProfileForm
          key={artist.profileRevision}
          variant="artist"
          initial={artist}
          allSpecialities={allSpecialities}
          provinces={NL_PROVINCES}
          collabsRatingsEnabled={collabsRatingsEnabled}
        />
      </div>
    </main>
  );
}
