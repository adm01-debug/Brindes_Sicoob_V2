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


def as_actor(actor, statement, *, check=True, aal="aal2"):
    # `aal` reproduz a claim de segundo fator do token (aal1 = senha apenas,
    # aal2 = segundo fator concluido). Admin da tela de Centrais entra em aal2.
    return sql(
        "BEGIN; SET LOCAL ROLE authenticated; "
        f"SELECT set_config('request.jwt.claim.sub','{actor}',true); "
        f"SELECT set_config('request.jwt.claim.aal','{aal}',true); "
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

    def privilegios():
        return {
            priv: scalar(sql(
                "SELECT has_table_privilege('authenticated','public.sicoob_centrais','"
                + priv + "')"
            ))
            for priv in ("SELECT", "INSERT", "UPDATE", "DELETE")
        }

    result["privilegios_iniciais"] = privilegios()

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
        "editar": False,
    }
    as_actor(
        ADMIN,
        f"UPDATE public.sicoob_centrais SET name='Central Brasilia Editada' WHERE id='{central_id}'",
    )
    result["admin"]["editar"] = scalar(as_actor(
        ADMIN,
        f"SELECT name FROM public.sicoob_centrais WHERE id='{central_id}'",
    )) == "Central Brasilia Editada"

    # Admin logado sem concluir o segundo fator (AAL1) nao grava pela API: a tela
    # ja exige MFA e a policy precisa exigir o mesmo.
    sem_mfa = {
        "criar": as_actor(
            ADMIN,
            "INSERT INTO public.sicoob_centrais (name) VALUES ('Central Sem MFA')",
            check=False, aal="aal1",
        ),
        "editar": as_actor(
            ADMIN,
            "WITH mov AS (UPDATE public.sicoob_centrais SET name='invadida por aal1' "
            f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
            check=False, aal="aal1",
        ),
        "excluir": as_actor(
            ADMIN,
            "WITH mov AS (DELETE FROM public.sicoob_centrais "
            f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
            check=False, aal="aal1",
        ),
    }
    result["admin_sem_mfa"] = {
        "criar_bloqueado": sem_mfa["criar"].returncode != 0,
        "editar_sem_efeito": sem_mfa["editar"].returncode != 0
        or scalar(sem_mfa["editar"]) == "0",
        "excluir_sem_efeito": sem_mfa["excluir"].returncode != 0
        or scalar(sem_mfa["excluir"]) == "0",
        "mensagem": (sem_mfa["criar"].stderr.strip().splitlines() or [""])[-1],
        "nome_preservado": scalar(as_actor(
            ADMIN,
            f"SELECT name FROM public.sicoob_centrais WHERE id='{central_id}'",
        )) == "Central Brasilia Editada",
    }
    assert all(
        v for k, v in result["admin_sem_mfa"].items() if k != "mensagem"
    ), result["admin_sem_mfa"]

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

    # O banco referencia sicoob_centrais em cooperativas.central_id e
    # pa_singularidades.central_id sem ON DELETE: com vínculo ativo a exclusão é
    # recusada (23503) e a Central precisa continuar intacta — é o caso que a tela
    # agora explica em vez de mostrar "Erro ao excluir Central".
    sql(f"""
      INSERT INTO public.cooperativas (name, central_id)
      VALUES ('Singular Vinculada', '{central_id}');
    """)
    com_vinculo = as_actor(
        ADMIN,
        "WITH mov AS (DELETE FROM public.sicoob_centrais "
        f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
        check=False,
    )
    motivo_vinculo = com_vinculo.stderr.strip()
    result["vinculo_singular"] = {
        "exclusao_recusada": com_vinculo.returncode != 0 and "foreign key constraint" in motivo_vinculo,
        "mensagem_do_banco": motivo_vinculo.splitlines()[-1] if motivo_vinculo else "",
        "central_preservada": scalar(as_actor(
            ADMIN,
            f"SELECT count(*) FROM public.sicoob_centrais WHERE id='{central_id}'",
        )) == "1",
    }
    assert all(
        v for k, v in result["vinculo_singular"].items() if k != "mensagem_do_banco"
    ), result["vinculo_singular"]

    sql(f"UPDATE public.cooperativas SET central_id = NULL WHERE central_id = '{central_id}'")
    result["admin"]["excluir"] = scalar(as_actor(
        ADMIN,
        "WITH mov AS (DELETE FROM public.sicoob_centrais "
        f"WHERE id='{central_id}' RETURNING 1) SELECT count(*) FROM mov",
    )) == "1"
    assert all(result["admin"].values()), result["admin"]

    # Reversão: derrubar políticas e grants devolve o banco ao estado anterior à
    # correção (é o ROLLBACK documentado na PR). Sem isso, o script provaria a
    # correção sem provar que ela é desfazível.
    rollback = """
DROP POLICY IF EXISTS sicoob_centrais_admin_insert ON public.sicoob_centrais;
DROP POLICY IF EXISTS sicoob_centrais_admin_update ON public.sicoob_centrais;
DROP POLICY IF EXISTS sicoob_centrais_admin_delete ON public.sicoob_centrais;
REVOKE INSERT, UPDATE, DELETE ON public.sicoob_centrais FROM authenticated;
""".strip()
    sql(rollback)
    desfeito = as_actor(
        ADMIN,
        "INSERT INTO public.sicoob_centrais (name) VALUES ('Central Apos Rollback')",
        check=False,
    )
    motivo_desfeito = desfeito.stderr.strip().splitlines()[-1] if desfeito.stderr.strip() else ""
    result["privilegios_apos_rollback"] = privilegios()
    result["reversao"] = {
        "sql": rollback,
        "privilegios_restaurados": (
            result["privilegios_apos_rollback"] == result["privilegios_iniciais"]
        ),
        "escrita_bloqueada_de_novo": desfeito.returncode != 0 and any(
            marca in motivo_desfeito.lower()
            for marca in ("permission denied", "row-level security")
        ),
        "mensagem": motivo_desfeito,
    }
    assert result["reversao"]["privilegios_restaurados"], result["reversao"]
    assert all(
        v for k, v in result["reversao"].items()
        if k not in ("sql", "mensagem", "privilegios_restaurados")
    ), result["reversao"]

    result["resultado"] = "aprovado"
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)

EVIDENCE.parent.mkdir(parents=True, exist_ok=True)
EVIDENCE.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(result, indent=2, ensure_ascii=False))
