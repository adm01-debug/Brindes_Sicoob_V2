#!/usr/bin/env python3
"""Reproduz os gatilhos versionados em banco descartável, sem rede e sem dados reais."""
from pathlib import Path
import subprocess, json, uuid
from postgres_ready import wait_for_postgres
container = 'sicoob-verba-' + uuid.uuid4().hex[:10]
ROOT = Path(__file__).resolve().parents[2]
def run(args, *, stdin=None, check=True):
    return subprocess.run(args, input=stdin, text=True, capture_output=True, check=check)
def sql(text):
    return run(['docker','exec','-i',container,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],stdin=text).stdout.strip()
try:
    run(['docker','run','--rm','-d','--name',container,'--network','none','-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17.6-alpine'])
    wait_for_postgres(run, container)
    sql((ROOT / 'tests/scenarios/sql/verba-base.sql').read_text())
    migrations = ROOT / 'supabase/migrations'
    old = migrations/'20260502152357_35e058ba-a7e7-43e4-80a4-a67de8324edf.sql'
    second = migrations/'20260503214537_09eeff12-930b-4f92-a558-752c279e8ee9.sql'
    latest = migrations/'20260503214557_f7ee25b6-d301-487d-9004-564116dc4100.sql'
    sql(old.read_text())
    sql(second.read_text().split('-- RPC para o frontend')[0])
    sql(latest.read_text().split('CREATE OR REPLACE FUNCTION public.check_budget_availability')[0])
    sql("UPDATE sicoob_orders SET status='confirmed' WHERE id='00000000-0000-4000-8000-000000000002';")
    used = float(sql('SELECT verba_consumida FROM pa_budgets;'))
    sql("UPDATE sicoob_orders SET status='cancelled' WHERE id='00000000-0000-4000-8000-000000000002';")
    remaining = float(sql('SELECT verba_consumida FROM pa_budgets;'))
    result={'ambiente':'PostgreSQL 17.6 descartável, --network none; somente dados sintéticos','fontes':[str(old.relative_to(ROOT)),str(second.relative_to(ROOT)),str(latest.relative_to(ROOT))],'pedido':100,'debito_esperado':100,'debito_observado':used,'consumido_apos_cancelamento_esperado':0,'consumido_apos_cancelamento_observado':remaining,'falha_reproduzida':used != 100 or remaining != 0,'producao_verificada':False}
    assert result['falha_reproduzida'], 'A falha esperada não foi reproduzida; revisar diagnóstico'
    Path('docs/execucao/evidencias/verba-legada.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
finally:
    subprocess.run(['docker','rm','-f',container],capture_output=True)
