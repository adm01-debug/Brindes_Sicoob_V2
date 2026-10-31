# Relatório de progresso do plano — 31/10/2026

## Escopo e estado do plano

Esta rodada foi executada em worktree isolado, branch `fix/hermes-h393620-docs-audit-20261031`, baseada em `origin/main` no commit `e9d59026793b84fabeaeec9da890a068f64d49c3`. A cópia original em `main` tinha mudanças locais e não foi alterada.

O plano canônico `docs/plano-implementacao/plano-100-etapas.md` continua com 100 etapas e 1.000 subetapas sem checklists concluídos. A validação estrutural desse arquivo não comprova execução funcional. Esta rodada concluiu mudanças locais nos gaps E-005, E-007, E-034 e E-035, mas essas etapas **não são declaradas concluídas no plano**: a alteração ainda não está na `main`, e parte dos critérios de aceite depende de homologação e validação de negócio.

## Trabalho local desta rodada

- E-007: carregamento de itens e personalizações dos orçamentos para consolidação em consultas agrupadas, com lotes, paginação determinística e sem N+1; erros e carregamento não são apresentados como totais válidos.
- E-005: a linha do tempo de orçamento distingue erro de resposta vazia e oferece nova tentativa.
- E-034: compartilhamento da consolidação só confirma a cópia após sucesso da Clipboard API e informa falha.
- E-035: expansão e ordenação da consolidação usam controles de teclado, nomes acessíveis, `aria-expanded`, `aria-controls` e `aria-sort`.
- Os mocks do cliente Supabase agora implementam `.range()`, conforme a API de paginação usada pelos serviços.
- Atualização do grafo local Graphify concluída no worktree. É um artefato ignorado pelo Git e não altera o grafo da cópia de trabalho original.

## Validação local

| Verificação | Baseline em `e9d5902` | Após as mudanças | Resultado |
|---|---:|---:|---|
| `npm ci` | concluído | não repetido | Dependências instaladas a partir do lockfile |
| `npm run typecheck` | passou | passou | Sem erros TypeScript |
| `npm run lint` | 0 erros, 873 avisos | 0 erros, 873 avisos | Sem aumento dos avisos existentes |
| `npm run build` | passou | passou | Avisos existentes de variáveis Supabase ausentes, PostCSS, importação dinâmica e chunks grandes |
| `npm test` | 452 arquivos aprovados, 4 ignorados; 5.839 testes aprovados, 68 ignorados | 453 arquivos aprovados, 4 ignorados; 5.848 testes aprovados, 68 ignorados | Nenhuma regressão; 9 testes adicionais passaram |
| Testes focais de orçamentos | — | 4 arquivos, 14 testes passaram | Inclui paginação, hidratação, erro/retry, cópia e teclado |
| `git diff --check` | — | passou | Sem erros de whitespace |

Na baseline inicial, `npm audit` reportou 17 vulnerabilidades: 15 moderadas e 2 altas (`undici` e `zod`), sem críticas. A correção posterior das duas altas e a contagem final estão registradas abaixo.

## GitHub Actions observadas na `main`

Consulta de execuções no GitHub em 31/10/2026. As causas abaixo são o que o resumo do run e os trechos do step demonstram; não inferem estado de secrets ou configuração remota.

| Workflow | Estado observado | Causa comprovada / evidência |
|---|---|---|
| [CodeQL — run 40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | Falha | `init` carregou configuração 4.39.1 enquanto `autobuild` executou 4.38.2; por isso não houve SARIF para o upload secundário. |
| [Publicar funções Sicoob — run 40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | Falha | O deploy terminou com sucesso; a confirmação exigia incremento de versão para todas as funções, embora o CLI aceite no-op quando o bundle não mudou. A branch substitui isso por inventário anterior completo, presença, status ativo, versão inteira válida, não regressão e paridade da lista, com sete testes locais. A validação remota corrigida exige o workflow_dispatch na `main`; nenhum novo deploy foi disparado. |
| [Qualidade contínua — run 40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Falha | Gate de segurança detectou vulnerabilidades altas em `undici` e `zod`. |
| [Security Scan — run 40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | Falha | `npm audit` interrompeu o step por vulnerabilidades altas, incluindo advisories de `undici`. |
| [E2E Playwright — run 37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | `startup_failure` | `total_jobs=0`; não iniciou job e não contém erro de execução para reproduzir. A versão da `main` no run usava secrets genéricos `VITE_SUPABASE_*`; a branch local passa a exigir secrets dedicados `E2E_SUPABASE_*`, validar correspondência URL/ref e bloquear os refs canônicos. A allowlist `E2E_CLEANUP_ALLOWED_EMAILS` permanece configuração de backend e ainda requer confirmação no projeto isolado. |

Execuções verdes identificadas: [Migration ledger drift — 30/10](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41013281253), Branch Protection Sentinel e Enterprise Compliance & Audit Reporting na execução de push de 27/10. Não foram disparados reruns, deploys ou alterações no GitHub nesta rodada.

### Atualização após diagnóstico

Foi corrigida localmente a causa comprovada do CodeQL: `init`, `autobuild` e `analyze` agora usam a mesma revisão imutável 4.39.1. `actionlint .github/workflows/codeql.yml` passou. O status remoto continua “falha” até um PR seguro executar os checks; não foi feito push.

Depois do commit CodeQL `2707fb5a3`, passaram novamente `actionlint`, `npm run typecheck`, `npm run lint` (0 erros/873 avisos), `npm run build` e `npm test` (453 arquivos aprovados, 4 ignorados; 5.848 testes aprovados, 68 ignorados).

Também foram resolvidas localmente as vulnerabilidades altas do npm: Zod foi atualizado para `4.6.7` (o advisory não tinha versão corrigida v3; ajustes de compatibilidade ficaram limitados a `error` nos enums e `issues` no erro de validação) e `undici` transitivo foi atualizado para `8.12.3` dentro da major 8. `npm audit fix` sem `--force` reduziu as moderadas de 15 para 13. Permanecem moderadas na cadeia do ESLint/`minimatch`, sem atualização compatível indicada; não foi feito upgrade major dessa cadeia. `npm run check:npm-audit`, `npm audit --audit-level=high`, typecheck, lint, build e toda a suíte passaram; o build acrescenta avisos de comentários `@__PURE__` no Zod 4, sem falhar.

## Ajustes na auditoria anterior e riscos ainda em aberto

- E-018 estava desatualizado na primeira leitura: a migration versionada `20260927171216_quote_approval_security_hardening.sql` remove a escrita direta do usuário autenticado e revoga INSERT/UPDATE/DELETE em `quote_history`. Isso confirma o código versionado, não o estado remoto do banco.
- E-011: há definições históricas conflitantes de retorno para `cleanup_old_notifications()`, mas o executor atual tem allowlist própria e não aplica esses arquivos legados. Não foi alterado schema; a falha histórica precisa ser reproduzida no fluxo de bootstrap/preview vigente antes de propor migration corretiva.
- Permanecem gaps auditados, entre outros: a entrega de webhook ainda precisa de revisão explícita de idempotência (etapa correspondente a confirmar; E024 neste plano trata de filtros e ordenação); E-019/E-020 têm riscos de paginação/validação de preferências.
- A validação de ponta a ponta continua bloqueada por ambiente E2E de homologação e dados/contas de teste confirmados. Não se consultaram valores de secrets, não se executou Edge Function e não houve leitura ou escrita no Supabase remoto.
- PR #178 segue aberto como rascunho no SHA `746f7d2`: https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/178. Nenhum PR foi alterado ou mesclado.

## Próximos passos

1. Publicar/validar via PR as correções CodeQL, npm e aplicação após desbloqueio seguro do E2E; os gates locais estão verdes, mas ainda falta prova remota.
2. Diagnosticar a divergência de versão da Edge Function com o estado do projeto de homologação autorizado; não publicar funções no banco canônico sem validação e autorização específicas.
3. Retomar E2E após criação/confirmação dos secrets dedicados de homologação, contas e allowlist restrita ao projeto isolado; a lista atual de nomes não comprova os valores/alvos. Confirmar também a rotação da credencial exposta anteriormente.
4. E-023 agora tem correção local em `fix/hermes-h393620-docs-audit-20261031`: os três caminhos de busca do `crm-db-bridge` escapam `%`, `_` e `\\`; 2 testes Deno passaram e `deno check` passou. E-027 preserva os objetos quando a RPC ou sua verificação de registro têm resultado ambíguo; ausência/divergência não é tratada como rollback. Após o ajuste, `deno fmt --check`, 5 testes Deno e `deno check` passaram. Ainda falta CI remoto. Continuar as etapas rastreáveis em ordem de risco; registrar aceite externo como pendente, sem marcar o plano integral como concluído.
