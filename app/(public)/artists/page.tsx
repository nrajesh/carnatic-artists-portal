import Link from "next/link";
import { Suspense } from "react";
import ArtistsSearch from "./artists-search";
import { ArtistListingTracker } from "./artist-listing-tracker";
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { artistMatchesDirectoryQuery } from "@/lib/artist-directory-search";
import { listArtistsForDirectory } from "@/lib/queries/artists";
import { getThemeFromArtistSpecialities } from "@/lib/speciality-theme";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ q?: string; speciality?: string; province?: string }>;
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const { q = "", speciality = "", province = "" } = await searchParams;
  const [allArtists, collabsRatingsEnabled] = await Promise.all([
    listArtistsForDirectory(),
    isArtistCollabsRatingsEnabledServer(),
  ]);
  const PROVINCES = Array.from(new Set(allArtists.map((a) => a.province))).sort();
  const SPECIALITY_NAMES = Array.from(
    new Set(allArtists.flatMap((a) => a.specialities.map((s) => s.name))),
  ).sort();

  const filtered = allArtists.filter((a) => {
    const matchesText = !q || artistMatchesDirectoryQuery(a.keywordHaystack, q);
    const matchesSpeciality = !speciality || a.specialities.some((s) => s.name === speciality);
    const matchesProvince = !province || a.province === province;
    return matchesText && matchesSpeciality && matchesProvince;
  });

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-10">
      <ArtistListingTracker />
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-amber-700 hover:text-amber-900 mb-2 inline-block">
            ← Home
          </Link>
          <h1 className="font-display text-3xl font-bold tracking-tight text-stone-800">Artists</h1>
          <p className="text-stone-500 mt-1">{allArtists.length} artists in The Netherlands</p>
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
          {filtered.map((artist) => {
            const theme = getThemeFromArtistSpecialities(artist.specialities);
            const headerBg = theme.background.startsWith("linear-gradient")
              ? theme.background
              : `linear-gradient(135deg, ${theme.background}, ${theme.background}cc)`;
            const avatarAccent = theme.background.startsWith("linear-gradient")
              ? theme.background
              : theme.accentColor;
            return (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-amber-400 hover:shadow-lg transition-all"
            >
              <div
                className="h-20 flex items-end px-5 pb-3"
                style={{
                  background: headerBg,
                }}
              >
                <div className="translate-y-6 flex-shrink-0">
                  <FeaturedArtistPhoto
                    photoUrl={artist.profilePhotoUrl ?? ""}
                    initial={artist.name[0] ?? "?"}
                    accentColor={avatarAccent}
                    alt=""
                    sizeClassName="h-12 w-12 text-xl"
                    imgClassName="!ring-white border-2 border-white shadow-md"
                  />
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
                  {collabsRatingsEnabled && artist.openToCollab && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                      Open to collab
                    </span>
                  )}
                </div>
                {artist.province.trim() ? (
                  <p className="text-xs text-stone-400 mt-2">📍 {artist.province}</p>
                ) : null}
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
