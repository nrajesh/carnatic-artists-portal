"use client";

import { useState } from "react";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import type { SuspensionMessage } from "@/lib/suspension-thread";
import { SuspendControls } from "./suspend-controls";

type Props = {
  artistId: string;
  isSuspended: boolean;
  suspensionComment: string | null;
  suspensionMessages: SuspensionMessage[];
  isSelf: boolean;
};

/**
 * Collapsible moderation UI so account status is not a dead-end: Edit → suspend / reactivate.
 */
export function AdminModerationPanel({
  artistId,
  isSuspended,
  suspensionComment,
  suspensionMessages,
  isSelf,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Account status
          </span>
          <span
            className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${
              isSuspended
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {isSuspended ? "Suspended" : "Active"}
          </span>
        </div>
        {open ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm font-medium text-stone-500 underline-offset-2 hover:text-stone-800"
          >
            Close
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-sm font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
          >
            Edit
          </button>
        )}
      </div>

      {open ? (
        <div className="mt-4 border-t border-stone-100 pt-4">
          <PortalSectionHeading variant="title" className="mb-2">
            Moderation
          </PortalSectionHeading>
          <SuspendControls
            artistId={artistId}
            initialSuspended={isSuspended}
            initialSuspensionComment={suspensionComment}
            initialSuspensionMessages={suspensionMessages}
            isSelf={isSelf}
          />
        </div>
      ) : null}
    </div>
  );
}
