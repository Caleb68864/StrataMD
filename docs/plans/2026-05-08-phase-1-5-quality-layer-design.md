---
date: 2026-05-08
topic: "StrataMD Phase 1.5 — Quality Layer (a11y, perf bench, end-user docs, repo polish, diagnostics)"
author: Caleb Bennett
status: evaluated
evaluated_date: 2026-05-08
tags:
  - design
  - stratamd
  - phase-1-5
  - quality-layer
---

# StrataMD Phase 1.5 — Quality Layer — Design

## Summary

A focused, additive layer that lands alongside or just after Phase 1 ships, addressing five gap clusters identified by audit: accessibility baseline (D), performance benchmark harness (E), end-user documentation (F), repo community files + CI workflow (G), and user-facing diagnostics (H). Approach C — phased polish — ships the must-have polish for v0.1 and explicitly defers premium pieces (full a11y, real-Electron perf bench, dedicated docs site, in-app log viewer, migration guides) to v0.2 so scope stays bounded. Designed as 5 independent parallel sub-specs of ~2-4 hours of agent work each.

## Approach Selected

**Approach C: Polish phased.** Selected because the brain dump's priority order is `stable_rss_reader > UX > polish > extensibility > advanced_features`. Premium polish (Approach B with VitePress site, voice nav, Playwright bench) would invert the priority by treating polish like an advanced feature. Approach A leaves a noticeable a11y gap. Approach C ships the load-bearing polish for v0.1 (a11y baseline, perf verification, keyboard cheat sheet, basic diagnostics, repo health files) and names the v0.2 follow-up so no work is orphaned.

## Architecture

Phase 1.5 is **purely additive** to Phase 1 — no Phase 1 sub-spec gets re-opened. The new work layers on top via five independent tracks. Tracks D and H are the only ones that touch `src/`. Tracks E (tests), F (docs), G (repo files) live entirely outside `src/`.

```
                     Phase 1 (existing — unchanged)
                     ┌────────────────────────────────────┐
                     │  src/components/                   │
                     │  src/services/                     │
                     │  src/settings/                     │
                     │  src/main.ts                       │
                     └────────────────────────────────────┘
                              ↑                ↑
              modifies existing             extends settings
              (adds ARIA helpers,           ("Support" + "Cheat
               focus utilities,              Sheet" sections)
               wrapper components)
                              │                │
   ┌──────────────────────────┼────────────────┼─────────────────────┐
   │                          │                │                     │
   ▼                          ▼                ▼                     ▼
┌─────────┐            ┌───────────┐    ┌────────────┐         ┌──────────┐
│ Track D │            │  Track H  │    │  Track E   │         │ Track F  │
│  A11y   │            │Diagnostics│    │ Perf Bench │         │  Docs    │
│ baseline│            │ service + │    │  (Vitest)  │         │ (docs/   │
│ + axe-  │            │ settings  │    │            │         │  user-   │
│ core CI │            │  UX       │    │            │         │  guide/) │
└─────────┘            └───────────┘    └────────────┘         └──────────┘
                                                                     │
                                                                     ▼
                                                          ┌─────────────────┐
                                                          │     Track G     │
                                                          │ Community files │
                                                          │  CONTRIBUTING   │
                                                          │  SECURITY       │
                                                          │  CHANGELOG      │
                                                          │  .github/       │
                                                          │  ISSUE_TEMPLATE │
                                                          │  PR_TEMPLATE    │
                                                          │  ci.yml         │
                                                          └─────────────────┘
```

**Key architectural decisions:**

1. **Tracks run in parallel.** Five sub-specs with no inter-track dependencies — they all depend only on Phase 1 having shipped. Build order is determined by reviewer availability, not technical sequencing.

2. **CI/Actions workflow lives in Track G** as `.github/workflows/ci.yml`, even though it's operationally cross-cutting. It runs all the gates Phase 1 + Phase 1.5 specify: typecheck, lint, test, axe-core a11y, perf bench, bundle-size budget.

3. **Documentation is repo-only — no docs site in v0.1.** The "Documentation" link in settings opens a GitHub URL to `docs/user-guide/`. Bundling docs into the plugin would inflate the bundle for an infrequently-used feature; clone-the-repo is acceptable for power users. Static docs site lands in v0.2.

4. **Diagnostics is in-process and PII-scrubbed by construction.** `Diagnostics.collect()` reads only counts and metadata, never feed URLs, item titles, vault paths, or note content. The output is structurally incapable of leaking user data — there's nothing identifying to redact because nothing identifying was collected.

5. **A11y tests run in jsdom + axe-core (Vitest); perf tests run in jsdom + raw Performance API (Vitest).** Both are upgraded to Playwright in v0.2 — caveat noted in test comments. Phase 1.5 jsdom thresholds verify the order-of-magnitude (200ms / 55 FPS / 150ms) but cannot capture real Electron paint cost; that's acceptable for "do not regress" CI gating, less for absolute measurement.

6. **The Settings tab gains two sections, not a sub-tab.** "Support" (Diagnostics) and "Cheat Sheet" (link to GitHub user-guide) are inline below the existing Phase 1 settings. Avoids a tab redesign.

7. **Decision-log enforcement still applies.** Every Phase 1.5 commit appends a `docs/decisions.md` entry. The hook is already installed (forge-init Step 6g).

## Components

Five tracks → five sub-specs. Each is independently executable and sized for a single agent session.

### Track D — Accessibility Baseline

- **Scope:** Add ARIA roles and focus management to existing Phase 1 components; introduce reusable a11y helpers; integrate axe-core into the test suite.
- **New files:**
  - `src/components/a11y/useFocusTrap.ts` — keyboard focus trap for popovers/dialogs
  - `src/components/a11y/useFocusReturn.ts` — restores focus to triggering element after popover close
  - `src/components/a11y/AnnounceLive.tsx` — screen-reader live region (250ms-debounced) for refresh state, new items, save confirmations
  - `src/components/a11y/aria.ts` — shared ARIA role constants
  - `__tests__/a11y/axe.test.tsx` — runs axe-core against `<DashboardRoot>` in 6 representative states (empty, populated, item selected, search active, popover open, all-read)
- **Modified files:**
  - `<DashboardRoot>` — `role="application"`, labelled by toolbar
  - `<FeedPane>`, `<ItemPane>`, `<PreviewPane>` — `role="region"` + `aria-label`
  - `<ItemPane>` — `role="listbox"` + `aria-activedescendant` pointing to selected `<ItemCard>` ID
  - `<ItemCard>` — `role="option"` + `aria-selected`
  - `<FeedCard>` — `role="treeitem"` (since FeedPane has categories tree) + `aria-expanded` for category nodes
  - `<Toolbar>` — buttons get `aria-label` matching command palette text
  - Popovers (Add Feed, Multi-candidate picker, Per-feed settings) — wrapped in `useFocusTrap` + `useFocusReturn`
- **Acceptance:** zero axe-core violations of severity `moderate` or `serious` across **9 representative states** — 6 dashboard states (empty, populated, item-selected, search-active, all-read, never-refreshed) **plus 3 popover states** (Add Feed dialog open, Multi-candidate feed picker open, Per-feed settings popover open) — CI fails on regression. **`axe-core` and `@axe-core/react` versions are pinned exactly** (no `^` or `~`) in `package.json`. Upgrade is intentional and gets its own PR with rule-change audit.

### Track E — Performance Benchmark Harness

- **Scope:** Vitest-based perf suite verifying jsdom-measurable proxies for AC #16; gate merge on regression. **Note: jsdom has no real rendering loop — these benchmarks measure React render-cycle cost, not paint cost. Real-FPS measurement is explicitly deferred to v0.2 Playwright.**
- **New files:**
  - `__tests__/perf/initialRender.bench.ts` — `ReactDOM.render(<DashboardRoot/>)` with 100 mock feeds, asserts initial render returns within `<200ms` (CI: `<300ms` with 1.5x relaxation). What's measured: React reconciliation + commit + jsdom DOM mutation cost (NOT paint).
  - `__tests__/perf/rerender.bench.ts` — replaces `scrollFps.bench.ts`. Renders 1000-item virtualized list, then triggers 60 sequential read-state toggles on different items; asserts each per-item re-render completes in `<5ms` mean and `<15ms` p99. What's measured: per-item selector subscription efficiency (the actual proxy for "scroll won't drop frames in real DOM").
  - `__tests__/perf/search.bench.ts` — index 5000 items, query, asserts `<150ms` (`<225ms` in CI). jsdom-safe (no DOM involved).
  - `__tests__/perf/fixtures/mock-feeds.ts` — deterministic generator for benchmark inputs
  - `vitest.bench.config.ts` — separate vitest config for benchmarks (avoids polluting unit-test runs)
- **Modified files:**
  - `package.json` — `npm run bench` script
  - `harness/checks/perf.sh` — new check that runs `npm run bench`
- **Acceptance:** all three benchmarks pass in CI under relaxed thresholds; PR-blocking on failure; bench output saved as a `bench-report.json` CI artifact for trend tracking. Each `.bench.ts` file's leading comment explicitly states "what is measured" and "what is NOT measured" so future maintainers don't assume the bench captures paint cost.

### Track F — End-User Documentation

- **Scope:** in-repo markdown docs covering keyboard, OPML, Bases, getting started.
- **New files:**
  - `docs/user-guide/README.md` — landing page + TOC
  - `docs/user-guide/getting-started.md` — first-run walkthrough (open dashboard → add feed → keyboard nav → save note → view in Bases)
  - `docs/user-guide/keyboard-cheatsheet.md` — every binding from SS-15, grouped by context (navigation, item state, search, refresh)
  - `docs/user-guide/opml-import.md` — supported OPML 1.0/2.0 formats, dedup behavior, category preservation, error handling for malformed entries
  - `docs/user-guide/bases-setup.md` — how to create a Bases view of saved StrataMD notes (filter by `type: article|youtube|bookmark`, group by category, sort by saved_at)
  - `docs/user-guide/troubleshooting.md` — short FAQ (feed won't add → check requestUrl; YouTube won't resolve → manual override; etc.)
- **Modified files:**
  - `README.md` — adds "Documentation" section linking to `docs/user-guide/`
  - `src/settings/SettingsTab.ts` — adds "Cheat Sheet" inline section with link to GitHub `docs/user-guide/keyboard-cheatsheet.md`
- **Acceptance:** all 6 markdown files exist with concrete content (each ≥40 lines, no placeholder text); README links to user-guide; settings tab links work.

### Track G — Community Files + CI Workflow

- **Scope:** GitHub-side polish + the CI workflow that gates everything.
- **New files:**
  - `CONTRIBUTING.md` — dev setup, branching/PR convention, decision-log requirement, harness usage
  - `SECURITY.md` — disclosure path (GitHub Security Advisories), supported versions, what's in scope (HTML rendering, feed parsing, OPML import) and what's out (user's vault security)
  - `CHANGELOG.md` — Keep-a-Changelog format, seeded with `[Unreleased]` and `[0.1.0]` placeholder
  - `.github/ISSUE_TEMPLATE/bug.md` — bug report (Obsidian version, plugin version, repro steps, diagnostics output)
  - `.github/ISSUE_TEMPLATE/feature.md` — feature request
  - `.github/ISSUE_TEMPLATE/feed-source-request.md` — request for new source adapter (Rumble, Odysee, Podcast, etc.)
  - `.github/ISSUE_TEMPLATE/config.yml` — disables blank issues, points to discussions for questions
  - `.github/PULL_REQUEST_TEMPLATE.md` — checklist (decision-log entry, tests pass, lint clean, bundle within budget)
  - `.github/dependabot.yml` — npm + github-actions weekly
  - `.github/workflows/ci.yml` — runs typecheck, lint, test, axe, bench, bundle-size, **docs-sync** on PR + push to main. Includes: `concurrency: { group: '${{ github.workflow }}-${{ github.ref }}', cancel-in-progress: true }`; per-job 10-minute timeout; runner `ubuntu-latest`; Node 20 LTS only (no matrix for v0.1 — cheap CI); single retry on `npm ci` install step only (tests/build do NOT retry, would mask flaky tests); `lychee` step uses `--cache` to avoid rate-limit on PRs from forks
  - `docs/dev/release-readiness.md` — checklist gating Phase 1 → v0.1 ship (all sub-specs verified, axe clean, perf bench passing, bundle within budget, README + cheat sheet aligned with `bindings.ts`, decision log clean, Phase 1 SS-17 integration test passes end-to-end). CONTRIBUTING.md references this checklist
  - `.github/workflows/docs-sync.yml` (or a `docs-sync` job in `ci.yml`) — fails the workflow if `src/hooks/keyboard/bindings.ts` is in the diff but `docs/user-guide/keyboard-cheatsheet.md` is not, with a hint message ("Update the cheat sheet to match new bindings, or add `[skip-docs-sync]` to the PR title for non-binding-changes")
- **Modified files:** none (CONTRIBUTING references existing harness/init.sh and decision-log conventions).
- **Acceptance:** repo passes a community-health checklist (CONTRIBUTING ≥30 lines + references harness as canonical pre-commit check; SECURITY has disclosure path + supported-versions table; CHANGELOG has at least one entry); CI workflow runs successfully on a representative PR (build → 7 gates pass: typecheck, lint, test, axe, bench, bundle-size, docs-sync); `docs/dev/release-readiness.md` exists with the v0.1 ship checklist.

### Track H — User-Facing Diagnostics

- **Scope:** Diagnostics service collecting PII-scrubbed plugin/Obsidian/feed metadata; "Copy Diagnostics" button in settings. Includes the **Logger ring-buffer extension** (Phase 1 SS-02 specified Logger but not a retrievable history) and the **`__BUILD_INFO__` constant** (esbuild `--define` injection at build time providing `bundleSize`, `gzipSize`, `buildDate`, `gitSha`).
- **New files:**
  - `src/services/Diagnostics.ts` — `collect()` returns a JSON object with: plugin version, Obsidian app version, OS platform, total feeds, total items, counts (read/saved/starred/ignored), `bundleSize`/`gzipSize`/`buildDate`/`gitSha` (from `__BUILD_INFO__`), `installedSinceDays` (derived from `data.json` first-write date), last 200 Logger entries (level + message + timestamp; messages already scrubbed by Logger conventions)
  - `src/services/diagnostics/PIIScrubber.ts` — defense-in-depth regex scrubber that replaces URLs, file paths, emails, IP addresses with `[REDACTED]` even though the collector is structured to never include them
  - `src/services/diagnostics/buildInfo.ts` — declares the `__BUILD_INFO__` constant shape
  - `src/components/settings/DiagnosticsSection.tsx` — Settings section with "Copy Diagnostics" button + Radix Dialog preview showing exactly what gets copied + brief explanation of what is and is NOT included. **Validates Radix Dialog primitive presence at SS-12-Phase-1.5 time; if not yet installed by Phase 1, this sub-spec's first step adds it via the shadcn copy-in pattern.**
  - `__tests__/Diagnostics.test.ts` — verifies output shape and absence of feed URLs / item titles / vault paths in collected output
- **Modified files:**
  - `src/services/Logger.ts` — adds `getRecentEntries(n: number = 200): LogEntry[]` backed by an in-memory ring buffer of length 200 (FIFO); existing `error/warn/info/debug` methods append to the buffer alongside their existing console output. **No public API change to `Logger.error/warn/info/debug`.**
  - `src/settings/SettingsTab.ts` — mounts `<DiagnosticsSection>` in a "Support" group
  - `esbuild.config.mjs` — adds `--define:__BUILD_INFO__=…` injection (the build script computes bundle/gzip sizes after build, then re-runs esbuild `--define` for the final bundle, OR uses a post-build replacement step — implementation choice per agent)
- **Acceptance:** clicking the button copies a JSON payload to clipboard; clipboard read in test confirms shape; test asserts NO feed URL, NO item title, NO vault path, NO email, NO IP appears in collected output (positive AND negative assertions). `Logger.getRecentEntries(200)` returns the 200 most recent log entries in chronological order.

## Data Flow

### Diagnostics flow
```
User clicks "Copy Diagnostics" in Settings → DiagnosticsSection component
  → Diagnostics.collect()
      → app.manifest.version                                  (Obsidian API)
      → app.appVersion                                         (Obsidian API)
      → process.platform                                       (Node)
      → store.getState() → counts only (NO urls, NO titles)
      → bundle size from build artifact (read at build, not runtime)
      → Logger.getRecentEntries(200) (in-memory ring buffer)
  → PIIScrubber.scrub(payload) (defense-in-depth)
  → JSON.stringify
  → Radix Dialog opens showing exact payload + "Copy to Clipboard" button
  → User clicks Copy → navigator.clipboard.writeText(payload)
  → Obsidian Notice: "Diagnostics copied to clipboard"
```

### A11y focus flow (item navigation)
```
User presses j (next item) → useKeyboardShortcuts dispatches selectNext()
  → store updates selectedItemId
  → <ItemPane> aria-activedescendant updates to current ItemCard id
  → AnnounceLive emits "{title} from {feed}, item N of M"
     (debounced 250ms so rapid j-presses don't spam)
  → focus stays on <ItemPane>'s scroll container
  → screen reader reads the AnnounceLive content
```

### Perf bench flow
```
npm run bench (local) OR CI workflow perf job
  → Vitest with vitest.bench.config.ts
  → Each .bench.ts:
      → setup: deterministic mock store + items from fixtures
      → measure: Performance.now() / requestAnimationFrame loop
      → assert: throw if threshold exceeded (1.0x local, 1.5x CI)
  → On CI: bench-report.json saved as workflow artifact
  → On PR: workflow status reflects bench result
```

### A11y test flow (CI)
```
CI workflow runs npm test -- a11y
  → Vitest renders <DashboardRoot> in 6 representative states
  → axe-core runs against each rendered tree
  → fails on any violation of severity moderate or serious
  → minor violations logged but do not fail
```

### User docs flow
```
User reads docs/user-guide/keyboard-cheatsheet.md on GitHub
  OR
User opens Settings → Cheat Sheet section → clicks "Open on GitHub"
  → window.open('https://github.com/Caleb68864/StrataMD/blob/main/docs/user-guide/keyboard-cheatsheet.md')
```

## Error Handling

**Diagnostics:**
- `navigator.clipboard.writeText` blocked / unavailable → fall through to a Dialog state showing the JSON in a copyable `<pre>` block with a "Select All" button.
- `Logger.getRecentEntries` returns empty (Logger not yet wired in early lifecycle) → diagnostics still produces valid JSON with `logs: []` and a note `"logs": "Logger not yet initialized"`.
- Bundle size unknown at runtime (production builds embed it; dev builds may not) → omit field, do not crash.
- PIIScrubber pattern miss → users see the preview Dialog before copying. Visible inspection is the final guard.

**A11y:**
- `AnnounceLive` debounced spam during bulk navigation (`G` jump-to-bottom over 1000 items) → emits the FINAL state only ("Item 1000 of 1000, {title}").
- Focus trap on a popover with no focusable elements → Logger.warn, place focus on close button.
- `aria-activedescendant` references an element no longer in DOM (selection set during search filter) → store action that filters items also clears `selectedItemId` if it's no longer in `currentItemIds`.

**Perf bench:**
- Threshold flaky on slow CI machines → 1.5x relaxation in CI via `process.env.CI`. Add CI machine specs to bench-report.json so future flakes can be diagnosed.
- jsdom render missing real layout cost → caveat in test comments. v0.2 replaces with Playwright; meanwhile, jsdom verifies "no order-of-magnitude regression" not "absolute correctness."

**User docs:**
- Markdown links break (deleted file, renamed heading) → CI runs `lychee` (or `markdown-link-check`) on `docs/user-guide/*.md` and `README.md`; fails on broken links.
- Cheat sheet drifts from `bindings.ts` → README in `docs/user-guide/` includes a comment header referencing `src/hooks/keyboard/bindings.ts` as source of truth; cheat sheet maintenance is a manual step. v0.2 generates the cheat sheet from `bindings.ts` automatically.

**Community files:**
- Issue templates ask for fields users don't want to share → all fields except "what happened" / "expected behavior" are optional. Diagnostics output is encouraged but not required.
- CI workflow flakes (npm install timeout, network blip) → the workflow has a single retry on the install step; tests/build do NOT retry (would mask flaky tests).

**Decision-log compliance:**
- Each Phase 1.5 sub-spec commit must update `docs/decisions.md`. The pre-commit hook installed in forge-init Step 6g enforces this. Bypass only with `git commit --no-verify`.

## Success Criteria

1. axe-core CI test passes with zero violations of severity `moderate` or higher across 6 representative `<DashboardRoot>` states (empty, populated, item-selected, search-active, popover-open, all-read).
2. Vitest perf suite verifies the three AC #16 thresholds (200ms initial render with 100 feeds, 55 FPS scroll over 1000 items, 150ms search over 5000 items); CI gate blocks merge on regression with 1.5x relaxation in CI.
3. `docs/user-guide/` contains 6 concrete markdown files (README, getting-started, keyboard-cheatsheet, opml-import, bases-setup, troubleshooting), each ≥40 lines.
4. Repo includes `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, 3 `.github/ISSUE_TEMPLATE/*.md` files + `config.yml`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/dependabot.yml`, and `.github/workflows/ci.yml`.
5. CI workflow runs on PR and push-to-main, executing 6 gates (typecheck, lint, test, axe a11y, perf bench, bundle size); a representative PR shows all 6 passing.
6. Settings tab "Support" section has a "Copy Diagnostics" button that opens a Radix Dialog preview, then copies a PII-scrubbed JSON payload to the clipboard. Tests positively verify the shape AND negatively assert the absence of URLs, titles, paths, emails, and IPs.
7. Decision-log enforcement remains active — every Phase 1.5 commit appends a `docs/decisions.md` entry.
8. Phase 1 acceptance criteria continue to pass — Phase 1.5 changes do not regress any Phase 1 AC. Verified by running the SS-17 integration test as a final check.

## Exclusions

Explicitly **deferred to v0.2** (not abandoned — named follow-up):

- Static documentation site (VitePress / GitHub Pages with markdown rendering, search, versioned docs)
- Voice navigation hooks (e.g., dragonfly/voice-control integration)
- High-contrast mode toggle (independent of OS contrast preferences)
- `prefers-reduced-motion` respect for animations and pulse effects
- Playwright-based real-Electron perf bench (replaces Vitest jsdom bench)
- In-app log viewer (settings → Logs tab with filter, search, export)
- Migration guides for FreshRSS / Inoreader / Newsboat / NetNewsWire users
- Public roadmap markdown
- GitHub Discussions enablement
- Auto-generated cheat sheet from `bindings.ts`
- Minor axe-core violations (only moderate+ block in v0.1)
- Crash reporting / telemetry (explicit non-goal — never)

Explicitly **out of scope, period:**

- Telemetry, analytics, or any phone-home (matches Phase 1 exclusions)
- Replacing Phase 1 architecture decisions (a11y wraps existing components; never rewrites them)
- New runtime dependencies beyond the canonical Phase 1 set, except: `@axe-core/react` (dev-only) and `lychee` or `markdown-link-check` (dev-only). All net-new deps are dev-dependencies, never runtime.

## Open Questions

1. **Vitest perf threshold relaxation factor in CI:** 1.5x is a guess. After first 5 PRs of bench data, calibrate against actual CI variance (recommendation: relax until p95 of green PRs is ≥10% below threshold).
2. **axe-core severity floor for blocking:** `moderate` is the proposed floor. If real audit produces too many false positives, raise to `serious`. Recommend starting at `moderate` and tightening only after data.
3. **Cheat sheet drift from `bindings.ts`:** v0.2 auto-generates this. Phase 1.5 accepts manual maintenance with a header comment and a CI lint that fails if `bindings.ts` changes without `keyboard-cheatsheet.md` in the same PR.
4. **Diagnostics: include cache size estimate?** IndexedDB row count is cheap, byte estimate is expensive. Recommendation: include row count, omit byte estimate.
5. **CONTRIBUTING — branch naming convention:** suggest `feat/SS-NN-short-slug`, `fix/short-slug`, `docs/short-slug`, `chore/short-slug`. Confirm or override.
6. **CHANGELOG seeding for v0.1:** every Phase 1 sub-spec → CHANGELOG entry, or a single "Initial release" entry? Recommendation: single "Initial release" with bullet list of capabilities (matches Phase 1 ACs).
7. **SECURITY disclosure SLA:** GitHub Security Advisories support 90-day default. Phase 1.5 accepts default; document in SECURITY.md.
8. **Issue templates — diagnostics output requested?** Encouraged but not required (otherwise users without the install can't file bugs). Recommendation: include a "Diagnostics output (paste from Settings → Support)" section labelled optional.
9. **Bundle-size CI gate threshold revisit:** SS-01 set ≤1.5MB / ≤400KB. After Phase 1 ships, measure actual; tighten if comfortable.

## Approaches Considered

- **Approach A — Polish minimum (~1–2 weeks):** Lightweight version of every gap parallel to main build. *Not selected.* Leaves a noticeable a11y gap (no focus management depth, no live regions); perf "tests" are present but not gated; user docs are stub-level. Workable but inconsistent with the brain dump's "feels like real application" goal.
- **Approach B — Polish premium (~3–4 weeks):** Top-shelf across every gap including VitePress docs site, voice nav, full motion/contrast a11y, Playwright real-Electron perf bench, in-app log viewer. *Not selected.* Inverts the priority order — premium polish is `advanced_features`, which is the lowest priority. Scope creep risk on the docs site alone.
- **Approach C — Polish phased (Selected):** Must-ship-with-v0.1 polish now, premium pieces named for v0.2. Matches priority order; sized at ~2 weeks; clean stopping point.

## Commander's Intent

**Desired End State.** Phase 1.5 is done when: (a) axe-core CI gate passes with zero ≥moderate violations across 9 representative states; (b) Vitest perf bench gates merge on regression of jsdom-measurable proxies for AC #16 with documented "what is / is not measured" caveats; (c) `docs/user-guide/` has 6 concrete files (≥40 lines each) covering getting-started, keyboard, OPML, Bases, troubleshooting, plus a TOC; (d) `.github/` carries CONTRIBUTING, SECURITY, CHANGELOG, 3 issue templates, PR template, dependabot, and a `ci.yml` running 7 gates with concurrency-cancel + 10min timeouts; (e) Settings tab "Support" section copies a PII-scrubbed Diagnostics JSON to clipboard, including `installedSinceDays` and `__BUILD_INFO__`; (f) all Phase 1 ACs continue to pass — Phase 1.5 is non-regressive.

**Purpose.** Phase 1 ships a working RSS reader. Phase 1.5 makes it *complete*: accessible (ARIA + focus management), measurable (perf gates), documented (cheat sheet + OPML/Bases guides), supportable (Diagnostics + CONTRIBUTING + SECURITY + CHANGELOG + CI), without inflating scope. This is the "feels like real application" layer the brain dump promised.

**Constraints (MUST):**
- MUST be purely additive to Phase 1 — no Phase 1 sub-spec gets re-opened, no Phase 1 AC regresses.
- MUST keep main bundle within Phase 1's ≤1.5MB / ≤400KB budget. New runtime deps are forbidden; only dev-deps allowed (`@axe-core/react`, `lychee` or `markdown-link-check`, optional `@axe-core/playwright` deferred to v0.2).
- MUST pin `axe-core` and `@axe-core/react` versions exactly (no `^` or `~`).
- MUST honor decision-log enforcement on every Phase 1.5 commit.
- MUST NOT introduce real runtime telemetry, analytics, or phone-home — Diagnostics is local-only, user-initiated, clipboard-only.
- MUST NOT bundle docs content into the plugin — docs are repo-only in v0.1.
- MUST NOT modify `data.json` schema (Phase 1's `schemaVersion` stays at 1).

**Constraints (MUST NOT):**
- MUST NOT extend Phase 1 components beyond ARIA attributes and focus wrapping. Internal logic is Phase 1's; Phase 1.5 only wraps.
- MUST NOT introduce a docs site, in-app log viewer, voice nav, motion-reduction, or contrast toggle in v0.1 (those are explicit v0.2 deferrals).
- MUST NOT couple tracks to each other — they run in parallel; if Track E fails, Tracks D/F/G/H still ship.

**Freedoms (the implementing agent MAY):**
- MAY pick exact axe rule allow-list within "moderate+ blocks" floor.
- MAY choose between `lychee` and `markdown-link-check` for broken-link CI.
- MAY pick CHANGELOG entry phrasing (Keep-a-Changelog format only).
- MAY rename internal a11y helper module names within `src/components/a11y/`.
- MAY pick the exact Logger ring-buffer entry shape (`{level, message, timestamp}` minimum).
- MAY decide bench fixture deterministic-seed value.
- MAY pick `docs/dev/release-readiness.md` checklist item ordering (must include all gates from Phase 1 + Phase 1.5 ACs).
- MAY reorganize `__tests__/a11y/` and `__tests__/perf/` folder structure within Vitest conventions.

## Execution Guidance

**Observe (signals to monitor):**
- TypeScript compiler errors — must be zero.
- ESLint warnings on changed files — must be zero.
- Vitest unit tests, axe a11y tests, perf bench — all PR-blocking.
- Bundle-size CI gate (Phase 1's `scripts/check-bundle-size.mjs`) — must remain green.
- Phase 1 SS-17 integration test — must remain green (non-regression).
- `docs-sync` workflow — flags `bindings.ts` ↔ `keyboard-cheatsheet.md` drift.

**Orient (context to maintain):**
- Phase 1's owns/does-not-own discipline applies to Phase 1.5 additions (a11y helpers are utilities, not components).
- Logger is the only place `console.*` is allowed — adding `getRecentEntries` does not change that.
- Settings tab pattern is established by Phase 1 SS-16 (`SettingsTab.ts` + `defaultSettings.ts`); Phase 1.5 mounts new sections but does not alter the tab structure.
- shadcn primitives are copy-in (not imported from a library); Track H may need to copy in Radix Dialog if not yet present.
- Tests live in `__tests__/` co-located with `src/` modules; `__mocks__/obsidian.ts` is the shared Obsidian mock.

**Escalate When (stop and ask the human):**
- A Phase 1 AC would regress to satisfy Phase 1.5 work.
- The bundle-size budget would be exceeded after Phase 1.5 changes (none are expected to add runtime weight, but a11y helpers could).
- Real-FPS measurement is requested (must be deferred to v0.2 Playwright; do not attempt in jsdom).
- A new runtime dependency is needed beyond the canonical set + `@axe-core/react` (dev) + link-checker (dev).
- axe-core severity floor needs to change from `moderate` to `serious` (might suppress real issues).
- CI workflow runner choice needs changing from `ubuntu-latest` only.
- A track's scope creeps into another track's territory (e.g., Track D wants to ship a log viewer — that's v0.2 Track H Premium).

**Shortcuts (apply without deliberation):**
- Vitest tests follow the existing `__tests__/{module}.test.ts` pattern.
- ARIA roles use the WAI-ARIA Authoring Practices defaults (e.g., `role="listbox"` + `aria-activedescendant` for the item list — already in the spec).
- CHANGELOG follows Keep-a-Changelog (`Added/Changed/Fixed/Deprecated/Removed/Security` sections per version).
- Issue templates follow GitHub's standard YAML form syntax.
- PII scrubber uses well-known regexes for URL (`https?://…`), email (`[\\w.-]+@[\\w.-]+\\.[\\w.-]+`), IPv4 (`\\d+\\.\\d+\\.\\d+\\.\\d+`), and POSIX/Windows path patterns.
- Markdown link-checker `lychee` invocation: `lychee --cache --max-cache-age 1d 'docs/**/*.md' 'README.md'`.

## Decision Authority

**Agent decides autonomously:**
- Test-file naming, fixture content, exact axe rule list within the "moderate+" floor.
- CHANGELOG entry wording (must follow Keep-a-Changelog format).
- Issue template field order and copy.
- README link styling and section ordering.
- Tailwind class names within the `smd-` prefix.
- Logger ring-buffer entry shape (minimum `{level, message, timestamp}`).
- A11y helper module names within `src/components/a11y/`.
- Bench fixture seed values.
- `docs/dev/release-readiness.md` checklist ordering.

**Agent recommends, human approves:**
- axe severity floor change (moderate → serious, or moderate → minor).
- Bench threshold relaxation factor change (1.5x → other).
- New dev dependency beyond `@axe-core/react` + link-checker.
- CI workflow runner OS change (ubuntu-latest → matrix).
- Logger ring-buffer size change (default 200 → other).
- Diagnostics output schema change (adding/removing top-level fields).
- Issue/PR template breaking changes after v0.1.

**Human decides:**
- Any change to Phase 1 ACs (Phase 1.5 must NOT regress them).
- Public-disclosure SLA in SECURITY.md.
- Branding decisions (logo placement, color palette in docs).
- Phase 1 → Phase 2 cutover criteria.
- Whether to ship Phase 1.5 to obsidian-releases gallery on its own or only as part of Phase 1's v0.1.

## War-Game Results

**Most Likely Failure.** axe-core minor-version bump (e.g., 4.10.x → 4.11.x) introduces new rules → CI fails on every PR until rules are reviewed. **Mitigation:** exact-version pinning (IG-3 fix). Upgrade is intentional, gets its own PR with audit and conscious rule decisions.

**Scale Stress.** Phase 1.5 doesn't add scale risk per se — it adds verification. Risk: jsdom perf bench runs at scale (1000-card list) but jsdom DOM mutation cost may diverge from real Electron paint cost by 10x or more, so passing CI doesn't guarantee real performance. **Mitigation:** explicit "what is / is not measured" caveat in each `.bench.ts` file; v0.2 Playwright bench validates real performance. Phase 1.5 bench only gates "do not regress the React reconciliation cost," which is a meaningful invariant.

**Dependency Risk.** `lychee` (broken-link-checker) hits GitHub rate limits when run on PRs from forks or in tight CI loops. **Mitigation:** `--cache --max-cache-age 1d` + scope to repo-relative links only (no external link-checking by default); fallback to `markdown-link-check` if `lychee` proves unreliable. axe-core is the next-most-critical dep; pinning addresses it.

**Maintenance Assessment (6-month read-through).** Strong. Five tracks are independent and clearly bounded. Track D's a11y helpers are reusable; Track H's Diagnostics is a single service; Track E's bench files have explicit caveats; Track F's docs are markdown; Track G's repo files are GitHub-standard. The biggest 6-month risk: cheat sheet drift if `docs-sync` CI lint is ever bypassed via `[skip-docs-sync]` PR titles. Recommend documenting the bypass policy in CONTRIBUTING (only for non-binding changes).

## Evaluation Metadata

- Evaluated: 2026-05-08
- Cynefin Domain: Complicated
- Critical Gaps Found: 0 (0 resolved)
- Important Gaps Found: 7 (7 resolved)
- Suggestions: 3 (3 incorporated — `installedSinceDays` in Diagnostics, harness reference in CONTRIBUTING, release-readiness checklist)
- Assumptions audited: 13 (3 high-severity flagged: ASM-2 jsdom paint cost, ASM-3 jsdom FPS impossibility, ASM-6 Logger ring buffer absence — all resolved by spec changes)

## Next Steps

- [ ] `/forge-evaluate docs/plans/2026-05-08-phase-1-5-quality-layer-design.md` — surface hidden assumptions before speccing.
- [ ] `/forge` on the evaluated design — produces the Phase 1.5 master spec with 5 sub-specs (one per track).
- [ ] `/forge-prep` on the master spec — expands sub-specs into phase specs with TDD steps.
- [ ] `/forge-red-team` on the master spec only — adversarial review of the master.
- [ ] Pin Open Question #2 (axe-core severity floor) and #3 (cheat-sheet drift policy) before Track D and Track F sub-specs run.
- [ ] After Phase 1 SS-17 ships and Phase 1.5 ships → tag `v0.1.0`, attach `main.js` / `styles.css` / `manifest.json` to GitHub release, open PR to `obsidianmd/obsidian-releases` for community gallery listing.
- [ ] Phase 2 design pass: V0.2 quality premium (full a11y, Playwright bench, VitePress site, log viewer, migration guides) + OPML export + MiniSearch + mobile readiness.
