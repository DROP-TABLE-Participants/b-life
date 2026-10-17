import { MapPinned, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { KpiStrip, LiveStamp, PageHeader, SectionCard } from "@/components/dashboard/DashboardParts";
import { MiniNetworkMap } from "@/components/map/MiniNetworkMap";
import { FACILITY_ROLE_LABELS } from "@/lib/access";
import { facilityOutlook, formatHours, PLANNING_HORIZON } from "@/lib/insights";
import { MINISTRY_NAME } from "@/lib/labels";
import { facilityShortName } from "@/lib/transfers";
import { cn } from "@/lib/utils";
import { BLOOD_TYPES, type Forecast, type Hospital, type Shipment, type TransferRecommendation } from "@/types/domain";

interface ControlTowerOverviewProps {
  hospitals: Hospital[];
  forecasts: Forecast[];
  shipments: Shipment[];
  recommendations: TransferRecommendation[];
}

const FACILITY_DOT: Record<Hospital["kind"], string> = { national_center: "bg-facility-national", regional_center: "bg-facility-regional", hospital: "bg-facility-hospital" };

/** Ministry overview: where the network is short, where it holds surplus, and how urgent it is. */
export function ControlTowerOverview({ hospitals, forecasts, shipments, recommendations }: ControlTowerOverviewProps) {
  const outlooks = hospitals.map((facility) => ({ facility, rows: facilityOutlook(facility, forecasts, shipments).rows }));
  const shortages = outlooks.flatMap(({ facility, rows }) => rows.filter((row) => row.firstShortageHour !== null)
    .map((row) => ({ facility, bloodType: row.bloodType, hour: row.firstShortageHour! }))).sort((a, b) => a.hour - b.hour);
  const surplus = forecasts.filter((item) => item.surplusRiskLevel === "critical");
  const surplusLeader = hospitals.map((facility) => ({ facility, count: surplus.filter((item) => item.hospitalId === facility.id).length })).sort((a, b) => b.count - a.count)[0];
  const critical = forecasts.filter((item) => item.shortageRiskLevel === "critical");
  const criticalFacilities = new Set(critical.map((item) => item.hospitalId)).size;
  const active = shipments.filter((item) => item.status !== "delivered" && item.status !== "cancelled");
  const delayed = active.filter((item) => item.status === "delayed").length;
  const waiting = active.filter((item) => item.status === "planned" || item.status === "approved").length;
  const pendingAdvice = recommendations.filter((item) => item.status === "pending_approval").length;
  const kinds = { centres: hospitals.filter((item) => item.kind !== "hospital").length, hospitals: hospitals.filter((item) => item.kind === "hospital").length };
  const name = (id: string) => facilityShortName(hospitals.find((item) => item.id === id));
  const top = shortages.slice(0, 5);

  return <div className="flex flex-col gap-6">
    <PageHeader title="Общ преглед" subtitle={`${MINISTRY_NAME} · мрежа за кръвоснабдяване`}>
      <LiveStamp />
      <Badge>Само преглед</Badge>
    </PageHeader>

    <KpiStrip items={[
      { label: "Обекти в мрежата", value: hospitals.length, context: `${kinds.centres} ${kinds.centres === 1 ? "център" : "центъра"} · ${kinds.hospitals} ${kinds.hospitals === 1 ? "болница" : "болници"}` },
      { label: "Активни пратки", value: active.length, context: `${delayed} закъснява · ${waiting} очакват изпращане` },
      { label: "Критични недостизи", value: critical.length, tone: critical.length ? "critical" : "default",
        context: shortages[0] ? `в ${criticalFacilities} ${criticalFacilities === 1 ? "обект" : "обекта"} · първи след ${formatHours(shortages[0].hour)}` : "Няма очакван недостиг" },
      { label: "Риск от изтичане", value: surplus.length, context: surplusLeader?.count ? `групи с излишък · ${surplusLeader.count} в ${facilityShortName(surplusLeader.facility)}` : "Няма излишък с риск" },
    ]} />

    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-6">
        <SectionCard title="Риск по обекти и кръвни групи" subtitle={`Единици в наличност · червено = очакван недостиг до ${PLANNING_HORIZON} ч., сиво = излишък с риск от изтичане`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-1.5 text-center">
              <thead><tr><th className="w-52" />{BLOOD_TYPES.map((type) => <th key={type} scope="col" className="text-xs font-medium text-ink-secondary">{type}</th>)}</tr></thead>
              <tbody>{outlooks.map(({ facility, rows }) => <tr key={facility.id}>
                <th scope="row" className="text-left font-normal">
                  <span className="flex items-center gap-2.5">
                    <span aria-hidden="true" className={cn("size-3 shrink-0 rounded-full border-2 border-white shadow-control", FACILITY_DOT[facility.kind])} />
                    <span><span className="block text-xs font-medium text-ink">{facility.name}</span><span className="block text-[11px] text-ink-secondary">{facility.city} · {FACILITY_ROLE_LABELS[facility.kind].toLowerCase()}</span></span>
                  </span>
                </th>
                {BLOOD_TYPES.map((type) => {
                  const row = rows.find((item) => item.bloodType === type);
                  const forecast = forecasts.find((item) => item.hospitalId === facility.id && item.bloodType === type);
                  const shortage = row?.firstShortageHour ?? null;
                  const isSurplus = shortage === null && forecast?.surplusRiskLevel === "critical";
                  return <td key={type} className={cn("h-14 rounded-lg border",
                    shortage !== null ? "border-critical-border bg-critical-soft text-critical" : isSurplus ? "border-hairline bg-muted text-ink-secondary" : "border-hairline bg-white text-ink")}>
                    <span className="block text-sm font-medium">{facility.inventoryByBloodType[type] ?? 0}</span>
                    {(shortage !== null || isSurplus) && <span className="block text-[11px] leading-[14px]">{shortage !== null ? formatHours(shortage) : "излишък"}</span>}
                  </td>;
                })}
              </tr>)}</tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Време до първи недостиг" subtitle="Подредено по спешност · по-дълга лента = по-скоро">
          {top.length === 0 ? <p className="text-sm text-ink-muted">Няма очакван недостиг в мрежата за следващите {PLANNING_HORIZON} ч.</p> :
            <div className="space-y-2.5">{top.map((item) => <div key={`${item.facility.id}-${item.bloodType}`} className="flex items-center gap-4 text-xs">
              <span className="w-48 shrink-0 font-medium text-ink">{facilityShortName(item.facility)} · {item.bloodType}</span>
              <span aria-hidden="true" className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span className={cn("block h-full rounded-full", item.hour <= 13 ? "bg-critical" : "bg-ink-muted")} style={{ width: `${Math.max(4, (PLANNING_HORIZON - item.hour) / PLANNING_HORIZON * 100)}%` }} />
              </span>
              <span className="w-14 text-right font-medium text-ink">{formatHours(item.hour)}</span>
            </div>)}</div>}
          {shortages.length > top.length && <p className="pt-3 text-xs text-ink-muted">Още {shortages.length - top.length} до {PLANNING_HORIZON} ч.: {shortages.slice(top.length).map((item) => `${facilityShortName(item.facility)} · ${item.bloodType}`).join(", ")}</p>}
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="Мрежа" subtitle={`${hospitals.length} обекта · ${active.length} активни пратки`} action={{ label: "Карта", href: "/control-tower/map", icon: MapPinned }}>
          <MiniNetworkMap hospitals={hospitals} shipments={shipments} />
        </SectionCard>
        <SectionCard title="Пратки в мрежата" subtitle={`${active.length} активни`}>
          <div className="divide-y divide-hairline">{active.map((item) => <div key={item.id} className="flex items-center gap-3 py-2 text-xs">
            <span className="w-8 font-medium text-ink">{item.bloodType}</span>
            <span className="min-w-0 flex-1 truncate"><span className="font-medium text-ink">{item.quantity} ед. ·</span> <span className="text-ink-secondary">{name(item.fromHospitalId)} → {name(item.toHospitalId)}</span></span>
            <StatusBadge status={item.status} />
          </div>)}</div>
          {pendingAdvice > 0 && <p className="mt-2 flex items-center gap-2 border-t border-hairline pt-3 text-xs text-ink-secondary"><Sparkles className="size-4 text-brand" />{pendingAdvice} препоръки чакат одобрение от центровете</p>}
        </SectionCard>
      </div>
    </div>
  </div>;
}
