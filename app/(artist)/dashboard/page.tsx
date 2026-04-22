import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { formatDeploymentCalendarDate, formatDeploymentDateTime } from "@/lib/format-deployment-datetime";
import { verifySession } from "@/lib/session-jwt";
import { getDb } from "@/lib/db";
import { getArtistDashboardView } from "@/lib/queries/artists";
import { PostHogIdentify } from "@/components/posthog-identify";
import { DashboardViewTracker, EditProfileLink } from "@/components/dashboard-tracker";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { ArtistAccountStatus } from "@/components/artist-account-status";
import { PortalSectionHeading } from "@/components/portal-section-heading";

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
  const [view, collabsRatingsEnabled] = await Promise.all([
    getArtistDashboardView(session.artistId),
    isArtistCollabsRatingsEnabledServer({ distinctId: session.artistId }),
  ]);

  // If the artist row was deleted but the session cookie is still live, drop back to login.
  if (!view) {
    redirect("/auth/login");
  }

  const notificationsForDisplay = collabsRatingsEnabled
    ? view.notifications
    : view.notifications.filter(
        (n) => n.type !== "collab_invite" && n.type !== "feedback" && n.type !== "collab_closed",
      );
  const unreadNotificationsInView = notificationsForDisplay.filter((n) => !n.read).length;

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
        {ph_identify === "1" && (
          <PostHogIdentify
            artistId={view.id}
            province={province}
            personRole={session.role}
            replacePath="/dashboard"
          />
        )}
        <DashboardViewTracker />

        {/* Header */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
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
              {view.province.trim() ? (
                <span className="text-xs text-stone-400">📍 {view.province}</span>
              ) : null}
            </div>
            <div className="mt-4">
              <ArtistAccountStatus isSuspended={view.isSuspended} initialMessages={view.suspensionMessages} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/artists/${view.slug}`}
              className="px-4 py-2 text-sm font-semibold text-amber-700 border border-amber-300 bg-white rounded-lg hover:bg-amber-50 transition-colors min-h-[44px] flex items-center justify-center"
            >
              View public profile
            </Link>
            <EditProfileLink className="px-4 py-2 text-sm font-semibold text-white bg-amber-700 rounded-lg hover:bg-amber-800 transition-colors min-h-[44px] flex items-center justify-center">
              Edit profile
            </EditProfileLink>
          </div>
        </div>

        {session.role === "admin" && (
          <div className="mb-8 rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-6 shadow-sm">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <PortalSectionHeading variant="label" className="mb-0 border-amber-500/40 text-amber-950">
                  Admin tools
                </PortalSectionHeading>
                <p className="mt-1 text-sm text-stone-600 max-w-xl">
                  Jump to moderation: open an artist, then use{" "}
                  <span className="font-medium text-stone-800">Edit profile</span> for their data and{" "}
                  <span className="font-medium text-stone-800">Account status</span> to suspend or reactivate.
                </p>
              </div>
              <Link
                href="/admin/dashboard"
                className="text-sm font-semibold text-amber-800 underline-offset-2 hover:underline shrink-0"
              >
                Admin home →
              </Link>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Link
                href="/admin/registrations"
                className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-400 hover:shadow-sm"
              >
                <p className="text-lg mb-1">📋</p>
                <p className="text-sm font-semibold text-stone-800">Registration requests</p>
                <p className="text-xs text-stone-500 mt-0.5">Approve or decline new artists</p>
              </Link>
              <Link
                href="/admin/artists"
                className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-400 hover:shadow-sm"
              >
                <p className="text-lg mb-1">🎵</p>
                <p className="text-sm font-semibold text-stone-800">Artists & profiles</p>
                <p className="text-xs text-stone-500 mt-0.5">Directory, profile edits, account status</p>
              </Link>
              <Link
                href="/admin/specialities"
                className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-400 hover:shadow-sm"
              >
                <p className="text-lg mb-1">🎨</p>
                <p className="text-sm font-semibold text-stone-800">Specialities</p>
                <p className="text-xs text-stone-500 mt-0.5">Instruments and theme colours</p>
              </Link>
              {collabsRatingsEnabled ? (
                <Link
                  href="/admin/collabs"
                  className="rounded-xl border border-stone-200 bg-white p-4 transition-colors hover:border-amber-400 hover:shadow-sm"
                >
                  <p className="text-lg mb-1">💬</p>
                  <p className="text-sm font-semibold text-stone-800">Collabs (admin)</p>
                  <p className="text-xs text-stone-500 mt-0.5">Review and moderate projects</p>
                </Link>
              ) : null}
            </div>
          </div>
        )}

        {session.role === "artist" && (
          <div className="mb-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <PortalSectionHeading variant="title" className="mb-1">
                  Your public bio
                </PortalSectionHeading>
                <p className="text-xs text-stone-500 mt-1">
                  This is what visitors read on your profile - keep it current together with your details.
                </p>
                {view.hasBio ? (
                  <p className="mt-3 text-sm text-stone-700 leading-relaxed whitespace-pre-wrap border-l-2 border-amber-200 pl-4">
                    {view.bioPlainPreview}
                  </p>
                ) : (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
                    You have not added a bio yet. A few sentences about your music helps others discover you.
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                <Link
                  href="/profile/edit#profile-bio"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 transition-colors"
                >
                  {view.hasBio ? "Edit bio" : "Add bio"}
                </Link>
                <EditProfileLink className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:border-amber-300 hover:bg-amber-50/50 transition-colors text-center">
                  All profile fields
                </EditProfileLink>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div
          className={`grid gap-4 mb-8 ${
            collabsRatingsEnabled ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
          }`}
        >
          {collabsRatingsEnabled ? (
            <>
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
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-stone-800">{view.specialities.length}</div>
                <div className="text-xs text-stone-500 mt-0.5">Specialities</div>
              </div>
              <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-stone-800">{view.availabilityDates.length}</div>
                <div className="text-xs text-stone-500 mt-0.5">Availability windows</div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-6">
          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-400/70 pb-2">
              <PortalSectionHeading variant="title" textOnly className="mb-0">
                Notifications
                {unreadNotificationsInView > 0 && (
                  <span className="ml-2 inline-block rounded-full bg-amber-600 px-2 py-0.5 text-xs font-bold text-white">
                    {unreadNotificationsInView}
                  </span>
                )}
              </PortalSectionHeading>
            </div>
            {notificationsForDisplay.length === 0 ? (
              <p className="text-stone-400 text-sm italic">No notifications yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {notificationsForDisplay.map((n) => (
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
          {collabsRatingsEnabled && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-400/70 pb-2">
                <PortalSectionHeading variant="title" textOnly className="mb-0">
                  My Collabs
                </PortalSectionHeading>
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
          )}

          {/* Availability */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-amber-400/70 pb-2">
              <PortalSectionHeading variant="title" textOnly className="mb-0">
                My Availability
              </PortalSectionHeading>
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
                      {formatDeploymentCalendarDate(d.from)}
                      {" → "}
                      {formatDeploymentCalendarDate(d.to)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
            <PortalSectionHeading variant="title" className="mb-4">
              Quick Links
            </PortalSectionHeading>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/search", icon: "🔍", label: "Find artists" },
                ...(collabsRatingsEnabled
                  ? [{ href: "/collabs" as const, icon: "💬", label: "My collabs" }]
                  : []),
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
          Logged in as{" "}
          {session.role === "admin" ? `${view.name} (admin)` : view.name} · Session expires{" "}
          {formatDeploymentDateTime(session.expiresAt)}
        </p>
      </div>
    </main>
  );
}
