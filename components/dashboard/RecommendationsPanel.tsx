"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_LABELS, RECOMMENDATION_STATUS_LABELS } from "@/lib/labels";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import type { Hospital, TransferRecommendation } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";

export function RecommendationsPanel({ hospitals, recommendations, facility, onApprove, onDispatch }: {
  hospitals: Hospital[]; recommendations: TransferRecommendation[]; facility?: Hospital; onApprove?: (id: string) => void; onDispatch?: (id: string) => void;
}) {
  const active = recommendations.filter((item) => item.status !== "fulfilled" && item.status !== "cancelled");
  return <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
    <CardHeader className="p-4 pb-0"><CardTitle>Препоръчани прехвърляния</CardTitle></CardHeader>
    <CardContent className="space-y-3 p-4">
      {facility?.kind === "hospital" && <p className="text-sm text-muted-foreground">Препоръки за Вашата болница. Прехвърлянията се одобряват от изпращащия център.</p>}
      {active.length === 0 && <p className="text-sm text-muted-foreground">В момента няма препоръчани прехвърляния.</p>}
      {active.map((item) => <article key={item.id} className="space-y-2 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{item.bloodType} · {item.suggestedQuantity} ед.</p><Badge variant="outline">{PRIORITY_LABELS[item.urgency]}</Badge></div>
        <p className="text-sm">От {formatHospitalLabel(hospitals.find((hospital) => hospital.id === item.fromHospitalId))} до {formatHospitalLabel(hospitals.find((hospital) => hospital.id === item.toHospitalId))}</p>
        <p className="text-sm text-muted-foreground">{item.reason}</p>
        <p className="text-sm text-muted-foreground">{RECOMMENDATION_STATUS_LABELS[item.status]} · Очаквано пристигане {formatMinutes(item.etaMinutes)} · Надеждност {item.confidenceScore}%</p>
        {facility && facility.kind !== "hospital" && item.fromHospitalId === facility.id && <div className="flex gap-2">
          {onApprove && item.status === "pending_approval" && <Button type="button" size="sm" onClick={() => onApprove(item.id)}>Одобряване</Button>}
          {onDispatch && item.status === "approved" && <Button type="button" size="sm" variant="outline" onClick={() => onDispatch(item.id)}>Изпращане</Button>}
        </div>}
      </article>)}
    </CardContent>
  </Card>;
}
