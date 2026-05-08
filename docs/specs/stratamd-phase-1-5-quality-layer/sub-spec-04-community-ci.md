---
sub_spec_id: SS-04
phase: run
depends_on: []
dispatch: factory
title: "Community Files + CI Workflow + Release-Readiness"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 1
---

# SS-04 — Community Files + CI Workflow + Release-Readiness Checklist

## Summary

GitHub-side polish: CONTRIBUTING (referencing harness as canonical pre-commit check), SECURITY (GitHub Security Advisories disclosure path, 90-day SLA), CHANGELOG (Keep-a-Changelog format, single `[0.1.0]` seed entry), 3 issue templates + `config.yml`, PR template, dependabot, and `.github/workflows/ci.yml` with 7 gates (typecheck, lint, test, axe a11y, perf bench, bundle-size, docs-sync) running with concurrency-cancel and 10-minute per-job timeouts on `ubuntu-latest` / Node 20 LTS. Plus `docs/dev/release-readiness.md` checklist.

## Implementation Steps

1. **Write `CONTRIBUTING.md`** — sections: Dev Setup (clone + `npm install`), Branch naming convention (`feat/SS-NN-short-slug`, `fix/short-slug`, `docs/short-slug`, `chore/short-slug`), Pre-commit Workflow (run `bash harness/init.sh && for f in harness/checks/*.sh; do bash "$f"; done` before every commit), Decision Log Requirement (every code commit appends `docs/decisions.md` entry; bypass with `--no-verify` only for non-code commits), PR Checklist (typecheck/lint/tests/bundle/docs-sync). ≥30 lines.
2. **Write `SECURITY.md`** — sections: Reporting Vulnerabilities (use GitHub Security Advisories private reporting), Supported Versions table (current stable: yes; previous minor: security fixes only; older: no), Disclosure SLA (90-day standard), In-Scope (HTML article rendering, feed parsing, OPML import, IndexedDB serialization), Out-of-Scope (user's vault security, Obsidian core, plugin host).
3. **Write `CHANGELOG.md`** — Keep-a-Changelog format. `## [Unreleased]` empty. `## [0.1.0] - YYYY-MM-DD` (date filled at release tag) with single bulleted summary listing major Phase 1 capabilities (RSS/Atom/YouTube ingestion, OPML import, virtualized item list, lazy article preview, Bases-compatible notes, keyboard nav, schema versioning, Rebuild Cache).
4. **Create `.github/ISSUE_TEMPLATE/bug.md`** — fields: Obsidian version, plugin version, OS, repro steps, expected vs actual, optional Diagnostics output paste from Settings → Support.
5. **Create `.github/ISSUE_TEMPLATE/feature.md`** — fields: problem, proposed solution, alternatives considered, why important.
6. **Create `.github/ISSUE_TEMPLATE/feed-source-request.md`** — fields: source type (Rumble/Odysee/Podcast/other), example URLs, public-API status, why this source matters.
7. **Create `.github/ISSUE_TEMPLATE/config.yml`** — `blank_issues_enabled: false`, points to GitHub Discussions for questions.
8. **Create `.github/PULL_REQUEST_TEMPLATE.md`** — checklist: decision-log entry added; tests pass (`npm test`); lint clean (`npm run lint`); typecheck clean (`npm run typecheck`); bundle within budget (`npm run check-bundle`); if `bindings.ts` changed → `keyboard-cheatsheet.md` updated; description of changes; related issues.
9. **Create `.github/dependabot.yml`** — schedules: `npm` weekly, `github-actions` weekly. Group dev-deps. Open-PRs limit 5.
10. **Create `.github/workflows/ci.yml`** — see template below.
11. **Create `docs/dev/release-readiness.md`** — checklist:
    - Phase 1 ACs all verified (cross-reference `docs/specs/stratamd-phase-1-rss-reader/`)
    - Phase 1.5 ACs all verified (cross-reference this spec dir)
    - axe a11y: 0 moderate+ violations across 9 states
    - Perf bench: all 3 within thresholds
    - Bundle size: `npm run check-bundle` passes
    - README + cheat sheet aligned with `bindings.ts` (no `[skip-docs-sync]` PRs since last release)
    - Decision log clean (no orphan commits without `docs/decisions.md` entry)
    - SS-17 integration test passes end-to-end against fresh vault
    - Manual smoke (Diagnostics copy, dashboard light/dark themes, keyboard-only nav)
    - CHANGELOG `[Unreleased]` moved to dated version entry
12. **Test the workflow** — open a representative PR (trivial README typo fix). Verify the workflow runs and all 7 gates pass.
13. **Commit.** Suggested: `chore(ss-04): community files, CI workflow, release-readiness checklist`.

## CI workflow template (`.github/workflows/ci.yml`)

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  typecheck:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci  # single retry on install
      - run: npm run typecheck

  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci
      - run: npm test -- --run

  axe-a11y:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci
      - run: npm test -- a11y --run

  perf-bench:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    env: { CI: 'true' }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci
      - run: npm run bench
      - uses: actions/upload-artifact@v4
        with: { name: bench-report, path: bench-report.json }

  bundle-size:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci || npm ci
      - run: npm run build
      - run: node scripts/check-bundle-size.mjs main.js

  docs-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - name: Check bindings ↔ cheat-sheet sync
        run: |
          if [[ "${{ github.event.pull_request.title }}" == *"[skip-docs-sync]"* ]]; then
            echo "Skip-docs-sync requested in PR title; passing."; exit 0
          fi
          BINDINGS_CHANGED=$(git diff --name-only origin/main...HEAD | grep -c 'src/hooks/keyboard/bindings.ts' || true)
          CHEATSHEET_CHANGED=$(git diff --name-only origin/main...HEAD | grep -c 'docs/user-guide/keyboard-cheatsheet.md' || true)
          if [[ "$BINDINGS_CHANGED" -gt 0 && "$CHEATSHEET_CHANGED" -eq 0 ]]; then
            echo "FAIL: bindings.ts changed but keyboard-cheatsheet.md was not updated."
            echo "  Update docs/user-guide/keyboard-cheatsheet.md, OR add [skip-docs-sync] to PR title for non-binding changes."
            exit 1
          fi
          echo "PASS: docs in sync"

  link-check:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - name: Lychee link check
        uses: lycheeverse/lychee-action@v2
        with:
          args: --cache --max-cache-age 1d 'docs/**/*.md' README.md
```

## Verification Commands

```bash
# Locally before push:
ls .github/ISSUE_TEMPLATE/                                       # 4 files (3 + config.yml)
test -f .github/PULL_REQUEST_TEMPLATE.md
test -f .github/dependabot.yml
test -f .github/workflows/ci.yml
test -f CONTRIBUTING.md SECURITY.md CHANGELOG.md
test -f docs/dev/release-readiness.md

# After pushing the PR:
# Verify GitHub Actions UI shows all 7 jobs passing
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| CONTRIBUTING.md exists ≥30 lines | [STRUCTURAL] | `test -f CONTRIBUTING.md && [ $(wc -l < CONTRIBUTING.md) -ge 30 ] \|\| (echo "FAIL: CONTRIBUTING.md missing or <30 lines" && exit 1)` |
| CONTRIBUTING references harness | [STRUCTURAL] | `grep -q "harness/init.sh" CONTRIBUTING.md \|\| (echo "FAIL: CONTRIBUTING does not reference harness" && exit 1)` |
| SECURITY.md exists | [STRUCTURAL] | `test -f SECURITY.md \|\| (echo "FAIL: SECURITY.md missing" && exit 1)` |
| SECURITY mentions GitHub Security Advisories | [STRUCTURAL] | `grep -qi "security advisor" SECURITY.md \|\| (echo "FAIL: SECURITY missing GHSA disclosure path" && exit 1)` |
| CHANGELOG.md exists with format markers | [STRUCTURAL] | `grep -q "## \[Unreleased\]" CHANGELOG.md && grep -q "## \[0.1.0\]" CHANGELOG.md \|\| (echo "FAIL: CHANGELOG missing Keep-a-Changelog format" && exit 1)` |
| 3 issue templates + config | [STRUCTURAL] | `for f in bug.md feature.md feed-source-request.md config.yml; do test -f ".github/ISSUE_TEMPLATE/$f" \|\| (echo "FAIL: ISSUE_TEMPLATE/$f missing" && exit 1); done` |
| PR template exists | [STRUCTURAL] | `test -f .github/PULL_REQUEST_TEMPLATE.md \|\| (echo "FAIL: PR template missing" && exit 1)` |
| dependabot.yml exists | [STRUCTURAL] | `test -f .github/dependabot.yml \|\| (echo "FAIL: dependabot.yml missing" && exit 1)` |
| ci.yml has 7+ jobs | [STRUCTURAL] | `[ $(grep -cE '^  [a-z][a-z-]+:$' .github/workflows/ci.yml) -ge 7 ] \|\| (echo "FAIL: ci.yml has fewer than 7 jobs" && exit 1)` |
| ci.yml has concurrency-cancel | [STRUCTURAL] | `grep -q "cancel-in-progress: true" .github/workflows/ci.yml \|\| (echo "FAIL: ci.yml missing concurrency-cancel" && exit 1)` |
| ci.yml has 10-minute timeouts | [STRUCTURAL] | `grep -q "timeout-minutes: 10" .github/workflows/ci.yml \|\| (echo "FAIL: ci.yml missing 10min timeout" && exit 1)` |
| docs-sync job exists | [STRUCTURAL] | `grep -q "docs-sync:" .github/workflows/ci.yml \|\| (echo "FAIL: docs-sync job missing" && exit 1)` |
| release-readiness checklist exists | [STRUCTURAL] | `test -f docs/dev/release-readiness.md \|\| (echo "FAIL: release-readiness.md missing" && exit 1)` |
