import { availableInventoryUnits } from "@/lib/inventory";
import type { BloodType, Forecast, Hospital, Shipment } from "@/types/domain";

export type ForecastHorizon = 24 | 48;

export interface ForecastPoint {
  hour: number;
  withoutDeliveries: number;
  withDeliveries: number;
}

export interface StockProjection {
  bloodType: BloodType;
  currentUnits: number;
  reservedUnits: number;
  availableUnits: number;
  demandUnits: number;
  incomingUnits: number;
  awaitingDispatchUnits: number;
  delayedUnits: number;
  balance: number;
  replenishmentUnits: number;
  firstShortageHour: number | null;
  points: ForecastPoint[];
}

// 24 h and 48 h forecasts are cumulative. Interpolate separately within each day.
const demandAt = (forecast: Forecast, hour: number, multiplier: number): number =>
  (forecast.predictedDemand24h * Math.min(hour, 24) / 24 +
    Math.max(0, forecast.predictedDemand48h - forecast.predictedDemand24h) * Math.max(0, hour - 24) / 24) * multiplier;

export function projectBloodStock(
  facility: Hospital,
  forecast: Forecast,
  shipments: Shipment[],
  horizon: ForecastHorizon,
  extraDemandPercent = 0,
): StockProjection {
  const multiplier = 1 + Math.max(0, extraDemandPercent) / 100;
  const currentUnits = facility.inventoryByBloodType[forecast.bloodType] ?? 0;
  const availableUnits = availableInventoryUnits({ hospitals: [facility], shipments }, facility.id, forecast.bloodType);
  // Approved/planned inbound shipments have not left the sender. Received stock is already on hand.
  const arrivals = shipments.filter((item) => item.toHospitalId === facility.id && item.bloodType === forecast.bloodType &&
    (item.status === "in_transit" || item.status === "delayed") && item.etaMinutes <= horizon * 60)
    .map((item) => ({ hour: Math.max(0, item.etaMinutes / 60), units: item.quantity, delayed: item.status === "delayed" }));
  const awaitingDispatchUnits = shipments.filter((item) => item.toHospitalId === facility.id && item.bloodType === forecast.bloodType &&
    (item.status === "approved" || item.status === "planned")).reduce((sum, item) => sum + item.quantity, 0);
  const times = [...new Set([0, ...Array.from({ length: horizon / 6 }, (_, i) => (i + 1) * 6), ...arrivals.map((item) => item.hour)])].sort((a, b) => a - b);
  const points: ForecastPoint[] = [];
  let delivered = 0;
  let minimumBalance = availableUnits;
  let firstShortageHour: number | null = null;
  let previousHour = 0;
  let previousBalance = availableUnits;

  for (const hour of times) {
    const withoutDeliveries = availableUnits - demandAt(forecast, hour, multiplier);
    const beforeArrival = withoutDeliveries + delivered;
    minimumBalance = Math.min(minimumBalance, beforeArrival);
    if (firstShortageHour === null && beforeArrival < -1e-9) {
      const consumed = demandAt(forecast, hour, multiplier) - demandAt(forecast, previousHour, multiplier);
      firstShortageHour = previousBalance <= 0 || consumed <= 0 ? previousHour :
        previousHour + previousBalance / consumed * (hour - previousHour);
    }
    points.push({ hour, withoutDeliveries, withDeliveries: beforeArrival });
    const incoming = arrivals.filter((item) => item.hour === hour).reduce((sum, item) => sum + item.units, 0);
    if (incoming > 0) {
      delivered += incoming;
      // Duplicate the timestamp to draw the delivery as a step, rather than inventing gradual receipt.
      points.push({ hour, withoutDeliveries, withDeliveries: withoutDeliveries + delivered });
    }
    previousHour = hour;
    previousBalance = withoutDeliveries + delivered;
  }

  const demandUnits = demandAt(forecast, horizon, multiplier);
  return {
    bloodType: forecast.bloodType, currentUnits, availableUnits, reservedUnits: currentUnits - availableUnits,
    demandUnits, incomingUnits: delivered, awaitingDispatchUnits, delayedUnits: arrivals.filter((item) => item.delayed).reduce((sum, item) => sum + item.units, 0),
    balance: availableUnits + delivered - demandUnits,
    replenishmentUnits: Math.ceil(Math.max(0, -minimumBalance - 1e-9)), firstShortageHour, points,
  };
}

export function summarizeStockProjections(rows: StockProjection[]) {
  const shortages = rows.filter((item) => item.replenishmentUnits > 0)
    .sort((a, b) => (a.firstShortageHour ?? Infinity) - (b.firstShortageHour ?? Infinity) || b.replenishmentUnits - a.replenishmentUnits);
  return {
    shortages,
    availableUnits: rows.reduce((sum, item) => sum + item.availableUnits, 0),
    demandUnits: rows.reduce((sum, item) => sum + Math.ceil(item.demandUnits - 1e-9), 0),
    incomingUnits: rows.reduce((sum, item) => sum + item.incomingUnits, 0),
    // Different blood groups cannot cancel out each other's shortfalls.
    replenishmentUnits: shortages.reduce((sum, item) => sum + item.replenishmentUnits, 0),
  };
}
