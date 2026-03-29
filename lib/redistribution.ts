import { distanceKmBetween } from "@/lib/utils";
import type { Forecast, Hospital, TransferRecommendation } from "@/types/domain";

const SERVICE_LEVEL_Z = 1.28;
const MIN_TRANSFER_UNITS = 4;
const MAX_TRANSFER_UNITS = 28;

const erfApprox = (x: number): number => {
  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * absX);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
};

const normalCdf = (x: number): number => 0.5 * (1 + erfApprox(x / Math.sqrt(2)));

const urgencyFromScore = (score: number): TransferRecommendation["urgency"] => {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
};

export const runRedistributionEngine = (hospitals: Hospital[], forecasts: Forecast[]): TransferRecommendation[] => {
  const hospitalById = Object.fromEntries(hospitals.map((hospital) => [hospital.id, hospital]));
  const scenarioByKey = Object.fromEntries(
    forecasts.map((forecast) => {
      const mu3 = forecast.predictedDemand24h * 2.2;
      const sigmaDaily = Math.max(1.2, forecast.predictedDemand24h * 0.18);
      const sigma3 = Math.sqrt(3) * sigmaDaily;
      const requiredStock3d = mu3 + SERVICE_LEVEL_Z * sigma3;
      const available3d = forecast.currentUnits;
      const shortageRiskProbability =
        sigma3 <= 1e-9
          ? available3d < mu3
            ? 1
            : 0
          : 1 - normalCdf((available3d - mu3) / sigma3);
      const transferNeed = Math.max(0, Math.ceil(requiredStock3d - available3d));
      const donorReserveFloor = Math.ceil(mu3 + 0.25 * sigma3);
      const donorShareable = Math.max(0, Math.floor(available3d - donorReserveFloor));

      return [
        `${forecast.hospitalId}:${forecast.bloodType}`,
        {
          forecast,
          mu3,
          sigma3,
          requiredStock3d,
          available3d,
          shortageRiskProbability,
          transferNeed,
          donorShareable,
        },
      ];
    }),
  );

  const shortages = Object.values(scenarioByKey)
    .filter((scenario) => scenario.transferNeed >= MIN_TRANSFER_UNITS || scenario.shortageRiskProbability >= 0.28)
    .sort((a, b) => b.shortageRiskProbability - a.shortageRiskProbability || b.transferNeed - a.transferNeed);

  const reservedSupplyByKey: Record<string, number> = {};
  const coveredDemandByKey: Record<string, number> = {};

  const recommendations: TransferRecommendation[] = [];

  shortages.forEach((needScenario) => {
    const needForecast = needScenario.forecast;
    const needKey = `${needForecast.hospitalId}:${needForecast.bloodType}`;
    const alreadyCovered = coveredDemandByKey[needKey] ?? 0;
    const shortageUnits = Math.max(0, needScenario.transferNeed - alreadyCovered);
    if (shortageUnits < MIN_TRANSFER_UNITS) return;

    const candidates = forecasts
      .filter(
        (supplyForecast) =>
          supplyForecast.hospitalId !== needForecast.hospitalId && supplyForecast.bloodType === needForecast.bloodType,
      )
      .map((candidateForecast) => {
        const from = hospitalById[candidateForecast.hospitalId];
        const to = hospitalById[needForecast.hospitalId];
        const candidateKey = `${candidateForecast.hospitalId}:${candidateForecast.bloodType}`;
        const donorScenario = scenarioByKey[candidateKey];
        const alreadyReserved = reservedSupplyByKey[candidateKey] ?? 0;
        const availableUnits = Math.max(0, (donorScenario?.donorShareable ?? 0) - alreadyReserved);
        if (!from || !to || !donorScenario || availableUnits < MIN_TRANSFER_UNITS) return null;

        const distanceKm = distanceKmBetween(from.coordinates, to.coordinates);
        const shortagePressure = needScenario.shortageRiskProbability;
        const donorConfidence = 1 - donorScenario.shortageRiskProbability;
        const distancePenalty = Math.min(0.45, distanceKm / 1200);
        const availabilityBoost = Math.min(0.3, availableUnits / 80);
        const score = shortagePressure * 0.45 + donorConfidence * 0.3 + availabilityBoost - distancePenalty;

        return { candidateForecast, from, to, distanceKm, availableUnits, score };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

    const selected = candidates[0];
    if (!selected) return;

    const suggestedQuantity = Math.max(
      MIN_TRANSFER_UNITS,
      Math.min(MAX_TRANSFER_UNITS, Math.min(shortageUnits, selected.availableUnits)),
    );

    const etaMinutes = Math.round((selected.distanceKm / 68) * 60);
    reservedSupplyByKey[`${selected.candidateForecast.hospitalId}:${selected.candidateForecast.bloodType}`] =
      (reservedSupplyByKey[`${selected.candidateForecast.hospitalId}:${selected.candidateForecast.bloodType}`] ?? 0) + suggestedQuantity;
    coveredDemandByKey[needKey] = (coveredDemandByKey[needKey] ?? 0) + suggestedQuantity;

    const recommendationId = `rec-${selected.from.id}-${selected.to.id}-${selected.candidateForecast.bloodType}`;

    recommendations.push({
      id: recommendationId,
      fromHospitalId: selected.from.id,
      toHospitalId: selected.to.id,
      bloodType: selected.candidateForecast.bloodType,
      suggestedQuantity,
      reason: `${selected.to.name} needs safety-stock support over the next 72h while ${selected.from.name} can share with buffer preserved.`,
      urgency: urgencyFromScore(Math.round(needScenario.shortageRiskProbability * 100)),
      distanceKm: Number(selected.distanceKm.toFixed(1)),
      etaMinutes,
      confidenceScore: Math.min(
        98,
        Math.round(
          needScenario.shortageRiskProbability * 55 +
            (1 - (scenarioByKey[`${selected.from.id}:${selected.candidateForecast.bloodType}`]?.shortageRiskProbability ?? 0.5)) * 35 +
            10,
        ),
      ),
      status: "pending_approval",
    });
  });

  return recommendations.slice(0, 8);
};
