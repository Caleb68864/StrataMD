---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-03']
dispatch: factory
title: "Zustand Store and Selectors"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 4
---

# SS-04 — Zustand Store and Selectors

## Summary

The single source of UI truth. Slices: `feedsById`, `itemsById`, `userState`, `selection`, `filters`, `ui`. Memoized selectors prevent wide re-renders. Actions delegate to services on the `Container` — they never do I/O directly.

## Implementation Steps (TDD)

1. **Write failing test** `__tests__/useStrataStore.test.ts`: create the store with seed state; call `markRead('item-1')`; assert `userState.readIds.has('item-1') === true`.
2. **Implement `src/store/types.ts`** with `StoreState` and `StoreActions` interfaces; `useStrataStore.ts` with `create<StoreState & StoreActions>()` from Zustand.
3. **Run test — passes.**
4. **Write failing test** for selector memoization: subscribe `selectCurrentItemIds` twice with same inputs; assert identical reference returned.
5. **Implement `selectors.ts`** using `reselect` if needed (or hand-rolled memo if reselect adds bundle weight). Selectors: `selectFeedById`, `selectItemById`, `selectCurrentItemIds`, `selectUnreadCountsByFeedId`, `selectGlobalUnreadCount`, `selectSelectedItem`.
6. **Write failing render-count test:** create a stub component subscribed via `selectItemById('a')`; toggle read on `item-b`; assert stub does not re-render.
7. **Implement actions** in `actions.ts`: `addFeed`, `removeFeed`, `selectNext/Previous`, `markRead/Unread`, `toggleStar`, `markSaved`, `setSearchQuery`, `setView`, `applyDelta`, `hydrate`. Each action accepts the `Container` as first param (passed via store closure on init).
8. **Wire `StateService.save` into actions** that mutate persisted state. Use the debounced API — no flush calls except in lifecycle hooks.
9. **Run all store tests — pass.**
10. **Commit.** Suggested: `feat(ss-04): Zustand store with selector-scoped subscriptions and service-delegating actions`.

## Interface Contracts

**Provides:**
- `useStrataStore` hook (Owner: SS-04). Consumers: every component, every hook.
- Selectors (Owner: SS-04). Consumers: SS-12, SS-13, SS-14, SS-15, SS-16, SS-17.
- Store actions (Owner: SS-04). Consumers: SS-08 (`applyDelta` from refresh), SS-11 (`addFeed` from OPML), SS-15 (selection actions from keyboard).

**Requires:** SS-03 (StateService.load on hydrate, StateService.save on persisted-state changes), SS-02 (types).

## Verification Commands

```bash
npm test -- store
npm run typecheck
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| useStrataStore exists | [STRUCTURAL] | `grep -q "create<" src/store/useStrataStore.ts \|\| (echo "FAIL: zustand create not found" && exit 1)` |
| All required slices present | [STRUCTURAL] | `for s in feedsById itemsById userState selection filters ui; do grep -q "$s" src/store/types.ts \|\| (echo "FAIL: slice $s missing" && exit 1); done` |
| Required actions present | [STRUCTURAL] | `for a in addFeed markRead toggleStar selectNext applyDelta hydrate setSearchQuery; do grep -q "$a" src/store/actions.ts \|\| (echo "FAIL: action $a missing" && exit 1); done` |
| Required selectors present | [STRUCTURAL] | `for s in selectFeedById selectItemById selectCurrentItemIds selectUnreadCountsByFeedId selectGlobalUnreadCount; do grep -q "$s" src/store/selectors.ts \|\| (echo "FAIL: selector $s missing" && exit 1); done` |
| Actions do not call requestUrl directly | [STRUCTURAL] | `! grep -q "requestUrl" src/store/actions.ts \|\| (echo "FAIL: actions must delegate I/O to services" && exit 1)` |
| Actions do not call vault directly | [STRUCTURAL] | `! grep -q "app.vault" src/store/actions.ts \|\| (echo "FAIL: actions must not touch vault" && exit 1)` |
| Store tests pass | [MECHANICAL] | `npm test -- store \|\| (echo "FAIL: store tests" && exit 1)` |
