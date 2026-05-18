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
    <header className="fixed inset-x-0 top-0 z-[80] border-b border-amber-200/80 bg-gradient-to-b from-amber-50/95 to-amber-100/60 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-3 sm:py-4">
        <nav className={siteNavShellClass} aria-label="Primary">
          <BackNavButton />
          <HardNavAnchor href="/" className={siteBrandHomeClass}>
            <SiteBrandMark className="h-9 w-9" />
            <span className="sr-only">Home</span>
          </HardNavAnchor>
          <HardNavAnchor href="/docs" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Docs</span>
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
    <>
      <div className="fixed inset-x-0 bottom-0 z-[90] border-t border-amber-200/90 bg-gradient-to-t from-amber-100/70 to-amber-50/95 px-4 py-3 shadow-[0_-10px_30px_rgba(120,53,15,0.08)] backdrop-blur sm:py-4">
        <nav
          className={`${siteNavShellClass} mx-auto`}
          aria-label="Quick actions"
        >
          <HardNavAnchor href="/docs" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Docs</span>
          </HardNavAnchor>
          <HardNavAnchor href="/privacy" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Privacy</span>
          </HardNavAnchor>
          <HardNavAnchor href="/auth/login" className={siteNavPillClass}>
            <span className={siteNavTextClass}>Sign in</span>
          </HardNavAnchor>
        </nav>
      </div>

      <footer
        className="mt-auto border-t border-amber-200/80 bg-gradient-to-b from-amber-50/90 to-amber-100/50 pb-[72px] sm:pb-[84px]"
        aria-label="Site"
      >
        <div className="mx-auto max-w-5xl px-4 py-3 sm:py-4">
          <div className="flex flex-col items-center gap-1 text-center text-xs text-stone-500">
            <p>{displayConfig.name} - connecting artists across geographies</p>
            <p>
              Built with ❤️ for artists by{" "}
              <a
                href="https://imaginest.nl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-stone-700 transition-colors hover:text-amber-900 hover:underline"
              >
                Imaginest
              </a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
