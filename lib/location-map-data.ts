import { cache } from "react";
import type { ArtistListing } from "@/lib/queries/artists";

export type LocationMapArtist = {
  slug: string;
  name: string;
  province: string;
  profilePhotoUrl?: string;
  specialities: { name: string; color: string }[];
};

export type LocationMapPoint = {
  locationValue: string;
  label: string;
  latitude: number;
  longitude: number;
  count: number;
  artists: LocationMapArtist[];
  source: "geocoded" | "country-fallback";
  geocodeLabel: string;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

function normalizeLocationValue(value: string): string {
  return value.trim();
}

function stableUnitOffset(seed: string, salt: number): number {
  let hash = salt;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }
  return (hash % 2001) / 1000 - 1;
}

async function geocodeQuery(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    limit: "1",
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "artist-discovery-portal/1.0",
      },
      next: { revalidate: 60 * 60 * 24 * 14 },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as Array<{
      lat?: string;
      lon?: string;
      display_name?: string;
    }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return {
      latitude,
      longitude,
      displayName: first.display_name?.trim() || trimmed,
    };
  } catch {
    return null;
  }
}

const geocodeQueryCached = cache(geocodeQuery);

async function geocodeLocation(value: string, countryName: string): Promise<GeocodeResult | null> {
  const direct = await geocodeQueryCached(value);
  if (direct) return direct;

  const withCountry = await geocodeQueryCached(`${value}, ${countryName}`);
  if (withCountry) return withCountry;

  return null;
}

const geocodeCountryCached = cache(async (countryName: string) => geocodeQuery(countryName));

export async function buildLocationMapPoints(
  artists: ArtistListing[],
  countryName: string,
): Promise<LocationMapPoint[]> {
  const grouped = new Map<string, ArtistListing[]>();
  for (const artist of artists) {
    const normalized = normalizeLocationValue(artist.province);
    if (!normalized) continue;

    const key = normalized;
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(artist);
    } else {
      grouped.set(key, [artist]);
    }
  }

  const countryFallback = await geocodeCountryCached(countryName);
  const points = await Promise.all(
    Array.from(grouped.entries()).map(async ([locationValue, locationArtists]) => {
      const geocoded = await geocodeLocation(locationValue, countryName);
      const baseLatitude = geocoded?.latitude ?? countryFallback?.latitude;
      const baseLongitude = geocoded?.longitude ?? countryFallback?.longitude;
      if (!Number.isFinite(baseLatitude) || !Number.isFinite(baseLongitude)) return null;

      let latitude = baseLatitude;
      let longitude = baseLongitude;

      let source: "geocoded" | "country-fallback" = "geocoded";
      if (!geocoded) {
        source = "country-fallback";
        latitude += stableUnitOffset(locationValue, 17) * 0.45;
        longitude += stableUnitOffset(locationValue, 53) * 0.7;
      }

      const artistsForPoint: LocationMapArtist[] = [...locationArtists]
        .sort((left, right) => left.name.localeCompare(right.name, undefined, { sensitivity: "base" }))
        .map((artist) => ({
          slug: artist.slug,
          name: artist.name,
          province: artist.province,
          profilePhotoUrl: artist.profilePhotoUrl ?? undefined,
          specialities: artist.specialities,
        }));

      return {
        locationValue,
        label: locationValue,
        latitude,
        longitude,
        count: artistsForPoint.length,
        artists: artistsForPoint,
        source,
        geocodeLabel: geocoded?.displayName ?? countryFallback?.displayName ?? countryName,
      } satisfies LocationMapPoint;
    }),
  );

  return points
    .filter((point): point is LocationMapPoint => Boolean(point))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
