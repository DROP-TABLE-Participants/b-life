"use client";

import { PRIORITY_LABELS, RISK_LABELS, SHIPMENT_STATUS_LABELS, RECOMMENDATION_STATUS_LABELS } from "@/lib/labels";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentMapCanvas } from "@/components/map/ShipmentMapCanvas";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import type { Forecast, Hospital, Shipment, SystemKPI, TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";
import styles from "./ControlTowerDashboardView.module.css";

const PUBLIC_MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm5zYXZvdiIsImEiOiJjbTh1MzJmazEwaHhtMmlwZTk4djVyZDNrIn0.CIA7aiohbblSvgw6-4COLg";

const urgencyBadgeClassNames = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  elevated: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

const shipmentStatusClassNames: Record<Shipment["status"], string> = {
  planned: "border-slate-200 bg-slate-50 text-slate-700",
  approved: "border-sky-200 bg-sky-50 text-sky-700",
  in_transit: "border-cyan-200 bg-cyan-50 text-cyan-700",
  delayed: "border-amber-200 bg-amber-50 text-amber-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200 bg-rose-50 text-rose-700",
};

interface ControlTowerDashboardViewProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
  kpis: SystemKPI;
}

export function ControlTowerDashboardView({
  hospitals,
  forecasts,
  shipments,
  recommendations,
  kpis,
}: ControlTowerDashboardViewProps) {
  const topShortages = useMemo(
    () => [...forecasts].sort((a, b) => b.shortageRiskScore - a.shortageRiskScore).slice(0, 6),
    [forecasts],
  );

  const activeRecommendations = useMemo(
    () => recommendations.filter((item) => item.status !== "fulfilled" && item.status !== "cancelled").slice(0, 6),
    [recommendations],
  );

  const activeShipments = useMemo(
    () => shipments.filter((item) => item.status !== "delivered" && item.status !== "cancelled").slice(0, 8),
    [shipments],
  );

  return (
    <div className={styles.controlTowerDashboard}>
      <section className={`${styles.controlTowerDashboardSection} ${styles.controlTowerDashboardHeadingSection}`}>
        <div>
          <h2 className={styles.controlTowerDashboardHeading}>Министерство на здравеопазването</h2>
          <p className={styles.controlTowerDashboardSubtitle}>Наблюдение на мрежата · Достъп само за преглед</p>
        </div>
      </section>

      <section className={`${styles.controlTowerDashboardSection} ${styles.controlTowerDashboardMetricsSection}`}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Центрове и болници</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.totalHospitals}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Активни пратки</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.activeShipments}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Критични недостизи</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.criticalShortages}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Риск от изтичане на срока</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.expiringUnitsRisk}</p>
          </CardContent>
        </Card>
      </section>

      <section className={styles.controlTowerDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardCard)}>
          <CardHeader className={styles.controlTowerDashboardCardHeader}>
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Карта на риска</CardTitle>
          </CardHeader>
          <div className={styles.controlTowerDashboardMapWrap}>
            <ShipmentMapCanvas
              hospitals={hospitals}
              shipments={shipments}
              forecasts={forecasts}
              mapboxToken={PUBLIC_MAPBOX_TOKEN}
              mode="riskHeatmap"
            />
          </div>
        </Card>
      </section>

      <section className={`${styles.controlTowerDashboardSection} ${styles.controlTowerDashboardMiddleRow}`}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardCard)}>
          <CardHeader className={styles.controlTowerDashboardCardHeader}>
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Класация на критичните недостизи</CardTitle>
          </CardHeader>
          <CardContent className={styles.controlTowerDashboardCardBody}>
            <div className={styles.controlTowerDashboardList}>
              {topShortages.map((forecast) => {
                const hospital = hospitals.find((item) => item.id === forecast.hospitalId);
                return (
                  <div key={`${forecast.hospitalId}-${forecast.bloodType}`} className={styles.controlTowerDashboardListItem}>
                    <div className={styles.controlTowerDashboardListItemRow}>
                      <p className={styles.controlTowerDashboardListItemTitle}>
                        {hospital?.name} · {forecast.bloodType}
                      </p>
                      <Badge variant="outline" className={cn(urgencyBadgeClassNames[forecast.shortageRiskLevel === "critical" ? "critical" : forecast.shortageRiskLevel === "high" ? "high" : "elevated"])}>
                        {RISK_LABELS[forecast.shortageRiskLevel]}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      Оценка на риска {Math.round(forecast.shortageRiskScore)} · Потребност {forecast.predictedDemand24h} ед.
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>{formatHospitalLabel(hospital)}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardCard)}>
          <CardHeader className={styles.controlTowerDashboardCardHeader}>
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Препоръчани прехвърляния</CardTitle>
          </CardHeader>
          <CardContent className={styles.controlTowerDashboardCardBody}>
            <div className={styles.controlTowerDashboardList}>
              {activeRecommendations.map((recommendation) => {
                const from = hospitals.find((hospital) => hospital.id === recommendation.fromHospitalId);
                const to = hospitals.find((hospital) => hospital.id === recommendation.toHospitalId);

                return (
                  <div key={recommendation.id} className={styles.controlTowerDashboardListItem}>
                    <div className={styles.controlTowerDashboardListItemRow}>
                      <p className={styles.controlTowerDashboardListItemTitle}>
                        {recommendation.bloodType} · {recommendation.suggestedQuantity} ед.
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          recommendation.urgency === "critical"
                            ? urgencyBadgeClassNames.critical
                            : recommendation.urgency === "high"
                              ? urgencyBadgeClassNames.high
                              : urgencyBadgeClassNames.elevated,
                        )}
                      >
                        {PRIORITY_LABELS[recommendation.urgency]}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      От {formatHospitalLabel(from)} до {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>
                      Очаквано пристигане {formatMinutes(recommendation.etaMinutes)} · Надеждност {recommendation.confidenceScore}%
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>{RECOMMENDATION_STATUS_LABELS[recommendation.status]}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={styles.controlTowerDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardCard)}>
          <CardHeader className={styles.controlTowerDashboardCardHeader}>
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Наблюдение на пратките</CardTitle>
          </CardHeader>
          <CardContent className={styles.controlTowerDashboardCardBody}>
            <div className={styles.controlTowerDashboardShipmentsGrid}>
              {activeShipments.map((shipment) => {
                const from = hospitals.find((hospital) => hospital.id === shipment.fromHospitalId);
                const to = hospitals.find((hospital) => hospital.id === shipment.toHospitalId);

                return (
                  <div key={shipment.id} className={styles.controlTowerDashboardListItem}>
                    <div className={styles.controlTowerDashboardListItemRow}>
                      <p className={styles.controlTowerDashboardListItemTitle}>
                        {shipment.bloodType} · {shipment.quantity} ед.
                      </p>
                      <Badge variant="outline" className={shipmentStatusClassNames[shipment.status]}>
                        {SHIPMENT_STATUS_LABELS[shipment.status]}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      От {formatHospitalLabel(from)} до {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>
                      {Math.round(shipment.progress * 100)}% напредък · Очаквано пристигане {formatMinutes(shipment.etaMinutes)}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
