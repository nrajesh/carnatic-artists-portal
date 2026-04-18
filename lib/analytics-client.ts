import posthog from 'posthog-js'

/**
 * Browser ingest URL. In development we call PostHog Cloud directly so the SDK works without
 * `POSTHOG_HOST` on the server (the `/api/ph` proxy would otherwise return 503 and cause
 * "Failed to fetch" / RemoteConfig errors). Production keeps the same-origin proxy.
 */
function posthogApiHost(): string {
  if (process.env.NODE_ENV === 'development') {
    const direct =
      process.env.NEXT_PUBLIC_POSTHOG_INGEST_HOST?.trim() ||
      'https://eu.i.posthog.com'
    return direct.replace(/\/$/, '')
  }
  return '/api/ph'
}

/**
 * When `api_host` is a same-origin proxy path, PostHog still needs the real app origin for
 * toolbar links and some SDK loads - otherwise the client can request bad URLs and Safari logs
 * "The network connection was lost" for a stray resource (often shown as "(e, line 0)").
 * @see https://posthog.com/docs/advanced/proxy/nextjs
 */
function posthogUiHost(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  // Default EU Cloud; set NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com for US projects
  return 'https://eu.posthog.com'
}

/** Session recording is on by default; set NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING=false to opt out. */
function sessionRecordingDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING?.trim().toLowerCase()
  if (!v) return false
  return v === 'false' || v === '0' || v === 'off' || v === 'no'
}

export function initPostHog(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!key) {
    console.warn('[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set - analytics disabled')
    return
  }

  posthog.init(key, {
    api_host: posthogApiHost(),
    ui_host: posthogUiHost(),
    capture_pageview: false,
    autocapture: false,
    mask_all_text: true,
    persistence: 'localStorage+cookie',
    disable_session_recording: sessionRecordingDisabled(),
    // Not used by this app - disabling prevents a `/flags` POST and a `/array/<key>/config.js`
    // fetch on every page load. Each is a potential source of the Safari "network connection
    // was lost" console error when the browser navigates before the request completes.
    advanced_disable_feature_flags: true,
    advanced_disable_feature_flags_on_first_load: true,
    disable_surveys: true,
    debug: process.env.NODE_ENV === 'development',
  })
}

export { posthog }
