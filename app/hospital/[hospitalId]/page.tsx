"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { HospitalDashboardView } from "@/components/dashboard/HospitalDashboardView";
import { MainView } from "@/components/layout/MainView";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { FACILITY_ROLE_LABELS, sessionForFacility } from "@/lib/access";
import { useAppStore } from "@/store/useAppStore";

export default function HospitalPage() {
  useInitializeAppState();
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const state = useAppStore();
  const { initialized, hospitals, shipments, forecasts, recommendations, session, setSession, tickShipments } = state;
  const activeHospital = hospitals.find((hospital) => hospital.id === hospitalId);

  useEffect(() => {
    const id = setInterval(tickShipments, 3500);
    return () => clearInterval(id);
  }, [tickShipments]);

  useEffect(() => {
    if (initialized && activeHospital && (session.mode !== activeHospital.kind || session.hospitalId !== activeHospital.id)) {
      setSession(sessionForFacility(activeHospital));
    }
  }, [initialized, activeHospital, session.mode, session.hospitalId, setSession]);

  if (!initialized) return <p className="p-6">Зареждане на акаунта…</p>;
  if (!activeHospital) return <div className="p-6"><h1>Акаунтът не е намерен</h1><Link href="/">Изберете акаунт</Link></div>;

  return (
    <MainView
      navigation={[{ label: "Начало", href: `/hospital/${activeHospital.id}` }]}
      login={{
        title: activeHospital.name,
        role: FACILITY_ROLE_LABELS[activeHospital.kind],
        details: [activeHospital.city],
        switchOptions: [
          ...hospitals.map((hospital) => ({
            label: hospital.name, href: `/hospital/${hospital.id}`,
            onSelect: () => setSession(sessionForFacility(hospital)),
          })),
        ],
        logoutHref: "/", onLogout: () => setSession({ mode: null, hospitalId: null }),
      }}
    >
      <HospitalDashboardView
        key={activeHospital.id}
        hospital={activeHospital} hospitals={hospitals} shipments={shipments} forecasts={forecasts}
        recommendations={recommendations} currentHospitalId={activeHospital.id}
        onApproveRecommendation={state.approveRecommendation} onDispatchRecommendation={state.dispatchRecommendation}
        onDispatchShipment={state.dispatchShipment} onReceiveShipment={state.markShipmentReceived}
        onScheduleManualShipment={state.scheduleManualShipment}
      />
    </MainView>
  );
}
