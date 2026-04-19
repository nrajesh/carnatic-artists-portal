"use client";

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
};

/**
 * Shows a fixed HTTPS / host prefix and edits only the path or handle; stored value is always a full URL or "".
 */
export function RegistrationPrefixedUrlInput(props: Props): JSX.Element {
  const { id, label, helperText, prefix, suffixPlaceholder, suffixFromStored, merge, field, error } = props;
  const stored = field.value ?? "";
  const suffix = suffixFromStored(typeof stored === "string" ? stored : "");

  return (
    <div className="min-w-0 max-w-full">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-amber-900">
        {label}
      </label>
      {helperText ? <div className="mb-2 text-xs text-amber-600">{helperText}</div> : null}
      {/* Stacked on narrow screens so long https:// prefixes never overlap the input (iOS Chrome). */}
      <div className="flex w-full min-w-0 max-w-full flex-col rounded-lg border border-amber-300 bg-white focus-within:ring-2 focus-within:ring-amber-500 sm:flex-row sm:overflow-hidden">
        <span
          className="select-none break-all border-b border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] font-medium leading-snug text-amber-900 sm:max-w-[min(50%,14rem)] sm:border-b-0 sm:border-r sm:py-2 sm:text-xs md:max-w-[45%]"
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
          onChange={(e) => field.onChange(merge(e.target.value))}
          placeholder={suffixPlaceholder}
          className="min-h-[48px] min-w-0 w-full flex-1 border-0 bg-transparent px-2 py-2 text-base text-amber-900 placeholder-amber-400 focus:outline-none focus:ring-0 sm:min-h-[44px]"
        />
      </div>
      {error ? (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
