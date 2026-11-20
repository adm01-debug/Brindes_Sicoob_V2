# SIC-021 — RLS de pa_budgets permite autoalteração e acesso entre cooperativas

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: um PA pode aumentar a própria verba e um gestor pode mexer na verba de outra cooperativa.

## Estado real conferido

PRONTO em main e877d0c58 (aplicacao em producao NAO CONFIRMADA nesta sessao - RLS ativo pre-existia na migration 20260503 (cooperativa_budgets/pa_budgets) e o REST nao expoe guards RESTRICTIVE/REVOKE; conferir pg_policies via SQL direto). Migration `supabase/migrations/20261013115605_harden_sicoob_budget_authority.sql`: 4 guardas RESTRICTIVE por tabela em pa_budgets (l.66-? SELECT, UPDATE em 185-) e cooperativa_budgets (l.190-246), postflight auto-verificador (l.331-387). REVOKE INSERT/UPDATE/DELETE de authenticated sobre pa_budgets (l.252) e cooperativa_budgets (l.260); INSERT/UPDATE apenas de colunas autorizadas `pa_id, ano, mes, verba_total, limite_alcada, observacoes` (l.254-257, 262-265). `guard_profile_authority_fields` impede troca de vinculo/al?ada/estado na auto-edicao (l.271-329).

## O que falta (auditoria)

RLS — limitar ao escopo da cooperativa, proibir o solicitante de alterar a própria verba ou alçada e fazer ajustes só por RPC com trilha. Confirmar em `pg_policies` no banco (ABERTO: sem acesso SQL direto nesta sessao; `check_migration_status` so comprova RLS habilitado, pre-existente).

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

- CODIGO em main (migracao 20261013115605). APLICACAO DA MIGRACAO NO BANCO DE PRODUCAO: NAO VERIFICADA nesta sessao - RLS ativo pre-existia (20260503) e o REST nao expoe guards RESTRICTIVE/REVOKE/policies. Pendente: conferir `pg_policies`/privs com SQL direto e exercitar comportamento de autoedicao bloqueada.
