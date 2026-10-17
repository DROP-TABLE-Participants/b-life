import { BULGARIA_BOUNDARY, BULGARIA_BOUNDS } from "@/lib/geo/bulgaria";
import type { Hospital, Shipment } from "@/types/domain";

const WIDTH = 340;
const [[WEST, SOUTH], [EAST, NORTH]] = BULGARIA_BOUNDS;
const LATITUDE_SCALE = Math.cos(((NORTH + SOUTH) / 2) * Math.PI / 180);
const HEIGHT = Math.round(WIDTH * (NORTH - SOUTH) / ((EAST - WEST) * LATITUDE_SCALE));
const project = ([longitude, latitude]: [number, number] | number[]) =>
  [(longitude - WEST) / (EAST - WEST) * WIDTH, (NORTH - latitude) / (NORTH - SOUTH) * HEIGHT] as const;
const OUTLINE = `M ${BULGARIA_BOUNDARY.geometry.coordinates[0].map((point) => project(point).map((value) => value.toFixed(1)).join(" ")).join(" L ")} Z`;

const FACILITY_COLOR: Record<Hospital["kind"], string> = {
  national_center: "var(--facility-national)", regional_center: "var(--facility-regional)", hospital: "var(--facility-hospital)",
};

/** Static overview of the network: outline, facilities in their type colours, active routes. */
export function MiniNetworkMap({ hospitals, shipments }: { hospitals: Hospital[]; shipments: Shipment[] }) {
  const position = new Map(hospitals.map((item) => [item.id, project(item.coordinates)]));
  const active = shipments.filter((item) => item.status !== "delivered" && item.status !== "cancelled");
  return <svg viewBox={`-4 -4 ${WIDTH + 8} ${HEIGHT + 8}`} className="h-auto w-full" role="img" aria-label="Карта на мрежата">
    <path d={OUTLINE} fill="var(--canvas)" stroke="var(--ink-muted)" strokeWidth={1} strokeLinejoin="round" />
    {active.map((item, index) => {
      const from = position.get(item.fromHospitalId), to = position.get(item.toHospitalId);
      if (!from || !to) return null;
      const bend = (index % 2 ? 1 : -1) * 14;
      const moving = item.status === "in_transit" || item.status === "delayed";
      return <path key={item.id} d={`M ${from[0]} ${from[1]} Q ${(from[0] + to[0]) / 2} ${(from[1] + to[1]) / 2 + bend} ${to[0]} ${to[1]}`} fill="none"
        stroke={item.status === "delayed" ? "var(--status-elevated-strong)" : moving ? "var(--brand)" : "var(--ink-muted)"}
        strokeWidth={2} strokeLinecap="round" strokeDasharray={moving ? undefined : "4 4"} />;
    })}
    {hospitals.map((item) => {
      const [x, y] = project(item.coordinates);
      return <circle key={item.id} cx={x} cy={y} r={7} fill={FACILITY_COLOR[item.kind]} stroke="#fff" strokeWidth={2.5} />;
    })}
  </svg>;
}
