---
date: 2026-05-08
title: "StrataMD Phase 1.5 — Quality Layer"
client: personal
project: StrataMD
repo: StrataMD
author: Caleb Bennett
status: ready
quality_score: 34
quality_dimensions:
  outcome: 5
  scope: 5
  decision_guidance: 5
  edges: 4
  acceptance_criteria: 5
  decomposition: 5
  purpose_alignment: 5
tags:
  - spec
  - stratamd
  - phase-1-5
  - quality-layer
---

# StrataMD Phase 1.5 — Quality Layer

## Meta
- **Client:** personal
- **Project:** StrataMD
- **Repo:** StrataMD (`https://github.com/Caleb68864/StrataMD`)
- **Date:** 2026-05-08
- **Author:** Caleb Bennett
- **Source design:** `docs/plans/2026-05-08-phase-1-5-quality-layer-design.md` (status: evaluated)
- **Phase 1 spec:** `docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md`
- **Quality score:** 34/35 (Outcome 5 / Scope 5 / Decision Guidance 5 / Edge Coverage 4 / Acceptance Criteria 5 / Decomposition 5 / Purpose Alignment 5)
- **Auto-chain:** none — outer brainstorm prep chain handles `/forge-prep` and `/forge-red-team` (master only) next.

## Outcome

A focused, additive quality layer that lands alongside or just after Phase 1 ships. When complete: axe-core CI gate is green across 9 representative dashboard + popover states; a Vitest perf bench gates merge on jsdom-measurable proxies for AC #16 (with explicit "what is / is not measured" caveats); `docs/user-guide/` contains 6 concrete end-user docs (≥40 lines each); `.github/` has CONTRIBUTING/SECURITY/CHANGELOG/3 issue templates/PR template/dependabot/CI workflow with 7 gates and concurrency-cancel + 10 min timeouts; the Settings tab "Support" section copies a PII-scrubbed Diagnostics JSON to clipboard; and every Phase 1 acceptance criterion continues to pass — Phase 1.5 is non-regressive.

## Intent

**Trade-off hierarchy** (highest to lowest priority when valid approaches conflict):
1. **Non-regression of Phase 1.** Phase 1.5 must not break any Phase 1 AC.
2. **Ship-readiness over polish completeness.** Premium pieces (docs site, voice nav, motion/contrast a11y, Playwright bench, in-app log viewer) are explicitly v0.2.
3. **Bundle weight discipline.** No new runtime dependencies beyond Phase 1's canonical set. Dev dependencies allowed (`@axe-core/react`, link-checker).
4. **Honesty about test fidelity.** jsdom benches are not real-paint measurements; this is documented in test comments and the design, not papered over.
5. **Decision-log compliance.** Every Phase 1.5 commit appends a `docs/decisions.md` entry.

**Preferences (soft guidelines):**
- Prefer `lychee --cache` over `markdown-link-check` for CI link-checking (cache reduces rate-limit hits).
- Prefer copy-in shadcn primitives (e.g., Radix Dialog) over importing from a vendored library — keeps bundle small and explicit.
- Prefer pinning exact versions for testing/quality dev-deps that gate CI (`axe-core`, `@axe-core/react`).
- Prefer descriptive Vitest test names that double as documentation.
- Prefer one CI workflow file (`ci.yml`) over multiple — easier to maintain unless a job needs distinct triggers.

**Decision boundaries — escalate to human when:**
- A Phase 1 AC would regress to satisfy Phase 1.5 work.
- The bundle-size budget would be exceeded after Phase 1.5 changes.
- Real-FPS measurement is requested in v0.1 (must be deferred to v0.2 Playwright).
- A new runtime dep is needed beyond the canonical set + `@axe-core/react` + link-checker.
- The axe-core severity floor needs changing from `moderate`.
- CI runner OS choice needs changing from `ubuntu-latest`-only.
- A track scope-creeps into another track's territory (e.g., Track D wants to ship a log viewer — that's v0.2 Track H Premium).

**Decided (no further escalation):**
- 5 independent tracks → 5 sub-specs running in parallel + SS-06 integration in wave 2.
- axe-core severity floor for blocking: `moderate`.
- Bench threshold relaxation in CI: 1.5x baseline.
- Logger ring-buffer size: 200 entries, FIFO. Hardcoded in v0.1; configurable in v0.2.
- CI runner: `ubuntu-latest` only, Node 20 LTS only (no matrix in v0.1).
- Documentation distribution: in-repo markdown only; settings tab links to GitHub.
- Diagnostics output: clipboard-only, user-initiated, never auto-sent. Includes `_schemaVersion: 1` for forward compat. `gitSha` truncated to 7 chars.
- **CI ordering tolerance:** every CI job that consumes a sub-spec output (axe test files, bench files, cheat-sheet, `bindings.ts`) skips silently with PASS when its input file doesn't exist. Sub-specs may therefore land in any order without breaking CI.
- **PII scrubber regex set:** URL, Windows path, POSIX path, UNC path (`\\\\…`), email, IPv4. UNC pattern is required — matches `\\server\share\…` patterns.
- `installedSinceDays` source path: `app.vault.adapter.stat('.obsidian/plugins/stratamd/data.json')` (NOT a vault-root path).
- SS-06 dispatch: `manual` — opening a representative PR to trigger CI is a human action, not factory work.
- Local link-checking: CI uses `lycheeverse/lychee-action@v2`; local-only check via `npx lychee` is best-effort (lychee not added as a dev-dep). `markdown-link-check` is the dev-dep fallback if needed.

### Tiering (graceful-slip plan for Phase 1.5)

If implementation slips, ship in tiers:
- **Tier 1 — must ship with v0.1:** SS-01 (a11y baseline), SS-04 community files (CONTRIBUTING/SECURITY/CHANGELOG/issue-templates/PR-template), SS-05 (Diagnostics + Logger ring buffer + `__BUILD_INFO__`), SS-06 (non-regression).
- **Tier 2 — can slip to v0.1.x patch:** SS-02 (perf bench may ship with thresholds in advisory mode first), SS-03 (end-user docs may land incrementally with cheat sheet first), SS-04 CI workflow + release-readiness checklist (community files alone are sufficient for first ship).
- **Tier 3 — measured but not gating:** All v0.2 deferrals named in Out of Scope.

## Context

StrataMD's Phase 1 ships the working RSS reader. Phase 1 was evaluated, red-teamed, and patched (34/35); 17 phase specs are ready in `docs/specs/stratamd-phase-1-rss-reader/`. After Phase 1 lands, Phase 1.5 closes the audit-identified gaps that gate calling v0.1 a "real application": accessibility baseline, performance verification, end-user docs, repo health files, user-facing diagnostics.

Phase 1.5 is **purely additive** — every track layers on top of Phase 1 without re-opening any Phase 1 sub-spec. Tracks D and H modify existing Phase 1 source files (Logger, components, settings); tracks E, F, G live entirely outside `src/`.

**Architecture (5 tracks):**
- **Track D — A11y baseline:** ARIA helpers + axe-core CI test, modifies Phase 1 components for ARIA roles + focus management.
- **Track E — Perf bench:** Vitest perf suite verifying jsdom-measurable proxies for AC #16. Real-FPS deferred to v0.2.
- **Track F — End-user docs:** in-repo markdown under `docs/user-guide/`. Static site deferred to v0.2.
- **Track G — Community files + CI workflow:** CONTRIBUTING/SECURITY/CHANGELOG, issue/PR templates, `ci.yml`, `release-readiness.md`.
- **Track H — Diagnostics:** `Diagnostics` service + Logger ring-buffer extension + `__BUILD_INFO__` constant + Settings "Support" section.

**Owns / does-not-own discipline (carried forward from Phase 1):**
- Components own *layout and interaction*, never I/O.
- Hooks own *subscription wiring*, never persistence.
- Store owns *current truth*, never side effects.
- Services own *side effects*, never React state.
- Adapters own *source-specific knowledge*, never UI.
- A11y helpers (Phase 1.5 additions) are utility modules — they wrap existing components without owning state or behavior.

## Requirements

1. axe-core CI gate passes with zero violations of severity `moderate` or higher across 9 representative `<DashboardRoot>` states (6 dashboard + 3 popover).
2. Vitest perf bench gates merge on regression of three jsdom-measurable proxies for AC #16 — initial render, per-item re-render cost, search index lookup.
3. `docs/user-guide/` contains 6 concrete markdown files (README/TOC, getting-started, keyboard-cheatsheet, opml-import, bases-setup, troubleshooting), each ≥40 lines.
4. `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, 3 `.github/ISSUE_TEMPLATE/*.md` files + `config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, `.github/workflows/ci.yml`, and `docs/dev/release-readiness.md` exist with concrete content.
5. CI workflow runs 7 gates on PR + push-to-main with concurrency-cancel and 10-minute per-job timeouts: typecheck, lint, test, axe a11y, perf bench, bundle-size, docs-sync.
6. Settings tab "Support" section has a "Copy Diagnostics" button that opens a Radix Dialog preview of the JSON payload, then copies a PII-scrubbed payload to the clipboard. Tests positively assert shape AND negatively assert absence of feed URLs, item titles, vault paths, emails, IPs.
7. `Logger.getRecentEntries(n)` returns the n most recent log entries (FIFO ring buffer, default 200) without changing the public API of `error/warn/info/debug`.
8. `__BUILD_INFO__` constant injected via esbuild `--define` carries `bundleSize`, `gzipSize`, `buildDate`, `gitSha` for the Diagnostics service to report.
9. `axe-core` and `@axe-core/react` versions are pinned exactly (no `^` or `~`) in `package.json`.
10. Decision-log enforcement remains active — every Phase 1.5 commit appends a `docs/decisions.md` entry. SS-17's integration test from Phase 1 continues to pass after Phase 1.5 changes (non-regression check).

## Sub-Specs

---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
---

### 1. A11y Baseline + axe-core CI

- **Scope:** Add ARIA roles and focus management to existing Phase 1 components; introduce reusable a11y helpers under `src/components/a11y/`; integrate axe-core into the Vitest test suite with 9 representative state coverage. Pinned exact versions of `axe-core` and `@axe-core/react`.
- **Files (new):**
  - `src/components/a11y/useFocusTrap.ts`
  - `src/components/a11y/useFocusReturn.ts`
  - `src/components/a11y/AnnounceLive.tsx`
  - `src/components/a11y/aria.ts`
  - `__tests__/a11y/axe.test.tsx`
  - `__tests__/a11y/fixtures/representativeStates.tsx`
- **Files (modify):**
  - `src/components/DashboardRoot.tsx`
  - `src/components/FeedPane.tsx`
  - `src/components/ItemPane.tsx`
  - `src/components/PreviewPane.tsx`
  - `src/components/ItemCard.tsx`
  - `src/components/FeedCard.tsx`
  - `src/components/Toolbar.tsx`
  - `package.json` (pin `axe-core` and `@axe-core/react` exact versions)
- **Decisions (no further escalation):**
  - axe severity floor for blocking: `moderate`. Minor violations are logged but do not fail CI.
  - 9 representative states: 6 dashboard (empty / populated / item-selected / search-active / all-read / never-refreshed) + 3 popover (Add Feed / Multi-candidate picker / Per-feed settings).
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/components/a11y/{useFocusTrap.ts,useFocusReturn.ts,AnnounceLive.tsx,aria.ts}` all exist and export their primary symbols.
  - `[STRUCTURAL]` `<DashboardRoot>` has `role="application"` and `aria-label`. Verified via grep on `src/components/DashboardRoot.tsx`.
  - `[STRUCTURAL]` `<ItemPane>` has `role="listbox"` + `aria-activedescendant` referencing the selected `<ItemCard>` id.
  - `[STRUCTURAL]` Each `<ItemCard>` has `role="option"` and `aria-selected={isSelected}`.
  - `[STRUCTURAL]` `package.json` pins `"axe-core": "<exact>"` and `"@axe-core/react": "<exact>"` (no `^` or `~`). Grep for `\"axe-core\":\\s*\"\\^` returns 0 matches.
  - `[BEHAVIORAL]` axe-core test exercises 9 representative states; zero violations of severity `moderate` or `serious`. Run with `npm test -- a11y`.
  - `[BEHAVIORAL]` Popover focus trap returns focus to the triggering element after dismissal. Verified by `useFocusReturn` hook test.
  - `[BEHAVIORAL]` `AnnounceLive` debounces emissions at 250ms — rapid `j`-presses over 60 items emit 1 announcement, not 60.
  - `[INTEGRATION]` `<DashboardRoot>` rendered in jsdom and inspected with axe passes the moderate-floor gate while ALL of the 9 representative-state fixtures are mounted in turn.
  - `[MECHANICAL]` `npm test -- a11y` exits 0; CI workflow fails on regression.

---
sub_spec_id: SS-02
phase: run
depends_on: []
dispatch: factory
---

### 2. Performance Benchmark Harness (Vitest jsdom)

- **Scope:** Vitest-based perf suite verifying jsdom-measurable proxies for Phase 1 AC #16. **jsdom has no real rendering loop — these benchmarks measure React reconciliation + commit + jsdom DOM mutation cost, NOT paint.** Real-FPS measurement is explicitly deferred to v0.2 Playwright. Each `.bench.ts` file's leading comment states "what IS measured" and "what is NOT measured".
- **Files (new):**
  - `__tests__/perf/initialRender.bench.ts`
  - `__tests__/perf/rerender.bench.ts`
  - `__tests__/perf/search.bench.ts`
  - `__tests__/perf/fixtures/mock-feeds.ts`
  - `vitest.bench.config.ts`
- **Files (modify):**
  - `package.json` (add `npm run bench` script)
  - `harness/checks/perf.sh` (new check that wraps `npm run bench`)
- **Decisions (no further escalation):**
  - Bench threshold relaxation in CI: 1.5x baseline. After 5 PR data points, calibrate against actual CI variance.
  - Real-FPS measurement deferred to v0.2 Playwright bench. The renamed file (`rerender.bench.ts`, not `scrollFps.bench.ts`) reflects this honestly.
- **Acceptance criteria:**
  - `[STRUCTURAL]` `__tests__/perf/initialRender.bench.ts`, `rerender.bench.ts`, `search.bench.ts` exist; each starts with a comment explaining "what IS measured" and "what is NOT measured" in jsdom.
  - `[STRUCTURAL]` `vitest.bench.config.ts` exists and runs only `__tests__/perf/**/*.bench.ts`.
  - `[STRUCTURAL]` `package.json` includes `"bench": "vitest --config vitest.bench.config.ts run"`.
  - `[BEHAVIORAL]` `initialRender.bench.ts`: rendering `<DashboardRoot/>` with 100 mock feeds completes in <200ms baseline / <300ms CI (1.5x).
  - `[BEHAVIORAL]` `rerender.bench.ts`: 60 sequential read-state toggles on a 1000-item list produce per-item re-render mean <5ms / p99 <15ms (<7.5ms / <22.5ms CI).
  - `[BEHAVIORAL]` `search.bench.ts`: indexing 5000 items + querying returns matches in <150ms (<225ms CI).
  - `[MECHANICAL]` `npm run bench` exits 0 when thresholds pass; `bench-report.json` artifact is produced.
  - `[INTEGRATION]` All three benches run successfully in CI workflow under the `perf` job; CI fails on threshold regression.
  - `[MECHANICAL]` `bash harness/checks/perf.sh` invokes `npm run bench` and propagates exit code.

---
sub_spec_id: SS-03
phase: run
depends_on: []
dispatch: factory
---

### 3. End-User Documentation

- **Scope:** Six in-repo markdown files under `docs/user-guide/` covering getting-started, keyboard, OPML, Bases, troubleshooting, plus a TOC. Settings tab gains a "Cheat Sheet" section linking to GitHub. README updated to reference `docs/user-guide/`.
- **Files (new):**
  - `docs/user-guide/README.md`
  - `docs/user-guide/getting-started.md`
  - `docs/user-guide/keyboard-cheatsheet.md`
  - `docs/user-guide/opml-import.md`
  - `docs/user-guide/bases-setup.md`
  - `docs/user-guide/troubleshooting.md`
- **Files (modify):**
  - `README.md` (add "Documentation" section linking to `docs/user-guide/`)
  - `src/settings/SettingsTab.ts` (add "Cheat Sheet" inline section with GitHub link)
- **Decisions (no further escalation):**
  - Documentation lives in-repo as markdown. No static site (VitePress / GitHub Pages) in v0.1 — that's v0.2.
  - Cheat-sheet drift detection: CI `docs-sync` job (defined in SS-04) fails when `src/hooks/keyboard/bindings.ts` is modified without `docs/user-guide/keyboard-cheatsheet.md` in the same PR. Bypass via `[skip-docs-sync]` PR title for binding-unrelated edits.
  - Each doc carries a header comment referencing source-of-truth files (e.g., cheat-sheet header references `src/hooks/keyboard/bindings.ts`).
- **Acceptance criteria:**
  - `[STRUCTURAL]` All 6 files exist at `docs/user-guide/`.
  - `[STRUCTURAL]` Each file has ≥40 lines of substantive content (no `<FILL-IN>` placeholder text). Verified by `wc -l`.
  - `[STRUCTURAL]` `docs/user-guide/keyboard-cheatsheet.md` documents every binding from `src/hooks/keyboard/bindings.ts` (`j/k`, `n/p`, `o`, `s`, `*`, `r`, `R`, `/`, `m`, `M`, `gg`, `G`, `Esc`).
  - `[STRUCTURAL]` `docs/user-guide/opml-import.md` documents OPML 1.0/2.0 support, dedup behavior, category preservation, malformed-entry handling, and the import-progress UI from Phase 1 SS-11.
  - `[STRUCTURAL]` `docs/user-guide/bases-setup.md` shows a concrete Bases query for filtering by `type: article|youtube|bookmark` and grouping by `category`.
  - `[STRUCTURAL]` `README.md` has a "Documentation" section that links (relative path) to `docs/user-guide/README.md`.
  - `[BEHAVIORAL]` Settings tab "Cheat Sheet" section has a button that opens `https://github.com/Caleb68864/StrataMD/blob/main/docs/user-guide/keyboard-cheatsheet.md` via `window.open` or `Notice` with copyable URL.
  - `[MECHANICAL]` `lychee --cache --max-cache-age 1d 'docs/user-guide/**/*.md' README.md` exits 0 (no broken links).

---
sub_spec_id: SS-04
phase: run
depends_on: []
dispatch: factory
---

### 4. Community Files + CI Workflow + Release-Readiness Checklist

- **Scope:** GitHub-side polish files plus the CI workflow that gates Phase 1 + Phase 1.5 work. Adds CONTRIBUTING (referencing harness as canonical pre-commit check), SECURITY (with disclosure path via GitHub Security Advisories), CHANGELOG (Keep-a-Changelog format), 3 issue templates + `config.yml`, PR template, dependabot, `ci.yml` with 7 gates, and `docs/dev/release-readiness.md` checklist.
- **Files (new):**
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `CHANGELOG.md`
  - `.github/ISSUE_TEMPLATE/bug.md`
  - `.github/ISSUE_TEMPLATE/feature.md`
  - `.github/ISSUE_TEMPLATE/feed-source-request.md`
  - `.github/ISSUE_TEMPLATE/config.yml`
  - `.github/PULL_REQUEST_TEMPLATE.md`
  - `.github/dependabot.yml`
  - `.github/workflows/ci.yml`
  - `docs/dev/release-readiness.md`
- **Files (modify):** none.
- **Decisions (no further escalation):**
  - CI runner: `ubuntu-latest` only, Node 20 LTS only (no matrix in v0.1 — cheap CI).
  - Per-job timeout: 10 minutes.
  - Concurrency: `cancel-in-progress: true` on the workflow group.
  - Single retry on `npm ci` install only; tests/build/bench/lint do NOT retry (would mask flakiness).
  - Link-checker: `lychee --cache --max-cache-age 1d`. Fallback to `markdown-link-check` only if `lychee` proves unreliable.
  - Disclosure path in SECURITY.md: GitHub Security Advisories with default 90-day SLA.
  - CHANGELOG seed: single `[0.1.0]` entry summarizing Phase 1 capabilities (not 17 sub-spec entries).
  - Branch naming convention (in CONTRIBUTING): `feat/SS-NN-short-slug`, `fix/short-slug`, `docs/short-slug`, `chore/short-slug`.
- **Acceptance criteria:**
  - `[STRUCTURAL]` `CONTRIBUTING.md` exists, ≥30 lines, references `harness/init.sh` as canonical pre-commit check, references decision-log enforcement, lists branch naming convention.
  - `[STRUCTURAL]` `SECURITY.md` exists with a "Reporting" section pointing to GitHub Security Advisories and a "Supported Versions" table.
  - `[STRUCTURAL]` `CHANGELOG.md` exists, follows Keep-a-Changelog format (`## [Unreleased]` + `## [0.1.0] - YYYY-MM-DD`), has at least one entry under `[0.1.0]`.
  - `[STRUCTURAL]` `.github/ISSUE_TEMPLATE/{bug.md,feature.md,feed-source-request.md,config.yml}` all exist; `config.yml` disables blank issues.
  - `[STRUCTURAL]` `.github/PULL_REQUEST_TEMPLATE.md` includes a checklist with: decision-log entry, tests pass, lint clean, bundle within budget, docs-sync if bindings changed.
  - `[STRUCTURAL]` `.github/dependabot.yml` declares weekly schedule for both `npm` and `github-actions` ecosystems.
  - `[STRUCTURAL]` `.github/workflows/ci.yml` declares: `concurrency: { group: '${{ github.workflow }}-${{ github.ref }}', cancel-in-progress: true }`; runs on `pull_request` + `push: { branches: [main] }`; runner `ubuntu-latest`; Node 20; per-job `timeout-minutes: 10`; jobs for typecheck, lint, test, axe a11y, perf bench, bundle-size, docs-sync.
  - `[STRUCTURAL]` The `docs-sync` job fails when `src/hooks/keyboard/bindings.ts` is in the diff but `docs/user-guide/keyboard-cheatsheet.md` is not (and `[skip-docs-sync]` is not in the PR title).
  - `[STRUCTURAL]` `docs/dev/release-readiness.md` exists with a v0.1 checklist (all Phase 1 ACs verified, axe clean, perf bench passing, bundle within budget, README + cheat sheet aligned with `bindings.ts`, decision log clean, SS-17 integration test passes end-to-end).
  - `[BEHAVIORAL]` A representative PR (e.g., trivial README change) triggers the workflow and all 7 gates pass.
  - `[INTEGRATION]` PR opened against this branch with both `bindings.ts` and `keyboard-cheatsheet.md` modified passes `docs-sync`; PR with only `bindings.ts` modified fails `docs-sync` with the documented hint message.

---
sub_spec_id: SS-05
phase: run
depends_on: []
dispatch: factory
---

### 5. Diagnostics Service + Logger Ring Buffer + Build Info

- **Scope:** `Diagnostics` service collecting PII-scrubbed plugin/Obsidian/feed metadata; "Copy Diagnostics" button in Settings → Support section; **Logger ring-buffer extension** (Phase 1 SS-02 specified Logger but not retrievable history); `__BUILD_INFO__` constant injected via esbuild `--define` providing `bundleSize`/`gzipSize`/`buildDate`/`gitSha`. Output is structurally incapable of leaking user data because the collector reads only counts and metadata, never feed URLs, item titles, vault paths, or note content. PIIScrubber is defense-in-depth.
- **Files (new):**
  - `src/services/Diagnostics.ts`
  - `src/services/diagnostics/PIIScrubber.ts`
  - `src/services/diagnostics/buildInfo.ts`
  - `src/components/settings/DiagnosticsSection.tsx`
  - `__tests__/Diagnostics.test.ts`
  - `__tests__/diagnostics/PIIScrubber.test.ts`
- **Files (modify):**
  - `src/services/Logger.ts` (add `getRecentEntries(n: number = 200): LogEntry[]` backed by an in-memory ring buffer; existing `error/warn/info/debug` append to the buffer alongside their existing console output. **No breaking change to the public API of the four level methods.**)
  - `src/settings/SettingsTab.ts` (mount `<DiagnosticsSection>` in a "Support" group)
  - `esbuild.config.mjs` (inject `__BUILD_INFO__` via `--define` with bundle/gzip sizes computed via post-build replacement)
- **Decisions (no further escalation):**
  - Logger ring-buffer size: 200 entries, FIFO. Store `{level, message, timestamp}` minimum.
  - Diagnostics output is clipboard-only. No auto-send. No upload. Ever.
  - Radix Dialog primitive: validate presence at sub-spec-start time. If not yet copied in by Phase 1 SS-12, copy it in via shadcn convention as the first step of this sub-spec.
  - Diagnostics includes `installedSinceDays` derived from `data.json` first-write date.
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/services/Diagnostics.ts` exports `class Diagnostics` with `collect(): Promise<DiagnosticsPayload>` method.
  - `[STRUCTURAL]` `src/services/Logger.ts` exposes `getRecentEntries(n?: number): LogEntry[]`. The four level methods (`error/warn/info/debug`) retain their existing signatures (no breaking change).
  - `[STRUCTURAL]` `src/services/diagnostics/PIIScrubber.ts` exports `scrub(input: unknown): unknown` that recursively replaces URL, file-path, email, IPv4 patterns with `[REDACTED]`.
  - `[STRUCTURAL]` `src/services/diagnostics/buildInfo.ts` declares the `__BUILD_INFO__` constant shape: `{ bundleSize: number; gzipSize: number; buildDate: string; gitSha: string }`.
  - `[STRUCTURAL]` `esbuild.config.mjs` includes a `--define` injection (or post-build replacement) for `__BUILD_INFO__`. Verified by inspecting the built `main.js` for `bundleSize` literal.
  - `[STRUCTURAL]` `src/components/settings/DiagnosticsSection.tsx` renders a "Copy Diagnostics" button that opens a Radix Dialog showing the JSON payload before copy.
  - `[BEHAVIORAL]` Clicking "Copy Diagnostics" opens the preview Dialog. Confirming "Copy" writes the payload to `navigator.clipboard` and emits an Obsidian Notice. Verified in `__tests__/Diagnostics.test.ts` with mocked clipboard.
  - `[BEHAVIORAL]` `Diagnostics.collect()` output passes positive assertions on shape: top-level keys include `_schemaVersion` (= 1), `pluginVersion`, `obsidianAppVersion`, `osPlatform`, `feedCount`, `itemCount`, `userStateCounts`, `bundleSize`, `gzipSize`, `buildDate`, `gitSha` (7-char truncated), `installedSinceDays`, `recentLogs`.
  - `[BEHAVIORAL]` `Diagnostics.collect()` output passes negative assertions: NO substring matches for `https?://`, NO Windows path `[A-Za-z]:\\\\.+`, NO POSIX path `/.+/.+`, NO UNC path `\\\\\\\\.+`, NO email pattern, NO IPv4 pattern. Tested against a fixture that seeds Logger with feed URLs, item titles, vault paths (POSIX + Windows + UNC) — none leak through.
  - `[BEHAVIORAL]` `Logger.getRecentEntries(200)` returns the 200 most recent log entries in chronological order. Verified by emitting 250 entries and checking the buffer length and ordering.
  - `[BEHAVIORAL]` `PIIScrubber.scrub` against an input with `{ "log": "Failed to fetch https://example.com/feed" }` returns `{ "log": "Failed to fetch [REDACTED]" }`.
  - `[INTEGRATION]` From a built plugin in a test vault: clicking "Copy Diagnostics" produces clipboard text that parses as JSON, contains all required fields, and contains zero PII. Verified by Vitest with mocked clipboard reading the result back.
  - `[MECHANICAL]` `npm test -- Diagnostics PIIScrubber` exits 0.

## Edge Cases

- **Clipboard API blocked / unavailable:** `<DiagnosticsSection>` falls through to a Dialog state showing the JSON in a copyable `<pre>` block with a "Select All" button. No error toast.
- **Logger ring buffer empty (very early lifecycle):** `Diagnostics.collect()` returns valid JSON with `recentLogs: []` and a note `"recentLogs": "Logger not yet initialized"` when called before `Logger.init`.
- **`__BUILD_INFO__` undefined at runtime (dev build without injection):** `Diagnostics.collect()` omits `bundleSize`, `gzipSize`, `buildDate`, `gitSha` fields rather than crashing. Reports `_buildInfoSource: "missing — likely development build"`.
- **PIIScrubber pattern miss (URL with non-standard scheme like `magnet:`):** the preview Dialog is the final visual guard. User reviews before copy.
- **`AnnounceLive` debounced spam during bulk navigation (`G` jump-to-bottom over 1000 items):** emits FINAL state only ("Item 1000 of 1000, {title}").
- **Focus trap on a popover with no focusable elements:** `useFocusTrap` calls `Logger.warn` and places focus on the close button.
- **`aria-activedescendant` references an element no longer in DOM (selection set during search filter):** Phase 1 SS-04 store action that filters items also clears `selectedItemId` if it's no longer in `currentItemIds`. Phase 1.5 verifies this with an axe test on the search-active state.
- **axe-core minor-version bump introduces new rules:** mitigated by exact version pinning. Upgrade is intentional and gets its own PR with rule-change audit.
- **CI threshold flakes on slow runners:** 1.5x relaxation in CI via `process.env.CI`. Add CI machine specs to `bench-report.json` so future flakes can be diagnosed.
- **jsdom render missing real layout cost:** caveat in test comments. v0.2 replaces with Playwright; meanwhile, jsdom verifies "no order-of-magnitude regression" not "absolute correctness."
- **Markdown links break (deleted file, renamed heading):** CI `lychee --cache` job fails on broken links.
- **Cheat-sheet drift from `bindings.ts`:** CI `docs-sync` job fails when binding changes without cheat-sheet update; bypass via `[skip-docs-sync]` PR title for non-binding edits. **If `src/hooks/keyboard/bindings.ts` does not exist (Phase 1 SS-15 hasn't landed yet), docs-sync skips silently with PASS** — sub-specs land in any order.
- **Lychee external-link rate limits in CI:** CI lychee scope is repo-relative links only (`--exclude '^https?://'`) on PR; full external-link check runs in a separate scheduled weekly job (`docs/external-link-audit.yml`) that posts a single tracking issue when broken.
- **A11y popover fixture pattern:** representative-state fixtures mount popovers with explicit `open={true}` props (or store-driven open flags) — never via simulated clicks. jsdom can't reliably trigger Radix portal mounts via user-event.
- **Issue templates ask for fields users don't want to share:** all fields except "what happened" / "expected behavior" are optional. Diagnostics output is encouraged but not required.
- **CI workflow flakes (npm install timeout, network blip):** workflow has single retry on the install step; tests/build do NOT retry (would mask flaky tests).
- **`process.platform` returns unexpected value on mobile:** Diagnostics records the literal value; downstream consumers (e.g., bug reports) handle it as a string.
- **Decision-log compliance on Phase 1.5 commits:** every commit must update `docs/decisions.md`. The pre-commit hook from forge-init Step 6g enforces this. Bypass with `git commit --no-verify` (sparingly, documented in CONTRIBUTING).

### Abstract phrase disambiguations

- "tolerant feed parsing" (carried from Phase 1) → permissive (accept malformed, log skipped items, never reject the entire feed).
- "graceful degradation" (carried from Phase 1) → fall through chain of fallbacks; never throw user-facing error from a single failure.
- "PII-scrubbed" → strict regex-based replacement of URL/path/email/IP patterns with `[REDACTED]`. Defense-in-depth on top of a collector that doesn't gather identifying data.
- "rate-limited notifications" (carried from Phase 1) → strict per-feed-per-5-minutes; multiple events within window emit ONE notice.
- "9 representative states" → exactly 9: 6 dashboard variants (empty, populated, item-selected, search-active, all-read, never-refreshed) + 3 popover states (Add Feed, Multi-candidate picker, Per-feed settings).
- "axe-core severity floor" → `moderate` blocks merge; `minor` is logged only.

## Out of Scope

Phase 1.5 explicitly does **NOT** include (deferred to v0.2):

- Static documentation site (VitePress / GitHub Pages with markdown rendering, search, versioned docs)
- Voice navigation hooks (e.g., dragonfly/voice-control integration)
- High-contrast mode toggle (independent of OS contrast preferences)
- `prefers-reduced-motion` respect for animations and pulse effects
- Playwright-based real-Electron perf bench (replaces Vitest jsdom bench)
- In-app log viewer (settings → Logs tab with filter, search, export)
- Migration guides for FreshRSS / Inoreader / Newsboat / NetNewsWire users (`docs/user-guide/migrate-from-*.md`)
- Public roadmap markdown
- GitHub Discussions enablement
- Auto-generated cheat sheet from `bindings.ts`
- Tightening axe severity floor below `moderate` to `minor`

Phase 1.5 explicitly does **NOT** include (out of scope, period):

- Telemetry, analytics, or any phone-home (matches Phase 1 exclusions — Diagnostics is clipboard-only and user-initiated).
- Replacing or refactoring Phase 1 architecture decisions (a11y wraps existing components; never rewrites them).
- New runtime dependencies beyond Phase 1's canonical set. Only dev-deps allowed: `@axe-core/react`, `lychee` or `markdown-link-check`. All net-new deps are dev-dependencies, never runtime.
- Changes to `data.json` schema (Phase 1's `schemaVersion` stays at 1 in Phase 1.5).
- Modifications to Phase 1 sub-specs themselves. Track D modifies Phase 1 component files for ARIA only; Track H modifies Logger to add a method. Neither re-opens any Phase 1 sub-spec scope.

## Constraints

### Musts
- MUST be purely additive to Phase 1 — no Phase 1 sub-spec is re-opened, no Phase 1 AC regresses.
- MUST keep main bundle within Phase 1's ≤1.5MB / ≤400KB budget.
- MUST pin `axe-core` and `@axe-core/react` versions exactly (no `^` or `~`).
- MUST honor decision-log enforcement on every Phase 1.5 commit.
- MUST scrub diagnostics output of URL/path/email/IPv4 patterns AND structurally avoid collecting them in the first place.
- MUST run all 7 CI gates on PR + push-to-main with concurrency-cancel and 10-minute per-job timeouts.
- MUST document, in each `.bench.ts` file, "what is measured" and "what is NOT measured" — jsdom's lack of paint loop is acknowledged in code comments.
- MUST validate Radix Dialog primitive is present before Track H build proceeds; copy in via shadcn convention if missing.
- MUST preserve `Logger.error/warn/info/debug` public API exactly. Adding `getRecentEntries` is a non-breaking extension.

### Must-Nots
- MUST NOT introduce real runtime telemetry, analytics, or phone-home — Diagnostics is local-only, user-initiated, clipboard-only.
- MUST NOT bundle docs content into the plugin — docs are repo-only in v0.1.
- MUST NOT change `data.json` schema (`schemaVersion` stays at 1).
- MUST NOT extend Phase 1 components beyond ARIA attributes and focus wrapping. Internal logic is Phase 1's.
- MUST NOT introduce a docs site, in-app log viewer, voice nav, motion-reduction, or contrast toggle in v0.1 (v0.2 deferrals).
- MUST NOT couple tracks to each other — they run in parallel; if Track E fails, Tracks D/F/G/H still ship.
- MUST NOT use static `console.*` outside `src/services/Logger.ts` (existing Phase 1 ESLint rule, carried).
- MUST NOT add new runtime `package.json` dependencies. Dev dependencies for testing/quality only.
- MUST NOT skip the `[skip-docs-sync]` PR title check — the bypass is intentional but logged as a workflow audit warning.

### Preferences
- Prefer `lychee --cache` over `markdown-link-check` for CI link-checking.
- Prefer copy-in shadcn primitives over importing from a vendored library.
- Prefer pinning exact versions for testing/quality dev-deps that gate CI.
- Prefer one CI workflow file (`ci.yml`) over multiple — easier maintenance.
- Prefer per-id selectors over collection re-renders (carried from Phase 1).
- Prefer terse a11y helper module names within `src/components/a11y/`.
- Prefer Vitest descriptive test names that double as documentation.

### Escalation Triggers (stop and ask the human)
- A Phase 1 AC would regress to satisfy Phase 1.5 work.
- The bundle-size budget would be exceeded after Phase 1.5 changes.
- Real-FPS measurement is requested (must be deferred to v0.2 Playwright; do not attempt in jsdom).
- A new runtime dependency is needed beyond the canonical Phase 1 set + `@axe-core/react` (dev) + link-checker (dev).
- A track scope-creeps into another track's territory (e.g., Track D wants to ship a log viewer — that's v0.2 Track H Premium).
- The owns/does-not-own rules feel like they need an exception.
- Disclosure SLA in SECURITY.md needs to be shorter than 90 days (legal review territory).
- Logger public API of the four level methods would need to change.

## Verification

Phase 1.5 is verified complete when:

1. All 5 sub-spec acceptance criteria pass under `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run bench`.
2. CI workflow (`ci.yml`) executes 7 gates and passes on a representative PR.
3. SS-17 integration test from Phase 1 still passes end-to-end against a fresh test vault containing 100 mixed feeds (non-regression check).
4. Bundle size CI gate continues to pass: `main.js` ≤1.5MB minified, ≤400KB gzipped (carried from Phase 1).
5. Manual smoke test in a real Obsidian instance:
   - Open dashboard. Press `j/k` repeatedly while a screen reader is enabled. The screen reader announces only the FINAL item title after a burst (debounce works).
   - Open Settings → Support → Copy Diagnostics. Verify the preview Dialog shows a JSON payload. Confirm. Paste the clipboard contents into a text editor and visually verify NO feed URLs, NO item titles, NO vault paths, NO emails, NO IPs appear.
   - Open Settings → Cheat Sheet. Click the GitHub link — the cheat sheet opens in the browser.
   - Open `docs/user-guide/keyboard-cheatsheet.md` on GitHub directly. Verify every binding from `src/hooks/keyboard/bindings.ts` is documented.
6. Decision-log clean: `git log --oneline` shows every commit since the Phase 1.5 starting commit has a corresponding entry in `docs/decisions.md`. Verified by:
   ```bash
   git log --since="<phase 1.5 start>" --oneline | wc -l   # commit count
   grep -c '^## 2026-' docs/decisions.md                    # entry count
   # entry count should be ≥ commit count - 1 (initial install entry)
   ```
7. `docs/dev/release-readiness.md` checklist is fully checked: every Phase 1 AC verified, axe clean, bench passing, bundle within budget, README + cheat sheet aligned with `bindings.ts`, decision log clean, SS-17 integration test passes end-to-end.
8. axe-core in CI shows zero violations of severity `moderate` or `serious` across all 9 representative states.
9. Vitest perf bench (`npm run bench`) reports all three benchmarks within their CI-relaxed thresholds; `bench-report.json` artifact is produced.
10. Settings tab "Support" section: `<DiagnosticsSection>` is mounted; clicking the button works end-to-end (open Dialog → preview JSON → confirm → clipboard write → toast).

---

## Phase Specs

Refined by `/forge-prep` on 2026-05-08.

| Sub-Spec | Phase Spec |
|----------|------------|
| SS-01. A11y Baseline + axe-core CI | `stratamd-phase-1-5-quality-layer/sub-spec-01-a11y.md` |
| SS-02. Performance Benchmark Harness (Vitest jsdom) | `stratamd-phase-1-5-quality-layer/sub-spec-02-perf-bench.md` |
| SS-03. End-User Documentation | `stratamd-phase-1-5-quality-layer/sub-spec-03-docs.md` |
| SS-04. Community Files + CI Workflow + Release-Readiness | `stratamd-phase-1-5-quality-layer/sub-spec-04-community-ci.md` |
| SS-05. Diagnostics + Logger Ring Buffer + Build Info | `stratamd-phase-1-5-quality-layer/sub-spec-05-diagnostics.md` |
| SS-06. Integration: Non-regression + End-to-End Smoke (auto-generated) | `stratamd-phase-1-5-quality-layer/sub-spec-06-integration.md` |

Index: `stratamd-phase-1-5-quality-layer/index.md`
