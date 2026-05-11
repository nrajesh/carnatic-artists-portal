import { cache } from "react";
import { getAbsoluteSiteUrl } from "@/lib/absolute-site-url";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";
import { getDeploymentConfig } from "@/deployment.config";
import type { FeatureCollection, GeoJsonProperties } from "geojson";

export type DeploymentLocationConfig = {
  countryCode: string;
  countryName: string;
  deploymentName: string;
  areaLabelSingular: string;
  areaLabelPlural: string;
  areaOptions: string[];
  mapGeoJsonUrl: string | null;
  mapGeoJsonLabelKeys: string[];
  geoLabelAliases: Record<string, string>;
};

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function parseStringArrayEnv(key: string): string[] | null {
  const raw = process.env[key]?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error(`Expected ${key} to be a JSON array of strings.`);
    }
    return dedupeStrings(parsed);
  } catch (error) {
    throw new Error(
      `${key} must be a valid JSON array of strings, e.g. ["North Holland","South Holland"]. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    );
  }
}

function parseStringMapEnv(key: string): Record<string, string> {
  const raw = process.env[key]?.trim();
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error(`Expected ${key} to be a JSON object of string:string pairs.`);
    }

    const entries = Object.entries(parsed);
    for (const [mapKey, mapValue] of entries) {
      if (typeof mapValue !== "string") {
        throw new Error(`Expected ${key}.${mapKey} to be a string.`);
      }
    }

    return Object.fromEntries(
      entries.map(([mapKey, mapValue]) => [mapKey.trim(), mapValue.trim()]),
    );
  } catch (error) {
    throw new Error(
      `${key} must be a valid JSON object, e.g. {"Fryslân":"Friesland"}. ${
        error instanceof Error ? error.message : ""
      }`.trim(),
    );
  }
}

function defaultPluralForLocationLabel(singular: string): string {
  return singular.trim().toLowerCase() === "city" ? "cities" : `${singular}s`;
}

function extractGeoJsonLabel(
  properties: GeoJsonProperties | null | undefined,
  labelKeys: string[],
): string | null {
  if (!properties) return null;

  for (const key of labelKeys) {
    const value = properties[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return null;
}

async function deriveAreaOptionsFromGeoJson(
  href: string,
  labelKeys: string[],
  aliases: Record<string, string>,
): Promise<string[]> {
  try {
    const absoluteUrl = await getAbsoluteSiteUrl(href);
    const response = await fetch(absoluteUrl, { cache: "force-cache" });
    if (!response.ok) return [];

    const data = (await response.json()) as FeatureCollection;
    if (!Array.isArray(data.features)) return [];

    return dedupeStrings(
      data.features
        .map((feature) => extractGeoJsonLabel(feature.properties, labelKeys))
        .filter((value): value is string => Boolean(value))
        .map((value) => aliases[value] ?? value),
    ).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export const getDeploymentLocationConfig = cache(async (): Promise<DeploymentLocationConfig> => {
  const deployment = getDeploymentConfig();
  const display = getDeploymentDisplayConfig();
  const areaLabelSingular = process.env.DEPLOYMENT_LOCATION_LABEL_SINGULAR?.trim() || "city";
  const areaLabelPlural =
    process.env.DEPLOYMENT_LOCATION_LABEL_PLURAL?.trim() ||
    defaultPluralForLocationLabel(areaLabelSingular);
  const mapGeoJsonUrl = deployment.mapGeoJsonUrl?.trim() || null;
  const mapGeoJsonLabelKeys = parseStringArrayEnv("DEPLOYMENT_MAP_GEOJSON_LABEL_KEYS") ?? ["name"];
  const geoLabelAliases = parseStringMapEnv("DEPLOYMENT_LOCATION_ALIASES");

  let areaOptions = parseStringArrayEnv("DEPLOYMENT_LOCATION_OPTIONS") ?? [];
  if (areaOptions.length === 0 && mapGeoJsonUrl && areaLabelSingular.toLowerCase() !== "city") {
    areaOptions = await deriveAreaOptionsFromGeoJson(
      mapGeoJsonUrl,
      mapGeoJsonLabelKeys,
      geoLabelAliases,
    );
  }

  return {
    countryCode: display.countryCode,
    countryName: display.countryName,
    deploymentName: display.name,
    areaLabelSingular,
    areaLabelPlural,
    areaOptions,
    mapGeoJsonUrl,
    mapGeoJsonLabelKeys,
    geoLabelAliases,
  };
});
