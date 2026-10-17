"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { projectBloodStock, summarizeStockProjections, type StockProjection } from "@/lib/forecast-planning";
import { cn } from "@/lib/utils";
import { BLOOD_TYPES, type BloodType, type Forecast, type Hospital, type Shipment } from "@/types/domain";
import styles from "./ForecastPanel.module.css";

const number = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1 });
const horizon = 48;
const duration = (hour: number) => hour <= 0 ? "сега" : hour < 1 ? "под 1 час" : `около ${Math.round(hour)} ${Math.round(hour) === 1 ? "час" : "часа"}`;

interface ForecastPanelProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  workspaceBase: string;
}

export function ForecastPanel({ hospitals, forecasts, shipments, workspaceBase }: ForecastPanelProps) {
  const [facilityId, setFacilityId] = useState(hospitals[0]?.id ?? "");
  const [bloodType, setBloodType] = useState<BloodType | null>(null);
  const facility = hospitals.find((item) => item.id === facilityId) ?? hospitals[0];
  const rows = facility ? forecasts.filter((item) => item.hospitalId === facility.id)
    .map((item) => projectBloodStock(facility, item, shipments, horizon)) : [];
  const summary = summarizeStockProjections(rows);
  const focused = rows.find((item) => item.bloodType === bloodType) ?? summary.shortages[0] ?? rows[0];
  const hasGaps = summary.shortages.length > 0;
  const totalReservations = rows.reduce((sum, item) => sum + item.reservedUnits, 0);
  const metrics = [
    { label: "Свободни сега", value: summary.availableUnits, detail: totalReservations ? `${totalReservations} ед. са заделени за изпращане` : "Наличност след заделените пратки" },
    { label: `Потребност за ${horizon} ч.`, value: summary.demandUnits, detail: "Общо очаквано потребление" },
    { label: "Пратки в движение", value: summary.incomingUnits, detail: `Очаквани до ${horizon} ч. · не са получени` },
    { label: "За допълване", value: summary.replenishmentUnits, detail: "Сбор на недостига по кръвна група" },
  ];

  return <div className={styles.workspace}>
    <section className={styles.toolbar} aria-label="Настройки на прогнозата">
      <label className={styles.facilitySelect}>Прогноза за
        <FieldSelect label="Прогноза за" value={facility?.id ?? ""} onValueChange={(value) => { setFacilityId(value); setBloodType(null); }} options={hospitals.map((item) => ({ value: item.id, label: item.name }))} className="h-11 text-[13px]" />
      </label>
    </section>

    {rows.length === 0 ? <section className={styles.panel}><h2>Все още няма прогноза за този обект</h2><p>Изберете друг обект, за да разгледате наличните прогнози.</p></section> : <>
        <section className={cn(styles.outlook, hasGaps && styles.outlookWarning)}>
          <div>
            <h2>{hasGaps ? `Необходимо допълване: ${summary.shortages.length} ${summary.shortages.length === 1 ? "кръвна група" : "кръвни групи"}` : "Потребността е покрита"}</h2>
            <p>{hasGaps ? <>Първи очакван недостиг: <strong>{summary.shortages[0].bloodType}</strong> · {duration(summary.shortages[0].firstShortageHour ?? 0)}. Необходимо допълване за {horizon} ч.: <strong>{summary.replenishmentUnits} ед.</strong></> : <>Няма очакван недостиг за следващите {horizon} часа при текущите наличности и пътуващи доставки.</>}</p>
          </div>
        </section>

      <div className={styles.metrics}>
        {metrics.map(({ label, value, detail }, index) => <section key={label} className={cn(styles.metric, index === 3 && hasGaps && styles.metricAttention)}>
          <div className={styles.metricLabel}>{label}</div>
          <p className={styles.metricValue}>{value}<span>ед.</span></p>
          <p className={styles.metricDetail}>{detail}</p>
        </section>)}
      </div>

      <section aria-labelledby="blood-groups-title">
        <div className={styles.sectionHeading}><div><h2 id="blood-groups-title">Прогноза по кръвни групи</h2><p>Изберете кръвна група за подробности.</p></div></div>
        <div className={styles.bloodGroups}>
          {BLOOD_TYPES.flatMap((type) => {
            const row = rows.find((item) => item.bloodType === type);
            return row ? [<BloodGroupCard key={type} row={row} selected={focused?.bloodType === type} onSelect={() => setBloodType(type)} />] : [];
          })}
        </div>
      </section>

      {focused && <ProjectionChart row={focused} workspaceBase={workspaceBase} />}

    </>}
  </div>;
}

function BloodGroupCard({ row, selected, onSelect }: { row: StockProjection; selected: boolean; onSelect: () => void }) {
  const needsStock = row.replenishmentUnits > 0;
  const coverage = row.demandUnits > 0 ? Math.min(100, row.availableUnits / row.demandUnits * 100) : 100;
  return <button type="button" aria-pressed={selected} aria-label={`Прогноза за ${row.bloodType}`} className={cn(styles.bloodCard, selected && styles.bloodCardSelected)} onClick={onSelect}>
    <div className={styles.bloodCardTop}><strong>{row.bloodType}</strong><span className={cn(styles.groupStatus, needsStock && styles.groupStatusWarning)}>{needsStock ? `Липсват ${row.replenishmentUnits} ед.` : "Покрита"}</span></div>
    <p><strong>{row.availableUnits}</strong> свободни / {Math.ceil(row.demandUnits - 1e-9)} нужни</p>
    <div className={styles.coverageTrack} aria-hidden="true"><span style={{ width: `${coverage}%`, background: needsStock ? "#e85a39" : "#059669" }} /></div>
    <span className={styles.bloodCardNote}>{row.incomingUnits > 0 ? `+${row.incomingUnits} ед. пътуват` : "Без пътуващи доставки"}</span>
  </button>;
}

function ProjectionChart({ row, workspaceBase }: { row: StockProjection; workspaceBase: string }) {
  const gradientId = useId().replaceAll(":", "");
  return <section className={styles.panel} aria-label={`Прогнозен баланс за ${row.bloodType}`}>
    <div className={styles.chartHeading}><div className={styles.bloodType}>{row.bloodType}</div><div><h2>Прогнозен баланс</h2><p>Очакван баланс в единици през следващите {horizon} часа</p></div></div>
    <div className={styles.chart}>
      <ResponsiveContainer width="100%" height={240} minWidth={0}><ComposedChart data={row.points} margin={{ top: 16, right: 12, left: -18, bottom: 2 }} accessibilityLayer>
        <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e85a39" stopOpacity={0.2} /><stop offset="100%" stopColor="#e85a39" stopOpacity={0.01} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="#e9edf2" strokeDasharray="3 4" />
        <XAxis dataKey="hour" type="number" domain={[0, horizon]} ticks={Array.from({ length: horizon / 6 + 1 }, (_, index) => index * 6)} tickFormatter={(hour: number) => hour === 0 ? "Сега" : `${hour} ч.`} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} minTickGap={12} dy={8} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
        <Tooltip labelFormatter={(hour) => Number(hour) === 0 ? "Сега" : `След ${number.format(Number(hour))} ч.`} formatter={(value, name) => [`${number.format(Number(value))} ед.`, name]} contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, boxShadow: "0 8px 24px #0f172a0d" }} />
        <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
        <Line dataKey="withoutDeliveries" name="Без доставки" type="linear" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Area dataKey="withDeliveries" name="С пътуващи доставки" type="linear" stroke="#e85a39" strokeWidth={3} fill={`url(#${gradientId})`} isAnimationActive={false} />
        {row.firstShortageHour !== null && <ReferenceLine x={row.firstShortageHour} stroke="#e85a39" strokeDasharray="3 4" label={{ value: "Недостиг", position: row.firstShortageHour > horizon * 0.75 ? "insideTopLeft" : "insideTopRight", fill: "#cf4829", fontSize: 10 }} />}
      </ComposedChart></ResponsiveContainer>
    </div>
    <div className={styles.chartLegend}><span><i style={{ background: "#e85a39" }} />С пътуващи доставки</span><span><i style={{ background: "#94a3b8" }} />Без доставки</span></div>
    <p className={styles.chartNote}>Под нулата = непокрита потребност. Покачването показва очаквано пристигане на пратка.</p>
    <div className={styles.chartStats}>
      <div><span>Физическа наличност</span><strong>{row.currentUnits} ед.</strong>{row.reservedUnits > 0 && <small>{row.reservedUnits} ед. заделени</small>}</div>
      <div><span>Баланс след {horizon} ч.</span><strong className={row.balance < 0 ? styles.warningText : undefined}>{row.balance > 0 ? "+" : ""}{number.format(row.balance)} ед.</strong></div>
      <div><span>Първи недостиг</span><strong className={row.firstShortageHour !== null ? styles.warningText : undefined}>{row.firstShortageHour === null ? `Няма до ${horizon} ч.` : duration(row.firstShortageHour)}</strong></div>
    </div>
    {row.delayedUnits > 0 && <p className={styles.deliveryNote}>{row.delayedUnits} ед. са в пратка със закъснение. Прогнозата използва текущото очаквано пристигане.</p>}
    {row.awaitingDispatchUnits > 0 && <p className={styles.deliveryNote}>Още {row.awaitingDispatchUnits} ед. очакват изпращане и не са включени в баланса. <Link href={`${workspaceBase}/shipments`} className="underline underline-offset-2">Вижте пратките</Link>, за да избегнете дублирано допълване.</p>}
  </section>;
}
