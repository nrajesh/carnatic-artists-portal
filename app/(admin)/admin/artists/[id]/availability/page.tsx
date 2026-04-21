import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { deploymentCalendarDateToday } from "@/lib/availability-calendar";
import { getDeploymentClockLabelForUi } from "@/deployment.config";
import { getDb } from "@/lib/db";
import { listAvailabilityEntryViews } from "@/lib/availability-window-ops";
import { verifySession } from "@/lib/session-jwt";
import { AvailabilityManager } from "@/app/(artist)/profile/availability/availability-manager";
import {
  createAdminAvailabilityWindowAction,
  deleteAdminAvailabilityWindowAction,
  updateAdminAvailabilityWindowAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminArtistAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const token = (await cookies()).get("session")?.value ?? null;
  const session = token ? await verifySession(token) : null;
  if (!session || session.role !== "admin") {
    redirect("/auth/login");
  }

  const artist = await getDb().artist.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
    },
  });

  if (!artist) notFound();

  const initialEntries = await listAvailabilityEntryViews(artist.id);
  const minCalendarDate = deploymentCalendarDateToday();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href={`/admin/artists/${artist.id}/edit`}
            className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900"
          >
            ← Back to edit profile
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">
            Availability - {artist.fullName}
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Managing windows for this artist&apos;s profile. Dates use the{" "}
            {getDeploymentClockLabelForUi()} calendar.
          </p>
        </div>

        <AvailabilityManager
          initialEntries={initialEntries}
          minCalendarDate={minCalendarDate}
          createWindowAction={createAdminAvailabilityWindowAction.bind(null, artist.id)}
          updateWindowAction={updateAdminAvailabilityWindowAction.bind(null, artist.id)}
          deleteWindowAction={deleteAdminAvailabilityWindowAction.bind(null, artist.id)}
        />
      </div>
    </main>
  );
}
