# QA-04 — Suítes remotas que dependem de credenciais nunca criadas

- Origem: A. Testes unitários (Vitest / Deno) (Testes, CI e infraestrutura)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P2 | Esforco: P
- Impacto no negocio: o isolamento vendedor × administrador e o fluxo real de aprovação de desconto nunca são verificados contra um banco real.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

criar contas dedicadas de homologação e os secrets, ou migrar os casos para as personas efêmeras de `scripts/test-rls-compliance.mjs`.

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
