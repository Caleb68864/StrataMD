---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
title: "A11y Baseline + axe-core CI"
master_spec: "../2026-05-08-stratamd-phase-1-5-quality-layer.md"
wave: 1
---

# SS-01 — A11y Baseline + axe-core CI

## Summary

Add ARIA roles and focus management to existing Phase 1 components; introduce reusable a11y helpers under `src/components/a11y/`; integrate axe-core into the Vitest test suite gating 9 representative states (6 dashboard + 3 popover) at severity floor `moderate`. `axe-core` and `@axe-core/react` are pinned exactly.

## Implementation Steps (TDD)

1. **Pin axe-core deps.** Edit `package.json` to add `"axe-core": "<exact>"` and `"@axe-core/react": "<exact>"` under `devDependencies` (lookup current latest, e.g., `4.10.2`). `npm install` to lock.
2. **Write failing test** `__tests__/a11y/axe.test.tsx`: import `axe` and `toHaveNoViolations` matcher, render `<DashboardRoot/>` in the "empty" state from a fresh fixture, assert zero violations. Run `npm test -- a11y` → fails (helpers + ARIA not yet wired).
3. **Implement `aria.ts`** in `src/components/a11y/aria.ts` exporting role constants (`ROLE_APPLICATION`, `ROLE_REGION`, `ROLE_LISTBOX`, `ROLE_OPTION`, `ROLE_TREEITEM`).
4. **Implement `useFocusTrap.ts`** — hook taking a ref + `enabled: boolean`; binds keydown to capture Tab/Shift+Tab and cycle focusable descendants; restores prior focus on disable.
5. **Implement `useFocusReturn.ts`** — hook capturing `document.activeElement` on mount and restoring it on unmount or when `enabled` flips off.
6. **Implement `<AnnounceLive>`** — `aria-live="polite"` div with 250ms-debounced child text emission.
7. **Modify Phase 1 components** (light ARIA-only changes, no logic changes):
   - `<DashboardRoot>`: add `role={ROLE_APPLICATION}` and `aria-label="StrataMD dashboard"`.
   - `<FeedPane>`, `<ItemPane>`, `<PreviewPane>`: `role={ROLE_REGION}` + `aria-label`.
   - `<ItemPane>`: `role={ROLE_LISTBOX}` + `aria-activedescendant={selectedItemId}`.
   - `<ItemCard>`: `role={ROLE_OPTION}` + `aria-selected={isSelected}` + stable `id={itemId}`.
   - `<FeedCard>`: `role={ROLE_TREEITEM}` + `aria-expanded` for category nodes.
   - `<Toolbar>` buttons: `aria-label` matching command-palette text.
   - Popover hosts (Add Feed, Multi-candidate picker, Per-feed settings): wrap in `useFocusTrap` + `useFocusReturn`.
8. **Add 9 representative-state fixtures** in `__tests__/a11y/fixtures/representativeStates.tsx` — each fixture mounts `<DashboardRoot>` with the store seeded for one of the 9 states.
9. **Expand axe test** to iterate all 9 states; run `npm test -- a11y` → passes.
10. **Wire to CI workflow** — SS-04 will reference this test path; nothing to do here other than ensure the test name pattern matches.
11. **Commit.** Suggested: `feat(ss-01): a11y baseline (ARIA + focus management) + axe-core CI gate`.

## Interface Contracts

**Provides** (within Phase 1.5, not consumed by other Phase 1.5 sub-specs):
- `useFocusTrap`, `useFocusReturn`, `<AnnounceLive>`, `aria.ts` constants — Phase 2+ will reuse for Track D-Premium (motion-reduction, contrast).

**Requires** (external — Phase 1):
- Phase 1 SS-12 components (`<DashboardRoot>`, `<FeedPane>`, etc.)
- Phase 1 SS-04 store (`selectedItemId`, `currentItemIds`)

## Verification Commands

```bash
npm install                         # lock pinned axe versions
npm run typecheck
npm run lint
npm test -- a11y                    # axe-core gate
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| `useFocusTrap.ts` exists | [STRUCTURAL] | `test -f src/components/a11y/useFocusTrap.ts \|\| (echo "FAIL: useFocusTrap.ts missing" && exit 1)` |
| `useFocusReturn.ts` exists | [STRUCTURAL] | `test -f src/components/a11y/useFocusReturn.ts \|\| (echo "FAIL: useFocusReturn.ts missing" && exit 1)` |
| `AnnounceLive.tsx` exists | [STRUCTURAL] | `test -f src/components/a11y/AnnounceLive.tsx \|\| (echo "FAIL: AnnounceLive.tsx missing" && exit 1)` |
| `aria.ts` exists | [STRUCTURAL] | `test -f src/components/a11y/aria.ts \|\| (echo "FAIL: aria.ts missing" && exit 1)` |
| `<DashboardRoot>` has role=application | [STRUCTURAL] | `grep -q "role={ROLE_APPLICATION}\|role=\"application\"" src/components/DashboardRoot.tsx \|\| (echo "FAIL: DashboardRoot role" && exit 1)` |
| `<ItemPane>` has role=listbox + aria-activedescendant | [STRUCTURAL] | `grep -q "ROLE_LISTBOX\|role=\"listbox\"" src/components/ItemPane.tsx && grep -q "aria-activedescendant" src/components/ItemPane.tsx \|\| (echo "FAIL: ItemPane listbox+aad" && exit 1)` |
| `<ItemCard>` has role=option + aria-selected | [STRUCTURAL] | `grep -q "ROLE_OPTION\|role=\"option\"" src/components/ItemCard.tsx && grep -q "aria-selected" src/components/ItemCard.tsx \|\| (echo "FAIL: ItemCard option+selected" && exit 1)` |
| axe-core pinned exact (no `^` or `~`) | [STRUCTURAL] | `! grep -E '"axe-core":\s*"[\^~]' package.json && ! grep -E '"@axe-core/react":\s*"[\^~]' package.json \|\| (echo "FAIL: axe-core not pinned exact" && exit 1)` |
| 9 representative states fixture present | [STRUCTURAL] | `test -f __tests__/a11y/fixtures/representativeStates.tsx \|\| (echo "FAIL: states fixture missing" && exit 1)` |
| axe test passes | [MECHANICAL] | `npm test -- a11y \|\| (echo "FAIL: axe a11y test failures" && exit 1)` |
