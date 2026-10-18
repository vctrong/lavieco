#!/usr/bin/env bash
# Goes back to an earlier image tag without running migrations (docs/runbooks/deploy-oracle.md §8).
#
#   rollback.sh            the last successful tag before the one recorded as current
#   rollback.sh <tag>      a given tag (see deployments.log)
set -euo pipefail

ROOT=${LAVIECO_ROOT:-/opt/lavieco}
LOG="$ROOT/deployments.log"

if [[ $# -ge 1 ]]; then
  TARGET=$1
else
  CURRENT=$(sed -n 's/^IMAGE_TAG=//p' "$ROOT/compose.env")
  # Most recent logged tag that is not the current one.
  TARGET=$(awk '{ print $2 }' "$LOG" 2> /dev/null | grep -vxF "$CURRENT" | tail -n 1 || true)
fi

if [[ -z "${TARGET:-}" ]]; then
  echo "rollback: no earlier tag in $LOG; pass one explicitly" >&2
  exit 1
fi

echo "rollback: going back to $TARGET"
exec "$(dirname "$0")/deploy.sh" "$TARGET" --skip-migrate
