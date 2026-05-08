---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
title: "Project Bootstrap & Build Pipeline"
master_spec: "../2026-05-08-stratamd-phase-1-rss-reader.md"
wave: 1
---

# SS-01 — Project Bootstrap & Build Pipeline

## Summary

Bootstrap the StrataMD repository from `obsidian-sample-plugin` and configure the build, lint, format, test, and bundle-size CI gating. No runtime feature code beyond an empty `StrataMDPlugin` with `onload`/`onunload` stubs. This sub-spec establishes the conventions every downstream sub-spec follows.

## Implementation Steps (TDD)

1. **Clone the sample plugin and rename.** `git clone https://github.com/obsidianmd/obsidian-sample-plugin StrataMD && cd StrataMD && rm -rf .git && git init`. Update `manifest.json` (`id: "stratamd"`, `name: "StrataMD"`, `description`, `author`).
2. **Add canonical runtime deps.** `npm install --save react react-dom rss-parser fast-xml-parser dayjs sanitize-html clsx lucide-react zustand @mozilla/readability linkedom @tanstack/react-virtual`. Add `--save-dev tailwindcss postcss autoprefixer @types/sanitize-html @types/react @types/react-dom vitest @vitest/coverage-v8 eslint prettier @typescript-eslint/parser @typescript-eslint/eslint-plugin`.
3. **Write failing test:** `__tests__/smoke.test.ts` that imports `src/main.ts` and asserts the export is a class. Run `npm test` → fails (no Vitest config yet).
4. **Configure Vitest** with `vitest.config.ts` mocking `obsidian` via `__mocks__/obsidian.ts`. Re-run `npm test` → passes.
5. **Configure esbuild** with `esbuild.config.mjs` (`bundle: true, minify: true, treeShaking: true, externalize obsidian, metafile: true`). Build outputs `main.js`, `styles.css`.
6. **Configure Tailwind with `prefix: 'smd-'`** and `content: ['./src/**/*.{ts,tsx}']`. PostCSS pipes Tailwind into `styles.css`.
7. **Write failing bundle-size check:** `scripts/check-bundle-size.mjs` reads `main.js`, computes minified + gzipped sizes, exits 1 if >1.5MB / >400KB. Add `npm run check-bundle` script. Run after build → must currently pass (empty plugin is tiny).
8. **Configure ESLint** with `.eslintrc.cjs`: ban `fetch` via `no-restricted-globals`, ban `console.*` outside `src/services/Logger.ts` via `no-restricted-syntax`, ban static imports of `@mozilla/readability` and `linkedom` via `no-restricted-imports` (they must be dynamic).
9. **Configure Prettier** (`.prettierrc`) and add `npm run format` / `npm run lint` scripts.
10. **Add `npm run typecheck`** = `tsc --noEmit` with strict flags (`strict: true, noImplicitAny: true, noUncheckedIndexedAccess: true, exactOptionalPropertyTypes: true`).
11. **Smoke test in real Obsidian** — copy build output to a test vault's `.obsidian/plugins/stratamd/`, enable, verify no console errors.
12. **Commit.** Suggested message: `feat(ss-01): bootstrap StrataMD plugin with build pipeline and CI gates`.

## Interface Contracts

This sub-spec **provides** the foundation every other sub-spec consumes:
- `package.json` with the canonical dep set (downstream sub-specs may NOT add deps without escalation).
- `tsconfig.json` with strict flags (downstream code MUST type-check under these).
- `__mocks__/obsidian.ts` (downstream tests reuse).
- ESLint rules (downstream code MUST pass).

**Requires:** Node.js LTS, npm, git, Obsidian installed locally for smoke test.

## Verification Commands

```bash
npm install
npm run lint        # 0 errors
npm run typecheck   # 0 errors
npm test            # at least 1 passing test
npm run build       # produces main.js, styles.css, manifest.json
npm run check-bundle  # exit 0 (empty plugin well under budget)
```

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| `npm install` runs cleanly | [MECHANICAL] | `npm install >/dev/null 2>&1 \|\| (echo "FAIL: npm install errored" && exit 1)` |
| Build produces required artifacts | [MECHANICAL] | `npm run build >/dev/null 2>&1 && test -f main.js && test -f styles.css && test -f manifest.json \|\| (echo "FAIL: build artifacts missing" && exit 1)` |
| Bundle-size check enforces budget | [MECHANICAL] | `node scripts/check-bundle-size.mjs main.js \|\| (echo "FAIL: bundle exceeds 1.5MB / 400KB" && exit 1)` |
| Lint clean | [MECHANICAL] | `npm run lint 2>&1 \| tail -5; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: lint errors" && exit 1)` |
| Typecheck clean | [MECHANICAL] | `npm run typecheck \|\| (echo "FAIL: tsc errors" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test \|\| (echo "FAIL: vitest" && exit 1)` |
| Tailwind prefix is smd- | [STRUCTURAL] | `grep -q "prefix: 'smd-'" tailwind.config.ts \|\| (echo "FAIL: Tailwind prefix missing" && exit 1)` |
| ESLint bans fetch | [STRUCTURAL] | `grep -q "no-restricted-globals" .eslintrc.cjs && grep -q "fetch" .eslintrc.cjs \|\| (echo "FAIL: fetch not banned" && exit 1)` |
| ESLint bans console outside Logger | [STRUCTURAL] | `grep -q "no-restricted-syntax" .eslintrc.cjs \|\| (echo "FAIL: console rule missing" && exit 1)` |
| esbuild has tree-shaking + minify | [STRUCTURAL] | `grep -q "treeShaking: true" esbuild.config.mjs && grep -q "minify: true" esbuild.config.mjs \|\| (echo "FAIL: esbuild config" && exit 1)` |
| manifest.json has required fields | [STRUCTURAL] | `grep -q '"id": "stratamd"' manifest.json && grep -q '"name": "StrataMD"' manifest.json \|\| (echo "FAIL: manifest fields" && exit 1)` |
