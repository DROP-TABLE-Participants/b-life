"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { MainView } from "@/components/layout/MainView";
import { ForecastHelpSheet } from "@/components/dashboard/ForecastHelpSheet";
import { AppLoadingScreen } from "@/components/ui/AppLoadingScreen";
import { useInitializeAppState } from "@/hooks/useInitializeAppState";
import { FACILITY_ROLE_LABELS, sessionForFacility } from "@/lib/access";
import { MINISTRY_NAME } from "@/lib/labels";
import { facilitySection, workspaceHref, workspaceNavigation } from "@/lib/navigation";
import { useAppStore } from "@/store/useAppStore";

export function AccountWorkspace({ admin = false, children }: { admin?: boolean; children: React.ReactNode }) {
  useInitializeAppState();
  const { hospitalId } = useParams<{ hospitalId?: string }>();
  const pathname = usePathname();
  const { initialized, hospitals, session, setSession, tickShipments } = useAppStore();
  const facility = hospitals.find((item) => item.id === hospitalId);

  useEffect(() => {
    const timer = setInterval(tickShipments, 3500);
    return () => clearInterval(timer);
  }, [tickShipments]);

  useEffect(() => {
    if (!initialized) return;
    if (admin) {
      if (session.mode !== "control_tower" || session.hospitalId !== null) setSession({ mode: "control_tower", hospitalId: null });
    } else if (facility && (session.mode !== facility.kind || session.hospitalId !== facility.id)) {
      setSession(sessionForFacility(facility));
    }
  }, [initialized, admin, facility, session.mode, session.hospitalId, setSession]);

  if (!initialized) return <AppLoadingScreen />;
  if (!admin && !facility) return <div className="p-6"><h1>Акаунтът не е намерен</h1><Link href="/">Изберете акаунт</Link></div>;

  const base = admin ? "/control-tower" : `/hospital/${facility!.id}`;
  const navigation = workspaceNavigation(base);
  const activeSection = navigation.find((item) => item.href === pathname)?.icon ?? "overview";

  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <MainView navigation={navigation} login={{
        title: admin ? MINISTRY_NAME : facility!.name,
        role: admin ? "Администратор — преглед" : FACILITY_ROLE_LABELS[facility!.kind],
        details: [admin ? "Наблюдение на мрежата" : facility!.city],
        switchOptions: hospitals.map((item) => ({
          label: item.name, href: workspaceHref(`/hospital/${item.id}`, facilitySection(activeSection)),
          onSelect: () => setSession(sessionForFacility(item)),
        })),
        logoutHref: "/", onLogout: () => setSession({ mode: null, hospitalId: null }),
      }}>
        {children}
      </MainView>
      {activeSection === "forecast" && <ForecastHelpSheet />}
    </Suspense>
  );
}
