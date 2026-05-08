---
date: 2026-05-08
parent_spec: 2026-05-08-stratamd-phase-1-rss-reader.md
---

# StrataMD: External Actions Service (mpv / yt-dlp)

## Context

StrataMD's design includes optional external-tool integration: launching media URLs in `mpv` for video playback and using `yt-dlp` for thumbnail/duration metadata enrichment when feed metadata is thin. The brain dump labels these as `external_tools.supported_phase_1: [mpv, yt_dlp_metadata]`, but **no Phase 1 acceptance criterion depends on them** — they are quality-of-life additions, not Phase 1 requirements.

This sub-spec is deferred from Phase 1 to keep the initial release focused on the 18 in-AC requirements (RSS, YouTube embeds, autodiscovery, OPML, notes, Bases, keyboard nav, smoothness, bundle size). External-process integration adds platform branching, capability detection, and stderr handling that's worth its own focused build pass after the core reader is shipping.

## Scope

Implement `ExternalActionsService` for spawning `mpv` and `yt-dlp`:

- **`ExternalActionsService`**: spawns external processes via Node `child_process.spawn` (desktop only). Throws `MobileUnsupportedError` if reached on mobile.
- **Capability detection**: probe configured executable paths on plugin load; cache availability for the session. Settings tab shows live "Found / Not found" status next to each path.
- **`mpv` integration**: "Open in mpv" action button on `<YouTubeEmbed>` and `<ArticlePreview>` action bar. Configurable arg template (default `"$URL"`). Optional `yt-dlp -o - $URL | mpv -` pipe mode for streaming sources that mpv can't open natively.
- **`yt-dlp` metadata enrichment**: when YouTube feed XML is missing thumbnail or duration, optionally invoke `yt-dlp -j --no-warnings $URL` to extract them. Cache results in IndexedDB. User-toggleable in settings (default: off, opt-in due to spawn cost).
- **Toolbar / menu hiding on mobile** via `Platform.isDesktop` capability check (already wired in Phase 1 dashboard shell).

## Files (new)

- `src/services/ExternalActionsService.ts`
- `src/services/external/MobileUnsupportedError.ts`
- `src/services/external/spawn.ts`
- `src/services/external/probeExecutable.ts`
- `__tests__/ExternalActionsService.test.ts`

## Files (modify)

- `src/components/preview/YouTubeEmbed.tsx` — add "Open in mpv" action button (hidden on mobile)
- `src/components/preview/ArticlePreview.tsx` — add "Open in mpv" for media items
- `src/services/adapters/YouTubeAdapter.ts` — optional yt-dlp metadata enrichment hook
- `src/settings/SettingsTab.ts` — add executable path fields + capability indicators

## Acceptance Criteria

- `[STRUCTURAL]` `ExternalActionsService` exists with `spawn(executable, args): Promise<{stdout, stderr, code}>` method.
- `[BEHAVIORAL]` On desktop, "Open in mpv" launches the configured mpv executable with the item URL when invoked.
- `[BEHAVIORAL]` On mobile, "Open in mpv" button is not rendered (capability check via `Platform.isDesktop`).
- `[MECHANICAL]` Settings tab shows "Found" or "Not found" indicator next to each configured executable path.
- `[BEHAVIORAL]` When yt-dlp metadata enrichment is enabled and a YouTube item is missing thumbnail/duration, calling `YouTubeAdapter.enrichMetadata(item)` populates the missing fields from yt-dlp output.
- `[BEHAVIORAL]` When the configured executable is missing, the action button shows a tooltip with the configured path and a settings link; no silent failure.
- `[BEHAVIORAL]` Spawn errors (non-zero exit) surface a toast with the first 200 chars of stderr plus a "View log" expand.
