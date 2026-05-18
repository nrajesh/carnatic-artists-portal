import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/session-jwt";
import { canUseArtistConnections, getArtistConnectionCenterView } from "@/lib/artist-connections";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { getDb } from "@/lib/db";
import { getAbsoluteSiteUrl } from "@/lib/absolute-site-url";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import { buildInviteShareOptions } from "@/lib/artist-invites";
import { ArtistProfileShareButton } from "@/components/artist-profile-share-button";
import { InviteStatusesList } from "./invite-statuses-list";
import { ArtistAutocomplete } from "@/components/artist-autocomplete";
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

  const db = getDb();
  const artist = await db.artist.findUnique({
    where: { id: session.artistId },
    include: {
      externalLinks: {
        select: {
          linkType: true,
          url: true,
        },
      },
    },
  });
  if (!artist) redirect("/auth/login");

  const displayConfig = getDeploymentDisplayConfig();
  const profileShareUrl = await getAbsoluteSiteUrl(`/artists/${encodeURIComponent(artist.slug)}`);
  const shareTitle = `${artist.fullName} - Artist profile`;
  const shareText = `Check out ${artist.fullName} on ${displayConfig.name}!`;

  const inviteCardConfig = {
    artistName: artist.fullName,
    portalName: displayConfig.name,
    options: buildInviteShareOptions(
      artist.externalLinks.map((l) => ({
        type: l.linkType,
        url: l.url,
      }))
    ),
    nudgeHref: "/profile/edit#profile-social",
  };

  const invites = await db.artistInvite.findMany({
    where: { inviterArtistId: session.artistId },
    include: {
      registrations: {
        select: {
          fullName: true,
          status: true,
          submittedAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-amber-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-4">
          <Link
            href="/dashboard"
            className="inline-block text-sm text-amber-700 hover:text-amber-900 transition-colors"
          >
            ← Dashboard
          </Link>

          {/* Title & Actions Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Artist Connections</h1>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <ArtistAutocomplete />
              <Link
                href="/artists"
                className="rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800 shrink-0 transition-all active:scale-[0.98]"
              >
                Find artists
              </Link>
            </div>
          </div>

          {/* Subtitle & Status block */}
          <div className="space-y-1">
            <p className="max-w-2xl text-sm text-stone-500 leading-relaxed">
              Approved connections can mention each other with their @tag in profile bios and collab messages.
            </p>
            <p className="text-xs text-stone-500">
              Incoming requests are currently{" "}
              <span className="font-semibold text-stone-700">
                {view.requestsAllowed ? "enabled" : "paused"}
              </span>
              . Manage this in{" "}
              <Link href="/profile/notifications" className="text-amber-700 hover:text-amber-900 transition-colors">
                notification preferences
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-amber-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.14),_transparent_46%),linear-gradient(135deg,_rgba(217,119,6,0.06),_rgba(255,255,255,0.96))] p-6 shadow-xl shadow-amber-950/5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-stone-900">Invite fellow artists & share your profile</h2>
              <p className="text-sm leading-relaxed text-stone-600">
                Generate a clean, personalized invite card matching the portal brand. When they register using your invite, they can automatically connect with you.
              </p>
            </div>
            <div className="shrink-0">
              <ArtistProfileShareButton
                profileUrl={profileShareUrl}
                shareTitle={shareTitle}
                shareText={shareText}
                inviteCardConfig={inviteCardConfig}
                variant="solid"
                className="w-full md:w-auto"
              />
            </div>
          </div>
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

        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <PortalSectionHeading variant="title" className="mb-4">
            Referral history
          </PortalSectionHeading>

          <InviteStatusesList initialInvites={invites} />
        </section>
      </div>
    </main>
  );
}
