"""Valida o fluxo logístico canônico e a compatibilidade legada sem rede."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = "sicoob-logistica-" + uuid.uuid4().hex[:10]
ACTOR = "11111111-1111-4111-8111-111111111111"
OTHER = "22222222-2222-4222-8222-222222222222"
CANONICAL = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
LEGACY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
UNAUTHORIZED = "cccccccc-cccc-4ccc-8ccc-cccccccccccc"

def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)

def sql(statement, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'], stdin=statement, check=False)
    if check and result.returncode: raise RuntimeError(result.stderr)
    return result

def actor(statement, who=ACTOR, role='authenticated', check=True):
    return sql(f"SET ROLE {role}; SET request.jwt.claim.sub='{who}'; {statement}", check)

def call(order, expected, *, carrier='Transportadora', tracking='BR123', photo=None):
    value = "NULL" if photo is None else "'" + photo + "'"
    return f"SELECT public.upsert_sicoob_order_shipment('{order}','{expected}','{carrier}','{tracking}',NULL,{value});"

checks = {}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command, CONTAINER)
    sql(f"""
      CREATE EXTENSION pgcrypto;
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      INSERT INTO auth.users VALUES ('{ACTOR}'),('{OTHER}');
      CREATE TABLE public.sicoob_orders(
        id uuid PRIMARY KEY, created_by uuid NOT NULL, status text NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.sicoob_order_shipments(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid UNIQUE NOT NULL REFERENCES public.sicoob_orders,
        carrier_name text, tracking_code text, status text NOT NULL DEFAULT 'pending', estimated_delivery date,
        actual_delivery_at timestamptz, delivery_photo_path text, created_by uuid NOT NULL REFERENCES auth.users,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE FUNCTION public.sicoob_actor_can_manage_fulfillment(p_actor_id uuid,p_order_id uuid)
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
        SELECT EXISTS(SELECT 1 FROM public.sicoob_orders WHERE id=p_order_id AND created_by=p_actor_id)
      $$;
      CREATE FUNCTION public.validate_order_status_transition() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE transitions jsonb := '{{
        "confirmed":["in_production","logistic"],"in_production":["in_separation"],
        "in_separation":["in_transit"],"in_transit":["delivered"],
        "delivered":["completed"],"logistic":["completed"]
      }}'::jsonb;
      BEGIN
        IF OLD.status IS DISTINCT FROM NEW.status AND NOT (
          transitions ? OLD.status AND NEW.status=ANY(ARRAY(SELECT jsonb_array_elements_text(transitions->OLD.status)))
        ) THEN RAISE EXCEPTION 'Transição inválida'; END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER validate_status BEFORE UPDATE OF status ON public.sicoob_orders
        FOR EACH ROW EXECUTE FUNCTION public.validate_order_status_transition();
      INSERT INTO public.sicoob_orders VALUES
        ('{CANONICAL}','{ACTOR}','confirmed',now()),
        ('{LEGACY}','{ACTOR}','logistic',now()),
        ('{UNAUTHORIZED}','{OTHER}','in_separation',now());
      GRANT USAGE ON SCHEMA public TO anon,authenticated,service_role;
    """)
    sql((ROOT/'supabase/migrations/20260922225100_sicoob_canonical_fulfillment.sql').read_text())

    checks['nao_pula_producao'] = actor(call(CANONICAL,'confirmed'),check=False).returncode != 0
    sql(f"UPDATE public.sicoob_orders SET status='in_production' WHERE id='{CANONICAL}'; UPDATE public.sicoob_orders SET status='in_separation' WHERE id='{CANONICAL}';")
    checks['separacao_vira_transito'] = actor(call(CANONICAL,'in_separation')).returncode == 0 and sql(
      f"SELECT status='in_transit' FROM public.sicoob_orders WHERE id='{CANONICAL}';"
    ).stdout.strip() == 't'
    checks['compare_and_swap_rejeita_estado_antigo'] = actor(call(CANONICAL,'in_separation'),check=False).returncode != 0
    traversal = f"{CANONICAL}/delivery/../segredo.png"
    checks['caminho_traversal_rejeitado'] = actor(call(CANONICAL,'in_transit',photo=traversal),check=False).returncode != 0
    proof = f"{CANONICAL}/delivery/comprovante-1.png"
    checks['comprovante_confirma_entrega'] = actor(call(CANONICAL,'in_transit',photo=proof)).returncode == 0 and sql(
      f"SELECT o.status='delivered' AND s.status='delivered' AND s.delivery_photo_path='{proof}' AND s.actual_delivery_at IS NOT NULL FROM public.sicoob_orders o JOIN public.sicoob_order_shipments s ON s.order_id=o.id WHERE o.id='{CANONICAL}';"
    ).stdout.strip() == 't'
    actor(call(LEGACY,'logistic'))
    legacy_proof = f"{LEGACY}/delivery/legado.png"
    checks['legado_continua_operacional'] = actor(call(LEGACY,'logistic',photo=legacy_proof)).returncode == 0 and sql(
      f"SELECT status='completed' FROM public.sicoob_orders WHERE id='{LEGACY}';"
    ).stdout.strip() == 't'
    checks['ator_fora_do_escopo_rejeitado'] = actor(call(UNAUTHORIZED,'in_separation'),check=False).returncode != 0
    checks['acl_minima'] = sql("SELECT NOT has_function_privilege('anon','public.upsert_sicoob_order_shipment(uuid,text,text,text,date,text)','EXECUTE') AND has_function_privilege('authenticated','public.upsert_sicoob_order_shipment(uuid,text,text,text,date,text)','EXECUTE');").stdout.strip() == 't'
    assert all(checks.values()), checks
    result = {'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks}
    evidence = ROOT/'docs/execucao/evidencias/logistica-canonica-20260922.json'
    evidence.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
