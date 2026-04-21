"use client";

import { useCallback, useState } from "react";

type ArtistProfileShareButtonProps = {
  /** Fully qualified profile URL when possible; otherwise path starting with / */
  profileUrl: string;
  shareTitle: string;
  shareText: string;
  className?: string;
};

function resolveUrlForShare(profileUrl: string): string {
  if (profileUrl.startsWith("http://") || profileUrl.startsWith("https://")) {
    return profileUrl;
  }
  if (typeof window !== "undefined") {
    return `${window.location.origin}${profileUrl.startsWith("/") ? profileUrl : `/${profileUrl}`}`;
  }
  return profileUrl;
}

export function ArtistProfileShareButton({
  profileUrl,
  shareTitle,
  shareText,
  className = "",
}: ArtistProfileShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const onShare = useCallback(async () => {
    const url = resolveUrlForShare(profileUrl);

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url,
        });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
      window.prompt("Copy this link:", url);
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [profileUrl, shareTitle, shareText]);

  const label =
    status === "copied" ? "Link copied" : status === "error" ? "Copy manually" : "Share";

  return (
    <button
      type="button"
      onClick={onShare}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm",
        "transition-colors hover:bg-white/20 active:scale-[0.98]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        "min-h-[44px] min-w-[44px] touch-manipulation overflow-visible",
        className,
      ].join(" ")}
      aria-label={`Share ${shareTitle}`}
    >
      {/* Three nodes + two connectors - explicit primitives avoid arc/path clipping issues */}
      <svg
        className="h-5 w-5 shrink-0 opacity-95"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="10.49" x2="15.41" y2="6.51" />
        <line x1="8.59" y1="13.51" x2="15.41" y2="17.49" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
