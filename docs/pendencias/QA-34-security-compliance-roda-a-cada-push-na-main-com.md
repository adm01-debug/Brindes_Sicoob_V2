# QA-34 — `security-compliance` roda a cada push na `main` com service role no banco canônico

- Origem: G. Segurança (gitleaks / CodeQL / audit / dependabot / compliance) (Testes, CI e infraestrutura)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: cada merge cria e apaga usuários no banco de produção com chave administrativa.

## Estado real conferido

PARCIAL - separacao implementada: .github/workflows/security-compliance.yml:81-99 restringe seller-quote-rls-test a workflow_dispatch na main, environment e2e-qa, destino isolado; scripts/test-rls-compliance.mjs:5-22 chama validateE2ETarget antes de criar clientes (rejeita projeto oficial via FORBIDDEN_PROJECT_IDS). NaO roda a cada merge. Pendencia: auditoria com credenciais canonicas e secrets do e2e-qa ausentes (job skipped).

## O que falta (auditoria)

environment protegido, gatilho só agendado e retenção de 7 dias.

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
