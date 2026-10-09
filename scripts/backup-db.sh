#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${STAFFSTACK_DB_URL:?Set a database connection URL through your secret manager}"
backup_dir="${STAFFSTACK_BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
backup_stamp="$(date -u +%Y%m%dT%H%M%SZ)"
supabase db dump --db-url "$STAFFSTACK_DB_URL" --role-only --file "$backup_dir/$backup_stamp-roles.sql"
supabase db dump --db-url "$STAFFSTACK_DB_URL" --file "$backup_dir/$backup_stamp-schema.sql"
supabase db dump --db-url "$STAFFSTACK_DB_URL" --data-only --use-copy --file "$backup_dir/$backup_stamp-data.sql"
shasum -a 256 "$backup_dir/$backup_stamp-roles.sql" "$backup_dir/$backup_stamp-schema.sql" "$backup_dir/$backup_stamp-data.sql" > "$backup_dir/$backup_stamp.sha256"
printf 'Database exports completed. Encrypt and move them to private off-site storage. Storage files require a separate backup.\n'
