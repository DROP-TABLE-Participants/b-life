"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, TransferRow } from "@/components/dashboard/DashboardParts";
import { PRIORITY_LABELS, RECOMMENDATION_STATUS_LABELS } from "@/lib/labels";
import { formatMinutes } from "@/lib/utils";
import type { Hospital, TransferRecommendation } from "@/types/domain";

export function RecommendationsPanel({ hospitals, recommendations, facility, onApprove, onDispatch }: {
  hospitals: Hospital[]; recommendations: TransferRecommendation[]; facility?: Hospital; onApprove?: (id: string) => void; onDispatch?: (id: string) => void;
}) {
  const active = recommendations.filter((item) => item.status !== "fulfilled" && item.status !== "cancelled");
  const name = (id: string) => hospitals.find((hospital) => hospital.id === id)?.name ?? "Непознат обект";
  return <div className="flex flex-col gap-6">
    {facility && <PageHeader title="Препоръки" subtitle={facility.kind === "hospital" ? "Препоръки за Вашата болница. Прехвърлянията се одобряват от изпращащия център." : `Препоръчани прехвърляния за ${facility.name}`} />}
    <section className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-glass-card">
      {active.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">В момента няма препоръчани прехвърляния.</p>}
      <div className="divide-y divide-hairline">{active.map((item) => {
        const own = facility && facility.kind !== "hospital" && item.fromHospitalId === facility.id;
        return <div key={item.id}>
          <TransferRow kind="recommendation" bloodType={item.bloodType} title={`${item.suggestedQuantity} ед. · ${name(item.fromHospitalId)} → ${name(item.toHospitalId)}`}
            meta={`${RECOMMENDATION_STATUS_LABELS[item.status]} · ~${formatMinutes(item.etaMinutes)} път · ${Math.round(item.distanceKm)} км · надеждност ${item.confidenceScore}%`}
            badge={item.urgency === "critical" ? <Badge variant="critical" dot>{PRIORITY_LABELS[item.urgency]}</Badge> : <Badge>{PRIORITY_LABELS[item.urgency]}</Badge>}
            actions={own ? <>
              {onApprove && item.status === "pending_approval" && <Button size="sm" variant="secondary" onClick={() => onApprove(item.id)}>Одобряване</Button>}
              {onDispatch && item.status === "approved" && <Button size="sm" variant="secondary" onClick={() => onDispatch(item.id)}>Изпращане</Button>}
            </> : undefined} />
          <p className="-mt-2 px-4 pb-3.5 pl-[124px] text-xs text-ink-secondary">{item.reason}</p>
        </div>;
      })}</div>
    </section>
  </div>;
}
