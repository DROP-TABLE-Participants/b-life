import { distanceKmBetween } from "@/lib/utils";

export const PUBLIC_MAPBOX_TOKEN =
  "pk.eyJ1IjoiYm5zYXZvdiIsImEiOiJjbTh1MzJmazEwaHhtMmlwZTk4djVyZDNrIn0.CIA7aiohbblSvgw6-4COLg";

export interface RouteEstimate {
  minutes: number;
  km: number;
  /** "route" when Mapbox Directions answered, otherwise a straight-line estimate. */
  source: "route" | "distance";
}

// Same average speed the store uses when it creates shipments from accepted orders.
export const estimateRoute = (from: [number, number], to: [number, number]): RouteEstimate => {
  const km = distanceKmBetween(from, to);
  return { km: Math.round(km), minutes: Math.max(15, Math.round(km / 68 * 60)), source: "distance" };
};

export async function fetchRoute(from: [number, number], to: [number, number], signal?: AbortSignal): Promise<RouteEstimate> {
  try {
    const response = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${from.join(",")};${to.join(",")}?overview=false&access_token=${PUBLIC_MAPBOX_TOKEN}`, { signal });
    if (response.ok) {
      const result = await response.json() as { routes?: Array<{ duration?: number; distance?: number }> };
      const route = result.routes?.[0];
      if (route?.duration && route.distance) return { minutes: Math.max(5, Math.round(route.duration / 60)), km: Math.round(route.distance / 1000), source: "route" };
    }
  } catch { /* Fall back to the distance estimate when directions are unavailable. */ }
  return estimateRoute(from, to);
}
