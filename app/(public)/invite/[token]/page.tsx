import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeaturedArtistPhoto } from "@/components/featured-artist-photo";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import {
  canUseArtistConnections,
  canArtistReceiveConnectionRequests,
  getConnectionStatusForArtists,
} from "@/lib/artist-connections";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import { getPublicArtistInviteView } from "@/lib/artist-invites";
import { InviteLandingActions } from "./invite-landing-actions";

type PageProps = {
  params: Promise<{ token: string }>;
};

const displayConfig = getDeploymentDisplayConfig();

function inviteDescription(inviterName: string, selectedLinkLabel: string) {
  return `See ${inviterName}'s featured ${selectedLinkLabel.toLowerCase()} and join ${displayConfig.name}. You can choose whether to auto-connect after approval.`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const invite = await getPublicArtistInviteView(token);

  if (!invite) {
    return {
      title: `Invite · ${displayConfig.name}`,
      description: `Join ${displayConfig.name}.`,
    };
  }

  return {
    title: `${invite.inviterName} invited you to ${displayConfig.name}`,
    description: inviteDescription(invite.inviterName, invite.selectedLinkLabel),
    openGraph: {
      title: `${invite.inviterName} invited you to ${displayConfig.name}`,
      description: inviteDescription(invite.inviterName, invite.selectedLinkLabel),
      images: [
        {
          url: "/assets/social-share-logo.png",
          width: 1024,
          height: 1024,
          alt: displayConfig.name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${invite.inviterName} invited you to ${displayConfig.name}`,
      description: inviteDescription(invite.inviterName, invite.selectedLinkLabel),
      images: ["/assets/social-share-logo.png"],
    },
  };
}

export default async function InviteLandingPage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getPublicArtistInviteView(token);
  if (!invite) notFound();

  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const isLoggedIn = !!session;
  const currentArtistId = session?.artistId ?? null;

  const viewerConnectionsEnabled = currentArtistId
    ? await canUseArtistConnections({ distinctId: currentArtistId })
    : false;
  const targetConnectionsEnabled = await canUseArtistConnections({ distinctId: invite.inviterArtistId });
  const isOwnProfile = currentArtistId === invite.inviterArtistId;
  const artistConnectionsEnabled = viewerConnectionsEnabled && targetConnectionsEnabled;
  const targetAcceptsRequests = artistConnectionsEnabled
    ? await canArtistReceiveConnectionRequests(invite.inviterArtistId)
    : true;
  const connectionStatus =
    artistConnectionsEnabled && currentArtistId
      ? await getConnectionStatusForArtists(currentArtistId, invite.inviterArtistId)
      : "NONE";

  const registerHref = `/register?invite=${encodeURIComponent(invite.token)}`;
  const profileHref = `/artists/${encodeURIComponent(invite.inviterSlug)}?invite=${encodeURIComponent(invite.token)}`;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fff4df] px-4 py-8 sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-24 top-16 h-56 w-56 rounded-full bg-orange-300/40 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-rose-200/35 blur-3xl" />

      <div className="relative mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-amber-800 transition-colors hover:text-amber-950"
          >
            <span aria-hidden>←</span>
            Back to {displayConfig.name}
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
            <SiteBrandMark className="h-4 w-4" />
            Invite
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.88fr]">
          <section className="overflow-hidden rounded-[2rem] border border-amber-200/80 bg-white/90 shadow-2xl shadow-amber-950/10 backdrop-blur">
            <div className="bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.26),_transparent_46%),linear-gradient(135deg,_rgba(217,119,6,0.12),_rgba(255,255,255,0.92))] px-6 py-7 sm:px-8 sm:py-9">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 shadow-sm">
                <SiteBrandMark className="h-4 w-4" />
                Shared from the community
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <FeaturedArtistPhoto
                  photoUrl={invite.inviterProfilePhotoUrl ?? ""}
                  initial={invite.inviterName[0] ?? "?"}
                  accentColor="linear-gradient(135deg, #d97706, #f97316)"
                  alt={`${invite.inviterName} profile photo`}
                  sizeClassName="h-20 w-20 text-3xl"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
                    {invite.inviterName} invited you in
                  </p>
                  <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-stone-900 sm:text-[3.15rem]">
                    Join {displayConfig.name}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base">
                    Discover artists, collaborations, and a richer way to share your own work.
                    {` ${invite.inviterName}`} highlighted one place to start.
                  </p>
                </div>
              </div>

              {invite.inviterSpecialities.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {invite.inviterSpecialities.map((speciality) => (
                    <span
                      key={speciality.name}
                      className="rounded-full px-3 py-1 text-xs font-semibold text-white shadow-sm"
                      style={{ backgroundColor: speciality.color }}
                    >
                      {speciality.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-5 px-6 py-7 sm:px-8 sm:py-8">
              <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50/90 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
                  Featured link
                </p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-2xl font-semibold tracking-tight text-stone-900">
                      {invite.selectedLinkLabel}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      {invite.selectedLinkHost ?? invite.selectedLinkUrl}
                    </p>
                  </div>
                  <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-900">
                    {invite.inviterName}&rsquo;s pick
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-stone-600">
                  Explore this featured link, then join the portal with an invite flow that carries
                  the site branding forward instead of dropping you into a generic profile page.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <PortalSectionHeading variant="label" className="mb-2">
                    {isLoggedIn ? "Collaborate" : "What happens next"}
                  </PortalSectionHeading>
                  <p className="text-sm leading-6 text-stone-600">
                    {isLoggedIn
                      ? "Once connected, you can easily pitch collaborations and share resources within the portal."
                      : "Register, wait for admin approval, and we'll preserve the context from this invite all the way through onboarding."}
                  </p>
                </div>
                <div className="rounded-2xl border border-stone-200 bg-white px-4 py-4">
                  <PortalSectionHeading variant="label" className="mb-2">
                    {isLoggedIn ? "Direct Sharing" : "Connection choice"}
                  </PortalSectionHeading>
                  <p className="text-sm leading-6 text-stone-600">
                    {isLoggedIn
                      ? "Connections allow you to view each other's private social links, contact info, and calendar details."
                      : `You can opt to auto-connect with ${invite.inviterName} after approval or decide later once you have had time to look around.`}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <aside className="rounded-[2rem] border border-stone-200 bg-white/92 p-6 shadow-xl shadow-amber-950/10 backdrop-blur sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-700">
              Invite card
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-stone-900">
              {isLoggedIn ? `Connect with ${invite.inviterName}` : "Start from a real artist, not a cold signup form"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {isLoggedIn
                ? `You are signed in! You can now establish a direct connection with ${invite.inviterName} to coordinate and collaborate.`
                : `This path keeps ${invite.inviterName}'s context attached to your registration so the outreach loop stays measurable and the introduction feels personal.`}
            </p>

            {isLoggedIn ? (
              <div className="mt-5 rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
                Establishing a connection lets you share direct contact info, view detailed schedules, and communicate.
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
                You&rsquo;ll be able to choose whether the portal should automatically connect you with{" "}
                <span className="font-semibold">{invite.inviterName}</span> after approval.
              </div>
            )}

            <div className="mt-6">
              <InviteLandingActions
                registerHref={registerHref}
                profileHref={profileHref}
                featuredLinkUrl={invite.selectedLinkUrl}
                inviterName={invite.inviterName}
                inviterSlug={invite.inviterSlug}
                selectedLinkLabel={invite.selectedLinkLabel}
                selectedLinkType={invite.selectedLinkType}
                isLoggedIn={isLoggedIn}
                isOwnProfile={isOwnProfile}
                artistConnectionsEnabled={artistConnectionsEnabled}
                targetAcceptsRequests={targetAcceptsRequests}
                connectionStatus={connectionStatus}
                inviterArtistId={invite.inviterArtistId}
              />
            </div>

            <div className="mt-6 rounded-2xl bg-stone-950 px-4 py-4 text-sm text-stone-100">
              <p className="font-semibold">Why this link looks different</p>
              <p className="mt-2 leading-6 text-stone-300">
                Invite shares are designed to market both the artist and the portal together, so
                every share becomes a cleaner introduction for the next person.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
