"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { AdminSpecialityRow } from "@/lib/queries/admin-specialities";
import { deleteSpecialitiesBulkAction } from "./actions";
import { SpecialityCard } from "./speciality-card";

type ConfirmPanel = {
  open: boolean;
  title: string;
  message: string;
  tone: "default" | "danger";
  confirmLabel: string;
};

const closedConfirm: ConfirmPanel = {
  open: false,
  title: "",
  message: "",
  tone: "default",
  confirmLabel: "OK",
};

export function AdminSpecialitiesGrid({ rows }: { rows: AdminSpecialityRow[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmPanel>(closedConfirm);
  const pendingConfirmAction = useRef<(() => void) | null>(null);

  const dismissConfirm = useCallback(() => {
    pendingConfirmAction.current = null;
    setConfirm(closedConfirm);
  }, []);

  const commitConfirm = useCallback(() => {
    const run = pendingConfirmAction.current;
    pendingConfirmAction.current = null;
    setConfirm(closedConfirm);
    run?.();
  }, []);

  const onToggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectableIds = useMemo(
    () => rows.filter((r) => r.artistCount === 0).map((r) => r.id),
    [rows],
  );

  const selectableSet = useMemo(() => new Set(selectableIds), [selectableIds]);

  useEffect(() => {
    setSelectedIds((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (selectableSet.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectableSet]);
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelectableSelected =
    selectableIds.some((id) => selectedIds.has(id)) && !allSelected;

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const every =
        selectableIds.length > 0 && selectableIds.every((id) => next.has(id));
      if (every) {
        selectableIds.forEach((id) => next.delete(id));
      } else {
        selectableIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function onBulkDelete() {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    pendingConfirmAction.current = () => {
      setMessage(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await deleteSpecialitiesBulkAction(ids);
        if (!result.ok) {
          setMessage(result.error);
          return;
        }
        if (result.blocked > 0) {
          setMessage(
            `Deleted ${result.deleted}. Skipped ${result.blocked} (still in use or error).`,
          );
        } else {
          setMessage(null);
        }
        setSelectedIds(new Set());
        router.refresh();
      });
    };
    setConfirm({
      open: true,
      title: "Delete specialities",
      message: `Delete up to ${n} speciality record${n === 1 ? "" : "s"}? Items still used by artists will be skipped.`,
      tone: "danger",
      confirmLabel: "Delete",
    });
  }

  return (
    <>
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        tone={confirm.tone}
        confirmLabel={confirm.confirmLabel}
        isPending={pending}
        onConfirm={commitConfirm}
        onCancel={dismissConfirm}
      />
      <div className="space-y-4">
      {message ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950">{message}</p>
      ) : null}

      {rows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              selectableIds.length > 0 ? "cursor-pointer text-stone-700" : "cursor-not-allowed text-stone-400"
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
              disabled={selectableIds.length === 0}
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelectableSelected;
              }}
              onChange={toggleAll}
            />
            Select all deletable ({selectableIds.length})
          </label>
          {selectedIds.size > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={onBulkDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              Delete selected ({selectedIds.size})
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => {
          const canSelect = row.artistCount === 0;
          const checked = canSelect && selectedIds.has(row.id);
          return (
            <div key={row.id} className="relative">
              <div
                className={`absolute left-3 top-14 z-10 flex h-8 w-8 items-center justify-center rounded-md border bg-white/95 shadow-sm ${
                  checked ? "border-amber-400 ring-2 ring-amber-200" : "border-stone-200"
                } ${!canSelect ? "opacity-40" : ""}`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed"
                  disabled={!canSelect}
                  checked={checked}
                  onChange={() => canSelect && onToggle(row.id)}
                  title={
                    canSelect
                      ? undefined
                      : "Cannot select: artists use this speciality. Remove them before bulk delete."
                  }
                  aria-label={
                    canSelect
                      ? `Select ${row.name}`
                      : `${row.name} cannot be selected for bulk delete while in use`
                  }
                />
              </div>
              <div className="pl-6">
                <SpecialityCard row={row} allRows={rows} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
