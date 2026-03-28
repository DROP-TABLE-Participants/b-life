export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const toRiskLevel = (score: number): "safe" | "elevated" | "high" | "critical" => {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "elevated";
  return "safe";
};

export const distanceKmBetween = (
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
};

export const lerpCoordinates = (
  start: [number, number],
  end: [number, number],
  progress: number,
): [number, number] => [start[0] + (end[0] - start[0]) * progress, start[1] + (end[1] - start[1]) * progress];

export const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${Math.max(0, Math.round(minutes))}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
};

export const formatHospitalLabel = (hospital?: { name: string; city: string } | null): string => {
  if (!hospital) return "Unknown Hospital";
  return `${hospital.name} (${hospital.city})`;
};
