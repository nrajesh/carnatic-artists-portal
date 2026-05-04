"use client";

import { BackNavButton } from "@/components/back-nav-button";
import { HardNavAnchor } from "@/components/hard-nav-anchor";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";

const linkClass =
  "text-sm font-medium text-stone-700 underline-offset-4 transition-colors hover:text-amber-900 hover:underline";

/**
 * Minimal header/footer shell for {@link app/global-error.tsx} only.
 * Mirrors {@link SiteHeader} / {@link SiteFooter} visually without server-only APIs.
 */
export function StaticSiteHeader() {
  const displayConfig = getDeploymentDisplayConfig();

  return (
    <header className="relative z-20 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <BackNavButton />
          <HardNavAnchor href="/" className="text-sm font-semibold text-stone-800 hover:text-amber-900">
            {displayConfig.name}
          </HardNavAnchor>
        </div>
        <nav className="flex items-center gap-4">
          <HardNavAnchor href="/" className={linkClass}>
            Home
          </HardNavAnchor>
          <HardNavAnchor href="/about" className={linkClass}>
            About
          </HardNavAnchor>
          <HardNavAnchor href="/privacy" className={linkClass}>
            Privacy
          </HardNavAnchor>
          <HardNavAnchor href="/auth/login" className={linkClass}>
            Sign in
          </HardNavAnchor>
        </nav>
      </div>
    </header>
  );
}

export function StaticSiteFooter() {
  const displayConfig = getDeploymentDisplayConfig();

  return (
    <footer
      className="mt-auto border-t border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-100/50"
      aria-label="Site"
    >
      <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
        <nav className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap sm:gap-x-10 sm:gap-y-2">
          <HardNavAnchor href="/about" className={linkClass}>
            About
          </HardNavAnchor>
          <HardNavAnchor href="/privacy" className={linkClass}>
            Privacy
          </HardNavAnchor>
          <HardNavAnchor href="/auth/login" className={linkClass}>
            Sign in
          </HardNavAnchor>
        </nav>
        <p className="mt-6 text-center text-xs text-stone-500">
          {displayConfig.name} - connecting musicians in {displayConfig.countryName}
        </p>
      </div>
    </footer>
  );
}
