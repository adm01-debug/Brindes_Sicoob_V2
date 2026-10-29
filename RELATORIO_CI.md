# Relatório de CI — 29/10/2026

## Escopo e referência

Inventário feito pelo GitHub MCP, considerando a execução mais recente de cada workflow na branch `main` (incluídos `push`, `schedule` e `workflow_dispatch`; execuções de PR excluídas). A referência remota atual é `e9d59026793b84fabeaec9da890a068f64d49c3`. Os resumos abaixo usam somente etapas que falharam e trechos pertinentes; logs completos não foram baixados.

## Última execução por workflow

| Workflow | Estado/conclusão | Evidência / causa provável |
|---|---|---|
| Migration ledger drift | success | [run 40828393693](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40828393693), agenda em 29/10. |
| Aplicar migrations Sicoob | cancelled | [run 37029743784](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37029743784), dispatch em 02/10; cancelado, não contado como falha. |
| Publicar funções Sicoob | failure | [run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102): verificação não observou nova versão da função `sicoob-approval-reconciliation` (versão 5 antes e depois). |
| Dependabot Updates | success | [run 40603001428](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40603001428). |
| Security Scan | failure | [run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158): `npm audit` falhou por advisories altos/críticos, incluindo `undici`. |
| Qualidade contínua | failure | [run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964): gate identificou `undici` e `zod` vulneráveis. |
| Branch Protection Sentinel | success | [run 40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038). |
| Enterprise Compliance & Audit Reporting | success | [run 40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958). |
| CodeQL | failure | [run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073): configuração carregada de `github/codeql-action` 4.39.1 enquanto a execução usa 4.38.2; autobuild terminou em erro e não gerou SARIF. |
| Portal Sicoob | success | [run 39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315). |
| Running Copilot Code Review | failure | [run 39785094125](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39785094125): processamento/limpeza do agente falhou. O resumo do run mostra processo de limpeza, sem causa raiz suficiente para atribuir ao repositório. |
| Bundle Size Check | failure | [run 36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911): resumo acessível não trouxe etapa falha; download do log respondeu 404. Causa permanece não confirmada. |
| Monthly DB Audit | success | [run 36794161452](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36794161452). |
| E2E (Playwright) | startup_failure | [run 37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358): run sem jobs/log acessíveis; tentativa local anterior identificou `E2E_SUPABASE_PROJECT_ID` vazia. O operador confirmou que provisionará o projeto/variáveis de homologação. |
| Lighthouse Performance Audit | failure | [run 36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910): resumo acessível não trouxe etapa falha; download do log respondeu 404. Causa permanece não confirmada. |

As quatro causas com evidência suficiente para correção técnica são vulnerabilidades, incompatibilidade de versão do CodeQL e verificação de publicação sem delta de versão. Copilot, bundle e Lighthouse requerem uma execução/log acessível para confirmar causa. E2E requer homologação configurada antes de nova execução.

## Validação local deste lote

- `npm ci`: concluído pelo lockfile com Node `v24.19.0` e npm `11.17.0`.
- `npm run build`: passou após a alteração do forecast; Vite emitiu avisos de PostCSS e imports estático/dinâmico preexistentes.
- `npm run typecheck:baseline`: passou sem regressões; 165 diagnósticos atuais contra 166 no baseline. O `npm run typecheck` completo ainda não está limpo (165 diagnósticos no total).
- ESLint focal nos arquivos alterados: passou sem erros/avisos; Prettier focal passou.
- `npm run lint`: falhou com 3.313 erros e 2.735 avisos em 6.048 ocorrências no escopo total `src`; nenhum arquivo desta correção teve erro/aviso no lint focal.
- `npm run lint:baseline`: passou; analisou os 3 arquivos alterados, sem regressão e com redução de 1 erro da referência `origin/main` local `6b71bdc09a`.
- `npx vitest run tests/hooks/useKitStockForecast.test.tsx`: 3 testes passaram. Suíte completa pós-alteração: 379 arquivos passaram, 8 foram ignorados; 5.478 testes passaram e 109 foram ignorados.
- Nenhum secret foi lido, impresso ou gravado. Nenhum dado, schema ou função Edge do Supabase foi alterado.

O baseline anterior a alterações desta rodada não registrava build, lint total e suíte completa. Portanto, não se afirma ausência de regressão global. A suíte completa final passou, mas não há comparação baseline × final; o typecheck mantém 165 diagnósticos conhecidos e o lint total continua falhando, embora os arquivos modificados não tenham regredido contra o baseline de lint.

## Banco canônico × migrations do GitHub

Consulta read-only ao projeto canônico `cfmzkthhgliqelozlmwu` em `supabase_migrations.schema_migrations` retornou 137 entradas; a mais recente é `20261022230000_repair_migration_ledger_and_harden_search_path`. `origin/main` em `e9d59026793b84fabeaeec9da890a068f64d49c3` contém 587 arquivos SQL ativos em `supabase/migrations` e 21 SQL arquivados em `supabase/migrations_archive`.

Doze versões aplicadas no ledger não têm arquivo correspondente na árvore atual do GitHub: `20261015102000`, `20261015230500`, `20261015233500`, `20261015235000`, `20261015235500`, `20261016000000`, `20261016160000`, `20261016163000`, `20261016170000`, `20261016171500`, `20261016172000` e `20261016173000`. A ausência é histórica e está documentada no baseline versionado de drift; o workflow verde compara novas diferenças com essa baseline e não prova paridade integral. Esta rodada comparou a presença de versões e nomes, não recalculou os hashes dos corpos SQL de todas as migrations.

Nenhuma migration, tabela, função, policy ou dado foi alterado. A inspeção ao banco foi somente leitura. As doze fontes ausentes continuam sendo pendência de reconciliação; não devem ser reenviadas ao banco.

## Próximo passo

Resolver causas confirmadas em branch/PR isolados, uma causa raiz por commit. Não fazer merge de mudança que alcance deploy produtivo. Reexecutar os workflows na `main` após merge somente com checks verdes; manter as pendências operacionais em `PENDENCIAS.md`.
