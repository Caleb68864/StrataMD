# harness/checks/

Mechanical check scripts for StrataMD. Each script returns exit code 0 (pass) or 1 (fail) with a one-line summary.

## Scripts

| Script | Verifies | Command (after SS-01) |
|--------|----------|-----------------------|
| build.sh | Project builds without errors | `npm run build` |
| test.sh | Test suite passes | `npm test` |
| lint.sh | Lint + typecheck clean | `npm run lint && npm run typecheck` |

While the project is greenfield (no `package.json` yet), each script returns PASS with a "no X yet" note. After SS-01 (Project Bootstrap) commits, the scripts execute the real commands.

## Usage

Run all checks:
```bash
for f in harness/checks/*.sh; do bash "$f"; done
```

Run a single check:
```bash
bash harness/checks/build.sh
```

## Adding new checks

Create a new `.sh` file in this directory. The script must:
- Return exit code 0 (pass) or 1 (fail)
- Print `PASS: ...` or `FAIL: ...` as its last line
- Be idempotent (safe to run multiple times)
- Run in under 30 seconds when possible
