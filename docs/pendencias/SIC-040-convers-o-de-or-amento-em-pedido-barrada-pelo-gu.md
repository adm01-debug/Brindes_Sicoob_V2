# SIC-040 — Conversão de orçamento em pedido barrada pelo guard de governança

- Origem: 5. Carrinho/pedido (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: nenhum orçamento aprovado vira pedido, então a compra para no meio.

## Estado real conferido

CODIGO em main e877d0c58 (aplicacao no banco de producao NAO confirmada). Migration `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql`: wrapper `convert_quote_to_sicoob_order` seta `app.quote_governance_write=true` e restaura contexto mesmo em erro (l.10-30); nucleo renomeado fica inacessivel (REVOKE, l.5-8); trigger `aaa_guard_quote_governance_write` em quotes (l.615-618).

## O que falta (auditoria)

RPC — setar a flag (ou permitir explicitamente `approved*→converted`) e incluir na simulação toda a cadeia de triggers. Confirmar no banco com conversão sintética.

## Camadas afetadas

- Banco (RPC wrapper + trigger guard governan?a)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- convert_quote_to_sicoob_order


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (codigo em main); pendente: confirmar aplicacao das migrations no banco de producao
