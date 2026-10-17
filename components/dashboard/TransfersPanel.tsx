"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, MapPinned, Plus, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { LiveShipmentCard, PageHeader, TransferRow } from "@/components/dashboard/DashboardParts";
import { RequestSheet, SendSheet, type SheetPreset } from "@/components/dashboard/TransferSheets";
import { availableInventoryUnits } from "@/lib/inventory";
import { facilityOutlook, formatHours, PLANNING_HORIZON, roundUnits } from "@/lib/insights";
import { ORDER_STATUS_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { estimateRoute } from "@/lib/map-config";
import { facilityShortName, networkTransfers, transferQueue } from "@/lib/transfers";
import { cn, formatMinutes } from "@/lib/utils";
import { BLOOD_TYPES, type BloodOrder, type BloodOrderDraft, type BloodType, type Forecast, type Hospital, type ManualShipmentDraft, type SessionState, type Shipment, type TransferRecommendation } from "@/types/domain";

interface TransfersPanelProps {
  hospital?: Hospital;
  hospitals: Hospital[];
  session: SessionState;
  shipments: Shipment[];
  orders: BloodOrder[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  onAcceptOrder?: (id: string) => boolean;
  onRejectOrder?: (id: string) => boolean;
  onCancelOrder?: (id: string) => boolean;
  onApproveRecommendation?: (id: string) => void;
  onDispatchRecommendation?: (id: string) => void;
  onDispatchShipment?: (id: string) => void;
  onReceiveShipment?: (id: string) => void;
  onPlaceOrder?: (draft: BloodOrderDraft) => boolean;
  onScheduleShipment?: (draft: ManualShipmentDraft) => boolean;
}

type Tab = "action" | "progress" | "history";

const relativeTime = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (minutes < 1) return "току-що";
  if (minutes < 60) return `преди ${minutes} мин.`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `преди ${hours} ч.` : `преди ${Math.round(hours / 24)} дни`;
};

function Section({ title, count, tone, children }: { title: string; count: number; tone?: "brand"; children: React.ReactNode }) {
  if (count === 0) return null;
  return <section className="border-t border-hairline first:border-t-0">
    <h3 className={cn("flex items-center gap-2 px-4 pt-2.5 pb-2 text-xs font-medium", tone === "brand" ? "bg-brand-soft text-brand-strong" : "bg-canvas/70 text-ink-secondary")}>
      {title}<span className="font-normal text-ink-muted">{count}</span>
    </h3>
    <div className="divide-y divide-hairline">{children}</div>
  </section>;
}

function StockCheck({ tone, children }: { tone: "safe" | "elevated" | "critical"; children: React.ReactNode }) {
  const Icon = tone === "safe" ? Check : tone === "elevated" ? AlertTriangle : X;
  const tones = { safe: "border-safe-border bg-safe-soft text-safe", elevated: "border-elevated-border bg-elevated-soft text-elevated", critical: "border-critical-border bg-critical-soft text-critical" };
  return <p className={cn("inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium", tones[tone])}><Icon className="size-3.5" />{children}</p>;
}

export function TransfersPanel(props: TransfersPanelProps) {
  const { hospital, hospitals, session, shipments, orders, forecasts, recommendations } = props;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("action");
  const [message, setMessage] = useState("");
  const [sheetKey, setSheetKey] = useState(0);
  const presetType = searchParams.get("bloodType") as BloodType | null;
  const presetQuantity = Number(searchParams.get("quantity"));
  const [preset, setPreset] = useState<SheetPreset>(() => ({
    bloodType: presetType && BLOOD_TYPES.includes(presetType) ? presetType : undefined,
    quantity: Number.isSafeInteger(presetQuantity) && presetQuantity > 0 ? presetQuantity : undefined,
    supplierId: searchParams.get("supplier") ?? undefined,
    recipientId: searchParams.get("to") ?? undefined,
  }));
  const [sheet, setSheet] = useState<"request" | "send" | null>(searchParams.get("request") ? "request" : searchParams.get("send") ? "send" : null);
  const name = (id: string) => facilityShortName(hospitals.find((item) => item.id === id));
  const fullName = (id: string) => hospitals.find((item) => item.id === id)?.name ?? "Непознат обект";
  const openSheet = (kind: "request" | "send", next: SheetPreset = {}) => { setPreset(next); setSheetKey((value) => value + 1); setSheet(kind); };
  const closeSheet = () => {
    setSheet(null);
    if (searchParams.toString()) router.replace(pathname, { scroll: false });
  };
  const notify = (text: string) => setMessage(text);

  if (!hospital) return <NetworkTransfers {...props} />;

  const queue = transferQueue(hospital.id, session, shipments, orders, recommendations);
  const ownRows = facilityOutlook(hospital, forecasts, shipments).rows;
  const shortageAt = (facilityId: string, type: BloodType) => {
    const facility = hospitals.find((item) => item.id === facilityId);
    return facility ? facilityOutlook(facility, forecasts, shipments).rows.find((item) => item.bloodType === type)?.firstShortageHour ?? null : null;
  };
  const distance = (from: string, to: string) => {
    const a = hospitals.find((item) => item.id === from), b = hospitals.find((item) => item.id === to);
    return a && b ? estimateRoute(a.coordinates, b.coordinates).km : null;
  };
  const adviceMeta = (item: TransferRecommendation) => {
    const hour = shortageAt(item.toHospitalId, item.bloodType);
    const km = distance(item.fromHospitalId, item.toHospitalId);
    return ["Препоръка от системата", hour !== null ? `недостиг при получателя след ${formatHours(hour)}` : null, km ? `${km} км` : null].filter(Boolean).join(" · ");
  };
  const stockCheck = (order: BloodOrder) => {
    const available = availableInventoryUnits({ hospitals, shipments }, hospital.id, order.bloodType);
    const need = roundUnits(ownRows.find((item) => item.bloodType === order.bloodType)?.demandUnits ?? 0);
    const after = available - order.quantity;
    if (after < 0) return { ok: false, node: <StockCheck tone="critical">Недостатъчна свободна наличност: {available} ед. {order.bloodType} (заявени {order.quantity})</StockCheck> };
    if (after < need) return { ok: true, node: <StockCheck tone="elevated">След приемане остават {after} ед. {order.bloodType} — под нуждата Ви за {PLANNING_HORIZON} ч. ({need})</StockCheck> };
    return { ok: true, node: <StockCheck tone="safe">Свободни {available} ед. {order.bloodType} · след приемане {after} ед. — над нуждата Ви за {PLANNING_HORIZON} ч. ({need})</StockCheck> };
  };
  const act = (done: boolean | void, success: string, failure: string) => notify(done === false ? failure : success);

  const tabs = [
    { value: "action" as const, label: "Изискват действие", count: queue.actionCount },
    { value: "progress" as const, label: "В процес", count: queue.progressCount },
    { value: "history" as const, label: "История", count: queue.history.length + queue.closedOrders.length },
  ];

  return <div className="flex flex-col gap-6">
    <PageHeader title="Трансфери" subtitle={`Заявки, препоръки и пратки на ${hospital.name}`}>
      <Button variant="secondary" onClick={() => openSheet("send")}><Send />Изпращане</Button>
      <Button onClick={() => openSheet("request")}><Plus />Заявка за кръв</Button>
    </PageHeader>

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <Segmented label="Филтър на трансферите" value={tab} onValueChange={setTab} options={tabs} />
        {message && <p role="status" className="rounded-lg border border-hairline bg-white px-3 py-2 text-sm text-ink">{message}</p>}
        <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-glass-card">
          {tab === "action" && <>
            {queue.actionCount === 0 && <p className="px-4 py-6 text-sm text-ink-muted">Няма чакащи действия. Новите заявки и препоръки ще се появят тук.</p>}
            <Section title="Входящи заявки" count={queue.incomingRequests.length} tone="brand">
              {queue.incomingRequests.map((order) => {
                const check = stockCheck(order);
                return <TransferRow key={order.id} kind="request" bloodType={order.bloodType} title={`${order.quantity} ед. за ${fullName(order.requesterHospitalId)}`}
                  meta={`Входяща заявка · подадена ${relativeTime(order.createdAt)} · приоритет ${PRIORITY_LABELS[order.priority].toLowerCase()}`}
                  badge={order.priority === "critical" ? <Badge variant="critical" dot>Критичен</Badge> : undefined} footer={check.node}
                  actions={<>
                    <Button size="sm" variant="outline" onClick={() => act(props.onRejectOrder?.(order.id), "Заявката е отказана.", "Заявката вече не очаква отговор.")}>Отказ</Button>
                    <Button size="sm" variant="secondary" disabled={!check.ok} onClick={() => act(props.onAcceptOrder?.(order.id), "Заявката е приета. Пратката е готова за изпращане.", "Заявката не може да бъде приета. Проверете свободната наличност.")}><Check />Приемане</Button>
                  </>} />;
              })}
            </Section>
            <Section title="Препоръки за одобрение" count={queue.recommendationsToApprove.length}>
              {queue.recommendationsToApprove.map((item) => <TransferRow key={item.id} kind="recommendation" bloodType={item.bloodType}
                title={`${item.suggestedQuantity} ед. → ${fullName(item.toHospitalId)}`} meta={adviceMeta(item)}
                badge={item.urgency === "critical" ? <Badge variant="critical" dot>Критичен</Badge> : undefined}
                actions={<Button size="sm" variant="secondary" onClick={() => { props.onApproveRecommendation?.(item.id); notify("Препоръката е одобрена. Изпратете я, когато пратката е готова."); }}>Одобряване</Button>} />)}
            </Section>
            <Section title="Одобрени препоръки за изпращане" count={queue.recommendationsToDispatch.length}>
              {queue.recommendationsToDispatch.map((item) => <TransferRow key={item.id} kind="outgoing" bloodType={item.bloodType}
                title={`${item.suggestedQuantity} ед. → ${fullName(item.toHospitalId)}`} meta={`Одобрена препоръка · ~${formatMinutes(item.etaMinutes)} път`}
                actions={<Button size="sm" variant="secondary" onClick={() => { props.onDispatchRecommendation?.(item.id); notify("Пратката по препоръката е изпратена."); }}><Send />Изпращане</Button>} />)}
            </Section>
            <Section title="За изпращане" count={queue.toDispatch.length}>
              {queue.toDispatch.map((item) => <TransferRow key={item.id} kind="outgoing" bloodType={item.bloodType}
                title={`${item.quantity} ед. → ${fullName(item.toHospitalId)}`} meta={`${item.orderId ? "По приета заявка" : item.status === "approved" ? "Одобрена" : "Планирана"} · количеството е резервирано и очаква изпращане от Вас`}
                actions={<Button size="sm" variant="secondary" onClick={() => { props.onDispatchShipment?.(item.id); notify("Пратката е изпратена."); }}><Send />Изпращане</Button>} />)}
            </Section>
            <Section title="За получаване" count={queue.toReceive.length}>
              {queue.toReceive.map((item) => <TransferRow key={item.id} kind="incoming" bloodType={item.bloodType} progress={item.progress}
                title={`${item.quantity} ед. ← ${fullName(item.fromHospitalId)}`}
                meta={item.progress >= 1 ? "Пристигнала · потвърдете получаването" : `В движение · пристига след ~${formatMinutes(item.etaMinutes)}`}
                badge={item.status === "delayed" ? <StatusBadge status="delayed" /> : undefined}
                actions={<Button size="sm" variant="secondary" onClick={() => { props.onReceiveShipment?.(item.id); notify("Получаването е потвърдено. Наличността е обновена."); }}><Check />Потвърждаване на получаване</Button>} />)}
            </Section>
          </>}

          {tab === "progress" && <>
            {queue.progressCount === 0 && <p className="px-4 py-6 text-sm text-ink-muted">Няма трансфери в процес.</p>}
            <Section title="Моите заявки" count={queue.myRequests.length}>
              {queue.myRequests.map((order) => <TransferRow key={order.id} kind="request" bloodType={order.bloodType}
                title={`${order.quantity} ед. от ${fullName(order.supplierHospitalId)}`} meta={`${ORDER_STATUS_LABELS[order.status]} · подадена ${relativeTime(order.createdAt)}`}
                actions={<Button size="sm" variant="outline" onClick={() => act(props.onCancelOrder?.(order.id), "Заявката е отменена.", "Заявката вече не може да бъде отменена.")}>Отмяна</Button>} />)}
            </Section>
            <Section title="Очакват изпращане от доставчика" count={queue.awaitingSupplier.length}>
              {queue.awaitingSupplier.map((item) => <TransferRow key={item.id} kind="incoming" bloodType={item.bloodType}
                title={`${item.quantity} ед. ← ${fullName(item.fromHospitalId)}`} meta={`${item.orderId ? "Приета заявка" : "Одобрена пратка"} · очаква изпращане от доставчика`} />)}
            </Section>
            <Section title="Препоръки към Вас" count={queue.recommendationsForMe.length}>
              {queue.recommendationsForMe.map((item) => <TransferRow key={item.id} kind="recommendation" bloodType={item.bloodType}
                title={`${item.suggestedQuantity} ед. ← ${fullName(item.fromHospitalId)}`} meta={`Препоръка от системата · доставка за ~${formatMinutes(item.etaMinutes)}`}
                actions={<Button size="sm" variant="secondary"
                  onClick={() => openSheet("request", { bloodType: item.bloodType, quantity: item.suggestedQuantity, supplierId: item.fromHospitalId })}>Заявяване</Button>} />)}
            </Section>
          </>}

          {tab === "history" && <>
            {queue.history.length + queue.closedOrders.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">Все още няма история.</p>}
            <Section title="Пратки" count={queue.history.length}>
              {queue.history.map((item) => <TransferRow key={item.id} kind={item.fromHospitalId === hospital.id ? "outgoing" : "incoming"} bloodType={item.bloodType}
                title={`${item.quantity} ед. ${item.fromHospitalId === hospital.id ? `→ ${fullName(item.toHospitalId)}` : `← ${fullName(item.fromHospitalId)}`}`}
                meta={`${item.id} · ${new Date(item.updatedAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}`} badge={<StatusBadge status={item.status} />} />)}
            </Section>
            <Section title="Заявки" count={queue.closedOrders.length}>
              {queue.closedOrders.map((order) => <TransferRow key={order.id} kind="request" bloodType={order.bloodType}
                title={`${order.quantity} ед. · ${name(order.requesterHospitalId)} ← ${name(order.supplierHospitalId)}`} meta={`Обновена ${relativeTime(order.updatedAt)}`}
                badge={<Badge>{ORDER_STATUS_LABELS[order.status]}</Badge>} />)}
            </Section>
          </>}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="flex items-center justify-between py-1.5">
          <h2 className="text-base font-semibold text-ink">В движение</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary"><span className="size-1.5 rounded-full bg-safe" />на живо</span>
        </div>
        {queue.inTransit.length === 0 && <p className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm text-ink-muted">Няма пратки в движение.</p>}
        {queue.inTransit.map((item) => <LiveShipmentCard key={item.id} delayed={item.status === "delayed"} progress={item.progress}
          title={`${item.bloodType} · ${item.quantity} ед.`} eta={item.progress >= 1 ? "пристигна" : `~${formatMinutes(item.etaMinutes)}`}
          route={`${name(item.fromHospitalId)} → ${name(item.toHospitalId)}${item.status === "delayed" ? " · закъснява" : ""}`} />)}
        <Button variant="outline" size="sm" className="w-full" nativeButton={false} render={<Link href={`/hospital/${hospital.id}/map`} />}><MapPinned />Отваряне на картата</Button>
      </aside>
    </div>

    {sheet === "request" && props.onPlaceOrder && <RequestSheet key={`request-${sheetKey}`} open onOpenChange={(open) => { if (!open) closeSheet(); }}
      hospital={hospital} hospitals={hospitals} shipments={shipments} forecasts={forecasts} recommendations={recommendations}
      preset={preset} onDone={notify} onOrder={props.onPlaceOrder} />}
    {sheet === "send" && props.onScheduleShipment && <SendSheet key={`send-${sheetKey}`} open onOpenChange={(open) => { if (!open) closeSheet(); }}
      hospital={hospital} hospitals={hospitals} shipments={shipments} forecasts={forecasts} recommendations={recommendations}
      preset={preset} onDone={notify} onSchedule={props.onScheduleShipment} />}
  </div>;
}

/** Read-only network view for the Ministry. */
function NetworkTransfers({ hospitals, shipments, orders, recommendations }: TransfersPanelProps) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const network = networkTransfers(shipments, orders, recommendations);
  const name = (id: string) => hospitals.find((item) => item.id === id)?.name ?? "Непознат обект";
  return <div className="flex flex-col gap-6">
    <PageHeader title="Трансфери" subtitle="Заявки, препоръки и пратки в мрежата · само за преглед"><Badge>Само преглед</Badge></PageHeader>
    <Segmented label="Филтър" value={tab} onValueChange={setTab} options={[
      { value: "active", label: "Активни", count: network.active.length + network.pendingOrders.length + network.pendingRecommendations.length },
      { value: "history", label: "История", count: network.history.length }]} />
    <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-glass-card">
      {tab === "active" ? <>
        <Section title="Заявки в изчакване" count={network.pendingOrders.length}>
          {network.pendingOrders.map((order) => <TransferRow key={order.id} kind="request" bloodType={order.bloodType}
            title={`${order.quantity} ед. · ${name(order.requesterHospitalId)} ← ${name(order.supplierHospitalId)}`} meta={`Приоритет ${PRIORITY_LABELS[order.priority].toLowerCase()}`} />)}
        </Section>
        <Section title="Препоръки" count={network.pendingRecommendations.length}>
          {network.pendingRecommendations.map((item) => <TransferRow key={item.id} kind="recommendation" bloodType={item.bloodType}
            title={`${item.suggestedQuantity} ед. · ${name(item.fromHospitalId)} → ${name(item.toHospitalId)}`} meta={item.status === "approved" ? "Одобрена · очаква изпращане" : "Чака одобрение от центъра"}
            badge={item.urgency === "critical" ? <Badge variant="critical" dot>Критичен</Badge> : undefined} />)}
        </Section>
        <Section title="Пратки" count={network.active.length}>
          {network.active.map((item) => <TransferRow key={item.id} kind="outgoing" bloodType={item.bloodType} progress={item.status === "in_transit" || item.status === "delayed" ? item.progress : undefined}
            title={`${item.quantity} ед. · ${name(item.fromHospitalId)} → ${name(item.toHospitalId)}`} meta={`Очаквано пристигане ~${formatMinutes(item.etaMinutes)}`}
            badge={<StatusBadge status={item.status} />} />)}
        </Section>
      </> : <Section title="Пратки" count={network.history.length}>
        {network.history.map((item) => <TransferRow key={item.id} kind="outgoing" bloodType={item.bloodType}
          title={`${item.quantity} ед. · ${name(item.fromHospitalId)} → ${name(item.toHospitalId)}`} meta={item.id} badge={<StatusBadge status={item.status} />} />)}
      </Section>}
    </div>
  </div>;
}
