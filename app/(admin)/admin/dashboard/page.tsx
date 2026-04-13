import Link from "next/link";

export default function AdminDashboardPage() {
  return (
    <main className="min-h-screen bg-stone-50 px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-800">Admin Dashboard</h1>
          <p className="text-stone-500 mt-1">Manage the Carnatic Artist Portal</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Link href="/admin/registrations" className="group bg-white rounded-2xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">📋</div>
            <h2 className="font-semibold text-stone-800 group-hover:text-amber-800">Registration Requests</h2>
            <p className="text-sm text-stone-500 mt-1">Review and approve new artist applications</p>
          </Link>

          <Link href="/admin/artists" className="group bg-white rounded-2xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">🎵</div>
            <h2 className="font-semibold text-stone-800 group-hover:text-amber-800">Artists</h2>
            <p className="text-sm text-stone-500 mt-1">View, edit, and manage artist profiles</p>
          </Link>

          <Link href="/admin/collabs" className="group bg-white rounded-2xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">💬</div>
            <h2 className="font-semibold text-stone-800 group-hover:text-amber-800">Collabs</h2>
            <p className="text-sm text-stone-500 mt-1">Monitor and moderate group chats</p>
          </Link>

          <Link href="/admin/specialities" className="group bg-white rounded-2xl border border-stone-200 p-6 hover:border-amber-400 hover:shadow-md transition-all">
            <div className="text-3xl mb-3">🎨</div>
            <h2 className="font-semibold text-stone-800 group-hover:text-amber-800">Specialities</h2>
            <p className="text-sm text-stone-500 mt-1">Manage instrument specialities and colour themes</p>
          </Link>
        </div>

        <div className="mt-8 flex gap-4">
          <Link href="/" className="text-sm text-stone-500 hover:text-stone-700 underline underline-offset-2">← Back to portal</Link>
          <Link href="/api/auth/logout" className="text-sm text-red-500 hover:text-red-700 underline underline-offset-2">Log out</Link>
        </div>
      </div>
    </main>
  );
}
