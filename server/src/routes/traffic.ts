import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import type { TrafficData } from "@shared/types.js";

export const trafficRouter = Router();
trafficRouter.use(requireAuth);

// Athi River → Nairobi CBD via Mombasa Road
// Origin: Athi River roundabout  |  Destination: Kencom House, Nairobi
const ORIGIN = "-1.467,36.983";
const DEST   = "-1.284,36.823";

// Normal drive time (baseline, minutes) — ~42 km via A109
const NORMAL_MINS = 45;
const DISTANCE_KM = 42;

trafficRouter.get("/", async (_req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    // No API key — return static baseline with a flag
    const data: TrafficData & { noKey: true } = {
      durationMins: NORMAL_MINS,
      normalMins:   NORMAL_MINS,
      distanceKm:   DISTANCE_KM,
      status:       "clear",
      updatedAt:    new Date().toISOString(),
      noKey:        true,
    };
    res.json({ data });
    return;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${ORIGIN}&destinations=${DEST}` +
      `&mode=driving&departure_time=now&traffic_model=best_guess` +
      `&key=${apiKey}`;

    const resp = await fetch(url);
    const raw = (await resp.json()) as {
      rows: Array<{
        elements: Array<{
          status: string;
          duration: { value: number };
          duration_in_traffic: { value: number };
          distance: { value: number };
        }>;
      }>;
    };

    const el = raw.rows[0]?.elements[0];
    if (!el || el.status !== "OK") throw new Error("No route data");

    const durationMins = Math.round(el.duration_in_traffic.value / 60);
    const normalMins   = Math.round(el.duration.value / 60);
    const distanceKm   = Math.round(el.distance.value / 1000);
    const ratio = durationMins / normalMins;
    const status: TrafficData["status"] =
      ratio < 1.2 ? "clear" : ratio < 1.6 ? "moderate" : "heavy";

    const data: TrafficData = {
      durationMins,
      normalMins,
      distanceKm,
      status,
      updatedAt: new Date().toISOString(),
    };
    res.json({ data });
  } catch {
    res.status(503).json({ error: "Traffic data temporarily unavailable" });
  }
});
