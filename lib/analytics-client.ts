import posthog from 'posthog-js'

/**
 * Browser ingest URL.
 * - Production: same-origin `/api/ph` proxy (avoids third-party cookie / CORS edge cases).
 * - Development: defaults to PostHog Cloud directly so the SDK works without `POSTHOG_HOST`
 *   on the server. Safari can block cross-site blob/worker traffic and spam the console; set
 *   `NEXT_PUBLIC_POSTHOG_DEV_PROXY=true` with `POSTHOG_HOST` in `.env.local` to use the proxy
 *   locally, or `NEXT_PUBLIC_POSTHOG_DISABLE_IN_DEV=true` to skip the SDK entirely.
 */
function posthogApiHost(): string {
  if (process.env.NODE_ENV === 'development') {
    const useProxy = process.env.NEXT_PUBLIC_POSTHOG_DEV_PROXY === 'true'
    if (useProxy) {
      return '/api/ph'
    }
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

/**
 * Client-side opt-out only. Leave env unset so `disable_session_recording` is omitted from init
 * (PostHog recommends removing the option rather than setting it false when enabling replay).
 * @see https://posthog.com/docs/session-replay/troubleshooting#recordings-are-not-being-captured
 */
function sessionRecordingDisabled(): boolean {
  const v = process.env.NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING?.trim().toLowerCase()
  if (!v) return false
  return v === 'false' || v === '0' || v === 'off' || v === 'no'
}

/**
 * Session replay in `next dev` loads rrweb workers that can spam the console with invalid blob
 * source-map URLs (e.g. image-bitmap-data-url-worker). Off by default in development; set
 * NEXT_PUBLIC_POSTHOG_RECORDING_IN_DEV=true to record local sessions anyway.
 */
function sessionRecordingOffInDev(): boolean {
  if (process.env.NODE_ENV !== 'development') return false
  const v = process.env.NEXT_PUBLIC_POSTHOG_RECORDING_IN_DEV?.trim().toLowerCase()
  return v !== 'true' && v !== '1' && v !== 'yes'
}

let warnedMissingPosthogKey = false

/** True after `posthog.init` ran successfully (SDK ready for `capture` / `identify`). */
export function isPosthogClientReady(): boolean {
  const ph = posthog as { __loaded?: boolean }
  return !!ph.__loaded
}

/** Idempotent - safe to call from any client effect (runs before parent `PostHogProvider` effects). */
export function initPostHog(): void {
  const ph = posthog as { __loaded?: boolean }
  if (ph.__loaded) {
    return
  }

  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_POSTHOG_DISABLE_IN_DEV === 'true') {
    return
  }

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()
  if (!key) {
    if (process.env.NODE_ENV === 'development' && !warnedMissingPosthogKey) {
      warnedMissingPosthogKey = true
      console.warn('[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set - analytics disabled')
    }
    return
  }

  const recordingOff = sessionRecordingDisabled() || sessionRecordingOffInDev()

  posthog.init(key, {
    api_host: posthogApiHost(),
    ui_host: posthogUiHost(),
    capture_pageview: false,
    autocapture: false,
    mask_all_text: true,
    persistence: 'localStorage+cookie',
    ...(recordingOff
      ? { disable_session_recording: true }
      : {
          session_recording: {
            maskAllInputs: true,
            maskInputOptions: { password: true, textarea: true, select: true },
            /** rrweb: elements with this class are not captured (email/phone fields use `ph-no-capture`). */
            ignoreClass: 'ph-no-capture',
          },
        }),
    // Session replay depends on the same remote config + flags pipeline as feature flags.
    // Setting `advanced_disable_feature_flags` leaves recording stuck waiting for a "flags response".
    disable_surveys: false,
    /** Verbose SDK logging - off by default; set NEXT_PUBLIC_POSTHOG_DEBUG=true when diagnosing. */
    debug: process.env.NEXT_PUBLIC_POSTHOG_DEBUG === 'true',
  })
}

export { posthog }
