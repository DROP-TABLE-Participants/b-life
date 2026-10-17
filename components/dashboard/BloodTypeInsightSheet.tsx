"use client";

import Link from "next/link";
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { ChartNoAxesCombined, Plus, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BloodGroupCard } from "@/components/dashboard/HospitalBloodInventoryCards";
import { TransferRow } from "@/components/dashboard/DashboardParts";
import { canManageRecommendation } from "@/lib/access";
import { facilityOutlook, formatHours, formatSignedUnits, PLANNING_HORIZON, roundUnits } from "@/lib/insights";
import { facilityShortName } from "@/lib/transfers";
import { formatMinutes } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import type { BloodType, Forecast, Hospital, SessionState, Shipment, TransferRecommendation } from "@/types/domain";

interface BloodTypeInsightSheetProps {
  open: boolean;
  bloodType: BloodType | null;
  hospital: Hospital;
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
  session: SessionState;
  onOpenChange: (open: boolean) => void;
}

export function BloodTypeInsightSheet({ open, bloodType, hospital, hospitals, forecasts, shipments, recommendations, session, onOpenChange }: BloodTypeInsightSheetProps) {
  const approveRecommendation = useAppStore((state) => state.approveRecommendation);
  if (!bloodType || !open) return <Sheet open={open} onOpenChange={onOpenChange} />;

  const forecast = forecasts.find((item) => item.bloodType === bloodType && item.hospitalId === hospital.id);
  const row = facilityOutlook(hospital, forecasts, shipments).rows.find((item) => item.bloodType === bloodType);
  const name = (id: string) => facilityShortName(hospitals.find((item) => item.id === id));
  const active = shipments.filter((item) => item.bloodType === bloodType && item.status !== "delivered" && item.status !== "cancelled");
  const outgoing = active.filter((item) => item.fromHospitalId === hospital.id && (item.status === "in_transit" || item.status === "delayed"));
  const incoming = active.filter((item) => item.toHospitalId === hospital.id && (item.status === "in_transit" || item.status === "delayed"));
  const related = recommendations.filter((item) => item.bloodType === bloodType && (item.status === "pending_approval" || item.status === "approved") &&
    (item.fromHospitalId === hospital.id || item.toHospitalId === hospital.id));
  const surplus = forecast?.surplusRiskLevel === "critical" || forecast?.surplusRiskLevel === "high";
  const readOnly = session.mode === "control_tower";
  const base = readOnly ? "/control-tower" : `/hospital/${hospital.id}`;
  const short = (row?.replenishmentUnits ?? 0) > 0;
  const movement = [
    ["Изходящи в движение", outgoing.length ? outgoing.map((item) => `${item.quantity} ед. → ${name(item.toHospitalId)} · ~${formatMinutes(item.etaMinutes)}`).join(", ") : "Няма"],
    ["Входящи", incoming.length ? incoming.map((item) => `${item.quantity} ед. ← ${name(item.fromHospitalId)} · ~${formatMinutes(item.etaMinutes)}`).join(", ") : "Няма"],
    ["Заделени за изпращане", `${row?.reservedUnits ?? 0} ед.`],
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-0 overflow-y-auto p-0 data-[side=right]:sm:max-w-[460px]">
        <SheetHeader className="px-6 pt-5 pb-3 pr-14">
          <SheetTitle className="text-lg font-semibold text-ink">Кръвна група {bloodType}</SheetTitle>
          <SheetDescription className="text-xs text-ink-secondary">{hospital.name}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-6 pb-6">
          <BloodGroupCard hospital={hospital} bloodType={bloodType} forecast={forecast} shipments={shipments} />
          {surplus && <Badge dot className="text-ink-secondary">Излишък · риск от изтичане</Badge>}

          {row && <dl className="grid grid-cols-3 gap-2">
            {[["Свободни", `${row.availableUnits} ед.`, false], [`Нужни за ${PLANNING_HORIZON} ч.`, `${roundUnits(row.demandUnits)} ед.`, false],
              [`Баланс след ${PLANNING_HORIZON} ч.`, formatSignedUnits(row.balance), row.balance < 0]].map(([label, value, warn]) =>
              <div key={String(label)} className="rounded-xl border border-hairline bg-white px-3 py-2.5">
                <dt className="text-xs text-ink-secondary">{label}</dt>
                <dd className={warn ? "text-base font-semibold text-critical" : "text-base font-semibold text-ink"}>{value}</dd>
              </div>)}
          </dl>}

          {row && <section className="space-y-1.5">
            <h3 className="text-xs font-medium text-ink-secondary">Прогнозен баланс · {PLANNING_HORIZON} ч.{row.firstShortageHour !== null && <span className="text-critical"> · недостиг след {formatHours(row.firstShortageHour)}</span>}</h3>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={row.points} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                  <defs><linearGradient id="sheet-balance" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="hour" type="number" domain={[0, PLANNING_HORIZON]} ticks={[0, 24, 48]} tickFormatter={(hour: number) => hour === 0 ? "Сега" : `${hour} ч.`}
                    axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--ink-muted)" }} />
                  <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
                  <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
                  <Area dataKey="withDeliveries" type="linear" stroke="var(--brand)" strokeWidth={2.5} fill="url(#sheet-balance)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>}

          <section>
            <h3 className="pb-1 text-xs font-medium text-ink-secondary">Движение</h3>
            {movement.map(([label, value]) => <div key={label} className="flex justify-between gap-4 border-b border-hairline py-2 text-xs">
              <span className="text-ink-secondary">{label}</span><span className="text-right font-medium text-ink">{value}</span>
            </div>)}
          </section>

          {related.length > 0 && <section>
            <h3 className="flex gap-1.5 text-xs font-medium text-ink-secondary">Препоръки за {bloodType}<span className="font-normal text-ink-muted">{related.length}</span></h3>
            <div className="divide-y divide-hairline">{related.map((item) => {
              const outgoingAdvice = item.fromHospitalId === hospital.id;
              return <TransferRow key={item.id} compact kind="recommendation" bloodType="" title={`${item.suggestedQuantity} ед. ${outgoingAdvice ? `→ ${name(item.toHospitalId)}` : `← ${name(item.fromHospitalId)}`}`}
                meta={`${item.status === "approved" ? "Одобрена" : "Чака одобрение"} · ~${formatMinutes(item.etaMinutes)} път`}
                actions={item.status === "pending_approval" && canManageRecommendation(session, item) ?
                  <Button size="sm" variant="secondary" onClick={() => approveRecommendation(item.id)}>Одобряване</Button> : undefined} />;
            })}</div>
          </section>}
        </div>
        <SheetFooter className="flex-row border-t border-hairline px-6 pt-4 pb-6">
          <Button variant="outline" className="flex-1" nativeButton={false} render={<Link href={`${base}/forecast`} />}><ChartNoAxesCombined />Прогноза за {bloodType}</Button>
          {!readOnly && (short
            ? <Button className="flex-1" nativeButton={false} render={<Link href={`${base}/transfers?request=1&bloodType=${encodeURIComponent(bloodType)}&quantity=${row?.replenishmentUnits ?? ""}`} />}><Plus />Заявка за {bloodType}</Button>
            : <Button className="flex-1" nativeButton={false} render={<Link href={`${base}/transfers?send=1&bloodType=${encodeURIComponent(bloodType)}`} />}><Send />Изпращане на {bloodType}</Button>)}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
