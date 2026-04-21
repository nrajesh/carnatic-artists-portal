import { specialityColorPairKey } from "@/lib/speciality-random-colors";
import { SPECIALITY_PALETTE } from "@/lib/speciality-theme";

export type SpecialityColourRow = {
  id: string;
  name: string;
  primaryColor: string;
  textColor: string;
};

/**
 * When several rows share the same (primary, text) pair, pick one keeper and
 * reassign the rest. Seed palette entries win for their canonical colours;
 * otherwise the alphabetically first name keeps the pair.
 */
export function chooseKeeperForDuplicateColourGroup(
  group: SpecialityColourRow[],
): { keeper: SpecialityColourRow; others: SpecialityColourRow[] } {
  if (group.length < 2) {
    throw new Error("chooseKeeperForDuplicateColourGroup expects at least 2 rows");
  }
  const key = specialityColorPairKey(group[0].primaryColor, group[0].textColor);
  for (const r of group) {
    const canonical = SPECIALITY_PALETTE[r.name];
    if (
      canonical &&
      specialityColorPairKey(canonical.primaryColor, canonical.textColor) === key
    ) {
      return { keeper: r, others: group.filter((x) => x.id !== r.id) };
    }
  }
  const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name));
  return { keeper: sorted[0]!, others: sorted.slice(1) };
}
