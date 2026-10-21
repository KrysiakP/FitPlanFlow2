#!/usr/bin/env bash
# Runs scripts/check.sh before every `git push`.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .githooks
printf '#!/usr/bin/env bash\nexec "$(git rev-parse --show-toplevel)/scripts/check.sh"\n' > .githooks/pre-push
chmod +x .githooks/pre-push scripts/check.sh
git config core.hooksPath .githooks
echo "pre-push hook installed (skip once with: git push --no-verify)"
