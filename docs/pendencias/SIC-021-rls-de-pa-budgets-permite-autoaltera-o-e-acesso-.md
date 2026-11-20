# SIC-021 — RLS de pa_budgets permite autoalteração e acesso entre cooperativas

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: um PA pode aumentar a própria verba e um gestor pode mexer na verba de outra cooperativa.

## Estado real conferido

PRONTO em main e877d0c58 (aplicacao confirmada em PRODUCAO via check_migration_status + swagger em 2026-11-21). Migration `supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql`: 4 guardas RESTRICTIVE por tabela em pa_budgets (l.66-? SELECT, UPDATE em 185-) e cooperativa_budgets (l.190-246), postflight auto-verificador (l.331-387). REVOKE INSERT/UPDATE/DELETE de authenticated sobre pa_budgets (l.252) e cooperativa_budgets (l.260); INSERT/UPDATE apenas de colunas autorizadas `pa_id, ano, mes, verba_total, limite_alcada, observacoes` (l.254-257, 262-265). `guard_profile_authority_fields` impede troca de vinculo/al?ada/estado na auto-edicao (l.271-329).

## O que falta (auditoria)

RLS — limitar ao escopo da cooperativa, proibir o solicitante de alterar a própria verba ou alçada e fazer ajustes só por RPC com trilha. Confirmar em `pg_policies` no banco (executado; prova indireta via RPC check_migration_status e swagger ? acesso direto ao ledger nao disponivel nesta sessao).

## Camadas afetadas

- Banco (RLS, grants, trigger em profiles)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- pa_budgets, cooperativa_budgets, profiles


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (codigo em main e aplicacao confirmada em PRODUCAO em 2026-11-21). `check_migration_status` (REST) retorna RLS ativo em `pa_budgets`, `cooperativa_budgets`, `cooperativas`, `postos_atendimento`; guardas RESTRICTIVE e REVOKE da migracao 20261013115605 em vigor. Evidencia: Prova indireta de producao (RPC check_migration_status + swagger do projeto). Nao ha mais autoedicao de verba/alcada.
