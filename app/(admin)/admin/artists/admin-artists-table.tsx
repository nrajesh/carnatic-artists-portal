"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import SortableTable, { Column } from "@/components/sortable-table";
import type { AdminArtistListRow } from "@/lib/queries/admin-artists";
import { deleteArtistsAction, setArtistsStatusBulkAction } from "./actions";

const COLUMNS: Column<AdminArtistListRow>[] = [
  {
    key: "name",
    label: "Artist",
    render: (a) => (
      <Link href={`/admin/artists/${a.id}`}>
        <div className="font-semibold text-stone-800 transition-colors hover:text-amber-800">{a.name}</div>
        <div className="mt-0.5 text-xs text-stone-400">{a.email}</div>
      </Link>
    ),
  },
  {
    key: "specialities",
    label: "Specialities",
    sortValue: (a) => a.specialities.map((s) => s.name).join(", "),
    render: (a) => (
      <div className="flex flex-wrap gap-1">
        {a.specialities.map((s) => (
          <span
            key={s.name}
            className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
          >
            {s.name}
          </span>
        ))}
      </div>
    ),
  },
  {
    key: "province",
    label: "Province",
    render: (a) => <span className="text-stone-600">{a.province}</span>,
  },
  {
    key: "status",
    label: "Status",
    sortValue: (a) => a.status,
    render: (a) => (
      <span
        className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${
          a.status === "active"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        {a.status === "active" ? "Active" : "Suspended"}
      </span>
    ),
  },
  {
    key: "joinedAt",
    label: "Joined",
    sortValue: (a) => a.joinedAt.getTime(),
    render: (a) => <span className="text-xs text-stone-400">{a.joinedAtDisplay}</span>,
  },
  {
    key: "actions",
    label: "",
    sortable: false,
    render: (a) => (
      <Link
        href={`/admin/artists/${a.id}/edit`}
        className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
      >
        Edit
      </Link>
    ),
  },
];

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

export function AdminArtistsTable({ rows }: { rows: AdminArtistListRow[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [banner, setBanner] = useState<{ type: "error" | "info"; text: string } | null>(null);
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

  const onToggleAllVisible = useCallback((visibleRowIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected =
        visibleRowIds.length > 0 && visibleRowIds.every((id) => next.has(id));
      if (allSelected) {
        visibleRowIds.forEach((id) => next.delete(id));
      } else {
        visibleRowIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  function onBulkDelete() {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    pendingConfirmAction.current = () => {
      setBanner(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await deleteArtistsAction(ids);
        if (!result.ok) {
          setBanner({ type: "error", text: result.error });
          return;
        }
        setSelectedIds(new Set());
        router.refresh();
      });
    };
    setConfirm({
      open: true,
      title: "Delete artist accounts",
      message: `Permanently delete ${n} artist account${n === 1 ? "" : "s"}? This removes profiles, collabs they own, and related data. This cannot be undone.`,
      tone: "danger",
      confirmLabel: "Delete",
    });
  }

  function onBulkStatusChange(nextSuspended: boolean) {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    pendingConfirmAction.current = () => {
      setBanner(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await setArtistsStatusBulkAction(ids, nextSuspended);
        if (!result.ok) {
          setBanner({ type: "error", text: result.error });
          return;
        }
        const { updated, skipped } = result;
        if (skipped > 0) {
          setBanner({
            type: "info",
            text: `Updated ${updated}. Skipped ${skipped} (not found${nextSuspended ? ", or cannot suspend your own account" : ""}).`,
          });
        } else {
          setBanner(null);
        }
        setSelectedIds(new Set());
        router.refresh();
      });
    };
    if (nextSuspended) {
      setConfirm({
        open: true,
        title: "Suspend artist accounts",
        message: `Suspend ${n} artist account${n === 1 ? "" : "s"}? A standard bulk note will be stored on each profile. Your own account will be skipped if selected.`,
        tone: "danger",
        confirmLabel: "Suspend",
      });
    } else {
      setConfirm({
        open: true,
        title: "Activate artist accounts",
        message: `Set ${n} artist account${n === 1 ? "" : "s"} to Active (not suspended)?`,
        tone: "default",
        confirmLabel: "Activate",
      });
    }
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
      {banner ? (
        <p
          className={`rounded-lg border px-4 py-2 text-sm ${
            banner.type === "error"
              ? "border-red-200 bg-red-50 text-red-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {banner.text}
        </p>
      ) : null}
      {selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
          <span className="text-sm font-medium text-stone-800">{selectedIds.size} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulkStatusChange(false)}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
            >
              Active
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulkStatusChange(true)}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
            >
              Suspended
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={onBulkDelete}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}
      <SortableTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(a) => a.id}
        emptyMessage="No artists found."
        selection={{
          selectedIds,
          onToggle,
          onToggleAllVisible,
        }}
      />
    </div>
    </>
  );
}
