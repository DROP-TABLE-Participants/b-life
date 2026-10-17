"use client";

import { useEffect, useState } from "react";
import { Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { availableInventoryUnits } from "@/lib/inventory";
import { facilityOutlook, formatHours, PLANNING_HORIZON, roundUnits } from "@/lib/insights";
import { PRIORITY_LABELS } from "@/lib/labels";
import { estimateRoute, fetchRoute, type RouteEstimate } from "@/lib/map-config";
import { cn, formatMinutes } from "@/lib/utils";
import { BLOOD_TYPES, type BloodOrderDraft, type BloodType, type Forecast, type Hospital, type ManualShipmentDraft, type PriorityLevel, type Shipment, type TransferRecommendation } from "@/types/domain";

const PRIORITIES = Object.keys(PRIORITY_LABELS) as PriorityLevel[];

// The earlier the first shortage, the more urgent the transfer.
const priorityForShortage = (hour: number | null): PriorityLevel =>
  hour === null ? "medium" : hour <= 12 ? "critical" : hour <= 24 ? "high" : "medium";

export interface SheetPreset { bloodType?: BloodType; quantity?: number; supplierId?: string; recipientId?: string }

interface SharedProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  preset?: SheetPreset;
  onDone: (message: string) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className="text-xs font-medium text-ink">{label}</p>{children}</div>;
}

function Hint({ tone = "critical", children }: { tone?: "critical" | "elevated" | "safe"; children: React.ReactNode }) {
  const tones = { critical: "border-critical-border bg-critical-soft text-critical", elevated: "border-elevated-border bg-elevated-soft text-elevated", safe: "border-safe-border bg-safe-soft text-safe" };
  return <p className={cn("flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-medium", tones[tone])}>
    <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />{children}
  </p>;
}

function Option({ selected, disabled, name, meta, tag, onSelect }: { selected: boolean; disabled?: boolean; name: string; meta: string; tag?: string; onSelect: () => void }) {
  return <button type="button" role="radio" aria-checked={selected} disabled={disabled} onClick={onSelect}
    className={cn("flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60",
      selected ? "border-brand bg-brand-soft ring-1 ring-brand" : "border-border bg-white hover:border-ink-muted")}>
    <span aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0 rounded-full border bg-white", selected ? "border-[5px] border-brand" : "border-border")} />
    <span className="min-w-0 flex-1">
      <span className="flex items-start justify-between gap-2"><span className="text-sm font-medium text-ink">{name}</span>{tag && <Badge>{tag}</Badge>}</span>
      <span className="mt-0.5 block text-xs text-ink-secondary">{meta}</span>
    </span>
  </button>;
}

function SheetShell({ open, onOpenChange, title, description, footer, children }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; footer: React.ReactNode; children: React.ReactNode }) {
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="gap-0 p-0 data-[side=right]:sm:max-w-[480px]">
      <SheetHeader className="px-6 pt-6 pb-2 pr-14">
        <SheetTitle className="text-lg font-semibold text-ink">{title}</SheetTitle>
        <SheetDescription className="text-xs text-ink-secondary">{description}</SheetDescription>
      </SheetHeader>
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-3">{children}</div>
      <SheetFooter className="border-t border-hairline px-6 pt-4 pb-6">{footer}</SheetFooter>
    </SheetContent>
  </Sheet>;
}

const groupOptions = (shortGroups: Set<BloodType>) => BLOOD_TYPES.map((type) => ({ value: type, label: type, marker: shortGroups.has(type) }));

/** Request blood: pre-filled from the forecast, suppliers ranked by the system. */
export function RequestSheet({ open, onOpenChange, hospital, hospitals, shipments, forecasts, recommendations, preset, onDone, onOrder }: SharedProps & { onOrder: (draft: BloodOrderDraft) => boolean }) {
  const { rows } = facilityOutlook(hospital, forecasts, shipments);
  const shortGroups = new Set(rows.filter((item) => item.replenishmentUnits > 0).map((item) => item.bloodType));
  const mostUrgent = rows.filter((item) => item.firstShortageHour !== null).sort((a, b) => a.firstShortageHour! - b.firstShortageHour!)[0];
  const [bloodType, setBloodType] = useState<BloodType>(preset?.bloodType ?? mostUrgent?.bloodType ?? "O-");
  const row = rows.find((item) => item.bloodType === bloodType);
  const suggested = row && row.replenishmentUnits > 0 ? row.replenishmentUnits : null;
  const [quantity, setQuantity] = useState(preset?.quantity ?? suggested ?? 4);
  const [priority, setPriority] = useState<PriorityLevel>(priorityForShortage(row?.firstShortageHour ?? null));
  const [supplierId, setSupplierId] = useState(preset?.supplierId ?? "");
  const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;
  const suppliers = hospitals.filter((item) => item.id !== hospital.id).map((item) => {
    const available = availableInventoryUnits({ hospitals, shipments }, item.id, bloodType);
    const route = estimateRoute(item.coordinates, hospital.coordinates);
    const recommended = recommendations.some((advice) => advice.fromHospitalId === item.id && advice.toHospitalId === hospital.id && advice.bloodType === bloodType && advice.status !== "cancelled");
    return { facility: item, available, route, recommended, eligible: validQuantity && available >= quantity };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || Number(b.recommended) - Number(a.recommended) || a.route.km - b.route.km);
  const selected = suppliers.find((item) => item.facility.id === supplierId && item.eligible) ?? suppliers.find((item) => item.eligible);

  const chooseGroup = (type: BloodType) => {
    const next = rows.find((item) => item.bloodType === type);
    setBloodType(type);
    if (next && next.replenishmentUnits > 0) setQuantity(next.replenishmentUnits);
    setPriority(priorityForShortage(next?.firstShortageHour ?? null));
  };
  const submit = () => {
    if (!selected || !validQuantity) return;
    const created = onOrder({ requesterHospitalId: hospital.id, supplierHospitalId: selected.facility.id, bloodType, quantity, priority });
    onDone(created ? `Заявката за ${quantity} ед. ${bloodType} е изпратена до ${selected.facility.name}.` : "Заявката не може да бъде изпратена. Наличността е променена — изберете доставчик отново.");
    if (created) onOpenChange(false);
  };

  return <SheetShell open={open} onOpenChange={onOpenChange} title="Заявка за кръв" description={`Попълнено по прогнозата за следващите ${PLANNING_HORIZON} ч.`}
    footer={<>
      <p className="text-xs text-ink-secondary">След приемане количеството се резервира при доставчика. Вие потвърждавате получаването.</p>
      <div className="flex justify-end gap-2.5">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Отказ</Button>
        <Button disabled={!selected || !validQuantity} onClick={submit}><Send />Изпращане на заявка · {validQuantity ? quantity : "—"} ед. {bloodType}</Button>
      </div>
    </>}>
    <Field label="Кръвна група">
      <Segmented label="Кръвна група" variant="chips" value={bloodType} onValueChange={chooseGroup} options={groupOptions(shortGroups)} />
      {row && row.firstShortageHour !== null && <Hint>Недостиг на {bloodType} след {formatHours(row.firstShortageHour)} · липсват {row.replenishmentUnits} ед. за {PLANNING_HORIZON} ч.</Hint>}
    </Field>
    <Field label="Количество">
      <div className="relative"><Input type="number" min={1} step={1} value={Number.isFinite(quantity) ? quantity : ""} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Количество" className="pr-12" />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">ед.</span></div>
      {suggested !== null && quantity === suggested && <p className="text-xs text-ink-muted">Предложено: недостигът на {bloodType} за {PLANNING_HORIZON} ч.</p>}
    </Field>
    <Field label="Приоритет">
      <Segmented label="Приоритет" className="flex w-full [&>button]:flex-1" value={priority} onValueChange={setPriority} options={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))} />
      {row?.firstShortageHour !== null && row?.firstShortageHour !== undefined && <p className="text-xs text-ink-muted">Предложен по времето до недостиг ({formatHours(row.firstShortageHour)}).</p>}
    </Field>
    <Field label="Доставчик">
      <div role="radiogroup" aria-label="Доставчик" className="space-y-2">
        {suppliers.map((item) => <Option key={item.facility.id} selected={selected?.facility.id === item.facility.id} disabled={!item.eligible}
          name={item.facility.name} tag={item.recommended && item.eligible ? "Препоръчан" : undefined} onSelect={() => setSupplierId(item.facility.id)}
          meta={item.eligible ? `${item.available} ед. свободни ${bloodType} · ${item.route.km} км · ~${formatMinutes(item.route.minutes)} път` : `Недостатъчна свободна наличност · ${item.available} ед. ${bloodType}`} />)}
      </div>
    </Field>
  </SheetShell>;
}

/** Send blood: recipients ranked by how soon they run short; ETA from the route. */
export function SendSheet({ open, onOpenChange, hospital, hospitals, shipments, forecasts, recommendations, preset, onDone, onSchedule }: SharedProps & { onSchedule: (draft: ManualShipmentDraft) => boolean }) {
  const ownRows = facilityOutlook(hospital, forecasts, shipments).rows;
  const recipients = hospitals.filter((item) => item.id !== hospital.id).map((item) => {
    const rows = facilityOutlook(item, forecasts, shipments).rows;
    const short = rows.filter((row) => row.firstShortageHour !== null).sort((a, b) => a.firstShortageHour! - b.firstShortageHour!);
    return { facility: item, rows, short, route: estimateRoute(hospital.coordinates, item.coordinates) };
  }).sort((a, b) => (a.short[0]?.firstShortageHour ?? Infinity) - (b.short[0]?.firstShortageHour ?? Infinity));
  const [recipientId, setRecipientId] = useState(preset?.recipientId ?? recipients[0]?.facility.id ?? "");
  const recipient = recipients.find((item) => item.facility.id === recipientId) ?? recipients[0];
  const [bloodType, setBloodType] = useState<BloodType>(preset?.bloodType ?? recipient?.short[0]?.bloodType ?? "O-");
  const target = recipient?.rows.find((item) => item.bloodType === bloodType);
  const advice = recommendations.find((item) => item.fromHospitalId === hospital.id && item.toHospitalId === recipient?.facility.id && item.bloodType === bloodType && item.status === "pending_approval");
  const available = availableInventoryUnits({ hospitals, shipments }, hospital.id, bloodType);
  const suggestion = (type: BloodType, facilityId: string) => {
    const rec = recommendations.find((item) => item.fromHospitalId === hospital.id && item.toHospitalId === facilityId && item.bloodType === type && item.status === "pending_approval");
    const gap = recipients.find((item) => item.facility.id === facilityId)?.rows.find((item) => item.bloodType === type)?.replenishmentUnits ?? 0;
    return Math.max(1, Math.min(rec?.suggestedQuantity ?? (gap || 4), availableInventoryUnits({ hospitals, shipments }, hospital.id, type) || 1));
  };
  const [quantity, setQuantity] = useState(() => recipient ? suggestion(bloodType, recipient.facility.id) : 4);
  const [priority, setPriority] = useState<PriorityLevel>(priorityForShortage(target?.firstShortageHour ?? null));
  const [action, setAction] = useState<"planned" | "in_transit">("in_transit");
  const [route, setRoute] = useState<RouteEstimate | null>(null);
  const ownNeed = roundUnits(ownRows.find((item) => item.bloodType === bloodType)?.demandUnits ?? 0);
  const remaining = available - quantity;
  const validQuantity = Number.isSafeInteger(quantity) && quantity > 0 && quantity <= available;
  const shortGroups = new Set((recipient?.short ?? []).map((item) => item.bloodType));
  const fallbackRoute = recipient?.route;
  const eta = route ?? fallbackRoute;

  const recipientKey = recipient?.facility.id;
  const [fromLng, fromLat] = hospital.coordinates;
  const [toLng, toLat] = recipient?.facility.coordinates ?? [0, 0];
  useEffect(() => {
    if (!open || !recipientKey) return;
    const controller = new AbortController();
    void fetchRoute([fromLng, fromLat], [toLng, toLat], controller.signal).then((result) => { if (!controller.signal.aborted) setRoute(result); });
    return () => controller.abort();
  }, [open, recipientKey, fromLng, fromLat, toLng, toLat]);

  const chooseRecipient = (id: string) => {
    const next = recipients.find((item) => item.facility.id === id);
    setRecipientId(id);
    setRoute(null);
    if (!next) return;
    const type = next.short[0]?.bloodType ?? bloodType;
    setBloodType(type);
    setQuantity(suggestion(type, id));
    setPriority(priorityForShortage(next.rows.find((item) => item.bloodType === type)?.firstShortageHour ?? null));
  };
  const chooseGroup = (type: BloodType) => {
    setBloodType(type);
    if (recipient) setQuantity(suggestion(type, recipient.facility.id));
    setPriority(priorityForShortage(recipient?.rows.find((item) => item.bloodType === type)?.firstShortageHour ?? null));
  };
  const submit = () => {
    if (!recipient || !validQuantity || !eta) return;
    const created = onSchedule({ fromHospitalId: hospital.id, toHospitalId: recipient.facility.id, bloodType, quantity, priority, etaMinutes: eta.minutes, status: action });
    onDone(created ? (action === "planned" ? `Пратката е планирана: ${quantity} ед. ${bloodType} за ${recipient.facility.name}.` : `Пратката е изпратена: ${quantity} ед. ${bloodType} за ${recipient.facility.name}.`) : "Пратката не може да бъде създадена. Проверете наличностите и опитайте отново.");
    if (created) onOpenChange(false);
  };

  return <SheetShell open={open} onOpenChange={onOpenChange} title="Изпращане на кръв" description="Получателите са подредени по спешност"
    footer={<>
      <p className="text-xs text-ink-secondary">{action === "planned" ? "Количеството се резервира. Изпратете пратката от Трансфери." : "Количеството се приспада при изпращане. Получателят потвърждава получаването."}</p>
      <div className="flex justify-end gap-2.5">
        <Button variant="outline" onClick={() => onOpenChange(false)}>Отказ</Button>
        <Button disabled={!validQuantity || !recipient} onClick={submit}><Send />{action === "planned" ? "Планиране" : "Изпращане"} · {quantity} ед. {bloodType}</Button>
      </div>
    </>}>
    <Field label="Получател">
      <div role="radiogroup" aria-label="Получател" className="space-y-2">
        {recipients.map((item, index) => <Option key={item.facility.id} selected={item.facility.id === recipient?.facility.id} name={item.facility.name}
          tag={index === 0 && item.short.length > 0 ? "Най-спешно" : undefined} onSelect={() => chooseRecipient(item.facility.id)}
          meta={item.short.length ? `Недостиг на ${item.short[0].bloodType} след ${formatHours(item.short[0].firstShortageHour!)} · ${item.short.length} ${item.short.length === 1 ? "група" : "групи"} под нуждата · ${item.route.km} км` : `Без очакван недостиг · ${item.route.km} км`} />)}
      </div>
    </Field>
    <Field label="Кръвна група">
      <Segmented label="Кръвна група" variant="chips" value={bloodType} onValueChange={chooseGroup} options={groupOptions(shortGroups)} />
      {target && target.replenishmentUnits > 0 && <Hint>{recipient?.facility.city}: липсват {target.replenishmentUnits} ед. {bloodType} за {PLANNING_HORIZON} ч.{advice ? ` · препоръка ${advice.suggestedQuantity} ед.` : ""}</Hint>}
    </Field>
    <Field label="Количество">
      <div className="relative"><Input type="number" min={1} step={1} value={Number.isFinite(quantity) ? quantity : ""} onChange={(event) => setQuantity(Number(event.target.value))} aria-label="Количество" className="pr-12" />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">ед.</span></div>
      <p className={cn("text-xs", remaining < 0 ? "text-critical" : remaining < ownNeed ? "text-elevated" : "text-ink-secondary")}>
        Свободни при Вас: {available} ед. {bloodType} · {remaining < 0 ? "недостатъчно за това количество" : `остават ${remaining} ед., ${remaining < ownNeed ? "под" : "над"} нуждата Ви за ${PLANNING_HORIZON} ч. (${ownNeed})`}
      </p>
    </Field>
    <Field label="Приоритет"><Segmented label="Приоритет" className="flex w-full [&>button]:flex-1" value={priority} onValueChange={setPriority}
      options={PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value] }))} /></Field>
    <Field label="Действие"><Segmented label="Действие" className="flex w-full [&>button]:flex-1" value={action} onValueChange={setAction}
      options={[{ value: "planned", label: "Планиране" }, { value: "in_transit", label: "Изпращане сега" }]} /></Field>
    {eta && <div className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas px-3 py-2.5">
      <Clock className="size-4 text-ink-secondary" />
      <div className="text-xs"><p className="font-medium text-ink">Очаквано пристигане ~{formatMinutes(eta.minutes)}</p>
        <p className="text-ink-secondary">{eta.source === "route" ? "Изчислено по маршрута" : "Изчислено по разстоянието"} · {eta.km} км</p></div>
    </div>}
  </SheetShell>;
}
