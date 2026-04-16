import Link from "next/link";
import { Suspense } from "react";
import ArtistsSearch from "./artists-search";
import { ArtistListingTracker } from "./artist-listing-tracker";
import { listArtistsForDirectory } from "@/lib/queries/artists";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: { q?: string; speciality?: string; province?: string };
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const { q = "", speciality = "", province = "" } = searchParams;
  const allArtists = await listArtistsForDirectory();
  const PROVINCES = Array.from(new Set(allArtists.map((a) => a.province))).sort();
  const SPECIALITY_NAMES = Array.from(
    new Set(allArtists.flatMap((a) => a.specialities.map((s) => s.name))),
  ).sort();

  const filtered = allArtists.filter((a) => {
    const matchesName = !q || a.name.toLowerCase().includes(q.toLowerCase());
    const matchesSpeciality = !speciality || a.specialities.some((s) => s.name === speciality);
    const matchesProvince = !province || a.province === province;
    return matchesName && matchesSpeciality && matchesProvince;
  });

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-10">
      <ArtistListingTracker />
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 mb-2 inline-block">
            ← Home
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Artists</h1>
          <p className="text-stone-500 mt-1">{allArtists.length} Carnatic musicians in The Netherlands</p>
        </div>

        <Suspense>
          <ArtistsSearch specialities={SPECIALITY_NAMES} provinces={PROVINCES} />
        </Suspense>

        <p className="text-sm text-stone-500 mb-5">
          {filtered.length === allArtists.length
            ? `Showing all ${filtered.length} artists`
            : `${filtered.length} of ${allArtists.length} artists match your search`}
        </p>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <p className="text-stone-400 text-lg mb-2">No artists found</p>
            <p className="text-stone-400 text-sm">Try adjusting your search or clearing the filters.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-amber-400 hover:shadow-lg transition-all"
            >
              <div
                className="h-20 flex items-end px-5 pb-3"
                style={{
                  background: `linear-gradient(135deg, ${artist.specialities[0].color}, ${artist.specialities[0].color}cc)`,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center text-xl font-bold translate-y-6 flex-shrink-0"
                  style={{ backgroundColor: artist.specialities[0].color, color: "#FFFFFF" }}
                >
                  {artist.name[0]}
                </div>
              </div>
              <div className="pt-8 px-5 pb-5">
                <p className="font-semibold text-stone-800 group-hover:text-amber-800 transition-colors leading-tight">{artist.name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {artist.specialities.map((s) => (
                    <span
                      key={s.name}
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: s.color + "22", color: s.color }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {artist.openToCollab && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                      Open to collab
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-400 mt-2">📍 {artist.province}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
