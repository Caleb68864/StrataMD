---
sub_spec_id: SS-03
phase: run
depends_on: []
dispatch: factory
title: "End-User Documentation"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 1
---

# SS-03 — End-User Documentation

## Summary

Six concrete in-repo markdown files under `docs/user-guide/` covering README/TOC, getting-started, keyboard cheat sheet, OPML import, Bases setup, and troubleshooting. README.md gains a Documentation section. Settings tab gains a "Cheat Sheet" section linking to GitHub. No bundled docs in the plugin (v0.2 ships a docs site).

## Implementation Steps

1. **Create directory.** `mkdir -p docs/user-guide`.
2. **Write `docs/user-guide/README.md`** — TOC + brief intro. Header comment notes "this directory is the source of truth for end-user docs in v0.1; a static site lands in v0.2".
3. **Write `docs/user-guide/getting-started.md`** — first-run walkthrough: install plugin → open dashboard from ribbon → Add Feed → keyboard nav (`j/k`) → save first note → open Obsidian Bases on the vault → confirm note appears with frontmatter columns. ≥40 lines with concrete examples.
4. **Write `docs/user-guide/keyboard-cheatsheet.md`** — every binding from `src/hooks/keyboard/bindings.ts`, grouped by context (Navigation: `j/k/n/p/gg/G`, Item state: `m/M/s/*`, Search: `/`, Refresh: `r/R`, Misc: `o/Esc`). Header comment marks `src/hooks/keyboard/bindings.ts` as source of truth.
5. **Write `docs/user-guide/opml-import.md`** — OPML 1.0 vs 2.0 differences, how StrataMD parses `<outline xmlUrl=…>`, dedup by URL, category preservation from nested `<outline text="…">`, malformed-entry handling, where the import dialog progress bar lives. ≥40 lines.
6. **Write `docs/user-guide/bases-setup.md`** — concrete Bases query example filtering by `type: article|youtube|bookmark`, grouping by `category`, sorting by `saved_at` descending. Includes a screenshot reference (image to be added during smoke test). ≥40 lines.
7. **Write `docs/user-guide/troubleshooting.md`** — short FAQ: feed won't add (check requestUrl, paste raw RSS URL), YouTube won't resolve (manual override), state lost after crash (flush-on-unload), bundle too large (rebuild cache + report via Diagnostics). ≥40 lines.
8. **Modify `README.md`** — add a `## Documentation` section right after the project description with bulleted relative links to all 6 user-guide files.
9. **Modify `src/settings/SettingsTab.ts`** — add an inline "Cheat Sheet" section with a button that opens `https://github.com/Caleb68864/StrataMD/blob/main/docs/user-guide/keyboard-cheatsheet.md` in the system browser via `window.open`. Below the button, render the top 10 bindings inline so common shortcuts are visible without leaving Obsidian.
10. **Verify with `lychee`** locally: `npx lychee --cache --max-cache-age 1d 'docs/user-guide/**/*.md' README.md` exits 0.
11. **Commit.** Suggested: `docs(ss-03): user-guide markdown set + README + settings cheat-sheet section`.

## Interface Contracts

No cross-sub-spec contracts. SS-04 will reference these markdown files in the `docs-sync` CI job (when `bindings.ts` changes, `keyboard-cheatsheet.md` must change too) but that's a workflow concern, not a code interface.

**Requires** (external — Phase 1):
- `src/hooks/keyboard/bindings.ts` (Phase 1 SS-15) — source of truth for cheat sheet content.
- `src/settings/SettingsTab.ts` (Phase 1 SS-16) — host for the new "Cheat Sheet" section.

## Verification Commands

```bash
ls docs/user-guide/                                                         # 6 files present
wc -l docs/user-guide/*.md                                                  # each ≥40 lines
npx lychee --cache --max-cache-age 1d 'docs/user-guide/**/*.md' README.md    # no broken links
grep -q "Documentation" README.md                                            # README section present
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| 6 user-guide files exist | [STRUCTURAL] | `for f in README getting-started keyboard-cheatsheet opml-import bases-setup troubleshooting; do test -f "docs/user-guide/$f.md" \|\| (echo "FAIL: $f.md missing" && exit 1); done` |
| Each user-guide file ≥40 lines | [STRUCTURAL] | `for f in docs/user-guide/*.md; do [ $(wc -l < "$f") -ge 40 ] \|\| (echo "FAIL: $f under 40 lines" && exit 1); done` |
| Cheat sheet documents required bindings | [STRUCTURAL] | `for k in 'j' 'k' 'gg' 'G' 'o' 's' '\\*' 'r' 'R' '/' 'm' 'M' 'Esc'; do grep -q "$k" docs/user-guide/keyboard-cheatsheet.md \|\| (echo "FAIL: cheat sheet missing $k" && exit 1); done` |
| README has Documentation section | [STRUCTURAL] | `grep -q "^## Documentation" README.md \|\| (echo "FAIL: README missing Documentation section" && exit 1)` |
| README links to user-guide | [STRUCTURAL] | `grep -q "docs/user-guide" README.md \|\| (echo "FAIL: README does not link to user-guide" && exit 1)` |
| SettingsTab references keyboard-cheatsheet | [STRUCTURAL] | `grep -q "keyboard-cheatsheet" src/settings/SettingsTab.ts \|\| (echo "FAIL: SettingsTab missing cheat sheet link" && exit 1)` |
| lychee link check passes | [MECHANICAL] | `npx lychee --cache --max-cache-age 1d 'docs/user-guide/**/*.md' README.md \|\| (echo "FAIL: broken links" && exit 1)` |
