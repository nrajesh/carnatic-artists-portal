import Link from "next/link";
import { notFound } from "next/navigation";

const DUMMY_ARTISTS: Record<string, { id: string; name: string; email: string; province: string; specialities: string[]; status: string }> = {
  "1":  { id: "1",  name: "Lakshmi Narayanan",      email: "lakshmi@example.com",  province: "Noord-Holland", specialities: ["Vocal"],            status: "active"    },
  "2":  { id: "2",  name: "Ravi Krishnamurthy",     email: "ravi@example.com",     province: "Zuid-Holland",  specialities: ["Violin"],           status: "active"    },
  "3":  { id: "3",  name: "Anand Subramanian",      email: "anand@example.com",    province: "Utrecht",       specialities: ["Mridangam"],        status: "active"    },
  "8":  { id: "8",  name: "Divya Ramachandran",     email: "divya@example.com",    province: "Utrecht",       specialities: ["Kanjira"],          status: "suspended" },
};

export default async function EditArtistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const artist = DUMMY_ARTISTS[id];
  if (!artist) notFound();

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/artists" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">
        Back to Artists
      </Link>
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-800 mb-6">Edit Artist: {artist.name}</h1>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Full Name</label>
            <input defaultValue={artist.name} disabled className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Email</label>
            <input defaultValue={artist.email} disabled className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Province</label>
            <input defaultValue={artist.province} disabled className="w-full border border-stone-200 rounded-lg px-3 py-2 text-stone-700 bg-stone-50 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Specialities</label>
            <div className="flex flex-wrap gap-2">
              {artist.specialities.map(s => (
                <span key={s} className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-1 rounded-full font-medium">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-1">Account Status</label>
            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${artist.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {artist.status === "active" ? "Active" : "Suspended"}
            </span>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs text-stone-400">Full edit functionality will be enabled once the database is connected.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
