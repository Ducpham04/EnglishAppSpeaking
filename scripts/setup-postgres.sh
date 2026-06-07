#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting Postgres via docker-compose..."
docker compose up -d db

echo "Waiting for Postgres to be ready..."
# get container id
DB_CONTAINER="$(docker compose ps -q db)"
if [ -z "$DB_CONTAINER" ]; then
  echo "Could not find db container, aborting."
  exit 1
fi

until docker exec "$DB_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; do
  printf "."
  sleep 1
done

echo "\nPostgres is ready."

POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5432}"
export DATABASE_URL="postgresql://postgres:postgres@localhost:${POSTGRES_HOST_PORT}/gb_speaking_ai"

echo "Running prisma generate..."
npx prisma generate

echo "Applying migrations (prisma migrate deploy)..."
npx prisma migrate deploy || true

# If migrate deploy failed due to provider switch, back up old migrations and create new migration
if grep -q "provider = \"sqlite\"" prisma/migrations/migration_lock.toml 2>/dev/null; then
  echo "Detected old SQLite migration history — backing up and recreating migrations."
  ts=$(date +%s)
  mv prisma/migrations prisma/migrations.backup.$ts || true
  rm -f prisma/migrations/migration_lock.toml || true

  echo "Creating new migration from current schema..."
  npx prisma migrate dev --name init --create-only

  echo "Deploying new migration..."
  npx prisma migrate deploy
fi

echo "Seeding database..."
npm run prisma:seed || true

echo "✅ Postgres setup complete. DATABASE_URL=$DATABASE_URL"
