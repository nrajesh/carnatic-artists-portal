import Link from "next/link";
import { notFound } from "next/navigation";
import { getArtistProfileForAdmin } from "@/lib/queries/admin-artists";
import { SuspendControls } from "./suspend-controls";

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = await getArtistProfileForAdmin(id);
  if (!artist) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link
        href={`/admin/artists/${artist.id}`}
        className="mb-6 inline-block text-sm text-amber-700 hover:text-amber-900"
      >
        ← Back to artist
      </Link>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-6 text-2xl font-bold text-stone-800">Edit: {artist.name}</h1>

        <div className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Full name</label>
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
              {artist.name}
            </p>
            <p className="mt-1 text-xs text-stone-400">Name changes are not available in admin yet.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Email</label>
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
              {artist.email}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Province</label>
            <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800">
              {artist.province}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Specialities</label>
            <div className="flex flex-wrap gap-2">
              {artist.specialities.map((s) => (
                <span
                  key={s.name}
                  className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Account status</label>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
                  artist.isSuspended
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-green-200 bg-green-50 text-green-700"
                }`}
              >
                {artist.isSuspended ? "Suspended" : "Active"}
              </span>
            </div>
          </div>

          <div className="border-t border-stone-100 pt-4">
            <h2 className="mb-2 text-sm font-semibold text-stone-700">Moderation</h2>
            <SuspendControls artistId={artist.id} initialSuspended={artist.isSuspended} />
          </div>
        </div>
      </div>
    </main>
  );
}
