---
sub_spec_id: SS-02
phase: run
depends_on: []
dispatch: factory
title: "Performance Benchmark Harness (Vitest jsdom)"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 1
---

# SS-02 — Performance Benchmark Harness

## Summary

Vitest-based perf suite verifying jsdom-measurable proxies for Phase 1 AC #16. **jsdom has no real rendering loop** — these benchmarks measure React reconciliation + commit + jsdom DOM mutation cost, NOT paint cost. Real-FPS measurement is explicitly deferred to v0.2 Playwright. Each `.bench.ts` file's leading comment makes this honesty explicit.

## Implementation Steps (TDD)

1. **Add bench config.** `vitest.bench.config.ts` extends Phase 1's `vitest.config.ts` with `include: ['__tests__/perf/**/*.bench.ts']`, `pool: 'threads'` (deterministic), `testTimeout: 30000`.
2. **Add bench script.** `package.json` adds `"bench": "vitest --config vitest.bench.config.ts run"`. Re-run `npm run bench` → "no tests" exit 0 (vitest accepts empty).
3. **Write failing initial-render bench.** `__tests__/perf/initialRender.bench.ts` renders `<DashboardRoot/>` with 100 mock feeds; asserts elapsed `< 200ms` (`< 300ms` in CI). First run with no perf optimizations → fails (or sets the baseline).
4. **Implement mock-feeds fixture.** `__tests__/perf/fixtures/mock-feeds.ts` exports `generateMockFeeds(count: number, seed: number = 42): FeedSource[]` and `generateMockItems(count: number, seed: number = 42): FeedItem[]`. Deterministic seeded RNG (e.g., mulberry32).
5. **Run initial-render bench until passing.** Optimize per Phase 1 SS-04 selectors / per-id subscriptions if regressions.
6. **Write rerender bench.** `__tests__/perf/rerender.bench.ts` mounts a 1000-item virtualized list, then triggers 60 sequential read-state toggles on different items. Measures per-item re-render time (mean + p99). Asserts mean `< 5ms` / p99 `< 15ms` (1.5x in CI).
7. **Write search bench.** `__tests__/perf/search.bench.ts` indexes 5000 items, queries (case-insensitive substring), asserts `< 150ms` (`< 225ms` CI). Uses Phase 1 SS-15's `SearchIndex`.
8. **Add comment headers explaining what is/is-not measured.** Each `.bench.ts` opens with:
   ```ts
   /**
    * @bench what-IS-measured: React reconciliation + commit + jsdom DOM mutation cost.
    * @bench what-is-NOT-measured: real-paint cost, repaint cost, browser layout cost.
    *   For real performance verification, see v0.2 Playwright bench.
    */
   ```
9. **Add harness check.** `harness/checks/perf.sh` invokes `npm run bench` and propagates exit code. Add `chmod +x harness/checks/perf.sh`.
10. **Run all benches.** `npm run bench` exits 0; bench output saved as `bench-report.json` (Vitest reporter handles this).
11. **Commit.** Suggested: `feat(ss-02): jsdom perf bench harness for AC #16 proxies`.

## Interface Contracts

No cross-sub-spec contracts. The bench files reference Phase 1's `<DashboardRoot>`, `SearchIndex`, store, and types — all from Phase 1, not from Phase 1.5 sub-specs.

## Verification Commands

```bash
npm run bench
bash harness/checks/perf.sh
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| vitest.bench.config.ts exists | [STRUCTURAL] | `test -f vitest.bench.config.ts \|\| (echo "FAIL: bench config missing" && exit 1)` |
| package.json has bench script | [STRUCTURAL] | `grep -q '"bench":' package.json \|\| (echo "FAIL: npm run bench script missing" && exit 1)` |
| 3 bench files present | [STRUCTURAL] | `for f in initialRender rerender search; do test -f "__tests__/perf/$f.bench.ts" \|\| (echo "FAIL: $f.bench.ts missing" && exit 1); done` |
| Mock-feeds fixture present | [STRUCTURAL] | `test -f __tests__/perf/fixtures/mock-feeds.ts \|\| (echo "FAIL: fixtures missing" && exit 1)` |
| Each bench has @bench comment header | [STRUCTURAL] | `for f in __tests__/perf/*.bench.ts; do grep -q "@bench what-IS-measured" "$f" \|\| (echo "FAIL: $f missing measurement-honesty header" && exit 1); done` |
| harness/checks/perf.sh present | [STRUCTURAL] | `test -f harness/checks/perf.sh && test -x harness/checks/perf.sh \|\| (echo "FAIL: perf check script missing or not executable" && exit 1)` |
| Bench passes thresholds | [MECHANICAL] | `npm run bench \|\| (echo "FAIL: perf bench thresholds exceeded" && exit 1)` |
