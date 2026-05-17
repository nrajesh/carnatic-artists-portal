type ArtistIdMigration = {
  oldId: string;
  newId: string;
};

/**
 * One-off bridge for artists whose database IDs were normalized after they had
 * already been used as PostHog distinct IDs.
 *
 * Keep this list intentionally small and remove entries after the PostHog merge
 * script has been run and the rollout/analytics history no longer depends on it.
 */
export const POSTHOG_ARTIST_ID_MIGRATIONS: ArtistIdMigration[] = [
  // Intentionally empty after the one-off merge script has been run.
];

const oldIdByNewId = new Map(
  POSTHOG_ARTIST_ID_MIGRATIONS.map((migration) => [migration.newId, migration.oldId]),
);

export function getLegacyPosthogDistinctId(
  currentArtistId: string | null | undefined,
): string | null {
  if (!currentArtistId) return null;
  return oldIdByNewId.get(currentArtistId) ?? null;
}

/**
 * For feature flags we preserve the pre-migration hash input until the PostHog
 * identities have been merged. This keeps rollouts stable for migrated users.
 */
export function getStablePosthogDistinctId(
  currentArtistId: string | null | undefined,
): string | null {
  if (!currentArtistId) return null;
  return getLegacyPosthogDistinctId(currentArtistId) ?? currentArtistId;
}
