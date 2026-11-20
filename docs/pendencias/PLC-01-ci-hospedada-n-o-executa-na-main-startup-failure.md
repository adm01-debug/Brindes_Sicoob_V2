# PLC-01 — CI hospedada não executa na `main` (startup_failure)

- Origem: A. CI/CD, GitHub e governança de entrega (Planos de melhorias e correções)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P0 | Esforco: P
- Impacto no negocio: a versão que está no ar foi mesclada sem nenhum teste automático rodando no GitHub.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

restabelecer a execução de push e PR (billing/plano), rodar `ci.yml`, `sicoob-ci`, `e2e`, `codeql` e `security` no SHA `dc08200` e registrar a baseline verde.

## Camadas afetadas

- 

## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
