import { cache } from "react";
import { normalizeLocationLabel } from "@/lib/location-display";
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
  source: "geocoded";
  geocodeLabel: string;
};

type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
  city: string | null;
};

function normalizeLocationValue(value: string): string {
  return value.trim();
}

async function geocodeQuery(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: trimmed,
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
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
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
      };
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
      city:
        first.address?.city?.trim() ||
        first.address?.town?.trim() ||
        first.address?.village?.trim() ||
        first.address?.municipality?.trim() ||
        null,
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

export async function buildLocationMapPoints(
  artists: ArtistListing[],
  countryName: string,
  _countryCode?: string,
): Promise<LocationMapPoint[]> {
  const grouped = new Map<string, ArtistListing[]>();
  for (const artist of artists) {
    const normalized = normalizeLocationValue(artist.province);
    if (!normalized) continue;

    const bucket = grouped.get(normalized);
    if (bucket) {
      bucket.push(artist);
    } else {
      grouped.set(normalized, [artist]);
    }
  }

  const points = await Promise.all(
    Array.from(grouped.entries()).map(async ([locationValue, locationArtists]) => {
      const geocoded = await geocodeLocation(locationValue, countryName);
      if (!geocoded) return null;

      const groupedLabel = geocoded.city ? normalizeLocationLabel(geocoded.city) : normalizeLocationLabel(locationValue);

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
        locationValue: groupedLabel,
        label: groupedLabel,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        count: artistsForPoint.length,
        artists: artistsForPoint,
        source: "geocoded",
        geocodeLabel: geocoded.displayName,
      } satisfies LocationMapPoint;
    }),
  );

  const groupedPoints = new Map<string, LocationMapPoint>();
  for (const point of points) {
    if (!point) continue;

    const key = point.locationValue.toLocaleLowerCase();
    const existing = groupedPoints.get(key);
    if (existing) {
      existing.count += point.count;
      existing.artists.push(...point.artists);
      continue;
    }

    groupedPoints.set(key, {
      ...point,
      artists: [...point.artists],
    });
  }

  return Array.from(groupedPoints.values())
    .map((point) => ({
      ...point,
      artists: point.artists.sort((left, right) =>
        left.name.localeCompare(right.name, undefined, { sensitivity: "base" }),
      ),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
