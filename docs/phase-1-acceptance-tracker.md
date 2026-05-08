# Phase 1 Acceptance Tracker

Last updated: 2026-05-08

## Status legend
- [x] implemented
- [~] partial/in-progress
- [ ] not implemented

## Core acceptance criteria
- [x] Dashboard opens as full tab view (`stratamd` ItemView)
- [x] RSS feed can be added from ingest flow
- [~] Website feed autodiscovery works for primary + fallback paths (needs broader live validation)
- [~] YouTube channel URL resolution works for key patterns (needs broader edge-case validation)
- [x] YouTube playlist URL resolution path present
- [x] Item cards render with metadata and keyboard selection
- [x] Image/video preview path includes thumbnails + inline YouTube playback
- [x] Article previews render with fallback chain
- [x] Notes save with required frontmatter keys
- [~] Bases verification pending manual vault evidence
- [x] Keyboard navigation supports j/k, n/p, m, *, /, o, s, gg, G
- [x] Search benchmark harness exists for 5000 items target
- [~] Full integration criteria evidence in progress

## Infra and quality gates
- [x] Typecheck passes
- [x] Build passes
- [x] Test suite exists and passes
- [x] Bundle size check script implemented and wired
- [x] Local verify script chain passes
- [x] CI workflow wiring committed (`.github/workflows/ci.yml`)

## Remaining closure items
1. Manual Obsidian evidence capture (light/dark screenshots, Bases verification).
2. Real-vault OPML mixed-source run log with failure summaries.
3. Broader YouTube edge-case validation coverage.
