'use client'

import Link from 'next/link'
import { usePostHog } from 'posthog-js/react'

export function JoinCtaButton(): JSX.Element {
  const posthog = usePostHog()

  function handleClick() {
    posthog.capture('cta_join_clicked')
  }

  return (
    <Link
      href="/register"
      onClick={handleClick}
      className="flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 sm:px-6 sm:py-3 sm:text-base"
    >
      Join as an Artist
    </Link>
  )
}
