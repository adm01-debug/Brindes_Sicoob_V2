# DOC-29 — Funções de rotina declaradas como "pg_cron" sem agendamento

- Origem: Tema D — Rotinas agendadas (memórias .lovable, manifesto e documentos) (Documentação funcional)
- Status auditoria: ORFA | Prioridade: P1 | Esforco: M
- Impacto no negocio: alertas de queda de preço, lembretes de orçamento parado, resumos, relatórios agendados, alertas de integração caída e o monitor de erros simplesmente não rodam.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

migrations com `cron.schedule` + `net.http_post` e `x-sicoob-internal-secret` vindo do Vault (padrão de `20260923140000_secure_legacy_connection_crons.sql`) e evidência no ledger remoto.

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
