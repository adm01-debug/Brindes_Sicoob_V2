# QA-50 — Hooks Husky contraditos pela regra `--no-verify`

- Origem: I. Scripts npm (Testes, CI e infraestrutura)
- Status auditoria: PARCIAL | Prioridade: P3 | Esforco: P
- Impacto no negocio: a proteção local existe no papel, mas os agentes têm ordem de ignorá-la.

## Estado real conferido

PROIBICAO DE BYPASS IMPLEMENTADA - AGENTS.md:65-66 proibe `--no-verify`; .husky/pre-commit:1 roda lint-staged; .husky/pre-push:1 exige typecheck, lint e testes. NAO remover hooks. Pendencia residual: hook leve vitest related (opcional).

## O que falta (auditoria)

um hook leve (`vitest related`) sem orientação de bypass, ou remover o hook.

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
