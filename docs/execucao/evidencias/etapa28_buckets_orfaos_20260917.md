# Etapa 28 — Buckets órfãos `order-documents` e `component-media`

Confirmado via `storage_list_objects`: **0 objetos armazenados em ambos**, hoje.

- `order-documents` — distinto do bucket realmente usado, `sicoob-order-documents` (usado por `OrderLogisticsTab.tsx` pra foto de comprovante de entrega, confirmado na Etapa 25). Mesmo padrão de nomenclatura resquício já visto na Etapa 25 do plano principal (`art-files`→`proposals`).
- `component-media` — distinto da tabela `component_media`, que É usada em código (confirmado na auditoria anterior). O bucket de mesmo nome não tem nenhum objeto nem referência de upload encontrada.

**Recomendação:** ambos candidatos seguros a remoção (0 objetos, sem risco de perda de dado) — registrar em ADR e remover via migration futura, seguindo o padrão da Etapa 25 do plano principal. Não removido nesta sessão.
