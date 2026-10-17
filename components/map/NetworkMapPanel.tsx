"use client";

import dynamic from "next/dynamic";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { PUBLIC_MAPBOX_TOKEN } from "@/lib/map-config";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";

const MapCanvas = dynamic(() => import("@/components/map/ShipmentMapCanvas").then((mod) => mod.ShipmentMapCanvas), {
  ssr: false,
  loading: () => <AppLoadingScreen overlay />,
});

interface NetworkMapPanelProps {
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  workspaceBase: string;
  highlightedHospitalId?: string;
}

/** Full-bleed map inside the main panel; overlays float on top of it. */
export function NetworkMapPanel(props: NetworkMapPanelProps) {
  return (
    <section data-full-bleed className="relative min-h-[640px] flex-1 overflow-hidden">
      <MapCanvas {...props} mapboxToken={PUBLIC_MAPBOX_TOKEN} />
    </section>
  );
}
