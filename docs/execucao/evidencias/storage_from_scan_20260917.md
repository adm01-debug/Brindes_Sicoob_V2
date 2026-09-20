# Varredura exaustiva de `.storage.from()` — Etapa 33, 17/09/2026

Varredura tolerante a quebra de linha entre `.storage` e `.from(` em `src/`+`supabase/functions/`, tanto para nome literal quanto para indireção via constante/variável.

## Nomes literais encontrados (pós-correção da Etapa 16)
`avatars`, `mockup-art-files` (2×), `personalization-images` (4×), `product-videos` (6×), `proposals` (2×), `sicoob-order-documents` (3×), `supplier-logos` (4×) — todos batem com os 13 buckets reais. Nenhum nome quebrado remanescente (as ocorrências de `mockup-assets`/`'personalization'` já foram corrigidas na Etapa 16 desta mesma execução).

## Indireção via constante/variável (não capturada por regex de string simples — mesma classe de gap que escondeu `create_quote_version_atomic` na auditoria original)
| Constante | Onde definida | Valor | Status |
|---|---|---|---|
| `PRIMARY_BUCKET` | `src/lib/storage-resilience.ts:9` | `'personalization-images'` | OK |
| `SECONDARY_BUCKET` | `src/lib/storage-resilience.ts:10` | `'personalization-images-secondary'` | OK |
| `ARTWORK_BUCKET` | `src/hooks/orders/extensions/useOrderPilotApprovals.ts:16` | `'sicoob-order-documents'` | OK |
| `ARTWORK_BUCKET` | `supabase/functions/sicoob-artwork-register/identity.ts:1` | `'sicoob-order-documents'` | OK |
| `targetBucket` | `supabase/functions/secure-upload/index.ts:73,130` | `"personalization-images"` / `"quarantine"` (condicional) | OK |
| `bucketName` | `supabase/functions/process-batch-export/index.ts:71` | `'exports'` | OK |

**Veredito:** 0 buckets quebrados restantes, em literal ou indireção, depois das correções da Etapa 16. Cobertura mais ampla que o pedido original da Etapa 33 (que só previa o padrão de 2 linhas) — também resolvi a indireção por constante, que é uma classe de gap relacionada mas diferente.
