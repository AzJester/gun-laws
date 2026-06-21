// Loads the pre-projected Albers-USA SVG geometry (us-atlas / US Census, public
// domain). Read server-side; the path data is passed to the client GeoMap.
//
// NOTE: Alaska's path extends to ~x=-58, so the SVG must be rendered with
// viewBox "-60 0 1180 610" (extra right margin holds the NE leader-line labels).

import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface GeoState {
  name: string;
  d: string;
}

export interface GeoData {
  viewBox: string;
  states: Record<string, GeoState>;
}

let cached: GeoData | null = null;

export async function getGeo(): Promise<GeoData> {
  if (cached) return cached;
  const file = path.join(process.cwd(), "..", "data", "us-geo.json");
  const raw = await fs.readFile(file, "utf8");
  cached = JSON.parse(raw) as GeoData;
  return cached;
}
