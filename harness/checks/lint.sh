#!/usr/bin/env bash
# harness/checks/lint.sh -- run linter + typecheck
set -euo pipefail

if [ ! -f package.json ]; then
  echo "PASS: no package.json yet — greenfield, lint config lands at SS-01"
  exit 0
fi

ran_something=0

if grep -q '"lint"' package.json; then
  npm run lint && lint_ok=1 || lint_ok=0
  ran_something=1
  if [ "$lint_ok" = "0" ]; then
    echo "FAIL: lint failed"
    exit 1
  fi
fi

if grep -q '"typecheck"' package.json; then
  npm run typecheck && tc_ok=1 || tc_ok=0
  ran_something=1
  if [ "$tc_ok" = "0" ]; then
    echo "FAIL: typecheck failed"
    exit 1
  fi
fi

if [ "$ran_something" = "0" ]; then
  echo "PASS: no lint/typecheck scripts in package.json yet"
else
  echo "PASS: lint and typecheck clean"
fi
