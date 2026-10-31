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
LIST_B = "bbbbbbbb-0000-4000-8000-000000000002"


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
    anon_list_select = as_role("anon", "", "SELECT count(*) FROM public.favorite_lists", check=False)
    anon_items_select = as_role("anon", "", "SELECT count(*) FROM public.favorite_items", check=False)
    anon_insert = as_role(
        "anon", "",
        "INSERT INTO public.favorite_item_reactions (id,item_id,list_id,anon_id,emoji) "
        f"VALUES ('eeeeeeee-1000-4000-8000-000000000005','eeeeeeee-2000-4000-8000-000000000005','{LIST_A}','visitor-x-001','💡')",
        check=False,
    )
    anon_update = as_role(
        "anon", "",
        "UPDATE public.favorite_item_reactions SET emoji='💡' "
        "WHERE id='aaaaaaaa-1000-4000-8000-000000000001'",
        check=False,
    )
    anon_delete = as_role(
        "anon", "",
        "DELETE FROM public.favorite_item_reactions "
        "WHERE id='aaaaaaaa-1000-4000-8000-000000000001'",
        check=False,
    )
    authenticated_insert = as_role(
        "authenticated", OTHER_USER,
        "INSERT INTO public.favorite_item_reactions (id,item_id,list_id,anon_id,emoji) "
        f"VALUES ('eeeeeeee-1000-4000-8000-000000000005','eeeeeeee-2000-4000-8000-000000000005','{LIST_A}','visitor-x-001','💡')",
        check=False,
    )
    evidence["anon_sem_select_direto"] = anon_select.returncode != 0
    evidence["anon_sem_select_direto_de_listas"] = anon_list_select.returncode != 0
    evidence["anon_sem_select_direto_de_itens"] = anon_items_select.returncode != 0
    evidence["anon_sem_insert_direto"] = anon_insert.returncode != 0
    evidence["anon_sem_update_ou_delete_direto"] = anon_update.returncode != 0 and anon_delete.returncode != 0
    evidence["authenticated_sem_insert_direto"] = authenticated_insert.returncode != 0
    evidence["nao_proprietario_nao_le_reacoes_diretas"] = (
        scalar(as_role("authenticated", OTHER_USER, "SELECT count(*) FROM public.favorite_item_reactions")) == "0"
    )
    evidence["nao_proprietario_nao_le_listas_ou_itens"] = (
        scalar(as_role("authenticated", OTHER_USER, "SELECT count(*) FROM public.favorite_lists")) == "0"
        and scalar(as_role("authenticated", OTHER_USER, "SELECT count(*) FROM public.favorite_items")) == "0"
    )
    evidence["proprietario_le_lista_e_itens_proprios"] = (
        scalar(as_role("authenticated", OWNER_A, "SELECT count(*) FROM public.favorite_lists")) == "1"
        and scalar(as_role("authenticated", OWNER_A, "SELECT count(*) FROM public.favorite_items")) == "1"
    )
    evidence["admin_le_todas_as_listas_e_itens"] = (
        scalar(as_role("authenticated", ADMIN, "SELECT count(*) FROM public.favorite_lists")) == "2"
        and scalar(as_role("authenticated", ADMIN, "SELECT count(*) FROM public.favorite_items")) == "2"
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
    public_rpc_rows = {line for line in public_rpc.splitlines() if "|" in line}
    evidence["rpc_publico_filtra_por_token_e_mascara_outros_visitantes"] = (
        public_rpc_rows == {
            "aaaaaaaa-2000-4000-8000-000000000001|👍|visitor-a-001",
            "aaaaaaaa-2000-4000-8000-000000000001|🔥|",
        }
    )
    public_lists_rpc = as_role(
        "anon", "",
        "SELECT list_id::text || '|' || COALESCE(item_id::text, '') "
        "FROM public.get_public_favorite_list(" + "'" + "a" * 64 + "')",
    ).stdout
    evidence["rpc_de_lista_publica_libera_apenas_lista_do_token"] = (
        "aaaaaaaa-0000-4000-8000-000000000001|aaaaaaaa-3000-4000-8000-000000000001" in public_lists_rpc
        and "bbbbbbbb-0000-4000-8000-000000000002" not in public_lists_rpc
    )
    evidence["rpc_rejeita_token_invalido"] = (
        scalar(as_role(
            "anon", "",
            "SELECT count(*) FROM public.get_public_favorite_reactions('token-invalido', 'visitor-a-001')",
        )) == "0"
    )
    list_b_rpc = as_role(
        "anon", "",
        "SELECT item_id::text || '|' || emoji || '|' || anon_id "
        "FROM public.get_public_favorite_reactions(" + "'" + "b" * 64 + "', 'visitor-b-001')",
    ).stdout
    evidence["rpc_token_b_retorna_somente_reacoes_da_lista_b"] = (
        {line for line in list_b_rpc.splitlines() if "|" in line}
        == {"bbbbbbbb-2000-4000-8000-000000000002|❤️|visitor-b-001"}
    )
    sql(
        "UPDATE public.favorite_lists SET shared_expires_at = now() - interval '1 hour' "
        f"WHERE id = '{LIST_A}'"
    )
    evidence["rpc_bloqueia_lista_expirada"] = (
        scalar(as_role(
            "anon", "",
            "SELECT count(*) FROM public.get_public_favorite_reactions(" + "'" + "a" * 64 + "', 'visitor-a-001')",
        )) == "0"
    )
    service_write = as_role(
        "service_role", "",
        "INSERT INTO public.favorite_item_reactions (id,item_id,list_id,anon_id,emoji) "
        f"VALUES ('eeeeeeee-1000-4000-8000-000000000005','eeeeeeee-2000-4000-8000-000000000005','{LIST_B}','edge-user-001','💡')",
    )
    evidence["service_role_preserva_escrita_da_edge_function"] = service_write.returncode == 0
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
