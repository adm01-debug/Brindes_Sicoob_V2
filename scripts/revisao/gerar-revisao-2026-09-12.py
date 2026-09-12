"""Materializa a revisão longitudinal sem baixar itens do plano oficial."""
from pathlib import Path
from collections import Counter
import copy
import csv
import hashlib
import html
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PASTA = ROOT / 'docs/execucao/revisao-implementacao-2026-09-12'
ANTIGA = ROOT / 'docs/execucao/revisao-implementacao'
COMMIT = 'cfbcd8f14f023d385ae4329a3ac037c1b19c7b17'
ANTERIOR = '6f1c5f94f612c13071b8dbe61b500b915e50b123'
HASH_PLANO = '50c5d83d7af3d34bb560ddfc90a270b722cb24068463a4c94cac752f6387e9f6'
EVID = 'docs/execucao/evidencias/'
ATUAL = 'docs/execucao/revisao-implementacao-2026-09-12/'
GRUPOS = {
    'ci': [ATUAL+'ci.json', ATUAL+'resumo-codeql.json', ATUAL+'testes-dirigidos.json', '.github/workflows/e2e.yml', '.github/workflows/codeql.yml', 'playwright.config.ts', 'e2e/routes/_factories.ts', 'e2e/flows/26-complete-flow.spec.ts'],
    'redacao': ['supabase/functions/_shared/catalog-redaction.ts', 'tests/functions/catalog-redaction.test.ts', 'supabase/functions/external-db-bridge/index.ts'],
    'metricas': ['src/services/sicoob/statsService.ts', 'src/pages/sicoob/orders/OrdersPage.tsx', 'src/pages/sicoob/orders/OrderDetailPage.tsx', 'src/pages/sicoob/GestorConsolidatedOrdersPage.tsx', 'src/components/sicoob/orders/LogisticsCommandCenter.tsx'],
    'politica': ['supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql', 'supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql', ATUAL+'simulacoes.json', 'scripts/revisao/simular-pendencias-2026-09-12.py'],
    'financeiro': ['src/pages/sicoob/orders/OrderDetailPage.tsx', 'src/hooks/orders/extensions/index.ts', 'src/hooks/orders/extensions/useOrderInvoices.ts', 'src/services/OrderService.ts', 'supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql'],
    'logistica': ['src/components/sicoob/orders/OrderLogisticsTab.tsx', 'src/services/sicoob/fulfillmentService.ts', 'supabase/migrations/20260912090000_sicoob_fulfillment.sql', 'tests/services/sicoobFulfillmentService.test.ts'],
    'organizacao': ['src/contexts/OrganizationContext.tsx', 'src/contexts/AuthContext.tsx'],
    'rotas': ['src/routes/config/public.ts', 'src/routes/config/products.ts', 'src/routes/config/quotes.ts', 'src/routes/config/admin.ts', 'src/pages/PublicQuoteApprovalPage.tsx', 'src/pages/ResetPassword.tsx'],
    'busca': ['src/hooks/useSearch.ts', 'src/components/catalog/CatalogHeader.tsx', 'src/hooks/catalog/useCatalogSearchState.ts', 'tests/hooks/useSearch.test.ts'],
    'armazenamento': ['src/stores/useRecentlyViewedStore.ts', 'src/contexts/AuthContext.tsx', 'scripts/revisao/pendencias-2026-09-12.cenarios.tsx', ATUAL+'testes-dirigidos.json'],
    'kit': ['src/hooks/useKitAutoSave.ts', 'src/hooks/useKitStockValidation.ts', 'src/components/kit-builder/KitSummary.tsx', 'src/hooks/useKitBuilder.ts', 'tests/hooks/useKitAutoSave.test.tsx', 'tests/hooks/useKitStockValidation.test.tsx', 'scripts/revisao/pendencias-2026-09-12.cenarios.tsx', ATUAL+'testes-dirigidos.json'],
    'versoes': ['src/services/quotes/quoteVersionService.ts', 'src/hooks/useQuoteVersions.ts', 'supabase/migrations/20260912100000_quote_versioning_atomic.sql', 'supabase/migrations/20260912130000_quote_versioning_family_roots.sql', 'supabase/migrations/20260912150000_quote_versioning_cycle_lock.sql', EVID+'versionamento-orcamento-atomico.json', 'tests/services/quoteVersionService.test.ts'],
    'recompra': ['src/components/orders/OneClickReorder.tsx', 'src/services/sicoob/orderService.ts', 'src/routes/config/quotes.ts'],
    'eventos': ['supabase/migrations/20260912110000_sicoob_order_status_events.sql', 'src/services/sicoob/orderService.ts', EVID+'eventos-status-sicoob.json', 'tests/services/sicoobOrderService.test.ts'],
    'campanhas': ['src/pages/admin/AdminCampanhasPage.tsx', 'src/utils/campaignExport.ts', 'tests/utils/campaignExport.test.ts'],
    'distribuicao': ['supabase/migrations/20260503000002_sicoob_consolidation_logic.sql', 'src/pages/sicoob/GestorConsolidatedOrdersPage.tsx', 'supabase/migrations/20260912090000_sicoob_fulfillment.sql'],
    'desempenho': ['src/App.tsx', 'src/components/layout/AuthenticatedShell.tsx', '.lighthouserc.cjs', ATUAL+'ci.json'],
    'configuracao': ['supabase/config.toml', 'README.md', 'docs/README.md', 'docs/plano-implementacao/README.md'],
    'revisao': [ATUAL+'atualizacoes.txt', 'docs/plano-implementacao/plano.json', 'scripts/revisao/gerar-revisao-2026-09-12.py'],
}
GRUPOS['kit'].append('scripts/revisao/vitest-pendencias-2026-09-12.config.ts')


def ler(path):
    return json.loads(path.read_text())


def salvar(nome, valor):
    (PASTA / nome).write_text(json.dumps(valor, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def texto_celula(valor):
    return str(valor).replace('|', '\\|').replace('\n', ' ')


def referencia(path):
    return f'[{path}](../../../{path})'


assert sha(ROOT / 'docs/plano-implementacao/plano.json') == HASH_PLANO
plano = ler(ROOT / 'docs/plano-implementacao/plano.json')
originais = {s['id']: s for e in plano for s in e['subetapas']}
matriz = copy.deepcopy(ler(ANTIGA / 'matriz.json'))
historicas = {s['id']: copy.deepcopy(s) for s in matriz['subetapas']}
estados = ler(ANTIGA / 'metadados.json')['classificacoes']
alteracoes = {}
for linha in (PASTA / 'atualizacoes.txt').read_text().splitlines():
    if not linha or linha.startswith('#'):
        continue
    ident, estado, grupos, nota = linha.split('|', 3)
    assert ident not in alteracoes and ident in originais and estado in estados
    alteracoes[ident] = {'classificacao': estado, 'diagnostico_individual': nota, 'grupos': grupos.split(',')}

# Estados dos achados originais preservam a história e delimitam o que falta.
# Cada tupla: estado, grupos, diagnóstico atual, condição de fechamento técnico.
achados_delta = {
    'A01': ('Corrigido localmente no escopo original', 'logistica', 'Rastreio e status usam RPC canônica com estado esperado; comprovante privado. Não há evidência de aplicação remota.', 'Aplicar e validar no schema alvo, incluindo falha, arquivo privado e usuário autorizado; aceite operacional.'),
    'A02': ('Parcial', 'financeiro,logistica', 'Logística reconciliada. Notas continuam no legado; useOrderPayments retorna [] e useOrderPilotApprovals retorna [] com mutate vazio. Os hooks provisórios são importados pelo detalhe Sicoob.', 'Persistir notas, pagamentos e piloto no domínio correto; remover hooks provisórios; ensaiar conciliação e autorização com dados segregados.'),
    'A03': ('Parcial', 'recompra', 'Serviço e rota foram corrigidos; preço e estoque-base são consultados. Cabeçalho e itens ainda são inserts separados; cleanup ignora erro. Variante, mínimo, múltiplo e mapeamento de PA não homologados.', 'RPC de criação idempotente, composição/SKU revalidada, rollback integral e ensaio da recompra até aprovação com dados reais segregados.'),
    'A04': ('Parcial', 'kit', 'Erro explícito é tratado com retry. S08 reproduz lastSavedAt após resposta sem erro, mas com zero linhas atualizadas. Concorrência e recuperação de sessão não foram encerradas.', 'Exigir confirmação da linha persistida e tratar zero linhas; testar falha, troca de kit, duas gravações fora de ordem e sessão interrompida.'),
    'A05': ('Parcial', 'kit', 'Variante selecionada e erro de consulta foram corrigidos. S07 reproduz demanda sintética repetida sem agregação; hook compara cada linha ao mesmo estoque. Ainda há validação comercial somente cliente.', 'Agregar demanda por SKU, validar relação variante/produto, estoque e restrições no servidor; ensaiar kits persistidos e substituição.'),
    'A06': ('Parcial', 'metricas', 'Previsões e contador saíram de pedidos. statsService ainda usa meta fixa, +0% e ignora erros; /gestor/agregados exibe dados fixos. Não há remoção global de métricas fictícias.', 'Substituir mocks ativos por fonte confirmada ou estado indisponível; separar erro de zero; conciliar indicadores e verificar telas por papel.'),
    'A07': ('Corrigido localmente no escopo original', 'versoes', 'Versionamento usa RPC transacional com família, concorrência e proteção de ciclos; ensaios SQL e regressão do serviço disponíveis. Não certifica edição direta de proposta/arte aceita.', 'Aplicar migrations no banco próprio e repetir concorrência/rollback via API; validar arte e condições da proposta completa.'),
    'A08': ('Parcial', 'organizacao', 'Troca explícita une papel e organização. fetchOrganizations mantém respostas antigas e estado no catch; lista sem organização ativa não zera currentRole. Corrida inferida do fluxo assíncrono, não reproduzida em API real.', 'Descartar respostas de sessão/contexto obsoleto, falhar sem preservar papel antigo e testar revogação/logout/duas respostas fora de ordem.'),
    'A09': ('Corrigido localmente no escopo original', 'busca', 'Busca principal usa usuário/cooperativa/PA e tem teste de isolamento. O achado não certifica outros stores: vistos recentemente são tratados em A20.', 'Confirmar busca após troca/logout com duas contas reais e validar retenção de históricos por contexto.'),
    'A10': ('Corrigido localmente no escopo original', 'redacao', 'Redação recursiva cobre setup_cost, unit_cost, margem e fornecedor; regressão dirigida aprovada.', 'Confirmar respostas de cada operação do bridge e ACL mínima da identidade remota sem escrita na origem.'),
    'A11': ('Corrigido localmente no escopo original', 'campanhas', 'Colisão de nome corrigida; CSV escapa delimitadores/aspas/quebras e possui teste. Não certifica campanha institucional com destinos.', 'Validar download/exportação na jornada autenticada e arquivo aberto com dados permitidos.'),
    'A12': ('Corrigido localmente no escopo original', 'eventos', 'Transições canônicas gravam histórico e notificações in-app na mesma transação. Repetição, destinatários e falha com rollback foram simulados.', 'Verificar aplicação real, destinatários autorizados e histórico no schema completo; formalizar canais externos se exigidos.'),
    'A13': ('Aberto', 'ci', 'SARIF atual tem 13 resultados; 26 era o snapshot anterior. Workflow com upload:never preserva artefato e não aplica gate de severidade. Contagem menor não prova correções individuais.', 'Triar cada resultado por caminho alcançável, impacto e teste; corrigir ou justificar falsos positivos; definir gate e retenção das evidências.'),
    'A14': ('Parcial', 'ci', 'Falhas originais de qualidade/E2E foram corrigidas. CI atual passou, mas smoke ignora 33, projetos autenticados são excluídos sem credenciais e oito casos exigiram retry. Jornada real não homologada.', 'Gate de release deve exigir credenciais de homologação, cenários autenticados e conteúdo persistido; resolver flakiness e registrar escopo executado.'),
    'A15': ('Parcial', 'politica', 'Há alçada, profile ativo e autoaprovação no servidor; falta vínculo atual em organization_members, arte/delegação e aceite institucional. S01–S04 refutam snapshot imutável.', 'Resolver A17, verificar vínculo/competência corrente, aplicar política aceita por cooperativa e repetir matriz positiva/negativa real.'),
    'A16': ('Aberto', 'distribuicao', 'RPC apenas cria grupo; não vincula pedidos. Página ativa usa dois lotes fixos e botões sem ação. Remessa canônica é única por pedido e não reconcilia itens por destino.', 'Implementar divisão por destino/item, recebimentos parciais, divergências e reconciliação; percorrer três destinos e operador real.'),
}
achados = ler(ANTIGA / 'achados.json')
for a in achados:
    a['diagnostico_historico'] = a['diagnostico']
    a['titulo_historico'] = a['titulo']
    a['referencias_historicas'] = a['referencias']
    estado, grupos, nota, fechamento = achados_delta[a['id']]
    a.update(estado=estado, diagnostico=nota, condicao_fechamento=fechamento,
             referencias=sorted({f for g in grupos.split(',') for f in GRUPOS[g]}),
             validado_em_producao=False, evidencia_tipo='Código atual, regressões dirigidas e/ou simulações; limites no diagnóstico')
    a['reproducao_historica'] = a.pop('reproducao', None)
    a['reproducao'] = 'Ver diagnóstico atual e evidências vinculadas; não executar simulador histórico como se retratasse o candidato atual.'
    if a['id'] == 'A13':
        a['titulo'] = 'CodeQL atual possui 13 resultados sem triagem conclusiva'
    elif a['id'] == 'A14':
        a['titulo'] = 'CI passou com lacunas de cobertura e instabilidade'
    elif a['id'] == 'A02':
        a['titulo'] = 'Notas no modelo legado; pagamentos e piloto provisórios no detalhe Sicoob'

titulos_atuais = {
    'A01': 'Logística canônica corrigida localmente, aguardando homologação real',
    'A03': 'Recompra reconsulta produto-base, mas criação e composição continuam incompletas',
    'A04': 'Autosave trata erro explícito, mas aceita atualização sem linha persistida',
    'A05': 'Estoque por variante corrigido; demanda repetida e servidor ainda incompletos',
    'A06': 'Métricas artificiais e erros convertidos em zero persistem em outros módulos',
    'A07': 'Versionamento transacional corrigido localmente, sem aceite de jornada completa',
    'A08': 'Carregamento de organização ainda conserva contexto obsoleto em falha ou corrida',
    'A09': 'Histórico da busca principal segmentado e testado localmente',
    'A10': 'Redação comercial recursiva corrigida no contrato local',
    'A11': 'Exportação de campanhas corrigida e testada localmente',
    'A12': 'Eventos de status e notificações in-app tornaram-se transacionais',
}
for a in achados:
    a['titulo'] = titulos_atuais.get(a['id'], a['titulo'])

novos = [
    ('A17', 'P0', 'Política vinculada não é imutável e fallback pode trocar a regra aplicada', 'politica',
     'S01–S04: base técnica muda ao publicar política; edição administrativa muda conteúdo/impedimento de referência já usada; global mais recente vence específica; referência do pedido continua editável.',
     ['E008.08','E008.09','E018.05','E059.04','E061.02','E064.07','E066.03','E066.05','E068.03','E099.04'],
     'Congelar conteúdo e referência, definir precedência específica/global, impedir mudança retroativa e repetir S01–S04 com esquema/RLS completo.'),
    ('A18', 'P1', 'Trigger de itens não cobre pós-aprovação nem ambos os lados da transferência', 'politica',
     'S05 altera itens de pedido confirmado para 200 mantendo total aprovado 100. S06 transfere item de pedido em análise para draft. Escritas como postgres demonstram lacuna de invariante; não demonstram permissão de UPDATE ao comprador via RLS.',
     ['E059.04','E059.06','E059.10','E064.07','E069.04','E085.06','E086.09'],
     'Preservar composição após aceite, comparar OLD/NEW.order_id e exigir revisão formal com total consistente; repetir como ator autenticado e escritor privilegiado.'),
    ('A19', 'P1', 'Asserções E2E genéricas podem aprovar uma tela sem o conteúdo esperado', 'ci',
     'Happy público e autenticado padrão aceitam qualquer heading; timeout aceita body. Fluxo 26 percorre catálogo→URL de novo orçamento sem salvar item ou decidir pedido. Além da exclusão autenticada, falta poder de detecção.',
     ['E013.05','E019.07','E050.08','E059.07','E086.04','E090.05','E095.02'],
     'Exigir identidade e conteúdo do fixture, ação e resultado persistido, verificar mock atingido e estados específicos; uma resposta inválida deve fazer o happy falhar.'),
    ('A20', 'P1', 'Vistos recentemente sobrevivem em memória à limpeza da chave no logout', 'armazenamento',
     'S09 executa o store real e a remoção de chave utilizada pelo logout: lista continua em memória. Chave e store não contêm usuário/cooperativa; a troca de organização não possui isolamento próprio.',
     ['E015.08','E025.05','E025.08','E044.09','E087.08'],
     'Segmentar por identidade/contexto, limpar store e timers, testar troca de organização e A→logout→B sem recarregar a SPA.'),
]
for ident, prioridade, titulo, grupo, diagnostico, ids, fechamento in novos:
    achados.append({'id': ident, 'titulo': titulo, 'prioridade': prioridade, 'evidencia_tipo': 'Simulação local delimitada' if ident != 'A19' else 'Inspeção de asserções e CI',
        'referencias': GRUPOS[grupo], 'subetapas': ids, 'diagnostico': diagnostico,
        'reproducao': 'scripts/revisao/simular-pendencias-2026-09-12.py' if ident in ('A17','A18') else 'scripts/revisao/pendencias-2026-09-12.cenarios.tsx' if ident == 'A20' else 'e2e/routes/_factories.ts',
        'condicao_fechamento': fechamento, 'estado': 'Aberto', 'validado_em_producao': False})

for s in matriz['subetapas']:
    assert s['acao_original'] == originais[s['id']]['acao']
    s['classificacao_anterior'] = s['classificacao']
    s['diagnostico_anterior'] = s['diagnostico_individual']
    s['origem_reavaliacao'] = 'Releitura documental; diagnóstico histórico mantido. Não representa novo ensaio de comportamento deste requisito.'
    s['referencias_reavaliacao'] = []
    if s['id'] in alteracoes:
        mudanca = alteracoes[s['id']]
        s['classificacao'] = mudanca['classificacao']
        s['situacao'] = estados[s['classificacao']]
        s['diagnostico_individual'] = mudanca['diagnostico_individual']
        s['origem_reavaliacao'] = 'Diagnóstico atualizado por inspeção dirigida e evidências identificadas; ver limites de cada fonte/ensaio.'
        s['referencias_reavaliacao'] = sorted({f for g in mudanca['grupos'] for f in GRUPOS[g]})
    s['achados_diretos'] = [a['id'] for a in achados if s['id'] in a['subetapas']]
    s['conclusao_formal'] = False
    s['condicao_para_baixa'] = (f"Demonstrar integralmente: {s['acao_original']} "
        f"Resolver a lacuna descrita quando houver. Entregável: {s['entrega_exigida']} "
        f"Aceite: {s['aceite_exigido']} Registrar evidência revisável, responsável nominal, revisor, aceite e dependências no controle oficial; L não concede baixa automática.")
    for a in achados:
        if a['id'] in s['achados_diretos']:
            s['referencias_reavaliacao'] = sorted(set(s['referencias_reavaliacao']) | set(a['referencias']))

contagem = dict(Counter(s['classificacao'] for s in matriz['subetapas']))
mudancas = [{'id': s['id'], 'antes': s['classificacao_anterior'], 'agora': s['classificacao']} for s in matriz['subetapas'] if s['classificacao'] != s['classificacao_anterior']]
meta = {
    'data': '2026-09-12', 'commit_codigo_auditado': COMMIT, 'commit_anterior': ANTERIOR,
    'sha256_plano_original': HASH_PLANO, 'etapas_revisadas_documentalmente': 100,
    'subetapas_revisadas_documentalmente': 1000, 'diagnosticos_reescritos': len(alteracoes),
    'diagnosticos_historicos_mantidos': 1000-len(alteracoes), 'mudancas_de_classificacao': mudancas,
    'classificacoes': estados, 'contagens': contagem, 'contagens_anteriores': ler(ANTIGA/'metadados.json')['contagens'],
    'etapas_formalmente_concluidas': 0, 'subetapas_baixadas_no_checklist': 0,
    'achados_priorizados': len(achados), 'estados_achados': dict(Counter(a['estado'] for a in achados)),
    'metodo': 'Releitura dos 1.000 requisitos e 32 melhorias; auditoria longitudinal a partir do diagnóstico de 11/09, diff de código até cfbcd8f, inspeção dirigida de implementações, 37 regressões, nove reproduções de lacunas e consulta da CI/SARIF atuais.',
    'limites': [
        'Cobertura documental de 1.000 requisitos não equivale a 1.000 comportamentos executados.',
        'Diagnósticos históricos mantidos estão identificados; referências contextuais e hashes não são prova automática de implementação ou nova inspeção de cada linha.',
        'L reconhece evidência local delimitada, sem aceite formal, implantação ou tráfego real.',
        'N significa não localizado/não demonstrado nos materiais; não prova inexistência absoluta de processo ou schema remoto.',
        'SQL usa fixture mínima e quatro migrations com escritas postgres; não comprova explorabilidade de RLS/API remota.',
        'Três testes de lacunas usam módulos reais e dependências simuladas; testes verdes reproduzem defeitos conhecidos, não aprovam o produto.',
        'CI exclui projetos autenticados sem credenciais; oito flaky, 33 skips no smoke e 13 alertas SARIF não são homologação.',
        'Políticas, marca, participantes, duas cooperativas reais, schema implantado e produção permanecem sem aceite comprovado.',
        'Os dados originais do catálogo externo não foram alterados; esta revisão não aplicou migrations nem publicou o produto.',
    ],
}
matriz['metadados'] = meta
for etapa in matriz['etapas']:
    linhas = [s for s in matriz['subetapas'] if s['etapa'] == etapa['id']]
    etapa['contagens'] = dict(Counter(s['classificacao'] for s in linhas))
    etapa['situacao'] = 'Não concluída formalmente; ver contagens e diagnóstico de cada subetapa'
    etapa['conclusao_formal'] = False

benchmark = ler(ANTIGA/'benchmark-32-melhorias.json')
benchmark_delta = {
    'B01': ('Local delimitado', 'Histórico principal agora segmentado por usuário/cooperativa/PA, com seleção e limpeza testadas. Não inclui vistos recentemente.'),
    'B05': ('Local delimitado', 'Redação recursiva de custos/margem/fornecedor corrigida e testada; ACL e respostas reais da origem ainda não homologadas.'),
    'B06': ('Parcial', 'Versão de proposta e status/verba são transacionais. Recompra/criação integral continuam separadas; política e composição aprovadas têm lacunas S01–S06.'),
    'B09': ('Validação externa', 'CI passou, mas projetos autenticados são excluídos sem credenciais. Login→compra→aprovação com schema real não foi homologado.'),
    'B14': ('Parcial', 'Chave global; logout remove storage, mas não limpa store em memória (S09). Falta segregação por usuário/cooperativa e ciclo de sessão real.'),
    'B16': ('Parcial', 'Erro explícito de autosave corrigido; S08 ainda reproduz falso salvo sem linha atualizada. Recuperação do orçamento integral e concorrência pendentes.'),
    'B19': ('Não demonstrado', 'Validação integral de capacidade, preço e estoque no servidor não demonstrada. Cliente respeita variante escolhida, mas demanda repetida não é agregada (S07).'),
    'B21': ('Parcial', 'Status/histórico/avisos Sicoob são atômicos; notas legadas, piloto/pagamentos provisórios e ausência de destinos impedem linha única completa.'),
    'B22': ('Parcial', 'Rotas canônicas corrigidas e mocks públicos passam; asserções genéricas, revogação e isolamento real ainda não sustentam aceite.'),
    'B23': ('Parcial', 'Dados artificiais saíram de pedidos; statsService conserva meta/fallback e agregados têm valores fixos. Funil real ainda não conciliado.'),
    'B24': ('Parcial', 'Shell pesado saiu do login e Lighthouse CI passou; faltam jornadas autenticadas, domínio alvo e métricas de campo.'),
    'B27': ('Parcial', 'Serviço/rota corrigidos e nova consulta de preço/estoque-base realizada no código. Variante, mínimo, múltiplo, endereço e criação atômica continuam pendentes.'),
    'B31': ('Não demonstrado', 'Página usa lotes fixos, RPC só cria grupo e remessa é única por pedido. Divisão/reconciliação por destino ainda não implementada (A16).'),
    'B32': ('Parcial', 'Políticas por cooperativa existem, mas snapshot/precedência falham (S01–S04). Troca explícita de papel foi corrigida; carregamento de contexto continua sujeito a resposta antiga.'),
}
for b in benchmark:
    b['situacao_anterior'] = b['situacao']
    b['diagnostico_anterior'] = b['diagnostico']
    b['melhoria_historica'] = b['melhoria']
    if b['id'] in benchmark_delta:
        b['situacao'], b['diagnostico'] = benchmark_delta[b['id']]
    # Separar a definição da melhoria das avaliações antigas anexadas ao texto.
    if b['id'] in ('B01','B05','B06'):
        b['melhoria'] = b['melhoria'].split('. ')[0] + '.'
    b['conclusao_formal'] = False

salvar('metadados.json', meta)
salvar('matriz.json', matriz)
salvar('achados.json', achados)
salvar('benchmark-32-melhorias.json', benchmark)

with (PASTA/'matriz.csv').open('w', newline='', encoding='utf-8-sig') as arquivo:
    campos = ['id','etapa','fase','acao_original','classificacao_anterior','classificacao','diagnostico_individual','origem_reavaliacao','achados_diretos','conclusao_formal','condicao_para_baixa']
    writer = csv.DictWriter(arquivo, fieldnames=campos, extrasaction='ignore', lineterminator='\n')
    writer.writeheader()
    for s in matriz['subetapas']:
        writer.writerow({**s, 'achados_diretos': ', '.join(s['achados_diretos'])})

cabecalho = '# Revisão dos 1.000 requisitos — 12/09/2026\n\n'
cabecalho += f'Código: `{COMMIT}`. L={contagem.get("L",0)}, P={contagem.get("P",0)}, N={contagem.get("N",0)}, V={contagem.get("V",0)}. **0 etapas formalmente concluídas.**\n\n'
cabecalho += 'L = evidência local delimitada; P = parcial; N = não demonstrado/localizado; V = validação externa necessária. Nenhuma classificação concede baixa. Referências históricas são contexto; referências da reavaliação e seus limites estão identificados.\n\n'
resumo = cabecalho + '| Etapa | Título | L | P | N | V | Conclusão formal |\n|---|---|---:|---:|---:|---:|---|\n'
completo = cabecalho
for e in matriz['etapas']:
    c = e['contagens']
    resumo += f'| {e["id"]} | {texto_celula(e["titulo"])} | {c.get("L",0)} | {c.get("P",0)} | {c.get("N",0)} | {c.get("V",0)} | Não |\n'
    completo += f'## {e["id"]} — {e["titulo"]}\n\n'
    for s in [s for s in matriz['subetapas'] if s['etapa'] == e['id']]:
        completo += f'### {s["id"]} · {s["classificacao"]}\n\n**Requisito:** {s["acao_original"]}\n\n{s["diagnostico_individual"]}\n\n'
        completo += f'**Origem:** {s["origem_reavaliacao"]} Anterior: {s["classificacao_anterior"]}.\n\n'
        refs = s['referencias_reavaliacao'] or s['referencias_contextuais']
        completo += '**Referências ' + ('da reavaliação' if s['referencias_reavaliacao'] else 'contextuais históricas') + ':** ' + ', '.join(referencia(f) for f in refs) + '.\n\n'
        completo += f'**Condição para baixa:** {s["condicao_para_baixa"]}\n\n'
(PASTA/'resumo-100-etapas.md').write_text(resumo)
(PASTA/'matriz.md').write_text(completo.rstrip() + '\n')

texto = '# Achados e condições de fechamento — 12/09/2026\n\nAs prioridades indicam risco para a liberação; nenhuma correção local equivale a produção. Títulos históricos são preservados no JSON para rastrear o escopo original.\n\n'
for a in achados:
    texto += f'## {a["id"]} · {a["prioridade"]} · {a["titulo"]}\n\n**Estado:** {a["estado"]}.\n\n{a["diagnostico"]}\n\n**Fechamento:** {a["condicao_fechamento"]}\n\n**Subetapas diretamente associadas:** {", ".join(a["subetapas"])}.\n\n**Referências:** ' + ', '.join(referencia(f) for f in a['referencias']) + '.\n\n'
(PASTA/'achados.md').write_text(texto.rstrip() + '\n')
texto = '# Reavaliação das 32 melhorias Promo Gifts → Sicoob\n\nNenhuma conclusão formal ou implantação é concedida por esta tabela.\n\n| ID | Melhoria | Antes | Agora | Diagnóstico |\n|---|---|---|---|---|\n'
for b in benchmark:
    texto += '| ' + ' | '.join(texto_celula(b[k]) for k in ('id','melhoria','situacao_anterior','situacao','diagnostico')) + ' |\n'
(PASTA/'benchmark-32-melhorias.md').write_text(texto)

# Manifesto registra os bytes consultáveis; não apresenta hash como teste funcional.
fontes = sorted({f for s in matriz['subetapas'] for f in s['referencias_contextuais'] + s['referencias_reavaliacao']})
manifesto = []
for f in fontes:
    path = ROOT/f
    assert path.is_file(), f'Fonte ausente: {f}'
    atual = sha(path)
    capturado = subprocess.run(['git','-C',str(ROOT),'show',f'{COMMIT}:{f}'], capture_output=True)
    historico = subprocess.run(['git','-C',str(ROOT),'show',f'{ANTERIOR}:{f}'], capture_output=True)
    no_commit = capturado.returncode == 0 and hashlib.sha256(capturado.stdout).hexdigest() == atual
    if f.startswith(('src/','supabase/','tests/','e2e/','.github/')):
        assert no_commit, f'Código mudou após o candidato: {f}'
    manifesto.append({'arquivo': f, 'sha256': atual, 'bytes': path.stat().st_size,
        'conteudo_igual_ao_commit_codigo': no_commit,
        'alterado_desde_revisao_anterior': historico.returncode != 0 or hashlib.sha256(historico.stdout).hexdigest() != atual,
        'papel': 'Referência contextual ou evidência dirigida; ver diagnóstico e limites, não comprovação automática.'})
salvar('fontes.json', manifesto)

linhas_html = []
for s in matriz['subetapas']:
    dados = html.escape(' '.join([s['id'], s['titulo_etapa'], s['acao_original'], s['diagnostico_individual'], *s['achados_diretos']]), quote=True)
    refs = s['referencias_reavaliacao'] or s['referencias_contextuais']
    links = ' · '.join(f'<a href="../../../{html.escape(f, quote=True)}">{html.escape(f)}</a>' for f in refs)
    linhas_html.append(f'<article data-estado="{s["classificacao"]}" data-etapa="{s["etapa"]}" data-busca="{dados}"><details><summary><strong>{s["id"]}</strong> <span class="estado">{s["classificacao"]}</span> {html.escape(s["acao_original"])}</summary><p>{html.escape(s["diagnostico_individual"])}</p><p class="origem">{html.escape(s["origem_reavaliacao"])}</p><p><b>Antes:</b> {s["classificacao_anterior"]} · <b>Conclusão formal:</b> não.</p><p>{html.escape(s["condicao_para_baixa"])}</p><div class="fontes">{links}</div></details></article>')
pagina = '''<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisão Sicoob — 1.000 requisitos</title>
<style>:root{font:16px/1.55 system-ui;color:#003641;background:#f4f7f6}*{box-sizing:border-box}body{max-width:1160px;margin:auto;padding:24px}h1{font-size:clamp(1.6rem,4vw,2.4rem)}a{color:#00694f;overflow-wrap:anywhere}header,.filtros{background:white;padding:20px;border-radius:14px;margin-bottom:16px}.filtros{display:flex;gap:16px;flex-wrap:wrap}label{display:grid;gap:4px;flex:1;min-width:180px}input,select{font:inherit;padding:10px;border:1px solid #78938c;border-radius:6px;width:100%;min-width:0}article{border:1px solid #d1ded9;background:white;border-radius:8px;padding:14px;margin:10px 0}summary{cursor:pointer}summary strong{margin-right:10px}.estado{display:inline-block;background:#e1eee9;padding:0 8px;border-radius:4px;font-weight:700;margin-right:8px}.origem,.fontes{font-size:.9rem;color:#455e58}.fontes{overflow-wrap:anywhere}article[hidden]{display:none}input:focus,select:focus,summary:focus,a:focus{outline:3px solid #007e63;outline-offset:3px}#vazio{padding:20px;background:white}footer{margin-top:24px} @media(max-width:500px){body{padding:12px}.filtros{padding:12px}label{min-width:100%}}</style>
<header><h1>Revisão de implementação Sicoob</h1><p>100 etapas · 1.000 subetapas · <strong>nenhuma etapa formalmente encerrada</strong>.</p><p>__CONTAGENS__</p><p>L: evidência local delimitada. P: parcial. N: não demonstrado/localizado. V: validação externa necessária. Estes números não são nota de qualidade nem percentual de implantação.</p><p>Código auditado: <code>cfbcd8f</code> · 12/09/2026. Diagnósticos históricos mantidos estão identificados; revisão documental não equivale a 1.000 testes.</p><nav><a href="../revisao-implementacao-2026-09-12.md">Relatório</a> · <a href="achados.md">Achados</a> · <a href="benchmark-32-melhorias.md">32 melhorias</a> · <a href="matriz.csv" download>Baixar CSV</a> · <a href="matriz.json" download>Baixar JSON</a></nav></header>
<section class="filtros" aria-label="Filtros"><label>Buscar requisito ou diagnóstico<input id="busca" type="search" placeholder="Ex.: E055.03, política, estoque"></label><label>Classificação<select id="estado"><option value="">Todas</option value="L">L — Local delimitado</option><option value="P">P — Parcial</option><option value="N">N — Não demonstrado</option><option value="V">V — Validação externa</option></select></label><label>Etapa<select id="etapa"><option value="">Todas</option>__ETAPAS__</select></label></section><p id="contador" role="status" aria-live="polite">1.000 requisitos exibidos</p><p id="vazio" hidden>Nenhum requisito corresponde aos filtros.</p><main>__LINHAS__</main><footer>Consulta somente de leitura. O checklist oficial e suas regras de aceite permanecem preservados.</footer>
<script>const artigos=[...document.querySelectorAll('article')];const busca=document.querySelector('#busca');const estado=document.querySelector('#estado');const etapa=document.querySelector('#etapa');const normalizar=s=>s.normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase();for(const a of artigos)a.dataset.normalizado=normalizar(a.dataset.busca);function filtrar(){let n=0;const q=normalizar(busca.value.trim());for(const a of artigos){a.hidden=!!((estado.value&&a.dataset.estado!==estado.value)||(etapa.value&&a.dataset.etapa!==etapa.value)||(q&&!a.dataset.normalizado.includes(q)));if(!a.hidden)n++;}document.querySelector('#contador').textContent=n.toLocaleString('pt-BR')+' requisitos exibidos';document.querySelector('#vazio').hidden=n!==0;}busca.addEventListener('input',filtrar);estado.addEventListener('change',filtrar);etapa.addEventListener('change',filtrar);</script></html>'''
pagina = pagina.replace('__CONTAGENS__', ' · '.join(f'{k}: {contagem.get(k,0)}' for k in 'LPNV')).replace('__ETAPAS__', ''.join(f'<option value="{e["id"]}">{e["id"]} — {html.escape(e["titulo"])}</option>' for e in matriz['etapas'])).replace('__LINHAS__', '\n'.join(linhas_html))
(PASTA/'consulta.html').write_text(pagina)

assert len(matriz['etapas']) == 100 and len(matriz['subetapas']) == len(originais) == 1000
assert {s['id'] for s in matriz['subetapas']} == set(originais)
assert len(benchmark) == 32 and len({b['id'] for b in benchmark}) == 32
for e, base in zip(matriz['etapas'], plano):
    rows = [s for s in matriz['subetapas'] if s['etapa'] == e['id']]
    assert len(rows) == 10 and e['id'] == base['id']
    for s in rows:
        assert s['dependencias_etapa'] == base['dependencias']
        assert s['aceite_exigido'] == base['aceite'] and s['entrega_exigida'] == base['entrega']
        assert not s['conclusao_formal'] and s['estado_checklist_original'] == originais[s['id']]['estado']
assert sha(ROOT/'docs/plano-implementacao/plano.json') == HASH_PLANO
salvar('validacao.json', {
    'resultado': 'Estrutura e rastreabilidade verificadas; não é aceite de implementação',
    'etapas': 100, 'subetapas': 1000, 'dez_por_etapa': True, 'ids_unicos': True,
    'acoes_criterios_entregaveis_dependencias_preservados': True, 'checklist_original_sha256': HASH_PLANO,
    'checklist_original_inalterado': True, 'conclusoes_formais': 0, 'benchmark': 32,
    'fontes_existentes_com_hash': len(manifesto), 'contagens': contagem,
})
print(json.dumps({'contagens': contagem, 'diagnosticos_atualizados': len(alteracoes), 'classificacoes_alteradas': len(mudancas), 'fontes': len(manifesto)}, ensure_ascii=False))
