---
date: 2026-05-08
title: "StrataMD Phase 1 — Ultimate Obsidian RSS Reader"
client: personal
project: StrataMD
repo: StrataMD (greenfield, bootstrap from obsidian-sample-plugin)
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
  - obsidian-plugin
---

# StrataMD Phase 1 — Ultimate Obsidian RSS Reader

## Meta
- **Client:** personal
- **Project:** StrataMD
- **Repo:** StrataMD (greenfield — bootstrap from `obsidian-sample-plugin`)
- **Date:** 2026-05-08
- **Author:** Caleb Bennett
- **Source design:** `docs/plans/2026-05-08-stratamd-phase-1-rss-reader-design.md` (evaluated 2026-05-08)
- **Quality score:** 34/35 (Outcome 5 / Scope 5 / Decision Guidance 5 / Edge Coverage 4 / Acceptance Criteria 5 / Decomposition 5 / Purpose Alignment 5)
- **Backlogged sub-specs:** External Actions Service (mpv / yt-dlp) → `docs/backlog/stratamd-external-actions-mpv-yt-dlp.md`

## Outcome

Phase 1 is done when an Obsidian user can: open the StrataMD dashboard as a full tab; add RSS, Atom, YouTube channel/playlist, or arbitrary website URLs and have feeds discovered automatically; import an OPML file; navigate items with the keyboard alone (Newsboat/Vim bindings); read articles and watch YouTube videos in the preview pane; save items to the vault as Bases-compatible markdown notes intentionally (never automatically); and have the dashboard remain visibly responsive while 100+ feeds are subscribed. All 18 acceptance criteria pass when run against a test vault with 100 mixed feeds.

## Intent

**Trade-off hierarchy (highest to lowest priority when valid approaches conflict):**
1. **Stability of the RSS reader** over feature breadth.
2. **Excellent user experience** (responsiveness, keyboard-first, low click count) over visual flair.
3. **Polished UI** over advanced features.
4. **Extensible architecture** (adapter pattern, store-as-truth, owns/does-not-own discipline) over short-term coding shortcuts.
5. **Advanced features** last.

**Preferences (soft guidelines):**
- Prefer minimal runtime dependencies over convenience libraries. Hand-rolled IndexedDB wrapper preferred over `idb` if size matters.
- Prefer concrete file paths over globs in sub-spec File lists.
- Prefer tree-shaking and lazy imports over conditional bundling tricks.
- Prefer Obsidian theme variables over custom palettes for colors that already have semantic meaning (text, background, accent).

**Decision boundaries — escalate to human when:**
- A new runtime dependency is needed beyond the canonical list (see `## Constraints` → Musts).
- The bundle-size budget would be exceeded after tree-shaking + lazy-loading attempts.
- A `data.json` schema change is needed after the first published version (requires migration plan).
- The owns/does-not-own rules feel like they need an exception.
- shadcn/Radix portal mounting conflicts with Obsidian DOM in unexpected ways and the `PortalRoot` wrapper fallback is insufficient.
- YouTube channel/playlist URL pattern resolution fails for a meaningful class of inputs.
- Mobile platform behavior diverges in a way that needs more than a `Platform.isDesktop` check.

**Decided (no further escalation):**
- State management: Zustand (not Context).
- Storage tier: `data.json` for hot small state + IndexedDB for items, item bodies, extracted articles.
- Network: Obsidian's `app.requestUrl` (never `fetch`).
- Virtualization: `@tanstack/react-virtual` (default; `react-window` acceptable if implementer prefers).
- Tailwind prefix: `smd-` (implementer may rename if it conflicts; document if changed).
- YouTube channel resolution: HTML scrape of `meta[itemprop=channelId]`. Plan-B (scrape-based or yt-dlp-based item discovery) is documented but not built in Phase 1; YouTubeAdapter must expose a Plan-B seam interface.
- OPML: import-only in Phase 1. Export deferred to Phase 2.
- Search: in-memory substring match on title + summary. MiniSearch deferred to Phase 2.
- Mobile: desktop-first. Mobile lands as a follow-up; Phase 1 must hide desktop-only features cleanly via `Platform.isDesktop` but does not need to ship to mobile stores.

## Context

StrataMD is a greenfield Obsidian community plugin that aims to become the definitive RSS and media intake reader inside Obsidian — Google Reader's spiritual successor, Tiny Tiny RSS modernized, Newsboat with a real GUI. The plugin is full-tab dashboard centric (3-pane: feeds / items / preview) and treats note creation as intentional, never automatic.

**Source design:** `docs/plans/2026-05-08-stratamd-phase-1-rss-reader-design.md` (status: evaluated). The design was produced via `/forge-brainstorm` and stress-tested via `/forge-evaluate`. It contains Commander's Intent, Execution Guidance, RAPID Decision Authority map, War-Game Results, Bundle Strategy, Empty States, and 18 acceptance criteria.

**Architecture summary** (full diagram in design doc):
- Five horizontal layers: Plugin Shell → React Tree → Zustand Store → Services → Storage Tier (data.json + IndexedDB).
- Source adapters (RSS, YouTube, WebsiteAutodiscovery, Mock) implement a uniform `ISourceAdapter` interface so future Rumble/Odysee/Podcast adapters drop in cleanly.
- Refresh scheduler runs as a service (not a React effect) with concurrency cap 4, staggering, retry/backoff, and last-good-cache preservation.
- Network always goes through `app.requestUrl` for CORS-free desktop fetches and mobile sandbox compatibility.

**Owns / does-not-own discipline (non-negotiable):**
- Components own *layout and interaction*, never I/O.
- Hooks own *subscription wiring*, never persistence.
- Store owns *current truth*, never side effects.
- Services own *side effects*, never React state.
- Adapters own *source-specific knowledge*, never UI.

## Requirements

1. The plugin registers a custom `ItemView` (`stratamd`) that opens as a full tab via command, ribbon icon, or settings shortcut.
2. Users can manually add RSS, Atom, YouTube channel (`@handle`, `/channel/`, `/user/`, `/c/`), YouTube playlist, or arbitrary website URLs.
3. Website URLs autodiscover their feed via `<link rel="alternate" type="application/rss+xml">` and common fallback paths (`/feed`, `/rss`, `/atom.xml`).
4. Users can import OPML 1.0/2.0 subscription files (export deferred to Phase 2).
5. Item cards render with thumbnails, titles, dates, source name, and excerpt where available; lists are virtualized.
6. Article previews render via Readability-first extraction with fallback chain (extracted → `content:encoded` → summary → "no preview" pane). Extraction code is lazy-loaded.
7. YouTube items render as embeds (thumbnail-first, iframe on click).
8. Notes save with templated, Bases-compatible frontmatter (`type`, `status`, `source`, `url`, `category`, `tags`, `published`, `saved_at`).
9. Note routing rules: category → feed → media-type → fallback inbox.
10. Keyboard navigation supports Newsboat/Vim/Google-Reader-style bindings: `j/k` next/prev, `n/p` synonyms, `o` open original, `s` save, `*` star, `r` refresh, `/` search, `m` mark read, `gg/G` top/bottom.
11. Refresh scheduler runs in the background with concurrency cap 4, staggers requests, respects per-feed intervals, dedupes in-flight, retries with exponential backoff, and preserves last-good cache on failure.
12. Search filters items via 150ms-debounced substring match on title + summary.
13. Empty states render correctly for first-launch, zero-item smart views, zero search results, all-read feeds, never-refreshed feeds, and no-selection preview.
14. User state (read/saved/starred) is persisted via debounced `data.json` writes during normal operation and flushed synchronously on `plugin.onunload`.
15. Item bodies and extracted articles persist in IndexedDB with periodic pruning of items older than `pruneAfterDays` (default 30) that are not in `savedIds | starredIds`.
16. Plugin remains responsive with 100+ subscribed feeds and tens of thousands of cached items. **Measurable proxies:** initial dashboard render <200ms with 100 feeds in `userState`; scroll FPS ≥55 over a 1000-item virtualized list; search query → results <150ms over 5000 items.
17. Production bundle size ≤1.5MB minified, ≤400KB gzipped, enforced by CI.
18. Single feed failures are isolated and never break the dashboard or other feeds.
19. `data.json` and IndexedDB are both schema-versioned; corrupt/unreadable state files fall back to defaults with a one-time banner instead of crashing the plugin.
20. A `StrataMD: Rebuild Cache` command exists that drops IndexedDB and re-fetches all subscribed feeds without touching `userState`.

### Tiering (graceful-slip plan)

If implementation runs over and triage is needed, ship in tiers rather than all-or-nothing:

- **Tier 1 — must ship in v0.1:** R1, R2, R3, R5, R6, R7, R8, R9, R10, R11, R13, R14, R15, R17, R18, R19. The reader works end-to-end for RSS/Atom/YouTube, with notes and Bases support. OPML import (R4) is high-priority but can ship in v0.1.1 if needed.
- **Tier 2 — can ship in v0.1.x patch:** R4 (OPML), R12 (search debounce — can ship with a placeholder no-op search initially), R20 (Rebuild Cache).
- **Tier 3 — quality bar / measurable in v0.2:** R16 (smoothness proxies — measured but not gating release).

The integration test in SS-17 still verifies all requirements when run end-to-end; tiering only governs slip prioritization.

## Sub-Specs

---
sub_spec_id: SS-01
phase: run
depends_on: []
---

### 1. Project Bootstrap & Build Pipeline

- **Scope:** Initialize the plugin from `obsidian-sample-plugin` and configure build, lint, format, test, and bundle-size CI gating. No runtime feature code beyond an empty `StrataMDPlugin` with `onload`/`onunload` stubs.
- **Files (new):**
  - `manifest.json`
  - `versions.json`
  - `package.json`
  - `tsconfig.json`
  - `esbuild.config.mjs`
  - `tailwind.config.ts`
  - `postcss.config.cjs`
  - `.eslintrc.cjs`
  - `.prettierrc`
  - `vitest.config.ts`
  - `src/main.ts`
  - `src/settings.ts`
  - `src/styles.css`
  - `__mocks__/obsidian.ts`
  - `scripts/check-bundle-size.mjs`
  - `README.md`
  - `.gitignore`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[MECHANICAL]` `npm install` runs cleanly with zero peer-dependency errors.
  - `[MECHANICAL]` `npm run build` produces `main.js`, `styles.css`, and `manifest.json` in the project root.
  - `[MECHANICAL]` `node scripts/check-bundle-size.mjs main.js` exits 0 when `main.js` ≤1.5MB minified and ≤400KB gzipped; exits 1 otherwise.
  - `[MECHANICAL]` `npm run lint` returns 0 errors.
  - `[MECHANICAL]` `npm run typecheck` (`tsc --noEmit`) returns 0 errors.
  - `[MECHANICAL]` `npm test` runs Vitest and exits 0 with at least one passing smoke test.
  - `[STRUCTURAL]` `tailwind.config.ts` sets `prefix: 'smd-'` and `content: ['./src/**/*.{ts,tsx}']`.
  - `[STRUCTURAL]` `.eslintrc.cjs` includes a `no-restricted-globals` rule banning `fetch` and a `no-restricted-syntax` rule banning `console.log/warn/error/info` outside `src/services/Logger.ts`.
  - `[STRUCTURAL]` `esbuild.config.mjs` sets `minify: true`, `bundle: true`, `treeShaking: true`, externalizes `obsidian`, and emits a metafile.
  - `[STRUCTURAL]` `manifest.json` declares `id: "stratamd"`, `name: "StrataMD"`, `isDesktopOnly: false`, and a sane `minAppVersion`.
  - `[BEHAVIORAL]` Plugin loads in a fresh test vault without errors (manual smoke test in dev Obsidian instance).

---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
---

### 2. Models, Logger, Container, and Adapter Interface

- **Scope:** Foundational types shared by every other sub-spec, plus the `Logger` service and `Container` registry, plus the `ISourceAdapter` interface that all source adapters implement.
- **Files (new):**
  - `src/models/FeedSource.ts`
  - `src/models/FeedItem.ts`
  - `src/models/UserState.ts`
  - `src/models/Health.ts`
  - `src/services/Logger.ts`
  - `src/services/Container.ts`
  - `src/services/adapters/ISourceAdapter.ts`
  - `__tests__/Logger.test.ts`
- **Files (modify):**
  - `src/main.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `FeedSource` type includes `id, url, displayName, sourceType, category?, tags[], refreshIntervalMin, health, notifyOnNew, pruneAfterDays?`.
  - `[STRUCTURAL]` `FeedItem` type includes `id, feedId, sourceType, title, url, author?, published, summary?, thumbnailUrl?, mediaType, durationSec?`.
  - `[STRUCTURAL]` `UserState` type includes `readIds: Set<string>, savedIds: Set<string>, starredIds: Set<string>, ignoredIds: Set<string>, scrollPositions: Record<string, number>`.
  - `[STRUCTURAL]` `ISourceAdapter` interface declares `name: string`, `detect(url: string): boolean`, `resolve(url: string): Promise<FeedSource | FeedSource[]>`, `fetch(source: FeedSource): Promise<unknown>`, `parse(raw: unknown): FeedItem[]`.
  - `[STRUCTURAL]` `Logger` exposes `error / warn / info / debug` methods; level reads from `process.env.NODE_ENV` (`debug` in dev, `warn` in prod).
  - `[STRUCTURAL]` `Container` is a typed plain object with explicit fields per service; no string-keyed `get` lookup.
  - `[MECHANICAL]` `npm test` passes with new Logger tests; `npm run typecheck` passes.

---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-02']
---

### 3. Storage Tier — StateService and CacheService

- **Scope:** `StateService` wraps `data.json` with debounced saves (250ms) plus synchronous flush on `onunload`. `data.json` is **versioned from day 1** with a `schemaVersion` field and a `state-migrations.ts` migrations array (mirroring `CacheService.migrations.ts`). `CacheService` wraps IndexedDB with a versioned schema, migrations, and pruning policy.
- **Files (new):**
  - `src/services/StateService.ts`
  - `src/services/CacheService.ts`
  - `src/services/storage/idbWrapper.ts`
  - `src/services/storage/schema.ts`
  - `src/services/storage/migrations.ts`
  - `src/services/storage/state-migrations.ts`
  - `src/services/storage/PersistedState.ts`
  - `__tests__/StateService.test.ts`
  - `__tests__/CacheService.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `StateService` exposes `load(): Promise<PersistedState>`, `save(patch: Partial<PersistedState>): void` (debounced 250ms), and `flush(): void` (synchronous).
  - `[STRUCTURAL]` `StateService.flush` is registered to fire from `plugin.onunload` and is documented to bypass debounce.
  - `[STRUCTURAL]` `PersistedState` includes `schemaVersion: number` (starting at `1`); `state-migrations.ts` exports an array of `{from, to, run(state) → state}` migrations. `StateService.load` runs them in order and writes back the upgraded shape.
  - `[BEHAVIORAL]` Test: loading a `data.json` containing `schemaVersion: 0` (or missing key) runs the v0→v1 migration before returning state.
  - `[BEHAVIORAL]` Test: `StateService.load` catches `JSON.parse` errors and returns `defaultSettings()` with `Logger.warn` and a flag the UI uses to show a one-time banner ("StrataMD: state file unreadable, restored to defaults — your saved notes in the vault are unaffected").
  - `[BEHAVIORAL]` Test: rapid `save` calls within 250ms coalesce into a single `saveData` call. Verified via mock spy.
  - `[BEHAVIORAL]` Test: calling `flush` immediately writes any pending state. Verified via mock spy.
  - `[STRUCTURAL]` `CacheService` exposes `open(): Promise<void>`, `putItems(items: FeedItem[]): Promise<void>`, `getItem(itemId: string): Promise<FeedItem | undefined>`, `getItemsByFeed(feedId: string): Promise<FeedItem[]>`, `pruneOldItems(retainSavedIds: Set<string>, retainStarredIds: Set<string>, olderThanDays: number): Promise<number>`, `putExtractedArticle(itemId: string, html: string): Promise<void>`, `getExtractedArticle(itemId: string): Promise<string | undefined>`, `close(): void`.
  - `[STRUCTURAL]` `schema.ts` exports `SCHEMA_VERSION` and an array of object-store definitions.
  - `[STRUCTURAL]` `migrations.ts` contains an array of `{from: number, to: number, run: (db: IDBDatabase) => void}` migration entries; running through them upgrades any older schema.
  - `[BEHAVIORAL]` Test: write 1000 items, prune with `olderThanDays: 30`, verify only items in `retainSavedIds | retainStarredIds` or newer than the cutoff remain.
  - `[BEHAVIORAL]` Test: when IndexedDB is unavailable (mocked), `CacheService.open` rejects with a typed `IndexedDBUnavailableError`; consumers can fall through to in-memory.

---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-03']
---

### 4. Zustand Store and Selectors

- **Scope:** `useStrataStore` Zustand store with all slices (feeds, items, userState, selection, filters, currentView, ui), strongly-typed selectors, and store actions that delegate to services.
- **Files (new):**
  - `src/store/useStrataStore.ts`
  - `src/store/selectors.ts`
  - `src/store/actions.ts`
  - `src/store/types.ts`
  - `__tests__/useStrataStore.test.ts`
  - `__tests__/selectors.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` Store has slices: `feedsById`, `itemsById`, `userState`, `selection { selectedItemId, currentView }`, `filters { searchQuery, view }`, `ui { compactMode, fontSize, previewWidth, distractionFree }`.
  - `[STRUCTURAL]` Selectors include: `selectFeedById`, `selectItemById`, `selectCurrentItemIds` (memoized), `selectUnreadCountsByFeedId` (memoized), `selectGlobalUnreadCount` (memoized), `selectSelectedItem`.
  - `[STRUCTURAL]` Parameterized selectors (e.g., `selectItemById(id)`) use the curried + `useShallow` pattern so per-id subscriptions do not lose memoization across renders. Documented in `selectors.ts` header comment with a 3-line example.
  - `[STRUCTURAL]` Actions include: `addFeed(url)`, `removeFeed(feedId)`, `selectNext()`, `selectPrevious()`, `markRead(itemId)`, `markUnread(itemId)`, `toggleStar(itemId)`, `markSaved(itemId)`, `setSearchQuery(q)`, `setView(view)`, `applyDelta(delta)`, `hydrate(state)`.
  - `[BEHAVIORAL]` Test: toggling read state on a single item only triggers re-renders for selectors that read that item — verified by render-count assertions on a stub component subscribed via `selectItemById`.
  - `[BEHAVIORAL]` Test: `selectCurrentItemIds` memoizes correctly — calling twice with same inputs returns the same reference.
  - `[STRUCTURAL]` Actions never call `app.requestUrl`, `app.vault`, or any I/O directly. They delegate to services on the Container.
  - `[MECHANICAL]` `npm test -- store` passes; `npm run typecheck` passes.

---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-02']
---

### 5. RSS/Atom Adapter and Mock Adapter

- **Scope:** `RSSAdapter` handles RSS 2.0 and Atom feeds via `rss-parser` with tolerant fallbacks for malformed feeds. `MockAdapter` provides seed data for the dev-mode `development_mode.required` requirement.
- **Files (new):**
  - `src/services/adapters/RSSAdapter.ts`
  - `src/services/adapters/MockAdapter.ts`
  - `src/services/adapters/__fixtures__/sample-rss.xml`
  - `src/services/adapters/__fixtures__/sample-atom.xml`
  - `src/services/adapters/__fixtures__/malformed-rss.xml`
  - `src/services/adapters/__fixtures__/mockFeeds.ts`
  - `__tests__/RSSAdapter.test.ts`
  - `__tests__/MockAdapter.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `RSSAdapter` implements `ISourceAdapter`. `name = 'rss'`. `detect(url)` returns `true` for any `http(s)` URL (acts as final fallback in adapter chain).
  - `[STRUCTURAL]` `RSSAdapter.fetch(source)` calls `app.requestUrl({ url: source.url })` — never `fetch()`.
  - `[STRUCTURAL]` `RSSAdapter.parse(raw)` normalizes RSS 2.0 and Atom into `FeedItem[]`. Items missing `title` OR `url` are skipped (logged as a single warn with feed ID and `skippedCount`).
  - `[BEHAVIORAL]` Test against `sample-rss.xml`: parse returns ≥3 items with valid `id`, `title`, `url`, `published` fields.
  - `[BEHAVIORAL]` Test against `sample-atom.xml`: parse returns ≥3 items.
  - `[BEHAVIORAL]` Test against `malformed-rss.xml`: parse throws no exception; returns valid items only and logs the rest.
  - `[BEHAVIORAL]` Test: items with malformed dates fall back to `Date.now()` and the item is flagged with `_dateFallback: true`.
  - `[STRUCTURAL]` `MockAdapter` implements `ISourceAdapter`. `mockFeeds.ts` exports ≥5 fake feeds with ≥10 items each spanning categories: news, tech blog, YouTube channel, podcast, long-form. Production builds tree-shake `MockAdapter` via `process.env.NODE_ENV === 'production'` guard.
  - `[BEHAVIORAL]` Test: importing `MockAdapter` in a production build emits zero output bytes (verified via metafile inspection in test).

---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-05']
---

### 6. YouTube Adapter (with Plan-B seam)

- **Scope:** `YouTubeAdapter` resolves channel and playlist URLs to YouTube's RSS endpoints. Channel-handle resolution scrapes `meta[itemprop=channelId]` from the channel page. The adapter exposes a `IYouTubePlanB` seam so a future implementation (scrape-based or yt-dlp-based) can replace the resolver without touching store or UI.
- **Files (new):**
  - `src/services/adapters/YouTubeAdapter.ts`
  - `src/services/adapters/youtube/resolveChannel.ts`
  - `src/services/adapters/youtube/resolvePlaylist.ts`
  - `src/services/adapters/youtube/parseChannelHtml.ts`
  - `src/services/adapters/youtube/IYouTubePlanB.ts`
  - `src/services/adapters/youtube/PlanA_FeedXml.ts`
  - `src/services/adapters/__fixtures__/sample-channel-page.html`
  - `src/services/adapters/__fixtures__/sample-youtube-feed.xml`
  - `__tests__/YouTubeAdapter.test.ts`
  - `__tests__/youtube/resolveChannel.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `YouTubeAdapter` implements `ISourceAdapter`. `name = 'youtube'`. `detect(url)` returns `true` for hostnames matching `(www.)?(youtube.com|youtu.be|m.youtube.com)`.
  - `[STRUCTURAL]` `YouTubeAdapter.resolve(url)` accepts URL patterns: `@handle`, `/channel/UC…`, `/user/…`, `/c/…`, `/playlist?list=…`, and bare video URLs (treated as single-item feeds for inspection).
  - `[STRUCTURAL]` `IYouTubePlanB` interface defines `resolveChannelItems(channelId: string): Promise<FeedItem[]>` so a future scrape/yt-dlp implementation can hot-swap.
  - `[STRUCTURAL]` `PlanA_FeedXml` is the Phase 1 default implementation: fetches `https://www.youtube.com/feeds/videos.xml?channel_id=…` (or `?playlist_id=…`).
  - `[BEHAVIORAL]` Test: `resolveChannel('https://www.youtube.com/@SomeHandle')` invokes `app.requestUrl` for the channel page, parses `meta[itemprop=channelId]`, and returns a `FeedSource` with the canonical `feeds/videos.xml?channel_id=…` URL.
  - `[BEHAVIORAL]` Test: `resolveChannel` for a `/c/CustomName` URL falls through to the same scrape path.
  - `[BEHAVIORAL]` Test: `resolve` for a playlist URL with `list=PL…` returns `feeds/videos.xml?playlist_id=PL…`.
  - `[BEHAVIORAL]` Test: channelId resolution tries a fallback chain — `meta[itemprop=channelId]` first, then `<link rel="canonical" href="…/channel/UC…">` regex, then `ytInitialData` JSON regex (`"channelId":"UC…"`). Only after all three fail does it reject with `YouTubeResolutionError`.
  - `[BEHAVIORAL]` Test: when all three fallbacks miss, `resolve` rejects with a typed `YouTubeResolutionError` carrying the original URL so the UI can prompt for manual override.
  - `[STRUCTURAL]` `YouTubeAdapter.parse` extracts thumbnails from `media:thumbnail` and durations from `yt:duration` where present.
  - `[MECHANICAL]` `npm test -- youtube` passes.

---
sub_spec_id: SS-07
phase: run
depends_on: ['SS-05', 'SS-06']
---

### 7. Feed Discovery Service and Website Autodiscovery Adapter

- **Scope:** `FeedDiscoveryService` routes a URL through adapters in order (YouTube → Website-with-discovery → RSS fallback). `WebsiteAutodiscoveryAdapter` walks `<link rel="alternate">` tags and probes `/feed`, `/rss`, `/atom.xml`.
- **Files (new):**
  - `src/services/FeedDiscoveryService.ts`
  - `src/services/adapters/WebsiteAutodiscoveryAdapter.ts`
  - `src/services/discovery/probeCommonPaths.ts`
  - `src/services/discovery/parseAlternateLinks.ts`
  - `src/services/adapters/__fixtures__/sample-website.html`
  - `src/services/adapters/__fixtures__/sample-website-no-feed.html`
  - `__tests__/FeedDiscoveryService.test.ts`
  - `__tests__/WebsiteAutodiscoveryAdapter.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `FeedDiscoveryService.resolve(url)` returns either `FeedSource`, `FeedSource[]` (multiple candidates), or rejects with `DiscoveryFailedError`.
  - `[STRUCTURAL]` Adapter ordering is: `YouTubeAdapter`, `WebsiteAutodiscoveryAdapter`, `RSSAdapter` (final fallback for direct feed URLs).
  - `[BEHAVIORAL]` Test: `resolve('https://example.com')` against `sample-website.html` (which has `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`) returns a single `FeedSource` with the resolved absolute feed URL.
  - `[BEHAVIORAL]` Test: when no alternate links exist, the adapter probes `/feed`, `/rss`, `/atom.xml` (in that order) via HEAD/GET and returns the first that responds with a feed-shaped Content-Type or recognizable XML root.
  - `[BEHAVIORAL]` Test: `resolve` against `sample-website-no-feed.html` (no alternates, no probe matches) rejects with `DiscoveryFailedError`.
  - `[BEHAVIORAL]` Test: when multiple alternate links exist (e.g., RSS and Atom), `resolve` returns both candidates so the UI can let the user pick.

---
sub_spec_id: SS-08
phase: run
depends_on: ['SS-04', 'SS-07']
---

### 8. Feed Fetch Scheduler

- **Scope:** Background scheduler that drives feed refreshes. Concurrency cap 4, staggers requests, respects per-feed intervals, exponential backoff on failure (cap 1h), dedupes in-flight requests, preserves last-good cache, emits `RefreshEvent`s for the UI.
- **Files (new):**
  - `src/services/FeedFetchScheduler.ts`
  - `src/services/scheduler/RefreshEvent.ts`
  - `src/services/scheduler/backoff.ts`
  - `src/services/scheduler/dedup.ts`
  - `__tests__/FeedFetchScheduler.test.ts`
  - `__tests__/scheduler/backoff.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `FeedFetchScheduler.start()` begins a tick loop (default 60s interval, configurable). `stop()` clears the timer.
  - `[STRUCTURAL]` `FeedFetchScheduler.refreshNow(feedId)` triggers an immediate refresh for one feed, deduped against any in-flight request for the same feed.
  - `[STRUCTURAL]` Concurrency cap is configurable (default 4) and exposed via setter.
  - `[BEHAVIORAL]` Test: with 10 feeds due, scheduler dispatches at most 4 concurrent fetches; remaining 6 queue and dispatch as slots free.
  - `[BEHAVIORAL]` Test: a feed whose `lastSuccess + intervalMin` is still in the future is skipped this tick.
  - `[BEHAVIORAL]` Test: a feed that fails 3 times in a row has its next-due time pushed by exponential backoff (cap 1h). Verified by mocking `Date.now`.
  - `[BEHAVIORAL]` Test: a successful refresh after failures resets `consecutiveFailures` to 0 and clears the backoff.
  - `[BEHAVIORAL]` Test: a refresh that fails preserves the previous cache state (no `putItems` call on failure).
  - `[BEHAVIORAL]` Test: a request taking longer than 30s is aborted via `AbortController` and counted as a failure.
  - `[STRUCTURAL]` Scheduler emits `RefreshEvent` instances (`{type, feedId, timestamp, success?, error?}`) on a typed event emitter the store subscribes to.
  - `[INFRASTRUCTURE]` Scheduler obeys an `idleDelayMs` (default 3000) on `start()` so plugin boot does not refresh immediately.

---
sub_spec_id: SS-09
phase: run
depends_on: ['SS-03']
---

### 9. Article Preview Service (lazy-loaded)

- **Scope:** Readability-first article extraction with fallback chain. The `@mozilla/readability` + `linkedom` dependencies are loaded via dynamic `import()` only when first invoked, so they do not weigh down the cold-start bundle.
- **Files (new):**
  - `src/services/ArticlePreviewService.ts`
  - `src/services/preview/extractArticle.ts`
  - `src/services/preview/sanitizeArticle.ts`
  - `src/services/preview/PreviewResult.ts`
  - `__tests__/ArticlePreviewService.test.ts`
  - `__tests__/preview/sanitizeArticle.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
  - `esbuild.config.mjs` (verify dynamic imports produce a separate chunk)
- **Acceptance criteria:**
  - `[STRUCTURAL]` `ArticlePreviewService.extract(item, abortSignal): Promise<PreviewResult>` where `PreviewResult = { source: 'readability'|'content-encoded'|'summary'|'none', html: string, title?: string }`.
  - `[STRUCTURAL]` Readability + linkedom imports use dynamic `import()` inside `extract`. Static imports of these packages from `extractArticle.ts` are forbidden (verified by ESLint `no-restricted-imports`).
  - `[BEHAVIORAL]` Test: extracting from a known-good HTML returns `source: 'readability'` with non-empty `html`.
  - `[BEHAVIORAL]` Test: extracting from a page where Readability returns empty falls back to feed `content:encoded`, returning `source: 'content-encoded'`.
  - `[BEHAVIORAL]` Test: when both above fail, returns `source: 'summary'` from feed summary.
  - `[BEHAVIORAL]` Test: when all sources fail, returns `source: 'none'` with an empty `html`. No exception thrown.
  - `[BEHAVIORAL]` Test: a 10s timeout aborts extraction via `abortSignal`; result is `source: 'none'`.
  - `[STRUCTURAL]` Sanitization via `sanitize-html` uses an explicit allow-list. **Allowed tags:** `p, a, strong, em, b, i, u, code, pre, blockquote, ul, ol, li, h1, h2, h3, h4, h5, h6, img, figure, figcaption, br, hr, table, thead, tbody, tr, th, td, span, div`. **Allowed attributes:** `a[href, title, rel]`, `img[src, alt, title, srcset]`. **Forbidden:** `script, iframe, object, embed, form, input, style, link, meta`. **Forbidden URL schemes:** `javascript:, data:` (except `data:image/*`), `vbscript:, file:`. **Forbidden attribute patterns:** all `on*` event handlers. Allow-list lives in a single `sanitizeArticle.ts` module so audits and updates touch one file.
  - `[BEHAVIORAL]` Test: input with `<script>alert(1)</script>` returns sanitized output with the script tag stripped.
  - `[BEHAVIORAL]` Test: input with `<a href="javascript:alert(1)">x</a>` strips the dangerous href.
  - `[BEHAVIORAL]` Test: input with `<img onerror="alert(1)" src="x">` strips the `onerror` attribute.
  - `[BEHAVIORAL]` Test: extracted articles are cached via `CacheService.putExtractedArticle`; subsequent `extract` calls for the same item return the cached HTML without re-fetching.
  - `[MECHANICAL]` After running `npm run build`, the esbuild metafile shows `@mozilla/readability` and `linkedom` in a separate chunk, not in `main.js`.

---
sub_spec_id: SS-10
phase: run
depends_on: ['SS-04']
---

### 10. Note Service, Templates, and Bases-Compatible Frontmatter

- **Scope:** `NoteService` writes intentional notes to the vault with templated content and a fixed-shape frontmatter that Obsidian Bases consumes cleanly.
- **Files (new):**
  - `src/services/NoteService.ts`
  - `src/services/notes/frontmatter.ts`
  - `src/services/notes/routing.ts`
  - `src/services/notes/renderTemplate.ts`
  - `src/services/notes/sanitizeFilename.ts`
  - `templates/article.md`
  - `templates/youtube.md`
  - `templates/bookmark.md`
  - `__tests__/NoteService.test.ts`
  - `__tests__/notes/frontmatter.test.ts`
  - `__tests__/notes/routing.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `NoteService.save(item, extractedHtml?): Promise<{path: string}>` writes via `app.vault.create` only — never `app.vault.adapter.write` directly.
  - `[STRUCTURAL]` Frontmatter shape (verified by a single `frontmatter.ts` utility): `type, status, source, url, category, tags, published, saved_at`. All keys present on every note (use empty string or empty list for missing values, never omit keys).
  - `[STRUCTURAL]` Routing rules: prefer `feed.category` if set → fall back to `feed.displayName` → fall back to `mediaType`-based folder (`Articles/`, `Videos/`, `Bookmarks/`) → fall back to `Inbox/`.
  - `[STRUCTURAL]` Filename sanitization: replaces `\\ / : * ? " < > |` with `-`, strips occurrences of `..` and leading `/` (defense in depth even though Obsidian's vault API rejects), truncates at 120 chars, falls through to `{itemId}.md` if sanitization yields empty string.
  - `[STRUCTURAL]` Folder routing similarly strips `..` and leading `/` from category names before path composition.
  - `[BEHAVIORAL]` Test: saving an article note produces a markdown file with the expected frontmatter shape and template-rendered body.
  - `[BEHAVIORAL]` Test: path collision (file already exists at target path) appends `-2`, `-3`, etc. until a free path is found. Never overwrites.
  - `[BEHAVIORAL]` Test: vault write failure (mocked) propagates as a typed `NoteSaveError` and the item is NOT marked as saved.
  - `[STRUCTURAL]` Templates use Mustache-style `{{placeholder}}` substitution, no executable code.
  - `[INTEGRATION]` `[INTEGRATION] After saving a note, opening Obsidian Bases on a vault containing the note shows the note with the expected columns (type, status, source, url, category, tags, published, saved_at) populated from frontmatter.`

---
sub_spec_id: SS-11
phase: run
depends_on: ['SS-04', 'SS-08']
---

### 11. OPML Import Service

- **Scope:** `OPMLService` imports OPML 1.0/2.0 subscription lists. Deduplicates by feed URL, preserves OPML category structure, and runs initial staggered refresh through the scheduler. Export deferred to Phase 2.
- **Files (new):**
  - `src/services/OPMLService.ts`
  - `src/services/opml/parseOpml.ts`
  - `src/services/opml/importedFeed.ts`
  - `src/services/opml/__fixtures__/sample-opml-1.0.xml`
  - `src/services/opml/__fixtures__/sample-opml-2.0.xml`
  - `src/services/opml/__fixtures__/sample-opml-with-categories.xml`
  - `__tests__/OPMLService.test.ts`
- **Files (modify):**
  - `src/services/Container.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `OPMLService.importFromString(xml: string, options?: { defaultCategory?: string, onProgress?: (processed: number, total: number) => void }): Promise<ImportSummary>` where `ImportSummary = { added: FeedSource[], duplicates: string[], errors: { url: string, reason: string }[] }`.
  - `[STRUCTURAL]` Parsing uses `fast-xml-parser` (already a dep), configured with `processEntities: false` to disable XML External Entity (XXE) processing. Supports both OPML 1.0 and 2.0 variants of `<outline xmlUrl=…>`.
  - `[BEHAVIORAL]` Test: input containing an XXE payload (e.g., `<!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]>`) parses without resolving the entity; the import does not read the referenced file.
  - `[STRUCTURAL]` `onProgress` callback is invoked after each feed is processed (added or rejected); the settings dialog renders a progress bar fed by this callback.
  - `[BEHAVIORAL]` Test: importing `sample-opml-2.0.xml` with 5 unique feeds yields `added.length === 5`.
  - `[BEHAVIORAL]` Test: importing the same OPML twice yields `duplicates.length === 5` on the second pass; nothing is added.
  - `[BEHAVIORAL]` Test: importing `sample-opml-with-categories.xml` preserves the OPML category tree onto `FeedSource.category`.
  - `[BEHAVIORAL]` Test: importing 50 feeds invokes `FeedFetchScheduler.refreshNow` for each through the scheduler's stagger logic — verified that no more than 4 are in-flight at once.
  - `[BEHAVIORAL]` Test: a single malformed `<outline>` entry (e.g., missing `xmlUrl`) is recorded in `errors[]` and the rest of the import succeeds.

---
sub_spec_id: SS-12
phase: run
depends_on: ['SS-04']
---

### 12. Dashboard View Shell, 3-Pane Layout, Empty States

- **Scope:** `StrataDashboardView` (extends `ItemView`), React mount/unmount, `<DashboardRoot>` with 3-pane CSS grid + responsive breakpoints, `<Toolbar>`, pane shells, `<PortalRoot>` for Radix containment, all empty-state components.
- **Files (new):**
  - `src/views/StrataDashboardView.ts`
  - `src/components/StrataProvider.tsx`
  - `src/components/DashboardRoot.tsx`
  - `src/components/PortalRoot.tsx`
  - `src/components/Toolbar.tsx`
  - `src/components/FeedPane.tsx`
  - `src/components/ItemPane.tsx`
  - `src/components/PreviewPane.tsx`
  - `src/components/EmptyStates/FirstLaunch.tsx`
  - `src/components/EmptyStates/EmptySmartView.tsx`
  - `src/components/EmptyStates/NoSearchResults.tsx`
  - `src/components/EmptyStates/AllCaughtUp.tsx`
  - `src/components/EmptyStates/NeverRefreshed.tsx`
  - `src/components/EmptyStates/NoSelection.tsx`
  - `__tests__/components/DashboardRoot.test.tsx`
  - `__tests__/components/EmptyStates.test.tsx`
- **Files (modify):**
  - `src/main.ts`
  - `src/styles.css`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `StrataDashboardView` extends `ItemView` and registers `getViewType() === 'stratamd'`. `onOpen` mounts via `createRoot(this.contentEl).render(<StrataProvider><DashboardRoot/></StrataProvider>)`. `onClose` calls `root.unmount()`.
  - `[STRUCTURAL]` `<DashboardRoot>` uses CSS grid (`grid-template-columns`) for the 3-pane layout. Below 900px viewport width, collapses to 2-pane; below 600px, single-pane with tab switcher.
  - `[STRUCTURAL]` `<PortalRoot>` is a wrapper that Radix primitives render into via `Portal container={portalRootRef}`. Component IDs are scoped under `.smd-root` so styles do not leak.
  - `[BEHAVIORAL]` Test: opening the view in a test Obsidian instance renders the 3-pane shell with no console errors.
  - `[BEHAVIORAL]` Test: with zero feeds, `<DashboardRoot>` renders `<FirstLaunch>` with two CTAs ("Add Feed", "Import OPML") in production; in development builds (`process.env.NODE_ENV !== 'production'`) a third "Try Sample Feeds" CTA is rendered. The `MockAdapter` import inside the "Try Sample Feeds" handler is dynamic (`await import('../services/adapters/MockAdapter')`) so production builds tree-shake it cleanly.
  - `[STRUCTURAL]` `MockAdapter` import in `<FirstLaunch>` is dynamic, never static. Verified by ESLint `no-restricted-imports` rule banning static `from '../../services/adapters/MockAdapter'` in component files.
  - `[BEHAVIORAL]` Test: selecting Starred view with no starred items renders `<EmptySmartView>` with the message "No starred items yet. Press `*` on an item to star it."
  - `[BEHAVIORAL]` Test: search query with zero matches renders `<NoSearchResults>` echoing the query and a "Clear filters" link.
  - `[BEHAVIORAL]` Test: `<PreviewPane>` with no selection renders `<NoSelection>` showing primary keyboard hints.
  - `[STRUCTURAL]` Dashboard CSS uses `var(--background-primary)`, `var(--text-normal)`, `var(--text-muted)`, `var(--background-modifier-border)` from Obsidian's theme variables.
  - `[HUMAN REVIEW]` Dashboard renders correctly under both default light and default dark Obsidian themes (manual visual smoke test recorded in test evidence).

---
sub_spec_id: SS-13
phase: run
depends_on: ['SS-12']
---

### 13. Item Cards and Virtualization

- **Scope:** Memoized `<ItemCard>` and `<FeedCard>` atoms with single-id selectors; `useVirtualizedList` hook backed by `@tanstack/react-virtual`; per-id selectors so a single item's read-state change does not re-render the list.
- **Files (new):**
  - `src/components/ItemCard.tsx`
  - `src/components/FeedCard.tsx`
  - `src/hooks/useVirtualizedList.ts`
  - `__tests__/components/ItemCard.test.tsx`
  - `__tests__/hooks/useVirtualizedList.test.ts`
- **Files (modify):**
  - `src/components/ItemPane.tsx`
  - `src/components/FeedPane.tsx`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `<ItemCard>` is wrapped in `React.memo`. It subscribes to a single item via `selectItemById(itemId)` and to its read state via `useStrataStore(state => state.userState.readIds.has(itemId))`.
  - `[STRUCTURAL]` `useVirtualizedList` returns the same shape regardless of the underlying virtualization library (so swapping is mechanical).
  - `[BEHAVIORAL]` Test: in a list of 1000 items, toggling read on item #500 only triggers re-render for `<ItemCard>` of item #500. Other cards do not re-render. Verified by render-count spies.
  - `[BEHAVIORAL]` Test: scrolling a 1000-item list keeps DOM node count under 50 (windowing works). Verified by counting `document.querySelectorAll('.smd-item-card').length` mid-scroll.
  - `[STRUCTURAL]` `<ItemCard>` displays thumbnail (lazy-loaded with `loading="lazy"`), title, source name, published date (via `dayjs.fromNow()`), and excerpt where available.
  - `[BEHAVIORAL]` Test: an `<ItemCard>` for a video item shows a play-icon overlay on the thumbnail; an article card does not.
  - `[STRUCTURAL]` `<FeedCard>` shows feed icon, display name, unread count (animated pulse on transition from 0 → N), and health dot (green/yellow/red).

---
sub_spec_id: SS-14
phase: run
depends_on: ['SS-12', 'SS-09']
---

### 14. Preview Components — Article, YouTube, Bookmark

- **Scope:** Three preview component types under `<PreviewPane>` plus the `usePreviewLoader` hook with abort-on-selection-change semantics.
- **Files (new):**
  - `src/components/preview/ArticlePreview.tsx`
  - `src/components/preview/YouTubeEmbed.tsx`
  - `src/components/preview/BookmarkPreview.tsx`
  - `src/components/preview/PreviewActionBar.tsx`
  - `src/hooks/usePreviewLoader.ts`
  - `__tests__/components/preview/ArticlePreview.test.tsx`
  - `__tests__/components/preview/YouTubeEmbed.test.tsx`
  - `__tests__/hooks/usePreviewLoader.test.ts`
- **Files (modify):**
  - `src/components/PreviewPane.tsx`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `<PreviewPane>` routes by `selectedItem.mediaType`: `article` → `<ArticlePreview>`, `video` → `<YouTubeEmbed>`, `bookmark` → `<BookmarkPreview>`.
  - `[STRUCTURAL]` `usePreviewLoader(itemId)` calls `ArticlePreviewService.extract` with an `AbortController` and aborts on selection change before resolution.
  - `[BEHAVIORAL]` Test: rapid `j` presses cycle through items; only the final selected item's preview ends up rendered. Earlier in-flight extractions are aborted (verified via spy on `AbortController.abort`).
  - `[STRUCTURAL]` `<YouTubeEmbed>` initially renders the thumbnail with a play-button overlay; clicking it swaps in the iframe (`https://www.youtube.com/embed/{videoId}`). Iframe carries explicit `sandbox="allow-scripts allow-same-origin allow-presentation"` (no `allow-popups`, no `allow-top-navigation`, no `allow-forms`) and `referrerpolicy="no-referrer"`.
  - `[BEHAVIORAL]` Test: clicking the play overlay swaps the thumbnail for the iframe element; clicking again does nothing (already loaded).
  - `[BEHAVIORAL]` Test: when YouTube embed is blocked (mocked iframe `onerror`), the component falls back to thumbnail-with-actions ("Open in browser") and never renders a blank pane.
  - `[STRUCTURAL]` `<PreviewActionBar>` exposes Save Note, Open Original, Star, Mark Unread, Copy Link buttons. Action buttons read keyboard hints from settings.
  - `[BEHAVIORAL]` Test: clicking Save Note invokes `NoteService.save` and shows a toast with the resulting path.

---
sub_spec_id: SS-15
phase: run
depends_on: ['SS-12']
---

### 15. Keyboard Shortcuts and Search

- **Scope:** `useKeyboardShortcuts` (root-level keydown handler on the dashboard); `<SearchBar>` with 150ms debounce; in-memory substring search index over title + summary.
- **Files (new):**
  - `src/hooks/useKeyboardShortcuts.ts`
  - `src/hooks/keyboard/bindings.ts`
  - `src/components/SearchBar.tsx`
  - `src/services/SearchIndex.ts`
  - `__tests__/hooks/useKeyboardShortcuts.test.ts`
  - `__tests__/components/SearchBar.test.tsx`
  - `__tests__/SearchIndex.test.ts`
- **Files (modify):**
  - `src/components/DashboardRoot.tsx`
  - `src/components/Toolbar.tsx`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `bindings.ts` exports a default binding map covering: `j/k` next/prev item, `n/p` synonyms, `o` open original, `s` save note, `*` star, `r` refresh-current-feed, `R` refresh-all, `/` focus search, `m` mark read, `M` mark feed read, `gg/G` top/bottom, `Esc` clear-selection-or-blur-search.
  - `[STRUCTURAL]` `useKeyboardShortcuts` registers a single `keydown` listener on the dashboard root and dispatches store actions; never reaches into components directly.
  - `[BEHAVIORAL]` Test: pressing `j` advances `selection.selectedItemId` by one within `currentItemIds`.
  - `[BEHAVIORAL]` Test: when focus is inside `<SearchBar>` (input element), `j/k` are not intercepted.
  - `[BEHAVIORAL]` Test: pressing `gg` (two `g` within 500ms) jumps to the first item; single `g` does nothing.
  - `[STRUCTURAL]` `<SearchBar>` uses 150ms debounce before dispatching `setSearchQuery`.
  - `[STRUCTURAL]` `SearchIndex.search(query, items)` does a case-insensitive substring match on `title` and `summary`. Returns matching item IDs in original order.
  - `[BEHAVIORAL]` Test: searching for "react" against a 5000-item index returns matching IDs in <50ms (perf assertion).

---
sub_spec_id: SS-16
phase: run
depends_on: ['SS-08', 'SS-11', 'SS-12']
---

### 16. Settings Tab, Refresh Hook, Notification Behavior

- **Scope:** Obsidian settings tab with all configurable options; `useFeedRefresh` hook bridging scheduler events to React; `Notifications` service for opt-in per-feed notices and global suppression toggle.
- **Files (new):**
  - `src/settings/SettingsTab.ts`
  - `src/settings/defaultSettings.ts`
  - `src/services/Notifications.ts`
  - `src/hooks/useFeedRefresh.ts`
  - `__tests__/services/Notifications.test.ts`
  - `__tests__/hooks/useFeedRefresh.test.ts`
- **Files (modify):**
  - `src/main.ts`
  - `src/settings.ts`
  - `src/components/FeedPane.tsx`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `SettingsTab` renders fields for: refresh tick interval (default 60s), default per-feed interval (default 30min), concurrency cap (default 4), prune-after-days (default 30), auto-mark-read (immediate / 2s dwell / manual; default 2s dwell), suppress all notifications (default off), enable dev mocks (default off in prod, on in dev), Tailwind theme override, font size, preview pane width.
  - `[STRUCTURAL]` Per-feed settings (in feed properties dialog, not main tab): `notifyOnNew` (default false), `pruneAfterDays` override (optional), `category` override.
  - `[STRUCTURAL]` `Notifications.notifyNewItems(feed, count)` emits an Obsidian Notice rate-limited to once per feed per 5 minutes; respects `settings.suppressAllNotifications`.
  - `[BEHAVIORAL]` Test: with `notifyOnNew: false`, refresh that yields new items emits zero notices.
  - `[BEHAVIORAL]` Test: with `notifyOnNew: true`, two refreshes within 5 minutes for the same feed emit only one notice; the second is rate-limited.
  - `[BEHAVIORAL]` Test: with `suppressAllNotifications: true`, no notices are emitted regardless of per-feed setting.
  - `[STRUCTURAL]` `useFeedRefresh` subscribes to `FeedFetchScheduler` events and exposes `{ isRefreshing: boolean, lastRefresh: Date | null, refreshingFeedIds: Set<string> }` for UI consumption.
  - `[BEHAVIORAL]` Test: `useFeedRefresh` re-renders the consuming component exactly once per `RefreshEvent` batch, not per individual feed.

---
sub_spec_id: SS-17
phase: run
depends_on: ['SS-01', 'SS-02', 'SS-03', 'SS-04', 'SS-05', 'SS-06', 'SS-07', 'SS-08', 'SS-09', 'SS-10', 'SS-11', 'SS-12', 'SS-13', 'SS-14', 'SS-15', 'SS-16']
---

### 17. Integration & End-to-End Wiring

- **Scope:** Wire every service into `Container.build()`; register all Phase 1 commands and the ribbon icon (with unread badge); ensure plugin lifecycle (`onload`/`onunload`) is correct and the full end-to-end user flow works.
- **Files (new):**
  - `src/services/Container.build.ts`
  - `src/main.commands.ts`
  - `src/main.ribbon.ts`
  - `__tests__/integration/end-to-end.test.ts`
  - `docs/ss17-integration-evidence.md`
- **Files (modify):**
  - `src/main.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `Container.build()` instantiates and wires every service in dependency order: Logger → StateService → CacheService → store → adapters → DiscoveryService → Scheduler → ArticlePreviewService → NoteService → OPMLService → Notifications.
  - `[STRUCTURAL]` `main.ts` `onload` performs: `Container.build()` → `StateService.load()` → `CacheService.open()` → `store.hydrate(state)` → `registerView` → `registerCommands` → `addRibbonIcon` → `addSettingTab` → `Scheduler.start()` (after `idleDelayMs`).
  - `[STRUCTURAL]` `main.ts` `onunload` performs: `Scheduler.stop()` → `StateService.flush()` → `CacheService.close()`.
  - `[STRUCTURAL]` Phase 1 commands registered: `Open Dashboard, Add Feed, Ingest URL, Import OPML, Refresh All, Refresh Selected Feed, Search, Toggle Compact Mode, Mark All Read, Rebuild Cache`.
  - `[BEHAVIORAL]` `Rebuild Cache` command: closes IndexedDB, deletes the database, reopens with current schema, then calls `Scheduler.refreshNow` for every subscribed feed. `userState` (read/saved/starred) in `data.json` is preserved.
  - `[STRUCTURAL]` Ribbon icon shows unread-count badge updated reactively from `selectGlobalUnreadCount`.
  - `[INTEGRATION]` `[INTEGRATION] End-to-end flow: from a fresh test vault, opening the dashboard, importing an OPML file with 5 feeds (mix of RSS, Atom, YouTube), waiting for refresh, navigating items via keyboard, opening one article preview, opening one YouTube embed, saving one of each as a note, and verifying the saved notes appear in Obsidian Bases with correct frontmatter — all 18 acceptance criteria from the master spec pass within this single end-to-end run.`
  - `[INTEGRATION]` `[INTEGRATION] All new modules are imported and invoked from src/main.ts via Container.build() with correct call order.`
  - `[BEHAVIORAL]` Test: `plugin.onunload` flushes pending state — toggling read on an item then immediately calling `onunload` results in the toggle being persisted (verified by re-loading state and checking `readIds`).
  - `[STRUCTURAL]` `docs/ss17-integration-evidence.md` records: end-to-end test run output, bundle-size report, and screenshots of the working dashboard in light + dark themes.

## Edge Cases

- **Single feed broken (404, redirect loop, malformed XML):** isolated by per-feed try/catch + last-good cache. Dashboard fully usable; only that feed shows red dot. After 5 consecutive failures, one dismissable banner; auto-recovers on next success.
- **Article extraction times out on a slow site:** bounded by 10s `AbortSignal` + fallback chain (extracted → content:encoded → summary → "no preview"). User always sees something in preview.
- **Refresh storm on plugin reload after long offline period:** mitigated by `idleDelayMs` (3s) + concurrency cap (4) + skip-recently-fetched logic on tick.
- **YouTube channel-handle resolution fails for an edge URL:** typed `YouTubeResolutionError` triggers manual override box ("Paste channel RSS URL or channel ID"). Other YouTube items remain functional.
- **YouTube embed blocked / video unavailable:** `<YouTubeEmbed>` falls back to thumbnail with action buttons ("Open in browser"). Never renders blank pane.
- **IndexedDB unavailable** (private mode, quota): `CacheService.open` rejects; in-memory fallback for the session; warn once. Feeds still work; extracted articles don't persist across reload.
- **`data.json` save failure:** retry once with linear backoff; if still failing, surface a single banner. Store retains state.
- **Schema migration failure:** refuse to open offending object store, log, prompt for backup before retry. Never silently drop data.
- **Path collision on note save:** suffix `-2`, `-3`, etc. Never overwrite.
- **Filename sanitization yields empty:** fall through to `{itemId}.md`.
- **Process exit / Obsidian kill:** `StateService.flush` registered to `plugin.onunload` writes pending toggles synchronously.
- **Mobile attempt to use desktop-only action:** capability check via `Platform.isDesktop` hides the button. Belt-and-suspenders: `ExternalActionsService` (Phase 2) throws `MobileUnsupportedError` if reached.
- **OPML import with malformed entry:** that entry recorded in `errors[]`; rest of import succeeds.
- **Cancel-add-feed flow:** when the user dismisses the feed picker (multiple-candidates popover, or autodiscovery in flight), the in-flight `requestUrl` is aborted via `AbortController`; no `FeedSource` is added; no error is shown unless the user explicitly retries.
- **Corrupt `data.json`:** `StateService.load` catches the `JSON.parse` error, logs it, returns `defaultSettings()`, and surfaces a one-time banner: "StrataMD: state file unreadable, restored to defaults — your saved notes in the vault are unaffected." User can then re-import OPML / re-add feeds.
- **Abstract phrase disambiguations:**
  - "tolerant feed parsing" → permissive (accept malformed, log skipped items, never reject the entire feed).
  - "graceful degradation" → fall through chain of fallbacks; never throw user-facing error from a single failure.
  - "intentional note creation" → strict (notes only created via explicit user action — keyboard shortcut or menu click; never auto on refresh).

## Out of Scope

Phase 1 explicitly does NOT include:

- OPML export (deferred to Phase 2).
- External Actions Service / mpv integration / yt-dlp metadata enrichment (backlogged → `docs/backlog/stratamd-external-actions-mpv-yt-dlp.md`).
- MiniSearch or full-body indexed search (Phase 2).
- Mobile-store release (Phase 1 ships desktop-first; mobile compatibility is partial — read-only, no external tools).
- AI/LLM features (summary generation, classification, tagging suggestions).
- Cloud sync of subscriptions or state.
- Multi-user or shared-vault scenarios.
- Custom RSS hosting / server / proxy.
- Auto-archiving or batch note creation.
- Pluggable adapter discovery (Rumble, Odysee, Podcast adapters are future work; Phase 1 only ships RSS, Atom-via-RSS, YouTube, WebsiteAutodiscovery, Mock).
- Telemetry, analytics, crash reporting.
- Bundled binaries (Python, ffmpeg, etc.). External tools must be user-installed.
- Custom window manager or workspace layout overrides beyond standard `ItemView` registration.
- User-state export (read/saved/starred sets) — Phase 2. Phase 1's vault-portable artifacts are saved notes (in the vault) and feed list (via Phase-2 OPML export). Read/saved/starred are intentionally local-only in Phase 1.
- SSRF protection / private-IP-range URL validation. StrataMD does not validate user-pasted feed URLs against `10.0.0.0/8`, `192.168.0.0/16`, `127.0.0.0/8`, or link-local ranges. As a personal-use Obsidian plugin running in the user's own process, the user is trusted to supply only legitimate feed URLs.

## Constraints

### Musts
- MUST use Obsidian's `requestUrl` API for all feed and article fetches (no `fetch()`). Enforced by ESLint.
- MUST use Obsidian vault API (`app.vault.create`, `app.vault.modify`) for all note writes — no direct filesystem access.
- MUST emit Bases-compatible frontmatter on saved notes: `type, status, source, url, category, tags, published, saved_at`. All keys present on every note.
- MUST keep main bundle ≤1.5MB minified / ≤400KB gzipped. CI fails on exceedance.
- MUST flush pending `data.json` writes synchronously on `plugin.onunload`.
- MUST scope Tailwind utilities behind a `smd-` prefix.
- MUST respect Obsidian's CSS theme variables (`--background-primary`, `--text-normal`, `--text-muted`, `--background-modifier-border`) for semantic colors.
- MUST isolate single-feed failures via per-feed try/catch + last-good-cache preservation.
- MUST treat note creation as intentional only — never auto-create notes per item.
- MUST hide desktop-only actions (placeholder for Phase 2 mpv/yt-dlp) on mobile via `Platform.isDesktop`.
- MUST use only the canonical runtime dependencies: `react, react-dom, rss-parser, fast-xml-parser, dayjs, sanitize-html, clsx, lucide-react, tailwindcss, zustand, @mozilla/readability, linkedom, @tanstack/react-virtual`. Adding any other runtime dependency requires human approval.
- MUST route all logging through `src/services/Logger.ts`. `console.*` is banned outside that file (ESLint enforced).
- MUST sanitize all extracted article HTML through `sanitize-html` with the explicit allow-list defined in SS-09 acceptance criteria. The allow-list is the single source of truth.
- MUST treat the 8 saved-note frontmatter keys (`type, status, source, url, category, tags, published, saved_at`) as a stability commitment after v1.0. Additive changes (new keys) are allowed; renaming or removing existing keys is a breaking change and requires a major version bump + migration plan.
- MUST configure `fast-xml-parser` with `processEntities: false` (or equivalent) for OPML imports to prevent XXE.

### Must-Nots
- MUST NOT bundle Python, ffmpeg, or any compiled binary.
- MUST NOT introduce a server, daemon, or background HTTP listener.
- MUST NOT require cloud services, accounts, or API keys to function.
- MUST NOT auto-archive, auto-export, or batch-create notes.
- MUST NOT use `console.log/warn/error/info` outside `Logger.ts` (ESLint enforced).
- MUST NOT couple store/UI code to source-specific knowledge (must go through `ISourceAdapter`).
- MUST NOT use static `import { Readability } from '@mozilla/readability'` — must be dynamic `import()` inside `extractArticle.ts` so the dependency stays out of the cold-start bundle.

### Preferences
- Prefer minimal runtime dependencies over convenience libraries.
- Prefer hand-rolled IndexedDB wrapper over `idb` if size matters.
- Prefer concrete file paths over globs in sub-spec File lists.
- Prefer Obsidian theme variables over custom palettes.
- Prefer explicit, named container fields over string-keyed lookups.
- Prefer `React.memo` + selector-scoped subscriptions over context-wide re-renders.
- Prefer one `keydown` listener at the dashboard root over per-component listeners.
- Prefer template-rendered notes over string concatenation.

### Escalation Triggers (stop and ask the human)
- A new runtime dependency is needed beyond the canonical list.
- The bundle-size budget would be exceeded after tree-shaking + lazy-loading attempts.
- A `data.json` schema change is needed after the first published version (requires migration plan).
- The owns/does-not-own rules feel like they need an exception.
- shadcn/Radix portal mounting conflicts with Obsidian DOM and the `PortalRoot` wrapper fallback is insufficient.
- YouTube channel/playlist URL pattern resolution fails for a meaningful class of inputs.
- Mobile platform behavior diverges in a way that needs more than a `Platform.isDesktop` check.

## Phase Specs

Refined by `/forge-prep` on 2026-05-08.

| Sub-Spec | Phase Spec |
|----------|------------|
| SS-01. Project Bootstrap & Build Pipeline | `stratamd-phase-1-rss-reader/sub-spec-01-bootstrap.md` |
| SS-02. Models, Logger, Container, Adapter Interface | `stratamd-phase-1-rss-reader/sub-spec-02-foundations.md` |
| SS-03. Storage Tier (StateService + CacheService) | `stratamd-phase-1-rss-reader/sub-spec-03-storage.md` |
| SS-04. Zustand Store and Selectors | `stratamd-phase-1-rss-reader/sub-spec-04-store.md` |
| SS-05. RSS/Atom Adapter and Mock Adapter | `stratamd-phase-1-rss-reader/sub-spec-05-rss-adapter.md` |
| SS-06. YouTube Adapter (with Plan-B seam) | `stratamd-phase-1-rss-reader/sub-spec-06-youtube-adapter.md` |
| SS-07. Feed Discovery Service & Autodiscovery Adapter | `stratamd-phase-1-rss-reader/sub-spec-07-discovery.md` |
| SS-08. Feed Fetch Scheduler | `stratamd-phase-1-rss-reader/sub-spec-08-scheduler.md` |
| SS-09. Article Preview Service (lazy-loaded) | `stratamd-phase-1-rss-reader/sub-spec-09-article-preview.md` |
| SS-10. Note Service, Templates, Bases Frontmatter | `stratamd-phase-1-rss-reader/sub-spec-10-notes.md` |
| SS-11. OPML Import Service | `stratamd-phase-1-rss-reader/sub-spec-11-opml.md` |
| SS-12. Dashboard View, 3-Pane Layout, Empty States | `stratamd-phase-1-rss-reader/sub-spec-12-dashboard.md` |
| SS-13. Item Cards & Virtualization | `stratamd-phase-1-rss-reader/sub-spec-13-cards.md` |
| SS-14. Preview Components | `stratamd-phase-1-rss-reader/sub-spec-14-preview-components.md` |
| SS-15. Keyboard Shortcuts and Search | `stratamd-phase-1-rss-reader/sub-spec-15-keyboard-search.md` |
| SS-16. Settings Tab, Refresh Hook, Notifications | `stratamd-phase-1-rss-reader/sub-spec-16-settings.md` |
| SS-17. Integration & End-to-End Wiring | `stratamd-phase-1-rss-reader/sub-spec-17-integration.md` |

Index: `stratamd-phase-1-rss-reader/index.md`
Contracts: `stratamd-phase-1-rss-reader/contracts.json`

## Verification

Phase 1 is verified complete when:

1. All 17 sub-spec acceptance criteria pass under `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
2. The integration test from SS-17 passes end-to-end against a fresh test vault containing 100 mixed feeds (RSS, Atom, YouTube channels, YouTube playlists, websites with autodiscovery).
3. Bundle size CI gate passes: `main.js` ≤1.5MB minified, ≤400KB gzipped (`scripts/check-bundle-size.mjs`).
4. Manual smoke test in a real Obsidian instance:
   - Open dashboard from ribbon icon and command palette.
   - Add one feed of each supported type via "Add Feed" and via "Ingest URL" autodetection.
   - Import an OPML file containing ≥5 feeds.
   - Navigate items entirely via keyboard for at least 30 items without touching the mouse.
   - Open three articles in preview pane; one with rich content, one with a paywall (Readability falls through), one with no content (final fallback).
   - Open three YouTube items; play one inline.
   - Save one article note and one YouTube note. Open Obsidian Bases on the vault and confirm both appear with correct frontmatter columns.
   - Toggle a few items as read/saved/starred; force-quit Obsidian (Activity Monitor / Task Manager); relaunch; verify all toggles persisted.
   - Subscribe to 100 feeds via OPML import; observe scheduler refreshes them with no UI freeze, scrolling remains smooth, and search returns results within 150ms of typing.
   - Switch to a dark theme; switch to a light theme. Both render cleanly.
5. Bundle composition spot-check: esbuild metafile shows `@mozilla/readability` and `linkedom` in a separate chunk, not in `main.js`. `MockAdapter` is absent from production bundle.
6. Plugin loads cleanly on Obsidian mobile (desktop-only features hidden, read-only feed reading + note saving works).
