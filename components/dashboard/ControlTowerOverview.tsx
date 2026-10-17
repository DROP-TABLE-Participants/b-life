import { RECOMMENDATION_STATUS_LABELS } from "@/lib/labels";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatHospitalLabel } from "@/lib/utils";
import type { Forecast, Hospital, Shipment, TransferRecommendation } from "@/types/domain";

interface ControlTowerOverviewProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
}

export function ControlTowerOverview({
  hospitals,
  forecasts,
  shipments,
  recommendations,
}: ControlTowerOverviewProps) {
  const shortageRank = [...forecasts]
    .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore)
    .slice(0, 8);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Класация на критичните недостизи</h3>
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
                <p className="mt-1 text-xs text-slate-500">Оценка на риска {Math.round(forecast.shortageRiskScore)} · Потребност {forecast.predictedDemand24h} ед.</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Препоръчани прехвърляния</h3>
        <div className="mt-3 space-y-2">
          {recommendations.slice(0, 8).map((recommendation) => {
            const from = hospitals.find((hospital) => hospital.id === recommendation.fromHospitalId);
            const to = hospitals.find((hospital) => hospital.id === recommendation.toHospitalId);

            return (
              <div key={recommendation.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium">
                  {recommendation.bloodType} · {recommendation.suggestedQuantity} ед.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  От {formatHospitalLabel(from)} до {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Очаквано пристигане {recommendation.etaMinutes} мин. · Надеждност {recommendation.confidenceScore}%
                </p>
                <p className="mt-2 text-xs text-slate-500">{RECOMMENDATION_STATUS_LABELS[recommendation.status]}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard className="xl:col-span-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Наблюдение на пратките</h3>
        <div className="mt-3 space-y-2">
          {shipments.slice(0, 8).map((shipment) => {
            const from = hospitals.find((hospital) => hospital.id === shipment.fromHospitalId);
            const to = hospitals.find((hospital) => hospital.id === shipment.toHospitalId);

            return (
              <div key={shipment.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {shipment.bloodType} · {shipment.quantity} ед.
                  </p>
                  <StatusBadge status={shipment.status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  От {formatHospitalLabel(from)} до {formatHospitalLabel(to)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {Math.round(shipment.progress * 100)}% напредък · Очаквано пристигане {Math.round(shipment.etaMinutes)} мин.
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
