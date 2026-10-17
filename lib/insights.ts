import { projectBloodStock, summarizeStockProjections, type StockProjection } from "@/lib/forecast-planning";
import type { Forecast, Hospital, Shipment } from "@/types/domain";

export const PLANNING_HORIZON = 48;

export const facilityOutlook = (facility: Hospital, forecasts: Forecast[], shipments: Shipment[]) => {
  const rows = forecasts.filter((item) => item.hospitalId === facility.id)
    .map((item) => projectBloodStock(facility, item, shipments, PLANNING_HORIZON));
  return { rows, summary: summarizeStockProjections(rows) };
};

export const roundUnits = (units: number): number => Math.ceil(units - 1e-9);

export const formatHours = (hours: number): string => hours < 1 ? "под 1 ч." : `~${Math.round(hours)} ч.`;

export const formatSignedUnits = (units: number): string => {
  const rounded = Math.round(units);
  return `${rounded > 0 ? "+" : rounded < 0 ? "−" : ""}${Math.abs(rounded)} ед.`;
};

export const coverageRatio = (rows: StockProjection[]): number => {
  const demand = rows.reduce((sum, item) => sum + item.demandUnits, 0);
  return demand > 0 ? rows.reduce((sum, item) => sum + item.availableUnits, 0) / demand : Infinity;
};

const ratioFormat = new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const formatCoverage = (ratio: number): string => Number.isFinite(ratio) ? `${ratioFormat.format(ratio)}×` : "—";
