import { getTimezonesForCountry } from "countries-and-timezones";

/**
 * Deployment configuration for the Carnatic Artist Portal.
 *
 * All deployment-specific values are read exclusively from environment variables.
 * Timezone is resolved from `DEPLOYMENT_REGION` (ISO 3166-1 alpha-2) via the
 * `countries-and-timezones` dataset, unless `DEPLOYMENT_TIMEZONE` is set.
 *
 * Requirements: 16.1, 16.7
 */

export interface DeploymentConfig {
  /** ISO 3166-1 alpha-2 country code, e.g. "NL" */
  region: string;
  /**
   * IANA timezone for local calendar semantics (featured artist, DailyFeatured date, etc.).
   * Set `DEPLOYMENT_TIMEZONE` to override; otherwise derived from `DEPLOYMENT_REGION`
   * via country→timezone data (single-zone countries only; multi-zone requires an explicit override).
   */
  timezone: string;
  /** Portal display name, e.g. "Carnatic Artist Portal" */
  name: string;
  locales: {
    /** Primary UI language code, e.g. "en" */
    primary: string;
    /** All supported UI language codes, e.g. ["en", "nl"] */
    supported: string[];
  };
  /** Path or URL to the GeoJSON file describing the region's administrative areas */
  mapGeoJsonUrl: string;
  branding: {
    /** URL to the portal logo asset */
    logoUrl: string;
    /** Optional CSS variable overrides for brand colours, keyed by CSS variable name */
    colorOverrides?: Record<string, string>;
  };
}

function resolveTimezoneFromIsoCountry(region: string): string {
  const code = region.trim().toUpperCase();
  if (code.length !== 2) return "UTC";

  const zones = getTimezonesForCountry(code);
  if (!zones || zones.length === 0) return "UTC";
  if (zones.length === 1) return zones[0].name;

  throw new Error(
    `DEPLOYMENT_REGION=${code} maps to multiple IANA timezones (${zones.map((z) => z.name).join(", ")}). ` +
      "Set DEPLOYMENT_TIMEZONE to the zone this deployment should use for calendar dates and wall-clock display.",
  );
}

/**
 * Resolves the deployment IANA timezone without requiring the full config bundle.
 * Used for date calculations when only env is available.
 */
export function getDeploymentTimezone(): string {
  const explicit = process.env.DEPLOYMENT_TIMEZONE?.trim();
  if (explicit) return explicit;

  const region = process.env.DEPLOYMENT_REGION?.trim() ?? "";
  return resolveTimezoneFromIsoCountry(region);
}

/**
 * Short label for UI copy (e.g. “each calendar day (CET)”).
 * Derived from the resolved IANA zone via `Intl` (standard-time abbreviation in January).
 */
export function getDeploymentClockLabelForUi(): string {
  const id = getDeploymentTimezone();
  if (id === "UTC" || id === "Etc/UTC") return "UTC";

  const winter = new Date(Date.UTC(2026, 0, 15, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: id,
    timeZoneName: "short",
  }).formatToParts(winter);
  const shortName = parts.find((p) => p.type === "timeZoneName")?.value?.trim();
  if (shortName) return shortName;

  return id.includes("/") ? id.split("/")[1]!.replace(/_/g, " ") : id;
}

export function getDeploymentConfig(): DeploymentConfig {
  const region = requireEnv("DEPLOYMENT_REGION");
  const timezone = getDeploymentTimezone();
  const name = requireEnv("DEPLOYMENT_NAME");
  const localePrimary = requireEnv("DEPLOYMENT_LOCALE_PRIMARY");
  const localeSecondary = process.env.DEPLOYMENT_LOCALE_SECONDARY;
  const mapGeoJsonUrl = requireEnv("DEPLOYMENT_MAP_GEOJSON_URL");
  const brandingLogoUrl = requireEnv("DEPLOYMENT_BRANDING_LOGO_URL");

  // Build the supported locales list: always includes primary; adds secondary if set
  const supported: string[] = [localePrimary];
  if (localeSecondary && !supported.includes(localeSecondary)) {
    supported.push(localeSecondary);
  }

  // Optional colour overrides: DEPLOYMENT_COLOR_OVERRIDES is a JSON string
  let colorOverrides: Record<string, string> | undefined;
  const colorOverridesRaw = process.env.DEPLOYMENT_COLOR_OVERRIDES;
  if (colorOverridesRaw) {
    try {
      colorOverrides = JSON.parse(colorOverridesRaw) as Record<string, string>;
    } catch {
      throw new Error(
        "DEPLOYMENT_COLOR_OVERRIDES must be a valid JSON object string, e.g. " +
          '\'{"--color-primary":"#E85D04"}\'',
      );
    }
  }

  return {
    region,
    timezone,
    name,
    locales: {
      primary: localePrimary,
      supported,
    },
    mapGeoJsonUrl,
    branding: {
      logoUrl: brandingLogoUrl,
      colorOverrides,
    },
  };
}

/** Reads a required environment variable; throws a descriptive error if absent. */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        "Please ensure all variables listed in env.example are set.",
    );
  }
  return value;
}
