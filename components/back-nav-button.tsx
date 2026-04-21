"use client";

import { useRouter } from "next/navigation";

export function BackNavButton() {
  const router = useRouter();

  function handleBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    // Full navigation so we recover cleanly from error boundaries (soft push can stick on the error UI).
    window.location.assign("/");
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="rounded-md border border-stone-200 bg-transparent px-2.5 py-1 text-xs font-medium text-stone-500 transition-colors hover:border-stone-300 hover:text-stone-700"
      aria-label="Go back"
    >
      ← Back
    </button>
  );
}
