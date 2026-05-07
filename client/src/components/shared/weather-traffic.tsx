import { useQuery } from "@tanstack/react-query";
import { Cloud, Wind, Droplets, Thermometer, Car, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";
import type { WeatherData, TrafficData } from "@shared/types";

// ─── Weather Widget ───────────────────────────────────────────────────────────

function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 84) return "🌦️";
  return "⛈️";
}

export function WeatherWidget() {
  const { data, isLoading, isError } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: () => api.get<WeatherData>("/api/weather").then((r) => r.data),
    staleTime: 10 * 60 * 1000,   // cache 10 min
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="tribal-card p-4 animate-pulse">
        <div className="h-4 bg-[#D4C9A8] rounded w-1/3 mb-2" />
        <div className="h-8 bg-[#D4C9A8] rounded w-1/2" />
      </div>
    );
  }

  if (isError || !data) return null;

  return (
    <div className="tribal-card p-4 bg-gradient-to-br from-sky-50 to-[#EDE7D8] border-sky-200/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Cloud className="h-4 w-4 text-sky-600" />
          <span className="section-label text-sky-700">Weather · {data.location}</span>
        </div>
        <span className="text-2xl">{weatherIcon(data.code)}</span>
      </div>

      <div className="flex items-end gap-3">
        <div>
          <span className="text-3xl font-black text-[#212121]">{data.temp}°C</span>
          <p className="text-sm text-[#6B5D45] mt-0.5">{data.description}</p>
        </div>
        <div className="flex flex-col gap-1 mb-0.5 ml-auto text-right">
          <span className="text-xs text-[#6B5D45]">
            H:{data.high}° / L:{data.low}°
          </span>
          <span className="text-xs text-[#6B5D45]">
            Feels {data.feelsLike}°C
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-sky-200/50">
        <div className="flex items-center gap-1 text-xs text-[#6B5D45]">
          <Droplets className="h-3.5 w-3.5 text-sky-500" />
          {data.humidity}% humidity
        </div>
        <div className="flex items-center gap-1 text-xs text-[#6B5D45]">
          <Wind className="h-3.5 w-3.5 text-sky-500" />
          {data.windSpeed} km/h
        </div>
        {data.rainProb > 20 && (
          <div className="flex items-center gap-1 text-xs text-sky-700 font-semibold ml-auto">
            🌧️ {data.rainProb}% rain chance
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Traffic Widget ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  clear:    { color: "text-[#1B5E20]", bg: "bg-[#1B5E20]/10", label: "Clear",    emoji: "🟢" },
  moderate: { color: "text-[#D47A00]", bg: "bg-[#D47A00]/10", label: "Moderate", emoji: "🟡" },
  heavy:    { color: "text-[#B71C1C]", bg: "bg-[#B71C1C]/10", label: "Heavy",    emoji: "🔴" },
};

const MAPS_URL =
  "https://www.google.com/maps/dir/Athi+River,+Kenya/Nairobi+CBD,+Kenya/@-1.3759,36.8855,11z/data=!4m2!4m1!3e0";

export function TrafficWidget() {
  const { data, isLoading, isError } = useQuery<TrafficData & { noKey?: boolean }>({
    queryKey: ["traffic"],
    queryFn: () =>
      api.get<TrafficData & { noKey?: boolean }>("/api/traffic").then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="tribal-card p-4 animate-pulse">
        <div className="h-4 bg-[#D4C9A8] rounded w-1/2 mb-2" />
        <div className="h-8 bg-[#D4C9A8] rounded w-2/3" />
      </div>
    );
  }

  if (isError || !data) return null;

  const cfg = STATUS_CONFIG[data.status];

  return (
    <div className="tribal-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Car className="h-4 w-4 text-[#D47A00]" />
          <span className="section-label text-[#D47A00]">Mombasa Road · A109</span>
        </div>
        <a
          href={MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-[#1B5E20] hover:underline"
        >
          Maps <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {data.noKey ? (
        <div>
          <p className="text-sm text-[#6B5D45]">
            Athi River → Nairobi CBD · ~{data.distanceKm} km
          </p>
          <p className="text-xs text-[#6B5D45] mt-1">
            Typical journey: <strong className="text-[#212121]">{data.normalMins} min</strong> off-peak.
            {" "}Tap Maps for live traffic.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-sm font-bold ${cfg.bg} ${cfg.color}`}>
            {cfg.emoji} {cfg.label}
          </div>
          <div>
            <span className="text-2xl font-black text-[#212121]">{data.durationMins}</span>
            <span className="text-sm text-[#6B5D45] ml-1">min</span>
            {data.durationMins > data.normalMins && (
              <span className="text-xs text-[#B71C1C] ml-1.5">
                +{data.durationMins - data.normalMins} min delay
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-[#D4C9A8] mt-2">
        Athi River → Nairobi CBD · {data.distanceKm} km
      </p>
    </div>
  );
}
