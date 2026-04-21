import Link from "next/link";
import { cookies } from "next/headers";
import { JoinCtaButton } from "./join-cta-button";
import { PostHogReset } from "@/components/posthog-reset";
import { getCachedHomeMarketingData } from "@/lib/cache/home-marketing";
import { ArtistsProvinceMap } from "@/components/artists-province-map";
import type { ArtistMiniCardArtist } from "@/components/artist-mini-card";
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { getDeploymentConfig } from "@/deployment.config";
import { DEFAULT_ARTIST_ACCENT_COLOR, getThemeFromArtistSpecialities } from "@/lib/speciality-theme";
import { verifySession } from "@/lib/session-jwt";
import { PortalSectionHeading } from "@/components/portal-section-heading";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ ph_reset?: string }>;
}) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const collabsIndexHref = session?.role === "admin" ? "/admin/collabs" : "/collabs";
  const { ph_reset } = await searchParams;
  const deployment = getDeploymentConfig();
  const {
    collabsRatingsEnabled,
    totalArtists,
    seekingCollab,
    totalCollabs,
    featuredArtist,
    homeCollabs,
    previewArtists,
    countsByProvince,
  } = await getCachedHomeMarketingData();
  const provincesWithArtists = Object.values(countsByProvince).filter((n) => n > 0).length;
  const featuredTheme = featuredArtist
    ? getThemeFromArtistSpecialities(featuredArtist.specialities)
    : null;
  const featuredAvatarAccent = featuredTheme
    ? featuredTheme.background.startsWith("linear-gradient")
      ? featuredTheme.background
      : featuredTheme.accentColor
    : DEFAULT_ARTIST_ACCENT_COLOR;
  const featuredSpecialityLine =
    featuredArtist && featuredArtist.specialities.length > 0
      ? featuredArtist.specialities.map((s) => s.name).join(" · ")
      : "Artist";
  const artistsByProvinceForMap: Record<string, ArtistMiniCardArtist[]> = {};
  for (const a of previewArtists) {
    const bucket = artistsByProvinceForMap[a.province] ?? (artistsByProvinceForMap[a.province] = []);
    bucket.push({
      slug: a.slug,
      name: a.name,
      province: a.province,
      profilePhotoUrl: a.profilePhotoUrl ?? undefined,
      specialities: a.specialities,
    });
  }

  return (
    <main className="min-h-screen bg-amber-50">
      {ph_reset === "1" && <PostHogReset />}

      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-20 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="mb-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">Artist Discovery Portal</h1>
        <p className="text-amber-200 text-lg sm:text-xl max-w-xl mx-auto mb-8">
          {collabsRatingsEnabled
            ? "Browse artists in the Netherlands - discover profiles, find collaborators, and grow your musical network."
            : "Browse artists in the Netherlands - discover profiles and connect with talented musicians."}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <JoinCtaButton />
          <Link
            href="/artists"
            className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors min-h-[44px] flex items-center"
          >
            Meet our artists
          </Link>
        </div>
      </div>

      <div
        className={`max-w-4xl mx-auto px-6 py-12 grid gap-4 sm:gap-6 text-center ${
          collabsRatingsEnabled ? "grid-cols-3" : "grid-cols-2"
        }`}
      >
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{totalArtists}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Musicians on the portal</div>
        </div>
        {collabsRatingsEnabled ? (
          <>
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
              <div className="text-3xl font-bold text-amber-800">{seekingCollab}</div>
              <div className="text-xs sm:text-sm text-amber-600 mt-1">Open to collaborate</div>
            </div>
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
              <div className="text-3xl font-bold text-amber-800">{totalCollabs}</div>
              <div className="text-xs sm:text-sm text-amber-600 mt-1">Collaborations live</div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
            <div className="text-3xl font-bold text-amber-800">{provincesWithArtists}</div>
            <div className="text-xs sm:text-sm text-amber-600 mt-1">Provinces represented</div>
          </div>
        )}
      </div>

      {featuredArtist && (
        <div className="mx-auto max-w-4xl px-6 pb-10">
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm transition-all hover:border-amber-300 hover:shadow-md">
            <div className="border-b border-amber-100/80 px-6 pb-4 pt-6 sm:px-8 sm:pt-8">
              <PortalSectionHeading variant="title" textOnly className="mb-2 text-amber-900">
                In the spotlight today
              </PortalSectionHeading>
              <p className="mb-4 max-w-2xl text-xs text-stone-500">
                Meet someone from our community - profiles rotate so every serious performer gets a moment to shine.
              </p>
            </div>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
              <Link
                href={`/artists/${featuredArtist.slug}`}
                className="group flex gap-4 px-6 py-5 sm:px-8 sm:py-6"
              >
                <FeaturedArtistPhoto
                  photoUrl={featuredArtist.profilePhotoUrl ?? ""}
                  initial={featuredArtist.name[0] ?? "?"}
                  accentColor={featuredAvatarAccent}
                  alt={`${featuredArtist.name} profile photo`}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                    {featuredArtist.name}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">
                    {featuredSpecialityLine}
                    <span className="text-stone-400"> · </span>
                    {featuredArtist.province}
                  </p>
                  <p className="mt-2 text-xs font-medium text-amber-700 underline-offset-2 group-hover:underline">
                    View profile →
                  </p>
                </div>
              </Link>
              <aside className="flex flex-col justify-center border-t border-amber-100 bg-gradient-to-br from-amber-50/90 to-amber-50/30 px-5 py-5 sm:border-l sm:border-t-0 sm:px-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  {collabsRatingsEnabled ? "Happening now" : "Discovery"}
                </p>
                {!collabsRatingsEnabled ? (
                  <p className="text-xs leading-relaxed text-stone-500">
                    Browse the directory and map to find musicians by speciality and province.
                  </p>
                ) : featuredArtist.activeCollabs.length === 0 ? (
                  <p className="text-xs leading-relaxed text-stone-500">
                    They&apos;re between projects - say hello or start something new together.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {featuredArtist.activeCollabs.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={
                            session?.role === "admin"
                              ? `/admin/collabs/${c.slug}`
                              : `/collabs/${c.slug}`
                          }
                          className="line-clamp-2 text-sm font-medium text-stone-800 underline-offset-2 hover:text-amber-900 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto max-w-5xl px-6 pb-10" aria-labelledby="home-province-map-heading">
        <h2 id="home-province-map-heading" className="portal-section-article">
          Find musicians near you
        </h2>
        <p className="mt-1 max-w-xl text-sm text-stone-600">
          Explore who&apos;s already here by province - then join and put your corner of the Netherlands on the map.
        </p>
        <div className="mt-5">
          <ArtistsProvinceMap
            artistsByProvince={artistsByProvinceForMap}
            countsByProvince={countsByProvince}
            geoJsonHref={deployment.mapGeoJsonUrl}
          />
        </div>
      </section>

      {collabsRatingsEnabled && (
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-400/70 pb-2">
            <PortalSectionHeading variant="title" textOnly className="mb-0 text-lg font-bold text-stone-900">
              Collaborations in motion
            </PortalSectionHeading>
            <Link href={collabsIndexHref} className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
              View all →
            </Link>
          </div>
          <p className="mb-4 text-sm text-stone-600">Real projects you can browse - or list your own when you&apos;re part of the portal.</p>
          <div className="flex flex-col gap-3">
            {homeCollabs.map((c) => (
              <Link
                key={c.slug}
                href={session?.role === "admin" ? `/admin/collabs/${c.slug}` : `/collabs/${c.slug}`}
                className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-5 py-4 hover:border-amber-400 hover:shadow-md transition-all"
              >
                <div>
                  <p className="font-semibold text-stone-800">{c.name}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{c.members} members · {c.status}</p>
                </div>
                <span className="text-amber-600 text-sm font-medium">→</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
