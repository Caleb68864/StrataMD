# Decision Log

Record fixes, workarounds, and intentional trade-offs here. A pre-commit hook (see `scripts/hooks/pre-commit`) scaffolds a placeholder entry on any code commit that lacks one, and blocks commits whose decisions.md still contains unfilled placeholders. Bypass (sparingly): `git commit --no-verify`.

Each entry follows this shape:

- **Symptom:** what the user / future reader experienced or saw.
- **Fix:** what was done (not why — that's evident from Symptom → Fix framing).
- **Surfaces:** greppable tokens (file paths, symbol names) so future debugging can find this entry via `grep -r <token> docs/decisions.md`.
- **Watch:** what could go wrong next, or a related edge case. Use "None" if nothing applies.
- **Commit:** the commit SHA the Fix landed in (filled at commit time, can be "(pending)").

**Never include secrets, tokens, connection strings, or PII in entries — this file is committed.**

---

## 2026-05-08 — Install decision log enforcement
- Symptom: No structured record of why changes will be made across this repo's history once code starts landing.
- Fix: Installed pre-commit decision-log enforcement per forge-init Step 6g with greenfield Node/TS classification. Hook lives at scripts/hooks/pre-commit; `git config core.hooksPath scripts/hooks` activates it. The hook's literal sentinel token was renamed in this file to a fenced equivalent so the explanatory header does not self-block the install commit.
- Surfaces: scripts/hooks/pre-commit, docs/decisions.md, harness/init.sh, CLAUDE.md, forge-project.json
- Watch: Commits using `--no-verify` will escape the log. SS-01 will be the first real code commit and must produce a real entry here.
- Commit: 46a636a

## 2026-05-08 — Patch master spec for path-validation halt
- Symptom: First /forge-dark-factory run halted at path-validation with 6 CRITICAL findings (modify-target-missing on src/styles.css, src/components/ItemPane.tsx / FeedPane.tsx / PreviewPane.tsx / Toolbar.tsx) plus 3 coherence BLOCKERs (SS-06/SS-07 missing transitive depends_on SS-02). Zero sub-specs executed; factory auto-merged a no-op (.gitattributes + state.db) into main.
- Fix: Patched the master spec — added 'SS-02' to SS-06.depends_on and SS-07.depends_on. Removed (modify) entries from SS-13/14/15 (FeedPane, ItemPane, PreviewPane, Toolbar) and SS-16 (FeedPane) since SS-12 creates these files and path-validation can't reason about temporal ordering. Replaced SS-12's modify of src/styles.css with a new src/components/dashboard.css. Added explanatory notes that wiring happens via composition (SS-12's panes import the cards/preview components/popovers from later sub-specs once those land).
- Surfaces: docs/specs/2026-05-08-stratamd-phase-1-rss-reader.md (SS-06/07 frontmatter, SS-12/13/14/15/16 Files lists)
- Watch: Workers in SS-13/14/15/16 still need to wire their components into SS-12's panes. The spec body mentions the wiring; the (modify) entries are gone but the worker should still touch the panes. If a worker treats absence-of-modify-entry as "don't touch", we'll have orphan components.
- Commit: (populated at commit time)

## 2026-05-08 — Snapshot Phase 1 in-progress build + Phase 1.5 design/spec/phase specs
- Symptom: Working tree had ~13 of 17 Phase 1 sub-specs partially built (src/services, src/components, src/models, src/store, etc.) plus Phase 1.5 design + master spec + 6 phase specs + redteam-report — none committed since 46a636a. About to launch /forge-dark-factory which would mix this work into the factory's auto-created feature branch.
- Fix: Snapshot-committed all in-progress Phase 1 source, configs (package.json, tsconfig, esbuild, vitest, tailwind, manifest, versions), tests, scripts, .github/, plus Phase 1.5 artifacts (docs/plans + docs/specs/stratamd-phase-1-5-quality-layer/), so the factory branches off a known clean baseline.
- Surfaces: src/, __tests__/, scripts/, .github/, package.json, tsconfig.json, esbuild.config.mjs, vitest.config.ts, tailwind.config.ts, manifest.json, versions.json, main.css, build-and-install.bat, docs/plans/2026-05-08-phase-1-5-quality-layer-design.md, docs/specs/2026-05-08-stratamd-phase-1-5-quality-layer.md, docs/specs/stratamd-phase-1-5-quality-layer/
- Watch: This is a pre-factory snapshot commit, NOT a verified Phase 1 milestone. Tests have not been run end-to-end against this snapshot. The factory invocation that follows may detect overlapping files in SS-01 (manifest.json, tsconfig, etc.) and adapt; if it tries to overwrite, manual reconciliation will be needed.
- Commit: (populated at commit time)
