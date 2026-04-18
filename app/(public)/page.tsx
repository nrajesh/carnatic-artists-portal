import Link from "next/link";
import { cookies } from "next/headers";
import { JoinCtaButton } from "./join-cta-button";
import { PostHogReset } from "@/components/posthog-reset";
import {
  countActiveArtists,
  countActiveCollabs,
  countOpenToCollabArtists,
  getDailyFeaturedArtistForHome,
  listArtistsForDirectory,
  listCollabsForHome,
} from "@/lib/queries/artists";
import { DEFAULT_ARTIST_ACCENT_COLOR } from "@/lib/speciality-theme";
import { verifySession } from "@/lib/session-jwt";

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
  const [totalArtists, seekingCollab, totalCollabs, featuredArtist, homeCollabs, previewArtists] =
    await Promise.all([
      countActiveArtists(),
      countOpenToCollabArtists(),
      countActiveCollabs(),
      getDailyFeaturedArtistForHome(),
      listCollabsForHome(3),
      listArtistsForDirectory(),
    ]);
  const previewSix = previewArtists.slice(0, 6);

  return (
    <main className="min-h-screen bg-amber-50">
      {ph_reset === "1" && <PostHogReset />}

      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-20 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">Carnatic Artist Portal</h1>
        <p className="text-amber-200 text-lg sm:text-xl max-w-xl mx-auto mb-8">
          Connecting Carnatic musicians across The Netherlands - singers, violinists, percussionists, and more.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <JoinCtaButton />
          <Link
            href="/artists"
            className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors min-h-[44px] flex items-center"
          >
            Browse Artists
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-3 gap-4 sm:gap-6 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{totalArtists}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Registered Artists</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{seekingCollab}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Seeking Collabs</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{totalCollabs}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Active Collabs</div>
        </div>
      </div>

      {featuredArtist && (
        <div className="mx-auto max-w-4xl px-6 pb-10">
          <Link
            href={`/artists/${featuredArtist.slug}`}
            className="group block rounded-2xl border border-amber-200 bg-white p-6 shadow-sm transition-all hover:border-amber-400 hover:shadow-md sm:p-8"
          >
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-amber-500">
              Today&apos;s featured artist
            </h2>
            <p className="mb-4 text-xs text-stone-500">
              Discover exceptional Carnatic vocal talent - featured fresh every day.
            </p>
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-2xl font-bold"
                style={{
                  backgroundColor: featuredArtist.specialities[0]?.color ?? DEFAULT_ARTIST_ACCENT_COLOR,
                  color: "#FFFFFF",
                }}
              >
                {featuredArtist.name[0]}
              </div>
              <div>
                <p className="font-semibold text-stone-800 transition-colors group-hover:text-amber-800">
                  {featuredArtist.name}
                </p>
                <p className="text-sm text-stone-500">
                  {featuredArtist.specialities[0]?.name ?? "Artist"} · {featuredArtist.province}
                </p>
              </div>
            </div>
          </Link>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800">Artists</h2>
          <Link href="/artists" className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previewSix.map((artist) => {
            const accent = artist.specialities[0]?.color ?? DEFAULT_ARTIST_ACCENT_COLOR;
            const specName = artist.specialities[0]?.name ?? "Artist";
            return (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="group bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-3"
                style={{ backgroundColor: accent, color: "#FFFFFF" }}
              >
                {artist.name[0]}
              </div>
              <p className="font-semibold text-stone-800 text-sm leading-tight group-hover:text-amber-800 transition-colors">{artist.name}</p>
              <span
                className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: accent + "22", color: accent }}
              >
                {specName}
              </span>
              <p className="text-xs text-stone-400 mt-1">{artist.province}</p>
            </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800">Active collabs</h2>
          <Link href={collabsIndexHref} className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
            View all →
          </Link>
        </div>
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
    </main>
  );
}
