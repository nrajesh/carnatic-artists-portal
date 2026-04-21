"use client";

import type { ReactNode } from "react";
import { HardNavAnchor } from "@/components/hard-nav-anchor";

export type PortalStatusVariant = "not-found" | "error" | "unavailable";

const COPY: Record<
  PortalStatusVariant,
  { badge: string; emoji: string; headline: string; body: string }
> = {
  "not-found": {
    badge: "404",
    emoji: "🎭",
    headline: "Nobody booked this stage",
    body: "That address is not on our setlist - it may have moved, been mistyped, or never existed. Try home or the artist directory.",
  },
  error: {
    badge: "Error",
    emoji: "🎵",
    headline: "Something hit a sour note",
    body: "The page hit an unexpected problem. A quick refresh often clears it; if the trouble keeps going, step away for a moment and try again.",
  },
  unavailable: {
    badge: "503",
    emoji: "🛠️",
    headline: "We are tuning the rig",
    body: "The portal is briefly unavailable while we work behind the scenes. Thank you for your patience - we will be back shortly.",
  },
};

function WaveDecoration() {
  return (
    <svg
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-16 w-full text-amber-200/40 sm:h-20"
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M0,60 C200,120 400,0 600,60 C800,120 1000,0 1200,60 L1200,120 L0,120 Z"
      />
    </svg>
  );
}

export function PortalStatusPage({
  variant,
  headline,
  body,
  children,
}: {
  variant: PortalStatusVariant;
  headline?: string;
  body?: string;
  children?: ReactNode;
}) {
  const preset = COPY[variant];
  const title = headline ?? preset.headline;
  const message = body ?? preset.body;

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-amber-50">
      <section className="relative z-0 overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-amber-700 px-6 pb-14 pt-14 text-center text-white sm:pb-16 sm:pt-16">
        <WaveDecoration />
        <div
          className="pointer-events-none absolute -right-16 -top-16 z-0 h-48 w-48 rounded-full border-[3px] border-white/15 sm:h-64 sm:w-64"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 left-8 z-0 h-32 w-32 rounded-full border-2 border-amber-300/25 sm:left-16"
          aria-hidden
        />
        <p
          className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 font-display text-[clamp(4.5rem,18vw,10rem)] font-bold leading-none text-white/[0.07]"
          aria-hidden
        >
          {preset.badge}
        </p>

        <div className="relative z-10 mx-auto max-w-xl">
          <div className="mb-4 text-4xl sm:text-5xl" aria-hidden>
            {preset.emoji}
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-amber-200/90">
            {variant === "not-found"
              ? "Off the map"
              : variant === "unavailable"
                ? "Service pause"
                : "Playback issue"}
          </p>
          <h1 className="mb-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="text-balance text-base leading-relaxed text-amber-100/95 sm:text-lg">{message}</p>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-6 flex w-full max-w-lg flex-1 flex-col px-6 pb-12 sm:-mt-8">
        <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-md ring-1 ring-amber-900/5 sm:p-8">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-amber-800">
            Where to next
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <HardNavAnchor
              href="/"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-amber-700 bg-amber-700 px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-amber-800 sm:flex-initial"
            >
              Back to home
            </HardNavAnchor>
            <HardNavAnchor
              href="/artists"
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border-2 border-amber-300 bg-white px-5 py-2.5 text-center text-sm font-semibold text-amber-900 transition-colors hover:border-amber-500 hover:bg-amber-50 sm:flex-initial"
            >
              Browse artists
            </HardNavAnchor>
          </div>
          {children ? <div className="mt-6 flex flex-wrap justify-center gap-3 border-t border-amber-100 pt-6">{children}</div> : null}
        </div>

        <p className="mt-8 text-center text-xs text-stone-500">
          Discover artists and portfolios based in the Netherlands - same portal, different room.
        </p>
      </div>
    </main>
  );
}
