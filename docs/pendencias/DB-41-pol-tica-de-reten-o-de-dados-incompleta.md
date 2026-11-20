# DB-41 — Política de retenção de dados incompleta

- Origem: Cron/jobs (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: M
- Impacto no negocio: custo de banco crescente, consultas lentas com o tempo e retenção de dado pessoal (logins, IPs) além do necessário pela LGPD.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

a função de expurgo em lotes e os jobs por tabela, com a política documentada.

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
