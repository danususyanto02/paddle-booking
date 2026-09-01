#!/bin/sh
set -e
echo "Waiting for database..."
until npx prisma db execute --schema=prisma/schema.prisma --stdin <<< "SELECT 1" 2>/dev/null; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done
echo "Running migrations..."
npx prisma migrate deploy
echo "Seeding (idempotent)..."
npx prisma db seed || node prisma/seed.js || true
exec node server.js
