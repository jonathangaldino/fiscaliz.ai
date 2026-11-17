"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import {
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Map, {
  Layer,
  Popup,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
} from "react-map-gl/maplibre";
import type { PublicOccurrence } from "@/convex/occurrences";
import { APUCARANA_CENTER } from "@/convex/lib/geo";
import { PIN, pinImages, VERIFYING_BADGE_ID } from "@/lib/mapPins";
import { useColorScheme } from "@/lib/media";
import { Glyph } from "./ui/Glyph";
import { IconButton } from "./ui/IconButton";

// MapLibre looks for its worker next to its own file, which the bundler moves;
// emit the worker as an asset and point MapLibre at it.
setWorkerUrl(
  new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href,
);

// Vector tiles from OpenFreeMap: free, no API key. Muted base maps so the
// colored pins carry the information.
const MAP_STYLE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/** MapLibre's own labels, in Portuguese for screen readers and tooltips. */
const MAP_LOCALE = {
  "Map.Title": "Mapa de ocorrências. As mesmas ocorrências estão na lista.",
  "AttributionControl.ToggleAttribution": "Mostrar créditos do mapa",
  "Popup.Close": "Fechar",
  "Marker.Title": "Local marcado",
};

const HOME_VIEW = {
  latitude: APUCARANA_CENTER.lat,
  longitude: APUCARANA_CENTER.lng,
  zoom: 13,
};

/** Bigger pin = more citizens appealing. */
const appealSize: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["get", "appeal"],
  1,
  0.85,
  10,
  1,
  50,
  1.25,
];

type Props = {
  occurrences: PublicOccurrence[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Click on an empty spot of the map (used by the simulator to drop a pin). */
  onMapClick?: (point: { lat: number; lng: number }) => void;
  marker?: { lat: number; lng: number } | null;
  /** Space covered by floating panels, so the map centers in what is visible. */
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  /** Hide the zoom and location buttons. */
  hideControls?: boolean;
  /** Where the zoom and location buttons sit. */
  controlsClassName?: string;
  /** Card shown above the selected pin. */
  popup?: { lat: number; lng: number; content: ReactNode } | null;
};

export default function OccurrenceMap({
  occurrences,
  selectedId,
  onSelect,
  onMapClick,
  marker,
  padding,
  hideControls = false,
  controlsClassName = "top-20 right-3",
  popup,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const popupOpen = Boolean(popup);
  const scheme = useColorScheme();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  // Layers wait for the image resolver, so no pin is ever reported missing.
  const [ready, setReady] = useState(false);

  const data = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: "FeatureCollection",
      features: occurrences.map((o) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [o.lng, o.lat] },
        properties: {
          id: o._id,
          category: o.category,
          appeal: o.appeal,
          status: o.status,
        },
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
              geometry: {
                type: "Point",
                coordinates: [marker.lng, marker.lat],
              },
              properties: {},
            },
          ]
        : [],
    }),
    [marker],
  );

  // Pins for the selected and hovered occurrences are drawn on a top layer.
  const activeIds = [selectedId, hoveredId].filter(Boolean) as string[];
  const isActive: ExpressionSpecification = [
    "in",
    ["get", "id"],
    ["literal", activeIds],
  ];

  useEffect(() => {
    if (!selectedId) return;
    const selected = occurrences.find((o) => o._id === selectedId);
    if (selected) {
      mapRef.current?.flyTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
        duration: 900,
        // Leave room for the card above the pin.
        offset: [0, popupOpen ? 120 : 0],
      });
    }
  }, [selectedId, occurrences, popupOpen]);

  const paddingKey = JSON.stringify(padding ?? {});
  useEffect(() => {
    mapRef.current?.getMap().setPadding({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      ...JSON.parse(paddingKey),
    });
  }, [paddingKey]);

  async function handleClick(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    if (!feature) {
      onMapClick?.({ lat: event.lngLat.lat, lng: event.lngLat.lng });
      return;
    }
    if (feature.layer.id === "clusters") {
      const source = mapRef.current?.getSource("occurrences") as
        GeoJSONSource | undefined;
      const zoom = await source?.getClusterExpansionZoom(
        feature.properties.cluster_id as number,
      );
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
      mapRef.current?.easeTo({ center: [lng, lat], zoom: zoom ?? 16 });
      return;
    }
    onSelect?.(feature.properties.id as string);
  }

  function handleHover(event: MapLayerMouseEvent) {
    const feature = event.features?.[0];
    const id =
      feature && feature.layer.id !== "clusters"
        ? (feature.properties.id as string)
        : null;
    setHoveredId((current) => (current === id ? current : id));
  }

  function locate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        mapRef.current?.flyTo({
          center: [position.coords.longitude, position.coords.latitude],
          zoom: 16,
        });
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  const dark = scheme === "dark";

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        initialViewState={HOME_VIEW}
        mapStyle={MAP_STYLE[scheme]}
        interactiveLayerIds={["clusters", "occurrence-pins", "active-pins"]}
        onClick={handleClick}
        onMouseMove={handleHover}
        onMouseLeave={() => setHoveredId(null)}
        onLoad={(event) => {
          // Pins are drawn on demand; this also covers the light/dark style
          // swap, which drops custom images.
          const map = event.target;
          map.setMissingStyleImageResolver(async (id) => {
            const image = (await pinImages()).get(id);
            if (image && !map.hasImage(id)) {
              map.addImage(id, image.data, { pixelRatio: image.pixelRatio });
            }
          });
          setReady(true);
        }}
        // The simulator (which passes a marker) drops a pin with each click.
        cursor={marker !== undefined ? "crosshair" : undefined}
        attributionControl={{ compact: true }}
        locale={MAP_LOCALE}
        style={{ width: "100%", height: "100%" }}
      >
        {ready && (
          <Source
            id="occurrences"
            type="geojson"
            data={data}
            cluster
            clusterRadius={44}
            clusterMaxZoom={15}
            clusterProperties={{ appeal: ["+", ["get", "appeal"]] }}
          >
            <Layer
              id="clusters"
              type="circle"
              filter={["has", "point_count"]}
              paint={{
                "circle-color": dark ? "#1c1f1d" : "#ffffff",
                "circle-opacity": 0.92,
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "appeal"],
                  1,
                  18,
                  100,
                  34,
                ],
                "circle-stroke-width": 6,
                "circle-stroke-color": dark
                  ? "rgba(106, 174, 255, 0.35)"
                  : "rgba(11, 95, 198, 0.22)",
              }}
            />
            <Layer
              id="cluster-count"
              type="symbol"
              filter={["has", "point_count"]}
              layout={{
                "text-field": ["get", "point_count_abbreviated"],
                "text-size": 14,
                "text-font": ["Noto Sans Bold"],
                "text-allow-overlap": true,
              }}
              paint={{ "text-color": dark ? "#f1f4f2" : "#0b0d0c" }}
            />
            <Layer
              id="occurrence-pins"
              type="symbol"
              filter={["all", ["!", ["has", "point_count"]], ["!", isActive]]}
              layout={{
                "icon-image": ["concat", "pin-", ["get", "category"]],
                "icon-anchor": "bottom",
                "icon-size": appealSize,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
                "symbol-sort-key": ["get", "appeal"],
              }}
            />
            <Layer
              id="verifying-badges"
              type="symbol"
              filter={[
                "all",
                ["!", ["has", "point_count"]],
                ["==", ["get", "status"], "verifying"],
              ]}
              layout={{
                "icon-image": VERIFYING_BADGE_ID,
                "icon-anchor": "center",
                "icon-offset": [
                  PIN.radius * 0.75,
                  -(PIN.height - PIN.radius * 0.4),
                ],
                "icon-size": appealSize,
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
            />
            <Layer
              id="active-pins"
              type="symbol"
              filter={["all", ["!", ["has", "point_count"]], isActive]}
              layout={{
                "icon-image": ["concat", "pin-", ["get", "category"]],
                "icon-anchor": "bottom",
                "icon-size": ["*", appealSize, 1.22],
                "icon-allow-overlap": true,
                "icon-ignore-placement": true,
              }}
            />
          </Source>
        )}
        {popup && (
          <Popup
            latitude={popup.lat}
            longitude={popup.lng}
            anchor="bottom"
            offset={PIN.height * 1.22 + 8}
            closeButton={false}
            closeOnClick={false}
            maxWidth="none"
            className="map-card-popup"
          >
            {popup.content}
          </Popup>
        )}
        <Source id="marker" type="geojson" data={markerData}>
          <Layer
            id="marker-point"
            type="circle"
            paint={{
              "circle-color": "#0b5fc6",
              "circle-radius": 9,
              "circle-stroke-width": 3,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>
      </Map>

      {!hideControls && (
        <div
          className={`absolute z-10 flex flex-col gap-2 ${controlsClassName}`}
        >
          <div className="glass flex flex-col overflow-hidden rounded-full">
            <button
              type="button"
              aria-label="Aproximar"
              title="Aproximar"
              onClick={() => mapRef.current?.zoomIn()}
              className="lit flex size-11 items-center justify-center transition-[background-color,transform] duration-(--dur) hover:bg-accent-tint active:scale-90"
            >
              <Glyph name="plus" />
            </button>
            <span aria-hidden className="mx-2.5 h-px bg-line" />
            <button
              type="button"
              aria-label="Afastar"
              title="Afastar"
              onClick={() => mapRef.current?.zoomOut()}
              className="lit flex size-11 items-center justify-center transition-[background-color,transform] duration-(--dur) hover:bg-accent-tint active:scale-90"
            >
              <Glyph name="minus" />
            </button>
          </div>
          <IconButton
            label="Ver Apucarana inteira"
            onClick={() =>
              mapRef.current?.flyTo({
                center: [HOME_VIEW.longitude, HOME_VIEW.latitude],
                zoom: HOME_VIEW.zoom,
              })
            }
          >
            <Glyph name="recenter" />
          </IconButton>
          <IconButton
            label="Ir para a minha localização"
            onClick={locate}
            aria-busy={locating}
          >
            <Glyph
              name="locate"
              className={locating ? "animate-pulse text-accent" : ""}
            />
          </IconButton>
        </div>
      )}
    </div>
  );
}
