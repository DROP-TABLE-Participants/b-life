"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { cn, formatHospitalLabel, formatMinutes } from "@/lib/utils";
import type { Hospital, Shipment } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";

export function ShipmentsPanel({ hospitals, shipments, facilityId, onDispatch, onReceive }: {
  hospitals: Hospital[]; shipments: Shipment[]; facilityId?: string; onDispatch?: (id: string) => void; onReceive?: (id: string) => void;
}) {
  const [history, setHistory] = useState(false);
  const scoped = facilityId ? shipments.filter((item) => item.fromHospitalId === facilityId || item.toHospitalId === facilityId) : shipments;
  const active = scoped.filter((item) => item.status !== "delivered" && item.status !== "cancelled");
  const past = scoped.filter((item) => item.status === "delivered" || item.status === "cancelled");
  const displayed = history ? past : active;
  return <Card className={cn(surfaceStyles.dashboardCardSurface, "overflow-hidden")}>
    <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 p-4 pb-0">
      <CardTitle>{history ? "История на пратките" : "Активни пратки"}</CardTitle>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={history ? "outline" : "secondary"} onClick={() => setHistory(false)}>Активни ({active.length})</Button>
        <Button type="button" size="sm" variant={history ? "secondary" : "outline"} onClick={() => setHistory(true)}>История ({past.length})</Button>
      </div>
    </CardHeader>
    <CardContent className="space-y-3 p-4">
      {displayed.length === 0 && <p className="text-sm text-muted-foreground">{history ? "Все още няма история на пратки." : "Няма активни пратки."}</p>}
      {displayed.map((shipment) => <article key={shipment.id} className="space-y-2 rounded-2xl border border-slate-200 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{shipment.bloodType} · {shipment.quantity} ед.</p><Badge variant="outline">{SHIPMENT_STATUS_LABELS[shipment.status]}</Badge></div>
        <p className="text-sm">От {formatHospitalLabel(hospitals.find((item) => item.id === shipment.fromHospitalId))} до {formatHospitalLabel(hospitals.find((item) => item.id === shipment.toHospitalId))}</p>
        <p className="text-sm text-muted-foreground">{facilityId && `${shipment.fromHospitalId === facilityId ? "Изходяща" : "Входяща"} · `}Очаквано пристигане: {formatMinutes(shipment.etaMinutes)}</p>
        <p className="text-xs text-muted-foreground">{shipment.id} · {new Date(shipment.updatedAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}</p>
        {shipment.orderId && <p className="text-sm text-muted-foreground">Пратка по приета заявка за кръв</p>}
        {shipment.progress >= 1 && (shipment.status === "in_transit" || shipment.status === "delayed") && <p className="text-sm">Пристигнала · очаква потвърждение за получаване</p>}
        <div className="flex flex-wrap gap-2">
          {onDispatch && shipment.fromHospitalId === facilityId && (shipment.status === "planned" || shipment.status === "approved") && <Button type="button" size="sm" variant="outline" onClick={() => onDispatch(shipment.id)}>Изпращане на пратката</Button>}
          {onReceive && shipment.toHospitalId === facilityId && (shipment.status === "in_transit" || shipment.status === "delayed") && <Button type="button" size="sm" onClick={() => onReceive(shipment.id)}>Потвърждаване на получаване</Button>}
        </div>
      </article>)}
    </CardContent>
  </Card>;
}
