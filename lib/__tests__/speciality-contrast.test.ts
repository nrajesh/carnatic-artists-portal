/**
 * Property 11: Speciality colour contrast invariant
 * Validates: Requirements 5.5
 *
 * For every Speciality in the Portal's colour palette, the contrast ratio
 * between the Speciality's assigned textColor and its primaryColor SHALL be
 * at least 4.5:1 as computed by the WCAG relative luminance formula.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { contrastRatio } from '@/lib/speciality-wcag';

// ---------------------------------------------------------------------------
// Seed data (mirrors prisma/seed.ts - kept as a static array so the test
// has no database dependency and can run in CI without a live DB).
// ---------------------------------------------------------------------------

const SEEDED_SPECIALITIES = [
  { name: 'Vocal',             primaryColor: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Violin',            primaryColor: '#B45309', textColor: '#FFFFFF' },
  { name: 'Mridangam',         primaryColor: '#B91C1C', textColor: '#FFFFFF' },
  { name: 'Veena',             primaryColor: '#047857', textColor: '#FFFFFF' },
  { name: 'Flute',             primaryColor: '#0369A1', textColor: '#FFFFFF' },
  { name: 'Ghatam',            primaryColor: '#92400E', textColor: '#FFFFFF' },
  { name: 'Kanjira',           primaryColor: '#BE185D', textColor: '#FFFFFF' },
  { name: 'Thavil',            primaryColor: '#7E22CE', textColor: '#FFFFFF' },
  { name: 'Nadaswaram',        primaryColor: '#C2410C', textColor: '#FFFFFF' },
  { name: 'Violin (South Indian)', primaryColor: '#A16207', textColor: '#FFFFFF' },
  { name: 'Morsing',           primaryColor: '#065F46', textColor: '#FFFFFF' },
  { name: 'Tavil',             primaryColor: '#1D4ED8', textColor: '#FFFFFF' },
];

// ---------------------------------------------------------------------------
// Arbitrary generators for fast-check
// ---------------------------------------------------------------------------

/** Generates a random 6-digit hex colour string, e.g. "#3A7FCC". */
const hexColorArb = fc
  .integer({ min: 0, max: 0xffffff })
  .map((n) => `#${n.toString(16).padStart(6, '0').toUpperCase()}`);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WCAG contrast ratio calculator', () => {
  it('returns 1 for identical colours (contrast(a, a) === 1)', () => {
    // Property: contrast(a, a) === 1 for any colour a
    fc.assert(
      fc.property(hexColorArb, (hex) => {
        expect(contrastRatio(hex, hex)).toBeCloseTo(1, 10);
      }),
      { numRuns: 200 },
    );
  });

  it('is symmetric: contrast(a, b) === contrast(b, a)', () => {
    // Property: contrast ratio is commutative
    fc.assert(
      fc.property(hexColorArb, hexColorArb, (hexA, hexB) => {
        expect(contrastRatio(hexA, hexB)).toBeCloseTo(contrastRatio(hexB, hexA), 10);
      }),
      { numRuns: 200 },
    );
  });

  it('returns 21 for black vs white (maximum contrast)', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
  });

  it('returns values in the range [1, 21]', () => {
    fc.assert(
      fc.property(hexColorArb, hexColorArb, (hexA, hexB) => {
        const ratio = contrastRatio(hexA, hexB);
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21);
      }),
      { numRuns: 200 },
    );
  });
});

describe('Property 11: Speciality colour contrast invariant - Validates: Requirements 5.5', () => {
  it('every seeded Speciality has a contrast ratio ≥ 4.5:1 between textColor and primaryColor', () => {
    for (const speciality of SEEDED_SPECIALITIES) {
      const ratio = contrastRatio(speciality.textColor, speciality.primaryColor);
      expect(
        ratio,
        `${speciality.name}: contrast ratio ${ratio.toFixed(2)} is below 4.5:1 ` +
          `(textColor=${speciality.textColor}, primaryColor=${speciality.primaryColor})`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
