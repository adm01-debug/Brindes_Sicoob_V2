# Runbook: aplicar DDL via MCP corretamente

Atualização de 22/09/2026: o projeto está em construção. Referências históricas
a "produção" abaixo não significam que exista operação produtiva. A validação
atual e os bloqueios estão em [correções de reconciliação](../execucao/correcoes-reconciliacao-20260922.md).

## Quando isto se aplica

Sempre que um agente (ou pessoa) aplicar `CREATE`/`ALTER`/`DROP`/qualquer DDL
diretamente no banco de produção via uma ferramenta MCP de SQL (`supabase_db_query`
ou equivalente), em vez de passar por `supabase db push` a partir de um arquivo
de migration já commitado. Isso inclui correções emergenciais, achados de
auditoria corrigidos "ao vivo", e qualquer sessão de reconciliação de schema.

## O que deu errado uma vez (não repetir)

Em 15-16/09/2026, a migration-baseline do projeto Sicoob (`sicoob_reconciliation_baseline`)
foi aplicada em produção via MCP. O SQL ficou registrado só dentro do banco
(`supabase_migrations.schema_migrations.statements`, versão `20260915143442`) —
nenhum arquivo `.sql` com esse timestamp foi commitado em nenhum branch. Um
arquivo de nome parecido (`20260915160000_sicoob_reconciliation_baseline.sql`)
existia, mas com timestamp diferente e só num branch que não era o de trabalho
principal. Resultado: por dias, o baseline mais crítico do projeto — a peça que
todo o resto do schema Sicoob depende — não tinha fonte rastreável em lugar
nenhum do Git. Só foi reparado numa auditoria posterior (Etapas 5-8 de
`docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md`),
que teve que extrair o SQL de volta do banco pra conseguir versionar.

## Regra

**Extrair e commitar o `.sql` no mesmo commit/PR em que o DDL é aplicado via
MCP — nunca depois.** "Depois" vira "nunca" com frequência maior do que parece
razoável assumir.

## Passo a passo

1. **Antes de aplicar**: escreva o `.sql` completo da mudança como se fosse uma
   migration normal, com nome `YYYYMMDDHHMMSS_slug_snake.sql` seguindo o
   timestamp de quando você vai aplicar (não de quando começou a escrever).
2. **Revise** como revisaria qualquer migration: idempotência (`IF NOT EXISTS`,
   `CREATE OR REPLACE`), sem `DROP` destrutivo sem aprovação, RLS/ACL corretos
   desde a primeira aplicação (não "corrijo depois" — ver Etapa 12 deste plano
   sobre reauditar ACL/RLS de tudo aplicado por este caminho).
3. **Simule antes de aplicar:** execute o mesmo arquivo em banco descartável,
   incluindo permissões e rollback. No projeto correto, faça o preflight read-only
   e valide dependências reais. Data API não dá acesso administrativo ao ledger.
4. **Versione o arquivo antes da aplicação** e aplique via ferramenta administrativa
   que registre a migration no ledger. Confirme versão, nome e statements. Não
   use `repair --status applied` para representar DDL que não foi executado.
   Preserve diferenças como evidência; não altere migrations históricas por conveniência.
5. Se a aplicação foi emergencial e não deu tempo de seguir os passos 1-2 antes:
   **abra uma issue de follow-up com prazo** no mesmo momento, referenciando a
   versão exata (`supabase_migrations.schema_migrations.version`) que precisa
   ser extraída e versionada. Não deixe isso implícito ou "lembrado de cabeça".
6. **Confirme reprodutibilidade**: depois de commitar, rode
   `node scripts/db/check-migration-ledger-drift.mjs` (Etapa 29 deste plano)
   contra o ambiente — compara ausências nas duas direções, duplicações, arquivos
   arquivados, nomes e SQL normalizado. Código 1 indica pendências; código 2 indica
   impossibilidade de verificar. Snapshot offline não prova estado atual e hash
   normalizado diferente exige revisão, não aplicação automática.

## Por que isso importa mais do que parece

Uma migration aplicada só no banco, sem arquivo local, não pode ser: revisada
em PR, reaplicada num ambiente novo, comparada por `supabase db diff`, incluída
num backup lógico reproduzível, ou entendida por quem não estava na sessão em
que foi aplicada. Ela vira uma dependência invisível de todo o resto do schema
que depende dela — exatamente o caso do baseline Sicoob.
