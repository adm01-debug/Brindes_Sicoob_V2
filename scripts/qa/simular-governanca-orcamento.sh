#!/usr/bin/env bash
set -euo pipefail

container="sicoob-governanca-$$"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$container" \
  -v "$(pwd):/workspace:ro" \
  -e POSTGRES_PASSWORD=postgres postgres:17-alpine >/dev/null

until docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 \
  -f /workspace/scripts/qa/simular-governanca-orcamento.sql
