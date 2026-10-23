import json, subprocess, time
from pathlib import Path

OUT=Path('/home/joaquim_ataides/auditorias/sicoob-2026-10-13')
nome='sicoob-auditoria-rls-20261013'
def executar(args, **kw):
    return subprocess.run(args, text=True, capture_output=True, **kw)
def sql(texto):
    r=executar(['docker','exec','-i',nome,'psql','-h','127.0.0.1','-X','-v','ON_ERROR_STOP=1','-U','postgres','-At'],input=texto)
    if r.returncode: raise RuntimeError(r.stderr)
    return r.stdout.strip()

try:
    r=executar(['docker','run','--rm','-d','--network','none','--name',nome,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:16-alpine'])
    if r.returncode: raise RuntimeError(r.stderr)
    for _ in range(60):
        if executar(['docker','exec',nome,'pg_isready','-h','127.0.0.1','-U','postgres']).returncode==0: break
        time.sleep(0.3)
    sql('''CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TYPE public.app_role AS ENUM ('admin','gestor_compras','gerente_pa');
CREATE TABLE profiles(id uuid, user_id uuid, cooperativa_id uuid, pa_id uuid,is_active boolean,deleted_at timestamptz);
CREATE TABLE user_roles(user_id uuid,role app_role);
CREATE TABLE postos_atendimento(id uuid,cooperativa_id uuid);
CREATE TABLE pa_budgets(id uuid PRIMARY KEY,pa_id uuid NOT NULL,ano integer NOT NULL,mes integer NOT NULL,verba_total numeric NOT NULL DEFAULT 0,verba_consumida numeric NOT NULL DEFAULT 0,limite_alcada numeric,observacoes text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT USAGE ON SCHEMA public,auth TO authenticated;
GRANT SELECT ON profiles,user_roles,postos_atendimento TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON pa_budgets TO authenticated;
ALTER TABLE pa_budgets ENABLE ROW LEVEL SECURITY;
''')
    fns=json.loads((OUT/'bd-funcoes.json').read_text())
    needed={'sicoob_actor_is_active','has_role','is_gerente_pa','is_gestor_compras','current_user_cooperativa_id','current_user_pa_id'}
    for name in ['sicoob_actor_is_active','has_role','is_gerente_pa','is_gestor_compras','current_user_cooperativa_id','current_user_pa_id']:
        sql(next(f['definition'] for f in fns if f['proname']==name))
    for p in json.loads((OUT/'bd-policies.json').read_text()):
        if p['tablename']!='pa_budgets': continue
        cmd='CREATE POLICY "'+p['policyname']+'" ON public.pa_budgets FOR '+p['cmd']+' TO '+p['roles'].strip('{}')
        if p['qual']: cmd+=' USING ('+p['qual']+')'
        if p['with_check']: cmd+=' WITH CHECK ('+p['with_check']+')'
        sql(cmd+';')
    uid1='00000000-0000-0000-0000-000000000001'
    uid2='00000000-0000-0000-0000-000000000002'
    pa1='00000000-0000-0000-0000-000000000011'
    pa2='00000000-0000-0000-0000-000000000012'
    coop1='00000000-0000-0000-0000-000000000021'
    coop2='00000000-0000-0000-0000-000000000022'
    sql(f"""INSERT INTO profiles VALUES ('{uid1}','{uid1}','{coop1}','{pa1}',true,null),('{uid2}','{uid2}','{coop1}','{pa1}',true,null);
INSERT INTO user_roles VALUES ('{uid1}','gestor_compras'),('{uid2}','gerente_pa');
INSERT INTO postos_atendimento VALUES ('{pa1}','{coop1}'),('{pa2}','{coop2}');
INSERT INTO pa_budgets(id,pa_id,ano,mes,verba_total,limite_alcada) VALUES ('{pa1}','{pa1}',2026,10,1000,500),('{pa2}','{pa2}',2026,10,1000,500);""")
    def como(uid, comando):
        return sql(f"SET ROLE authenticated; SET request.jwt.claim.sub='{uid}'; "+comando).splitlines()[2:]
    resultados={
        'ambiente':'PostgreSQL 16 descartável sem rede; tabelas mínimas sintéticas; policies e helpers exatos do canônico',
        'gestor_le_budgets_duas_cooperativas':como(uid1,'SELECT count(*) FROM pa_budgets;'),
        'gestor_altera_budget_outra_cooperativa':como(uid1,f"UPDATE pa_budgets SET verba_total=9000 WHERE pa_id='{pa2}' RETURNING verba_total;"),
        'gerente_aumenta_proprio_limite':como(uid2,f"UPDATE pa_budgets SET limite_alcada=99999 WHERE pa_id='{pa1}' RETURNING limite_alcada;")
    }
    sql(f"UPDATE profiles SET is_active=false WHERE user_id='{uid1}';")
    resultados['gestor_inativo_ainda_le_duas_cooperativas']=como(uid1,'SELECT count(*) FROM pa_budgets;')
    resultados['has_role_inativo_rejeita_mas_helper_permite']=como(uid1,"SELECT has_role(auth.uid(),'gestor_compras'), is_gestor_compras();")
    (OUT/'simulacao-rls-verbas.json').write_text(json.dumps(resultados,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(resultados,ensure_ascii=False))
    sql('CREATE TABLE custom_kits(id uuid DEFAULT gen_random_uuid(),status text);')
    sql(next(f['definition'] for f in fns if f['proname']=='validate_status_fields'))
    sql('CREATE TRIGGER validate_status_fields BEFORE INSERT OR UPDATE ON custom_kits FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();')
    invalido=executar(['docker','exec','-i',nome,'psql','-h','127.0.0.1','-X','-v','ON_ERROR_STOP=1','-U','postgres','-At'],input="INSERT INTO custom_kits(status) VALUES ('complete');")
    valido=sql("INSERT INTO custom_kits(status) VALUES ('ready') RETURNING status;")
    kit={'ambiente':'PostgreSQL 16 isolado, fixture mínima com trigger remoto vigente','status_enviado_pelo_frontend':'complete','rejeitado':invalido.returncode!=0,'erro':invalido.stderr.strip(),'controle_positivo_ready':valido,'linhas_persistidas':sql('SELECT count(*) FROM custom_kits;')}
    (OUT/'simulacao-status-kit.json').write_text(json.dumps(kit,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(kit,ensure_ascii=False))
finally:
    executar(['docker','rm','-f',nome])
