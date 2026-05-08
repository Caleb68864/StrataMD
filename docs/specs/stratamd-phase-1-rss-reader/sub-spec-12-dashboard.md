---
sub_spec_id: SS-12
phase: run
depends_on: ['SS-04']
dispatch: factory
title: "Dashboard View Shell, 3-Pane Layout, Empty States"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 7
---

# SS-12 — Dashboard View Shell + 3-Pane Layout + Empty States

## Summary

`StrataDashboardView` (extends `ItemView`), React mount via `createRoot`, `<DashboardRoot>` 3-pane CSS grid with responsive breakpoints, `<Toolbar>`, pane shells, `<PortalRoot>` for Radix containment, all 6 empty states. This is the visible skin Phase 1 acceptance criteria #1, #14, #16 hang on.

## Implementation Steps (TDD)

1. **Write failing test** via `@testing-library/react`: `<DashboardRoot>` rendered with empty store renders `<FirstLaunch>` containing 3 CTAs.
2. **Implement `<StrataProvider>`** wrapping `useStrataStore` Provider + Container context.
3. **Implement `<DashboardRoot>`** with CSS grid (3-col → 2-col below 900px → single-pane below 600px with tab switcher).
4. **Implement empty-state components** (FirstLaunch, EmptySmartView, NoSearchResults, AllCaughtUp, NeverRefreshed, NoSelection). Each is a small functional component reading the store for the variant it needs.
5. **Run first-launch test — passes.**
6. **Implement `<PortalRoot>`** as a wrapper exposing a `ref` Radix primitives use as their portal container. This is the mitigation for ASM-4 (Radix portals colliding with Obsidian DOM).
7. **Implement pane shells** `<FeedPane>`, `<ItemPane>`, `<PreviewPane>` (skeletons; cards land in SS-13, preview content in SS-14).
8. **Implement `<Toolbar>`** with buttons (Add Feed, Ingest URL, Refresh, Search, Compact toggle, Settings shortcut).
9. **Implement `StrataDashboardView`** extending `ItemView`. `getViewType() === 'stratamd'`. `onOpen` mounts via `createRoot`. `onClose` unmounts.
10. **Wire view registration** in `main.ts` (final wiring lands in SS-17, but registration helper exists here).
11. **Apply theme variables** in `styles.css` — use `var(--background-primary)`, `var(--text-normal)`, etc. for semantic colors.
12. **Smoke test in real Obsidian** (light theme + dark theme) — both render cleanly without console errors.
13. **Commit.** Suggested: `feat(ss-12): dashboard view shell, 3-pane layout, empty states`.

## Interface Contracts

**Provides:**
- `StrataDashboardView` (Owner: SS-12). Consumer: SS-17 (registers in `main.ts`).
- `<DashboardRoot>` (Owner: SS-12). Consumer: SS-13 (renders cards inside `<ItemPane>`/`<FeedPane>`), SS-14 (renders previews inside `<PreviewPane>`), SS-15 (mounts keyboard handler at root).
- `<PortalRoot>` ref (Owner: SS-12). Consumer: any sub-spec using Radix primitives (popovers, tooltips).

**Requires:** SS-04 (store + selectors), `obsidian.ItemView`.

## Verification Commands

```bash
npm test -- DashboardRoot EmptyStates
npm run build  # smoke test in Obsidian after
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| StrataDashboardView exists | [STRUCTURAL] | `test -f src/views/StrataDashboardView.ts \|\| (echo "FAIL: view missing" && exit 1)` |
| getViewType returns stratamd | [STRUCTURAL] | `grep -q "stratamd" src/views/StrataDashboardView.ts \|\| (echo "FAIL: view type" && exit 1)` |
| All empty-state components present | [STRUCTURAL] | `for c in FirstLaunch EmptySmartView NoSearchResults AllCaughtUp NeverRefreshed NoSelection; do test -f "src/components/EmptyStates/$c.tsx" \|\| (echo "FAIL: empty state $c missing" && exit 1); done` |
| PortalRoot exists | [STRUCTURAL] | `test -f src/components/PortalRoot.tsx \|\| (echo "FAIL: PortalRoot missing" && exit 1)` |
| DashboardRoot uses Obsidian theme variables | [STRUCTURAL] | `grep -q "var(--background-primary)\|var(--text-normal)" src/styles.css \|\| (echo "FAIL: theme vars not used" && exit 1)` |
| Dashboard tests pass | [MECHANICAL] | `npm test -- DashboardRoot \|\| (echo "FAIL: tests" && exit 1)` |
| Empty-state tests pass | [MECHANICAL] | `npm test -- EmptyStates \|\| (echo "FAIL: empty-state tests" && exit 1)` |
