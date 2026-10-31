"""Valida acesso direto e via token às reações de listas públicas em PostgreSQL isolado."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-fav-rls-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/favorite-reactions-rls-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20261031042808_secure_public_favorite_reactions_access.sql"
EVIDENCE = ROOT / "docs/execucao/evidencias/favoritos-reacoes-rls.json"

OWNER_A = "aaaaaaaa-0000-4000-8000-000000000001"
OWNER_B = "bbbbbbbb-0000-4000-8000-000000000002"
ADMIN = "cccccccc-0000-4000-8000-000000000003"
OTHER_USER = "dddddddd-0000-4000-8000-000000000004"
LIST_A = "aaaaaaaa-0000-4000-8000-000000000001"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq"],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def as_role(role, actor, statement, *, check=True):
    return sql(
        "BEGIN; "
        f"SET LOCAL ROLE {role}; "
        f"SELECT set_config('request.jwt.claim.sub','{actor}',true); "
        f"{statement}; COMMIT;",
        check=check,
    )


def scalar(response):
    ignored = {"BEGIN", "SET", "COMMIT", "ROLLBACK"}
    values = [line for line in response.stdout.splitlines() if line not in ignored]
    if not values:
        raise RuntimeError("A consulta não retornou valor")
    return values[-1]


evidence = {
    "ambiente": "PostgreSQL 17 descartável, rede desativada e dados sintéticos",
    "migration": str(MIGRATION.relative_to(ROOT)),
    "banco_canonico_alterado": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(MIGRATION.read_text())

    anon_select = as_role("anon", "", "SELECT count(*) FROM public.favorite_item_reactions", check=False)
    anon_insert = as_role(
        "anon", "",
        "INSERT INTO public.favorite_item_reactions (id,item_id,list_id,anon_id,emoji) "
        f"VALUES ('eeeeeeee-1000-4000-8000-000000000005','eeeeeeee-2000-4000-8000-000000000005','{LIST_A}','visitor-x-001','💡')",
        check=False,
    )
    authenticated_insert = as_role(
        "authenticated", OTHER_USER,
        "INSERT INTO public.favorite_item_reactions (id,item_id,list_id,anon_id,emoji) "
        f"VALUES ('eeeeeeee-1000-4000-8000-000000000005','eeeeeeee-2000-4000-8000-000000000005','{LIST_A}','visitor-x-001','💡')",
        check=False,
    )
    evidence["anon_sem_select_direto"] = anon_select.returncode != 0
    evidence["anon_sem_insert_direto"] = anon_insert.returncode != 0
    evidence["authenticated_sem_insert_direto"] = authenticated_insert.returncode != 0
    evidence["nao_proprietario_nao_le_reacoes_diretas"] = (
        scalar(as_role("authenticated", OTHER_USER, "SELECT count(*) FROM public.favorite_item_reactions")) == "0"
    )
    evidence["proprietario_le_reacoes_da_propria_lista"] = (
        scalar(as_role("authenticated", OWNER_A, "SELECT count(*) FROM public.favorite_item_reactions")) == "2"
    )
    evidence["admin_le_reacoes"] = (
        scalar(as_role("authenticated", ADMIN, "SELECT count(*) FROM public.favorite_item_reactions")) == "3"
    )

    public_rpc = as_role(
        "anon", "",
        "SELECT item_id::text || '|' || emoji || '|' || anon_id "
        "FROM public.get_public_favorite_reactions(" + "'" + "a" * 64 + "', 'visitor-a-001') ORDER BY emoji",
    ).stdout
    evidence["rpc_publico_filtra_por_token_e_mascara_outros_visitantes"] = (
        "aaaaaaaa-2000-4000-8000-000000000001|👍|visitor-a-001" in public_rpc
        and "aaaaaaaa-2000-4000-8000-000000000001|🔥|" in public_rpc
        and "hash-b" not in public_rpc
        and "browser-b" not in public_rpc
    )
    assert all(evidence[key] for key in evidence if key not in {"ambiente", "migration", "banco_canonico_alterado"}), evidence
    evidence["resultado"] = "aprovado"
except Exception:
    evidence["resultado"] = "falhou"
    EVIDENCE.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
    raise
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)

EVIDENCE.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(evidence, ensure_ascii=False))
