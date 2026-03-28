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
      id: "hosp-atl-central",
      name: "Atlanta Central Medical",
      city: "Atlanta",
      coordinates: [-84.388, 33.749],
      capacityLevel: "high",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(34, 10),
        "O-": 7,
      },
      incomingShipments: ["ship-001", "ship-005"],
      outgoingShipments: ["ship-003"],
      alerts: [
        "O- trauma reserve projected below threshold in 18h",
        "Emergency inbound route active from Charlotte",
      ],
    },
    {
      id: "hosp-charlotte-north",
      name: "Charlotte North Regional",
      city: "Charlotte",
      coordinates: [-80.8431, 35.2271],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(40, 8),
        "A+": 68,
      },
      incomingShipments: ["ship-004"],
      outgoingShipments: ["ship-001", "ship-005"],
      alerts: ["A+ stock nearing expiry window in 36h"],
    },
    {
      id: "hosp-nashville-west",
      name: "Nashville West Care",
      city: "Nashville",
      coordinates: [-86.7816, 36.1627],
      capacityLevel: "medium",
      status: "critical",
      inventoryByBloodType: {
        ...bloodUnits(22, 6),
        "O-": 4,
        "B-": 5,
      },
      incomingShipments: ["ship-002"],
      outgoingShipments: [],
      alerts: ["Critical O- and B- burn-unit demand spike", "Forecast worsens over next 48h"],
    },
    {
      id: "hosp-birmingham-south",
      name: "Birmingham South Health",
      city: "Birmingham",
      coordinates: [-86.8025, 33.5207],
      capacityLevel: "low",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(28, 7),
        "AB+": 44,
      },
      incomingShipments: [],
      outgoingShipments: ["ship-002"],
      alerts: ["Stable network partner, available to donate AB+ and O+"],
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
      id: "ship-001",
      fromHospitalId: "hosp-charlotte-north",
      toHospitalId: "hosp-atl-central",
      bloodType: "O-",
      quantity: 12,
      status: "in_transit",
      priority: "critical",
      etaMinutes: 95,
      progress: 0.42,
    },
    {
      id: "ship-002",
      fromHospitalId: "hosp-birmingham-south",
      toHospitalId: "hosp-nashville-west",
      bloodType: "B-",
      quantity: 10,
      status: "delayed",
      priority: "high",
      etaMinutes: 140,
      progress: 0.57,
    },
    {
      id: "ship-003",
      fromHospitalId: "hosp-atl-central",
      toHospitalId: "hosp-charlotte-north",
      bloodType: "A+",
      quantity: 14,
      status: "approved",
      priority: "medium",
      etaMinutes: 190,
      progress: 0,
    },
    {
      id: "ship-004",
      fromHospitalId: "hosp-nashville-west",
      toHospitalId: "hosp-charlotte-north",
      bloodType: "O+",
      quantity: 8,
      status: "delivered",
      priority: "high",
      etaMinutes: 0,
      progress: 1,
    },
    {
      id: "ship-005",
      fromHospitalId: "hosp-charlotte-north",
      toHospitalId: "hosp-atl-central",
      bloodType: "A+",
      quantity: 18,
      status: "planned",
      priority: "high",
      etaMinutes: 165,
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
