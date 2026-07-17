// Minimal IndexedDB wrapper for offline-first form drafts (no dependency —
// the object store here only ever needs put/getAll/delete). Used when a
// submission fails because the device is offline, so the draft (including
// any attached photo Files, which IndexedDB can store directly as Blobs)
// survives a reload and can be retried once connectivity returns.

const DB_NAME = "jiranihub-offline";
const DB_VERSION = 1;
export const MAINTENANCE_DRAFTS_STORE = "maintenance-drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(MAINTENANCE_DRAFTS_STORE)) {
        db.createObjectStore(MAINTENANCE_DRAFTS_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface MaintenanceDraft {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  photos: File[];
  createdAt: number;
}

export async function saveDraft(store: string, draft: MaintenanceDraft): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getDrafts<T>(store: string): Promise<T[]> {
  const db = await openDb();
  const result = await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

export async function deleteDraft(store: string, id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
