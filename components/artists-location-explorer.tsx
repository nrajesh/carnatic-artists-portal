"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import type { LatLngExpression, LatLngTuple, LayerGroup, Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { LocationMapPoint } from "@/lib/location-map-data";

type ArtistsLocationExplorerProps = {
  locationPoints: LocationMapPoint[];
  areaLabelSingular: string;
  areaLabelPlural: string;
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

function popupHtml(cluster: Cluster, singularLower: string, pluralLower: string): string {
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
        href="/artists?location=${encodeURIComponent(point.locationValue)}"
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
) {
  if (!clusterKey) return;
  const marker = markerRegistry.get(clusterKey);
  const cluster = clusterRegistry.get(clusterKey);
  if (!marker || !cluster) return;

  marker
    .bindPopup(popupHtml(cluster, singularLower, pluralLower), {
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
}: ArtistsLocationExplorerProps) {
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const markerRegistryRef = useRef<Map<string, LeafletMarker>>(new Map());
  const clusterRegistryRef = useRef<Map<string, Cluster>>(new Map());
  const activePopupClusterKeyRef = useRef<string | null>(null);
  const pointsKey = useMemo(
    () => locationPoints.map((point) => `${point.locationValue}:${point.count}:${point.latitude}:${point.longitude}`).join("|"),
    [locationPoints],
  );
  const singularLower = areaLabelSingular.toLowerCase();
  const pluralLower = areaLabelPlural.toLowerCase();

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

        const clusters = clusterPoints(locationPoints, map);
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
        );
      };

      const fitInitialBounds = () => {
        if (locationPoints.length === 0) {
          map.setView([20, 0], 2);
          return;
        }

        if (locationPoints.length === 1) {
          const point = locationPoints[0]!;
          map.setView([point.latitude, point.longitude], 5);
          return;
        }

        const bounds = leaflet.latLngBounds(
          locationPoints.map((point) => [point.latitude, point.longitude] as LatLngTuple),
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
    };
  }, [locationPoints, pluralLower, singularLower]);

  useEffect(() => {
    if (!mapRef.current) return;

    void (async () => {
      const map = mapRef.current;
      if (!map) return;

      if (locationPoints.length === 0) {
        map.setView([20, 0], 2);
      } else if (locationPoints.length === 1) {
        const point = locationPoints[0]!;
        map.flyTo([point.latitude, point.longitude], 5, { duration: 0.4 });
      } else {
        const leaflet = await import("leaflet");
        const bounds = leaflet.latLngBounds(
          locationPoints.map((point) => [point.latitude, point.longitude] as LatLngTuple),
        );
        map.flyToBounds(bounds.pad(0.9), { maxZoom: 6, duration: 0.55 });
      }
    })();
  }, [pointsKey, locationPoints]);

  return (
    <div className="overflow-hidden rounded-[30px] border border-amber-200/80 bg-gradient-to-b from-amber-50/60 via-amber-50/25 to-transparent shadow-sm">
      <div className="px-2 pb-2 pt-3 sm:px-3">
        <div className="overflow-hidden rounded-[26px] border border-amber-200/80 shadow-inner">
          <div ref={mapRootRef} className="h-[620px] w-full bg-amber-50" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-3 pb-2 sm:px-4 text-xs text-stone-500">
          <p>
            Markers reflect artists who entered a location.
          </p>
          <Link
            href="/artists"
            className="inline-flex min-h-[38px] items-center justify-center rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            Browse full directory
          </Link>
        </div>
      </div>
    </div>
  );
}
