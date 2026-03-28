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
