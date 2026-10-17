"use client";

import { useParams } from "next/navigation";
import { HospitalDashboardView } from "@/components/dashboard/HospitalDashboardView";
import type { WorkspaceSection } from "@/lib/navigation";
import { useAppStore } from "@/store/useAppStore";

export function FacilityDashboardPage({ section }: { section: WorkspaceSection }) {
  const { hospitalId } = useParams<{ hospitalId: string }>();
  const state = useAppStore();
  const facility = state.hospitals.find((item) => item.id === hospitalId);
  if (!state.initialized || !facility) return null;
  return <HospitalDashboardView key={`${facility.id}:${section}`} section={section}
    hospital={facility} hospitals={state.hospitals} session={state.session} shipments={state.shipments} forecasts={state.forecasts} orders={state.orders}
    recommendations={state.recommendations}
    onApproveRecommendation={state.approveRecommendation} onDispatchRecommendation={state.dispatchRecommendation}
    onDispatchShipment={state.dispatchShipment} onReceiveShipment={state.markShipmentReceived}
    onScheduleManualShipment={state.scheduleManualShipment} onPlaceBloodOrder={state.placeBloodOrder}
    onAcceptBloodOrder={state.acceptBloodOrder} onRejectBloodOrder={state.rejectBloodOrder} onCancelBloodOrder={state.cancelBloodOrder} />;
}
