---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-05']
dispatch: factory
title: "YouTube Adapter (with Plan-B seam)"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 4
---

# SS-06 — YouTube Adapter (with Plan-B seam)

## Summary

Resolves YouTube URL patterns (`@handle`, `/channel/`, `/user/`, `/c/`, playlist) to canonical `feeds/videos.xml?…` URLs. Channel-handle resolution scrapes `meta[itemprop=channelId]` from the channel HTML page. The adapter exposes `IYouTubePlanB` so a future scrape/yt-dlp implementation can hot-swap if Google removes the feed endpoint.

## Implementation Steps (TDD)

1. **Write failing test** for `resolveChannel('https://www.youtube.com/@SomeHandle')`: mocked `requestUrl` returns `sample-channel-page.html` containing `<meta itemprop="channelId" content="UC123">`; assert returned `FeedSource.url === 'https://www.youtube.com/feeds/videos.xml?channel_id=UC123'`.
2. **Implement `parseChannelHtml.ts`** using `linkedom` (already a dep, dynamic-imported). Returns `channelId` or null.
3. **Implement `resolveChannel.ts`** to dispatch by URL pattern: `@handle`, `/c/`, `/user/` → scrape; `/channel/UC…` → use directly.
4. **Run channel test — passes.**
5. **Write failing test** for playlist URL: `?list=PL...` → `feeds/videos.xml?playlist_id=PL...`.
6. **Implement `resolvePlaylist.ts`** (regex extract).
7. **Run playlist test — passes.**
8. **Write failing test** for missing `meta[itemprop=channelId]`: `resolve` rejects with `YouTubeResolutionError` carrying the original URL.
9. **Implement `YouTubeResolutionError`** + adjust `resolveChannel` to throw it on no-match.
10. **Define `IYouTubePlanB`** interface and `PlanA_FeedXml` default implementation. The adapter holds a reference to `IYouTubePlanB` (default `PlanA_FeedXml`); `parse(raw)` delegates to it.
11. **Write failing test** for thumbnail/duration extraction from `media:thumbnail` and `yt:duration`.
12. **Implement parse** in `PlanA_FeedXml` extracting these fields; `mediaType: 'video'`, `durationSec` parsed from ISO-8601 duration.
13. **Commit.** Suggested: `feat(ss-06): YouTube adapter with channel-handle resolution and Plan-B seam`.

## Interface Contracts

**Provides:**
- `YouTubeAdapter implements ISourceAdapter` (Owner: SS-06). Consumer: SS-07 (DiscoveryService chain), SS-08 (Scheduler).
- `IYouTubePlanB` interface (Owner: SS-06). Future Phase 2 contingency consumer.
- `YouTubeResolutionError` (Owner: SS-06). Consumer: SS-12 (UI manual-override prompt).

**Requires:** SS-05 (`ISourceAdapter`, dynamic linkedom usage pattern), SS-02 (types), `app.requestUrl`.

## Verification Commands

```bash
npm test -- youtube
npm run typecheck
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| YouTubeAdapter implements ISourceAdapter | [STRUCTURAL] | `grep -q "ISourceAdapter" src/services/adapters/YouTubeAdapter.ts \|\| (echo "FAIL: YouTubeAdapter ISourceAdapter" && exit 1)` |
| detect handles all required URL patterns | [STRUCTURAL] | `for p in youtube.com youtu.be; do grep -q "$p" src/services/adapters/YouTubeAdapter.ts \|\| (echo "FAIL: detect missing $p" && exit 1); done` |
| Plan-B seam exists | [STRUCTURAL] | `test -f src/services/adapters/youtube/IYouTubePlanB.ts && test -f src/services/adapters/youtube/PlanA_FeedXml.ts \|\| (echo "FAIL: Plan-B seam files missing" && exit 1)` |
| YouTubeResolutionError typed | [STRUCTURAL] | `grep -q "YouTubeResolutionError" src/services/adapters/YouTubeAdapter.ts \|\| (echo "FAIL: typed error missing" && exit 1)` |
| Sample HTML fixture present | [STRUCTURAL] | `test -f src/services/adapters/__fixtures__/sample-channel-page.html \|\| (echo "FAIL: fixture missing" && exit 1)` |
| YouTube tests pass | [MECHANICAL] | `npm test -- youtube \|\| (echo "FAIL: youtube tests" && exit 1)` |
