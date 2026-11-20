# EDG-03 — Funções de IA "authenticated" sem validação de JWT no handler

- Origem: IA (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: qualquer portador da chave pública pode consumir créditos de IA da empresa, dependendo só do gateway.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

validar sessão no handler (como `generate-ad-image` via `authenticateRequest`) e aplicar cota por usuário (`_shared/ai-usage.ts`).

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
