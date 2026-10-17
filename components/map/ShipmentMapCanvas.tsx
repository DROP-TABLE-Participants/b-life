"use client";

import { useEffect, useRef, useState } from "react";
import MapView, { Layer, Marker, NavigationControl, Source, type LayerProps, type MapRef, type MapMouseEvent } from "react-map-gl/mapbox";
import type { FeatureCollection, LineString } from "geojson";
import { Building2, Hospital as HospitalIcon, Truck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { FACILITY_ROLE_LABELS } from "@/lib/access";
import { BULGARIA_BOUNDARY, BULGARIA_BOUNDS, BULGARIA_MAX_BOUNDS, OUTSIDE_BULGARIA_MASK } from "@/lib/geo/bulgaria";
import { MAP_LOCALE, PRIORITY_LABELS, SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { formatHospitalLabel, formatMinutes } from "@/lib/utils";
import { BLOOD_TYPES, type Hospital, type Shipment } from "@/types/domain";
import "mapbox-gl/dist/mapbox-gl.css";

interface ShipmentMapCanvasProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  highlightedHospitalId?: string;
  mapboxToken: string;
}

const routeColors = { planned: "#64748b", approved: "#0284c7", in_transit: "#06b6d4", delayed: "#d97706", delivered: "#10b981", cancelled: "#94a3b8" };
const routeLayer: LayerProps = {
  id: "active-shipment-routes", type: "line", layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-width": 4, "line-opacity": 0.8, "line-color": ["get", "color"] },
};
const routeHitLayer: LayerProps = { id: "active-shipment-routes-hit", type: "line", paint: { "line-width": 20, "line-opacity": 0 } };
const pairKey = (shipment: Shipment) => `${shipment.fromHospitalId}->${shipment.toHospitalId}`;
const shortLabel = (facility: Hospital) => facility.kind === "national_center" ? `НЦТХ · ${facility.city}` : facility.kind === "regional_center" ? `РЦТХ · ${facility.city}` : `Света София · ${facility.city}`;

const positionOnRoute = (points: [number, number][], progress: number): [number, number] => {
  const lengths = points.slice(1).map((point, index) => Math.hypot(point[0] - points[index][0], point[1] - points[index][1]));
  let remaining = lengths.reduce((sum, value) => sum + value, 0) * Math.min(1, Math.max(0, progress));
  for (let index = 0; index < lengths.length; index++) {
    if (remaining <= lengths[index]) {
      const fraction = lengths[index] === 0 ? 0 : remaining / lengths[index];
      return [points[index][0] + (points[index + 1][0] - points[index][0]) * fraction, points[index][1] + (points[index + 1][1] - points[index][1]) * fraction];
    }
    remaining -= lengths[index];
  }
  return points[points.length - 1];
};

export function ShipmentMapCanvas({ hospitals, shipments, highlightedHospitalId, mapboxToken }: ShipmentMapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Record<string, [number, number][]>>({});
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const hospitalById = new Map(hospitals.map((facility) => [facility.id, facility]));
  const activeShipments = shipments.filter((item) => item.status !== "delivered" && item.status !== "cancelled" &&
    (!highlightedHospitalId || item.fromHospitalId === highlightedHospitalId || item.toHospitalId === highlightedHospitalId));
  const pairs = new Map(activeShipments.map((item) => [pairKey(item), {
    key: pairKey(item), from: hospitalById.get(item.fromHospitalId)?.coordinates, to: hospitalById.get(item.toHospitalId)?.coordinates,
  }]));
  const routePairsKey = JSON.stringify([...pairs.values()]);

  useEffect(() => {
    const controller = new AbortController();
    const routePairs = JSON.parse(routePairsKey) as Array<{ key: string; from?: [number, number]; to?: [number, number] }>;
    void Promise.all(routePairs.map(async ({ key, from, to }) => {
      if (!from || !to) return null;
      let coordinates: [number, number][] = [from, to];
      if (mapboxToken) {
        try {
          const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${from.join(",")};${to.join(",")}?geometries=geojson&overview=full&access_token=${mapboxToken}`, { signal: controller.signal });
          if (response.ok) {
            const result = await response.json() as { routes?: Array<{ geometry?: { coordinates?: [number, number][] } }> };
            if ((result.routes?.[0]?.geometry?.coordinates?.length ?? 0) > 1) coordinates = result.routes![0].geometry!.coordinates!;
          }
        } catch { /* Keep the direct route when directions are unavailable. */ }
      }
      return [key, coordinates] as const;
    })).then((results) => {
      if (!controller.signal.aborted) setRouteCoordinates(Object.fromEntries(results.filter((item) => item !== null)));
    });
    return () => controller.abort();
  }, [mapboxToken, routePairsKey]);

  const routeFor = (shipment: Shipment): [number, number][] | null => {
    const from = hospitalById.get(shipment.fromHospitalId);
    const to = hospitalById.get(shipment.toHospitalId);
    return from && to ? routeCoordinates[pairKey(shipment)] ?? [from.coordinates, to.coordinates] : null;
  };
  const routes: FeatureCollection<LineString> = { type: "FeatureCollection", features: activeShipments.flatMap((shipment) => {
    const coordinates = routeFor(shipment);
    return coordinates ? [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates }, properties: { shipmentId: shipment.id, color: routeColors[shipment.status] } }] : [];
  }) };
  const selectedHospital = hospitalById.get(selectedHospitalId ?? "");
  const selectedShipment = activeShipments.find((item) => item.id === selectedShipmentId);
  const chooseHospital = (id: string) => { setSelectedHospitalId(id); setSelectedShipmentId(null); };
  const chooseShipment = (id: string) => { setSelectedShipmentId(id); setSelectedHospitalId(null); };
  const resetView = () => mapRef.current?.fitBounds(BULGARIA_BOUNDS, { padding: 44, maxZoom: 7.2, duration: 500 });
  const onMapClick = (event: MapMouseEvent) => {
    const shipmentId = event.features?.[0]?.properties?.shipmentId;
    if (shipmentId) chooseShipment(String(shipmentId));
  };

  return <div>
    {!mapReady && !mapError && <AppLoadingScreen overlay />}
    <div className="relative h-[420px] w-full overflow-hidden bg-slate-100 sm:h-[560px] [&_.mapboxgl-ctrl-logo]:hidden">
      <MapView ref={mapRef} mapboxAccessToken={mapboxToken} mapStyle="mapbox://styles/mapbox/light-v11"
        locale={MAP_LOCALE} language="bg" initialViewState={{ longitude: 25.4, latitude: 42.7, zoom: 6.4 }}
        maxBounds={BULGARIA_MAX_BOUNDS} minZoom={5.5} maxZoom={16} renderWorldCopies={false} attributionControl={false}
        style={{ width: "100%", height: "100%" }} interactiveLayerIds={["active-shipment-routes", "active-shipment-routes-hit"]}
        onClick={onMapClick} onLoad={() => { setMapError(false); mapRef.current?.fitBounds(BULGARIA_BOUNDS, { padding: 44, maxZoom: 7.2, duration: 0 }); }}
        onIdle={() => setMapReady(true)}
        onError={() => setMapError(true)}>
        <NavigationControl position="top-right" />
        <Source id="bulgaria-territory" type="geojson" data={BULGARIA_BOUNDARY}>
          <Layer id="bulgaria-tint" type="fill" paint={{ "fill-color": "#e8f4ef", "fill-opacity": 0.13 }} />
        </Source>
        <Source id="active-routes" type="geojson" data={routes}>
          <Layer {...routeHitLayer} /><Layer {...routeLayer} />
        </Source>
        <Source id="outside-bulgaria" type="geojson" data={OUTSIDE_BULGARIA_MASK}>
          <Layer id="outside-bulgaria-mask" type="fill" paint={{ "fill-color": "#f1f5f9", "fill-opacity": 1 }} />
        </Source>
        <Source id="bulgaria-border" type="geojson" data={BULGARIA_BOUNDARY}>
          <Layer id="bulgaria-border-line" type="line" paint={{ "line-color": "#94a3b8", "line-width": 2 }} />
        </Source>
        {activeShipments.filter((item) => item.status === "in_transit" || item.status === "delayed").map((shipment) => {
          const route = routeFor(shipment);
          if (!route) return null;
          const [longitude, latitude] = positionOnRoute(route, shipment.progress);
          return <Marker key={shipment.id} longitude={longitude} latitude={latitude} offset={[0, 22]}>
            <button type="button" aria-label={`Проследяване: ${shipment.bloodType}, ${shipment.quantity} единици`} title={`${formatHospitalLabel(hospitalById.get(shipment.fromHospitalId))} → ${formatHospitalLabel(hospitalById.get(shipment.toHospitalId))}`}
              className="rounded-full border-2 bg-white p-2 shadow-md" style={{ borderColor: routeColors[shipment.status], color: routeColors[shipment.status] }} onClick={(event) => { event.stopPropagation(); chooseShipment(shipment.id); }}><Truck size={17} /></button>
          </Marker>;
        })}
        {hospitals.map((facility) => {
          const Icon = facility.kind === "hospital" ? HospitalIcon : Building2;
          const color = facility.kind === "national_center" ? "#e85a39" : facility.kind === "regional_center" ? "#2563eb" : "#059669";
          return <Marker key={facility.id} longitude={facility.coordinates[0]} latitude={facility.coordinates[1]} anchor="bottom">
            <button type="button" aria-label={`Наличности: ${facility.name}`} title={facility.name}
              className="flex max-w-[180px] flex-col items-center gap-1 text-center" onClick={(event) => { event.stopPropagation(); chooseHospital(facility.id); }}>
              <span className="hidden rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm sm:block">{shortLabel(facility)}</span>
              <span className="rounded-full border-[3px] border-white p-2 text-white shadow-md" style={{ backgroundColor: color }}><Icon size={19} /></span>
            </button>
          </Marker>;
        })}
      </MapView>
      <button type="button" className="absolute left-3 top-3 rounded-lg border bg-white px-3 py-2 text-sm shadow-sm" onClick={resetView}>Цяла България</button>
      <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-fit max-w-[calc(100%-1.5rem)] space-y-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
        <p className="font-bold text-slate-900">Легенда на маршрутите</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {(["in_transit", "delayed", "approved", "planned"] as const).map((status) => <span key={status} className="inline-flex items-center gap-1.5"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: routeColors[status] }} />{SHIPMENT_STATUS_LABELS[status]}</span>)}
        </div>
        <p>Изберете маршрут или маркер за подробности за пратката.</p>
      </div>
    </div>
    {mapError && <p role="status" className="px-4 pt-3 text-sm text-amber-700">Фоновата карта не се зареди изцяло. Наличностите и списъкът с пратки остават достъпни по-долу.</p>}
    <div className="space-y-3 p-4">
      <p className="text-sm font-semibold">Обекти в мрежата</p>
      <div className="grid gap-2 sm:grid-cols-3">{hospitals.map((facility) => <button key={facility.id} type="button" className="rounded-xl border p-3 text-left text-sm hover:bg-slate-50" onClick={() => chooseHospital(facility.id)}><span className="block font-semibold">{facility.name}</span><span className="text-muted-foreground">{facility.city} · {FACILITY_ROLE_LABELS[facility.kind]}</span></button>)}</div>
      <p className="text-sm font-semibold">Текущи прехвърляния ({activeShipments.length})</p>
      {activeShipments.length === 0 && <p className="text-sm text-muted-foreground">Няма активни пратки.</p>}
      <div className="grid gap-2 md:grid-cols-2">{activeShipments.map((shipment) => <button key={shipment.id} type="button" className="space-y-1 rounded-xl border p-3 text-left text-sm hover:bg-slate-50" onClick={() => chooseShipment(shipment.id)}>
        <span className="block font-semibold">{shipment.bloodType} · {shipment.quantity} ед. · {SHIPMENT_STATUS_LABELS[shipment.status]}</span>
        <span className="block">От {formatHospitalLabel(hospitalById.get(shipment.fromHospitalId))}</span><span className="block">До {formatHospitalLabel(hospitalById.get(shipment.toHospitalId))}</span>
        <span className="block text-muted-foreground">Очаквано пристигане {formatMinutes(shipment.etaMinutes)}</span>
      </button>)}</div>
    </div>
    <Sheet open={!!selectedHospital} onOpenChange={(open) => { if (!open) setSelectedHospitalId(null); }}>
      {selectedHospital && <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-lg">
        <SheetHeader className="pr-8"><SheetTitle>{selectedHospital.name}</SheetTitle><SheetDescription>{FACILITY_ROLE_LABELS[selectedHospital.kind]} · {selectedHospital.city}</SheetDescription></SheetHeader>
        <h2 className="text-base font-semibold">Кръвни наличности</h2>
        <div className="grid grid-cols-2 gap-3">{BLOOD_TYPES.map((type) => <div key={type} className="flex items-center justify-between rounded-xl border p-3"><span className="font-semibold">{type}</span><span>{selectedHospital.inventoryByBloodType[type] ?? 0} ед.</span></div>)}</div>
        <h2 className="mt-2 text-base font-semibold">Текущи пратки на обекта</h2>
        {activeShipments.filter((item) => item.fromHospitalId === selectedHospital.id || item.toHospitalId === selectedHospital.id).map((item) => <button key={item.id} type="button" className="space-y-1 rounded-xl border p-3 text-left text-sm" onClick={() => chooseShipment(item.id)}><span className="block font-semibold">{item.bloodType} · {item.quantity} ед. · {SHIPMENT_STATUS_LABELS[item.status]}</span><span className="block">{formatHospitalLabel(hospitalById.get(item.fromHospitalId))} → {formatHospitalLabel(hospitalById.get(item.toHospitalId))}</span></button>)}
        {!activeShipments.some((item) => item.fromHospitalId === selectedHospital.id || item.toHospitalId === selectedHospital.id) && <p className="text-sm text-muted-foreground">Няма активни пратки.</p>}
      </SheetContent>}
    </Sheet>
    <Sheet open={!!selectedShipment} onOpenChange={(open) => { if (!open) setSelectedShipmentId(null); }}>
      {selectedShipment && <SheetContent side="right" className="w-full overflow-y-auto p-5 sm:max-w-lg">
        <SheetHeader className="pr-8"><SheetTitle>Проследяване на пратката</SheetTitle><SheetDescription>{selectedShipment.bloodType} · {selectedShipment.quantity} ед.</SheetDescription></SheetHeader>
        <Badge variant="outline" className="w-fit">{SHIPMENT_STATUS_LABELS[selectedShipment.status]}</Badge>
        <div className="space-y-3 rounded-xl border p-4 text-sm"><p><strong>От:</strong> {formatHospitalLabel(hospitalById.get(selectedShipment.fromHospitalId))}</p><p><strong>До:</strong> {formatHospitalLabel(hospitalById.get(selectedShipment.toHospitalId))}</p></div>
        <p className="text-sm">Приоритет: {PRIORITY_LABELS[selectedShipment.priority]}</p><p className="text-sm">Очаквано пристигане: {formatMinutes(selectedShipment.etaMinutes)}</p><p className="text-sm">Напредък: {Math.round(selectedShipment.progress * 100)}%</p>
        {selectedShipment.progress >= 1 && <p className="text-sm text-amber-700">Пристигнала · очаква потвърждение за получаване</p>}
        <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-cyan-500" style={{ width: `${selectedShipment.progress * 100}%` }} /></div>
      </SheetContent>}
    </Sheet>
  </div>;
}
