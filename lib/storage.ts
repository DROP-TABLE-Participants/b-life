import { APP_STATE_VERSION, BLOOD_TYPE_LIST, STORAGE_KEY } from "@/lib/constants";
import { createSeedAppState } from "@/lib/seed";
import type { AppState } from "@/types/domain";

const isBrowser = typeof window !== "undefined";

const safeParse = (value: string): AppState | null => {
  try {
    const parsed = JSON.parse(value) as AppState;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== APP_STATE_VERSION) return null;
    if (!Array.isArray(parsed.hospitals) || parsed.hospitals.length === 0 || !Array.isArray(parsed.shipments) || !Array.isArray(parsed.recommendations)) return null;
    if (!parsed.hospitals.every((facility) => facility && typeof facility.id === "string" &&
      ["national_center", "regional_center", "hospital"].includes(facility.kind) &&
      Array.isArray(facility.coordinates) && facility.coordinates.length === 2 &&
      BLOOD_TYPE_LIST.every((type) => Number.isFinite(facility.inventoryByBloodType?.[type]) && facility.inventoryByBloodType[type] >= 0))) return null;
    const facilityIds = new Set(parsed.hospitals.map((item) => item.id));
    if (!parsed.shipments.every((item) => item && facilityIds.has(item.fromHospitalId) && facilityIds.has(item.toHospitalId) &&
      BLOOD_TYPE_LIST.includes(item.bloodType) && Number.isInteger(item.quantity) && item.quantity > 0 &&
      ["planned", "approved", "in_transit", "delayed", "delivered", "cancelled"].includes(item.status))) return null;
    // Add orders to existing saved accounts without resetting inventories or shipments.
    if (parsed.orders === undefined) parsed.orders = [];
    if (!Array.isArray(parsed.orders) || !parsed.orders.every((item) => item && typeof item.id === "string" &&
      facilityIds.has(item.requesterHospitalId) && facilityIds.has(item.supplierHospitalId) &&
      item.requesterHospitalId !== item.supplierHospitalId && BLOOD_TYPE_LIST.includes(item.bloodType) &&
      Number.isSafeInteger(item.quantity) && item.quantity > 0 && ["low", "medium", "high", "critical"].includes(item.priority) &&
      ["pending", "accepted", "rejected", "cancelled", "fulfilled"].includes(item.status) &&
      (item.shipmentId === undefined || parsed.shipments.some((shipment) => shipment.id === item.shipmentId && shipment.orderId === item.id)))) return null;
    const sessionFacility = parsed.hospitals.find((item) => item.id === parsed.session?.hospitalId);
    if (!parsed.session || !((parsed.session.mode === null && parsed.session.hospitalId === null) ||
      (parsed.session.mode === "control_tower" && parsed.session.hospitalId === null) || sessionFacility?.kind === parsed.session.mode)) {
      parsed.session = { mode: null, hospitalId: null };
    }
    if (!parsed.simulation) {
      parsed.simulation = {
        currentDate: new Date().toISOString(),
        demandMultiplier: 1,
        shipmentSpeed: 1,
      };
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveAppState = (state: AppState): void => {
  if (!isBrowser) return;
  const payload: AppState = {
    ...state,
    version: APP_STATE_VERSION,
    lastUpdated: new Date().toISOString(),
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
};

export const getAppState = (): AppState | null => {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return safeParse(raw);
};

export const seedAppStateIfEmpty = (): AppState => {
  const existing = getAppState();
  if (existing) return existing;

  const seeded = createSeedAppState();
  saveAppState(seeded);
  return seeded;
};

export const resetAppState = (): AppState => {
  if (isBrowser) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  const seeded = createSeedAppState();
  saveAppState(seeded);
  return seeded;
};
