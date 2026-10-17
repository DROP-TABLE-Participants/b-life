"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRIORITY_LABELS } from "@/lib/labels";
import { BLOOD_TYPES, type Hospital, type ManualShipmentDraft, type Shipment } from "@/types/domain";

interface ShipmentComposerProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  onSchedule: (draft: ManualShipmentDraft) => boolean;
}

const selectClassName = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function ShipmentComposer({ hospital, hospitals, shipments, onSchedule }: ShipmentComposerProps) {
  const [destination, setDestination] = useState(hospitals.find((item) => item.id !== hospital.id)?.id ?? "");
  const [bloodType, setBloodType] = useState<Shipment["bloodType"]>("O-");
  const [quantity, setQuantity] = useState(4);
  const [etaMinutes, setEtaMinutes] = useState(90);
  const [priority, setPriority] = useState<Shipment["priority"]>("high");
  const [status, setStatus] = useState<"planned" | "in_transit">("planned");
  const [message, setMessage] = useState("");
  const reserved = shipments.filter((item) => item.fromHospitalId === hospital.id && item.bloodType === bloodType &&
    (item.status === "planned" || item.status === "approved")).reduce((sum, item) => sum + item.quantity, 0);
  const available = Math.max(0, (hospital.inventoryByBloodType[bloodType] ?? 0) - reserved);

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      const created = onSchedule({ fromHospitalId: hospital.id, toHospitalId: destination, bloodType, quantity, priority, etaMinutes, status });
      setMessage(created ? (status === "planned" ? "Пратката е планирана. Изпратете я от „Моите активни пратки“." : "Пратката е изпратена. Получателят може да потвърди получаването.") : "Пратката не може да бъде създадена. Проверете наличностите и опитайте отново.");
    }}>
      <p className="text-sm text-muted-foreground">Изпращане от {hospital.name}. {available} ед. от {bloodType} на разположение ({reserved} ед. резервирани).</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-sm">Получател
          <select className={selectClassName} value={destination} onChange={(event) => setDestination(event.target.value)} required>
            {hospitals.filter((item) => item.id !== hospital.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Кръвна група
          <select className={selectClassName} value={bloodType} onChange={(event) => setBloodType(event.target.value as Shipment["bloodType"])}>
            {BLOOD_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Количество (единици)
          <Input type="number" min={1} max={available} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
        </label>
        <label className="grid gap-2 text-sm">Очаквано пристигане (минути)
          <Input type="number" min={5} step={1} value={etaMinutes} onChange={(event) => setEtaMinutes(Number(event.target.value))} required />
        </label>
        <label className="grid gap-2 text-sm">Приоритет
          <select className={selectClassName} value={priority} onChange={(event) => setPriority(event.target.value as Shipment["priority"])}>
            {(Object.keys(PRIORITY_LABELS) as Shipment["priority"][]).map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Действие
          <select className={selectClassName} value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="planned">Планиране на пратка</option><option value="in_transit">Изпращане сега</option>
          </select>
        </label>
      </div>
      <Button type="submit" disabled={!destination || quantity < 1 || quantity > available}>{status === "planned" ? "Планиране на пратка" : "Изпращане на пратка"}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
