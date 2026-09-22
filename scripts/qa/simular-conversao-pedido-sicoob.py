"""Conversão quote→pedido Sicoob em PostgreSQL descartável e sem rede."""
from pathlib import Path
import json
import subprocess
import uuid
from postgres_ready import wait_for_postgres

ROOT = Path(__file__).resolve().parents[2]
CONTAINER = 'sicoob-conversao-' + uuid.uuid4().hex[:10]
MIGRATION = ROOT / 'supabase/migrations/20260922224500_convert_quote_to_sicoob_order.sql'
MUTATION = ROOT / 'supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql'
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

def seed_quote(quote_id, status='approved', price=50, personalized=False):
    sql(f"""
      INSERT INTO public.quotes(id,quote_number,seller_id,status,total,subtotal,discount_amount,shipping_cost,pa_id,singular_id,client_name)
      VALUES ('{quote_id}','ORC-{quote_id[-4:]}','{ACTOR}','{status}',100,100,0,0,'{PA}','{COOP}','Cliente sintético');
      INSERT INTO public.quote_items(id,quote_id,product_id,product_name,product_sku,quantity,unit_price,sort_order)
      VALUES (gen_random_uuid(),'{quote_id}','produto-externo','Produto sintético','SKU-1',2,{price},1);
    """)
    if personalized:
        sql(f"INSERT INTO public.quote_item_personalizations(quote_item_id,technique_name) SELECT id,'Silk' FROM public.quote_items WHERE quote_id='{quote_id}';")

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
        total numeric, subtotal numeric, discount_amount numeric, shipping_cost numeric,
        pa_id uuid, singular_id uuid, notes text, client_id text, client_name text,
        client_email text, client_phone text, client_company text, client_cnpj text,
        shipping_type text, payment_terms text, delivery_time text, updated_at timestamptz DEFAULT now()
      );
      CREATE TABLE public.quote_items(
        id uuid PRIMARY KEY, quote_id uuid REFERENCES public.quotes(id), product_id text,
        product_name text, product_sku text, product_image_url text, source_variant_id text,
        source_variant_sku text, color_name text, color_hex text, size_code text, notes text,
        quantity integer, unit_price numeric, display_order integer, sort_order integer
      );
      CREATE TABLE public.quote_item_personalizations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), quote_item_id uuid REFERENCES public.quote_items(id),
        technique_name text, created_at timestamptz DEFAULT now()
      );
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
    sql('BEGIN;\n' + migration + '\n' + mutation + '\nROLLBACK;')
    checks['dry_run_reverte_schema'] = scalar("SELECT NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='sicoob_orders' AND column_name='source_quote_id');") == 't'
    sql(migration)
    sql(mutation)

    quote = '44444444-4444-4444-8444-444444444441'
    seed_quote(quote, personalized=True)
    result = actor(f"SELECT row_to_json(x) FROM public.convert_quote_to_sicoob_order('{quote}') x;").stdout.strip()
    order = json.loads(result)
    checks['converte_para_dominio_sicoob'] = order['status'] == 'pending' and order['total_amount'] == 100
    checks['copia_itens_e_snapshot'] = scalar(f"SELECT count(*)||'|'||COALESCE(product_id::text,'externo')||'|'||(personalization_snapshot->'personalizations'<> '[]'::jsonb)::text FROM public.sicoob_order_items WHERE order_id='{order['id']}' GROUP BY product_id,personalization_snapshot;") == '1|externo|true'
    checks['congela_origem_e_hierarquia'] = scalar(f"SELECT source_quote_id::text||'|'||pa_id::text||'|'||cooperative_id::text||'|'||requires_artwork::text FROM public.sicoob_orders WHERE id='{order['id']}';") == f'{quote}|{PA}|{COOP}|true'
    checks['marca_orcamento_convertido'] = scalar(f"SELECT status FROM public.quotes WHERE id='{quote}';") == 'converted'
    repeated = json.loads(actor(f"SELECT row_to_json(x) FROM public.convert_quote_to_sicoob_order('{quote}') x;").stdout.strip())
    checks['repeticao_idempotente'] = repeated['id'] == order['id'] and scalar(f"SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='{quote}';") == '1'
    sql(f"UPDATE public.profiles SET is_active=false WHERE user_id='{ACTOR}';")
    checks['perfil_inativo_nao_acessa_conversao_idempotente'] = actor(f"SELECT * FROM public.convert_quote_to_sicoob_order('{quote}');", check=False).returncode != 0
    sql(f"UPDATE public.profiles SET is_active=true WHERE user_id='{ACTOR}';")
    blocked_art = sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{order['id']}';", check=False)
    checks['personalizado_exige_arte'] = blocked_art.returncode != 0 and 'arte precisa estar aprovada' in blocked_art.stderr
    sql(f"INSERT INTO public.sicoob_order_artwork_versions(order_id,is_latest,status) VALUES ('{order['id']}',true,'approved');")
    checks['arte_aprovada_libera_fluxo'] = sql(f"UPDATE public.sicoob_orders SET status='logistic' WHERE id='{order['id']}';").returncode == 0

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
    checks['acl_authenticated_sem_anon'] = scalar("SELECT has_function_privilege('authenticated','public.convert_quote_to_sicoob_order(uuid)','EXECUTE')::text||'|'||has_function_privilege('anon','public.convert_quote_to_sicoob_order(uuid)','EXECUTE')::text;") == 'true|false'

    draft = '55555555-5555-4555-8555-555555555551'
    product = '66666666-6666-4666-8666-666666666661'
    sql(f"INSERT INTO public.sicoob_orders(id,created_by,status,total_amount) VALUES ('{draft}','{ACTOR}','draft',0);")
    total = actor(f"SELECT public.mutate_sicoob_order_item('{draft}','add',NULL,'{product}','Produto',2,25);").stdout.strip()
    checks['item_e_total_numa_transacao'] = total == '50' and scalar(f"SELECT total_amount::text||'|'||count(*)::text FROM public.sicoob_orders o JOIN public.sicoob_order_items i ON i.order_id=o.id WHERE o.id='{draft}' GROUP BY o.total_amount;") == '50|1'
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
