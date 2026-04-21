'use client'

/**
 * PostHogIdentify - client component that stitches the PostHog anonymous
 * identity to the authenticated artist after a successful magic-link login.
 *
 * Mounted on artist or admin dashboard when the URL contains `?ph_identify=1`
 * (set on post-login redirect). Calls `posthog.identify` with `artistId` and
 * person props, then navigates to `replacePath` without the query param.
 *
 * Requirements: 4.1, 4.2
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { initPostHog, isPosthogClientReady } from '@/lib/analytics-client'

interface PostHogIdentifyProps {
  artistId: string
  province: string | null
  /** PostHog person `role` (session role — admins are still identified by artistId). */
  personRole?: 'artist' | 'admin'
  /** Path after identify (query stripped). Default `/dashboard`. */
  replacePath?: string
}

export function PostHogIdentify({
  artistId,
  province,
  personRole = 'artist',
  replacePath = '/dashboard',
}: PostHogIdentifyProps) {
  const posthog = usePostHog()
  const router = useRouter()

  useEffect(() => {
    if (!artistId) return

    initPostHog()
    try {
      if (isPosthogClientReady() && typeof posthog.identify === 'function') {
        posthog.identify(artistId, {
          role: personRole,
          ...(province ? { province } : {}),
        })
      }
    } catch {
      // Silently ignore analytics errors
    }

    router.replace(replacePath)
  }, [artistId, province, personRole, posthog, replacePath, router])

  return null
}
