---
date: 2026-05-08
project: "StrataMD"
repo: "C:/Users/CalebBennett/Documents/GitHub/StrataMD"
type: project-overview
tags:
  - project-docs
  - stratamd
---

# StrataMD — Project Overview

> **Project status:** Greenfield. Repository skeleton (README, LICENSE, .gitignore, docs/) is in place. Source code lands when SS-01 (Project Bootstrap) executes; until then the codebase is the spec.

## What this project is

StrataMD is an Obsidian community plugin that turns Obsidian into a full-tab knowledge intake and triage cockpit for RSS, Atom, YouTube channels/playlists, and arbitrary websites with autodiscovery. Spiritual successor to Google Reader, modeled after Tiny Tiny RSS, Newsboat, and FreshRSS but native to Obsidian's markdown-first workflow.

## Tech Stack (intended — locks in at SS-01)

- **Plugin host:** Obsidian community plugin (`isDesktopOnly: false`, partial mobile support)
- **Language:** TypeScript with strict flags (`strict, noImplicitAny, noUncheckedIndexedAccess, exactOptionalPropertyTypes`)
- **UI framework:** React 18 mounted via `createRoot` inside an `ItemView`
- **State:** Zustand with selector-scoped subscriptions (no Context for cross-tree state)
- **Styling:** TailwindCSS prefix-scoped (`smd-`) + Obsidian theme variables (`var(--background-primary)`, etc.)
- **Components:** shadcn/ui primitives via Radix (with a `<PortalRoot>` wrapper for Obsidian DOM compatibility)
- **Storage:** Two-tier — `data.json` for hot small state (versioned via `schemaVersion`), IndexedDB for items, item bodies, extracted articles
- **Network:** Obsidian's `app.requestUrl` (CORS-free desktop, sandbox-safe mobile). `fetch()` is ESLint-banned.
- **Bundler:** esbuild with tree-shaking; CI gate ≤1.5MB minified, ≤400KB gzipped
- **Tests:** Vitest with `__mocks__/obsidian.ts`
- **Lint/format:** ESLint + Prettier

## Architecture (5-layer)

```
Plugin Shell (main.ts, settings.ts)
    ↓
React Tree (DashboardRoot → FeedPane / ItemPane / PreviewPane)
    ↓ selector subscriptions
Store (Zustand — slices: feedsById, itemsById, userState, selection, filters, ui)
    ↓ delegates I/O
Services (Adapters, Scheduler, Discovery, Preview, Notes, OPML, Notifications, Logger)
    ↓
Storage Tier (data.json + IndexedDB)
```

### Owns / does-not-own discipline (non-negotiable)
- Components own *layout and interaction*, never I/O.
- Hooks own *subscription wiring*, never persistence.
- Store owns *current truth*, never side effects.
- Services own *side effects*, never React state.
- Adapters own *source-specific knowledge*, never UI.

## Directory Structure (intended after SS-01)

```
StrataMD/
├── docs/                        # Tracked design artifacts (plans, specs, backlog)
│   ├── plans/                   # Brainstorm/design docs
│   ├── specs/                   # Forge master + phase specs
│   ├── backlog/                 # Deferred sub-specs
│   └── notes/                   # Project documentation (this file)
├── harness/                     # Project harness (init.sh + checks/)
├── scripts/                     # Build helpers + git hooks (decision-log enforcement)
├── src/                         # Source code (lands at SS-01)
│   ├── main.ts
│   ├── settings.ts
│   ├── views/                   # StrataDashboardView (Obsidian ItemView)
│   ├── components/              # React components (cards, panes, previews, empty states)
│   ├── hooks/                   # useStrataStore, useKeyboardShortcuts, useFeedRefresh, useVirtualizedList, usePreviewLoader
│   ├── store/                   # Zustand store + selectors + actions
│   ├── services/                # Adapters, Scheduler, Discovery, Preview, Notes, OPML, Storage, Logger
│   └── models/                  # FeedSource, FeedItem, UserState
├── templates/                   # article.md, youtube.md, bookmark.md
├── __tests__/                   # Vitest tests (co-located with services where appropriate)
├── __mocks__/                   # obsidian.ts mock
└── vault/                       # Local-only forge state (gitignored)
```

## Key Patterns (locked by spec)

- **Adapter interface:** every source implements `ISourceAdapter` (`detect / resolve / fetch / parse`). RSS/Atom, YouTube, WebsiteAutodiscovery, Mock are Phase 1; future Rumble/Odysee/Podcast drop in cleanly.
- **Container:** typed plain object holding singleton service instances. No DI framework, no string-keyed lookups.
- **Lazy loading:** `@mozilla/readability` and `linkedom` are dynamically imported only on first article extraction (kept out of cold-start bundle). `MockAdapter` is dev-only and tree-shaken from production.
- **Refresh scheduler:** runs as a service (not a React effect). Concurrency cap 4, exponential backoff with cap 1h, dedup by feed ID, last-good cache preservation.
- **Note creation:** intentional only — never auto. Uses `app.vault.create` exclusively (no direct filesystem access).

## Entry Points

- **Plugin:** `src/main.ts` (`StrataMDPlugin extends Plugin`)
- **View:** `src/views/StrataDashboardView.ts` (`extends ItemView`, registered as `stratamd`)
- **React mount:** `src/components/StrataProvider.tsx` (Container + store provider)

## Configuration

- **Plugin manifest:** `manifest.json` (id `stratamd`, `isDesktopOnly: false`)
- **Settings:** persisted to `data.json` via Obsidian's `loadData`/`saveData` (versioned with `schemaVersion`, debounced 250ms, flushed on `onunload`)
- **No environment variables** — plugin runs entirely inside the user's Obsidian sandbox.

## Phase 1 Acceptance Criteria

20 acceptance criteria covering: full-tab dashboard, RSS/Atom/YouTube/website ingestion, autodiscovery, OPML import, item cards with virtualization, article previews with fallback chain, YouTube embeds, Bases-compatible note frontmatter, keyboard navigation, empty states, state survives kill, bundle size ≤1.5MB, schema versioning, Rebuild Cache command. Full list in `docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md`.

## What's Out of Scope for Phase 1

- OPML export (Phase 2)
- External Actions Service / mpv / yt-dlp (backlogged → `docs/backlog/stratamd-external-actions-mpv-yt-dlp.md`)
- MiniSearch / full-body indexed search (Phase 2)
- Mobile-store release (desktop-first; partial mobile compatibility)
- AI/LLM features, cloud sync, telemetry (explicit non-goals)

## Undocumented Areas

None yet — the spec is the documentation until source code lands.
