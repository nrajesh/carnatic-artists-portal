import Link from "next/link";
import { headers } from "next/headers";
import { PosthogOptInHandler } from "@/components/posthog-opt-in-handler";
import { PrivacyAnalyticsToggle } from "@/components/privacy-analytics-toggle";
import {
  getServerCookieAnalyticsOptOut,
  getServerPrivacySignalOptOut,
} from "@/lib/server-analytics-opt-out";

export const dynamic = "force-dynamic";

const OPT_OUT_PATH = "/privacy/opt-out";
const LOCAL_OPT_OUT_SAMPLE = "http://localhost:3000/privacy/opt-out";

/**
 * Best-effort absolute URL for copy/paste (host from request or NEXT_PUBLIC_APP_URL).
 */
async function resolveOptOutDisplayUrl(): Promise<string | null> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0]?.trim() ?? "";
  const protoCandidate = (h.get("x-forwarded-proto") ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  const proto = protoCandidate === "http" || protoCandidate === "https" ? protoCandidate : "";
  if (host && proto) {
    return `${proto}://${host}${OPT_OUT_PATH}`;
  }
  if (host) {
    return `https://${host}${OPT_OUT_PATH}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "").trim();
  if (base) return `${base}${OPT_OUT_PATH}`;
  return null;
}

/**
 * Privacy Policy page - analytics disclosure.
 * Server Component at the /privacy route.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6
 */
export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ analytics?: string }>;
}) {
  const { analytics } = await searchParams;
  const optedOutBanner = analytics === "opted_out";
  const optedInBanner = analytics === "opted_in";
  const optOutDisplayUrl = await resolveOptOutDisplayUrl();
  const [serverCookieOptOut, serverPrivacyHeaderOptOut] = await Promise.all([
    getServerCookieAnalyticsOptOut(),
    getServerPrivacySignalOptOut(),
  ]);

  return (
    <main className="min-h-screen bg-amber-50">
      <PosthogOptInHandler active={optedInBanner} />
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 px-6 py-16 text-center text-white">
        <div className="mb-4 text-4xl">🔒</div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mx-auto max-w-xl text-base text-amber-200 sm:text-lg">
          How Artist Discovery Portal handles account contact details, analytics, and related product telemetry.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-amber-200 transition-colors hover:text-white"
          >
            ← Back to home
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl space-y-10 px-6 py-14">
        {optedOutBanner ? (
          <div
            className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-950"
            role="status"
          >
            <p className="font-semibold">Analytics opt-out is active for this browser.</p>
            <p className="mt-1 text-green-900">
              A cookie was set so PostHog does not record events or session replay here. To opt back in later, remove
              the <code className="rounded bg-white/80 px-1 text-xs">adp_analytics_opt_out</code> cookie (or legacy{" "}
              <code className="rounded bg-white/80 px-1 text-xs">ph_opt_out</code>) for this site in your browser
              settings (and clear any PostHog local data if your browser still blocks capture).
            </p>
            <p className="mt-2 text-green-900">
              Other pages (for example Home) will show a normal URL like <code className="rounded bg-white/80 px-1 text-xs">/</code>{" "}
              - that is expected. Your opt-out is not stored in the address bar; it stays in the cookie until you remove
              it. Use your browser&apos;s developer tools (Application or Storage tab) to confirm{" "}
              <code className="rounded bg-white/80 px-1 text-xs">adp_analytics_opt_out=1</code> (or legacy{" "}
              <code className="rounded bg-white/80 px-1 text-xs">ph_opt_out=1</code>) is present for this site.
            </p>
          </div>
        ) : null}
        {optedInBanner ? (
          <div
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-950"
            role="status"
          >
            <p className="font-semibold">Analytics tracking is on again for this browser.</p>
            <p className="mt-1 text-emerald-900">
              The opt-out cookie was cleared and PostHog was told to resume capture for this browser on this site (if a
              project key is configured). The footer reminder will disappear after the next navigation.
            </p>
          </div>
        ) : null}

        {/* 1. Account contact (email & phone) */}
        <section aria-labelledby="account-contact-details">
          <h2 id="account-contact-details" className="mb-3 text-xl font-bold text-stone-800">
            1. Email and phone number (artist accounts)
          </h2>
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              When you register or update your artist profile, the portal asks for a <strong className="text-stone-900">
              working email address</strong> and <strong className="text-stone-900">phone or WhatsApp number</strong>.
              These are collected only where they are needed to run the service, not for resale or unrelated marketing.
            </p>
            <p>
              <strong className="text-stone-900">Why we need them:</strong> to create and secure your account, to
              prevent duplicate registrations (using a one-way hash of your normalised email for lookup), so the
              portal operator and systems can reach you about your listing (for example approvals or abuse reports),
              and so other users can contact you <em>according to the visibility you choose</em> in your profile (for
              example only you and admins, collaborators you work with, or visitors when you set a field to public).
            </p>
            <p>
              <strong className="text-stone-900">How they are stored:</strong> email and phone values are stored using
              application-level encryption for the sensitive fields; a non-identifying placeholder may remain in legacy
              columns for database compatibility. Your choices for &quot;email visibility&quot; and &quot;phone
              visibility&quot; control how widely each value is shown outside admin tools.
            </p>
            <p className="text-sm text-stone-600">
              This section describes the behaviour implemented in the application. The portal operator remains
              responsible for the legal basis, retention periods, and any data processing agreements that apply in
              their jurisdiction.
            </p>
            <p>
              When you are signed in, you may see a short status line <strong className="text-stone-900">above the site
              footer</strong> with your <strong className="text-stone-900">public display name</strong> (from your artist
              profile) and when your session cookie expires. Operator accounts with the{" "}
              <strong className="text-stone-900">admin</strong> role may see{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">(admin)</code> after the name. This is rendered by the
              application for your session and is separate from PostHog cookies or third-party advertising.
            </p>
          </div>
        </section>

        {/* 2. Analytics usage */}
        <section aria-labelledby="analytics-usage">
          <h2 id="analytics-usage" className="mb-3 text-xl font-bold text-stone-800">
            2. Product analytics (events)
          </h2>
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              This portal uses <strong className="text-stone-900">PostHog</strong> to understand how the site is
              used and to improve it for musicians and visitors. The integration records{" "}
              <strong className="text-stone-900">named events and page views</strong> you trigger while browsing or
              using logged-in areas (for example: which pages you open, when you save your profile, or when you
              update availability). <strong className="text-stone-900">Automatic “click everything” capture
              (autocapture) is turned off</strong>; only code paths that explicitly call the analytics SDK send data.
            </p>
            <p>
              Examples of what may be recorded include route changes as page views, artist profile views,
              registration submissions, and key actions in the artist or admin dashboards. Event payloads are kept
              minimal and are described at a high level in this policy; the portal operator configures the exact
              PostHog project.
            </p>
            <p>
              After you sign in, your browser is usually redirected once to{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">/dashboard?ph_identify=1</code> or{" "}
              <code className="rounded bg-stone-100 px-1 text-xs">/admin/dashboard?ph_identify=1</code> (including
              from local <code className="rounded bg-stone-100 px-1 text-xs">/api/dev/login</code> in development).
              That flag tells the PostHog client to associate this browser with your internal{" "}
              <strong className="text-stone-900">artist ID</strong> — the same opaque id used for server-side events and
              optional feature flags — using <code className="rounded bg-stone-100 px-1 text-xs">posthog.identify</code>.
              The query parameter is removed right away and does not remain in the address bar.
            </p>
          </div>
        </section>

        {/* 3. Session replay */}
        <section aria-labelledby="session-replay">
          <h2 id="session-replay" className="mb-3 text-xl font-bold text-stone-800">
            3. Session replay (optional)
          </h2>
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              When enabled for a deployment, PostHog <strong className="text-stone-900">Session Replay</strong> can
              record a replay of how pages render and how you move, scroll, and click - similar to a screen recording of
              the browser tab. This helps operators reproduce bugs and improve layouts. Replay is{" "}
              <strong className="text-stone-900">not the same as only “event counts”</strong>: it can show structure,
              timing, and masked UI content for sessions that are captured.
            </p>
            <p>
              The app initialises the PostHog client with <strong className="text-stone-900">text masking</strong>{" "}
              (<code className="rounded bg-stone-100 px-1 text-xs">mask_all_text: true</code>) so that visible text in
              the page is masked in replays where that protection applies. Operators should still configure PostHog
              (for example sampling, URL filters, and retention) to match their legal and risk posture. Official
              product documentation:{" "}
              <a
                href="https://posthog.com/docs/session-replay/privacy"
                className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
              >
                PostHog  -  Session replay privacy
              </a>
              .
            </p>
            <p className="text-sm text-stone-600">
              Local development builds typically do not record replay unless explicitly enabled. Production builds may
              disable replay entirely using environment variables documented for operators (
              <code className="rounded bg-stone-100 px-1 text-xs">NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING</code> and related
              flags).
            </p>
          </div>
        </section>

        {/* 4. No PII in event properties */}
        <section aria-labelledby="no-pii">
          <h2 id="no-pii" className="mb-3 text-xl font-bold text-stone-800">
            4. Personal data in analytics <em>properties</em>
          </h2>
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              <strong className="text-stone-900">
                Email addresses, full names, phone numbers, and similar identifiers are not attached to analytics
                events as custom properties.
              </strong>{" "}
              Authenticated artists are linked in PostHog to an opaque internal <strong className="text-stone-900">
              artist ID</strong> (a UUID). Non-identifying attributes such as province and role may be stored on that
              profile to support aggregate reporting.
            </p>
            <p className="text-sm text-stone-600">
              Session replay is a separate surface from “event properties”: it may reflect what appears on screen
              subject to masking and PostHog settings. If you need to avoid replay entirely, use the opt-out mechanisms
              in section 6 or ask the operator to disable recording for the deployment.
            </p>
          </div>
        </section>

        {/* 5. Data retention */}
        <section aria-labelledby="data-retention">
          <h2 id="data-retention" className="mb-3 text-xl font-bold text-stone-800">
            5. Data retention
          </h2>
          <div className="rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              Event and replay data are retained according to the <strong className="text-stone-900">retention settings
              </strong> on the operator&apos;s PostHog project (for example{" "}
              <strong className="text-stone-900">12 months</strong> if that is what they configure).
            </p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <strong>Note for portal operators:</strong> replace the example period above with the value shown in
              PostHog (<strong>Settings → Project</strong> for events and replay retention) and keep this page in sync.
            </p>
          </div>
        </section>

        {/* 6. Opt-out */}
        <section aria-labelledby="opt-out">
          <h2 id="opt-out" className="mb-3 text-xl font-bold text-stone-800">
            6. Opting out
          </h2>
          <div className="space-y-4 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              You can stop PostHog <strong className="text-stone-900">events and session replay</strong> for this
              browser using any of the options below. When opt-out applies, the integration does not send analytics
              requests - not even manual page views.
            </p>

            <PrivacyAnalyticsToggle
              optOutDisplayUrl={optOutDisplayUrl}
              localOptOutSample={LOCAL_OPT_OUT_SAMPLE}
              initialCookieOptedOut={serverCookieOptOut}
              serverPrivacyHeaderOptOut={serverPrivacyHeaderOptOut}
            />

            <div className="flex items-start gap-4 border-t border-stone-100 pt-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                B
              </span>
              <div>
                <p className="font-semibold text-stone-800">Do Not Track / Global Privacy Control</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  If your browser sends the <em>Do Not Track</em> header (
                  <code className="rounded bg-stone-100 px-1 text-xs">DNT: 1</code>) or{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">Sec-GPC: 1</code>, the portal disables PostHog
                  capture when the app loads. (There is no URL for this — enable the signal in your browser or OS
                  privacy settings.)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">
                C
              </span>
              <div>
                <p className="font-semibold text-stone-800">Set the cookie yourself</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  Create a cookie named <code className="rounded bg-stone-100 px-1 text-xs">adp_analytics_opt_out</code>{" "}
                  with value <code className="rounded bg-stone-100 px-1 text-xs">1</code> for this site&apos;s origin,
                  path <code className="rounded bg-stone-100 px-1 text-xs">/</code> (legacy{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">ph_opt_out=1</code> is still read if present).
                  Option A does this for you automatically. To clear it without the button, delete that cookie or open{" "}
                  <code className="rounded bg-stone-100 px-1 text-xs">/privacy/opt-in</code> in the same way as the
                  opt-out URL.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Infrastructure */}
        <section aria-labelledby="infrastructure">
          <h2 id="infrastructure" className="mb-3 text-xl font-bold text-stone-800">
            7. Where data is processed
          </h2>
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              Browser-side PostHog traffic is sent to <strong className="text-stone-900">this website&apos;s own
              domain</strong> first (for example the <code className="rounded bg-stone-100 px-1 text-xs">/api/ph</code>{" "}
              reverse proxy path in production), then forwarded to the PostHog backend configured by the operator.
              That backend may be{" "}
              <strong className="text-stone-900">PostHog Cloud</strong> (regional ingest such as the EU or US data
              centre, depending on <code className="rounded bg-stone-100 px-1 text-xs">POSTHOG_HOST</code>) or a{" "}
              <strong className="text-stone-900">self-hosted</strong> PostHog instance. Server-side analytics calls from
              this app connect to the same configured host.
            </p>
            <p className="text-sm text-stone-600">
              The operator is responsible for listing subprocessors, data processing agreements, and any cookie banner
              or consent text required in their jurisdiction. This page describes what the application is built to
              do; it is not a substitute for legal advice.
            </p>
          </div>
        </section>

        {/* 8. Contact */}
        <section aria-labelledby="contact">
          <h2 id="contact" className="mb-3 text-xl font-bold text-stone-800">
            8. Questions
          </h2>
          <div className="rounded-2xl border border-amber-200 bg-white p-6 leading-relaxed text-stone-700 shadow-sm">
            <p>
              If you have questions about how your data is handled, contact the portal operator directly. Pointers
              appear on the{" "}
              <Link
                href="/about"
                className="font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
              >
                About
              </Link>{" "}
              page.
            </p>
          </div>
        </section>

        <p className="border-t border-amber-100 pt-4 text-center text-xs text-stone-400">
          This policy covers account contact data, analytics, and optional session replay as implemented in the
          open-source codebase. Last reviewed by the portal operator.
        </p>
      </div>

      {/* Footer nav */}
      <div className="border-t border-amber-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-3xl flex-wrap justify-center gap-6 text-sm font-medium text-amber-700">
          <Link href="/" className="underline underline-offset-2 hover:text-amber-900">
            Home
          </Link>
          <Link href="/artists" className="underline underline-offset-2 hover:text-amber-900">
            Browse Artists
          </Link>
          <Link href="/register" className="underline underline-offset-2 hover:text-amber-900">
            Register as Artist
          </Link>
          <Link href="/about" className="underline underline-offset-2 hover:text-amber-900">
            About this Portal
          </Link>
        </div>
      </div>
    </main>
  );
}
