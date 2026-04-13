/**
 * Property 10: Speciality colour theme correctness
 * Validates: Requirements 4.5, 4.6, 5.2, 5.3, 5.4
 *
 * For any Artist with a single Speciality, the theme applied to their Profile
 * page and profile card SHALL use that Speciality's configured primary colour
 * as the dominant background (solid, no gradient).
 *
 * For any Artist with multiple Specialities, the applied gradient SHALL
 * reference the primary colour of every listed Speciality.
 *
 * The accentColor SHALL always equal the primaryColor of the first matched
 * Speciality.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  SPECIALITY_PALETTE,
  getThemeForSpecialities,
} from '../speciality-theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PALETTE_NAMES = Object.keys(SPECIALITY_PALETTE);

/** fast-check arbitrary: pick one palette name at random */
const singleNameArb = fc.constantFrom(...PALETTE_NAMES);

/** fast-check arbitrary: pick a unique subset of `count` palette names */
function uniqueSubsetArb(count: number) {
  return fc
    .shuffledSubarray(PALETTE_NAMES, { minLength: count, maxLength: count })
    .filter((arr) => arr.length === count);
}

/** fast-check arbitrary: pick 2 or 3 unique palette names */
const multiNameArb = fc
  .shuffledSubarray(PALETTE_NAMES, { minLength: 2, maxLength: 3 })
  .filter((arr) => arr.length >= 2);

// ---------------------------------------------------------------------------
// Example-based tests
// ---------------------------------------------------------------------------

describe('getThemeForSpecialities - example-based', () => {
  it("single known speciality → background equals that speciality's primaryColor (solid)", () => {
    const theme = getThemeForSpecialities(['Vocal']);
    expect(theme.background).toBe(SPECIALITY_PALETTE['Vocal'].primaryColor);
    expect(theme.background).not.toMatch(/gradient/i);
  });

  it('two known specialities → background is a linear-gradient containing both primary colours', () => {
    const theme = getThemeForSpecialities(['Vocal', 'Violin']);
    expect(theme.background).toMatch(/linear-gradient/i);
    expect(theme.background).toContain(SPECIALITY_PALETTE['Vocal'].primaryColor);
    expect(theme.background).toContain(SPECIALITY_PALETTE['Violin'].primaryColor);
  });

  it('unknown speciality → falls back to neutral grey', () => {
    const theme = getThemeForSpecialities(['UnknownInstrument']);
    expect(theme.background).toBe('#6B7280');
    expect(theme.accentColor).toBe('#6B7280');
  });

  it('empty array → falls back to neutral grey', () => {
    const theme = getThemeForSpecialities([]);
    expect(theme.background).toBe('#6B7280');
    expect(theme.accentColor).toBe('#6B7280');
  });

  it('mix of known and unknown → only known specialities contribute', () => {
    const theme = getThemeForSpecialities(['Vocal', 'NotReal']);
    // Only one known match → solid colour, not a gradient
    expect(theme.background).toBe(SPECIALITY_PALETTE['Vocal'].primaryColor);
    expect(theme.background).not.toMatch(/gradient/i);
  });
});

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('Property 10: Speciality colour theme correctness - Validates: Requirements 4.5, 4.6, 5.2, 5.3, 5.4', () => {
  it("single palette name → background equals that speciality's primaryColor (no gradient)", () => {
    fc.assert(
      fc.property(singleNameArb, (name) => {
        const theme = getThemeForSpecialities([name]);
        expect(theme.background).toBe(SPECIALITY_PALETTE[name].primaryColor);
        expect(theme.background).not.toMatch(/gradient/i);
      }),
      { numRuns: 100 },
    );
  });

  it('2–3 palette names → background is a linear-gradient containing every matched primary colour', () => {
    fc.assert(
      fc.property(multiNameArb, (names) => {
        const theme = getThemeForSpecialities(names);
        expect(theme.background).toMatch(/^linear-gradient/i);
        for (const name of names) {
          expect(theme.background).toContain(
            SPECIALITY_PALETTE[name].primaryColor,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('accentColor always equals the primaryColor of the first matched speciality', () => {
    // Generate 1–3 palette names; the first name in the array is the first match
    const subsetArb = fc
      .shuffledSubarray(PALETTE_NAMES, { minLength: 1, maxLength: 3 })
      .filter((arr) => arr.length >= 1);

    fc.assert(
      fc.property(subsetArb, (names) => {
        const theme = getThemeForSpecialities(names);
        const firstMatchedName = names.find(
          (n) => SPECIALITY_PALETTE[n] !== undefined,
        );
        if (firstMatchedName) {
          expect(theme.accentColor).toBe(
            SPECIALITY_PALETTE[firstMatchedName].primaryColor,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('single palette name → accentColor equals background (both are the primaryColor)', () => {
    fc.assert(
      fc.property(singleNameArb, (name) => {
        const theme = getThemeForSpecialities([name]);
        expect(theme.accentColor).toBe(theme.background);
      }),
      { numRuns: 100 },
    );
  });

  it('2–3 palette names → accentColor equals the primaryColor of the first name in the list', () => {
    fc.assert(
      fc.property(uniqueSubsetArb(2), (names) => {
        const theme = getThemeForSpecialities(names);
        expect(theme.accentColor).toBe(
          SPECIALITY_PALETTE[names[0]].primaryColor,
        );
      }),
      { numRuns: 100 },
    );
  });
});
