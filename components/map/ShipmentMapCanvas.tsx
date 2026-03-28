"use client";

import mapboxgl, { type GeoJSONSource } from "mapbox-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Feature, FeatureCollection, LineString } from "geojson";
import type { Forecast, Hospital, Shipment } from "@/types/domain";

interface ShipmentMapCanvasProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  highlightedHospitalId?: string;
}

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const shipmentColor: Record<Shipment["status"], string> = {
  planned: "#94a3b8",
  approved: "#38bdf8",
  in_transit: "#22d3ee",
  delayed: "#f59e0b",
  delivered: "#10b981",
  cancelled: "#fb7185",
};

const ensureMapboxToken = () => {
  if (!mapboxgl.accessToken) {
    mapboxgl.accessToken = "no-token-required-for-external-style";
  }
};

const makeRouteGeoJson = (hospitals: Hospital[], shipments: Shipment[]): FeatureCollection<LineString> => {
  const byId = Object.fromEntries(hospitals.map((hospital) => [hospital.id, hospital]));

  const features = shipments.reduce<Array<Feature<LineString>>>((acc, shipment) => {
    const from = byId[shipment.fromHospitalId];
    const to = byId[shipment.toHospitalId];
    if (!from || !to) return acc;

    acc.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [from.coordinates, to.coordinates],
      },
      properties: {
        id: shipment.id,
        status: shipment.status,
      },
    });

    return acc;
  }, []);

  return {
    type: "FeatureCollection",
    features,
  };
};

export function ShipmentMapCanvas({ hospitals, shipments, forecasts, highlightedHospitalId }: ShipmentMapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const hospitalMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const shipmentMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const bounds = useMemo(() => {
    const mapBounds = new mapboxgl.LngLatBounds();
    hospitals.forEach((hospital) => mapBounds.extend(hospital.coordinates));
    return mapBounds;
  }, [hospitals]);

  const fallbackProjection = useMemo(() => {
    const lngs = hospitals.map((hospital) => hospital.coordinates[0]);
    const lats = hospitals.map((hospital) => hospital.coordinates[1]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const toPoint = ([lng, lat]: [number, number]) => {
      const x = ((lng - minLng) / Math.max(0.1, maxLng - minLng)) * 100;
      const y = 100 - ((lat - minLat) / Math.max(0.1, maxLat - minLat)) * 100;
      return { x, y };
    };

    return { toPoint };
  }, [hospitals]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    ensureMapboxToken();

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [25.3, 42.7],
      zoom: 6,
      pitch: 36,
      bearing: -9,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event) => {
      console.warn("Map renderer fallback enabled:", event?.error?.message ?? "unknown map error");
      setShowFallback(true);
    });

    map.on("load", () => {
      setMapLoaded(true);
      map.addSource("shipment-routes", {
        type: "geojson",
        data: makeRouteGeoJson(hospitals, shipments),
      });

      map.addLayer({
        id: "shipment-routes",
        type: "line",
        source: "shipment-routes",
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "in_transit",
            shipmentColor.in_transit,
            "delayed",
            shipmentColor.delayed,
            "approved",
            shipmentColor.approved,
            "delivered",
            shipmentColor.delivered,
            "planned",
            shipmentColor.planned,
            shipmentColor.cancelled,
          ],
          "line-width": 2,
          "line-opacity": 0.55,
        },
      });

      map.fitBounds(bounds, { padding: 60, duration: 1200 });
    });

    mapRef.current = map;
    const fallbackTimeout = window.setTimeout(() => {
      if (!mapLoaded) setShowFallback(true);
    }, 3500);

    return () => {
      window.clearTimeout(fallbackTimeout);
      shipmentMarkersRef.current.forEach((marker) => marker.remove());
      hospitalMarkersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, [bounds, hospitals, mapLoaded, shipments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const source = map.getSource("shipment-routes") as GeoJSONSource | undefined;
    if (source) {
      source.setData(makeRouteGeoJson(hospitals, shipments));
    }
  }, [hospitals, shipments]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    hospitalMarkersRef.current.forEach((marker) => marker.remove());
    hospitalMarkersRef.current = [];

    hospitals.forEach((hospital) => {
      const risk = forecasts
        .filter((forecast) => forecast.hospitalId === hospital.id)
        .reduce((max, forecast) => Math.max(max, forecast.shortageRiskScore), 0);

      const el = document.createElement("div");
      el.className = "hospital-node";
      el.style.width = highlightedHospitalId === hospital.id ? "18px" : "14px";
      el.style.height = highlightedHospitalId === hospital.id ? "18px" : "14px";
      el.style.borderRadius = "999px";
      el.style.border = highlightedHospitalId === hospital.id ? "2px solid #67e8f9" : "1px solid rgba(241,245,249,0.75)";
      el.style.background = risk > 80 ? "#fb7185" : risk > 60 ? "#fb923c" : risk > 35 ? "#facc15" : "#4ade80";
      el.style.boxShadow = highlightedHospitalId === hospital.id ? "0 0 24px rgba(34,211,238,.85)" : "0 0 14px rgba(15,23,42,.75)";

      const marker = new mapboxgl.Marker({ element: el }).setLngLat(hospital.coordinates).setPopup(
        new mapboxgl.Popup({ offset: 10 }).setHTML(
          `<div style="font-family:system-ui;color:#0f172a"><strong>${hospital.name}</strong><br/>${hospital.city}<br/>Peak risk: ${Math.round(risk)}</div>`,
        ),
      );

      marker.addTo(map);
      hospitalMarkersRef.current.push(marker);
    });
  }, [forecasts, highlightedHospitalId, hospitals]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingById = new Map<string, mapboxgl.Marker>();
    shipmentMarkersRef.current.forEach((marker) => {
      const shipmentId = marker.getElement().dataset.shipmentId;
      if (shipmentId) existingById.set(shipmentId, marker);
    });

    const activeIds = new Set<string>();
    const updatedMarkers: mapboxgl.Marker[] = [];

    shipments.forEach((shipment) => {
      activeIds.add(shipment.id);
      const existing = existingById.get(shipment.id);
      if (existing) {
        const el = existing.getElement();
        el.style.background = shipmentColor[shipment.status];
        el.style.boxShadow = `0 0 16px ${shipmentColor[shipment.status]}`;
        existing.setLngLat(shipment.currentCoordinates);
        updatedMarkers.push(existing);
        return;
      }

      const el = document.createElement("div");
      el.dataset.shipmentId = shipment.id;
      el.style.width = "11px";
      el.style.height = "11px";
      el.style.borderRadius = "999px";
      el.style.background = shipmentColor[shipment.status];
      el.style.boxShadow = `0 0 16px ${shipmentColor[shipment.status]}`;

      const marker = new mapboxgl.Marker({ element: el }).setLngLat(shipment.currentCoordinates).setPopup(
        new mapboxgl.Popup({ offset: 8 }).setHTML(
          `<div style="font-family:system-ui;color:#0f172a"><strong>${shipment.bloodType} · ${shipment.quantity}u</strong><br/>Status: ${shipment.status.replaceAll("_", " ")}<br/>ETA: ${Math.round(shipment.etaMinutes)}m</div>`,
        ),
      );

      marker.addTo(map);
      updatedMarkers.push(marker);
    });

    existingById.forEach((marker, shipmentId) => {
      if (!activeIds.has(shipmentId)) {
        marker.remove();
      }
    });

    shipmentMarkersRef.current = updatedMarkers;
  }, [shipments]);

  if (showFallback || !mapLoaded) {
    const hospitalById = Object.fromEntries(hospitals.map((hospital) => [hospital.id, hospital]));

    return (
      <div className="relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_10%_20%,rgba(34,211,238,.2),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(251,113,133,.2),transparent_35%),#030712]">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {shipments.map((shipment) => {
            const from = hospitalById[shipment.fromHospitalId];
            const to = hospitalById[shipment.toHospitalId];
            if (!from || !to) return null;
            const start = fallbackProjection.toPoint(from.coordinates);
            const end = fallbackProjection.toPoint(to.coordinates);
            const current = fallbackProjection.toPoint(shipment.currentCoordinates);

            return (
              <g key={shipment.id}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={shipmentColor[shipment.status]}
                  strokeWidth="0.35"
                  opacity="0.5"
                />
                <circle cx={current.x} cy={current.y} r="0.95" fill={shipmentColor[shipment.status]}>
                  <animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}
        </svg>

        {hospitals.map((hospital) => {
          const risk = forecasts
            .filter((forecast) => forecast.hospitalId === hospital.id)
            .reduce((max, forecast) => Math.max(max, forecast.shortageRiskScore), 0);
          const point = fallbackProjection.toPoint(hospital.coordinates);

          return (
            <div
              key={hospital.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <div
                className={`h-3.5 w-3.5 rounded-full border ${highlightedHospitalId === hospital.id ? "border-cyan-300" : "border-white/40"}`}
                style={{ background: risk > 80 ? "#fb7185" : risk > 60 ? "#fb923c" : risk > 35 ? "#facc15" : "#4ade80" }}
              />
              <p className="mt-1 text-[10px] text-slate-200/90">{hospital.city}</p>
            </div>
          );
        })}

        <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-slate-300">
          Simulation routing view
        </div>
      </div>
    );
  }

  return <div ref={mapContainerRef} className="h-full w-full" aria-label="Shipment tracking map" />;
}
