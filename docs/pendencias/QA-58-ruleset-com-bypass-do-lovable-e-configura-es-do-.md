# QA-58 — Ruleset com bypass do Lovable e configurações do repositório pendentes

- Origem: M. Branch protection e governança (Testes, CI e infraestrutura)
- Status auditoria: NAO_INICIADA | Prioridade: P2 | Esforco: P
- Impacto no negocio: o Lovable e outros agentes podem empurrar direto para produção, e branches abandonadas acumulam.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

aplicar o ruleset (decisão sobre o bypass do `lovable-dev[bot]`), permitir só squash, apagar a branch após o merge e exigir branch atualizada.

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
