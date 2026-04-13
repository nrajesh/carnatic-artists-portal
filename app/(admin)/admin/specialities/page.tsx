import Link from "next/link";

const DUMMY_SPECIALITIES = [
  { id: "s1",  name: "Vocal",              primaryColor: "#7C3AED", textColor: "#FFFFFF", artistCount: 3 },
  { id: "s2",  name: "Violin",             primaryColor: "#B45309", textColor: "#FFFFFF", artistCount: 2 },
  { id: "s3",  name: "Mridangam",          primaryColor: "#B91C1C", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s4",  name: "Veena",              primaryColor: "#047857", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s5",  name: "Flute",              primaryColor: "#0369A1", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s6",  name: "Ghatam",             primaryColor: "#92400E", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s7",  name: "Kanjira",            primaryColor: "#BE185D", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s8",  name: "Thavil",             primaryColor: "#7E22CE", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s9",  name: "Nadaswaram",         primaryColor: "#C2410C", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s10", name: "Violin (Carnatic)",  primaryColor: "#A16207", textColor: "#FFFFFF", artistCount: 0 },
  { id: "s11", name: "Morsing",            primaryColor: "#065F46", textColor: "#FFFFFF", artistCount: 1 },
  { id: "s12", name: "Tavil",              primaryColor: "#1D4ED8", textColor: "#FFFFFF", artistCount: 0 },
];

export default function AdminSpecialitiesPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">
        Dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-800">Specialities</h1>
          <p className="text-stone-500 mt-1">{DUMMY_SPECIALITIES.length} specialities configured</p>
        </div>
        <button
          disabled
          title="Connect DB to enable"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg opacity-50 cursor-not-allowed"
        >
          + Add Speciality
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {DUMMY_SPECIALITIES.map((spec) => (
          <div key={spec.id} className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div
              className="h-12 flex items-center px-5"
              style={{ background: `linear-gradient(135deg, ${spec.primaryColor}, ${spec.primaryColor}cc)` }}
            >
              <span className="font-bold text-white text-sm">{spec.name}</span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full border border-stone-200" style={{ backgroundColor: spec.primaryColor }} />
                  <span className="text-xs text-stone-500 font-mono">{spec.primaryColor}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400">{spec.artistCount} artist{spec.artistCount !== 1 ? "s" : ""}</span>
                <button
                  disabled
                  title="Connect DB to enable"
                  className="text-xs text-amber-700 font-medium opacity-40 cursor-not-allowed"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-stone-400 text-center">
        Add/Edit/Delete actions will be enabled once the database is connected.
      </p>
    </main>
  );
}
