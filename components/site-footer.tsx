import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import { AnalyticsOptOutFooterNote } from "@/components/analytics-opt-out-footer-note";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import { formatDeploymentDateTime } from "@/lib/format-deployment-datetime";
import { getArtistFullNameById } from "@/lib/queries/artists";
import { siteNavPillClass, siteNavShellClass, siteNavTextClass } from "@/components/site-nav-styles";

/**
 * Global footer - safe for production (About, Privacy, auth state).
 *
 * When the visitor has a valid `session` cookie, the nav shows:
 *   - Dashboard link (admin or artist, based on role)
 *   - Log out (POST form; must not be a GET link or Next.js Link prefetch
 *     would silently log users out on every page render)
 *
 * When unauthenticated, shows a Sign in link.
 *
 * This is a Server Component so we can read cookies server-side with no
 * flicker or client-side redirect; it re-evaluates on every request.
 */
export async function SiteFooter() {
  const sessionCookie = (await cookies()).get("session")?.value ?? null;
  const session = sessionCookie ? await verifySession(sessionCookie) : null;
  const isLoggedIn = session !== null;
  const displayConfig = getDeploymentDisplayConfig();
  const sessionDisplayName = session ? await getArtistFullNameById(session.artistId) : null;
  const sessionBannerLabel =
    session &&
    (sessionDisplayName
      ? session.role === "admin"
        ? `${sessionDisplayName} (admin)`
        : sessionDisplayName
      : session.role);

  const isDev = process.env.NODE_ENV === "development";
  const footerPaddingClass = isDev ? "" : "pb-[72px] sm:pb-[84px]";

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-amber-200/90 bg-gradient-to-t from-amber-100/70 to-amber-50/95 px-4 py-3 shadow-[0_-10px_30px_rgba(120,53,15,0.08)] backdrop-blur sm:py-4">
        <nav
          className={`${siteNavShellClass} mx-auto`}
          aria-label="Quick actions"
        >
          <Link href="/about" className={siteNavPillClass}>
            <span className={siteNavTextClass}>About</span>
          </Link>
          <Link href="/privacy" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Privacy</span>
          </Link>
          {isLoggedIn ? (
            <form action="/api/auth/logout" method="POST" className="inline">
              <button
                type="submit"
                className={`${siteNavPillClass} cursor-pointer border-0 bg-transparent`}
              >
                <span className={siteNavTextClass}>Log out</span>
              </button>
            </form>
          ) : (
            <Link href="/auth/login" className={siteNavPillClass}>
              <span className={siteNavTextClass}>Sign in</span>
            </Link>
          )}
        </nav>
      </div>

      <footer
        className={`border-t border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-100/50 ${footerPaddingClass}`}
        aria-label="Site"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4">
          <AnalyticsOptOutFooterNote />
          <div className="flex flex-col items-center gap-1 text-center text-xs text-stone-500">
            <p>{displayConfig.name} - connecting artists across geographies</p>
            <p>
              Built with ❤️ for artists by{" "}
              <a
                href="https://imaginest.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-700 font-medium hover:text-amber-900 hover:underline transition-colors"
              >
                Imaginest
              </a>
            </p>
            {session && sessionBannerLabel ? (
              <p className="pt-1 text-[11px] text-stone-400">
                Logged in as {sessionBannerLabel} · Session expires{" "}
                {formatDeploymentDateTime(session.expiresAt)}
              </p>
            ) : null}
          </div>
        </div>
      </footer>
    </>
  );
}
