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
        ...bloodUnits(34, 10),
        "O-": 12,
      },
      incomingShipments: ["ship-bg-001", "ship-bg-005"],
      outgoingShipments: ["ship-bg-003"],
      alerts: [
        "O- trauma reserve projected below threshold in 18h",
        "Emergency inbound route active from Plovdiv",
      ],
    },
    {
      id: "hosp-sofia-pirogov",
      name: "Pirogov Emergency Hospital",
      city: "Sofia",
      coordinates: [23.3074, 42.6982],
      capacityLevel: "high",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(31, 9),
        "O-": 10,
        "A-": 11,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Emergency intake elevated across trauma wards"],
    },
    {
      id: "hosp-sofia-tokuda",
      name: "Acibadem City Clinic Tokuda",
      city: "Sofia",
      coordinates: [23.3186, 42.6628],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(36, 8),
        "AB+": 48,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Balanced reserve, suitable as fallback donor site"],
    },
    {
      id: "hosp-plovdiv-st-george",
      name: "UMHAT St. George",
      city: "Plovdiv",
      coordinates: [24.7497, 42.1354],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(40, 8),
        "A+": 68,
        "O-": 34,
      },
      incomingShipments: ["ship-bg-004"],
      outgoingShipments: ["ship-bg-001", "ship-bg-005"],
      alerts: ["A+ stock nearing expiry window in 36h"],
    },
    {
      id: "hosp-stara-zagora-trakia",
      name: "UMHAT Prof. Dr. Stoyan Kirkovich",
      city: "Stara Zagora",
      coordinates: [25.6345, 42.4258],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(33, 7),
        "B+": 46,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Routine demand profile, moderate reserve buffer"],
    },
    {
      id: "hosp-haskovo",
      name: "MBAL Haskovo",
      city: "Haskovo",
      coordinates: [25.5556, 41.9348],
      capacityLevel: "low",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(24, 6),
        "O-": 8,
        "B-": 6,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Lower reserve on Rh negative types"],
    },
    {
      id: "hosp-varna-st-marina",
      name: "UMHAT St. Marina",
      city: "Varna",
      coordinates: [27.9147, 43.2141],
      capacityLevel: "medium",
      status: "critical",
      inventoryByBloodType: {
        ...bloodUnits(22, 6),
        "O-": 3,
        "B-": 5,
      },
      incomingShipments: ["ship-bg-002"],
      outgoingShipments: [],
      alerts: ["Critical O- and B- burn-unit demand spike", "Forecast worsens over next 48h"],
    },
    {
      id: "hosp-burgas",
      name: "UMHAT Burgas",
      city: "Burgas",
      coordinates: [27.4705, 42.5048],
      capacityLevel: "medium",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(27, 7),
        "O+": 18,
        "A+": 20,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Seasonal coastal demand increasing weekend utilization"],
    },
    {
      id: "hosp-dobrich",
      name: "MBAL Dobrich",
      city: "Dobrich",
      coordinates: [27.8273, 43.5667],
      capacityLevel: "low",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(25, 5),
        "AB-": 14,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Small but stable reserve profile"],
    },
    {
      id: "hosp-pleven-heart-brain",
      name: "Heart and Brain Center Pleven",
      city: "Pleven",
      coordinates: [24.6208, 43.4083],
      capacityLevel: "low",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(28, 7),
        "AB+": 44,
        "O-": 22,
      },
      incomingShipments: [],
      outgoingShipments: ["ship-bg-002"],
      alerts: ["Stable network partner, available to donate AB+ and O+"],
    },
    {
      id: "hosp-ruse",
      name: "University Hospital Medica Ruse",
      city: "Ruse",
      coordinates: [25.9679, 43.8356],
      capacityLevel: "medium",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(29, 6),
        "O+": 41,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["North corridor reserve stable"],
    },
    {
      id: "hosp-veliko-tarnovo",
      name: "MOBAL Dr. Stefan Cherkezov",
      city: "Veliko Tarnovo",
      coordinates: [25.6172, 43.0757],
      capacityLevel: "medium",
      status: "strained",
      inventoryByBloodType: {
        ...bloodUnits(26, 6),
        "O-": 9,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Orthopedic demand increasing O- pressure"],
    },
    {
      id: "hosp-blagoevgrad",
      name: "MBAL Blagoevgrad",
      city: "Blagoevgrad",
      coordinates: [23.1029, 42.0209],
      capacityLevel: "low",
      status: "stable",
      inventoryByBloodType: {
        ...bloodUnits(23, 5),
        "A+": 31,
      },
      incomingShipments: [],
      outgoingShipments: [],
      alerts: ["Southwest reserve adequate for current demand"],
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
      fromHospitalId: "hosp-pleven-heart-brain",
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
