import { NextRequest, NextResponse } from "next/server";
import { getDeploymentDisplayConfig } from "@/lib/deployment-display";

type PhotonFeature = {
  properties?: {
    type?: string;
    osm_value?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
  };
};

type PhotonResponse = {
  features?: PhotonFeature[];
};

type Suggestion = {
  label: string;
};

const ALLOWED_OSM_VALUES = new Set(["city", "town", "village", "municipality"]);
const ALLOWED_TYPES = new Set(["city", "district", "locality"]);

function extractLabel(feature: PhotonFeature): string | null {
  const properties = feature.properties;
  if (!properties) return null;

  const placeType = (properties.osm_value ?? properties.type ?? "").toLowerCase();
  if (!ALLOWED_OSM_VALUES.has(placeType) && !ALLOWED_TYPES.has(placeType)) {
    return null;
  }

  const primary = properties.name ?? properties.city ?? null;
  if (!primary?.trim()) return null;

  const pieces = [primary.trim(), properties.state?.trim(), properties.country?.trim()].filter(
    (piece): piece is string => typeof piece === "string" && piece.length > 0,
  );

  return pieces.join(", ");
}

async function querySuggestions(query: string, countryCode?: string): Promise<Suggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: "8",
    lang: "en",
  });

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "artist-discovery-portal/1.0",
    },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!response.ok) return [];

  const data = (await response.json()) as PhotonResponse;
  const features = Array.isArray(data.features) ? data.features : [];
  const normalizedCountryCode = countryCode?.toLowerCase() ?? null;
  const deduped = new Map<string, Suggestion>();

  for (const feature of features) {
    const label = extractLabel(feature);
    if (!label) continue;

    if (
      normalizedCountryCode &&
      feature.properties?.countrycode?.toLowerCase() !== normalizedCountryCode
    ) {
      continue;
    }

    const key = label.toLocaleLowerCase();
    if (!deduped.has(key)) deduped.set(key, { label });
  }

  return Array.from(deduped.values());
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const limit = Math.min(10, Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? "8")));
  const displayConfig = getDeploymentDisplayConfig();

  try {
    const localSuggestions = await querySuggestions(query, displayConfig.countryCode);
    const suggestions =
      localSuggestions.length > 0 ? localSuggestions : await querySuggestions(query);
    return NextResponse.json({ suggestions: suggestions.slice(0, limit) });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
