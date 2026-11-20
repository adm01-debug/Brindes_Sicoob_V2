# QA-06 — Gate de "skips críticos" com escopo cego

- Origem: A. Testes unitários (Vitest / Deno) (Testes, CI e infraestrutura)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: novos testes desligados entram sem que o gate perceba.

## Estado real conferido

PARCIAL - gate implementado: scripts/check-critical-test-skip-budget.mjs:29-32 inclui raizes tests/p0, tests/rls, tests/security e e2e/flows/p0, reconhece `.spec.*` (:52) e mantem BASELINE_BY_FILE (orçamento POR ARQUIVO, :34-51). Execucao local validada 26/26 ocorrencias. NAO trocar por orcamento agregado/diretorio: enfraqueceria a catraca (remover skip antigo permitiria desligar outro teste do mesmo diretorio).

## O que falta (auditoria)

feito em 18/11/2026: e2e/flows/p0 e *.spec.* ja no gate com BASELINE_BY_FILE. Manter limite por arquivo; ampliar escopo apenas sem trocar por total agregado.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
