import type { ReactNode } from "react";

export type FormFieldNoticeTone = "error" | "warning";

const toneClass: Record<FormFieldNoticeTone, string> = {
  error: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
};

type Props = {
  tone: FormFieldNoticeTone;
  children: ReactNode;
  className?: string;
};

/**
 * Standard inline banner for validation and paste/format notices.
 */
export function FormFieldNotice({ tone, children, className = "" }: Props) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border px-3 py-2 text-sm ${toneClass[tone]} ${className}`.trim()}
    >
      {children}
    </p>
  );
}
