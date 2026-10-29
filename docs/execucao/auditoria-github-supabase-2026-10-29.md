# Auditoria GitHub × Supabase canônico — 29/10/2026

## Escopo e conclusão

Verificação somente leitura da worktree `fix/hermes-h247355-ci-dependencies`, da `main` remota, das PRs #157 e #151 e do ledger do Supabase canônico `cfmzkthhgliqelozlmwu`. A correção P033 está publicada no head da PR #157, mas ainda não integrada à `main`. O diff da PR não contém migrations, funções Edge ou mudanças de schema/dados; portanto, não há SQL desta correção a importar para o banco.

## Código e GitHub

| Referência | SHA | Estado confirmado |
|---|---|---|
| Worktree e branch remota `fix/hermes-h247355-ci-dependencies` | `2b8993d95cdb175956a667d61d249319072624d9` | Iguais; árvore local limpa. |
| `main` remota/base das PRs | `e9d59026793b84fabeaec9da890a068f64d49c3` | Não contém o head da PR #157. |
| [PR #157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157) | `2b8993d95cdb175956a667d61d249319072624d9` | Aberta e sem merge. |
| [PR #151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) | `239a25cc133c10dea848ed97d3e77a6e521612e4` | Aberta e sem merge; restaura fontes SQL ausentes na `main`. |

No SHA da PR #157, `Segurança, contratos e build`, `npm audit`, CodeQL, Gitleaks, bundle, Lighthouse, responsividade, verba/aprovação, origem confiável e gate Sicoob concluíram com sucesso. O E2E falhou no preflight porque `E2E_SUPABASE_PROJECT_ID` está vazio; os shards dependentes foram pulados. Copilot Review falhou por HTTP 402/quota e Vercel Agent Review ficou neutral por billing desativado. A PR não está liberada para merge.

Na PR #151, os 12 arquivos cujas versões aparecem no ledger e faltam nesta `main` foram encontrados no head remoto `fix/hermes-ledger-sources-20261028`. A PR está aberta; checks E2E, audit, análise CodeQL, segurança/build e Copilot aparecem falhos no head consultado. A existência dos arquivos nessa branch não significa que já foram integrados à `main`.

## Banco canônico e migrations

Consulta MCP SQL em modo `read_only` confirmou no projeto canônico:

- `137` linhas em `supabase_migrations.schema_migrations`;
- última versão: `20261022230000_repair_migration_ledger_and_harden_search_path`;
- RPCs públicas `bulk_update_quote_status_atomic` e `approve_quote_with_pdf_atomic` presentes;
- conexão SQL e consulta do ledger concluídas em 29/10/2026 às 09:43 UTC.

Comparação de identificadores de versão entre a worktree/branch #157 (587 arquivos `.sql`) e o ledger (137 versões):

| Medida | Resultado |
|---|---:|
| Versões presentes nos dois lados, com nome correspondente | 125 |
| Arquivos locais sem versão no ledger | 462 |
| Versões no ledger sem arquivo na worktree/`main` | 12 |
| Última versão local e remota em comum | `20261022230000` |

As 12 fontes ausentes na `main` são `20261015102000`, `20261015230500`, `20261015233500`, `20261015235000`, `20261015235500`, `20261016000000`, `20261016160000`, `20261016163000`, `20261016170000`, `20261016171500` e `20261016172000`, `20261016173000`. Todas foram encontradas no head da PR #151.

Os 462 arquivos locais fora do ledger não são automaticamente migrations pendentes de execução: o histórico contém artefatos legados, estados já superados e migrations ainda não classificadas por evidência de objeto/DDL. Esta contagem precisa de classificação versionada, não de `db push` indiscriminado. A auditoria comparou identificadores e nomes das 125 versões coincidentes; não recalculou nesta rodada o fingerprint SQL de todos os arquivos.

## Alterações remotas nesta rodada

Nenhuma escrita SQL, migration, alteração de dados/schema ou deploy de Edge Function foi realizado. O código P033 usa RPCs que já existem no banco e o branch não modifica seu contrato SQL. As correções estão publicadas na branch da PR #157, mas ainda não na `main`; a PR #151 também mantém as fontes ausentes em branch separada até resolver seus checks e a aprovação exigida.

## Próximas ações

1. Resolver os bloqueios de E2E e Copilot na PR #157 e concluir revisão/aprovação; não integrar enquanto houver checks obrigatórios falhos.
2. Resolver os checks da PR #151 e integrar as 12 fontes restauradas sob o fluxo normal de PR.
3. Classificar individualmente os 462 arquivos fora do ledger antes de qualquer decisão de aplicação. Não inserir registros artificiais no ledger e não reaplicar migrations já refletidas no schema.
4. Após integrações, repetir a comparação entre `main`, migrations e ledger; usar fingerprints/DDL e contratos para a certificação semântica.

**Limite:** a checagem confirma o estado observado em 29/10/2026; não comprova paridade histórica de todos os objetos PostgreSQL nem uma jornada autenticada E2E.
