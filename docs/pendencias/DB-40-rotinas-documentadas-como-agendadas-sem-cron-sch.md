# DB-40 — Rotinas documentadas como agendadas sem `cron.schedule`

- Origem: Cron/jobs (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: relatórios agendados pelo gestor nunca chegam, lembretes de follow-up de proposta não disparam e o vendedor perde negócios esquecidos.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

criar despachantes via Vault (padrão `dispatch_sicoob_*`) e jobs para `process-scheduled-reports`/`send-scheduled-reports`, `quote-followup-reminders`, watchers de preço (após DB-05), `send-digest` (após DB-22), `monthly-health-report`, `ownership-audit` e `connections-health-check`; remover `supabase/cron/cron-config.sql` e `cleanup-novelties` (410, desativada).

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
