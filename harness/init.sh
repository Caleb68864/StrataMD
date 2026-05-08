#!/usr/bin/env bash
# harness/init.sh -- idempotent environment setup
# Run before any work session to reach a testable state.
# Safe to run repeatedly -- detects existing state and skips.
set -euo pipefail

echo "==> StrataMD harness init starting..."

# --- Git hooks ---
# Re-activate decision log enforcement hook on every run (idempotent).
if [ -d scripts/hooks ]; then
  git config core.hooksPath scripts/hooks
fi

# --- Dependencies ---
# package.json lands at SS-01 (Project Bootstrap). Until then, no install step.
if [ -f package.json ]; then
  if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
    echo "==> Installing npm dependencies..."
    if [ -f package-lock.json ]; then
      npm ci
    else
      npm install
    fi
  else
    echo "==> Dependencies already installed (node_modules newer than package.json)."
  fi
else
  echo "==> No package.json yet (greenfield — SS-01 will create it). Skipping install."
fi

# --- Build ---
# Build runs only if package.json exists with a build script.
if [ -f package.json ] && grep -q '"build"' package.json; then
  echo "==> Running build..."
  npm run build
else
  echo "==> No build step yet (greenfield). Skipping."
fi

# --- Verify ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$SCRIPT_DIR/checks/build.sh" || { echo "FAIL: build check failed after init"; exit 1; }

echo "==> Harness init complete."
