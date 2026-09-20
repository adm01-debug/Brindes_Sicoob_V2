# Arquivo morto — setembro/2026

Migrations que **nunca devem ser aplicadas** — mantidas só como histórico. Não fazem parte de `supabase/migrations/` justamente para que `db push`/`migration repair` nunca as considere pendentes.

## `20260915160000_sicoob_reconciliation_baseline.sql`

Rascunho-fonte do baseline Sicoob que foi de fato aplicado ao banco em produção sob a versão `20260915143442` (registrada em `supabase_migrations.schema_migrations`, sem arquivo local correspondente até 17/09/2026).

- Origem: commit `0b99ee634bed1a3f849ea11923d8fa421b4fbf1f`, branch `execucao/sicoob-reconciliacao-20260915` — nunca existiu no branch `main` nem em `execucao/sicoob-reconciliacao-20260916`.
- Diff completo contra o conteúdo real aplicado (extraído do banco): `docs/execucao/evidencias/baseline_diff_20260917.md`. Veredito: mesmo conteúdo essencial, só diferenças de formatação (SQL multi-linha vs. linha única, linhas em branco).
- O arquivo correto e ativo, com o timestamp real de aplicação, é `supabase/migrations/20260915143442_sicoob_reconciliation_baseline.sql`.
