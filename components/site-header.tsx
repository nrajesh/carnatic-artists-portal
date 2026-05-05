import Link from "next/link";
import { cookies } from "next/headers";
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
 * - auth-aware shortcuts (dashboard + logout or sign-in)
 */
export async function SiteHeader() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const dashboardHref = session?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  return (
    <header className="relative z-20 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:py-4">
        <nav className={siteNavShellClass} aria-label="Primary">
          <BackNavButton isAuthenticated={!!session} />
          <HardNavAnchor href="/" className={siteBrandHomeClass}>
            <SiteBrandMark className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </HardNavAnchor>
          <Link href="/about" className={siteNavPillClass}>
            <span className={siteNavTextClass}>About</span>
          </Link>
          {session ? (
            <>
              <Link href={dashboardHref} className={siteNavPillClass}>
                <span className={siteNavTextClass}>Dashboard</span>
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline">
                <button type="submit" className={`${siteNavPillClass} cursor-pointer`}>
                  <span className={siteNavTextClass}>Log out</span>
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/login" className={siteNavPillClass}>
              <span className={siteNavTextClass}>Sign in</span>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
