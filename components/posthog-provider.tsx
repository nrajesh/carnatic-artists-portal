'use client'

import { useEffect } from 'react'
import { Suspense } from 'react'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { posthog } from '@/lib/analytics-client'
import { hasBrowserAnalyticsOptOut } from '@/lib/analytics-privacy-signals'
import { PageViewTracker } from '@/components/page-view-tracker'

function syncPosthogPrivacySignals(): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) return
  const ph = posthog as typeof posthog & { __loaded?: boolean }
  if (!ph.__loaded) return

  const shouldOptOut = hasBrowserAnalyticsOptOut()
  if (shouldOptOut) {
    ph.opt_out_capturing()
  } else if (typeof ph.has_opted_out_capturing === 'function' && ph.has_opted_out_capturing()) {
    // Cookie cleared (or DNT lifted) but SDK still opted out from persistence — resync without firing $opt_in.
    ph.opt_in_capturing({ captureEventName: false })
  }
}

export function PostHogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  useEffect(() => {
    /** Init runs in child effects (e.g. `PageViewTracker`) first; only sync here. */
    syncPosthogPrivacySignals()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        syncPosthogPrivacySignals()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
