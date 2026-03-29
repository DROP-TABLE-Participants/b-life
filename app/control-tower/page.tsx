"use client";

import { useEffect } from "react";
import { ControlTowerDashboardView } from "@/components/dashboard/ControlTowerDashboardView";
import { MainView } from "@/components/layout/MainView";
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
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  useEffect(() => {
    const id = setInterval(() => tickShipments(), 3200);
    return () => clearInterval(id);
  }, [tickShipments]);

  useEffect(() => {
    if (session.mode !== "control_tower" || session.hospitalId !== null) {
      setSession({ mode: "control_tower", hospitalId: null });
    }
  }, [session.mode, session.hospitalId, setSession]);

  return (
    <MainView
      navigation={[
        {
          label: "Home",
          href: "/control-tower",
        },
      ]}
      login={{
        title: "Regional Control Tower",
        role: "Admin Login",
        details: ["Network-wide operations"],
        logoutHref: "/",
        onLogout: () => setSession({ mode: null, hospitalId: null }),
      }}
    >
      <ControlTowerDashboardView
        hospitals={hospitals}
        forecasts={forecasts}
        shipments={shipments}
        recommendations={recommendations}
        kpis={kpis}
        onApproveRecommendation={approveRecommendation}
        onDispatchRecommendation={dispatchRecommendation}
        onResetDemoData={resetDemoData}
      />
    </MainView>
  );
}
