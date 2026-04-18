"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SuspendControlsProps = {
  artistId: string;
  initialSuspended: boolean;
};

export function SuspendControls({ artistId, initialSuspended }: SuspendControlsProps) {
  const router = useRouter();
  const [suspended, setSuspended] = useState(initialSuspended);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setStatus(next: boolean) {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/artists/${artistId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: next }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Request failed.");
        return;
      }
      setSuspended(next);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      {suspended ? (
        <button
          type="button"
          onClick={() => setStatus(false)}
          disabled={isPending}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Working…" : "Reactivate account"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setStatus(true)}
          disabled={isPending}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Working…" : "Suspend account"}
        </button>
      )}
    </div>
  );
}
