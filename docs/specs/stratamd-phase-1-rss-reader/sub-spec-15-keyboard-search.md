---
sub_spec_id: SS-15
phase: run
depends_on: ['SS-12']
dispatch: factory
title: "Keyboard Shortcuts and Search"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 8
---

# SS-15 — Keyboard Shortcuts and Search

## Summary

Single root-level `keydown` handler dispatching store actions for Newsboat/Vim/Google-Reader bindings. `<SearchBar>` debounces 150ms then sets the search query slice. `SearchIndex` is in-memory substring match on title + summary, lazily built on first search per session.

## Implementation Steps (TDD)

1. **Write failing test:** pressing `j` advances `selection.selectedItemId` by one within `currentItemIds`.
2. **Implement `bindings.ts`** mapping each documented binding to a store action.
3. **Implement `useKeyboardShortcuts`** registering a single `keydown` on `<DashboardRoot>` ref.
4. **Run j/k test — passes.**
5. **Write failing test:** focus inside `<SearchBar>` input → `j/k` are NOT intercepted. Verify by checking `event.target.tagName === 'INPUT'`.
6. **Implement input-focus exclusion.**
7. **Write failing test:** double-`g` within 500ms triggers `gg` (top); single `g` does nothing.
8. **Implement `gg`/`G` chord state machine** with timeout reset.
9. **Implement `<SearchBar>`** with `setTimeout`-based 150ms debounce; calls `setSearchQuery` action.
10. **Implement `SearchIndex`** with simple lowercase substring match. Build index lazily on first call.
11. **Write failing perf test:** searching "react" against 5000 items returns matching IDs in <50ms.
12. **Verify perf** by running benchmark; if >50ms, add lowercase pre-cache per item.
13. **Commit.** Suggested: `feat(ss-15): root keydown handler + debounced search with in-memory index`.

## Interface Contracts

**Provides:**
- `useKeyboardShortcuts` (Owner: SS-15). Consumer: SS-12 (mounted at `<DashboardRoot>`).
- `<SearchBar>` (Owner: SS-15). Consumer: SS-12 (rendered in `<Toolbar>` or `<FeedPane>`).
- `SearchIndex` service (Owner: SS-15). Consumer: SS-04 selectors (`selectCurrentItemIds` reads it through derive).

**Requires:** SS-12 (host element), SS-04 (actions + filters slice).

## Verification Commands

```bash
npm test -- useKeyboardShortcuts SearchBar SearchIndex
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| Bindings file exists | [STRUCTURAL] | `test -f src/hooks/keyboard/bindings.ts \|\| (echo "FAIL: bindings.ts missing" && exit 1)` |
| All required bindings present | [STRUCTURAL] | `for b in 'j' 'k' 'n' 'p' 'o' 's' 'r' '\\\\*' '\\\\/' 'm' 'gg' 'G'; do grep -q "$b" src/hooks/keyboard/bindings.ts \|\| (echo "FAIL: binding $b missing" && exit 1); done` |
| SearchBar 150ms debounce | [STRUCTURAL] | `grep -q "150" src/components/SearchBar.tsx \|\| (echo "FAIL: 150ms debounce missing" && exit 1)` |
| SearchIndex exists | [STRUCTURAL] | `test -f src/services/SearchIndex.ts \|\| (echo "FAIL: SearchIndex missing" && exit 1)` |
| Single keydown listener (not per-component) | [STRUCTURAL] | `[ $(grep -rl "keydown" src/components/ \| wc -l) -le 1 ] \|\| (echo "FAIL: too many keydown listeners — should be one at root" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- useKeyboardShortcuts \|\| (echo "FAIL: keyboard tests" && exit 1)` |
| Search tests pass | [MECHANICAL] | `npm test -- SearchIndex \|\| (echo "FAIL: search tests" && exit 1)` |
