# DB-43 — IDs do `pg_net` reciclados colidem com a constraint global da outbox

- Origem: Cron/jobs (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: execuções do worker de aprovações falham e a correlação histórica de respostas fica ambígua.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

merge da PR, aplicação da migration allowlisted no banco canônico e validação pós-aplicação do monitor.

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
