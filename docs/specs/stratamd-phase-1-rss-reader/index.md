---
type: phase-spec-index
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
date: 2026-05-08
sub_specs: 17
---

# StrataMD Phase 1 — Phase Specs

Refined from [2026-05-08-stratamd-phase-1-rss-reader.md](../2026-05-08-stratamd-phase-1-rss-reader.md).

## Wave Plan

Waves are derived from the `depends_on` graph. Sub-specs in the same wave can run in parallel.

| Wave | Sub-Specs |
|------|-----------|
| 1 | SS-01 |
| 2 | SS-02 |
| 3 | SS-03, SS-05, SS-11 (waits SS-04 also) |
| 4 | SS-04, SS-06, SS-09 |
| 5 | SS-07, SS-10 |
| 6 | SS-08 |
| 7 | SS-11 (OPML), SS-12 |
| 8 | SS-13, SS-14, SS-15 |
| 9 | SS-16 |
| 10 | SS-17 (integration — runs last) |

> Note: SS-17 already exists as the integration sub-spec; the auto-generated integration step described in `forge-prep` is not duplicated.

## Sub-Specs

| Sub-Spec | Title | Dependencies | Phase Spec |
|----------|-------|--------------|------------|
| SS-01 | Project Bootstrap & Build Pipeline | — | [sub-spec-01-bootstrap.md](sub-spec-01-bootstrap.md) |
| SS-02 | Models, Logger, Container, Adapter Interface | SS-01 | [sub-spec-02-foundations.md](sub-spec-02-foundations.md) |
| SS-03 | Storage Tier (StateService + CacheService) | SS-02 | [sub-spec-03-storage.md](sub-spec-03-storage.md) |
| SS-04 | Zustand Store and Selectors | SS-03 | [sub-spec-04-store.md](sub-spec-04-store.md) |
| SS-05 | RSS/Atom Adapter and Mock Adapter | SS-02 | [sub-spec-05-rss-adapter.md](sub-spec-05-rss-adapter.md) |
| SS-06 | YouTube Adapter (with Plan-B seam) | SS-05 | [sub-spec-06-youtube-adapter.md](sub-spec-06-youtube-adapter.md) |
| SS-07 | Feed Discovery Service & Autodiscovery Adapter | SS-05, SS-06 | [sub-spec-07-discovery.md](sub-spec-07-discovery.md) |
| SS-08 | Feed Fetch Scheduler | SS-04, SS-07 | [sub-spec-08-scheduler.md](sub-spec-08-scheduler.md) |
| SS-09 | Article Preview Service (lazy-loaded) | SS-03 | [sub-spec-09-article-preview.md](sub-spec-09-article-preview.md) |
| SS-10 | Note Service, Templates, Bases Frontmatter | SS-04 | [sub-spec-10-notes.md](sub-spec-10-notes.md) |
| SS-11 | OPML Import Service | SS-04, SS-08 | [sub-spec-11-opml.md](sub-spec-11-opml.md) |
| SS-12 | Dashboard View, 3-Pane Layout, Empty States | SS-04 | [sub-spec-12-dashboard.md](sub-spec-12-dashboard.md) |
| SS-13 | Item Cards & Virtualization | SS-12 | [sub-spec-13-cards.md](sub-spec-13-cards.md) |
| SS-14 | Preview Components (Article/YouTube/Bookmark) | SS-12, SS-09 | [sub-spec-14-preview-components.md](sub-spec-14-preview-components.md) |
| SS-15 | Keyboard Shortcuts and Search | SS-12 | [sub-spec-15-keyboard-search.md](sub-spec-15-keyboard-search.md) |
| SS-16 | Settings Tab, Refresh Hook, Notifications | SS-08, SS-11, SS-12 | [sub-spec-16-settings.md](sub-spec-16-settings.md) |
| SS-17 | Integration & End-to-End Wiring | All | [sub-spec-17-integration.md](sub-spec-17-integration.md) |

## Requirement Traceability Matrix

| Requirement | Covered By |
|-------------|-----------|
| R1: Custom ItemView opens as full tab | SS-12, SS-17 |
| R2: Add RSS/Atom/YouTube/website URLs | SS-05, SS-06, SS-07, SS-12 |
| R3: Website autodiscovery | SS-07 |
| R4: OPML 1.0/2.0 import | SS-11 |
| R5: Item cards with virtualization | SS-13 |
| R6: Article previews (lazy-loaded fallback chain) | SS-09, SS-14 |
| R7: YouTube embeds | SS-14 |
| R8: Bases-compatible frontmatter | SS-10 |
| R9: Note routing rules | SS-10 |
| R10: Newsboat/Vim keyboard navigation | SS-15 |
| R11: Refresh scheduler with concurrency cap & backoff | SS-08 |
| R12: 150ms debounced substring search | SS-15 |
| R13: Empty states (6 cases) | SS-12 |
| R14: Debounced data.json + flush on unload | SS-03 |
| R15: IndexedDB pruning policy | SS-03 |
| R16: Smooth with 100+ feeds | SS-04, SS-08, SS-13 (split — verified end-to-end in SS-17) |
| R17: Bundle size CI gate | SS-01 |
| R18: Single-feed failure isolation | SS-08 |

No orphaned requirements.

## Cross-Spec Dependency Audit

Produce/consume audit passed: every consumed symbol is provided by a sub-spec in an equal or earlier wave. See `contracts.json` for the machine-readable inventory.

## Execution

Run `/forge-run docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md` to execute all phase specs (forge-run auto-detects linked phase specs).
Run `/forge-run docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md --sub N` to execute a single sub-spec.
