import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("PostHog consent contracts (source)", () => {
  it("PostHogProvider calls initPostHog before syncPosthogPrivacySignals in the provider effect", () => {
    const src = read("components/posthog-provider.tsx");
    expect(read("lib/posthog-privacy-sync.ts")).toContain("export function syncPosthogPrivacySignals");
    const marker = "export function PostHogProvider";
    const start = src.indexOf(marker);
    expect(start).toBeGreaterThan(-1);
    const effectStart = src.indexOf("useEffect(() => {", start);
    const effectEnd = src.indexOf("}, [])", effectStart);
    expect(effectStart).toBeGreaterThan(-1);
    expect(effectEnd).toBeGreaterThan(effectStart);
    const body = src.slice(effectStart, effectEnd);
    const initIdx = body.indexOf("initPostHog()");
    const syncIdx = body.indexOf("syncPosthogPrivacySignals()");
    expect(initIdx).toBeGreaterThan(-1);
    expect(syncIdx).toBeGreaterThan(-1);
    expect(initIdx).toBeLessThan(syncIdx);
  });

  it("PostHogProvider wraps route-aware analytics components in Suspense", () => {
    const src = read("components/posthog-provider.tsx");
    expect(src).toContain("<Suspense fallback={null}>");
    expect(src).toContain("<PageViewTracker />");
    expect(src).toContain("<PosthogRoutePrivacySync />");
  });

  it("PosthogRoutePrivacySync re-runs privacy sync when the URL changes", () => {
    const src = read("components/posthog-route-privacy-sync.tsx");
    expect(src).toContain("usePathname");
    expect(src).toContain("useSearchParams");
    expect(src).toContain("syncPosthogPrivacySignals");
    expect(src).toMatch(/\[pathname,\s*searchParams\]/);
  });

  it("initPostHog keeps PostHog automatic page lifecycle tracking off for manual SPA control", () => {
    const src = read("lib/analytics-client.ts");
    expect(src).toContain("capture_pageview: false");
    expect(src).toContain("capture_pageleave: false");
  });

  it("dev-only PostHog privacy-signal bypass is wired for local testing", () => {
    const src = read("lib/analytics-privacy-signals.ts");
    expect(src).toContain("NEXT_PUBLIC_POSTHOG_IGNORE_BROWSER_PRIVACY_SIGNALS_IN_DEV");
    expect(src).toContain('process.env.NODE_ENV === "development"');
    expect(src).toContain("if (ignoreBrowserPrivacySignalsInDev()) return false;");
  });

  it("PageViewTracker stores the current URL before the PostHog readiness check and captures manual pageleave events", () => {
    const src = read("components/page-view-tracker.tsx");
    expect(src).toContain("previousUrlRef.current = url");
    expect(src).toContain("if (!isPosthogClientReady())");
    expect(src.indexOf("previousUrlRef.current = url")).toBeLessThan(src.indexOf("if (!isPosthogClientReady())"));
    expect(src).toContain("posthog.capture('$pageview'");
    expect(src).toContain("posthog.capture('$pageleave'");
    expect(src).toContain("document.addEventListener('visibilitychange'");
    expect(src).toContain("globalThis.addEventListener('pagehide'");
    expect(src).toContain("transport: 'sendBeacon'");
    expect(src).toContain("routeChangeCaptureOptions()");
  });

  it("cookie-based consent components do not use noop useSyncExternalStore for document-driven state", () => {
    const paths = [
      "components/analytics-opt-out-footer-note.tsx",
      "components/privacy-notice-banner.tsx",
      "components/privacy-analytics-toggle.tsx",
    ];
    for (const p of paths) {
      const s = read(p);
      expect(s, p).not.toMatch(/noopSubscribe/);
    }
  });

  it("Next.js Links to /privacy/opt-in and /privacy/opt-out use prefetch={false} (GET mutates cookies)", () => {
    const toggle = read("components/privacy-analytics-toggle.tsx");
    expect(toggle).toMatch(/<Link\s+prefetch=\{false\}\s+href=\{OPT_IN_PATH\}/);
    expect(toggle).toMatch(/<Link\s+prefetch=\{false\}\s+href=\{OPT_OUT_PATH\}/);
    const banner = read("components/privacy-notice-banner.tsx");
    expect(banner).toMatch(/<Link\s+prefetch=\{false\}\s+href="\/privacy\/opt-out"/);
  });
});
