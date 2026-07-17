import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

// Replaces the old WebSocket push (removed as part of moving off Render —
// Netlify Functions have no persistent process to hold a WS connection).
// Mirrors the same query-key invalidations the WS handler used to trigger,
// just on a timer instead of a server push. invalidateQueries only
// actually refetches keys with an active observer (a mounted useQuery), so
// polling all of these unconditionally is cheap when most aren't mounted.
//
// `emergency` gets its own shorter interval since it has no other
// notification fallback today (no SMS on alert creation) — the rest poll
// less aggressively to stay mobile-data-conscious (CLAUDE.md).
const STANDARD_INTERVAL_MS = 15_000;
const EMERGENCY_INTERVAL_MS = 5_000;

// Originally only these 4 keys — extended to cover every other page's data
// so switching tabs (or leaving one open) shows other residents'/admin's
// changes without a manual reload. Deliberately excludes:
//   - ["weather"] / ["traffic"]: external-API-backed and already
//     staleTime-controlled (10min/5min) — event-driven polling doesn't
//     apply, the data itself only changes that often.
//   - ["auth", "me"] / ["estates-public"]: session identity and the
//     public registration estate list, neither changes from other users'
//     actions in a way that matters to re-poll.
// invalidateQueries only actually refetches a key if it has an active
// observer (a mounted useQuery) — so invalidating this whole list on every
// tick is cheap; only whatever page is currently on screen re-fetches.
const STANDARD_KEYS = [
  ["visitors"],
  ["maintenance"],
  ["announcements"],
  ["notifications"],
  ["payments"],
  ["campaigns"],
  ["facilities"],
  ["bookings"],
  ["services"],
  ["polls"],
  ["carpool"],
  ["harambee"],
  ["chama"],
  ["classifieds"],
  ["events"],
  ["parcels"],
  ["analytics"],
  ["estate-users"],
  ["documents"],
];
const EMERGENCY_KEY = ["emergency"];

export function usePolling(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const invalidateStandard = () => {
      for (const key of STANDARD_KEYS) qc.invalidateQueries({ queryKey: key });
    };
    const invalidateEmergency = () => qc.invalidateQueries({ queryKey: EMERGENCY_KEY });
    const invalidateAll = () => {
      invalidateStandard();
      invalidateEmergency();
    };

    let standardTimer: ReturnType<typeof setInterval> | undefined;
    let emergencyTimer: ReturnType<typeof setInterval> | undefined;

    const start = () => {
      standardTimer = setInterval(invalidateStandard, STANDARD_INTERVAL_MS);
      emergencyTimer = setInterval(invalidateEmergency, EMERGENCY_INTERVAL_MS);
    };
    const stop = () => {
      clearInterval(standardTimer);
      clearInterval(emergencyTimer);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Avoid a stale-data flash while waiting for the next tick.
        invalidateAll();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, qc]);
}
