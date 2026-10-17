"use client";

import dynamic from "next/dynamic";
import type { Forecast, Hospital, Shipment } from "@/types/domain";

const MapCanvas = dynamic(() => import("@/components/map/ShipmentMapCanvas").then((mod) => mod.ShipmentMapCanvas), {
  ssr: false,
});

const PUBLIC_MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm5zYXZvdiIsImEiOiJjbTh1MzJmazEwaHhtMmlwZTk4djVyZDNrIn0.CIA7aiohbblSvgw6-4COLg";

interface NetworkMapPanelProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  highlightedHospitalId?: string;
}

export function NetworkMapPanel({ hospitals, shipments, forecasts, highlightedHospitalId }: NetworkMapPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">Маршрути в реално време</h3>
          <p className="text-xs text-slate-500">Проследяване на пратките и риска по лечебни заведения</p>
        </div>
      </div>
      <MapCanvas
        hospitals={hospitals}
        shipments={shipments}
        forecasts={forecasts}
        highlightedHospitalId={highlightedHospitalId}
        mapboxToken={PUBLIC_MAPBOX_TOKEN}
      />
    </section>
  );
}
