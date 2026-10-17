"use client";

import { useEffect } from "react";
import { ControlTowerDashboardView } from "@/components/dashboard/ControlTowerDashboardView";
import { MainView } from "@/components/layout/MainView";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { useAppStore } from "@/store/useAppStore";
import { sessionForFacility } from "@/lib/access";
import { MINISTRY_NAME } from "@/lib/labels";

export default function ControlTowerPage() {
  useInitializeAppState();

  const tickShipments = useAppStore((state) => state.tickShipments);
  const hospitals = useAppStore((state) => state.hospitals);
  const shipments = useAppStore((state) => state.shipments);
  const forecasts = useAppStore((state) => state.forecasts);
  const recommendations = useAppStore((state) => state.recommendations);
  const kpis = useAppStore((state) => state.kpis);
  const initialized = useAppStore((state) => state.initialized);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);

  useEffect(() => {
    const id = setInterval(() => tickShipments(), 3200);
    return () => clearInterval(id);
  }, [tickShipments]);

  useEffect(() => {
    if (initialized && (session.mode !== "control_tower" || session.hospitalId !== null)) {
      setSession({ mode: "control_tower", hospitalId: null });
    }
  }, [initialized, session.mode, session.hospitalId, setSession]);

  if (!initialized) return <p className="p-6">Зареждане на акаунта…</p>;

  return (
    <MainView
      navigation={[
        {
          label: "Начало",
          href: "/control-tower",
        },
      ]}
      login={{
        title: MINISTRY_NAME,
        role: "Администратор — преглед",
        details: ["Наблюдение на мрежата"],
        switchOptions: hospitals.map((hospital) => ({
          label: hospital.name, href: `/hospital/${hospital.id}`,
          onSelect: () => setSession(sessionForFacility(hospital)),
        })),
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
      />
    </MainView>
  );
}
