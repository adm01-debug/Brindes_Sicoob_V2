"""Valida o planejamento e simula bloqueios; não executa SQL nem implantação."""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import json
import re
import subprocess

PASTA = Path(__file__).resolve().parent
RAIZ = PASTA.parents[2]


def carregar(nome):
    return json.loads((PASTA / nome).read_text())


def exigir(condicao, mensagem):
    if not condicao:
        raise ValueError(mensagem)


plano = carregar("plano.json")
etapas = plano["etapas"]
por_id = {e["id"]: e for e in etapas}
exigir(len(etapas) == 100 and set(por_id) == {f"T{i:03d}" for i in range(1, 101)},
       "Devem existir exatamente 100 IDs únicos T001–T100.")
exigir(Counter(e["fase"] for e in etapas) == Counter({i: 10 for i in range(1, 11)}),
       "Cada uma das dez fases deve ter dez etapas.")
for etapa in etapas:
    checks = etapa["checklist"]
    exigir(len(checks) == 10, f"Checklist incompleto: {etapa['id']}")
    exigir([c["id"] for c in checks] == [f"{etapa['id']}.{i:02d}" for i in range(1, 11)],
           f"IDs de checklist inválidos: {etapa['id']}")
    exigir(all(c["acao"] and c["concluido"] is False and c["evidencia"] is None for c in checks),
           "A definição inicial não deve marcar implementação como concluída.")
    exigir(etapa["estado"] == "Planejada", "Esta versão é de planejamento.")
    for campo in ("origens", "objetivo", "cenario_positivo", "cenario_adversarial",
                  "aceite_especifico", "contingencia", "responsavel_funcional"):
        exigir(bool(etapa[campo]), f"Campo vazio: {etapa['id']}.{campo}")

visitados, ativos, ordem = set(), set(), []


def visitar(id_etapa):
    exigir(id_etapa in por_id, f"Dependência inexistente: {id_etapa}")
    exigir(id_etapa not in ativos, f"Ciclo em {id_etapa}")
    if id_etapa in visitados:
        return
    ativos.add(id_etapa)
    for dependencia in por_id[id_etapa]["dependencias"]:
        visitar(dependencia)
    ativos.remove(id_etapa)
    visitados.add(id_etapa)
    ordem.append(id_etapa)


for identificador in por_id:
    visitar(identificador)


def ancestrais(id_etapa):
    resultado = set()
    for dependencia in por_id[id_etapa]["dependencias"]:
        resultado.add(dependencia)
        resultado.update(ancestrais(dependencia))
    return resultado


# Memorização evita repetir a expansão do grafo ao simular T100.
from functools import lru_cache
ancestrais = lru_cache(maxsize=None)(ancestrais)

origens = carregar("rastreabilidade-250.json")
esperadas = {f"P{i:03d}" for i in range(1, 151)} | {f"W{i:03d}" for i in range(1, 101)}
exigir(len(origens) == 250 and {r["origem"] for r in origens} == esperadas,
       "Rastreabilidade deve preservar todas as 150 P e 100 W.")
for origem in origens:
    exigir(origem["destinos"] and set(origem["destinos"]) <= set(por_id), "Destino inválido.")
    exigir(origem["aceite_preservado"] and not origem["conclusao_formal"], "Aceite indevido.")
    for destino in origem["destinos"]:
        exigir(origem["origem"] in por_id[destino]["origens"], "Rastreabilidade não bidirecional.")
for etapa in etapas:
    esperados = {o["origem"] for o in origens if etapa["id"] in o["destinos"]}
    exigir(set(etapa["origens"]) == esperados, "Origem da etapa sem correspondência.")

historicas = carregar("origens-historicas.json")
original_150 = json.loads((RAIZ / "docs/plano-implementacao/plano-150-etapas-20260927/plano.json").read_text())
ids_anteriores = {o for e in original_150["etapas"] for o in e["origens"]}
exigir(len(historicas) == 294 and {r["origem"] for r in historicas} == ids_anteriores,
       "As 282 etapas e os 12 achados históricos precisam estar preservados.")
legados = carregar("subitens-legados-1000.json")
with (RAIZ / "docs/execucao/revisao-plano-20260927/requisitos-1000.csv").open() as arquivo:
    fontes_legadas = {r["id"]: r for r in csv.DictReader(arquivo)}
exigir(len(legados) == 1000 and {r["id"] for r in legados} == set(fontes_legadas),
       "Os 1.000 IDs legados devem ser preservados.")
for legado in legados:
    fonte = fontes_legadas[legado["id"]]
    exigir(legado["acao_original"] == fonte["acao_original"], "Ação legada alterada.")
    exigir(legado["aceite_original"] == fonte["aceite_integral_exigido"], "Aceite legado alterado.")
    exigir(legado["destinos"] and set(legado["destinos"]) <= set(por_id), "Subitem órfão.")

fontes = carregar("fontes.json")
for fonte in fontes:
    conteudo = subprocess.check_output(["git", "-C", str(RAIZ), "show",
                                        fonte["commit"] + ":" + fonte["arquivo"]])
    exigir(hashlib.sha256(conteudo).hexdigest() == fonte["sha256"], "Hash de fonte divergente.")
markdown = (PASTA / "plano.md").read_text()
exigir(len(re.findall(r"^#### T\d{3} —", markdown, re.M)) == 100, "Etapas divergentes no Markdown.")
exigir(len(re.findall(r"^- \[ \] \*\*T\d{3}\.\d{2}\*\*", markdown, re.M)) == 1000,
       "Checklists divergentes no Markdown.")
for destino in re.findall(r"\]\(([^)]+)\)", markdown):
    if not destino.startswith(("http", "#")):
        exigir((PASTA / destino.split("#")[0]).exists(), f"Link local quebrado: {destino}")

simulacoes = [
    ("Acesso remoto bloqueado não impede correção local de autorização",
     "T006" not in ancestrais("T031")),
    ("Aplicação estrutural exige acesso, restore e pipeline protegido",
     {"T006", "T008", "T019", "T027", "T028"} <= ancestrais("T029")),
    ("Contrato de status só publica após correção do bypass e provas",
     {"T031", "T034", "T035", "T037", "T046", "T047"} <= ancestrais("T039")),
    ("Propostas institucionais dependem da liberação documental",
     "T075" in ancestrais("T054")),
    ("Recompra homologada exige intenção persistente e revalidação",
     {"T035", "T068", "T069"} <= ancestrais("T070")),
    ("Governança financeira precede fechamento da campanha",
     {"T056", "T085", "T087", "T088"} <= ancestrais("T090")),
    ("Release exige segurança, acessibilidade e regressão integrada",
     {"T093", "T095", "T096"} <= ancestrais("T097")),
    ("Piloto e compra real dependem de decisão de lançamento",
     "T098" in ancestrais("T099")),
    ("Encerramento depende das outras 99 etapas",
     ancestrais("T100") == set(por_id) - {"T100"}),
    ("Mapeamento não concede aceite automático a origem legada",
     all(not r["conclusao_formal"] for r in origens + historicas + legados)),
]
for nome, resultado in simulacoes:
    exigir(resultado, "Simulação de planejamento falhou: " + nome)
resultado = {
    "tipo": "Validação estrutural e simulações de dependência; nenhuma implementação testada",
    "etapas": 100, "fases": 10, "checklists_novos": 1000, "conclusoes_marcadas": 0,
    "origens_diretas": 250, "origens_diretas_sem_destino": [], "origens_historicas": 294,
    "etapas_historicas": 282, "achados_historicos": 12, "subitens_legados": 1000,
    "subitens_legados_sem_destino": [], "dependencias_ciclicas": False,
    "fontes_com_hash_conferido": len(fontes), "ordem_topologica_valida": ordem,
    "simulacoes": [{"cenario": n, "resultado": "aprovado"} for n, _ in simulacoes],
}
(PASTA / "validacao.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=2) + "\n")
print("Plano válido: 100 etapas, 1.000 checks, 250 origens diretas, 294 históricas e 1.000 subitens.")
print("Grafo sem ciclos; dez simulações de dependência aprovadas. Nenhuma implantação executada.")
