"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * After server clears `ph_opt_out`, PostHog may still treat the user as opted out via persistence.
 * Call `opt_in_capturing()` once when landing with `?analytics=opted_in`.
 */
export function PosthogOptInHandler({ active }: { active: boolean }) {
  const posthog = usePostHog();
  const ran = useRef(false);

  useEffect(() => {
    if (!active || ran.current) return;
    ran.current = true;
    try {
      posthog?.opt_in_capturing?.();
    } catch {
      /* ignore */
    }
  }, [active, posthog]);

  return null;
}
