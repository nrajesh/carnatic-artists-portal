/**
 * WCAG 2.1 relative luminance and contrast helpers for speciality colours.
 */

function linearise(channel8bit: number): number {
  const sRGB = channel8bit / 255;
  return sRGB <= 0.04045 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/** Relative luminance in [0, 1] for a 6-digit #RRGGBB hex string. */
export function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, "");
  if (clean.length !== 6) {
    throw new Error(`Invalid hex colour: "${hex}". Expected 6-digit hex.`);
  }
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG contrast ratio in [1, 21] between two #RRGGBB colours. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}
