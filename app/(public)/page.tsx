import Link from "next/link";
import { cookies } from "next/headers";
import { JoinCtaButton } from "./join-cta-button";
import { PostHogReset } from "@/components/posthog-reset";
import { getCachedHomeMarketingData } from "@/lib/cache/home-marketing";
import { ArtistsLocationExplorer } from "@/components/artists-location-explorer";
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import { buildLocationMapPoints } from "@/lib/location-map-data";
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
  const isLoggedIn = !!session;
  const collabsIndexHref = session?.role === "admin" ? "/admin/collabs" : "/collabs";
  const { ph_reset } = await searchParams;
  const {
    collabsRatingsEnabled,
    totalArtists,
    seekingCollab,
    totalCollabs,
    featuredArtist,
    homeCollabs,
    previewArtists,
  } = await getCachedHomeMarketingData();
  const displayConfig = getDeploymentDisplayConfig();
  const locationPoints = await buildLocationMapPoints(
    previewArtists,
    displayConfig.countryName,
    displayConfig.countryCode,
  );
  const locationsWithArtists = locationPoints.filter((point) => point.count > 0).length;
  const areaPluralTitle = "Locations";
  /** Full artist directory - must match `app/(public)/artists/page.tsx` route (not `/register`). */
  const artistsDirectoryHref = "/artists";
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

  let discoveryContent = (
    <p className="text-xs leading-relaxed text-stone-500">
      Browse the directory and map to find artists by speciality and place.
    </p>
  );

  if (featuredArtist) {
    const websiteLink = featuredArtist.links?.find(l => l.type.toLowerCase() === 'website');
    const instaLink = featuredArtist.links?.find(l => l.type.toLowerCase() === 'instagram');
    const youtubeLink = featuredArtist.links?.find(l => l.type.toLowerCase() === 'youtube');
    const priorityLink = websiteLink || instaLink || youtubeLink;

    if (priorityLink) {
      const type = priorityLink.type.toLowerCase();
      const isWebsite = type === 'website';
      const isInstagram = type === 'instagram';

      const icon = isWebsite ? (
        <svg className="h-5 w-5 text-stone-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
      ) : isInstagram ? (
        <svg className="h-5 w-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
      ) : (
        <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
      );

      const label = isWebsite ? 'Visit website' : isInstagram ? 'View Instagram' : 'Watch on YouTube';

      discoveryContent = (
        <a href={priorityLink.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-3 rounded-xl border border-amber-200/80 bg-white/50 p-3 shadow-sm backdrop-blur-md transition-all hover:scale-[1.02] hover:border-amber-300 hover:bg-white/70 hover:shadow">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-stone-100">
            {icon}
          </div>
          <span className="text-sm font-medium text-stone-800">{label}</span>
          <span className="ml-auto text-stone-400">→</span>
        </a>
      );
    } else if (featuredArtist.bioPlainPreview) {
      discoveryContent = (
        <p className="text-xs leading-relaxed text-stone-500">
          {featuredArtist.bioPlainPreview}
          <Link href={`/artists/${featuredArtist.slug}`} className="ml-1 text-amber-700 hover:underline whitespace-nowrap">
            more
          </Link>
        </p>
      );
    }
  }

  return (
    <main className="min-h-screen bg-amber-50">
      {ph_reset === "1" && <PostHogReset />}

      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 px-4 py-10 text-center text-white sm:px-6 sm:py-20">

        <h1 className="mb-3 font-display text-3xl font-bold tracking-tight sm:mb-4 sm:text-5xl">
          {displayConfig.name}
        </h1>
        <p className="mx-auto mb-6 max-w-2xl text-base text-amber-200 sm:mb-8 sm:max-w-4xl sm:text-xl">
          {collabsRatingsEnabled
            ? "Browse artists, discover profiles, find collaborators, and grow your musical network."
            : "A professional artist community"}
        </p>
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
          <Link
            href={artistsDirectoryHref}
            className="flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg border-2 border-white px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:px-6 sm:py-3 sm:text-base"
          >
            Meet our artists
          </Link>
          <JoinCtaButton />
        </div>
      </div>

      <div
        className={`mx-auto grid max-w-4xl gap-3 px-6 py-8 text-center sm:gap-6 sm:py-12 ${collabsRatingsEnabled ? "grid-cols-3" : "grid-cols-2"
          }`}
      >
        <Link
          href={artistsDirectoryHref}
          className="block rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 sm:p-6"
          aria-label={`${totalArtists} artists on the portal - browse directory`}
        >
          <div className="text-3xl font-bold text-amber-800">{totalArtists}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Artists on the portal</div>
        </Link>
        {collabsRatingsEnabled ? (
          <>
            <a
              href="#home-location-explorer"
              className="block rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 sm:p-6"
              aria-label={`${seekingCollab} open to collaborate - jump to map`}
            >
              <div className="text-3xl font-bold text-amber-800">{seekingCollab}</div>
              <div className="text-xs sm:text-sm text-amber-600 mt-1">Open to collaborate</div>
            </a>
            <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="text-3xl font-bold text-amber-800">{totalCollabs}</div>
              <div className="text-xs sm:text-sm text-amber-600 mt-1">Collaborations live</div>
            </div>
          </>
        ) : (
          <a
            href="#home-location-explorer"
            className="block rounded-2xl border border-amber-200 bg-white p-4 shadow-sm transition-colors hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 sm:p-6"
            aria-label={`${locationsWithArtists} locations represented - jump to map`}
          >
            <div className="text-3xl font-bold text-amber-800">{locationsWithArtists}</div>
            <div className="text-xs sm:text-sm text-amber-600 mt-1">{areaPluralTitle} represented</div>
          </a>
        )}
      </div>

      {featuredArtist && (
        <div className="mx-auto max-w-4xl px-6 pb-8 sm:pb-10">
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm transition-all hover:border-amber-300 hover:shadow-md">
            <div className="border-b border-amber-100/80 px-5 pb-3 pt-5 sm:px-8 sm:pb-4 sm:pt-8">
              <PortalSectionHeading variant="title" textOnly className="mb-2 text-amber-900">
                In the spotlight today
              </PortalSectionHeading>
              <p className="mb-0 max-w-2xl text-xs text-stone-500">
                Meet someone from our community - profiles rotate so every serious performer gets a moment to shine.
              </p>
            </div>
            <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
              <Link
                href={isLoggedIn ? `/artists/${featuredArtist.slug}` : "/auth/login"}
                className="group flex gap-4 px-5 py-4 sm:px-8 sm:py-6"
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
              <aside className="flex flex-col justify-center border-t border-amber-100 bg-gradient-to-br from-amber-50/90 to-amber-50/30 px-5 py-4 sm:border-l sm:border-t-0 sm:px-6 sm:py-5">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  {collabsRatingsEnabled ? "Happening now" : "Discovery"}
                </p>
                {!collabsRatingsEnabled ? (
                  discoveryContent
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

      <section
        id="home-location-explorer"
        className="mx-auto max-w-5xl px-6 pb-10 scroll-mt-24"
        aria-labelledby="home-location-explorer-heading"
      >
        <h2 id="home-location-explorer-heading" className="portal-section-article">
          Find artists near you
        </h2>
        <p className="mt-1 max-w-xl text-sm text-stone-600">
          Zoom into the map until nearby locations separate into individual counts.
        </p>
        <div className="mt-5">
          <ArtistsLocationExplorer
            key={locationPoints.map((point) => `${point.locationValue}:${point.count}`).join("|")}
            locationPoints={locationPoints}
            areaLabelSingular="location"
            areaLabelPlural="locations"
            enableSpecialityFilter
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
