// NOTE: This component must be wrapped in a React Suspense boundary when used,
// because useSearchParams() requires Suspense in Next.js App Router.
// Example:
//   <Suspense fallback={null}>
//     <PageViewTracker />
//   </Suspense>
'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, isPosthogClientReady, posthog } from '@/lib/analytics-client'

export function PageViewTracker(): null {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
    if (!isPosthogClientReady()) {
      return
    }
    const search = searchParams.toString()
    const url = pathname + (search ? `?${search}` : '')
    try {
      posthog.capture('$pageview', { $current_url: url })
    } catch {
      // Never let analytics break navigation / RSC
    }
  }, [pathname, searchParams])

  return null
}
