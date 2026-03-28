"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { HospitalOverview } from "@/components/dashboard/HospitalOverview";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { KpiRibbon } from "@/components/dashboard/KpiRibbon";
import { SimulationControlPanel } from "@/components/dashboard/SimulationControlPanel";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { useAppStore } from "@/store/useAppStore";

export default function HospitalPage() {
  useInitializeAppState();

  const params = useParams<{ hospitalId: string }>();
  const routeHospitalId = params?.hospitalId;

  const tickShipments = useAppStore((state) => state.tickShipments);
  const hospitals = useAppStore((state) => state.hospitals);
  const shipments = useAppStore((state) => state.shipments);
  const forecasts = useAppStore((state) => state.forecasts);
  const recommendations = useAppStore((state) => state.recommendations);
  const kpis = useAppStore((state) => state.kpis);
  const resetDemoData = useAppStore((state) => state.resetDemoData);
  const simulation = useAppStore((state) => state.simulation);
  const setSimulationDate = useAppStore((state) => state.setSimulationDate);
  const setSimulationDemandMultiplier = useAppStore((state) => state.setSimulationDemandMultiplier);
  const setSimulationShipmentSpeed = useAppStore((state) => state.setSimulationShipmentSpeed);
  const updateHospitalInventory = useAppStore((state) => state.updateHospitalInventory);
  const approveRecommendation = useAppStore((state) => state.approveRecommendation);
  const dispatchRecommendation = useAppStore((state) => state.dispatchRecommendation);
  const dispatchShipment = useAppStore((state) => state.dispatchShipment);
  const markShipmentReceived = useAppStore((state) => state.markShipmentReceived);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  useEffect(() => {
    const id = setInterval(() => tickShipments(), 3500);
    return () => clearInterval(id);
  }, [tickShipments]);

  useEffect(() => {
    if (routeHospitalId && session.hospitalId !== routeHospitalId) {
      setSession({ mode: "hospital", hospitalId: routeHospitalId });
    }
  }, [routeHospitalId, session.hospitalId, setSession]);

  const activeHospital = hospitals.find((hospital) => hospital.id === routeHospitalId) ?? hospitals[0];

  if (!activeHospital) return null;

  return (
    <AppShell
      title="Hospital Command"
      subtitle={`${activeHospital.name} · ${activeHospital.city}`}
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
        <SimulationControlPanel
          currentDate={simulation.currentDate}
          demandMultiplier={simulation.demandMultiplier}
          shipmentSpeed={simulation.shipmentSpeed}
          onDateChange={setSimulationDate}
          onDemandChange={setSimulationDemandMultiplier}
          onSpeedChange={setSimulationShipmentSpeed}
        />
        <HospitalOverview
          hospital={activeHospital}
          hospitals={hospitals}
          shipments={shipments}
          forecasts={forecasts}
          recommendations={recommendations}
          currentHospitalId={activeHospital.id}
          onInventoryChange={updateHospitalInventory}
          onApproveRecommendation={approveRecommendation}
          onDispatchRecommendation={dispatchRecommendation}
          onDispatchShipment={dispatchShipment}
          onReceiveShipment={markShipmentReceived}
        />
        <NetworkMapPanel
          hospitals={hospitals}
          shipments={shipments}
          forecasts={forecasts}
          highlightedHospitalId={activeHospital.id}
        />
      </div>
    </AppShell>
  );
}
