#!/usr/bin/env bash
set -euo pipefail

[[ -f .env.production ]] || { echo ".env.production is required" >&2; exit 2; }
: "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in the shell or deployment environment}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.production.yml}"

docker compose -f "$COMPOSE_FILE" build
docker compose -f "$COMPOSE_FILE" up -d postgres

echo "Applying Prisma schema for the controlled pilot deployment."
echo "This repository predates committed Prisma migrations; production bootstrap uses db push only for the initial controlled database."
docker compose -f "$COMPOSE_FILE" run --rm web npm run db:push

docker compose -f "$COMPOSE_FILE" up -d web worker caddy

echo "Waiting for readiness..."
for _ in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T web node -e "fetch('http://localhost:3000/api/v1/health/ready').then(async r=>{console.log(await r.text());process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"; then
    echo "HandMeKey is ready."
    exit 0
  fi
  sleep 3
done

echo "HandMeKey did not become ready in time." >&2
docker compose -f "$COMPOSE_FILE" ps
exit 1
