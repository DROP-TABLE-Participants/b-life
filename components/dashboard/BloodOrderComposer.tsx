"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldSelect } from "@/components/ui/FieldSelect";
import { availableInventoryUnits, eligibleOrderSuppliers } from "@/lib/inventory";
import { PRIORITY_LABELS } from "@/lib/labels";
import { BLOOD_TYPES, type BloodOrderDraft, type BloodType, type Hospital, type PriorityLevel, type Shipment } from "@/types/domain";

interface BloodOrderComposerProps {
  hospital: Hospital;
  hospitals: Hospital[];
  shipments: Shipment[];
  onOrder: (draft: BloodOrderDraft) => boolean;
}

export function BloodOrderComposer({ hospital, hospitals, shipments, onOrder }: BloodOrderComposerProps) {
  const searchParams = useSearchParams();
  const presetType = searchParams.get("bloodType") as BloodType | null;
  const presetQuantity = Number(searchParams.get("quantity"));
  const [bloodType, setBloodType] = useState<BloodType>(presetType && BLOOD_TYPES.includes(presetType) ? presetType : "O-");
  const [quantity, setQuantity] = useState(Number.isSafeInteger(presetQuantity) && presetQuantity > 0 ? presetQuantity : 4);
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
          <FieldSelect label="Заявена кръвна група" value={bloodType} onValueChange={(value) => { setBloodType(value as BloodType); setMessage(""); }} options={BLOOD_TYPES.map((type) => ({ value: type, label: type }))} />
        </label>
        <label className="grid gap-2 text-sm">Заявено количество (единици)
          <Input className="h-10" type="number" min={1} step={1} value={quantity} onChange={(event) => { setQuantity(Number(event.target.value)); setMessage(""); }} required />
        </label>
        <label className="grid min-w-0 gap-2 text-sm">Доставчик
          <FieldSelect label="Доставчик" value={selectedSupplier?.id ?? ""} disabled={suppliers.length === 0} onValueChange={(value) => { setSupplierId(value); setMessage(""); }} placeholder="Няма подходящ доставчик" required options={suppliers.map((item) => ({ value: item.id, label: `${item.name} · ${availableInventoryUnits(inventory, item.id, bloodType)} ед.` }))} />
        </label>
        <label className="grid gap-2 text-sm">Приоритет на заявката
          <FieldSelect label="Приоритет на заявката" value={priority} onValueChange={(value) => setPriority(value as PriorityLevel)} options={(Object.keys(PRIORITY_LABELS) as PriorityLevel[]).map((value) => ({ value, label: PRIORITY_LABELS[value] }))} />
        </label>
      </div>
      {selectedSupplier && <p className="text-sm">{selectedSupplier.name}: {availableInventoryUnits(inventory, selectedSupplier.id, bloodType)} ед. свободна наличност от {bloodType}.</p>}
      {suppliers.length === 0 && <p role="status" className="text-sm text-muted-foreground">{validQuantity ? "Няма доставчик с достатъчна свободна наличност за избраната кръвна група и количество. Намалете количеството или изберете друга кръвна група." : "Въведете положително цяло количество."}</p>}
      <Button type="submit" disabled={!selectedSupplier || !validQuantity}>Изпращане на заявка</Button>
      {message && <p role="status" className="text-sm">{message}</p>}
    </form>
  );
}
