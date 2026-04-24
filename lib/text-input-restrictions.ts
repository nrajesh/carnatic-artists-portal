/**
 * Client-side character policies: sanitize values and detect disallowed input
 * (e.g. paste) so the UI can show a short contextual notice.
 */

/** More than 15 digits (ITU-T E.164 maximum). */
export function contactNumberTooManyDigits(raw: string): boolean {
  return raw.replace(/\D/g, "").length > 15;
}

/** True if the string contains anything other than optional leading + and digits. */
export function contactNumberHadDisallowedInput(raw: string): boolean {
  if (!raw) return false;
  let seenPlus = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c >= "0" && c <= "9") continue;
    if (c === "+") {
      if (i !== 0 || seenPlus) return true;
      seenPlus = true;
      continue;
    }
    return true;
  }
  return false;
}

const PERSON_NAME_CHAR = /^[\p{L}\p{M}\p{N}\s'.,&_-]$/u;

export function sanitizePersonNameInput(raw: string): string {
  return [...raw].filter((ch) => PERSON_NAME_CHAR.test(ch)).join("");
}

export function personNameHadDisallowedInput(raw: string): boolean {
  return sanitizePersonNameInput(raw) !== raw;
}

/** Typical email characters; strips spaces and angle brackets (often pasted by mistake). */
const EMAIL_CHAR = /^[\p{L}\p{M}\p{N}@._+%-]+$/u;

export function sanitizeEmailFieldInput(raw: string): string {
  return [...raw].filter((ch) => EMAIL_CHAR.test(ch)).join("");
}

export function emailFieldHadDisallowedInput(raw: string): boolean {
  return sanitizeEmailFieldInput(raw) !== raw;
}

/** Blocks whitespace and characters that break URL entry in a path fragment. */
const URL_FRAGMENT_DISALLOWED = /[\s<>"{}|\\^`\u0000-\u001f]/;

export function sanitizeUrlFragmentInput(raw: string): string {
  return raw.replace(URL_FRAGMENT_DISALLOWED, "");
}

export function urlFragmentHadDisallowedInput(raw: string): boolean {
  return URL_FRAGMENT_DISALLOWED.test(raw);
}

/** Live slug typing: lowercase letters, digits, spaces, hyphens (normalized further on save). */
export function sanitizeSlugLiveInput(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9\s-]/g, "");
}

export function slugLiveHadDisallowedInput(raw: string): boolean {
  return /[^a-zA-Z0-9\s-]/.test(raw);
}

export function mergePastedIntoField(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  pasted: string,
): string {
  const a = Math.max(0, Math.min(selectionStart, value.length));
  const b = Math.max(0, Math.min(selectionEnd, value.length));
  return value.slice(0, a) + pasted + value.slice(b);
}
