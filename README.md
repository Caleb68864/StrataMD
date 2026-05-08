# StrataMD

A modern knowledge intake and triage cockpit for [Obsidian](https://obsidian.md). Full-tab RSS, Atom, and YouTube reader with autodiscovery, OPML import, Readability-based article previews, embedded video, intentional note creation, and Newsboat/Vim-inspired keyboard navigation.

> **Status:** Repository initialized. Implementation has not yet started — this commit is the project skeleton. The Phase 1 master spec, phase specs, and design docs live outside this repository in the author's personal vault and will be tracked separately.

## What StrataMD aims to be

StrataMD is **not** a small RSS widget. It is a flagship Obsidian application that should feel like:

- Google Reader, evolved inside Obsidian instead of dying.
- Tiny Tiny RSS, modernized.
- Newsboat, with a real GUI.
- A native Obsidian workflow tool that respects markdown-first, vault-portable, intentional-note-creation principles.

## Phase 1 scope

A full-tab dashboard that handles RSS, Atom, YouTube channels and playlists, and arbitrary website URLs (with autodiscovery). Articles render through Readability with a tolerant fallback chain. YouTube items render as embedded players. Saved notes carry a stable, Bases-compatible frontmatter shape. Keyboard-first throughout.

Detailed acceptance criteria, architecture, and sub-spec breakdown are tracked in `docs/specs/` (kept local — see `.gitignore`). The high-level design is in the project author's vault.

## Stack

- **Plugin host:** Obsidian community plugin (`isDesktopOnly: false`, partial mobile support)
- **Language:** TypeScript (strict)
- **Frontend:** React 18 with `createRoot` mounted inside an `ItemView`
- **State:** Zustand with selector-scoped subscriptions
- **Styling:** TailwindCSS (prefix-scoped) + Obsidian theme variables
- **Components:** shadcn/ui primitives via Radix (with a `<PortalRoot>` wrapper to avoid Obsidian DOM collisions)
- **Storage:** Two-tier — `data.json` for hot small state, IndexedDB for items, item bodies, and extracted articles
- **Network:** Obsidian's `requestUrl` (CORS-free on desktop, sandbox-safe on mobile)
- **Bundler:** esbuild with tree-shaking and a CI bundle-size gate (≤1.5MB minified, ≤400KB gzipped)
- **Tests:** Vitest

## Status

Implementation begins with a project bootstrap sub-spec that establishes the build pipeline, lint rules (`fetch` and `console.*` outside `Logger` are banned), test infrastructure, and bundle-size CI gate.

## License

TBD — to be added with the first source-code commit.
