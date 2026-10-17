"use client";

import { ControlTowerOverview } from "@/components/dashboard/ControlTowerOverview";
import { PageHeader } from "@/components/dashboard/DashboardParts";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { TransfersPanel } from "@/components/dashboard/TransfersPanel";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { Badge } from "@/components/ui/badge";
import { MINISTRY_NAME } from "@/lib/labels";
import { SECTION_LABELS, type AdminSection } from "@/lib/navigation";
import type { BloodOrder, Forecast, Hospital, SessionState, Shipment, SystemKPI, TransferRecommendation } from "@/types/domain";

interface ControlTowerDashboardViewProps {
  section: AdminSection;
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  orders: BloodOrder[];
  recommendations: TransferRecommendation[];
  kpis: SystemKPI;
  session: SessionState;
}

export function ControlTowerDashboardView({ section, hospitals, forecasts, shipments, orders, recommendations, session }: ControlTowerDashboardViewProps) {
  const header = <PageHeader title={SECTION_LABELS[section]} subtitle={`${MINISTRY_NAME} · достъп само за преглед`}><Badge>Само преглед</Badge></PageHeader>;
  return <>
    {section === "overview" && <ControlTowerOverview hospitals={hospitals} forecasts={forecasts} shipments={shipments} recommendations={recommendations} />}
    {section === "inventory" && <div className="flex flex-col gap-6">{header}<InventoryPanel hospitals={hospitals} forecasts={forecasts} shipments={shipments} recommendations={recommendations} session={session} /></div>}
    {section === "forecast" && <ForecastPanel hospitals={hospitals} forecasts={forecasts} shipments={shipments} workspaceBase="/control-tower" recommendations={recommendations} readOnly />}
    {section === "transfers" && <TransfersPanel hospitals={hospitals} session={session} shipments={shipments} orders={orders} forecasts={forecasts} recommendations={recommendations} />}
    {section === "recommendations" && <div className="flex flex-col gap-6">{header}<RecommendationsPanel hospitals={hospitals} recommendations={recommendations} /></div>}
    {section === "map" && <NetworkMapPanel hospitals={hospitals} shipments={shipments} forecasts={forecasts} recommendations={recommendations} workspaceBase="/control-tower" />}
  </>;
}
