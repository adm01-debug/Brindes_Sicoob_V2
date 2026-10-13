"""Conversão quote→pedido Sicoob em PostgreSQL descartável e sem rede."""
from pathlib import Path
import json
import subprocess
import time
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-conversao-' + uuid.uuid4().hex[:10]
MIGRATION = ROOT / 'supabase/migrations/20260922224500_convert_quote_to_sicoob_order.sql'
MUTATION = ROOT / 'supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql'
GOVERNANCE_FIX = ROOT / 'supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql'
ACTOR = '11111111-1111-4111-8111-111111111111'
OUTSIDER = '11111111-1111-4111-8111-111111111112'
PA = '22222222-2222-4222-8222-222222222222'
COOP = '33333333-3333-4333-8333-333333333333'

def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)

def sql(statement, check=True):
    result = command(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'], stdin=statement, check=False)
    if check and result.returncode:
        raise RuntimeError(result.stderr)
    return result

def scalar(statement):
    return sql(statement).stdout.strip()

def actor(statement, actor_id=ACTOR, check=True):
    return sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{actor_id}'; {statement}", check)

def seed_quote(
    quote_id, status='approved', price=50, personalized=False,
    personalization_cost=0, markup=0, discount_percent=0,
    discount_amount=0, shipping_type='cif', shipping_cost=0,
    subtotal=None, real_subtotal=None, total=None,
):
    base = round(2 * price + personalization_cost, 2)
    commercial_subtotal = round(base * (1 + markup / 100), 2)
    expected_discount = round(commercial_subtotal * discount_percent / 100, 2) if discount_percent else discount_amount
    expected_shipping = shipping_cost if shipping_type in ('fob', 'fob_pre') else 0
    persisted_subtotal = commercial_subtotal if subtotal is None else subtotal
    persisted_real_subtotal = base if real_subtotal is None else real_subtotal
    persisted_total = round(commercial_subtotal - expected_discount + expected_shipping, 2) if total is None else total
    sql(f"""
      INSERT INTO public.quotes(
        id,quote_number,seller_id,status,total,subtotal,real_subtotal,
        discount_percent,discount_amount,negotiation_markup_percent,
        shipping_type,shipping_cost,pa_id,singular_id,client_name
      ) VALUES (
        '{quote_id}','ORC-{quote_id[-4:]}','{ACTOR}','draft',{persisted_total},
        {persisted_subtotal},{persisted_real_subtotal},{discount_percent},{expected_discount},
        {markup},'{shipping_type}',{shipping_cost},'{PA}','{COOP}','Cliente sintético'
      );
      INSERT INTO public.quote_items(id,quote_id,product_id,product_name,product_sku,quantity,unit_price,sort_order)
      VALUES (gen_random_uuid(),'{quote_id}','produto-externo','Produto sintético','SKU-1',2,{price},1);
    """)
    if personalized:
        sql(f"INSERT INTO public.quote_item_personalizations(quote_item_id,technique_name,total_cost) SELECT id,'Silk',{personalization_cost} FROM public.quote_items WHERE quote_id='{quote_id}';")
    if status != 'draft':
        sql(f"BEGIN; SELECT set_config('app.quote_governance_write','true',true); UPDATE public.quotes SET status='{status}' WHERE id='{quote_id}'; COMMIT;")

checks = {}
try:
    command(['docker','run','--rm','-d','--name',CONTAINER,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    wait_for_postgres(command, CONTAINER)
    sql(f"""
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      CREATE TABLE public.user_roles(user_id uuid, role text);
      CREATE TABLE public.profiles(id uuid PRIMARY KEY, user_id uuid, pa_id uuid, cooperativa_id uuid, singular_id uuid, is_active boolean DEFAULT true, deleted_at timestamptz);
      CREATE TABLE public.postos_atendimento(id uuid PRIMARY KEY, cooperativa_id uuid, is_active boolean NOT NULL DEFAULT true);
      CREATE TABLE public.quotes(
        id uuid PRIMARY KEY, quote_number text, seller_id uuid NOT NULL, status text NOT NULL,
        total numeric, subtotal numeric, real_subtotal numeric, discount_percent numeric,
        discount_amount numeric, negotiation_markup_percent numeric, shipping_cost numeric,
        pa_id uuid, singular_id uuid, notes text, client_id text, client_name text,
        client_email text, client_phone text, client_company text, client_cnpj text,
        shipping_type text, payment_terms text, delivery_time text, updated_at timestamptz DEFAULT now(),
        is_latest_version boolean NOT NULL DEFAULT true, approved_by uuid,
        approved_at timestamptz, approved_pdf_url text, rejection_notes text,
        organization_id uuid, client_response text, client_response_at timestamptz,
        client_response_notes text, version integer NOT NULL DEFAULT 1,
        parent_quote_id uuid, row_version integer NOT NULL DEFAULT 1,
        deleted_at timestamptz, is_active boolean NOT NULL DEFAULT true,
        sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE public.quote_items(
        id uuid PRIMARY KEY, quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE, product_id text,
        product_name text, product_sku text, product_image_url text, source_variant_id text,
        source_variant_sku text, color_name text, color_hex text, size_code text, notes text,
        quantity integer, unit_price numeric, display_order integer, sort_order integer
      );
      CREATE TABLE public.quote_item_personalizations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_item_id uuid REFERENCES public.quote_items(id) ON DELETE CASCADE,
        technique_name text, total_cost numeric DEFAULT 0, created_at timestamptz DEFAULT now()
      );
      GRANT SELECT,INSERT,UPDATE,DELETE ON public.quotes,public.quote_items,
        public.quote_item_personalizations TO authenticated;
      CREATE TABLE public.sicoob_orders(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number text NOT NULL DEFAULT ('SIC-'||upper(substr(gen_random_uuid()::text,1,8))),
        cooperative_id uuid, pa_id uuid, created_by uuid, status text NOT NULL DEFAULT 'draft',
        total_amount numeric DEFAULT 0, notes text, is_pilot_order boolean DEFAULT false, updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.sicoob_order_items(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid REFERENCES public.sicoob_orders(id),
        product_id uuid, product_name text, product_sku text, product_image_url text,
        variant_id uuid, variant_sku text, color_name text, color_hex text, size_code text,
        personalization_snapshot jsonb, quantity integer, unit_price numeric, total_price numeric
      );
      CREATE TABLE public.sicoob_order_history(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, user_id uuid,
        previous_status text, new_status text, comment text
      );
      CREATE TABLE public.sicoob_order_artwork_versions(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid, is_latest boolean, status text
      );
      CREATE FUNCTION public.require_sicoob_artwork_before_production() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RETURN NEW; END$$;
      CREATE TRIGGER tr_require_sicoob_artwork_before_production BEFORE UPDATE OF status ON public.sicoob_orders FOR EACH ROW EXECUTE FUNCTION public.require_sicoob_artwork_before_production();
      INSERT INTO public.postos_atendimento VALUES ('{PA}','{COOP}',true);
      INSERT INTO public.profiles(id,user_id,pa_id,cooperativa_id,singular_id,is_active) VALUES ('{ACTOR}','{ACTOR}','{PA}','{COOP}','{COOP}',true);
    """)
    migration = MIGRATION.read_text()
    mutation = MUTATION.read_text()
    governance_contract = """
      CREATE FUNCTION public.guard_quote_governance_write()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
      SET search_path=pg_catalog,public AS $guard$
      BEGIN
        IF current_setting('app.quote_governance_write',true)='true' THEN RETURN NEW; END IF;
        IF TG_OP='INSERT' AND COALESCE(NEW.status,'draft')<>'draft' THEN
          RAISE EXCEPTION 'A criação de orçamento deve iniciar como rascunho.' USING ERRCODE='42501';
        END IF;
        IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
          RAISE EXCEPTION 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.' USING ERRCODE='42501';
        END IF;
        RETURN NEW;
      END;
      $guard$;
      CREATE TRIGGER aaa_guard_quote_governance_write BEFORE INSERT OR UPDATE ON public.quotes
      FOR EACH ROW EXECUTE FUNCTION public.guard_quote_governance_write();
      REVOKE ALL ON FUNCTION public.guard_quote_governance_write() FROM PUBLIC,anon,authenticated;
      CREATE FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)
      RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
      AS 'SELECT false';
      REVOKE ALL ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)
      FROM PUBLIC,anon,authenticated;
      GRANT EXECUTE ON FUNCTION public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)
      TO service_role;
      CREATE FUNCTION public.create_quote_version_atomic(uuid)
      RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
      AS 'SELECT $1';
      REVOKE ALL ON FUNCTION public.create_quote_version_atomic(uuid) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.create_quote_version_atomic(uuid) TO authenticated,service_role;
      CREATE FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)
      RETURNS TABLE(id uuid,status text,row_version integer)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      UPDATE public.quotes q SET status=$3 WHERE q.id=ANY($1) RETURNING q.id,q.status,q.row_version
      $writer$;
      CREATE FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text)
      RETURNS TABLE(id uuid,status text,row_version integer,approved_pdf_url text)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      UPDATE public.quotes q SET status='approved',approved_pdf_url=$3 WHERE q.id=$1
      RETURNING q.id,q.status,q.row_version,q.approved_pdf_url
      $writer$;
      CREATE FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text)
      RETURNS TABLE(request_id uuid,quote_id uuid,seller_id uuid,quote_row_version integer,requested_discount_percent numeric,max_allowed_percent numeric,negotiation_markup_percent numeric,real_discount_percent numeric)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      SELECT gen_random_uuid(),q.id,q.seller_id,q.row_version,$3,0::numeric,0::numeric,$3 FROM public.quotes q WHERE q.id=$1
      $writer$;
      CREATE FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text)
      RETURNS TABLE(request_id uuid,quote_id uuid,seller_id uuid,quote_row_version integer,requested_discount_percent numeric,max_allowed_percent numeric,request_status text)
      LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $writer$
      SELECT $1,NULL::uuid,NULL::uuid,$2,0::numeric,0::numeric,CASE WHEN $3 THEN 'approved' ELSE 'rejected' END
      $writer$;
      REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text) FROM PUBLIC,anon;
      REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text) FROM PUBLIC,anon;
      GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[],integer[],text,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.approve_quote_with_pdf_atomic(uuid,integer,text,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.request_discount_approval_atomic(uuid,integer,numeric,text) TO authenticated;
      GRANT EXECUTE ON FUNCTION public.respond_discount_approval_atomic(uuid,integer,boolean,text) TO authenticated;
    """
    governance_fix = GOVERNANCE_FIX.read_text()
    sql('BEGIN;\n' + migration + '\n' + mutation + '\n' + governance_contract + '\n' + governance_fix + '\nROLLBACK;')
    checks['dry_run_reverte_schema'] = scalar("SELECT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='sicoob_orders' AND column_name='source_quote_id');") == 't'
    sql(migration)
    sql(mutation)
    sql(governance_contract)
    sql(governance_fix)

    quote = '44444444-4444-4444-8444-444444444441'
    seed_quote(quote, personalized=True)
    result = actor(f"SELECT row_to_json(x) FROM public.convert_quote_to_sicoob_order('{quote}') x;").stdout.strip()
    order = json.loads(result)
    checks['converte_para_dominio_sicoob'] = order['status'] == 'pending' and order['total_amount'] == 100
    checks['copia_itens_e_snapshot'] = scalar(f"SELECT count(*)||'|'||COALESCE(product_id::text,'externo')||'|'||(personalization_snapshot->'personalizations'<> '[]'::jsonb)::text FROM public.sicoob_order_items WHERE order_id='{order['id']}' GROUP BY product_id,personalization_snapshot;") == '1|externo|true'
    checks['congela_origem_e_hierarquia'] = scalar(f"SELECT source_quote_id::text||'|'||pa_id::text||'|'||cooperative_id::text||'|'||requires_artwork::text FROM public.sicoob_orders WHERE id='{order['id']}';") == f'{quote}|{PA}|{COOP}|true'
    checks['componentes_comerciais_basicos_reconciliados'] = scalar(f"SELECT merchandise_amount||'|'||personalization_amount||'|'||negotiation_markup_amount||'|'||commercial_subtotal_amount||'|'||discount_amount||'|'||shipping_amount||'|'||pricing_formula_version FROM public.sicoob_orders WHERE id='{order['id']}';") == '100.00|0.00|0.00|100.00|0.00|0.00|brl-v1'
    checks['marca_orcamento_convertido'] = scalar(f"SELECT status FROM public.quotes WHERE id='{quote}';") == 'converted'
    source_item = scalar(f"SELECT id FROM public.quote_items WHERE quote_id='{quote}';")
    frozen_item = actor(f"UPDATE public.quote_items SET quantity=3 WHERE id='{source_item}';", check=False)
    frozen_personalization = actor(
        f"UPDATE public.quote_item_personalizations SET total_cost=99 WHERE quote_item_id='{source_item}';",
        check=False,
    )
    checks['conteudo_convertido_e_imutavel'] = (
        frozen_item.returncode != 0
        and frozen_personalization.returncode != 0
        and scalar(f"SELECT quantity FROM public.quote_items WHERE id='{source_item}';") == '2'
        and scalar(f"SELECT total_cost FROM public.quote_item_personalizations WHERE quote_item_id='{source_item}';") in ('0', '0.00')
    )
    repeated = json.loads(actor(f"SELECT row_to_json(x) FROM public.convert_quote_to_sicoob_order('{quote}') x;").stdout.strip())
    checks['repeticao_idempotente'] = repeated['id'] == order['id'] and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote}';") == '1'
    restored_context = actor(
        f"BEGIN; SELECT count(*) FROM public.convert_quote_to_sicoob_order('{quote}');"
        "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;"
    ).stdout.strip()
    checks['conversao_restaura_contexto_de_governanca'] = restored_context == '1\nrestaurado'
    sql(f"UPDATE public.profiles SET is_active=false WHERE user_id='{ACTOR}';")
    checks['perfil_inativo_nao_acessa_conversao_idempotente'] = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote}');", check=False).returncode != 0
    sql(f"UPDATE public.profiles SET is_active=true WHERE user_id='{ACTOR}';")
    blocked_art = sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{order['id']}';", check=False)
    checks['personalizado_exige_arte'] = blocked_art.returncode != 0 and 'arte precisa estar aprovada' in blocked_art.stderr
    sql(f"INSERT INTO public.sicoob_order_artwork_versions(order_id,is_latest,status) VALUES ('{order['id']}',true,'approved');")
    checks['arte_aprovada_libera_fluxo'] = sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{order['id']}';").returncode == 0
    sql(f"UPDATE public.sicoob_orders SET status='draft' WHERE id='{order['id']}';")
    source_frozen = actor(f"SELECT public.mutate_sicoob_order_item('{order['id']}','add',NULL,'66666666-6666-4666-8666-666666666661','Outro',1,10);", check=False)
    checks['pedido_convertido_nao_aceita_mutacao_de_itens'] = source_frozen.returncode != 0 and 'pedido convertido' in source_frozen.stderr.lower()

    quote_commercial = '44444444-4444-4444-8444-444444444446'
    seed_quote(
        quote_commercial, personalized=True, personalization_cost=10,
        markup=20, discount_percent=10, shipping_type='fob', shipping_cost=15,
    )
    commercial = json.loads(actor(f"SELECT row_to_json(x) FROM public.convert_quote_to_sicoob_order('{quote_commercial}') x;").stdout.strip())
    checks['formula_brl_v1_preserva_personalizacao_markup_desconto_e_frete'] = (
        float(commercial['total_amount']) == 133.80
        and scalar(f"SELECT merchandise_amount||'|'||personalization_amount||'|'||negotiation_markup_amount||'|'||commercial_subtotal_amount||'|'||discount_amount||'|'||shipping_amount FROM public.sicoob_orders WHERE id='{commercial['id']}';") == '100.00|10.00|22.00|132.00|13.20|15.00'
        and scalar(f"SELECT total_price||'|'||personalization_amount||'|'||line_total_amount FROM public.sicoob_order_items WHERE order_id='{commercial['id']}';") == '100.00|10.00|110.00'
    )

    quote_tampered = '44444444-4444-4444-8444-444444444447'
    seed_quote(quote_tampered, total=99)
    tampered = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote_tampered}');", check=False)
    checks['total_adulterado_reverte_conversao'] = tampered.returncode != 0 and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote_tampered}';") == '0'

    quote_out = '44444444-4444-4444-8444-444444444442'
    seed_quote(quote_out)
    denied = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote_out}');", OUTSIDER, False)
    checks['ator_alheio_bloqueado'] = denied.returncode != 0 and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote_out}';") == '0'

    quote_invalid = '44444444-4444-4444-8444-444444444443'
    seed_quote(quote_invalid, price=0)
    invalid = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote_invalid}');", check=False)
    checks['item_invalido_reverte_tudo'] = invalid.returncode != 0 and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote_invalid}';") == '0' and scalar(f"SELECT status FROM public.quotes WHERE id='{quote_invalid}';") == 'approved'

    quote_rollback = '44444444-4444-4444-8444-444444444444'
    seed_quote(quote_rollback)
    sql("CREATE FUNCTION public.fail_item() RETURNS trigger LANGUAGE plpgsql AS $$BEGIN RAISE EXCEPTION 'falha sintética'; END$$; CREATE TRIGGER fail_item BEFORE INSERT ON public.sicoob_order_items FOR EACH ROW EXECUTE FUNCTION public.fail_item();")
    rolled = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote_rollback}');", check=False)
    checks['falha_intermediaria_reverte_pedido_e_quote'] = rolled.returncode != 0 and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote_rollback}';") == '0' and scalar(f"SELECT status FROM public.quotes WHERE id='{quote_rollback}';") == 'approved'
    sql('DROP TRIGGER fail_item ON public.sicoob_order_items; DROP FUNCTION public.fail_item();')

    quote_race = '44444444-4444-4444-8444-444444444445'
    seed_quote(quote_race)
    processes=[]
    statement=f"SET ROLE authenticated; SET request.jwt.claim.sub='{ACTOR}'; SELECT id FROM public.convert_quote_to_sicoob_order('{quote_race}');"
    for _ in range(2):
        process=subprocess.Popen(['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        process.stdin.write(statement); process.stdin.close(); processes.append(process)
    outputs=[]
    for process in processes:
        process.wait(timeout=20); outputs.append((process.returncode,process.stdout.read().strip(),process.stderr.read()))
    checks['concorrencia_retorna_mesmo_pedido'] = all(x[0] == 0 for x in outputs) and len({x[1] for x in outputs}) == 1 and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote_race}';") == '1'

    quote_state_race = '44444444-4444-4444-8444-444444444449'
    seed_quote(quote_state_race, status='draft')
    state_race_item = scalar(f"SELECT id FROM public.quote_items WHERE quote_id='{quote_state_race}';")
    transition = subprocess.Popen(
        ['docker','exec','-i',CONTAINER,'psql','-U','postgres','-XqAt','-v','ON_ERROR_STOP=1'],
        stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
    )
    transition.stdin.write(
        "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
        f"UPDATE public.quotes SET status='sent' WHERE id='{quote_state_race}'; "
        "SELECT pg_advisory_xact_lock(981013); SELECT pg_sleep(2); COMMIT;"
    )
    transition.stdin.close()
    transition_locked = False
    for _ in range(40):
        lock_probe = scalar('SELECT pg_try_advisory_lock(981013);')
        if lock_probe == 'f':
            transition_locked = True
            break
        time.sleep(0.05)
    raced_edit = actor(
        f"UPDATE public.quote_items SET quantity=9 WHERE id='{state_race_item}';",
        check=False,
    )
    transition.wait(timeout=20)
    checks['decisao_concorrente_bloqueia_edicao_tardia_de_item'] = (
        transition_locked
        and transition.returncode == 0
        and raced_edit.returncode != 0
        and scalar(f"SELECT status||'|'||quantity FROM public.quotes q JOIN public.quote_items qi ON qi.quote_id=q.id WHERE q.id='{quote_state_race}';") == 'sent|2'
    )
    checks['acl_authenticated_sem_anon'] = scalar("SELECT has_function_privilege('authenticated','public.convert_quote_to_sicoob_order(uuid)','EXECUTE')::text||'|'||has_function_privilege('anon','public.convert_quote_to_sicoob_order(uuid)','EXECUTE')::text;") == 'true|false'
    checks['nucleo_interno_sem_execute_cliente'] = scalar("SELECT has_function_privilege('authenticated','public.convert_quote_to_sicoob_order_core_20261013(uuid)','EXECUTE')::text||'|'||has_function_privilege('service_role','public.apply_local_quote_approval_response_core_20261013(text,text,text,text,text,text,text,text)','EXECUTE')::text||'|'||has_function_privilege('authenticated','public.create_quote_version_atomic_core_20261013(uuid)','EXECUTE')::text;") == 'false|false|false'

    version_context = actor(
        f"BEGIN; SELECT public.create_quote_version_atomic('{quote_state_race}');"
        "SELECT COALESCE(NULLIF(current_setting('app.quote_governance_write',true),''),'restaurado'); COMMIT;"
    ).stdout.strip()
    checks['versionamento_restaura_contexto_de_governanca'] = version_context == f'{quote_state_race}\nrestaurado'

    forged_context = actor(
        "BEGIN; SELECT set_config('app.quote_governance_write','true',true); "
        f"UPDATE public.quotes SET total=777 WHERE id='{quote}'; COMMIT;",
        check=False,
    )
    checks['cliente_nao_forja_contexto_interno'] = (
        forged_context.returncode != 0
        and scalar(f"SELECT total=100 FROM public.quotes WHERE id='{quote}';") == 't'
    )
    converted_delete = actor(f"DELETE FROM public.quotes WHERE id='{quote}';", check=False)
    checks['orcamento_convertido_preserva_historico'] = (
        converted_delete.returncode != 0
        and scalar(f"SELECT count(*) FROM public.quotes WHERE id='{quote}';") == '1'
        and scalar(f"SELECT count(*) FROM public.quote_items WHERE quote_id='{quote}';") == '1'
    )

    editable_quote = '44444444-4444-4444-8444-444444444448'
    seed_quote(editable_quote, status='draft')
    editable_item = scalar(f"SELECT id FROM public.quote_items WHERE quote_id='{editable_quote}';")
    checks['rascunho_continua_editavel'] = (
        actor(f"UPDATE public.quote_items SET quantity=3 WHERE id='{editable_item}';").returncode == 0
        and actor(f"INSERT INTO public.quote_item_personalizations(quote_item_id,technique_name,total_cost) VALUES ('{editable_item}','Laser',5);").returncode == 0
    )
    editable_delete = actor(f"DELETE FROM public.quotes WHERE id='{editable_quote}';")
    checks['rascunho_pode_ser_excluido_com_cascata'] = (
        editable_delete.returncode == 0
        and scalar(f"SELECT count(*) FROM public.quotes WHERE id='{editable_quote}';") == '0'
        and scalar(f"SELECT count(*) FROM public.quote_items WHERE quote_id='{editable_quote}';") == '0'
        and scalar(f"SELECT count(*) FROM public.quote_item_personalizations WHERE quote_item_id='{editable_item}';") == '0'
    )

    draft = '55555555-5555-4555-8555-555555555551'
    product = '66666666-6666-4666-8666-666666666661'
    sql(f"INSERT INTO public.sicoob_orders(id,created_by,status,total_amount) VALUES ('{draft}','{ACTOR}','draft',0);")
    total = actor(f"SELECT public.mutate_sicoob_order_item('{draft}','add',NULL,'{product}','Produto',2,25);").stdout.strip()
    checks['item_e_total_numa_transacao'] = float(total) == 50 and scalar(f"SELECT total_amount::text||'|'||count(*)::text FROM public.sicoob_orders o JOIN public.sicoob_order_items i ON i.order_id=o.id WHERE o.id='{draft}' GROUP BY o.total_amount;") in ('50|1', '50.00|1')
    item_id = scalar(f"SELECT id FROM public.sicoob_order_items WHERE order_id='{draft}';")
    removed = actor(f"SELECT public.mutate_sicoob_order_item('{draft}','remove','{item_id}',NULL,NULL,NULL,NULL);").stdout.strip()
    checks['remocao_e_total_numa_transacao'] = removed == '0' and scalar(f"SELECT count(*) FROM public.sicoob_order_items WHERE order_id='{draft}';") == '0'
    denied_item = actor(f"SELECT public.mutate_sicoob_order_item('{draft}','add',NULL,'{product}','Produto',1,10);", OUTSIDER, False)
    checks['mutacao_de_item_bloqueia_ator_alheio'] = denied_item.returncode != 0
    sql(f"UPDATE public.sicoob_orders SET status='pending' WHERE id='{draft}';")
    frozen = actor(f"SELECT public.mutate_sicoob_order_item('{draft}','add',NULL,'{product}','Produto',1,10);", check=False)
    checks['pedido_fora_de_rascunho_e_imutavel'] = frozen.returncode != 0 and scalar(f"SELECT count(*) FROM public.sicoob_order_items WHERE order_id='{draft}';") == '0'

    assert all(checks.values()), checks
    print(json.dumps({'ambiente':'PostgreSQL 16 descartável sem rede','remoto_validado':False,'cenarios':checks},ensure_ascii=False,indent=2))
finally:
    command(['docker','rm','-f',CONTAINER],check=False)
