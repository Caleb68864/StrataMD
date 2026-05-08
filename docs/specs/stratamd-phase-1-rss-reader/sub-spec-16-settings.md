---
sub_spec_id: SS-16
phase: run
depends_on: ['SS-08', 'SS-11', 'SS-12']
dispatch: factory
title: "Settings Tab, Refresh Hook, Notification Behavior"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 9
---

# SS-16 — Settings Tab + Refresh Hook + Notification Behavior

## Summary

Obsidian settings tab covering all configurables; `useFeedRefresh` hook bridging scheduler events to React; `Notifications` service for opt-in per-feed notices with rate limiting and global suppression.

## Implementation Steps (TDD)

1. **Write failing test:** with `notifyOnNew: false`, refresh that yields new items emits zero `Notice` calls. Mock `Notice`.
2. **Implement `Notifications.notifyNewItems(feed, count)`** checking `feed.notifyOnNew` first.
3. **Run notification test — passes.**
4. **Write failing test:** rate limit — two refreshes within 5 minutes for same feed → only one `Notice`. Mock `Date.now`.
5. **Implement rate limiter** with `Map<feedId, lastNoticeAt>`.
6. **Write failing test:** `suppressAllNotifications: true` → zero notices regardless.
7. **Implement global suppress check.**
8. **Implement `useFeedRefresh` hook** subscribing to scheduler `RefreshEvent`s; exposes `{isRefreshing, lastRefresh, refreshingFeedIds}`.
9. **Write failing test:** hook re-renders consuming component once per `RefreshEvent` batch (not per individual feed).
10. **Implement batched dispatch** in scheduler (emit one `BatchedRefreshComplete` event after a tick instead of per-feed events).
11. **Implement `SettingsTab`** with all configurable fields per master spec SS-16 ACs.
12. **Implement `defaultSettings.ts`** with documented defaults.
13. **Wire per-feed settings dialog** (right-click `<FeedCard>` → properties popover) — Radix popover via `<PortalRoot>`.
14. **Commit.** Suggested: `feat(ss-16): settings tab + opt-in notifications + refresh hook`.

## Interface Contracts

**Provides:**
- `SettingsTab` (Owner: SS-16). Consumer: SS-17 (registers via `addSettingTab`).
- `Notifications` service (Owner: SS-16). Consumer: SS-08 (calls on new items if enabled).
- `useFeedRefresh` (Owner: SS-16). Consumer: SS-12 (toolbar refresh indicator).

**Requires:** SS-08 (scheduler events), SS-11 (OPML import button), SS-12 (PortalRoot for popover), SS-04 (settings slice).

## Verification Commands

```bash
npm test -- Notifications useFeedRefresh
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| SettingsTab exists | [STRUCTURAL] | `test -f src/settings/SettingsTab.ts \|\| (echo "FAIL: SettingsTab missing" && exit 1)` |
| defaultSettings exists | [STRUCTURAL] | `test -f src/settings/defaultSettings.ts \|\| (echo "FAIL: defaults missing" && exit 1)` |
| Notifications service exists | [STRUCTURAL] | `test -f src/services/Notifications.ts \|\| (echo "FAIL: Notifications missing" && exit 1)` |
| Rate limit window 5min | [STRUCTURAL] | `grep -q "300_000\|300000\|5.*minute\|5 \\* 60" src/services/Notifications.ts \|\| (echo "FAIL: rate limit window missing" && exit 1)` |
| useFeedRefresh hook exists | [STRUCTURAL] | `test -f src/hooks/useFeedRefresh.ts \|\| (echo "FAIL: useFeedRefresh missing" && exit 1)` |
| Notification tests pass | [MECHANICAL] | `npm test -- Notifications \|\| (echo "FAIL: notifications tests" && exit 1)` |
| Refresh hook tests pass | [MECHANICAL] | `npm test -- useFeedRefresh \|\| (echo "FAIL: hook tests" && exit 1)` |
