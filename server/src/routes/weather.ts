import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import type { WeatherData } from "@shared/types.js";

export const weatherRouter = Router();
weatherRouter.use(requireAuth);

// Athi River, Machakos County coordinates
const LAT = -1.4667;
const LON = 36.9833;

// WMO weather code → human description
function describeCode(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow / Sleet";
  if (code <= 84) return "Rain showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}

weatherRouter.get("/", async (_req, res) => {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
      `&timezone=Africa%2FNairobi&forecast_days=1`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Weather API error");
    const raw = (await resp.json()) as {
      current: {
        temperature_2m: number;
        apparent_temperature: number;
        relative_humidity_2m: number;
        weather_code: number;
        wind_speed_10m: number;
      };
      daily: {
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: number[];
      };
    };

    const data: WeatherData = {
      temp: Math.round(raw.current.temperature_2m),
      feelsLike: Math.round(raw.current.apparent_temperature),
      humidity: raw.current.relative_humidity_2m,
      windSpeed: Math.round(raw.current.wind_speed_10m),
      code: raw.current.weather_code,
      description: describeCode(raw.current.weather_code),
      rainProb: raw.daily.precipitation_probability_max[0] ?? 0,
      high: Math.round(raw.daily.temperature_2m_max[0] ?? raw.current.temperature_2m),
      low: Math.round(raw.daily.temperature_2m_min[0] ?? raw.current.temperature_2m),
      location: "Athi River, Machakos",
    };

    res.json({ data });
  } catch {
    res.status(503).json({ error: "Weather data temporarily unavailable" });
  }
});
