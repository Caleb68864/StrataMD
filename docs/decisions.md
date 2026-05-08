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
- Commit: (populated at commit time)
