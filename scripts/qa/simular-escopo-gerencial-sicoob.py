#!/usr/bin/env python3
"""Valida o escopo gerencial do SIC-011 (migration 20261126160000).

Cobre tres pontos que o CI nao conseguia provar so lendo o SQL:
1. `order_comments_select_scoped` herda o escopo de `orders` (supervisor nao le
   comentario de pedido de outra organizacao).
2. A leitura de `pa_notification_settings` aceita quem a RPC de gravacao aceita
   (supervisor), e `webhook_url` continua fora do GRANT de coluna.
3. A RPC de gravacao preserva o campo que nao veio no payload (NULL = nao mexer,
   string vazia = limpar).
4. `limit_increase_requests` (20261126121000) aceita os papeis vigentes no lugar
   de `gestor_pa`/`gestor_singular`: o gerente do PA abre e ve a propria fila,
   nao abre pedido em outro posto, e a administracao ve tudo.
5. As funcoes que devolvem o webhook e gravam a configuracao recusam sessao sem
   segundo fator (AAL1), mesmo para admin.
"""

from pathlib import Path
import subprocess
import uuid

from postgres_ready import wait_for_postgres


ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261126160000_sicoob_escopo_gerente_papeis_reais.sql"
AUMENTO = ROOT / "supabase/migrations/20261126121000_limit_increase_decision.sql"
# A 20261126160000 ja esta mesclada e nao pode ser editada; o ajuste de escopo
# de limit_increase_requests vive numa migration publicada depois dela. O
# cenario precisa aplicar as duas na ordem de publicacao, senao exercita uma
# policy que nao existe mais em producao.
ESCOPO_POR_PA = ROOT / "supabase/migrations/20261127120000_limit_increase_requests_escopo_por_pa.sql"
CONTAINER = "sicoob-escopo-gerencial-" + uuid.uuid4().hex[:10]

ADMIN = "11111111-1111-1111-1111-111111111111"
SUPERVISOR = "22222222-2222-2222-2222-222222222222"
GERENTE = "33333333-3333-3333-3333-333333333333"
SELLER = "44444444-4444-4444-4444-444444444444"

PA1 = "aaaaaaaa-0000-0000-0000-000000000001"
PA2 = "aaaaaaaa-0000-0000-0000-000000000002"
ORG1 = "bbbbbbbb-0000-0000-0000-000000000001"
ORG2 = "bbbbbbbb-0000-0000-0000-000000000002"
REQ1 = "eeeeeeee-0000-0000-0000-000000000001"
ORDER1 = "cccccccc-0000-0000-0000-000000000001"
ORDER2 = "cccccccc-0000-0000-0000-000000000002"
ORDER3 = "cccccccc-0000-0000-0000-000000000003"
WEBHOOK = "https://hooks.slack.com/services/QA/ESC/SECRETO"
EMAIL = "gestor@vinculado.test"


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


def secao(inicio, fim=None, *, arquivo=None):
    """Recorta a secao da migration pelo banner `-- N) ...` do cabecalho."""
    linhas = (arquivo or MIGRATION).read_text(encoding="utf-8").splitlines()
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
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{{}}'::jsonb)
  $$;

  CREATE TYPE public.app_role AS ENUM (
    'dev', 'admin', 'manager', 'supervisor', 'gerente_pa', 'gestor_compras',
    'comprador_pac', 'comprador_singular', 'vendedor', 'seller'
  );
  CREATE TABLE public.user_roles (user_id uuid, role public.app_role);
  CREATE TABLE public.qa_user_orgs (user_id uuid, org_id uuid);
  CREATE TABLE public.qa_user_pa (user_id uuid, pa_id uuid);
  CREATE TABLE public.qa_user_coop (user_id uuid, coop_id uuid);

  CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  $$;
  CREATE FUNCTION public.is_supervisor_or_above(_user_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(_user_id, 'dev') OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'manager') OR public.has_role(_user_id, 'supervisor')
  $$;
  CREATE FUNCTION public.can_view_all_sales()
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(auth.uid(), 'dev') OR public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'manager')
  $$;
  CREATE FUNCTION public.get_user_org_ids(_user_id uuid)
  RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT org_id FROM public.qa_user_orgs WHERE user_id = _user_id
  $$;
  CREATE FUNCTION public.is_gerente_pa() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(auth.uid(), 'gerente_pa')
  $$;
  CREATE FUNCTION public.is_gestor_compras() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(auth.uid(), 'gestor_compras')
  $$;
  CREATE FUNCTION public.current_user_pa_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT pa_id FROM public.qa_user_pa WHERE user_id = auth.uid() LIMIT 1
  $$;
  CREATE FUNCTION public.current_user_cooperativa_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT coop_id FROM public.qa_user_coop WHERE user_id = auth.uid() LIMIT 1
  $$;

  CREATE FUNCTION public.is_admin(_user_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'dev')
  $$;

  CREATE TABLE public.postos_atendimento (
    id uuid PRIMARY KEY,
    nome text,
    cooperativa_id uuid,
    is_active boolean DEFAULT true
  );
  CREATE TABLE public.pa_budgets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id),
    ano int NOT NULL,
    mes int NOT NULL,
    verba_total numeric(14,2),
    verba_planejada numeric(14,2) DEFAULT 0,
    limite_alcada numeric(14,2),
    verba_reservada numeric(14,2) DEFAULT 0,
    verba_comprometida numeric(14,2) DEFAULT 0,
    verba_consumida numeric(14,2) DEFAULT 0,
    fechada_em timestamptz,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (pa_id, ano, mes)
  );
  CREATE TABLE public.limit_increase_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id),
    requested_by uuid DEFAULT auth.uid(),
    current_limit numeric(14,2),
    requested_limit numeric(14,2),
    reason text,
    status text NOT NULL DEFAULT 'pending',
    approved_by uuid,
    rejection_reason text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.pa_notification_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pa_id uuid NOT NULL REFERENCES public.postos_atendimento(id),
    channel text NOT NULL,
    webhook_url text,
    recipient_email text,
    is_active boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (pa_id, channel)
  );
  -- `orders` fica sem RLS no harness: a subconsulta da policy de comentarios ja
  -- exercita o predicado (o mesmo de `orders_select_scope`), sem replicar a policy.
  CREATE TABLE public.orders (id uuid PRIMARY KEY, seller_id uuid, organization_id uuid);
  CREATE TABLE public.order_comments (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE
  );

  ALTER TABLE public.pa_notification_settings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.order_comments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.limit_increase_requests ENABLE ROW LEVEL SECURITY;

  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    title text,
    message text,
    type text,
    category text,
    action_url text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE FUNCTION public.send_notification(
    _user_id uuid, _title text, _message text, _type text,
    _category text, _action_url text, _metadata jsonb
  ) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
    INSERT INTO public.notifications (user_id, title, message, type, category, action_url, metadata)
    VALUES (_user_id, _title, _message, _type, _category, _action_url, _metadata)
  $$;

  -- Auditoria: a policy da secao 1 junta `order_audit_events` com `orders`
  -- (escopo de vendedor/organizacao) e o ramo Sicoob le `sicoob_orders`. Sem
  -- as duas tabelas a secao 1 nao aplicava e a policy ficava sem cobertura.
  CREATE TABLE public.order_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    event_type text,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.sicoob_orders (
    id uuid PRIMARY KEY,
    created_by uuid,
    pa_id uuid,
    cooperative_id uuid
  );
  ALTER TABLE public.order_audit_events ENABLE ROW LEVEL SECURITY;
  GRANT SELECT ON public.order_audit_events, public.sicoob_orders TO authenticated;

  CREATE TABLE public.qa_results (name text PRIMARY KEY, ok boolean);
  GRANT SELECT ON public.pa_notification_settings, public.postos_atendimento TO authenticated;
  GRANT SELECT ON public.order_comments, public.orders,tie_placeholder TO authenticated;
  GRANT SELECT, INSERT ON public.limit_increase_requests TO authenticated;
  GRANT INSERT, SELECT ON public.qa_results TO authenticated;
"""
STUBS = STUBS.replace("public.orders,tie_placeholder", "public.orders")

SEED = f"""
  INSERT INTO auth.users (id, email) VALUES
    ('{ADMIN}', 'qa-admin@sicoob.test'),
    ('{SUPERVISOR}', 'qa-supervisor@sicoob.test'),
    ('{GERENTE}', 'qa-gerente@sicoob.test'),
    ('{SELLER}', 'qa-seller@sicoob.test');

  INSERT INTO public.postos_atendimento (id, nome, cooperativa_id, is_active) VALUES
    ('{PA1}', 'PA Aracaju', '{ORG1}', true),
    ('{PA2}', 'PA Salvador', '{ORG2}', true);

  INSERT INTO public.user_roles (user_id, role) VALUES
    ('{ADMIN}', 'admin'),
    ('{SUPERVISOR}', 'supervisor'),
    ('{GERENTE}', 'gerente_pa'),
    ('{SELLER}', 'seller'),
    ('{SUPERVISOR}', 'gestor_compras');

  INSERT INTO public.qa_user_orgs (user_id, org_id) VALUES ('{SUPERVISOR}', '{ORG1}');
  INSERT INTO public.qa_user_coop (user_id, coop_id) VALUES ('{SUPERVISOR}', '{ORG1}');
  INSERT INTO public.qa_user_pa (user_id, pa_id) VALUES ('{GERENTE}', '{PA1}');

  INSERT INTO public.pa_notification_settings (pa_id, channel, webhook_url, recipient_email, is_active) VALUES
    ('{PA1}', 'slack', '{WEBHOOK}', '{EMAIL}', true),
    ('{PA2}', 'slack', 'https://hooks.slack.com/services/QA/OUTRA', NULL, true);

  INSERT INTO public.orders (id, seller_id, organization_id) VALUES
    ('{ORDER1}', '{ADMIN}', '{ORG1}'),
    ('{ORDER2}', '{SELLER}', '{ORG2}'),
    ('{ORDER3}', '{ADMIN}', NULL);

  -- Pedido de aumento do PA1 aberto pelo gerente: e a fila que gerente e
  -- comprador do PA1 devem ver, e que nenhum outro posto pode enxergar.
  INSERT INTO public.limit_increase_requests (id, pa_id, requested_by, current_limit, requested_limit, reason) VALUES
    ('{REQ1}', '{PA1}', '{GERENTE}', 1000, 2500, 'Campanha de fim de ano');

  -- Verba de fevereiro/2026 para exercitar a recusa (nao altera verba) sem
  -- depender da competencia corrente do servidor de teste.
  INSERT INTO public.pa_budgets (pa_id, ano, mes, verba_total, verba_planejada, limite_alcada)
  VALUES ('{PA1}', 2026, 2, 1000, 1000, 1000);

  INSERT INTO public.order_comments (id, order_id) VALUES
    ('dddddddd-0000-0000-0000-000000000001', '{ORDER1}'),
    ('dddddddd-0000-0000-0000-000000000002', '{ORDER2}'),
    ('dddddddd-0000-0000-0000-000000000003', '{ORDER3}');
"""


def como(usuario, corpo, *, aal="aal2"):
    return f"""
  SET ROLE authenticated;
  SET request.jwt.claim.sub = '{usuario}';
  SET request.jwt.claims = '{{"sub": "{usuario}", "aal": "{aal}"}}';
  {corpo}
  RESET ROLE;
"""


try:
    command([
        "docker", "run", "--rm", "-d", "--name", CONTAINER,
        "-e", "POSTGRES_PASSWORD=postgres", "--network", "none", "postgres:16-alpine",
    ])
    wait_for_postgres(command, CONTAINER)
    sql(STUBS)
    # A secao 1 (auditoria) precisa vir junto: e nela que mora o ramo de escopo
    # que a fila gerencial usa como referencia de leitura.
    sql(secao("-- 1) order_audit_events", "-- 2) order_comments"))
    sql(secao("-- 2) order_comments", "-- 5) limit_increase_requests"))
    sql(secao("-- 6) pa_notification_settings"))
    # 3) RLS de limit_increase_requests: sem estas policies a fila de aumentos
    # nao tinha teste integrado (os testes do servico usam mock).
    sql(secao("-- 1. Autoridade de decis", "-- 2. Decis", arquivo=AUMENTO))
    sql(secao("-- 2. Decis", "-- 3. RLS com os pap", arquivo=AUMENTO))
    sql(secao("-- 3. RLS com os pap", "-- 4. Contrato ACL", arquivo=AUMENTO))
    # Ordem de publicacao: a policy por PA entra depois da decisao de aumento.
    sql(ESCOPO_POR_PA.read_text(encoding="utf-8"))
    sql(SEED)

    # Sessao que so cumpriu o primeiro fator enxerga a tela, mas nao le o
    # segredo nem grava: e o que AdminRoute impede na navegacao.
    sql(como(ADMIN, f"""
      DO $qa$
      BEGIN
        PERFORM public.sicoob_pa_slack_webhook('{PA1}');
        INSERT INTO public.qa_results (name, ok) VALUES ('admin_aal1_nao_le_webhook', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('admin_aal1_nao_le_webhook', true);
      END
      $qa$;
      DO $qa$
      BEGIN
        PERFORM public.sicoob_pa_notification_settings_set('{PA1}', 'slack', p_is_active := true);
        INSERT INTO public.qa_results (name, ok) VALUES ('admin_aal1_nao_grava', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('admin_aal1_nao_grava', true);
      END
      $qa$;
    """, aal="aal1"))

    # Leitura da administracao + primeiro patch (ligar/desligar o canal).
    sql(como(ADMIN, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('admin_le_as_2_configuracoes', (SELECT count(*) = 2 FROM public.pa_notification_settings)),
        ('admin_le_os_3_comentarios', (SELECT count(*) = 3 FROM public.order_comments)),
        ('admin_le_webhook_pela_rpc', (SELECT public.sicoob_pa_slack_webhook('{PA1}') = '{WEBHOOK}'));
      SELECT public.sicoob_pa_notification_settings_set('{PA1}', 'slack', p_is_active := false);
    """))
    sql(f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('desligar_canal_preserva_destino', (
          SELECT webhook_url = '{WEBHOOK}' AND recipient_email = '{EMAIL}' AND is_active = false
            FROM public.pa_notification_settings WHERE pa_id = '{PA1}' AND channel = 'slack'
        ));
    """)

    # Segundo patch: troca de e-mail e limpeza explicita do webhook. O webhook e
    # conferido entre as duas chamadas: se a primeira apagasse o destino, a
    # asserção final (webhook ja limpo de proposito) passaria sem provar nada.
    sql(como(ADMIN, f"""
      SELECT public.sicoob_pa_notification_settings_set('{PA1}', 'slack', p_recipient_email := 'novo@test');
    """))
    sql(f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('trocar_email_preserva_webhook_antes_da_limpeza', (
          SELECT webhook_url = '{WEBHOOK}' AND recipient_email = 'novo@test'
            FROM public.pa_notification_settings WHERE pa_id = '{PA1}' AND channel = 'slack'
        ));
    """)
    sql(como(ADMIN, f"""
      SELECT public.sicoob_pa_notification_settings_set('{PA1}', 'slack', p_webhook_url := '');
    """))
    sql(f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('trocar_email_preserva_webhook_e_limpeza_com_string_vazia', (
          SELECT webhook_url = '' AND recipient_email = 'novo@test' AND is_active = false
            FROM public.pa_notification_settings WHERE pa_id = '{PA1}' AND channel = 'slack'
        ));
    """)

    # Fila de aumentos: autor, gerente do PA e gestor da cooperativa enxergam;
    # nenhum outro posto e enxergado por eles, e inserir em nome alheio falha.
    sql(como(GERENTE, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('gerente_ve_o_pedido_do_proprio_pa', (SELECT count(*) = 1 FROM public.limit_increase_requests));
      DO $qa$
      BEGIN
        INSERT INTO public.limit_increase_requests (pa_id, current_limit, requested_limit, reason)
        VALUES ('{PA2}', 100, 200, 'posto de outra cooperativa');
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_nao_abre_pedido_em_outro_pa', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_nao_abre_pedido_em_outro_pa', true);
      END
      $qa$;
    """))
    sql(como(ADMIN, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('admin_ve_a_fila_de_aumentos', (SELECT count(*) = 1 FROM public.limit_increase_requests));
    """))

    # Decisao: recusa exige motivo, o comprador do PA nao tem autoridade, o
    # gestor da cooperativa recusa e o solicitante recebe a notificacao.
    sql(como(GERENTE, f"""
      DO $qa$
      BEGIN
        PERFORM public.decide_limit_increase_request('{REQ1}', true, NULL);
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_do_pa_nao_decide_o_proprio_pedido', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_do_pa_nao_decide_o_proprio_pedido', true);
      END
      $qa$;
    """))
    sql(como(SUPERVISOR, f"""
      DO $qa$
      BEGIN
        PERFORM public.decide_limit_increase_request('{REQ1}', false, NULL);
        INSERT INTO public.qa_results (name, ok) VALUES ('recusa_sem_motivo_falha', false);
      EXCEPTION WHEN check_violation THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('recusa_sem_motivo_falha', true);
      END
      $qa$;
      SELECT public.decide_limit_increase_request('{REQ1}', false, 'Verba do mes ja fechada');
    """))
    sql(f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('recusa_nao_altera_verba', (
          SELECT verba_planejada = 1000 FROM public.pa_budgets
           WHERE pa_id = '{PA1}' AND ano = 2026 AND mes = 2
        )),
        ('recusa_fica_com_autor_e_motivo', (
          SELECT status = 'rejected' AND approved_by = '{SUPERVISOR}'
             AND rejection_reason = 'Verba do mes ja fechada'
            FROM public.limit_increase_requests WHERE id = '{REQ1}'
        )),
        ('solicitante_recebe_o_aviso_da_recusa', (
          SELECT count(*) = 1 FROM public.notifications
           WHERE user_id = '{GERENTE}' AND category = 'approval'
             AND metadata ->> 'limit_increase_request_id' = '{REQ1}'
        ));
    """)

    # Escopo de leitura por papel.
    sql(como(SUPERVISOR, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('supervisor_le_as_2_configuracoes', (SELECT count(*) = 2 FROM public.pa_notification_settings)),
        ('supervisor_le_2_de_3_comentarios', (SELECT count(*) = 2 FROM public.order_comments)),
        ('supervisor_nao_le_comentario_de_outra_org', (
          SELECT count(*) = 0 FROM public.order_comments WHERE order_id = '{ORDER2}'
        ));
    """) + como(GERENTE, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('gerente_pa_le_so_o_proprio_pa', (SELECT count(*) = 1 FROM public.pa_notification_settings)),
        ('gerente_pa_nao_le_comentario', (SELECT count(*) = 0 FROM public.order_comments));
      DO $qa$
      BEGIN
        PERFORM public.sicoob_pa_notification_settings_set('{PA1}', 'slack', p_is_active := true);
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_pa_nao_grava', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_pa_nao_grava', true);
      END
      $qa$;
      DO $qa$
      BEGIN
        PERFORM public.sicoob_pa_slack_webhook('{PA1}');
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_pa_nao_le_webhook', false);
      EXCEPTION WHEN insufficient_privilege THEN
        INSERT INTO public.qa_results (name, ok) VALUES ('gerente_pa_nao_le_webhook', true);
      END
      $qa$;
    """) + como(SELLER, f"""
      INSERT INTO public.qa_results (name, ok) VALUES
        ('vendedor_le_so_o_proprio_comentario', (SELECT count(*) = 1 FROM public.order_comments));
    """))

    coluna = sql(como(ADMIN, "SELECT webhook_url FROM public.pa_notification_settings LIMIT 1;"), check=False)
    if coluna.returncode == 0 or "permission denied" not in coluna.stderr:
        raise RuntimeError(f"webhook_url foi entregue ao navegador: {coluna.stdout!r} {coluna.stderr!r}")

    resultados = sql("SELECT name, ok FROM public.qa_results ORDER BY name;")
    linhas = [linha.split("|") for linha in resultados.stdout.splitlines() if linha.strip()]
    falhas = [nome for nome, ok in linhas if ok != "t"]
    if falhas:
        raise RuntimeError("Verificacoes reprovadas: " + ", ".join(falhas))

    print(f"Escopo gerencial SIC-011: {len(linhas)} verificacoes aprovadas (RLS, RPC e coluna secreta).")
finally:
    command(["docker", "rm", "-f", CONTAINER], check=False)