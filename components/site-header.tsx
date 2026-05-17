import Link from "next/link";
import { cookies } from "next/headers";
import { canUseArtistConnections } from "@/lib/artist-connections";
import { verifySession } from "@/lib/session-jwt";
import { BackNavButton } from "@/components/back-nav-button";
import { HardNavAnchor } from "@/components/hard-nav-anchor";
import { SiteBrandMark } from "@/components/site-brand-mark";
import {
  siteBrandHomeClass,
  siteNavIconPillClass,
  siteNavPillClass,
  siteNavShellClass,
  siteNavTextClass,
} from "@/components/site-nav-styles";

function NotificationsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:h-5.5 sm:w-5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9" />
    </svg>
  );
}

/**
 * Global header/nav shell.
 *
 * Guarantees every page has:
 * - a consistent back affordance
 * - a consistent menu
 * - auth-aware shortcuts (dashboard + logout or sign-in)
 */
export async function SiteHeader() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const dashboardHref = session?.role === "admin" ? "/admin/dashboard" : "/dashboard";
  const artistConnectionsEnabled = session?.artistId
    ? await canUseArtistConnections({ distinctId: session.artistId })
    : false;

  return (
    <header className="fixed inset-x-0 top-0 z-[80] border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:py-4">
        <nav className={siteNavShellClass} aria-label="Primary">
          <BackNavButton isAuthenticated={!!session} />
          <HardNavAnchor href="/" className={siteBrandHomeClass}>
            <SiteBrandMark className="h-9 w-9" />
            <span className="sr-only">Home</span>
          </HardNavAnchor>
          {session ? (
            <>
              <HardNavAnchor href={dashboardHref} className={siteNavPillClass}>
                <span className={siteNavTextClass}>
                  {session.role === "admin" ? "Admin" : "Home"}
                </span>
              </HardNavAnchor>
              {artistConnectionsEnabled ? (
                <HardNavAnchor href="/connections" className={siteNavPillClass}>
                  <span className={siteNavTextClass}>Connect</span>
                </HardNavAnchor>
              ) : null}
              <HardNavAnchor
                href="/profile/notifications"
                className={`${siteNavIconPillClass} ml-auto`}
                aria-label="Notifications"
                title="Notifications"
              >
                <NotificationsIcon />
                <span className="sr-only">Notifications</span>
              </HardNavAnchor>
            </>
          ) : (
            <>
              <Link href="/artists" className={`${siteNavPillClass} ml-auto`}>
                <span className={siteNavTextClass}>Artists</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
