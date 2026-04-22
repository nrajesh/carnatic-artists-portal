"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SuspensionMessage } from "@/lib/suspension-thread";

type SuspendControlsProps = {
  artistId: string;
  initialSuspended: boolean;
  initialSuspensionComment: string | null;
  initialSuspensionMessages: SuspensionMessage[];
  /** When true, hide suspend controls while active (API also blocks self-suspend). */
  isSelf?: boolean;
};

export function SuspendControls({
  artistId,
  initialSuspended,
  initialSuspensionComment,
  initialSuspensionMessages,
  isSelf = false,
}: SuspendControlsProps) {
  const router = useRouter();
  const [suspended, setSuspended] = useState(initialSuspended);
  const [suspensionComment, setSuspensionComment] = useState(initialSuspensionComment);
  const [suspensionMessages, setSuspensionMessages] = useState(initialSuspensionMessages);
  const [commentDraft, setCommentDraft] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSuspensionMessages(initialSuspensionMessages);
  }, [initialSuspensionMessages]);

  function setStatus(next: boolean, comment: string) {
    setMessage(null);
    setSuccessNotice(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/artists/${artistId}/suspend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: next, comment }),
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (data.error === "COMMENT_REQUIRED") {
          setMessage("A suspension reason is required.");
        } else if (data.error === "CANNOT_SUSPEND_SELF") {
          setMessage("You cannot suspend your own account.");
        } else {
          setMessage(data.error ?? "Request failed.");
        }
        return;
      }
      setSuspended(next);
      setSuspensionComment(next ? comment.trim() : null);
      if (next) {
        const at = new Date().toISOString();
        setSuspensionMessages([{ role: "admin", body: comment.trim(), at }]);
      } else {
        setSuspensionMessages([]);
      }
      if (!next) setCommentDraft("");
      setSuccessNotice(next ? "Account suspended." : "Account reactivated.");
      router.refresh();
    });
  }

  if (isSelf && !suspended) {
    return (
      <div className="space-y-3">
        {message ? <p className="text-sm text-red-600">{message}</p> : null}
        <p className="text-sm text-stone-600">
          You cannot suspend your own account. Ask another admin if this account should be suspended.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {successNotice ? (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-950">{successNotice}</p>
      ) : null}
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      {suspended ? (
        <>
          {suspensionMessages.length > 0 ? (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/90 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">Thread</p>
              {suspensionMessages.map((m, i) => (
                <div
                  key={`${m.at}-${i}`}
                  className={`flex flex-col gap-0.5 text-sm ${m.role === "admin" ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`max-w-[95%] rounded-xl px-3 py-2 ${
                      m.role === "admin"
                        ? "rounded-tl-sm border border-stone-200 bg-white text-stone-800"
                        : "rounded-tr-sm border border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                  >
                    <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                      {m.role === "admin" ? "Team" : "Artist"}
                    </span>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : suspensionComment ? (
            <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
              <span className="font-semibold text-stone-800">Suspension reason: </span>
              <span className="whitespace-pre-wrap">{suspensionComment}</span>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setStatus(false, "")}
            disabled={isPending}
            className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Working…" : "Reactivate account"}
          </button>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="suspend-reason" className="mb-1 block text-xs font-semibold text-stone-700">
              Suspension reason <span className="text-red-600">*</span>
            </label>
            <textarea
              id="suspend-reason"
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={4}
              maxLength={2000}
              disabled={isPending}
              placeholder="Explain why this account is being suspended (stored on the artist record)."
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              const t = commentDraft.trim();
              if (!t) {
                setMessage("A suspension reason is required.");
                setSuccessNotice(null);
                return;
              }
              setStatus(true, t);
            }}
            disabled={isPending}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Working…" : "Suspend account"}
          </button>
        </>
      )}
    </div>
  );
}
