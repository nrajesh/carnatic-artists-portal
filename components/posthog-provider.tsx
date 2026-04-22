'use client'

import { useEffect } from 'react'
import { Suspense } from 'react'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { initPostHog, posthog } from '@/lib/analytics-client'
import { syncPosthogPrivacySignals } from '@/lib/posthog-privacy-sync'
import { PageViewTracker } from '@/components/page-view-tracker'
import { PosthogRoutePrivacySync } from '@/components/posthog-route-privacy-sync'

export function PostHogProvider({ children }: { children: React.ReactNode }): JSX.Element {
  useEffect(() => {
    // Must initialise before sync: parent effects run before child effects, so `PageViewTracker`
    // cannot run init first — without this, `syncPosthogPrivacySignals` no-ops until visibility change.
    initPostHog()
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
        <PosthogRoutePrivacySync />
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
