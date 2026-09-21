# Diff da migration-baseline órfã — 17/09/2026

**Contexto:** o banco registra a versão `20260915143442` (`sicoob_reconciliation_baseline`) como aplicada em `supabase_migrations.schema_migrations`, com o SQL executado armazenado na coluna `statements`. Nenhum arquivo com esse timestamp existia em qualquer branch antes desta rodada. Existia um arquivo de nome parecido, `20260915160000_sicoob_reconciliation_baseline.sql`, só no commit `0b99ee634` (branch `execucao/sicoob-reconciliacao-20260915`), ausente do branch de trabalho atual.

**Ação:** extraído o conteúdo real de `statements` via MCP (`select statements from supabase_migrations.schema_migrations where version='20260915143442'`) e salvo como `supabase/migrations/20260915143442_sicoob_reconciliation_baseline.sql` no branch atual. Comparado via `diff -u` contra `git show 0b99ee634:supabase/migrations/20260915160000_sicoob_reconciliation_baseline.sql`.

## Veredito: **mesmo conteúdo essencial**

O diff mostra só diferenças de formatação — nenhuma diferença semântica:
- Comandos SQL multi-linha no arquivo antigo (`20260915160000`) aparecem colapsados em linha única no conteúdo armazenado pelo banco (`20260915143442`) — comportamento esperado de como o `statements` é reconstituído a partir do array de comandos executados.
- Linhas em branco entre statements foram removidas na versão do banco.
- Nenhuma coluna, tabela, função, constraint, `REVOKE`/`GRANT` ou valor difere entre os dois arquivos.

**Conclusão:** `20260915160000_sicoob_reconciliation_baseline.sql` era o rascunho-fonte do mesmo baseline que acabou sendo aplicado ao banco sob a versão `20260915143442`. Não é um artefato divergente — é o mesmo trabalho, com o arquivo correto agora extraído diretamente do banco e versionado com o timestamp real de aplicação (Etapa 5/6 do plano de correções). Segue para a Etapa 7: arquivar o rascunho antigo como superado.
