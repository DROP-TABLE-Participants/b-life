"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { HospitalDashboardView } from "@/components/dashboard/HospitalDashboardView";
import { MainView } from "@/components/layout/MainView";
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
  const approveRecommendation = useAppStore((state) => state.approveRecommendation);
  const dispatchRecommendation = useAppStore((state) => state.dispatchRecommendation);
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
    <MainView
      navigation={[
        {
          label: "Home",
          href: `/hospital/${activeHospital.id}`,
        },
      ]}
      login={{
        title: activeHospital.name,
        role: "Hospital Login",
        details: [activeHospital.city],
        switchOptions: hospitals.map((hospital) => ({
          label: `${hospital.name} · ${hospital.city}`,
          href: `/hospital/${hospital.id}`,
          onSelect: () => setSession({ mode: "hospital", hospitalId: hospital.id }),
        })),
        logoutHref: "/",
        onLogout: () => setSession({ mode: null, hospitalId: null }),
      }}
    >
      <HospitalDashboardView
          hospital={activeHospital}
          hospitals={hospitals}
          shipments={shipments}
          forecasts={forecasts}
          recommendations={recommendations}
          currentHospitalId={activeHospital.id}
          onApproveRecommendation={approveRecommendation}
          onDispatchRecommendation={dispatchRecommendation}
        />
    </MainView>
  );
}
