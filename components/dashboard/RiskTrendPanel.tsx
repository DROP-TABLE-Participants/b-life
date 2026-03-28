import { GlassCard } from "@/components/ui/GlassCard";
import { formatHospitalLabel } from "@/lib/utils";
import type { Forecast, Hospital } from "@/types/domain";

interface RiskTrendPanelProps {
  forecasts: Forecast[];
  hospitals: Hospital[];
}

const barColor = (score: number): string => {
  if (score >= 80) return "bg-rose-400";
  if (score >= 60) return "bg-orange-400";
  if (score >= 35) return "bg-amber-300";
  return "bg-emerald-400";
};

export function RiskTrendPanel({ forecasts, hospitals }: RiskTrendPanelProps) {
  const top = [...forecasts].sort((a, b) => b.shortageRiskScore - a.shortageRiskScore).slice(0, 8);

  return (
    <GlassCard>
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Forecast Risk Intensity</h3>
      <div className="mt-4 space-y-3">
        {top.map((forecast) => (
          <div key={`${forecast.hospitalId}-${forecast.bloodType}`}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-300">
              <span>
                {formatHospitalLabel(hospitals.find((hospital) => hospital.id === forecast.hospitalId))} · {forecast.bloodType}
              </span>
              <span>{Math.round(forecast.shortageRiskScore)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full ${barColor(forecast.shortageRiskScore)} transition-all`}
                style={{ width: `${Math.min(100, Math.max(0, forecast.shortageRiskScore))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
