#!/usr/bin/env bash
# harness/checks/build.sh -- verify project builds cleanly
set -euo pipefail

if [ ! -f package.json ]; then
  echo "PASS: no package.json yet — greenfield, build step lands at SS-01"
  exit 0
fi

if grep -q '"build"' package.json; then
  npm run build && echo "PASS: build succeeded" || { echo "FAIL: build failed"; exit 1; }
else
  echo "PASS: no build script in package.json yet"
fi
