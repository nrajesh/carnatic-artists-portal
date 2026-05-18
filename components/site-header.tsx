import Link from "next/link";
import { cookies } from "next/headers";
import { canUseArtistConnections } from "@/lib/artist-connections";
import { verifySession } from "@/lib/session-jwt";
import { BackNavButton } from "@/components/back-nav-button";
import { HardNavAnchor } from "@/components/hard-nav-anchor";
import { SiteBrandMark } from "@/components/site-brand-mark";
import {
  siteBrandHomeClass,
  siteNavPillClass,
  siteNavShellClass,
  siteNavTextClass,
} from "@/components/site-nav-styles";

/**
 * Global header/nav shell.
 *
 * Guarantees every page has:
 * - a consistent back affordance
 * - a consistent menu
 * - auth-aware shortcuts for account administration or registration
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
                <span className={siteNavTextClass}>Admin</span>
              </HardNavAnchor>
              {artistConnectionsEnabled ? (
                <HardNavAnchor href="/connections" className={siteNavPillClass}>
                  <span className={siteNavTextClass}>Connect</span>
                </HardNavAnchor>
              ) : null}
              <HardNavAnchor
                href="/profile/notifications"
                className={siteNavPillClass}
                aria-label="Settings"
                title="Settings"
              >
                <span className={siteNavTextClass}>Settings</span>
              </HardNavAnchor>
            </>
          ) : (
            <>
              <Link href="/register" className={siteNavPillClass}>
                <span className={siteNavTextClass}>Sign-Up</span>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
