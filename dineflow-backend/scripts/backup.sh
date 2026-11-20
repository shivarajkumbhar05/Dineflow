#!/usr/bin/env bash
# Manual logical backup (works on every Atlas tier, including free M0).
# Requires MongoDB Database Tools (mongodump). Usage: MONGODB_URI="..." ./scripts/backup.sh
set -euo pipefail
: "${MONGODB_URI:?Set MONGODB_URI}"
OUT="backups/dineflow-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"
mongodump --uri="$MONGODB_URI" --db=dineflow --gzip --out="$OUT"
echo "Backup saved to $OUT"
# Restore:  mongorestore --uri="$MONGODB_URI" --gzip --nsInclude='dineflow.*' <backup-folder>
