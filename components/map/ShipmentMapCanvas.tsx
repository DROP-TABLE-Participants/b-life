"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

const DEFAULT_VIEW_STATE = {
  longitude: 23.3219,
  latitude: 42.6977,
  zoom: 10.5,
};

const BULGARIA_BOUNDS: [[number, number], [number, number]] = [
  [22.360344, 41.339032],
  [28.57904, 44.215343],
];

const HOSPITAL_VIEW_ZOOM = 9.8;

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

const createRoutePairKey = (fromHospitalId: string, toHospitalId: string): string =>
  `${fromHospitalId}->${toHospitalId}`;

const coordinateDistance = (from: [number, number], to: [number, number]): number => {
  const deltaLng = to[0] - from[0];
  const deltaLat = to[1] - from[1];
  return Math.hypot(deltaLng, deltaLat);
};

const interpolateOnRoute = (routeCoordinates: [number, number][], progress: number): [number, number] => {
  if (routeCoordinates.length === 0) return [DEFAULT_VIEW_STATE.longitude, DEFAULT_VIEW_STATE.latitude];
  if (routeCoordinates.length === 1) return routeCoordinates[0];

  const clampedProgress = Math.max(0, Math.min(1, progress));
  if (clampedProgress === 0) return routeCoordinates[0];
  if (clampedProgress === 1) return routeCoordinates[routeCoordinates.length - 1];

  const segmentLengths = routeCoordinates
    .slice(0, -1)
    .map((point, index) => coordinateDistance(point, routeCoordinates[index + 1]));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  if (totalLength <= 0) {
    return routeCoordinates[0];
  }

  const targetLength = totalLength * clampedProgress;
  let traversedLength = 0;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    const nextTraversedLength = traversedLength + segmentLength;

    if (targetLength <= nextTraversedLength || index === segmentLengths.length - 1) {
      const localProgress = segmentLength === 0 ? 0 : (targetLength - traversedLength) / segmentLength;
      const from = routeCoordinates[index];
      const to = routeCoordinates[index + 1];

      return [
        from[0] + (to[0] - from[0]) * localProgress,
        from[1] + (to[1] - from[1]) * localProgress,
      ];
    }

    traversedLength = nextTraversedLength;
  }

  return routeCoordinates[routeCoordinates.length - 1];
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
  const lastContextKeyRef = useRef<string | null>(null);

  const highlightedHospitalCoordinates = useMemo<[number, number] | null>(() => {
    if (!highlightedHospitalId) return null;
    const hospital = hospitals.find((item) => item.id === highlightedHospitalId);
    return hospital?.coordinates ?? null;
  }, [highlightedHospitalId, hospitals]);

  const highlightedHospitalLongitude = highlightedHospitalCoordinates?.[0] ?? null;
  const highlightedHospitalLatitude = highlightedHospitalCoordinates?.[1] ?? null;

  const initialViewState = useMemo(() => {
    if (mode === "riskHeatmap") {
      return {
        longitude: (BULGARIA_BOUNDS[0][0] + BULGARIA_BOUNDS[1][0]) / 2,
        latitude: (BULGARIA_BOUNDS[0][1] + BULGARIA_BOUNDS[1][1]) / 2,
        zoom: 6.5,
      };
    }

    if (highlightedHospitalCoordinates) {
      return {
        longitude: highlightedHospitalCoordinates[0],
        latitude: highlightedHospitalCoordinates[1],
        zoom: HOSPITAL_VIEW_ZOOM,
      };
    }

    return DEFAULT_VIEW_STATE;
  }, [highlightedHospitalCoordinates, mode]);

  const [center, setCenter] = useState<[number, number]>([
    initialViewState.longitude,
    initialViewState.latitude,
  ]);
  const [zoom, setZoom] = useState(initialViewState.zoom);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(highlightedHospitalId ?? null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeCoordinatesByPair, setRouteCoordinatesByPair] = useState<Record<string, [number, number][]>>({});

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

  const scopedRoutePairs = useMemo(() => {
    const seen = new Set<string>();
    const pairs: Array<{ routePairKey: string; from: [number, number]; to: [number, number] }> = [];

    for (const shipment of scopedShipments) {
      const from = hospitalsById.get(shipment.fromHospitalId);
      const to = hospitalsById.get(shipment.toHospitalId);
      if (!from || !to) continue;

      const routePairKey = createRoutePairKey(shipment.fromHospitalId, shipment.toHospitalId);
      if (seen.has(routePairKey)) continue;

      seen.add(routePairKey);
      pairs.push({
        routePairKey,
        from: from.coordinates,
        to: to.coordinates,
      });
    }

    return pairs;
  }, [hospitalsById, scopedShipments]);

  useEffect(() => {
    if (mode !== "base" || !mapboxToken) return;

    const missingPairs = scopedRoutePairs.filter((pair) => !routeCoordinatesByPair[pair.routePairKey]);
    if (missingPairs.length === 0) return;

    let isCancelled = false;

    const fetchRoutes = async () => {
      const fetchedRoutes: Record<string, [number, number][]> = {};

      await Promise.all(
        missingPairs.map(async (pair) => {
          const [fromLng, fromLat] = pair.from;
          const [toLng, toLat] = pair.to;
          const url =
            `https://api.mapbox.com/directions/v5/mapbox/driving/` +
            `${fromLng},${fromLat};${toLng},${toLat}` +
            `?geometries=geojson&overview=full&access_token=${mapboxToken}`;

          try {
            const response = await fetch(url);
            if (!response.ok) return;

            const payload = (await response.json()) as {
              routes?: Array<{ geometry?: { coordinates?: number[][] } }>;
            };

            const routeCoordinates = payload.routes?.[0]?.geometry?.coordinates;
            if (!routeCoordinates || routeCoordinates.length < 2) return;

            fetchedRoutes[pair.routePairKey] = routeCoordinates
              .filter((coordinate): coordinate is number[] => Array.isArray(coordinate) && coordinate.length >= 2)
              .map((coordinate) => [coordinate[0], coordinate[1]] as [number, number]);
          } catch {
            // Keep straight-line fallback when route lookup fails.
          }
        }),
      );

      if (isCancelled || Object.keys(fetchedRoutes).length === 0) return;

      setRouteCoordinatesByPair((previous) => ({ ...previous, ...fetchedRoutes }));
    };

    void fetchRoutes();

    return () => {
      isCancelled = true;
    };
  }, [mapboxToken, mode, routeCoordinatesByPair, scopedRoutePairs]);

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

      const routePairKey = createRoutePairKey(shipment.fromHospitalId, shipment.toHospitalId);
      const routeCoordinates = routeCoordinatesByPair[routePairKey] ?? [from.coordinates, to.coordinates];

      features.push({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
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
  }, [hospitalsById, routeCoordinatesByPair, scopedShipments]);

  const shipmentTruckGeoJson = useMemo<FeatureCollection<Point>>(() => {
    const features: Feature<Point>[] = [];

    for (const shipment of activeScopedShipments) {
      const from = hospitalsById.get(shipment.fromHospitalId);
      const to = hospitalsById.get(shipment.toHospitalId);
      if (!from || !to) continue;

      const routePairKey = createRoutePairKey(shipment.fromHospitalId, shipment.toHospitalId);
      const routeCoordinates = routeCoordinatesByPair[routePairKey] ?? [from.coordinates, to.coordinates];
      const routeProgress = shipment.status === "planned" || shipment.status === "approved" ? 0 : shipment.progress;
      const fallbackCoordinates = interpolateOnRoute(routeCoordinates, routeProgress);

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
  }, [activeScopedShipments, hospitalsById, routeCoordinatesByPair]);

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

  const focusMapForContext = useCallback((animate: boolean) => {
    const map = mapRef.current;
    if (!map) return;

    if (mode === "riskHeatmap") {
      map.fitBounds(BULGARIA_BOUNDS, {
        padding: 48,
        maxZoom: 7.2,
        duration: animate ? 900 : 0,
      });
      return;
    }

    if (highlightedHospitalLongitude !== null && highlightedHospitalLatitude !== null) {
      map.flyTo({
        center: [highlightedHospitalLongitude, highlightedHospitalLatitude],
        zoom: HOSPITAL_VIEW_ZOOM,
        duration: animate ? 800 : 0,
      });
      return;
    }

    map.flyTo({
      center: [DEFAULT_VIEW_STATE.longitude, DEFAULT_VIEW_STATE.latitude],
      zoom: DEFAULT_VIEW_STATE.zoom,
      duration: animate ? 800 : 0,
    });
  }, [highlightedHospitalLatitude, highlightedHospitalLongitude, mode]);

  useEffect(() => {
    const contextKey = `${mode}:${highlightedHospitalId ?? "none"}`;
    if (lastContextKeyRef.current === contextKey) return;

    lastContextKeyRef.current = contextKey;
    focusMapForContext(false);
  }, [focusMapForContext, highlightedHospitalId, mode]);

  const handleReset = () => {
    focusMapForContext(true);
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
      <div className="absolute left-3 top-3 z-10 rounded-md border border-slate-200 bg-white/95 px-3 py-2 font-mono text-xs text-slate-700 shadow-sm">
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
        mapStyle="mapbox://styles/mapbox/light-v11"
        initialViewState={initialViewState}
        maxZoom={20}
        minZoom={3}
        style={{ width: "100%", height: "100%", backgroundColor: "#f8fafc" }}
        attributionControl={false}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleMapClick}
        onLoad={() => {
          lastContextKeyRef.current = `${mode}:${highlightedHospitalId ?? "none"}`;
          focusMapForContext(false);
        }}
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

      <Sheet
        open={mode === "riskHeatmap" && !!selectedHospital}
        onOpenChange={(open) => {
          if (!open) setSelectedHospitalId(null);
        }}
      >
        {mode === "riskHeatmap" && selectedHospital ? (
          <SheetContent side="right" className="w-full border-slate-200 bg-white sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-slate-900">{formatHospitalLabel(selectedHospital)}</SheetTitle>
              <SheetDescription>Most important hospital signals and issues</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6 text-sm text-slate-700">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p>
                  Top shortage: {selectedHospitalMaxShortage?.bloodType ?? "n/a"} ({Math.round(selectedHospitalMaxShortage?.shortageRiskScore ?? 0)} risk)
                </p>
                <p>
                  Active shipments: {selectedHospitalShipmentStats.inboundActive} inbound, {selectedHospitalShipmentStats.outboundActive} outbound
                </p>
                <p>Delayed lanes: {selectedHospitalShipmentStats.delayed}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Issue Signals</p>
                {topIssueForecasts.length > 0 ? (
                  <ul className="space-y-1">
                    {topIssueForecasts.map((forecast) => (
                      <li key={`${forecast.hospitalId}-${forecast.bloodType}`}>
                        {forecast.bloodType}: {Math.round(forecast.shortageRiskScore)} risk, demand {forecast.predictedDemand24h}u
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No critical/high shortage issues.</p>
                )}
              </div>

              {selectedHospital.alerts.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em]">Alerts</p>
                  <ul className="space-y-1">
                    {selectedHospital.alerts.slice(0, 2).map((alert) => (
                      <li key={alert}>{alert}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      <Sheet
        open={mode === "base" && !!selectedShipment}
        onOpenChange={(open) => {
          if (!open) setSelectedShipmentId(null);
        }}
      >
        {mode === "base" && selectedShipment ? (
          <SheetContent side="right" className="w-full border-slate-200 bg-white sm:max-w-md">
            <SheetHeader>
              <SheetTitle className="text-slate-900">Shipment Telemetry</SheetTitle>
              <SheetDescription>
                {selectedShipment.bloodType} - {selectedShipment.quantity}u
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-6 text-sm text-slate-700">
              <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p>From: {formatHospitalLabel(selectedShipmentFromHospital)}</p>
                <p>To: {formatHospitalLabel(selectedShipmentToHospital)}</p>
              </div>
              <div className="space-y-1 rounded-xl border border-slate-200 bg-white p-3">
                <p>Status: {selectedShipment.status.replaceAll("_", " ")}</p>
                <p>Priority: {selectedShipment.priority}</p>
                <p>Progress: {Math.round(selectedShipment.progress * 100)}%</p>
                <p>ETA: {formatMinutes(selectedShipment.etaMinutes)}</p>
              </div>
            </div>
          </SheetContent>
        ) : null}
      </Sheet>

      {mode === "base" ? (
        <div className="absolute bottom-3 left-3 z-10 rounded-md border border-slate-200 bg-white/95 px-3 py-2 text-[11px] text-slate-700 shadow-sm">
          <p className="font-semibold text-slate-900">Route Legend</p>
          <p>cyan: in transit | amber: delayed | blue: approved | gray: planned</p>
          <p>Click route or truck marker for shipment details.</p>
        </div>
      ) : null}
    </div>
  );
}
