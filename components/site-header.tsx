import Link from "next/link";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-jwt";
import { BackNavButton } from "@/components/back-nav-button";
import { HardNavAnchor } from "@/components/hard-nav-anchor";

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

  const linkClass =
    "text-sm font-medium text-stone-700 underline-offset-4 transition-colors hover:text-amber-900 hover:underline";

  return (
    <header className="relative z-20 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <BackNavButton />
          <HardNavAnchor href="/" className="text-sm font-semibold text-stone-800 hover:text-amber-900">
            Artist Discovery Portal
          </HardNavAnchor>
        </div>
        <nav className="flex items-center gap-4">
          <HardNavAnchor href="/" className={linkClass}>
            Home
          </HardNavAnchor>
          <Link href="/about" className={linkClass}>
            About
          </Link>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
          {session ? (
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
      </div>
    </header>
  );
}
