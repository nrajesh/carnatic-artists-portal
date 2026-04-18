import Link from "next/link";
import { formatDeploymentDate } from "@/lib/format-deployment-datetime";
import { getDb } from "@/lib/db";
import { Prisma } from "@prisma/client";

const VALID_STATUSES = ["pending", "approved", "rejected"] as const;
type RegistrationStatus = (typeof VALID_STATUSES)[number];

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:  "bg-amber-100 text-amber-800 border border-amber-300",
    approved: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return (
    <span className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-stone-100 text-stone-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

interface PageProps {
  searchParams: Promise<{ status?: string; from?: string; to?: string }>;
}

export default async function RegistrationsPage({ searchParams }: PageProps) {
  const { status, from, to } = await searchParams;
  const parsedStatus = VALID_STATUSES.includes(status as RegistrationStatus)
    ? (status as RegistrationStatus)
    : undefined;

  const where: Prisma.RegistrationRequestWhereInput = {};
  if (parsedStatus) {
    where.status = parsedStatus;
  }

  if (from || to) {
    const submittedAtFilter: Prisma.DateTimeFilter = {};
    if (from) {
      const fromDate = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(fromDate.getTime())) {
        submittedAtFilter.gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(toDate.getTime())) {
        submittedAtFilter.lte = toDate;
      }
    }
    if (submittedAtFilter.gte || submittedAtFilter.lte) {
      where.submittedAt = submittedAtFilter;
    }
  }

  const [registrations, pendingCount] = await Promise.all([
    getDb().registrationRequest.findMany({
      where,
      include: {
        specialities: {
          orderBy: { specialityName: "asc" },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
    getDb().registrationRequest.count({
      where: { status: "pending" },
    }),
  ]);

  const activeStatus = parsedStatus ?? "";

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">← Dashboard</Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Registration Requests</h1>
        {pendingCount > 0 ? (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-100 px-4 py-2 text-amber-800 border border-amber-300">
            <span className="text-2xl font-bold">{pendingCount}</span>
            <span className="font-medium">{pendingCount === 1 ? "request" : "requests"} pending review</span>
          </div>
        ) : (
          <p className="mt-2 text-stone-500">No pending requests - all caught up!</p>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">Status</label>
          <select name="status" defaultValue={activeStatus}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]">
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">From</label>
          <input type="date" name="from" defaultValue={from ?? ""}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-stone-600 uppercase tracking-wide">To</label>
          <input type="date" name="to" defaultValue={to ?? ""}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]" />
        </div>
        <button type="submit" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 min-h-[44px]">Filter</button>
        {(activeStatus || from || to) && (
          <Link href="/admin/registrations" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-stone-100 min-h-[44px] flex items-center">Clear</Link>
        )}
      </form>

      <p className="mb-4 text-sm text-stone-500">Showing {registrations.length} result{registrations.length !== 1 ? "s" : ""}</p>

      {registrations.length === 0 ? (
        <div className="rounded-xl border border-stone-200 bg-white p-12 text-center text-stone-400">No registration requests match the current filters.</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {registrations.map((reg) => (
            <li key={reg.id}>
              <Link href={`/admin/registrations/${reg.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:border-amber-400 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h2 className="text-base font-semibold text-stone-800 leading-tight">{reg.fullName}</h2>
                  <StatusBadge status={reg.status} />
                </div>
                <p className="text-sm text-stone-500 mb-3 truncate">{reg.email}</p>
                <div className="flex flex-wrap gap-1 mb-3">
                  {reg.specialities.map((spec) => (
                    <span key={spec.specialityName} className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 font-medium">{spec.specialityName}</span>
                  ))}
                </div>
                <p className="text-xs text-stone-400">
                  Submitted {formatDeploymentDate(reg.submittedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
