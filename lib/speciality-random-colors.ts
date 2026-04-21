import { contrastRatio } from "@/lib/speciality-wcag";

const MIN_CONTRAST = 4.5;
const TEXT_OPTIONS = ["#FFFFFF", "#000000"] as const;

/** Canonical key for comparing (primary, text) pairs (case-insensitive hex). */
export function specialityColorPairKey(primaryColor: string, textColor: string): string {
  return `${primaryColor.trim().toUpperCase()}|${textColor.trim().toUpperCase()}`;
}

function randomByte(): number {
  return Math.floor(Math.random() * 256);
}

function toHex6(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function contrastingTextCandidates(primary: string): string[] {
  const ok = TEXT_OPTIONS.filter((t) => contrastRatio(t, primary) >= MIN_CONTRAST);
  // Shuffle so we don't always prefer white when both qualify
  for (let i = ok.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ok[i], ok[j]] = [ok[j]!, ok[i]!];
  }
  return [...ok];
}

/**
 * Picks a random (primaryColor, textColor) pair with WCAG AA contrast on the primary,
 * such that the pair is not in `forbiddenPairKeys` (use {@link specialityColorPairKey}).
 */
export function pickRandomUniqueSpecialityColorPair(
  forbiddenPairKeys: ReadonlySet<string>,
  maxAttempts = 400,
): { primaryColor: string; textColor: string } | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const primaryColor = toHex6(randomByte(), randomByte(), randomByte());
    const texts = contrastingTextCandidates(primaryColor);
    for (const textColor of texts) {
      const key = specialityColorPairKey(primaryColor, textColor);
      if (!forbiddenPairKeys.has(key)) {
        return { primaryColor, textColor };
      }
    }
  }
  return null;
}
