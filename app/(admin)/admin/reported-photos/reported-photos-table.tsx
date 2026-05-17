"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import SortableTable, { type Column } from "@/components/sortable-table";
import type { AdminProfilePhotoReportRow } from "@/lib/queries/admin-profile-photo-reports";
import {
  clearReportedProfilePhotosAction,
  resolveProfilePhotoReportsAction,
  suspendReportedArtistsAction,
} from "./actions";

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

export function ReportedPhotosTable({
  rows,
  sortingEnabled,
}: {
  rows: AdminProfilePhotoReportRow[];
  sortingEnabled: boolean;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [banner, setBanner] = useState<{ type: "error" | "info" | "success"; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmPanel>(closedConfirm);
  const pendingConfirmAction = useRef<(() => void) | null>(null);

  const columns = useMemo(
    (): Column<AdminProfilePhotoReportRow>[] => [
      {
        key: "artist",
        label: "Artist",
        sortValue: (row) => row.artistName,
        render: (row) => (
          <div className="flex items-center gap-3">
            <Image
              src={row.profilePhotoUrl}
              alt={`${row.artistName} profile`}
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl border border-stone-200 object-cover shadow-sm"
            />
            <div className="min-w-0">
              <Link
                href={`/admin/artists/${row.artistId}/edit`}
                className="font-semibold text-stone-800 underline-offset-2 hover:text-amber-800 hover:underline"
              >
                {row.artistName}
              </Link>
              <div className="truncate text-xs text-stone-500">{row.province}</div>
            </div>
          </div>
        ),
      },
      {
        key: "openReportCount",
        label: "Open Reports",
        sortValue: (row) => row.openReportCount,
        render: (row) => (
          <span className="text-sm font-semibold text-stone-800">{row.openReportCount}</span>
        ),
      },
      {
        key: "totalReportCount",
        label: "Total Reports",
        sortValue: (row) => row.totalReportCount,
        render: (row) => <span className="text-sm text-stone-700">{row.totalReportCount}</span>,
      },
      {
        key: "reporters",
        label: "Recent Reporters",
        sortable: false,
        render: (row) => (
          <div className="text-sm text-stone-600 sm:text-xs">
            {row.reporterNames.length > 0 ? row.reporterNames.join(", ") : "Unknown reporter"}
          </div>
        ),
      },
      {
        key: "latestReportedAt",
        label: "Latest Report",
        sortValue: (row) => row.latestReportedAt.getTime(),
        render: (row) => (
          <span className="text-sm text-stone-500 sm:text-xs">{row.latestReportedAtDisplay}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortValue: (row) => (row.isSuspended ? "suspended" : "active"),
        render: (row) =>
          row.isSuspended ? (
            <span className="inline-block rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              Suspended
            </span>
          ) : (
            <span className="inline-block rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
              Active
            </span>
          ),
      },
    ],
    [],
  );

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
      const allSelected = visibleRowIds.length > 0 && visibleRowIds.every((id) => next.has(id));
      if (allSelected) {
        visibleRowIds.forEach((id) => next.delete(id));
      } else {
        visibleRowIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  function runBulkAction(
    action: (
      ids: string[],
    ) => Promise<{ ok: true; updated: number; skipped: number } | { ok: false; error: string }>,
    confirmPanel: ConfirmPanel,
    successText: (updated: number, skipped: number) => string,
  ) {
    if (selectedIds.size === 0) return;
    pendingConfirmAction.current = () => {
      setBanner(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await action(ids);
        if (!result.ok) {
          setBanner({ type: "error", text: result.error });
          return;
        }
        setBanner({
          type: result.skipped > 0 ? "info" : "success",
          text: successText(result.updated, result.skipped),
        });
        setSelectedIds(new Set());
        router.refresh();
      });
    };
    setConfirm(confirmPanel);
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
                : banner.type === "success"
                  ? "border-green-200 bg-green-50 text-green-950"
                  : "border-amber-200 bg-amber-50 text-amber-950"
            }`}
          >
            {banner.text}
          </p>
        ) : null}

        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
            <div>
              <div className="text-sm font-medium text-stone-800">{selectedIds.size} selected</div>
              <div className="text-xs text-stone-500">
                Clear photos, resolve reports, or suspend repeat offenders in one pass.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runBulkAction(
                    resolveProfilePhotoReportsAction,
                    {
                      open: true,
                      title: "Resolve profile reports",
                      message: `Mark reports for ${selectedIds.size} artist account${selectedIds.size === 1 ? "" : "s"} as reviewed without removing the current photo?`,
                      tone: "default",
                      confirmLabel: "Resolve",
                    },
                    (updated, skipped) =>
                      `Resolved ${updated} open report${updated === 1 ? "" : "s"}${skipped > 0 ? `, skipped ${skipped}.` : "."}`,
                  )
                }
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-50"
              >
                Resolve only
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runBulkAction(
                    clearReportedProfilePhotosAction,
                    {
                      open: true,
                      title: "Clear reported profile images",
                      message: `Remove the current photo for ${selectedIds.size} artist account${selectedIds.size === 1 ? "" : "s"} and resolve the related reports?`,
                      tone: "danger",
                      confirmLabel: "Clear photos",
                    },
                    (updated, skipped) =>
                      `Cleared ${updated} profile image${updated === 1 ? "" : "s"}${skipped > 0 ? `, skipped ${skipped}.` : "."}`,
                  )
                }
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
              >
                Clear photos
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runBulkAction(
                    suspendReportedArtistsAction,
                    {
                      open: true,
                      title: "Suspend repeat offenders",
                      message: `Suspend ${selectedIds.size} selected artist account${selectedIds.size === 1 ? "" : "s"}, remove the current photo, and resolve their open reports? Your own account will be skipped if selected.`,
                      tone: "danger",
                      confirmLabel: "Suspend artists",
                    },
                    (updated, skipped) =>
                      `Suspended ${updated} artist account${updated === 1 ? "" : "s"}${skipped > 0 ? `, skipped ${skipped}.` : "."}`,
                  )
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
              >
                Suspend + clear
              </button>
            </div>
          </div>
        ) : null}

        {sortingEnabled ? (
          <p className="text-xs text-stone-500">
            Sorting is enabled for this queue, so you can prioritize latest reports or repeat
            offenders.
          </p>
        ) : (
          <p className="text-xs text-stone-500">
            This queue is currently locked to newest reports first. Enable the report-sorting
            feature flag to prioritize repeat offenders by count.
          </p>
        )}

        <SortableTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.artistId}
          emptyMessage="No open reported profiles."
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
