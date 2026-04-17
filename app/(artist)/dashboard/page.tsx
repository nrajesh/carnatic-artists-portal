import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import { getArtistDashboardView } from "@/lib/queries/artists";
import { PostHogIdentify } from "@/components/posthog-identify";
import { DashboardViewTracker, EditProfileLink } from "@/components/dashboard-tracker";

export default async function ArtistDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ph_identify?: string }>;
}) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) {
    // Middleware already guards this route, but defence-in-depth if reached directly.
    redirect("/auth/login");
  }

  const { ph_identify } = await searchParams;
  const view = await getArtistDashboardView(session.artistId);

  // If the artist row was deleted but the session cookie is still live, drop back to login.
  if (!view) {
    redirect("/auth/login");
  }

  let province: string | null = view.province;
  if (ph_identify === "1") {
    try {
      const artist = await getDb().artist.findUnique({
        where: { id: session.artistId },
        select: { province: true },
      });
      province = artist?.province ?? view.province;
    } catch {
      // Identity stitching must not break the page.
    }
  }

  const activeCollabs = view.collabs.filter((c) => c.status === "active");
  const completedCollabs = view.collabs.filter((c) => c.status === "completed");

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="max-w-4xl mx-auto">
        {ph_identify === "1" && <PostHogIdentify artistId={view.id} province={province} />}
        <DashboardViewTracker />

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <p className="text-sm text-amber-700 mb-1">Welcome back</p>
            <h1 className="text-3xl font-bold text-stone-800">{view.name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {view.specialities.map((s) => (
                <span
                  key={s.name}
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ backgroundColor: s.color + "22", color: s.color }}
                >
                  {s.name}
                </span>
              ))}
              <span className="text-xs text-stone-400">📍 {view.province}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href={`/artists/${view.slug}`}
              className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-300 bg-white rounded-lg hover:bg-amber-50 transition-colors min-h-[44px] flex items-center"
            >
              View public profile
            </Link>
            <EditProfileLink className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors min-h-[44px] flex items-center">
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
              {view.avgRating ?? "-"}
              {view.avgRating && <span className="text-amber-400 text-lg">★</span>}
            </div>
            <div className="text-xs text-stone-500 mt-0.5">Avg rating</div>
          </div>
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
            <div className="text-2xl font-bold text-stone-800">{view.availabilityDates.length}</div>
            <div className="text-xs text-stone-500 mt-0.5">Availability windows</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">
                Notifications
                {view.unreadNotificationCount > 0 && (
                  <span className="ml-2 inline-block bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {view.unreadNotificationCount}
                  </span>
                )}
              </h2>
            </div>
            {view.notifications.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No notifications yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {view.notifications.map((n) => (
                  <Link
                    key={n.id}
                    href={n.href}
                    className={`flex gap-3 p-3 rounded-lg transition-all hover:shadow-sm ${
                      n.read
                        ? "bg-stone-50 hover:bg-stone-100"
                        : "bg-amber-50 border border-amber-100 hover:border-amber-300"
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {n.type === "collab_invite"
                        ? "💬"
                        : n.type === "feedback"
                          ? "⭐"
                          : n.type === "collab_closed"
                            ? "✅"
                            : "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          n.read ? "text-stone-600" : "text-stone-800 font-medium"
                        }`}
                      >
                        {n.text}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">{n.time}</p>
                    </div>
                    <span className="text-stone-300 text-sm self-center flex-shrink-0">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* My Collabs */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">My Collabs</h2>
              <Link
                href="/collabs/new"
                className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
              >
                + New collab
              </Link>
            </div>
            {view.collabs.length === 0 ? (
              <p className="text-stone-400 text-sm italic">
                You haven&apos;t joined or created any collabs yet.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {view.collabs.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collabs/${c.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all"
                  >
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{c.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{c.role}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                        c.status === "active"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : c.status === "completed"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-stone-100 text-stone-500 border border-stone-200"
                      }`}
                    >
                      {c.status === "active"
                        ? "Active"
                        : c.status === "completed"
                          ? "Completed"
                          : c.status === "completed_other"
                            ? "Closed"
                            : "Incomplete"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Availability */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-stone-800">My Availability</h2>
              <Link
                href="/profile/availability"
                className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2"
              >
                Manage →
              </Link>
            </div>
            {view.availabilityDates.length === 0 ? (
              <p className="text-stone-400 text-sm italic">
                No availability marked. Add dates so other artists can find you.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {view.availabilityDates.map((d, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-green-600 text-sm">📅</span>
                    <span className="text-xs text-green-800 font-medium">
                      {new Date(d.from).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                      {" → "}
                      {new Date(d.to).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
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
                { href: "/search", icon: "🔍", label: "Find artists" },
                { href: "/collabs", icon: "💬", label: "My collabs" },
                { href: "/profile/availability", icon: "📅", label: "Set availability" },
                { href: "/profile/notifications", icon: "🔔", label: "Notifications" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 p-3 rounded-lg border border-stone-100 hover:border-amber-300 hover:bg-amber-50 transition-all text-sm text-stone-700 font-medium"
                >
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

        <p className="text-xs text-stone-300 text-center mt-8">
          Logged in as {session.role} · Session expires{" "}
          {session.expiresAt.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </main>
  );
}
