"use client";

import { useMemo, useState, useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import {
  createAvailabilityWindowAction,
  deleteAvailabilityWindowAction,
  updateAvailabilityWindowAction,
  type AvailabilityActionResult,
  type AvailabilityEntryView,
} from "./actions";

/** Lexicographic max for YYYY-MM-DD strings. */
function maxIsoDate(a: string, b: string): string {
  return a >= b ? a : b;
}

type AvailabilityManagerProps = {
  initialEntries: AvailabilityEntryView[];
  /** Earliest selectable calendar day (YYYY-MM-DD) for end-date fields - server-provided deployment today. */
  minCalendarDate: string;
  /** Defaults to signed-in artist; admin pages pass actions bound to a target artist id. */
  createWindowAction?: (
    input: { startDate: string; endDate: string },
  ) => Promise<AvailabilityActionResult>;
  updateWindowAction?: (input: {
    id: string;
    startDate: string;
    endDate: string;
  }) => Promise<AvailabilityActionResult>;
  deleteWindowAction?: (input: { id: string }) => Promise<AvailabilityActionResult>;
};

export function AvailabilityManager({
  initialEntries,
  minCalendarDate,
  createWindowAction = createAvailabilityWindowAction,
  updateWindowAction = updateAvailabilityWindowAction,
  deleteWindowAction = deleteAvailabilityWindowAction,
}: AvailabilityManagerProps) {
  const posthog = usePostHog();
  const [entries, setEntries] = useState(initialEntries);
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [rowDrafts, setRowDrafts] = useState<Record<string, { startDate: string; endDate: string }>>(() =>
    Object.fromEntries(initialEntries.map((entry) => [entry.id, { startDate: entry.startDate, endDate: entry.endDate }])),
  );
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasEntries = entries.length > 0;

  const sortedEntries = useMemo(
    () =>
      [...entries].sort((a, b) =>
        a.startDate === b.startDate
          ? a.endDate.localeCompare(b.endDate)
          : a.startDate.localeCompare(b.startDate),
      ),
    [entries],
  );

  function syncEntries(nextEntries: AvailabilityEntryView[]) {
    setEntries(nextEntries);
    setRowDrafts(
      Object.fromEntries(
        nextEntries.map((entry) => [
          entry.id,
          { startDate: entry.startDate, endDate: entry.endDate },
        ]),
      ),
    );
  }

  function handleCreateWindow() {
    setMessage(null);
    startTransition(async () => {
      const result = await createWindowAction({
        startDate: newStartDate,
        endDate: newEndDate,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      syncEntries(result.entries);
      setNewStartDate("");
      setNewEndDate("");
      setMessage({ type: "success", text: "Availability window added." });
      posthog.capture("availability_created", { window_count: result.entries.length });
    });
  }

  function handleUpdateWindow(id: string) {
    const draft = rowDrafts[id];
    if (!draft) return;

    setMessage(null);
    startTransition(async () => {
      const result = await updateWindowAction({
        id,
        startDate: draft.startDate,
        endDate: draft.endDate,
      });

      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      syncEntries(result.entries);
      setMessage({ type: "success", text: "Availability window updated." });
      posthog.capture("availability_updated", { window_count: result.entries.length });
    });
  }

  function setNewRowStart(value: string) {
    let start = value;
    let end = newEndDate;
    if (start && end && end < start) end = start;
    setNewStartDate(start);
    setNewEndDate(end);
  }

  function setNewRowEnd(value: string) {
    let start = newStartDate;
    let end = value;
    if (start && end && end < start) start = end;
    setNewStartDate(start);
    setNewEndDate(end);
  }

  function updateRowDraft(
    id: string,
    patch: Partial<{ startDate: string; endDate: string }>,
  ) {
    setRowDrafts((prev) => {
      const cur = prev[id];
      if (!cur) return prev;
      let start = patch.startDate ?? cur.startDate;
      let end = patch.endDate ?? cur.endDate;
      if (start && end && end < start) {
        if (patch.startDate !== undefined) end = start;
        else start = end;
      }
      return { ...prev, [id]: { startDate: start, endDate: end } };
    });
  }

  function handleDeleteWindow(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteWindowAction({ id });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      syncEntries(result.entries);
      setMessage({ type: "success", text: "Availability window removed." });
      posthog.capture("availability_deleted", { window_count: result.entries.length });
    });
  }

  const newStartMin = minCalendarDate;
  const newStartMax = newEndDate || undefined;
  const newEndMin = newStartDate
    ? maxIsoDate(minCalendarDate, newStartDate)
    : minCalendarDate;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      {message && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="space-y-3 border-b border-stone-100 pb-5">
        <PortalSectionHeading variant="label" className="mb-1">
          Add availability window
        </PortalSectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Start date
            <input
              type="date"
              min={newStartMin}
              max={newStartMax}
              value={newStartDate}
              onChange={(e) => setNewRowStart(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            End date
            <input
              type="date"
              min={newEndMin}
              value={newEndDate}
              onChange={(e) => setNewRowEnd(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={handleCreateWindow}
          disabled={isPending || !newStartDate || !newEndDate}
          className="w-full rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Add window"}
        </button>
      </section>

      <section className="pt-5">
        <PortalSectionHeading variant="label" className="mb-3">
          Existing windows
        </PortalSectionHeading>
        {!hasEntries ? (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm italic text-stone-500">
            No availability windows added yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {sortedEntries.map((entry) => {
              const draft = rowDrafts[entry.id] ?? {
                startDate: entry.startDate,
                endDate: entry.endDate,
              };
              const rowStartMin = minCalendarDate;
              const rowStartMax = draft.endDate || undefined;
              const rowEndMin = draft.startDate
                ? maxIsoDate(minCalendarDate, draft.startDate)
                : minCalendarDate;

              return (
                <li key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Start
                      <input
                        type="date"
                        min={rowStartMin}
                        max={rowStartMax}
                        value={draft.startDate}
                        onChange={(e) =>
                          updateRowDraft(entry.id, { startDate: e.target.value })
                        }
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                      End
                      <input
                        type="date"
                        min={rowEndMin}
                        value={draft.endDate}
                        onChange={(e) =>
                          updateRowDraft(entry.id, { endDate: e.target.value })
                        }
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateWindow(entry.id)}
                      disabled={isPending || !draft.startDate || !draft.endDate}
                      className="flex-1 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Update
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWindow(entry.id)}
                      disabled={isPending}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
