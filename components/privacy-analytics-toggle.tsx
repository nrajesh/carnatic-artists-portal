"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import { hasAnalyticsOptOutCookie } from "@/lib/analytics-opt-out-cookie";
import {
  ADP_ANALYTICS_OPT_OUT_COOKIE,
  LEGACY_ANALYTICS_OPT_OUT_COOKIE,
} from "@/lib/analytics-opt-out-cookies";
import {
  hasNavigatorAnalyticsDnt,
  hasNavigatorGlobalPrivacyControl,
} from "@/lib/analytics-privacy-signals";

const OPT_OUT_PATH = "/privacy/opt-out";
const OPT_IN_PATH = "/privacy/opt-in";

function subscribeAnalyticsOptOutSignals(onStoreChange: () => void): () => void {
  const onStorage = () => onStoreChange();
  const onVisibility = () => {
    if (document.visibilityState === "visible") onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.removeEventListener("storage", onStorage);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

type Props = {
  optOutDisplayUrl: string | null;
  localOptOutSample: string;
  /** Cookie-only opt-out from the server (matches `document.cookie` for our opt-out names). */
  initialCookieOptedOut?: boolean;
  /** DNT / Sec-GPC on this HTTP request — can flicker independently of cookies; not used to pick green vs amber. */
  serverPrivacyHeaderOptOut?: boolean;
};

/**
 * One-click opt-out vs opt-in. **Green vs amber follows cookies only** so DNT/GPC (or noisy CDN headers)
 * cannot flip this card while the copy still talks about the opt-out cookie. Capture is still disabled
 * for DNT/GPC in `PostHogProvider`.
 */
export function PrivacyAnalyticsToggle({
  optOutDisplayUrl,
  localOptOutSample,
  initialCookieOptedOut = false,
  serverPrivacyHeaderOptOut = false,
}: Props) {
  const getSnapshot = useCallback(() => hasAnalyticsOptOutCookie(), []);
  const cookieOptedOut = useSyncExternalStore(
    subscribeAnalyticsOptOutSignals,
    getSnapshot,
    () => initialCookieOptedOut,
  );

  const browserSignalWithoutCookie =
    !cookieOptedOut &&
    (serverPrivacyHeaderOptOut || hasNavigatorAnalyticsDnt() || hasNavigatorGlobalPrivacyControl());

  const optInDisplayUrl =
    optOutDisplayUrl != null ? optOutDisplayUrl.replace(OPT_OUT_PATH, OPT_IN_PATH) : null;

  const consentDebugProps = {
    id: "analytics-consent-debug" as const,
    "data-analytics-card-cookie": cookieOptedOut ? "opt-out" : "opt-in",
    "data-analytics-dnt-or-gpc-header": serverPrivacyHeaderOptOut ? "opt-out" : "opt-in",
    // Back-compat for your earlier screenshots / notes:
    "data-analytics-consent-server": initialCookieOptedOut ? "opt-out" : "opt-in",
    "data-analytics-consent-live": cookieOptedOut ? "opt-out" : "opt-in",
  };

  if (cookieOptedOut) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4" {...consentDebugProps}>
        <p className="font-semibold text-green-950">A. Analytics are off for this browser</p>
        <p className="mt-2 text-sm text-green-900">
          The{" "}
          <code className="rounded bg-white/90 px-1 text-xs ring-1 ring-green-200">
            {ADP_ANALYTICS_OPT_OUT_COOKIE}
          </code>{" "}
          cookie is set (legacy <code className="rounded bg-white/90 px-1 text-xs ring-1 ring-green-200">
            {LEGACY_ANALYTICS_OPT_OUT_COOKIE}
          </code>{" "}
          is still honoured if present). To allow PostHog events and session replay again on this site, use the button
          below (it clears the cookie and opts you back in).
        </p>
        {optInDisplayUrl ? (
          <p className="mt-2 text-xs text-green-800">
            <span className="font-medium">Opt-in URL (copy-paste):</span>{" "}
            <code className="break-all rounded bg-white px-1.5 py-0.5 text-[11px] ring-1 ring-green-200">
              {optInDisplayUrl}
            </code>
          </p>
        ) : null}
        <p className="mt-2 text-xs text-green-800">
          <span className="font-medium">Local sample:</span>{" "}
          <code className="break-all rounded bg-white px-1.5 py-0.5 text-[11px] ring-1 ring-green-200">
            {localOptOutSample.replace(OPT_OUT_PATH, OPT_IN_PATH)}
          </code>
        </p>
        <p className="mt-3">
          <Link
            href={OPT_IN_PATH}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            Turn analytics tracking back on for this browser
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" {...consentDebugProps}>
      {browserSignalWithoutCookie ? (
        <p className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950">
          <span className="font-medium">Privacy signal:</span> your browser or this request sent{" "}
          <strong>Do Not Track</strong> and/or <strong>Global Privacy Control</strong>, so PostHog capture is disabled
          even without the opt-out cookie. The amber card below is only about the{" "}
          <code className="rounded bg-white px-1 text-xs ring-1 ring-sky-200">{ADP_ANALYTICS_OPT_OUT_COOKIE}</code>{" "}
          cookie.
        </p>
      ) : null}
      <p className="font-semibold text-stone-900">A. One-click opt-out (easiest)</p>
      <p className="mt-2 text-sm text-stone-700">
        Open this path on <strong className="text-stone-900">the same website</strong> you are using (copy the full
        line, or tap the button). It sets the opt-out cookie and sends you back here with a confirmation.
      </p>
      <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-stone-800">
        <li>
          <span className="font-medium">This deployment (copy-paste):</span>{" "}
          {optOutDisplayUrl ? (
            <code className="break-all rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-amber-200">
              {optOutDisplayUrl}
            </code>
          ) : (
            <code className="break-all rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-amber-200">
              https://your-portal-domain.example{OPT_OUT_PATH}
            </code>
          )}
        </li>
        <li>
          <span className="font-medium">Local development sample:</span>{" "}
          <code className="break-all rounded bg-white px-1.5 py-0.5 text-xs ring-1 ring-amber-200">
            {localOptOutSample}
          </code>
        </li>
      </ul>
      <p className="mt-3">
        <Link
          href={OPT_OUT_PATH}
          className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Turn off analytics for this browser
        </Link>
      </p>
      <p className="mt-2 text-xs text-stone-600">
        After opting out, links like Home still use normal paths (for example{" "}
        <code className="rounded bg-white px-1 text-[11px] ring-1 ring-amber-200">/</code>) - the address bar does not
        stay on <code className="rounded bg-white px-1 text-[11px] ring-1 ring-amber-200">{OPT_OUT_PATH}</code>. The
        cookie is what keeps analytics off.
      </p>
    </div>
  );
}
