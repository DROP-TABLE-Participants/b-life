import type { Hospital, SessionState, TransferRecommendation } from "@/types/domain";

export const FACILITY_ROLE_LABELS: Record<Hospital["kind"], string> = {
  national_center: "Национален център",
  regional_center: "Регионален център",
  hospital: "Болница",
};

export const sessionForFacility = (facility: Hospital): SessionState => ({
  mode: facility.kind,
  hospitalId: facility.id,
});

export const forecastFacilities = (facility: Hospital, facilities: Hospital[]): Hospital[] =>
  facilities.filter((item) =>
    facility.kind === "national_center" || item.id === facility.id ||
    (facility.kind === "regional_center" && item.kind === "hospital" && item.regionalCenterId === facility.id),
  );

export const canOperateFacility = (session: SessionState, facilityId: string): boolean =>
  session.mode !== null && session.mode !== "control_tower" && session.hospitalId === facilityId;

export const canManageRecommendation = (session: SessionState, recommendation: TransferRecommendation): boolean =>
  (session.mode === "national_center" || session.mode === "regional_center") &&
  session.hospitalId === recommendation.fromHospitalId;

export const visibleRecommendations = (
  facility: Hospital, facilities: Hospital[], recommendations: TransferRecommendation[],
): TransferRecommendation[] => {
  const visibleIds = new Set(forecastFacilities(facility, facilities).map((item) => item.id));
  return recommendations.filter((item) => visibleIds.has(item.fromHospitalId) || visibleIds.has(item.toHospitalId));
};
