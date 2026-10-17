import { BLOOD_TYPES, type AppState, type BloodType, type Hospital } from "@/types/domain";

type InventoryState = Pick<AppState, "hospitals" | "shipments">;

export const availableInventoryUnits = (
  state: InventoryState, facilityId: string, bloodType: BloodType, excludingShipmentId?: string,
): number => {
  const onHand = state.hospitals.find((item) => item.id === facilityId)?.inventoryByBloodType[bloodType] ?? 0;
  const reserved = state.shipments.filter((item) => item.id !== excludingShipmentId && item.fromHospitalId === facilityId &&
    item.bloodType === bloodType && (item.status === "planned" || item.status === "approved"))
    .reduce((sum, item) => sum + item.quantity, 0);
  return Math.max(0, onHand - reserved);
};

export const eligibleOrderSuppliers = (
  state: InventoryState, requesterId: string, bloodType: BloodType, quantity: number,
): Hospital[] => {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || !BLOOD_TYPES.includes(bloodType)) return [];
  return state.hospitals.filter((item) => item.id !== requesterId && availableInventoryUnits(state, item.id, bloodType) >= quantity);
};
