import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { getCollabDetailForArtist } from "@/lib/queries/collabs";
import {
  addCollabMessageAction,
  deleteFeedbackAction,
  updateCollabStatusAction,
  upsertFeedbackAction,
} from "../actions";

interface CollabChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function CollabChatPage({ params }: CollabChatPageProps) {
  const { id } = await params;
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");

  const collab = await getCollabDetailForArtist(id, session.artistId);
  if (!collab) notFound();

  const others = collab.members.filter((m) => m.artistId !== session.artistId);

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Link href="/collabs" className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900">
                ← Back to collabs
              </Link>
              <h1 className="text-2xl font-bold text-stone-800">{collab.name}</h1>
              {collab.description && <p className="mt-1 text-sm text-stone-600">{collab.description}</p>}
            </div>
            <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-600">
              {collab.status}
            </span>
          </div>

          {collab.isOwner && (
            <form action={updateCollabStatusAction} className="mt-3 inline-flex items-center gap-2">
              <input type="hidden" name="collabId" value={collab.id} />
              <select
                name="status"
                defaultValue={collab.status}
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
          )}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-stone-800">Members</h2>
            <ul className="space-y-2">
              {collab.members.map((member) => (
                <li key={member.artistId} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/artists/${member.slug}`} className="font-medium text-stone-800 hover:text-amber-800">
                      {member.fullName}
                    </Link>
                    <span className="text-xs text-stone-400">{member.isOwner ? "Owner" : "Member"}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-bold text-stone-800">Chat</h2>
            <div className="mb-4 max-h-64 space-y-2 overflow-auto rounded-lg border border-stone-100 p-3">
              {collab.messages.length === 0 ? (
                <p className="text-sm italic text-stone-400">No messages yet.</p>
              ) : (
                collab.messages.map((msg) => (
                  <div key={msg.id} className="rounded-lg bg-stone-50 px-3 py-2 text-sm">
                    <p className="font-medium text-stone-800">{msg.senderName}</p>
                    <p className="mt-0.5 text-stone-700">{msg.content}</p>
                    <p className="mt-1 text-xs text-stone-400">{msg.sentAt}</p>
                  </div>
                ))
              )}
            </div>
            <form action={addCollabMessageAction} className="space-y-2">
              <input type="hidden" name="collabId" value={collab.id} />
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Write a message…"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Send message
              </button>
            </form>
          </section>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-stone-800">Reviews (Create / Edit / Delete)</h2>
          {others.length === 0 ? (
            <p className="text-sm italic text-stone-400">No other active members to review.</p>
          ) : (
            <div className="space-y-5">
              {others.map((member) => {
                const mine = collab.feedback.find(
                  (f) => f.reviewerId === session.artistId && f.revieweeId === member.artistId,
                );
                return (
                  <div key={member.artistId} className="rounded-xl border border-stone-100 p-4">
                    <p className="mb-2 text-sm font-semibold text-stone-800">
                      Review for {member.fullName}
                    </p>
                    <form action={upsertFeedbackAction} className="space-y-2">
                      <input type="hidden" name="collabId" value={collab.id} />
                      <input type="hidden" name="revieweeId" value={member.artistId} />
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-stone-600">Rating</label>
                        <select
                          name="rating"
                          defaultValue={mine?.starRating ?? 5}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm"
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        name="comment"
                        rows={2}
                        defaultValue={mine?.comment ?? ""}
                        placeholder="Optional comment"
                        className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                        >
                          {mine ? "Update review" : "Add review"}
                        </button>
                        {mine && (
                          <button
                            type="submit"
                            formAction={deleteFeedbackAction}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                          >
                            Delete review
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-stone-800">Recent feedback in this collab</h2>
          {collab.feedback.length === 0 ? (
            <p className="text-sm italic text-stone-400">No feedback yet.</p>
          ) : (
            <ul className="space-y-3">
              {collab.feedback.map((f) => (
                <li key={f.id} className="rounded-lg border border-stone-100 px-3 py-2 text-sm">
                  <p className="font-medium text-stone-800">
                    {f.reviewerName} → {f.revieweeName} · {f.starRating}★
                  </p>
                  {f.comment && <p className="mt-0.5 text-stone-700">{f.comment}</p>}
                  <p className="mt-1 text-xs text-stone-400">
                    {f.submittedAt}
                    {f.editedAt ? ` (edited ${f.editedAt})` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
