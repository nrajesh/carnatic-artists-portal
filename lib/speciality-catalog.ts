/** Default colours when a speciality is auto-created during registration approval. */
export const DEFAULT_SPECIALITY_PRIMARY = "#92400E";
export const DEFAULT_SPECIALITY_TEXT = "#FFFFFF";

/** Normalise user-entered speciality label for storage and comparison. */
export function normalizeSpecialityLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Dedupe (case-insensitive), trim, keep up to 3 labels for registration payloads. */
export function normalizeSpecialityList(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const n = normalizeSpecialityLabel(item);
    if (n.length < 2) continue;
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
    if (out.length >= 3) break;
  }
  return out;
}
