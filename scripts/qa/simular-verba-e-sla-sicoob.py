#!/usr/bin/env python3
"""Prova, em Postgres real, os dois caminhos de tela que os testes de servico
nao alcancam:

1. `salvar_verba_pa` (criar e editar) com a ACL da role `authenticated` — e o
   caminho da tela /pa/verba. A RPC e SECURITY INVOKER e a ACL de `pa_budgets`
   e por coluna; escrever `verba_planejada` no corpo da RPC quebrava a gravacao
   inteira com "permission denied", inclusive a criacao da primeira verba.
2. O ciclo de SLA do pedido: encerramento ao sair de `waiting_approval`
   (`sla_closed_*`), desfecho por tipo de saida e a normalizacao do recálculo
   (`refresh_sicoob_order_sla_status`) vencendo o `check_order_sla`, que roda
   no BEFORE do mesmo UPDATE.

Roda em container descartavel; nao toca em producao.
"""
from __future__ import annotations

import subprocess
import subprocess as _sp
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "qa"))
from postgres_ready import wait_for_postgres  # noqa: E402

CEILING = ROOT / "supabase/migrations/20261126170000_cooperativa_budget_ceiling.sql"
SLA = ROOT / "supabase/migrations/20261126120000_sicoob_order_sla_lifecycle.sql"
SYNC = ROOT / "supabase/migrations/20261122120000_pa_budget_full_lifecycle.sql"

CONTAINER = f"qa-verba-sla-{uuid.uuid4().hex[:12]}"
PA1 = "aaaa0000-0000-0000-0000-000000000001"
PA2 = "aaaa0000-0000-0000-0000-000000000001"
COOP = "bbbb0000-0000-0000-0000-000000000001"
ADMIN = "99990000-0000-0000-0000-000000000001"
ORDER1 = "cccc0000-0000-0000-0000-000000000001"


def command(args, *, stdin=None, check=True):
    response = subprocess.run(args, input=stdin, text=True, capture_output=True, check=False)
    if check and response.returncode != 0:
        raise RuntimeError(response.stderr.strip() or response.stdout.strip())
    return response


def sql(statement, *, check=True):
    return command(
        ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
        stdin=statement,
        check=check,
    )


def secao(inicio, fim=None, *, arquivo=CEILING):
    linhas = arquivo.read_text(encoding="utf-8").splitlines()
    ini = next(i for i, linha in enumerate(linhas) if linha.startswith(inicio))
    if fim is None:
        return "\n".join(linhas[ini:])
    fim_idx = next(i for i, linha in enumerate(linhas) if linha.startswith(fim))
    return "\n".join(linhas[ini:fim_idx])


STUBS = f"""
  CREATE SCHEMA auth;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN;
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  CREATE TYPE public.app_role AS ENUM (
    'dev', 'admin', 'manager', 'supervisor', 'gerente_pa', 'gestor_compras',
    'comprador_pac', 'comprador_singular', 'vendedor'
  );
  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE FUNCTION public.is_admin(_user_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'dev')
  $$;
  CREATE FUNCTION public.is_gerente_pa() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(auth.uid(), 'gerente_pa')
  $$;
  CREATE FUNCTION public.is_gestor_compras() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(auth.uid(), 'gestor_compras')
  $$;
  CREATE TABLE public.qa_user_pa (user_id uuid, pa_id uuid);
  CREATE FUNCTION public.current_user_pa_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT pa_id FROM public.qa_user_pa WHERE user_id = auth.uid() LIMIT 1
  $$;
  CREATE TABLE public.qa_user_coop (user_id uuid, coop_id uuid);
  CREATE FUNCTION public.current_user_cooperativa_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coop_id FROM public.qa_user_coop WHERE user_id = auth.uid() LIMIT 1
  $$;

  CREATE TABLE public.cost_centers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text);
  CREATE TABLE public.cooperativas (id uuid PRIMARY KEY, nome text);
  CREATE TABLE public.postos_atendimento (
    id uuid PRIMARY KEY, nome text, cooperativa_id uuid REFERENCES public.cooperativas(id), is_active boolean DEFAULT true
  );
  CREATE TABLE public.pa_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id),
    ano int NOT NULL,
    mes int NOT NULL,
    verba_total numeric(14,2),
    verba_planejada numeric(14,2) DEFAULT 0,
    limite_alcada numeric(14,2),
    observacoes text,
    verba_reservada numeric(14,2) DEFAULT 0,
    verba_comprometida numeric(14,2) DEFAULT 0,
    verba_consumida numeric(14,2) DEFAULT 0,
    fechada_em timestamptz,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (pa_id, ano, mes)
  );
  CREATE TABLE public.cooperativa_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id),
    ano int NOT NULL,
    mes int NOT NULL,
    verba_total numeric(14,2),
    teto_verba_pa numeric(14,2),
    fechada_em timestamptz,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (cooperativa_id, ano, mes)
  );

  CREATE TABLE public.sicoob_orders (
    id uuid PRIMARY KEY,
    order_number text,
    status text NOT NULL DEFAULT 'waiting_approval',
    sla_deadline timestamptz,
    sla_status text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  CREATE TABLE public.qa_results (name text PRIMARY KEY, ok boolean, detalhe text);
  GRANT INSERT, SELECT ON public.qa_results TO authenticated;
"""

SEED = f"""
  INSERT INTO auth.users (id) VALUES ('{ADMIN}');
  INSERT INTO public.user_roles (user_id, role) VALUES ('{ADMIN}', 'admin');
  INSERT INTO public.cooperativas (id, nome) VALUES ('{COOP}', 'Cooperativa QA');
  INSERT INTO public.postos_atendimento (id, nome, cooperativa_id) VALUES ('{PA1}', 'PA 1', '{COOP}');
  INSERT INTO public.cooperativa_budgets (cooperativa_id, ano, mes, verba_total, teto_verba_pa)
  VALUES ('{COOP}', 2026, 12, 100000, 60000);
  -- Pedido aprovado com prazo vencido: o recálculo precisa encerrar o ciclo em
  -- vez de deixar 'critical' reaparecendo no painel para sempre.
  INSERT INTO public.sicoob_orders (id, order_number, status, sla_deadline, sla_status)
  VALUES ('{ORDER1}', 'QA-1', 'confirmed', now() - interval '3 days', 'critical');
"""


def como(corpo):
    return f"""
  SET ROLE authenticated;
  SET request.jwt.claim.sub = '{ADMIN}';
  {corpo}
  RESET ROLE;
"""


try:
    command(["docker", "run", "--rm", "-d", "--name", CONTAINER,
             "-e", "POSTGRES_PASSWORD=postgres", "-p", "127.0.0.1:54329:5432", "postgres:16-alpine"])
    wait_for_postgres(command, CONTAINER)
    sql(STUBS)
    # Secao 2 do ciclo de vida: espelho verba_total <-> verba_planejada.
    sql(secao("-- 2. Quatro estados", "-- 3. Livro", arquivo=SYNC))
    # Helpers de leitura agregada e serializacao usados pela RPC e pelo gatilho.
    sql(secao("-- Leitura agregada", "-- Verba do PA", arquivo=CEILING))
    sql(SEED)
    sql(secao("-- Verba do PA", "-- Teto da cooperativa x verba ja distribuida", arquivo=CEILING))
    # A migration revoga o EXECUTE da funcao do gatilho do teto de anon e
    # authenticated. Sem regravar a concessao, todo INSERT da role morre em
    # "permission denied for function" antes de chegar na regra do teto e os
    # testes passariam pelo motivo errado. Em producao o gatilho roda com os
    # privilegios do dono da funcao, nao da role que faz o INSERT.
    sql("GRANT EXECUTE ON FUNCTION public.tg_pa_budget_respects_cooperativa_ceiling() TO authenticated;")
    # ACL por coluna de `pa_budgets` como esta em producao (20261013115605):
    # sem ela o simulador nao provaria o caminho real da tela.
    sql("""
      GRANT SELECT ON TABLE public.pa_budgets TO authenticated;
      GRANT INSERT (pa_id, ano, mes, verba_total, limite_alcada, observacoes)
        ON public.pa_budgets TO authenticated;
      GRANT UPDATE (verba_total, limite_alcada, observacoes)
        ON public.pa_budgets TO authenticated;
    """)

    # `salvar_verba_pa` + ACL por coluna.
    trecho = CEILING.read_text(encoding="utf-8")
    inicio = trecho.index("CREATE OR REPLACE FUNCTION public._trava_pa_da_verba")
    fim = len(trecho)  # a RPC e o bloco final da migration
    sql(trecho[inicio:fim])
    sql(SLA.read_text(encoding="utf-8"))
    # `check_order_sla` e o gatilho canonico de eventos vivem em migrations
    # anteriores; aqui entra o mesmo corpo, para o BEFORE de escrita recalcular
    # o estado antes do encerramento — exatamente a ordem de producao.
    # Corpo copiado da migration (fonte unica): se ela mudar, o teste muda junto.
    corpo = SLA.read_text(encoding="utf-8")
    ini = corpo.index("CREATE OR REPLACE FUNCTION public.check_order_sla()")
    fim = corpo.index("CREATE OR REPLACE FUNCTION", ini + 10)
    fim = corpo.rindex("-- ", ini, fim)
    sql(corpo[ini:fim])
    sql("""
      DROP TRIGGER IF EXISTS trigger_check_order_sla ON public.sicoob_orders;
      CREATE TRIGGER trigger_check_order_sla
        BEFORE INSERT OR UPDATE ON public.sicoob_orders
        FOR EACH ROW EXECUTE FUNCTION public.check_order_sla();
    """)

    verificacoes = []

    def verificar(nome, query, esperado, modo="igual"):
        # psql imprime o tag do comando anterior (ex.: "DO") junto do SELECT
        # seguinte quando os dois vao no mesmo stdin; so a ultima linha vale.
        r = sql(query, check=False)
        linhas = r.stdout.strip().splitlines()
        obtido = linhas[-1].strip() if linhas else ''
        if r.returncode != 0:
            obtido = f"ERRO {r.stderr.strip().splitlines()[0] if r.stderr.strip() else '?'}"
        if modo == "contem":
            ok = esperado in obtido
        elif modo == "nao_contem":
            ok = esperado not in obtido
        else:
            ok = obtido == esperado
        verificacoes.append((nome, ok, obtido, esperado))

    # 1) A criacao pela tela: SECURITY INVOKER, role authenticated.
    verificar(
        "cria_verba_pela_acl_da_role",
        como(f"SELECT public.salvar_verba_pa('{PA1}', 2026, 12, 15000, 5000, 'QA');"),
        "permission denied",
        modo="nao_contem",
    )
    verificar(
        "verba_criada_espelha_planejada",
        "SELECT verba_total, verba_planejada FROM public.pa_budgets WHERE pa_id = "
        f"'{PA1}' AND ano = 2026 AND mes = 12",
        "15000.00|15000.00",
    )
    # 2) A edicao pela tela.
    verificar(
        "edita_verba_pela_acl_da_role",
        como(f"SELECT public.salvar_verba_pa('{PA1}', 2026, 12, 22000, 7000, 'QA2', "
             f"(SELECT id FROM public.pa_budgets WHERE pa_id = '{PA1}' AND ano = 2026 AND mes = 12));"),
        "permission denied",
        modo="nao_contem",
    )
    verificar(
        "verba_editada_espelha_planejada",
        "SELECT verba_total, verba_planejada, limite_alcada FROM public.pa_budgets WHERE pa_id = "
        f"'{PA1}' AND ano = 2026 AND mes = 12",
        "22000.00|22000.00|7000.00",
    )
    # 3) Teto da cooperativa: `cooperativa_budgets.verba_total` e o limite
    # cobrado dos PAs (`teto_verba_pa` e so o saldo inicial da tela).
    verificar(
        "teto_da_cooperativa_barra_verba_acima",
        f"""DO $qa$
        BEGIN
          INSERT INTO public.cooperativa_budgets (cooperativa_id, ano, mes, verba_total, teto_verba_pa)
          VALUES ('{COOP}', 2027, 1, 1000, 100000)
          ON CONFLICT (cooperativa_id, ano, mes) DO UPDATE
            SET verba_total = EXCLUDED.verba_total, teto_verba_pa = EXCLUDED.teto_verba_pa;

          BEGIN
            INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total) VALUES ('{PA1}', 2027, 1, 5000);
            INSERT INTO public.qa_results (name, ok, detalhe)
            VALUES ('teto_da_cooperativa_barra_verba_acima', false, 'verba acima do teto entrou sem erro');
          EXCEPTION WHEN check_violation THEN
            INSERT INTO public.qa_results (name, ok, detalhe)
            VALUES ('teto_da_cooperativa_barra_verba_acima', true, SQLERRM);
          END;
        END
        $qa$;
        SELECT ok::text FROM public.qa_results
         WHERE name = 'teto_da_cooperativa_barra_verba_acima';""",
        "true",
    )
    verificar(
        "verba_acima_do_teto_nao_fica_gravada",
        f"SELECT count(*)::text FROM public.pa_budgets WHERE pa_id = '{PA1}' AND ano = 2027 AND mes = 1",
        "0",
    )

    # A RPC da tela (`salvar_verba_pa`) tambem barra, e grava o que cabe.
    sql(f"""
      INSERT INTO public.cooperativa_budgets (cooperativa_id, ano, mes, verba_total, teto_verba_pa)
      VALUES ('{COOP}', 2027, 2, 1000, 100000), ('{COOP}', 2027, 3, 100000, 100000);
    """)
    verificar(
        "salvar_verba_pa_barra_verba_acima_do_teto",
        f"""DO $qa$
        BEGIN
          PERFORM public.salvar_verba_pa('{PA1}', 2027, 2, 5000);
          INSERT INTO public.qa_results (name, ok, detalhe)
          VALUES ('salvar_verba_pa_barra_verba_acima_do_teto', false, 'RPC gravou acima do teto');
        EXCEPTION WHEN check_violation THEN
          INSERT INTO public.qa_results (name, ok, detalhe)
          VALUES ('salvar_verba_pa_barra_verba_acima_do_teto', true, SQLERRM);
        END
        $qa$;
        SELECT ok::text FROM public.qa_results
         WHERE name = 'salvar_verba_pa_barra_verba_acima_do_teto';""",
        "true",
    )
    verificar(
        "salvar_verba_pa_grava_dentro_do_teto",
        como(f"SELECT public.salvar_verba_pa('{PA1}', 2027, 3, 900);"),
        "permission denied",
        modo="nao_contem",
    )
    verificar(
        "salvar_verba_pa_grava_dentro_do_teto_valor",
        f"SELECT verba_total::text FROM public.pa_budgets WHERE pa_id = '{PA1}' AND ano = 2027 AND mes = 3",
        "900.00",
    )


    # 4) Ciclo de SLA: aprovacao fecha o ciclo com o atraso real. O prazo vai
    # direto na tabela, sem passar pelos gatilhos: e assim que o dado chega do
    # passado, e `check_order_sla` roda no UPDATE da decisao.
    sql(f"""ALTER TABLE public.sicoob_orders DISABLE TRIGGER USER;
         UPDATE public.sicoob_orders SET status = 'waiting_approval', sla_deadline = now() - interval '5 hours',
              sla_status = 'critical', sla_closed_at = NULL, sla_closed_status = NULL, sla_closed_outcome = NULL
         WHERE id = '{ORDER1}';
         ALTER TABLE public.sicoob_orders ENABLE TRIGGER USER;""")
    sql(f"UPDATE public.sicoob_orders SET status = 'confirmed' WHERE id = '{ORDER1}';")
    verificar(
        "aprovacao_fecha_o_ciclo_com_atraso",
        f"SELECT sla_closed_status, sla_closed_outcome FROM public.sicoob_orders WHERE id = '{ORDER1}'",
        "critical|approved",
    )
    # A decisao roda todos os BEFORE e `close_sicoob_order_sla` roda antes de
    # `trigger_check_order_sla` (ordem alfabetica): ele carimba 'critical'/warning
    # conforme o prazo do ciclo e o `check_order_sla` reescreve o estado ativo
    # em seguida. O que importa e que o alerta fique coerente com o prazo.
    verificar(
        "aprovacao_deixa_alerta_coerente_com_o_prazo_do_ciclo",
        f"""SELECT CASE WHEN sla_deadline < now() THEN 'critical'
                       WHEN sla_deadline < now() + interval '9 hours 36 minutes' THEN 'warning'
                       ELSE 'normal' END
             FROM public.sicoob_orders WHERE id = '{ORDER1}'""",
        "critical",
    )

    # 5) Recusa nao vira "aprovado com atraso".
    sql(f"""UPDATE public.sicoob_orders SET status = 'waiting_approval', sla_deadline = now() - interval '2 hours',
              sla_closed_at = NULL, sla_closed_status = NULL, sla_closed_outcome = NULL WHERE id = '{ORDER1}';""")
    sql(f"UPDATE public.sicoob_orders SET status = 'rejected' WHERE id = '{ORDER1}';")
    verificar(
        "recusa_registra_desfecho_proprio",
        f"SELECT sla_closed_outcome FROM public.sicoob_orders WHERE id = '{ORDER1}'",
        "rejected",
    )

    # 6) Escalacao: fecha o ciclo do primeiro prazo e abre um novo.
    sql(f"""UPDATE public.sicoob_orders SET status = 'waiting_approval', sla_deadline = now() - interval '1 hour',
              sla_closed_at = NULL, sla_closed_status = NULL, sla_closed_outcome = NULL WHERE id = '{ORDER1}';""")
    sql(f"UPDATE public.sicoob_orders SET status = 'escalated_to_board' WHERE id = '{ORDER1}';")
    verificar(
        "escalacao_fecha_o_ciclo_e_abre_novo_prazo",
        f"""SELECT sla_closed_outcome,
                   (sla_deadline > now() + interval '47 hours')::text
              FROM public.sicoob_orders WHERE id = '{ORDER1}'""",
        "escalated|true",
    )

    # 7) Recalculo: nao fabrica historico nem devolve pedido decidido ao alerta.
    sql(f"""ALTER TABLE public.sicoob_orders DISABLE TRIGGER USER;
         UPDATE public.sicoob_orders SET status = 'confirmed', sla_deadline = now() - interval '4 days',
              sla_status = 'critical', sla_closed_at = NULL, sla_closed_status = NULL,
              sla_closed_outcome = NULL WHERE id = '{ORDER1}';
         ALTER TABLE public.sicoob_orders ENABLE TRIGGER USER;""")
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    verificar(
        "recalculo_nao_fabrica_encerramento_historico",
        f"SELECT (sla_closed_at IS NULL)::text, sla_status FROM public.sicoob_orders WHERE id = '{ORDER1}'",
        "true|normal",
    )
    verificar(
        "recalculo_tira_pedido_decidido_do_contador_de_alerta",
        f"""SELECT count(*)::text FROM public.sicoob_orders
             WHERE id = '{ORDER1}' AND sla_status IN ('critical', 'warning')""",
        "0",
    )

    # 8) Cancelamento em aprovacao nao pode virar "aprovado com atraso".
    sql(f"""UPDATE public.sicoob_orders SET status = 'waiting_approval', sla_deadline = now() - interval '3 hours',
              sla_closed_at = NULL, sla_closed_status = NULL, sla_closed_outcome = NULL WHERE id = '{ORDER1}';""")
    sql(f"UPDATE public.sicoob_orders SET status = 'cancelled' WHERE id = '{ORDER1}';")
    verificar(
        "cancelamento_registra_desfecho_proprio",
        f"SELECT sla_closed_outcome FROM public.sicoob_orders WHERE id = '{ORDER1}'",
        "cancelled",
    )

    # 9) Pedido parado em aprovacao continua critico (nao e encerrado).
    sql(f"""ALTER TABLE public.sicoob_orders DISABLE TRIGGER USER;
         UPDATE public.sicoob_orders SET status = 'waiting_approval', sla_deadline = now() - interval '1 day',
              sla_status = 'normal', sla_closed_at = NULL, sla_closed_status = NULL,
              sla_closed_outcome = NULL WHERE id = '{ORDER1}';
         ALTER TABLE public.sicoob_orders ENABLE TRIGGER USER;""")
    sql("SELECT public.refresh_sicoob_order_sla_status();")
    verificar(
        "pedido_parado_em_aprovacao_segue_critico",
        f"SELECT sla_status, (sla_closed_at IS NULL)::text FROM public.sicoob_orders WHERE id = '{ORDER1}'",
        "critical|true",
    )

    falhas = [v for v in verificacoes if not v[1]]
    for nome, ok, obtido, esperado in falhas:
        print(f"FALHOU {nome}: obtido={obtido!r} esperado={esperado!r}")
    print(sql("SELECT name, ok, detalhe FROM public.qa_results").stdout)
    if falhas:
        raise SystemExit(1)
    print(f"Verba e SLA SICOOB: {len(verificacoes)} verificacoes aprovadas.")
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)
