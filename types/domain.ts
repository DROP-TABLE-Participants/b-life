export const BLOOD_TYPES = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export type RiskLevel = "safe" | "elevated" | "high" | "critical";

export type HospitalStatus = "stable" | "strained" | "critical";

export type CapacityLevel = "low" | "medium" | "high";

export type ShipmentStatus =
  | "planned"
  | "approved"
  | "in_transit"
  | "delayed"
  | "delivered"
  | "cancelled";

export type PriorityLevel = "low" | "medium" | "high" | "critical";

export type RecommendationStatus =
  | "pending_approval"
  | "approved"
  | "dispatched"
  | "fulfilled"
  | "cancelled";

export interface InventoryByBloodType {
  [key: string]: number;
}

export interface RiskByBloodType {
  [key: string]: {
    score: number;
    level: RiskLevel;
  };
}

export interface Hospital {
  id: string;
  name: string;
  city: string;
  coordinates: [number, number];
  capacityLevel: CapacityLevel;
  status: HospitalStatus;
  inventoryByBloodType: InventoryByBloodType;
  shortageRiskByBloodType: RiskByBloodType;
  surplusRiskByBloodType: RiskByBloodType;
  incomingShipments: string[];
  outgoingShipments: string[];
  alerts: string[];
  lastUpdated: string;
}

export interface Shipment {
  id: string;
  fromHospitalId: string;
  toHospitalId: string;
  bloodType: BloodType;
  quantity: number;
  status: ShipmentStatus;
  priority: PriorityLevel;
  etaMinutes: number;
  currentCoordinates: [number, number];
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface Forecast {
  hospitalId: string;
  bloodType: BloodType;
  currentUnits: number;
  predictedDemand24h: number;
  predictedDemand48h: number;
  shortageRiskScore: number;
  shortageRiskLevel: RiskLevel;
  surplusRiskScore: number;
  surplusRiskLevel: RiskLevel;
  topFactors: string[];
}

export interface TransferRecommendation {
  id: string;
  fromHospitalId: string;
  toHospitalId: string;
  bloodType: BloodType;
  suggestedQuantity: number;
  reason: string;
  urgency: PriorityLevel;
  distanceKm: number;
  etaMinutes: number;
  confidenceScore: number;
  status: RecommendationStatus;
}

export interface SystemKPI {
  totalHospitals: number;
  activeShipments: number;
  criticalShortages: number;
  expiringUnitsRisk: number;
  redistributionEfficiency: number;
  fulfilledRecommendations: number;
}

export interface SessionState {
  mode: "hospital" | "control_tower" | null;
  hospitalId: string | null;
}

export interface SimulationSettings {
  currentDate: string;
  demandMultiplier: number;
  shipmentSpeed: number;
}

export interface AppState {
  version: string;
  seededAt: string;
  lastUpdated: string;
  hospitals: Hospital[];
  shipments: Shipment[];
  forecasts: Forecast[];
  recommendations: TransferRecommendation[];
  kpis: SystemKPI;
  session: SessionState;
  simulation: SimulationSettings;
}
