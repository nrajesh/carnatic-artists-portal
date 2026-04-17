import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { listCollabsForArtist } from "@/lib/queries/collabs";
import { deleteCollabAction, updateCollabStatusAction } from "./actions";

export default async function CollabListPage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");

  const collabs = await listCollabsForArtist(session.artistId);

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-stone-800">My Collabs</h1>
            <p className="mt-1 text-sm text-stone-500">
              Create, update, and manage your collaboration groups.
            </p>
          </div>
          <Link
            href="/collabs/new"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-800"
          >
            + New collab
          </Link>
        </div>

        {collabs.length === 0 ? (
          <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-stone-500">You are not part of any collab yet.</p>
            <Link
              href="/collabs/new"
              className="mt-3 inline-block rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100"
            >
              Create your first collab
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {collabs.map((c) => (
              <div key={c.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/collabs/${c.id}`} className="text-lg font-semibold text-stone-800 hover:text-amber-800">
                      {c.name}
                    </Link>
                    <p className="mt-1 text-xs text-stone-400">
                      {c.memberCount} member{c.memberCount === 1 ? "" : "s"} · Created {c.createdAt}
                    </p>
                    {c.description && <p className="mt-2 text-sm text-stone-600">{c.description}</p>}
                  </div>
                  <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-semibold text-stone-600">
                    {c.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/collabs/${c.id}`}
                    className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                  >
                    Open
                  </Link>
                  {c.isOwner && (
                    <>
                      <form action={updateCollabStatusAction} className="inline-flex items-center gap-2">
                        <input type="hidden" name="collabId" value={c.id} />
                        <select
                          name="status"
                          defaultValue={c.status}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-700"
                        >
                          <option value="active">active</option>
                          <option value="completed">completed</option>
                          <option value="completed_other">completed_other</option>
                          <option value="incomplete">incomplete</option>
                        </select>
                        <button
                          type="submit"
                          className="rounded-lg border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                        >
                          Update status
                        </button>
                      </form>
                      <form action={deleteCollabAction} className="inline">
                        <input type="hidden" name="collabId" value={c.id} />
                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Delete collab
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
