"use client";

import { useMemo, useRef, useState } from "react";
import type { FeatureCollection, Point } from "geojson";
import Map, { Layer, NavigationControl, Source, type LayerProps, type MapRef } from "react-map-gl/mapbox";
import type { Forecast, Hospital, Shipment } from "@/types/domain";
import "mapbox-gl/dist/mapbox-gl.css";

interface ShipmentMapCanvasProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  highlightedHospitalId?: string;
  mapboxToken: string;
  mode?: "base" | "riskHeatmap";
}

const INITIAL_VIEW_STATE = {
  longitude: 23.3219,
  latitude: 42.6977,
  zoom: 10.5,
};

const heatmapLayer: LayerProps = {
  id: "hospital-risk-heatmap",
  type: "heatmap",
  source: "hospital-risk",
  maxzoom: 15,
  paint: {
    "heatmap-weight": [
      "interpolate",
      ["linear"],
      ["get", "riskScore"],
      0,
      0,
      100,
      1,
    ],
    "heatmap-intensity": [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      1.4,
      10,
      2.8,
    ],
    "heatmap-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      5,
      34,
      10,
      58,
      14,
      76,
    ],
    "heatmap-opacity": 1,
    "heatmap-color": [
      "interpolate",
      ["linear"],
      ["heatmap-density"],
      0,
      "rgba(34,197,94,0.15)",
      0.15,
      "rgba(163,230,53,0.45)",
      0.35,
      "rgba(250,204,21,0.72)",
      0.6,
      "rgba(249,115,22,0.88)",
      1,
      "rgba(239,68,68,0.98)",
    ],
  },
};

const riskPointLayer: LayerProps = {
  id: "hospital-risk-points",
  type: "circle",
  source: "hospital-risk",
  minzoom: 7,
  paint: {
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["get", "riskScore"],
      0,
      7,
      100,
      18,
    ],
    "circle-color": [
      "interpolate",
      ["linear"],
      ["get", "riskScore"],
      0,
      "#22c55e",
      35,
      "#facc15",
      60,
      "#fb923c",
      80,
      "#ef4444",
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1.5,
    "circle-opacity": 0.95,
  },
};

export function ShipmentMapCanvas({ hospitals, forecasts, mapboxToken, mode = "base" }: ShipmentMapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [center, setCenter] = useState<[number, number]>([
    INITIAL_VIEW_STATE.longitude,
    INITIAL_VIEW_STATE.latitude,
  ]);
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom);
  const riskGeoJson = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: "FeatureCollection",
      features: hospitals.map((hospital) => {
        const riskScore = forecasts
          .filter((forecast) => forecast.hospitalId === hospital.id)
          .reduce((max, forecast) => Math.max(max, forecast.shortageRiskScore), 0);

        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: hospital.coordinates,
          },
          properties: {
            hospitalId: hospital.id,
            hospitalName: hospital.name,
            city: hospital.city,
            riskScore,
          },
        };
      }),
    };
  }, [forecasts, hospitals]);

  const handleReset = () => {
    mapRef.current?.flyTo({
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
    });
  };

  if (!mapboxToken) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-slate-100 text-sm text-slate-500">
        Missing Mapbox token
      </div>
    );
  }

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-[inherit]">
      <div className="absolute left-3 top-3 z-10 rounded-md bg-slate-900/85 px-3 py-2 font-mono text-xs text-white">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} | Zoom: {zoom.toFixed(2)}
      </div>

      <button
        type="button"
        onClick={handleReset}
        className="absolute left-3 top-14 z-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
      >
        Reset
      </button>

      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={INITIAL_VIEW_STATE}
        maxZoom={20}
        minZoom={3}
        style={{ width: "100%", height: "100%", backgroundColor: "#e2e8f0" }}
        attributionControl={false}
        onMove={(event) => {
          setCenter([event.viewState.longitude, event.viewState.latitude]);
          setZoom(event.viewState.zoom);
        }}
      >
        <NavigationControl position="top-right" />
        {mode === "riskHeatmap" ? (
          <Source id="hospital-risk" type="geojson" data={riskGeoJson}>
            <Layer {...heatmapLayer} />
            <Layer {...riskPointLayer} />
          </Source>
        ) : null}
      </Map>
    </div>
  );
}
