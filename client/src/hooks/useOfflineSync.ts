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
          // ApiError means the server was reached and definitively rejected
          // the draft (e.g. stale validation) — retrying it forever would
          // just leave a dead entry cluttering the pending-sync count, so
          // drop it. Anything else means the request never landed (still
          // offline/flaky connection) — leave the draft to retry next time.
          if (err instanceof ApiError) {
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
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { pendingCount, syncing, flush };
}
