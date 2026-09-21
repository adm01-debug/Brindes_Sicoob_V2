# Pacote pronto para aplicação — `create_quote_version_atomic`

**Único item do Nível 2 que sobreviveu à revisão linha a linha.** Bitrix e as RPCs de health-check foram descartados do lote — ver `docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md` (Etapa 9-11, notas de 20/09/2026) para o porquê.

## Pré-requisitos verificados (20/09/2026)

- `public.quotes` tem **0 linhas** — o `UPDATE` de normalização no início da migration é no-op, sem risco de dado real.
- `public.create_quote_version` (função antiga, singular) **não existe** e **não é referenciado** em nenhum lugar do código (`grep -rn "create_quote_version\b" src/ supabase/functions/` vazio, excluindo `_atomic`) — o `DROP FUNCTION IF EXISTS` é no-op.
- Dependências `public.can_manage_quotes` e `public.get_user_org_ids` **existem** no banco.
- `public.create_quote_version_atomic` **não existe** hoje (confirmado via `information_schema.routines`) — é seguro criar.

## Como aplicar

Cole os dois blocos abaixo, **nesta ordem**, no SQL Editor do Supabase (projeto `cfmzkthhgliqelozlmwu`). São os arquivos originais do repositório, sem nenhuma alteração de conteúdo — só concatenados:

1. `supabase/migrations/20260912100000_quote_versioning_atomic.sql`
2. `supabase/migrations/20260913120001_quote_versioning_atomic_followup.sql`

(A segunda substitui a função criada pela primeira via `CREATE OR REPLACE` — aplicar as duas em ordem reproduz exatamente o estado final pretendido, incluindo as 3 colunas novas em `quote_items` e a idempotência do `DROP FUNCTION`/`CREATE UNIQUE INDEX`.)

## Rollback, se necessário

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.create_quote_version_atomic(uuid);
ALTER TABLE public.quote_items
  DROP COLUMN IF EXISTS source_variant_id,
  DROP COLUMN IF EXISTS source_variant_sku,
  DROP COLUMN IF EXISTS catalog_checked_at;
DROP INDEX IF EXISTS idx_quotes_one_latest_version_per_family;
COMMIT;
```

Note: o `UPDATE` de normalização de `is_latest_version` não tem rollback automático — mas como `quotes` tem 0 linhas hoje, não há dado real para reverter.

## Depois de aplicar — checklist de verificação

- [ ] `select routine_name from information_schema.routines where routine_name = 'create_quote_version_atomic'` retorna 1 linha
- [ ] Criar uma versão de orçamento de teste pela UI (`QuoteViewPage` → `QuoteVersionHistory`) funciona sem erro
- [ ] `select column_name from information_schema.columns where table_name='quote_items' and column_name in ('source_variant_id','source_variant_sku','catalog_checked_at')` retorna 3 linhas
- [ ] Registrar aplicação em `docs/execucao/evidencias/` com hash/timestamp, seguindo o padrão da Etapa 12 do plano principal (extrair o SQL efetivamente aplicado e versionar, já que não passa por `supabase migration repair` sem CLI linkado)
