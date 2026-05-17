import { analyticsServer } from "@/lib/analytics-server";
import { getStablePosthogDistinctId } from "@/lib/posthog-distinct-ids";
import {
  POSTHOG_FLAG_ADMIN_PROFILE_PHOTO_REPORT_SORTING,
  POSTHOG_FLAG_ARTIST_CONNECTIONS,
  POSTHOG_FLAG_ARTIST_COLLABS_RATINGS,
} from "@/lib/feature-flag-keys";

const ANON_DISTINCT = "anonymous";

function isEnabledVariantValue(value: string | boolean | null): boolean {
  if (value === true || value === "true") return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return normalized !== "false" && normalized !== "0" && normalized !== "off";
  }
  return false;
}

function parseEnvOverride(): boolean | null {
  const raw =
    process.env.POSTHOG_FLAG_ARTIST_COLLABS_RATINGS?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_POSTHOG_FLAG_ARTIST_COLLABS_RATINGS?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return null;
}

function parseConnectionsEnvOverride(): boolean | null {
  const raw =
    process.env.POSTHOG_FLAG_ARTIST_CONNECTIONS?.trim().toLowerCase() ??
    process.env.NEXT_PUBLIC_POSTHOG_FLAG_ARTIST_CONNECTIONS?.trim().toLowerCase();
  if (!raw) return null;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  if (raw === "false" || raw === "0" || raw === "no") return false;
  return null;
}

function parseBooleanOverride(raw: string | undefined): boolean | null {
  const normalized = raw?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  return null;
}

/**
 * Whether collaborations + star ratings/reviews are enabled for this deployment/user.
 * When PostHog is not configured, defaults to false (discovery-only v1).
 *
 * @param distinctId - Logged-in flows should pass the artist id; public/marketing pages can omit (anonymous).
 */
export async function isArtistCollabsRatingsEnabledServer(
  options: {
    distinctId?: string;
  } = {},
): Promise<boolean> {
  const override = parseEnvOverride();
  if (override !== null) return override;

  if (!analyticsServer) return false;

  const distinctId = getStablePosthogDistinctId(options.distinctId) ?? ANON_DISTINCT;
  try {
    const result = await analyticsServer.isFeatureEnabled(
      POSTHOG_FLAG_ARTIST_COLLABS_RATINGS,
      distinctId,
    );
    return result === true;
  } catch {
    return false;
  }
}

export async function assertArtistCollabsRatingsEnabled(distinctId: string): Promise<void> {
  const ok = await isArtistCollabsRatingsEnabledServer({ distinctId });
  if (!ok) {
    throw new Error("Collaborations and ratings are not available.");
  }
}

export async function isAdminProfilePhotoReportSortingEnabledServer(
  options: {
    distinctId?: string;
  } = {},
): Promise<boolean> {
  const override =
    parseBooleanOverride(process.env.POSTHOG_FLAG_ADMIN_PROFILE_PHOTO_REPORT_SORTING) ??
    parseBooleanOverride(process.env.NEXT_PUBLIC_POSTHOG_FLAG_ADMIN_PROFILE_PHOTO_REPORT_SORTING);
  if (override !== null) return override;

  if (!analyticsServer) return false;

  const distinctId = getStablePosthogDistinctId(options.distinctId) ?? ANON_DISTINCT;
  try {
    const result = await analyticsServer.isFeatureEnabled(
      POSTHOG_FLAG_ADMIN_PROFILE_PHOTO_REPORT_SORTING,
      distinctId,
    );
    return result === true;
  } catch {
    return false;
  }
}

export async function isArtistConnectionsEnabledServer(
  options: {
    distinctId?: string;
  } = {},
): Promise<boolean> {
  const override = parseConnectionsEnvOverride();
  if (override !== null) return override;

  if (!analyticsServer) return false;

  const distinctId = getStablePosthogDistinctId(options.distinctId) ?? ANON_DISTINCT;
  try {
    const result = await analyticsServer.getFeatureFlagValue(
      POSTHOG_FLAG_ARTIST_CONNECTIONS,
      distinctId,
    );
    return isEnabledVariantValue(result);
  } catch {
    return false;
  }
}

export async function assertArtistConnectionsEnabled(distinctId: string): Promise<void> {
  const ok = await isArtistConnectionsEnabledServer({ distinctId });
  if (!ok) {
    throw new Error("Artist connections are not available.");
  }
}
