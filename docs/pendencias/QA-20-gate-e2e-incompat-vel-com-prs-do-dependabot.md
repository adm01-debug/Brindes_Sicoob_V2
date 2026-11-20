# QA-20 — Gate E2E incompatível com PRs do Dependabot

- Origem: B. E2E (Playwright) (Testes, CI e infraestrutura)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: atualizações de segurança de dependências ficam sempre vermelhas e acabam mescladas por bypass ou ignoradas.

## Estado real conferido

SEPARACAO IMPLEMENTADA - o job `e2e` em PR (e2e.yml:34-46) roda SEM secrets, com VITE_SUPABASE_URL placeholder, executando apenas specs publicos (:63-69); secrets reais so no `e2e-authenticated` restrito a workflow_dispatch (:81-84). Gate do Dependabot NAO depende de secrets. NAO replicar secrets para o Dependabot.

## O que falta (auditoria)

NAO ha incompatibilidade comprovada atualmente - manter apenas se uma falha real do Dependabot aparecer; sem necessidade de replicar secrets.

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
