import Link from "next/link";
import { DUMMY_ARTISTS } from "@/lib/dummy-artists";

// ---------------------------------------------------------------------------
// Dummy collab data for home page preview
// ---------------------------------------------------------------------------
const DUMMY_COLLABS = [
  { slug: "margazhi-concert-prep",    name: "Margazhi Concert Prep",    members: 4, status: "active"    },
  { slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025", members: 6, status: "active"    },
  { slug: "rotterdam-kutcheri",       name: "Rotterdam Kutcheri",       members: 3, status: "completed" },
];

const SINGER_OF_DAY        = DUMMY_ARTISTS.find(a => a.specialities[0]?.name === "Vocal")!;
const INSTRUMENTALIST_OF_DAY = DUMMY_ARTISTS.find(a => a.specialities[0]?.name === "Mridangam")!;

export default function HomePage() {
  const totalArtists = DUMMY_ARTISTS.length;
  const seekingCollab = 4; // dummy count
  const totalCollabs = DUMMY_COLLABS.length;

  return (
    <main className="min-h-screen bg-amber-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 text-white px-6 py-20 text-center">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight">
          Carnatic Artist Portal
        </h1>
        <p className="text-amber-200 text-lg sm:text-xl max-w-xl mx-auto mb-8">
          Connecting Carnatic musicians across The Netherlands - singers,
          violinists, percussionists, and more.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="px-6 py-3 bg-white text-amber-900 font-semibold rounded-lg hover:bg-amber-100 transition-colors min-h-[44px] flex items-center"
          >
            Join as an Artist
          </Link>
          <Link
            href="/artists"
            className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors min-h-[44px] flex items-center"
          >
            Browse Artists
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-3 gap-4 sm:gap-6 text-center">
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{totalArtists}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Registered Artists</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{seekingCollab}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Seeking Collabs</div>
        </div>
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 sm:p-6">
          <div className="text-3xl font-bold text-amber-800">{totalCollabs}</div>
          <div className="text-xs sm:text-sm text-amber-600 mt-1">Active Collabs</div>
        </div>
      </div>

      {/* Featured artists of the day */}
      <div className="max-w-4xl mx-auto px-6 pb-10 grid sm:grid-cols-2 gap-6">
        {/* Singer of the Day */}
        <Link href={`/artists/${SINGER_OF_DAY.slug}`} className="group block bg-white rounded-2xl border border-amber-200 shadow-sm p-6 hover:shadow-md hover:border-amber-400 transition-all">
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-3">
            🎤 Singer of the Day
          </h2>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: SINGER_OF_DAY.specialities[0].color, color: "#FFFFFF" }}
            >
              {SINGER_OF_DAY.name[0]}
            </div>
            <div>
              <p className="font-semibold text-stone-800 group-hover:text-amber-800 transition-colors">{SINGER_OF_DAY.name}</p>
              <p className="text-sm text-stone-500">{SINGER_OF_DAY.specialities[0].name} · {SINGER_OF_DAY.province}</p>
            </div>
          </div>
        </Link>

        {/* Instrumentalist of the Day */}
        <Link href={`/artists/${INSTRUMENTALIST_OF_DAY.slug}`} className="group block bg-white rounded-2xl border border-amber-200 shadow-sm p-6 hover:shadow-md hover:border-amber-400 transition-all">
          <h2 className="text-xs font-semibold text-amber-500 uppercase tracking-widest mb-3">
            🥁 Instrumentalist of the Day
          </h2>
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
              style={{ backgroundColor: INSTRUMENTALIST_OF_DAY.specialities[0].color, color: "#FFFFFF" }}
            >
              {INSTRUMENTALIST_OF_DAY.name[0]}
            </div>
            <div>
              <p className="font-semibold text-stone-800 group-hover:text-amber-800 transition-colors">{INSTRUMENTALIST_OF_DAY.name}</p>
              <p className="text-sm text-stone-500">{INSTRUMENTALIST_OF_DAY.specialities[0].name} · {INSTRUMENTALIST_OF_DAY.province}</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Artist directory preview */}
      <div className="max-w-4xl mx-auto px-6 pb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800">Artists</h2>
          <Link href="/artists" className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {DUMMY_ARTISTS.slice(0, 6).map((artist) => (
            <Link
              key={artist.id}
              href={`/artists/${artist.slug}`}
              className="group bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-400 hover:shadow-md transition-all"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mb-3"
                style={{ backgroundColor: artist.specialities[0].color, color: "#FFFFFF" }}
              >
                {artist.name[0]}
              </div>
              <p className="font-semibold text-stone-800 text-sm leading-tight group-hover:text-amber-800 transition-colors">{artist.name}</p>
              <span
                className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: artist.specialities[0].color + "22", color: artist.specialities[0].color }}
              >
                {artist.specialities[0].name}
              </span>
              <p className="text-xs text-stone-400 mt-1">{artist.province}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Active collabs preview */}
      <div className="max-w-4xl mx-auto px-6 pb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-800">Active Collabs</h2>
          <Link href="/auth/login" className="text-sm text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
            Join to participate →
          </Link>
        </div>
        <div className="flex flex-col gap-3">
          {DUMMY_COLLABS.map((collab) => (
            <div key={collab.slug} className="bg-white rounded-xl border border-stone-200 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-stone-800 text-sm">{collab.name}</p>
                <p className="text-xs text-stone-400 mt-0.5">{collab.members} artists</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                collab.status === "active"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-stone-100 text-stone-500 border border-stone-200"
              }`}>
                {collab.status === "active" ? "Active" : "Completed"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Dev login shortcuts - only shown in development */}
      {process.env.NODE_ENV !== 'production' && (
        <div className="max-w-4xl mx-auto px-6 pb-8">
          <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-5">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
              🛠 Dev shortcuts (not shown in production)
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/api/dev/login?role=admin"
                className="px-4 py-2 bg-amber-700 text-white text-sm font-semibold rounded-lg hover:bg-amber-800 transition-colors min-h-[44px] flex items-center"
              >
                Login as Admin
              </Link>
              <Link
                href="/api/dev/login?role=artist"
                className="px-4 py-2 bg-amber-100 text-amber-900 border border-amber-300 text-sm font-semibold rounded-lg hover:bg-amber-200 transition-colors min-h-[44px] flex items-center"
              >
                Login as Artist
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-white text-amber-700 border border-amber-300 text-sm font-semibold rounded-lg hover:bg-amber-50 transition-colors min-h-[44px] flex items-center"
              >
                Registration Form
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Footer nav */}
      <div className="border-t border-amber-200 bg-white px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 text-sm font-medium text-amber-700">
          <Link href="/register" className="hover:text-amber-900 underline underline-offset-2">Register as Artist</Link>
          <Link href="/artists" className="hover:text-amber-900 underline underline-offset-2">Browse Artists</Link>
          <Link href="/auth/login" className="hover:text-amber-900 underline underline-offset-2">Artist Login</Link>
          <Link href="/admin/registrations" className="hover:text-amber-900 underline underline-offset-2">Admin</Link>
          <Link href="/about" className="hover:text-amber-900 underline underline-offset-2">About this Portal</Link>
        </div>
      </div>
    </main>
  );
}
