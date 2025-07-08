#!/bin/bash

# Exit on error
set -e

SUPABASE_PROJECT_REF="${SUPABASE_PROJECT_REF:-khigxtpamihkpflxfvcr}"

# Check required variables
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  echo "SUPABASE_ACCESS_TOKEN must be set"
  exit 1
fi


# Step 1: Create migration diff
MIGRATIONS_DIR="$(dirname "$0")/migrations"
MIGRATION_FILE="$MIGRATIONS_DIR/$(date +%Y%m%d%H%M%S)_auto.sql"

mkdir -p "$MIGRATIONS_DIR"
echo "Creating migration diff..."
supabase db diff --project-ref "$SUPABASE_PROJECT_REF" --access-token "$SUPABASE_ACCESS_TOKEN" --schema public --file "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo "Migration diff created: $MIGRATION_FILE"
else
  echo "Migration diff failed."
  exit 1
fi

# Step 2: Push migration to DEV
echo "Pushing migration to DEV..."
supabase db push --project-ref "$SUPABASE_PROJECT_REF" --access-token "$SUPABASE_ACCESS_TOKEN"

if [ $? -eq 0 ]; then
  echo "Migration pushed to DEV project ($SUPABASE_PROJECT_REF) successfully."
else
  echo "Migration failed."
  exit 1
fi
