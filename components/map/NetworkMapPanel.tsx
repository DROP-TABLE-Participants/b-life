"use client";

import dynamic from "next/dynamic";
import type { Forecast, Hospital, Shipment } from "@/types/domain";

const MapCanvas = dynamic(() => import("@/components/map/ShipmentMapCanvas").then((mod) => mod.ShipmentMapCanvas), {
  ssr: false,
});

interface NetworkMapPanelProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  highlightedHospitalId?: string;
}

export function NetworkMapPanel({ hospitals, shipments, forecasts, highlightedHospitalId }: NetworkMapPanelProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-[0_24px_80px_rgba(2,8,23,0.5)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Live Network Routing</h3>
          <p className="text-xs text-slate-300">Animated shipment telemetry and hospital risk nodes</p>
        </div>
      </div>
      <MapCanvas
        hospitals={hospitals}
        shipments={shipments}
        forecasts={forecasts}
        highlightedHospitalId={highlightedHospitalId}
      />
    </section>
  );
}
