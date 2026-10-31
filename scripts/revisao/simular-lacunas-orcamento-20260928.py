"""Sonda local: resultados positivos reproduzem lacunas, não aprovam o produto."""
import json
from pathlib import Path
import subprocess
import sys
import uuid

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/qa'))
from postgres_ready import wait_for_postgres

container = 'auditoria-orcamento-' + uuid.uuid4().hex[:10]

def command(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)

def sql(text):
    result = command(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], stdin=text)
    return [line for line in result.stdout.splitlines() if line not in ('SET', 'RESET')][-1]

def salvar(quote_id=None, version=None):
    header = {'organization_id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'subtotal': 20, 'total': 20, 'total_cost': 0}
    items = [{'product_id': 'p1', 'product_name': 'Caneca sintética', 'quantity': 2, 'unit_price': 10, 'personalizations': []}]
    qid = 'NULL' if quote_id is None else "'" + str(uuid.UUID(quote_id)) + "'::uuid"
    v = 'NULL' if version is None else str(int(version))
    return json.loads(sql("SET ROLE authenticated; SET request.jwt.claim.sub='11111111-1111-4111-8111-111111111111'; SELECT public.save_quote_atomic($q$" + json.dumps(header) + "$q$::jsonb,$i$" + json.dumps(items) + "$i$::jsonb," + qid + ',' + v + "); RESET ROLE;"))

try:
    command(['docker', 'run', '--rm', '-d', '--name', container, '--network', 'none', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17-alpine'])
    wait_for_postgres(command, container)
    sql((ROOT / 'tests/scenarios/sql/quote-atomic-save-fixture.sql').read_text())
    sql((ROOT / 'supabase/migrations/20260927190000_atomic_quote_save.sql').read_text())
    primeira = salvar()
    repetida = salvar()
    assert primeira['id'] != repetida['id']
    quote_id = primeira['id']
    antes = sql(f"SELECT id FROM public.quote_items WHERE quote_id='{quote_id}';")
    salvar(quote_id, primeira['row_version'])
    depois = sql(f"SELECT id FROM public.quote_items WHERE quote_id='{quote_id}';")
    assert antes != depois
    print(json.dumps({'ambiente': 'PostgreSQL 17 descartável sem rede; fixture mínima', 'banco_remoto_testado': False, 'sondas_reproduzidas': ['Repetir a criação com o mesmo payload gera dois orçamentos distintos.', 'Salvar novamente o mesmo item troca sua identidade no banco.'], 'limite': 'Não simula todas as FKs/policies do canônico nem comprova perda remota de vínculos.'}, ensure_ascii=False))
finally:
    command(['docker', 'rm', '-f', container], check=False)
