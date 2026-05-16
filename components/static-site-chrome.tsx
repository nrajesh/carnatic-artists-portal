"use client";

import { BackNavButton } from "@/components/back-nav-button";
import { HardNavAnchor } from "@/components/hard-nav-anchor";
import { SiteBrandMark } from "@/components/site-brand-mark";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import {
  siteBrandHomeClass,
  siteNavPillClass,
  siteNavShellClass,
  siteNavTextClass,
} from "@/components/site-nav-styles";

/**
 * Minimal header/footer shell for {@link app/global-error.tsx} only.
 * Mirrors {@link SiteHeader} / {@link SiteFooter} visually without server-only APIs.
 */
export function StaticSiteHeader() {
  return (
    <header className="relative z-20 border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:py-4">
        <nav className={siteNavShellClass} aria-label="Primary">
          <BackNavButton />
          <HardNavAnchor href="/" className={siteBrandHomeClass}>
            <SiteBrandMark className="h-9 w-9" />
            <span className="sr-only">Home</span>
          </HardNavAnchor>
          <HardNavAnchor href="/about" className={siteNavPillClass}>
            <span className={siteNavTextClass}>About</span>
          </HardNavAnchor>
          <HardNavAnchor href="/auth/login" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Sign in</span>
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
        <nav className="flex flex-row flex-wrap items-center justify-center gap-x-8 gap-y-2">
          <HardNavAnchor href="/about" className={siteNavPillClass}>
            <span className={siteNavTextClass}>About</span>
          </HardNavAnchor>
          <HardNavAnchor href="/privacy" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Privacy</span>
          </HardNavAnchor>
          <HardNavAnchor href="/auth/login" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Sign in</span>
          </HardNavAnchor>
        </nav>
        <p className="mt-6 text-center text-xs text-stone-500">
          {displayConfig.name} - connecting artists across geographies
        </p>
      </div>
    </footer>
  );
}
