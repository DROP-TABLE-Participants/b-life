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
import { HospitalBloodInventoryCards } from "@/components/dashboard/HospitalBloodInventoryCards";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShipmentMapCanvas } from "@/components/map/ShipmentMapCanvas";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";
import styles from "./HospitalDashboardView.module.css";

const BLOOD_GROUP_OPTIONS = [
  { group: "O", negative: "O-", positive: "O+" },
  { group: "A", negative: "A-", positive: "A+" },
  { group: "B", negative: "B-", positive: "B+" },
  { group: "AB", negative: "AB-", positive: "AB+" },
] as const;

interface HospitalDashboardViewProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  currentHospitalId: string;
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
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
}: HospitalDashboardViewProps) {
  const [selectedGroup, setSelectedGroup] = useState<(typeof BLOOD_GROUP_OPTIONS)[number]["group"]>("O");

  const hospitalForecasts = forecasts.filter((forecast) => forecast.hospitalId === hospital.id);
  const groupSelection = BLOOD_GROUP_OPTIONS.find((option) => option.group === selectedGroup) ?? BLOOD_GROUP_OPTIONS[0];

  const chartData = useMemo(() => {
    const negativeForecast = hospitalForecasts.find((forecast) => forecast.bloodType === groupSelection.negative);
    const positiveForecast = hospitalForecasts.find((forecast) => forecast.bloodType === groupSelection.positive);

    return [
      {
        label: "Current",
        negative: negativeForecast?.currentUnits ?? 0,
        positive: positiveForecast?.currentUnits ?? 0,
      },
      {
        label: "24h",
        negative: negativeForecast?.predictedDemand24h ?? 0,
        positive: positiveForecast?.predictedDemand24h ?? 0,
      },
      {
        label: "48h",
        negative: negativeForecast?.predictedDemand48h ?? 0,
        positive: positiveForecast?.predictedDemand48h ?? 0,
      },
    ];
  }, [groupSelection.negative, groupSelection.positive, hospitalForecasts]);

  const myRecommendations = recommendations.filter(
    (recommendation) => recommendation.toHospitalId === hospital.id || recommendation.fromHospitalId === hospital.id,
  );

  const dispatchShipments = shipments.filter(
    (shipment) =>
      shipment.fromHospitalId === hospital.id ||
      shipment.toHospitalId === hospital.id,
  );

  return (
    <div className={styles.hospitalDashboard}>
      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardHeadingSection}`}>
        <h1 className={styles.hospitalDashboardHeading}>{hospital.name}</h1>
      </section>

      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardInventorySection}`}>
        <HospitalBloodInventoryCards hospital={hospital} forecasts={hospitalForecasts} />
      </section>

      <section className={`${styles.hospitalDashboardSection} ${styles.hospitalDashboardMiddleRow}`}>
        <Card className={styles.hospitalDashboardCard}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <h2 className={styles.hospitalDashboardCardTitle}>Forecast</h2>
            <Select value={selectedGroup} onValueChange={(value) => setSelectedGroup(value as (typeof BLOOD_GROUP_OPTIONS)[number]["group"])}>
              <SelectTrigger className={styles.hospitalDashboardSelectTrigger}>
                <SelectValue placeholder="Select blood group" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUP_OPTIONS.map((option) => (
                  <SelectItem key={option.group} value={option.group}>
                    {option.group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className={`${styles.hospitalDashboardCardBody} ${styles.hospitalDashboardChartWrap}`}>
            <div className={styles.hospitalDashboardChartArea}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="negative" stroke="#f43f5e" strokeWidth={2} />
                  <Line type="monotone" dataKey="positive" stroke="#0ea5e9" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className={styles.hospitalDashboardCard}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <h2 className={styles.hospitalDashboardCardTitle}>Recommended Transfers</h2>
          </CardHeader>
          <CardContent className={styles.hospitalDashboardCardBody}>
            <div className={styles.hospitalDashboardTransfers}>
              {myRecommendations.map((recommendation) => (
                <div key={recommendation.id} className={styles.hospitalDashboardTransferItem}>
                  <div className={styles.hospitalDashboardTransferTitleRow}>
                    <p className={styles.hospitalDashboardTransferTitle}>
                      {recommendation.bloodType} · {recommendation.suggestedQuantity}u
                    </p>
                    <StatusBadge
                      status={
                        recommendation.urgency === "critical"
                          ? "critical"
                          : recommendation.urgency === "high"
                            ? "high"
                            : "elevated"
                      }
                    />
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
        <Card className={styles.hospitalDashboardDispatchCard}>
          <CardHeader className={styles.hospitalDashboardCardHeader}>
            <h2 className={styles.hospitalDashboardCardTitle}>Real-Time Dispatches</h2>
          </CardHeader>
          <CardContent className={`${styles.hospitalDashboardCardBody} ${styles.hospitalDashboardMapWrap}`}>
            <div className={styles.hospitalDashboardMapFrame}>
              <ShipmentMapCanvas
                hospitals={hospitals}
                shipments={dispatchShipments}
                forecasts={hospitalForecasts}
                highlightedHospitalId={hospital.id}
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
