import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { canUseArtistConnections, getArtistConnectionCenterView } from "@/lib/artist-connections";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { approveConnectionAction, rejectConnectionAction, removeConnectionAction } from "./actions";

function ArtistLink({ artist }: { artist: { slug: string; fullName: string; tag: string } }) {
  return (
    <Link
      href={`/artists/${artist.slug}`}
      className="font-semibold text-stone-800 hover:text-amber-800"
    >
      {artist.fullName}
      <span className="ml-2 font-mono text-xs font-medium text-amber-700">{artist.tag}</span>
    </Link>
  );
}

export default async function ConnectionsPage() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  if (!session) redirect("/auth/login");
  const connectionsEnabled = await canUseArtistConnections({ distinctId: session.artistId });
  if (!connectionsEnabled) redirect("/dashboard");

  const view = await getArtistConnectionCenterView(session.artistId);

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-block text-sm text-amber-700 hover:text-amber-900"
            >
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-stone-800">Artist Connections</h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-500">
              Approved connections can mention each other with their @tag in profile bios and collab
              messages.
            </p>
          </div>
          <Link
            href="/search"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Find artists
          </Link>
        </div>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Requests to approve
          </PortalSectionHeading>
          {view.incoming.length === 0 ? (
            <p className="text-sm italic text-stone-400">No pending requests.</p>
          ) : (
            <ul className="space-y-3">
              {view.incoming.map((connection) => (
                <li
                  key={connection.id}
                  className="flex flex-col gap-3 rounded-xl border border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <ArtistLink artist={connection.otherArtist} />
                  <div className="flex flex-wrap gap-2">
                    <form action={approveConnectionAction}>
                      <input type="hidden" name="connectionId" value={connection.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-800"
                      >
                        Approve
                      </button>
                    </form>
                    <form action={rejectConnectionAction}>
                      <input type="hidden" name="connectionId" value={connection.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-3">
            Connected artists
          </PortalSectionHeading>
          {view.approved.length === 0 ? (
            <p className="text-sm italic text-stone-400">No approved connections yet.</p>
          ) : (
            <ul className="space-y-3">
              {view.approved.map((connection) => (
                <li
                  key={connection.id}
                  className="flex flex-col gap-3 rounded-xl border border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <ArtistLink artist={connection.otherArtist} />
                  <form action={removeConnectionAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        {view.outgoing.length > 0 && (
          <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <PortalSectionHeading variant="title" className="mb-3">
              Waiting for approval
            </PortalSectionHeading>
            <ul className="space-y-3">
              {view.outgoing.map((connection) => (
                <li
                  key={connection.id}
                  className="flex flex-col gap-3 rounded-xl border border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <ArtistLink artist={connection.otherArtist} />
                  <form action={removeConnectionAction}>
                    <input type="hidden" name="connectionId" value={connection.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                    >
                      Cancel
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
