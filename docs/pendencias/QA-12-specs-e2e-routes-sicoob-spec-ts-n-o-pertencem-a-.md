# QA-12 — Specs `e2e/routes/sicoob/*.spec.ts` não pertencem a nenhum projeto Playwright

- Origem: B. E2E (Playwright) (Testes, CI e infraestrutura)
- Status auditoria: ORFA | Prioridade: P1 | Esforco: M
- Impacto no negocio: o controle de acesso do portal Sicoob (quem vê pagamentos e aprovações) não tem verificação automática.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

incluir `sicoob` no `testMatch` de `routes-authed`/`routes-guards`, trocar os IDs fixos por fixtures reais e corrigir o RBAC exposto.

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
