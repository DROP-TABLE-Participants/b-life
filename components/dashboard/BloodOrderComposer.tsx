"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { availableInventoryUnits, eligibleOrderSuppliers } from "@/lib/inventory";
import { PRIORITY_LABELS } from "@/lib/labels";
import { BLOOD_TYPES, type BloodOrderDraft, type BloodType, type Hospital, type PriorityLevel, type Shipment } from "@/types/domain";

interface BloodOrderComposerProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  onOrder: (draft: BloodOrderDraft) => boolean;
}

const selectClassName = "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm";

export function BloodOrderComposer({ hospital, hospitals, shipments, onOrder }: BloodOrderComposerProps) {
  const [bloodType, setBloodType] = useState<BloodType>("O-");
  const [quantity, setQuantity] = useState(4);
  const [priority, setPriority] = useState<PriorityLevel>("high");
  const [supplierId, setSupplierId] = useState("");
  const [message, setMessage] = useState("");
  const inventory = { hospitals, shipments };
  const suppliers = eligibleOrderSuppliers(inventory, hospital.id, bloodType, quantity);
  const selectedSupplier = suppliers.find((item) => item.id === supplierId) ?? suppliers[0];
  const validQuantity = Number.isSafeInteger(quantity) && quantity > 0;

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (!selectedSupplier || !validQuantity) return;
      const created = onOrder({ requesterHospitalId: hospital.id, supplierHospitalId: selectedSupplier.id, bloodType, quantity, priority });
      setMessage(created ? "Заявката е изпратена. Следете състоянието ѝ в „Моите заявки за кръв“." : "Заявката не може да бъде изпратена. Наличността е променена — изберете доставчик отново.");
    }}>
      <p className="text-sm text-muted-foreground">Изберете кръвна група и количество. Показват се само доставчици с достатъчна свободна наличност. След приемане доставчикът изпраща пратката, а Вие потвърждавате получаването.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Заявена кръвна група
          <select className={selectClassName} value={bloodType} onChange={(event) => { setBloodType(event.target.value as BloodType); setMessage(""); }}>
            {BLOOD_TYPES.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Заявено количество (единици)
          <Input type="number" min={1} step={1} value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setMessage(""); }} required />
        </label>
        <label className="grid min-w-0 gap-2 text-sm">Доставчик
          <select className={selectClassName} value={selectedSupplier?.id ?? ""} disabled={suppliers.length === 0} onChange={(event) => { setSupplierId(event.target.value); setMessage(""); }} required>
            {suppliers.length === 0 && <option value="">Няма подходящ доставчик</option>}
            {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name} · {availableInventoryUnits(inventory, item.id, bloodType)} ед.</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm">Приоритет на заявката
          <select className={selectClassName} value={priority} onChange={(event) => setPriority(event.target.value as PriorityLevel)}>
            {(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((value) => <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>)}
          </select>
        </label>
      </div>
      {selectedSupplier && <p className="text-sm">{selectedSupplier.name}: {availableInventoryUnits(inventory, selectedSupplier.id, bloodType)} ед. свободна наличност от {bloodType}.</p>}
      {suppliers.length === 0 && <p role="status" className="text-sm text-muted-foreground">{validQuantity ? "Няма доставчик с достатъчна свободна наличност за избраната кръвна група и количество. Намалете количеството или изберете друга кръвна група." : "Въведете положително цяло количество."}</p>}
      <Button type="submit" disabled={!selectedSupplier || !validQuantity}>Изпращане на заявка</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
