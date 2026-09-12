"""Gera a revisão dos 1.000 requisitos sem alterar o checklist oficial."""
from pathlib import Path
import csv
import hashlib
import html
import json
import subprocess
from collections import Counter

RAIZ = Path(__file__).resolve().parents[2]
PASTA = RAIZ / 'docs/execucao/revisao-implementacao'
COMMIT = '6f1c5f94f612c13071b8dbe61b500b915e50b123'
BASE_GITHUB = f'https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/{COMMIT}/'
ESTADOS = {
    'L': 'Evidência local suficiente no escopo descrito',
    'P': 'Implementação ou atendimento parcial',
    'N': 'Atendimento não localizado ou não demonstrado',
    'V': 'Validação externa necessária, sem comprovação',
}
PESQUISA = 'docs/pesquisa/2026-09-11/'
EVIDENCIAS = 'docs/execucao/evidencias/'
GRUPOS = {
    'diagnostico': [PESQUISA+'dossie.md', PESQUISA+'anexos/auditoria-tecnica-a.md', PESQUISA+'anexos/auditoria-tecnica-b.md'],
    'checkpoint': ['docs/execucao/checkpoint-local-2026-09-11.md'],
    'pesquisa': [PESQUISA+'dossie.md', PESQUISA+'anexos/perfis-profissionais.md', PESQUISA+'anexos/documentos-fornecidos.md'],
    'benchmark': [PESQUISA+'benchmark-promo-gifts-v4.md'],
    'plano': ['docs/plano-implementacao/plano.json', 'docs/execucao/validacao-do-plano.md'],
    'seguranca': ['supabase/functions/_shared/edge-authz-manifest.ts', 'supabase/functions/migrate-helper/index.ts', 'tests/security/edge-authz-bypass.test.ts', 'docs/SECURITY.md'],
    'catalogo': ['src/components/catalog/CatalogStorefrontHero.tsx', 'src/components/catalog/CatalogContent.tsx', 'supabase/functions/external-db-bridge/index.ts', 'supabase/functions/_shared/catalog-redaction.ts', 'supabase/functions/_shared/external-db-config.ts', 'tests/scenarios/catalogo-somente-leitura.mjs'],
    'modelo': ['supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql', 'supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql', 'src/contexts/OrganizationContext.tsx'],
    'pedido': ['src/services/sicoob/orderService.ts', 'src/pages/sicoob/orders/OrderDetailPage.tsx', 'src/types/sicoob/orders.ts'],
    'legado': ['src/services/OrderService.ts', 'src/hooks/orders/useOrders.ts'],
    'aprovacao': ['src/services/sicoob/approvalService.ts', 'supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql'],
    'organizacao': ['src/contexts/OrganizationContext.tsx', 'src/contexts/AuthContext.tsx'],
    'usuarios': ['src/services/sicoob/userService.ts', 'src/pages/admin/sicoob/tabs/UserAssignmentTab.tsx'],
    'verba': ['src/services/sicoob/budgetService.ts', 'supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql', EVIDENCIAS+'verba-atomica.json'],
    'permissoes': ['src/lib/roles.ts', 'src/lib/rbac/route-matrix.ts', 'tests/sicoob/route-access-scenarios.test.tsx'],
    'rotas': ['src/routes/config/sicoob.ts', 'src/routes/config/sicoob-rbac.ts', 'tests/sicoob/route-access-scenarios.test.tsx'],
    'sessao': ['src/contexts/AuthContext.tsx', 'src/components/layout/ProtectedRoute.tsx', 'src/components/layout/SicoobRoute.tsx', 'src/lib/auth/invoke-full-scope.ts'],
    'login': ['src/pages/Auth.tsx', 'src/pages/auth/AuthBranding.tsx', 'tests/components/pages/Auth.test.tsx'],
    'qualidade': ['scripts/check-eslint-baseline.mjs', 'scripts/check-typecheck-baseline.mjs', EVIDENCIAS+'gates-depois.tap', EVIDENCIAS+'cenarios-integrados.tap'],
    'ci': ['docs/execucao/revisao-implementacao/ci.json', 'docs/execucao/revisao-implementacao/resumo-codeql.json', '.github/workflows/e2e.yml'],
    'operacao': ['docs/DR.md', 'docs/OBSERVABILITY.md', 'docs/SECURITY_RUNBOOK.md'],
    'navegacao': ['src/components/layout/Header.tsx', 'src/components/layout/SidebarReorganized.tsx', 'src/routes/config/sicoob.ts'],
    'busca': ['src/hooks/useSearch.ts', 'src/utils/product-search.ts', 'tests/hooks/useSearch.test.ts', 'src/components/catalog/CatalogHeader.tsx'],
    'filtros': ['src/hooks/catalog/useCatalogFilters.ts', 'src/components/catalog/CatalogActiveFilters.tsx', 'tests/components/catalog/CatalogStorefrontExperience.test.tsx'],
    'metricas': ['src/hooks/sicoob/useAIOrderPredictor.ts', 'src/pages/sicoob/orders/OrdersPage.tsx', 'src/pages/sicoob/orders/OrderDetailPage.tsx', 'src/services/sicoob/statsService.ts'],
    'notificacoes': ['src/hooks/useNotifications.ts', 'src/hooks/useNotificationOmnichannel.ts', 'src/services/sicoob/orderService.ts'],
    'demo': ['src/pages/sicoob/StorefrontDemoPage.tsx', EVIDENCIAS+'visual/demo-resultado.json'],
    'marca': [PESQUISA+'dossie.md', 'src/pages/auth/AuthBranding.tsx', 'docs/execucao/ativos-imagegen.json'],
    'design': ['src/index.css', 'tailwind.config.ts', 'docs/ACCESSIBILITY.md', 'src/components/ui/button.tsx', 'src/components/ui/dialog.tsx'],
    'visual': [EVIDENCIAS+'visual/demo-resultado.json', EVIDENCIAS+'visual/resultado.json', EVIDENCIAS+'visual/login-390.png'],
    'produto': ['src/pages/ProductDetail.tsx', 'src/pages/product-detail/ProductDetailHero.tsx'],
    'personalizacao': ['src/pages/PersonalizationSimulator.tsx', 'src/components/kit-builder/PersonalizationConfig.tsx', 'src/lib/external-db/techniques.ts'],
    'comparacao': ['src/pages/ComparePage.tsx', 'src/hooks/useSupplierComparison.ts', 'src/components/compare/ComparisonMobileView.tsx'],
    'compartilhamento': ['src/hooks/useFavoriteLists.ts', 'src/hooks/useKitShare.ts', 'src/stores/useFavoritesStore.ts'],
    'campanhas': ['src/pages/admin/AdminCampanhasPage.tsx'],
    'artes': ['src/components/mockup/ArtFileUpload.tsx', 'src/components/magic-up/MagicUpBrandKitPanel.tsx', 'src/components/orders/PilotApprovalPanel.tsx', 'src/hooks/usePilotApprovals.ts'],
    'kit': ['src/pages/KitBuilderPage.tsx', 'src/hooks/useKitAutoSave.ts', 'src/hooks/useKitStockValidation.ts', 'src/lib/kit-builder/types.ts', 'src/components/kit-builder/VariantSelector.tsx'],
    'distribuicao': ['supabase/migrations/20260503000002_sicoob_consolidation_logic.sql', 'src/pages/sicoob/GestorConsolidatedOrdersPage.tsx'],
    'carrinho': ['src/components/cart/CartHeaderButton.tsx', 'src/components/layout/Header.tsx'],
    'propostas': ['src/pages/QuoteBuilderPage.tsx', 'src/services/QuoteService.ts', 'src/hooks/quotes/useQuotes.ts'],
    'versoes': ['src/hooks/useQuoteVersions.ts', 'src/components/quotes/QuoteVersionCompare.tsx'],
    'logistica': ['src/components/sicoob/orders/OrderLogisticsTab.tsx', 'src/services/OrderService.ts'],
    'recompra': ['src/components/orders/OneClickReorder.tsx', 'src/services/sicoob/orderService.ts', 'src/services/OrderService.ts'],
    'ajuda': ['src/components/ai/AIChat.tsx', PESQUISA+'dossie.md'],
    'desempenho': ['.lighthouserc.cjs', 'scripts/qa/check-bundle-budget.mjs', EVIDENCIAS+'lighthouse-login.json'],
    'privacidade': ['docs/SECURITY.md', 'src/contexts/AuthContext.tsx', 'src/hooks/useSearch.ts'],
    'simulacoes': ['scripts/revisao/simular-lacunas.mjs', 'docs/execucao/revisao-implementacao/simulacoes.json'],
    'revisao': ['docs/execucao/revisao-implementacao/anotacoes.txt', 'docs/execucao/revisao-implementacao/achados.json'],
}

def ler_json(nome):
    return json.loads((RAIZ/nome).read_text())

def gravar_json(nome, objeto):
    (PASTA/nome).write_text(json.dumps(objeto, ensure_ascii=False, indent=2)+'\n')

def link_fonte(arquivo):
    if arquivo.startswith(('scripts/revisao/', 'docs/')):
        return '../../../'+arquivo
    return BASE_GITHUB+arquivo

plano_bytes = (RAIZ/'docs/plano-implementacao/plano.json').read_bytes()
plano = json.loads(plano_bytes)
achados = ler_json('docs/execucao/revisao-implementacao/achados.json')
anotacoes = {}
for linha in (PASTA/'anotacoes.txt').read_text().splitlines():
    if not linha.strip():
        continue
    partes = linha.split('|')
    assert len(partes) == 12, (partes[0], len(partes))
    numero = int(partes[0])
    assert numero not in anotacoes, f'Etapa duplicada: {numero}'
    anotacoes[numero] = (partes[1].split(','), [s.split(':', 1) for s in partes[2:]])
assert set(anotacoes) == set(range(1,101))

fontes = {}
for grupo, arquivos in GRUPOS.items():
    for arquivo in arquivos:
        local = RAIZ/arquivo
        assert local.is_file(), f'Fonte ausente: {arquivo}'
        if not arquivo.startswith(('docs/', 'scripts/revisao/')):
            versao_auditada = subprocess.check_output(['git', 'show', COMMIT+':'+arquivo], cwd=RAIZ)
            assert local.read_bytes() == versao_auditada, f'Código mudou desde a revisão; reavaliar antes de gerar: {arquivo}'
        fontes[arquivo] = {'arquivo': arquivo, 'sha256': hashlib.sha256(local.read_bytes()).hexdigest(), 'url': link_fonte(arquivo)}

linhas, etapas = [], []
for etapa in plano:
    grupos, notas = anotacoes[etapa['numero']]
    referencias = list(dict.fromkeys(a for g in grupos for a in GRUPOS[g]))
    assert len(etapa['subetapas']) == 10
    itens = []
    for sub, (codigo, nota) in zip(etapa['subetapas'], notas):
        assert codigo in ESTADOS and len(nota) > 20
        item = {
            'id': sub['id'], 'etapa': etapa['id'], 'titulo_etapa': etapa['titulo'],
            'fase': etapa['fase'], 'acao_original': sub['acao'],
            'classificacao': codigo, 'situacao': ESTADOS[codigo], 'diagnostico_individual': nota,
            'referencias_contextuais': referencias,
            'achados_diretos': [a['id'] for a in achados if sub['id'] in a['subetapas']],
            'responsavel_funcional_sugerido': etapa['responsavel'],
            'responsavel_nominal': etapa['responsavel_nominal'], 'revisor': etapa['revisor'],
            'dependencias_etapa': etapa['dependencias'],
            'entrega_exigida': etapa['entrega'], 'aceite_exigido': etapa['aceite'],
            'estado_checklist_original': sub['estado'], 'evidencia_checklist_original': sub['evidencia'],
            'conclusao_formal': False, 'revisao_documental_realizada': True,
            'condicao_para_baixa': 'Resolver a lacuna indicada, comprovar a ação original no escopo exigido e registrar evidência, responsável, revisor, aceite e dependências; produção real quando requerida pela etapa.',
        }
        assert sub['estado'] == 'Pendente' and not sub['evidencia']
        itens.append(item); linhas.append(item)
    contagens = dict(Counter(i['classificacao'] for i in itens))
    etapas.append({'id': etapa['id'], 'titulo': etapa['titulo'], 'situacao': 'Parcial' if contagens.get('L',0)+contagens.get('P',0) else 'Não demonstrada', 'contagens': contagens, 'referencias_contextuais': referencias, 'aceite_exigido': etapa['aceite'], 'conclusao_formal': False})

ids = [i['id'] for i in linhas]
assert len(ids) == len(set(ids)) == 1000
assert all(not e['aceite_validado'] and not e['responsavel_nominal'] and not e['revisor'] for e in plano)
for achado in achados:
    assert all(s in ids for s in achado['subetapas'])
    for referencia in achado['referencias']:
        arquivo, linha = referencia.rsplit(':',1)
        assert (RAIZ/arquivo).is_file(), referencia
        assert 0 < int(linha) <= len((RAIZ/arquivo).read_text().splitlines()), referencia

contagens = dict(Counter(i['classificacao'] for i in linhas))
metadados = {
    'data': '2026-09-11', 'commit_codigo_auditado': COMMIT,
    'sha256_plano_original': hashlib.sha256(plano_bytes).hexdigest(),
    'etapas_revisadas': 100, 'subetapas_revisadas': 1000, 'classificacoes': ESTADOS,
    'contagens': contagens, 'etapas_formalmente_concluidas': 0, 'subetapas_baixadas_no_checklist': 0,
    'achados_priorizados': len(achados), 'prioridades': dict(Counter(a['prioridade'] for a in achados)),
    'metodo': 'Leitura dos 1.000 requisitos e diagnóstico individual, cruzados com documentação, código e testes existentes; inspeção dirigida de integrações; seis simulações de lacunas com módulos reais e dependências simuladas; consulta da CI do commit indicado.',
    'limites': [
        'Cobertura documental de 1.000 requisitos não significa 1.000 comportamentos executados ou homologados.',
        'As referências por etapa são contexto verificável, não prova automática de que cada ação completa foi atendida.',
        'N significa não localizado/não demonstrado no material revisado; não é prova de inexistência absoluta no banco ou em processo externo.',
        'L reconhece evidência local delimitada; não concede aceite formal, homologação Sicoob ou produção.',
        'Nenhum percentual de itens classificado nesta revisão é uma nota de qualidade ou percentual de implantação.',
        'Supabase próprio, privilégios da origem, tráfego real, pesquisa com participantes e aceite de marca/política continuam sem comprovação operacional.',
        'Grafo anterior apresentou inconsistências; nenhuma conclusão depende exclusivamente de aresta ou busca sem resultado.',
    ],
}
gravar_json('metadados.json', metadados)
gravar_json('matriz.json', {'metadados': metadados, 'etapas': etapas, 'subetapas': linhas})
gravar_json('fontes.json', {'grupos': GRUPOS, 'arquivos': list(fontes.values())})
texto_achados = ['# Achados priorizados da revisão', '', 'Código auditado: `'+COMMIT+'`. Todos os achados estão abertos. P0 impede liberar o fluxo afetado no piloto; não afirma incidente em produção. Reprodução local ou conferência em ambiente segregado, conforme indicado.', '']
for achado in achados:
    texto_achados.extend(['## '+achado['id']+' — '+achado['titulo'], '', '**'+achado['prioridade']+' · '+achado['evidencia_tipo'].replace('_',' ')+' · Aberto**', '', achado['diagnostico'], '', '**Referências:**', ''])
    for ref in achado['referencias']:
        arquivo, numero_linha = ref.rsplit(':',1)
        texto_achados.append('- ['+ref+']('+BASE_GITHUB+arquivo+'#L'+numero_linha+')')
    texto_achados.extend(['', '**Plano:** '+', '.join(achado['subetapas']), '', '**Reprodução / conferência:** '+achado['reproducao'], '', '**Condição de fechamento:** '+achado['condicao_fechamento'], ''])
(PASTA/'achados.md').write_text('\n'.join(texto_achados).rstrip()+'\n')
with (PASTA/'matriz.csv').open('w', newline='', encoding='utf-8-sig') as arquivo:
    colunas = ['id','etapa','titulo_etapa','acao_original','situacao','diagnostico_individual','achados_diretos','referencias_contextuais','responsavel_funcional_sugerido','responsavel_nominal','revisor','dependencias_etapa','aceite_exigido','estado_checklist_original','conclusao_formal']
    escritor = csv.DictWriter(arquivo, fieldnames=colunas, delimiter=';', lineterminator='\n')
    escritor.writeheader()
    for item in linhas:
        escritor.writerow({k: ' | '.join(map(str,item[k])) if isinstance(item[k],list) else item[k] for k in colunas})

resumo = ['# Revisão das 100 etapas', '', 'Código auditado: `'+COMMIT+'`. L = evidência local delimitada; P = parcial; N = não demonstrado/localizado; V = validação externa necessária. Nenhuma etapa formalmente concluída.', '', '| Etapa | Escopo | Situação | L | P | N | V |', '|---|---|---|---:|---:|---:|---:|']
for e in etapas:
    resumo.append('| '+e['id']+' | '+e['titulo']+' | '+e['situacao']+' | '+' | '.join(str(e['contagens'].get(k,0)) for k in ESTADOS)+' |')
(PASTA/'resumo-100-etapas.md').write_text('\n'.join(resumo)+'\n')

detalhes = ['# Matriz de revisão das 1.000 subetapas', '', 'Diagnóstico individual do commit `'+COMMIT+'`. Consulte [metodologia e contagens](metadados.json). Todas as baixas formais continuam pendentes. Referências são contextuais; não equivalem a teste completo de cada requisito.', '']
for etapa in etapas:
    detalhes.extend(['## '+etapa['id']+' — '+etapa['titulo'], '', '**Referências:** '+', '.join('['+a+']('+link_fonte(a)+')' for a in etapa['referencias_contextuais']), '', '| ID | Ação original | Situação | Diagnóstico individual |', '|---|---|---|---|'])
    for item in (i for i in linhas if i['etapa'] == etapa['id']):
        detalhes.append('| '+' | '.join(str(item[k]).replace('|','/').replace('\n',' ') for k in ['id','acao_original','classificacao','diagnostico_individual'])+' |')
    detalhes.extend(['', '**Critério de aceite ainda exigido:** '+etapa['aceite_exigido'], ''])
(PASTA/'matriz.md').write_text('\n'.join(detalhes).rstrip()+'\n')

cartoes = []
for item in linhas:
    referencias = ', '.join(f'<a href="{html.escape(link_fonte(a),quote=True)}">{html.escape(a)}</a>' for a in item['referencias_contextuais'])
    cartoes.append(f'''<article data-estado="{item['classificacao']}" data-etapa="{item['etapa']}"><h2>{item['id']} · {html.escape(item['acao_original'])}</h2><p class="estado">{item['classificacao']} — {html.escape(item['situacao'])}</p><p>{html.escape(item['diagnostico_individual'])}</p><details><summary>Evidências e condição de fechamento</summary><p>{referencias}</p><p><strong>Aceite da etapa:</strong> {html.escape(item['aceite_exigido'])}</p><p><strong>Achados diretos:</strong> {', '.join(item['achados_diretos']) or 'Consultar diagnóstico individual e referências da etapa.'}</p><p>Conclusão formal: pendente. {html.escape(item['condicao_para_baixa'])}</p></details></article>''')
opcoes = ''.join(f'<option value="{k}">{k} — {html.escape(v)}</option>' for k,v in ESTADOS.items())
pagina = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão das 1.000 subetapas · Portal Sicoob</title><style>
:root{font-family:system-ui,sans-serif;color:#153932;background:#f3f7f5}*{box-sizing:border-box}body{margin:0;overflow-wrap:anywhere}main{max-width:1080px;margin:auto;padding:28px 20px}h1{font-size:clamp(1.6rem,4vw,2.5rem);line-height:1.15}h2{font-size:1.05rem}p{line-height:1.55}a{color:#005f4f;overflow-wrap:anywhere}article{background:white;border:1px solid #c2d6cd;border-radius:12px;padding:18px;margin:12px 0}article[hidden]{display:none}.estado{font-weight:650}.filtros{display:flex;gap:14px;flex-wrap:wrap;background:#e6f0e9;padding:16px;border-radius:12px}label{display:flex;flex-direction:column;gap:5px;flex:1;min-width:180px}input,select{font:inherit;width:100%;padding:12px;border:1px solid #69867b;border-radius:6px;min-height:44px}summary{cursor:pointer;padding:10px 0}details p{font-size:.9rem}input:focus-visible,select:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid #005c4c;outline-offset:3px}.aviso{border-left:4px solid #917019;padding-left:16px}.contagens{font-size:1.1rem}footer{margin-top:28px;font-size:.9rem}</style><main>
<h1>O que foi implementado — e o que ainda falta</h1>
<p>Revisão dos 1.000 requisitos do portal de compras Sicoob. Código auditado: <code>6f1c5f9</code>.</p>
<p class="contagens">CONTAGENS</p>
<p class="aviso"><strong>0 de 100 etapas formalmente concluídas.</strong> Evidência local não equivale a aceite, implantação ou compra real. Esta consulta não altera o checklist oficial.</p>
<p><a href="../revisao-implementacao-2026-09-11.md">Relatório e prioridades</a> · <a href="matriz.csv" download>Baixar CSV</a> · <a href="matriz.json" download>Baixar JSON</a> · <a href="resumo-100-etapas.md">Resumo das 100 etapas</a></p>
<div class="filtros"><label>Buscar requisito, etapa ou diagnóstico<input id="busca" type="search" placeholder="Ex.: E079, estoque, aprovação"></label><label>Filtrar situação<select id="situacao"><option value="">Todas as situações</option>OPCOES</select></label></div>
<p id="resultado" role="status" aria-live="polite">1.000 requisitos exibidos.</p><section aria-label="Requisitos revisados">CARTOES</section>
<footer>Revisão estática/documental com testes dirigidos. Fontes por etapa são contexto, não comprovação de execução de cada ação. N = não demonstrado no escopo revisado, sem afirmar inexistência absoluta. Datas e resultados referem-se ao código auditado. <a href="metadados.json">Metodologia completa</a>.</footer></main>
<script>const busca=document.getElementById('busca'),situacao=document.getElementById('situacao'),itens=[...document.querySelectorAll('article')];const normalizar=t=>t.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();const textos=itens.map(i=>normalizar(i.innerText));function filtrar(){const q=normalizar(busca.value),s=situacao.value;let n=0;itens.forEach((item,i)=>{item.hidden=!!((s&&item.dataset.estado!==s)||(q&&!textos[i].includes(q)));if(!item.hidden)n++});document.getElementById('resultado').textContent=n+' de 1.000 requisitos exibidos.'}busca.addEventListener('input',filtrar);situacao.addEventListener('change',filtrar);</script></html>'''
pagina = pagina.replace('CONTAGENS', ' · '.join(f'{contagens[k]} {ESTADOS[k].lower()}' for k in ESTADOS)).replace('OPCOES', opcoes).replace('CARTOES', '\n'.join(cartoes))
(PASTA/'consulta.html').write_text(pagina)
assert hashlib.sha256((RAIZ/'docs/plano-implementacao/plano.json').read_bytes()).hexdigest() == metadados['sha256_plano_original']
gravar_json('validacao.json', {'ids_unicos': len(set(ids)), 'acoes_preservadas': 1000, 'etapas_com_dez_avaliacoes': len(etapas), 'referencias_locais_existentes': len(fontes), 'achados_com_ids_validos': len(achados), 'contagens': contagens, 'plano_original_inalterado': True, 'checklist_original_sem_baixas': True, 'html_gerado': True, 'verificacao_de_navegador': 'Consultar verificacao-visual.json quando disponível.'})
print(json.dumps({'etapas':len(etapas),'subetapas':len(linhas),'contagens':contagens,'fontes':len(fontes),'plano_original_inalterado':True}, ensure_ascii=False))
