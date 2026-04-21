/**
 * Normalizes user input into a URL segment for `/artists/[slug]`.
 * Matches the rules used when creating artists from registrations.
 */
export function normalizeArtistSlugInput(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
