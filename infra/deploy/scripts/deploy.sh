#!/usr/bin/env bash
# Deploys one image tag on the production server (docs/runbooks/deploy-vps.md §6).
#
#   deploy.sh <image-tag> [--skip-migrate]
#
# Pulls the five images of that tag, runs the migrations (profile "migrate"), starts the
# stack and waits until every container is healthy. On success it records the tag in
# compose.env (IMAGE_TAG) and appends it to deployments.log, which rollback.sh reads.
# Use --skip-migrate only to go back to an older tag: migrations are expand-only and
# compatible with the previous release (docs/03 §10.1), they are never undone.
set -euo pipefail

ROOT=${LAVIECO_ROOT:-/opt/lavieco}
TAG=${1:?usage: deploy.sh <image-tag> [--skip-migrate]}
MODE=${2:-}

if [[ ! "$TAG" =~ ^[A-Za-z0-9._-]{1,128}$ ]]; then
  echo "deploy: invalid image tag" >&2
  exit 1
fi

compose() {
  docker compose --env-file "$ROOT/compose.env" -f "$ROOT/infra/compose/compose.prod.yml" "$@"
}

# The shell value wins over compose.env, so the stack runs the requested tag.
export IMAGE_TAG="$TAG"

echo "deploy: pulling images $TAG"
compose --profile migrate pull --quiet

if [[ "$MODE" != "--skip-migrate" ]]; then
  for job in identity-migrate content-migrate program-migrate; do
    echo "deploy: $job"
    compose --profile migrate run --rm --no-deps "$job"
  done
fi

echo "deploy: starting the stack"
if ! compose up -d --remove-orphans --wait --wait-timeout 300; then
  echo "deploy: the stack did not become healthy with $TAG." >&2
  echo "deploy: inspect with 'compose ps' / 'compose logs', or run rollback.sh." >&2
  exit 1
fi

sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/" "$ROOT/compose.env"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $TAG" >> "$ROOT/deployments.log"
# Only dangling layers: the tagged images of earlier releases stay for a fast rollback.
docker image prune -f > /dev/null
echo "deploy: $TAG is live"
