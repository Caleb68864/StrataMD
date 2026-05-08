---
sub_spec_id: SS-13
phase: run
depends_on: ['SS-12']
dispatch: factory
title: "Item Cards & Virtualization"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 8
---

# SS-13 — Item Cards & Virtualization

## Summary

`<ItemCard>` and `<FeedCard>` are the perf-critical atoms. Each subscribes via per-id selectors so a single read-state change re-renders only the affected card. `useVirtualizedList` wraps `@tanstack/react-virtual` so swapping virtualization libs later is mechanical.

## Implementation Steps (TDD)

1. **Write failing render-count test:** render a list of 1000 items via `<ItemPane>`; toggle read on item #500; assert `<ItemCard>` for item #500 re-renders exactly once and other cards do not re-render. Use `@testing-library/react` + render-count spies.
2. **Implement `useVirtualizedList`** wrapping `useVirtualizer` from `@tanstack/react-virtual`; returns `{getVirtualItems, getTotalSize, scrollToIndex}` shape.
3. **Implement `<ItemCard>`** wrapped in `React.memo` with custom comparator. Subscribes via `useStrataStore(selectItemById(itemId))` and `useStrataStore(s => s.userState.readIds.has(itemId))`.
4. **Implement `<ItemPane>`** rendering virtualized list of `<ItemCard>`.
5. **Run render-count test — passes.**
6. **Write failing test:** scrolling 1000-item list keeps DOM node count under 50 (windowing works). Verified by `document.querySelectorAll('.smd-item-card').length` mid-scroll.
7. **Implement scroll position persistence per view** via `userState.scrollPositions`.
8. **Implement `<ItemCard>` visuals** with thumbnail (`loading="lazy"`), title, source, date (`dayjs.fromNow()`), excerpt, video play-icon overlay for `mediaType === 'video'`.
9. **Implement `<FeedCard>`** with feed icon, name, unread count (animated pulse on 0→N transition), health dot.
10. **Apply Tailwind classes** with `smd-` prefix throughout.
11. **Commit.** Suggested: `feat(ss-13): memoized item cards with selector-scoped subscriptions + virtualization`.

## Interface Contracts

**Provides:**
- `<ItemCard>` (Owner: SS-13). Consumer: SS-12 (`<ItemPane>`).
- `<FeedCard>` (Owner: SS-13). Consumer: SS-12 (`<FeedPane>`).
- `useVirtualizedList` hook (Owner: SS-13). Consumer: SS-12 (`<ItemPane>`).

**Requires:** SS-12 (pane shells render the cards), SS-04 (selectors).

## Verification Commands

```bash
npm test -- ItemCard FeedCard useVirtualizedList
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| ItemCard exists, memoized | [STRUCTURAL] | `grep -q "React.memo\|memo(" src/components/ItemCard.tsx \|\| (echo "FAIL: ItemCard not memoized" && exit 1)` |
| FeedCard exists | [STRUCTURAL] | `test -f src/components/FeedCard.tsx \|\| (echo "FAIL: FeedCard missing" && exit 1)` |
| useVirtualizedList hook exists | [STRUCTURAL] | `test -f src/hooks/useVirtualizedList.ts \|\| (echo "FAIL: virtualization hook missing" && exit 1)` |
| Uses @tanstack/react-virtual | [STRUCTURAL] | `grep -q "@tanstack/react-virtual" src/hooks/useVirtualizedList.ts \|\| (echo "FAIL: virtualization lib missing" && exit 1)` |
| ItemCard subscribes via selectItemById | [STRUCTURAL] | `grep -q "selectItemById" src/components/ItemCard.tsx \|\| (echo "FAIL: per-id selector missing" && exit 1)` |
| Image lazy-loaded | [STRUCTURAL] | `grep -q 'loading="lazy"\|loading={"lazy"}' src/components/ItemCard.tsx \|\| (echo "FAIL: img lazy loading missing" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- ItemCard FeedCard useVirtualizedList \|\| (echo "FAIL: tests" && exit 1)` |
