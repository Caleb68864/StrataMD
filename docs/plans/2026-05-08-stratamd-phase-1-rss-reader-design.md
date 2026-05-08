---
date: 2026-05-08
topic: "StrataMD Phase 1 — Ultimate Obsidian RSS Reader"
author: Caleb Bennett
status: evaluated
evaluated_date: 2026-05-08
tags:
  - design
  - stratamd
  - obsidian-plugin
  - rss
---

# StrataMD Phase 1 — Ultimate Obsidian RSS Reader — Design

## Summary

StrataMD is a full-tab knowledge intake and triage cockpit for Obsidian — an RSS and media reader designed to feel like Google Reader evolved inside Obsidian, with native markdown workflows and Bases-compatible note creation. Phase 1 ships a 3-pane dashboard (feeds / items / preview) that handles RSS, Atom, YouTube channels, and YouTube playlists, with autodiscovery, Readability-based article previews, embedded video, intentional note creation, and Newsboat/Vim-inspired keyboard navigation. The chosen architecture front-loads performance (Zustand + tiered storage) so the "smooth with 100+ feeds" target is hit by construction rather than retrofit.

## Approach Selected

**Approach B: Built-for-100-feeds — Performance-first foundation.** Treat the 100+ feed smoothness target as a design driver from day 1: Zustand with selectors instead of Context, tiered storage (`data.json` for hot small state + IndexedDB for item bodies and extracted articles), and source adapters behind a uniform interface with a `MockAdapter` that satisfies the dev-mode requirement by construction. Selected because the priority order lists `stable_rss_reader` first and the `100+ feeds smooth` target is explicit and verifiable — the alternative (Context + `data.json`) collides with that target *within* Phase 1, not after it.

## Architecture

Five horizontal layers inside a single Obsidian plugin:

```
┌─────────────────────────────────────────────────────────────────┐
│  Plugin Shell  (main.ts, settings.ts)                            │
│  - registers StrataDashboardView (ItemViewType = "stratamd")     │
│  - command palette, ribbon icon, settings tab                    │
│  - boots Container (service registry) on onload                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────┴───────────────────────────────────┐
│  React Tree  (mounted inside StrataDashboardView)                │
│    <DashboardRoot>                                                │
│      ├─ <FeedPane>  (left)   ── selectors only                   │
│      ├─ <ItemPane>  (center) ── virtualized list                 │
│      └─ <PreviewPane> (right) ── lazy preview                    │
└──────────────────────────────┬───────────────────────────────────┘
                               │ subscribes via selectors
┌──────────────────────────────┴───────────────────────────────────┐
│  Store  (Zustand)                                                │
│  - feedsById, itemsById (lightweight refs only — no bodies)      │
│  - userState (read/saved/starred/ignored Sets)                   │
│  - selection, filters, currentView, ui                           │
│  - actions delegate to Services; Store never does I/O            │
└──────────────────────────────┬───────────────────────────────────┘
                               │ calls
┌──────────────────────────────┴───────────────────────────────────┐
│  Services  (plain TS classes, framework-free, testable)          │
│  Source Adapters | FeedFetchScheduler | ArticlePreviewService    │
│  DiscoveryService | NoteService | ExternalActionsService         │
│  YouTubeService | YtDlpService | CacheService | StateService     │
└──────────────────────────────┬───────────────────────────────────┘
                               │ reads/writes
┌──────────────────────────────┴───────────────────────────────────┐
│  Storage Tier                                                    │
│  data.json  (small, hot)         IndexedDB  (large, cold)        │
│  - feeds[], categories[]         - items (by feedId, by id)      │
│  - userState (id Sets)           - itemBodies, extractedArticles │
│  - settings, prefs               - thumbnailBlobs (optional)     │
│           Network: app.requestUrl  (Obsidian's CORS-free fetch)  │
└──────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

1. **React mounts inside `ItemView.onOpen`** into `this.contentEl` via `createRoot(...)`; tear-down on `onClose` calls `root.unmount()`. View registers `getViewType() = "stratamd"` and is opened by command/ribbon — full-tab dashboard requirement satisfied.
2. **Store-as-truth, never-as-I/O.** Components read selectors only; actions delegate to services; services emit results back into the store. This is what makes "no UI freezes during feed refresh" honest.
3. **Source Adapters behind `ISourceAdapter`.** Phase 1 ships RSS, Atom (often shared), YouTube, WebsiteAutodiscovery, Mock. Future Rumble/Odysee/Podcast adapters drop in without store or UI changes.
4. **Two-tier storage by access pattern.** `data.json` for everything read on every render (feed list, categories, read/saved/starred Sets). IndexedDB for everything large, lazy, or per-item.
5. **Network through `app.requestUrl`** in every adapter — CORS-free on desktop, sandbox-respectful on mobile.
6. **Refresh scheduler is a service, not a React effect.** Lives in the Container; survives view close/reopen; staggers requests with concurrency cap (default 4); dedupes in-flight requests by feed ID.
7. **Mobile boundary is a single `Platform.isDesktop` check** in `ExternalActionsService` and the toolbar.
8. **YouTube adapter is a hot-swap seam.** Phase 1 uses the `feeds/videos.xml?channel_id=…` endpoint. The adapter interface isolates this so a future scrape-based or API-based implementation can replace it without store or UI changes if Google removes the endpoint.

## Bundle Strategy

The plugin must remain submission-friendly for the Obsidian community plugin store, where main-bundle size <1.5MB is the practical norm.

- **Target:** main bundle ≤1.5MB minified, ≤400KB gzipped. CI fails if exceeded.
- **Code-splitting via dynamic import:**
  - `ArticlePreviewService` lazy-loads `@mozilla/readability` + `linkedom` only on first article extraction. Keeps cold-start fast and excludes weight from users who only read YouTube items.
  - `<YouTubeEmbed>` lazy-loads only when first video item is selected.
  - `MockAdapter` is dev-only; tree-shaken from production builds via `process.env.NODE_ENV === 'production'` guards.
- **Build:** esbuild with `--minify --bundle --platform=browser --tree-shaking=true`. Externalize `obsidian` (provided at runtime).
- **shadcn/ui:** copy-in only the components actually used (Button, Tooltip, Popover, ScrollArea, Separator, Toggle). No barrel imports of the full library.
- **Tailwind:** content-scan limited to `src/**/*.{ts,tsx}` so unused utilities are purged.

## New-Item Notification Behavior

Refreshes are **silent by default**, consistent with the `no_vault_spam` philosophy.

- **Always-on signal:** unread badges on `<FeedCard>` and the ribbon icon update reactively. Animated pulse on transition from 0 → N for that feed.
- **Opt-in per feed:** `FeedSource.notifyOnNew: boolean` (default `false`). When `true`, a refresh that yields ≥1 new item emits one Obsidian Notice per feed: `"{feed.displayName}: {n} new"`. Notices are rate-limited to one per feed per 5 minutes to prevent storms during catch-up after offline.
- **Global override:** `settings.suppressAllNotifications: boolean` (default `false`) silences notices regardless of per-feed setting; useful during writing sessions.

## Components

### Plugin Shell
- **`main.ts` (StrataMDPlugin)** — Owns lifecycle. Builds Container, loads `data.json`, opens IndexedDB, registers view + commands + ribbon + settings tab. Does NOT own UI rendering, parsing, or business logic.
- **`settings.ts`** — Owns persisted settings shape and Obsidian settings UI. Pure config.

**Phase 1 Command Palette surface area** (registered in `main.ts`):
- `StrataMD: Open Dashboard`
- `StrataMD: Add Feed`
- `StrataMD: Ingest URL` (auto-detect source type)
- `StrataMD: Import OPML`
- `StrataMD: Refresh All`
- `StrataMD: Refresh Selected Feed`
- `StrataMD: Search`
- `StrataMD: Toggle Compact Mode`
- `StrataMD: Mark All Read`

**Ribbon icon** displays the global unread count as a styled badge (small numeric overlay) for adoption parity with native applications.

### View Layer
- **`StrataDashboardView` (extends ItemView)** — Owns React root mount/unmount. Passes Container to React via `<StrataProvider>`.

### React Components
- **`<DashboardRoot>`** — 3-pane CSS grid + toolbar. Owns layout breakpoints (collapses to 2-pane on narrow widths).
- **`<Toolbar>`** — Add Feed, Ingest URL, Refresh, Search, Compact toggle, Settings shortcut. Pure dispatch.
- **`<FeedPane>`** — Smart views, categories tree, feed list with unread counts, health indicators. Subscribes to `feeds` and `unreadCountsByFeedId` only.
- **`<ItemPane>`** — Virtualized list of `<ItemCard>` (`@tanstack/react-virtual`). Owns scroll position per view. Uses per-id selectors so a single item's read-state change doesn't re-render the list.
- **`<PreviewPane>`** — Routes by item type to `<ArticlePreview>`, `<YouTubeEmbed>`, or `<BookmarkPreview>`. Owns lazy preview load, image lazy-loading, action buttons.
- **`<FeedCard>`, `<ItemCard>`** — Memoized atoms with single-id selectors.
- **`<SearchBar>`** — 150ms debounced.

### Hooks
- **`useStrataStore`** — Zustand binding + typed selectors.
- **`useFeedRefresh`** — Wraps scheduler events into reactive state for spinners and timestamps. Does not trigger refreshes.
- **`useKeyboardShortcuts`** — Single root-level keydown handler. Maps Newsboat/Vim bindings (`j/k`, `n/p`, `o`, `s`, `*`, `r`, `/`, `m`, `gg/G`). Reads bindings from settings.
- **`usePreviewLoader`** — Async preview fetch with cancellation when selection moves.
- **`useVirtualizedList`** — Wrapper to allow swapping virtualization libs.

### Services
- **`Container`** — Plain object holding singleton service instances. Built in `onload`.
- **`ISourceAdapter`** — `detect / resolve / fetch / parse`. Implementations: RSS, YouTube, WebsiteAutodiscovery, Mock.
- **`FeedDiscoveryService`** — URL → adapter selection; autodiscovery walk (rel="alternate" + `/feed`, `/rss`, `/atom.xml` probes).
- **`FeedFetchScheduler`** — Cron-ish loop, concurrency cap, staggering, retry/backoff, dedup, last-good-cache preservation. Emits `RefreshEvent`s.
- **`FeedParserService`** — Tolerant parse via `rss-parser` + `fast-xml-parser`. FreshRSS lesson: log and skip malformed items.
- **`YouTubeService`** — Resolves `@handle`, `/channel/`, `/user/`, `/c/`, playlists to canonical feed URLs (`youtube.com/feeds/videos.xml?channel_id=…`).
- **`YtDlpService`** — Optional metadata enrichment via spawned executable. Desktop only. No-ops if missing.
- **`ArticlePreviewService`** — Readability-first extraction (`@mozilla/readability` + `linkedom`). Fallback chain: extracted → `content:encoded` → summary → "no preview" pane. Sanitizes via `sanitize-html`. Caches in IndexedDB.
- **`NoteService`** — Owns markdown emission. Loads `templates/article.md`, `templates/youtube.md`. Routes by category → feed → mediaType → fallback inbox. Vault API only. Bases-compatible frontmatter.
- **`ExternalActionsService`** — Spawns external processes (mpv, future aria2c/vlc). Desktop only; throws `MobileUnsupportedError` if reached.
- **`CacheService`** — IndexedDB schema, migrations, pruning policy.
- **`StateService`** — `data.json` reads/writes via `loadData`/`saveData`. Debounces saves 250ms during normal operation; **flushes synchronously on `plugin.onunload`** and on `workspace.on('quit')` to guarantee read/saved/starred toggles are not lost when Obsidian is killed.
- **`OPMLService`** — Imports OPML 1.0/2.0 subscription lists into `feeds[]` with category preservation. Phase 1 supports import only; export deferred to Phase 2 (see Open Questions). Parses via `fast-xml-parser` (already a dep). On import: deduplicates by feed URL, prompts for category override if the OPML's `<outline>` tree disagrees with existing categories, and runs initial `refreshNow` per imported feed staggered through the scheduler.

### Models
- **`FeedSource`** — `{ id, url, displayName, sourceType, category?, tags[], refreshIntervalMin, health }`.
- **`FeedItem`** — `{ id, feedId, sourceType, title, url, author?, published, summary?, thumbnailUrl?, mediaType, durationSec? }`.
- **`UserState`** — `{ readIds: Set, savedIds: Set, starredIds: Set, ignoredIds: Set, scrollPositions }`.

### Owns / does not own — quick rules
- Components own *layout and interaction*, never I/O.
- Hooks own *subscription wiring*, never persistence.
- Store owns *current truth*, never side effects.
- Services own *side effects*, never React state.
- Adapters own *source-specific knowledge*, never UI.

### Empty States

Concrete states the agent must implement so the dashboard never feels broken:

- **First launch (no feeds):** `<DashboardRoot>` shows centered welcome panel with three primary CTAs: "Add Feed", "Import OPML", "Try with sample feeds" (loads MockAdapter content for evaluation). One-line description: "StrataMD is your knowledge intake cockpit. Start by adding a feed."
- **Smart view with zero items** (e.g., Starred when nothing is starred): view-specific message rendered inside `<ItemPane>` — "No starred items yet. Press `*` on an item to star it."
- **Search with zero results:** echoes the query and offers "Clear filters" link plus "Try a broader search" hint.
- **Feed with all items read** (when "Unread only" toggle is on): "All caught up." with refresh-time hint.
- **Selected feed has zero items at all** (new feed not yet refreshed, or feed went silent): "No items yet. Last refreshed {ago}." with manual Refresh button.
- **Preview pane with no selection:** subtle keyboard-hint card showing primary bindings (`j/k` next/prev, `s` save, `o` open).

## Data Flow

### Plugin boot
`onload()` → `Container.build()` → `StateService.load()` (data.json) → `CacheService.open()` (IndexedDB) → `store.hydrate()` → register view/commands/ribbon → `FeedFetchScheduler.start()` after idle delay (default 3s), skipping feeds whose `lastSuccess` is within their refresh interval. React doesn't render until the user opens the dashboard.

### Add a feed
Toolbar dispatch → `store.actions.addFeed(url)` → `FeedDiscoveryService.resolve(url)` (tries adapters in order). Multiple candidates → non-modal picker popover. On confirm: `StateService.upsertFeed` (debounced save) + `store.set(feeds += source)` + `FeedFetchScheduler.refreshNow(source.id)`. Discovery returns nothing → toolbar inline error.

### Background refresh tick
Scheduler tick (every 60s) → pick due feeds (`lastSuccess + intervalMin < now`), cap concurrency at 4 → for each: `adapter.fetch` via `app.requestUrl` → `adapter.parse` → diff vs IndexedDB by item id (guid/url-hash) → `CacheService.putItems(newItems)` → `store.applyDelta`. Failure: `consecutiveFailures++`, preserve last-good cache, surface health in store. **Critical:** scheduler never holds a lock the UI needs — it writes only items + health, never read/saved state.

### Selection → preview
`j` (or click) → `selectNext()` → store updates `selectedItemId` → only that `<ItemCard>` re-renders → `<PreviewPane>` sees change → `usePreviewLoader` routes by mediaType. Video → `<YouTubeEmbed>` (thumbnail first, iframe on click). Article → `CacheService.getExtractedArticle(itemId)` (hit returns immediately; miss calls `ArticlePreviewService.extract` → Readability → sanitize → cache → render with abort if selection changed). Auto-mark-read writes `userState.readIds`; debounced save to data.json. **Bodies never write to data.json.**

### Save as note
`s` → `NoteService.save(item, extractedHtml)` → choose template by mediaType → choose folder by routing rules → render template with computed frontmatter → `app.vault.create(path, markdown)` → `store.actions.markSaved(itemId)` → toast with path.

### Search / filter
`<SearchBar>` 150ms debounce → `setSearchQuery(q)` → store derives `currentItemIds` via memoized selector (visibleFeedIds × matchingItems) → `<ItemPane>` re-virtualizes. Phase 1: in-memory substring on title+summary. Index built lazily on first search per session.

### Cache lifecycle (cross-cutting)
- **Write:** items appended to IndexedDB `items` store, key `[feedId, itemId]`.
- **Prune (daily, idle):** items older than `pruneAfterDays` (default 30) AND not in `savedIds | starredIds` are deleted.
- **Feed remove:** all items + extracted articles for that feed deleted; saved notes in vault untouched (they live in vault, not cache).
- **Migration:** schema-version check on open; sequential migrations.

## Error Handling

**Failure-isolation principle.** A failure in any single feed, adapter, preview, external tool, or note write must not unmount the dashboard, freeze the UI, or invalidate other in-flight work. Three React error boundaries (`<FeedPaneBoundary>`, `<ItemPaneBoundary>`, `<PreviewPaneBoundary>`) plus typed service errors caught at the action layer.

### Per-component contracts

- **Scheduler / Adapter failures.** Network/4xx/5xx → `consecutiveFailures++`, exponential backoff (cap 1h), red dot on `<FeedCard>` with tooltip, last-good cache untouched. After 5 consecutive failures: `health: 'unhealthy'` and one dismissable banner. Auto-recovers on next success. 30s request timeout.
- **Malformed feed XML / partial parse.** `rss-parser` tolerant mode; total parse fail → log and count as failure. Items missing required fields skipped and counted in dev log. Malformed dates fall back to `now` with a flag on the item.
- **Article extraction failure.** Readability fail → `content:encoded` → summary → "No preview available — open original" pane. 10s extraction timeout. Sanitizer-stripped iframes/scripts are silent.
- **YouTube resolution failure.** Channel handle unresolved → manual entry box ("Paste channel RSS URL or channel ID"). Embed blocked / unavailable → thumbnail with "Open in browser" / "Open in mpv" actions. Never a blank pane.
- **External tool failures.** Executable missing → `ExecutableNotFoundError`; tooltip with configured path + settings link. Spawn error / non-zero exit → toast with stderr first 200 chars + "View log" expand. Mobile attempt → button hidden by capability check; service throws `MobileUnsupportedError` belt-and-suspenders.
- **Note save failures.** Path collision → suffix `-2`, `-3`. Never overwrite. Vault/IO error → toast; item NOT marked saved (allows retry). Filename sanitization fails → fall through to `{item-id}.md`.
- **Storage layer.** IndexedDB unavailable (private mode/quota) → in-memory fallback for the session; warn once. `data.json` save failure → retry with linear backoff; if still failing, banner; user state stays in store. Schema migration failure → refuse to open offending store, log, prompt for backup before retry. Never silently drop data.
- **Process exit / Obsidian kill.** `StateService` registers a flush-on-unload hook in `plugin.onunload` that synchronously writes any pending debounced state to `data.json`. Read/saved/starred toggles made within 250ms of close are preserved.

### Top three most likely failure modes
1. **One feed stays broken.** Isolated by per-feed try/catch + last-good cache. Dashboard fully usable; only that feed shows red.
2. **Article extraction times out on a slow site.** Bounded by 10s abort + fallback chain. User always sees something in preview.
3. **Refresh storm on plugin reload after long offline period.** Mitigated by staggering + concurrency cap + idle-delay before first refresh + skip-recently-fetched logic.

### Logging
`Logger` service with levels (`error | warn | info | debug`). Dev mode → `debug`; production → `warn`. All errors include feed ID and adapter name when relevant. ESLint rule forbids `console.log` outside Logger.

## Success Criteria

1. Dashboard opens as a full tab inside Obsidian.
2. RSS feed can be added manually by URL.
3. Website URL autodiscovers a feed.
4. YouTube channel URL (`@handle`, `/channel/`, `/user/`, `/c/`) resolves to channel RSS.
5. YouTube playlist URL resolves to playlist RSS.
6. Item cards render correctly with thumbnails and metadata.
7. Image previews work (lazy-loaded).
8. Article previews render (Readability-first with fallback chain).
9. YouTube embeds play (thumbnail-first, iframe on click).
10. Notes save correctly with templated, Bases-compatible frontmatter.
11. Obsidian Bases displays saved notes cleanly.
12. Keyboard navigation feels good (Newsboat/Vim/Google Reader inspired).
13. Plugin remains smooth with 100+ feeds.
14. Plugin feels like a real application, not a small widget.
15. OPML 1.0/2.0 subscription lists can be imported (export deferred to Phase 2).
16. Empty states render correctly for first-launch, zero-item views, zero-search, all-read, no-selection, and never-refreshed feeds.
17. User state (read/saved/starred) survives Obsidian kill — verified by toggle-then-quit-then-relaunch test.
18. Production bundle size ≤1.5MB minified, ≤400KB gzipped (CI-enforced).

## Exclusions

- No cloud services
- No Docker or container dependencies
- No server requirements
- No mandatory AI features
- No bundled Python (yt-dlp is external executable only)
- No custom window manager
- No reimplementing Obsidian's navigation
- No hidden background servers
- No auto-creating notes for every feed item (creation is intentional only)
- No full media-server functionality
- No auto-archiving everything
- No direct filesystem access (vault API only)

## Open Questions

1. **Virtualization library:** `@tanstack/react-virtual` vs `react-window`. Recommendation: `@tanstack/react-virtual` for variable heights and modern hooks API.
2. **Auto-mark-read trigger:** immediate vs N-second dwell vs manual. Recommendation: configurable, default "after 2s dwell."
3. **Tailwind scoping inside Obsidian:** prefix (e.g., `smd-`) + wrapper class to avoid leaking into themes. Pin in spec.
4. **Search engine for Phase 1:** simple substring vs MiniSearch. Recommendation: substring in Phase 1; MiniSearch in Phase 2 with full-body indexing.
5. **Refresh tick baseline:** suggest 60s tick, default 30min per-feed interval.
6. **Feed favicons:** scrape during discovery and cache as IndexedDB blob (recommended) vs Google S2 service (privacy concern) vs skip in Phase 1.
7. **Preview pane width persistence:** global setting (recommended) vs per-view.
8. **YouTube `@handle` resolution:** HTML scrape (`meta[itemprop=channelId]`) vs YouTube data API. Recommendation: HTML scrape — no required external setup.
9. **Mobile in Phase 1:** ship desktop-first with mobile follow-up vs both at once. Recommendation: desktop-first.
10. **shadcn/ui (Radix) portal collision risk:** Radix primitives use `document.body` portals which may stack-conflict with Obsidian's modal/popover stack. Validate during dashboard sub-spec; fallback is to render popovers inside `<DashboardRoot>` via a `PortalRoot` wrapper.
11. **OPML export deferral confirmation:** Phase 1 ships import only. Confirm export lands in Phase 2 (not later) so users can round-trip when migrating again.
12. **Per-feed pruning override:** global `pruneAfterDays` plus optional `feed.pruneAfterDays` override. Worth it in Phase 1 vs. Phase 2?
13. **YouTube endpoint contingency plan:** if Google removes `feeds/videos.xml`, what is the documented Plan-B (scrape-based or yt-dlp-based adapter)? Decide approach so the YouTubeAdapter is shaped correctly even though Plan-A ships first.

## Approaches Considered

- **Approach A — Ship-the-skeleton (Brain-dump-faithful):** Context + reducers, `data.json` cache, vertical slice. *Not selected.* Matches stated preferences but `data.json`'s whole-file rewrite + Context's wide re-render tree collide with the 100+ feeds smoothness target inside Phase 1, forcing a mid-phase rewrite.
- **Approach B — Built-for-100-feeds (Selected):** Zustand + tiered storage + adapter interfaces with mock dev mode. *Selected* because it hits the explicit performance target by construction, makes `development_mode.required: true` a free side effect of the adapter abstraction, and lets the future-adapter goal (Rumble/Odysee/Podcast) drop in without churn.
- **Approach C — UI-first against mocks (Polish-led):** full dashboard against mocks, real feeds last. *Not selected.* Defers the riskiest integration work (CORS, malformed feeds, YouTube quirks) to the end, when UI is already shaped around clean mock data; cache rewrite still likely needed.

## Commander's Intent

**Desired End State.** Phase 1 is done when an Obsidian user can: open the StrataMD dashboard as a full tab; add RSS, Atom, YouTube channel/playlist, or arbitrary website URLs and have feeds discovered automatically; import an OPML file; navigate items with the keyboard alone (Newsboat/Vim bindings); read articles and watch YouTube videos in the preview pane; save items to the vault as Bases-compatible markdown notes intentionally (never automatically); and have the dashboard remain visibly responsive while 100+ feeds are subscribed. All 18 acceptance criteria pass when run against a test vault with 100 mixed feeds.

**Purpose.** Power users — the kind that lived inside Google Reader, Newsboat, FreshRSS, or Tiny Tiny RSS — currently have no first-class option inside Obsidian. Existing Obsidian RSS plugins are widgets, not applications. StrataMD exists to give those users a serious knowledge intake and triage cockpit that lives where their notes already do, so the path from "interesting feed item" to "permanent note in my vault" is one keystroke and zero context switches. The plugin is the difference between *consuming feeds* and *owning your information diet*.

**Constraints (MUST):**
- MUST use Obsidian's `requestUrl` API for all feed and article fetches (no `fetch()`).
- MUST use Obsidian vault API (`app.vault.create`, `app.vault.modify`) for all note writes — no direct filesystem access.
- MUST emit Bases-compatible frontmatter on saved notes: `type, status, source, url, category, tags, published, saved_at`.
- MUST keep main bundle ≤1.5MB minified / ≤400KB gzipped.
- MUST flush pending `data.json` writes synchronously on `plugin.onunload`.
- MUST scope Tailwind utilities behind a prefix to avoid leaking into Obsidian themes.
- MUST respect Obsidian's CSS theme variables for colors and spacing where reasonable; custom palettes only where Tailwind utilities replace theme styling.
- MUST isolate single-feed failures via per-feed try/catch + last-good-cache preservation.
- MUST treat note creation as intentional only — never auto-create notes per item.
- MUST hide desktop-only actions (mpv, yt-dlp) on mobile via `Platform.isDesktop` capability check.

**Constraints (MUST NOT):**
- MUST NOT bundle Python or any compiled binary; external tools are user-installed executables only.
- MUST NOT introduce a server, daemon, or background HTTP listener.
- MUST NOT require cloud services, accounts, or API keys to function. Optional integrations (e.g., yt-dlp) may be configured but never required.
- MUST NOT auto-archive, auto-export, or batch-create notes.
- MUST NOT use `console.log` outside the `Logger` service (ESLint-enforced).
- MUST NOT couple store/UI code to source-specific knowledge (must go through `ISourceAdapter`).

**Freedoms (the implementing agent MAY):**
- MAY choose the exact `tsconfig.json` strict-mode flags within "strict TypeScript" intent.
- MAY pick the Tailwind prefix string (e.g., `smd-`).
- MAY pick the precise virtualization library (`@tanstack/react-virtual` is recommended but `react-window` is acceptable).
- MAY choose the IndexedDB wrapper (`idb` library or hand-rolled). Hand-rolled is preferred to keep bundle small.
- MAY name files, folders, and internal types freely as long as the architecture's owns/does-not-own rules are respected.
- MAY add lightweight dev-only utilities (e.g., a fixtures helper) without approval.
- MAY pick exact CSS class names within the prefixed scope.
- MAY implement `<ItemCard>` visuals with reasonable design taste; the brain dump's visual goals are intent, not pixel specs.

## Execution Guidance

**Observe (signals to monitor during implementation):**
- TypeScript compiler errors (`tsc --noEmit`) — must be zero before any commit.
- ESLint warnings on changed files — must be zero.
- Production bundle size from esbuild output (`--metafile`) — must be ≤1.5MB main, ≤400KB gzipped. Fail CI if exceeded.
- Hot-reload success in development Obsidian instance after each save.
- Visual regression: dashboard renders correctly in both default light and default dark themes after each component change.
- Refresh storm metric: dev-mode counter for in-flight requests; should never exceed concurrency cap (4).

**Orient (context to maintain):**
- StrataMD bootstraps from `obsidian-sample-plugin` — follow its `manifest.json`, `versions.json`, `esbuild.config.mjs`, and `main.ts` lifecycle conventions.
- Store-as-truth: any new state lives in Zustand store. Components subscribe via selectors only. If you find yourself wanting `useState` for shared data, you're wrong — use the store.
- Owns/does-not-own rules (Components own layout/interaction; Hooks own subscription wiring; Store owns truth; Services own side effects; Adapters own source-specific knowledge) are non-negotiable. Violations are the most common refactor reason in feed readers — do not start them.
- Adapter interface is the seam for all source-specific knowledge. RSS quirks live in `RSSAdapter`. YouTube URL patterns live in `YouTubeAdapter`. Do not leak these into store or UI under any condition.
- Network always goes through `app.requestUrl`. Direct `fetch()` is banned (ESLint rule).
- `Logger` service is the only logging path. `console.*` is banned (ESLint rule).

**Escalate When (stop and ask the human):**
- A new runtime dependency is needed beyond the brain dump's recommended packages (`react`, `react-dom`, `rss-parser`, `fast-xml-parser`, `dayjs`, `sanitize-html`, `clsx`, `lucide-react`, `tailwindcss`, `zustand`, `@mozilla/readability`, `linkedom`, `@tanstack/react-virtual`).
- The bundle-size budget is exceeded and tree-shaking + lazy-loading do not bring it back under.
- A `data.json` schema change is needed after the first version is shipped (requires migration plan).
- The owns/does-not-own rules feel like they need an exception (they almost certainly don't — clarify the rule with the human first).
- shadcn/Radix portal mounting conflicts with Obsidian DOM in unexpected ways and the `PortalRoot` wrapper fallback isn't enough.
- YouTube channel/playlist URL pattern resolution fails for a meaningful class of inputs and the manual override path isn't sufficient.
- Mobile platform behavior diverges in a way that needs more than a `Platform.isDesktop` check.

**Shortcuts (apply without deliberation):**
- React mounts via `createRoot(this.contentEl)` in `ItemView.onOpen`; tear down in `onClose`. Pattern is identical across all Obsidian React plugins.
- All adapters implement `ISourceAdapter` with `detect / resolve / fetch / parse` — no exceptions, no shortcuts that bypass `parse`.
- All vault writes use `app.vault.create(path, content)` or `app.vault.modify(file, content)`. Never use `app.vault.adapter.write` directly.
- All settings reads/writes go through `StateService.loadData / saveData`. Never call `this.loadData()` from anywhere except `StateService`.
- Test files live in `__tests__/{module}.test.ts` co-located with the module they test. Use Vitest (matches Obsidian community plugin norms; faster than Jest for ESM).
- Frontmatter generation goes through a single utility `frontmatter.ts` so Bases sees consistent shapes across all template types.
- All Obsidian-API mocks for tests live in `__mocks__/obsidian.ts` — write once, reuse everywhere.

## Decision Authority

**Agent decides autonomously:**
- File and folder structure within `src/` (matching the architecture's stated layout).
- Test organization and individual test case design within Vitest conventions.
- Variable, function, type, and class naming.
- Internal implementation of services behind their published interface.
- Exact toast/error wording (provided it remains user-friendly and includes actionable context).
- Tailwind prefix value (e.g., `smd-`).
- Virtualization library pick between `@tanstack/react-virtual` and `react-window` (default to the former).
- Empty-state copy text (within the Empty States subsection's intent).
- Keybinding-binding map exact strings (within the Newsboat/Vim/Google Reader inspiration set).
- IndexedDB wrapper choice (`idb` vs hand-rolled — prefer hand-rolled for size).
- ESLint and Prettier rule sets (within strict-TS and project norms).

**Agent recommends, human approves:**
- Adding any runtime dependency beyond the listed set.
- Schema changes to `data.json` after the first published version (requires migration plan).
- Adding a new IndexedDB object store or bumping its schema version.
- Deviating from store-as-truth or owns/does-not-own rules.
- Performance trade-offs (relaxing the concurrency cap, swapping virtualization libraries late).
- Bundle-size budget exceedances.
- Adding any environment-dependent code path beyond `Platform.isDesktop` checks.

**Human decides:**
- Phase 1 acceptance-criteria scope changes (adding/removing/altering AC items).
- OPML export inclusion in Phase 1 vs. Phase 2 (currently deferred).
- Mobile-in-Phase-1 vs. desktop-first ship (currently leaning desktop-first).
- YouTube data-API adoption (introduces required-key user setup).
- Search engine choice when ambiguous (substring vs MiniSearch).
- Telemetry/metrics inclusion or exclusion.
- Any change to the brain dump's stated philosophy or anti-patterns list.
- Choice of Plan-B for YouTubeAdapter contingency (Open Question #13).

## War-Game Results

**Most Likely Failure.** YouTube channel-handle resolution fails for an edge URL — new YouTube URL pattern, unicode handle, regional domain, or Google's HTML structure shift removing `meta[itemprop=channelId]`. **Mitigation:** Manual override path (paste channel RSS URL or channel ID directly) is already in the design. Adapter is shaped so resolution failure does not break the rest of the dashboard. Periodic validation of the scrape pattern is needed during maintenance.

**Scale Stress.** 200 feeds × 200 items each = 40K items. IndexedDB handles this comfortably (well within typical browser quotas of hundreds of MB). In-memory search index over titles + summaries ≈ 4MB — fine. Risk surface: `userState.readIds` Set could grow beyond 50K entries over years of use, slowing JSON parse on boot. **Mitigation:** Add a periodic prune step that removes `readIds` entries for items no longer present in cache (read-state for already-pruned items is dead data). Schedule it during the same idle prune window as item pruning.

**Dependency Risk.** Google removes the `youtube.com/feeds/videos.xml?channel_id=…` endpoint (ASM-6). Phase 1 YouTube acceptance criteria #4, #5, #9 all break for new resolutions; existing feeds may keep working until next refresh fails. **Mitigation:** YouTubeAdapter is designed as a hot-swap seam (Architecture key decision #8). Documented Plan-B options: scrape-based item discovery from the channel page, or `yt-dlp`-based metadata pull where available. Open Question #13 captures the contingency-plan decision.

**Maintenance Assessment (6-month read-through).** Strong. The architecture diagram, owns/does-not-own rules, adapter pattern, and clearly bounded service responsibilities make this an unusually readable design. A new contributor should be able to add a new source adapter (e.g., Rumble) in under a day by copying `RSSAdapter` as a template and implementing `ISourceAdapter`. The biggest 6-month risk is drift: if the store-as-truth rule is broken once, it tends to be broken again. Recommend a ESLint rule (or test) that fails when `useState` is used for cross-component data.

## Evaluation Metadata

- Evaluated: 2026-05-08
- Cynefin Domain: Complicated
- Critical Gaps Found: 0 (0 resolved)
- Important Gaps Found: 5 (5 resolved)
- Suggestions: 3 (3 incorporated)
- Assumptions audited: 16 (2 high-severity flagged for spec-time mitigation: ASM-4 Radix portals, ASM-6 YouTube endpoint)

## Next Steps

- [ ] Turn this evaluated design into a Forge spec (`/forge`) with sub-specs for: project bootstrap, store + storage tier, RSS/Atom adapter + scheduler, YouTube adapter (with Plan-B seam), discovery service, OPML import, dashboard view + 3-pane shell + empty states, keyboard shortcuts, article extraction (lazy-loaded), note service + templates + Bases frontmatter, settings + dev-mode mocks, bundle-size CI gate.
- [ ] Pin Open Question #1 (virtualization lib), #3 (Tailwind scoping), and #10 (Radix portal containment) before the dashboard sub-spec.
- [ ] Decide on Phase 1 mobile inclusion before the settings sub-spec (affects `Platform.isDesktop` boundaries).
- [ ] Decide on Open Question #13 (YouTube Plan-B) so the YouTubeAdapter interface is shaped correctly from day 1 even though Plan-A ships first.
- [ ] Bootstrap the StrataMD repo from `obsidian-sample-plugin` once the master spec is approved.
