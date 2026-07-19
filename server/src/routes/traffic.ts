import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { estates } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import type { TrafficData } from "@shared/types.js";

export const trafficRouter = Router();
trafficRouter.use(requireAuth);

// Destination: Kencom House, Nairobi CBD — a reasonable default commute
// target for any estate on this platform so far (all satellite-town
// estates commuting toward Nairobi). Per-estate custom destinations would
// need a settings UI; not worth it until a second, differently-situated
// estate actually needs it.
const DEST = "-1.284,36.823";

// Athi River roundabout — fallback origin for estates without coordinates
// set yet (mirrors weather.ts's default).
const DEFAULT_ORIGIN = "-1.4667,36.9833";

// Normal drive time (baseline, minutes) — ~42 km via A109. Used both as the
// static fallback when GOOGLE_MAPS_API_KEY isn't configured, and as the
// distance/duration shown even when it is, if the estate itself is Athi
// River (same numbers either way).
const NORMAL_MINS = 45;
const DISTANCE_KM = 42;

trafficRouter.get("/", async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    const user = res.locals.user!;
    let origin = DEFAULT_ORIGIN;
    if (user.estateId) {
      const [estate] = await db
        .select({ lat: estates.lat, lng: estates.lng })
        .from(estates)
        .where(eq(estates.id, user.estateId))
        .limit(1);
      if (estate?.lat && estate?.lng) {
        origin = `${estate.lat},${estate.lng}`;
      }
    }

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

    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json` +
      `?origins=${origin}&destinations=${DEST}` +
      `&mode=driving&departure_time=now&traffic_model=best_guess` +
      `&key=${apiKey}`;

    // AbortSignal.timeout — without it, a Google Maps API that accepts the
    // connection but never responds hangs the request indefinitely (a
    // try/catch alone only catches a rejection, not a promise that never
    // settles).
    const resp = await fetch(url, { signal: AbortSignal.timeout(8_000) });
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
