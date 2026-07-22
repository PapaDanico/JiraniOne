import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import {
  MAINTENANCE_DRAFTS_STORE, getDrafts, deleteDraft, type MaintenanceDraft,
} from "@/lib/offlineDb";

// Flushes maintenance-ticket drafts saved to IndexedDB (by ticket-form.tsx,
// when a submission fails while offline) back to the server once the
// device regains connectivity. Runs on mount and on every "online" event;
// exposes pendingCount so the UI can show a "N drafts waiting to sync" banner.
export function useOfflineSync() {
  const qc = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    try {
      const drafts = await getDrafts<MaintenanceDraft>(MAINTENANCE_DRAFTS_STORE);
      setPendingCount(drafts.length);
    } catch {
      // IndexedDB unavailable (private browsing, old browser) — treat as
      // no drafts rather than crash the app.
      setPendingCount(0);
    }
  }, []);

  const flush = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const drafts = await getDrafts<MaintenanceDraft>(MAINTENANCE_DRAFTS_STORE);
      for (const draft of drafts) {
        try {
          const formData = new FormData();
          formData.append("title", draft.title);
          formData.append("description", draft.description);
          formData.append("category", draft.category);
          formData.append("priority", draft.priority);
          // Lets the server recognize a retry of a submission that already
          // landed (request timed out but was actually processed) instead
          // of creating a duplicate ticket.
          formData.append("clientDraftId", draft.id);
          draft.photos.forEach((f) => formData.append("photos", f));
          await api.upload("/api/maintenance", formData);
          await deleteDraft(MAINTENANCE_DRAFTS_STORE, draft.id);
        } catch (err) {
          // Only drop the draft on a DEFINITIVE rejection — a 4xx that
          // means the server understood and refused it (validation, too
          // large, forbidden). Everything else is retryable and the draft
          // must survive: network errors/timeouts (not ApiError at all),
          // 401 (session expired while offline — resident logs in, next
          // flush succeeds), 408/429 (transient), and all 5xx (Netlify
          // cold-start flake, gateway errors). The previous version
          // deleted on ANY ApiError, so one 502 on reconnect silently
          // destroyed the resident's report forever.
          if (
            err instanceof ApiError &&
            err.status >= 400 && err.status < 500 &&
            err.status !== 401 && err.status !== 408 && err.status !== 429
          ) {
            await deleteDraft(MAINTENANCE_DRAFTS_STORE, draft.id);
          }
        }
      }
      qc.invalidateQueries({ queryKey: ["maintenance", "my"] });
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [qc, refreshCount]);

  useEffect(() => {
    refreshCount();
    flush();
    window.addEventListener("online", flush);
    // Fired by ticket-form.tsx after saving a draft, so the "N reports
    // saved offline" banner appears immediately instead of only after the
    // next mount/flush — without this, an offline resident who closed the
    // form saw no pending banner and no ticket, inviting a duplicate
    // re-report.
    window.addEventListener("offline-drafts-changed", refreshCount);
    return () => {
      window.removeEventListener("online", flush);
      window.removeEventListener("offline-drafts-changed", refreshCount);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendingCount, syncing, flush };
}
