"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { PRIORITY_LABELS } from "@/lib/labels";
import { availableInventoryUnits } from "@/lib/inventory";
import { BLOOD_TYPES, type Hospital, type ManualShipmentDraft, type Shipment } from "@/types/domain";

interface ShipmentComposerProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  onSchedule: (draft: ManualShipmentDraft) => boolean;
}

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
  const available = availableInventoryUnits({ hospitals, shipments }, hospital.id, bloodType);

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      const created = onSchedule({ fromHospitalId: hospital.id, toHospitalId: destination, bloodType, quantity, priority, etaMinutes, status });
      setMessage(created ? (status === "planned" ? "Пратката е планирана. Изпратете я от „Моите активни пратки“." : "Пратката е изпратена. Получателят може да потвърди получаването.") : "Пратката не може да бъде създадена. Проверете наличностите и опитайте отново.");
    }}>
      <p className="text-sm text-muted-foreground">Изпращане от {hospital.name}. {available} ед. от {bloodType} на разположение ({reserved} ед. резервирани).</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-2 text-sm">Получател
          <FieldSelect label="Получател" value={destination} onValueChange={setDestination} required options={hospitals.filter((item) => item.id !== hospital.id).map((item) => ({ value: item.id, label: item.name }))} />
        </label>
        <label className="grid gap-2 text-sm">Кръвна група
          <FieldSelect label="Кръвна група" value={bloodType} onValueChange={(value) => setBloodType(value as Shipment["bloodType"])} options={BLOOD_TYPES.map((type) => ({ value: type, label: type }))} />
        </label>
        <label className="grid gap-2 text-sm">Количество (единици)
          <Input className="h-10" type="number" min={1} max={available} step={1} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} required />
        </label>
        <label className="grid gap-2 text-sm">Очаквано пристигане (минути)
          <Input className="h-10" type="number" min={5} step={1} value={etaMinutes} onChange={(event) => setEtaMinutes(Number(event.target.value))} required />
        </label>
        <label className="grid gap-2 text-sm">Приоритет
          <FieldSelect label="Приоритет" value={priority} onValueChange={(value) => setPriority(value as Shipment["priority"])} options={(Object.keys(PRIORITY_LABELS) as Shipment["priority"][]).map((value) => ({ value, label: PRIORITY_LABELS[value] }))} />
        </label>
        <label className="grid gap-2 text-sm">Действие
          <FieldSelect label="Действие" value={status} onValueChange={(value) => setStatus(value as typeof status)} options={[{ value: "planned", label: "Планиране на пратка" }, { value: "in_transit", label: "Изпращане сега" }]} />
        </label>
      </div>
      <Button type="submit" disabled={!destination || quantity < 1 || quantity > available}>{status === "planned" ? "Планиране на пратка" : "Изпращане на пратка"}</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
