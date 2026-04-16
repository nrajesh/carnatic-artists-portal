import posthog from 'posthog-js'

/**
 * When `api_host` is a same-origin proxy path, PostHog still needs the real app origin for
 * toolbar links and some SDK loads — otherwise the client can request bad URLs and Safari logs
 * "The network connection was lost" for a stray resource (often shown as "(e, line 0)").
 * @see https://posthog.com/docs/advanced/proxy/nextjs
 */
function posthogUiHost(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST?.trim()
  if (explicit) return explicit.replace(/\/$/, '')
  // Default EU Cloud; set NEXT_PUBLIC_POSTHOG_UI_HOST=https://us.posthog.com for US projects
  return 'https://eu.posthog.com'
}

export function initPostHog(): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!key) {
    console.warn('[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled')
    return
  }

  posthog.init(key, {
    api_host: '/api/ph',
    ui_host: posthogUiHost(),
    capture_pageview: false,
    autocapture: false,
    mask_all_text: true,
    persistence: 'localStorage+cookie',
    disable_session_recording: process.env.NEXT_PUBLIC_POSTHOG_ENABLE_RECORDING !== 'true',
    debug: process.env.NODE_ENV === 'development',
  })
}

export { posthog }
