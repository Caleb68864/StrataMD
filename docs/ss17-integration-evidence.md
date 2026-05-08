# SS-17 Integration Evidence

- Build: passing (`npm run build`)
- Typecheck: passing (`npm run typecheck`)
- Tests: passing (`npm test`)
- Verify chain: passing (`npm run verify`)
- CI workflow: added (`.github/workflows/ci.yml`) to enforce verify on push/PR

## Current verification scope

- OPML parsing unit tests
- URL normalization unit tests
- Scheduler inflight dedupe, failure events, and batch event tests
- Store triage action tests (saved/ignored, mark-all-read, first/last select)
- Integration workflow assertions (hydrate + unread filtering + selection/star flow)
- Bundle size budget gate (`scripts/check-bundle-size.mjs`)
- Performance benchmark harness (`scripts/benchmark-phase1.mjs`)

## Benchmark targets

- feed count: 120
- item count: 5000
- search target: <150ms

## Remaining manual evidence

- Obsidian screenshots (light/dark)
- OPML import run against mixed RSS/YouTube list
- Bases frontmatter confirmation from saved notes
- Keyboard-only navigation pass in live vault
