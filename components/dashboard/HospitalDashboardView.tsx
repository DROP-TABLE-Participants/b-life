"use client";

import { useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShipmentMapCanvas } from "@/components/map/ShipmentMapCanvas";
import { cn, formatHospitalLabel } from "@/lib/utils";
import { BLOOD_TYPES, type Forecast, type Hospital, type Shipment, type TransferRecommendation } from "@/types/domain";
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
}: HospitalDashboardViewProps) {
  const [selectedForecast, setSelectedForecast] = useState<(typeof FORECAST_OPTIONS)[number]>("all");
  const [selectedBloodType, setSelectedBloodType] = useState<(typeof BLOOD_TYPES)[number] | null>(null);

  const hospitalForecasts = forecasts.filter((forecast) => forecast.hospitalId === hospital.id);

  const chartColor = selectedForecast === "all" ? "#0f172a" : selectedForecast.endsWith("-") ? "#f43f5e" : "#0ea5e9";

  const chartData = useMemo(() => {
    const selectedForecasts =
      selectedForecast === "all"
        ? hospitalForecasts
        : hospitalForecasts.filter((forecast) => forecast.bloodType === selectedForecast);

    const sumField = (field: keyof Pick<Forecast, "currentUnits" | "predictedDemand24h" | "predictedDemand48h">) =>
      selectedForecasts.reduce((total, forecast) => total + forecast[field], 0);

    return [
      {
        label: "Current",
        value: sumField("currentUnits"),
      },
      {
        label: "24h",
        value: sumField("predictedDemand24h"),
      },
      {
        label: "48h",
        value: sumField("predictedDemand48h"),
      },
    ];
  }, [hospitalForecasts, selectedForecast]);

  const myRecommendations = recommendations.filter(
    (recommendation) => recommendation.toHospitalId === hospital.id || recommendation.fromHospitalId === hospital.id,
  );

  const dispatchShipments = shipments.filter(
    (shipment) =>
      shipment.fromHospitalId === hospital.id ||
      shipment.toHospitalId === hospital.id,
  );

  const activeShipments = dispatchShipments.filter(
    (shipment) => shipment.status !== "delivered" && shipment.status !== "cancelled",
  );

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
            <CardTitle className={styles.hospitalDashboardCardTitle}>Forecast</CardTitle>
            <Select
              value={selectedForecast}
              onValueChange={(value) => setSelectedForecast(value as (typeof FORECAST_OPTIONS)[number])}
            >
              <SelectTrigger className={styles.hospitalDashboardSelectTrigger}>
                <SelectValue placeholder="Select blood type" />
              </SelectTrigger>
              <SelectContent>
                {FORECAST_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "all" ? "All" : option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className={`${styles.hospitalDashboardCardBody} ${styles.hospitalDashboardChartWrap}`}>
            <div className={styles.hospitalDashboardChartArea}>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>Recommended Transfers</CardTitle>
          </CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            <div className={styles.hospitalDashboardTransfers}>
              {myRecommendations.map((recommendation) => (
                <div key={recommendation.id} className={styles.hospitalDashboardTransferItem}>
                  <div className={styles.hospitalDashboardTransferTitleRow}>
                    <p className={styles.hospitalDashboardTransferTitle}>
                      {recommendation.bloodType} · {recommendation.suggestedQuantity}u
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
                      {recommendation.urgency}
                    </Badge>
                  </div>
                  <p className={styles.hospitalDashboardTransferText}>{recommendation.reason}</p>
                  <div className={styles.hospitalDashboardTransferActions}>
                    {recommendation.fromHospitalId === currentHospitalId &&
                      recommendation.status === "pending_approval" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onApproveRecommendation(recommendation.id)}
                        >
                          Approve
                        </Button>
                      )}
                    {recommendation.fromHospitalId === currentHospitalId &&
                      recommendation.status === "approved" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onDispatchRecommendation(recommendation.id)}
                        >
                          Dispatch
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={styles.hospitalDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>My Active Shipments</CardTitle>
          </CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            <div className={styles.hospitalDashboardTransfers}>
              {activeShipments.slice(0, 8).map((shipment) => {
                const from = hospitals.find((item) => item.id === shipment.fromHospitalId);
                const to = hospitals.find((item) => item.id === shipment.toHospitalId);

                return (
                  <div key={shipment.id} className={styles.hospitalDashboardTransferItem}>
                    <div className={styles.hospitalDashboardTransferTitleRow}>
                      <p className={styles.hospitalDashboardTransferTitle}>
                        {shipment.bloodType} · {shipment.quantity}u
                      </p>
                      <Badge variant="outline">{shipment.status.replaceAll("_", " ")}</Badge>
                    </div>
                    <p className={styles.hospitalDashboardTransferText}>
                      From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                    </p>
                    <p className={styles.hospitalDashboardTransferText}>
                      {shipment.fromHospitalId === hospital.id ? "Outgoing" : "Incoming"} · ETA {Math.round(shipment.etaMinutes)}m
                    </p>
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
                            Dispatch Shipment
                          </Button>
                        )}
                      {shipment.toHospitalId === currentHospitalId && shipment.status !== "delivered" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          className={styles.hospitalDashboardButton}
                          onClick={() => onReceiveShipment(shipment.id)}
                        >
                          Mark Received
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {activeShipments.length === 0 ? (
                <p className={styles.hospitalDashboardTransferText}>No active shipments.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className={styles.hospitalDashboardSection}>
        <Card className={cn(surfaceStyles.dashboardCardSurface, styles.hospitalDashboardDispatchCard)}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <CardTitle className={styles.hospitalDashboardCardTitle}>Real-Time Dispatches</CardTitle>
          </CardHeader>
          <div className={styles.hospitalDashboardMapWrap}>
            <div className={styles.hospitalDashboardMapFrame}>
              <ShipmentMapCanvas
                hospitals={hospitals}
                shipments={dispatchShipments}
                forecasts={hospitalForecasts}
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
