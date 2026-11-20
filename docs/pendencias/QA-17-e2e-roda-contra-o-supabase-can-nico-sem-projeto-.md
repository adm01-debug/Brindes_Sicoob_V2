# QA-17 — E2E roda contra o Supabase canônico, sem projeto de homologação

- Origem: B. E2E (Playwright) (Testes, CI e infraestrutura)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P1 | Esforco: M
- Impacto no negocio: os testes criam e apagam dados no mesmo banco das cooperativas.

## Estado real conferido

PROTEÇÃO IMPLEMENTADA - scripts/e2e-target.mjs:4-10 rejeita explicitamente o projeto oficial (FORBIDDEN_PROJECT_IDS inclui cfmzkthhgliqelozlmwu, producao) e o e2e.yml:125-126/320-321 valida o destino nos jobs autenticados; e2e/helpers/cleanup-client.ts:81-87 chama o mesmo validador no cleanup (fail closed). PENDENCIA real: provisionar projeto de homologacao com secrets proprios (env e2e-qa criado 08/11/2026 sem secrets).

## O que falta (auditoria)

secrets E2E no environment e2e-qa (E2E_SUPABASE_URL/PROJECT_ID/PUBLISHABLE/SERVICE_ROLE_KEY) e decisao/custo do projeto de homologacao; sem isso o job seller-quote-rls-test fica skipped.

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
