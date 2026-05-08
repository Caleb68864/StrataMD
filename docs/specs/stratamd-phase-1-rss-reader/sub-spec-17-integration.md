---
sub_spec_id: SS-17
phase: run
depends_on: ['SS-01', 'SS-02', 'SS-03', 'SS-04', 'SS-05', 'SS-06', 'SS-07', 'SS-08', 'SS-09', 'SS-10', 'SS-11', 'SS-12', 'SS-13', 'SS-14', 'SS-15', 'SS-16']
dispatch: factory
title: "Integration & End-to-End Wiring"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 10
---

# SS-17 — Integration & End-to-End Wiring

## Summary

The factory's "construction site." Wire every service into `Container.build()`, register every Phase 1 command, mount the ribbon icon with the unread badge, and verify the full end-to-end user flow against a 100-feed test vault.

## Implementation Steps (TDD)

1. **Write failing integration test** in `__tests__/integration/end-to-end.test.ts`: boots a mocked plugin in a synthetic vault, imports a 5-feed OPML, navigates items via simulated keyboard, opens an article preview, opens a YouTube preview, saves both as notes, asserts files exist with correct frontmatter.
2. **Implement `Container.build.ts`** instantiating services in dependency order: Logger → StateService → CacheService → store → adapters → DiscoveryService → Scheduler → ArticlePreviewService → NoteService → OPMLService → Notifications.
3. **Implement `main.commands.ts`** registering the 9 Phase 1 commands.
4. **Implement `main.ribbon.ts`** adding the ribbon icon with reactive unread-count badge bound to `selectGlobalUnreadCount`.
5. **Implement `main.ts` `onload`** in correct order: `Container.build()` → `StateService.load()` → `CacheService.open()` → `store.hydrate()` → `registerView` → `registerCommands` → `addRibbonIcon` → `addSettingTab` → `Scheduler.start()` after `idleDelayMs`.
6. **Implement `main.ts` `onunload`**: `Scheduler.stop()` → `StateService.flush()` → `CacheService.close()`.
7. **Run integration test — passes.**
8. **Write failing flush-on-unload test:** toggle read on item, immediately call `onunload`, re-load state, assert `readIds` contains the item.
9. **Verify flush wiring works as expected.**
10. **Manual smoke test in real Obsidian:**
    - Open dashboard via ribbon and command palette.
    - Add one feed of each type via Add Feed and Ingest URL autodetect.
    - Import an OPML file with 5 feeds.
    - Navigate 30 items via keyboard only.
    - Open three article previews (rich, paywall, empty).
    - Open three YouTube embeds; play one inline.
    - Save one of each as a note; open Bases and verify columns populate.
    - Force-quit Obsidian; relaunch; verify read/saved/starred state persisted.
    - Subscribe to 100 feeds via OPML; verify smooth scrolling and search responsiveness.
    - Switch dark theme → light theme; both render cleanly.
11. **Verify bundle size:** `npm run build && npm run check-bundle` passes.
12. **Verify lazy chunks:** esbuild metafile shows `@mozilla/readability` and `linkedom` in separate chunks; `MockAdapter` absent from `main.js`.
13. **Write `docs/ss17-integration-evidence.md`** containing: end-to-end test output, bundle-size report, screenshots of light + dark dashboard.
14. **Commit.** Suggested: `feat(ss-17): end-to-end wiring + integration evidence`.

## Interface Contracts

**Consumes:** every prior sub-spec's exports — see `contracts.json`.

**Provides:** the production call site. There are no downstream consumers within Phase 1.

## Verification Commands

```bash
npm test -- integration
npm run lint && npm run typecheck && npm run build && npm run check-bundle
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| Container.build wires every service | [STRUCTURAL] | `for s in Logger StateService CacheService Scheduler DiscoveryService ArticlePreviewService NoteService OPMLService Notifications; do grep -q "$s" src/services/Container.build.ts \|\| (echo "FAIL: $s not wired in Container" && exit 1); done` |
| All 9 Phase 1 commands registered | [STRUCTURAL] | `for c in 'Open Dashboard' 'Add Feed' 'Ingest URL' 'Import OPML' 'Refresh All' 'Refresh Selected' 'Search' 'Toggle Compact' 'Mark All Read'; do grep -q "$c" src/main.commands.ts \|\| (echo "FAIL: command '$c' missing" && exit 1); done` |
| Ribbon icon registered with badge | [STRUCTURAL] | `grep -q "addRibbonIcon\|ribbon" src/main.ribbon.ts && grep -q "selectGlobalUnreadCount" src/main.ribbon.ts \|\| (echo "FAIL: ribbon badge wiring" && exit 1)` |
| onunload flushes state | [STRUCTURAL] | `grep -q "StateService.*flush\|stateService.flush" src/main.ts \|\| (echo "FAIL: flush on unload missing" && exit 1)` |
| Integration evidence written | [STRUCTURAL] | `test -f docs/ss17-integration-evidence.md \|\| (echo "FAIL: evidence file missing" && exit 1)` |
| Integration test passes | [MECHANICAL] | `npm test -- integration \|\| (echo "FAIL: integration test" && exit 1)` |
| Bundle size budget met | [MECHANICAL] | `npm run build >/dev/null 2>&1 && node scripts/check-bundle-size.mjs main.js \|\| (echo "FAIL: bundle exceeds budget" && exit 1)` |
| MockAdapter absent from prod bundle | [MECHANICAL] | `[ $(grep -c "mockFeeds\|MockAdapter" main.js) -eq 0 ] \|\| (echo "FAIL: MockAdapter in prod bundle" && exit 1)` |
| Readability lazy-chunked | [MECHANICAL] | `[ $(grep -c "@mozilla/readability\|Readability" main.js) -le 1 ] \|\| (echo "FAIL: Readability in main bundle" && exit 1)` |
