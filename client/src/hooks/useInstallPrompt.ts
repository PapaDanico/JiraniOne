import { useEffect, useState } from "react";

// Chrome/Edge/Android fire `beforeinstallprompt` and let a page defer +
// re-trigger it later — but only ONCE per page load, and only if the page
// calls preventDefault() in time. Capturing it here (mounted once at the
// app root) means any component can offer an "Install" action instead of
// relying on the browser's own address-bar icon, which most users never
// notice. iOS Safari never fires this event (no A2HS API) — canInstall
// stays false there, which is an accepted gap for now.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "jiranihub-install-dismissed-at";
const DISMISS_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(
    () => window.matchMedia?.("(display-mode: standalone)").matches ?? false,
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismissedRecently = (() => {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  })();

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferred(null);
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDeferred(null);
  };

  return {
    canInstall: !!deferred && !installed && !dismissedRecently,
    promptInstall,
    dismiss,
  };
}
