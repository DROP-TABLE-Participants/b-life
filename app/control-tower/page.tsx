"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ControlTowerOverview } from "@/components/dashboard/ControlTowerOverview";
import { KpiRibbon } from "@/components/dashboard/KpiRibbon";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { CommandCenterR3F } from "@/components/three/CommandCenterR3F";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { useAppStore } from "@/store/useAppStore";

export default function ControlTowerPage() {
  useInitializeAppState();

  const tickShipments = useAppStore((state) => state.tickShipments);
  const hospitals = useAppStore((state) => state.hospitals);
  const shipments = useAppStore((state) => state.shipments);
  const forecasts = useAppStore((state) => state.forecasts);
  const recommendations = useAppStore((state) => state.recommendations);
  const kpis = useAppStore((state) => state.kpis);
  const resetDemoData = useAppStore((state) => state.resetDemoData);
  const approveRecommendation = useAppStore((state) => state.approveRecommendation);
  const dispatchRecommendation = useAppStore((state) => state.dispatchRecommendation);

  useEffect(() => {
    const id = setInterval(() => tickShipments(), 3200);
    return () => clearInterval(id);
  }, [tickShipments]);

  return (
    <AppShell
      title="Regional Control Tower"
      subtitle="Network-wide blood supply orchestration"
      actions={
        <button
          type="button"
          className="rounded-full border border-rose-300/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-100 transition hover:bg-rose-500/20"
          onClick={resetDemoData}
        >
          Reset Demo Data
        </button>
      }
    >
      <div className="space-y-4">
        <KpiRibbon kpis={kpis} />
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <NetworkMapPanel hospitals={hospitals} shipments={shipments} forecasts={forecasts} />
          <CommandCenterR3F />
        </div>
        <ControlTowerOverview
          hospitals={hospitals}
          forecasts={forecasts}
          shipments={shipments}
          recommendations={recommendations}
          onApproveRecommendation={approveRecommendation}
          onDispatchRecommendation={dispatchRecommendation}
        />
      </div>
    </AppShell>
  );
}
