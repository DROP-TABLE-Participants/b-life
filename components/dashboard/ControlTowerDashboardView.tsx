"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShipmentMapCanvas } from "@/components/map/ShipmentMapCanvas";
import { BLOOD_TYPE_LIST } from "@/lib/constants";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import type { Forecast, Hospital, ManualShipmentDraft, Shipment, SystemKPI, TransferRecommendation } from "@/types/domain";
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
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onScheduleManualShipment: (draft: ManualShipmentDraft) => void;
  onResetDemoData: () => void;
}

export function ControlTowerDashboardView({
  hospitals,
  forecasts,
  shipments,
  recommendations,
  kpis,
  onApproveRecommendation,
  onDispatchRecommendation,
  onScheduleManualShipment,
  onResetDemoData,
}: ControlTowerDashboardViewProps) {
  const [fromHospitalId, setFromHospitalId] = useState(hospitals[0]?.id ?? "");
  const [toHospitalId, setToHospitalId] = useState(hospitals[1]?.id ?? hospitals[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<Shipment["bloodType"]>(BLOOD_TYPE_LIST[0]);
  const [quantity, setQuantity] = useState(8);
  const [etaMinutes, setEtaMinutes] = useState(90);
  const [priority, setPriority] = useState<Shipment["priority"]>("high");
  const [status, setStatus] = useState<ManualShipmentDraft["status"]>("planned");

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

  const destinationOptions = useMemo(
    () => hospitals.filter((hospital) => hospital.id !== fromHospitalId),
    [fromHospitalId, hospitals],
  );

  const submitManualShipment = () => {
    if (!fromHospitalId || !toHospitalId || fromHospitalId === toHospitalId) return;

    onScheduleManualShipment({
      fromHospitalId,
      toHospitalId,
      bloodType,
      quantity,
      etaMinutes,
      priority,
      status,
    });
  };

  return (
    <div className={styles.controlTowerDashboard}>
      <section className={`${styles.controlTowerDashboardSection} ${styles.controlTowerDashboardHeadingSection}`}>
        <div>
          <h2 className={styles.controlTowerDashboardHeading}>Regional Control Tower</h2>
          <p className={styles.controlTowerDashboardSubtitle}>Network-wide blood supply orchestration</p>
        </div>
        <Button type="button" variant="outline" onClick={onResetDemoData}>
          Reset Demo Data
        </Button>
      </section>

      <section className={`${styles.controlTowerDashboardSection} ${styles.controlTowerDashboardMetricsSection}`}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Hospitals</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.totalHospitals}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Active shipments</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.activeShipments}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Critical shortages</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.criticalShortages}</p>
          </CardContent>
        </Card>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardMetricCard)}>
          <CardContent className={styles.controlTowerDashboardMetricContent}>
            <p className={styles.controlTowerDashboardMetricLabel}>Expiring risk</p>
            <p className={styles.controlTowerDashboardMetricValue}>{kpis.expiringUnitsRisk}</p>
          </CardContent>
        </Card>
      </section>

      <section className={styles.controlTowerDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.controlTowerDashboardCard)}>
          <CardHeader className={styles.controlTowerDashboardCardHeader}>
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Risk Heatmap</CardTitle>
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
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Critical Shortage Ranking</CardTitle>
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
                        {forecast.shortageRiskLevel === "safe" ? "safe" : forecast.shortageRiskLevel === "elevated" ? "warning" : "risk"}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      Risk score {Math.round(forecast.shortageRiskScore)} · Demand {forecast.predictedDemand24h}u
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
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Recommendation Queue</CardTitle>
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
                        {recommendation.bloodType} · {recommendation.suggestedQuantity}u
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
                        {recommendation.urgency}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>
                      ETA {formatMinutes(recommendation.etaMinutes)} · Confidence {recommendation.confidenceScore}%
                    </p>
                    <div className={styles.controlTowerDashboardListItemActions}>
                      {recommendation.status === "pending_approval" ? (
                        <Button type="button" variant="secondary" size="sm" onClick={() => onApproveRecommendation(recommendation.id)}>
                          Approve
                        </Button>
                      ) : null}
                      {recommendation.status === "approved" ? (
                        <Button type="button" variant="outline" size="sm" onClick={() => onDispatchRecommendation(recommendation.id)}>
                          Dispatch
                        </Button>
                      ) : null}
                    </div>
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
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Shipment Monitoring</CardTitle>
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
                        {shipment.bloodType} · {shipment.quantity}u
                      </p>
                      <Badge variant="outline" className={shipmentStatusClassNames[shipment.status]}>
                        {shipment.status.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className={styles.controlTowerDashboardListItemText}>
                      From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.controlTowerDashboardListItemText}>
                      {Math.round(shipment.progress * 100)}% progress · ETA {formatMinutes(shipment.etaMinutes)}
                    </p>
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
            <CardTitle className={styles.controlTowerDashboardCardTitle}>Manual Shipment Scheduler</CardTitle>
          </CardHeader>
          <CardContent className={styles.controlTowerDashboardCardBody}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                From
                <select
                  value={fromHospitalId}
                  onChange={(event) => {
                    const nextFrom = event.target.value;
                    setFromHospitalId(nextFrom);
                    if (nextFrom === toHospitalId) {
                      const fallback = hospitals.find((hospital) => hospital.id !== nextFrom)?.id ?? nextFrom;
                      setToHospitalId(fallback);
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                >
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                To
                <select
                  value={toHospitalId}
                  onChange={(event) => setToHospitalId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                >
                  {destinationOptions.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Blood Type
                <select
                  value={bloodType}
                  onChange={(event) => setBloodType(event.target.value as Shipment["bloodType"])}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                >
                  {BLOOD_TYPE_LIST.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Priority
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Shipment["priority"])}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Quantity
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                ETA (minutes)
                <input
                  type="number"
                  min={5}
                  max={720}
                  value={etaMinutes}
                  onChange={(event) => setEtaMinutes(Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                />
              </label>

              <label className="text-xs uppercase tracking-[0.2em] text-cyan-200">
                Initial Status
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ManualShipmentDraft["status"])}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-2 text-sm text-white"
                >
                  <option value="planned">Planned</option>
                  <option value="approved">Approved</option>
                  <option value="in_transit">In Transit</option>
                  <option value="delayed">Delayed</option>
                </select>
              </label>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={submitManualShipment}
                  disabled={!fromHospitalId || !toHospitalId || fromHospitalId === toHospitalId}
                >
                  Schedule Shipment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
