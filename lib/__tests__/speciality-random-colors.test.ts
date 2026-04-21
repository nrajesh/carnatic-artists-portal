import { describe, it, expect } from "vitest";
import { contrastRatio } from "@/lib/speciality-wcag";
import {
  pickRandomUniqueSpecialityColorPair,
  specialityColorPairKey,
} from "@/lib/speciality-random-colors";

describe("specialityColorPairKey", () => {
  it("normalises case for comparison", () => {
    expect(specialityColorPairKey("#aabbcc", "#ffffff")).toBe("#AABBCC|#FFFFFF");
  });
});

describe("pickRandomUniqueSpecialityColorPair", () => {
  it("returns a pair with WCAG AA contrast and not in the forbidden set", () => {
    const forbidden = new Set<string>([specialityColorPairKey("#FF0000", "#FFFFFF")]);
    for (let i = 0; i < 30; i++) {
      const pair = pickRandomUniqueSpecialityColorPair(forbidden);
      expect(pair).not.toBeNull();
      if (!pair) continue;
      expect(contrastRatio(pair.textColor, pair.primaryColor)).toBeGreaterThanOrEqual(4.5);
      expect(forbidden.has(specialityColorPairKey(pair.primaryColor, pair.textColor))).toBe(false);
    }
  });

  it("respects a large forbidden set (seeded palette pairs)", () => {
    const seeded = [
      { primaryColor: "#7C3AED", textColor: "#FFFFFF" },
      { primaryColor: "#B45309", textColor: "#FFFFFF" },
      { primaryColor: "#92400E", textColor: "#FFFFFF" },
    ];
    const forbidden = new Set(seeded.map((p) => specialityColorPairKey(p.primaryColor, p.textColor)));
    const pair = pickRandomUniqueSpecialityColorPair(forbidden);
    expect(pair).not.toBeNull();
    expect(forbidden.has(specialityColorPairKey(pair!.primaryColor, pair!.textColor))).toBe(false);
  });
});
