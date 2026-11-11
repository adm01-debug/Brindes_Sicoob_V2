#!/usr/bin/env bash
set -euo pipefail

container="sicoob-governanca-$$"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cleanup() { docker rm -f "$container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Mesma regra do postgres_ready.py: no CI a prova é obrigatória (sem Docker = falha);
# fora dele, pula com aviso. QA_ALLOW_SKIP=1 libera o pulo; QA_REQUIRE_DOCKER=1 o proíbe.
is_true() { case "${1:-}" in 1|true|TRUE|yes|YES) return 0 ;; *) return 1 ;; esac; }
docker_mandatory() {
  is_true "${QA_ALLOW_SKIP:-}" && return 1
  is_true "${QA_REQUIRE_DOCKER:-}" || is_true "${CI:-}" || is_true "${GITHUB_ACTIONS:-}"
}
if ! timeout 30 docker info >/dev/null 2>&1; then
  if docker_mandatory; then
    echo "❌ Docker não disponível — a simulação é obrigatória neste ambiente e NÃO foi executada (QA_ALLOW_SKIP=1 para pular de propósito)." >&2
    exit 1
  fi
  echo "⚠️  Docker não disponível — script ignorado (ambiente local sem Docker; nada foi verificado)." >&2
  exit 0
fi

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
