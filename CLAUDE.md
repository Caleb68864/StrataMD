# CLAUDE.md — StrataMD

## What This Project Is

A flagship Obsidian community plugin: a full-tab knowledge intake and triage cockpit for RSS, Atom, YouTube, and arbitrary websites with autodiscovery. Saved items become Bases-compatible markdown notes intentionally — never automatically.

> **Status: greenfield.** Source code lands when SS-01 (Project Bootstrap) executes. Until then the codebase is the spec at `docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md` plus its 17 phase specs in `docs/specs/stratamd-phase-1-rss-reader/`.

## Commands

These commands become live after SS-01 commits a working `package.json`. Until then they exit cleanly with a "greenfield" note.

- Build: `npm run build`
- Test: `npm test`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Bundle-size CI gate: `node scripts/check-bundle-size.mjs main.js`
- Dev (watch): `npm run dev`

Always run the harness checks before declaring a sub-spec done:

```bash
bash harness/init.sh
for f in harness/checks/*.sh; do bash "$f"; done
```

## Structure

```
docs/                # Tracked design artifacts (plans, specs, backlog, notes)
harness/             # Project harness (init.sh + checks/ + progress.json)
scripts/hooks/       # Decision-log enforcement pre-commit hook
src/                 # Source code (lands at SS-01)
templates/           # Note templates (article.md, youtube.md, bookmark.md)
__tests__/           # Vitest tests
__mocks__/           # obsidian.ts mock
vault/               # Local-only forge state (gitignored)
forge-project.json   # Forge config (greenfield-aware build/test/lint commands)
```

Spec / plan / backlog / overview files are tracked in `docs/`. Forge drafts and per-project state are in `vault/` (gitignored).

## Key Conventions (locked by spec)

- **Adapter pattern.** Every source implements `ISourceAdapter` (`detect / resolve / fetch / parse`). New sources = new adapters; never branch on source type in the store or UI.
- **Owns / does-not-own discipline.** Components own *layout and interaction*, never I/O. Hooks own *subscription wiring*, never persistence. Store owns *current truth*, never side effects. Services own *side effects*, never React state. Adapters own *source-specific knowledge*, never UI.
- **Container.** Singleton service registry as a typed plain object. No DI framework, no string-keyed lookups.
- **Lazy heavy deps.** `@mozilla/readability` and `linkedom` are dynamically imported inside `extractArticle.ts` only — static imports are ESLint-banned.
- **Selectors.** Parameterized selectors use the curried + `useShallow` pattern (documented in `src/store/selectors.ts`).
- **Note creation is intentional only.** Refresh never creates notes. `app.vault.create` is the only write path.
- **Test layout.** Vitest tests live in `__tests__/` mirroring `src/`; `__mocks__/obsidian.ts` is the shared Obsidian mock.

## Constraints

### Musts
- Use Obsidian's `app.requestUrl` for ALL feed and article fetches. `fetch()` is ESLint-banned.
- Route ALL logging through `src/services/Logger.ts`. `console.*` is ESLint-banned outside that file.
- Use `app.vault.create` / `app.vault.modify` for note writes — no direct filesystem access.
- Emit Bases-compatible frontmatter on saved notes — exactly the 8 keys: `type, status, source, url, category, tags, published, saved_at`. All keys present on every note. After v1.0 the shape is a stability commitment (additive changes OK; renaming/removal requires a major version bump).
- Keep main bundle ≤1.5MB minified, ≤400KB gzipped (CI-enforced).
- Flush pending `data.json` writes synchronously on `plugin.onunload`.
- Tailwind utilities scoped behind the `smd-` prefix. Respect Obsidian theme variables for semantic colors.
- Sanitize all extracted article HTML through the explicit allow-list in `src/services/preview/sanitizeArticle.ts`. The allow-list is the single source of truth.
- Configure `fast-xml-parser` with `processEntities: false` for OPML imports (XXE prevention).

### Must-Nots
- No new runtime dependency outside the canonical list (`react, react-dom, rss-parser, fast-xml-parser, dayjs, sanitize-html, clsx, lucide-react, tailwindcss, zustand, @mozilla/readability, linkedom, @tanstack/react-virtual`) without explicit human approval.
- No bundled binaries (Python, ffmpeg, etc.). External tools (mpv, yt-dlp) are user-installed and Phase-2 anyway.
- No server, daemon, or background HTTP listener.
- No cloud services, accounts, or required API keys.
- No auto-archiving, batch note creation, or automatic note creation per item.
- No coupling of store/UI code to source-specific knowledge — must go through `ISourceAdapter`.
- No static imports of `@mozilla/readability` or `linkedom` — they MUST be dynamic.

## Decision Log

Fixes, workarounds, and intentional trade-offs live in `docs/decisions.md`. A pre-commit hook scaffolds a `<FILL-IN>` entry on any code commit that lacks one, and blocks commits whose decisions.md still contains the sentinel.

**Never include secrets, tokens, connection strings, or PII in entries — this file is committed.**

**When to append:** after any fix, workaround, or non-obvious trade-off. Each entry has Symptom / Fix / Surfaces / Watch / Commit.
**When debugging:** grep `docs/decisions.md` for the surface area (file path or module) before proposing a fix — prior decisions often contain the answer.
**Bypass:** `git commit --no-verify` (use sparingly).

## Harness

Project harness lives in `harness/`. Run before any work session:

```bash
bash harness/init.sh
for f in harness/checks/*.sh; do bash "$f"; done
```

While greenfield, all checks return "PASS: no X yet" — they activate after SS-01 lands `package.json`.
