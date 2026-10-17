"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { KpiStrip, OutlookPill, PageHeader } from "@/components/dashboard/DashboardParts";
import { projectBloodStock, summarizeStockProjections, type StockProjection } from "@/lib/forecast-planning";
import { coverageRatio, formatCoverage, formatHours, formatSignedUnits, PLANNING_HORIZON } from "@/lib/insights";
import { facilityShortName } from "@/lib/transfers";
import { cn, formatMinutes } from "@/lib/utils";
import { BLOOD_TYPES, type BloodType, type Forecast, type Hospital, type Shipment, type TransferRecommendation } from "@/types/domain";

const number = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1 });
const horizon = PLANNING_HORIZON;

interface ForecastPanelProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  workspaceBase: string;
  recommendations?: TransferRecommendation[];
  readOnly?: boolean;
}

export function ForecastPanel({ hospitals, forecasts, shipments, workspaceBase, recommendations = [], readOnly = false }: ForecastPanelProps) {
  const [facilityId, setFacilityId] = useState(hospitals[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const facility = hospitals.find((item) => item.id === facilityId) ?? hospitals[0];
  const rows = facility ? BLOOD_TYPES.flatMap((type) => {
    const forecast = forecasts.find((item) => item.hospitalId === facility.id && item.bloodType === type);
    return forecast ? [projectBloodStock(facility, forecast, shipments, horizon)] : [];
  }) : [];
  const summary = summarizeStockProjections(rows);
  const focused = rows.find((item) => item.bloodType === bloodType) ?? summary.shortages[0] ?? rows[0];
  const shortage = summary.shortages[0];
  const ownWorkspace = !readOnly && facility && workspaceBase.endsWith(facility.id);
  const reserved = rows.reduce((sum, item) => sum + item.reservedUnits, 0);
  const arrivals = shipments.filter((item) => item.toHospitalId === facility?.id && (item.status === "in_transit" || item.status === "delayed"))
    .sort((a, b) => a.etaMinutes - b.etaMinutes);
  const domain = rows.length ? [Math.min(0, ...rows.flatMap((row) => row.points.map((point) => point.withDeliveries))), Math.max(1, ...rows.map((row) => row.currentUnits))] as const : [0, 1] as const;
  const advice = focused && facility ? recommendations.find((item) => item.toHospitalId === facility.id && item.bloodType === focused.bloodType && item.status === "pending_approval") : undefined;

  return <div className="flex flex-col gap-6">
    <PageHeader title="Прогнози" subtitle={`Очакван баланс по кръвни групи за следващите ${horizon} ч.`}>
      {rows.length > 0 && <OutlookPill shortage={!!shortage}
        title={shortage ? `Недостиг: ${shortage.bloodType} след ${formatHours(shortage.firstShortageHour ?? 0)}` : `Покрито за ${horizon} ч.`}
        detail={shortage ? `${summary.shortages.length} ${summary.shortages.length === 1 ? "кръвна група" : "кръвни групи"} · за допълване ${summary.replenishmentUnits} ед.` : "без очакван недостиг"}
        actionHref={shortage && ownWorkspace ? `${workspaceBase}/transfers?request=1&bloodType=${encodeURIComponent(shortage.bloodType)}&quantity=${shortage.replenishmentUnits}` : undefined}
        actionLabel="Заявка за кръв" />}
      {hospitals.length > 1 && <FieldSelect label="Прогноза за" value={facility?.id ?? ""} onValueChange={(value) => { setFacilityId(value); setBloodType(null); }}
        options={hospitals.map((item) => ({ value: item.id, label: item.name }))} className="h-10 w-[360px] max-w-full bg-glass-strong" />}
    </PageHeader>

    {rows.length === 0 ? <section className="rounded-2xl border border-hairline bg-white p-6 shadow-glass-card">
      <h2 className="text-base font-semibold text-ink">Все още няма прогноза за този обект</h2>
      <p className="mt-1 text-sm text-ink-secondary">Изберете друг обект, за да разгледате наличните прогнози.</p>
    </section> : <>
      <KpiStrip items={[
        { label: "Свободни сега", value: summary.availableUnits, unit: "ед.", reservedShare: reserved / Math.max(1, summary.availableUnits + reserved),
          context: reserved ? `${reserved} ед. заделени за изпращане` : "Наличност след заделените пратки" },
        { label: `Потребност за ${horizon} ч.`, value: summary.demandUnits, unit: "ед.", context: `${formatCoverage(coverageRatio(rows))} покритие от свободните` },
        { label: "Пратки в движение", value: summary.incomingUnits, unit: "ед.",
          context: arrivals[0] ? `Следваща: ${arrivals[0].bloodType} · ${arrivals[0].progress >= 1 ? "пристигна, очаква потвърждение" : `след ~${formatMinutes(arrivals[0].etaMinutes)}`}${arrivals[0].status === "delayed" ? " · закъснява" : ""}` : `Няма пристигащи до ${horizon} ч.` },
        { label: "За допълване", value: summary.replenishmentUnits, unit: "ед.", tone: summary.replenishmentUnits ? "critical" : "default",
          context: summary.shortages.length ? `${summary.shortages.length} от ${rows.length} кръвни групи с недостиг` : "Няма недостиг по кръвна група" },
      ]} />

      <section className="grid min-h-[560px] overflow-hidden rounded-2xl border border-hairline bg-white shadow-glass-card lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="border-hairline bg-canvas/80 px-4 pt-5 pb-4 lg:border-r">
          <div className="px-2 pb-3"><h2 className="text-base font-semibold text-ink">Кръвни групи</h2><p className="text-xs text-ink-secondary">Изберете група, за да видите баланса</p></div>
          <div className="space-y-1" role="listbox" aria-label="Кръвни групи">
            {rows.map((row) => <GroupRow key={row.bloodType} row={row} domain={domain} selected={focused?.bloodType === row.bloodType} onSelect={() => setBloodType(row.bloodType)} />)}
          </div>
        </div>
        {focused && <ProjectionChart row={focused} workspaceBase={workspaceBase} facilityName={facility?.name ?? ""}
          advice={advice ? `Чака одобрение: препоръка за ${advice.bloodType} от ${facilityShortName(hospitals.find((item) => item.id === advice.fromHospitalId))}` : undefined} />}
      </section>
    </>}
  </div>;
}

function Sparkline({ row, domain, selected }: { row: StockProjection; domain: readonly [number, number]; selected: boolean }) {
  const [min, max] = domain;
  const y = (value: number) => 26 - (value - min) / Math.max(1, max - min) * 24;
  const path = row.points.map((point, index) => `${index ? "L" : "M"} ${point.hour / horizon * 96} ${y(point.withDeliveries).toFixed(1)}`).join(" ");
  const zero = y(0);
  const short = row.replenishmentUnits > 0;
  return <svg viewBox="0 0 96 28" className="h-7 w-24 shrink-0" aria-hidden="true">
    {min < 0 && <rect x={0} y={zero} width={96} height={28 - zero} fill="var(--status-critical-soft)" />}
    <line x1={0} x2={96} y1={zero} y2={zero} stroke={min < 0 ? "var(--status-critical-border)" : "var(--hairline)"} strokeDasharray={min < 0 ? "2 2" : undefined} />
    <path d={`${path} L 96 ${zero} L 0 ${zero} Z`} fill={selected ? "var(--brand)" : "var(--ink-muted)"} opacity={0.12} />
    <path d={path} fill="none" stroke={short && selected ? "var(--status-critical-strong)" : selected ? "var(--brand)" : "var(--ink-muted)"} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function GroupRow({ row, domain, selected, onSelect }: { row: StockProjection; domain: readonly [number, number]; selected: boolean; onSelect: () => void }) {
  const short = row.replenishmentUnits > 0;
  return <button type="button" role="option" aria-selected={selected} onClick={onSelect}
    className={cn("flex h-14 w-full items-center gap-4 rounded-xl border px-4 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
      selected ? "border-hairline bg-white shadow-control" : "border-transparent hover:bg-white/60")}>
    <span className="w-10 text-base font-semibold text-ink">{row.bloodType}</span>
    <Sparkline row={row} domain={domain} selected={selected} />
    <span className="ml-auto text-right">
      <span className={cn("block text-sm font-medium", short ? "text-critical" : "text-ink")}>{formatSignedUnits(row.balance)}</span>
      <span className="block text-xs text-ink-muted">{short && row.firstShortageHour !== null ? `недостиг след ${formatHours(row.firstShortageHour)}` : `след ${horizon} ч.`}</span>
    </span>
    <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", short ? "bg-critical" : "bg-transparent")} />
  </button>;
}

function ProjectionChart({ row, workspaceBase, facilityName, advice }: { row: StockProjection; workspaceBase: string; facilityName: string; advice?: string }) {
  const gradientId = useId().replaceAll(":", "");
  const values = row.points.flatMap((point) => [point.withDeliveries, point.withoutDeliveries]);
  const low = Math.min(0, ...values);
  const floor = low < 0 ? Math.floor(low * 1.15) : -Math.max(5, Math.round(row.currentUnits * 0.15));
  const shortage = row.firstShortageHour;
  const stats: Array<[string, string, boolean]> = [
    ["Физическа наличност", `${row.currentUnits} ед.`, false],
    [`Баланс след ${horizon} ч.`, formatSignedUnits(row.balance), row.balance < 0],
    ["Първи недостиг", shortage === null ? `Няма до ${horizon} ч.` : `около ${Math.round(shortage)} часа`, shortage !== null],
  ];

  return <div className="flex min-w-0 flex-col gap-4 p-6" aria-label={`Прогнозен баланс за ${row.bloodType}`}>
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl border border-brand/25 bg-brand-soft text-base font-semibold text-brand-strong">{row.bloodType}</span>
        <div><h2 className="text-lg font-semibold text-ink">Прогнозен баланс</h2><p className="text-xs text-ink-secondary" title={facilityName}>Свободни единици през следващите {horizon} ч.</p></div>
      </div>
      <dl className="flex gap-8">{stats.map(([label, value, warn]) => <div key={label} className="text-right">
        <dt className="text-xs text-ink-secondary">{label}</dt><dd className={cn("text-sm font-medium", warn ? "text-critical" : "text-ink")}>{value}</dd>
      </div>)}</dl>
    </div>
    <div className="min-h-[300px] min-w-0 flex-1">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}><ComposedChart data={row.points} margin={{ top: 16, right: 12, left: -12, bottom: 2 }} accessibilityLayer>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity={0.16} /><stop offset="100%" stopColor="var(--brand)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--hairline)" strokeDasharray="2 4" />
        <ReferenceArea y1={floor} y2={0} fill="var(--status-critical-soft)" fillOpacity={0.9} ifOverflow="extendDomain"
          label={{ value: "Недостиг", position: "insideBottomLeft", fill: "var(--status-critical-strong)", fontSize: 11 }} />
        <XAxis dataKey="hour" type="number" domain={[0, horizon]} ticks={Array.from({ length: horizon / 6 + 1 }, (_, index) => index * 6)} tickFormatter={(hour: number) => hour === 0 ? "Сега" : `${hour} ч.`}
          axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--ink-muted)" }} minTickGap={12} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--ink-muted)" }} allowDecimals={false} domain={[floor, "auto"]} />
        <Tooltip labelFormatter={(hour) => Number(hour) === 0 ? "Сега" : `След ${number.format(Number(hour))} ч.`} formatter={(value, name) => [`${number.format(Number(value))} ед.`, name]}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--hairline)", fontSize: 12, boxShadow: "var(--shadow-popover)" }} />
        <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
        <Line dataKey="withoutDeliveries" name="Без доставки" type="linear" stroke="var(--ink-muted)" strokeDasharray="6 6" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Area dataKey="withDeliveries" name="С пътуващи доставки" type="linear" baseValue={0} stroke="var(--brand)" strokeWidth={2.5} fill={`url(#${gradientId})`} isAnimationActive={false} />
        {shortage !== null && <ReferenceLine x={shortage} stroke="var(--status-critical-strong)" strokeDasharray="3 4"
          label={{ value: `Недостиг след ${formatHours(shortage)}`, position: shortage > horizon * 0.75 ? "insideTopLeft" : "insideTopRight", fill: "var(--status-critical-strong)", fontSize: 11 }} />}
      </ComposedChart></ResponsiveContainer>
    </div>
    {advice && <div className="flex items-center gap-3 rounded-xl border border-hairline bg-canvas py-1.5 pr-1.5 pl-3 text-xs text-ink-secondary">
      <Route className="size-4 text-brand" /><span className="flex-1">{advice}</span>
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`${workspaceBase}/recommendations`} />}>Към препоръките</Button>
    </div>}
    {(row.delayedUnits > 0 || row.awaitingDispatchUnits > 0) && <p className="text-xs text-elevated">
      {row.delayedUnits > 0 && `${row.delayedUnits} ед. са в пратка със закъснение — прогнозата използва текущото пристигане. `}
      {row.awaitingDispatchUnits > 0 && <>Още {row.awaitingDispatchUnits} ед. очакват изпращане и не са включени в баланса. <Link href={`${workspaceBase}/transfers`} className="underline underline-offset-2">Вижте трансферите</Link>.</>}
    </p>}
    <div className="flex flex-wrap items-center gap-5 text-xs text-ink-secondary">
      <span className="inline-flex items-center gap-2"><i className="h-[3px] w-4 rounded bg-brand" />С пътуващи доставки</span>
      <span className="inline-flex items-center gap-2"><i className="w-4 border-t-2 border-dashed border-ink-muted" />Без доставки</span>
      <span className="ml-auto text-ink-muted">Под нулата = непокрита потребност. Покачването = пристигаща пратка.</span>
    </div>
  </div>;
}
