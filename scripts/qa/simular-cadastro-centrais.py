#!/usr/bin/env python3
"""Prova, em PostgreSQL descartável, que o cadastro de Centrais Sicoob funciona
para admin e continua bloqueado para os demais papéis."""

from pathlib import Path
import json
import subprocess
import uuid

from postgres_ready import wait_for_postgres


ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-centrais-" + uuid.uuid4().hex[:10]
FIXTURE = ROOT / "tests/scenarios/sql/sicoob-centrais-cadastro-fixture.sql"
MIGRATION = ROOT / "supabase/migrations/20261126140000_grant_admin_write_sicoob_centrais.sql"
EVIDENCE = ROOT / "docs/execucao/evidencias/cadastro-centrais.json"

ADMIN = "cccccccc-4000-4000-8000-0000000000a1"
GESTOR = "cccccccc-4000-4000-8000-0000000000a2"
COMPRADOR = "cccccccc-4000-4000-8000-0000000000a3"


def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)


def sql(statement, *, check=True):
    response = command(
        [
            "docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres",
            "-v", "ON_ERROR_STOP=1", "-Atq",
        ],
        stdin=statement,
        check=False,
    )
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip())
    return response


def as_actor(actor, statement, *, check=True):
    return sql(
        "BEGIN; SET LOCAL ROLE authenticated; "
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


result = {
    "ambiente": "PostgreSQL 17 descartável, sem rede e com dados sintéticos",
    "migracao": str(MIGRATION.relative_to(ROOT)),
    "banco_canonico_alterado": False,
}

try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "--network", "none", "-e", "POSTGRES_HOST_AUTH_METHOD=trust",
        "postgres:17-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(FIXTURE.read_text())
    sql(f"""
      INSERT INTO public.user_roles (user_id, role) VALUES
        ('{ADMIN}', 'admin'),
        ('{GESTOR}', 'gestor_compras'),
        ('{COMPRADOR}', 'comprador_pac');
    """)

    # Antes da correção a tabela só tinha política de leitura: o próprio admin
    # não consegue cadastrar Central — é a regressão que motivou a migration.
    repro = as_actor(
        ADMIN,
        "INSERT INTO public.sicoob_centrais (name, code) VALUES ('Central Reproducao','999')",
        check=False,
    )
    motivo = repro.stderr.strip().splitlines()[-1] if repro.stderr.strip() else ""
    result["regressao_reproduzida"] = repro.returncode != 0 and any(
        marca in motivo.lower() for marca in ("permission denied", "row-level security")
    )
    result["mensagem_antes_da_correcao"] = motivo
    assert result["regressao_reproduzida"], repro.stderr

    sql(MIGRATION.read_text())
    # Reaplicar comprova idempotência.
    sql(MIGRATION.read_text())

    central_id = scalar(as_actor(
        ADMIN,
        "INSERT INTO public.sicoob_centrais (name, code, region) "
        "VALUES ('Central Brasilia','BSB','Centro-Oeste') RETURNING id",
    ))
    assert central_id

    result["admin"] = {
        "criar": bool(central_id),
        "editar": scalar(as_actor(
            ADMIN,
            f"UPDATE public.sicoob_centrais SET name='Central Brasilia Editada' "
            f"WHERE id='{central_id}' RETURNING name",
        )) == "Central Brasilia Editada",
    }

    # Papéis não-admin não criam, não editam e não excluem.
    bloqueios = {}
    for ator, nome in ((GESTOR, "gestor_compras"), (COMPRADOR, "comprador_pac")):
        criar = as_actor(
            ator,
            f"INSERT INTO public.sicoob_centrais (name) VALUES ('Central {nome}')",
            check=False,
        )
        editar = as_actor(
            ator,
            "WITH mov AS (UPDATE public.sicoob_centrais SET name='invadida' "
            f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
            check=False,
        )
        excluir = as_actor(
            ator,
            "WITH mov AS (DELETE FROM public.sicoob_centrais "
            f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
            check=False,
        )
        bloqueios[nome] = {
            "criar_bloqueado": criar.returncode != 0,
            "editar_sem_efeito": editar.returncode != 0 or scalar(editar) == "0",
            "excluir_sem_efeito": excluir.returncode != 0 or scalar(excluir) == "0",
        }
    result["bloqueios"] = bloqueios
    assert all(all(v.values()) for v in bloqueios.values()), bloqueios

    # A Central continua intacta e legível para qualquer autenticado.
    result["leitura_autenticada"] = scalar(as_actor(
        COMPRADOR,
        f"SELECT count(*) FROM public.sicoob_centrais WHERE id='{central_id}'",
    )) == "1"
    assert result["leitura_autenticada"]

    result["admin"]["excluir"] = scalar(as_actor(
        ADMIN,
        "WITH mov AS (DELETE FROM public.sicoob_centrais "
        f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
    )) == "1"
    assert result["admin"]["excluir"]

    result["resultado"] = "aprovado"
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)

EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
EVIDENCE.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(result, indent=2, ensure_ascii=False))
