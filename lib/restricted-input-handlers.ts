import type { ChangeEvent, ClipboardEvent, FormEvent, InputHTMLAttributes } from "react";
import { sanitizeContactNumberInput } from "@/lib/registration-input-normalize";
import {
  contactNumberHadDisallowedInput,
  contactNumberTooManyDigits,
  emailFieldHadDisallowedInput,
  mergePastedIntoField,
  personNameHadDisallowedInput,
  sanitizeEmailFieldInput,
  sanitizePersonNameInput,
  sanitizeSlugLiveInput,
  sanitizeUrlFragmentInput,
  slugLiveHadDisallowedInput,
  urlFragmentHadDisallowedInput,
} from "@/lib/text-input-restrictions";

export type FormatNoteFn = (message: string) => void;

/** React may not always expose a full InputEvent; `inputType` is missing in some browsers/paths. */
function asBeforeInputEvent(e: FormEvent<HTMLInputElement>): InputEvent | null {
  const n = e.nativeEvent;
  if (!n || typeof (n as InputEvent).inputType !== "string") return null;
  return n as InputEvent;
}

function readBeforeInputInsert(
  e: FormEvent<HTMLInputElement>,
  onDisallowed: () => void,
  isProposedDisallowed: (proposed: string) => boolean,
): void {
  const ne = asBeforeInputEvent(e);
  if (!ne) return;
  if (ne.isComposing) return;
  const inputType = ne.inputType;
  if (inputType.startsWith("delete")) return;
  if (inputType === "insertFromPaste" || inputType === "insertFromDrop") return;
  const data = ne.data;
  if (data == null || data === "") return;
  const el = e.currentTarget;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const proposed = mergePastedIntoField(el.value, start, end, data);
  if (isProposedDisallowed(proposed)) {
    e.preventDefault();
    onDisallowed();
  }
}

function handlePasteReplace(
  e: ClipboardEvent<HTMLInputElement>,
  onCommit: (nextRaw: string) => void,
  onHadDisallowed: () => void,
  hadDisallowed: (raw: string) => boolean,
): void {
  e.preventDefault();
  const el = e.currentTarget;
  const text = e.clipboardData.getData("text/plain");
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const merged = mergePastedIntoField(el.value, start, end, text);
  if (hadDisallowed(merged)) onHadDisallowed();
  onCommit(merged);
}

export function contactNumberRestrictedHandlers(onFormatNote: FormatNoteFn, onValue: (v: string) => void) {
  return {
    onBeforeInput(e: FormEvent<HTMLInputElement>) {
      const ne = asBeforeInputEvent(e);
      if (!ne) return;
      if (ne.isComposing) return;
      const inputType = ne.inputType;
      if (inputType.startsWith("delete")) return;
      if (inputType === "insertFromPaste" || inputType === "insertFromDrop") return;
      const data = ne.data;
      if (data == null || data === "") return;
      const el = e.currentTarget;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? 0;
      const proposed = mergePastedIntoField(el.value, start, end, data);
      if (contactNumberHadDisallowedInput(proposed) || contactNumberTooManyDigits(proposed)) {
        e.preventDefault();
        onFormatNote(
          contactNumberTooManyDigits(proposed)
            ? "At most 15 digits."
            : "Use digits only. Optional + at the start.",
        );
      }
    },
    onPaste(e: ClipboardEvent<HTMLInputElement>) {
      handlePasteReplace(
        e,
        (merged) => onValue(sanitizeContactNumberInput(merged)),
        () => onFormatNote("Some characters were removed from the phone number."),
        (merged) => contactNumberHadDisallowedInput(merged),
      );
    },
    onChange(e: ChangeEvent<HTMLInputElement>) {
      onValue(sanitizeContactNumberInput(e.target.value));
    },
  } satisfies Pick<InputHTMLAttributes<HTMLInputElement>, "onBeforeInput" | "onPaste" | "onChange">;
}

export function personNameRestrictedHandlers(onFormatNote: FormatNoteFn, onValue: (v: string) => void) {
  return {
    onBeforeInput(e: FormEvent<HTMLInputElement>) {
      readBeforeInputInsert(
        e,
        () => onFormatNote("That character is not allowed in a name."),
        (proposed) => personNameHadDisallowedInput(proposed),
      );
    },
    onPaste(e: ClipboardEvent<HTMLInputElement>) {
      handlePasteReplace(
        e,
        (merged) => onValue(sanitizePersonNameInput(merged)),
        () => onFormatNote("Some characters were removed from the name."),
        (merged) => personNameHadDisallowedInput(merged),
      );
    },
    onChange(e: ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      const c = sanitizePersonNameInput(raw);
      onValue(c);
    },
  } satisfies Pick<InputHTMLAttributes<HTMLInputElement>, "onBeforeInput" | "onPaste" | "onChange">;
}

export function emailFieldRestrictedHandlers(onFormatNote: FormatNoteFn, onValue: (v: string) => void) {
  return {
    onBeforeInput(e: FormEvent<HTMLInputElement>) {
      readBeforeInputInsert(
        e,
        () => onFormatNote("That character is not allowed in an email address."),
        (proposed) => emailFieldHadDisallowedInput(proposed),
      );
    },
    onPaste(e: ClipboardEvent<HTMLInputElement>) {
      handlePasteReplace(
        e,
        (merged) => onValue(sanitizeEmailFieldInput(merged)),
        () => onFormatNote("Some characters were removed from the email."),
        (merged) => emailFieldHadDisallowedInput(merged),
      );
    },
    onChange(e: ChangeEvent<HTMLInputElement>) {
      onValue(sanitizeEmailFieldInput(e.target.value));
    },
  } satisfies Pick<InputHTMLAttributes<HTMLInputElement>, "onBeforeInput" | "onPaste" | "onChange">;
}

export function slugLiveRestrictedHandlers(onFormatNote: FormatNoteFn, onValue: (v: string) => void) {
  return {
    onBeforeInput(e: FormEvent<HTMLInputElement>) {
      readBeforeInputInsert(
        e,
        () => onFormatNote("Use only letters, numbers, spaces, and hyphens in the URL."),
        (proposed) => slugLiveHadDisallowedInput(proposed),
      );
    },
    onPaste(e: ClipboardEvent<HTMLInputElement>) {
      handlePasteReplace(
        e,
        (merged) => onValue(sanitizeSlugLiveInput(merged)),
        () => onFormatNote("Some characters were removed from the URL segment."),
        (merged) => slugLiveHadDisallowedInput(merged),
      );
    },
    onChange(e: ChangeEvent<HTMLInputElement>) {
      onValue(sanitizeSlugLiveInput(e.target.value));
    },
  } satisfies Pick<InputHTMLAttributes<HTMLInputElement>, "onBeforeInput" | "onPaste" | "onChange">;
}

export function urlSuffixRestrictedHandlers(
  merge: (suffix: string) => string,
  onFormatNote: FormatNoteFn,
  onStoredValue: (full: string) => void,
) {
  return {
    onBeforeInput(e: FormEvent<HTMLInputElement>) {
      readBeforeInputInsert(
        e,
        () => onFormatNote("Spaces and some symbols are not allowed in this URL field."),
        (proposed) => urlFragmentHadDisallowedInput(proposed),
      );
    },
    onPaste(e: ClipboardEvent<HTMLInputElement>) {
      handlePasteReplace(
        e,
        (merged) => onStoredValue(merge(sanitizeUrlFragmentInput(merged))),
        () => onFormatNote("Some characters were removed from the URL."),
        (merged) => urlFragmentHadDisallowedInput(merged),
      );
    },
    onChange(e: ChangeEvent<HTMLInputElement>) {
      const raw = e.target.value;
      onStoredValue(merge(sanitizeUrlFragmentInput(raw)));
    },
  } satisfies Pick<InputHTMLAttributes<HTMLInputElement>, "onBeforeInput" | "onPaste" | "onChange">;
}
