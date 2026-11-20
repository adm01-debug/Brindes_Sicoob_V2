# EDG-11 — `quote-sync` legado: sem uso, sem autenticação e lendo a base errada

- Origem: CRM / Bitrix (Edge Functions e integrações)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: P
- Impacto no negocio: endpoint exposto que pode disparar envios ao n8n/SalesPro sem controle; nenhum ganho atual.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

despublicar (o fluxo vigente é `sync-quote-bitrix`) ou, se SalesPro for requisito, reescrever com auth e fonte correta.

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
