import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BLOOD_TYPE_LIST } from "@/lib/constants";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";

interface HospitalOverviewProps {
  hospital: Hospital;
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  onInventoryChange: (hospitalId: string, bloodType: Shipment["bloodType"], units: number) => void;
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
  onReceiveShipment: (shipmentId: string) => void;
}

export function HospitalOverview({
  hospital,
  shipments,
  forecasts,
  recommendations,
  onInventoryChange,
  onApproveRecommendation,
  onDispatchRecommendation,
  onReceiveShipment,
}: HospitalOverviewProps) {
  const hospitalForecasts = forecasts.filter((forecast) => forecast.hospitalId === hospital.id);
  const activeShipments = shipments.filter(
    (shipment) => shipment.fromHospitalId === hospital.id || shipment.toHospitalId === hospital.id,
  );
  const myRecommendations = recommendations.filter(
    (recommendation) => recommendation.toHospitalId === hospital.id || recommendation.fromHospitalId === hospital.id,
  );

  return (
    <div className="space-y-4">
      <GlassCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{hospital.name}</h2>
            <p className="text-sm text-slate-300">{hospital.city}</p>
          </div>
          <StatusBadge status={hospital.status === "critical" ? "critical" : hospital.status === "strained" ? "high" : "safe"} />
        </div>
      </GlassCard>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {BLOOD_TYPE_LIST.map((bloodType) => {
          const forecast = hospitalForecasts.find((item) => item.bloodType === bloodType);
          return (
            <GlassCard key={bloodType}>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">{bloodType}</p>
              <p className="mt-1 text-3xl font-semibold">{hospital.inventoryByBloodType[bloodType] ?? 0}u</p>
              {forecast && (
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={forecast.shortageRiskLevel} />
                  <span className="text-xs text-slate-300">24h demand {forecast.predictedDemand24h}u</span>
                </div>
              )}
              <div className="mt-3">
                <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Adjust units</label>
                <input
                  type="range"
                  min={0}
                  max={120}
                  value={hospital.inventoryByBloodType[bloodType] ?? 0}
                  onChange={(event) => onInventoryChange(hospital.id, bloodType, Number(event.target.value))}
                  className="mt-1 w-full accent-cyan-400"
                />
              </div>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">My Active Shipments</h3>
          <div className="mt-3 space-y-2">
            {activeShipments.slice(0, 6).map((shipment) => (
              <div key={shipment.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">
                    {shipment.bloodType} · {shipment.quantity}u
                  </p>
                  <StatusBadge status={shipment.status} />
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  {shipment.fromHospitalId === hospital.id ? "Outgoing" : "Incoming"} · ETA {Math.round(shipment.etaMinutes)}m
                </p>
                {shipment.status !== "delivered" && shipment.toHospitalId === hospital.id && (
                  <button
                    type="button"
                    className="mt-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
                    onClick={() => onReceiveShipment(shipment.id)}
                  >
                    Mark Received
                  </button>
                )}
              </div>
            ))}
            {activeShipments.length === 0 && <p className="text-sm text-slate-300">No active shipments.</p>}
          </div>
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Recommended Transfers</h3>
          <div className="mt-3 space-y-2">
            {myRecommendations.slice(0, 6).map((recommendation) => (
              <div key={recommendation.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {recommendation.bloodType} · {recommendation.suggestedQuantity}u
                  </p>
                  <StatusBadge status={recommendation.urgency === "critical" ? "critical" : recommendation.urgency === "high" ? "high" : "elevated"} />
                </div>
                <p className="mt-1 text-xs text-slate-300">{recommendation.reason}</p>
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
                      className="rounded-lg border border-rose-300/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-100 transition hover:bg-rose-500/20"
                      onClick={() => onDispatchRecommendation(recommendation.id)}
                    >
                      Dispatch
                    </button>
                  )}
                </div>
              </div>
            ))}
            {myRecommendations.length === 0 && <p className="text-sm text-slate-300">No recommendations at this time.</p>}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
