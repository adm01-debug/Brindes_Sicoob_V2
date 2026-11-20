# DOC-42 — Pós-incidente `migrate-helper`: rotação de credenciais e revisão de logs

- Origem: Tema F — Segurança e governança (SECURITY*, secrets, branch protection, runbooks, ADRs, docs/security) (Documentação funcional)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P1 | Esforco: P
- Impacto no negocio: se a chave vazou, alguém pode ler e alterar todos os dados (clientes, orçamentos, pedidos).

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

rotacionar `SUPABASE_SERVICE_ROLE_KEY` e a senha do banco, revisar os logs da função e registrar evidência saneada.

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
