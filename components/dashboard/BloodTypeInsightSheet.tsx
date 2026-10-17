"use client";

import { RISK_LABELS } from "@/lib/labels";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import type { BloodType, Forecast, Hospital, RiskLevel, Shipment, TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";
import styles from "./BloodTypeInsightSheet.module.css";

const riskBadgeClassNames: Record<RiskLevel, string> = {
  safe: "border-emerald-200 bg-emerald-50 text-emerald-700",
  elevated: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  critical: "border-rose-200 bg-rose-50 text-rose-700",
};

const riskBadgeLabels = RISK_LABELS;

interface BloodTypeInsightSheetProps {
  open: boolean;
  bloodType: BloodType | null;
  hospital: Hospital;
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
  onOpenChange: (open: boolean) => void;
}

export function BloodTypeInsightSheet({
  open,
  bloodType,
  hospital,
  hospitals,
  forecasts,
  shipments,
  recommendations,
  onOpenChange,
}: BloodTypeInsightSheetProps) {
  if (!bloodType || !open) {
    return <Sheet open={open} onOpenChange={onOpenChange} />;
  }

  const forecast = forecasts.find((item) => item.bloodType === bloodType);
  const risk = forecast?.shortageRiskLevel ?? "safe";
  const currentUnits = hospital.inventoryByBloodType[bloodType] ?? 0;
  const chartMax = Math.max(
    10,
    ...forecasts.map((item) =>
      Math.max(item.currentUnits, item.predictedDemand24h, item.predictedDemand48h),
    ),
  );

  const chartData = [
    { label: "Наличност", value: forecast?.currentUnits ?? currentUnits },
    { label: "Днес", value: forecast?.predictedDemand24h ?? 0 },
    { label: "48 ч.", value: forecast?.predictedDemand48h ?? 0 },
  ];

  const relatedShipments = shipments.filter((shipment) => shipment.bloodType === bloodType);
  const inboundShipments = relatedShipments.filter(
    (shipment) =>
      shipment.toHospitalId === hospital.id &&
      shipment.status !== "delivered" &&
      shipment.status !== "cancelled",
  );
  const outboundShipments = relatedShipments.filter(
    (shipment) =>
      shipment.fromHospitalId === hospital.id &&
      shipment.status !== "delivered" &&
      shipment.status !== "cancelled",
  );
  const inboundUnits = inboundShipments.reduce((total, shipment) => total + shipment.quantity, 0);
  const outboundUnits = outboundShipments.reduce((total, shipment) => total + shipment.quantity, 0);
  const nextIncomingMinutes = inboundShipments.length
    ? Math.min(...inboundShipments.map((shipment) => shipment.etaMinutes))
    : null;
  const recommendation = recommendations.find(
    (item) =>
      item.bloodType === bloodType &&
      (item.toHospitalId === hospital.id || item.fromHospitalId === hospital.id),
  );
  const partnerHospital =
    recommendation &&
    hospitals.find((item) =>
      recommendation.toHospitalId === hospital.id
        ? item.id === recommendation.fromHospitalId
        : item.id === recommendation.toHospitalId,
    );

  const estimatedUsedToday = forecast?.predictedDemand24h ?? 0;
  const reservedOutboundUnits = outboundShipments
    .filter((shipment) => shipment.status === "planned" || shipment.status === "approved")
    .reduce((total, shipment) => total + shipment.quantity, 0);
  const projectedBalance = currentUnits + inboundUnits - reservedOutboundUnits - estimatedUsedToday;
  const projectedBalanceLabel = projectedBalance >= 0 ? `+${projectedBalance}` : `${projectedBalance}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className={styles.bloodTypeSheetContent}>
        <SheetHeader className={styles.bloodTypeSheetHeader}>
          <div className={styles.bloodTypeSheetHeadingRow}>
            <div className={styles.bloodTypeSheetTitleRow}>
              <SheetTitle className={styles.bloodTypeSheetTitle}>{bloodType}</SheetTitle>
              <Badge className={cn(styles.bloodTypeSheetRiskBadge, riskBadgeClassNames[risk])} variant="outline">
                {riskBadgeLabels[risk]}
              </Badge>
            </div>
            <div>
              <SheetDescription className={styles.bloodTypeSheetDescription}>
                Информация за кръвната група в {hospital.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className={styles.bloodTypeSheetBody}>
          <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetCard)}>
            <CardHeader className={styles.bloodTypeSheetCardHeader}>
              <CardTitle className={styles.bloodTypeSheetCardTitle}>Прогноза</CardTitle>
            </CardHeader>
            <CardContent className={styles.bloodTypeSheetCardContent}>
              <div className={styles.bloodTypeSheetChartWrap}>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis domain={[0, chartMax]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" name="Единици" stroke="#0f172a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className={styles.bloodTypeSheetStatsGrid}>
            <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetStatCard)}>
              <CardContent className={styles.bloodTypeSheetStatContent}>
                <p className={styles.bloodTypeSheetStatLabel}>Текуща наличност</p>
                <p className={styles.bloodTypeSheetStatValue}>{currentUnits} ед.</p>
              </CardContent>
            </Card>
            <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetStatCard)}>
              <CardContent className={styles.bloodTypeSheetStatContent}>
                <p className={styles.bloodTypeSheetStatLabel}>Потребност днес (прогноза)</p>
                <p className={styles.bloodTypeSheetStatValue}>{estimatedUsedToday} ед.</p>
              </CardContent>
            </Card>
            <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetStatCard)}>
              <CardContent className={styles.bloodTypeSheetStatContent}>
                <p className={styles.bloodTypeSheetStatLabel}>Прогноза за 48 ч.</p>
                <p className={styles.bloodTypeSheetStatValue}>{forecast?.predictedDemand48h ?? 0} ед.</p>
              </CardContent>
            </Card>
            <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetStatCard)}>
              <CardContent className={styles.bloodTypeSheetStatContent}>
                <p className={styles.bloodTypeSheetStatLabel}>Прогнозен остатък</p>
                <p className={styles.bloodTypeSheetStatValue}>{projectedBalanceLabel} ед.</p>
              </CardContent>
            </Card>
          </div>

          <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetCard)}>
            <CardHeader className={styles.bloodTypeSheetCardHeader}>
              <CardTitle className={styles.bloodTypeSheetCardTitle}>Днес</CardTitle>
            </CardHeader>
            <CardContent className={styles.bloodTypeSheetListCardContent}>
              <div className={styles.bloodTypeSheetMetricRow}>
                <span className={styles.bloodTypeSheetMetricLabel}>Прогноза за днес</span>
                <span className={styles.bloodTypeSheetMetricValue}>{forecast?.predictedDemand24h ?? 0} ед.</span>
              </div>
              <Separator />
              <div className={styles.bloodTypeSheetMetricRow}>
                <span className={styles.bloodTypeSheetMetricLabel}>Входящи днес</span>
                <span className={styles.bloodTypeSheetMetricValue}>{inboundUnits} ед.</span>
              </div>
              <Separator />
              <div className={styles.bloodTypeSheetMetricRow}>
                <span className={styles.bloodTypeSheetMetricLabel}>Изходящи днес</span>
                <span className={styles.bloodTypeSheetMetricValue}>{outboundUnits} ед.</span>
              </div>
              <Separator />
              <div className={styles.bloodTypeSheetMetricRow}>
                <span className={styles.bloodTypeSheetMetricLabel}>Следващо очаквано пристигане</span>
                <span className={styles.bloodTypeSheetMetricValue}>
                  {nextIncomingMinutes === null ? "Няма" : formatMinutes(nextIncomingMinutes)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetCard)}>
            <CardHeader className={styles.bloodTypeSheetCardHeader}>
              <CardTitle className={styles.bloodTypeSheetCardTitle}>Фактори на риска</CardTitle>
            </CardHeader>
            <CardContent className={styles.bloodTypeSheetListCardContent}>
              {(forecast?.topFactors ?? ["Не е установен повишен риск"]).map((factor) => (
                <div key={factor} className={styles.bloodTypeSheetBulletRow}>
                  <span className={styles.bloodTypeSheetBullet} />
                  <span className={styles.bloodTypeSheetMetricLabel}>{factor}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={cn(surfaceStyles.dashboardCardSurface, styles.bloodTypeSheetCard)}>
            <CardHeader className={styles.bloodTypeSheetCardHeader}>
              <CardTitle className={styles.bloodTypeSheetCardTitle}>Препоръка</CardTitle>
            </CardHeader>
            <CardContent className={styles.bloodTypeSheetListCardContent}>
              {recommendation ? (
                <>
                  <div className={styles.bloodTypeSheetMetricRow}>
                    <span className={styles.bloodTypeSheetMetricLabel}>Препоръчано количество</span>
                    <span className={styles.bloodTypeSheetMetricValue}>{recommendation.suggestedQuantity} ед.</span>
                  </div>
                  <Separator />
                  <div className={styles.bloodTypeSheetMetricRow}>
                    <span className={styles.bloodTypeSheetMetricLabel}>Партньорско заведение</span>
                    <span className={styles.bloodTypeSheetMetricValue}>
                      {formatHospitalLabel(partnerHospital)}
                    </span>
                  </div>
                  <Separator />
                  <div className={styles.bloodTypeSheetMetricRow}>
                    <span className={styles.bloodTypeSheetMetricLabel}>Очаквано пристигане</span>
                    <span className={styles.bloodTypeSheetMetricValue}>{formatMinutes(recommendation.etaMinutes)}</span>
                  </div>
                  <Separator />
                  <p className={styles.bloodTypeSheetRecommendationText}>{recommendation.reason}</p>
                </>
              ) : (
                <p className={styles.bloodTypeSheetEmptyState}>Няма активна препоръка за тази кръвна група.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
