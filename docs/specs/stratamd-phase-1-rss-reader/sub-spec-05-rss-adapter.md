---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-02']
dispatch: factory
title: "RSS/Atom Adapter and Mock Adapter"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 3
---

# SS-05 — RSS/Atom Adapter and Mock Adapter

## Summary

`RSSAdapter` parses RSS 2.0 and Atom feeds via `rss-parser` over `app.requestUrl`. Tolerant: malformed items are skipped and logged, never thrown. `MockAdapter` provides dev-mode seed data; tree-shaken from production.

## Implementation Steps (TDD)

1. **Write failing test** with `sample-rss.xml` fixture: `RSSAdapter.parse(rawXml)` returns ≥3 items with `id, title, url, published`.
2. **Implement RSSAdapter** wrapping `rss-parser`. `fetch` uses `app.requestUrl({url})` (mocked in test). Normalize: prefer `guid > link > url` for ID; map `pubDate > published` for date.
3. **Run test — passes.**
4. **Write failing test** with `sample-atom.xml`: same assertions for Atom 1.0 syntax.
5. **Extend RSSAdapter** to detect Atom via `<feed xmlns="http://www.w3.org/2005/Atom">` and route to `rss-parser`'s Atom mode (or shared normalize layer).
6. **Run Atom test — passes.**
7. **Write failing test** with `malformed-rss.xml` (missing `</item>` close tag, garbled CDATA): `parse` returns valid items only and does not throw.
8. **Implement tolerance:** wrap `rss-parser` calls in try/catch per-item; missing `title` OR `url` → skip + log to `Logger.warn`. Single `skippedCount` warn per parse.
9. **Run malformed test — passes.**
10. **Write failing test** for date fallback: item with date `"not a real date"` parses with `published = Date.now()` and `_dateFallback: true`.
11. **Implement date fallback.**
12. **Implement `MockAdapter`** in same module. `mockFeeds.ts` exports ≥5 fake feeds, ≥10 items each. Production guard: `if (process.env.NODE_ENV === 'production') throw new Error('MockAdapter is dev-only')` — esbuild's `define: { 'process.env.NODE_ENV': '"production"' }` plus DCE eliminates this branch in prod.
13. **Verify tree-shaking:** `npm run build` then check `main.js` does NOT contain `mockFeeds` references via `grep -c mockFeeds main.js` → 0.
14. **Commit.** Suggested: `feat(ss-05): RSS/Atom adapter with tolerant parsing + dev-mode MockAdapter`.

## Interface Contracts

**Provides:**
- `RSSAdapter implements ISourceAdapter` (Owner: SS-05). Consumer: SS-07 (registered in DiscoveryService chain), SS-08 (called by Scheduler).
- `MockAdapter implements ISourceAdapter` (Owner: SS-05). Consumer: SS-12 (UI dev mode "Try Sample Feeds" button).

**Requires:** SS-02 (`ISourceAdapter`, `FeedItem`, `FeedSource`, `Logger`).

## Verification Commands

```bash
npm test -- RSSAdapter MockAdapter
npm run build && grep -c mockFeeds main.js  # must be 0
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| RSSAdapter implements ISourceAdapter | [STRUCTURAL] | `grep -q "implements ISourceAdapter\|: ISourceAdapter" src/services/adapters/RSSAdapter.ts \|\| (echo "FAIL: RSSAdapter does not implement ISourceAdapter" && exit 1)` |
| RSSAdapter uses requestUrl not fetch | [STRUCTURAL] | `! grep -q "fetch(" src/services/adapters/RSSAdapter.ts && grep -q "requestUrl" src/services/adapters/RSSAdapter.ts \|\| (echo "FAIL: RSSAdapter must use requestUrl" && exit 1)` |
| MockAdapter has production guard | [STRUCTURAL] | `grep -q "NODE_ENV" src/services/adapters/MockAdapter.ts \|\| (echo "FAIL: MockAdapter prod guard missing" && exit 1)` |
| Sample fixtures exist | [STRUCTURAL] | `for f in sample-rss.xml sample-atom.xml malformed-rss.xml; do test -f "src/services/adapters/__fixtures__/$f" \|\| (echo "FAIL: fixture $f missing" && exit 1); done` |
| RSSAdapter tests pass | [MECHANICAL] | `npm test -- RSSAdapter \|\| (echo "FAIL: RSSAdapter tests" && exit 1)` |
| MockAdapter tests pass | [MECHANICAL] | `npm test -- MockAdapter \|\| (echo "FAIL: MockAdapter tests" && exit 1)` |
| MockAdapter tree-shaken from prod build | [MECHANICAL] | `npm run build >/dev/null 2>&1 && [ $(grep -c mockFeeds main.js) -eq 0 ] \|\| (echo "FAIL: MockAdapter present in production bundle" && exit 1)` |
