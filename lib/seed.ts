import { APP_STATE_VERSION } from "@/lib/constants";
import { NATIONAL_CENTER_NAME } from "@/lib/labels";
import { lerpCoordinates } from "@/lib/utils";
import type { AppState, Hospital, Shipment } from "@/types/domain";

const nowIso = () => new Date().toISOString();

export const seededHospitals = (): Hospital[] => [
  {
    id: "national-center", kind: "national_center" as const,
    name: NATIONAL_CENTER_NAME, city: "София", coordinates: [23.3219, 42.6977] as [number, number],
    capacityLevel: "high" as const,
    inventoryByBloodType: { "O-": 110, "O+": 138, "A-": 86, "A+": 122, "B-": 75, "B+": 95, "AB-": 46, "AB+": 60 },
    alerts: ["Наличен национален резерв за подкрепа на регионалните центрове и болниците."],
  },
  {
    id: "regional-center-stara-zagora", kind: "regional_center" as const,
    name: "Регионален Център Стара Загора", city: "Стара Загора", coordinates: [25.6345, 42.4258] as [number, number],
    capacityLevel: "medium" as const,
    inventoryByBloodType: { "O-": 24, "O+": 82, "A-": 52, "A+": 76, "B-": 18, "B+": 63, "AB-": 35, "AB+": 40 },
    alerts: ["Необходима е подкрепа от националния резерв за O- и B-.", "Наличен регионален резерв за Бургас."],
  },
  {
    id: "hospital-sveta-sofia-burgas", kind: "hospital" as const,
    regionalCenterId: "regional-center-stara-zagora",
    name: "Болница Света София Бургас", city: "Бургас", coordinates: [27.4626, 42.5048] as [number, number],
    capacityLevel: "medium" as const,
    inventoryByBloodType: { "O-": 7, "O+": 20, "A-": 14, "A+": 22, "B-": 8, "B+": 19, "AB-": 42, "AB+": 27 },
    alerts: ["Очаква се потребност за хирургични интервенции през следващите 48 часа.", "Препоръчва се попълване на запасите от O- и B-."],
  },
].map((facility) => ({
  ...facility, status: "stable", shortageRiskByBloodType: {}, surplusRiskByBloodType: {},
  incomingShipments: [], outgoingShipments: [], lastUpdated: nowIso(),
}));

export const seededShipments = (hospitals: Hospital[]): Shipment[] => {
  const [national, regional, hospital] = hospitals;
  const routes: Array<Pick<Shipment, "id" | "fromHospitalId" | "toHospitalId" | "bloodType" | "quantity" | "status" | "priority" | "etaMinutes" | "progress">> = [
    { id: "ship-bg-001", fromHospitalId: national.id, toHospitalId: regional.id, bloodType: "O-", quantity: 12, status: "in_transit", priority: "critical", etaMinutes: 78, progress: 0.42 },
    { id: "ship-bg-002", fromHospitalId: regional.id, toHospitalId: hospital.id, bloodType: "O+", quantity: 10, status: "delayed", priority: "high", etaMinutes: 95, progress: 0.57 },
    { id: "ship-bg-003", fromHospitalId: national.id, toHospitalId: hospital.id, bloodType: "B-", quantity: 14, status: "approved", priority: "high", etaMinutes: 220, progress: 0 },
    { id: "ship-bg-004", fromHospitalId: hospital.id, toHospitalId: regional.id, bloodType: "AB-", quantity: 6, status: "planned", priority: "medium", etaMinutes: 100, progress: 0 },
    { id: "ship-bg-005", fromHospitalId: regional.id, toHospitalId: national.id, bloodType: "A+", quantity: 8, status: "in_transit", priority: "medium", etaMinutes: 90, progress: 0.3 },
    { id: "ship-bg-006", fromHospitalId: national.id, toHospitalId: regional.id, bloodType: "A-", quantity: 16, status: "delivered", priority: "medium", etaMinutes: 0, progress: 1 },
    { id: "ship-bg-007", fromHospitalId: regional.id, toHospitalId: hospital.id, bloodType: "A+", quantity: 12, status: "delivered", priority: "high", etaMinutes: 0, progress: 1 },
    { id: "ship-bg-008", fromHospitalId: hospital.id, toHospitalId: national.id, bloodType: "AB-", quantity: 4, status: "cancelled", priority: "low", etaMinutes: 0, progress: 0 },
  ];
  return routes.map((shipment, index) => {
    const from = hospitals.find((item) => item.id === shipment.fromHospitalId)!;
    const to = hospitals.find((item) => item.id === shipment.toHospitalId)!;
    const timestamp = new Date(Date.now() - (index + 1) * 3_600_000).toISOString();
    return { ...shipment, currentCoordinates: lerpCoordinates(from.coordinates, to.coordinates, shipment.progress), createdAt: timestamp, updatedAt: timestamp };
  });
};

export const createSeedAppState = (): AppState => {
  const hospitals = seededHospitals();
  const shipments = seededShipments(hospitals);
  // Stock is physically on hand: delivered units are included and in-transit units have left the sender.
  return {
    version: APP_STATE_VERSION, seededAt: nowIso(), lastUpdated: nowIso(), hospitals, shipments,
    forecasts: [], recommendations: [], orders: [],
    kpis: { totalHospitals: hospitals.length, activeShipments: 0, criticalShortages: 0, expiringUnitsRisk: 0, redistributionEfficiency: 0, fulfilledRecommendations: 0 },
    session: { mode: null, hospitalId: null },
    simulation: { currentDate: nowIso(), demandMultiplier: 1, shipmentSpeed: 1 },
  };
};
