import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { createCollabAction } from "../actions";

export default async function NewCollabPage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link href="/collabs" className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900">
            ← Back to collabs
          </Link>
          <h1 className="text-3xl font-bold text-stone-800">Create Collab</h1>
          <p className="mt-1 text-sm text-stone-500">
            Create a collab and optionally invite artists by email.
          </p>
        </div>

        <form action={createCollabAction} className="space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Collab name</label>
            <input
              type="text"
              name="name"
              required
              placeholder="e.g. Margazhi Concert Prep"
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Description</label>
            <textarea
              name="description"
              rows={4}
              placeholder="Purpose, timeline, repertoire, logistics…"
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-stone-700">Invite by email (optional)</label>
            <input
              type="text"
              name="invitedEmails"
              placeholder="a@x.com,b@y.com"
              className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <p className="mt-1 text-xs text-stone-400">Comma-separated. Only existing artists are added.</p>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-amber-700 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            Create Collab
          </button>
        </form>
      </div>
    </main>
  );
}
