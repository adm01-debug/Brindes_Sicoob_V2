# Etapa 26 — referências de runtime a objetos inexistentes

**Método:** extraídas 185 tabelas + 92 RPCs distintas referenciadas em `src/` e
`supabase/functions/` via `.from('...')`/`.rpc('...')`, comparadas contra o
inventário ao vivo do banco `cfmzkthhgliqelozlmwu`. 30 nomes não bateram à
primeira vista; 20 se confirmaram falso-positivo (client separado para
catálogo/CRM externos, ou chamada `.storage.from()` quebrada em 2 linhas que
o grep não capturou corretamente). Sobraram **10 achados reais**.

**Correção de metodologia (16/09/2026):** a checagem inicial de
"página roteada?" usava `grep` em `src/App.tsx` e imports diretos `.tsx`,
mas as rotas reais deste app vivem em `src/routes/config/*.ts`
(`lazyWithRetry()` + `defineRoute()`, todos importados em `App.tsx`,
**incluindo** `devRoutes` — que apesar do nome roda em produção normal, não
é um ambiente separado). Isso me levou a classificar `RolesPage`,
`PAWalletPage`, `QuotesKanbanPage`, `AdminSegurancaPage` e
`AdminPromptsIAPage` como "código morto" quando na verdade **estão todas
roteadas e ao vivo**. Só `AdminUsuariosPage` é código morto de verdade
(zero rota em qualquer `routes/config/*.ts`). Tabela abaixo já reflete a
correção.

## Falsos-positivos resolvidos (não precisam de ação)
`categories`, `categories_tree_visual`, `companies`, `contacts`, `customers`,
`material_groups`, `material_types`, `mv_material_group_stats`,
`product_materials`, `product_category_assignments`, `suppliers`,
`tabela_preco_gravacao_oficial`, `tabela_preco_gravacao_oficial_faixa`,
`products` (nas Edge Functions) — todas usam `createClient()` com
`EXTERNAL_SUPABASE_URL`/`EXTERNAL_CRM_URL` explícitos, banco diferente do
auditado aqui. `proposals` (PdfGenerationDialog.tsx) e `personalization`
(OrderService.ts) — chamadas `.storage.from(...)` genuínas, quebradas em 2
linhas, sem bug real.

## Já corrigidos nesta sessão

| Referência | Status | O que foi feito |
|---|---|---|
| `art-files` | ✅ corrigido (Etapa 25) | Código trocado para `.storage.from('proposals')`, bucket real já existente |
| `avatars` | ✅ corrigido (Etapa 25) | Bucket criado com policies |
| `rls_denial_logs` (plural) | ✅ corrigido | Typo — corrigido para `rls_denial_log` (singular, tabela real) em `AuditEvidenceDashboard.tsx` |
| `password_reset_requests` | ✅ corrigido | **Bug real e ao vivo**: `/auth` → "esqueci minha senha" chamava `INSERT` numa tabela inexistente, todo usuário recebia erro. Tabela criada (`20260916180000`), RLS testado ao vivo (insert legítimo funciona, auto-aprovação via payload manipulado bloqueada). Lado admin (`PasswordResetApproval.tsx`) só é importado por `AdminUsuariosPage.tsx` (código morto confirmado) — não há UI viva pra revisar as solicitações ainda, item de produto separado |
| `audit_log` | ✅ corrigido | **Bug real e ao vivo**: `/admin/cadastros` (cadastro de produtos) tentava gravar auditoria numa tabela inexistente a cada save — falha silenciosa (não bloqueava o save, só perdia o rastro). Tabela criada (`20260916190000`) com o schema exato que o código espera; não redirecionado para `admin_audit_log` porque o schema é incompatível (colunas diferentes, e aquela tabela tem cadeia de hash tamper-evident que não deve receber INSERT direto de client comum) |

## Achados reais confirmados ao vivo, ainda sem correção (exigem decisão de produto)

| Referência | Página ao vivo | Achado | Por que não corrigi agora |
|---|---|---|---|
| `roles` | `RolesPage.tsx` em `/admin/usuarios` e `/admin/roles` | Papéis neste app são um **enum Postgres** (`app_role`, usado em `has_role(auth.uid(), 'admin'::app_role)` em toda regra de RLS da sessão), não uma tabela editável. `RolesPage` foi escrita para um modelo antigo de papéis dinâmicos via tabela — incompatível com a arquitetura atual. Criar uma tabela `roles` não resolveria de verdade; seria só maquiagem sobre um desenho que não bate com o resto do sistema | Decisão de arquitetura: reescrever a página contra o enum (ex.: gerenciar `user_roles`) ou aposentá-la — não é chamada minha para tomar sozinho |
| `sicoob_budgets` | `PAWalletPage.tsx` em `/pa/verba`, `budgetService.ts`, `useSicoobBudget.ts` | Modelo antigo (`pa_id` + `used_amount` único) foi substituído por `pa_budgets`/`cooperativa_budgets` (por ano/mês, `verba_total`/`verba_consumida`). Não é rename simples — o formato de dado mudou | Precisa decisão de UX: a carteira mostra o mês corrente? deixa escolher mês? — não vou inventar esse comportamento |
| `bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs` | `QuotesKanbanPage.tsx`, `supabase/functions/bitrix-sync/index.ts` | Cliente aponta para o projeto principal (não é catálogo/CRM externo) — as 3 tabelas realmente não existem aqui | Preciso entender o escopo real da feature de sync Bitrix antes de criar 3 tabelas ou decidir que a função é vestigial |
| `user_2fa_settings` | `AdminSegurancaPage.tsx` em `/admin/seguranca`, via `TwoFactorSetup.tsx` e `SecuritySettingsCard.tsx` | Funcionalidade de 2FA sem tabela de apoio | Feature de segurança — desenho de tabela (segredo TOTP, método, status verificado) e RLS exigem cuidado extra, não é apropriado inventar sozinho sob pressão de "executar tudo" |
| `personalization_techniques` | `AdminPromptsIAPage.tsx`, via `MockupPromptManager.tsx` | Sem tabela de apoio para técnicas de personalização de IA | Preciso entender o formato de dado esperado (prompt templates? categorias?) antes de criar o schema |

## Triagem completa em 17/09/2026 — últimos 2 itens resolvidos

- **`sales_goals`** (`useSalesGoalsCard.tsx`) — **código morto confirmado**: zero
  importadores em todo o repo (nem precisou checar rota).
- **`personalization_simulations`** (`useSimulation.ts`) — **ao vivo**, via
  `KitBuilderPage` (roteada em `tools.ts`). Achado adicional: o `SELECT`
  usa `.select('*, bitrix_clients (id, name, ramo)')` — um embed do
  PostgREST que depende de uma FK real para `bitrix_clients`, que também
  não existe. Criar só `personalization_simulations` não resolveria o
  carregamento de simulações salvas (o embed quebraria); os dois ficam
  como **um item só**, amarrado à mesma decisão pendente de `bitrix_clients`
  (linha da tabela acima).
- **`personalization_techniques`** (`MockupPromptManager.tsx`) — confirmado
  que usa o client **local** (`supabase.from(...)`), diferente de
  `useSimulation.ts` (que busca técnicas via `invokeExternalDb` no catálogo
  externo, corretamente). Suspeita forte: é o mesmo padrão da Etapa 9 —
  tabela local pré-migração para o catálogo externo, nunca limpa. O
  provável conserto real não é criar a tabela vazia (ficaria sem dado
  nenhum pra listar), é redirecionar este componente para o catálogo
  externo como o simulador já faz — mas isso é mudança de comportamento,
  não conserto mecânico.

**Fechamento da Etapa 26:** as 10 referências reais da amostra original
(277 nomes) estão 100% triadas — 4 corrigidas, 6 documentadas com decisão
pendente (2 delas amarradas na mesma causa: `bitrix_clients`). Continua
faltando: aplicar as decisões pendentes, o script
`check-runtime-refs.mjs` no CI, e varrer os ~318 nomes fora da amostra
original.
