"use client";

import { FormFieldNotice } from "@/components/form-field-notice";
import { useTimedFieldNotice } from "@/hooks/use-timed-field-notice";
import { urlSuffixRestrictedHandlers, type FormatNoteFn } from "@/lib/restricted-input-handlers";

type ControllerField = {
  value: string | undefined;
  onChange: (v: string) => void;
  onBlur: () => void;
};

type Props = {
  id: string;
  label: string;
  helperText?: React.ReactNode;
  prefix: string;
  suffixPlaceholder: string;
  suffixFromStored: (stored: string) => string;
  merge: (suffixInput: string) => string;
  field: ControllerField;
  error?: string;
  /** When set, paste/format notices go to the parent (e.g. one banner for the whole form). */
  onFormatNote?: FormatNoteFn;
};

/**
 * Shows a fixed HTTPS / host prefix and edits only the path or handle; stored value is always a full URL or "".
 */
export function RegistrationPrefixedUrlInput(props: Props): JSX.Element {
  const { id, label, helperText, prefix, suffixPlaceholder, suffixFromStored, merge, field, error, onFormatNote } =
    props;
  const stored = field.value ?? "";
  const suffix = suffixFromStored(typeof stored === "string" ? stored : "");
  const localNotice = useTimedFieldNotice();
  const showFormatNote = onFormatNote ?? localNotice.show;
  const formatMessage = onFormatNote ? null : localNotice.message;
  const urlGuards = urlSuffixRestrictedHandlers(merge, showFormatNote, field.onChange);

  return (
    <div className="min-w-0 max-w-full">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-amber-900">
        {label}
      </label>
      {helperText ? <div className="mb-2 text-xs text-amber-600">{helperText}</div> : null}
      {/* Stacked on narrow screens so long https:// prefixes never overlap the input (iOS Chrome). */}
      <div className="flex w-full min-w-0 max-w-full flex-col rounded-lg border border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500 sm:flex-row sm:items-stretch sm:overflow-hidden">
        <span
          className="flex min-h-[48px] shrink-0 select-none items-center break-all border-b border-amber-200 bg-amber-50 px-3 text-sm font-medium leading-normal text-amber-900 sm:max-w-[min(50%,14rem)] sm:min-h-0 sm:border-b-0 sm:border-r md:max-w-[45%]"
          title={prefix}
        >
          {prefix}
        </span>
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={suffix}
          onBlur={field.onBlur}
          {...urlGuards}
          placeholder={suffixPlaceholder}
          className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-3 py-2 text-sm leading-normal text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-0 sm:min-h-[44px] sm:py-2.5"
        />
      </div>
      {formatMessage ? (
        <FormFieldNotice tone="warning" className="mt-2">
          {formatMessage}
        </FormFieldNotice>
      ) : null}
      {error ? (
        <FormFieldNotice tone="error" className="mt-1">
          {error}
        </FormFieldNotice>
      ) : null}
    </div>
  );
}
