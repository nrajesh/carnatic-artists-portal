import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getArtistForEdit, listSpecialities } from "@/lib/queries/artists";
import { EditProfileForm } from "./edit-profile-form";

const NL_PROVINCES = [
  "Drenthe",
  "Flevoland",
  "Friesland",
  "Gelderland",
  "Groningen",
  "Limburg",
  "Noord-Brabant",
  "Noord-Holland",
  "Overijssel",
  "Utrecht",
  "Zeeland",
  "Zuid-Holland",
];

export default async function EditProfilePage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");

  const [artist, allSpecialities] = await Promise.all([
    getArtistForEdit(session.artistId),
    listSpecialities(),
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
        </div>

        <EditProfileForm
          initial={artist}
          allSpecialities={allSpecialities}
          provinces={NL_PROVINCES}
        />
      </div>
    </main>
  );
}
