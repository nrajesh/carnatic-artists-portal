import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import { getArtistBySlug } from "@/lib/queries/artists";
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
    <div id={id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-5 scroll-mt-6">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

const REVIEWS_PER_PAGE = 5;

interface PageProps {
  params: { slug: string };
  searchParams: { reviewPage?: string };
}

export default async function ArtistProfilePage({ params, searchParams }: PageProps) {
  const artist = await getArtistBySlug(params.slug);
  if (!artist) notFound();

  const sessionCookie = cookies().get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const isLoggedIn = !!session;
  // For demo: treat the dev artist session as "Lakshmi Narayanan" (id: dev-artist-id)
  const currentArtistId = session?.artistId ?? null;

  const avgRating = artist.reviews.length
    ? (artist.reviews.reduce((s, r) => s + r.rating, 0) / artist.reviews.length).toFixed(1)
    : null;

  const primaryColor = artist.specialities[0]?.color ?? "#92400E";
  const activeCollabs    = artist.collabs.filter(c => c.status === "active");
  const completedCollabs = artist.collabs.filter(c => c.status === "completed");

  // Pagination
  const reviewPage = Math.max(1, parseInt(searchParams.reviewPage ?? "1", 10));
  const totalPages = Math.ceil(artist.reviews.length / REVIEWS_PER_PAGE);
  const pagedReviews = artist.reviews.slice(
    (reviewPage - 1) * REVIEWS_PER_PAGE,
    reviewPage * REVIEWS_PER_PAGE
  );

  return (
    <main className="min-h-screen bg-amber-50">
      <ArtistProfileTracker artistSlug={params.slug} />
      {/* Hero */}
      <div className="px-6 pt-10 pb-20 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}bb)` }}>
        <Link href="/artists" className="text-white/70 hover:text-white text-sm mb-6 inline-block">← All Artists</Link>
        <div className="flex items-center gap-5 max-w-3xl mx-auto">
          <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center text-3xl font-bold flex-shrink-0"
            style={{ backgroundColor: "rgba(255,255,255,0.2)" }}>
            {artist.name[0]}
          </div>
          <div>
            <h1 className="text-3xl font-bold">{artist.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {artist.specialities.map(s => (
                <span key={s.name} className="text-xs px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white">{s.name}</span>
              ))}
              {artist.availableForCollab && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-400/30 text-white border border-green-300/40">
                  Open to collab
                </span>
              )}
            </div>
            <p className="text-white/70 mt-1 text-sm">📍 {artist.province}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 -mt-10 pb-16">

        {/* Quick stats */}
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

        {/* Bio */}
        <SectionCard title="About">
          <div className="prose prose-stone max-w-none text-stone-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: artist.bio }} />
        </SectionCard>

        {/* Collab history */}
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

        {/* Availability - gated */}
        <SectionCard title="Availability for Collabs">
          {isLoggedIn ? (
            artist.availabilityDates.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No availability marked yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {artist.availabilityDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                    <span className="text-green-600">📅</span>
                    <span className="text-sm text-green-800 font-medium">
                      {new Date(d.from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {" → "}
                      {new Date(d.to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
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
                Log in as a registered artist to view exact dates and initiate a collab.
              </p>
              <Link href="/auth/login"
                className="inline-block px-5 py-2 bg-amber-700 text-white text-sm font-semibold rounded-lg hover:bg-amber-800 transition-colors">
                Log in to view
              </Link>
            </div>
          )}
        </SectionCard>

        {/* Reviews - paginated, with anchors */}
        <div id="reviews" className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 mb-5 scroll-mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
              Reviews ({artist.reviews.length})
              {avgRating && <span className="ml-2 text-amber-500 normal-case font-bold">{avgRating}★</span>}
            </h2>
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
                  // Edit is shown if: logged-in artist wrote this review, OR admin
                  const canEdit = isLoggedIn && (
                    session?.role === "admin" ||
                    session?.artistId === `dev-artist-id` // demo: dev session maps to lakshmi
                      ? r.reviewerSlug === "lakshmi-narayanan"
                      : false
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
                              href={`/artists/${artist.slug}?reviewPage=${reviewPage}#${r.id}`}
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
