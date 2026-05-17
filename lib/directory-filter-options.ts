import type { SearchOption } from "@/components/search-typeahead";
import { normalizeLocationLabel } from "@/lib/location-display";
import type { ArtistListing } from "@/lib/queries/artists";

export function buildDirectoryLocationOptions(artists: ArtistListing[]): SearchOption[] {
  return Array.from(
    new Set(artists.map((artist) => normalizeLocationLabel(artist.province)).filter(Boolean)),
  )
    .sort((left, right) => left.localeCompare(right))
    .map((label) => ({ label }));
}

export function buildDirectorySpecialityOptions(
  specialities: { name: string; color: string }[],
): SearchOption[] {
  return specialities
    .map(({ name, color }) => ({ label: name, color }))
    .sort((left, right) => left.label.localeCompare(right.label));
}
