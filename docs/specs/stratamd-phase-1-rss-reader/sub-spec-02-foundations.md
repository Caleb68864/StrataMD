---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
title: "Models, Logger, Container, Adapter Interface"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 2
---

# SS-02 — Models, Logger, Container, Adapter Interface

## Summary

Foundational TypeScript types (`FeedSource`, `FeedItem`, `UserState`, `Health`), the `Logger` service (only `console.*` callsite in the codebase), the `Container` registry (typed plain object), and `ISourceAdapter` interface. These are the seams every other sub-spec wires into.

## Implementation Steps (TDD)

1. **Write failing test** for `Logger.error`/`warn`/`info`/`debug` level filtering: `__tests__/Logger.test.ts` mocks `console.error/warn/info/debug` and asserts only the appropriate level fires for each method given an env override.
2. **Implement `src/services/Logger.ts`.** Export a singleton `Logger` with level driven by `process.env.NODE_ENV` (`'debug'` in dev, `'warn'` in prod). All four methods route through the singleton — this is the ONLY file allowed to call `console.*`.
3. **Run test — passes.**
4. **Define types.** `src/models/FeedSource.ts`, `FeedItem.ts`, `UserState.ts`, `Health.ts`. Each is a `type` or `interface` with no behavior. `UserState` uses `Set<string>` for `readIds` etc. (with custom JSON serializer in SS-03 turning Sets into arrays).
5. **Define `ISourceAdapter`** in `src/services/adapters/ISourceAdapter.ts`. Required members: `name: string`, `detect(url): boolean`, `resolve(url): Promise<FeedSource | FeedSource[]>`, `fetch(source): Promise<unknown>`, `parse(raw): FeedItem[]`.
6. **Define `Container`** as a typed plain object in `src/services/Container.ts`. Initial shape includes only `logger`; downstream sub-specs add fields via TypeScript declaration merging or explicit re-export.
7. **Wire `Logger` into `main.ts` `onload`.** Replace any temporary `console.*` calls.
8. **Run typecheck + tests.** Both pass.
9. **Commit.** Suggested: `feat(ss-02): foundation types, Logger, Container, ISourceAdapter`.

## Interface Contracts

**Provides** (consumed by every later sub-spec):
- `FeedSource` type (Owner: SS-02). Consumers: SS-03, SS-04, SS-05, SS-06, SS-07, SS-08, SS-10, SS-11.
- `FeedItem` type (Owner: SS-02). Consumers: SS-03, SS-04, SS-05, SS-06, SS-09, SS-10, SS-13, SS-14.
- `UserState` type (Owner: SS-02). Consumers: SS-03, SS-04.
- `ISourceAdapter` interface (Owner: SS-02). Consumers: SS-05, SS-06, SS-07.
- `Logger` service (Owner: SS-02). Consumers: every sub-spec.
- `Container` (Owner: SS-02). Consumers: every service-creating sub-spec.

**Requires:** SS-01 (build pipeline, ESLint rules, tsconfig).

## Verification Commands

```bash
npm run typecheck
npm test -- Logger
npm run lint  # ensure no console.* outside Logger.ts
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| FeedSource type exists | [STRUCTURAL] | `grep -q "type FeedSource\|interface FeedSource" src/models/FeedSource.ts \|\| (echo "FAIL: FeedSource not defined" && exit 1)` |
| FeedItem type exists | [STRUCTURAL] | `grep -q "type FeedItem\|interface FeedItem" src/models/FeedItem.ts \|\| (echo "FAIL: FeedItem not defined" && exit 1)` |
| UserState uses Set<string> | [STRUCTURAL] | `grep -q "Set<string>" src/models/UserState.ts \|\| (echo "FAIL: UserState should use Set" && exit 1)` |
| ISourceAdapter has all required members | [STRUCTURAL] | `for m in name detect resolve fetch parse; do grep -q "$m" src/services/adapters/ISourceAdapter.ts \|\| (echo "FAIL: ISourceAdapter missing $m" && exit 1); done` |
| Logger has 4 levels | [STRUCTURAL] | `for l in error warn info debug; do grep -q "$l" src/services/Logger.ts \|\| (echo "FAIL: Logger missing $l" && exit 1); done` |
| Logger tests pass | [MECHANICAL] | `npm test -- Logger \|\| (echo "FAIL: Logger tests" && exit 1)` |
| Container is typed (no string-keyed get) | [STRUCTURAL] | `! grep -q "container.get(" src/services/Container.ts \|\| (echo "FAIL: Container should not use string-keyed get" && exit 1)` |
