import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

// Web Push opt-in state machine for the notifications page toggle.
//
// "unsupported" — browser has no Push API (or no SW), or the server has no
//                 VAPID key configured: hide the toggle entirely.
// "denied"      — user blocked notifications at the browser level; we can't
//                 re-prompt, only explain how to unblock.
// "subscribed" / "unsubscribed" — the toggle's two live states.
type PushStatus = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const { data } = await api.get<{ key: string | null }>("/api/push/vapid-public-key");
        if (cancelled) return;
        if (!data.key) {
          setStatus("unsupported");
          return;
        }
        if (Notification.permission === "denied") {
          setStatus("denied");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setStatus(sub ? "subscribed" : "unsubscribed");
      } catch {
        if (!cancelled) setStatus("unsupported");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const subscribe = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "unsubscribed");
        return false;
      }
      const { data } = await api.get<{ key: string | null }>("/api/push/vapid-public-key");
      if (!data.key) { setStatus("unsupported"); return false; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.key) as BufferSource,
      });
      const json = sub.toJSON();
      await api.post("/api/push/subscribe", {
        endpoint: sub.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
      });
      setStatus("subscribed");
      return true;
    } catch {
      setStatus("unsubscribed");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        // Tell the server first — if the device-side unsubscribe succeeds
        // but the API call fails, the server row is dead weight the 404/410
        // pruner cleans up on next send, which is fine; the reverse order
        // would keep pushing to a device that no longer listens.
        try { await api.post("/api/push/unsubscribe", { endpoint: sub.endpoint }); } catch { /* pruned later */ }
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, busy, subscribe, unsubscribe };
}
