"use client";

import { useMemo, useState, useTransition } from "react";
import { usePostHog } from "posthog-js/react";
import { PortalSectionHeading } from "@/components/portal-section-heading";
import {
  createAvailabilityWindowAction,
  deleteAvailabilityWindowAction,
  updateAvailabilityWindowAction,
  type AvailabilityEntryView,
} from "./actions";

type AvailabilityManagerProps = {
  initialEntries: AvailabilityEntryView[];
};

export function AvailabilityManager({ initialEntries }: AvailabilityManagerProps) {
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
      const result = await createAvailabilityWindowAction({
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
      const result = await updateAvailabilityWindowAction({
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

  function handleDeleteWindow(id: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteAvailabilityWindowAction({ id });
      if (!result.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      syncEntries(result.entries);
      setMessage({ type: "success", text: "Availability window removed." });
      posthog.capture("availability_deleted", { window_count: result.entries.length });
    });
  }

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
              value={newStartDate}
              onChange={(e) => setNewStartDate(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[44px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-stone-700">
            End date
            <input
              type="date"
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
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
              return (
                <li key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                      Start
                      <input
                        type="date"
                        value={draft.startDate}
                        onChange={(e) =>
                          setRowDrafts((prev) => ({
                            ...prev,
                            [entry.id]: { ...draft, startDate: e.target.value },
                          }))
                        }
                        className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm normal-case tracking-normal text-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-stone-500">
                      End
                      <input
                        type="date"
                        value={draft.endDate}
                        onChange={(e) =>
                          setRowDrafts((prev) => ({
                            ...prev,
                            [entry.id]: { ...draft, endDate: e.target.value },
                          }))
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
