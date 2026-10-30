#!/usr/bin/env bash
set -euo pipefail

container="sicoob-governanca-$$"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker run -d --rm --name "$container" \
  --network none -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null

PYTHONPATH="$repo_root/scripts/qa" python3 - "$container" <<'PY'
import subprocess
import sys
from postgres_ready import wait_for_postgres

def command(args, check=True):
    return subprocess.run(args, check=check, capture_output=True, text=True)

wait_for_postgres(command, sys.argv[1])
PY
docker exec "$container" mkdir -p /workspace/scripts/qa /workspace/supabase
docker cp "$repo_root/scripts/qa/simular-governanca-orcamento.sql" \
  "$container:/workspace/scripts/qa/simular-governanca-orcamento.sql"
docker cp "$repo_root/supabase/migrations" "$container:/workspace/supabase/migrations"
docker exec -i "$container" psql -U postgres -v ON_ERROR_STOP=1 \
  -f /workspace/scripts/qa/simular-governanca-orcamento.sql
