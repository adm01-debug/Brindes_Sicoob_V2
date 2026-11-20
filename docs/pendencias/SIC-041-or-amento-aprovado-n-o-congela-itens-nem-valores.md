# SIC-041 — Orçamento aprovado não congela itens nem valores

- Origem: 5. Carrinho/pedido (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: M
- Impacto no negocio: valores podem ser trocados depois que a Singular aprovou, e o pedido sai diferente do que foi autorizado.

## Estado real conferido

PRONTO em main e877d0c58. Migration `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql`: `assert_quote_content_editable` (l.620-655) recusa edicao quando status fora de `draft, revision, rejected, rejected_singular` ou versao nao-latest (erro 42501 'Os itens de um or?amento enviado ou decidido s?o imut?veis'); triggers `guard_quote_item_content_write` em quote_items (l.660-695) e `guard_quote_personalization_content_write` em quote_item_personalizations (l.697-747); guard em has_function_privilege no postflight (l.1028-1030).

## O que falta (auditoria)

RLS e trigger — negar escrita direta em itens, personalizações e campos comerciais fora de draft/revision, ou fazê-la só por RPC; snapshot imutável da versão aprovada pela Singular.

## Camadas afetadas

- Banco (triggers de congelamento em quote_items e personalizacoes)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- quote_items, quote_item_personalizations, quotes


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (codigo em main); pendente: confirmar aplicacao das migrations no banco de producao
