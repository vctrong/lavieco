#!/usr/bin/env bash
# mongodump of the LAVIECO databases into a dated, gzipped archive (docs/runbooks/deploy-oracle.md §9).
# Works for Atlas and for the optional "mongo" profile; the connection string comes from
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

# On the stack's backend network so the "mongo" profile is reachable by name.
docker run --rm --network lavieco_backend --env-file "$ROOT/env/backup.env" mongo:8.0 \
  sh -c 'exec mongodump --quiet --uri="$BACKUP_MONGODB_URI" --archive --gzip' > "$FILE.partial"
mv "$FILE.partial" "$FILE"

find "$DEST" -name 'lavieco-*.archive.gz' -mtime +"$RETENTION_DAYS" -delete
echo "backup: $FILE ($(du -h "$FILE" | cut -f1))"
