import Link from "next/link";
import { listArtistsForAdmin } from "@/lib/queries/admin-artists";
import { AdminArtistsTable } from "./admin-artists-table";

export default async function AdminArtistsPage() {
  const rows = await listArtistsForAdmin();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="mb-6 inline-block text-sm text-amber-700 hover:text-amber-900">
        ← Dashboard
      </Link>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Artists</h1>
          <p className="mt-1 text-stone-500">{rows.length} registered artists</p>
        </div>
      </div>
      <AdminArtistsTable rows={rows} />
    </main>
  );
}
