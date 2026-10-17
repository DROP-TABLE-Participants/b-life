"use client";

import dynamic from "next/dynamic";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import type { Hospital, Shipment } from "@/types/domain";

const MapCanvas = dynamic(() => import("@/components/map/ShipmentMapCanvas").then((mod) => mod.ShipmentMapCanvas), {
  ssr: false,
  loading: () => <AppLoadingScreen overlay />,
});

const PUBLIC_MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm5zYXZvdiIsImEiOiJjbTh1MzJmazEwaHhtMmlwZTk4djVyZDNrIn0.CIA7aiohbblSvgw6-4COLg";

interface NetworkMapPanelProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  highlightedHospitalId?: string;
}

export function NetworkMapPanel({ hospitals, shipments, highlightedHospitalId }: NetworkMapPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/88 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-900">Кръвоснабдяване в България</h3>
          <p className="text-xs text-slate-500">Изберете обект за наличности или маршрут за подробности за пратката.</p>
        </div>
      </div>
      <MapCanvas
        hospitals={hospitals}
        shipments={shipments}
        highlightedHospitalId={highlightedHospitalId}
        mapboxToken={PUBLIC_MAPBOX_TOKEN}
      />
    </section>
  );
}
