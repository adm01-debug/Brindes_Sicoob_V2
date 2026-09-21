# Etapa 25 — RPCs/tabelas Sicoob prontas mas nunca chamadas do frontend

## Correção importante feita nesta etapa
A lista original (`funcoes_orfas_20260917.md`, Etapa 27) incluía `get_sicoob_order_shipment`/`upsert_sicoob_order_shipment` como órfãs. **Não são.** Cadeia real, confirmada linha a linha:

`src/components/sicoob/orders/OrderLogisticsTab.tsx` → `useSicoobShipment`/`useUpdateSicoobShipment` (`src/hooks/sicoob/useSicoobFulfillment.ts`) → `sicoobFulfillmentService.getShipment`/`.updateShipment` (`src/services/sicoob/fulfillmentService.ts:26,32`) → `shipmentRpc('get_sicoob_order_shipment'/'upsert_sicoob_order_shipment', ...)`, onde `shipmentRpc = supabase.rpc as unknown as ShipmentRpc` (`fulfillmentService.ts:7`) — a mesma indireção via cast de tipo que escondeu `create_quote_version_atomic` na auditoria original. Ambas RPCs confirmadas existentes no banco. `OrderLogisticsTab.tsx` mostra transportadora, código de rastreio, previsão de entrega e foto de comprovante de entrega — feature completa e em uso.

## Realmente não ligadas — confirmado sem indireção
- **`generate_sicoob_performance_report`** + tabela `sicoob_performance_reports` — zero referência em `src/`/`supabase/functions/` além do `types.ts` gerado. Nenhuma tela de relatório de performance encontrada (`grep -rln "PerformanceReport\|performance_report" src/pages src/components src/hooks` não retornou nada além do que já é sabido).
- **`log_quote_action`** + tabela `quote_audit_logs` — mesma situação, zero referência real.
- **`sicoob_approval_policies`** (tabela) — não re-verificada nesta rodada especificamente, mas nenhuma evidência nova surgiu de que esteja ligada; mantém classificação anterior.

## Recomendação
Os dois pares/trios acima (`generate_sicoob_performance_report`+`sicoob_performance_reports`; `log_quote_action`+`quote_audit_logs`) são schema+RPC prontos, nunca consumidos por nenhuma tela — trabalho de frontend pendente, não bug de banco. Não implementado nesta sessão (escopo maior que correção mecânica). `get_sicoob_order_shipment`/`upsert_sicoob_order_shipment`/`sicoob_order_shipments` removidos da lista de pendências — já funcionam.
