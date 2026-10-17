"use client";

import { FacilityOverview } from "@/components/dashboard/FacilityOverview";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { TransfersPanel } from "@/components/dashboard/TransfersPanel";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { forecastFacilities, visibleRecommendations } from "@/lib/access";
import type { WorkspaceSection } from "@/lib/navigation";
import type { BloodOrder, BloodOrderDraft, Forecast, Hospital, ManualShipmentDraft, SessionState, Shipment, TransferRecommendation } from "@/types/domain";

interface HospitalDashboardViewProps {
  section: WorkspaceSection;
  hospital: Hospital;
  hospitals: Hospital[];
  session: SessionState;
  shipments: Shipment[];
  orders: BloodOrder[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onDispatchShipment: (id: string) => void;
  onReceiveShipment: (id: string) => void;
  onScheduleManualShipment: (draft: ManualShipmentDraft) => boolean;
  onPlaceBloodOrder: (draft: BloodOrderDraft) => boolean;
  onAcceptBloodOrder: (id: string) => boolean;
  onRejectBloodOrder: (id: string) => boolean;
  onCancelBloodOrder: (id: string) => boolean;
}

export function HospitalDashboardView({ section, hospital, hospitals, session, shipments, orders, forecasts, recommendations,
  onApproveRecommendation, onDispatchRecommendation, onDispatchShipment, onReceiveShipment, onScheduleManualShipment,
  onPlaceBloodOrder, onAcceptBloodOrder, onRejectBloodOrder, onCancelBloodOrder }: HospitalDashboardViewProps) {
  const scopedFacilities = forecastFacilities(hospital, hospitals);
  const myRecommendations = visibleRecommendations(hospital, hospitals, recommendations);
  return <>
    {section === "overview" && <FacilityOverview hospital={hospital} hospitals={hospitals} session={session} shipments={shipments}
      orders={orders} forecasts={forecasts} recommendations={recommendations} />}
    {section === "forecast" && <ForecastPanel hospitals={scopedFacilities} forecasts={forecasts} shipments={shipments} recommendations={recommendations} workspaceBase={`/hospital/${hospital.id}`} />}
    {section === "transfers" && <TransfersPanel hospital={hospital} hospitals={hospitals} session={session} shipments={shipments} orders={orders}
      forecasts={forecasts} recommendations={recommendations} onAcceptOrder={onAcceptBloodOrder} onRejectOrder={onRejectBloodOrder}
      onCancelOrder={onCancelBloodOrder} onApproveRecommendation={onApproveRecommendation} onDispatchRecommendation={onDispatchRecommendation}
      onDispatchShipment={onDispatchShipment} onReceiveShipment={onReceiveShipment} onPlaceOrder={onPlaceBloodOrder} onScheduleShipment={onScheduleManualShipment} />}
    {section === "recommendations" && <RecommendationsPanel hospitals={hospitals} recommendations={myRecommendations} facility={hospital} onApprove={onApproveRecommendation} onDispatch={onDispatchRecommendation} />}
    {section === "map" && <NetworkMapPanel hospitals={hospitals} shipments={shipments} forecasts={forecasts} recommendations={recommendations}
      highlightedHospitalId={hospital.id} workspaceBase={`/hospital/${hospital.id}`} />}
  </>;
}
