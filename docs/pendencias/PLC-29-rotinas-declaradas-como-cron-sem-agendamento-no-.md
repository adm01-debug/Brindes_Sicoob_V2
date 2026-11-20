# PLC-29 — Rotinas declaradas como cron sem agendamento no repositório

- Origem: C. Banco de dados e paridade GitHub × Supabase (Planos de melhorias e correções)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: lembretes de follow-up de orçamento, relatórios agendados e alertas de queda de preço não são enviados, e vendas podem ser perdidas sem que ninguém perceba.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

migrations com `cron.schedule` via wrappers lendo o Vault (padrão de `20260923140000`) para cada rotina, ou retirar as telas e funções sem uso.

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
