import { BLOOD_TYPE_LIST, DEFAULT_DEMAND_PROFILE, HOLIDAY_DEMAND_RULES, PRIORITY_WEIGHTS } from "@/lib/constants";
import { clamp, toRiskLevel } from "@/lib/utils";
import type { AppState, BloodType, Forecast, Hospital, RiskByBloodType, Shipment, SimulationSettings, SystemKPI } from "@/types/domain";

const PROGRESSIVE_INBOUND = new Set(["in_transit", "delayed"]);
const ACTIVE_OUTBOUND = new Set(["approved", "planned", "in_transit", "delayed"]);

const demandMultiplierByCapacity: Record<Hospital["capacityLevel"], number> = {
  low: 0.85,
  medium: 1,
  high: 1.2,
};

const trendFactorForCity = (city: string): number => {
  if (city === "Sofia") return 1.22;
  if (city === "Plovdiv") return 1.1;
  if (city === "Varna") return 1.08;
  return 1;
};

const seasonalityFactor = (isoDate?: string): number => {
  const day = new Date(isoDate ?? Date.now()).getDay();
  return day === 5 || day === 6 ? 1.08 : 1;
};

const monthDayValue = (date: Date): number => (date.getUTCMonth() + 1) * 100 + date.getUTCDate();

const parseMonthDayValue = (monthDay: string): number => {
  const [month, day] = monthDay.split("-").map(Number);
  return month * 100 + day;
};

const dateInRuleRange = (date: Date, start: string, end: string): boolean => {
  const current = monthDayValue(date);
  const startDay = parseMonthDayValue(start);
  const endDay = parseMonthDayValue(end);

  if (startDay <= endDay) return current >= startDay && current <= endDay;
  return current >= startDay || current <= endDay;
};

const resolveHolidayMultiplier = (isoDate: string | undefined, bloodType: BloodType): { multiplier: number; label?: string } => {
  if (!isoDate) return { multiplier: 1 };
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return { multiplier: 1 };

  let multiplier = 1;
  const labels: string[] = [];

  HOLIDAY_DEMAND_RULES.forEach((rule) => {
    if (!dateInRuleRange(date, rule.start, rule.end)) return;
    const bloodTypeFactor = rule.bloodTypeMultipliers[bloodType];
    if (!bloodTypeFactor || bloodTypeFactor <= 1) return;
    multiplier *= bloodTypeFactor;
    labels.push(rule.name);
  });

  return labels.length ? { multiplier, label: labels.join(" + ") } : { multiplier };
};

const sumInboundUnits = (hospitalId: string, bloodType: BloodType, shipments: Shipment[]): number =>
  shipments
    .filter((shipment) => shipment.bloodType === bloodType && shipment.toHospitalId === hospitalId)
    .reduce((sum, shipment) => {
      if (shipment.status === "delivered") {
        return sum + shipment.quantity * PRIORITY_WEIGHTS[shipment.priority];
      }

      if (PROGRESSIVE_INBOUND.has(shipment.status)) {
        // Keep inbound impact conservative until units are actually received.
        const progressWeight = clamp(shipment.progress, 0, 1) * 0.35;
        return sum + shipment.quantity * PRIORITY_WEIGHTS[shipment.priority] * progressWeight;
      }

      return sum;
    }, 0);

const sumOutboundUnits = (hospitalId: string, bloodType: BloodType, shipments: Shipment[]): number =>
  shipments
    .filter(
      (shipment) =>
        shipment.bloodType === bloodType &&
        shipment.fromHospitalId === hospitalId &&
        ACTIVE_OUTBOUND.has(shipment.status),
    )
    .reduce((sum, shipment) => sum + shipment.quantity * PRIORITY_WEIGHTS[shipment.priority], 0);

export const runForecastingEngine = (
  hospitals: Hospital[],
  shipments: Shipment[],
  simulation?: SimulationSettings,
): Forecast[] => {
  const seasonalFactor = seasonalityFactor(simulation?.currentDate);
  const demandMultiplier = simulation?.demandMultiplier ?? 1;

  return hospitals.flatMap((hospital) => {
    const capacityDemandFactor = demandMultiplierByCapacity[hospital.capacityLevel];
    const cityFactor = trendFactorForCity(hospital.city);

    return BLOOD_TYPE_LIST.map((bloodType) => {
      const currentUnits = hospital.inventoryByBloodType[bloodType] ?? 0;
      const baselineDemand = 14 * (DEFAULT_DEMAND_PROFILE[bloodType] ?? 1);
      const holiday = resolveHolidayMultiplier(simulation?.currentDate, bloodType);
      const predictedDemand24h = Math.round(
        baselineDemand * capacityDemandFactor * cityFactor * seasonalFactor * demandMultiplier * holiday.multiplier,
      );
      const predictedDemand48h = Math.round(predictedDemand24h * 2.05);

      const inboundUnits = sumInboundUnits(hospital.id, bloodType, shipments);
      const outboundUnits = sumOutboundUnits(hospital.id, bloodType, shipments);

      const projected24h = currentUnits + inboundUnits - outboundUnits;
      const shortageGap = predictedDemand24h - projected24h;
      const surplusGap = projected24h - predictedDemand48h * 0.42;

      const shortageRiskScore = clamp((shortageGap / Math.max(predictedDemand24h, 1)) * 100 + (cityFactor - 1) * 40, 0, 100);
      const surplusRiskScore = clamp((surplusGap / Math.max(predictedDemand24h, 1)) * 100, 0, 100);

      const topFactors = [
        `Stock ${Math.round(currentUnits)}u vs 24h demand ${predictedDemand24h}u`,
        `Inbound ${Math.round(inboundUnits)}u / Outbound ${Math.round(outboundUnits)}u`,
      ];

      if (holiday.multiplier > 1) {
        topFactors.push(
          `${holiday.label ?? "Holiday demand period"} +${((holiday.multiplier - 1) * 100).toFixed(0)}%`,
        );
      }
      if (cityFactor > 1) {
        topFactors.push(`Regional demand multiplier ${(cityFactor * 100).toFixed(0)}%`);
      }
      if (seasonalFactor > 1) {
        topFactors.push(`Weekend trauma uplift ${(seasonalFactor * 100).toFixed(0)}%`);
      }

      return {
        hospitalId: hospital.id,
        bloodType,
        currentUnits,
        predictedDemand24h,
        predictedDemand48h,
        shortageRiskScore,
        shortageRiskLevel: toRiskLevel(shortageRiskScore),
        surplusRiskScore,
        surplusRiskLevel: toRiskLevel(surplusRiskScore),
        topFactors: topFactors.slice(0, 3),
      } satisfies Forecast;
    });
  });
};

export const attachForecastRisksToHospitals = (hospitals: Hospital[], forecasts: Forecast[]): Hospital[] => {
  const grouped = forecasts.reduce<Record<string, Forecast[]>>((acc, forecast) => {
    if (!acc[forecast.hospitalId]) acc[forecast.hospitalId] = [];
    acc[forecast.hospitalId].push(forecast);
    return acc;
  }, {});

  return hospitals.map((hospital) => {
    const hospitalForecasts = grouped[hospital.id] ?? [];
    const shortage: RiskByBloodType = {};
    const surplus: RiskByBloodType = {};

    hospitalForecasts.forEach((forecast) => {
      shortage[forecast.bloodType] = {
        score: forecast.shortageRiskScore,
        level: forecast.shortageRiskLevel,
      };
      surplus[forecast.bloodType] = {
        score: forecast.surplusRiskScore,
        level: forecast.surplusRiskLevel,
      };
    });

    const criticalShortages = hospitalForecasts.filter((forecast) => forecast.shortageRiskLevel === "critical").length;

    return {
      ...hospital,
      status: criticalShortages > 1 ? "critical" : criticalShortages === 1 ? "strained" : "stable",
      shortageRiskByBloodType: shortage,
      surplusRiskByBloodType: surplus,
      lastUpdated: new Date().toISOString(),
    };
  });
};

export const computeSystemKpis = (state: Pick<AppState, "hospitals" | "shipments" | "forecasts" | "recommendations">): SystemKPI => {
  const activeShipments = state.shipments.filter((shipment) => ["approved", "in_transit", "delayed"].includes(shipment.status)).length;
  const criticalShortages = state.forecasts.filter((forecast) => forecast.shortageRiskLevel === "critical").length;
  const expiringUnitsRisk = state.forecasts.filter((forecast) => forecast.surplusRiskLevel === "critical").length;

  const recommendationBase = state.recommendations.length || 1;
  const fulfilled = state.recommendations.filter((recommendation) => recommendation.status === "fulfilled").length;

  return {
    totalHospitals: state.hospitals.length,
    activeShipments,
    criticalShortages,
    expiringUnitsRisk,
    redistributionEfficiency: Math.round((fulfilled / recommendationBase) * 100),
    fulfilledRecommendations: fulfilled,
  };
};
