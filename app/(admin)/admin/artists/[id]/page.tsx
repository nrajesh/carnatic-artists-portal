import Link from "next/link";
import { notFound } from "next/navigation";
import { DUMMY_ARTISTS_MAP } from "@/lib/dummy-artists";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`text-base ${i <= rating ? "text-amber-500" : "text-stone-200"}`}>★</span>
      ))}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 mb-5">
      <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default function AdminArtistDetailPage({ params }: { params: { id: string } }) {
  const artist = DUMMY_ARTISTS_MAP[params.id];
  if (!artist) notFound();

  const completedCollabs = artist.collabs.filter(c => c.status === "completed");
  const activeCollabs    = artist.collabs.filter(c => c.status === "active");
  const avgRating = artist.reviews.length
    ? (artist.reviews.reduce((s, r) => s + r.rating, 0) / artist.reviews.length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/artists" className="text-sm text-amber-700 hover:text-amber-900 font-medium">← Artists</Link>
          <span className="text-stone-300">/</span>
          <span className="text-sm text-stone-500">{artist.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden mb-5">
          <div
            className="h-24 px-6 flex items-end pb-4"
            style={{ background: `linear-gradient(135deg, ${artist.specialities[0]?.color ?? "#92400E"}, ${artist.specialities[0]?.color ?? "#92400E"}99)` }}
          >
            <div className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center text-2xl font-bold text-white translate-y-8 flex-shrink-0"
              style={{ backgroundColor: artist.specialities[0]?.color ?? "#92400E" }}>
              {artist.name[0]}
            </div>
          </div>
          <div className="pt-10 px-6 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-stone-800">{artist.name}</h1>
                <p className="text-stone-500 text-sm mt-0.5">{artist.email} · {artist.contactNumber}
                  <span className="ml-1 text-xs text-stone-400">({artist.contactType === "whatsapp" ? "WhatsApp" : "Mobile"})</span>
                </p>
                <p className="text-stone-400 text-xs mt-1">📍 {artist.province} · Joined {artist.joinedAt}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${artist.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {artist.status === "active" ? "Active" : "Suspended"}
                </span>
                <Link href={`/admin/artists/${artist.id}/edit`}
                  className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                  Edit profile
                </Link>
              </div>
            </div>

            {/* Specialities */}
            <div className="flex flex-wrap gap-2 mt-4">
              {artist.specialities.map(s => (
                <span key={s.name} className="text-xs px-3 py-1 rounded-full font-semibold"
                  style={{ backgroundColor: s.color + "22", color: s.color }}>
                  {s.name}
                </span>
              ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-stone-800">{activeCollabs.length}</div>
                <div className="text-xs text-stone-500 mt-0.5">Active collabs</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-stone-800">{completedCollabs.length}</div>
                <div className="text-xs text-stone-500 mt-0.5">Completed collabs</div>
              </div>
              <div className="bg-stone-50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold text-amber-600">{avgRating ?? "-"}</div>
                <div className="text-xs text-stone-500 mt-0.5">Avg rating {artist.reviews.length > 0 && `(${artist.reviews.length})`}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bio */}
        {artist.bio && (
          <SectionCard title="About">
            <div className="prose prose-stone max-w-none text-stone-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: artist.bio }} />
          </SectionCard>
        )}

        {/* Availability */}
        <SectionCard title="Availability Calendar">
          {artist.availabilityDates.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No availability marked.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {artist.availabilityDates.map((d, i) => (
                <div key={i} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2.5">
                  <span className="text-green-600 text-sm">📅</span>
                  <span className="text-sm text-green-800 font-medium">
                    {new Date(d.from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    {" → "}
                    {new Date(d.to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Collabs */}
        <SectionCard title={`Collabs (${artist.collabs.length})`}>
          {artist.collabs.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No collabs yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {artist.collabs.map(c => (
                <div key={c.id} className="flex items-center justify-between gap-3 border border-stone-100 rounded-lg px-4 py-3 hover:bg-stone-50 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {c.role}
                      {c.closedAt && ` · Closed ${c.closedAt}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      c.status === "active"    ? "bg-green-50 text-green-700 border border-green-200" :
                      c.status === "completed" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                      "bg-stone-100 text-stone-500 border border-stone-200"
                    }`}>
                      {c.status === "active" ? "Active" : c.status === "completed" ? "Completed" : "Incomplete"}
                    </span>
                    <Link href={`/admin/collabs/${c.id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">View</Link>                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Reviews */}
        <SectionCard title={`Reviews received (${artist.reviews.length})`}>
          {artist.reviews.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No reviews yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {artist.reviews.map((r, i) => (
                <div key={i} className="border border-stone-100 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{r.from}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{r.collab} · {r.date}</p>
                    </div>
                    <StarRating rating={r.rating} />
                  </div>
                  {r.comment && <p className="text-sm text-stone-600 leading-relaxed italic">&ldquo;{r.comment}&rdquo;</p>}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* External links */}
        {artist.links.length > 0 && (
          <SectionCard title="External Links">
            <div className="flex flex-wrap gap-3">
              {artist.links.map((l, i) => (
                <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                  {l.type}
                </a>
              ))}
            </div>
          </SectionCard>
        )}
      </div>
    </main>
  );
}
