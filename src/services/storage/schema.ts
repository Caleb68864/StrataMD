export const SCHEMA_VERSION = 1;

export const STORE_DEFS = [
  { name: "items", keyPath: "id" },
  { name: "itemsByFeed", keyPath: "id" },
  { name: "articles", keyPath: "itemId" },
] as const;
