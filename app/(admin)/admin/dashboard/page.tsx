import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboardTracker } from "@/components/admin-dashboard-tracker";
import { PostHogIdentify } from "@/components/posthog-identify";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import { SiteBrandMark } from "@/components/site-brand-mark";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ ph_identify?: string }>;
}) {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session?.artistId) redirect("/auth/login");
  const { ph_identify } = await searchParams;

  let identifyProvince: string | null = null;
  if (ph_identify === "1") {
    try {
      const row = await getDb().artist.findUnique({
        where: { id: session.artistId },
        select: { province: true },
      });
      identifyProvince = row?.province?.trim() ? row.province : null;
    } catch {
      // Analytics only
    }
  }

  const collabsRatingsEnabled = await isArtistCollabsRatingsEnabledServer({
    distinctId: session.artistId,
  });

  const gridClass = collabsRatingsEnabled
    ? "grid grid-cols-1 gap-5 sm:grid-cols-2"
    : "grid grid-cols-1 gap-5 md:grid-cols-3";

  const cardClass =
    "group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm ring-1 ring-stone-100/80 transition-all duration-200 hover:border-amber-300/80 hover:shadow-lg hover:ring-amber-200/40";

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-100/80 to-stone-50 px-6 py-10">
      {ph_identify === "1" && (
        <PostHogIdentify
          artistId={session.artistId}
          province={identifyProvince}
          personRole="admin"
          replacePath="/admin/dashboard"
        />
      )}
      <AdminDashboardTracker />
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-stone-900">Admin Dashboard</h1>
          <p className="mt-1.5 text-stone-500">Manage Find Artists</p>
        </div>

        <div className={gridClass}>
          <Link href="/admin/registrations" className={cardClass}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/90 text-2xl shadow-inner ring-1 ring-amber-200/30">
              📋
            </div>
            <div>
              <h2 className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                Registration Requests
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                Review and approve new artist applications
              </p>
            </div>
          </Link>

          <Link href="/admin/artists" className={cardClass}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/90 text-2xl shadow-inner ring-1 ring-amber-200/30">
              <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-amber-700 text-white shadow-sm ring-1 ring-white/70">
                <SiteBrandMark className="h-9 w-9" />
              </span>
            </div>
            <div>
              <h2 className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                Artists
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                View, edit, and manage artist profiles
              </p>
            </div>
          </Link>

          <Link href="/admin/reported-profiles" className={cardClass}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-50 to-orange-100/90 text-2xl shadow-inner ring-1 ring-red-200/30">
              🚩
            </div>
            <div>
              <h2 className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                Reported Profiles
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                Review reported profiles, clear images, and suspend repeat offenders
              </p>
            </div>
          </Link>

          {collabsRatingsEnabled && (
            <Link href="/admin/collabs" className={cardClass}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/90 text-2xl shadow-inner ring-1 ring-amber-200/30">
                💬
              </div>
              <div>
                <h2 className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                  Collabs
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-stone-500">
                  Monitor and moderate group chats
                </p>
              </div>
            </Link>
          )}

          <Link href="/admin/specialities" className={cardClass}>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-amber-100/90 text-2xl shadow-inner ring-1 ring-amber-200/30">
              🎨
            </div>
            <div>
              <h2 className="font-semibold text-stone-800 transition-colors group-hover:text-amber-900">
                Specialities
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-stone-500">
                Manage instrument specialities and colour themes
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
