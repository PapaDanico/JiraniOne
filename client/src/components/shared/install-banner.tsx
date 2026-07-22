import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { BRAND_NAME } from "@shared/brand";

// Slim, dismissible banner shown once Chrome/Edge/Android signal the app
// is installable. Sits above the page content rather than the TopBar
// itself, so it never competes with primary navigation.
export function InstallBanner() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div className="bg-brand-gold/15 border-b border-brand-gold/30">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <Download className="h-4 w-4 text-brand-green shrink-0" />
        <p className="flex-1 text-xs sm:text-sm font-medium text-tribal-charcoal">
          Install {BRAND_NAME} for quicker access and offline support.
        </p>
        <button
          onClick={promptInstall}
          className="text-xs sm:text-sm font-bold text-brand-green hover:underline shrink-0 min-h-[32px] px-1"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-tribal-earth hover:text-tribal-charcoal shrink-0 min-h-[32px] min-w-[32px] flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
