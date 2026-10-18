#!/usr/bin/env bash
# mongodump of the LAVIECO databases into a dated, gzipped archive (docs/runbooks/deploy-vps.md §8).
# Atlas only (production has no self-hosted MongoDB); the connection string comes from
# /opt/lavieco/env/backup.env (a read-only `backup` user) and is never on the command line.
#
#   mongo-backup.sh            (cron: 0 19 * * * = 02:00 Asia/Ho_Chi_Minh)
#
# The archive contains personal data (buyers, members): keep the directory private and copy
# it off the server (the server alone is a single point of failure, docs/02 §12.2).
set -euo pipefail

ROOT=${LAVIECO_ROOT:-/opt/lavieco}
DEST=${BACKUP_DIR:-$ROOT/backups}
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$DEST/lavieco-$STAMP.archive.gz"

umask 077
mkdir -p "$DEST"
trap 'rm -f "$FILE.partial"' EXIT

# Default bridge network (Atlas is reached over the Internet), capped like the stack.
docker run --rm --memory 256m --env-file "$ROOT/env/backup.env" mongo:8.0 \
  sh -c 'exec mongodump --quiet --uri="$BACKUP_MONGODB_URI" --archive --gzip' > "$FILE.partial"
mv "$FILE.partial" "$FILE"

find "$DEST" -name 'lavieco-*.archive.gz' -mtime +"$RETENTION_DAYS" -delete
echo "backup: $FILE ($(du -h "$FILE" | cut -f1))"
