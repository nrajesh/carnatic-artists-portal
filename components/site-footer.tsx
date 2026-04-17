import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";

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
  const dashboardHref = session?.role === "admin" ? "/admin/dashboard" : "/dashboard";

  const linkClass =
    "text-sm font-medium text-stone-700 underline-offset-4 transition-colors hover:text-amber-900 hover:underline";

  return (
    <footer
      className="mt-auto border-t border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-100/50"
      aria-label="Site"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <nav className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-2">
          <Link href="/about" className={linkClass}>
            About
          </Link>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
          {isLoggedIn ? (
            <>
              <Link href={dashboardHref} className={linkClass}>
                Dashboard
              </Link>
              <form action="/api/auth/logout" method="POST" className="inline">
                <button
                  type="submit"
                  className={`${linkClass} cursor-pointer border-0 bg-transparent p-0`}
                >
                  Log out
                </button>
              </form>
            </>
          ) : (
            <Link href="/auth/login" className={linkClass}>
              Sign in
            </Link>
          )}
        </nav>
        <p className="mt-6 text-center text-xs text-stone-500">
          Carnatic Artist Portal - connecting musicians in the Netherlands
        </p>
      </div>
    </footer>
  );
}
