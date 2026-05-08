---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-01', 'SS-02', 'SS-03', 'SS-04', 'SS-05']
dispatch: manual
title: "Integration: Non-regression + End-to-End Smoke (auto-generated)"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 2
---

# SS-06 — Integration: Non-regression + End-to-End Smoke

## Summary

Auto-generated integration sub-spec. Verifies that Phase 1.5's five tracks wire together correctly without regressing Phase 1. Three checks: (1) Phase 1's SS-17 integration test still passes (non-regression); (2) the CI workflow from SS-04 actually runs all 7 gates and they all pass on a representative PR; (3) the manual smoke checklist from the master spec's Verification section is executed and recorded as evidence.

## Implementation Steps

1. **Run Phase 1 SS-17 integration test.** `npm test -- integration` against the same end-to-end fixture used by SS-17 (5-feed OPML import, keyboard nav over 30 items, article preview, YouTube embed, save two notes, verify Bases columns). Assert exit 0.
2. **Open a representative PR triggering CI.** Push a trivial change (e.g., a typo fix in `docs/user-guide/troubleshooting.md`). Verify GitHub Actions UI shows the workflow with all 7 jobs (typecheck, lint, test, axe-a11y, perf-bench, bundle-size, docs-sync) passing within their 10-minute timeouts.
3. **Run the manual smoke checklist** from `docs/specs/2026-05-08-stratamd-phase-1-5-quality-layer.md` § Verification:
   - Open dashboard. Press `j/k` rapidly with screen reader on. Confirm only the FINAL item is announced (debounce works).
   - Open Settings → Support → Copy Diagnostics. Confirm the preview Dialog appears. Confirm. Paste clipboard contents into a text editor. Visually grep for: feed URLs, item titles, vault paths, emails, IPs. Record evidence (screenshot or JSON snippet) in `docs/ss06-integration-evidence.md`.
   - Open Settings → Cheat Sheet. Click "Open on GitHub". Confirm browser opens to the cheat sheet.
   - Open `docs/user-guide/keyboard-cheatsheet.md` directly on GitHub and visually verify every binding from `src/hooks/keyboard/bindings.ts` is documented.
4. **Decision-log audit.** Run:
   ```bash
   PHASE15_START=$(git log --oneline | grep -i "phase.1.5\|init.forge.factory" | head -1 | awk '{print $1}')
   COMMITS=$(git log --since="$PHASE15_START" --oneline | wc -l)
   ENTRIES=$(grep -cE '^## 2026-' docs/decisions.md)
   if [ "$ENTRIES" -lt "$((COMMITS - 1))" ]; then echo "FAIL: orphan commits without decision log"; exit 1; fi
   ```
   Record commit/entry counts in evidence file.
5. **Verify release-readiness checklist.** Read `docs/dev/release-readiness.md`; check off completed items. Anything unchecked at this stage blocks Phase 1.5 completion.
6. **Write `docs/ss06-integration-evidence.md`** capturing: SS-17 test output, CI workflow run URL, scrubbed Diagnostics sample (verifying NO PII), screenshot references for light/dark dashboard renders, decision-log audit numbers, release-readiness checklist status.
7. **Commit.** Suggested: `chore(ss-06): integration evidence + non-regression verification for Phase 1.5`.

## Interface Contracts

This sub-spec consumes the OUTPUTS of SS-01 through SS-05 (test files, CI workflow, docs files, Diagnostics service) but does not consume any of their internal symbols. There is no code interface — the integration is workflow-level.

**Requires:**
- SS-01: a11y test files exist and the axe gate is wired into `ci.yml`.
- SS-02: bench files exist and `npm run bench` is wired into `ci.yml`.
- SS-03: `docs/user-guide/*.md` files exist and the cheat sheet matches `bindings.ts`.
- SS-04: `.github/workflows/ci.yml` exists with 7 jobs and concurrency-cancel.
- SS-05: `<DiagnosticsSection>` is mounted in Settings and `Diagnostics.collect()` produces PII-scrubbed output.
- Phase 1: SS-17 integration test exists and still passes.

## Verification Commands

```bash
# Non-regression (Phase 1):
npm test -- integration

# Phase 1.5 CI workflow proof:
# (manual: open PR, observe GitHub Actions UI shows 7/7 green)

# Manual smoke evidence:
test -f docs/ss06-integration-evidence.md
grep -q "Diagnostics" docs/ss06-integration-evidence.md
grep -q "decision-log audit" docs/ss06-integration-evidence.md

# Decision-log audit:
COMMITS=$(git log --since="<phase 1.5 start>" --oneline | wc -l)
ENTRIES=$(grep -cE '^## 2026-' docs/decisions.md)
[ "$ENTRIES" -ge "$((COMMITS - 1))" ] && echo "PASS: decision log clean"
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| Integration evidence file exists | [STRUCTURAL] | `test -f docs/ss06-integration-evidence.md \|\| (echo "FAIL: ss06 evidence missing" && exit 1)` |
| Evidence references Diagnostics scrub verification | [STRUCTURAL] | `grep -qi "diagnostics" docs/ss06-integration-evidence.md \|\| (echo "FAIL: evidence missing diagnostics section" && exit 1)` |
| Evidence references decision-log audit | [STRUCTURAL] | `grep -qi "decision.log" docs/ss06-integration-evidence.md \|\| (echo "FAIL: evidence missing decision-log audit" && exit 1)` |
| Phase 1 SS-17 integration test passes | [MECHANICAL] | `npm test -- integration \|\| (echo "FAIL: Phase 1 integration regressed" && exit 1)` |
| Bundle still within budget | [MECHANICAL] | `npm run build >/dev/null 2>&1 && node scripts/check-bundle-size.mjs main.js \|\| (echo "FAIL: bundle size regressed" && exit 1)` |
| All Phase 1.5 sub-specs' checks pass | [INTEGRATION] | `for f in docs/specs/stratamd-phase-1-5-quality-layer/sub-spec-0[1-5]*.md; do echo "checking $f"; done; echo "(manual: run each sub-spec's Checks table; all PASS)"` |
