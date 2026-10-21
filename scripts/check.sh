#!/usr/bin/env bash
# One command that does what CI would: types, builds and unit tests. Run it before pushing (or install the hook: scripts/install-hooks.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
step() { printf '\n== %s ==\n' "$1"; }

step "Shared library types";  npx tsc --build
step "API types";             (cd artifacts/api-server && npx tsc -p tsconfig.json --noEmit)
step "API build";             (cd artifacts/api-server && node ./build.mjs >/dev/null)
step "API unit tests";        (cd artifacts/api-server && node --test scripts/*.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)" )
step "Mobile types";          (cd artifacts/panel-trenera-mobile && npx tsc --noEmit -p tsconfig.json)
step "Mobile unit tests";     (cd artifacts/panel-trenera-mobile && node --test tests/*.test.mjs 2>&1 | grep -E "^ℹ (tests|pass|fail)")
step "Web build";             (cd artifacts/panel-trenera && PORT=5173 BASE_PATH=/ npx vite build --config vite.config.ts >/dev/null)
printf '\nAll checks passed.\n'
