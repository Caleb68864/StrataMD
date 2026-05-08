---
type: redteam-report
generated: 2026-05-08
findings_count: 12
critical: 0
advisory: 12
status: applied
---

# Red Team Review: 2026-05-08-stratamd-phase-1-5-quality-layer.md

9-role adversarial review of the StrataMD Phase 1.5 master spec, plus construction-site check. Per-phase-spec red-teams intentionally skipped per project convention (master red-team catches systemic risk).

## Summary

- **0 CRITICAL** findings — spec is solid as authored.
- **12 ADVISORY** findings — all auto-patched into the master spec (and SS-06 phase spec for `dispatch` change).
- Construction-site check: clean.

## Role Scorecards

Developer: 2 | QA: 1 | End User: 0 | Architect: 3 | Scope Realist: 1 | Security: 2 | SRE: 2 | Data: 1 | Product: 1

## Findings

### CRITICAL
None.

### ADVISORY (all applied)

| # | Title | Role | Location | Fix applied |
|---|-------|------|----------|-------------|
| A-1 | CI workflow brittle under partial sub-spec landing | Architect | SS-04 ci.yml | Added "CI ordering tolerance" rule to Decided block: every CI job that consumes a sub-spec output skips silently with PASS when the input file doesn't exist. |
| A-2 | `installedSinceDays` data path ambiguous | Developer | SS-05 | Specified explicit path `app.vault.adapter.stat('.obsidian/plugins/stratamd/data.json')` in Decided block. |
| A-3 | `gitSha` could be identifying for forks | Security | SS-05 | Truncated to 7 chars in Decided block + Diagnostics positive-assertion AC. |
| A-4 | Diagnostics output schema unversioned | Data Steward | SS-05 | Added `_schemaVersion: 1` to required output keys (positive assertion). |
| A-5 | PII scrubber misses UNC paths | Security | SS-05 | Added UNC pattern to scrubber regex set in Decided block + negative-assertion AC now covers UNC. |
| A-6 | `npx lychee` requires the package | Developer | SS-03 | Documented in Decided block: CI uses `lycheeverse/lychee-action@v2`; local invocation is best-effort; `markdown-link-check` is the dev-dep fallback. |
| A-7 | SS-06 cannot open PRs autonomously | Architect | SS-06 | Changed SS-06 frontmatter `dispatch: factory` → `dispatch: manual`. Documented in master Decided block. |
| A-8 | Popover a11y fixtures need explicit "force open" pattern | QA | SS-01 | Added to Edge Cases: representative-state fixtures mount popovers with `open={true}` props or store-driven open flags — never via simulated clicks. |
| A-9 | Logger ring-buffer size unconfigurable | SRE | SS-05 | Acknowledged in Decided block as v0.1 limit; configurability is v0.2 work. |
| A-10 | docs-sync requires `bindings.ts` to exist | Architect | SS-04 | Added to Edge Cases: docs-sync skips silently with PASS when `src/hooks/keyboard/bindings.ts` doesn't exist (belt-and-suspenders for A-1). |
| A-11 | Lychee external-link rate limits in CI | SRE | SS-04 | Added to Edge Cases: CI lychee scope is repo-relative links only on PR; full external-link check runs in a separate scheduled weekly job. |
| A-12 | No tier mapping in Phase 1.5 | Product | (master) | Added Tiering subsection (Tier 1/2/3 graceful-slip plan) below Decided block. |

## Construction-Site Check

Clean. Production call sites named explicitly:
- SS-04 → `.github/workflows/ci.yml`
- SS-05 → `src/settings/SettingsTab.ts` (Phase 1 SS-16 mount point)
- SS-06 → CI workflow output URL + manual smoke evidence file

No `construction-site-without-caller` findings.

## Status

All 12 advisory findings auto-patched into the master spec (`2026-05-08-stratamd-phase-1-5-quality-layer.md`) and SS-06 phase spec (`stratamd-phase-1-5-quality-layer/sub-spec-06-integration.md`). Master spec status remains `ready` with 34/35 quality score plus the layer of red-team-driven hardening. Phase 1.5 spec is ready for `/forge-run` once Phase 1 has shipped.
