import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDeploymentClockLabelForUi } from "@/deployment.config";
import { getDb } from "@/lib/db";
import { verifySession } from "@/lib/session-jwt";
import { AvailabilityManager } from "./availability-manager";

export default async function AvailabilityPage() {
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session) redirect("/auth/login");

  const entries = await getDb().availabilityEntry.findMany({
    where: { artistId: session.artistId },
    orderBy: [{ startDate: "asc" }, { endDate: "asc" }],
    select: { id: true, startDate: true, endDate: true },
  });

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900"
          >
            ← Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Availability Calendar</h1>
          <p className="mt-1 text-sm text-stone-500">
            Add date ranges when you are open for collaborations. Dates use the {getDeploymentClockLabelForUi()} calendar.
          </p>
        </div>

        <AvailabilityManager
          initialEntries={entries.map((entry) => ({
            id: entry.id,
            startDate: entry.startDate.toISOString().slice(0, 10),
            endDate: entry.endDate.toISOString().slice(0, 10),
          }))}
        />
      </div>
    </main>
  );
}
