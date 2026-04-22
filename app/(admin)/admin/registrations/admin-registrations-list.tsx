"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  deleteRegistrationRequestsAction,
  setRegistrationStatusBulkAction,
  type RegistrationBulkSkipBreakdown,
} from "./actions";

type RegistrationBulkTarget = "pending" | "approved" | "rejected";

function appliedStatusLabel(target: RegistrationBulkTarget): "Pending" | "Approved" | "Rejected" {
  if (target === "pending") return "Pending";
  if (target === "approved") return "Approved";
  return "Rejected";
}

/** Labels only (no per-bucket counts). Uses the status being applied when it matches that skip bucket. */
function describeRegistrationSkipBreakdown(
  b: RegistrationBulkSkipBreakdown,
  target: RegistrationBulkTarget,
): string {
  const applied = appliedStatusLabel(target);
  const parts: string[] = [];

  if (b.notFound) parts.push("Not found");

  function pushBucket(count: number, row: "Pending" | "Approved" | "Rejected") {
    if (count <= 0) return;
    const label =
      (target === "pending" && row === "Pending") ||
      (target === "approved" && row === "Approved") ||
      (target === "rejected" && row === "Rejected")
        ? applied
        : row;
    parts.push(`Already ${label}`);
  }

  pushBucket(b.alreadyPending, "Pending");
  pushBucket(b.alreadyApproved, "Approved");
  pushBucket(b.alreadyRejected, "Rejected");

  return parts.join(", ");
}

function registrationBulkStatusBannerText(
  updated: number,
  skipped: number,
  breakdown: RegistrationBulkSkipBreakdown,
  target: RegistrationBulkTarget,
): string {
  const head = `Updated ${updated}. Skipped ${skipped}`;
  if (skipped === 0) return `${head}.`;

  const { notFound, alreadyPending, alreadyApproved, alreadyRejected } = breakdown;
  if (
    target === "approved" &&
    alreadyApproved > 0 &&
    notFound === 0 &&
    alreadyPending === 0 &&
    alreadyRejected === 0
  ) {
    return `${head}: Some users were already Approved.`;
  }

  const detail = describeRegistrationSkipBreakdown(breakdown, target);
  return `${head}: ${detail}.`;
}

function magicLinkEmailNotSentPhrase(count: number): string {
  if (count <= 0) return "";
  return count === 1
    ? "Sign-in email was not sent for 1 approval (check RESEND_API_KEY and RESEND_FROM_EMAIL)."
    : `Sign-in email was not sent for ${count} approvals (check RESEND_API_KEY and RESEND_FROM_EMAIL).`;
}

export type RegistrationListRow = {
  id: string;
  fullName: string;
  status: string;
  email: string;
  specialityNames: string[];
  submittedLabel: string;
};

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border border-amber-300",
    approved: "bg-green-100 text-green-800 border border-green-300",
    rejected: "bg-red-100 text-red-800 border border-red-300",
  };
  const labels: Record<string, string> = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return (
    <span
      className={`inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${styles[status] ?? "bg-stone-100 text-stone-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

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

export function AdminRegistrationsList({ rows }: { rows: RegistrationListRow[] }) {
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

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  function toggleAll() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const every = allIds.length > 0 && allIds.every((id) => next.has(id));
      if (every) {
        allIds.forEach((id) => next.delete(id));
      } else {
        allIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function onBulkDelete() {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    pendingConfirmAction.current = () => {
      setBanner(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await deleteRegistrationRequestsAction(ids);
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
      title: "Delete registration requests",
      message: `Permanently delete ${n} registration request${n === 1 ? "" : "s"}? This cannot be undone.`,
      tone: "danger",
      confirmLabel: "Delete",
    });
  }

  function onBulkStatusChange(next: "pending" | "approved" | "rejected") {
    if (selectedIds.size === 0) return;
    const n = selectedIds.size;
    const labels: Record<typeof next, string> = {
      pending: "reopened (set to Pending)",
      rejected: "marked as Rejected",
      approved: "approved, and artist accounts will be created",
    };
    const body =
      `${n === 1 ? "This registration" : `${n} registrations`} will be ${labels[next]}. ` +
      (next === "approved"
        ? "Approving sends a magic link to each applicant. Continue?"
        : "Continue?");
    pendingConfirmAction.current = () => {
      setBanner(null);
      const ids = [...selectedIds];
      startTransition(async () => {
        const result = await setRegistrationStatusBulkAction(ids, next);
        if (!result.ok) {
          setBanner({ type: "error", text: result.error });
          return;
        }
        const { updated, skipped, skipBreakdown, magicLinkEmailNotSent } = result;
        const emailMiss = magicLinkEmailNotSent ?? 0;
        if (skipped > 0 || emailMiss > 0) {
          const parts: string[] = [];
          if (skipped > 0) {
            parts.push(registrationBulkStatusBannerText(updated, skipped, skipBreakdown, next));
          } else {
            parts.push(`Updated ${updated}.`);
          }
          if (emailMiss > 0) parts.push(magicLinkEmailNotSentPhrase(emailMiss));
          setBanner({ type: "info", text: parts.join(" ") });
        } else {
          setBanner(null);
        }
        setSelectedIds(new Set());
        router.refresh();
      });
    };
    setConfirm({
      open: true,
      title: "Update registration status",
      message: body,
      tone: "default",
      confirmLabel: "Continue",
    });
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-12 text-center text-stone-400">
        No registration requests match the current filters.
      </div>
    );
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={toggleAll}
          />
          Select all ({rows.length})
        </label>
        {selectedIds.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Set status</span>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulkStatusChange("pending")}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm hover:bg-stone-50 disabled:opacity-50"
            >
              Pending
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulkStatusChange("rejected")}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
            >
              Rejected
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onBulkStatusChange("approved")}
              className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-900 hover:bg-green-100 disabled:opacity-50"
            >
              Approved
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
        ) : null}
      </div>

      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-4">
        {rows.map((reg) => {
          const checked = selectedIds.has(reg.id);
          return (
            <li key={reg.id} className="relative">
              <div
                className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-md border bg-white/95 shadow-sm ${
                  checked ? "border-amber-400 ring-2 ring-amber-200" : "border-stone-200"
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  checked={checked}
                  onChange={() => onToggle(reg.id)}
                  aria-label={`Select ${reg.fullName}`}
                />
              </div>
              <Link
                href={`/admin/registrations/${reg.id}`}
                className="block rounded-xl border border-stone-200 bg-white p-5 pl-14 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h2 className="text-base font-semibold leading-tight text-stone-800">{reg.fullName}</h2>
                  <StatusBadge status={reg.status} />
                </div>
                <p className="mb-3 truncate text-sm text-stone-500">{reg.email}</p>
                <div className="mb-3 flex flex-wrap gap-1">
                  {reg.specialityNames.map((name) => (
                    <span
                      key={name}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                    >
                      {name}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-stone-400">Submitted {reg.submittedLabel}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
    </>
  );
}
