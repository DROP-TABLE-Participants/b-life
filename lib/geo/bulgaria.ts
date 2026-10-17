import type { Feature, Polygon } from "geojson";
import boundary from "./bulgaria.json";

// Natural Earth 1:50m admin-0 boundary, public domain.
// https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
export const BULGARIA_BOUNDARY = boundary as Feature<Polygon>;
export const BULGARIA_BOUNDS: [[number, number], [number, number]] = [[22.35, 41.23], [28.63, 44.25]];
export const BULGARIA_MAX_BOUNDS: [[number, number], [number, number]] = [[20.9, 40.5], [30.1, 45.0]];

// A polygon with Bulgaria cut out hides all foreign territory, including labels.
export const OUTSIDE_BULGARIA_MASK: Feature<Polygon> = {
  type: "Feature", properties: {},
  geometry: { type: "Polygon", coordinates: [
    [[-30, 0], [70, 0], [70, 70], [-30, 70], [-30, 0]],
    [...BULGARIA_BOUNDARY.geometry.coordinates[0]].reverse(),
  ] },
};
