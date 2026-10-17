"use client";

import Link from "next/link";
import { BloodOrderComposer } from "@/components/dashboard/BloodOrderComposer";
import { BloodOrdersPanel } from "@/components/dashboard/BloodOrdersPanel";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { ShipmentComposer } from "@/components/dashboard/ShipmentComposer";
import { ShipmentsPanel } from "@/components/dashboard/ShipmentsPanel";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { forecastFacilities, visibleRecommendations } from "@/lib/access";
import { SECTION_LABELS, type WorkspaceSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { BloodOrder, BloodOrderDraft, Forecast, Hospital, ManualShipmentDraft, Shipment, TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";
import styles from "./HospitalDashboardView.module.css";

interface HospitalDashboardViewProps {
  section: WorkspaceSection;
  hospital: Hospital;
  hospitals: Hospital[];
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

export function HospitalDashboardView({ section, hospital, hospitals, shipments, orders, forecasts, recommendations,
  onApproveRecommendation, onDispatchRecommendation, onDispatchShipment, onReceiveShipment, onScheduleManualShipment,
  onPlaceBloodOrder, onAcceptBloodOrder, onRejectBloodOrder, onCancelBloodOrder }: HospitalDashboardViewProps) {
  const scopedFacilities = forecastFacilities(hospital, hospitals);
  const myRecommendations = visibleRecommendations(hospital, hospitals, recommendations);
  const pending = orders.filter((item) => item.supplierHospitalId === hospital.id && item.status === "pending").length;
  return <div className="space-y-4">
    <header className={styles.hospitalDashboardHeadingSection}>
      <div><h1 className={styles.hospitalDashboardHeading}>{SECTION_LABELS[section]}</h1><p className="mt-1 text-sm text-muted-foreground">{hospital.name}</p></div>
      {pending > 0 && section !== "orders" && <Link href={`/hospital/${hospital.id}/orders#blood-orders`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">Заявки към Вас ({pending})</Link>}
    </header>
    {section === "inventory" && <InventoryPanel hospitals={hospitals} facilities={[hospital]} forecasts={forecasts} shipments={shipments} recommendations={myRecommendations} />}
    {section === "forecast" && <ForecastPanel hospitals={scopedFacilities} forecasts={forecasts} shipments={shipments} workspaceBase={`/hospital/${hospital.id}`} />}
    {section === "recommendations" && <RecommendationsPanel hospitals={hospitals} recommendations={myRecommendations} facility={hospital} onApprove={onApproveRecommendation} onDispatch={onDispatchRecommendation} />}
    {section === "orders" && <>
      <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
        <CardHeader className="p-4 pb-0"><CardTitle>Нова заявка за кръв</CardTitle></CardHeader>
        <CardContent className="p-4"><BloodOrderComposer hospital={hospital} hospitals={hospitals} shipments={shipments} onOrder={onPlaceBloodOrder} /></CardContent>
      </Card>
      <BloodOrdersPanel orders={orders} hospitals={hospitals} shipments={shipments} facilityId={hospital.id} onAccept={onAcceptBloodOrder} onReject={onRejectBloodOrder} onCancel={onCancelBloodOrder} />
    </>}
    {section === "shipments" && <>
      <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
        <CardHeader className="p-4 pb-0"><CardTitle>Изпращане на кръв</CardTitle></CardHeader>
        <CardContent className="p-4"><ShipmentComposer hospital={hospital} hospitals={hospitals} shipments={shipments} onSchedule={onScheduleManualShipment} /></CardContent>
      </Card>
      <ShipmentsPanel hospitals={hospitals} shipments={shipments} facilityId={hospital.id} onDispatch={onDispatchShipment} onReceive={onReceiveShipment} />
    </>}
    {section === "map" && <NetworkMapPanel hospitals={hospitals} shipments={shipments} highlightedHospitalId={hospital.id} />}
  </div>;
}
