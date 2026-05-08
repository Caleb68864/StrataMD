---
sub_spec_id: SS-07
phase: run
depends_on: ['SS-05', 'SS-06']
dispatch: factory
title: "Feed Discovery Service & Website Autodiscovery Adapter"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 5
---

# SS-07 — Feed Discovery Service & Website Autodiscovery Adapter

## Summary

`FeedDiscoveryService` routes a URL through adapters in priority order: `YouTubeAdapter` → `WebsiteAutodiscoveryAdapter` → `RSSAdapter` (fallback for direct feed URLs). The autodiscovery adapter parses `<link rel="alternate" type="application/rss+xml">` and probes `/feed`, `/rss`, `/atom.xml` when no alternate links exist.

## Implementation Steps (TDD)

1. **Write failing test:** `FeedDiscoveryService.resolve('https://example.com')` against `sample-website.html` (with `<link rel="alternate" type="application/rss+xml" href="/feed.xml">`) returns one `FeedSource` with absolute feed URL.
2. **Implement `parseAlternateLinks.ts`** using linkedom (dynamic import). Returns array of `{href, type, title}`.
3. **Implement `WebsiteAutodiscoveryAdapter`** wrapping the parser.
4. **Implement `FeedDiscoveryService.resolve`** as adapter chain: YouTube → autodiscovery → RSS fallback. Returns first success.
5. **Run test — passes.**
6. **Write failing test:** when no alternates, probe `/feed`, `/rss`, `/atom.xml` (HEAD then GET if HEAD fails). First with feed-shaped response (`Content-Type: application/rss+xml | application/atom+xml | text/xml | application/xml` AND/OR root tag matches `rss|feed|RDF`) wins.
7. **Implement `probeCommonPaths.ts`** with the probe sequence.
8. **Run probe test — passes.**
9. **Write failing test:** sample-website-no-feed (no alternates, all probes 404) → `DiscoveryFailedError`.
10. **Implement error path.**
11. **Write failing test:** multiple alternates (RSS + Atom) → returns array of two `FeedSource` candidates.
12. **Implement multi-candidate return** + adjust `FeedDiscoveryService` to surface array.
13. **Commit.** Suggested: `feat(ss-07): URL autodiscovery via rel=alternate + probe fallback`.

## Interface Contracts

**Provides:**
- `FeedDiscoveryService.resolve(url) → Promise<FeedSource | FeedSource[]>` (Owner: SS-07). Consumer: SS-04 (`addFeed` action), SS-11 (OPML row resolution if needed).
- `DiscoveryFailedError` (Owner: SS-07). Consumer: SS-12 (toolbar inline error).

**Requires:** SS-05 (`RSSAdapter`), SS-06 (`YouTubeAdapter`), `app.requestUrl`.

## Verification Commands

```bash
npm test -- DiscoveryService Autodiscovery
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| FeedDiscoveryService exists | [STRUCTURAL] | `test -f src/services/FeedDiscoveryService.ts \|\| (echo "FAIL: FeedDiscoveryService.ts missing" && exit 1)` |
| Adapter chain order correct | [STRUCTURAL] | `grep -q "YouTubeAdapter" src/services/FeedDiscoveryService.ts && grep -q "WebsiteAutodiscoveryAdapter" src/services/FeedDiscoveryService.ts && grep -q "RSSAdapter" src/services/FeedDiscoveryService.ts \|\| (echo "FAIL: chain registration" && exit 1)` |
| Probe paths correct | [STRUCTURAL] | `for p in '/feed' '/rss' '/atom.xml'; do grep -q "$p" src/services/discovery/probeCommonPaths.ts \|\| (echo "FAIL: probe path $p missing" && exit 1); done` |
| DiscoveryFailedError typed | [STRUCTURAL] | `grep -q "DiscoveryFailedError" src/services/FeedDiscoveryService.ts \|\| (echo "FAIL: typed error missing" && exit 1)` |
| Discovery tests pass | [MECHANICAL] | `npm test -- DiscoveryService \|\| (echo "FAIL: discovery tests" && exit 1)` |
| Autodiscovery tests pass | [MECHANICAL] | `npm test -- Autodiscovery \|\| (echo "FAIL: autodiscovery tests" && exit 1)` |
