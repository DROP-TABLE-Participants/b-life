import { distanceKmBetween } from "@/lib/utils";
import type { Forecast, Hospital, TransferRecommendation } from "@/types/domain";

const urgencyFromScore = (score: number): TransferRecommendation["urgency"] => {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
};

export const runRedistributionEngine = (hospitals: Hospital[], forecasts: Forecast[]): TransferRecommendation[] => {
  const hospitalById = Object.fromEntries(hospitals.map((hospital) => [hospital.id, hospital]));
  const forecastByKey = Object.fromEntries(
    forecasts.map((forecast) => [`${forecast.hospitalId}:${forecast.bloodType}`, forecast]),
  );

  const shortages = forecasts
    .filter((forecast) => forecast.shortageRiskScore >= 55)
    .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore);

  const surplus = forecasts
    .filter((forecast) => forecast.surplusRiskScore >= 50)
    .sort((a, b) => b.surplusRiskScore - a.surplusRiskScore);

  const reservedSupplyByKey: Record<string, number> = {};
  const coveredDemandByKey: Record<string, number> = {};

  const recommendations: TransferRecommendation[] = [];

  shortages.forEach((needForecast) => {
    const needKey = `${needForecast.hospitalId}:${needForecast.bloodType}`;
    const alreadyCovered = coveredDemandByKey[needKey] ?? 0;
    const shortageUnits = Math.max(
      0,
      Math.round(needForecast.predictedDemand24h - needForecast.currentUnits - alreadyCovered),
    );
    if (shortageUnits < 4) return;

    const candidates = surplus
      .filter(
        (supplyForecast) =>
          supplyForecast.hospitalId !== needForecast.hospitalId &&
          supplyForecast.bloodType === needForecast.bloodType &&
          supplyForecast.currentUnits > needForecast.currentUnits,
      )
      .map((candidate) => {
        const from = hospitalById[candidate.hospitalId];
        const to = hospitalById[needForecast.hospitalId];
        const candidateKey = `${candidate.hospitalId}:${candidate.bloodType}`;
        const donorForecast = forecastByKey[candidateKey];
        const alreadyReserved = reservedSupplyByKey[candidateKey] ?? 0;
        const reserveFloor = Math.max(4, Math.round((donorForecast?.predictedDemand24h ?? candidate.predictedDemand24h) * 0.7));
        const availableUnits = Math.max(0, Math.round(candidate.currentUnits - reserveFloor - alreadyReserved));
        if (!from || !to || availableUnits < 4) return null;

        const distanceKm = distanceKmBetween(from.coordinates, to.coordinates);
        const shortagePressure = needForecast.shortageRiskScore / 100;
        const donorConfidence = candidate.surplusRiskScore / 100;
        const distancePenalty = Math.min(0.45, distanceKm / 1200);
        const availabilityBoost = Math.min(0.3, availableUnits / 80);
        const score = shortagePressure * 0.45 + donorConfidence * 0.3 + availabilityBoost - distancePenalty;

        return { candidate, from, to, distanceKm, availableUnits, score };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);

    const selected = candidates[0];
    if (!selected) return;

    const suggestedQuantity = Math.max(4, Math.min(24, Math.min(shortageUnits, selected.availableUnits)));

    const etaMinutes = Math.round((selected.distanceKm / 68) * 60);
    const urgency = urgencyFromScore(needForecast.shortageRiskScore);

    reservedSupplyByKey[`${selected.candidate.hospitalId}:${selected.candidate.bloodType}`] =
      (reservedSupplyByKey[`${selected.candidate.hospitalId}:${selected.candidate.bloodType}`] ?? 0) + suggestedQuantity;
    coveredDemandByKey[needKey] = (coveredDemandByKey[needKey] ?? 0) + suggestedQuantity;

    const recommendationId = `rec-${selected.from.id}-${selected.to.id}-${selected.candidate.bloodType}`;

    recommendations.push({
      id: recommendationId,
      fromHospitalId: selected.from.id,
      toHospitalId: selected.to.id,
      bloodType: selected.candidate.bloodType,
      suggestedQuantity,
      reason: `${selected.to.name} faces ${needForecast.shortageRiskLevel} shortage risk while ${selected.from.name} has projected surplus.`,
      urgency,
      distanceKm: Number(selected.distanceKm.toFixed(1)),
      etaMinutes,
      confidenceScore: Math.min(98, Math.round((needForecast.shortageRiskScore + selected.candidate.surplusRiskScore) / 2)),
      status: "pending_approval",
    });
  });

  return recommendations.slice(0, 8);
};
