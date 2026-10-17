"use client";

import { BloodOrdersPanel } from "@/components/dashboard/BloodOrdersPanel";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { InventoryPanel } from "@/components/dashboard/InventoryPanel";
import { RecommendationsPanel } from "@/components/dashboard/RecommendationsPanel";
import { ShipmentsPanel } from "@/components/dashboard/ShipmentsPanel";
import { NetworkMapPanel } from "@/components/map/NetworkMapPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MINISTRY_NAME, RISK_LABELS } from "@/lib/labels";
import { SECTION_LABELS, type AdminSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import type { BloodOrder, Forecast, Hospital, Shipment, SystemKPI, TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";

interface ControlTowerDashboardViewProps {
  section: AdminSection;
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  orders: BloodOrder[];
  recommendations: TransferRecommendation[];
  kpis: SystemKPI;
}

export function ControlTowerDashboardView({ section, hospitals, forecasts, shipments, orders, recommendations, kpis }: ControlTowerDashboardViewProps) {
  const shortages = [...forecasts].sort((a, b) => b.shortageRiskScore - a.shortageRiskScore).slice(0, 6);
  const metrics = [["Центрове и болници", kpis.totalHospitals], ["Активни пратки", kpis.activeShipments], ["Критични недостизи", kpis.criticalShortages], ["Риск от изтичане на срока", kpis.expiringUnitsRisk]] as const;
  return <div className="space-y-4">
    <header><h1 className="text-2xl font-bold">{SECTION_LABELS[section]}</h1><p className="mt-1 text-sm text-muted-foreground">{MINISTRY_NAME} · Достъп само за преглед</p></header>
    {section === "overview" && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <Card key={label} className={surfaceStyles.dashboardCardSurface}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></CardContent></Card>)}</div>
      <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
        <CardHeader className="p-4 pb-0"><CardTitle>Класация на критичните недостизи</CardTitle></CardHeader>
        <CardContent className="space-y-3 p-4">{shortages.map((item) => <div key={`${item.hospitalId}-${item.bloodType}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3">
          <div><p className="text-sm font-semibold">{hospitals.find((facility) => facility.id === item.hospitalId)?.name} · {item.bloodType}</p><p className="mt-1 text-sm text-muted-foreground">Оценка на риска {Math.round(item.shortageRiskScore)} · Потребност за 24 ч.: {item.predictedDemand24h} ед.</p></div>
          <Badge variant="outline">{RISK_LABELS[item.shortageRiskLevel]}</Badge>
        </div>)}</CardContent>
      </Card>
    </>}
    {section === "inventory" && <InventoryPanel hospitals={hospitals} forecasts={forecasts} shipments={shipments} recommendations={recommendations} />}
    {section === "forecast" && <ForecastPanel hospitals={hospitals} forecasts={forecasts} />}
    {section === "orders" && <BloodOrdersPanel hospitals={hospitals} shipments={shipments} orders={orders} />}
    {section === "shipments" && <ShipmentsPanel hospitals={hospitals} shipments={shipments} />}
    {section === "recommendations" && <RecommendationsPanel hospitals={hospitals} recommendations={recommendations} />}
    {section === "map" && <NetworkMapPanel hospitals={hospitals} shipments={shipments} />}
  </div>;
}
