"use client";

import { PRIORITY_LABELS, SHIPMENT_STATUS_LABELS, RECOMMENDATION_STATUS_LABELS } from "@/lib/labels";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BloodTypeInsightSheet } from "@/components/dashboard/BloodTypeInsightSheet";
import { HospitalBloodInventoryCards } from "@/components/dashboard/HospitalBloodInventoryCards";
import { ShipmentComposer } from "@/components/dashboard/ShipmentComposer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShipmentMapCanvas } from "@/components/map/ShipmentMapCanvas";
import { cn, formatHospitalLabel } from "@/lib/utils";
import { forecastFacilities, visibleRecommendations } from "@/lib/access";
import { BLOOD_TYPES, type Forecast, type Hospital, type ManualShipmentDraft, type Shipment, type TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";
import styles from "./HospitalDashboardView.module.css";

const FORECAST_OPTIONS = ["all", ...BLOOD_TYPES] as const;
const PUBLIC_MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm5zYXZvdiIsImEiOiJjbTh1MzJmazEwaHhtMmlwZTk4djVyZDNrIn0.CIA7aiohbblSvgw6-4COLg";

const recommendationBadgeClassNames = {
  critical: "border-rose-200 bg-rose-50 text-rose-700",
  high: "border-orange-200 bg-orange-50 text-orange-700",
  elevated: "border-amber-200 bg-amber-50 text-amber-700",
} as const;

interface HospitalDashboardViewProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  currentHospitalId: string;
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onDispatchShipment: (shipmentId: string) => void;
  onReceiveShipment: (shipmentId: string) => void;
  onScheduleManualShipment: (draft: ManualShipmentDraft) => boolean;
}

export function HospitalDashboardView({
  hospital,
  hospitals,
  shipments,
  forecasts,
  recommendations,
  currentHospitalId,
  onApproveRecommendation,
  onDispatchRecommendation,
  onDispatchShipment,
  onReceiveShipment,
  onScheduleManualShipment,
}: HospitalDashboardViewProps) {
  const [selectedForecast, setSelectedForecast] = useState<(typeof FORECAST_OPTIONS)[number]>("all");
  const [selectedBloodType, setSelectedBloodType] = useState<(typeof BLOOD_TYPES)[number] | null>(null);
  const [forecastFacilityId, setForecastFacilityId] = useState(hospital.id);
  const [shipmentTab, setShipmentTab] = useState<"active" | "history">("active");

  const hospitalForecasts = forecasts.filter((forecast) => forecast.hospitalId === hospital.id);
  const scopedFacilities = forecastFacilities(hospital, hospitals);
  const selectedFacility = scopedFacilities.find((item) => item.id === forecastFacilityId) ?? hospital;
  const selectedFacilityForecasts = forecasts.filter((forecast) => forecast.hospitalId === selectedFacility.id);

  const chartColor = selectedForecast === "all" ? "#0f172a" : selectedForecast.endsWith("-") ? "#f43f5e" : "#0ea5e9";

  const chartData = (() => {
    const selectedForecasts =
      selectedForecast === "all"
        ? selectedFacilityForecasts
        : selectedFacilityForecasts.filter((forecast) => forecast.bloodType === selectedForecast);

    const sumField = (field: keyof Pick<Forecast, "currentUnits" | "predictedDemand24h" | "predictedDemand48h">) =>
      selectedForecasts.reduce((total, forecast) => total + forecast[field], 0);

    return [
      {
        label: "Наличност",
        value: sumField("currentUnits"),
      },
      {
        label: "24 ч.",
        value: sumField("predictedDemand24h"),
      },
      {
        label: "48 ч.",
        value: sumField("predictedDemand48h"),
      },
    ];
  })();

  const myRecommendations = visibleRecommendations(hospital, hospitals, recommendations)
    .filter((item) => item.status !== "fulfilled" && item.status !== "cancelled");
  const canManageRecommendations = hospital.kind !== "hospital";

  const dispatchShipments = shipments.filter(
    (shipment) =>
      shipment.fromHospitalId === hospital.id ||
      shipment.toHospitalId === hospital.id,
  );

  const activeShipments = dispatchShipments.filter(
    (shipment) => shipment.status !== "delivered" && shipment.status !== "cancelled",
  );
  const historyShipments = dispatchShipments.filter((shipment) => shipment.status === "delivered" || shipment.status === "cancelled");
  const displayedShipments = shipmentTab === "active" ? activeShipments : historyShipments;

  return (
    <div className={styles.hospitalDashboard}>
      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardHeadingSection}`}>
        <h2 className={styles.hospitalDashboardHeading}>{hospital.name}</h2>
      </section>

      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardInventorySection}`}>
        <HospitalBloodInventoryCards
          hospital={hospital}
          forecasts={hospitalForecasts}
          onSelectBloodType={setSelectedBloodType}
        />
      </section>

      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardMiddleRow}`}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>Прогноза</CardTitle>
            <Select
              value={selectedForecast}
              onValueChange={(value) => setSelectedForecast(value as (typeof FORECAST_OPTIONS)[number])}
            >
              <SelectTrigger className={styles.hospitalDashboardSelectTrigger}>
                <SelectValue placeholder="Изберете кръвна група" />
              </SelectTrigger>
              <SelectContent>
                {FORECAST_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "Всички" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className={`${styles.hospitalDashboardCardBody} ${styles.hospitalDashboardChartWrap}`}>
            {scopedFacilities.length > 1 ? (
              <label className="mb-4 grid gap-2 text-sm">Прогноза за
                <select className="h-9 w-full rounded-md border border-input bg-background px-3" value={selectedFacility.id} onChange={(event) => setForecastFacilityId(event.target.value)}>
                  {scopedFacilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            ) : <p className="mb-4 text-sm text-muted-foreground">Прогнозна потребност от кръв за Вашата болница</p>}
            <div className={styles.hospitalDashboardChartArea}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" name="Единици" stroke={chartColor} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="pb-2 text-left text-muted-foreground">{selectedFacility.name} · прогнозна потребност в единици</caption>
                <thead><tr><th className="py-2">Кръвна група</th><th>Наличност</th><th>Потребност за 24 ч.</th><th>Потребност за 48 ч.</th></tr></thead>
                <tbody>{selectedFacilityForecasts.filter((item) => selectedForecast === "all" || item.bloodType === selectedForecast).map((item) => (
                  <tr key={item.bloodType} className="border-t"><td className="py-2 font-medium">{item.bloodType}</td><td>{item.currentUnits}</td><td>{item.predictedDemand24h}</td><td>{item.predictedDemand48h}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>Препоръчани прехвърляния</CardTitle>
          </CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            {!canManageRecommendations && <p className="mb-3 text-sm text-muted-foreground">Препоръки за Вашата болница. Прехвърлянията се одобряват от изпращащия център.</p>}
            <div className={styles.hospitalDashboardTransfers}>
              {myRecommendations.map((recommendation) => (
                <div key={recommendation.id} className={styles.hospitalDashboardTransferItem}>
                  <div className={styles.hospitalDashboardTransferTitleRow}>
                    <p className={styles.hospitalDashboardTransferTitle}>
                      {recommendation.bloodType} · {recommendation.suggestedQuantity} ед.
                    </p>
                    <Badge
                      className={cn(
                        recommendation.urgency === "critical"
                          ? recommendationBadgeClassNames.critical
                          : recommendation.urgency === "high"
                            ? recommendationBadgeClassNames.high
                            : recommendationBadgeClassNames.elevated,
                      )}
                      variant="outline"
                    >
                      {PRIORITY_LABELS[recommendation.urgency]}
                    </Badge>
                  </div>
                  <p className={styles.hospitalDashboardTransferText}>{recommendation.reason}</p>
                  <p className={styles.hospitalDashboardTransferText}>{RECOMMENDATION_STATUS_LABELS[recommendation.status]}</p>
                  <div className={styles.hospitalDashboardTransferActions}>
                    {canManageRecommendations && recommendation.fromHospitalId === currentHospitalId &&
                      recommendation.status === "pending_approval" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onApproveRecommendation(recommendation.id)}
                        >
                          Одобряване
                        </Button>
                      )}
                    {canManageRecommendations && recommendation.fromHospitalId === currentHospitalId &&
                      recommendation.status === "approved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onDispatchRecommendation(recommendation.id)}
                        >
                          Изпращане
                        </Button>
                      )}
                  </div>
                </div>
              ))}
              {myRecommendations.length === 0 && <p className={styles.hospitalDashboardTransferText}>В момента няма препоръчани прехвърляния.</p>}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={styles.hospitalDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}><CardTitle className={styles.hospitalDashboardCardTitle}>Изпращане на кръв</CardTitle></CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            <ShipmentComposer hospital={hospital} hospitals={hospitals} shipments={shipments} onSchedule={onScheduleManualShipment} />
          </CardContent>
        </Card>
      </section>

      <section className={styles.hospitalDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>{shipmentTab === "active" ? "Моите активни пратки" : "История на моите пратки"}</CardTitle>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={shipmentTab === "active" ? "secondary" : "outline"} onClick={() => setShipmentTab("active")}>Активни ({activeShipments.length})</Button>
              <Button type="button" size="sm" variant={shipmentTab === "history" ? "secondary" : "outline"} onClick={() => setShipmentTab("history")}>История ({historyShipments.length})</Button>
            </div>
          </CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            <div className={styles.hospitalDashboardTransfers}>
              {displayedShipments.map((shipment) => {
                const from = hospitals.find((item) => item.id === shipment.fromHospitalId);
                const to = hospitals.find((item) => item.id === shipment.toHospitalId);

                return (
                  <div key={shipment.id} className={styles.hospitalDashboardTransferItem}>
                    <div className={styles.hospitalDashboardTransferTitleRow}>
                      <p className={styles.hospitalDashboardTransferTitle}>
                        {shipment.bloodType} · {shipment.quantity} ед.
                      </p>
                      <Badge variant="outline">{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge>
                    </div>
                    <p className={styles.hospitalDashboardTransferText}>
                      От {formatHospitalLabel(from)} до {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.hospitalDashboardTransferText}>
                      {shipment.fromHospitalId === hospital.id ? "Изходяща" : "Входяща"} · Очаквано пристигане {Math.round(shipment.etaMinutes)} мин.
                    </p>
                    <p className="text-xs text-muted-foreground">{shipment.id} · {new Date(shipment.updatedAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}</p>
                    {shipment.progress >= 1 && shipment.status !== "delivered" && shipment.status !== "cancelled" && <p className="text-sm text-muted-foreground">Пристигнала · очаква потвърждение за получаване</p>}
                    <div className={styles.hospitalDashboardTransferActions}>
                      {(shipment.status === "planned" || shipment.status === "approved") &&
                        shipment.fromHospitalId === currentHospitalId && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className={styles.hospitalDashboardButton}
                            onClick={() => onDispatchShipment(shipment.id)}
                          >
                            Изпращане на пратката
                          </Button>
                        )}
                      {shipment.toHospitalId === currentHospitalId && (shipment.status === "in_transit" || shipment.status === "delayed") && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onReceiveShipment(shipment.id)}
                        >
                          Потвърждаване на получаване
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {displayedShipments.length === 0 ? (
                <p className={styles.hospitalDashboardTransferText}>{shipmentTab === "active" ? "Няма активни пратки." : "Все още няма история на пратки."}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={styles.hospitalDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardDispatchCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>Пратки в реално време</CardTitle>
          </CardHeader>
          <div className={styles.hospitalDashboardMapWrap}>
            <div className={styles.hospitalDashboardMapFrame}>
              <ShipmentMapCanvas
                hospitals={hospitals}
                shipments={dispatchShipments}
                forecasts={forecasts.filter((item) => scopedFacilities.some((facility) => facility.id === item.hospitalId))}
                highlightedHospitalId={hospital.id}
                mapboxToken={PUBLIC_MAPBOX_TOKEN}
              />
            </div>
          </div>
        </Card>
      </section>

      <BloodTypeInsightSheet
        open={selectedBloodType !== null}
        bloodType={selectedBloodType}
        hospital={hospital}
        hospitals={hospitals}
        forecasts={hospitalForecasts}
        shipments={dispatchShipments}
        recommendations={myRecommendations}
        onOpenChange={(open) => {
          if (!open) setSelectedBloodType(null);
        }}
      />
    </div>
  );
}
