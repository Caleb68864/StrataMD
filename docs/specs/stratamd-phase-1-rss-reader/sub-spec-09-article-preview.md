---
sub_spec_id: SS-09
phase: run
depends_on: ['SS-03']
dispatch: factory
title: "Article Preview Service (lazy-loaded)"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 4
---

# SS-09 — Article Preview Service (lazy-loaded)

## Summary

Readability-first extraction with the design's fallback chain. `@mozilla/readability` and `linkedom` are dynamically imported only on first invocation so they do not weigh down the cold-start bundle.

## Implementation Steps (TDD)

1. **Write failing test:** `extract` against a known-good HTML returns `source: 'readability'` with non-empty html.
2. **Implement `extractArticle.ts`** with dynamic `import('@mozilla/readability')` + `import('linkedom')` inside the function. Static imports are forbidden by ESLint rule from SS-01.
3. **Run test — passes.**
4. **Write failing test:** Readability returns empty → fallback to feed `content:encoded`, returns `source: 'content-encoded'`.
5. **Implement fallback chain** in `ArticlePreviewService.extract`.
6. **Write failing test:** all sources empty → `source: 'none'`, no exception.
7. **Implement final fallback.**
8. **Write failing test:** 10s `AbortController.signal` aborts extraction; result is `source: 'none'`.
9. **Implement timeout** by passing `AbortSignal` through the dynamic import chain.
10. **Write failing test:** sanitize-html strips `<script>` and inline event handlers; preserves `<p>`, `<a>`, `<img>`, `<pre>`, `<code>`, `<blockquote>`.
11. **Implement `sanitizeArticle.ts`** with curated allow-list.
12. **Write failing test:** repeated `extract(itemId)` for same item returns cached HTML without re-fetch (hits `CacheService.getExtractedArticle`).
13. **Wire CacheService** read-through cache.
14. **Verify lazy chunk:** `npm run build` then check esbuild metafile shows `@mozilla/readability` and `linkedom` in a separate chunk.
15. **Commit.** Suggested: `feat(ss-09): lazy-loaded article extraction with fallback chain + cache`.

## Interface Contracts

**Provides:**
- `ArticlePreviewService.extract(item, signal) → Promise<PreviewResult>` (Owner: SS-09). Consumer: SS-14 (`<ArticlePreview>` via `usePreviewLoader`).
- `PreviewResult` type (Owner: SS-09). Consumer: SS-14.

**Requires:** SS-03 (`CacheService.getExtractedArticle / putExtractedArticle`), `app.requestUrl`.

## Verification Commands

```bash
npm test -- ArticlePreview sanitize
npm run build  # then inspect esbuild metafile for separate chunks
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| ArticlePreviewService exists | [STRUCTURAL] | `test -f src/services/ArticlePreviewService.ts \|\| (echo "FAIL: ArticlePreviewService missing" && exit 1)` |
| Static readability/linkedom imports forbidden | [STRUCTURAL] | `! grep -q "^import.*@mozilla/readability\|^import.*from 'linkedom'" src/services/preview/extractArticle.ts \|\| (echo "FAIL: static import found — must be dynamic" && exit 1)` |
| Dynamic import used | [STRUCTURAL] | `grep -q "import('@mozilla/readability')\|import(\"@mozilla/readability\")" src/services/preview/extractArticle.ts \|\| (echo "FAIL: dynamic import missing" && exit 1)` |
| Sanitize-html invoked | [STRUCTURAL] | `grep -q "sanitize-html\|sanitizeHtml" src/services/preview/sanitizeArticle.ts \|\| (echo "FAIL: sanitize-html missing" && exit 1)` |
| ArticlePreview tests pass | [MECHANICAL] | `npm test -- ArticlePreview \|\| (echo "FAIL: tests" && exit 1)` |
| Sanitize tests pass | [MECHANICAL] | `npm test -- sanitize \|\| (echo "FAIL: sanitize tests" && exit 1)` |
| Lazy chunk in metafile | [MECHANICAL] | `npm run build >/dev/null 2>&1 && [ $(grep -c "@mozilla/readability" main.js) -eq 0 ] \|\| (echo "FAIL: readability bundled into main — should be separate chunk" && exit 1)` |
