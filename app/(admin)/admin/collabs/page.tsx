import Link from "next/link";
import { cookies } from "next/headers";
import { listCollabsForAdmin } from "@/lib/queries/collabs";
import { verifySession } from "@/lib/session-jwt";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border border-green-200",
  completed: "bg-blue-50 text-blue-700 border border-blue-200",
  completed_other: "bg-blue-50 text-blue-700 border border-blue-200",
  incomplete: "bg-stone-100 text-stone-500 border border-stone-200",
};

export default async function AdminCollabsPage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const collabs = await listCollabsForAdmin(session?.artistId);
  const activeCount = collabs.filter((c) => c.status === "active").length;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/dashboard" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">← Dashboard</Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-stone-800">Collab Moderation</h1>
        <p className="text-stone-500 mt-1">{collabs.length} collabs total · {activeCount} active</p>
        <p className="mt-2 text-xs text-amber-700">
          Rows highlighted in amber indicate collabs you are directly part of.
        </p>
      </div>
      {collabs.length === 0 ? (
        <p className="text-sm text-stone-400 italic">No collabs found.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Collab</th>
                <th className="px-4 py-3 font-semibold">Owner</th>
                <th className="px-4 py-3 font-semibold">Members</th>
                <th className="px-4 py-3 font-semibold">Messages</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {collabs.map((c) => (
                <tr
                  key={c.id}
                  className={`border-t border-stone-100 ${
                    c.isCurrentAdminMember ? "bg-amber-50/40" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-stone-800">{c.name}</td>
                  <td className="px-4 py-3 text-stone-600">{c.owner}</td>
                  <td className="px-4 py-3 text-stone-600">{c.members}</td>
                  <td className="px-4 py-3 text-stone-600">{c.messages}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[c.status] ?? STATUS_STYLES.incomplete}`}>
                      {c.status}
                    </span>
                    {c.isCurrentAdminOwner && (
                      <span className="ml-2 inline-block rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        You own
                      </span>
                    )}
                    {!c.isCurrentAdminOwner && c.isCurrentAdminMember && (
                      <span className="ml-2 inline-block rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        You&apos;re a member
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-400">{c.createdAt}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/collabs/${c.id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium underline underline-offset-2">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
