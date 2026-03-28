import { BLOOD_TYPES, type PriorityLevel, type RiskLevel, type ShipmentStatus } from "@/types/domain";

export const APP_NAME = "B.Life";
export const APP_TAGLINE = "Autonomous Blood Supply Command Center";
export const APP_STATE_VERSION = "1.0.0";
export const STORAGE_KEY = "b-life:app-state";

export const BLOOD_TYPE_LIST = BLOOD_TYPES;

export const RISK_COLORS: Record<RiskLevel, string> = {
  safe: "text-emerald-300",
  elevated: "text-amber-300",
  high: "text-orange-400",
  critical: "text-rose-400",
};

export const STATUS_COLORS: Record<ShipmentStatus, string> = {
  planned: "bg-slate-500/20 text-slate-200",
  approved: "bg-blue-500/20 text-blue-300",
  in_transit: "bg-cyan-500/20 text-cyan-300",
  delayed: "bg-amber-500/20 text-amber-300",
  delivered: "bg-emerald-500/20 text-emerald-300",
  cancelled: "bg-rose-500/20 text-rose-300",
};

export const PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  low: 0.8,
  medium: 1,
  high: 1.25,
  critical: 1.5,
};

export const DEFAULT_DEMAND_PROFILE: Record<string, number> = {
  "O-": 1.3,
  "O+": 1.2,
  "A-": 1,
  "A+": 1,
  "B-": 0.9,
  "B+": 0.95,
  "AB-": 0.65,
  "AB+": 0.7,
};

export const SIMULATION_BOUNDS = {
  demandMultiplier: { min: 0.6, max: 1.8, step: 0.05 },
  shipmentSpeed: { min: 0.5, max: 3, step: 0.1 },
} as const;

export interface HolidayDemandRule {
  name: string;
  start: string;
  end: string;
  bloodTypeMultipliers: Partial<Record<(typeof BLOOD_TYPES)[number], number>>;
}

export const HOLIDAY_DEMAND_RULES: HolidayDemandRule[] = [
  {
    name: "New Year Period",
    start: "12-30",
    end: "01-02",
    bloodTypeMultipliers: { "O-": 1.22, "O+": 1.14, "A-": 1.06 },
  },
  {
    name: "Independence Day Period",
    start: "07-03",
    end: "07-06",
    bloodTypeMultipliers: { "O-": 1.2, "O+": 1.12, "B+": 1.08 },
  },
  {
    name: "Thanksgiving Period",
    start: "11-24",
    end: "11-29",
    bloodTypeMultipliers: { "O-": 1.18, "O+": 1.1, "A+": 1.07 },
  },
  {
    name: "Winter Holidays",
    start: "12-22",
    end: "12-27",
    bloodTypeMultipliers: { "O-": 1.2, "O+": 1.12, "AB+": 1.09 },
  },
];
