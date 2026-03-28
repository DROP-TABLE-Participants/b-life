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

  const shortages = forecasts
    .filter((forecast) => forecast.shortageRiskScore >= 55)
    .sort((a, b) => b.shortageRiskScore - a.shortageRiskScore);

  const surplus = forecasts
    .filter((forecast) => forecast.surplusRiskScore >= 50)
    .sort((a, b) => b.surplusRiskScore - a.surplusRiskScore);

  const recommendations: TransferRecommendation[] = [];

  shortages.forEach((needForecast, index) => {
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
        const distanceKm = distanceKmBetween(from.coordinates, to.coordinates);
        return { candidate, from, to, distanceKm };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm || b.candidate.surplusRiskScore - a.candidate.surplusRiskScore);

    const selected = candidates[0];
    if (!selected) return;

    const shortageUnits = Math.max(6, Math.round(needForecast.predictedDemand24h - needForecast.currentUnits));
    const surplusUnits = Math.max(4, Math.round(selected.candidate.currentUnits - selected.candidate.predictedDemand24h * 0.8));
    const suggestedQuantity = Math.max(4, Math.min(24, Math.min(shortageUnits, surplusUnits)));

    const etaMinutes = Math.round((selected.distanceKm / 68) * 60);
    const urgency = urgencyFromScore(needForecast.shortageRiskScore);

    recommendations.push({
      id: `rec-${index + 1}-${needForecast.hospitalId}-${selected.candidate.bloodType}`,
      fromHospitalId: selected.from.id,
      toHospitalId: selected.to.id,
      bloodType: selected.candidate.bloodType,
      suggestedQuantity,
      reason: `${selected.to.name} faces ${needForecast.shortageRiskLevel} shortage risk while ${selected.from.name} has projected surplus.`,
      urgency,
      distanceKm: Number(selected.distanceKm.toFixed(1)),
      etaMinutes,
      confidenceScore: Math.min(98, Math.round((needForecast.shortageRiskScore + selected.candidate.surplusRiskScore) / 2)),
      status: index === 0 ? "pending_approval" : "approved",
    });
  });

  return recommendations.slice(0, 8);
};
