---
sub_spec_id: SS-11
phase: run
depends_on: ['SS-04', 'SS-08']
dispatch: factory
title: "OPML Import Service"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 7
---

# SS-11 — OPML Import Service

## Summary

Imports OPML 1.0/2.0 subscription lists. Deduplicates by URL, preserves OPML category structure, runs initial staggered refresh through the scheduler. Export deferred to Phase 2 (Open Question #11).

## Implementation Steps (TDD)

1. **Write failing test:** `OPMLService.importFromString(opml)` against `sample-opml-2.0.xml` (5 unique feeds) returns `{added: [5 sources], duplicates: [], errors: []}`.
2. **Implement `parseOpml.ts`** using `fast-xml-parser` (already a dep). Walk `<outline>` tree; collect `xmlUrl` attribute + ancestor `<outline text="...">` for category.
3. **Run import test — passes.**
4. **Write failing test:** import same OPML twice → second pass yields `duplicates.length === 5` (no new feeds).
5. **Implement dedup** by checking `feedsById` for URL match before adding.
6. **Write failing test:** `sample-opml-with-categories.xml` (nested outlines) → categories preserved on `FeedSource.category`.
7. **Implement category extraction** (single-level for Phase 1; deeper nesting joined with `/`).
8. **Write failing test:** 50 feeds → scheduler dispatches at most 4 in-flight. Mock scheduler via spy.
9. **Wire `FeedFetchScheduler.refreshNow` per imported feed** — scheduler's stagger logic handles concurrency.
10. **Write failing test:** malformed `<outline>` (missing `xmlUrl`) → recorded in `errors[]`; rest of import succeeds.
11. **Implement per-row try/catch** + error collection.
12. **Add command palette entry** "Import OPML" (registration lands in SS-17 but the service exposes `importFromFile(file: TFile)` helper for the command).
13. **Commit.** Suggested: `feat(ss-11): OPML 1.0/2.0 import with dedup, categories, staggered refresh`.

## Interface Contracts

**Provides:**
- `OPMLService.importFromString(xml, options) → Promise<ImportSummary>` (Owner: SS-11). Consumer: SS-16 (settings tab "Import OPML" button), SS-17 (command palette).
- `ImportSummary` type (Owner: SS-11). Consumer: SS-12 (post-import toast).

**Requires:** SS-04 (`addFeed` action), SS-08 (`refreshNow`), SS-02 (`FeedSource`).

## Verification Commands

```bash
npm test -- OPMLService
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| OPMLService exists | [STRUCTURAL] | `test -f src/services/OPMLService.ts \|\| (echo "FAIL: OPMLService missing" && exit 1)` |
| Sample OPML fixtures exist | [STRUCTURAL] | `for f in sample-opml-1.0.xml sample-opml-2.0.xml sample-opml-with-categories.xml; do test -f "src/services/opml/__fixtures__/$f" \|\| (echo "FAIL: fixture $f missing" && exit 1); done` |
| Uses fast-xml-parser (existing dep) | [STRUCTURAL] | `grep -q "fast-xml-parser" src/services/opml/parseOpml.ts \|\| (echo "FAIL: parser missing" && exit 1)` |
| ImportSummary type exposed | [STRUCTURAL] | `grep -q "ImportSummary" src/services/OPMLService.ts \|\| (echo "FAIL: ImportSummary missing" && exit 1)` |
| OPML tests pass | [MECHANICAL] | `npm test -- OPMLService \|\| (echo "FAIL: opml tests" && exit 1)` |
