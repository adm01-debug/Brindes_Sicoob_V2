# Frontend — Painel Admin, BI, Inteligência e IA (fatia ADM)

> Repositório `adm01-debug/Brindes_Sicoob_V2`, HEAD `dc08200` (main, 08/10/2026). Análise estática somente leitura feita em 11/10/2026.
> Escopo: `src/components/admin/**`, `src/pages/admin/**`, `src/components/{bi,intelligence,magic-up,mockup,expert,dashboard,security,settings,notifications,dev,product-registration,replenishments,inventory}`, `src/hooks/{bi,voice}`, `src/lib/bi`, além das rotas (`src/App.tsx`, `src/routes/config/*`) e das edge functions chamadas.
> `src/components/voice/` não existe mais: a UI de voz foi movida para `src/components/search/voice/` (o README ainda cita o caminho antigo).
> Método: script Node próprio de grafo de imports (alias `@/`→`src/`, barrels e `import()` dinâmico, alcançabilidade a partir de `src/main.tsx`), cruzamento de links internos × rotas registradas, cruzamento de `.from()`/`.rpc()` com `types.ts`/migrations e leitura dirigida do código.
> **Limite:** a consulta remota ao banco canônico (`cfmzkthhgliqelozlmwu`) via MCP respondeu `401 Invalid access token`. Por isso nenhum achado usa contagem de linhas em produção; os itens sobre dados reais × simulados descrevem o comportamento do código.

## Resumo

**57 itens** na fatia (IDs ADM-01 a ADM-57).

| Status | Qtde |
|---|---:|
| NAO_INICIADA | 4 |
| PARCIAL | 14 |
| STUB/MOCK | 13 |
| ORFA | 20 |
| BLOQUEADA_EXTERNA | 6 |
| **Total** | **57** |

Números de apoio:
- **154 arquivos órfãos** na fatia, com cerca de **27,5 mil linhas**: 39 sem nenhum importador e 115 importados só por outros órfãos. Destes, **112 arquivos e cerca de 19 mil linhas** formam o módulo de catálogo admin (produtos, fornecedores, gravação), inalcançável pelo app.
- Todas as **25 edge functions** chamadas pela fatia existem em `supabase/functions/`. Nenhuma chamada aponta para função inexistente. O problema está em credenciais e no contrato de escrita, não na ausência de função.
- **6 itens de menu admin** levam a 404 ou à página errada. **21 rotas** registradas não têm nenhum ponto de entrada na navegação.
- **Nenhum `TODO/FIXME/HACK`** na fatia. As pendências aparecem como textos "em breve", heurísticas fixas, `isMock`, `Math.random` e flags sem consumidor.

### 10 achados mais graves
1. **ADM-34 (P0):** o BI 360 mostra LTV, ticket, pedidos, Health Score, risco de churn, briefing e respostas do Copilot calculados sobre `MOCK_CLIENT_STATS` quando o cliente não tem pedidos ou quando uma RPC falha. Só 1 de cerca de 8 painéis avisa "Dados simulados".
2. **ADM-02 (P1):** o cadastro de produto, a importação em massa, os fornecedores, a mídia, as variantes, os kits e a gravação gravam no catálogo externo via `external-db-bridge`. A bridge recusa toda escrita com `CATALOG_READ_ONLY` (403), então **nada é salvo**.
3. **ADM-01 (P1):** o menu "Cadastros › Produtos/Fornecedores/Gravação" abre o formulário simples `ProductRegistrationPage`, que ignora `?tab=`. A gestão completa de catálogo (`AdminCadastrosPage` + cerca de 19 mil linhas) está órfã.
4. **ADM-27 (P1):** as preferências de notificação (e-mail, WhatsApp, Não Perturbe, resumo) não têm efeito. `send-notification` nunca é chamada, e as filas de DND e de resumo não têm despachante.
5. **ADM-19 (P1):** os feature flags do admin, inclusive "Validação de Verbas (PAC)", gravam `system_settings` mas nenhum código os lê.
6. **ADM-43 (P1):** "Tendências" abre em **modo demo por padrão** (`?demo=0` desliga) para todos os usuários. Seis cards, KPIs e gráficos mostram dados fictícios.
7. **ADM-35 (P1):** o BI cria notificações reais de "pico sazonal" a partir de sazonalidade simulada (menos de 3 meses de histórico).
8. **ADM-38 (P1):** "Criar orçamento com sugestões" do BI abre o Quote Builder vazio, porque o builder não lê `clientId` nem `productIds` da URL.
9. **ADM-15 (P1):** há links quebrados dentro da fatia: `/catalogo?busca=` (Inteligência), `/admin/descontos` (widget), `/admin` (pós-MFA) e `/bi` (busca global).
10. **ADM-54 (P1):** toda a IA (Flow, mockup, Magic Up, busca visual, Copilot) depende de `LOVABLE_API_KEY`, e a voz depende de `ELEVENLABS_API_KEY`. As duas constam como "**preencher**" em `docs/secrets.md`.

---

## Itens

### Mapa: menu admin × rotas × páginas (tarefa 1)

| Item de menu (`SidebarReorganized.tsx`) | href | Rota registrada | Página renderizada | Página "certa" existente | Situação |
|---|---|---|---|---|---|
| Cadastros › Produtos (`:204`) | `/admin/cadastros?tab=products` | `admin.ts:22` | `ProductRegistrationPage` (abas Individual/Massa) | `AdminCadastrosPage` (órfã) | página errada (ADM-01) |
| Cadastros › Fornecedores (`:205`) | `?tab=suppliers` | idem | idem, `tab` ignorado | `SuppliersManager` (órfão) | página errada |
| Cadastros › Gravação (`:206`) | `?tab=personalizacao` | idem | idem | `EngravingRegistrationContent` (órfão) | página errada |
| Estrutura › Singulares / PAs / Parceiros (`:216-218`) | `/admin/singulares`, `/pas`, `/cooperativas` | `admin.ts:30-40` | `SicoobManagementPage`, sempre na aba "Singulares" | `AdminSingularesPage`, `AdminPAsPage`, `AdminCooperativasPage` (órfãs) | path ignorado (ADM-05) |
| Marketing › Newsletter (`:227`) | `/admin/newsletter` | **não** | NotFound | `AdminNewsletterPage` (órfã) | 404 (ADM-03) |
| Marketing › Campanhas (`:228`) | `/admin/campanhas` | **não** | NotFound | `AdminCampanhasPage` (órfã) | 404 (ADM-03) |
| Evidências QA (`:247-251`) | `/admin/qa/release-evidences` | **não** | NotFound | `ReleaseEvidencesPage` (órfã) | 404 (ADM-04) |
| Auditoria RLS (`:253`) | `/admin/seguranca/rls` | **não** | NotFound | `RLSAuditPage` (órfã) | 404 (ADM-04) |
| Workflows IA (`:244`) | `/admin/workflows` | `dev.ts:47` | `AdminWorkflowsPage` | — | stub (ADM-31) |
| Demais itens (Usuários, Gestão SICOOB, Reconciliação, Categorias, CMS, Verbas, Telemetria, Segurança, Acesso & Bots, Conexões, Prompts IA, Auditoria RBAC, QA Pré-flight) | — | sim | página correta | — | OK (gaps internos em itens próprios) |

### Painel admin, navegação e rotas

### ADM-01 — Gestão de catálogo admin (produtos, fornecedores, gravação) desligada do menu
- Status: ORFA
- Origem: menu `src/components/layout/SidebarReorganized.tsx:198-209` (Cadastros › Produtos/Fornecedores/Gravação com `?tab=`); `docs/ROUTES.md` cita `/admin/cadastros` → `AdminCadastrosPage` e `/admin/cadastros/produto/:id` → `AdminProductFormPage`.
- Evidência no código: `src/routes/config/admin.ts:22-24` roteia `/admin/cadastros` para `@/pages/ProductRegistrationPage`, que só tem as abas "single" e "bulk" (`src/pages/ProductRegistrationPage.tsx:20-36`) e não lê `tab`. `src/pages/admin/AdminCadastrosPage.tsx:30-36` trata `products|suppliers|personalizacao`, mas nenhuma rota a importa. `useProductsManager.ts:316-317` navega para `/admin/cadastros/produto/novo` e `/:id`, rotas inexistentes. `src/pages/EngravingRegistrationPage.tsx` (técnicas, preços, grupos, regras, por produto) só é carregada pela página órfã.
- O que falta: registrar `AdminCadastrosPage` em `/admin/cadastros` e `AdminProductFormPage` em `/admin/cadastros/produto/:id`; decidir o destino do formulário simples. Mesmo religado, o salvamento esbarra no ADM-02.
- Impacto no negócio: o admin clica em "Fornecedores" ou "Gravação" e cai num formulário de produto; não há lista, edição nem exclusão de produtos, fornecedores ou técnicas.
- Esforço: P (religar rotas), M (validar fluxo)
- Prioridade: P1

### ADM-02 — Escrita no catálogo bloqueada pelo contrato somente-leitura
- Status: BLOQUEADA_EXTERNA (decisão de arquitetura/dono do catálogo)
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §3.4 "Registro de Produtos"; o menu Cadastros. O contexto do projeto define o catálogo `doufsxqlfjyuvxuezpln` como somente leitura.
- Evidência no código: `src/hooks/useProductRegistration.ts:156-171` cria o produto via `productsDb.create`, ou seja, `invoke('insert')` de `src/hooks/useExternalDatabase.ts:173-174`. `supabase/functions/external-db-bridge/index.ts:479-481` responde `403 CATALOG_READ_ONLY` para tudo que não seja `select/ping/rpc` (`_shared/external-read-only.ts:4-12`). As mesmas escritas aparecem em `components/admin/products/image-gallery/useProductImageGallery.ts` (11 operações), `kit-components/api.ts` (9), `video-gallery/useProductVideoGallery.ts` (5), `useProductVariants.ts` (3), `sections/engraving/useEngravingWizard.ts` (3), `ProductMaterialsSection.tsx` (3), `ProductTagsSection.tsx` (2), `suppliers-manager/useSuppliersManager.ts:301-304,517`, `useProductsManager.ts:323-348`, `NewCategoryDialog.tsx`, `new-supplier/useNewSupplierForm.ts`. A importação em massa (`BulkImportPanel.tsx` → `useProductRegistrationImport.ts:146`) também usa `createProduct`.
- O que falta: decidir onde o portal grava produtos e fornecedores (API do sistema de gestão de produtos, tabela local ou nenhum lugar) e adaptar ou remover os formulários. Hoje o formulário roteado só falha no submit.
- Impacto no negócio: cadastrar ou importar produto pelo portal não funciona; o admin preenche tudo e recebe erro.
- Esforço: G
- Prioridade: P1

### ADM-03 — Marketing: Newsletter e Campanhas (menu leva a 404)
- Status: ORFA
- Origem: menu `SidebarReorganized.tsx:222-230`; seed `feature_marketing_newsletter` em `supabase/migrations/20260504182837_…sql:56`.
- Evidência no código: `src/pages/admin/AdminNewsletterPage.tsx` (tabela `newsletter_subscribers`) e `src/pages/admin/AdminCampanhasPage.tsx` (tabela `campaigns`) existem, mas nenhuma rota as registra. Nenhum outro arquivo lê `campaigns`, e nenhum formulário público grava em `newsletter_subscribers`.
- O que falta: rotas `/admin/newsletter` e `/admin/campanhas`; formulário público de inscrição; uso das campanhas em algum ponto (banner, envio, catálogo); disparo de e-mail.
- Impacto no negócio: o menu de Marketing está quebrado e não existe captação de leads nem campanha ativa.
- Esforço: M
- Prioridade: P2

### ADM-04 — QA: Evidências de release, Auditoria RLS e detalhe de execução sem rota
- Status: ORFA
- Origem: menu `SidebarReorganized.tsx:247-253`.
- Evidência no código: `src/pages/admin/qa/ReleaseEvidencesPage.tsx` (SEO `path="/admin/qa/release-evidences"`), `src/pages/admin/RLSAuditPage.tsx` (`/admin/seguranca/rls`) e `src/pages/admin/qa/QARunDetailPage.tsx:235` (`useParams id`, volta para `/admin/qa/preflight`) não estão em `src/routes/config/dev.ts`.
- O que falta: registrar as 3 rotas sob `DevRoute`, por exemplo `/admin/qa/runs/:id`, e linkar o detalhe a partir do Pré-flight.
- Impacto no negócio: as evidências de liberação e a auditoria de RLS, exigidas no go-live, não são consultáveis pela tela.
- Esforço: P
- Prioridade: P2

### ADM-05 — Estrutura Sicoob: Singulares, PAs, Parceiros e Centrais
- Status: PARCIAL
- Origem: menu `SidebarReorganized.tsx:211-219`; rotas `admin.ts:30-40`.
- Evidência no código: as três rotas apontam para `SicoobManagementPage` com `Tabs defaultValue="cooperativas"` (`src/pages/admin/sicoob/SicoobManagementPage.tsx:20`), sem ler o path. "Parceiros" não tem conteúdo próprio. `AdminSingularesPage`, `AdminPAsPage` e `AdminCooperativasPage` estão órfãs. O CRUD de `sicoob_centrais` existe só em `AdminCentraisPage.tsx:49-87` (órfã), então não há UI para cadastrar Centrais. Em `tabs/CooperativasTab.tsx:269`, a coluna "PAs" mostra `{/* Placeholder for count of PAs */} -`. A edição de Singulares só aparece para dev (`:272-296`, "Somente visualização").
- O que falta: abrir a aba conforme a rota; decidir o que é "Parceiros"; contar PAs por singular; expor o CRUD de Centrais; revisar a permissão de edição para admin.
- Impacto no negócio: o admin não consegue cadastrar Central e os menus parecem não funcionar.
- Esforço: P
- Prioridade: P2

### ADM-06 — "Promover Agente" leva a 404
- Status: ORFA
- Origem: botão em `src/pages/admin/AdminUsuariosPage.tsx:354`; `src/lib/rbac/route-matrix.ts:73` lista `/admin/usuarios/promover`; `docs/ROUTES.md`.
- Evidência no código: `src/pages/admin/AdminPromoverUsuarioPage.tsx` (265 linhas, step-up) não tem rota.
- O que falta: registrar a rota, ou remover o botão e manter só o `PromotionDialog`.
- Impacto no negócio: um botão de destaque da gestão de usuários abre "página não encontrada".
- Esforço: P
- Prioridade: P2

### ADM-07 — Trilha de auditoria administrativa sem tela
- Status: ORFA
- Origem: `src/pages/admin/AdminAuditPage.tsx` (SEO `path="/admin/auditoria"`).
- Evidência no código: lê `admin_audit_log` (`:63,122`), mas nenhuma rota a registra. O botão `:231` leva a `/admin/auditoria/enterprise`, que também não existe.
- O que falta: rota sob `AdminRoute`/`DevRoute` e item de menu.
- Impacto no negócio: as ações administrativas são registradas, mas ninguém consegue revisá-las pela interface.
- Esforço: P
- Prioridade: P2

### ADM-08 — Painéis "Auditoria Enterprise" e "Evidências" com números fixos
- Status: STUB/MOCK
- Origem: `src/pages/admin/AuditEnterprisePage.tsx`, `src/pages/admin/AuditEvidenceDashboard.tsx` (SEO `/admin/auditoria/evidencias`).
- Evidência no código: `AuditEnterprisePage.tsx:25` mostra "10.0 / 10.0", `:34-40` "Riscos Ativos 0", `:51` "100%" de RLS e "Testes E2E Auditado 14/05/2026", tudo literal. `AuditEvidenceDashboard.tsx:18-55` usa um array `EVIDENCES` estático e inclui "Blockchain Audit Trail… Pendente P3" (`path: "roadmap/ledger-integration"`). As duas páginas também estão sem rota.
- O que falta: alimentar com dados reais (resultados de CI, `sicoob_rls_audit_logs`, `rls_denial_log`) ou remover. A trilha imutável (ledger) não foi iniciada.
- Impacto no negócio: um painel de auditoria com nota 10/10 fixa pode passar falsa segurança a auditor ou cliente.
- Esforço: M
- Prioridade: P3

### ADM-09 — Views `sicoob_budget_audit` e `v_full_scope_grants` sem tela
- Status: NAO_INICIADA
- Origem: `docs/execucao/decisoes_pendentes.md` item 10 ("Views de auditoria prontas pra virar tela… `AuditEvidenceDashboard.tsx`").
- Evidência no código: as views constam em `src/integrations/supabase/types.ts`, mas nenhum `.from()` em `src/` as consulta.
- O que falta: tela de auditoria de verbas e de concessões de escopo.
- Impacto no negócio: não há rastreio visual de quem movimentou verba ou recebeu escopo amplo.
- Esforço: M
- Prioridade: P2

### ADM-10 — Dashboard Executivo e metas de vendas desligados
- Status: ORFA
- Origem: `src/pages/admin/AdminBusinessDashboardPage.tsx` (SEO `path="/admin/business"`, selo "Live BI"); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §7.2 "Metas de Vendas".
- Evidência no código: a página não tem rota. `:14` traz "Using empty viewedMap for now". `src/components/admin/GoalTracker.tsx:20-31` lê `admin_settings.monthly_sales_goal`, mas nenhuma UI ou migration grava a chave, então a meta cai no padrão fixo `100_000`. `OrdersHeatmap.tsx` só é usado ali. Fora da fatia, `components/goals/SalesGoalsCard.tsx` e `hooks/useSalesGoals.ts` também estão órfãos.
- O que falta: rota e menu; tela para definir a meta mensal; ligar as visualizações ao funil.
- Impacto no negócio: a diretoria não acompanha meta × realizado no portal.
- Esforço: M
- Prioridade: P2

### ADM-11 — Rotas administrativas sem ponto de entrada
- Status: ORFA
- Origem: `src/routes/config/dev.ts`, `admin.ts` e `App.tsx:122-124`.
- Evidência no código: estas rotas só aparecem no próprio `PageSEO` e não têm nenhum link, item de menu ou spotlight: `/admin/performance`, `/admin/rate-limit`, `/admin/login-attempts`, `/admin/consumo-ia`, `/admin/rls-denials`, `/admin/auditoria-propriedade`, `/admin/seguranca/chaves`, `/admin/seguranca/migracao-papeis`, `/admin/validade-precos`, `/status`, `/external-db-test`, `/admin/limites-desconto`, `/admin/permissoes`, `/admin/roles` (`/admin/role-permissoes` só via RolesPage), `/admin/video-variantes`, `/admin/kit-templates`, `/admin/design-system/colors`, `/admin/saude-testes`, `/sicoob/qa/preflight`, `/mockups/historico`. Além disso, `PriceFreshnessSettings.tsx:8` declara "protegida por AdminRoute", mas está em `dev.ts:68` (`DevRoute`), então admin sem papel dev não acessa.
- O que falta: incluir no menu (por exemplo um hub "Segurança"/"Operação") ou remover; alinhar o guard de `/admin/validade-precos`.
- Impacto no negócio: ferramentas prontas (consumo de IA, limites de desconto, templates de kit, vídeos por variante) ficam invisíveis.
- Esforço: P
- Prioridade: P2

### ADM-12 — Página dedicada de status de conexões substituída
- Status: ORFA
- Origem: `docs/ROUTES.md` (`/admin/conexoes/status` → `AdminConexoesStatusPage`).
- Evidência no código: `src/routes/config/dev.ts:31-33` aponta `/admin/conexoes/status` para `AdminConexoesPage`. `src/pages/admin/AdminConexoesStatusPage.tsx` (345 linhas, `external_connections` e `integration_credentials`) ficou sem uso.
- O que falta: decidir entre religar ou remover.
- Impacto no negócio: baixo, porque o hub de Conexões cobre o assunto.
- Esforço: P
- Prioridade: P3

### ADM-13 — Matriz RBAC exibida em "Auditoria RBAC" diverge das rotas reais
- Status: PARCIAL
- Origem: `src/lib/rbac/route-matrix.ts` (consumida por `AdminRbacRoutesPage`).
- Evidência no código: a matriz lista `/admin/usuarios/promover` (`:73`) e `/auth/callback` (`:55`), que não existem (a rota real é `/sso/callback`). Faltam na matriz `/admin/sicoob`, `/admin/cms`, `/admin/verbas`, `/admin/categories`, `/admin/singulares`, `/admin/pas`, `/admin/cooperativas`, `/admin/limites-desconto`, `/admin/design-system/colors`, `/admin/saude-testes` e `/admin/aprovacoes-desconto`. Os guards também divergem: `/tendencias` aparece como AdminRoute (`:69`), mas é `ProtectedRoute` (`products.ts:58`); `/admin/temas` aparece como ProtectedRoute (`:78`), mas fica sob `AdminRoute` (`App.tsx:123`). `docs/ROUTES.md` também está defasado.
- O que falta: gerar a matriz a partir de `routes/config`.
- Impacto no negócio: a auditoria de acesso mostra um retrato falso do que cada papel acessa.
- Esforço: P
- Prioridade: P2

### ADM-14 — "Skins" no menu do usuário bloqueado para quem não é admin
- Status: PARCIAL
- Origem: `route-matrix.ts:78` ("Disponível para qualquer usuário autenticado").
- Evidência no código: o menu do usuário em `Header.tsx:130` navega para `/admin/temas`, que fica dentro de `<Route element={<AdminRoute />}>` (`App.tsx:111-125`).
- O que falta: mover a rota para `ProtectedRoute` ou esconder o item para não-admin.
- Impacto no negócio: vendedor e gerente de PA clicam em "Skins" e são barrados.
- Esforço: P
- Prioridade: P2

### ADM-15 — Links internos quebrados nos componentes da fatia
- Status: PARCIAL
- Origem: navegação interna.
- Evidência no código:
  - `src/components/intelligence/HotSearchesCard.tsx:138` e `UnmetDemandCard.tsx:122` navegam para `/catalogo?busca=…`, rota inexistente. O correto seria `/filtros?search=`.
  - `src/components/dashboard/MyDiscountRequestsWidget.tsx:109` leva a `/admin/descontos`, que não existe; o redirect real é `/admin/aprovacoes-desconto`.
  - `src/components/security/MfaEnrollmentDialog.tsx:272` faz `navigate('/admin')`, sem rota.
  - `src/components/dashboard/UpcomingDatesWidget.tsx:33` usa `/filtros?data=slug`, mas o filtro lê `datasComemorativas` (`src/pages/filters/filters-page-helpers.ts:14`), então o filtro se perde.
  - O item "Dashboard" da busca global aponta para `url: '/bi'` (`src/components/search/GlobalSearch.tsx:59`); a rota real é `/ferramentas/bi`, e o README (§6) também cita `/bi`.
- O que falta: corrigir os destinos e os nomes dos parâmetros.
- Impacto no negócio: cliques em "buscas em alta", "demanda não atendida", "ver todas as solicitações" e "datas comemorativas" terminam em 404 ou em catálogo sem filtro.
- Esforço: P
- Prioridade: P1

### ADM-16 — Métricas de templates de kit sem rota
- Status: ORFA
- Origem: `docs/ROUTES.md` (`/admin/kit-templates/metricas`).
- Evidência no código: `src/pages/admin/KitTemplatesMetricsPage.tsx` (lê `kit_templates`, `custom_kits` e `kit_share_tokens`) não tem rota, e `KitTemplatesAdminPage` não a linka.
- O que falta: rota e link.
- Impacto no negócio: não se mede quais kits sugeridos vendem.
- Esforço: P
- Prioridade: P3

### ADM-17 — Página de exemplos de desafio MFA (dev) sem rota
- Status: ORFA
- Origem: `docs/ROUTES.md` (`/admin/seguranca/exemplos-challenge`).
- Evidência no código: `src/pages/admin/DevChallengeExamplesPage.tsx` (440 linhas) não tem rota.
- O que falta: rota ou remoção.
- Impacto no negócio: baixo, é documentação técnica.
- Esforço: P
- Prioridade: P3

### Usuários, papéis e segurança

### ADM-18 — Cupons: histórico "em breve" e uso nunca contabilizado
- Status: STUB/MOCK
- Origem: aba "Histórico" em `src/components/admin/CouponManager.tsx:178`.
- Evidência no código: `:204-215` mostra o texto fixo "Em breve você poderá visualizar aqui o histórico detalhado de cada utilização dos cupons". Nenhum código ou migration incrementa `coupons.usage_count` (grep só encontra leituras em `CouponManager.tsx:48` e `cart/CouponInput.tsx:15`), e não existe tabela de resgates. O `MiniCart` leva a `/checkout`, que não existe.
- O que falta: tabela ou registro de resgate, incremento atômico de uso e a tela de histórico.
- Impacto no negócio: o limite de uso do cupom nunca é atingido, então um cupom limitado vale infinitas vezes.
- Esforço: M
- Prioridade: P2

### ADM-19 — Feature flags do sistema sem efeito
- Status: ORFA
- Origem: aba "Configurações do sistema" em `AdminUsuariosPage.tsx:218-220`; seed em `supabase/migrations/20260504182837_a8f0e9b4-…sql:53-57`.
- Evidência no código: `src/components/admin/SystemFeatureToggles.tsx:98-125` alterna `feature_cart_system`, `feature_direct_chat`, `feature_cms_blog` e `feature_budget_enforcement` em `system_settings`. Nenhum outro arquivo de `src/` ou `supabase/` lê essas chaves (grep). `feature_marketing_newsletter` é semeado sem toggle.
- O que falta: ler os flags nos pontos de decisão (carrinho, chat, blog, trava de verba) ou remover a tela.
- Impacto no negócio: o admin desliga "Validação de Verbas (PAC)" ou "Carrinho" e nada muda, o que dá falsa sensação de controle.
- Esforço: M
- Prioridade: P1

### ADM-20 — Passkeys/WebAuthn: UI exposta, função desligada
- Status: STUB/MOCK
- Origem: `docs/AUTH_PASSKEYS.md` (roadmap: challenge no servidor, verificação de atestação e asserção); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §1.4. `docs/SCOPE_ALIGNMENT.md` marca WebAuthn como fora de escopo.
- Evidência no código: `src/hooks/useWebAuthn.ts:1-33` devolve `isSupported:false` e funções que retornam `false` ou `[]`. A aba "Passkeys" (`SecurityDashboardSections.tsx:681`) exibe "Indisponível por enquanto" (`src/components/security/PasskeyManager.tsx:47-56`). Não existe edge function `webauthn-*`.
- O que falta: implementação server-side completa, ou retirar a aba até haver decisão.
- Impacto no negócio: baixo; o login biométrico prometido na tela não existe.
- Esforço: G
- Prioridade: P3

### ADM-21 — Central de segurança da própria conta inacessível para usuários comuns
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §1.8 (`src/pages/Security.tsx`, que não existe; `SecuritySettings.tsx` com "gerencie… da sua conta").
- Evidência no código: `src/components/security/SecuritySettings.tsx` (wrapper do usuário) está órfão. `SecurityDashboard` (2FA, dispositivos, histórico, push) só é montado em `AdminSegurancaPage` (`/admin/seguranca`, `DevRoute`, `dev.ts:19`). `/perfil` e `/configuracoes` redirecionam para `/admin/usuarios` (`App.tsx:92-93`), também restrito.
- O que falta: rota `/minha-conta` ou `/seguranca` sob `ProtectedRoute`.
- Impacto no negócio: vendedores e gerentes não conseguem ativar 2FA, ver dispositivos nem histórico de login próprios.
- Esforço: P
- Prioridade: P2

### ADM-22 — Push de segurança só com a aba aberta (sem Web Push)
- Status: PARCIAL
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §9.2 ("Web Push API", "Service Worker").
- Evidência no código: `src/hooks/usePushNotifications.tsx:30-37` usa `Notification.requestPermission`, e `:125-170` faz assinatura realtime de `postgres_changes`. Não há `pushManager.subscribe`, VAPID nem tabela de inscrições. A tela fica em `components/security/PushNotificationSettings.tsx`.
- O que falta: Web Push real com service worker, chaves VAPID e envio no servidor.
- Impacto no negócio: o alerta de login suspeito só chega se o portal estiver aberto.
- Esforço: M
- Prioridade: P3

### ADM-23 — Varredura antivírus de uploads depende de chave ausente
- Status: BLOQUEADA_EXTERNA
- Origem: aba "Gestão de Uploads" em `AdminSegurancaPage.tsx:36-50`; `docs/secrets.md` (`VIRUSTOTAL_API_KEY` "**preencher**").
- Evidência no código: `supabase/functions/secure-upload/index.ts:75-77`: sem a chave, o arquivo segue para o prefixo `verified` sem varredura. Com a chave, a função só consulta o hash (`/files/{hash}`) e não envia o arquivo; um arquivo desconhecido passa. A tela é `components/admin/security/SecureUploadManager.tsx`.
- O que falta: configurar a credencial e tratar arquivo desconhecido (enviar para análise ou colocar em quarentena).
- Impacto no negócio: arquivos de arte de clientes entram sem checagem de malware.
- Esforço: P
- Prioridade: P2

### Conexões

### ADM-24 — Aba Bitrix24 depende de decisão de escopo
- Status: BLOQUEADA_EXTERNA (decisão de negócio)
- Origem: `docs/SCOPE_ALIGNMENT.md` §2 ("Bitrix24 não será replicada"); `docs/execucao/decisoes_pendentes.md` item 1.
- Evidência no código: `src/components/admin/connections/Bitrix24Tab.tsx` (`BITRIX24_WEBHOOK_URL`) está montada em `AdminConexoesPage.tsx:7`; a função `bitrix-sync` existe.
- O que falta: decidir manter ou remover; se mantiver, a sincronização com tabelas próprias.
- Impacto no negócio: a tela sugere uma integração que o escopo diz não existir.
- Esforço: P
- Prioridade: P3

### ADM-25 — n8n: credenciais de API configuráveis, sem consumidor
- Status: PARCIAL
- Origem: `src/components/admin/connections/N8nTab.tsx:68-92`.
- Evidência no código: `N8N_BASE_URL` e `N8N_API_KEY` só aparecem em `secrets-manager` e `_shared/connection-test-runner.ts` (teste de conexão). Nenhuma função chama a API do n8n; a integração real é só por webhook (`webhook-dispatcher`).
- O que falta: definir o uso da API (disparo de workflows ou status) ou remover os campos.
- Impacto no negócio: baixo; a credencial é guardada e testada à toa.
- Esforço: M
- Prioridade: P3

### CMS e Marketing

### ADM-26 — CMS: abas SEO, Visual e Seções sem efeito no site
- Status: ORFA
- Origem: abas `src/pages/admin/AdminCMSPage.tsx:39-42`; flag `feature_cms_blog`.
- Evidência no código: SEO global (`:248-262`: keywords, og_image, `google_analytics_id`) e Identidade visual (`:358-372`, com toast "Recarregue para aplicar") gravam em `cms_config`, que nenhum arquivo lê. `cms_sections` é buscado por `src/hooks/useCMS.ts:45-55`, mas só `banners` é renderizado (`components/cms/BannerCarousel.tsx:12`). Não existe blog nem páginas institucionais.
- O que falta: aplicar `seo_global` e `visual_identity` no app (meta tags, GA, tema) e renderizar as seções.
- Impacto no negócio: o marketing edita SEO, cores e seções e nada aparece; o Google Analytics configurado não é carregado.
- Esforço: M
- Prioridade: P2

### Notificações e configurações

### ADM-27 — Preferências de notificação (canais, Não Perturbe, resumo) não são aplicadas
- Status: ORFA
- Origem: `src/components/settings/NotificationPreferences.tsx:29-54` (E-mail, App, "WhatsApp (Beta)", DND, "Agrupar Notificações" diário às 08:00); `docs/NOTIFICATION_SYSTEM.md`.
- Evidência no código:
  - A única função que lê `notification_preferences` é `supabase/functions/send-notification/index.ts:51-99`, e **nada a chama** (grep em `src/`, `supabase/functions` e migrations; só o manifesto `_shared/edge-authz-manifest.ts:105`). As notificações reais são inseridas direto em `workspace_notifications`.
  - Mesmo nessa função, `sendImmediate` (`:107-131`) só grava no app (canal 'push'); `email_enabled` e `whatsapp_enabled` são ignorados.
  - DND grava em `scheduled_notifications` e o resumo em `notification_digests`, e nenhum job os despacha (só `send-notification` toca essas tabelas). `send-digest/index.ts:28-60` apenas conta notificações não lidas.
  - Não há envio de WhatsApp em nenhuma função.
- O que falta: rotear todas as notificações por um serviço único que respeite as preferências; despachantes agendados para DND e resumo; envio de e-mail; provedor de WhatsApp (este depende de credencial externa).
- Impacto no negócio: o usuário escolhe "e-mail", "WhatsApp" ou "resumo diário" e continua recebendo só no sino do portal; nenhum e-mail ou WhatsApp sai.
- Esforço: G
- Prioridade: P1

### ADM-28 — Painel "Omnichannel": métrica fixa e filas que nunca andam
- Status: STUB/MOCK
- Origem: aba "Painel Omnichannel" em `NotificationPreferences.tsx:95-103`.
- Evidência no código: `src/components/settings/NotificationOmnichannelPanel.tsx:20` traz `{ title: "Taxa de Sucesso", value: "99.4%" }` literal. As filas exibidas (`scheduled_notifications` e `notification_digests`, via `hooks/useNotificationOmnichannel.ts`) nunca são processadas (ver ADM-27). O painel é visível a qualquer usuário na página de notificações.
- O que falta: calcular a taxa a partir de `notification_logs` e restringir a tela a admin/dev.
- Impacto no negócio: indicador de saúde inventado.
- Esforço: P
- Prioridade: P3

### Dev tools, telemetria e IA (administração)

### ADM-29 — Fila de otimização "executa" sem otimizar nada
- Status: STUB/MOCK
- Origem: card de fila em `/admin/telemetria`.
- Evidência no código: `src/pages/admin/telemetry/useOptimizationQueue.ts:113` diz "Executa um item: simula trabalho leve + checa guardrail". Em `:128-150`, a execução espera 1,5 s e marca `done` via `complete_optimization` sem nenhuma ação real.
- O que falta: implementar as ações (índices, refresh de views, cache) ou rotular como checklist manual.
- Impacto no negócio: o painel marca otimizações como "feitas" sem que nada tenha sido feito.
- Esforço: M
- Prioridade: P3

### ADM-30 — Consumo e cota de IA não cobre todas as funções
- Status: PARCIAL
- Origem: `/admin/consumo-ia` (`AdminAiUsagePage`, `ai-usage/AiQuotaManager.tsx`, tabelas `ai_usage_logs` e `ai_usage_quotas`).
- Evidência no código: `supabase/functions/_shared/ai-usage.ts` (`acquireAiQuota`, `logAiUsage`) é usado por expert-chat, generate-mockup, generate-ad-image, generate-ad-prompt, magic-up-score, visual-search, semantic-search, voice-agent, analyze-logo-colors, generate-product-seo e ai-recommendations. **Não** o usam `bi-copilot`, `trends-insights`, `comparison-ai-advisor`, `kit-ai-builder` e `kit-identity-suggest` (chamam `LOVABLE_API_KEY` direto). `market-intelligence-insights` grava em outra tabela (`ai_usage_events`). As funções ElevenLabs não registram consumo.
- O que falta: passar todas as chamadas de IA e voz pelo wrapper de cota e registro.
- Impacto no negócio: o gasto de IA aparece menor do que é, e a cota por papel pode ser contornada.
- Esforço: M
- Prioridade: P2

### ADM-31 — "Workflows IA": canvas só em memória
- Status: STUB/MOCK
- Origem: menu `SidebarReorganized.tsx:244`; `src/pages/admin/AdminWorkflowsPage.tsx` ("orquestração multiagente").
- Evidência no código: `src/components/workflows/WorkflowCanvas.tsx:39-46` guarda o workflow num `useState` com id aleatório. Não há persistência, execução nem edge function. "Ativar/Pausar" (`:143`) só troca o badge.
- O que falta: modelo de dados, motor de execução e integração com IA ou n8n, ou retirar do menu.
- Impacto no negócio: o recurso anunciado no menu não faz nada e perde o trabalho ao recarregar.
- Esforço: G
- Prioridade: P3

### ADM-32 — "Qualidade do catálogo" com percentuais inventados (e órfão)
- Status: STUB/MOCK
- Origem: `src/components/admin/CatalogQualityDashboard.tsx:1-6` ("Enterprise grade panel").
- Evidência no código: `:65-77` diz "For now we simulate with heuristic or placeholders": `missingImages = catalogSize * 0.02`, `missingCategories = catalogSize * 0.01`, `duplicatedSkus: 0`. Nenhum arquivo importa o componente.
- O que falta: contagens reais via RPC no catálogo e um lugar no menu.
- Impacto no negócio: o gestor não sabe quantos produtos estão sem foto ou categoria.
- Esforço: M
- Prioridade: P3

### ADM-33 — Componentes legados ou duplicados órfãos
- Status: ORFA
- Origem: substituições sem limpeza.
- Evidência no código: `components/admin/DiscountApprovalQueue.tsx` (substituído por `DiscountManagementPanel`), `SellerDiscountLimitsPanel.tsx` (pela página `/admin/limites-desconto`), `connections/ConnectionErrorDetailsDialog.tsx` (por `ErrorDetailsDialog`), `components/admin/ProductPersonalizationManager.tsx` (versão antiga de `personalization-manager/`), `products/CategorySelect.tsx`, `components/dashboard/DraggableDashboard.tsx` + `index.ts` (substituídos pelo DnD inline de `pages/CustomizableDashboard.tsx`), `components/inventory/StockBadge.tsx` e `StockCategoryTreeSelect.tsx`, `components/expert/ExpertChatButton.tsx` (substituído por `quote/QuickQuoteFAB.tsx:78-80`), barrels `product-registration/index.ts` e `products/kit-components/index.ts`. `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` ainda cita vários deles como ativos.
- O que falta: remover ou religar e atualizar os docs.
- Impacto no negócio: código morto aumenta custo de manutenção e confunde auditorias.
- Esforço: P
- Prioridade: P3

### BI (`/ferramentas/bi`) — origem dos números (tarefa 4)

| Painel | Fonte real | Fallback | Avisa "simulado"? |
|---|---|---|---|
| Overview 360 (LTV, ticket, pedidos) | `orders` via `useClientOrdersHistory` | `MOCK_CLIENT_STATS` (`lib/bi/mockData.ts:22-42`) | Sim (`ClientOverview360.tsx:49`, "em breve dados reais") |
| Top categorias do cliente (`useClientBI`) | **nenhuma** | sempre mock (`useClientBI.ts:124-125`) | Não |
| Health Score / Churn / Briefing / Lookalikes / Timeline / Comparador | derivados de `useClientBI` | herdam mock | **Não** |
| Afinidade (produtos e categorias) | RPC `get_client_top_products` (baseada em `quote_items`) | mock determinístico; erro de RPC também vira mock (`useClientCategoryAffinity.ts:193`) | Sim, só nos cards de afinidade e radar |
| Tendência do setor | CRM `companies` (crm-db-bridge) + RPC `get_industry_top_products` | `getMockIndustryTrends` | Sim |
| Cliente × setor | RPC `get_industry_benchmark_stats` | mock | Parcial |
| Sazonalidade | RPCs `get_client_seasonality` / `get_industry_seasonality` | mock se menos de 3 meses | Sim, no heatmap |
| Bundles | RPC `get_bundle_suggestions` | — | — |
| Recomendações empíricas | **constante** `INDUSTRY_RECOMMENDATIONS` | — | Não |
| Copilot | edge `bi-copilot` com o contexto acima (inclusive mock) | — | Não |
| Exportação | PPTX (`ExecutiveSummaryButton` + `lib/bi/pptxGenerator.ts`) existe; PDF órfão (ADM-36); link público não é gerado (ADM-37) | | |

### ADM-34 — BI 360 apresenta números fictícios como reais
- Status: STUB/MOCK
- Origem: `src/hooks/bi/useClientBI.ts:3` ("se vazio, retorna mock").
- Evidência no código: `useClientBI.ts:52-82` devolve `MOCK_CLIENT_STATS` (LTV R$ 48.750, 15 pedidos, última compra há 22 dias, deltas +25%) quando `ordersCount === 0`. `:124-125` usa sempre categorias mock ("Categorias reais ainda não temos"). Health Score (`useClientHealthScore.ts:226`), churn (`useChurnRisk.ts:56`), Briefing (`BIBriefingMode.tsx:53`), Lookalikes (`ClientLookalikes.tsx:109`) e Copilot (`BIAiCopilot.tsx:65-66` monta o contexto e `:52-55` envia esse contexto para `bi-copilot`) não verificam `isMock`. Falhas de RPC também caem em mock silenciosamente (`useClientCategoryAffinity.ts:193`; `useIndustryTrends.ts:85-118`).
- O que falta: estado vazio honesto ("cliente sem histórico"), propagar `isMock` a todos os painéis e ao Copilot, separar "erro" de "sem dados" e calcular categorias reais (order_items + categoria).
- Impacto no negócio: o vendedor vê saúde, risco de churn e pitch de IA inventados para um cliente novo e pode agir com base neles.
- Esforço: M
- Prioridade: P0

### ADM-35 — Notificação de "pico sazonal" disparada por dado simulado
- Status: STUB/MOCK
- Origem: `src/hooks/bi/useSeasonalPeakNotifications.ts:1-10` ("notificação proativa").
- Evidência no código: `src/pages/BusinessIntelligencePage.tsx:367-373` passa `seasonality.daysToNextPeak` sem checar `isMock`. Com menos de 3 meses de dados, `useClientSeasonality.ts:190-196` usa `getMockSeasonality()`. O hook insere em `workspace_notifications` (`:26`). Também não há cron: só dispara quando alguém abre o BI daquele cliente.
- O que falta: não notificar quando `isMock` e mover a regra para um job agendado.
- Impacto no negócio: a equipe recebe alertas de "momento ideal para orçamento" baseados em sazonalidade inventada.
- Esforço: P
- Prioridade: P1

### ADM-36 — Exportar dossiê do cliente em PDF desligado
- Status: ORFA
- Origem: `src/components/bi/ExecutiveSummaryButton.tsx:3` ("export PPTX ao lado do PDF dossiê").
- Evidência no código: `src/components/bi/ExportDossierButton.tsx` → `hooks/bi/useBIDossierExport.ts` → `lib/bi/dossierPdfGenerator.ts` (519 linhas), cadeia inteira sem importador.
- O que falta: montar o botão no cabeçalho do BI.
- Impacto no negócio: o vendedor não tem o dossiê em PDF para levar ao cliente; só o PPTX.
- Esforço: P
- Prioridade: P2

### ADM-37 — Compartilhamento público do dossiê: link nunca é gerado
- Status: PARCIAL
- Origem: `supabase/functions/bi-share-dossier/index.ts:3-9` (POST gera token, GET valida); rota pública `/dossie/:token` (`public.ts:63-66`).
- Evidência no código: só a leitura existe (`src/pages/PublicDossierPage.tsx:42`, GET). Nenhum código faz POST para `bi-share-dossier`. `BI_SHARE_SECRET` consta como "**preencher**" em `docs/secrets.md`.
- O que falta: botão "Compartilhar dossiê" no BI e o segredo configurado.
- Impacto no negócio: a página pública de dossiê existe, mas ninguém consegue criar o link.
- Esforço: P
- Prioridade: P2

### ADM-38 — "Criar orçamento com sugestões" perde cliente e itens
- Status: PARCIAL
- Origem: `src/components/bi/ConfirmQuoteSuggestionsModal.tsx` (aberto por `ClientHealthHero.tsx:32`).
- Evidência no código: `:83-93` navega para `/orcamentos/novo?clientId=…&productIds=…&source=bi-suggestions`. Nenhum arquivo lê `productIds` ou `clientId` da URL no builder (só `BusinessIntelligencePage.tsx:422` e `KitBuilderPage.tsx:145-147` leem parâmetros). As sugestões vindas de `INDUSTRY_RECOMMENDATIONS` não têm `productId`.
- O que falta: prefill do Quote Builder por query string e mapear as sugestões para produtos reais do catálogo.
- Impacto no negócio: o atalho "do insight ao orçamento" abre um orçamento em branco.
- Esforço: P
- Prioridade: P1

### ADM-39 — Recomendações por ramo de atividade: curadoria fixa, editor não feito
- Status: NAO_INICIADA
- Origem: `src/lib/bi/industryRecommendations.ts:3` ("Curadoria de especialista (mockada). No futuro, editável por admin.").
- Evidência no código: `INDUSTRY_RECOMMENDATIONS` é constante, com produtos sem ID (`:12-19`). Não existe tabela nem tela admin.
- O que falta: tabela de recomendações por ramo e CRUD no admin.
- Impacto no negócio: o comercial não ajusta as sugestões por setor sem deploy.
- Esforço: M
- Prioridade: P3

### ADM-40 — Tendência setorial sempre "estável" e categoria adivinhada pelo nome
- Status: PARCIAL
- Origem: tipo `trend: "up"|"stable"|"down"` em `useIndustryTrends.ts:32`.
- Evidência no código: `useIndustryTrends.ts:107` fixa `trend: "stable" as const` nos dados reais; `:103` usa `category: deriveCategory(p.product_name)`.
- O que falta: comparar janelas (90 dias atuais × 90 anteriores) e usar a categoria real do produto.
- Impacto no negócio: o setor nunca mostra produto "em alta" ou "em queda" com dado real.
- Esforço: P
- Prioridade: P3

### ADM-41 — "Alertas inteligentes" com lista fixa (e órfão)
- Status: STUB/MOCK
- Origem: `src/hooks/bi/useSmartAlerts.ts:7-8` ("In a real app, this would analyze order delays, stock levels, etc.").
- Evidência no código: devolve 3 alertas literais ("3 pedidos em produção há mais de 5 dias", "Meta… 85%"). Só é reexportado em `src/hooks/index.ts:12` e nunca consumido.
- O que falta: regras reais (atraso de pedido, estoque, meta) e um lugar de exibição.
- Impacto no negócio: o alerta proativo de operação planejado não existe.
- Esforço: M
- Prioridade: P3

### ADM-42 — BI depende do CRM externo sem credencial e não tem a rota anunciada
- Status: BLOQUEADA_EXTERNA
- Origem: README §6 "Dashboard BI (`/bi`)… Exportação de relatórios"; `docs/secrets.md` (`CRM_SUPABASE_URL/ANON/SERVICE_KEY` "**preencher**").
- Evidência no código: a seleção de cliente, a ficha e as empresas do mesmo ramo vêm de `selectCrm('companies')` (`src/hooks/useCrmCompanies.ts:30-63`; `useIndustryTrends.ts:76-80`). Sem CRM, só o "Cliente Demo" (`lib/bi/demoClient.ts`) funciona. `/bi` não existe (ver ADM-15).
- O que falta: credenciais do CRM, ou migrar clientes para a tabela `clients` nativa, como prevê `SCOPE_ALIGNMENT.md` §3.
- Impacto no negócio: sem CRM conectado, o BI não lista clientes reais.
- Esforço: P (credencial) / G (migração)
- Prioridade: P1

### Inteligência Comercial (`/inteligencia-comercial`) e Tendências (`/tendencias`)

Fontes: a Inteligência Comercial usa dados reais do banco do portal (`quotes`, `orders`, `order_items`, `quote_items` em `src/hooks/useCommercialIntelligence.ts`) e o histórico de estoque do catálogo externo (`stock_daily_summary` via bridge, `useMarketIntelligenceMacro.ts:158`). Os insights de IA vêm de `market-intelligence-insights` e `trends-insights`, que tratam 402/429. As Tendências usam `search_analytics` e `product_views`, mas abrem em modo demo.

### ADM-43 — Tendências abre em modo demo para todos
- Status: STUB/MOCK
- Origem: `src/pages/trends/is-demo-mode.ts:1-12` ("Demo ligado por padrão (avaliação de viabilidade do módulo). Para desligar: `/tendencias?demo=0`").
- Evidência no código: `isDemoMode()` é `true` salvo `?demo=0`. Com isso, `ConversionFunnel.tsx:67`, `HotSearchesCard.tsx:35`, `TopCategoriesCard.tsx:48`, `TrendsHeatmap.tsx:26`, `TrendsInsightsCard.tsx:33` e `UnmetDemandCard.tsx:33` usam `pages/trends/trends-mock.ts`, e `TrendsPage.tsx:228` desliga as queries reais. A página mostra `DemoBadge` (`:577`). O menu "Insights › Tendências" (`SidebarReorganized.tsx:178`) não passa `demo=0`.
- O que falta: decidir o fim da avaliação e inverter o padrão (demo só por opt-in).
- Impacto no negócio: buscas em alta, funil e demanda não atendida exibidos ao time são fictícios.
- Esforço: P
- Prioridade: P1

### ADM-44 — Gráfico "Inteligência de Mercado" gera dados aleatórios sem histórico
- Status: STUB/MOCK
- Origem: `src/components/intelligence/MarketIntelligenceChart.tsx:5` ("Inclui mock data quando não há dados reais").
- Evidência no código: `:70-110` (`generateMockMarketData`) usa `Math.random()` e fornecedores fictícios ("Brasil Brindes", "Master Promo"). `:136-139` usa o mock sempre que `stock_daily_summary` vem vazio. O badge "dados ilustrativos" aparece (`:176`).
- O que falta: estado vazio em vez de série aleatória, que muda a cada render de período.
- Impacto no negócio: KPIs de demanda ("Mercado Aquecido 🚀") podem ser pura aleatoriedade.
- Esforço: P
- Prioridade: P2

### ADM-45 — Segmentação, Top clientes, Oportunidades e Tendência de receita não ligados
- Status: ORFA
- Origem: hooks de `src/hooks/useCommercialIntelligence.ts:305` (`useSegmentAnalysis`), `:335` (`useOpportunities`), `:377` (`useRevenueTrend`) e `:399` (`useTopClients`).
- Evidência no código: `components/intelligence/SegmentAnalysis.tsx` e `TopClients.tsx` não têm importador. `useOpportunities` e `useRevenueTrend` não têm nenhum consumidor. `CommercialIntelligencePage` só monta KPIs, vendas, ranking de categoria/fornecedor/produto e o gráfico macro.
- O que falta: incluir os blocos na página.
- Impacto no negócio: perde-se "quais produtos têm muito orçamento e pouco pedido" (oportunidade) e "quem são os maiores clientes".
- Esforço: P
- Prioridade: P2

### ADM-46 — Exportação de relatórios da Inteligência Comercial não existe
- Status: NAO_INICIADA
- Origem: README §6 "Exportação de relatórios"; `docs/05_ROADMAP_PROXIMOS_PASSOS.md` §3.4 "Export para Excel ✅".
- Evidência no código: não há `export`, `xlsx` nem `jspdf` em `pages/CommercialIntelligencePage.tsx` nem em `components/intelligence/*`. Existem só o CSV de Tendências (`TrendsPage.tsx:673`), o CSV de Estoque (`StockDashboard.tsx:234`) e o PPTX do BI. Os filtros por categoria ou fornecedor truncam em 200 produtos (`useCommercialIntelligence.ts:53,191,280,314,343` `.slice(0, 200)`).
- O que falta: exportação CSV/XLSX/PDF dos rankings e KPIs; filtro sem truncamento (RPC agregada).
- Impacto no negócio: o gestor não consegue levar os números para reunião; com categorias grandes os totais saem incompletos.
- Esforço: M
- Prioridade: P2

### Estoque e reposição

### ADM-47 — Detalhe de risco do produto usa dados gerados sem histórico
- Status: STUB/MOCK
- Origem: `src/components/inventory/risk/ProductRiskDetail.tsx` (painel de risco de fornecedor em `/estoque`).
- Evidência no código: `:185-193`: `isDemo = !hasData && !hasError`, e então `generateMockVelocity`, `generateMockIntelligence` e `generateMockStockData` (`src/lib/stock-chart-utils.ts:64-208`) alimentam KPIs ("Dias até acabar", "Saída/dia", classe ABC, flags) com badge "demo".
- O que falta: estado vazio em vez de projeção sintética.
- Impacto no negócio: "dias até acabar" e "Classe A" podem ser inventados.
- Esforço: P
- Prioridade: P2

### ADM-48 — Reposições limitadas a 200 registros e progresso fictício
- Status: PARCIAL
- Origem: `/reposicao` (`ReplenishmentsPage`).
- Evidência no código: `src/components/replenishments/ReplenishmentProductGrid.tsx:62` e `RecentReplenishmentsWidget.tsx:79` usam `useReplenishmentsWithDetails({ limit: 200 })`, sem paginação. `ReplenishmentProductGrid.tsx:27-49` usa uma barra de progresso com `Math.random()`.
- O que falta: paginação ou infinite scroll no servidor; progresso real ou indeterminado.
- Impacto no negócio: reposições além das 200 primeiras não aparecem.
- Esforço: P
- Prioridade: P3

### Mockup (gerador com IA)

IA: `useMockupGenerator.ts` → `hooks/mockup/mockupGenerationService.ts:240` → `generate-mockup` (existe; usa `LOVABLE_API_KEY`, cota via `_shared/ai-usage.ts` e prompts de `mockup_prompt_configs` editáveis em `/admin/prompts-ia`). Análise de cores do logo → `analyze-logo-colors` (existe).

### ADM-49 — Templates de mockup (salvar e reaplicar configuração)
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §2.5 (Template Selector, Template Preview, Save Template Dialog; tabela `mockup_templates`).
- Evidência no código: `components/mockup/SaveTemplateDialog.tsx`, `TemplateSelector.tsx` e `TemplatePreview.tsx` não têm importador. A tabela `mockup_templates` existe em `types.ts:4680`, mas nenhum `.from('mockup_templates')`.
- O que falta: persistência e montagem no `MockupGenerator`.
- Impacto no negócio: o vendedor refaz posição e tamanho do logo a cada produto ou cliente recorrente.
- Esforço: M
- Prioridade: P2

### ADM-50 — Anexo de arquivo de arte vetorial ao mockup
- Status: ORFA
- Origem: `src/components/mockup/ArtFileUpload.tsx:1-4` (AI, EPS, PDF, SVG, CDR no bucket `mockup-art-files`); tabela `art_file_attachments`.
- Evidência no código: sem importador. O bucket existe (`supabase/migrations/20260416195918_…sql:89-98`) e só é usado pela captura de layout de aprovação.
- O que falta: montar no fluxo de mockup e de aprovação.
- Impacto no negócio: a arte final do cliente segue por fora do sistema (e-mail/WhatsApp), sem rastreio.
- Esforço: P
- Prioridade: P2

### ADM-51 — Erros de crédito/limite de IA não traduzidos (Mockup e Magic Up); lote engole falhas
- Status: PARCIAL
- Origem: as edge functions devolvem 402/429 (`generate-mockup/index.ts:233-243`, `generate-ad-image/index.ts:222-231`).
- Evidência no código: `mockupGenerationService.ts:219-229` relança o erro genérico do `supabase-js` ("non-2xx") sem ler o corpo nem o status. `:253-257` só faz `console.error` quando uma área falha no lote. `useMagicUpGeneration.ts:204` faz `if (error) throw error` e `:259` mostra a mensagem crua. Já `MarketIntelligenceInsightsCard.tsx:46-47`, `TrendsInsightsCard.tsx:43-46` e `hooks/voice/retry.ts:47-48` tratam o caso corretamente.
- O que falta: utilitário comum que mapeie 402/429 para "créditos esgotados" ou "aguarde" e liste as áreas que falharam no lote.
- Impacto no negócio: quando acaba o crédito, o vendedor vê "erro" genérico e tenta de novo, sem entender a causa.
- Esforço: P
- Prioridade: P2

### ADM-52 — Motor alternativo de mockup (NanoBanana) não publicável
- Status: BLOQUEADA_EXTERNA (decisão registrada)
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §2.5; `docs/EDGE_FUNCTIONS.md:35`.
- Evidência no código: `supabase/functions/generate-mockup-nanobanana/` existe, mas nenhum arquivo de `src/` a chama. `docs/execucao/fechamento-tecnico-2026-10-08.md` lista a função entre as "não publicáveis por decisão registrada".
- O que falta: decisão de produto e credencial.
- Impacto no negócio: não há segundo motor de imagem para redundância ou qualidade.
- Esforço: P
- Prioridade: P3

### Magic Up

IA: `useMagicUpGeneration.ts` → `generate-ad-image` + `magic-up-score` (com fallback heurístico, `:226-241`); `PromptGenerator.tsx:96` → `generate-ad-prompt`. As três funções existem e usam cota.

### ADM-53 — Colaboração no Magic Up (comentários, link público, reações)
- Status: NAO_INICIADA
- Origem: `docs/execucao/decisoes_pendentes.md` item 9; `docs/execucao/evidencias/etapa24_magic_up_20260917.md`.
- Evidência no código: as tabelas `magic_up_comments`, `magic_up_public_shares` e `magic_up_reactions` não têm nenhuma referência em `src/`. O "Share" de `AdImageResult.tsx` é só WhatsApp.
- O que falta: decidir construir ou remover; se construir, UI de comentários, link público rastreável e reações.
- Impacto no negócio: a aprovação de criativos com o cliente ou o marketing acontece fora do portal.
- Esforço: G
- Prioridade: P3

### Flow (expert IA) e voz

IA e voz: Flow em `components/expert/chat/useExpertChat.ts:200` → `expert-chat` (SSE, existe, trata 402/429 no servidor); entrada pelo `QuickQuoteFAB` (`MainLayout.tsx:42`) e atalho/voz via `stores/oracleVoiceBridge`. Agente de voz em `hooks/useVoiceAgent.ts`: STT com ElevenLabs Scribe (`hooks/voice/scribeTokenCache.ts:44` → `elevenlabs-scribe-token`) e fallback Web Speech (`hooks/voice/webSpeechFallback.ts`); intenção via `processTranscript.ts:17` → `voice-agent`; TTS via `playTtsAudio.ts` → `elevenlabs-tts`; mensagens 402/429 traduzidas em `hooks/voice/retry.ts:47-48`. Busca visual: `search/VisualSearchButton.tsx:63` → `visual-search` (existe, erro genérico). Todas as funções existem.

### ADM-54 — Credenciais de IA e voz pendentes (Lovable AI Gateway e ElevenLabs)
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md` (`LOVABLE_API_KEY`: "integração Lovable — **preencher**"; `ELEVENLABS_API_KEY`: "**preencher**").
- Evidência no código: as funções de IA abortam sem a chave (`generate-mockup/index.ts:45-47`, `generate-ad-image/index.ts:60-62`, `expert-chat/index.ts:583-584`, `voice-agent/index.ts:38-40`), assim como `elevenlabs-tts` e `elevenlabs-scribe-token`. O README indica deploy no Lovable Cloud; fora dele, o gateway `LOVABLE_API_KEY` precisa de alternativa.
- O que falta: confirmar a configuração no projeto canônico ou trocar de provedor. Não foi possível verificar o ambiente remoto (401).
- Impacto no negócio: sem as chaves, Flow, mockup, Magic Up, busca visual, Copilot e agente de voz param juntos.
- Esforço: P (configurar) / G (trocar provedor)
- Prioridade: P1

### ADM-55 — TTS sem fallback e com mensagem de erro enganosa
- Status: PARCIAL
- Origem: README §4 "TTS (Text-to-Speech)".
- Evidência no código: `src/components/expert/chat/useExpertChatTts.ts:27-32`: qualquer falha de `elevenlabs-tts` (chave ausente, crédito, 5xx) vira "O navegador bloqueou a reprodução". Não há fallback para `speechSynthesis`, enquanto o STT tem fallback Web Speech.
- O que falta: diferenciar erro de servidor de autoplay bloqueado e cair para síntese do navegador.
- Impacto no negócio: sem crédito ElevenLabs, o "ouvir resposta" do Flow some e a mensagem culpa o navegador.
- Esforço: P
- Prioridade: P3

### ADM-56 — Entrada por voz do Flow: indicador não acionado e STT diferente do agente
- Status: PARCIAL
- Origem: estado `isFromVoice` em `useExpertChat.ts:296` (usado em `ChatMessageList.tsx:15,134`).
- Evidência no código: `src/components/expert/ExpertChatDialog.tsx:102` passa `setIsFromVoice={() => {}}`, um handler vazio. O microfone do Flow (`chat/ChatInputBar.tsx:23-45`) usa Web Speech direto, sem Scribe nem tratamento de permissão negada.
- O que falta: ligar o setter real e unificar o STT com o agente de voz.
- Impacto no negócio: a interface não indica que a pergunta veio por voz, e a qualidade de transcrição é inferior à do agente.
- Esforço: P
- Prioridade: P3

### Dashboard pessoal

### ADM-57 — Dashboard pessoal (`/dashboard`) sem entrada na navegação
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` §8.1 "Dashboard Customizável"; `route-matrix.ts:59` ("Dashboard pessoal").
- Evidência no código: rota em `App.tsx:102` (`CustomizableDashboard` com os widgets de `components/dashboard/*`). Nenhum link, item de menu ou atalho aponta para `/dashboard` (grep só encontra uso em layout e skeleton). `QuickActionsPanel`, `MyClientsWidget`, `UpcomingDatesWidget` etc. só aparecem ali.
- O que falta: item de menu ou home do vendedor.
- Impacto no negócio: o painel com orçamentos recentes, pedidos pendentes, clientes e datas comemorativas existe, mas ninguém chega até ele.
- Esforço: P
- Prioridade: P2

> Nota de escopo: `GeoBlockingManager` e `IPRestrictionManager` (abas de `SecurityDashboardSections.tsx:687-690`) estão implementados com tabelas reais, embora `docs/SCOPE_ALIGNMENT.md` §2 os declare fora de escopo. Não entraram como "não executados", mas convém decidir se permanecem.

---

## Apêndice: lista bruta de componentes, hooks e páginas órfãos

Gerado por script de grafo de imports (barrels resolvidos; "transitiva" = só importado por outros órfãos ou inalcançável a partir de `src/main.tsx`). 154 arquivos, cerca de 27,5 mil linhas.

| Arquivo | Exports (até 4) | Tipo | Linhas |
|---|---|---|---:|
| `src/components/admin/CatalogQualityDashboard.tsx` | CatalogQualityDashboard | direta | 259 |
| `src/components/admin/connections/ConnectionErrorDetailsDialog.tsx` | ConnectionErrorDetailsDialog | direta | 263 |
| `src/components/admin/DiscountApprovalQueue.tsx` | DiscountApprovalQueue | direta | 180 |
| `src/components/admin/GoalTracker.tsx` | GoalTracker | transitiva | 78 |
| `src/components/admin/group-personalization/GroupComponentCard.tsx` | GroupComponentCard | transitiva | 200 |
| `src/components/admin/group-personalization/GroupLocationCard.tsx` | GroupLocationCard | transitiva | 210 |
| `src/components/admin/GroupPersonalizationManager.tsx` | GroupPersonalizationManager | transitiva | 184 |
| `src/components/admin/hooks/useGroupPersonalization.ts` | UpdateData, ProductGroup, GroupComponent, GroupLocation | transitiva | 274 |
| `src/components/admin/ImageUploadButton.tsx` | ImageUploadButton | transitiva | 175 |
| `src/components/admin/InlineEditField.tsx` | InlineEditField | transitiva | 74 |
| `src/components/admin/OrdersHeatmap.tsx` | OrdersHeatmap | transitiva | 57 |
| `src/components/admin/personalization-manager/ComponentAccordionItem.tsx` | ComponentAccordionItem | transitiva | 200 |
| `src/components/admin/personalization-manager/GroupInheritanceSection.tsx` | GroupInheritanceSection | transitiva | 57 |
| `src/components/admin/personalization-manager/index.ts` | (barrel/re-export) | transitiva | 2 |
| `src/components/admin/personalization-manager/ProductPersonalizationManager.tsx` | ProductPersonalizationManager | transitiva | 163 |
| `src/components/admin/personalization-manager/ProductSelector.tsx` | ProductSelector | transitiva | 105 |
| `src/components/admin/personalization-manager/types.ts` | Product, ProductGroup, ProductGroupMember, Component | transitiva | 59 |
| `src/components/admin/personalization-manager/usePersonalizationManager.ts` | usePersonalizationManager | transitiva | 319 |
| `src/components/admin/personalization/GroupInheritance.tsx` | GroupInheritance | transitiva | 38 |
| `src/components/admin/personalization/ProductSelector.tsx` | ProductSelector | transitiva | 95 |
| `src/components/admin/personalization/usePersonalizationData.ts` | Product, ProductGroup, ProductGroupMember, Component | transitiva | 318 |
| `src/components/admin/product-groups/GroupAccordionItem.tsx` | GroupAccordionItem | transitiva | 63 |
| `src/components/admin/product-groups/GroupFormDialog.tsx` | GroupFormDialog | transitiva | 52 |
| `src/components/admin/product-groups/useProductGroups.ts` | ProductGroup, SimpleProduct, ProductGroupMember, useProductGroups | transitiva | 63 |
| `src/components/admin/ProductGroupsManager.tsx` | ProductGroupsManager | transitiva | 60 |
| `src/components/admin/ProductPersonalizationManager.tsx` | ProductPersonalizationManager | direta | 297 |
| `src/components/admin/products/bulk-import/StepComplete.tsx` | StepImporting, StepComplete | transitiva | 111 |
| `src/components/admin/products/bulk-import/StepMapping.tsx` | StepMapping | transitiva | 69 |
| `src/components/admin/products/bulk-import/StepPreview.tsx` | StepPreview | transitiva | 108 |
| `src/components/admin/products/bulk-import/StepUpload.tsx` | StepUpload | transitiva | 150 |
| `src/components/admin/products/bulk-import/types.ts` | Step, SpreadsheetCell, SpreadsheetRow, TargetFieldKey | transitiva | 147 |
| `src/components/admin/products/BulkImportDialog.tsx` | BulkImportDialog | transitiva | 336 |
| `src/components/admin/products/CategoryCascadeSelector.tsx` | CategoryCascadeSelector | transitiva | 393 |
| `src/components/admin/products/CategorySelect.tsx` | CategorySelect | direta | 245 |
| `src/components/admin/products/hooks/useProductFormDraft.ts` | useProductFormDraft | transitiva | 96 |
| `src/components/admin/products/hooks/useSkuValidation.ts` | useSkuValidation | transitiva | 29 |
| `src/components/admin/products/HorizontalStepper.tsx` | StepId, StepDef, HorizontalStepper | transitiva | 202 |
| `src/components/admin/products/image-gallery/ConfirmDeleteDialog.tsx` | ConfirmDeleteDialog | transitiva | 54 |
| `src/components/admin/products/image-gallery/ImageBulkToolbar.tsx` | ImageBulkToolbar | transitiva | 64 |
| `src/components/admin/products/image-gallery/ImageFilterBar.tsx` | ImageFilterBar | transitiva | 66 |
| `src/components/admin/products/image-gallery/ImageGrid.tsx` | ImageGrid | transitiva | 144 |
| `src/components/admin/products/image-gallery/ImageMetaEditor.tsx` | ImageMetaEditor | transitiva | 41 |
| `src/components/admin/products/image-gallery/ImagePreviewDialog.tsx` | ImagePreviewDialog | transitiva | 89 |
| `src/components/admin/products/image-gallery/ImageStatsBar.tsx` | ImageStatsBar | transitiva | 88 |
| `src/components/admin/products/image-gallery/ImageUploadArea.tsx` | ImageUploadArea | transitiva | 138 |
| `src/components/admin/products/image-gallery/index.ts` | (barrel/re-export) | transitiva | 2 |
| `src/components/admin/products/image-gallery/ProductImageGallery.tsx` | ProductImageGallery | transitiva | 91 |
| `src/components/admin/products/image-gallery/types.ts` | ExternalImage, IMAGE_TYPES, FilterMode, VariantInfo | transitiva | 63 |
| `src/components/admin/products/image-gallery/useProductImageGallery.ts` | useProductImageGallery | transitiva | 554 |
| `src/components/admin/products/kit-components/api.ts` | fetchKitComponents, createComponent, updateComponent, deleteComponent | transitiva | 138 |
| `src/components/admin/products/kit-components/ComponentForm.tsx` | ComponentForm | transitiva | 146 |
| `src/components/admin/products/kit-components/ComponentMediaManager.tsx` | ComponentMediaManager | transitiva | 120 |
| `src/components/admin/products/kit-components/index.ts` | (barrel/re-export) | direta | 2 |
| `src/components/admin/products/kit-components/PrintAreaForm.tsx` | PrintAreaForm | transitiva | 62 |
| `src/components/admin/products/kit-components/PrintAreasManager.tsx` | PrintAreasManager | transitiva | 308 |
| `src/components/admin/products/kit-components/ProductKitComponentsSection.tsx` | ProductKitComponentsSection | transitiva | 290 |
| `src/components/admin/products/kit-components/types.ts` | KitComponent, ComponentFormData, PrintArea, PrintAreaFormData | transitiva | 127 |
| `src/components/admin/products/kit-components/VolumeValidation.tsx` | VolumeValidation | transitiva | 109 |
| `src/components/admin/products/MaterialGroupTree.tsx` | MaterialGroupTree | transitiva | 281 |
| `src/components/admin/products/new-supplier/tabs/AddressTab.tsx` | AddressTab | transitiva | 96 |
| `src/components/admin/products/new-supplier/tabs/BasicDataTab.tsx` | BasicDataTab | transitiva | 52 |
| `src/components/admin/products/new-supplier/tabs/ContactsTab.tsx` | ContactsTab | transitiva | 62 |
| `src/components/admin/products/new-supplier/types.ts` | SupplierContact, PixKey, NewSupplierDialogProps, CONTACT_ROLES | transitiva | 54 |
| `src/components/admin/products/new-supplier/useNewSupplierForm.ts` | useNewSupplierForm, NewSupplierFormState | transitiva | 558 |
| `src/components/admin/products/NewCategoryDialog.tsx` | NewCategoryDialog | transitiva | 151 |
| `src/components/admin/products/NewSupplierDialog.tsx` | NewSupplierDialog | transitiva | 414 |
| `src/components/admin/products/ProductFiltersBar.tsx` | ProductFilters, ProductFiltersBar | transitiva | 344 |
| `src/components/admin/products/ProductFormFullscreen.tsx` | ProductFormFullscreen | transitiva | 616 |
| `src/components/admin/products/ProductFormHelpers.tsx` | SectionId, SectionDef, FormSectionProps, SECTIONS | transitiva | 120 |
| `src/components/admin/products/ProductFormSchema.ts` | productFormSchema, ProductFormData, defaultFormValues | transitiva | 223 |
| `src/components/admin/products/ProductFormStepContent.tsx` | ProductFormStepContent | transitiva | 179 |
| `src/components/admin/products/ProductMarketingSection.tsx` | ProductMarketingSection | transitiva | 287 |
| `src/components/admin/products/ProductMaterialsSection.tsx` | ProductMaterialsSection | transitiva | 315 |
| `src/components/admin/products/ProductPreviewPanel.tsx` | ProductPreviewPanel | transitiva | 128 |
| `src/components/admin/products/ProductRamosSection.tsx` | ProductRamosSection | transitiva | 234 |
| `src/components/admin/products/ProductTagsSection.tsx` | ProductTagsSection | transitiva | 217 |
| `src/components/admin/products/ProductVariantsSection.tsx` | ProductVariantsSection | transitiva | 178 |
| `src/components/admin/products/ProductVariationAxesConfig.tsx` | ProductVariationAxesConfig | transitiva | 406 |
| `src/components/admin/products/ProductVideoGallery.tsx` | ProductVideoGallery | transitiva | 122 |
| `src/components/admin/products/sections/engraving/EngravingAreaCard.tsx` | EngravingAreaCard | transitiva | 95 |
| `src/components/admin/products/sections/engraving/types.ts` | ExternalTechnique, PrintAreaTechnique, EnrichedArea, WizardStep | transitiva | 163 |
| `src/components/admin/products/sections/engraving/useEngravingWizard.ts` | useEngravingWizard | transitiva | 254 |
| `src/components/admin/products/sections/ProductClassificationSection.tsx` | ProductClassificationSection, default | transitiva | 193 |
| `src/components/admin/products/sections/ProductDimensionsSection.tsx` | ProductDimensionsSection | transitiva | 89 |
| `src/components/admin/products/sections/ProductEngravingSection.tsx` | ProductEngravingSection, default | transitiva | 294 |
| `src/components/admin/products/sections/ProductFiscalSection.tsx` | ProductFiscalSection | transitiva | 103 |
| `src/components/admin/products/sections/ProductFlagsSection.tsx` | ProductFlagsSection | transitiva | 93 |
| `src/components/admin/products/sections/ProductInfoSection.tsx` | ProductInfoSection | transitiva | 97 |
| `src/components/admin/products/sections/ProductMarketingTextsSection.tsx` | ProductMarketingTextsSection | transitiva | 51 |
| `src/components/admin/products/sections/ProductMediaSection.tsx` | ProductMediaSection, default | transitiva | 46 |
| `src/components/admin/products/sections/ProductPackagingSection.tsx` | ProductPackagingSection | transitiva | 180 |
| `src/components/admin/products/sections/ProductPriceSection.tsx` | ProductPriceSection | transitiva | 51 |
| `src/components/admin/products/sections/ProductSeoSection.tsx` | ProductSeoSection | transitiva | 105 |
| `src/components/admin/products/sections/ProductSupplierSection.tsx` | ProductSupplierSection | transitiva | 387 |
| `src/components/admin/products/SupplierFiscalInfo.tsx` | SupplierFiscalInfo | transitiva | 357 |
| `src/components/admin/products/SupplierSelect.tsx` | SupplierSelect | transitiva | 62 |
| `src/components/admin/products/useProductsManager.ts` | AdminProduct, useProductsManager, PAGE_SIZE_OPTIONS | transitiva | 379 |
| `src/components/admin/products/useProductVariants.ts` | ProductVariant, VariantFormData, EMPTY_FORM, useProductVariants | transitiva | 174 |
| `src/components/admin/products/VariantForm.tsx` | VariantForm | transitiva | 102 |
| `src/components/admin/products/video-gallery/types.ts` | ExternalVideo, VariantLink, VideoVariant, VIDEO_TYPES | transitiva | 113 |
| `src/components/admin/products/video-gallery/useProductVideoGallery.ts` | useProductVideoGallery | transitiva | 459 |
| `src/components/admin/products/video-gallery/VideoGrid.tsx` | VideoGrid | transitiva | 131 |
| `src/components/admin/products/video-gallery/VideoMetaEditor.tsx` | VideoMetaEditor | transitiva | 92 |
| `src/components/admin/products/video-gallery/VideoUploadArea.tsx` | VideoUploadArea | transitiva | 68 |
| `src/components/admin/ProductsManager.tsx` | ProductsManager | transitiva | 258 |
| `src/components/admin/SellerDiscountLimitsPanel.tsx` | SellerDiscountLimitsPanel | direta | 78 |
| `src/components/admin/SortableItem.tsx` | SortableItem | transitiva | 56 |
| `src/components/admin/suppliers-manager/index.ts` | (barrel/re-export) | transitiva | 2 |
| `src/components/admin/suppliers-manager/SupplierFormDialog.tsx` | SupplierFormDialog | transitiva | 439 |
| `src/components/admin/suppliers-manager/SupplierListHeader.tsx` | SupplierListHeader | transitiva | 59 |
| `src/components/admin/suppliers-manager/SuppliersManager.tsx` | SuppliersManager | transitiva | 55 |
| `src/components/admin/suppliers-manager/SupplierTable.tsx` | SupplierTable | transitiva | 67 |
| `src/components/admin/suppliers-manager/types.ts` | SupplierContact, Supplier, PixKey, CONTACT_ROLES | transitiva | 105 |
| `src/components/admin/suppliers-manager/useSuppliersManager.ts` | useSuppliersManager | transitiva | 667 |
| `src/components/admin/techniques-manager/TechniqueFormDialog.tsx` | TechniqueFormDialog | transitiva | 131 |
| `src/components/admin/techniques-manager/TechniqueTable.tsx` | TechniqueTable | transitiva | 111 |
| `src/components/admin/TechniquesManager.tsx` | TechniquesManager | transitiva | 48 |
| `src/components/bi/ExportDossierButton.tsx` | ExportDossierButton | direta | 52 |
| `src/components/dashboard/DraggableDashboard.tsx` | DashboardWidget, WidgetConfig, DraggableDashboardProps, DraggableWidgetProps | transitiva | 369 |
| `src/components/dashboard/index.ts` | (barrel/re-export) | direta | 15 |
| `src/components/expert/ExpertChatButton.tsx` | ExpertChatButton | direta | 86 |
| `src/components/intelligence/SegmentAnalysis.tsx` | SegmentAnalysis | direta | 77 |
| `src/components/intelligence/TopClients.tsx` | TopClients | direta | 82 |
| `src/components/inventory/StockBadge.tsx` | StockStatus, StockBadge, getStockStatus, StockIndicator | direta | 187 |
| `src/components/inventory/StockCategoryTreeSelect.tsx` | StockCategoryTreeSelect | direta | 140 |
| `src/components/mockup/ArtFileUpload.tsx` | ArtFileAttachment, ArtFileUpload | direta | 239 |
| `src/components/mockup/GenerateButton.tsx` | GenerateButton | direta | 84 |
| `src/components/mockup/SaveTemplateDialog.tsx` | SaveTemplateDialog | direta | 78 |
| `src/components/mockup/TemplatePreview.tsx` | TemplatePreview, TemplatePreviewExpanded | transitiva | 194 |
| `src/components/mockup/TemplateSelector.tsx` | ProductTemplate, TemplateSelector | direta | 175 |
| `src/components/product-registration/index.ts` | (barrel/re-export) | direta | 3 |
| `src/components/security/SecuritySettings.tsx` | SecuritySettings | direta | 17 |
| `src/hooks/bi/useBIDossierExport.ts` | useBIDossierExport | transitiva | 117 |
| `src/hooks/bi/useSmartAlerts.ts` | useSmartAlerts | transitiva (só via barrel `src/hooks/index.ts`) | 17 |
| `src/lib/bi/dossierPdfGenerator.ts` | DossierClient, DossierData, generateBIDossierPDF, buildDossierFileName | transitiva | 519 |
| `src/pages/admin/AdminAuditPage.tsx` | AdminAuditPage, default | direta | 338 |
| `src/pages/admin/AdminBusinessDashboardPage.tsx` | AdminBusinessDashboardPage, default | direta | 121 |
| `src/pages/admin/AdminCadastrosPage.tsx` | AdminCadastrosPage, default | direta | 92 |
| `src/pages/admin/AdminCampanhasPage.tsx` | AdminCampanhasPage, default | direta | 399 |
| `src/pages/admin/AdminCentraisPage.tsx` | AdminCentraisPage, default | direta | 268 |
| `src/pages/admin/AdminConexoesStatusPage.tsx` | AdminConexoesStatusPage, default | direta | 345 |
| `src/pages/admin/AdminCooperativasPage.tsx` | AdminCooperativasPage, default | direta | 462 |
| `src/pages/admin/AdminNewsletterPage.tsx` | AdminNewsletterPage, default | direta | 214 |
| `src/pages/admin/AdminPAsPage.tsx` | AdminPAsPage, default | direta | 281 |
| `src/pages/admin/AdminProductFormPage.tsx` | AdminProductFormPage, default | direta | 419 |
| `src/pages/admin/AdminPromoverUsuarioPage.tsx` | AdminPromoverUsuarioPage, default | direta | 265 |
| `src/pages/admin/AdminSingularesPage.tsx` | AdminSingularesPage, default | direta | 342 |
| `src/pages/admin/AuditEnterprisePage.tsx` | AuditEnterprisePage, default | direta | 160 |
| `src/pages/admin/AuditEvidenceDashboard.tsx` | callAiWithFallback, AuditEvidenceDashboard, default | direta | 252 |
| `src/pages/admin/DevChallengeExamplesPage.tsx` | DevChallengeExamplesPage, default | direta | 440 |
| `src/pages/admin/KitTemplatesMetricsPage.tsx` | KitTemplatesMetricsPage, default | direta | 276 |
| `src/pages/admin/qa/QARunDetailPage.tsx` | QARunDetailPage, default | direta | 272 |
| `src/pages/admin/qa/ReleaseEvidencesPage.tsx` | ReleaseEvidencesPage, default | direta | 212 |
| `src/pages/admin/RLSAuditPage.tsx` | summarizeLatestRlsAuditLogs, RLSAuditPage, default | direta | 233 |

Hooks exportados sem consumidor dentro de arquivos alcançáveis: `useOpportunities` e `useRevenueTrend` (`src/hooks/useCommercialIntelligence.ts:335,377`). Fora da fatia, mas ligados ao item ADM-10: `src/components/goals/SalesGoalsCard.tsx` e `src/hooks/useSalesGoals.ts` também estão órfãos. Página fora da fatia que hospeda órfãos: `src/pages/EngravingRegistrationPage.tsx` (só importada pela órfã `AdminCadastrosPage`).

---

## Fontes lidas
- Docs: `README.md`, `AGENTS.md`, `docs/ROUTES.md`, `docs/MODULES.md`, `docs/SCOPE_ALIGNMENT.md`, `docs/INVENTARIO_FUNCIONALIDADES_v2.md`, `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` (§1, §2, §3.4, §7–§13), `docs/EDGE_FUNCTIONS.md`, `docs/EDGE_FUNCTIONS_DRIFT.md`, `docs/secrets.md`, `docs/AUTH_PASSKEYS.md`, `docs/MAGIC_UP_ONDA5_A11Y.md`, `docs/05_ROADMAP_PROXIMOS_PASSOS.md` (§3.4–3.5), `docs/execucao/decisoes_pendentes.md`, `docs/execucao/fechamento-tecnico-2026-10-08.md`, `docs/execucao/evidencias/etapa24_magic_up_20260917.md`.
- Roteamento e navegação: `src/App.tsx`, `src/AuthEntry.tsx`, `src/main.tsx`, `src/routes/config/{admin,dev,tools,products,quotes,sicoob,sicoob-rbac,public}.ts`, `src/components/layout/{SidebarReorganized,Header,AdminRoute}.tsx`, `src/lib/rbac/route-matrix.ts`, `src/lib/navigation/restricted-routes.ts`, `src/components/common/spotlight/SpotlightItems.ts`, `src/components/search/GlobalSearch.tsx`.
- Páginas admin: todas as 72 de `src/pages/admin/**` (leitura dirigida das órfãs, dos hubs e das abas Sicoob), mais `src/pages/{ProductRegistrationPage,EngravingRegistrationPage,BusinessIntelligencePage,CommercialIntelligencePage,TrendsPage,CustomizableDashboard,PublicDossierPage}.tsx` e `src/pages/trends/*`.
- Componentes e hooks da fatia: leitura dirigida em `components/admin/{CouponManager,SystemFeatureToggles,CatalogQualityDashboard,MockupPromptManager,GoalTracker}`, `components/admin/{connections,products,suppliers-manager,categories,security}`, `components/{bi,intelligence,magic-up,mockup,expert,dashboard,security,settings,notifications,dev,product-registration,replenishments,inventory}`, `hooks/bi/*`, `hooks/voice/*`, `lib/bi/*`, `hooks/{useClientOrdersHistory,useCrmCompanies,useCommercialIntelligence,useProductRegistration,useExternalDatabase,useWebAuthn,usePushNotifications,useMagicUpGeneration,useMockupGenerator,useVoiceAgent,useAiUsage}.ts`, `hooks/mockup/mockupGenerationService.ts`, `components/workflows/WorkflowCanvas.tsx`, `pages/filters/filters-page-helpers.ts`.
- Edge functions: `external-db-bridge` (+ `_shared/external-read-only.ts`), `bi-share-dossier`, `send-notification`, `send-digest`, `secure-upload`, `generate-mockup`, `generate-ad-image`, `expert-chat`, `voice-agent`, `_shared/ai-usage.ts`; verificação de existência das 25 funções chamadas pela fatia e das funções de IA chamadas em `src/`.
- Banco (estático): `src/integrations/supabase/types.ts` e `supabase/migrations/*.sql`: 99 referências `.from()`/`.rpc()` da fatia cruzadas, todas com tipo e migration, exceto `products` em `DataSourceDebugTab.tsx:191`, que não tem tipo local.
- Scripts auxiliares (fora do repo): `<scripts-da-auditoria>/{orphans.mjs,routes.mjs,dbrefs.mjs}`, com saídas em `orphans.json`, `orphans.txt` e `routes.txt`.
- Tentativa de validação remota no projeto canônico via MCP: falhou com `401 Invalid access token`.
