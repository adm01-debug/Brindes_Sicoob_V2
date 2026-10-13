import csv,json,re,collections,hashlib,subprocess,html,shutil
from pathlib import Path
from sicoob_audit_20261013 import ROOT,OUT
from sicoob_mapeamentos_20261013 import COMPLEMENTOS

SHA='fff0b4cb60b23715661d5782cdf747df4ef0027d'
BASE='https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/'+SHA+'/'
ANEXOS=ROOT/'docs/execucao/lacunas-funcionalidades-2026-10-11'
def ler(n): return json.loads((OUT/n).read_text())
def gravar_csv(nome,linhas):
    if not linhas:return
    with (OUT/nome).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(linhas[0]),delimiter=';');w.writeheader()
        for r in linhas:
            w.writerow({k:json.dumps(v,ensure_ascii=False) if isinstance(v,(list,dict)) else v for k,v in r.items()})
def url(ref):
    m=re.match(r'(.+?):(\d+)$',ref)
    if m: path,linha=m.groups()
    else:path,linha=ref,None
    if (ROOT/path).exists(): return BASE+path+('#L'+linha if linha else '')
    return ref
def link(ref):return '['+ref+']('+url(ref)+')'
def cell(s):return str(s).replace('|','\\|').replace('\n',' ')

achados=ler('achados-consolidados.json')
for a in achados:
    a['origens']=list(dict.fromkeys(a['origens']+COMPLEMENTOS.get(a['id'],'').split()))
    if a['id']=='G11':
        a['nivel_prova']='Reproduzido executando os predicados reais com dados sintéticos'
        a['evidencias'].insert(0,'simulacao-filtros.json')
        a['diagnostico']+=' A execução isolada confirmou os sete filtros sem efeito; o controle positivo de busca por nome reduziu os resultados.'
    if a['id']=='G13':
        a['nivel_prova']='Reproduzido em PostgreSQL descartável com trigger remoto'
        a['evidencias'].insert(0,'simulacao-status-kit.json')
    if a['id']=='G34':
        a['diagnostico']+=' Preferências/feature flags e abas do CMS também têm consumidores incompletos; controles anunciados precisam demonstrar efeito no site, e não apenas salvar configuração.'
(OUT/'achados-consolidados.json').write_text(json.dumps(achados,ensure_ascii=False,indent=2)+'\n')
gravar_csv('achados-consolidados.csv',achados)

originais=list(csv.DictReader((ANEXOS/'indice-lacunas.csv').open(encoding='utf-8-sig'),delimiter=';'))
assert len(originais)==682 and len({r['id'] for r in originais})==682
textos={p.name:p.read_text() for p in ANEXOS.glob('*.md')}
correcoes={
 'PLC-01':('ATUALIZADO','Há execuções recentes aprovadas; startup_failure de 08/10 é histórico, não bloqueio geral atual.'),
 'QA-31':('ATUALIZADO','CodeQL tem execução recente aprovada. Upload e política devem ser avaliados pelo resultado atual, não pelo erro antigo.'),
 'QA-19':('CORREÇÃO DE DIAGNÓSTICO','Há gate final que falha se e2e_run.outcome=failure. continue-on-error intermediário não engole a falha; permanece a revisão de shards vazios.'),
 'PLC-09':('PARCIAL COM ENTREGAS','Actions já estão fixadas por SHA e há scanners. Não classificar todo o endurecimento como não iniciado.'),
 'QA-35':('PARCIAL COM ENTREGAS','SHA pinning e scanners existem. Lacunas remanescentes não significam supply chain inteiramente não iniciada.'),
 'ADM-42':('PARCIAL; PREMISSA ATUALIZADA','Existem credenciais do CRM no cofre da aplicação. Ausência de variável de ambiente não prova ausência de configuração. Rota/integração ainda exigem fechamento.'),
 'DOC-06':('PARCIAL; CONFIGURAÇÃO CONFERIDA','Signup desativado, autoconfirmação desativada e TOTP habilitado. HIBP/CAPTCHA/SSO desativados; callbacks exigem revisão.'),
 'PLA-T006':('ACESSO DE LEITURA COMPROVADO','Management API funcionou via token local. O usuário SQL é supabase_read_only_user em consultas read_only. Escrita administrativa não foi ensaiada; não permanece bloqueio geral de leitura.'),
 'DB-25':('CONFIRMADO NO BANCO','Publicação supabase_realtime sem tabelas, puballtables=false; consumidores Postgres Changes presentes.'),
 'DB-01':('CONFIRMADO; INTERPRETAÇÃO DELIMITADA','491 diferenças conhecidas na baseline, zero novas. Não equivalem a 491 migrations a aplicar.'),
 'PLC-24':('CONFIRMADO; INTERPRETAÇÃO DELIMITADA','Ledger atual mantém baseline de 491 diferenças. Conferir efeito real antes de reparar/aplicar.'),
 'QA-11':('PARCIAL; MÉTRICA HISTÓRICA','A contagem 2/677 pertence ao levantamento anterior. Falha E2E recente consultada é preflight por secrets no Dependabot; não é nova execução funcional completa.'),
 'QA-57':('CONFIRMADO COM REDAÇÃO CORRIGIDA','enforce_admins=false permite bypass; não prova que todo merge efetivamente utilizou bypass.'),
 'PLC-32':('CAPACIDADE A CONFIRMAR','Há 100 funções ativas; seis fontes têm decisão de não publicação. Contagem não comprova plano comercial nem necessidade de upgrade.'),
 'EDG-55':('PARCIAL; DECISÃO DE PUBLICAÇÃO EXISTE','106 fontes/100 publicadas com seis exclusões documentadas. Conferir recurso necessário e contrato do plano, sem inferir compra obrigatória.'),
 'FE-170':('PARCIAL; INSTALAÇÃO NÃO CERTIFICADA','Rota /instalar ausente e manifest.webmanifest retorna HTML. Há teste histórico de SW/offline; não declarar toda a PWA inexistente com base somente nessa URL.'),
 'QA-30':('PARCIAL; URL E ARTEFATO A CONFERIR','Inspecionar manifest realmente referenciado no artefato publicado. Teste HTTP de uma URL não é teste integral de instalação.'),
 'PLA-T013':('PARCIAL COM SANEAMENTO','Relatório do código atual registra zero erros TS/lint/audit em 08/10; 872 avisos e critérios funcionais permanecem. Não repetir baseline anterior como atual.'),
 'DB-03':('EFEITO EXIGE REVALIDAÇÃO','35 efeitos ausentes são classificação histórica, não recontagem independente desta rodada. Ledger sem registro sozinho não comprova ausência do efeito.'),
 'QA-33':('CONFIRMADO HTTP','Relatório Markdown público recuperado sem autenticação; são 14 arquivos Markdown no public, não 14 PDFs públicos.'),
}
catalogo={'PLA-X01','PLC-47','EDG-05','ADM-02','DOC-20'}
escopo={'DOC-13','DOC-16','DOC-22','DOC-44','DOC-56','FE-161','ADM-20','DB-30','DB-15','EDG-33','PLA-D01','PLA-D06','PLA-D07','PLA-D08','PLA-D09'}
for id in catalogo:correcoes[id]=('PARCIAL NA UI; LEITURA É REQUISITO','CATALOG_READ_ONLY é correto. Corrigir/remover formulários de escrita; não habilitar escrita no banco mestre externo.')
for id in escopo:correcoes[id]=('DECISÃO DE ESCOPO / LEGADO','Há conflito de escopo ou decisão pendente. Não somar automaticamente como implementação obrigatória; conservar rastreabilidade e retirar promessas incompatíveis.')
correcoes['EDG-50']=('CONTRATO A DECIDIR','Expor quatro ferramentas de leitura não é automaticamente defeito; o MCP interno e o gateway externo são serviços distintos. A auditoria atual acessou o banco via Management API. Não ampliar permissões apenas para igualar contagem de ferramentas.')
correcoes['QA-53']=('PROPOSTA / RECURSO NÃO OPERACIONAL','Template Terraform não aplicável não demonstra requisito obrigatório de implantar infraestrutura como código. Validar a decisão/contrato antes de incluir como escopo de correção.')
correcoes['QA-04']=('ALEGAÇÃO HISTÓRICA A DELIMITAR','A falha de secrets num PR Dependabot não prova inexistência de contas/personas. O fechamento de 08/10 registra provisionamento; conferir a suíte, identidade e ambiente específicos.')
por_id=collections.defaultdict(list)
for a in achados:
    for id in a['origens']:por_id[id].append(a)
    for etapa in a['etapas']:
        id='PLA-'+etapa
        if a not in por_id[id]:por_id[id].append(a)
registros=[];refs_totais=[];sem_secao=[]
padrao_ref=re.compile(r'(?:src|supabase|scripts|tests|e2e|docs|\.github|public)/[A-Za-z0-9_./@+\-]+\.(?:tsx?|jsx?|mjs|cjs|py|sql|md|json|ya?ml|toml|csv)(?::\d+(?:[-–,]\d+)?)?')
for r in originais:
    txt=textos[r['anexo']]
    m=re.search(r'^#{2,6}[^\n]*\b'+re.escape(r['id'])+r'\b[^\n]*$',txt,re.M)
    trecho='';ln=None
    if m:
        inicio=m.start();ln=txt[:inicio].count('\n')+1
        prox=re.search(r'^#{2,6}\s',txt[m.end():],re.M)
        fim=m.end()+prox.start() if prox else len(txt);trecho=txt[inicio:fim]
    else:sem_secao.append(r['id'])
    refs=list(dict.fromkeys(padrao_ref.findall(trecho)))
    presentes=[];ausentes=[]
    for ref in refs:
        p=ref.split(':')[0]
        (presentes if (ROOT/p).exists() else ausentes).append(ref)
        refs_totais.append({'id':r['id'],'referencia':ref,'arquivo_existe':(ROOT/p).exists()})
    gs=por_id.get(r['id'],[])
    parecer='CANDIDATO HISTÓRICO PRESERVADO'
    comentario='Fonte de código permanece igual ao SHA revisado em 11/10; isso preserva a base estática, mas não certifica a conclusão nem o comportamento remoto. Ver evidências e ressalvas do grupo e do relatório.'
    if gs:
        parecer='RELACIONADO À FRENTE ATUAL'
        comentario='; '.join(a['id']+': '+a['estado']+'; '+a['nivel_prova'] for a in gs)
    if r['id'] in correcoes:parecer,comentario=correcoes[r['id']]
    for id,grupo in [('SIC-021','G01'),('SIC-040','G02'),('SIC-060','G03'),('FE-020','G11')]:
        if r['id']==id:parecer='FALHA REPRODUZIDA';comentario='Ver '+grupo+' e artefato de simulação de 13/10; nenhum dado remoto foi alterado.'
    if r['id']=='EDG-32':parecer='CONFIRMADO NO BUNDLE PUBLICADO';comentario='Handler obtido por leitura do Management API; nenhum usuário foi confirmado durante a auditoria.'
    anexo='docs/execucao/lacunas-funcionalidades-2026-10-11/'+r['anexo']
    r=dict(r)
    r['o_que_falta_historico']=r['o_que_falta']
    if r['id'] in correcoes:
        r['o_que_falta']='Usar a atualização de 13/10 antes de executar o encaminhamento histórico: '+comentario
    registros.append({**r,'parecer_20261013':parecer,'ressalva_ou_atualizacao':comentario,'frentes_consolidadas':' '.join(a['id'] for a in gs),'url_origem':BASE+anexo+('#L'+str(ln) if ln else ''),'referencias_existentes':presentes,'referencias_nao_resolvidas':ausentes,'validacao_dinamica_integral':'Não; ver nível de prova delimitado por frente'})
gravar_csv('revisao-682-registros.csv',registros)
gravar_csv('referencias-dos-achados.csv',refs_totais)
(OUT/'revisao-682-registros.json').write_text(json.dumps(registros,ensure_ascii=False,indent=2)+'\n')

inventario=ler('inventario-repositorio.json');documentos=ler('inventario-documentos.json')
gravar_csv('cobertura-repositorio.csv',[{k:f.get(k,'') for k in ['arquivo','bytes','sha256','extensao','metodo','linhas']} for f in inventario])
contagem=collections.Counter(x['arquivo'] for x in ler('marcadores-documentacao.json'))
docrows=[]
for f in documentos:
    nome=f['arquivo']
    tipo='Documento de apoio'
    if any(x in nome for x in ['plano','PLANO','ROADMAP','backlog']):tipo='Planejamento / requisitos'
    if any(x in nome.lower() for x in ['audit','revisao','execucao','evidencia','reports']):tipo='Auditoria / execução / evidência histórica'
    if '/adr/' in nome:tipo='Decisão arquitetural; verificar estado da ADR'
    revisao='Conteúdo integral extraído/indexado; cruzamento de marcadores e referências. Não equivale a validar toda afirmação.'
    if f['metodo']=='binario-inventariado':revisao='Imagem aberta e inspecionada visualmente; evidência histórica, não captura atual de operação.'
    docrows.append({'arquivo':nome,'classificacao':tipo,'metodo':f['metodo'],'linhas':f.get('linhas',''),'sha256':f['sha256'],'marcadores':contagem[nome],'checks_abertos':f.get('checks_abertos',0),'checks_fechados':f.get('checks_fechados',0),'alcance_da_revisao':revisao,'url':BASE+nome})
gravar_csv('cobertura-documentos.csv',docrows)

plano=json.loads((ROOT/'docs/plano-implementacao/plano-encerramento-100-etapas-20261001/plano.json').read_text())
etapas=[];subetapas=[]
tecnicas={'T025','T027','T029','T031','T032','T034','T062','T068'}
for e in plano['etapas']:
    grupos=[a for a in achados if e['id'] in a['etapas']]
    orig=next((r for r in registros if r['id']=='PLA-'+e['id']),None)
    estado=orig['status'] if orig else 'IMPLEMENTAÇÃO TÉCNICA HISTÓRICA; ACEITE NÃO ENCERRADO'
    if e['id']=='T032':estado='PARCIAL: ESCRITORES AINDA CONFLITAM COM GUARD'
    if e['id']=='T006':estado='LEITURA ADMINISTRATIVA COMPROVADA; ESCRITA NÃO ENSAIADA'
    etapas.append({'etapa':e['id'],'titulo':e['titulo'],'fase':e['fase'],'estado_formal_no_plano':e['estado'],'classificacao_de_partida':estado,'ressalva':'8 etapas eram tecnicamente concluídas na auditoria anterior; a revisão de T032 encontrou conflito reproduzido.' if e['id'] in tecnicas else 'Situação formal e implementação são dimensões distintas.','origens':e['origens'],'frentes_atuais':[a['id'] for a in grupos],'o_que_falta':orig['o_que_falta'] if orig else e['aceite_especifico'],'criterio_de_aceite':e['aceite_especifico'],'responsavel_nominal':e.get('responsavel_nominal'),'revisor_nominal':e.get('revisor_nominal'),'evidencias_no_plano':e['evidencias'],'aceite_integral_nesta_auditoria':False})
    for s in e['checklist']:
        subetapas.append({'etapa':e['id'],'subetapa':s['id'],'acao_planejada':s['acao'],'marcada_concluida_no_plano':s['concluido'],'evidencia_no_plano':s['evidencia'],'frentes_atuais':[a['id'] for a in grupos],'interpretacao':'Ausência de aceite formal não prova ausência de código; consultar matriz de etapas e provas por frente.'})
assert len(etapas)==100 and len(subetapas)==1000
gravar_csv('matriz-100-etapas.csv',etapas);gravar_csv('checklist-1000-subetapas.csv',subetapas)
(OUT/'matriz-100-etapas.json').write_text(json.dumps(etapas,ensure_ascii=False,indent=2)+'\n')

resumo={'data':'2026-10-13','sha':SHA,'arquivos_versionados':len(inventario),'arquivos_em_docs':sum(f['arquivo'].startswith('docs/') for f in inventario),'documentos_ampliados':len(documentos),'frentes_consolidadas':len(achados),'registros_historicos_preservados':len(registros),'registros_com_atualizacao_explicita':len(correcoes),'registros_com_grupo_atual':sum(bool(r['frentes_consolidadas']) for r in registros),'secoes_historicas_nao_localizadas':sem_secao,'referencias_extraidas':len(refs_totais),'referencias_nao_resolvidas':sum(not r['arquivo_existe'] for r in refs_totais),'etapas':len(etapas),'subetapas':len(subetapas),'leitura_db':'Management API com read_only=true','alteracao_remota':False,'suite_completa_reexecutada':False}
(OUT/'resumo-auditoria.json').write_text(json.dumps(resumo,ensure_ascii=False,indent=2)+'\n')

cabecalho='''# Auditoria de funcionalidades planejadas — Brindes Sicoob V2

**Data:** 13/10/2026. **Referência GitHub:** `fff0b4cb60b23715661d5782cdf747df4ef0027d` (main). **Banco consultado:** `cfmzkthhgliqelozlmwu`. **Ambiente:** construção, conforme informado pelo responsável.

**Conclusão: o planejamento ainda não está integralmente implementado.** Existem entregas técnicas aproveitáveis, funcionalidades parciais, componentes sem integração, configurações ausentes, conflitos de escopo e falhas reais em operações centrais. Não é correto dizer que falta apenas autorizar o piloto, aguardar 30 dias ou marcar checklists.

## Como ler esta auditoria

- [56 frentes consolidadas em CSV](achados-consolidados.csv): diagnóstico, prioridade, evidências, etapas relacionadas e o que falta. São agrupamentos de trabalho; um grupo pode conter várias lacunas.
- [682 registros históricos reconciliados](revisao-682-registros.csv): preserva TODOS os itens do levantamento de 11/10, acrescentando ressalvas/atualizações. Não são 682 defeitos únicos confirmados: há duplicidade entre planos, dependências de negócio, propostas e itens superados. Registros apenas preservados estão explicitamente identificados.
- [Matriz das 100 etapas](matriz-100-etapas.csv) e [1.000 subetapas](checklist-1000-subetapas.csv): mantêm requisito, aceite esperado, estado documental e ligação com os achados. Checklist vazio não equivale a código ausente.
- [Cobertura de 511 documentos](cobertura-documentos.csv) e [inventário de 4.038 arquivos](cobertura-repositorio.csv): caminho, hash e método, incluindo todos os 463 arquivos de docs. Foram extraídos os 14 PDFs e todas as planilhas do XLSX; as dez imagens documentais foram abertas e inspecionadas.
- [Consulta pesquisável offline](consulta.html): filtros por texto, prioridade e camada de levantamento.

## Alcance e limites verificáveis

O inventário leu integralmente os arquivos versionados para extração de texto, hashes, referências e marcadores. A inspeção semântica concentrou-se nos planos, trilhas de execução, contratos e fluxos com evidência de lacuna, cruzando a auditoria anterior com o código atual. **Inventário integral não significa revisão humana linha a linha de todas as 4.038 unidades nem homologação dinâmica de cada funcionalidade.** A coluna de nível de prova evita essa confusão. Não atribuo nota 10/10 ou percentual de produto concluído.

A revisão cobre os planos original de 100 etapas, de 150, de encerramento de 100, de workflows de 100, planos de 50 etapas, benchmark/backlog, ADRs, guias funcionais, schema, rotas, funções, testes e relatórios históricos. Não foi localizado diff de código em src/supabase/scripts/tests/e2e/.github entre o fechamento técnico dc08200 e a referência auditada: o commit posterior acrescentou a auditoria. Isso permite reaproveitar rastreabilidade estática, mas não torna provas antigas equivalentes a novas execuções.

O checkout original foi preservado: encontra-se 66 commits atrás da main consultada, tem quatro arquivos alterados e documentos locais não rastreados. AUDITORIA.md e PLANO_100.md locais foram lidos separadamente; este último contém 36 etapas, apesar do nome. Seus diagnósticos não foram adicionados automaticamente como 36 defeitos novos, pois se referem a outra base. Não foram auditados semanticamente todos os worktrees históricos, todos os dados de negócio, todos os binários externos ou serviços de terceiros. O catálogo mestre externo permanece somente leitura; sua ACL de origem não foi certificada nesta rodada.

As consultas remotas foram somente leitura. Os MCPs disponíveis recusaram acesso, mas o token da CLI local permitiu consultar o Management API com read_only=true, sem depender do MCP. Não foram aplicadas migrations, alteradas contas, confirmados e-mails, disparadas mensagens, feitos deploys ou modificados dados do banco. A API de leitura não comprova por si só autorização operacional de escrita. Não se publicou qualquer segredo.

## Evidências atuais e reproduções

| Verificação | Resultado | Evidência |
|---|---|---|
| Conversão orçamento → pedido, com o guard vigente | Falhou: alteração de governança recusada; zero pedidos persistidos | [simulação](simular-conversao-pedido-sicoob.py.json) |
| Aprovação pública com assinatura válida na fixture e guard vigente | Falhou: alteração de governança recusada; zero respostas persistidas | [simulação](simular-aprovacao-publica.py.json) |
| Chave HMAC no banco atual | Uma chave ativa; zero correspondências no Vault | [consulta agregada](bd-hmac-pronto.json) |
| Verbas de duas cooperativas | Gestor consultou ambas e alterou a de outra; gerente elevou o próprio limite; gestor inativo continuou lendo | [simulação RLS](simulacao-rls-verbas.json) |
| Sete filtros de produto | Contador ativo = 1, conjunto de resultados inalterado; busca por nome funcionou como controle positivo | [simulação dos predicados reais](simulacao-filtros.json) |
| Supabase Realtime | Publicação sem tabelas, sem puballtables | [publicação](bd-publication-config.json) |
| Worker de aprovação | 620 falhas / 1.440 execuções na janela de 24h, por request_id duplicado | [cron](bd-cron-falhas-agrupadas.json) |
| Ledger atual | 491 diferenças conhecidas, zero novas e zero resolvidas | [comparação](ledger-comparado.json) |
| Confirmação alternativa de e-mail | Bundle remoto contém uso de UUID como token seguido de confirmação administrativa; nenhuma conta foi modificada para provar isso | [metadados/hash](edge-verify-email-paridade.json) |
| GitHub | Main sem checks obrigatórios; E2E de Dependabot falhou por secrets; outros workflows executam com sucesso | [proteção](github-protecao.json), [falha delimitada](github-e2e-falha-resumo.json) |
| HTTP público | Raiz sem CSP/nosniff; relatório interno Markdown acessível; URL de manifest consultada entrega HTML | [respostas](http-publico.json) |

As simulações de banco usaram PostgreSQL 16 descartável, rede desabilitada, dados sintéticos e as policies/helpers/guard coletados do canônico, sobre fixtures mínimas. **Não são um clone integral nem uma alteração do banco remoto.** A suíte completa de TypeScript, lint, Vitest, Deno e navegador não foi reexecutada nesta rodada de auditoria. Nenhuma jornada autenticada integral é certificada por este documento.

## Correções necessárias no diagnóstico anterior

1. **CI não está globalmente impedido de executar.** Há resultados recentes aprovados de CodeQL, segurança e ledger. A falha E2E consultada é preflight do Dependabot sem credenciais, não evidência de bug de toda a aplicação nem inexistência de todas as personas.
2. **continue-on-error não basta para concluir falso verde.** O workflow E2E tem etapa final que reprova quando o resultado do teste foi failure. A revisão de shards vazios/skip continua pertinente.
3. **Credenciais de CRM existem.** Foram confirmados nomes/presença no cofre da aplicação; isso ainda não prova conectividade e privilégio mínimo.
4. **Auth possui controles ativos.** Cadastro público e autoconfirmação estão desativados; TOTP habilitado. Passkeys ausentes não significam MFA inteiro ausente. Domínios/callbacks e requisitos adicionais precisam revisão.
5. **Supply chain teve implementação.** Actions fixadas por SHA e scanners existem. Não cabe classificar o tema inteiro como não iniciado.
6. **Há cron em execução.** São 17 jobs ativos; o problema é a ausência de algumas rotinas de negócio e a falha concreta do worker existente.
7. **491 diferenças não são 491 migrations a aplicar.** São 462 arquivos ativos sem ledger, 19 conteúdos não verificáveis, nove nomes divergentes e um conteúdo divergente, aceitos como passivo pela baseline. Só o efeito real decide a reconciliação.
8. **Escrita no catálogo mestre é proibida por requisito.** Corrigir a interface incompatível, sem remover o bloqueio CATALOG_READ_ONLY.
9. **Documentos de escopo se contradizem.** Bitrix, passkeys, gamificação, white-label e ADRs propostas exigem precedência/decisão, não ativação automática.
10. **Dívida técnica antiga foi saneada no lote de 08/10.** O relatório do código atual registra zero erros TypeScript/lint/audit, com 872 avisos. Não repetir 153/3.247/sete altos como medição atual; também não apresentar o resultado de 08/10 como teste executado hoje.
11. **Função ACTIVE não prova paridade e negócio.** Existem 100 funções ativas e seis exclusões locais documentadas. Contagem não comprova limite do plano comercial nem justifica upgrade automático.
12. **Código existente não implica aceite.** A antiga classificação técnica de T032 precisa revisão porque dois escritores conflitam com o guard. As 100 etapas ainda não têm encerramento formal no plano estruturado.

## Frentes de trabalho consolidadas

P0 indica segurança/integridade ou bloqueio central a tratar antes de homologar o fluxo afetado. P1 indica jornada/integração/confiabilidade; P2, completude e operação. Prioridade é proposta técnica, sem confundir item de escopo disputado com obrigação contratada.

'''
partes=[cabecalho,'| ID | Prioridade | Frente | Situação |\n|---|---|---|---|\n']
for a in achados:partes.append(f"| [{a['id']}](#{a['id'].lower()}) | {a['prioridade']} | {cell(a['titulo'])} | {cell(a['estado'])} |\n")
for a in achados:
    partes.append(f"\n<a id=\"{a['id'].lower()}\"></a>\n\n### {a['id']} — {a['titulo']}\n\n**{a['prioridade']} · {a['estado']}**. Nível de prova: {a['nivel_prova']}.\n\n{a['diagnostico']}\n\n**Falta:** {a['o_que_falta']}\n\nEtapas: {', '.join(a['etapas'])}. Origens: {', '.join(a['origens'])}.\n\nEvidências: "+'; '.join(link(e) for e in a['evidencias'])+'.\n')
partes.append('''
## Ordem técnica sugerida para a correção

1. Conter e corrigir confirmação de e-mail, isolamento de verbas e escrita de proposta aprovada; incluir negativas por papel/escopo/estado.
2. Corrigir chave de evidência e integração dos escritores com o guard; provar orçamento → aprovação → pedido com o schema cumulativo.
3. Fechar scanner/quarentena, registro do worker, entrega de notificações e configuração de Auth/Realtime.
4. Recuperar a jornada de compra: detalhe/PDF/token público, links, filtros, seleção entre módulos, persistência de kit e estados reais no BI.
5. Concluir governança institucional, arte por item/versão, capacidade dos kits, logística por destino, ocorrências, campanha e ciclo financeiro.
6. Reconciliar CI, artefatos, migrations por efeito e documentação; homologar em ambiente segregado; obter aceites de negócio e executar piloto autorizado.

Esta é uma ordem de dependência dos achados, não um novo plano artificial de 50/100/150 etapas. O plano existente já tem critérios suficientes; o trabalho necessário é ligar cada requisito a uma implementação e prova atual, resolvendo antes as contradições.

## Critério para encerrar uma pendência

Para cada requisito mantido: caminho acessível pela interface ou consumidor previsto; autorização no servidor; estado persistido correto; tratamento de vazio/erro/retry; teste positivo e negativo com dependências vigentes; publicação no destino de construção/homologação correto; evidência com SHA/data/ambiente e aceite do responsável. Retirada de escopo precisa decisão explícita, sem apagar a origem. Auditoria e simulação não substituem operação real onde o plano a exige.

Os arquivos brutos de inventário/metadata permanecem locais para inspeção técnica. Os entregáveis de consulta não contêm valores de credenciais. Nenhuma alteração de implementação foi feita durante esta auditoria.
''')
(OUT/'RELATORIO.md').write_text(''.join(partes))

# Consulta offline: todo conteúdo é renderizado com textContent para não executar dados dos documentos.
dados={'frentes':achados,'registros':registros,'etapas':etapas}
json_seguro=json.dumps(dados,ensure_ascii=False).replace('<','\\u003c')
pagina='''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Auditoria Sicoob · 13/10/2026</title><style>
body{margin:0;background:#f3f8f7;color:#173e43;font:16px system-ui}main{max-width:1440px;margin:auto;padding:28px}h1{color:#003c46}p{max-width:1050px;line-height:1.6}nav{display:flex;gap:14px;flex-wrap:wrap;margin:22px 0}a{color:#007b78}label{display:grid;gap:6px}input,select{font:inherit;padding:12px;border:1px solid #8eb9b5;border-radius:8px}input{min-width:min(440px,70vw)}.controles{display:flex;gap:20px;flex-wrap:wrap}article{background:white;border:1px solid #cee3df;border-radius:12px;padding:20px;margin:14px 0}h2{font-size:19px;margin-top:0}.estado{font-weight:700;color:#006c69}small{display:block;line-height:1.5;color:#446366}#contador{font-weight:700}button{font:inherit;padding:10px 18px;background:#006c69;color:white;border:0;border-radius:6px;cursor:pointer}a:focus,input:focus,select:focus,button:focus{outline:3px solid #128fa5;outline-offset:3px}</style>
<main><h1>Auditoria de funcionalidades planejadas</h1><p>Brindes Sicoob V2 · 13/10/2026 · main fff0b4cb6. O plano não está encerrado. Consulte o nível de prova: a varredura integral de arquivos não representa homologação dinâmica de todas as funções.</p><nav><a href="RELATORIO.md">Relatório completo</a><a href="achados-consolidados.csv">56 frentes · CSV</a><a href="revisao-682-registros.csv">682 registros · CSV</a><a href="matriz-100-etapas.csv">100 etapas · CSV</a><a href="cobertura-documentos.csv">511 documentos · CSV</a></nav><div class="controles"><label>Pesquisar<input id="busca" type="search" placeholder="Ex.: kit, verba, T053, G03"></label><label>Camada<select id="camada"><option value="frentes">Frentes consolidadas (56)</option><option value="registros">Registros históricos reconciliados (682)</option><option value="etapas">Etapas do plano (100)</option></select></label><label>Prioridade<select id="prioridade"><option value="">Todas</option><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option><option value="P3">P3</option></select></label></div><p id="contador" role="status"></p><section id="lista" aria-label="Resultados"></section><button id="mais" hidden>Mostrar mais 40</button><script id="dados" type="application/json">'''+json_seguro+'''</script><script>
const dados=JSON.parse(document.getElementById('dados').textContent);let limite=40;const $=id=>document.getElementById(id);const norm=x=>String(x).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();function texto(tag,txt,classe){const el=document.createElement(tag);el.textContent=txt;if(classe)el.className=classe;return el}function render(){const camada=$('camada').value,busca=norm($('busca').value),p=$('prioridade').value;const itens=dados[camada].filter(x=>(!p||x.prioridade===p)&&norm(JSON.stringify(x)).includes(busca));$('contador').textContent=itens.length+' resultados · '+Math.min(limite,itens.length)+' exibidos';$('lista').replaceChildren();itens.slice(0,limite).forEach(x=>{const el=document.createElement('article');const id=x.id||x.etapa;el.append(texto('h2',id+' — '+(x.titulo||x.funcionalidade)));el.append(texto('p',(x.prioridade||'')+' · '+(x.estado||x.parecer_20261013||x.classificacao_de_partida),'estado'));el.append(texto('p',x.diagnostico||x.ressalva_ou_atualizacao||('Situação formal: '+x.estado_formal_no_plano)));el.append(texto('p','Falta / aceite: '+(x.o_que_falta||x.criterio_de_aceite)));el.append(texto('small',x.nivel_prova||x.validacao_dinamica_integral||'Sem aceite integral nesta auditoria.'));const a=document.createElement('a');a.textContent='Consultar evidência e origem';a.href=camada==='frentes'?'RELATORIO.md#'+id.toLowerCase():(x.url_origem||'matriz-100-etapas.csv');el.append(a);$('lista').append(el)});$('mais').hidden=itens.length<=limite}for(const id of ['busca','camada','prioridade'])$(id).addEventListener('input',()=>{limite=40;render()});$('mais').onclick=()=>{limite+=40;render()};render();</script></main></html>'''
(OUT/'consulta.html').write_text(pagina)
print(json.dumps(resumo,ensure_ascii=False))
