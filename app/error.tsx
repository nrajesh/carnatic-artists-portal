"use client";

import { PortalStatusPage } from "@/components/portal-status-page";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest;
  const isServerError = Boolean(digest);

  return (
    <PortalStatusPage
      variant="error"
      headline={isServerError ? "The server stumbled" : undefined}
      body={
        isServerError
          ? "Something went wrong on our side while loading this page. You can try again in a moment."
          : undefined
      }
    >
      <button
        type="button"
        onClick={() => reset()}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
      >
        Try again
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.assign("/");
        }}
        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-amber-200 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-50"
      >
        Home
      </button>
      {digest ? (
        <p className="w-full text-center font-mono text-[11px] text-stone-400">Reference: {digest}</p>
      ) : null}
    </PortalStatusPage>
  );
}
