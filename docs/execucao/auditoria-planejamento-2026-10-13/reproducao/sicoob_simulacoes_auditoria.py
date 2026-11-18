import sys, json, re
from pathlib import Path
sys.path.insert(0,'/tmp')
from sicoob_audit_20261013 import ROOT,OUT
sys.path.insert(0,str(ROOT/'scripts/qa'))

# Reutiliza a fixture existente em contêiner efêmero, acrescentando o trigger
# real omitido pelo cenário original. O restante do projeto fica intacto.
for name, marker in [('simular-conversao-pedido-sicoob.py','    result = actor('),('simular-aprovacao-publica.py','    hardened_response = actor(')]:
    source=(ROOT/'scripts/qa'/name).read_text()
    source=source.replace("ROOT = Path(__file__).resolve().parents[2]", 'ROOT = Path('+repr(str(ROOT))+')')
    if name.startswith('simular-conversao'):
        statement="SELECT * FROM public.convert_quote_to_sicoob_order('"+'{quote}'+"');"
        count="SELECT count(*) FROM public.sicoob_orders WHERE source_quote_id='"+'{quote}'+"';"
    else:
        statement="SELECT public.submit_signed_quote_response('hmac-valido','approved','Pessoa Teste','12345678901','"+'{SIGNATURE}'+"','203.0.113.10','navegador-teste');"
        count="SELECT count(*) FROM public.quote_approval_tokens WHERE token='hmac-valido' AND responded_at IS NOT NULL;"
    insertion='''    sql("ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS approved_pdf_url text, ADD COLUMN IF NOT EXISTS rejection_notes text, ADD COLUMN IF NOT EXISTS organization_id uuid, ADD COLUMN IF NOT EXISTS pa_id uuid, ADD COLUMN IF NOT EXISTS singular_id uuid;")
    sql(Path('/home/joaquim_ataides/auditorias/sicoob-2026-10-13/guard_quote_governance_write.sql').read_text())
    sql("CREATE TRIGGER aaa_guard_quote_governance_write BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_governance_write();")
'''
    role_arg=", role='service_role'" if name.startswith('simular-aprovacao') else ''
    insertion+=f'''    observed = actor(f"{statement}"{role_arg}, check=False)
    result={{'cenario':{name!r},'ambiente':'PostgreSQL 16 descartável sem rede','fixture':'fixture versionada + trigger coletado do canônico em 13/10','falhou_com_guard':observed.returncode!=0,'erro':observed.stderr.strip(),'efeitos_persistidos':sql(f"{count}").stdout.strip()}}
    Path({str(OUT/(name+'.json'))!r}).write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print(json.dumps(result,ensure_ascii=False))
    raise SystemExit(0)
'''
    source=source.replace(marker,insertion+marker,1)
    try:
        exec(compile(source,str(ROOT/'scripts/qa'/name),'exec'),{'__name__':'__main__','__file__':str(ROOT/'scripts/qa'/name)})
    except SystemExit as e:
        if e.code: raise
