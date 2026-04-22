"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";
import type { SuspensionMessage } from "@/lib/suspension-thread";

type Props = {
  open: boolean;
  onClose: () => void;
  artistId: string;
  artistName: string;
  messages: SuspensionMessage[];
};

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function AdminSuspensionThreadDialog({ open, onClose, artistId, artistName, messages }: Props) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const el = panelRef.current;
      if (!el || el.contains(e.target as Node)) return;
      onClose();
    }
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="presentation">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="max-h-[min(90vh,560px)] w-full max-w-lg overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div className="min-w-0 pr-2">
            <h2 id={headingId} className="truncate text-base font-semibold text-stone-900">
              Suspension thread
            </h2>
            <p className="truncate text-xs text-stone-500">{artistName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-stone-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[min(52vh,360px)] space-y-3 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-stone-500">
              No conversation stored yet. Open moderation on the artist&apos;s edit page to add a suspension note or
              check history.
            </p>
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
                    {m.role === "admin" ? "Team" : "Artist"}
                  </span>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                </div>
                <span className="text-[10px] text-stone-400">{formatMessageTime(m.at)}</span>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-stone-100 bg-stone-50/80 px-4 py-3">
          <Link
            href={`/admin/artists/${artistId}`}
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm font-medium text-stone-600 hover:bg-stone-200/60"
          >
            Profile
          </Link>
          <Link
            href={`/admin/artists/${artistId}/edit#account-moderation`}
            onClick={onClose}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
          >
            Moderation & edit
          </Link>
        </div>
      </div>
    </div>
  );
}
