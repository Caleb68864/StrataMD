---
type: phase-spec-index
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
date: 2026-05-08
sub_specs: 6
---

# StrataMD Phase 1.5 — Phase Specs

Refined from [2026-05-08-stratamd-phase-1-5-quality-layer.md](../2026-05-08-stratamd-phase-1-5-quality-layer.md).

## Wave Plan

All 5 base sub-specs are independent (no inter-track dependencies within Phase 1.5). Phase 1.5 depends only on Phase 1 having shipped. Tracks D and H modify Phase 1 source files; Tracks E, F, G live outside `src/`.

| Wave | Sub-Specs | Notes |
|------|-----------|-------|
| 1 | SS-01, SS-02, SS-03, SS-04, SS-05 | All independent. Run in parallel. |
| 2 | SS-06 | Auto-generated integration verification — runs after all 5 tracks complete. |

## Sub-Specs

| Sub-Spec | Title | Dependencies | Phase Spec |
|----------|-------|--------------|------------|
| SS-01 | A11y Baseline + axe-core CI | Phase 1 (external) | [sub-spec-01-a11y-baseline.md](sub-spec-01-a11y-baseline.md) |
| SS-02 | Performance Benchmark Harness (Vitest jsdom) | Phase 1 (external) | [sub-spec-02-perf-bench.md](sub-spec-02-perf-bench.md) |
| SS-03 | End-User Documentation | none | [sub-spec-03-user-docs.md](sub-spec-03-user-docs.md) |
| SS-04 | Community Files + CI Workflow + Release-Readiness | none | [sub-spec-04-community-ci.md](sub-spec-04-community-ci.md) |
| SS-05 | Diagnostics Service + Logger Ring Buffer + Build Info | Phase 1 (external) | [sub-spec-05-diagnostics.md](sub-spec-05-diagnostics.md) |
| SS-06 | Phase 1.5 Integration Verification (auto-generated) | SS-01, SS-02, SS-03, SS-04, SS-05 | [sub-spec-06-integration.md](sub-spec-06-integration.md) |

## Requirement Traceability Matrix

| Requirement | Covered By |
|-------------|-----------|
| R1: axe-core CI gate (9 states, ≥moderate floor) | SS-01 |
| R2: Vitest perf bench gates merge on regression | SS-02 |
| R3: 6 user-guide markdown files (≥40 lines each) | SS-03 |
| R4: Community files + CI workflow + release-readiness | SS-04 |
| R5: CI runs 7 gates with concurrency-cancel + 10min timeouts | SS-04 |
| R6: Settings "Support" section copies PII-scrubbed Diagnostics JSON | SS-05 |
| R7: `Logger.getRecentEntries(n)` returns FIFO ring buffer | SS-05 |
| R8: `__BUILD_INFO__` esbuild `--define` injection | SS-05 |
| R9: `axe-core` + `@axe-core/react` versions pinned exactly | SS-01 |
| R10: Decision-log enforcement + Phase 1 SS-17 non-regression | SS-06 |

No orphaned requirements. No split-ownership ambiguity.

## Cross-Spec Dependency Audit

No cross-sub-spec code dependencies within Phase 1.5. Each track is independent. SS-06 (auto-generated integration) consumes the *existence* of all 5 tracks but not their code APIs.

`contracts.json` is intentionally not emitted — no inter-sub-spec code contracts exist.

## Decomposition Balance Check

Each sub-spec touches at most 1–2 cross-cutting concerns. None are overloaded.

## Construction-Site Check

SS-04 (CI workflow) and SS-05 (Settings tab integration, esbuild config) reference concrete call sites:
- SS-04 wires CI gates into `.github/workflows/ci.yml` — concrete file.
- SS-05 mounts `<DiagnosticsSection>` into `src/settings/SettingsTab.ts` — concrete production call site.
- SS-05 modifies `esbuild.config.mjs` to inject `__BUILD_INFO__` — concrete build-time call site.

No decomposition deferrals. All construction sites named.

## Execution

Run `/forge-run docs/specs/2026-05-08-stratamd-phase-1-5-quality-layer.md` to execute all phase specs.
Run `/forge-run docs/specs/2026-05-08-stratamd-phase-1-5-quality-layer.md --sub N` to execute a single sub-spec.
