"""Gera a matriz documental preservando evidência histórica e limites da revisão atual."""
from pathlib import Path
import csv
import json
import re
from collections import Counter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/execucao/revisao-plano-20260924'
ESTADOS = {
    'L': 'Implementado no escopo local/documental indicado',
    'P': 'Parcial — implementação ou integração incompleta',
    'N': 'Funcionalidade/artefato não localizado no escopo pesquisado',
    'V': 'Validação ou decisão externa/operacional pendente',
    'H': 'Evidência histórica; falta revalidação atual',
    'R': 'Premissa a substituir; não executar literalmente',
}
REFS = {
 'repo': ['docs/execucao/auditoria-paridade-local-github-supabase-2026-09-24.md'],
 'banco': ['docs/execucao/auditoria-paridade-local-github-supabase-2026-09-24.md'],
 'governanca': ['docs/execucao/revisao-plano-20260924/protecao-github.json','.github/workflows/ci.yml'],
 'prs': ['docs/execucao/revisao-plano-20260924/prs-abertos.json'],
 'segredos': ['docs/secrets.md','.env.production'],
 'historico': ['docs/execucao/correcoes-reconciliacao-20260922.md','docs/auditoria-validacao-2026-09-22.md'],
 'baseline': ['supabase/migrations/20260915143442_sicoob_reconciliation_baseline.sql','supabase/migrations_archive/2026-09/20260915160000_sicoob_reconciliation_baseline.sql','docs/execucao/evidencias/baseline_diff_20260917.md'],
 'backlog': ['docs/execucao/evidencias/retomada-mcp-20260922/migration-backlog-classification.json'],
 'ledger': ['scripts/db/check-migration-ledger-drift.mjs','.github/workflows/migration-ledger-drift.yml'],
 'tipos': ['src/integrations/supabase/types.ts','scripts/db/compare-types-api.mjs'],
 'seed': ['scripts/seed-qa.mjs','supabase/functions/sicoob-seed-qa/index.ts'],
 'checks': ['docs/execucao/revisao-plano-20260924/checks.json'],
 'financeiro': ['src/services/sicoob/orderService.ts','src/services/sicoob/budgetService.ts','supabase/migrations/20260922224500_convert_quote_to_sicoob_order.sql'],
 'sql': ['docs/execucao/revisao-plano-20260924/simular-conversao-pedido-sicoob.json','docs/execucao/revisao-plano-20260924/simular-documentos-sicoob.json','docs/execucao/revisao-plano-20260924/simular-consolidacao-sicoob.json','docs/execucao/revisao-plano-20260924/simular-outbox-aprovacao.json'],
 'documentos': ['src/services/sicoob/documentIngestService.ts','supabase/functions/sicoob-document-ingest/index.ts','supabase/functions/sicoob-document-ingest/scanner.ts'],
 'runtime': ['scripts/db/check-runtime-refs.mjs','tests/scenarios/runtime-references.mjs'],
 'edges': ['scripts/check-edge-authorization.mjs','supabase/functions/_shared/edge-authz-manifest.ts'],
 'outbox': ['supabase/functions/sicoob-approval-notifications/index.ts','supabase/functions/sicoob-approval-reconciliation/index.ts'],
 'monitoramento': ['src/lib/error-reporter.ts','docs/execucao/autorizacao-observabilidade-20260922.md'],
 'runbooks': ['docs/RUNBOOKS/MCP_DDL_APPLICATION.md','docs/DEPLOYMENT.md'],
 'produto': ['docs/plano-implementacao/plano.json','docs/execucao/validacao-do-plano.md'],
 'bitrix': ['supabase/functions/bitrix-sync/index.ts','supabase/migrations/20260922160000_bitrix_secure_cache.sql'],
 'catalogo': ['src/hooks/useExternalDatabase.ts','supabase/functions/external-db-bridge/index.ts','tests/scenarios/catalogo-somente-leitura.mjs'],
 'mcp': ['supabase/functions/mcp-keys-revoke/index.ts'],
 'orfaos': ['docs/execucao/evidencias/orfaos_banco_20260917.md','docs/execucao/evidencias/funcoes_orfas_20260917.md'],
 'magic': ['src/hooks/useMagicUpState.ts','src/pages/magic-up/MagicUpConfigPanel.tsx','docs/execucao/evidencias/etapa24_magic_up_20260917.md'],
 'fulfillment': ['src/services/sicoob/fulfillmentService.ts','src/components/sicoob/orders/OrderLogisticsTab.tsx'],
 'auditoria_ui': ['src/pages/admin/AuditEvidenceDashboard.tsx'],
 'decisoes': ['docs/execucao/decisoes_pendentes.md'],
 'pacotes': ['package.json','vendor/pptxgenjs-browser/proveniencia.json','tests/scenarios/artefatos-e-redirecionamentos.mjs'],
 'testes': ['vitest.config.ts','docs/execucao/revisao-plano-20260924/checks.json'],
 'pedidos': ['src/pages/sicoob/orders/OrderDetailPage.tsx','src/pages/sicoob/orders/OrdersPage.tsx'],
 'proxy': ['supabase/functions/image-proxy/index.ts'],
 'bundle': ['scripts/qa/check-bundle-budget.mjs','.github/workflows/lighthouse.yml','.github/workflows/bundle-check.yml'],
 'logistica': ['src/pages/sicoob/LogisticsReportPage.tsx','src/routes/config/sicoob.ts'],
 'pesquisa': ['docs/pesquisa/2026-09-11/dossie.md','docs/pesquisa/2026-09-11/anexos/perfis-profissionais.md'],
 'politicas': ['src/services/sicoob/approvalService.ts','supabase/migrations/20260922161000_repair_sicoob_approval_policy_snapshot.sql'],
 'indicadores': ['src/services/sicoob/statsService.ts'],
 'rotas': ['src/routes/config/sicoob.ts','src/routes/config/public.ts','tests/sicoob/route-access-scenarios.test.tsx'],
 'auth': ['src/hooks/useWebAuthn.ts','src/contexts/AuthContext.tsx'],
 'usuarios': ['src/services/sicoob/userService.ts','src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx'],
 'recentes': ['src/stores/useRecentlyViewedStore.ts','src/contexts/AuthContext.tsx','tests/stores/useRecentlyViewedStore.test.ts'],
 'rascunhos': ['src/hooks/useAutoSave.ts','src/components/quotes/QuoteAutoSave.tsx','src/pages/QuoteBuilderPage.tsx','scripts/revisao/rascunhos-20260924.cenarios.tsx'],
 'previsao': ['src/hooks/useKitStockForecast.ts'],
 'design': ['src/pages/sicoob/StorefrontDemoPage.tsx','docs/execucao/revisao-implementacao-2026-09-12/validacao-navegador.json'],
 'arte': ['supabase/functions/sicoob-artwork-register/index.ts','supabase/migrations/20260912180000_sicoob_finance_artwork.sql'],
 'kit': ['supabase/functions/sicoob-kit-quote/catalog.ts','tests/edge-functions/sicoob-kit-quote-catalog.test.ts'],
 'personalizacao': ['supabase/migrations/20260922152000_group_personalization_templates.sql'],
 'distribuicao': ['src/pages/sicoob/GestorConsolidatedOrdersPage.tsx','supabase/migrations/20260912190000_sicoob_consolidation_distribution.sql'],
 'recompra': ['supabase/functions/sicoob-reorder/catalog.ts','supabase/functions/sicoob-reorder/index.ts'],
}

def ler_json(path):
    return json.loads((ROOT / path).read_text())

def salvar_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def escrever_csv(path, rows):
    with path.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0]), quoting=csv.QUOTE_MINIMAL, lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({k: '; '.join(v) if isinstance(v, list) else v for k,v in row.items()})

plan = ler_json('docs/plano-implementacao/plano.json')
historical = ler_json('docs/execucao/revisao-implementacao-2026-09-12/matriz.json')
benchmark_old = ler_json('docs/execucao/revisao-implementacao-2026-09-12/benchmark-32-melhorias.json')
SOURCES = {
 'E': 'docs/plano-implementacao/plano-100-etapas.md',
 'R': 'docs/plano-implementacao/plano-reconciliacao-50-etapas.md',
 'C': 'docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md',
 'T': 'docs/plano-melhorias-50-etapas.md',
 'B': 'docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md',
}
titles = {e['id']: e['titulo'] for e in plan}
for prefix in ['R','C']:
    content=(ROOT/SOURCES[prefix]).read_text()
    matches=re.findall(r'^### Etapa (\d+) — (.+)$',content,re.M)
    assert len(matches)==50,(prefix,len(matches))
    titles.update({f'{prefix}{int(n):02}': text for n,text in matches})
content=(ROOT/SOURCES['T']).read_text()
matches=re.findall(r'^(\d+)\. (.+)$',content,re.M)
assert len(matches)==50,len(matches)
titles.update({f'T{int(n):02}':text.split(' — ')[0].split(' ✅')[0].split(' 🔄')[0][:220] for n,text in matches})
titles.update({e['id']:e['melhoria'] for e in benchmark_old})

rows=[]
for file,expected in [('avaliacoes-100.tsv',100),('avaliacoes-150.tsv',150),('avaliacoes-benchmark.tsv',32)]:
    entries=list(csv.DictReader((OUT/file).open(),delimiter='\t'))
    assert len(entries)==expected,(file,len(entries))
    for entry in entries:
        assert entry['id'] in titles,entry['id']
        assert entry['estado'] in ESTADOS
        refs=[]
        for key in entry['evidencias'].split(';'):
            refs.extend(REFS[key])
        refs=list(dict.fromkeys(refs))
        for ref in refs:
            assert (ROOT/ref).is_file(),(entry['id'],ref)
        rows.append({'id':entry['id'],'titulo':titles[entry['id']],'plano_origem':SOURCES[entry['id'][0]],
                     'estado':entry['estado'],'significado':ESTADOS[entry['estado']],
                     'diagnostico_e_condicao_de_fechamento':entry['diagnostico_e_condicao_de_fechamento'],
                     'evidencias':refs,'conclusao_integral_certificada':False})
assert len({r['id'] for r in rows})==282
stages=[r for r in rows if not r['id'].startswith('B')]
assert len(stages)==250
salvar_json(OUT/'matriz-250-etapas.json',stages)
escrever_csv(OUT/'matriz-250-etapas.csv',stages)
salvar_json(OUT/'benchmark-32.json',[r for r in rows if r['id'].startswith('B')])
escrever_csv(OUT/'benchmark-32.csv',[r for r in rows if r['id'].startswith('B')])

for file,items in [('matriz-250-etapas.md',stages),('benchmark-32.md',[r for r in rows if r['id'].startswith('B')])]:
    lines=['# Revisão documental — 24/09/2026','','Base: `6193793a7fad6ec7e1dacd0e68075e3685016e28`. L significa escopo local, nunca homologação integral.','','| ID | Etapa | Estado | Evidência e condição de fechamento |','|---|---|---|---|']
    for r in items:
        links=' · '.join(f'[{Path(p).name}](../../../{p})' for p in r['evidencias'])
        title=r['titulo'].replace('|','/')
        note=r['diagnostico_e_condicao_de_fechamento'].replace('|','/')
        lines.append(f"| {r['id']} | {title} | {r['estado']} | {note} Referências: {links} |")
    (OUT/file).write_text('\n'.join(lines)+'\n')

# Somente requisitos realmente reavaliados abaixo recebem um diagnóstico individual novo.
# Os demais preservam explicitamente a data anterior: não transformamos 1.000 IDs em 1.000 testes.
updates={
 'E001.01':('L','Commit de referência 6193793a7 e fontes desta revisão registrados.'),
 'E001.04':('P','106 sondagens OPTIONS identificaram 99 respostas 2xx, seis 404 e um timeout; versão do código implantado não comparada.'),
 'E001.06':('L','Build, Vitest integral, cenários Node, ratchets e quatro simulações SQL executados nesta revisão.'),
 'E001.07':('L','Divergências documentais, código versus implantação e pendências registradas nas matrizes desta revisão.'),
 'E011.08':('P','Há evidência histórica de reconciliação aplicada; fotografia administrativa atual do ledger integral ainda pendente.'),
 'E054.04':('P','Registro de arte e identidade imutável existem em código/migration; função remota ausente.'),
 'E056.02':('P','Distribuição por destino está implementada em RPC/UI e passou na simulação; homologação remota pendente.'),
 'E056.03':('L','Soma e saldo por destino foram verificados em PostgreSQL descartável nesta revisão.'),
 'E065.06':('P','Decisão de arte vincula identidade/especificação; falta publicar o registro e validar com ator de marca.'),
 'E065.09':('L','Trava de produção com arte vigente foi exercitada no pacote de conversão/arte em PostgreSQL sintético.'),
 'E074.02':('P','Alocações e itens por destino existem; integrações de remessa e documentos ainda exigem homologação.'),
 'E074.03':('P','Recebimentos parciais mantêm saldo; múltiplas expedições e operação real completa ainda precisam de aceite.'),
 'E075.01':('P','Tela de consolidação mostra quantidades por destino; relatório global continua com linhas fixas.'),
 'E075.09':('L','Simulação confirmou que divergência/pendência não conclui indevidamente os pedidos.'),
 'E076.03':('L','Recebimento parcial e acumulação por destino foram verificados em PostgreSQL descartável.'),
 'E076.08':('L','Retry idempotente não duplica quantidades na simulação atual de consolidação.'),
 'E076.10':('L','Cenários completo/parcial/repetido foram simulados localmente; não equivalem à homologação no PA real.'),
 'E077.01':('P','Recebimento distingue recebida, avariada e faltante; processo completo de ocorrência não foi localizado.'),
 'E077.02':('P','Evento de recebimento vincula item/destino/quantidade; investigação e resolução da reclamação permanecem incompletas.'),
 'E089.06':('P','Alocações e recebimentos permitem comparar quantidades; indicadores consolidados ainda não foram reconciliados com amostra real.'),
}
source_by_id={x['id']:x for x in historical['subetapas']}
stage_by_id={x['id']:x for x in stages}
requirements=[]
for stage in plan:
    for item in stage['subetapas']:
        previous=source_by_id[item['id']]
        current=updates.get(item['id'])
        requirements.append({
            'id':item['id'],'etapa':stage['id'],'acao_original':item['acao'],
            'estado_checklist_original':item['estado'],
            'classificacao_historica_20260912':previous['classificacao'],
            'diagnostico_historico_20260912':previous['diagnostico_individual'],
            'reavaliacao_individual_20260924':bool(current),
            'classificacao_individual_nova':current[0] if current else '',
            'diagnostico_individual_novo':current[1] if current else 'Diagnóstico individual histórico preservado; não reensaiado individualmente nesta rodada.',
            'estado_etapa_20260924':stage_by_id[stage['id']]['estado'],
            'pendencia_atual_da_etapa':stage_by_id[stage['id']]['diagnostico_e_condicao_de_fechamento'],
            'aceite_integral_exigido':stage['aceite'],
            'conclusao_formal':False,
        })
assert len(requirements)==1000 and len({r['id'] for r in requirements})==1000
salvar_json(OUT/'requisitos-1000.json',requirements)
escrever_csv(OUT/'requisitos-1000.csv',requirements)
summary={
 'data':'2026-09-24','commit_codigo':'6193793a7fad6ec7e1dacd0e68075e3685016e28',
 'planos':SOURCES,'legenda':ESTADOS,'etapas_documentais':250,'benchmark':32,'requisitos_indexados':1000,
 'requisitos_com_diagnostico_individual_atualizado':len(updates),
 'requisitos_com_diagnostico_individual_historico_preservado':1000-len(updates),
 'etapas_produto_formalmente_encerradas':0,
 'contagens_por_plano':{p:dict(Counter(r['estado'] for r in rows if r['id'].startswith(p))) for p in SOURCES},
 'limites':['Matriz documental não equivale a teste funcional de cada requisito.', 'Evidência histórica não foi promovida a prova remota atual.', 'L certifica somente o escopo local indicado.', 'Sem alterações no banco, implantação ou fusão dos PRs de correção.'],
}
salvar_json(OUT/'resumo.json',summary)
print(json.dumps(summary,ensure_ascii=False,indent=2))
