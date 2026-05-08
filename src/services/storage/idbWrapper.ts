import { SCHEMA_VERSION } from "./schema";
import { runMigrations } from "./migrations";

export class IndexedDBUnavailableError extends Error {
  constructor() {
    super("IndexedDB is unavailable in this environment.");
    this.name = "IndexedDBUnavailableError";
  }
}

export async function openDatabase(name: string): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") throw new IndexedDBUnavailableError();
  return await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(name, SCHEMA_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      runMigrations(db, req.transaction?.db.version ?? 0);
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

export async function tx<T>(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => void): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    run(store);
    t.oncomplete = () => resolve(undefined as T);
    t.onerror = () => reject(t.error);
  });
}
