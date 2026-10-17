"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { availableInventoryUnits } from "@/lib/inventory";
import { ORDER_STATUS_LABELS, PRIORITY_LABELS, SHIPMENT_STATUS_LABELS } from "@/lib/labels";
import { cn, formatHospitalLabel } from "@/lib/utils";
import type { BloodOrder, Hospital, Shipment } from "@/types/domain";
import surfaceStyles from "./DashboardCardSurface.module.css";

type BloodOrdersPanelProps = {
  orders: BloodOrder[];
  hospitals: Hospital[];
  shipments: Shipment[];
} & ({
  facilityId: string;
  onAccept: (id: string) => boolean;
  onReject: (id: string) => boolean;
  onCancel: (id: string) => boolean;
} | { facilityId?: undefined; onAccept?: never; onReject?: never; onCancel?: never });

export function BloodOrdersPanel({ orders, hospitals, shipments, facilityId, onAccept, onReject, onCancel }: BloodOrdersPanelProps) {
  const [tab, setTab] = useState<"active" | "history">("active");
  const [message, setMessage] = useState("");
  const scopedOrders = facilityId ? orders.filter((item) => item.requesterHospitalId === facilityId || item.supplierHospitalId === facilityId) : orders;
  const active = scopedOrders.filter((item) => item.status === "pending" || item.status === "accepted");
  const history = scopedOrders.filter((item) => item.status !== "pending" && item.status !== "accepted");
  const displayed = tab === "active" ? active : history;

  return (
    <Card id="blood-orders" className={cn(surfaceStyles.dashboardCardSurface, "scroll-mt-4 overflow-hidden")}>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 p-4 pb-0">
        <CardTitle>{facilityId ? "Моите заявки за кръв" : "Заявки за кръв в мрежата"}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" aria-pressed={tab === "active"} variant={tab === "active" ? "secondary" : "outline"} onClick={() => setTab("active")}>Активни заявки ({active.length})</Button>
          <Button type="button" size="sm" aria-pressed={tab === "history"} variant={tab === "history" ? "secondary" : "outline"} onClick={() => setTab("history")}>История на заявки ({history.length})</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        {message && <p role="status" className="text-sm">{message}</p>}
        {displayed.length === 0 && <p className="text-sm text-muted-foreground">{tab === "active" ? "Няма активни заявки за кръв." : "Все още няма история на заявки."}</p>}
        {displayed.map((order) => {
          const supplier = hospitals.find((item) => item.id === order.supplierHospitalId);
          const requester = hospitals.find((item) => item.id === order.requesterHospitalId);
          const shipment = shipments.find((item) => item.id === order.shipmentId);
          const available = availableInventoryUnits({ hospitals, shipments }, order.supplierHospitalId, order.bloodType);
          const isSupplier = facilityId === order.supplierHospitalId;
          return (
            <article key={order.id} className="space-y-2 rounded-2xl border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{order.bloodType} · {order.quantity} ед.{facilityId && ` · ${isSupplier ? "Получена заявка" : "Изпратена заявка"}`}</p>
                <Badge variant="outline">{ORDER_STATUS_LABELS[order.status]}</Badge>
              </div>
              <p className="text-sm">Заявител: {formatHospitalLabel(requester)}</p>
              <p className="text-sm">Доставчик: {formatHospitalLabel(supplier)}</p>
              <p className="text-sm text-muted-foreground">Приоритет: {PRIORITY_LABELS[order.priority]} · {new Date(order.createdAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })}</p>
              {shipment && <p className="text-sm">Пратка: {SHIPMENT_STATUS_LABELS[shipment.status]}. {shipment.status === "approved" && "Количеството е резервирано и очаква изпращане от доставчика."}</p>}
              {shipment && <Link href={facilityId ? `/hospital/${facilityId}/shipments` : "/control-tower/shipments"} className="inline-block text-sm font-medium underline underline-offset-4">Към пратките</Link>}
              {order.status === "pending" && isSupplier && available < order.quantity && <p className="text-sm text-amber-700">Недостатъчна свободна наличност: {available} ед. Наличността е променена след подаване на заявката.</p>}
              <div className="flex flex-wrap gap-2">
                {order.status === "pending" && isSupplier && onAccept && onReject && <>
                  <Button type="button" size="sm" disabled={available < order.quantity} onClick={() => setMessage(onAccept(order.id) ? "Заявката е приета. Пратката е готова за изпращане от „Моите активни пратки“." : "Заявката не може да бъде приета. Проверете свободната наличност и състоянието ѝ.")}>Приемане на заявката</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setMessage(onReject(order.id) ? "Заявката е отказана." : "Заявката вече не очаква приемане.")}>Отказ на заявката</Button>
                </>}
                {order.status === "pending" && facilityId === order.requesterHospitalId && onCancel && <Button type="button" size="sm" variant="outline" onClick={() => setMessage(onCancel(order.id) ? "Заявката е отменена." : "Заявката вече не може да бъде отменена.")}>Отмяна на заявката</Button>}
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
