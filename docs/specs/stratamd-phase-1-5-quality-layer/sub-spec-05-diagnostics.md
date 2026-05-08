---
sub_spec_id: SS-05
phase: run
depends_on: []
dispatch: factory
title: "Diagnostics + Logger Ring Buffer + Build Info"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 1
---

# SS-05 — Diagnostics Service + Logger Ring Buffer + Build Info

## Summary

Settings → Support → "Copy Diagnostics" emits a PII-scrubbed JSON payload to the clipboard via a Radix Dialog preview. Three concrete pieces: (1) extend Phase 1's `Logger` with `getRecentEntries(n)` backed by an in-memory FIFO ring buffer (size 200) — non-breaking; (2) inject a `__BUILD_INFO__` constant via esbuild `--define` + post-build replacement carrying `bundleSize`/`gzipSize`/`buildDate`/`gitSha`; (3) `Diagnostics` service that collects only counts/metadata (never URLs/titles/paths) plus a defense-in-depth PII scrubber.

## Implementation Steps (TDD)

1. **Write failing Logger ring-buffer test.** `__tests__/Logger.ringBuffer.test.ts`: emit 250 entries, call `Logger.getRecentEntries(200)`, assert exactly 200 entries returned in chronological order, oldest 50 dropped (FIFO).
2. **Extend `src/services/Logger.ts`** — add a private `ringBuffer: LogEntry[] = []` (max 200), and `getRecentEntries(n: number = 200): LogEntry[]` returning a copy. Each existing `error/warn/info/debug` method appends `{level, message, timestamp: Date.now()}` to the buffer (FIFO eviction at length 200) **before** the existing console output. Public method signatures of the four level methods are unchanged.
3. **Run ring-buffer test — passes.**
4. **Define `__BUILD_INFO__` shape** in `src/services/diagnostics/buildInfo.ts`:
   ```ts
   export type BuildInfo = { bundleSize: number; gzipSize: number; buildDate: string; gitSha: string };
   declare const __BUILD_INFO__: BuildInfo;
   export function getBuildInfo(): BuildInfo | null {
     try { return __BUILD_INFO__; } catch { return null; }
   }
   ```
5. **Modify `esbuild.config.mjs`** — add a post-build step that reads `main.js` (size + gzip), reads `git rev-parse HEAD`, formats `buildDate` as ISO 8601, then re-runs esbuild with `--define:__BUILD_INFO__=…` (or sed-replaces the constant in the bundle). Implementation choice: a small `scripts/inject-build-info.mjs` post-step is cleaner.
6. **Write failing PII-scrubber test.** `__tests__/diagnostics/PIIScrubber.test.ts`: feed a payload containing a URL, a Windows path, an email, and an IPv4. Assert all four are replaced with `[REDACTED]`. Assert non-PII strings pass through unchanged.
7. **Implement `src/services/diagnostics/PIIScrubber.ts`** — `scrub(input: unknown): unknown` recursively walks objects/arrays. For each string leaf, run regex replacements:
   - URL: `/https?:\/\/[^\s"']+/g` → `[REDACTED]`
   - Windows path: `/[A-Za-z]:\\[^\s"'<>|]+/g` → `[REDACTED]`
   - POSIX path: `/(?:^|[\s"'])(\/[a-zA-Z][a-zA-Z0-9._/-]*)/g` → `[REDACTED]` (conservative — only paths starting with `/` followed by a letter)
   - Email: `/[\w.+-]+@[\w-]+\.[\w.-]+/g` → `[REDACTED]`
   - IPv4: `/\b(?:\d{1,3}\.){3}\d{1,3}\b/g` → `[REDACTED]`
   Non-string leaves pass through unchanged.
8. **Run scrubber test — passes.**
9. **Write failing Diagnostics test.** `__tests__/Diagnostics.test.ts`: seed Logger with 5 entries containing a feed URL, an item title, and a vault path. Call `diagnostics.collect()`. Positive: payload has `pluginVersion`, `obsidianAppVersion`, `osPlatform`, `feedCount`, `itemCount`, `userStateCounts`, `bundleSize`, `gzipSize`, `buildDate`, `gitSha`, `installedSinceDays`, `recentLogs`. Negative: `JSON.stringify(payload)` contains NO `https?://` substring, NO email pattern, NO IPv4 pattern, NO known feed URL or item title from the test fixture.
10. **Implement `src/services/Diagnostics.ts`** — `class Diagnostics` constructor takes `Container` reference. `collect()`:
    - reads `app.manifest.version`, `app.appVersion`, `process.platform`
    - reads from `useStrataStore.getState()`: `feedCount = feeds.size`, `itemCount = items.size`, `userStateCounts = { read: readIds.size, saved: savedIds.size, starred: starredIds.size, ignored: ignoredIds.size }`
    - reads `getBuildInfo()` for build fields (gracefully omits if `null` and adds `_buildInfoSource: "missing — likely development build"`)
    - computes `installedSinceDays` from `data.json`'s first-write timestamp (read via `app.vault.adapter.stat` on the data file)
    - reads `Logger.getRecentEntries(200)` for `recentLogs`
    - assembles object, runs through `PIIScrubber.scrub`, returns
11. **Run Diagnostics test — passes.**
12. **Validate Radix Dialog primitive presence.** Glob for `src/components/ui/dialog.tsx` (shadcn convention). If absent, copy in via the shadcn CLI pattern or hand-author from Radix `@radix-ui/react-dialog` (already a transitive dep via shadcn). Document in commit which path was taken.
13. **Implement `<DiagnosticsSection>`** in `src/components/settings/DiagnosticsSection.tsx`:
    - Renders a heading "Support" + brief description of what's collected (counts + metadata, NO URLs/titles/paths) + what's NOT collected.
    - "Copy Diagnostics" button → opens Radix Dialog showing `JSON.stringify(payload, null, 2)` in a `<pre>` block + Copy button.
    - Copy button calls `navigator.clipboard.writeText(payload)` and triggers an Obsidian `Notice` with text "Diagnostics copied to clipboard".
    - Fallback when clipboard API rejects: keep the Dialog open with a "Select All" helper hint.
14. **Modify `src/settings/SettingsTab.ts`** — mount `<DiagnosticsSection>` under a "Support" group at the bottom of the tab.
15. **Manual smoke test in Obsidian.** Copy. Paste into editor. Visually verify NO feed URLs, NO item titles, NO vault paths, NO emails, NO IPs.
16. **Commit.** Suggested: `feat(ss-05): Diagnostics service + Logger ring buffer + __BUILD_INFO__ injection`.

## Interface Contracts

**Provides** (within Phase 1.5, internal only):
- `Logger.getRecentEntries(n)` — extension to Phase 1's Logger; non-breaking.
- `__BUILD_INFO__` constant — internal to Diagnostics; not consumed by other Phase 1.5 sub-specs.

**Requires** (external — Phase 1):
- Phase 1 SS-02 `Logger` service, `Container` registry.
- Phase 1 SS-04 `useStrataStore` for counts.
- Phase 1 SS-12/SS-16 settings tab for mount point.
- Phase 1 SS-12 / Radix Dialog primitive (validated at sub-spec start).

## Verification Commands

```bash
npm test -- Logger Diagnostics PIIScrubber
npm run build && grep -q "bundleSize" main.js     # __BUILD_INFO__ injection took effect
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| `Diagnostics.ts` exists | [STRUCTURAL] | `test -f src/services/Diagnostics.ts \|\| (echo "FAIL: Diagnostics.ts missing" && exit 1)` |
| `PIIScrubber.ts` exists | [STRUCTURAL] | `test -f src/services/diagnostics/PIIScrubber.ts \|\| (echo "FAIL: PIIScrubber.ts missing" && exit 1)` |
| `buildInfo.ts` exists | [STRUCTURAL] | `test -f src/services/diagnostics/buildInfo.ts \|\| (echo "FAIL: buildInfo.ts missing" && exit 1)` |
| `<DiagnosticsSection>` exists | [STRUCTURAL] | `test -f src/components/settings/DiagnosticsSection.tsx \|\| (echo "FAIL: DiagnosticsSection.tsx missing" && exit 1)` |
| Logger has getRecentEntries | [STRUCTURAL] | `grep -q "getRecentEntries" src/services/Logger.ts \|\| (echo "FAIL: Logger.getRecentEntries missing" && exit 1)` |
| Logger ring-buffer FIFO size 200 | [STRUCTURAL] | `grep -q "200" src/services/Logger.ts \|\| (echo "FAIL: Logger ring-buffer size missing" && exit 1)` |
| __BUILD_INFO__ defined in esbuild config | [STRUCTURAL] | `grep -q "__BUILD_INFO__\|inject-build-info" esbuild.config.mjs \|\| (echo "FAIL: __BUILD_INFO__ injection not configured" && exit 1)` |
| SettingsTab mounts DiagnosticsSection | [STRUCTURAL] | `grep -q "DiagnosticsSection" src/settings/SettingsTab.ts \|\| (echo "FAIL: SettingsTab missing DiagnosticsSection" && exit 1)` |
| Logger ring-buffer test passes | [MECHANICAL] | `npm test -- Logger.ringBuffer \|\| (echo "FAIL: Logger ring-buffer test" && exit 1)` |
| PII scrubber test passes | [MECHANICAL] | `npm test -- PIIScrubber \|\| (echo "FAIL: PIIScrubber test" && exit 1)` |
| Diagnostics test passes (positive + negative) | [MECHANICAL] | `npm test -- Diagnostics \|\| (echo "FAIL: Diagnostics test" && exit 1)` |
| Production bundle has __BUILD_INFO__ values | [MECHANICAL] | `npm run build >/dev/null 2>&1 && grep -q "bundleSize" main.js \|\| (echo "FAIL: __BUILD_INFO__ not injected into main.js" && exit 1)` |
