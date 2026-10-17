"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import MapView, { Layer, Marker, Source, type LayerProps, type LineLayerSpecification, type MapRef, type MapMouseEvent } from "react-map-gl/mapbox";
import type { FeatureCollection, LineString } from "geojson";
import { Building2, ChartNoAxesCombined, Hospital as HospitalIcon, Minus, PanelLeftClose, PanelLeftOpen, Plus, Scan, Send, Sparkles, Truck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { canManageRecommendation, FACILITY_ROLE_LABELS } from "@/lib/access";
import { BULGARIA_BOUNDARY, BULGARIA_BOUNDS, BULGARIA_MAX_BOUNDS, OUTSIDE_BULGARIA_MASK } from "@/lib/geo/bulgaria";
import { facilityOutlook, formatHours, PLANNING_HORIZON } from "@/lib/insights";
import { MAP_LOCALE, PRIORITY_LABELS } from "@/lib/labels";
import { facilityShortName } from "@/lib/transfers";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { BLOOD_TYPES, type Forecast, type Hospital, type Shipment, type TransferRecommendation } from "@/types/domain";
import "mapbox-gl/dist/mapbox-gl.css";

interface ShipmentMapCanvasProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  workspaceBase: string;
  highlightedHospitalId?: string;
  mapboxToken: string;
}

const SHEET_WIDTH = 460;
const BRAND = "#e85a39";
const DELAYED = "#b45309";
const PENDING = "#94a3b8";
const FACILITY_COLORS: Record<Hospital["kind"], string> = { national_center: "#e85a39", regional_center: "#2563eb", hospital: "#059669" };
const moving = (shipment: Shipment) => shipment.status === "in_transit" || shipment.status === "delayed";

// Opacity is a number or a Mapbox expression that dims everything except the hovered route.
type LineOpacity = NonNullable<NonNullable<LineLayerSpecification["paint"]>["line-opacity"]>;
const routeGlowLayer = (opacity: LineOpacity): LayerProps => ({
  id: "active-shipment-routes-glow", type: "line", filter: ["==", ["get", "moving"], true], layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-width": 10, "line-opacity": opacity, "line-color": ["get", "color"] },
});
const routeLayer = (opacity: LineOpacity): LayerProps => ({
  id: "active-shipment-routes", type: "line", filter: ["==", ["get", "moving"], true], layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-width": 3.5, "line-opacity": opacity, "line-color": ["get", "color"] },
});
// Approved and planned shipments have not left yet: a quiet dashed line.
const pendingRouteLayer = (opacity: LineOpacity): LayerProps => ({
  id: "pending-shipment-routes", type: "line", filter: ["==", ["get", "moving"], false], layout: { "line-cap": "round", "line-join": "round" },
  paint: { "line-width": 2, "line-opacity": opacity, "line-color": PENDING, "line-dasharray": [2, 2] },
});
const routeHitLayer: LayerProps = { id: "active-shipment-routes-hit", type: "line", paint: { "line-width": 20, "line-opacity": 0 } };
const pairKey = (shipment: Shipment) => `${shipment.fromHospitalId}->${shipment.toHospitalId}`;
const shortLabel = (facility: Hospital) => facility.kind === "national_center" ? `НЦТХ · ${facility.city}` : facility.kind === "regional_center" ? `РЦТХ · ${facility.city}` : `Света София · ${facility.city}`;
const FacilityIcon = ({ facility, size }: { facility: Hospital; size: number }) => facility.kind === "hospital" ? <HospitalIcon size={size} /> : <Building2 size={size} />;

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

const glass = "rounded-2xl border border-glass-border bg-glass-strong shadow-popover backdrop-blur-xl";

export function ShipmentMapCanvas({ hospitals, shipments, forecasts, recommendations, workspaceBase, highlightedHospitalId, mapboxToken }: ShipmentMapCanvasProps) {
  const mapRef = useRef<MapRef | null>(null);
  const session = useAppStore((state) => state.session);
  const approveRecommendation = useAppStore((state) => state.approveRecommendation);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<Record<string, [number, number][]>>({});
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [hover, setHover] = useState<{ ids: string[]; x: number; y: number; width: number; height: number } | null>(null);
  const hospitalById = new Map(hospitals.map((facility) => [facility.id, facility]));
  const activeShipments = shipments.filter((item) => item.status !== "delivered" && item.status !== "cancelled" &&
    (!highlightedHospitalId || item.fromHospitalId === highlightedHospitalId || item.toHospitalId === highlightedHospitalId));
  const pairs = new Map(activeShipments.map((item) => [pairKey(item), {
    key: pairKey(item), from: hospitalById.get(item.fromHospitalId)?.coordinates, to: hospitalById.get(item.toHospitalId)?.coordinates,
  }]));
  const routePairsKey = JSON.stringify([...pairs.values()]);
  const shortagesByFacility = new Map(hospitals.map((facility) => [facility.id, facilityOutlook(facility, forecasts, shipments).rows.filter((row) => row.firstShortageHour !== null)]));

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
    return coordinates ? [{ type: "Feature" as const, geometry: { type: "LineString" as const, coordinates },
      properties: { shipmentId: shipment.id, moving: moving(shipment), color: shipment.status === "delayed" ? DELAYED : BRAND } }] : [];
  }) };
  const selectedHospital = hospitalById.get(selectedHospitalId ?? "");
  const selectedShipment = activeShipments.find((item) => item.id === selectedShipmentId);
  const resetView = (padding = 44) => mapRef.current?.fitBounds(BULGARIA_BOUNDS, { padding, maxZoom: 7.2, duration: 500 });
  const chooseHospital = (id: string) => {
    setSelectedHospitalId(id);
    setSelectedShipmentId(null);
    const facility = hospitalById.get(id);
    // Keep the selected facility visible next to the sheet.
    if (facility) mapRef.current?.easeTo({ center: facility.coordinates, padding: { top: 0, bottom: 0, left: 0, right: SHEET_WIDTH }, duration: 500 });
  };
  const chooseShipment = (id: string) => { setSelectedShipmentId(id); setSelectedHospitalId(null); };
  const closeHospital = () => { setSelectedHospitalId(null); mapRef.current?.easeTo({ padding: { top: 0, bottom: 0, left: 0, right: 0 }, duration: 400 }); };
  const onMapClick = (event: MapMouseEvent) => {
    const shipmentId = event.features?.[0]?.properties?.shipmentId;
    if (shipmentId) chooseShipment(String(shipmentId));
  };
  const name = (id: string) => facilityShortName(hospitalById.get(id));
  const onMapHover = (event: MapMouseEvent) => {
    const ids = [...new Set((event.features ?? []).map((feature) => String(feature.properties?.shipmentId ?? "")).filter(Boolean))];
    const container = event.target.getContainer();
    setHover(ids.length ? { ids, x: event.point.x, y: event.point.y, width: container.clientWidth, height: container.clientHeight } : null);
  };
  // The hovered route stays fully drawn and thicker; the others step back.
  const hoveredId = hover?.ids[0] ?? "";
  const emphasis = (opacity: number): LineOpacity => hover
    ? ["case", ["in", ["get", "shipmentId"], ["literal", hover.ids]], opacity, opacity * 0.3]
    : opacity;
  const hoveredRouteLayer: LayerProps = {
    id: "hovered-shipment-route", type: "line", filter: ["==", ["get", "shipmentId"], hoveredId], layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-width": 6, "line-opacity": 1, "line-color": ["case", ["get", "moving"], ["get", "color"], "#64748b"] },
  };
  const hoveredCasingLayer: LayerProps = {
    id: "hovered-shipment-route-casing", type: "line", filter: ["==", ["get", "shipmentId"], hoveredId], layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-width": 11, "line-opacity": 0.9, "line-color": "#ffffff" },
  };

  return <div className="absolute inset-0">
    {!mapReady && !mapError && <AppLoadingScreen overlay />}
    <div className="absolute inset-0 bg-canvas [&_.mapboxgl-ctrl-logo]:hidden">
      <MapView ref={mapRef} mapboxAccessToken={mapboxToken} mapStyle="mapbox://styles/mapbox/light-v11"
        locale={MAP_LOCALE} language="bg" initialViewState={{ longitude: 25.4, latitude: 42.7, zoom: 6.4 }}
        maxBounds={BULGARIA_MAX_BOUNDS} minZoom={5.5} maxZoom={16} renderWorldCopies={false} attributionControl={false}
        style={{ width: "100%", height: "100%" }} interactiveLayerIds={["active-shipment-routes", "active-shipment-routes-hit"]}
        onClick={onMapClick} onMouseMove={onMapHover} onMouseLeave={() => setHover(null)} cursor={hover ? "pointer" : undefined} onLoad={() => { setMapError(false); mapRef.current?.fitBounds(BULGARIA_BOUNDS, { padding: { top: 60, bottom: 60, left: 400, right: 60 }, maxZoom: 7.2, duration: 0 }); }}
        onIdle={() => setMapReady(true)}
        onError={() => setMapError(true)}>
        <Source id="bulgaria-territory" type="geojson" data={BULGARIA_BOUNDARY}>
          <Layer id="bulgaria-tint" type="fill" paint={{ "fill-color": "#ffffff", "fill-opacity": 0.35 }} />
        </Source>
        <Source id="active-routes" type="geojson" data={routes}>
          <Layer {...routeHitLayer} />
          <Layer {...pendingRouteLayer(emphasis(0.9))} />
          <Layer {...routeGlowLayer(emphasis(0.16))} />
          <Layer {...routeLayer(emphasis(0.95))} />
          <Layer {...hoveredCasingLayer} /><Layer {...hoveredRouteLayer} />
        </Source>
        <Source id="outside-bulgaria" type="geojson" data={OUTSIDE_BULGARIA_MASK}>
          <Layer id="outside-bulgaria-mask" type="fill" paint={{ "fill-color": "#f8fafc", "fill-opacity": 1 }} />
        </Source>
        <Source id="bulgaria-border" type="geojson" data={BULGARIA_BOUNDARY}>
          <Layer id="bulgaria-border-line" type="line" paint={{ "line-color": "#94a3b8", "line-width": 1.5 }} />
        </Source>
        {activeShipments.filter(moving).map((shipment) => {
          const route = routeFor(shipment);
          if (!route) return null;
          const [longitude, latitude] = positionOnRoute(route, shipment.progress);
          const color = shipment.status === "delayed" ? DELAYED : BRAND;
          return <Marker key={shipment.id} longitude={longitude} latitude={latitude}>
            <button type="button" aria-label={`Проследяване: ${shipment.bloodType}, ${shipment.quantity} единици`}
              className={cn("flex size-8 items-center justify-center rounded-full border-2 bg-white shadow-popover transition-transform", hover?.ids.includes(shipment.id) && "scale-115")} style={{ borderColor: color, color }}
              onMouseEnter={() => { const point = mapRef.current?.project([longitude, latitude]); const container = mapRef.current?.getContainer(); if (point && container) setHover({ ids: [shipment.id], x: point.x, y: point.y, width: container.clientWidth, height: container.clientHeight }); }}
              onMouseLeave={() => setHover(null)}
              onClick={(event) => { event.stopPropagation(); chooseShipment(shipment.id); }}><Truck size={15} /></button>
          </Marker>;
        })}
        {hospitals.map((facility) => <Marker key={facility.id} longitude={facility.coordinates[0]} latitude={facility.coordinates[1]} anchor="bottom">
          <button type="button" aria-label={`Наличности: ${facility.name}`} title={facility.name}
            className="flex max-w-[180px] flex-col items-center gap-1 text-center" onClick={(event) => { event.stopPropagation(); chooseHospital(facility.id); }}>
            <span className="hidden rounded-lg border border-slate-200 bg-white/95 px-2 py-1 text-xs font-semibold text-slate-900 shadow-sm sm:block">{shortLabel(facility)}</span>
            <span className={cn("rounded-full border-[3px] border-white p-2 text-white shadow-md", selectedHospitalId === facility.id && "ring-2 ring-ink ring-offset-2")} style={{ backgroundColor: FACILITY_COLORS[facility.kind] }}>
              <FacilityIcon facility={facility} size={19} />
            </span>
          </button>
        </Marker>)}
      </MapView>
    </div>

    <div className="pointer-events-none absolute top-6 left-6 flex w-[360px] max-w-[calc(100%-3rem)] flex-col gap-3">
      {!selectedHospital && panelCollapsed && <button type="button" onClick={() => setPanelCollapsed(false)} aria-expanded={false}
        className={cn(glass, "pointer-events-auto inline-flex w-fit items-center gap-2 px-4 py-2.5 text-xs font-medium text-ink hover:bg-white")}>
        <PanelLeftOpen className="size-4 text-ink-secondary" />Обекти и пратки
        <span className="text-ink-muted">{hospitals.length} · {activeShipments.length}</span>
      </button>}
      {!selectedHospital && !panelCollapsed && <div className={cn(glass, "pointer-events-auto max-h-[calc(100dvh-120px)] overflow-y-auto px-2 py-3")}>
        <div className="flex items-center justify-between pr-1 pl-3">
          <p className="flex gap-1.5 pt-1 pb-1.5 text-xs font-medium text-ink-secondary">Обекти<span className="font-normal text-ink-muted">{hospitals.length}</span></p>
          <Button variant="ghost" size="icon-sm" aria-label="Скриване на панела" aria-expanded onClick={() => setPanelCollapsed(true)}><PanelLeftClose /></Button>
        </div>
        {hospitals.map((facility) => {
          const short = shortagesByFacility.get(facility.id) ?? [];
          return <button key={facility.id} type="button" onClick={() => chooseHospital(facility.id)}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-white shadow-control" style={{ backgroundColor: FACILITY_COLORS[facility.kind] }}><FacilityIcon facility={facility} size={15} /></span>
            <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-ink">{facility.name}</span><span className="block text-xs text-ink-secondary">{FACILITY_ROLE_LABELS[facility.kind]} · {facility.city}</span></span>
            <span className={cn("text-xs", short.length >= 3 ? "text-critical" : short.length ? "text-elevated" : "text-ink-muted")}>{short.length ? `${short.length} ${short.length === 1 ? "група" : "групи"}` : "Без недостиг"}</span>
          </button>;
        })}
        <div className="my-2 border-t border-hairline" />
        <p className="flex gap-1.5 px-3 pb-1.5 text-xs font-medium text-ink-secondary">Активни пратки<span className="font-normal text-ink-muted">{activeShipments.length}</span></p>
        {activeShipments.length === 0 && <p className="px-3 pb-2 text-xs text-ink-muted">Няма активни пратки.</p>}
        {activeShipments.map((item) => <button key={item.id} type="button" onClick={() => chooseShipment(item.id)} className="w-full rounded-xl px-3 py-2 text-left hover:bg-white">
          <span className="flex justify-between gap-3 text-xs"><span className="font-medium text-ink">{item.bloodType} · {item.quantity} ед. {name(item.fromHospitalId)} → {name(item.toHospitalId)}</span>
            <span className={item.status === "delayed" ? "text-elevated" : "text-ink-secondary"}>{!moving(item) ? "очаква изпращане" : item.progress >= 1 ? "пристигна" : `~${formatMinutes(item.etaMinutes)}`}</span></span>
        </button>)}
      </div>}
    </div>

    <div className="absolute bottom-6 flex flex-col items-end gap-3 transition-[right] duration-300" style={{ right: selectedHospital ? SHEET_WIDTH + 34 : 24 }}>
      <div className={cn(glass, "flex flex-col p-1")}>
        <Button variant="ghost" size="icon" aria-label="Приближаване" onClick={() => mapRef.current?.zoomIn()}><Plus /></Button>
        <Button variant="ghost" size="icon" aria-label="Отдалечаване" onClick={() => mapRef.current?.zoomOut()}><Minus /></Button>
        <Button variant="ghost" size="icon" aria-label="Цяла България" onClick={() => resetView()}><Scan /></Button>
      </div>
    </div>
    {hover && <RouteTooltip x={hover.x} y={hover.y} width={hover.width} height={hover.height}
      shipments={hover.ids.map((id) => activeShipments.find((item) => item.id === id)).filter((item): item is Shipment => !!item).sort((a, b) => Number(moving(b)) - Number(moving(a)))} name={name} />}
    {mapError && <p role="status" className={cn(glass, "absolute bottom-6 left-6 px-4 py-2 text-xs text-elevated")}>Фоновата карта не се зареди изцяло. Обектите и пратките остават достъпни.</p>}

    <Sheet open={!!selectedHospital} onOpenChange={(open) => { if (!open) closeHospital(); }}>
      {selectedHospital && <FacilitySheet facility={selectedHospital} hospitals={hospitals} forecasts={forecasts} shipments={shipments} activeShipments={activeShipments}
        recommendations={recommendations} workspaceBase={workspaceBase} canAct={session.mode !== "control_tower" && selectedHospital.id !== highlightedHospitalId}
        canApprove={(item) => canManageRecommendation(session, item)} onApprove={approveRecommendation} onShipment={chooseShipment} />}
    </Sheet>
    <Sheet open={!!selectedShipment} onOpenChange={(open) => { if (!open) setSelectedShipmentId(null); }}>
      {selectedShipment && <SheetContent side="right" className="gap-4 overflow-y-auto p-6 data-[side=right]:sm:max-w-[440px]">
        <SheetHeader className="p-0 pr-10"><SheetTitle className="text-lg font-semibold text-ink">Проследяване на пратката</SheetTitle><SheetDescription>{selectedShipment.bloodType} · {selectedShipment.quantity} ед.</SheetDescription></SheetHeader>
        <StatusBadge status={selectedShipment.status} />
        <div className="space-y-2 rounded-xl border border-hairline bg-white p-4 text-sm"><p><span className="text-ink-secondary">От:</span> {formatHospitalLabel(hospitalById.get(selectedShipment.fromHospitalId))}</p><p><span className="text-ink-secondary">До:</span> {formatHospitalLabel(hospitalById.get(selectedShipment.toHospitalId))}</p></div>
        <dl className="space-y-1 text-sm"><div className="flex justify-between"><dt className="text-ink-secondary">Приоритет</dt><dd>{PRIORITY_LABELS[selectedShipment.priority]}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-secondary">Очаквано пристигане</dt><dd>{formatMinutes(selectedShipment.etaMinutes)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-secondary">Напредък</dt><dd>{Math.round(selectedShipment.progress * 100)}%</dd></div></dl>
        {selectedShipment.progress >= 1 && <p className="text-sm text-elevated">Пристигнала · очаква потвърждение за получаване</p>}
        <div className="h-2 overflow-hidden rounded-full bg-hairline"><div className="h-full rounded-full bg-brand" style={{ width: `${selectedShipment.progress * 100}%` }} /></div>
      </SheetContent>}
    </Sheet>
  </div>;
}

interface FacilitySheetProps {
  facility: Hospital;
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  activeShipments: Shipment[];
  recommendations: TransferRecommendation[];
  workspaceBase: string;
  canAct: boolean;
  canApprove: (item: TransferRecommendation) => boolean;
  onApprove: (id: string) => void;
  onShipment: (id: string) => void;
}

function FacilitySheet({ facility, hospitals, forecasts, shipments, activeShipments, recommendations, workspaceBase, canAct, canApprove, onApprove, onShipment }: FacilitySheetProps) {
  const rows = facilityOutlook(facility, forecasts, shipments).rows;
  const short = rows.filter((row) => row.firstShortageHour !== null).sort((a, b) => a.firstShortageHour! - b.firstShortageHour!);
  const name = (id: string) => facilityShortName(hospitals.find((item) => item.id === id));
  const advice = recommendations.filter((item) => item.status === "pending_approval" && (item.toHospitalId === facility.id || item.fromHospitalId === facility.id));
  const transfers = activeShipments.filter((item) => item.fromHospitalId === facility.id || item.toHospitalId === facility.id);
  return <SheetContent side="right" className="gap-0 p-0 data-[side=right]:sm:max-w-[440px]" overlayClassName="bg-ink/5 supports-backdrop-filter:backdrop-blur-none">
    <SheetHeader className="flex-row items-start gap-3.5 px-6 pt-6 pb-4 pr-14">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-[3px] border-white text-white shadow-popover" style={{ backgroundColor: FACILITY_COLORS[facility.kind] }}><FacilityIcon facility={facility} size={20} /></span>
      <div><SheetTitle className="text-lg font-semibold text-ink">{facility.name}</SheetTitle>
        <SheetDescription className="text-xs text-ink-secondary">{FACILITY_ROLE_LABELS[facility.kind]} · {facility.city}{facility.regionalCenterId ? ` · към ${name(facility.regionalCenterId)}` : ""}</SheetDescription></div>
    </SheetHeader>
    <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
      {short[0] && <p className="flex items-center gap-2 rounded-lg border border-critical-border bg-critical-soft px-3 py-2.5 text-xs font-medium text-critical">
        <span className="size-2 rounded-full bg-critical" />Недостиг на {short[0].bloodType} след {formatHours(short[0].firstShortageHour!)} · {short.length} от {rows.length} групи под нуждата</p>}
      <section className="space-y-2.5">
        <h2 className="text-base font-semibold text-ink">Наличности</h2>
        <div className="grid grid-cols-4 gap-2">{BLOOD_TYPES.map((type) => {
          const isShort = short.some((row) => row.bloodType === type);
          return <div key={type} className={cn("rounded-xl border px-3 py-2.5", isShort ? "border-critical-border bg-critical-soft" : "border-hairline bg-white")}>
            <p className="flex items-center justify-between text-xs font-medium text-ink-secondary">{type}{isShort && <span className="size-1.5 rounded-full bg-critical" />}</p>
            <p className="text-lg font-semibold text-ink">{facility.inventoryByBloodType[type] ?? 0} <span className="text-xs font-normal text-ink-muted">ед.</span></p>
          </div>;
        })}</div>
      </section>
      {advice.length > 0 && <section className="space-y-1">
        <h2 className="flex gap-1.5 text-base font-semibold text-ink">Препоръки към обекта<span className="text-xs font-normal text-ink-muted">{advice.length}</span></h2>
        <div className="divide-y divide-hairline">{advice.map((item) => <div key={item.id} className="flex items-center gap-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-brand-soft text-brand"><Sparkles className="size-4" /></span>
          <span className="w-8 text-sm font-semibold text-ink">{item.bloodType}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{item.suggestedQuantity} ед. {name(item.fromHospitalId)} → {name(item.toHospitalId)}</span>
            <span className="block truncate text-xs text-ink-secondary">~{formatMinutes(item.etaMinutes)} път · увереност {item.confidenceScore}%</span></span>
          {canApprove(item) && <Button size="sm" variant="secondary" onClick={() => onApprove(item.id)}>Одобряване</Button>}
        </div>)}</div>
      </section>}
      <section className="space-y-1">
        <h2 className="flex gap-1.5 text-base font-semibold text-ink">Пратки<span className="text-xs font-normal text-ink-muted">{transfers.length}</span></h2>
        {transfers.length === 0 && <p className="text-sm text-ink-muted">Няма активни пратки.</p>}
        <div className="divide-y divide-hairline">{transfers.map((item) => <button key={item.id} type="button" onClick={() => onShipment(item.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
          <span className="w-8 text-sm font-semibold text-ink">{item.bloodType}</span>
          <span className="min-w-0 flex-1"><span className="block text-sm font-medium text-ink">{item.quantity} ед. {name(item.fromHospitalId)} → {name(item.toHospitalId)}</span>
            <span className="block text-xs text-ink-secondary">{moving(item) ? `Пристига след ~${formatMinutes(item.etaMinutes)}` : "Очаква изпращане"}</span></span>
          <StatusBadge status={item.status} />
        </button>)}</div>
      </section>
      <p className="text-xs text-ink-muted">Прогнозата обхваща следващите {PLANNING_HORIZON} ч.</p>
    </div>
    <SheetFooter className="flex-row border-t border-hairline px-6 pt-4 pb-6">
      <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href={`${workspaceBase}/forecast`} />}><ChartNoAxesCombined />Прогноза</Button>
      {canAct && <Button className="flex-1" nativeButton={false} render={<Link href={`${workspaceBase}/transfers?send=1&to=${facility.id}`} />}><Send />Изпращане към обекта</Button>}
    </SheetFooter>
  </SheetContent>;
}

function RouteTooltip({ x, y, width, height, shipments, name }: { x: number; y: number; width: number; height: number; shipments: Shipment[]; name: (id: string) => string }) {
  if (shipments.length === 0) return null;
  const tooltipWidth = 280;
  const flip = x + 16 + tooltipWidth > width - 16;
  // In the lower half the tooltip opens upwards so it stays inside the map.
  const above = y > height * 0.5;
  return <div role="tooltip" className={cn(glass, "pointer-events-none absolute z-20 w-[280px] divide-y divide-hairline px-3.5 py-1")}
    style={{ left: flip ? x - 16 - tooltipWidth : x + 16, ...(above ? { bottom: Math.max(12, height - y - 12) } : { top: Math.max(12, y - 12) }) }}>
    {shipments.slice(0, 3).map((item) => {
      const state = !moving(item) ? "Очаква изпращане" : item.progress >= 1 ? "Пристигна" : `Пристига след ~${formatMinutes(item.etaMinutes)}`;
      return <div key={item.id} className="space-y-1.5 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-ink">{item.bloodType} · {item.quantity} ед.</span>
          <StatusBadge status={item.status} />
        </div>
        <p className="text-xs text-ink-secondary">{name(item.fromHospitalId)} → {name(item.toHospitalId)}</p>
        <p className={cn("text-xs font-medium", item.status === "delayed" ? "text-elevated" : "text-ink")}>{state}</p>
      </div>;
    })}
    {shipments.length > 3 && <p className="py-2 text-xs text-ink-muted">Още {shipments.length - 3} по този маршрут</p>}
  </div>;
}
