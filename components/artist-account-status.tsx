"use client";

import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SuspensionMessage } from "@/lib/suspension-thread";

type ArtistAccountStatusProps = {
  isSuspended: boolean;
  initialMessages: SuspensionMessage[];
};

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ArtistAccountStatus({ isSuspended, initialMessages }: ArtistAccountStatusProps) {
  const router = useRouter();
  const headingId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const el = dialogRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setOpen(false);
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const sendMessage = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/me/suspension-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "NOT_SUSPENDED") {
          setError("Your account is no longer suspended.");
        } else if (data.error === "VALIDATION_ERROR") {
          setError("Message must be between 1 and 2000 characters.");
        } else {
          setError("Could not send your message. Try again.");
        }
        return;
      }
      const at = new Date().toISOString();
      setMessages((prev) => [...prev, { role: "artist", body: text, at }]);
      setDraft("");
      router.refresh();
    });
  }, [draft, router]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Account status</span>
      {isSuspended ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex cursor-pointer rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 underline-offset-2 hover:bg-red-100 hover:underline focus:outline-none focus:ring-2 focus:ring-red-400"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? headingId : undefined}
        >
          Suspended
        </button>
      ) : (
        <span
          className="inline-flex rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-800"
          title="Your account is approved and active."
        >
          Approved
        </span>
      )}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            className="max-h-[min(90vh,640px)] w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
              <h2 id={headingId} className="text-base font-semibold text-stone-900">
                Account suspension
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[340px] space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 ? (
                <p className="text-sm text-stone-500">No messages yet.</p>
              ) : (
                messages.map((m, i) => (
                  <div
                    key={`${m.at}-${i}`}
                    className={`flex flex-col gap-0.5 ${m.role === "admin" ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                        m.role === "admin"
                          ? "rounded-tl-sm border border-stone-200 bg-stone-50 text-stone-800"
                          : "rounded-tr-sm border border-amber-200 bg-amber-50 text-amber-950"
                      }`}
                    >
                      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                        {m.role === "admin" ? "Team" : "You"}
                      </span>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    </div>
                    <span className="text-[10px] text-stone-400">{formatMessageTime(m.at)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-stone-100 bg-stone-50/80 px-4 py-3">
              <p className="mb-2 text-xs text-stone-600">
                Reach out to an administrator. Your message is stored here for the team to review.
              </p>
              {error ? <p className="mb-2 text-xs text-red-600">{error}</p> : null}
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                maxLength={2000}
                disabled={isPending}
                placeholder="Write a message to the team…"
                className="mb-2 w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200/60"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={isPending || !draft.trim()}
                  onClick={sendMessage}
                  className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPending ? "Sending…" : "Send to team"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
