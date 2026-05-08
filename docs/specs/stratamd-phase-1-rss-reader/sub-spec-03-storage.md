---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-02']
dispatch: factory
title: "Storage Tier — StateService and CacheService"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 3
---

# SS-03 — Storage Tier (StateService + CacheService)

## Summary

`StateService` wraps `data.json` with debounced 250ms saves and synchronous flush on unload. `CacheService` wraps IndexedDB with versioned schema, migrations, and pruning. Together they implement the two-tier "hot small + cold large" storage strategy from the design.

## Implementation Steps (TDD)

1. **Write failing test** for `StateService.save` debouncing: `__tests__/StateService.test.ts` calls `save({readIds: new Set(['a'])})` 5 times within 100ms and asserts the underlying `saveData` mock fires once after 250ms.
2. **Write failing test** for `flush()`: calls `save(...)` then `flush()` immediately and asserts `saveData` fires synchronously.
3. **Implement `StateService`** with internal debounce timer, JSON-with-Set serializer (Sets ↔ arrays), and `flush()` clearing the timer + writing immediately.
4. **Run StateService tests — pass.**
5. **Define IndexedDB schema** in `src/services/storage/schema.ts`: `SCHEMA_VERSION = 1`, object stores `items` (keyPath: `[feedId, id]`), `extractedArticles` (keyPath: `itemId`), index `items_by_feedId`, `items_by_published`.
6. **Write failing test** for `CacheService.putItems` + `getItemsByFeed`: insert 5 items, fetch by feed ID, assert all returned.
7. **Implement `CacheService`** using `idbWrapper.ts` (hand-rolled, ~80 lines, no `idb` dep — bundle size).
8. **Run CacheService tests — pass.**
9. **Write failing test** for `pruneOldItems`: insert 100 items spanning 60 days; prune with `olderThanDays: 30, retainSavedIds: Set(['item-5']), retainStarredIds: Set([])`; assert items in retain sets survive AND items younger than 30 days survive AND only old non-retained items are removed.
10. **Implement pruning logic.** Cursor-walk the `items_by_published` index; delete entries older than cutoff that are not in retain sets.
11. **Run prune tests — pass.**
12. **Wire `StateService.flush` to `plugin.onunload`** (placeholder in main.ts; actual `onunload` body lands in SS-17 but the registration helper exists here).
13. **Commit.** Suggested: `feat(ss-03): tiered storage with debounced data.json + IndexedDB cache`.

## Interface Contracts

**Provides:**
- `StateService.load() → Promise<PersistedState>` (Owner: SS-03). Consumer: SS-04 (on hydrate), SS-17 (boot).
- `StateService.save(patch)` debounced (Owner: SS-03). Consumer: SS-04 (every action that mutates persisted state).
- `StateService.flush()` synchronous (Owner: SS-03). Consumer: SS-17 (`onunload`).
- `CacheService` API (Owner: SS-03). Consumers: SS-08 (putItems), SS-09 (extractedArticles), SS-17 (boot/teardown).

**Requires:** SS-02 types.

## Verification Commands

```bash
npm test -- StateService CacheService
npm run typecheck
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| StateService exists with debounce | [STRUCTURAL] | `grep -q "save" src/services/StateService.ts && grep -q "250" src/services/StateService.ts \|\| (echo "FAIL: StateService debounce" && exit 1)` |
| StateService.flush is synchronous | [STRUCTURAL] | `grep -q "flush()" src/services/StateService.ts \|\| (echo "FAIL: flush method missing" && exit 1)` |
| CacheService schema versioned | [STRUCTURAL] | `grep -q "SCHEMA_VERSION" src/services/storage/schema.ts \|\| (echo "FAIL: schema version missing" && exit 1)` |
| CacheService has pruneOldItems | [STRUCTURAL] | `grep -q "pruneOldItems" src/services/CacheService.ts \|\| (echo "FAIL: prune method missing" && exit 1)` |
| Migrations file exists | [STRUCTURAL] | `test -f src/services/storage/migrations.ts \|\| (echo "FAIL: migrations.ts missing" && exit 1)` |
| StateService tests pass | [MECHANICAL] | `npm test -- StateService \|\| (echo "FAIL: StateService tests" && exit 1)` |
| CacheService tests pass | [MECHANICAL] | `npm test -- CacheService \|\| (echo "FAIL: CacheService tests" && exit 1)` |
| No idb dep added | [STRUCTURAL] | `! grep -q '"idb":' package.json \|\| (echo "FAIL: idb dep added — should be hand-rolled" && exit 1)` |
