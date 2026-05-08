import { SCHEMA_VERSION, STORE_DEFS } from "./schema";

export interface Migration {
  from: number;
  to: number;
  run: (db: IDBDatabase) => void;
}

export const migrations: Migration[] = [
  {
    from: 0,
    to: 1,
    run: (db) => {
      for (const def of STORE_DEFS) {
        if (!db.objectStoreNames.contains(def.name)) {
          db.createObjectStore(def.name, { keyPath: def.keyPath });
        }
      }
    },
  },
];

export function runMigrations(db: IDBDatabase, oldVersion: number): void {
  let current = oldVersion;
  while (current < SCHEMA_VERSION) {
    const migration = migrations.find((m) => m.from === current);
    if (!migration) break;
    migration.run(db);
    current = migration.to;
  }
}
