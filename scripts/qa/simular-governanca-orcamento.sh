#!/usr/bin/env bash
set -euo pipefail

container="sicoob-governanca-$$"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$container" \
  -e POSTGRES_PASSWORD=postgres postgres:17-alpine >/dev/null

until docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; do sleep 1; done
docker exec "$container" mkdir -p /workspace/scripts/qa /workspace/supabase
docker cp "$repo_root/scripts/qa/simular-governanca-orcamento.sql" \
  "$container:/workspace/scripts/qa/simular-governanca-orcamento.sql"
docker cp "$repo_root/supabase/migrations" "$container:/workspace/supabase/migrations"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 \
  -f /workspace/scripts/qa/simular-governanca-orcamento.sql
