import { APP_STATE_VERSION, BLOOD_TYPE_LIST } from "@/lib/constants";
import { clamp } from "@/lib/utils";
import type { AppState, BloodType, Hospital, Shipment } from "@/types/domain";

const nowIso = () => new Date().toISOString();

const bloodUnits = (base: number, variance: number): Record<BloodType, number> =>
  BLOOD_TYPE_LIST.reduce(
    (acc, type, index) => {
      const wobble = Math.round(Math.sin(index * 2.2 + base) * variance);
      acc[type] = Math.max(2, base + wobble);
      return acc;
    },
    {} as Record<BloodType, number>,
  );

export const seededHospitals = (): Hospital[] => {
  const hospitals: Array<Omit<Hospital, "shortageRiskByBloodType" | "surplusRiskByBloodType" | "lastUpdated">> = [
    {
      id: "hosp-sofia-alexandrovska",
      name: "Alexandrovska University Hospital",
      city: "Sofia",
      coordinates: [23.3219, 42.6909],
      capacityLevel: "high",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(42, 5),
        "O-": 28,
        "O+": 60,
        "A-": 52,
        "A+": 50,
        "B-": 40,
        "B+": 52,
      },
      incomingShipments: ["ship-bg-001", "ship-bg-005"],
      outgoingShipments: ["ship-bg-002", "ship-bg-003"],
      alerts: [
        "O- trauma reserve projected below threshold in 18h",
        "Emergency inbound route active from Plovdiv",
      ],
    },
    {
      id: "hosp-plovdiv-st-george",
      name: "UMHAT St. George",
      city: "Plovdiv",
      coordinates: [24.7497, 42.1354],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(50, 5),
        "O+": 54,
        "A-": 50,
        "A+": 62,
        "O-": 68,
        "AB+": 50,
      },
      incomingShipments: ["ship-bg-004"],
      outgoingShipments: ["ship-bg-001", "ship-bg-005"],
      alerts: ["A+ stock nearing expiry window in 36h"],
    },
    {
      id: "hosp-varna-st-marina",
      name: "UMHAT St. Marina",
      city: "Varna",
      coordinates: [27.9147, 43.2141],
      capacityLevel: "medium",
      status: "critical",
      inventoryByBloodType: {
        ...bloodUnits(36, 4),
        "O-": 5,
        "O+": 45,
        "A+": 22,
        "B-": 34,
        "B+": 40,
      },
      incomingShipments: ["ship-bg-002"],
      outgoingShipments: ["ship-bg-004"],
      alerts: ["Critical O- and B- burn-unit demand spike", "Forecast worsens over next 48h"],
    },
  ];

  return hospitals.map((hospital) => ({
    ...hospital,
    shortageRiskByBloodType: {},
    surplusRiskByBloodType: {},
    lastUpdated: nowIso(),
  }));
};

const calculateShipmentPosition = (
  start: [number, number],
  end: [number, number],
  progress: number,
): [number, number] => [start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress];

export const seededShipments = (hospitals: Hospital[]): Shipment[] => {
  const byId = Object.fromEntries(hospitals.map((hospital) => [hospital.id, hospital]));
  const rawShipments: Array<
    Omit<Shipment, "currentCoordinates" | "createdAt" | "updatedAt"> & {
      progress: number;
      status: Shipment["status"];
    }
  > = [
    {
      id: "ship-bg-001",
      fromHospitalId: "hosp-plovdiv-st-george",
      toHospitalId: "hosp-sofia-alexandrovska",
      bloodType: "O-",
      quantity: 12,
      status: "in_transit",
      priority: "critical",
      etaMinutes: 78,
      progress: 0.42,
    },
    {
      id: "ship-bg-002",
      fromHospitalId: "hosp-sofia-alexandrovska",
      toHospitalId: "hosp-varna-st-marina",
      bloodType: "B-",
      quantity: 10,
      status: "delayed",
      priority: "high",
      etaMinutes: 160,
      progress: 0.57,
    },
    {
      id: "ship-bg-003",
      fromHospitalId: "hosp-sofia-alexandrovska",
      toHospitalId: "hosp-plovdiv-st-george",
      bloodType: "A+",
      quantity: 14,
      status: "approved",
      priority: "medium",
      etaMinutes: 96,
      progress: 0,
    },
    {
      id: "ship-bg-004",
      fromHospitalId: "hosp-varna-st-marina",
      toHospitalId: "hosp-plovdiv-st-george",
      bloodType: "O+",
      quantity: 8,
      status: "delivered",
      priority: "high",
      etaMinutes: 0,
      progress: 1,
    },
    {
      id: "ship-bg-005",
      fromHospitalId: "hosp-plovdiv-st-george",
      toHospitalId: "hosp-sofia-alexandrovska",
      bloodType: "A+",
      quantity: 18,
      status: "planned",
      priority: "high",
      etaMinutes: 88,
      progress: 0,
    },
  ];

  return rawShipments.map((shipment) => {
    const start = byId[shipment.fromHospitalId].coordinates;
    const end = byId[shipment.toHospitalId].coordinates;
    return {
      ...shipment,
      progress: clamp(shipment.progress, 0, 1),
      currentCoordinates: calculateShipmentPosition(start, end, shipment.progress),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  });
};

export const createSeedAppState = (): AppState => {
  const hospitals = seededHospitals();
  const shipments = seededShipments(hospitals);

  return {
    version: APP_STATE_VERSION,
    seededAt: nowIso(),
    lastUpdated: nowIso(),
    hospitals,
    shipments,
    forecasts: [],
    recommendations: [],
    kpis: {
      totalHospitals: hospitals.length,
      activeShipments: shipments.filter((shipment) => ["approved", "in_transit", "delayed"].includes(shipment.status)).length,
      criticalShortages: 0,
      expiringUnitsRisk: 0,
      redistributionEfficiency: 61,
      fulfilledRecommendations: 1,
    },
    session: {
      mode: null,
      hospitalId: null,
    },
    simulation: {
      currentDate: nowIso(),
      demandMultiplier: 1,
      shipmentSpeed: 1,
    },
  };
};
