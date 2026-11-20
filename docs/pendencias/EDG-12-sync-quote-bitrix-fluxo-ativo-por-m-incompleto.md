# EDG-12 — `sync-quote-bitrix`: fluxo ativo, porém incompleto

- Origem: CRM / Bitrix (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: orçamento de vendedor novo entra no CRM sem responsável, sem cor e podendo perder itens; falha do n8n exige reenvio manual.

## Estado real conferido

PARCIAL (fluxo principal ativo; itens da auditoria #1, #2 e #4 pendentes).

O que j? est? pronto em `supabase/functions/sync-quote-bitrix/index.ts` (spec v3):
- Or?amento ? payload completo (items com `bitrix_product_id` de `product_variants`, `personalizations`, `supplier_sku`, `color_name` via `...item`, clientName sem sufixo " - XXXX").
- `resolveBitrixTargets` busca `companies.bitrix_company_id` e `product_variants.bitrix_product_id` no cat?logo externo; exclui itens sem bitrix_product_id (Spec ?3).
- n8n decide criar/atualizar buscando pelo `quote_id` interno (Spec v3) ? gifts-store n?o mant?m ID do Bitrix.
- `record_quote_bitrix_sync` (RPC) grava o resultado da sync (bitrix_quote_id / bitrix_deal_id) ? persist?ncia server-side do ID EXISTE.
- Circuit breaker `fetchWithBreaker("bitrix", ...)` e logs estruturados.

O que falta (do item da auditoria):
1. Tabela de v?nculo vendedor?Bitrix no banco ? NAO EXISTE. Hoje `SELLER_EMAIL_MAP` ? hardcoded no edge (ex.: comercial01@??8, henrique?); vendedor novo cai em `seller_not_found_in_map` e `payload.seller_id` n?o ? enviado (or?amento entra no CRM SEM respons?vel ? bug real de neg?cio).
2. `color_name` ? ? passado adiante como `item.color_name` mas n?o passa por corre??o/mapeamento (n?o h? tabela de cor ? color_id no fluxo); o n8n recebe o nome cru.
3. Fila dur?vel com retry ? NAO EXISTE (0 ocorr?ncias de retry/pgmq/queue no edge); falha do n8n exige reenvio manual.

`N8N_QUOTE_WEBHOOK_URL` ausente nos secrets ? edge lan?a `missing_webhook_url_secret` (env fatal, pr?-existente).

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
