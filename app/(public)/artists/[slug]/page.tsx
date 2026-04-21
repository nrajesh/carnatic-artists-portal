import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { formatDeploymentCalendarDate } from "@/lib/format-deployment-datetime";
import { verifySession } from "@/lib/session-jwt";
import { getThemeFromArtistSpecialities } from "@/lib/speciality-theme";
import { getArtistBySlug } from "@/lib/queries/artists";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { normalizeBioHtmlForDisplay } from "@/lib/bio-html-display";
import { ArtistProfileTracker } from "./artist-profile-tracker";

export const dynamic = "force-dynamic";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-base ${i <= rating ? "text-amber-500" : "text-stone-200"}`}>★</span>
      ))}
    </div>
  );
}

function SectionCard({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <div
      id={id}
      className="mb-6 scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8 sm:mb-7"
    >
      <PortalSectionHeading variant="label" className="mb-5">
        {title}
      </PortalSectionHeading>
      {children}
    </div>
  );
}

const REVIEWS_PER_PAGE = 5;

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reviewPage?: string }>;
}

export default async function ArtistProfilePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const searchParamsResolved = await searchParams;
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;

  const artist = await getArtistBySlug(
    slug,
    session ? { artistId: session.artistId, role: session.role } : null,
  );
  if (!artist) notFound();
  const isLoggedIn = !!session;
  const currentArtistId = session?.artistId ?? null;

  const collabsRatingsEnabled = await isArtistCollabsRatingsEnabledServer({
    distinctId: session?.artistId ?? "anonymous",
  });

  const avgRating = artist.reviews.length
    ? (artist.reviews.reduce((s, r) => s + r.rating, 0) / artist.reviews.length).toFixed(1)
    : null;

  const heroTheme = getThemeFromArtistSpecialities(artist.specialities);
  const heroBackground = heroTheme.background.startsWith("linear-gradient")
    ? heroTheme.background
    : `linear-gradient(135deg, ${heroTheme.background}, ${heroTheme.background}bb)`;
  const heroAvatarAccent = heroTheme.background.startsWith("linear-gradient")
    ? heroTheme.background
    : heroTheme.accentColor;
  const bgCover = artist.backgroundImageUrl?.trim();
  const activeCollabs    = artist.collabs.filter(c => c.status === "active");
  const completedCollabs = artist.collabs.filter(c => c.status === "completed");

  // Pagination
  const reviewPage = Math.max(1, parseInt(searchParamsResolved.reviewPage ?? "1", 10));
  const totalPages = collabsRatingsEnabled ? Math.ceil(artist.reviews.length / REVIEWS_PER_PAGE) : 0;
  const pagedReviews = collabsRatingsEnabled
    ? artist.reviews.slice(
        (reviewPage - 1) * REVIEWS_PER_PAGE,
        reviewPage * REVIEWS_PER_PAGE,
      )
    : [];

  return (
    <main className="min-h-screen bg-amber-50">
      <ArtistProfileTracker artistSlug={slug} />
      {/* Hero */}
      <div
        className="px-6 pt-10 pb-20 text-white"
        style={
          bgCover
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.58)), url(${bgCover})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: heroBackground }
        }
      >
        <Link href="/artists" className="text-white/70 hover:text-white text-sm mb-6 inline-block">← All Artists</Link>
        <div className="flex items-center gap-5 max-w-3xl mx-auto">
          <FeaturedArtistPhoto
            photoUrl={artist.profilePhotoUrl ?? ""}
            initial={artist.name[0] ?? "?"}
            accentColor={heroAvatarAccent}
            alt={`${artist.name} profile photo`}
            sizeClassName="h-20 w-20 text-3xl border-4 border-white/40"
            imgClassName="!ring-white/50 border-4 border-white/40 shadow-lg"
          />
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{artist.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {artist.specialities.map((s) => (
                <span
                  key={s.name}
                  className="text-xs px-2 py-0.5 rounded-full font-semibold shadow-sm ring-1 ring-white/35"
                  style={{
                    backgroundColor: s.color,
                    color: "#FFFFFF",
                  }}
                >
                  {s.name}
                </span>
              ))}
              {collabsRatingsEnabled && artist.availableForCollab && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-400/30 text-white border border-green-300/40">
                  Open to collab
                </span>
              )}
            </div>
            {artist.province.trim() ? (
              <p className="text-white/70 mt-1 text-sm">📍 {artist.province}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-10 pb-16">

        {/* Quick stats */}
        {collabsRatingsEnabled && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-stone-800">{activeCollabs.length}</div>
              <div className="text-xs text-stone-500 mt-0.5">Active collabs</div>
            </div>
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-stone-800">{completedCollabs.length}</div>
              <div className="text-xs text-stone-500 mt-0.5">Completed collabs</div>
            </div>
            <Link href="#reviews"
              className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center hover:border-amber-400 transition-colors">
              <div className="text-2xl font-bold text-amber-600">
                {avgRating ?? "-"}
                {avgRating && <span className="text-amber-400 text-lg ml-0.5">★</span>}
              </div>
              <div className="text-xs text-stone-500 mt-0.5">
                {artist.reviews.length > 0 ? `${artist.reviews.length} review${artist.reviews.length > 1 ? "s" : ""}` : "No reviews yet"}
              </div>
            </Link>
          </div>
        )}

        {/* Bio */}
        <SectionCard title="About">
          <div
            className="max-w-measure text-left font-sans prose prose-sm prose-stone sm:prose-base [text-wrap:pretty]"
            dangerouslySetInnerHTML={{ __html: normalizeBioHtmlForDisplay(artist.bio) }}
          />
        </SectionCard>

        {/* Collab history */}
        {collabsRatingsEnabled && (
          <SectionCard title={`Collab History (${artist.collabs.length})`}>
            {artist.collabs.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No collabs yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {artist.collabs.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {c.role}{c.closedAt && ` · Closed ${c.closedAt}`}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                      c.status === "active"    ? "bg-green-50 text-green-700 border border-green-200" :
                      c.status === "completed" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                      "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}>
                      {c.status === "active" ? "Active" : c.status === "completed" ? "Completed" : "Incomplete"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {/* Availability - gated */}
        <SectionCard title={collabsRatingsEnabled ? "Availability for Collabs" : "Availability"}>
          {isLoggedIn ? (
            artist.availabilityDates.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No availability marked yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {artist.availabilityDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <span className="text-green-600">📅</span>
                    <span className="text-sm text-green-800 font-medium">
                      {formatDeploymentCalendarDate(d.from)}
                      {" → "}
                      {formatDeploymentCalendarDate(d.to)}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-5 py-6 text-center">
              <p className="text-2xl mb-2">🔒</p>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                {artist.availabilityDates.length > 0
                  ? `${artist.availabilityDates.length} availability window${artist.availabilityDates.length > 1 ? "s" : ""} marked`
                  : "Availability calendar"}
              </p>
              <p className="text-xs text-amber-600 mb-4">
                {collabsRatingsEnabled
                  ? "Log in as a registered artist to view exact dates and initiate a collab."
                  : "Log in as a registered artist to view exact dates for planning meetups."}
              </p>
              <Link href="/auth/login"
                className="inline-block px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-lg hover:bg-amber-800 transition-colors">
                Log in to view
              </Link>
            </div>
          )}
        </SectionCard>

        {/* Reviews - paginated, with anchors */}
        {collabsRatingsEnabled && (
        <div
          id="reviews"
          className="mb-6 scroll-mt-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:mb-7 sm:p-8"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-amber-400/70 pb-2">
            <PortalSectionHeading variant="label" textOnly className="mb-0">
              Reviews ({artist.reviews.length})
              {avgRating && (
                <span className="ml-2 font-sans text-base font-bold normal-case text-amber-600">{avgRating}★</span>
              )}
            </PortalSectionHeading>
            {totalPages > 1 && (
              <span className="text-xs text-stone-400">Page {reviewPage} of {totalPages}</span>
            )}
          </div>

          {artist.reviews.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No reviews yet.</p>
          ) : (
            <>
              <div className="flex flex-col gap-4">
              {pagedReviews.map((r) => {
                  const canEdit = isLoggedIn && (
                    session?.role === "admin" || currentArtistId === r.reviewerId
                  );

                  return (
                    <div key={r.id} id={r.id} className="border border-stone-100 rounded-lg p-4 scroll-mt-6">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <Link href={`/artists/${r.reviewerSlug}`}
                            className="text-sm font-semibold text-stone-800 hover:text-amber-800 transition-colors">
                            {r.from}
                          </Link>
                          <p className="text-xs text-stone-400 mt-0.5">{r.collab} · {r.date}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StarRating rating={r.rating} />
                          {canEdit && (
                            <Link
                              href={`/collabs/${r.collabId}?editReviewFor=${artist.id}`}
                              className="text-xs text-amber-600 hover:text-amber-800 font-medium border border-amber-200 rounded px-2 py-0.5 hover:bg-amber-50 transition-colors"
                            >
                              Edit
                            </Link>
                          )}
                          <a href={`#${r.id}`}
                            className="text-xs text-stone-300 hover:text-stone-500 transition-colors"
                            title="Permalink to this review">
                            #
                          </a>
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-stone-600 leading-relaxed italic">&ldquo;{r.comment}&rdquo;</p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-stone-100">
                  {reviewPage > 1 && (
                    <Link
                      href={`/artists/${artist.slug}?reviewPage=${reviewPage - 1}#reviews`}
                      className="px-3 py-1.5 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors min-h-[36px] flex items-center"
                    >
                      ← Prev
                    </Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <Link
                      key={p}
                      href={`/artists/${artist.slug}?reviewPage=${p}#reviews`}
                      className={`px-3 py-1.5 text-sm font-medium rounded-lg min-h-[36px] flex items-center transition-colors ${
                        p === reviewPage
                          ? "bg-amber-700 text-white"
                          : "text-stone-600 border border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  {reviewPage < totalPages && (
                    <Link
                      href={`/artists/${artist.slug}?reviewPage=${reviewPage + 1}#reviews`}
                      className="px-3 py-1.5 text-sm font-medium text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-50 transition-colors min-h-[36px] flex items-center"
                    >
                      Next →
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* External links */}
        {artist.links.length > 0 && (
          <SectionCard title="Links">
            <div className="flex flex-wrap gap-3">
              {artist.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 text-sm font-medium rounded-lg transition-colors">
                  {l.type} ↗
                </a>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </main>
  );
}
