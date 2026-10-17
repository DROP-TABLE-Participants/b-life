import { GlassCard } from "@/components/ui/GlassCard";
import type { SystemKPI } from "@/types/domain";

interface KpiRibbonProps {
  kpis: SystemKPI;
}

const labels: Array<[keyof SystemKPI, string]> = [
  ["totalHospitals", "Лечебни заведения"],
  ["activeShipments", "Активни пратки"],
  ["criticalShortages", "Критични недостизи"],
  ["expiringUnitsRisk", "Риск от изтичане на срока"],
  ["redistributionEfficiency", "Ефективност на разпределението"],
  ["fulfilledRecommendations", "Изпълнени препоръки"],
];

export function KpiRibbon({ kpis }: KpiRibbonProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {labels.map(([key, label]) => (
        <GlassCard key={key}>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-700/70">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {key === "redistributionEfficiency" ? `${kpis[key]}%` : kpis[key]}
          </p>
        </GlassCard>
      ))}
    </div>
  );
}
