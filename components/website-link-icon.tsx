"use client";

import { useState } from "react";

type GlobeGlyphProps = {
  accent: string;
  className?: string;
};

/** Inline globe for favicon fallback (matches artist-external-links-feed). */
function GlobeGlyph({ accent, className }: GlobeGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={accent}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
    </svg>
  );
}

/**
 * Shows the remote site favicon via Google’s public favicon resolver (same origin as browser devtools).
 * Falls back to the amber globe if the image fails or hostname is missing.
 *
 * @see https://www.google.com/s2/favicons - domain + sz params
 */
export function WebsiteLinkIcon({
  hostname,
  accent,
  className = "h-6 w-6 sm:h-7 sm:w-7",
}: {
  hostname: string | null;
  accent: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!hostname || failed) {
    return <GlobeGlyph accent={accent} className={className} />;
  }

  const src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(hostname)}`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote favicon URLs; domains vary per artist
    <img
      src={src}
      alt=""
      aria-hidden
      width={28}
      height={28}
      loading="lazy"
      referrerPolicy="no-referrer"
      decoding="async"
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  );
}
