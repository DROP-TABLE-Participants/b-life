"use client";

import { useState } from "react";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { HospitalBloodInventoryCards } from "@/components/dashboard/HospitalBloodInventoryCards";
import { BloodTypeInsightSheet } from "@/components/dashboard/BloodTypeInsightSheet";
import type { BloodType, Forecast, Hospital, SessionState, Shipment, TransferRecommendation } from "@/types/domain";

export function InventoryPanel({ hospitals, facilities = hospitals, forecasts, shipments, recommendations, session }: {
  hospitals: Hospital[]; facilities?: Hospital[]; forecasts: Forecast[]; shipments: Shipment[]; recommendations: TransferRecommendation[]; session: SessionState;
}) {
  const [facilityId, setFacilityId] = useState(facilities[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const facility = facilities.find((item) => item.id === facilityId) ?? facilities[0];
  if (!facility) return null;
  const ownForecasts = forecasts.filter((item) => item.hospitalId === facility.id);
  return <div className="space-y-4">
    {facilities.length > 1 && <label className="grid max-w-xl gap-2 text-xs font-medium text-ink">Наличности на
      <FieldSelect label="Наличности на" value={facility.id} onValueChange={(value) => { setFacilityId(value); setBloodType(null); }} options={facilities.map((item) => ({ value: item.id, label: item.name }))} />
    </label>}
    <HospitalBloodInventoryCards hospital={facility} forecasts={ownForecasts} shipments={shipments} onSelectBloodType={setBloodType} />
    <BloodTypeInsightSheet open={bloodType !== null} bloodType={bloodType} hospital={facility} hospitals={hospitals} session={session}
      forecasts={ownForecasts} shipments={shipments} recommendations={recommendations} onOpenChange={(open) => { if (!open) setBloodType(null); }} />
  </div>;
}
