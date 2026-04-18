import Link from "next/link";
import { listSpecialitiesForAdmin } from "@/lib/queries/admin-specialities";
import { AddSpecialityForm } from "./add-speciality-form";
import { SpecialityCard } from "./speciality-card";

export default async function AdminSpecialitiesPage() {
  const specialities = await listSpecialitiesForAdmin();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="mb-6 inline-block text-sm text-amber-700 hover:text-amber-900">
        ← Dashboard
      </Link>

      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Specialities</h1>
          <p className="mt-1 text-stone-500">{specialities.length} specialities in the database</p>
        </div>
      </div>

      <AddSpecialityForm />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialities.map((spec) => (
          <SpecialityCard key={spec.id} row={spec} />
        ))}
      </div>

      {specialities.length === 0 ? (
        <p className="mt-8 text-center text-sm text-stone-500">No specialities yet - add one above or run the database seed.</p>
      ) : null}
    </main>
  );
}
