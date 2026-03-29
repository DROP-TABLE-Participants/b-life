"use client";

import { useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import MapView, {
  Layer,
  NavigationControl,
  Source,
  type LayerProps,
  type MapMouseEvent,
  type MapRef,
} from "react-map-gl/mapbox";
import type { MapboxGeoJSONFeature } from "mapbox-gl";
import { formatHospitalLabel, formatMinutes } from "@/lib/utils";
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

const riskHitLayer: LayerProps = {
  id: "hospital-risk-hit",
  type: "circle",
  source: "hospital-risk",
  minzoom: 6,
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 20, 10, 28, 14, 36],
    "circle-color": "#ffffff",
    "circle-opacity": 0.01,
  },
};

const createSelectedRiskPointLayer = (hospitalId: string): LayerProps => ({
  id: "hospital-risk-selected",
  type: "circle",
  source: "hospital-risk",
  filter: ["==", ["get", "hospitalId"], hospitalId],
  paint: {
    "circle-radius": 24,
    "circle-color": "rgba(255,255,255,0.05)",
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-opacity": 0.95,
  },
});

const hospitalNodeLayer: LayerProps = {
  id: "hospital-nodes",
  type: "circle",
  source: "hospital-nodes",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 8, 14, 11],
    "circle-color": "#e2e8f0",
    "circle-stroke-color": "#0f172a",
    "circle-stroke-width": 1.4,
    "circle-opacity": 0.95,
  },
};

const createHighlightedHospitalNodeLayer = (hospitalId: string): LayerProps => ({
  id: "hospital-nodes-selected",
  type: "circle",
  source: "hospital-nodes",
  filter: ["==", ["get", "hospitalId"], hospitalId],
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 9, 10, 14, 14, 18],
    "circle-color": "rgba(56,189,248,0.14)",
    "circle-stroke-color": "#38bdf8",
    "circle-stroke-width": 2,
    "circle-opacity": 1,
  },
});

const shipmentRouteLayer: LayerProps = {
  id: "shipment-routes",
  type: "line",
  source: "shipment-routes",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-width": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 4, 14, 6],
    "line-color": [
      "match",
      ["get", "status"],
      "planned",
      "#64748b",
      "approved",
      "#0284c7",
      "in_transit",
      "#06b6d4",
      "delayed",
      "#f59e0b",
      "delivered",
      "#10b981",
      "#94a3b8",
    ],
    "line-opacity": [
      "case",
      ["==", ["get", "status"], "delivered"],
      0.32,
      ["==", ["get", "status"], "cancelled"],
      0.22,
      0.9,
    ],
  },
};

const shipmentRouteHitLayer: LayerProps = {
  id: "shipment-routes-hit",
  type: "line",
  source: "shipment-routes",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-width": ["interpolate", ["linear"], ["zoom"], 5, 10, 10, 16, 14, 22],
    "line-color": "#ffffff",
    "line-opacity": 0.01,
  },
};

const createSelectedShipmentRouteLayer = (shipmentId: string): LayerProps => ({
  id: "shipment-routes-selected",
  type: "line",
  source: "shipment-routes",
  filter: ["==", ["get", "shipmentId"], shipmentId],
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-width": ["interpolate", ["linear"], ["zoom"], 5, 4, 10, 7, 14, 10],
    "line-color": "#f8fafc",
    "line-opacity": 0.8,
  },
});

const shipmentTruckLayer: LayerProps = {
  id: "shipment-trucks",
  type: "circle",
  source: "shipment-trucks",
  paint: {
    "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 8, 14, 12],
    "circle-color": [
      "match",
      ["get", "status"],
      "planned",
      "#64748b",
      "approved",
      "#0284c7",
      "in_transit",
      "#22d3ee",
      "delayed",
      "#f59e0b",
      "delivered",
      "#10b981",
      "#94a3b8",
    ],
    "circle-stroke-color": "#e2e8f0",
    "circle-stroke-width": 1.6,
    "circle-opacity": 0.95,
  },
};

type InteractiveMapMouseEvent = MapMouseEvent & {
  features?: MapboxGeoJSONFeature[];
};

export function ShipmentMapCanvas({
  hospitals,
  shipments,
  forecasts,
  highlightedHospitalId,
  mapboxToken,
  mode = "base",
}: ShipmentMapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [center, setCenter] = useState<[number, number]>([
    INITIAL_VIEW_STATE.longitude,
    INITIAL_VIEW_STATE.latitude,
  ]);
  const [zoom, setZoom] = useState(INITIAL_VIEW_STATE.zoom);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(highlightedHospitalId ?? null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const hospitalsById = useMemo(() => {
    return new Map(hospitals.map((hospital) => [hospital.id, hospital]));
  }, [hospitals]);

  const scopedShipments = useMemo(() => {
    if (!highlightedHospitalId) return shipments;
    return shipments.filter(
      (shipment) => shipment.fromHospitalId === highlightedHospitalId || shipment.toHospitalId === highlightedHospitalId,
    );
  }, [highlightedHospitalId, shipments]);

  const activeScopedShipments = useMemo(() => {
    return scopedShipments.filter((shipment) => shipment.status !== "delivered" && shipment.status !== "cancelled");
  }, [scopedShipments]);

  const hospitalNodeGeoJson = useMemo<FeatureCollection<Point>>(() => {
    return {
      type: "FeatureCollection",
      features: hospitals.map((hospital) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: hospital.coordinates,
        },
        properties: {
          hospitalId: hospital.id,
          hospitalName: hospital.name,
          city: hospital.city,
        },
      })),
    };
  }, [hospitals]);

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

  const shipmentRouteGeoJson = useMemo<FeatureCollection<LineString>>(() => {
    const features: Feature<LineString>[] = [];

    for (const shipment of scopedShipments) {
      const from = hospitalsById.get(shipment.fromHospitalId);
      const to = hospitalsById.get(shipment.toHospitalId);
      if (!from || !to) continue;

      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [from.coordinates, to.coordinates],
        },
        properties: {
          shipmentId: shipment.id,
          status: shipment.status,
          priority: shipment.priority,
          bloodType: shipment.bloodType,
          quantity: shipment.quantity,
          etaMinutes: Math.round(shipment.etaMinutes),
          progress: Math.round(shipment.progress * 100),
          fromHospitalId: shipment.fromHospitalId,
          toHospitalId: shipment.toHospitalId,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }, [hospitalsById, scopedShipments]);

  const shipmentTruckGeoJson = useMemo<FeatureCollection<Point>>(() => {
    const features: Feature<Point>[] = [];

    for (const shipment of activeScopedShipments) {
      const from = hospitalsById.get(shipment.fromHospitalId);
      const to = hospitalsById.get(shipment.toHospitalId);
      if (!from || !to) continue;

      const fallbackCoordinates =
        shipment.status === "planned" || shipment.status === "approved"
          ? from.coordinates
          : shipment.currentCoordinates;

      features.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: fallbackCoordinates,
        },
        properties: {
          shipmentId: shipment.id,
          status: shipment.status,
          priority: shipment.priority,
          bloodType: shipment.bloodType,
          quantity: shipment.quantity,
          etaMinutes: Math.round(shipment.etaMinutes),
          progress: Math.round(shipment.progress * 100),
          fromHospitalId: shipment.fromHospitalId,
          toHospitalId: shipment.toHospitalId,
        },
      });
    }

    return {
      type: "FeatureCollection",
      features,
    };
  }, [activeScopedShipments, hospitalsById]);

  const selectedHospital = useMemo(() => {
    if (!selectedHospitalId) return null;
    return hospitalsById.get(selectedHospitalId) ?? null;
  }, [hospitalsById, selectedHospitalId]);

  const selectedHospitalForecasts = useMemo(() => {
    if (!selectedHospitalId) return [];
    return forecasts.filter((forecast) => forecast.hospitalId === selectedHospitalId);
  }, [forecasts, selectedHospitalId]);

  const topIssueForecasts = useMemo(() => {
    return selectedHospitalForecasts
      .filter((forecast) => forecast.shortageRiskLevel === "critical" || forecast.shortageRiskLevel === "high")
      .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore)
      .slice(0, 3);
  }, [selectedHospitalForecasts]);

  const selectedHospitalMaxShortage = useMemo(() => {
    return selectedHospitalForecasts.reduce<Forecast | null>((highest, forecast) => {
      if (!highest || forecast.shortageRiskScore > highest.shortageRiskScore) return forecast;
      return highest;
    }, null);
  }, [selectedHospitalForecasts]);

  const selectedHospitalShipmentStats = useMemo(() => {
    if (!selectedHospitalId) {
      return { inboundActive: 0, outboundActive: 0, delayed: 0 };
    }

    return activeScopedShipments.reduce(
      (acc, shipment) => {
        if (shipment.toHospitalId === selectedHospitalId) acc.inboundActive += 1;
        if (shipment.fromHospitalId === selectedHospitalId) acc.outboundActive += 1;
        if (shipment.status === "delayed") acc.delayed += 1;
        return acc;
      },
      { inboundActive: 0, outboundActive: 0, delayed: 0 },
    );
  }, [activeScopedShipments, selectedHospitalId]);

  const selectedShipment = useMemo(() => {
    if (!selectedShipmentId) return null;
    return scopedShipments.find((shipment) => shipment.id === selectedShipmentId) ?? null;
  }, [scopedShipments, selectedShipmentId]);

  const selectedShipmentFromHospital = useMemo(() => {
    if (!selectedShipment) return null;
    return hospitalsById.get(selectedShipment.fromHospitalId) ?? null;
  }, [hospitalsById, selectedShipment]);

  const selectedShipmentToHospital = useMemo(() => {
    if (!selectedShipment) return null;
    return hospitalsById.get(selectedShipment.toHospitalId) ?? null;
  }, [hospitalsById, selectedShipment]);

  const handleMapClick = (event: InteractiveMapMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || !feature.properties) return;

    const layerId = feature.layer?.id;
    if (!layerId) return;

    if (layerId === "hospital-risk-points" || layerId === "hospital-risk-hit") {
      const hospitalId = String(feature.properties.hospitalId ?? "");
      if (hospitalId) {
        setSelectedHospitalId(hospitalId);
        setSelectedShipmentId(null);
      }
      return;
    }

    if (layerId === "hospital-nodes") {
      const hospitalId = String(feature.properties.hospitalId ?? "");
      if (hospitalId) {
        setSelectedHospitalId(hospitalId);
        setSelectedShipmentId(null);
      }
      return;
    }

    if (
      layerId === "shipment-routes" ||
      layerId === "shipment-routes-hit" ||
      layerId === "shipment-routes-selected" ||
      layerId === "shipment-trucks"
    ) {
      const shipmentId = String(feature.properties.shipmentId ?? "");
      if (shipmentId) {
        setSelectedShipmentId(shipmentId);
      }
    }
  };

  const interactiveLayerIds =
    mode === "riskHeatmap"
      ? ["hospital-risk-hit", "hospital-risk-points"]
      : ["shipment-routes-hit", "shipment-routes", "shipment-routes-selected", "shipment-trucks", "hospital-nodes"];

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

      <MapView
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        initialViewState={INITIAL_VIEW_STATE}
        maxZoom={20}
        minZoom={3}
        style={{ width: "100%", height: "100%", backgroundColor: "#e2e8f0" }}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onMove={(event) => {
          setCenter([event.viewState.longitude, event.viewState.latitude]);
          setZoom(event.viewState.zoom);
        }}
      >
        <NavigationControl position="top-right" />
        {mode === "riskHeatmap" ? (
          <Source id="hospital-risk" type="geojson" data={riskGeoJson}>
            <Layer {...heatmapLayer} />
            <Layer {...riskHitLayer} />
            <Layer {...riskPointLayer} />
            {selectedHospitalId ? (
              <Layer {...createSelectedRiskPointLayer(selectedHospitalId)} />
            ) : null}
          </Source>
        ) : (
          <>
            <Source id="hospital-nodes" type="geojson" data={hospitalNodeGeoJson}>
              <Layer {...hospitalNodeLayer} />
              {selectedHospitalId ? (
                <Layer {...createHighlightedHospitalNodeLayer(selectedHospitalId)} />
              ) : null}
            </Source>

            <Source id="shipment-routes" type="geojson" data={shipmentRouteGeoJson}>
              <Layer {...shipmentRouteHitLayer} />
              <Layer {...shipmentRouteLayer} />
              {selectedShipmentId ? (
                <Layer {...createSelectedShipmentRouteLayer(selectedShipmentId)} />
              ) : null}
            </Source>

            <Source id="shipment-trucks" type="geojson" data={shipmentTruckGeoJson}>
              <Layer {...shipmentTruckLayer} />
            </Source>
          </>
        )}
      </MapView>

      {mode === "riskHeatmap" && selectedHospital ? (
        <div className="absolute right-3 top-3 z-10 w-[290px] rounded-xl border border-cyan-300/30 bg-slate-950/85 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-cyan-100">{formatHospitalLabel(selectedHospital)}</p>
              <p className="text-[11px] text-slate-300">Most important hospital signals and issues</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedHospitalId(null)}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300"
            >
              Close
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-200">
            <p>
              Top shortage: {selectedHospitalMaxShortage?.bloodType ?? "n/a"} ({Math.round(selectedHospitalMaxShortage?.shortageRiskScore ?? 0)} risk)
            </p>
            <p>
              Active shipments: {selectedHospitalShipmentStats.inboundActive} inbound, {selectedHospitalShipmentStats.outboundActive} outbound
            </p>
            <p>Delayed lanes: {selectedHospitalShipmentStats.delayed}</p>
            <p>
              Issues: {topIssueForecasts.length > 0 ? "" : "No critical/high shortage issues"}
            </p>
          </div>

          {topIssueForecasts.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px] text-slate-200">
              {topIssueForecasts.map((forecast) => (
                <li key={`${forecast.hospitalId}-${forecast.bloodType}`}>
                  {forecast.bloodType}: {Math.round(forecast.shortageRiskScore)} risk, demand {forecast.predictedDemand24h}u
                </li>
              ))}
            </ul>
          ) : null}

          {selectedHospital.alerts.length > 0 ? (
            <ul className="mt-2 space-y-1 text-[11px] text-amber-200">
              {selectedHospital.alerts.slice(0, 2).map((alert) => (
                <li key={alert}>Alert: {alert}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {mode === "base" && selectedShipment ? (
        <div className="absolute right-3 top-3 z-10 w-[300px] rounded-xl border border-cyan-300/30 bg-slate-950/85 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-sm">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-cyan-100">Shipment Telemetry</p>
              <p className="text-[11px] text-slate-300">{selectedShipment.bloodType} - {selectedShipment.quantity}u</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedShipmentId(null)}
              className="rounded border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300"
            >
              Close
            </button>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-200">
            <p>From: {formatHospitalLabel(selectedShipmentFromHospital)}</p>
            <p>To: {formatHospitalLabel(selectedShipmentToHospital)}</p>
            <p>Status: {selectedShipment.status.replaceAll("_", " ")}</p>
            <p>Priority: {selectedShipment.priority}</p>
            <p>Progress: {Math.round(selectedShipment.progress * 100)}%</p>
            <p>ETA: {formatMinutes(selectedShipment.etaMinutes)}</p>
          </div>
        </div>
      ) : null}

      {mode === "base" ? (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-slate-600 bg-slate-950/85 px-3 py-2 text-[11px] text-slate-100 backdrop-blur-sm">
          <p className="font-semibold text-cyan-100">Route Legend</p>
          <p>cyan: in transit | amber: delayed | blue: approved | gray: planned</p>
          <p>Click route or truck marker for shipment details.</p>
        </div>
      ) : null}
    </div>
  );
}
