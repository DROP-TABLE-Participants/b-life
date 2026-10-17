"use client";

import { useState } from "react";
import { ChartNoAxesCombined, MapPinned, Truck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BloodTypeInsightSheet } from "@/components/dashboard/BloodTypeInsightSheet";
import { HospitalBloodInventoryCards } from "@/components/dashboard/HospitalBloodInventoryCards";
import { LiveShipmentCard, LiveStamp, OutlookPill, PageHeader, SectionCard, TransferIcon, type TransferKind } from "@/components/dashboard/DashboardParts";
import { coverageRatio, facilityOutlook, formatCoverage, formatHours, formatSignedUnits, PLANNING_HORIZON } from "@/lib/insights";
import { SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { facilityShortName, transferQueue } from "@/lib/transfers";
import { cn, formatMinutes } from "@/lib/utils";
import type { BloodOrder, BloodType, Forecast, Hospital, SessionState, Shipment, TransferRecommendation } from "@/types/domain";

interface FacilityOverviewProps {
  hospital: Hospital;
  hospitals: Hospital[];
  session: SessionState;
  shipments: Shipment[];
  orders: BloodOrder[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
}

interface ActionItem { key: string; kind: TransferKind; title: string; meta: string }

export function FacilityOverview({ hospital, hospitals, session, shipments, orders, forecasts, recommendations }: FacilityOverviewProps) {
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const base = `/hospital/${hospital.id}`;
  const name = (id: string) => facilityShortName(hospitals.find((item) => item.id === id));
  const ownForecasts = forecasts.filter((item) => item.hospitalId === hospital.id);
  const { rows, summary } = facilityOutlook(hospital, forecasts, shipments);
  const queue = transferQueue(hospital.id, session, shipments, orders, recommendations);
  const shortageAt = (facilityId: string, type: BloodType) => {
    const facility = hospitals.find((item) => item.id === facilityId);
    const row = facility && facilityOutlook(facility, forecasts, shipments).rows.find((item) => item.bloodType === type);
    return row?.firstShortageHour ?? null;
  };
  const recommendationMeta = (item: TransferRecommendation) => {
    const hour = shortageAt(item.toHospitalId, item.bloodType);
    return hour === null ? "Препоръка от системата" : `Препоръка · недостиг при получателя след ${formatHours(hour)}`;
  };

  const actions: ActionItem[] = [
    ...queue.incomingRequests.map((item) => ({ key: item.id, kind: "request" as const, title: `${item.bloodType} · ${item.quantity} ед. за ${name(item.requesterHospitalId)}`, meta: "Входяща заявка · очаква Вашия отговор" })),
    ...queue.recommendationsToApprove.map((item) => ({ key: item.id, kind: "recommendation" as const, title: `${item.bloodType} · ${item.suggestedQuantity} ед. → ${name(item.toHospitalId)}`, meta: recommendationMeta(item) })),
    ...queue.recommendationsToDispatch.map((item) => ({ key: item.id, kind: "outgoing" as const, title: `${item.bloodType} · ${item.suggestedQuantity} ед. → ${name(item.toHospitalId)}`, meta: "Одобрена препоръка · готова за изпращане" })),
    ...queue.toDispatch.map((item) => ({ key: item.id, kind: "outgoing" as const, title: `${item.bloodType} · ${item.quantity} ед. → ${name(item.toHospitalId)}`, meta: `${SHIPMENT_STATUS_LABELS[item.status]} · очаква изпращане от Вас` })),
    ...queue.toReceive.map((item) => ({ key: item.id, kind: "incoming" as const, title: `${item.bloodType} · ${item.quantity} ед. ← ${name(item.fromHospitalId)}`, meta: item.progress >= 1 ? "Пристигнала · потвърдете получаването" : `Пристига след ~${formatMinutes(item.etaMinutes)} · потвърдете получаването` })),
    ...queue.recommendationsForMe.map((item) => ({ key: item.id, kind: "recommendation" as const, title: `${item.bloodType} · ${item.suggestedQuantity} ед. ← ${name(item.fromHospitalId)}`, meta: "Препоръка към Вас · може да заявите" })),
  ];
  const balances = [...rows].sort((a, b) => a.balance - b.balance);
  const scale = Math.max(1, ...balances.map((item) => Math.abs(item.balance)));
  const shortage = summary.shortages[0];

  return <div className="flex flex-col gap-6">
    <PageHeader title="Общ преглед" subtitle={hospital.name}>
      <LiveStamp />
      <OutlookPill shortage={!!shortage}
        title={shortage ? `Недостиг: ${shortage.bloodType} след ${formatHours(shortage.firstShortageHour ?? 0)}` : `Покрито за ${PLANNING_HORIZON} ч.`}
        detail={shortage ? `${summary.shortages.length} ${summary.shortages.length === 1 ? "кръвна група" : "кръвни групи"} · за допълване ${summary.replenishmentUnits} ед.` : "без очакван недостиг"}
        actionHref={shortage ? `${base}/transfers?request=1&bloodType=${encodeURIComponent(shortage.bloodType)}&quantity=${shortage.replenishmentUnits}` : undefined}
        actionLabel="Заявка за кръв" />
    </PageHeader>

    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-baseline gap-2 text-base font-semibold text-ink">Наличности по кръвни групи<span className="text-xs font-normal text-ink-muted">ед. налични / нужни за {PLANNING_HORIZON} ч.</span></h2>
        <p className="text-xs text-ink-secondary">Изберете група за подробности</p>
      </div>
      <HospitalBloodInventoryCards hospital={hospital} forecasts={ownForecasts} shipments={shipments} onSelectBloodType={setBloodType} />
    </section>

    <div className="grid gap-4 xl:grid-cols-3">
      <SectionCard title="Изисква действие" count={actions.length} action={{ label: "Трансфери", href: `${base}/transfers`, icon: Truck }}>
        {actions.length === 0 ? <p className="text-sm text-ink-muted">Няма чакащи действия.</p> :
          <div className="divide-y divide-hairline">{actions.slice(0, 5).map((item) => <div key={item.key} className="flex items-center gap-3 py-2.5">
            <TransferIcon kind={item.kind} className="size-8" />
            <div className="min-w-0"><p className="truncate text-xs font-medium text-ink">{item.title}</p><p className="truncate text-xs text-ink-secondary">{item.meta}</p></div>
          </div>)}</div>}
        {actions.length > 5 && <p className="pt-2 text-xs text-ink-secondary">Още {actions.length - 5} в Трансфери</p>}
      </SectionCard>

      <SectionCard title="В движение" count={queue.inTransit.length} action={{ label: "Карта", href: `${base}/map`, icon: MapPinned }}>
        <div className="space-y-3">
          {queue.inTransit.length === 0 && <p className="text-sm text-ink-muted">Няма пратки в движение.</p>}
          {queue.inTransit.slice(0, 2).map((item) => <LiveShipmentCard key={item.id} muted delayed={item.status === "delayed"}
            title={`${item.bloodType} · ${item.quantity} ед.`} eta={item.progress >= 1 ? "пристигна" : `~${formatMinutes(item.etaMinutes)}`} progress={item.progress}
            route={`${name(item.fromHospitalId)} → ${name(item.toHospitalId)}${item.status === "delayed" ? " · закъснява" : ""}`} />)}
          {queue.history.length > 0 && <div className="border-t border-hairline pt-3">
            <p className="mb-2 text-xs font-medium text-ink-secondary">Последни</p>
            <div className="space-y-2">{queue.history.slice(0, 2).map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-ink">{item.bloodType} · {item.quantity} ед. {item.fromHospitalId === hospital.id ? `→ ${name(item.toHospitalId)}` : `← ${name(item.fromHospitalId)}`}</span>
              <Badge>{SHIPMENT_STATUS_LABELS[item.status]}</Badge>
            </div>)}</div>
          </div>}
        </div>
      </SectionCard>

      <SectionCard title={`Следващите ${PLANNING_HORIZON} ч.`} action={{ label: "Прогнози", href: `${base}/forecast`, icon: ChartNoAxesCombined }}>
        <dl className="flex gap-6 border-b border-hairline pb-3">
          {[["Покритие", formatCoverage(coverageRatio(rows))], [`Нужни ${PLANNING_HORIZON} ч.`, `${summary.demandUnits} ед.`], ["За допълване", `${summary.replenishmentUnits} ед.`]].map(([label, value]) =>
            <div key={label}><dt className="text-xs text-ink-secondary">{label}</dt><dd className="text-base font-semibold text-ink">{value}</dd></div>)}
        </dl>
        <p className="pt-3 pb-2 text-xs font-medium text-ink-secondary">Баланс след {PLANNING_HORIZON} ч. по група</p>
        <div className="space-y-2">{balances.map((item) => <div key={item.bloodType} className="flex items-center gap-3 text-xs">
          <span className="w-8 font-medium text-ink">{item.bloodType}</span>
          <span aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className={cn("block h-full rounded-full", item.balance < 0 ? "bg-critical" : "bg-ink-muted")} style={{ width: `${Math.max(4, Math.abs(item.balance) / scale * 100)}%` }} />
          </span>
          <span className={cn("w-14 text-right", item.balance < 0 ? "font-medium text-critical" : "text-ink")}>{formatSignedUnits(item.balance)}</span>
        </div>)}</div>
        {rows.length === 0 && <p className="text-sm text-ink-muted">Все още няма прогноза за този обект.</p>}
      </SectionCard>
    </div>

    <BloodTypeInsightSheet open={bloodType !== null} bloodType={bloodType} hospital={hospital} hospitals={hospitals}
      forecasts={ownForecasts} shipments={shipments} recommendations={recommendations} session={session}
      onOpenChange={(open) => { if (!open) setBloodType(null); }} />
  </div>;
}

