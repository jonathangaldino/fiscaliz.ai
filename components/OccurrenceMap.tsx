"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { setWorkerUrl, type GeoJSONSource } from "maplibre-gl";
import { useEffect, useMemo, useRef } from "react";
import Map, {
  Layer,
  NavigationControl,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { PublicOccurrence } from "@/convex/occurrences";
import { CATEGORIES, CATEGORY_KEYS } from "@/convex/lib/categories";
import { APUCARANA_CENTER } from "@/convex/lib/geo";

// MapLibre looks for its worker next to its own file, which the bundler moves;
// emit the worker as an asset and point MapLibre at it.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

// Vector tiles from OpenFreeMap: free, no API key.
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const categoryColor = [
  "match",
  ["get", "category"],
  ...CATEGORY_KEYS.flatMap((key) => [key, CATEGORIES[key].color]),
  CATEGORIES.other.color,
] as unknown as string;

type Props = {
  occurrences: PublicOccurrence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Click on an empty spot of the map (used by the simulator to drop a pin). */
  onMapClick?: (point: { lat: number; lng: number }) => void;
  marker?: { lat: number; lng: number } | null;
};

export default function OccurrenceMap({
  occurrences,
  selectedId,
  onSelect,
  onMapClick,
  marker,
}: Props) {
  const mapRef = useRef<MapRef>(null);

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: occurrences.map((o) => ({
        type: "Feature",
        id: o._id,
        geometry: { type: "Point", coordinates: [o.lng, o.lat] },
        properties: { id: o._id, category: o.category, appeal: o.appeal },
      })),
    }),
    [occurrences],
  );

  const markerData = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: marker
        ? [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [marker.lng, marker.lat] },
              properties: {},
            },
          ]
        : [],
    }),
    [marker],
  );

  useEffect(() => {
    if (!selectedId) return;
    const selected = occurrences.find((o) => o._id === selectedId);
    if (selected) {
      mapRef.current?.flyTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
      });
    }
  }, [selectedId, occurrences]);

  async function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (!feature) {
      onMapClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      return;
    }
    if (feature.layer.id === "clusters") {
      const source = mapRef.current?.getSource("occurrences") as
        | GeoJSONSource
        | undefined;
      const zoom = await source?.getClusterExpansionZoom(
        feature.properties.cluster_id as number,
      );
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
      mapRef.current?.easeTo({ center: [lng, lat], zoom: zoom ?? 16 });
      return;
    }
    onSelect?.(feature.properties.id as string);
  }

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        latitude: APUCARANA_CENTER.lat,
        longitude: APUCARANA_CENTER.lng,
        zoom: 13,
      }}
      mapStyle={MAP_STYLE}
      interactiveLayerIds={["clusters", "occurrence-points"]}
      onClick={handleClick}
      cursor={onMapClick ? "crosshair" : undefined}
      style={{ width: "100%", height: "100%" }}
    >
      <NavigationControl position="top-right" showCompass={false} />
      <Source
        id="occurrences"
        type="geojson"
        data={data}
        cluster
        clusterRadius={40}
        clusterMaxZoom={15}
        clusterProperties={{ appeal: ["+", ["get", "appeal"]] }}
      >
        <Layer
          id="clusters"
          type="circle"
          filter={["has", "point_count"]}
          paint={{
            "circle-color": "#1f2937",
            "circle-opacity": 0.85,
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "appeal"],
              1,
              16,
              100,
              32,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          }}
        />
        <Layer
          id="cluster-count"
          type="symbol"
          filter={["has", "point_count"]}
          layout={{
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 13,
            "text-font": ["Noto Sans Bold"],
          }}
          paint={{ "text-color": "#ffffff" }}
        />
        <Layer
          id="occurrence-points"
          type="circle"
          filter={["!", ["has", "point_count"]]}
          paint={{
            "circle-color": categoryColor,
            // Bigger pin = more citizens appealing.
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "appeal"],
              1,
              7,
              10,
              13,
              50,
              22,
            ],
            "circle-stroke-width": [
              "case",
              ["==", ["get", "id"], selectedId ?? ""],
              4,
              2,
            ],
            "circle-stroke-color": [
              "case",
              ["==", ["get", "id"], selectedId ?? ""],
              "#111827",
              "#ffffff",
            ],
          }}
        />
      </Source>
      <Source id="marker" type="geojson" data={markerData}>
        <Layer
          id="marker-point"
          type="circle"
          paint={{
            "circle-color": "#2563eb",
            "circle-radius": 9,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Source>
    </Map>
  );
}
