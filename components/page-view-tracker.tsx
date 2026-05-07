// NOTE: This component must be wrapped in a React Suspense boundary when used,
// because useSearchParams() requires Suspense in Next.js App Router.
// Example:
//   <Suspense fallback={null}>
//     <PageViewTracker />
//   </Suspense>
'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, isPosthogClientReady, posthog } from '@/lib/analytics-client'

function shouldLogAnalyticsDebug(): boolean {
  return process.env.NEXT_PUBLIC_POSTHOG_DEBUG === 'true'
}

function shouldForceImmediateDevCapture(): boolean {
  return process.env.NODE_ENV === 'development'
}

function logAnalyticsDebug(event: '$pageview' | '$pageleave', url: string, reason: string): void {
  if (!shouldLogAnalyticsDebug()) {
    return
  }

  console.debug(`[analytics] ${event}`, { url, reason })
}

function routeChangeCaptureOptions(): { send_instantly?: boolean; transport?: 'XHR' } {
  if (shouldForceImmediateDevCapture()) {
    return { send_instantly: true, transport: 'XHR' }
  }
  return {}
}

export function PageViewTracker(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const previousUrlRef = useRef<string | null>(null)
  const pageleaveSentRef = useRef<string | null>(null)
  const search = searchParams.toString()
  const url = pathname + (search ? `?${search}` : '')

  useEffect(() => {
    initPostHog()
    const previousUrl = previousUrlRef.current
    previousUrlRef.current = url

    if (!isPosthogClientReady()) {
      return
    }

    try {
      if (previousUrl && previousUrl !== url) {
        logAnalyticsDebug('$pageleave', previousUrl, 'route-change')
        posthog.capture('$pageleave', { $current_url: previousUrl }, routeChangeCaptureOptions())
      }
      logAnalyticsDebug('$pageview', url, 'route-change')
      posthog.capture('$pageview', { $current_url: url }, routeChangeCaptureOptions())
      pageleaveSentRef.current = null
    } catch {
      // Never let analytics break navigation / RSC
    }
  }, [url])

  useEffect(() => {
    const captureCurrentPageleave = () => {
      initPostHog()
      if (!isPosthogClientReady()) {
        return
      }

      const currentUrl = previousUrlRef.current
      if (!currentUrl || pageleaveSentRef.current === currentUrl) {
        return
      }

      try {
        logAnalyticsDebug('$pageleave', currentUrl, 'pagehide-or-hidden')
        posthog.capture(
          '$pageleave',
          { $current_url: currentUrl },
          { send_instantly: true, transport: 'sendBeacon' },
        )
        pageleaveSentRef.current = currentUrl
      } catch {
        // Never let analytics break navigation / unload
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        captureCurrentPageleave()
      }
    }

    const onPageHide = () => {
      captureCurrentPageleave()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    globalThis.addEventListener('pagehide', onPageHide)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      globalThis.removeEventListener('pagehide', onPageHide)
    }
  }, [])

  return null
}
