---
sub_spec_id: SS-14
phase: run
depends_on: ['SS-12', 'SS-09']
dispatch: factory
title: "Preview Components — Article, YouTube, Bookmark"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 8
---

# SS-14 — Preview Components

## Summary

Three preview component types under `<PreviewPane>` plus `usePreviewLoader` with abort-on-selection-change semantics. `<YouTubeEmbed>` is thumbnail-first, iframe-on-click. `<PreviewActionBar>` exposes Save / Open Original / Star / Mark Unread / Copy Link.

## Implementation Steps (TDD)

1. **Write failing test:** rapid `j` presses cycle through items; only the final item's preview ends up rendered; in-flight extractions are aborted (verified via spy on `AbortController.abort`).
2. **Implement `usePreviewLoader(itemId)`** with `AbortController` + `useEffect` cleanup that aborts the previous controller on selectedItemId change.
3. **Implement `<ArticlePreview>`** rendering extracted html via `dangerouslySetInnerHTML` (sanitization already done by SS-09).
4. **Implement `<YouTubeEmbed>`** with two states: thumbnail+play-overlay → iframe (`https://www.youtube.com/embed/{videoId}` with `sandbox` attribute) on click.
5. **Implement `<BookmarkPreview>`** with metadata + Open Original CTA.
6. **Implement `<PreviewActionBar>`** with five action buttons reading shortcut hints from settings.
7. **Wire `<PreviewPane>` routing** by `selectedItem.mediaType`.
8. **Write failing test:** YouTube embed `onerror` triggers fallback to thumbnail-with-actions; never blank pane.
9. **Implement embed-error fallback.**
10. **Write failing test:** clicking Save Note invokes `NoteService.save` and shows a toast with the path.
11. **Wire toast** through Obsidian's `Notice` API (single-line ~3s).
12. **Commit.** Suggested: `feat(ss-14): preview components with abort-on-select + YouTube embed fallback`.

## Interface Contracts

**Provides:**
- `<ArticlePreview>` `<YouTubeEmbed>` `<BookmarkPreview>` (Owner: SS-14). Consumer: SS-12 (`<PreviewPane>`).
- `<PreviewActionBar>` (Owner: SS-14). Consumer: SS-15 (keyboard shortcut hints come from same source).
- `usePreviewLoader` hook (Owner: SS-14). Consumer: SS-12.

**Requires:** SS-09 (`ArticlePreviewService.extract`), SS-10 (`NoteService.save` for Save button), SS-12 (host pane), SS-04 (selectors).

## Verification Commands

```bash
npm test -- preview usePreviewLoader
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| ArticlePreview exists | [STRUCTURAL] | `test -f src/components/preview/ArticlePreview.tsx \|\| (echo "FAIL: ArticlePreview missing" && exit 1)` |
| YouTubeEmbed exists | [STRUCTURAL] | `test -f src/components/preview/YouTubeEmbed.tsx \|\| (echo "FAIL: YouTubeEmbed missing" && exit 1)` |
| BookmarkPreview exists | [STRUCTURAL] | `test -f src/components/preview/BookmarkPreview.tsx \|\| (echo "FAIL: BookmarkPreview missing" && exit 1)` |
| usePreviewLoader uses AbortController | [STRUCTURAL] | `grep -q "AbortController" src/hooks/usePreviewLoader.ts \|\| (echo "FAIL: AbortController missing" && exit 1)` |
| YouTube iframe sandboxed | [STRUCTURAL] | `grep -q "sandbox" src/components/preview/YouTubeEmbed.tsx \|\| (echo "FAIL: iframe sandbox missing" && exit 1)` |
| Embed error fallback present | [STRUCTURAL] | `grep -q "onError\|onerror" src/components/preview/YouTubeEmbed.tsx \|\| (echo "FAIL: embed error fallback missing" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- preview \|\| (echo "FAIL: preview tests" && exit 1)` |
| usePreviewLoader tests pass | [MECHANICAL] | `npm test -- usePreviewLoader \|\| (echo "FAIL: hook tests" && exit 1)` |
