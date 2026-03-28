import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
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
  const [bloodType, setBloodType] = useState(BLOOD_TYPE_LIST[0]);
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
              <div key={`${forecast.hospitalId}-${forecast.bloodType}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {hospital?.name} · {forecast.bloodType}
                  </p>
                  <StatusBadge status={forecast.shortageRiskLevel} />
                </div>
                <p className="mt-1 text-xs text-slate-300">Risk score {Math.round(forecast.shortageRiskScore)} · Demand {forecast.predictedDemand24h}u</p>
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
              <div key={recommendation.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <p className="text-sm font-medium">
                  {recommendation.bloodType} · {recommendation.suggestedQuantity}u
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  ETA {recommendation.etaMinutes}m · Confidence {recommendation.confidenceScore}%
                </p>
                <div className="mt-2 flex gap-2">
                  {recommendation.status === "pending_approval" && (
                    <button
                      type="button"
                      className="rounded-lg border border-white/20 bg-white/10 px-2 py-1 text-xs transition hover:bg-white/20"
                      onClick={() => onApproveRecommendation(recommendation.id)}
                    >
                      Approve
                    </button>
                  )}
                  {recommendation.status === "approved" && (
                    <button
                      type="button"
                      className="rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
                      onClick={() => onDispatchRecommendation(recommendation.id)}
                    >
                      Dispatch
                    </button>
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
              <div key={shipment.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {shipment.bloodType} · {shipment.quantity}u
                  </p>
                  <StatusBadge status={shipment.status} />
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  From {formatHospitalLabel(from)} to {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-300">
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
          <label className="text-xs text-slate-300">
            From
            <select
              value={fromHospitalId}
              onChange={(event) => {
                const value = event.target.value;
                setFromHospitalId(value);
                if (value === toHospitalId) {
                  const fallback = hospitals.find((hospital) => hospital.id !== value)?.id ?? value;
                  setToHospitalId(fallback);
                }
              }}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              {hospitals.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            To
            <select
              value={toHospitalId}
              onChange={(event) => setToHospitalId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              {destinationOptions.map((hospital) => (
                <option key={hospital.id} value={hospital.id}>
                  {hospital.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Blood Type
            <select
              value={bloodType}
              onChange={(event) => setBloodType(event.target.value as Shipment["bloodType"])}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              {BLOOD_TYPE_LIST.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Shipment["priority"])}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>

          <label className="text-xs text-slate-300">
            Quantity
            <input
              type="number"
              min={1}
              max={120}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            />
          </label>

          <label className="text-xs text-slate-300">
            ETA (minutes)
            <input
              type="number"
              min={5}
              max={720}
              value={etaMinutes}
              onChange={(event) => setEtaMinutes(Number(event.target.value))}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            />
          </label>

          <label className="text-xs text-slate-300">
            Initial Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ManualShipmentDraft["status"])}
              className="mt-1 w-full rounded-lg border border-white/20 bg-slate-950/70 px-2 py-1.5 text-xs"
            >
              <option value="planned">Planned</option>
              <option value="approved">Approved</option>
              <option value="in_transit">In Transit</option>
              <option value="delayed">Delayed</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              className="w-full rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
              onClick={submitManualShipment}
              disabled={!fromHospitalId || !toHospitalId || fromHospitalId === toHospitalId}
            >
              Schedule Shipment
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
