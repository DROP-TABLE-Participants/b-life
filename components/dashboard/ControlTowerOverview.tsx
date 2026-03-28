import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BLOOD_TYPE_LIST } from "@/lib/constants";
import { formatHospitalLabel } from "@/lib/utils";
import type { Forecast, Hospital, ManualShipmentDraft, Shipment, TransferRecommendation } from "@/types/domain";

interface ControlTowerOverviewProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onScheduleManualShipment: (draft: ManualShipmentDraft) => void;
}

export function ControlTowerOverview({
  hospitals,
  forecasts,
  shipments,
  recommendations,
  onApproveRecommendation,
  onDispatchRecommendation,
  onScheduleManualShipment,
}: ControlTowerOverviewProps) {
  const [fromHospitalId, setFromHospitalId] = useState(hospitals[0]?.id ?? "");
  const [toHospitalId, setToHospitalId] = useState(hospitals[1]?.id ?? hospitals[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<Shipment["bloodType"]>(BLOOD_TYPE_LIST[0]);
  const [quantity, setQuantity] = useState(8);
  const [etaMinutes, setEtaMinutes] = useState(90);
  const [priority, setPriority] = useState<Shipment["priority"]>("high");
  const [status, setStatus] = useState<ManualShipmentDraft["status"]>("planned");

  const shortageRank = [...forecasts]
    .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore)
    .slice(0, 8);

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
    <div className="grid gap-4 xl:grid-cols-3">
      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Critical Shortage Ranking</h3>
        <div className="mt-3 space-y-2">
          {shortageRank.map((forecast) => {
            const hospital = hospitals.find((item) => item.id === forecast.hospitalId);
            return (
              <div key={`${forecast.hospitalId}-${forecast.bloodType}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {hospital?.name} · {forecast.bloodType}
                  </p>
                  <StatusBadge status={forecast.shortageRiskLevel} />
                </div>
                <p className="mt-1 text-xs text-slate-500">Risk score {Math.round(forecast.shortageRiskScore)} · Demand {forecast.predictedDemand24h}u</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Recommendation Queue</h3>
        <div className="mt-3 space-y-2">
          {recommendations.slice(0, 8).map((recommendation) => {
            const from = hospitals.find((hospital) => hospital.id === recommendation.fromHospitalId);
            const to = hospitals.find((hospital) => hospital.id === recommendation.toHospitalId);

            return (
              <div key={recommendation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium">
                  {recommendation.bloodType} · {recommendation.suggestedQuantity}u
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ETA {recommendation.etaMinutes}m · Confidence {recommendation.confidenceScore}%
                </p>
                <div className="mt-2 flex gap-2">
                  {recommendation.status === "pending_approval" && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => onApproveRecommendation(recommendation.id)}>
                      Approve
                    </Button>
                  )}
                  {recommendation.status === "approved" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => onDispatchRecommendation(recommendation.id)}>
                      Dispatch
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Shipment Monitoring</h3>
        <div className="mt-3 space-y-2">
          {shipments.slice(0, 8).map((shipment) => {
            const from = hospitals.find((hospital) => hospital.id === shipment.fromHospitalId);
            const to = hospitals.find((hospital) => hospital.id === shipment.toHospitalId);

            return (
              <div key={shipment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {shipment.bloodType} · {shipment.quantity}u
                  </p>
                  <StatusBadge status={shipment.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {Math.round(shipment.progress * 100)}% progress · ETA {Math.round(shipment.etaMinutes)}m
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="xl:col-span-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Manual Shipment Scheduler</h3>
        <p className="mt-1 text-xs text-slate-300">Create a planned or active transfer to override automation for special events.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label>
            From
            </Label>
            <Select
              value={fromHospitalId}
              onValueChange={(value) => {
                setFromHospitalId(value);
                if (value === toHospitalId) {
                  const fallback = hospitals.find((hospital) => hospital.id !== value)?.id ?? value;
                  setToHospitalId(fallback);
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select origin" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
            To
            </Label>
            <Select value={toHospitalId} onValueChange={setToHospitalId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select destination" />
              </SelectTrigger>
              <SelectContent>
                {destinationOptions.map((hospital) => (
                  <SelectItem key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
            Blood Type
            </Label>
            <Select value={bloodType} onValueChange={(value) => setBloodType(value as Shipment["bloodType"])}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select blood type" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_TYPE_LIST.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
            Priority
            </Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as Shipment["priority"])}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
            Quantity
            </Label>
            <Input
              type="number"
              min={1}
              max={120}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>
            ETA (minutes)
            </Label>
            <Input
              type="number"
              min={5}
              max={720}
              value={etaMinutes}
              onChange={(event) => setEtaMinutes(Number(event.target.value))}
              className="mt-1"
            />
          </div>

          <div>
            <Label>
            Initial Status
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as ManualShipmentDraft["status"])}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select initial status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
      </GlassCard>
    </div>
  );
}
