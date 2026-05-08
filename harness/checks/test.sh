#!/usr/bin/env bash
# harness/checks/test.sh -- run test suite
set -euo pipefail

if [ ! -f package.json ]; then
  echo "PASS: no package.json yet — greenfield, test suite lands at SS-01"
  exit 0
fi

if grep -q '"test"' package.json; then
  npm test -- --passWithNoTests 2>&1 | tail -5
  exit_code=${PIPESTATUS[0]}
  if [ "$exit_code" -eq 0 ]; then
    echo "PASS: tests passed"
  else
    echo "FAIL: tests failed (exit $exit_code)"
    exit 1
  fi
else
  echo "PASS: no test script in package.json yet"
fi
