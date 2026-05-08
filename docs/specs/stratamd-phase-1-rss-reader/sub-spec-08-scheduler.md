---
sub_spec_id: SS-08
phase: run
depends_on: ['SS-04', 'SS-07']
dispatch: factory
title: "Feed Fetch Scheduler"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 6
---

# SS-08 — Feed Fetch Scheduler

## Summary

Background loop driving feed refreshes. Cap concurrency at 4, stagger requests, respect per-feed intervals, exponential backoff on failure (cap 1h), dedupe in-flight by feed ID, preserve last-good cache, emit `RefreshEvent` for the UI. Never holds a lock the UI needs.

## Implementation Steps (TDD)

1. **Write failing test:** with 10 feeds due simultaneously, scheduler dispatches at most 4 concurrent fetches; remaining 6 queue and dispatch as slots free. Verified by mocking the adapter chain and counting concurrent in-flight calls.
2. **Implement `FeedFetchScheduler`** with `start/stop`, `tick()` private method, internal `inFlight: Set<feedId>`, queue, concurrency cap.
3. **Run concurrency test — passes.**
4. **Write failing test:** feed whose `lastSuccess + intervalMin > now` is skipped this tick.
5. **Implement due-check.**
6. **Write failing test:** feed failing 3 times → next-due time pushed by exponential backoff capped at 1h. Mock `Date.now` for deterministic timing.
7. **Implement `backoff.ts`** as pure function `nextDelayMs(consecutiveFailures: number): number` returning `min(60_000 * 2 ** failures, 3_600_000)`.
8. **Write failing test:** successful refresh resets `consecutiveFailures` to 0.
9. **Implement reset on success.**
10. **Write failing test:** refresh that throws preserves last-good cache (no `CacheService.putItems` call).
11. **Implement try/catch — only call `putItems` after successful parse.**
12. **Write failing test:** request taking >30s aborts via `AbortController` and counts as failure.
13. **Implement timeout via `AbortController` passed into adapter.**
14. **Write failing test:** dedup — calling `refreshNow(feedId)` while a refresh for that feedId is already in-flight does not start a second one.
15. **Implement `dedup.ts`** helper, integrate with `inFlight` set.
16. **Wire `RefreshEvent` emitter** — typed event bus that the store subscribes to via `applyDelta`.
17. **Test idleDelayMs** — `start()` does not tick for `idleDelayMs` (default 3000). Mock timers.
18. **Commit.** Suggested: `feat(ss-08): scheduler with concurrency cap, backoff, dedup, last-good cache`.

## Interface Contracts

**Provides:**
- `FeedFetchScheduler.start/stop/refreshNow` (Owner: SS-08). Consumer: SS-11 (OPML triggers), SS-16 (settings refresh button), SS-17 (lifecycle).
- `RefreshEvent` typed events (Owner: SS-08). Consumer: SS-04 (`applyDelta`), SS-16 (`useFeedRefresh`).

**Requires:** SS-04 (store dispatch via `applyDelta`), SS-07 (adapter chain via DiscoveryService for resolving on first fetch), SS-03 (`CacheService.putItems`).

## Verification Commands

```bash
npm test -- Scheduler backoff
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| Scheduler exists | [STRUCTURAL] | `test -f src/services/FeedFetchScheduler.ts \|\| (echo "FAIL: scheduler missing" && exit 1)` |
| Default concurrency cap is 4 | [STRUCTURAL] | `grep -q "concurrency.*=.*4\|concurrencyCap.*=.*4\|maxConcurrent.*=.*4" src/services/FeedFetchScheduler.ts \|\| (echo "FAIL: concurrency cap default" && exit 1)` |
| Backoff caps at 1h | [STRUCTURAL] | `grep -q "3_600_000\|3600000" src/services/scheduler/backoff.ts \|\| (echo "FAIL: backoff cap" && exit 1)` |
| 30s request timeout | [STRUCTURAL] | `grep -q "30_000\|30000" src/services/FeedFetchScheduler.ts \|\| (echo "FAIL: 30s timeout" && exit 1)` |
| RefreshEvent type defined | [STRUCTURAL] | `test -f src/services/scheduler/RefreshEvent.ts \|\| (echo "FAIL: RefreshEvent missing" && exit 1)` |
| Scheduler tests pass | [MECHANICAL] | `npm test -- Scheduler \|\| (echo "FAIL: scheduler tests" && exit 1)` |
| Backoff tests pass | [MECHANICAL] | `npm test -- backoff \|\| (echo "FAIL: backoff tests" && exit 1)` |
