/**
 * Deployment configuration for the Carnatic Artist Portal.
 *
 * All deployment-specific values are read exclusively from environment variables.
 * No values are hard-coded in this file.
 *
 * Requirements: 16.1, 16.7
 */

export interface DeploymentConfig {
  /** Country or region identifier, e.g. "NL" */
  region: string;
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

/**
 * Reads all deployment-specific configuration from environment variables.
 * Throws if any required variable is missing.
 */
export function getDeploymentConfig(): DeploymentConfig {
  const region = requireEnv("DEPLOYMENT_REGION");
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
        "Please ensure all variables listed in .env.example are set.",
    );
  }
  return value;
}
