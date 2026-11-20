# EDG-12 — `sync-quote-bitrix`: fluxo ativo, porém incompleto

- Origem: CRM / Bitrix (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: orçamento de vendedor novo entra no CRM sem responsável, sem cor e podendo perder itens; falha do n8n exige reenvio manual.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

tabela de vínculo vendedor↔Bitrix no banco, corrigir `color_name`, assinar o webhook do n8n, fila durável com retry e persistência server-side do ID.

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
