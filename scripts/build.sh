#!/usr/bin/env bash
# Build everything for AgyssyyGPT: JS bundle, optional native agyssyy.exe, npm package.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "==> Installing dependencies"
npm install

echo "==> Typecheck"
npm run -w app typecheck

echo "==> Tests"
npm run -w app test

echo "==> Building CLI bundle"
npm run -w app build

echo "==> Building agyssyy.exe (best effort)"
if node scripts/build-exe.mjs; then
  echo "==> Packing npm package"
  node scripts/package-npm.mjs --pack
else
  echo "!! Native binary build skipped; npm package not assembled."
fi
