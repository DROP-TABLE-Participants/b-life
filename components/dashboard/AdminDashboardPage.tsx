"use client";

import { ControlTowerDashboardView } from "@/components/dashboard/ControlTowerDashboardView";
import type { AdminSection } from "@/lib/navigation";
import { useAppStore } from "@/store/useAppStore";

export function AdminDashboardPage({ section }: { section: AdminSection }) {
  const state = useAppStore();
  if (!state.initialized) return null;
  return <ControlTowerDashboardView key={section} section={section} hospitals={state.hospitals} forecasts={state.forecasts}
    shipments={state.shipments} orders={state.orders} recommendations={state.recommendations} kpis={state.kpis} />;
}
