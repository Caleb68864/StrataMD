---
type: redteam-report
generated: 2026-05-08
findings_count: 18
critical: 2
advisory: 16
status: applied
---

# Red Team Review: 2026-05-08-stratamd-phase-1-rss-reader.md

9-role adversarial review of the StrataMD Phase 1 master spec. Per-phase-spec red-teams were intentionally skipped (decision: master red-team catches systemic risk; per-phase reviews are deferred to on-demand or pre-execution).

## Summary

- **2 CRITICAL** findings — both auto-patched.
- **16 ADVISORY** findings — all auto-patched (SS-12 split deferred per user preference).
- Construction-site check: clean.

## Role Scorecards

Developer: 2 | QA: 2 | End User: 3 | Architect: 1 | Scope Realist: 1 | Security: 5 | SRE: 2 | Data: 3 | Product: 1

## Findings

### CRITICAL

**C-1: "Try Sample Feeds" CTA contradicts MockAdapter prod tree-shake** (Integration Architect / End User)
Location: SS-12 (`<FirstLaunch>`) + SS-05 (`MockAdapter` production guard).
Issue: Static `<FirstLaunch>` import of `MockAdapter` would defeat the SS-05 acceptance criterion `grep -c mockFeeds main.js === 0`.
Fix applied: SS-12 now specifies `<FirstLaunch>` renders only Add Feed + Import OPML CTAs in production; "Try Sample Feeds" is dev-mode only and uses dynamic `await import(...)`.

**C-2: `data.json` has no schema version** (Data Steward)
Location: SS-03.
Issue: Without a versioned persisted state, future schema evolution forces destructive fallbacks rather than versioned migrations.
Fix applied: SS-03 now mandates `schemaVersion: number` in `PersistedState`, a `state-migrations.ts` migrations array, and load-time migration through it. Mirror of `CacheService.migrations.ts`.

### ADVISORY (all applied)

| # | Title | Role | Location | Fix |
|---|-------|------|----------|-----|
| A-1 | Parameterized selector pattern unspecified | Developer | SS-04 | Documented curried + `useShallow` pattern. |
| A-2 | YouTube channelId fallback chain too narrow | Developer | SS-06 | Added 3-tier fallback: `meta[itemprop=channelId]` → canonical link → `ytInitialData` regex. |
| A-3 | SS-12 visual smoke test mistagged | QA | SS-12 | Retagged from `[BEHAVIORAL]` to `[HUMAN REVIEW]`. |
| A-4 | AC #16 (smooth with 100+ feeds) not auto-verifiable | QA / Product | Requirements R16 | Added measurable proxies: <200ms render, ≥55 FPS scroll, <150ms search over 5K items. |
| A-5 | `sanitize-html` allow-list unspecified | Security | SS-09 | Added explicit allow-list of tags/attributes/URL schemes + 3 negative tests. |
| A-6 | YouTube iframe sandbox attributes unspecified | Security | SS-14 | Specified `sandbox="allow-scripts allow-same-origin allow-presentation"` + `referrerpolicy="no-referrer"`. |
| A-7 | OPML XXE protection unstated | Security | SS-11 | `fast-xml-parser` configured with `processEntities: false`; XXE negative test added. |
| A-8 | SSRF surface on user-pasted feed URLs | Security | Out of Scope | Documented as intentional (personal-use tool). |
| A-9 | `sanitizeFilename` missing `..` traversal check | Security | SS-10 | `..` and leading `/` stripped in both filename and folder routing. |
| A-10 | `data.json` corruption recovery undocumented | SRE | SS-03, Edge Cases | `JSON.parse` errors fall back to defaults with one-time banner. |
| A-11 | No "Rebuild Cache" command | SRE | SS-17, Requirements | Added Phase 1 command `StrataMD: Rebuild Cache` (R20). |
| A-12 | SS-12 is large (15+ files) | Scope Realist | SS-12 | Risk noted; user chose not to split. Recommend close monitoring during SS-12 execution. |
| A-13 | No MVP / priority ranking | Product | Requirements | Added Tiering subsection with Tier 1/2/3 graceful-slip plan. |
| A-14 | No user-state export path | Data Steward | Out of Scope | Explicitly listed Phase-1-only. |
| A-15 | Cancel-add-feed flow undefined | End User | Edge Cases | Added: pending discovery aborted on dismiss. |
| A-16 | OPML import has no progress UI | End User | SS-11 | `onProgress(processed, total)` callback added to `importFromString` signature. |
| A-17 | Frontmatter shape stability contract unstated | Data Steward | Constraints (Musts) | Added stability commitment with major-version-bump rule. |

## Construction-Site Check

Clean. SS-17 names the production call site (`src/main.ts` `onload`/`onunload`) explicitly. No `construction-site-without-caller` findings.

## Status

All applicable findings auto-patched. Master spec status remains `evaluated → ready` with 34/35 quality score plus the layer of red-team-driven hardening.

Per-phase-spec red-teams were skipped at the user's direction. Future per-phase red-teams can be invoked individually with `/forge-red-team docs/specs/stratamd-phase-1-rss-reader/sub-spec-NN-*.md` if needed before execution.
