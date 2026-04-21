"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Client-side render throw after a click - same segment {@link app/error.tsx} UI.
 */
export default function DevClientErrorSimulatorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Dev-only: segment error boundary (client render)");
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="mb-2 text-sm text-stone-500">
        <Link href="/dev/error-simulator" className="font-medium text-amber-800 hover:underline">
          ← Error simulator
        </Link>
      </p>
      <h1 className="mb-3 font-display text-xl font-semibold text-stone-900">Client render error</h1>
      <p className="mb-6 text-sm text-stone-600">
        Event-handler errors do not reach the route error boundary. This button flips state so the{" "}
        <strong>next render</strong> throws, which surfaces the same themed error UI as a server failure.
      </p>
      <button
        type="button"
        onClick={() => setShouldThrow(true)}
        className="inline-flex min-h-[44px] cursor-pointer items-center rounded-lg border-0 bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
      >
        Throw on next render
      </button>
    </main>
  );
}
