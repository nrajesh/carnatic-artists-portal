import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import { DUMMY_ARTISTS } from "@/lib/dummy-artists";
import { getDb } from "@/lib/db";
import { PostHogIdentify } from "@/components/posthog-identify";
import { DashboardViewTracker, EditProfileLink } from "@/components/dashboard-tracker";

// Pick a dummy artist to represent the logged-in user
const CURRENT_ARTIST = DUMMY_ARTISTS[0]; // Lakshmi Narayanan

const DUMMY_NOTIFICATIONS = [
  { id: "n1", type: "collab_invite",  text: "Ravi Krishnamurthy added you to Thyagaraja Aradhana 2025",  time: "2 hours ago",  read: false, href: "/collabs/thyagaraja-aradhana-2025" },
  { id: "n2", type: "feedback",       text: "You received a new review from Meera Venkatesh",             time: "1 day ago",    read: false, href: `/artists/${CURRENT_ARTIST.slug}#reviews` },
  { id: "n3", type: "collab_invite",  text: "Karthik Seshadri added you to Percussion Ensemble NL",       time: "3 days ago",   read: true,  href: "/collabs/percussion-ensemble-nl" },
  { id: "n4", type: "collab_closed",  text: "Rotterdam Kutcheri has been marked as Completed",            time: "1 week ago",   read: true,  href: "/collabs/rotterdam-kutcheri" },
];

export default async function ArtistDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ph_identify?: string }>;
}) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const { ph_identify } = await searchParams;

  // Fetch province for identity stitching when ph_identify=1
  let province: string | null = null;
  if (ph_identify === "1" && session?.artistId) {
    try {
      const artist = await getDb().artist.findUnique({
        where: { id: session.artistId },
        select: { province: true },
      });
      province = artist?.province ?? null;
    } catch {
      // Silently ignore DB errors - analytics must not break the page
    }
  }

  const activeCollabs    = CURRENT_ARTIST.collabs.filter(c => c.status === "active");
  const completedCollabs = CURRENT_ARTIST.collabs.filter(c => c.status === "completed");
  const unreadCount      = DUMMY_NOTIFICATIONS.filter(n => !n.read).length;
  const avgRating = CURRENT_ARTIST.reviews.length
    ? (CURRENT_ARTIST.reviews.reduce((s, r) => s + r.rating, 0) / CURRENT_ARTIST.reviews.length).toFixed(1)
    : null;

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Identity stitching: runs once after magic-link login */}
        {ph_identify === "1" && session?.artistId && (
          <PostHogIdentify artistId={session.artistId} province={province} />
        )}

        {/* Analytics: fires dashboard_viewed on mount */}
        <DashboardViewTracker />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-sm text-amber-700 mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-stone-800">{CURRENT_ARTIST.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {CURRENT_ARTIST.specialities.map(s => (
                <span key={s.name} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: s.color + "22", color: s.color }}>
                  {s.name}
                </span>
              ))}
              <span className="text-xs text-stone-400">📍 {CURRENT_ARTIST.province}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link href={`/artists/${CURRENT_ARTIST.slug}`}
              className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-300 bg-white rounded-lg hover:bg-amber-50 transition-colors min-h-[44px] flex items-center">
              View public profile
            </Link>
            <EditProfileLink
              className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors min-h-[44px] flex items-center">
              Edit profile
            </EditProfileLink>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-stone-800">{activeCollabs.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Active collabs</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-stone-800">{completedCollabs.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Completed</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">
              {avgRating ?? "-"}{avgRating && <span className="text-amber-400 text-lg">★</span>}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Avg rating</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-stone-800">
              {CURRENT_ARTIST.availabilityDates.length}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Availability windows</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-block bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {DUMMY_NOTIFICATIONS.map(n => (
                <Link key={n.id} href={n.href}
                  className={`flex gap-3 p-3 rounded-lg transition-all hover:shadow-sm ${
                    n.read
                      ? "bg-stone-50 hover:bg-stone-100"
                      : "bg-amber-50 border border-amber-100 hover:border-amber-300"
                  }`}>
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {n.type === "collab_invite" ? "💬" : n.type === "feedback" ? "⭐" : "✅"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.read ? "text-stone-600" : "text-stone-800 font-medium"}`}>
                      {n.text}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{n.time}</p>
                  </div>
                  <span className="text-stone-300 text-sm self-center flex-shrink-0">→</span>
                </Link>
              ))}
            </div>
          </div>

          {/* My Collabs */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">My Collabs</h2>
              <Link href="/collabs/new" className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                + New collab
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              {CURRENT_ARTIST.collabs.map(c => (
                <Link key={c.id} href={`/collabs/${c.slug}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all">
                  <div>
                    <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{c.role}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                    c.status === "active"    ? "bg-green-50 text-green-700 border border-green-200" :
                    c.status === "completed" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                    "bg-stone-100 text-stone-500 border border-stone-200"
                  }`}>
                    {c.status === "active" ? "Active" : c.status === "completed" ? "Completed" : "Incomplete"}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">My Availability</h2>
              <Link href="/profile/availability" className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                Manage →
              </Link>
            </div>
            {CURRENT_ARTIST.availabilityDates.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No availability marked. Add dates so other artists can find you.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {CURRENT_ARTIST.availabilityDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <span className="text-green-600 text-sm">📅</span>
                    <span className="text-xs text-green-800 font-medium">
                      {new Date(d.from).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      {" → "}
                      {new Date(d.to).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <h2 className="text-sm font-bold text-stone-800 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/search",              icon: "🔍", label: "Find artists"     },
                { href: "/collabs",             icon: "💬", label: "My collabs"       },
                { href: "/profile/availability",icon: "📅", label: "Set availability" },
              ].map(item => (
                <Link key={item.href} href={item.href}
                  className="flex items-center gap-2 p-3 rounded-lg border border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm text-stone-700 font-medium">
                  <span>{item.icon}</span> {item.label}
                </Link>
              ))}
              <EditProfileLink className="flex items-center gap-2 p-3 rounded-lg border border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm text-stone-700 font-medium">
                <span>✏️</span> Edit profile
              </EditProfileLink>
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100">
              <form action="/api/auth/logout" method="POST" className="inline">
                <button
                  type="submit"
                  className="cursor-pointer border-0 bg-transparent p-0 text-xs text-stone-400 transition-colors hover:text-red-500"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>

        {session && (
          <p className="text-xs text-stone-300 text-center mt-8">
            Logged in as {session.role} · Session expires {session.expiresAt.toLocaleDateString("en-GB")}
          </p>
        )}
      </div>
    </main>
  );
}
