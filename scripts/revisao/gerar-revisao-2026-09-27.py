#!/usr/bin/env python3
"""Consolida avaliações explícitas sem promover diagnóstico histórico a ensaio atual."""
import collections
import csv
import hashlib
import json
import pathlib
import subprocess

RAIZ = pathlib.Path(__file__).resolve().parents[2]
ANTERIOR = RAIZ / 'docs/execucao/revisao-plano-20260924'
DESTINO = RAIZ / 'docs/execucao/revisao-plano-20260927'
BASE = '3094cbab22adfa012edcca5278680fa739df46ca'
ANTIGA = '6193793a7fad6ec7e1dacd0e68075e3685016e28'


def ler(nome):
    return json.loads((ANTERIOR / nome).read_text())


def gravar(nome, dados):
    (DESTINO / nome).write_text(json.dumps(dados, ensure_ascii=False, indent=2) + '\n')


def csv_gravar(nome, linhas):
    with (DESTINO / nome).open('w', newline='') as arquivo:
        writer = csv.DictWriter(arquivo, fieldnames=list(linhas[0]))
        writer.writeheader()
        for linha in linhas:
            writer.writerow({k: '; '.join(v) if isinstance(v, list) else v for k, v in linha.items()})


alterados = set(subprocess.check_output(
    ['git', 'diff', '--name-only', ANTIGA, BASE], cwd=RAIZ, text=True,
).splitlines())
ajustes = json.loads((DESTINO / 'reavaliacoes.json').read_text())
legenda = ler('resumo.json')['legenda']
todos = []
for nome, quantidade in [('matriz-250-etapas', 250), ('benchmark-32', 32)]:
    linhas = ler(nome + '.json')
    assert len(linhas) == quantidade
    for linha in linhas:
        linha['estado_em_20260924'] = linha['estado']
        linha['diagnostico_em_20260924'] = linha['diagnostico_e_condicao_de_fechamento']
        linha['evidencias_alteradas_desde_base_anterior'] = sorted(set(linha['evidencias']) & alterados)
        ajuste = ajustes.get(linha['id'])
        linha['reavaliacao_explicita_20260927'] = bool(ajuste)
        linha['data_do_diagnostico'] = '2026-09-27' if ajuste else '2026-09-24'
        if ajuste:
            linha['estado'] = ajuste.get('estado', linha['estado'])
            linha['significado'] = legenda[linha['estado']]
            linha['diagnostico_e_condicao_de_fechamento'] = ajuste['diagnostico']
            linha['evidencias'] = ajuste['evidencias']
            for referencia in linha['evidencias']:
                assert (RAIZ / referencia).is_file(), referencia
        linha['limite'] = ('Reavaliação delimitada às evidências citadas; não certifica todos os subitens.'
                          if ajuste else 'Diagnóstico histórico preservado, sem novo ensaio individual nesta rodada.')
        linha['conclusao_integral_certificada'] = False
    gravar(nome + '.json', linhas)
    csv_gravar(nome + '.csv', linhas)
    md = ['# Matriz de revisão — 27/09/2026', '',
          f'Base: `{BASE}`. A data em cada linha identifica a atualidade do diagnóstico.',
          'L vale somente para escopo local/documental. Nenhuma classificação é certificado de produção.', '',
          '| ID | Etapa | Estado | Data do diagnóstico | Diagnóstico e aceite restante |',
          '|---|---|---|---|---|']
    for linha in linhas:
        referencias = []
        for ref in linha['evidencias']:
            if (RAIZ / ref).exists():
                referencias.append(f'[{pathlib.Path(ref).name}](../../../{ref})')
            else:
                referencias.append(f'`{ref}` (fonte histórica removida do main)')
        texto = linha['diagnostico_e_condicao_de_fechamento'].replace('|', '\\|')
        md.append(f"| {linha['id']} | {linha['titulo']} | {linha['estado']} | {linha['data_do_diagnostico']} | {texto} Fontes: {' · '.join(referencias)} |")
    (DESTINO / (nome + '.md')).write_text('\n'.join(md) + '\n')
    todos.extend(linhas)

assert len({r['id'] for r in todos}) == 282
assert set(ajustes) <= {r['id'] for r in todos}
por_id = {r['id']: r for r in todos}
requisitos = []
for requisito in ler('requisitos-1000.json'):
    etapa = por_id[requisito['etapa']]
    requisitos.append({
        'id': requisito['id'], 'etapa': requisito['etapa'], 'acao_original': requisito['acao_original'],
        'checklist_original': requisito['estado_checklist_original'],
        'diagnostico_individual_fonte': 'docs/execucao/revisao-plano-20260924/requisitos-1000.json',
        'reensaiado_individualmente_em_20260927': False,
        'estado_da_etapa': etapa['estado'], 'data_diagnostico_da_etapa': etapa['data_do_diagnostico'],
        'pendencia_da_etapa': etapa['diagnostico_e_condicao_de_fechamento'],
        'aceite_integral_exigido': requisito['aceite_integral_exigido'], 'conclusao_formal': False,
    })
assert len(requisitos) == len({r['id'] for r in requisitos}) == 1000
csv_gravar('requisitos-1000.csv', requisitos)

inventario = []
for caminho in subprocess.check_output(['git', 'ls-tree', '-r', '--name-only', BASE, 'docs'], cwd=RAIZ, text=True).splitlines():
    conteudo = subprocess.check_output(['git', 'show', f'{BASE}:{caminho}'], cwd=RAIZ)
    inventario.append({'arquivo': caminho, 'bytes': len(conteudo), 'sha256': hashlib.sha256(conteudo).hexdigest()})
csv_gravar('inventario-docs.csv', inventario)
gravar('resumo.json', {
    'commit_codigo': BASE, 'data': '2026-09-27', 'documentos_inventariados': len(inventario),
    'etapas_documentais': 250, 'benchmark': 32, 'requisitos_indexados': 1000,
    'avaliacoes_reavaliadas': sum(r['reavaliacao_explicita_20260927'] for r in todos),
    'avaliacoes_historicas_preservadas': sum(not r['reavaliacao_explicita_20260927'] for r in todos),
    'requisitos_individuais_reensaiados': 0, 'etapas_produto_formalmente_encerradas': 0,
    'legenda': legenda,
    'contagens_documentais_nao_percentual_de_produto': {
        prefixo: dict(collections.Counter(r['estado'] for r in todos if r['id'].startswith(prefixo)))
        for prefixo in ['E', 'R', 'C', 'T', 'B']
    },
    'limites': ['Inventário não equivale a revisão semântica de cada documento.',
               '200 diagnósticos são históricos; não foram convertidos em certificação atual.',
               'As etapas se sobrepõem; não somar como percentual de produto concluído.',
               'Sem novo teste integral, aplicação de migration ou publicação de Edge nesta revisão.'],
})
print('Verificados: 250 etapas, 32 melhorias e 1000 requisitos sem duplicação; fontes das reavaliações existentes.')
