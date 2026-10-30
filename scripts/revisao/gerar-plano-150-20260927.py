#!/usr/bin/env python3
"""Gera e verifica o plano documental, sem executar etapas ou acessar o banco."""
import argparse
import collections
import csv
import io
import json
import pathlib

RAIZ = pathlib.Path(__file__).resolve().parents[2]
PASTA = RAIZ / 'docs/plano-implementacao/plano-150-etapas-20260927'
args = argparse.ArgumentParser()
args.add_argument('--check', action='store_true', help='Confere derivados sem alterar arquivos.')
opcoes = args.parse_args()
plano = json.loads((PASTA / 'plano.json').read_text())
etapas = plano['etapas']
ids = [e['id'] for e in etapas]
assert ids == [f'P{i:03}' for i in range(1, 151)], 'IDs ausentes, repetidos ou fora de ordem.'
assert len({e['titulo'] for e in etapas}) == 150, 'Títulos repetidos.'
assert collections.Counter(e['fase'] for e in etapas) == {i: 10 for i in range(1, 16)}
por_id = {e['id']: e for e in etapas}
for e in etapas:
    assert set(e['dependencias']) <= set(ids) - {e['id']}, e['id']
    assert e['checklist'] == [{'id': f"{e['id']}.{i:02}", 'concluido': False} for i in range(1, 7)]
    assert e['estado'] == 'Planejada' and e['evidencia'] is None and e['data_aceite'] is None
    assert e['responsavel_nominal'] is None and e['revisor_nominal'] is None
    assert all(e[campo].strip() for campo in ['acao', 'cenario_obrigatorio', 'aceite_especifico'])

fila = set(ids)
encadeadas = set()
ondas = []
while fila:
    onda = sorted(i for i in fila if set(por_id[i]['dependencias']) <= encadeadas)
    assert onda, f'Ciclo de dependências: {sorted(fila)}'
    ondas.append(onda)
    encadeadas.update(onda)
    fila.difference_update(onda)

matriz_antiga = RAIZ / 'docs/execucao/revisao-plano-20260924'
origens_validas = {r['id'] for nome in ['matriz-250-etapas.json', 'benchmark-32.json']
                   for r in json.loads((matriz_antiga / nome).read_text())}
achados = {f'F{i:02}' for i in range(1, 13)}
mapeamento = collections.defaultdict(list)
for e in etapas:
    assert set(e['origens']) <= origens_validas | achados, e['id']
    for origem in e['origens']:
        mapeamento[origem].append(e['id'])
assert achados <= set(mapeamento), 'Achado F01–F12 sem tratamento.'
assert origens_validas <= set(mapeamento), 'Etapa histórica ou melhoria sem destino no plano.'


def tabela_csv(linhas):
    saida = io.StringIO(newline='')
    escritor = csv.DictWriter(saida, fieldnames=list(linhas[0]), lineterminator='\n')
    escritor.writeheader()
    escritor.writerows(linhas)
    return saida.getvalue()


intro = f'''# Plano de correções e melhorias — 150 etapas

**Versão 1.0 — {plano['data']}. Somente planejamento: 150 etapas e 900 itens de checklist pendentes.**

Base: [relatório da auditoria de 27/09]({plano['relatorio']}), código `{plano['base_codigo']}` e auditoria `{plano['base_auditoria']}`. PRs #42 e #43 estavam abertos na elaboração; o plano referencia a evidência por commit e não presume seu merge. Os fatos de 27/09 devem ser revalidados antes de implementar.

## Objetivo e limites

Encerrar as falhas F01–F12, completar as capacidades institucionais e homologar uma loja Sicoob conectada aos fluxos reais de compra. Aproveitar o código integrado e corrigir somente o que a evidência exigir. Etapas que já estiverem atendidas precisam de prova atual; não devem gerar reimplementação.

O projeto segue em construção. As etapas P147–P150 exigem operação real e dependem de decisão de lançamento; não são executadas automaticamente pela criação deste plano. O banco operacional é `{plano['projeto_canonico']}` e o catálogo `{plano['catalogo_somente_leitura']}` permanece exclusivamente de consulta. Não aplicar migrations históricas em bloco, fabricar entradas de ledger, expor segredos ou confundir MCP de outro projeto com o canônico.

Este plano organiza execução; não cancela os 1.000 subitens originais nem soma suas etapas a eles para produzir um percentual de produto pronto. P003 reconcilia a rastreabilidade completa e P004 revalida as 200 avaliações históricas. [Rastreabilidade das origens citadas](rastreabilidade.csv) mostra relações explícitas; não é prova de cobertura integral dos 1.000 subitens. Retirada de escopo exige decisão documentada do responsável de negócio.

## Como executar e encerrar

1. Confirmar baseline, dependências e premissas antes de editar; reproduzir a falha quando houver.
2. Executar o lote em worktree isolado, com diff mínimo, revisão e testes proporcionais ao risco.
3. Para mudança remota: conferir alvo e recuperação, validar em ambiente isolado, integrar revisão, publicar lote aprovado e verificar o resultado no canônico. Merge e OPTIONS 200 não comprovam implantação.
4. Registrar ambiente, data, commit, entrada sintética, resultado esperado/observado e limitações. Anexar logs sanitizados e evidência de autorização negativa quando aplicável.
5. Preencher executor e revisor nominais, seis itens do checklist e critério específico. Documento ou configuração só exige publicação remota quando isso fizer parte do seu aceite. Aceite local nunca fecha sozinho uma etapa operacional.
6. Reabrir etapa se teste regredir, evidência expirar ou dependência deixar de estar atendida. Não trocar falha por skip/allowlist e não contabilizar sonda que reproduz defeito como produto aprovado.

Responsáveis abaixo são funções sugeridas; nomes e capacidade serão definidos em P005. Não há datas de entrega ou esforço inventados. P1 bloqueia o aceite do fluxo afetado; P2 é requisito de completude do produto, também obrigatório antes do encerramento integral. Não se presume incidente em produção.

**Numeração não é ordem linear nem duração.** Dependências explícitas podem apontar a número posterior e são verificadas como grafo sem ciclos. Exemplo: P076 depende de P096, pois publicar o kit exige a validação física da embalagem. As frentes de catálogo, arte e design podem avançar antes da publicação; nunca começar a mudança dependente enquanto seu pré-requisito estiver aberto. [Ondas de precedência](validacao.json) são ordem técnica possível, não agenda de pessoas. Custos, escolha de política comercial e liberação de produção permanecem decisões dos responsáveis.

**Recuperação:** cada fase inclui contingência. Antes de mudança em banco, registrar backup/restauração e impacto de versão anterior; preferir correção progressiva de schema quando desfazer significar perder dados. Não executar DDL ad hoc sem rastreabilidade. Nos recursos externos, somente testar envio/alteração dentro do escopo autorizado.

## Frentes e marcos

| Etapas | Frente | Entrega de fechamento |
|---|---|---|
'''
for fase in plano['fases']:
    ultimo = fase['id'] * 10
    intro += f"| P{ultimo-9:03}–P{ultimo:03} | {fase['titulo']} | {por_id[f'P{ultimo:03}']['aceite_especifico']} |\n"

intro += '''
## Fontes de execução

- Diagnóstico F01–F12: relatório fixado acima. Matrizes históricas: `docs/execucao/revisao-plano-20260924/`; aceites de produto: `docs/plano-implementacao/plano-100-etapas.md`.
- Orçamentos: `src/services/QuoteService.ts`, `src/hooks/quotes/useQuotes.ts`, `src/pages/QuoteViewPage.tsx`, `src/hooks/useDiscountApproval.ts` e migrations de status `2026092711*`.
- Rascunhos: `src/components/quotes/QuoteAutoSave.tsx`, `src/hooks/useAutoSave.ts` e `src/contexts/AuthContext.tsx`.
- Logística e kits: `src/services/sicoob/logisticsReportService.ts`, `src/services/sicoob/fulfillmentService.ts`, `src/hooks/useKitStockForecast.ts`, `supabase/functions/sicoob-kit-quote/catalog.ts`.
- Implantação: `.github/workflows/deploy-sicoob-functions.yml`, `supabase/config.toml`, manifesto de autorização e runbooks em `docs/`.
- Segurança da Data API: tratar grants de objetos e RLS de linhas como controles distintos e validar ambos. [Documentação oficial Supabase](https://supabase.com/docs/guides/api/securing-your-api).
- Antes da implementação, consultar changelog e documentação vigentes. A revisão de 25/09 sobre PostgreSQL pede verificar aplicabilidade de extensões/operadores; não significa que o projeto esteja afetado. [Changelog oficial](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

## Etapas detalhadas
'''
intro += '\nTodos os 282 IDs históricos (250 etapas e 32 melhorias) possuem destino explícito no CSV de rastreabilidade. Isso é cobertura documental de encaminhamento, não certificação funcional dos 1.000 subitens.\n'
intro += '\n| Achado confirmado | Etapas de tratamento e verificação |\n|---|---|\n'
for achado in sorted(achados):
    intro += f"| {achado} | {', '.join(mapeamento[achado])} |\n"
md = [intro]
for fase in plano['fases']:
    md.extend([f"\n## Fase {fase['id']:02} — {fase['titulo']}\n",
               f"**Risco a controlar:** {fase['risco_principal']}\n",
               f"**Contingência:** {fase['contingencia']}\n"])
    for e in etapas:
        if e['fase'] != fase['id']:
            continue
        dependencias = ', '.join(e['dependencias']) or 'Nenhuma; ponto de partida.'
        if e['id'] == 'P150':
            dependencias = 'Todas as etapas P001–P149.'
        md.extend([f"\n### {e['id']} — {e['titulo']}\n",
                   f"**Prioridade:** {e['prioridade']} · **Responsável funcional:** {e['responsavel_funcional']} · **Estado:** Planejada.\n",
                   f"**Dependências:** {dependencias} **Origem:** {', '.join(e['origens'])}.\n",
                   f"**Ação:** {e['acao']}\n",
                   f"**Simulação obrigatória:** {e['cenario_obrigatorio']}\n",
                   f"**Entregável e aceite:** {e['aceite_especifico']}\n",
                   '**Checklist de conclusão:**\n',
                   '- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.',
                   '- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.',
                   '- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.',
                   '- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.',
                   '- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.',
                   '- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.\n',
                   '**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.\n'])

md.append('''
## Controle dos artefatos

`plano.json` é a definição estruturada; Markdown e CSV são derivados. O checklist publicado é uma definição inicial: todas as marcações permanecem pendentes. Registrar execução e assinaturas em evidência separada vinculada ao ID, sem alterar a definição silenciosamente. O validador desta versão verifica o plano inicial, não autentica pessoas nem certifica o produto.

Regerar: `python3 scripts/revisao/gerar-plano-150-20260927.py`. Conferir sem escrever: `python3 scripts/revisao/gerar-plano-150-20260927.py --check`. Mudança de escopo exige revisão da definição e de todos os derivados; manter histórico das decisões e avaliações anteriores.
''')
linhas_csv = [{
    'id': e['id'], 'fase': e['fase'], 'titulo': e['titulo'], 'prioridade': e['prioridade'],
    'dependencias': '; '.join(e['dependencias']), 'origens': '; '.join(e['origens']),
    'responsavel_funcional': e['responsavel_funcional'], 'acao': e['acao'],
    'simulacao': e['cenario_obrigatorio'], 'aceite': e['aceite_especifico'], 'estado': e['estado'],
    'executor_nominal': '', 'revisor_nominal': '', 'evidencia': '', 'data_aceite': '',
    'esforco': e['esforco'],
} for e in etapas]
rastreio = [{'origem': origem, 'etapas': '; '.join(destinos)} for origem, destinos in sorted(mapeamento.items())]
relatorio = {
    'etapas': 150, 'fases': 15, 'etapas_por_fase': 10, 'itens_checklist': 900,
    'etapas_implementadas_nesta_entrega': 0, 'itens_concluidos': 0,
    'dependencias_sem_ciclo': True, 'achados_F01_F12_cobertos': True,
    'origens_historicas_com_destino': len(origens_validas),
    'origens_historicas_explicitamente_citadas': len(set(mapeamento) - achados),
    'ordem_topologica_por_ondas': ondas,
    'limite': 'Validação estrutural do plano; não executa implementações, migrations ou testes do produto.',
}
saidas = {
    'plano.md': '\n'.join(md), 'etapas.csv': tabela_csv(linhas_csv),
    'rastreabilidade.csv': tabela_csv(rastreio),
    'validacao.json': json.dumps(relatorio, ensure_ascii=False, indent=2) + '\n',
}
assert saidas['plano.md'].count('### P') == 150
assert saidas['plano.md'].count('- [ ]') == 900
for nome, conteudo in saidas.items():
    caminho = PASTA / nome
    if opcoes.check:
        assert caminho.read_text() == conteudo, f'Derivado desatualizado: {nome}'
    else:
        caminho.write_text(conteudo)
print('Plano validado: 150 etapas, 15 fases, 900 itens pendentes, F01–F12 cobertos e dependências sem ciclo.')
