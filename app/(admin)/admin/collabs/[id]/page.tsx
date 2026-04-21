import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getCollabDetailForAdmin } from "@/lib/queries/collabs";
import { verifySession } from "@/lib/session-jwt";
import { getCollabDetailForArtist } from "@/lib/queries/collabs";
import { isArtistCollabsRatingsEnabledServer } from "@/lib/feature-flags-server";
import {
  addCollabMessageAction,
  deleteFeedbackAction,
  upsertFeedbackAction,
} from "@/app/(artist)/collabs/actions";
import { PortalSectionHeading } from "@/components/portal-section-heading";

export default async function AdminCollabDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session?.artistId) redirect("/auth/login");
  const collabsRatingsEnabled = await isArtistCollabsRatingsEnabledServer({
    distinctId: session.artistId,
  });
  if (!collabsRatingsEnabled) redirect("/admin/dashboard");
  const collab = await getCollabDetailForAdmin(id);
  if (!collab) notFound();
  const messages = collab.messages;
  const participantView =
    session?.artistId ? await getCollabDetailForArtist(collab.id, session.artistId) : null;
  const others = participantView
    ? participantView.members.filter((m) => m.artistId !== session?.artistId)
    : [];

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:px-8">
      <Link href="/admin/collabs" className="text-sm text-amber-700 hover:text-amber-900 mb-6 inline-block">
        Back to Collabs
      </Link>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{collab.name}</h1>
            <p className="text-stone-500 text-sm mt-1">Owner: {collab.owner} &middot; Created {collab.createdAt}</p>
          </div>
          <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${collab.status === "active" ? "bg-green-50 text-green-700 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
            {collab.status}
          </span>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-amber-800 text-sm mb-6">
          Admins can view all message history. Artists are notified of this.
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 mb-6">
          <PortalSectionHeading variant="label" className="mb-3">
            Members ({collab.members.length})
          </PortalSectionHeading>
          <div className="flex flex-wrap gap-2">
            {collab.members.map((m) => (
              <span key={m.artistId} className="bg-stone-100 text-stone-700 text-xs px-3 py-1 rounded-full font-medium">
                {m.fullName}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
          <PortalSectionHeading variant="label" className="mb-4">
            Message History ({messages.length})
          </PortalSectionHeading>
          {messages.length === 0 ? (
            <p className="text-stone-400 text-sm italic">No messages yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-sm font-bold text-amber-700 flex-shrink-0">
                    {msg.sender[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-semibold text-stone-800">{msg.sender}</span>
                      <span className="text-xs text-stone-400">{msg.time}</span>
                    </div>
                    <p className="text-sm text-stone-700 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {participantView ? (
            <form action={addCollabMessageAction} className="mt-4 space-y-2 border-t border-stone-100 pt-4">
              <input type="hidden" name="collabId" value={collab.id} />
              <textarea
                name="content"
                required
                rows={3}
                placeholder="Send a message as a collab participant…"
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Send message
              </button>
            </form>
          ) : (
            <p className="mt-4 text-xs text-stone-400">
              You can moderate this collab, but cannot post because your artist profile is not a member.
            </p>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <PortalSectionHeading variant="label" className="mb-4">
            Feedback Controls
          </PortalSectionHeading>
          {participantView ? (
            <div className="space-y-5">
              {others.length === 0 ? (
                <p className="text-sm italic text-stone-400">No other active members to review.</p>
              ) : (
                others.map((member) => {
                  const mine = participantView.feedback.find(
                    (f) => f.reviewerId === session?.artistId && f.revieweeId === member.artistId,
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
                })
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-500">
              Only admins who are collab participants can submit ratings/reviews here.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
