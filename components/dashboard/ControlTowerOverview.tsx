import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";

interface ControlTowerOverviewProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
  onApproveRecommendation: (id: string) => void;
  onDispatchRecommendation: (id: string) => void;
}

export function ControlTowerOverview({
  hospitals,
  forecasts,
  shipments,
  recommendations,
  onApproveRecommendation,
  onDispatchRecommendation,
}: ControlTowerOverviewProps) {
  const shortageRank = [...forecasts]
    .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore)
    .slice(0, 8);

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
                  {from?.city} → {to?.city} · {recommendation.bloodType}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  {recommendation.suggestedQuantity}u · ETA {recommendation.etaMinutes}m · Confidence {recommendation.confidenceScore}%
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
                  {from?.city} → {to?.city} · {Math.round(shipment.progress * 100)}% progress
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
