"use client";

import "./globals.css";
import { fontDisplay, fontSans } from "./fonts";
import { PortalStatusPage } from "@/components/portal-status-page";
import { StaticSiteFooter, StaticSiteHeader } from "@/components/static-site-chrome";

/**
 * Replaces the root layout when the root layout itself errors. Recreates the
 * usual header/footer shell so navigation stays familiar.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset: _reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error?.digest;
  const isServerError = Boolean(digest);

  return (
    <html lang="en" className={`${fontSans.variable} ${fontDisplay.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased text-stone-900">
        <StaticSiteHeader />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PortalStatusPage
            variant="error"
            headline={isServerError ? "The server stumbled" : "This page could not load"}
            body={
              isServerError
                ? "Something went wrong on our side. Reloading usually helps."
                : "The app hit a critical error before the page could render. Reload to try again."
            }
          >
            <button
              type="button"
              onClick={() => {
                window.location.reload();
              }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
            >
              Reload page
            </button>
            {!isServerError ? (
              <button
                type="button"
                onClick={() => {
                  window.location.assign("/");
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-200 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50"
              >
                Home
              </button>
            ) : null}
            {digest ? (
              <p className="w-full text-center font-mono text-[11px] text-stone-400">Reference: {digest}</p>
            ) : null}
          </PortalStatusPage>
        </div>
        <StaticSiteFooter />
      </body>
    </html>
  );
}
