# Migrations arquivadas

Arquivos aqui **nunca devem ser reaplicados**. Existem só como histórico.

## `2025/` — cluster `20250103_*` (19 arquivos)

Schema legado de gamificação/catálogo local (`products`, `categories`, `companies`,
`roles`, gamificação), de antes da migração do catálogo para o serviço externo
(`doufsxqlfjyuvxuezpln`). Confirmado em 16/09/2026, via consulta direta ao banco
de produção, que **nenhuma** dessas tabelas existe hoje (`products`, `categories`,
`companies`, `roles`, `gamification_points`, `badges`, `achievements` = 0
resultados em `information_schema.tables`). Rotulado `superada` — consistente
com o achado original da auditoria de 15/09/2026 (PR #8), que já apontava
`src/hooks/useProducts.ts` e `src/utils/price-freshness.ts` como evidência de
que produtos vêm do catálogo externo, não deste schema.

## Escopo desta classificação (honestidade sobre o que falta)

Esta arquivagem resolve apenas o cluster `20250103_*` (19 de ~503 arquivos em
`supabase/migrations`). Os clusters `20251227_*` e `20251228_*` (23 arquivos)
foram investigados à parte: 21 deles criam tabelas que **não existem** no banco
(`nunca-aplicada` — permanecem em `supabase/migrations`, apenas tiveram o
prefixo de versão desambiguado, ver Etapa 10) e 2 (`quote_comments`,
`scheduled_reports`) criam tabelas que **existem** (`aplicada`).

Os **demais ~461 arquivos** de `supabase/migrations` (fora do escopo Sicoob já
tratado nas Etapas 18/28-31/40-45) **não foram classificados individualmente**
nesta sessão — não há evidência de que sejam superados, apenas não foram
auditados. Etapa 9 do plano permanece parcial por esse motivo.
