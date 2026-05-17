import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifySession } from "@/lib/session-jwt";
import { isAdminProfilePhotoReportSortingEnabledServer } from "@/lib/feature-flags-server";
import {
  listAdminProfilePhotoReportRows,
  type AdminProfilePhotoReportSort,
} from "@/lib/queries/admin-profile-photo-reports";
import { ReportedProfilesTable } from "./reported-profiles-table";

const SortSchema = z.enum(["latest", "open_count", "total_count"]);

export default async function AdminReportedProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") redirect("/auth/login");

  const { sort } = await searchParams;
  const sortingEnabled = await isAdminProfilePhotoReportSortingEnabledServer({
    distinctId: session.artistId,
  });
  const parsedSort = SortSchema.safeParse(sort);
  const requestedSort = parsedSort.success ? parsedSort.data : "latest";
  const effectiveSort: AdminProfilePhotoReportSort =
    sortingEnabled || requestedSort === "latest" ? requestedSort : "latest";
  const rows = await listAdminProfilePhotoReportRows({ sort: effectiveSort });

  const sortLinkClass = (isActive: boolean) =>
    `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-stone-900 text-white"
        : "border border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:text-amber-900"
    }`;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link
        href="/admin/dashboard"
        className="mb-6 inline-block text-sm text-amber-700 hover:text-amber-900"
      >
        ← Dashboard
      </Link>
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">Reported Profiles</h1>
            <p className="mt-1 text-stone-500">
              Review reported profiles in bulk, clear images when needed, and suspend repeat
              offenders fast.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3 shadow-sm sm:min-w-[220px]">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-500">
              Open queue
            </div>
            <div className="mt-1 text-2xl font-bold text-stone-900">{rows.length}</div>
            <div className="text-xs text-stone-500">
              artist account{rows.length === 1 ? "" : "s"} awaiting review
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 sm:mr-1">Sort</span>
          <Link
            href="/admin/reported-profiles?sort=latest"
            className={sortLinkClass(effectiveSort === "latest")}
          >
            Latest report
          </Link>
          <Link
            href={
              sortingEnabled
                ? "/admin/reported-profiles?sort=open_count"
                : "/admin/reported-profiles"
            }
            className={sortLinkClass(effectiveSort === "open_count")}
            aria-disabled={!sortingEnabled}
          >
            Open report count
          </Link>
          <Link
            href={
              sortingEnabled
                ? "/admin/reported-profiles?sort=total_count"
                : "/admin/reported-profiles"
            }
            className={sortLinkClass(effectiveSort === "total_count")}
            aria-disabled={!sortingEnabled}
          >
            Total report count
          </Link>
        </div>

        <ReportedProfilesTable rows={rows} sortingEnabled={sortingEnabled} />
      </div>
    </main>
  );
}
