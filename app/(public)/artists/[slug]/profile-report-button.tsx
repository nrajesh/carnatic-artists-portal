"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

function ReportFlagIcon({
  className = "h-4 w-4",
  tone = "currentColor",
}: {
  className?: string;
  tone?: string;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={tone} strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 21V4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 5h8.5l1.5 2.5L18 10H6" />
    </svg>
  );
}

function ReportActionButton({
  label,
  disabled = false,
  title,
  tone = "danger",
  onClick,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  tone?: "danger" | "muted";
  onClick?: () => void;
}) {
  const classes =
    tone === "danger"
      ? "border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 hover:text-red-800 focus-visible:ring-red-500"
      : "cursor-not-allowed border-stone-200 bg-stone-100 text-stone-400 opacity-90";

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      title={title}
      onClick={onClick}
      className={`inline-flex min-h-[42px] min-w-[140px] items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${classes}`}
    >
      <ReportFlagIcon tone={tone === "danger" ? "currentColor" : "#a8a29e"} />
      {label}
    </button>
  );
}

export function ProfileReportButton({ artistId }: { artistId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function submitReport() {
    setIsSubmitting(true);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form ref={formRef} action={`/api/artists/${artistId}/profile-photo-report`} method="POST">
        <ReportActionButton label="Report" onClick={() => setConfirmOpen(true)} />
      </form>
      <ConfirmDialog
        open={confirmOpen}
        title="Report profile"
        message="Are you sure you want to report this profile to the admin team for review?"
        tone="danger"
        confirmLabel="OK"
        cancelLabel="Cancel"
        confirmFirst
        isPending={isSubmitting}
        onConfirm={submitReport}
        onCancel={() => {
          if (!isSubmitting) setConfirmOpen(false);
        }}
      />
    </>
  );
}

export function DisabledProfileReportButton({
  label = "Report",
  title,
}: {
  label?: string;
  title?: string;
}) {
  return <ReportActionButton label={label} disabled tone="muted" title={title} />;
}
