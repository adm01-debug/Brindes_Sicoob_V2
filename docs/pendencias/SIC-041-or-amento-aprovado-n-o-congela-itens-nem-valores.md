# SIC-041 — Orçamento aprovado não congela itens nem valores

- Origem: 5. Carrinho/pedido (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: M
- Impacto no negocio: valores podem ser trocados depois que a Singular aprovou, e o pedido sai diferente do que foi autorizado.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

RLS e trigger — negar escrita direta em itens, personalizações e campos comerciais fora de draft/revision, ou fazê-la só por RPC; snapshot imutável da versão aprovada pela Singular.

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
