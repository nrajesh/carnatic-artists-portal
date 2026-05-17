"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { LatLngExpression, LatLngTuple, LayerGroup, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { LocationMapPoint } from "@/lib/location-map-data";
import SearchTypeahead, { type SearchOption } from "@/components/search-typeahead";

type ArtistsLocationExplorerProps = {
  locationPoints: LocationMapPoint[];
  areaLabelSingular: string;
  areaLabelPlural: string;
  enableSpecialityFilter?: boolean;
  cityOptions?: SearchOption[];
  specialityOptions?: SearchOption[];
};

type Cluster = {
  key: string;
  count: number;
  points: LocationMapPoint[];
  center: LatLngTuple;
};

function markerDiameter(count: number): number {
  return Math.min(58, Math.max(34, 28 + Math.sqrt(Math.max(1, count)) * 7));
}

function clusterGridSize(zoom: number): number {
  if (zoom >= 12) return 28;
  if (zoom >= 10) return 36;
  if (zoom >= 8) return 48;
  if (zoom >= 6) return 72;
  return 96;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clusterPoints(points: LocationMapPoint[], map: LeafletMap): Cluster[] {
  const zoom = map.getZoom();
  const grid = clusterGridSize(zoom);
  const grouped = new Map<string, Cluster & { weightedLat: number; weightedLng: number }>();

  for (const point of points) {
    const pixel = map.project([point.latitude, point.longitude], zoom);
    const key = `${Math.floor(pixel.x / grid)}:${Math.floor(pixel.y / grid)}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.count += point.count;
      existing.points.push(point);
      existing.weightedLat += point.latitude * point.count;
      existing.weightedLng += point.longitude * point.count;
      existing.center = [existing.weightedLat / existing.count, existing.weightedLng / existing.count];
      continue;
    }

    grouped.set(key, {
      key,
      count: point.count,
      points: [point],
      weightedLat: point.latitude * point.count,
      weightedLng: point.longitude * point.count,
      center: [point.latitude, point.longitude],
    });
  }

  return Array.from(grouped.values())
    .map(({ weightedLat, weightedLng, ...cluster }) => ({
      ...cluster,
      center: [weightedLat / cluster.count, weightedLng / cluster.count] as LatLngTuple,
      points: [...cluster.points].sort((left, right) => right.count - left.count || left.label.localeCompare(right.label)),
    }))
    .sort((left, right) => right.count - left.count);
}

function markerHtml(count: number): string {
  const size = markerDiameter(count);
  return `
    <div
      style="
        width:${size}px;
        height:${size}px;
        border-radius:999px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:linear-gradient(180deg,#f59e0b 0%,#d97706 100%);
        border:4px solid rgba(255,248,235,0.96);
        box-shadow:0 12px 24px rgba(180,83,9,0.28),0 2px 6px rgba(120,53,15,0.18);
        color:#fff;
        font-weight:700;
        font-size:${Math.max(12, Math.min(18, size * 0.34))}px;
        line-height:1;
      "
    >
      ${count}
    </div>
  `;
}

function popupHtml(
  cluster: Cluster,
  singularLower: string,
  pluralLower: string,
  selectedCity: string,
  selectedSpeciality: string,
): string {
  if (cluster.points.length > 1) {
    const names = cluster.points.slice(0, 4).map((point) => escapeHtml(point.label)).join(", ");
    return `
      <div style="min-width:220px">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;margin-bottom:6px">
          Nearby ${escapeHtml(pluralLower)}
        </div>
        <div style="font-size:16px;font-weight:700;color:#1c1917;margin-bottom:4px">
          ${cluster.count} artists nearby
        </div>
        <div style="font-size:13px;line-height:1.45;color:#57534e">
          Zoom in to separate ${escapeHtml(names)}${cluster.points.length > 4 ? "…" : ""}.
        </div>
      </div>
    `;
  }

  const point = cluster.points[0]!;
  const browseParams = new URLSearchParams({ location: point.locationValue });
  if (selectedCity) browseParams.set("location", selectedCity);
  if (selectedSpeciality) browseParams.set("speciality", selectedSpeciality);
  return `
    <div style="min-width:220px">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#b45309;margin-bottom:6px">
        ${escapeHtml(singularLower)}
      </div>
      <div style="font-size:16px;font-weight:700;color:#1c1917;margin-bottom:4px">
        ${escapeHtml(point.label)}
      </div>
      <div style="font-size:13px;line-height:1.45;color:#57534e;margin-bottom:10px">
        ${cluster.count} ${cluster.count === 1 ? "artist" : "artists"} listed here.
      </div>
      <a
        href="/artists?${browseParams.toString()}"
        style="
          display:inline-flex;
          align-items:center;
          justify-content:center;
          min-height:38px;
          padding:0 12px;
          border-radius:12px;
          border:1px solid #f3c35b;
          background:#fff8eb;
          color:#b45309;
          font-size:13px;
          font-weight:700;
          text-decoration:none;
        "
      >
        Browse artists in ${escapeHtml(point.label)}
      </a>
    </div>
  `;
}

function openPopupForClusterKey(
  clusterKey: string | null,
  markerRegistry: Map<string, LeafletMarker>,
  clusterRegistry: Map<string, Cluster>,
  singularLower: string,
  pluralLower: string,
  selectedCity: string,
  selectedSpeciality: string,
) {
  if (!clusterKey) return;
  const marker = markerRegistry.get(clusterKey);
  const cluster = clusterRegistry.get(clusterKey);
  if (!marker || !cluster) return;

  marker
    .bindPopup(popupHtml(cluster, singularLower, pluralLower, selectedCity, selectedSpeciality), {
      className: "artist-location-popup",
      closeButton: true,
      autoClose: true,
      closeOnClick: true,
      offset: [0, -10],
    })
    .openPopup();
}

export function ArtistsLocationExplorer({
  locationPoints,
  areaLabelSingular,
  areaLabelPlural,
  enableSpecialityFilter = false,
  cityOptions: cityOptionsProp,
  specialityOptions: specialityOptionsProp,
}: ArtistsLocationExplorerProps) {
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const markerRegistryRef = useRef<Map<string, LeafletMarker>>(new Map());
  const clusterRegistryRef = useRef<Map<string, Cluster>>(new Map());
  const activePopupClusterKeyRef = useRef<string | null>(null);
  const filteredLocationPointsRef = useRef<LocationMapPoint[]>(locationPoints);
  const selectedCityRef = useRef("");
  const selectedSpecialityRef = useRef("");
  const refreshMarkersRef = useRef<(() => void) | null>(null);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedSpeciality, setSelectedSpeciality] = useState("");
  const derivedCityOptions = useMemo<SearchOption[]>(
    () =>
      locationPoints
        .map((point) => ({ label: point.label }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [locationPoints],
  );
  const derivedSpecialityOptions = useMemo<SearchOption[]>(() => {
    const options = new Map<string, SearchOption>();
    for (const point of locationPoints) {
      for (const artist of point.artists) {
        for (const speciality of artist.specialities) {
          if (!options.has(speciality.name)) {
            options.set(speciality.name, { label: speciality.name, color: speciality.color });
          }
        }
      }
    }
    return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [locationPoints]);
  const cityOptions = cityOptionsProp ?? derivedCityOptions;
  const specialityOptions = specialityOptionsProp ?? derivedSpecialityOptions;
  const filteredLocationPoints = useMemo(() => {
    if (!selectedCity && !selectedSpeciality) return locationPoints;

    return locationPoints
      .map((point) => {
        if (selectedCity && point.label !== selectedCity) return null;
        const artists = point.artists.filter((artist) =>
          !selectedSpeciality ||
          artist.specialities.some((speciality) => speciality.name === selectedSpeciality),
        );
        if (artists.length === 0) return null;
        return {
          ...point,
          count: artists.length,
          artists,
        };
      })
      .filter((point): point is LocationMapPoint => point !== null);
  }, [locationPoints, selectedCity, selectedSpeciality]);
  const browseDirectoryHref = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedCity) params.set("location", selectedCity);
    if (selectedSpeciality) params.set("speciality", selectedSpeciality);
    const query = params.toString();
    return query ? `/artists?${query}` : "/artists";
  }, [selectedCity, selectedSpeciality]);
  const pointsKey = useMemo(
    () =>
      filteredLocationPoints
        .map((point) => `${point.locationValue}:${point.count}:${point.latitude}:${point.longitude}`)
        .join("|"),
    [filteredLocationPoints],
  );
  const singularLower = areaLabelSingular.toLowerCase();
  const pluralLower = areaLabelPlural.toLowerCase();

  useEffect(() => {
    filteredLocationPointsRef.current = filteredLocationPoints;
    selectedCityRef.current = selectedCity;
    selectedSpecialityRef.current = selectedSpeciality;
  }, [filteredLocationPoints, selectedCity, selectedSpeciality]);

  useEffect(() => {
    if (!mapRootRef.current || mapRef.current) return;

    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !mapRootRef.current) return;

      const map = leaflet.map(mapRootRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
        worldCopyJump: true,
        minZoom: 2,
        maxZoom: 14,
      });

      leaflet
        .tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
        })
        .addTo(map);

      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      map.on("popupclose", () => {
        activePopupClusterKeyRef.current = null;
      });

      const updateMarkers = () => {
        if (!markerLayerRef.current) return;
        markerLayerRef.current.clearLayers();
        markerRegistryRef.current = new Map();
        clusterRegistryRef.current = new Map();

        const clusters = clusterPoints(filteredLocationPointsRef.current, map);
        for (const cluster of clusters) {
          clusterRegistryRef.current.set(cluster.key, cluster);
          const icon = leaflet.divIcon({
            html: markerHtml(cluster.count),
            className: "artist-location-marker",
            iconSize: [markerDiameter(cluster.count), markerDiameter(cluster.count)],
            iconAnchor: [markerDiameter(cluster.count) / 2, markerDiameter(cluster.count) / 2],
          });

          const marker = leaflet.marker(cluster.center as LatLngExpression, { icon });

          marker.on("click", () => {
            map.closePopup();
            activePopupClusterKeyRef.current = cluster.key;
            if (cluster.points.length > 1) {
              const bounds = leaflet.latLngBounds(
                cluster.points.map((point) => [point.latitude, point.longitude] as LatLngTuple),
              );
              map.flyToBounds(bounds.pad(0.85), { maxZoom: Math.min(map.getZoom() + 2, 12), duration: 0.5 });
              map.once("moveend", () => {
                openPopupForClusterKey(
                  cluster.key,
                  markerRegistryRef.current,
                  clusterRegistryRef.current,
                  singularLower,
                  pluralLower,
                  selectedCityRef.current,
                  selectedSpecialityRef.current,
                );
              });
              return;
            }

            const point = cluster.points[0]!;
            map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 8), { duration: 0.45 });
            map.once("moveend", () => {
              openPopupForClusterKey(
                cluster.key,
                markerRegistryRef.current,
                clusterRegistryRef.current,
                singularLower,
                pluralLower,
                selectedCityRef.current,
                selectedSpecialityRef.current,
              );
            });
          });

          markerRegistryRef.current.set(cluster.key, marker);
          markerLayerRef.current.addLayer(marker);
        }

        openPopupForClusterKey(
          activePopupClusterKeyRef.current,
          markerRegistryRef.current,
          clusterRegistryRef.current,
          singularLower,
          pluralLower,
          selectedCityRef.current,
          selectedSpecialityRef.current,
        );
      };
      refreshMarkersRef.current = updateMarkers;

      const fitInitialBounds = () => {
        if (filteredLocationPointsRef.current.length === 0) {
          map.setView([20, 0], 2);
          return;
        }

        if (filteredLocationPointsRef.current.length === 1) {
          const point = filteredLocationPointsRef.current[0]!;
          map.setView([point.latitude, point.longitude], 5);
          return;
        }

        const bounds = leaflet.latLngBounds(
          filteredLocationPointsRef.current.map((point) => [point.latitude, point.longitude] as LatLngTuple),
        );
        map.fitBounds(bounds.pad(0.9), { maxZoom: 6 });
      };

      fitInitialBounds();
      updateMarkers();
      map.on("zoomend", updateMarkers);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerLayerRef.current = null;
      refreshMarkersRef.current = null;
    };
  }, [pluralLower, singularLower]);

  useEffect(() => {
    if (!mapRef.current) return;
    refreshMarkersRef.current?.();

    void (async () => {
      const map = mapRef.current;
      if (!map) return;

      if (filteredLocationPoints.length === 0) {
        map.setView([20, 0], 2);
      } else if (filteredLocationPoints.length === 1) {
        const point = filteredLocationPoints[0]!;
        map.flyTo([point.latitude, point.longitude], 5, { duration: 0.4 });
      } else {
        const leaflet = await import("leaflet");
        const bounds = leaflet.latLngBounds(
          filteredLocationPoints.map((point) => [point.latitude, point.longitude] as LatLngTuple),
        );
        map.flyToBounds(bounds.pad(0.9), { maxZoom: 6, duration: 0.55 });
      }
    })();
  }, [filteredLocationPoints, pointsKey]);

  return (
    <div className="relative z-0 overflow-hidden rounded-[30px] border border-amber-200/80 bg-gradient-to-b from-amber-50/60 via-amber-50/25 to-transparent shadow-sm">
      {enableSpecialityFilter ? (
        <div className="border-b border-amber-200/70 bg-white/70 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-900">Filter map by city / speciality</p>
              <p className="mt-1 text-xs text-stone-500">Type at least two letters to focus the map.</p>
            </div>
            <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
              <SearchTypeahead
                value={selectedCity}
                onChange={setSelectedCity}
                options={cityOptions}
                placeholder="All cities"
              />
              <SearchTypeahead
                value={selectedSpeciality}
                onChange={setSelectedSpeciality}
                options={specialityOptions}
                placeholder="All specialities"
              />
            </div>
          </div>
          {selectedCity || selectedSpeciality ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <p>
                Showing mapped locations
                {selectedCity ? (
                  <>
                    {" "}in <span className="font-semibold text-stone-700">{selectedCity}</span>
                  </>
                ) : null}
                {selectedSpeciality ? (
                  <>
                    {selectedCity ? " for " : " for "}
                    <span className="font-semibold text-stone-700">{selectedSpeciality}</span>
                  </>
                ) : null}
                .
              </p>
              <Link
                href={browseDirectoryHref}
                className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
              >
                Browse matching artists
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="relative z-0 px-2 pb-2 pt-3 sm:px-3">
        <div className="overflow-hidden rounded-[26px] border border-amber-200/80 shadow-inner">
          <div ref={mapRootRef} className="relative z-0 h-[620px] w-full bg-amber-50" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-3 pb-2 sm:px-4 text-xs text-stone-500">
          <p>
            Markers reflect artists whose current profile location could be mapped.
          </p>
          <Link
            href={browseDirectoryHref}
            className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            Browse full directory
          </Link>
        </div>
      </div>
    </div>
  );
}
