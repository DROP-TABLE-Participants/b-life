import { BLOOD_TYPE_LIST, DEFAULT_DEMAND_PROFILE, PRIORITY_WEIGHTS } from "@/lib/constants";
import { clamp, toRiskLevel } from "@/lib/utils";
import type { AppState, BloodType, Forecast, Hospital, RiskByBloodType, Shipment, SystemKPI } from "@/types/domain";

const ACTIVE_INBOUND = new Set(["approved", "in_transit", "delayed"]);
const ACTIVE_OUTBOUND = new Set(["approved", "in_transit", "delayed", "planned"]);

const demandMultiplierByCapacity: Record<Hospital["capacityLevel"], number> = {
  low: 0.85,
  medium: 1,
  high: 1.2,
};

const trendFactorForCity = (city: string): number => {
  if (city === "Nashville") return 1.2;
  if (city === "Atlanta") return 1.1;
  return 1;
};

const seasonalityFactor = (): number => {
  const day = new Date().getDay();
  return day === 5 || day === 6 ? 1.08 : 1;
};

const sumShipmentsFor = (
  hospitalId: string,
  bloodType: BloodType,
  shipments: Shipment[],
  direction: "in" | "out",
): number =>
  shipments
    .filter((shipment) => {
      if (shipment.bloodType !== bloodType) return false;
      if (direction === "in") return shipment.toHospitalId === hospitalId && ACTIVE_INBOUND.has(shipment.status);
      return shipment.fromHospitalId === hospitalId && ACTIVE_OUTBOUND.has(shipment.status);
    })
    .reduce((sum, shipment) => sum + shipment.quantity * PRIORITY_WEIGHTS[shipment.priority], 0);

export const runForecastingEngine = (hospitals: Hospital[], shipments: Shipment[]): Forecast[] => {
  const seasonalFactor = seasonalityFactor();

  return hospitals.flatMap((hospital) => {
    const capacityDemandFactor = demandMultiplierByCapacity[hospital.capacityLevel];
    const cityFactor = trendFactorForCity(hospital.city);

    return BLOOD_TYPE_LIST.map((bloodType) => {
      const currentUnits = hospital.inventoryByBloodType[bloodType] ?? 0;
      const baselineDemand = 14 * (DEFAULT_DEMAND_PROFILE[bloodType] ?? 1);
      const predictedDemand24h = Math.round(baselineDemand * capacityDemandFactor * cityFactor * seasonalFactor);
      const predictedDemand48h = Math.round(predictedDemand24h * 2.05);

      const inboundUnits = sumShipmentsFor(hospital.id, bloodType, shipments, "in");
      const outboundUnits = sumShipmentsFor(hospital.id, bloodType, shipments, "out");

      const projected24h = currentUnits + inboundUnits - outboundUnits;
      const shortageGap = predictedDemand24h - projected24h;
      const surplusGap = projected24h - predictedDemand48h * 0.42;

      const shortageRiskScore = clamp((shortageGap / Math.max(predictedDemand24h, 1)) * 100 + (cityFactor - 1) * 40, 0, 100);
      const surplusRiskScore = clamp((surplusGap / Math.max(predictedDemand24h, 1)) * 100, 0, 100);

      const topFactors = [
        `Stock ${Math.round(currentUnits)}u vs 24h demand ${predictedDemand24h}u`,
        `Inbound ${Math.round(inboundUnits)}u / Outbound ${Math.round(outboundUnits)}u`,
      ];

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
