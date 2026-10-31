# Frontend núcleo — funcionalidades planejadas e não executadas (fatia FE)

> Repositório `Brindes_Sicoob_V2`, HEAD `dc08200` (main, 08/10/2026). Levantamento feito em 11/10/2026, somente leitura.
> Escopo: `src/App.tsx`, `src/main.tsx`, `src/AuthEntry.tsx`, `src/routes/**`, `src/pages/**` (exceto `admin/` e `sicoob/`), `src/components/**` (exceto admin, sicoob, bi, intelligence, magic-up, mockup, expert, voice, dashboard, security, settings, notifications, dev, product-registration, replenishments, inventory), `src/hooks/**` (exceto bi, voice, sicoob), `src/lib/**` (exceto bi), `src/services/**` (exceto sicoob), `src/stores`, `src/contexts`, `src/utils`, `src/types`, `src/integrations`, `src/constants`, `src/data`, `index.html`, `public/manifest.json` (e `public/sw.js`, por ser parte do PWA).
> Quando um achado toca arquivo de outra fatia (ex.: página admin, edge function), ele aparece aqui só pelo lado do roteamento, da navegação ou do consumo no frontend núcleo.

## Resumo

**Total: 80 itens.**

| Status | Qtde |
|---|---:|
| PARCIAL | 23 |
| STUB/MOCK | 20 |
| ORFA | 30 |
| NAO_INICIADA | 4 |
| BLOQUEADA_EXTERNA | 3 |

Números de apoio:
- 126 rotas declaradas em `src/App.tsx` + `src/routes/config/*.ts`.
- 1.900 arquivos TS/TSX em `src/`. 365 deles não são alcançáveis a partir de `src/main.tsx` (grafo de imports com granularidade por nome em barrels e em `import()` dinâmico). **205 desses estão nesta fatia** (lista no apêndice).
- 18 links internos apontam para rotas inexistentes. 11 estão nesta fatia.
- 35 rotas não têm nenhum ponto de entrada na navegação: sidebar, header, palette, mobile nav ou links de página.

### Os 10 achados mais graves

1. **FE-001 (P0)**: `/orcamentos/:id` abre uma página reduzida, sem itens, PDF, link de aprovação, WhatsApp ou edição. A página completa (`QuoteViewPage`) só existe em `/orcamentos/:id/visualizar`, e nenhum link leva até ela. O Kanban e a lista mandam o usuário "gerar e assinar o PDF no detalhe", onde essa função não existe.
2. **FE-020 (P1)**: os filtros Técnica de gravação, Destaques, Novidades, Com personalização, Tags e Tamanhos aparecem e são contados como ativos, mas não filtram nada em `/filtros`. Em `/` também são ignorados Público-alvo, Datas, Endomarketing, Ramo/Segmento e Kit.
3. **FE-086 (P1)**: os e-mails transacionais não existem. A Edge Function responde 501 ("ainda não está implementado"). O aviso de mudança de status de pedido falha em silêncio, e os eventos de orçamento enviado/aprovado/recusado nunca são disparados.
4. **FE-140 (P1)**: a página Tendências abre em "MODO DEMO" para todos os usuários, com dados fictícios. O modo só desliga com `?demo=0`.
5. **FE-030 (P1)**: a página de produto mostra selos como "Best-Seller", "Emergente" e "Últimas Unidades" gerados por dados mock sempre que as materialized views não têm dados.
6. **FE-130 (P1)**: o "assistente IA" do Gerador de Mockup ("Matheus") devolve frases aleatórias com `setTimeout`. O componente de chat real (`AIChat`, ligado ao `expert-chat`) está órfão.
7. **FE-002 / FE-003 (P1)**: links visíveis caem em 404. O selo "Monte seu Kit", que aparece em todo card de produto, leva a `/kit-builder`. O botão "Explorar Catálogo" e a palette levam a `/catalogo`.
8. **FE-060 / FE-087 (P1)**: os fluxos Coleção → Orçamento, Simulador de Preços → Orçamento e Tendências → Orçamento abrem o construtor vazio, porque o `state` e o `?produto=` enviados não são lidos.
9. **FE-012 / FE-010 (P1)**: depois do login, admin/supervisor vai para `/admin/telemetria`, que é rota exclusiva de dev, e cai em "acesso negado". A sidebar mostra itens Sicoob que levam a 403 conforme o papel e esconde o "Painel Gestor" do gestor de compras.
10. **FE-110 (P1)**: salvar um kit completo grava `status: 'complete'`, valor que o trigger do banco rejeita (aceita só `draft`, `ready`, `shared`, `archived`). O ciclo pronto/compartilhado/arquivado nunca é produzido.

Merecem atenção logo em seguida: FE-095 e FE-100 (KPIs inventados nas telas Gestão de Compras e Clientes) e FE-015 (o link de compartilhamento de carrinho gera 404).

---

## Itens

### 1. Rotas e navegação

#### FE-001  Detalhe do orçamento reduzido; página completa sem acesso
- Status: PARCIAL
- Origem: `src/routes/config/quotes.ts:37-48` (`/orcamentos/:id` → `QuoteDetailPage`; `/orcamentos/:id/visualizar` → `QuoteViewPage`). `docs/ROUTES.md` documenta `/orcamentos/:id` → `QuoteViewPage`. README.md:198-202 descreve aprovação por link público e PDF profissional.
- Evidência no código:
  - `src/pages/QuoteDetailPage.tsx:118-140` renderiza só cabeçalho, banners de aprovação e abas Histórico/Comentários/Versões. Não há lista de itens, PDF, link de aprovação, WhatsApp, edição, duplicação nem modo apresentação. O total aparece como `toFixed(2)` cru (`:52`).
  - `src/pages/QuoteViewPage.tsx:91` (`PdfGenerationDialog`) e `:147` (`QuoteApprovalLinkCard`) são o único lugar onde PDF e link de aprovação existem.
  - Nenhum `navigate`/`Link` para `/visualizar` em `src/`. 14 navegações vão para `/orcamentos/${id}` (ex.: `src/components/quotes/QuotesConfigurableList.tsx:230,243`, `QuoteKanbanBoard.tsx:126`).
  - `src/components/quotes/QuoteKanbanBoard.tsx:190` mostra o toast "A aprovação final exige o PDF assinado no detalhe do orçamento". `src/pages/QuotesListPage.tsx:143` mostra "Gere e assine o PDF no detalhe do orçamento" e navega para a página que não tem PDF.
- O que falta: decidir uma página canônica. Ou `/orcamentos/:id` passa a montar `QuoteViewPage`, ou os recursos são incorporados à `QuoteDetailPage`. Também é preciso mostrar os itens no detalhe e corrigir as mensagens.
- Impacto no negócio: o vendedor não consegue gerar, enviar nem assinar a proposta pelo caminho normal da tela, e o fluxo de venda trava.
- Esforço: P (apontar rota/link) a M (unificar páginas)
- Prioridade: P0

#### FE-002  "Monte seu Kit" leva a rota inexistente `/kit-builder`
- Status: PARCIAL
- Origem: `src/components/products/ProductCategoryBadges.tsx:77`
- Evidência no código: `navigate(\`/kit-builder?product=${productId}\`)`. A rota real é `/montar-kit` (`src/routes/config/tools.ts:21-24`), e o construtor já lê `?product=` (`src/pages/KitBuilderPage.tsx:146`). O componente aparece em `ProductCard.tsx:16`, `ProductQuickView.tsx:14` e `product-detail/ProductDetailHeroSections.tsx:4`. Qualquer outro caminho cai no `NotFound` (`src/App.tsx:95`).
- O que falta: trocar para `/montar-kit?product=`.
- Impacto no negócio: o atalho de venda cruzada mais visível do catálogo leva a uma página de erro.
- Esforço: P
- Prioridade: P1

#### FE-003  Links para `/catalogo` (rota inexistente)
- Status: PARCIAL
- Origem: `src/pages/OrdersPage.tsx:256` (botão "Explorar Catálogo" no estado vazio de `/pedidos`) e `src/components/command/commandActions.tsx:100` (item "Catálogo de Produtos" da palette ⌘K).
- Evidência no código: não há rota `/catalogo` (o catálogo está em `/`, `/produtos` e `/filtros`). Há mais 7 ocorrências fora da fatia: `components/intelligence/HotSearchesCard.tsx:138`, `UnmetDemandCard.tsx:122`, `components/sicoob/orders/AIOrderPredictor.tsx:82`, `pages/sicoob/PADashboardPage.tsx:48`, `pages/sicoob/orders/OrdersKanbanPage.tsx:408`, `pages/sicoob/orders/OrdersPage.tsx:256`, `SellerPanelPage.tsx:66`. Algumas usam `?busca=`, que também não é lido.
- O que falta: criar um redirect `/catalogo` → `/filtros` (mapeando `busca` → `search`) ou corrigir os links.
- Impacto no negócio: o usuário que quer voltar a comprar cai em página de erro.
- Esforço: P
- Prioridade: P1

#### FE-004  Itens da sidebar sem rota
- Status: ORFA
- Origem: `src/components/layout/SidebarReorganized.tsx:227` (Newsletter `/admin/newsletter`), `:228` (Campanhas `/admin/campanhas`), `:250` (Evidências QA `/admin/qa/release-evidences`), `:253` (Auditoria RLS `/admin/seguranca/rls`).
- Evidência no código: as páginas existem, mas não estão roteadas: `src/pages/admin/AdminNewsletterPage.tsx`, `AdminCampanhasPage.tsx`, `qa/ReleaseEvidencesPage.tsx`, `RLSAuditPage.tsx`. Nenhuma aparece em `src/routes/config/*.ts` nem em `App.tsx`.
- O que falta: registrar as rotas (com o guard correto) ou remover os itens do menu.
- Impacto no negócio: Marketing (newsletter/campanhas) e as evidências de QA aparecem no menu e dão 404.
- Esforço: P
- Prioridade: P2

#### FE-005  `/admin/cadastros` aponta para a página errada; submenu e "novo produto" quebrados
- Status: ORFA
- Origem: `src/routes/config/admin.ts:21-24` (`/admin/cadastros` → `ProductRegistrationPage`); sidebar `SidebarReorganized.tsx:200-208` (submenus `?tab=products`, `?tab=suppliers`, `?tab=personalizacao`).
- Evidência no código:
  - `src/pages/ProductRegistrationPage.tsx:20-36` tem só as abas "Individual" e "Importação em massa" e ignora `?tab=`.
  - A página com as abas que a sidebar pede (`src/pages/admin/AdminCadastrosPage.tsx:56-84`: produtos, fornecedores, personalização via `EngravingRegistrationContent` de `src/pages/EngravingRegistrationPage.tsx`) não tem rota.
  - `components/admin/products/useProductsManager.ts:316-317` navega para `/admin/cadastros/produto/novo` e `/admin/cadastros/produto/:id`, rotas que não existem (`AdminProductFormPage` também não está roteada). `docs/ROUTES.md` documenta essas rotas.
- O que falta: rotear `AdminCadastrosPage` e `AdminProductFormPage`, ou ajustar o menu.
- Impacto no negócio: a gestão de fornecedores, de técnicas de gravação e a edição de produto ficam fora de alcance para o admin.
- Esforço: P
- Prioridade: P1

#### FE-006  "Estrutura SICOOB" sem páginas dedicadas
- Status: ORFA
- Origem: `src/routes/config/admin.ts:29-40` (`/admin/singulares`, `/admin/pas` e `/admin/cooperativas` → todas `SicoobManagementPage`); sidebar `SidebarReorganized.tsx:211-219`.
- Evidência no código: `src/pages/admin/sicoob/SicoobManagementPage.tsx:20` usa `Tabs defaultValue="cooperativas"` e não lê a URL. As três opções do submenu abrem a mesma aba. Existem `pages/admin/AdminSingularesPage.tsx`, `AdminPAsPage.tsx`, `AdminCooperativasPage.tsx` e `AdminCentraisPage.tsx`, mas não são roteadas.
- O que falta: rotear as páginas dedicadas ou fazer a `SicoobManagementPage` selecionar a aba pela rota.
- Impacto no negócio: o admin clica em "Postos de Atendimento" e cai em "Cooperativas".
- Esforço: P
- Prioridade: P2

#### FE-007  Command palette (⌘K) com destinos e ações sem efeito
- Status: STUB/MOCK
- Origem: `src/components/command/commandActions.tsx` (montada em `src/components/layout/MainLayout.tsx:49-51,81`).
- Evidência no código:
  - Rotas inexistentes: `/catalogo` (`:100`), `/tecnicas` (`:129`), `/datas-comemorativas` (`:165`), `/relatorios` (`:174`), `/ajuda` (`:241`).
  - "Configurações" vai para `/configuracoes` (`:220`), que redireciona para a área admin `/admin/usuarios` (`src/App.tsx:92`). Para quem não é admin, isso dá 403.
  - "Exportar como PDF" (`:184-187`) dispara `CustomEvent("export-pdf")`, que nenhum código escuta. "Atalhos de Teclado" (`:250`) só fecha a palette.
  - Nenhuma ação define `path`, então o filtro RBAC (`GlobalCommandBar.tsx:87`) nunca esconde nada.
  - `RecentItem.type` prevê `product`, `client` e `quote` (`:33`), mas só `page` é gravado.
  - ⌘K tem três ouvintes ao mesmo tempo: `GlobalCommandBar.tsx:64`, `components/search/useGlobalSearch.ts:114` e `hooks/useGlobalShortcuts.ts:64,107`. A palette e a busca global abrem juntas.
- O que falta: apontar para rotas reais ou criá-las (técnicas, datas comemorativas, relatórios, ajuda), implementar a exportação e a folha de atalhos, preencher `path` e unificar o ⌘K.
- Impacto no negócio: o atalho "power user" leva a erros e ações mortas.
- Esforço: P
- Prioridade: P2

#### FE-008  Central de Ajuda inexistente
- Status: NAO_INICIADA
- Origem: menu do usuário "Ajuda" (`src/components/layout/Header.tsx:130`), palette "Central de Ajuda" `/ajuda` (`commandActions.tsx:236-243`), texto do tour "use o botão de ajuda (?) no canto inferior direito" (`src/constants/onboarding.ts:116`).
- Evidência no código: o `DropdownMenuItem` "Ajuda" não tem `onClick`. Não existe rota `/ajuda`. O botão flutuante de reiniciar tour (`src/components/onboarding/RestartTourButton.tsx`) está órfão, exportado só por `components/onboarding/index.ts`, que tem 0 importadores.
- O que falta: uma página ou drawer de ajuda (FAQ, tutoriais, contato) e o botão (?) prometido no tour.
- Impacto no negócio: o usuário sem treinamento não tem onde buscar ajuda, e isso aumenta a carga do suporte.
- Esforço: M
- Prioridade: P2

#### FE-009  35 rotas sem nenhum ponto de entrada na navegação
- Status: ORFA
- Origem: rotas declaradas em `src/routes/config/*.ts` e `src/App.tsx`.
- Evidência no código (busca por `navigate`/`to`/`href`/`goTo`/`path` literais em todo `src/`; no máximo aparece autorreferência em `PageSEO`):
  - Usuário final:
    - `/notificacoes` (o sino em `components/notifications/NotificationDrawer.tsx` não tem "ver todas").
    - `/mockups/historico`, `/dropbox`, `/orcamentos/kanban`, `/orcamentos/dashboard`, `/orcamentos/lista` (a lista não tem alternador de visão; o Kanban só tem "Lista" de volta, `QuotesKanbanPage.tsx:197-200`).
    - `/clientes` (só via `pages/sicoob/vendedor/SellerDashboardPage.tsx`).
    - `/gestor/compras` e `/pa/verba` (só breadcrumb ou `role-policy`), `/gestor/aprovacoes` (só pelo painel do gestor).
    - `/sicoob/vendas` (só como destino pós-login do vendedor, `lib/auth/auth-utils.ts:70-71`).
    - `/ferramentas/bi/comparar` (só a partir do BI), `/meus-kits` (só widget e atalho G K; fora da sidebar).
  - Admin/dev: `/admin/limites-desconto`, `/admin/permissoes`, `/admin/roles`, `/admin/role-permissoes`, `/admin/video-variantes`, `/admin/kit-templates`, `/admin/performance`, `/admin/consumo-ia`, `/admin/external-db`, `/admin/rate-limit`, `/admin/login-attempts`, `/admin/rls-denials`, `/admin/auditoria-propriedade`, `/admin/validade-precos`, `/admin/saude-testes`, `/admin/design-system/colors`, `/admin/conexoes/status`, `/sicoob/qa/preflight`, `/status`, `/external-db-test`.
- O que falta: adicionar entradas no menu ou nos alternadores de visão, ou remover as rotas mortas.
- Impacto no negócio: funcionalidades prontas (Kanban e dashboard de orçamentos, histórico de mockups, notificações, clientes) ficam invisíveis para quem não sabe a URL.
- Esforço: P
- Prioridade: P2

#### FE-010  Sidebar ignora o controle de acesso Sicoob (itens levam a 403; gestor sem o próprio painel)
- Status: PARCIAL
- Origem: `src/components/layout/SidebarReorganized.tsx:73-112,130-135,170-181` vs `src/lib/access/role-policy.ts:29-46` (`SICOOB_ROUTE_ACCESS`).
- Evidência no código:
  - `hasRouteAccess` (`SidebarReorganized.tsx:269-273`) só verifica rotas dev/admin. `SicoobRoute.tsx:43` manda para `/403`.
  - Resultado: vendedor e agente veem "Painel PA" (`:87`, `PA_ROLES`) e recebem 403. Gerente PA vê "Minha Carteira" (`:88`, só vendedor), "Logística & POD" (`:99`), "Relatórios SICOOB" e "Analytics SICOOB" (`:179-180`, `MANAGERS`) e recebe 403.
  - "Painel Gestor" (`:80`) e "Gestão Singular" (`:134`) são `adminOnly` e ficam escondidos do `gestor_compras`/`comprador_singular`, embora a rota os permita. `/gestor/orcamentos` é justamente o destino pós-login desse papel (`auth-utils.ts:65-66`).
- O que falta: filtrar os itens por `SICOOB_ROUTE_ACCESS` e trocar `adminOnly` por `allowedRoles`.
- Impacto no negócio: cada papel vê opções que dão "proibido" e não encontra o próprio painel.
- Esforço: P
- Prioridade: P1

#### FE-011  Contadores de pendência da sidebar nunca aparecem
- Status: PARCIAL
- Origem: `src/components/layout/SidebarReorganized.tsx:496-551` (`usePendingSidebarBadges` e `enrichNavigationGroups`).
- Evidência no código: os badges são aplicados a `'/admin/usuarios?tab=discounts'` (`:544`) e `'/orcamentos'` (`:548`), mas nenhum item tem esses `href`. Os itens são `/admin/usuarios` (`:190`) e `/orcamentos/novo`, `/meus-orcamentos`, `/gestor/orcamentos`, `/carrinhos` (`:121-136`). As consultas rodam a cada 30 s sem efeito visível.
- O que falta: usar o href correto e incluir o item "Aprovações Singular".
- Impacto no negócio: gestor e supervisor não veem quantas aprovações estão esperando.
- Esforço: P
- Prioridade: P2

#### FE-012  Admin/supervisor cai em "acesso negado" logo após o login
- Status: PARCIAL
- Origem: `src/lib/auth/auth-utils.ts:57-75` (`getDefaultRouteByRole`: `dev` e `supervisor` → `/admin/telemetria`), usado em `src/pages/Auth.tsx:81`.
- Evidência no código: `/admin/telemetria` fica em `devRoutes` (`src/routes/config/dev.ts:10-13`) e em `DEV_ONLY_ROUTE_PREFIXES` (`src/lib/navigation/restricted-routes.ts:15`). `DevRoute.tsx:101-104` renderiza `DeniedDevRoute` para quem não é dev. `normalizeAssignedRoles` converte `admin`/`manager` em `supervisor` (`role-policy.ts:7-9`).
- O que falta: uma rota inicial própria para supervisor/admin (ex.: `/admin/usuarios` ou `/gestor`).
- Impacto no negócio: a primeira tela do administrador depois do login é um bloqueio.
- Esforço: P
- Prioridade: P1

#### FE-013  "Minha conta" / perfil do usuário não existe (redirects temporários)
- Status: NAO_INICIADA
- Origem: `src/App.tsx:92-93` (`/configuracoes` e `/perfil` → `<Navigate to="/admin/usuarios">`); `src/hooks/useCurrentSection.ts:20`; skeleton planejado `src/components/layout/SkeletonLoaders.tsx:260-262` (`ProfileSkeleton`); schema planejado `src/lib/validations/profileSchema.ts` (órfão).
- Evidência no código: o único caminho de edição de nome e avatar é administrativo (`src/services/admin/UserService.ts:75-101`). Não existe troca de senha com o usuário logado; `supabase.auth.updateUser` só aparece em `ResetPassword.tsx:75`. O header mostra `profile.avatar_url` (`Header.tsx:124`), mas não há upload próprio.
- O que falta: uma página de perfil (nome, telefone, avatar, senha, preferências) acessível a todos os papéis.
- Impacto no negócio: o usuário depende do admin até para trocar o próprio nome ou a foto.
- Esforço: M
- Prioridade: P2

#### FE-014  "SSOT" de rotas divergente: matriz RBAC e `docs/ROUTES.md`
- Status: PARCIAL
- Origem: `src/lib/rbac/route-matrix.ts:1-13` ("SSOT auditável… Atualize SEMPRE") e `docs/ROUTES.md` ("gerado automaticamente").
- Evidência no código:
  - A matriz declara `/auth/callback` (`:55`) e `/admin/usuarios/promover` (`:73`), que não existem.
  - `/tendencias` aparece como `AdminRoute` com AAL2 (`:69`), mas está montada em `productRoutes` sob `ProtectedRoute` (`src/routes/config/products.ts:57-60`).
  - `/admin/temas` aparece como `ProtectedRoute` (`:78`), mas está sob `AdminRoute` (`App.tsx:123`).
  - Cerca de 60 rotas reais (Sicoob, orçamentos, pedidos, clientes) não estão na matriz.
  - `docs/ROUTES.md` lista `/admin/cadastros/produto/:id`, `/admin/kit-templates/metricas`, `/admin/seguranca/exemplos-challenge`, `/admin/qa` (QAPage), `/carrinhos/:cartId`, `/auth/callback` e `/favoritos → FiltersPage`, que não existem ou não batem.
  - README.md:217 diz "Dashboard BI (`/bi`)"; a rota real é `/ferramentas/bi`.
  - Os aliases públicos `/approve/:token` e `/public/*` (`src/routes/config/public.ts:44-91`) não têm gerador de link em `src/` nem em `supabase/functions`.
- O que falta: gerar a matriz e o ROUTES.md a partir de `routes/config` e decidir o guard de `/tendencias`.
- Impacto no negócio: a auditoria de acesso (`/admin/rbac-rotas`) mostra uma realidade diferente da aplicação.
- Esforço: P
- Prioridade: P2

#### FE-015  Link compartilhado de carrinho e `/carrinhos/novo` dão 404
- Status: PARCIAL
- Origem: `src/components/cart/cart-utils/CartExport.ts:78-81` (`shareCartLink` copia `${origin}/carrinhos/${cartId}`).
- Evidência no código: `src/pages/seller-carts/useSellerCartsPage.ts:25` lê `useParams().cartId` e `:40-42` trata `/carrinhos/novo`, mas só `/carrinhos` está declarada (`src/routes/config/quotes.ts:54-57`). O rodapé do PDF ainda diz "Gerado pelo CRM" (`CartExport.ts:73`).
- O que falta: declarar `/carrinhos/:cartId` e `/carrinhos/novo`.
- Impacto no negócio: o link de carrinho enviado ao colega ou ao cliente abre uma página de erro.
- Esforço: P
- Prioridade: P1

#### FE-016  Páginas existentes em `src/pages` sem rota
- Status: ORFA
- Origem: arquivos em `src/pages/` (fatia) sem referência em rotas.
- Evidência no código:
  - `src/pages/PublicQuoteApprovalPage.tsx` (329 linhas) e `public-approval/*` (`usePublicQuoteApproval.ts:80` usa `quote-public-view`): versão mais rica da aprovação pública, com vendedor, condições de pagamento, recibo de assinatura e telas de expirado/respondido. As rotas `/approve`, `/proposta` e `/public/orcamento/:token/aprovacao` usam a versão simples `QuoteApprovalPage.tsx` (91 linhas).
  - `src/pages/QAPage.tsx` (vitrine de QA visual). `docs/ROUTES.md` documenta `/admin/qa`.
  - Outras páginas sem rota têm item próprio: `PWAInstallPage` (FE-170), `PersonalizationSimulator` (FE-122), `GestorApprovalsPage` raiz (FE-096), `quotes/QuoteApprovalHistoryPage` (FE-097), `EngravingRegistrationPage` (FE-005).
- O que falta: escolher uma página de aprovação pública canônica e apagar ou rotear `QAPage`.
- Impacto no negócio: a experiência de aprovação do cliente fica abaixo do que foi construído, e há duas implementações para manter.
- Esforço: P
- Prioridade: P3

### 2. Catálogo e filtros

#### FE-020  Filtros exibidos e contados, mas não aplicados
- Status: PARCIAL
- Origem: seções do painel em `src/components/filters/filter-panel/types.ts:103-118` (Técnicas de Gravação, Gênero, Tamanhos, Tags, Opções Rápidas). `docs/SCOPE_ALIGNMENT.md` ("Filtros Avançados: Por tiragem, estoque, cor, categoria e técnica de gravação").
- Evidência no código:
  - Controles: `src/components/filters/filter-panel/sections/SimpleFilters.tsx:147` (técnicas), `:205` (tags), `:233-256` (Kit, Destaques, Novidades, Com Personalização, Em estoque, Embalagem). `FilterPanel.tsx:233-254` (gênero, tamanhos).
  - Em `/filtros` e `/produtos`, `src/pages/filters/filters-page-helpers.ts:279-307` (`applyProductFilters`) **não aplica** `techniques`, `tags`, `gender`, `sizes`, `featured`, `isNew` nem `hasPersonalization`, embora `countActiveFilters` (`:127-153`) os conte e a URL os serialize (`:6-35`).
  - Em `/` (Index), `src/hooks/useCatalogFiltering.ts:123-137` aplica só categoria, temas, tiragem mínima, cor, fornecedor, preço, estoque, gênero e material. **Ignora** público-alvo, datas comemorativas, endomarketing, ramo/segmento, técnicas, tags, tamanhos, kit, destaque, novidade, personalização, embalagem, estoque mínimo e nuances. Mesmo assim, `src/hooks/catalog/useCatalogFilters.ts:5-12` conta tudo como ativo.
- O que falta: implementar os predicados que faltam nos dois pipelines, de preferência unificados.
- Impacto no negócio: o vendedor marca "Técnica: laser" ou "Novidades", vê "3 filtros ativos" e recebe a lista inteira. Isso gera confiança falsa e propostas erradas.
- Esforço: M
- Prioridade: P1

#### FE-021  Chips de categoria ativa usam lista mockada
- Status: STUB/MOCK
- Origem: `src/components/catalog/CatalogActiveFilters.tsx:3,73-74`.
- Evidência no código: `CATEGORIES.find(...)` vem de `src/data/mockData.ts:155-169` ("DADOS MOCKADOS", 12 categorias fixas). Categorias reais com outros IDs não geram chip. `mockData.ts` também alimenta `components/admin/products/ProductMarketingSection.tsx:18` (fora da fatia), com listas fixas de público-alvo, datas e endomarketing.
- O que falta: usar `useExternalCategoriesQuery` (como `useSearch.ts:41-48` já faz).
- Impacto no negócio: um filtro de categoria fica ativo sem aparecer na tela e o usuário não sabe por que a lista encolheu.
- Esforço: P
- Prioridade: P2

#### FE-022  Deep links para o Super Filtro com parâmetros não reconhecidos
- Status: PARCIAL
- Origem: `components/dashboard/UpcomingDatesWidget.tsx:33` (`/filtros?data=<slug>`) e `components/search/AdvancedSearch.tsx` (`?categoria=` e `?fornecedor=`; componente órfão).
- Evidência no código: `src/pages/filters/filters-page-helpers.ts:6-25,74-88` só reconhece `datasComemorativas`, `categories`, `suppliers`/`supplier`, `search` etc. O link de data comemorativa abre o catálogo sem filtro.
- O que falta: aceitar os aliases ou corrigir os produtores dos links.
- Impacto no negócio: a campanha sazonal sugerida no dashboard não filtra os produtos.
- Esforço: P
- Prioridade: P2

### 3. Produto

#### FE-030  Selos de inteligência de mercado com dados fictícios na página do produto
- Status: STUB/MOCK
- Origem: `src/hooks/useProductIntelligenceBadges.ts:1-5` ("falling back to mock data when MVs aren't populated").
- Evidência no código: `:103-119` usa `generateMockIntelligence` e `generateMockVelocities` (`src/lib/stock-chart-utils.ts:51-230`, fornecedores inventados como "Spot Promo" e "Asia Import") sempre que `mv_product_intelligence`/`mv_stock_velocity` vêm vazias. Isso produz "Best-Seller", "Emergente", "Últimas Unidades" e um score de giro. É renderizado em `src/pages/ProductDetail.tsx:217,311`. O único aviso é um selo cinza "dados ilustrativos" (`components/common/IntelligenceBadges.tsx:124-128`). O mesmo mock alimenta `components/inventory/risk/ProductRiskDetail.tsx:35-37,188-190` (fora da fatia).
- O que falta: popular e agendar a atualização das MVs e, sem dado real, não exibir selos de mercado.
- Impacto no negócio: o vendedor pode repassar ao cliente "produto mais vendido / últimas unidades" sem base real.
- Esforço: M
- Prioridade: P1

#### FE-031  Histórico de preço do produto não exibido
- Status: ORFA
- Origem: `src/components/products/PriceHistoryChart.tsx` ("gráfico de linha do histórico de preços").
- Evidência no código: 0 importadores. A tabela `price_history` existe (migrations `20251227100008_product_price_history.sql`) e só é lida pelo sparkline do comparador (`components/compare/PriceSparkline.tsx:24`).
- O que falta: incluir o gráfico na página de produto e confirmar que `price_history` é populada.
- Impacto no negócio: o vendedor não consegue argumentar com a tendência de preço.
- Esforço: P
- Prioridade: P2

#### FE-032  Componentes de produto planejados e não ligados
- Status: ORFA
- Origem e evidência (0 importadores ou só via barrel órfão `components/products/index.ts`):
  - `ProductVariations.tsx` (chips de variante)
  - `ZoomableGallery.tsx` (+ `zoomable-gallery/*`)
  - `ProductSectionNav.tsx` (abas com scroll-spy)
  - `RecentlyViewedBar.tsx`
  - `ProductHoverPreview.tsx`
  - `ProductIntelligence.tsx`
  - `EnhancedProductCard.tsx` (preview e badges de urgência)
  - `KitVisualComposition.tsx`
  - `RelatedProducts.tsx` (+ `useRelatedProducts` em `hooks/useProducts.ts:122`, sem uso)
  - Configurador inline de personalização em 4 etapas `components/products/customization/*` (`LocationCard`, `TechniqueOption`, `VariationSelector`, `ConfigurationPanel` "Etapa 4: Configurar tamanho, cores e calcular preço").
- O que falta: decidir entre ligar (ex.: configurador inline e barra de vistos recentemente) ou remover.
- Impacto no negócio: código pronto parado. A personalização direto na página do produto encurtaria o caminho até a proposta.
- Esforço: M
- Prioridade: P3

### 4. Busca

#### FE-040  Busca global só procura produtos e clientes
- Status: PARCIAL
- Origem: `src/components/search/useGlobalSearch.ts:27-42` (`SearchResultType`: product, client, quote, order, collection, kit, mockup, art_file, cart_template, reminder, conversation, magic_up, category, component, media) e `src/components/search/search-types.ts:14-30` (ícones e rótulos dos 15 tipos).
- Evidência no código: `searchByIntent` (`useGlobalSearch.ts:85-94`) executa apenas `executeProductSearch` e `executeClientSearch`. Se a IA (`semantic-search`) classificar a intenção como "orçamento" ou "pedido", o resultado volta vazio.
- O que falta: busca de orçamentos, pedidos, coleções, kits e mockups.
- Impacto no negócio: não dá para achar "orçamento 1234" ou "pedido do cliente X" pela busca do topo.
- Esforço: M
- Prioridade: P2

#### FE-041  Resultado "Cliente" da busca global leva a 404
- Status: PARCIAL
- Origem: `src/components/search/useGlobalSearch.ts:352`.
- Evidência no código: `href: \`/cliente/${c.id}\``. A rota real é `/clientes/:id` (`src/App.tsx:144`).
- O que falta: corrigir o caminho.
- Impacto no negócio: todo clique em cliente pela busca falha.
- Esforço: P
- Prioridade: P1

#### FE-042  Busca visual por foto e busca avançada não ligadas
- Status: ORFA
- Origem: `src/components/search/VisualSearchButton.tsx:63` (chama a Edge Function `visual-search`, que existe em `supabase/functions/visual-search`); `AdvancedSearch.tsx` e `SearchWithSuggestions.tsx` (via barrel `components/search/index.ts`, sem importadores desses nomes). `docs/INVENTARIO_FUNCIONALIDADES_v2.md` lista `visual-search`.
- Evidência no código: grafo de imports (apêndice).
- O que falta: incluir o botão de câmera na busca e testar a função.
- Impacto no negócio: o vendedor não consegue achar o similar a partir da foto que o cliente mandou.
- Esforço: P
- Prioridade: P2

#### FE-043  Componentes de busca com resultados mock (órfãos)
- Status: STUB/MOCK
- Origem: `src/components/search/GlobalSearch.tsx:68-89` (`MOCK_RESULTS`, links `/produtos/1` e `/bi`) e `src/components/search/SmartSuggestions.tsx:52-104` (`MOCK_SUGGESTIONS`, `/produtos/1..5`).
- Evidência no código: 0 importadores. Se forem ligados por engano, mostram dados falsos.
- O que falta: remover (a busca real é `GlobalSearchPalette`).
- Impacto no negócio: risco de exibir resultados inventados.
- Esforço: P
- Prioridade: P3

### 5. Carrinho

#### FE-050  Sugestão "comprados juntos" pronta e não exibida
- Status: ORFA
- Origem: `src/components/cart/BundleSuggestionCard.tsx` ("sugere produtos comumente orçados juntos… RPC `get_bundle_suggestions`").
- Evidência no código: 0 importadores. A RPC existe (`src/integrations/supabase/types.ts:12013`; migration `20260417000818_…sql`).
- O que falta: colocar o card no carrinho, no construtor de orçamento ou na página de produto.
- Impacto no negócio: perde-se aumento de ticket por venda cruzada com dado real.
- Esforço: P
- Prioridade: P2

#### FE-051  Mini-carrinho com checkout e cupom (modelo e-commerce) órfão
- Status: ORFA
- Origem: `src/components/cart/MiniCart.tsx:128` (`<Link to="/checkout">Finalizar Compra</Link>`), `CouponInput.tsx`.
- Evidência no código: 0 importadores. Não há rota `/checkout` nem lógica de cupom.
- O que falta: decidir se o portal B2B terá checkout e cupom. Se não, remover.
- Impacto no negócio: nenhum hoje; é resíduo de outro modelo de negócio.
- Esforço: P (remover) / G (implementar)
- Prioridade: P3

### 6. Favoritos e coleções

#### FE-060  Coleção → Orçamento abre o construtor vazio
- Status: PARCIAL
- Origem: `src/pages/CollectionDetailPage.tsx:106-107,152-153` e `src/pages/collections/useCollectionsPageState.ts:183` navegam para `/orcamentos/novo` com `state: { fromCollection, preloadProducts, clientId, clientName }`.
- Evidência no código: `src/hooks/quote/useQuoteInitialization.ts:207-276` só trata `fromSimulator`, `fromCart`, `items[]` (URL) e `templateItems`. `preloadProducts`, `fromCollection` e `clientId` são descartados.
- O que falta: um efeito de pré-carga a partir da coleção (itens e cliente).
- Impacto no negócio: o vendedor monta a coleção para o cliente e precisa redigitar tudo no orçamento.
- Esforço: P
- Prioridade: P1

#### FE-061  Alertas de queda de preço sem agendamento
- Status: PARCIAL
- Origem: `docs/INVENTARIO_FUNCIONALIDADES_v2.md` ("watcher de preços"). O badge `src/components/favorites/PriceDropBadge.tsx` e o snapshot `price_at_save` (`ExportFavoritesButton.tsx:39`) existem no frontend.
- Evidência no código: as funções `supabase/functions/favorites-watcher`, `collections-watcher` e `comparison-price-watcher` ("C6 #7 — Cron diário") existem, mas nenhuma migration agenda essas funções. A lista de `cron.schedule` em `supabase/migrations` não as inclui.
- O que falta: agendar no `pg_cron` ou em outro scheduler e exibir as notificações geradas.
- Impacto no negócio: o vendedor nunca é avisado de que um produto favoritado ficou mais barato.
- Esforço: P
- Prioridade: P2

#### FE-062  Componentes de favoritos e coleções não ligados
- Status: ORFA
- Origem: `src/components/favorites/QuickListPicker.tsx` ("selecionar lista ao favoritar a partir do catálogo"), `src/lib/export-collection-pdf.ts` (`exportCollectionPDF`).
- Evidência no código: 0 importadores (a exportação real fica em `ExportCollectionButton.tsx`).
- O que falta: ligar o seletor de lista no coração do card ou remover.
- Impacto no negócio: favoritar sempre cai na lista padrão.
- Esforço: P
- Prioridade: P3

### 7. Comparador

#### FE-070  "Onda C6" do comparador praticamente toda órfã
- Status: ORFA
- Origem: marcadores no código: `ComparisonWeightsPopover.tsx:2` (C6 #1 "pesos persistentes"), `hooks/useComparisonWeights.ts:2` (C6 #1), `HistoricalPriceOverlay.tsx:2` (C6 #2), `lib/pdf/whitelabel-comparison.ts:2` (C6 #3 PDF white-label com marca do cliente), `SortableColumnWrapper.tsx:2` (C6 #4 colunas arrastáveis), `FocusModeToggle.tsx:2` (C6 #5 modo foco, tecla F), `ImageZoomCell.tsx:2` (C6 #6 lupa), `ComparisonShortcutsCheatsheet.tsx:2` (C6 #8); `supabase/functions/comparison-price-watcher/index.ts:4` (C6 #7).
- Evidência no código: os 8 itens existem e nenhum está ligado. #1, #2, #4, #5, #6 e #8 têm 0 importadores. #3 também tem 0 e é decisão pendente em `docs/execucao/decisoes_pendentes.md` §6. #7 não tem cron (FE-061). O `ComparisonScoreCard.tsx:35` usa pesos em `useState` não persistidos.
- O que falta: ligar os componentes em `ComparePage` e decidir o white-label.
- Impacto no negócio: uma onda inteira de melhorias pagas e não entregue ao usuário.
- Esforço: M
- Prioridade: P2

### 8. Orçamentos

#### FE-080  Kanban de orçamentos cobre 5 de 13 status
- Status: PARCIAL
- Origem: enum `quote_status` com 13 valores (`src/integrations/supabase/types.ts:12991-13004`; trigger em `supabase/migrations/20260927110200_quote_status_workflow_validation.sql:11-15`).
- Evidência no código: `src/components/quotes/QuoteKanbanBoard.tsx:58` (`KANBAN_STATUSES = draft, pending, sent, approved, rejected`). Os orçamentos em `pending_approval`, `pending_singular_approval`, `approved_singular`, `rejected_singular`, `revision`, `viewed`, `converted` e `expired` somem do Kanban (`:211-220`). `src/lib/quote-status-config.ts:22-90` não tem rótulo para `revision` e `viewed`. `src/types/quote.ts:4` (`QuoteStatus`, 9 valores) está desatualizado e só é exportado pelo barrel órfão `src/types/index.ts`.
- O que falta: colunas ou agrupamentos para os fluxos de alçada e singular, rótulos completos e remoção do tipo obsoleto.
- Impacto no negócio: as propostas em aprovação de alçada ou da singular ficam invisíveis no quadro.
- Esforço: P
- Prioridade: P2

#### FE-081  Limite de desconto exibido fixo em 10%
- Status: STUB/MOCK
- Origem: `src/pages/QuoteDetailPage.tsx:136` (`maxDiscountPercent={10}`).
- Evidência no código: o banner (`components/quotes/QuoteManagerApprovalBanner.tsx:35`) mostra "excede o limite do vendedor (10%)". O limite real por vendedor existe em `seller_discount_limits` (`hooks/useSellerDiscountLimits`, `components/admin/SellerDiscountLimitsPanel.tsx:25`).
- O que falta: ler o limite do vendedor do orçamento.
- Impacto no negócio: o gestor decide a aprovação com uma informação errada.
- Esforço: P
- Prioridade: P2

#### FE-082  Insight de margem vs. histórico do vendedor não exibido
- Status: ORFA
- Origem: `src/components/quote/MarginInsightBadge.tsx:1-3` ("margem do orçamento atual vs mediana histórica do vendedor").
- Evidência no código: 0 importadores; a consulta já está pronta (`:23`).
- O que falta: incluir no construtor ou no resumo do orçamento.
- Impacto no negócio: o vendedor não percebe que está dando desconto acima do seu padrão.
- Esforço: P
- Prioridade: P2

#### FE-083  Componentes de orçamento de versões anteriores sem uso
- Status: ORFA
- Origem e evidência: 0 importadores para `components/quotes/QuoteShareDialog.tsx` (link público), `QuoteTemplatePicker.tsx`, `QuoteMetricsDashboard.tsx`, `QuoteCard.tsx` + `OneClickReorderQuote.tsx`, `QuoteFilters.tsx`, `ClientPicker.tsx`, `ItemsListEditor.tsx`, `QuoteItemsList.tsx` e `QuotePersonalizationSelector.tsx`. Exports sem uso: `hooks/useGenericFuzzySearch.ts:139` (`useQuoteFuzzySearch`), `hooks/quotes/quoteHelpers.ts:145,177`.
- O que falta: remover ou reaproveitar (ex.: o seletor de template no construtor).
- Impacto no negócio: manutenção duplicada.
- Esforço: P
- Prioridade: P3

#### FE-084  Sincronização com Bitrix24 no orçamento
- Status: BLOQUEADA_EXTERNA
- Origem: botão primário "Sincronizar" em `src/pages/QuoteViewPage.tsx:91` → `src/pages/quote-view/QuoteBitrixSync.ts`. README.md:71,288 apresenta Bitrix como integração. `docs/SCOPE_ALIGNMENT.md` diz "Bitrix24 (CRM): … não será replicada".
- Evidência no código: depende das Edge Functions `sync-quote-bitrix`/`bitrix-sync` e de credenciais. A decisão está aberta em `docs/execucao/decisoes_pendentes.md` §1.
- O que falta: decisão de negócio (manter ou remover) e credenciais.
- Impacto no negócio: um botão principal da proposta pode falhar ou sincronizar com um CRM fora de escopo.
- Esforço: P (remover) / M (manter)
- Prioridade: P2

#### FE-085  "Editar" item no resumo do construtor sem ação
- Status: STUB/MOCK
- Origem: `src/components/quotes/QuoteBuilderSummaryColumn.tsx:163`.
- Evidência no código: `<Button … aria-label="Editar">` sem `onClick` (o botão "Excluir" ao lado funciona).
- O que falta: abrir o item para edição (quantidade, cor, personalização).
- Impacto no negócio: clique morto no passo final do orçamento.
- Esforço: P
- Prioridade: P3

#### FE-086  E-mails transacionais (orçamento e pedido) não implementados
- Status: STUB/MOCK
- Origem: `src/hooks/useTransactionalEmail.ts:6-11` (eventos `quote_sent`, `quote_approved`, `quote_rejected`, `order_created`); `src/services/OrderService.ts:415-433` (envia `sicoob_order_status_change`).
- Evidência no código: `supabase/functions/send-transactional-email/index.ts:45-51` sempre responde **501** "O envio deste email ainda não está implementado". `sendTransactionalEmail` não tem nenhum chamador. A chamada do `OrderService` fica dentro de `try/catch` e só registra `console.error`.
- O que falta: transporte de e-mail (provedor e recibo) e disparo nos eventos de orçamento e pedido.
- Impacto no negócio: cliente e PA não recebem e-mail quando a proposta é enviada ou o pedido muda de status.
- Esforço: M (depende também de provedor/credencial)
- Prioridade: P1

#### FE-087  Simulador de Preços e Tendências → Orçamento sem pré-carga
- Status: PARCIAL
- Origem: `src/components/pricing/ProductPriceSimulator.tsx:337-346` e `src/components/pricing/QuantityPriceCalculator.tsx:66-67` (CTA "criar orçamento" → `navigate('/orcamentos', { state: { fromSimulator, product, … } })`); `src/pages/trends/TrendsCharts.tsx:185` (`/orcamentos/novo?produto=`).
- Evidência no código: os dois primeiros vão para a **lista** `/orcamentos`, que não lê `state`. O construtor (`useQuoteInitialization.ts:207-223`) espera `simulationData` em `/orcamentos/novo`. `?produto=` não é lido (só `items[]`, `:241-262`). Só o Simulador Wizard funciona (`SimuladorWizard.tsx:373`).
- O que falta: padronizar o contrato de importação para o construtor.
- Impacto no negócio: o cálculo feito no simulador se perde e precisa ser refeito.
- Esforço: P
- Prioridade: P1

### 9. Pedidos e gestão de compras

#### FE-090  Painel financeiro do pedido com margem fixa de 32%
- Status: STUB/MOCK
- Origem: `src/components/orders/FinancialPanel.tsx:38-41` ("Margem estimada: 32%").
- Evidência no código: valor literal, usado em `OrderDetailSheet.tsx:8` (Kanban de aprovação `ApprovalKanbanBoard.tsx:117`).
- O que falta: calcular a margem com custo real ou remover.
- Impacto no negócio: o gestor vê uma margem inventada no pedido.
- Esforço: M
- Prioridade: P2

#### FE-091  Filtro de pedidos: botão "Aplicar" sem ação
- Status: STUB/MOCK
- Origem: `src/components/orders/OrderFilters.tsx:194`.
- Evidência no código: `<Button className="flex-1">Aplicar</Button>` sem `onClick` (os filtros já aplicam ao mudar e o popover não fecha).
- O que falta: fechar o popover ou aplicar em lote.
- Impacto no negócio: atrito pequeno.
- Esforço: P
- Prioridade: P3

#### FE-092  Alçada superior (diretoria) calculada e nunca usada
- Status: ORFA
- Origem: `src/hooks/usePaBudget.ts:51-55,66` (`isBoardApprovalRequired`: >150% da alçada ou > R$ 50 mil).
- Evidência no código: nenhum chamador em `src/`.
- O que falta: aplicar no fluxo de aprovação de pedido/orçamento e tornar o limite configurável.
- Impacto no negócio: pedidos grandes não sobem para a diretoria como a regra prevê.
- Esforço: M
- Prioridade: P2

#### FE-093  Componentes de pedido órfãos
- Status: ORFA
- Origem e evidência (0 importadores): `components/orders/RevisionRequest.tsx` ("Solicitar Revisão" com respostas rápidas), `OrderTrackingTimeline.tsx` + `MultiLevelTracker.tsx`, `PilotApprovalPanel.tsx` (duplica `OrderPilotWorkflow`), `OrderEmptyState.tsx`, `OrderSkeletonCard.tsx`. Exports sem uso: `hooks/orders/useOrderNotifications.ts:21` (`useOrderStatusNotifications`), `hooks/orders/extensions/useOrderPayments.ts:35` (`getSicoobFinancialDate`), `utils/orderExportUtils.ts:7,55`.
- O que falta: ligar a solicitação de revisão no pedido ou remover os duplicados.
- Impacto no negócio: a solicitação formal de revisão ao fornecedor não existe na tela.
- Esforço: P
- Prioridade: P3

#### FE-095  "Gestão de Compras" com indicadores inventados e aprovação em lote sem ação
- Status: STUB/MOCK
- Origem: `src/pages/GestorCompras.tsx` (rota `/gestor/compras`, `routes/config/sicoob-rbac.ts:14`).
- Evidência no código: `:52-60` mostra "12 pedidos pendentes hoje" e "85% SLA"; `:88-101` mostra "Orçado no mês R$ 450.000,00", "Aprovado R$ 380.000,00" e uma barra fixa de 84%. Tudo literal. `:80-86` traz o botão "Aprovação em Lote (SLA Rápido)" sem `onClick`, com limite fixo de "R$ 5.000,00" no texto.
- O que falta: ligar os KPIs aos pedidos e verbas reais e implementar a aprovação em lote por alçada.
- Impacto no negócio: o gestor da cooperativa toma decisões olhando números falsos.
- Esforço: M
- Prioridade: P1

#### FE-096  Página antiga de aprovações do gestor (com canais e-mail/Slack) órfã
- Status: ORFA
- Origem: `src/pages/GestorApprovalsPage.tsx` (raiz; a rota `/gestor/aprovacoes` usa `pages/sicoob/GestorApprovalsPage.tsx`).
- Evidência no código: 0 importadores. A aba "Canais" (`:361-389`) tem switches de e-mail e Slack e um campo de webhook sem persistência. Aprovar ou reprovar grava direto em `orders` (`:147-187`).
- O que falta: decidir se a notificação por Slack e e-mail do gestor será feita e remover a página duplicada.
- Impacto no negócio: a configuração de canais de alerta prometida não existe.
- Esforço: P (remover) / M (implementar canais)
- Prioridade: P3

#### FE-097  Histórico de aprovações Sicoob (página) órfão
- Status: ORFA
- Origem: `src/pages/quotes/QuoteApprovalHistoryPage.tsx` (usa `useApprovalRequests`).
- Evidência no código: 0 importadores e sem rota.
- O que falta: rotear (ex.: `/gestor/aprovacoes/historico`) ou remover.
- Impacto no negócio: não há consulta consolidada de decisões passadas.
- Esforço: P
- Prioridade: P3

### 10. Clientes

#### FE-100  Tela de Clientes com KPIs fictícios e botões sem ação
- Status: STUB/MOCK
- Origem: `src/pages/ClientsPage.tsx:45` (comentário "Indicadores mockados para demonstração de excelência visual").
- Evidência no código:
  - `:47-50` traz literais: "Novos (Mês)" = 12, "Ticket Médio" = "R$ 4.2k", "Taxa Retenção" = "94%".
  - Sem `onClick`: "Filtros Avançados" (`:89`), "Novo Cliente" (`:92`) e "Adicionar Primeiro Cliente" (`:176`).
  - Ordenação (`:131-142`) fixa em "Nome", com itens sem ação.
  - O CRM é somente leitura: `lib/crm-db.ts:333-402` (`insertCrm`, `updateCrm`, `deleteCrm`) não tem uso.
- O que falta: KPIs reais (já há LTV e ticket por cliente em `ClientDetailPage`), cadastro de cliente (ou remoção do botão, se o CRM externo for a fonte única), filtros e ordenação.
- Impacto no negócio: a tela de clientes passa números falsos e promete um cadastro que não existe.
- Esforço: M
- Prioridade: P1

### 11. Kits

#### FE-110  Salvar kit completo grava status inválido; ciclo de vida do kit não implementado
- Status: PARCIAL
- Origem: trigger `validate_status_fields` em `custom_kits` (status `draft`, `ready`, `shared`, `archived`): `supabase/migrations/20260927200207_duplicate_order_atomic.sql:143-146`, aplicado por `trg_validate_kit_status` (`20260412231951_…sql:61-63`).
- Evidência no código: `src/hooks/useCustomKitPersistence.ts:63` grava `status: kitState.isValid ? 'complete' : 'draft'` (usado em `components/kit-builder/KitPresentablePreview.tsx:39`). Nenhum código produz `ready`, `shared` ou `archived`. A biblioteca de kits (`KitLibraryPage.tsx`) não tem arquivar.
- O que falta: mapear para `ready`, marcar `shared` ao gerar link e permitir arquivar.
- Impacto no negócio: o vendedor recebe erro ao salvar um kit pronto e não consegue organizar kits por estágio.
- Esforço: P
- Prioridade: P1

#### FE-111  Estimativa de frete do kit com tabela fixa
- Status: STUB/MOCK
- Origem: README.md:214 ("Estimativa de frete (SEDEX/PAC)"); `src/components/kit-builder/FreightEstimator.tsx:1-5` ("Tabela interna estimada — sem integração CEP real").
- Evidência no código: `:21-44` traz preços literais por faixa de peso, com "SP Capital" como referência.
- O que falta: integração com transportadora ou Correios por CEP (depende de credencial; há conectores Melhor Envio/Rodonaves no ecossistema).
- Impacto no negócio: o frete apresentado ao cliente pode estar muito diferente do real.
- Esforço: M
- Prioridade: P2

#### FE-112  Comparar kits e dados mock do construtor sem uso
- Status: ORFA
- Origem: `src/components/kit-builder/KitComparisonDialog.tsx` ("Compare 2-3 kits side by side"); `src/lib/kit-builder/mock-data.ts` (`MOCK_BOXES`, `MOCK_ITEMS`, exportados por `lib/kit-builder/index.ts:10-11`); flag `custom_kits_v2: false` (`src/lib/feature-flags.ts:63-66`).
- Evidência no código: 0 importadores para o diálogo e para os nomes mock.
- O que falta: ligar a comparação na biblioteca de kits e remover o mock.
- Impacto no negócio: o vendedor não compara alternativas de kit lado a lado.
- Esforço: P
- Prioridade: P3

### 12. Simulador e preços

#### FE-120  Simulador de Preços, aba "Por Tiragem": preço do produto e seleção ignorados
- Status: STUB/MOCK
- Origem: `src/pages/PriceSimulatorPage.tsx:49-54` (`productBasePrice={0}` e `onSelectTechnique={() => {}}`).
- Evidência no código: `src/components/pricing/QuantityPriceCalculator.tsx:22-29` declara as props, mas a função só desestrutura `className`. A CTA de orçamento cai em FE-087.
- O que falta: usar o preço base e propagar a seleção.
- Impacto no negócio: a comparação por tiragem mostra só a gravação, sem o custo do produto.
- Esforço: P
- Prioridade: P2

#### FE-121  Recursos do simulador antigo (cenários A×B, nicho, upsell) desligados
- Status: ORFA
- Origem e evidência: o cluster está inteiro inalcançável. `hooks/useSimulation.ts`, `components/simulator/ScenarioComparison.tsx` ("Comparativo de Cenários A vs B"), `NicheRecommendationBadge.tsx`, `TechniqueCard.tsx`, `StockAlert.tsx`, `MockupPreview.tsx`, `hooks/useTechniqueRecommendations.ts:77` ("histórico simulado"). Também `components/pricing/simulator/upsell/UpsellPlusPlus.tsx` + `upsell-engine.ts` (sugestões de upsell por faixa de quantidade), `PriceResultV51.tsx`, `QuantityAndResult.tsx`, `StepIndicator.tsx`, `components/personalization/TechniqueSelector.tsx` e `TechniqueSLACard.tsx` (prazo por técnica).
- O que falta: avaliar e portar para o `SimuladorWizard` (upsell e cenários), depois remover o resto.
- Impacto no negócio: sugestões de "leve mais e pague menos por unidade" não aparecem.
- Esforço: M
- Prioridade: P2

#### FE-122  Calculadora didática de personalização sem rota
- Status: ORFA
- Origem: `src/pages/PersonalizationSimulator.tsx` (o rodapé avisa "não consulta as tabelas oficiais").
- Evidência no código: 0 importadores e sem rota.
- O que falta: remover (o wizard cobre o caso de uso).
- Impacto no negócio: nenhum.
- Esforço: P
- Prioridade: P3

#### FE-123  Camada service/repository de personalização sem uso
- Status: ORFA
- Origem: `src/lib/personalization/services/pricing.service.ts` (`calculatePricing`, `calculateBatchPricing`, `comparePricing`, `findBestTechnique`, `calculateQuantitySavings`), `repositories/technique.repository.ts` (CRUD) e `repositories/priceTable.repository.ts`. Também `selectors.ts:82-270`, `transformers.ts:320-370` e `validators.ts:94-300` sem uso. O README.md:166 cita "Engine de cálculo de personalização".
- Evidência no código: inalcançáveis pelo grafo (o app usa só os `adapters`).
- O que falta: decidir a arquitetura (usar a camada ou removê-la).
- Impacto no negócio: dívida técnica e risco de cálculo divergente.
- Esforço: M
- Prioridade: P3

### 13. Mockup, IA e Match

#### FE-130  "Assistente IA" do Gerador de Mockup é simulado
- Status: STUB/MOCK
- Origem: `src/components/ai/AIMockupAssistant.tsx`, renderizado em `src/pages/MockupGenerator.tsx:41,420`.
- Evidência no código: `:70-90` tem o comentário "// Simulate AI response" e responde com uma de 4 frases fixas sorteadas por `Math.random()` depois de `setTimeout(1500)`. As ações rápidas (`:33-36`) têm `action: () => {}` e respostas fixas (`:104-109`). A prop `onSuggestionApply` nunca é usada. Já existe chat real com streaming (`src/components/ai/AIChat.tsx:90` → `expert-chat`) e `AIRecommendationsPanel`, mas os dois estão órfãos (só em `components/ai/index.ts:2-4`).
- O que falta: ligar o assistente ao `expert-chat` com o contexto de produto e técnica, ou remover.
- Impacto no negócio: o usuário acredita receber orientação de IA e recebe texto genérico aleatório.
- Esforço: M
- Prioridade: P1

#### FE-131  "Visualizar com Logo" não pré-seleciona o produto no gerador
- Status: PARCIAL
- Origem: `src/components/products/ProductCategoryBadges.tsx:76` (`navigate("/mockup-generator", { state: { preSelectedProduct } })`).
- Evidência no código: `src/hooks/useMockupGenerator.ts:154-166,350` só lê `?product_id=` e `?technique=` da URL e ignora `location.state` (o kit-builder usa a URL corretamente, `KitCompositionCard.tsx:87`).
- O que falta: usar `?product_id=` no badge.
- Impacto no negócio: o vendedor precisa procurar o produto de novo no gerador.
- Esforço: P
- Prioridade: P2

#### FE-132  Match recorre a 24 produtos fictícios e analisa no máximo 500 produtos
- Status: STUB/MOCK
- Origem: `src/pages/ProductMatchPage.tsx:30-32`.
- Evidência no código: `useProducts({ limit: 500 })`. Se a lista vier vazia (por erro, carregamento ou ponte fora do ar), usa `MOCK_MATCH_PRODUCTS` (`src/data/mock-match-products.ts`, imagens `/placeholder.svg`, preços inventados). O catálogo tem mais de 6.100 itens (README.md:50).
- O que falta: tirar o fallback mock, buscar no servidor e cobrir o catálogo inteiro.
- Impacto no negócio: pode sugerir produto inexistente e deixa de achar similares fora dos primeiros 500.
- Esforço: M
- Prioridade: P2

### 14. Tendências, inteligência e BI

#### FE-140  Tendências abre com dados fictícios para todos
- Status: STUB/MOCK
- Origem: `src/pages/trends/is-demo-mode.ts:1-12` ("Demo ligado por padrão… Para desligar: /tendencias?demo=0").
- Evidência no código: `src/pages/TrendsPage.tsx:205` (`demo = isDemoMode()`), `:236-279` (KPIs, produtos, buscas e série diária vêm de `trends-mock.ts`), `:438-444` (carrega o módulo mock), `:556` (banner "MODO DEMO — dados fictícios"). As consultas reais (`queryEnabled: !demo`) ficam desligadas por padrão. O item "Tendências" está na sidebar (`SidebarReorganized.tsx:178`).
- O que falta: inverter o padrão (dados reais, demo opcional) e validar as consultas reais.
- Impacto no negócio: a área de "insights" mostra tendências inventadas a vendedores e gestores.
- Esforço: P
- Prioridade: P1

#### FE-141  Inteligência Comercial: oportunidades e tendência de receita sem tela
- Status: ORFA
- Origem: `src/hooks/useCommercialIntelligence.ts:335` (`useOpportunities`) e `:377` (`useRevenueTrend`).
- Evidência no código: nenhum consumidor. `src/pages/CommercialIntelligencePage.tsx:4-14` monta KPIs, tendências, ranking e fornecedores, mas não esses dois.
- O que falta: cards "Oportunidades" e "Receita no período".
- Impacto no negócio: a principal pergunta comercial ("onde estou perdendo venda?") fica sem resposta na tela.
- Esforço: P
- Prioridade: P2

#### FE-142  BI com cliente de demonstração
- Status: STUB/MOCK
- Origem: `src/pages/BusinessIntelligencePage.tsx:217-245` (botão "Visualizar com dados demo", cliente fictício "Acme Brindes", banner "dados simulados em todas as zonas").
- Evidência no código: intencional e rotulado (`lib/bi/demoClient`, fora da fatia).
- O que falta: decidir se o demo fica em produção.
- Impacto no negócio: baixo, porque está rotulado.
- Esforço: P
- Prioridade: P3

#### FE-143  Metas de vendas prontas e não exibidas
- Status: ORFA
- Origem: `src/components/goals/SalesGoalsCard.tsx` + `src/hooks/useSalesGoals.ts:91-229` (CRUD em `sales_goals`, tabela em `types.ts:8555`).
- Evidência no código: 0 importadores (`lib/validations/goalSchema.ts` também está órfão).
- O que falta: colocar o card no dashboard do vendedor ou em `/dashboard`.
- Impacto no negócio: o vendedor não acompanha a meta do mês dentro do portal.
- Esforço: P
- Prioridade: P2

### 15. Notificações e relatórios

#### FE-150  Push e sincronização offline do PWA não implementados
- Status: NAO_INICIADA
- Origem: `public/sw.js:149` ("Push notifications (para futura implementação)"), `:193-206` ("Background sync (para futura implementação)", `syncQuotes()` com `// TODO: Implementar lógica de sync`); `src/lib/sw-register.ts:76-92` (`requestNotificationPermission`, "para futura implementação").
- Evidência no código: `requestNotificationPermission` nunca é chamada. Não há assinatura de push nem `SyncManager`. O SW usa ícones inexistentes (`/icon-192x192.png`, `/icon-72x72.png`, `/icon-96x96.png`; em `public/` só há `favicon.svg`/`.ico`) e título "Gifts Store".
- O que falta: assinatura Web Push (VAPID e backend), envio e fila offline de orçamentos.
- Impacto no negócio: o gestor no celular não é avisado na hora de aprovações pendentes.
- Esforço: G
- Prioridade: P2

#### FE-151  Relatórios agendados sem disparo
- Status: PARCIAL
- Origem: `src/components/reports/ScheduledReportsManager.tsx` (widget "Relatórios Agendados" em `CustomizableDashboard.tsx:60,72`), `src/hooks/useScheduledReports.ts:47`.
- Evidência no código: a UI grava agendamentos, mas nenhuma migration agenda `process-scheduled-reports`/`send-scheduled-reports` (declaradas em `supabase/config.toml:50-53`). O envio depende de `RESEND_API_KEY` (`supabase/functions/send-scheduled-reports/index.ts:24`).
- O que falta: cron e credencial do provedor de e-mail.
- Impacto no negócio: o usuário agenda um relatório semanal que nunca chega.
- Esforço: P (cron) + credencial
- Prioridade: P2

### 16. Autenticação e conta

#### FE-160  Login social (Google/SSO) desligado
- Status: ORFA
- Origem: README.md:229 ("Google OAuth como login social"); `docs/SCOPE_ALIGNMENT.md` ("Email/SSO Sicoob").
- Evidência no código: `src/components/auth/SocialLoginButtons.tsx` tem 0 importadores, e o `redirect_uri` aponta para `/auth/callback` (`:24`), que não existe. A rota real é `/sso/callback` (`src/routes/config/public.ts:36-39`, página `SSOCallbackPage.tsx`). `src/pages/Auth.tsx:172,421-438` mantém o banner "Fallback social → email/senha" ativo. `src/integrations/lovable/index.ts` só é usado pelo componente órfão.
- O que falta: decisão sobre o provedor (Google ou SSO Sicoob), botão na tela de login e redirect correto.
- Impacto no negócio: o usuário depende de senha própria em vez do login corporativo.
- Esforço: P (técnico) + decisão
- Prioridade: P2

#### FE-161  Passkeys/biometria: hook stub
- Status: STUB/MOCK
- Origem: `docs/AUTH_PASSKEYS.md` (roadmap: challenge no backend e verificação de assinatura).
- Evidência no código: `src/hooks/useWebAuthn.ts:1-33` retorna `isSupported: false` e funções que sempre negam. `src/components/auth/PasskeyLogin.tsx` está órfão. `components/security/PasskeyManager.tsx` (fora da fatia) usa o stub.
- O que falta: Edge Function de challenge e verificação, integração com o Supabase Auth.
- Impacto no negócio: sem login por biometria (o SCOPE_ALIGNMENT considera baixa prioridade).
- Esforço: G
- Prioridade: P3

#### FE-162  Login rápido de personas de teste órfão (com senha padrão)
- Status: ORFA
- Origem: `src/components/auth/QuickTestLogin.tsx:11` (`VITE_SICOOB_TEST_USER_PASSWORD || "password123"`).
- Evidência no código: 0 importadores; as variáveis `VITE_SICOOB_TEST_*` estão declaradas em `src/vite-env.d.ts:7-11`.
- O que falta: remover ou restringir a DEV. Não ligar em produção.
- Impacto no negócio: risco de segurança se for ligado por engano.
- Esforço: P
- Prioridade: P3

### 17. Layout, PWA, atalhos e onboarding

#### FE-170  PWA não instalável e "Instalar App" leva a 404
- Status: PARCIAL
- Origem: `public/manifest.json`; `src/hooks/usePWAInstall.ts:24` (`beforeinstallprompt`); `src/components/layout/Header.tsx:118` (item "Instalar App" → `/instalar`); `src/pages/PWAInstallPage.tsx` (página `path="/instalar"`).
- Evidência no código: `index.html:1-27` não tem `<link rel="manifest">` (só `rel="icon"` na linha 26), então o navegador não dispara o prompt. O manifest só tem ícones SVG/ICO (`:10-28`) e um screenshot hospedado no preview Lovable (`:31-37`). Não há rota `/instalar` e `PWAInstallPage` está órfã.
- O que falta: link do manifest, ícones PNG 192/512 e apple-touch-icon, e a rota `/instalar`.
- Impacto no negócio: PAs e gestores não conseguem instalar o portal no celular.
- Esforço: P
- Prioridade: P2

#### FE-171  Atalhos de teclado anunciados que não funcionam ou conflitam
- Status: STUB/MOCK
- Origem: tooltips do header (`Header.tsx:113`: Favoritos Alt+F, Comparar Alt+C, Tema Alt+T); docstring de `src/hooks/useGlobalShortcuts.ts:1-14`.
- Evidência no código:
  - Alt+C e Alt+T não estão implementados.
  - Alt+F leva ao Super Filtro (`SidebarReorganized.tsx:146`), não a Favoritos.
  - Alt+O tem dois donos: carrinho (`CartHeaderButton.tsx:67`) e Meus Orçamentos (`SidebarReorganized.tsx:128`).
  - Ctrl+Shift+C ("Open cart") faz `preventDefault` e chama `handlers?.onToggleCart`, mas o `MainLayout.tsx:104` não passa handlers.
  - Ctrl+K tem três ouvintes (FE-007).
- O que falta: implementar e desconflitar os atalhos e publicar a folha de atalhos.
- Impacto no negócio: atrito pequeno para usuários avançados.
- Esforço: P
- Prioridade: P3

#### FE-172  Tour de onboarding aponta para elementos inexistentes
- Status: PARCIAL
- Origem: `src/constants/onboarding.ts:48` (`[data-tour='clients']`), `:87` (`[data-tour='notifications']`), `:116` (texto do botão de ajuda).
- Evidência no código: só existem `data-tour` em sidebar, search, products, quotes e alguns do BI. Não há `clients` nem `notifications` (busca por `data-tour=` em `src/`).
- O que falta: marcar os elementos e corrigir o texto final.
- Impacto no negócio: o tour pula ou se perde nos passos de clientes e notificações.
- Esforço: P
- Prioridade: P3

#### FE-173  Navegação mobile sem as áreas Sicoob
- Status: PARCIAL
- Origem: `src/components/mobile/SmartMobileNav.tsx:17-31`.
- Evidência no código: a barra inferior e o FAB cobrem Início, Produtos, Orçamentos, Carrinhos, Favoritos, Mockup, Simulador e Coleções. Não há Pedidos Sicoob, Painel PA nem Painel Gestor, que são os destinos pós-login de PA, gestor e vendedor (`auth-utils.ts:57-75`).
- O que falta: itens da barra por papel.
- Impacto no negócio: o gerente de PA no celular precisa abrir o menu lateral para chegar ao que usa todo dia.
- Esforço: P
- Prioridade: P3

### 18. Feature flags e variáveis de ambiente

#### FE-180  Registro de feature flags inteiro órfão
- Status: ORFA
- Origem: `src/lib/feature-flags.ts:1-10` ("Para ativar/desativar, basta alterar o valor default ou configurar via Supabase").
- Evidência no código: 0 importadores de `isFeatureEnabled`, `getAllFlags` e `setFeatureFlag`. Flags e defaults:
  - `mfa=false`
  - `ai_recommendations=true`
  - `presentation_mode=true`
  - `voice_commands=true`
  - `magic_up=true`
  - `e2e_tests=false`
  - `advanced_analytics=true`, restrita a `['admin','manager']`, papéis que `normalizeAssignedRoles` converte em `supervisor` (`role-policy.ts:7-9`), então a restrição nunca bate.
  - `custom_kits_v2=false` ("Nova versão do montador de kits", não iniciada)
  - `canary_release=false` (release gradual, não iniciada)

  A "configuração via Supabase" não existe. A única flag efetiva do app é a constante de build `__ENABLE_DEMO_PAGES__` (`vite.config.ts:27-31`, `src/routes/config/public.ts:1,10-19`): falsa em produção, desliga `/loja-demo` e `/demonstracao`.
- O que falta: decidir entre usar o registro (com fonte remota) ou removê-lo; documentar `__ENABLE_DEMO_PAGES__`.
- Impacto no negócio: não há como ligar ou desligar funcionalidades por cooperativa ou piloto sem novo deploy.
- Esforço: M
- Prioridade: P3

#### FE-181  Variáveis de ambiente usadas e não documentadas (Sentry desligado)
- Status: BLOQUEADA_EXTERNA
- Origem: `.env.production.example` (só `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`); `.env.e2e.example` (só `E2E_*`).
- Evidência no código (variáveis usadas em `src/` e ausentes dos exemplos):

| Variável | Uso | Default sem a variável |
|---|---|---|
| `VITE_SENTRY_DSN` | `src/lib/sentry.ts:27,41` | Sentry não inicializa; erros de produção não chegam a nenhum painel externo. `setSentryUser` (`:115`) nunca é chamado. |
| `VITE_APP_ENCRYPTION_KEY` | `src/services/encryption.ts:87,92` (órfão) | segredo fixo `'sicoob-fallback-secret-2026'` |
| `VITE_DEV_CONTACT_EMAIL` | `src/lib/access/request-dev-access.ts:23-24` | `dev@promogifts.com.br` |
| `VITE_ENABLE_DEMO_PAGES` | `vite.config.ts:29`, `pages/sicoob/*DemoPage.tsx` | demos desligadas |
| `VITE_LOVABLE_PREVIEW` | `src/lib/diagnostics.ts:153,187-189` | — |
| `VITE_SHOW_DEV_INFRA_MESSAGES` | `src/lib/system/dev-gate/providers.ts:27` | `auto` |
| `VITE_SICOOB_TEST_EMAIL_*`, `VITE_SICOOB_TEST_USER_PASSWORD` | `QuickTestLogin.tsx` (órfão), `src/vite-env.d.ts:7-11` | `password123` |

- O que falta: o DSN do Sentry (credencial) e a documentação das variáveis no exemplo e em `docs/secrets.md`.
- Impacto no negócio: falhas em produção passam sem alerta.
- Esforço: P
- Prioridade: P2

#### FE-182  Criptografia de PII no cliente órfã (e com segredo público)
- Status: ORFA
- Origem: `src/services/encryption.ts:1-5` ("Used to protect PII before storage in accordance with P2 audit gap").
- Evidência no código: 0 importadores de `protectPII` e `revealPII`. A chave vem de variável `VITE_` (exposta no bundle), com fallback literal (`:87,92`).
- O que falta: decidir onde proteger PII (no servidor, com pgsodium ou Vault). Não ligar como está.
- Impacto no negócio: a lacuna de auditoria P2 continua aberta.
- Esforço: M
- Prioridade: P3

### 19. Outros módulos

#### FE-190  Navegador Dropbox depende de token, só lista e não está no menu
- Status: BLOQUEADA_EXTERNA
- Origem: rota `/dropbox` (`src/routes/config/products.ts:73-76`), `src/pages/DropboxBrowserPage.tsx` ("Navegue e gerencie arquivos").
- Evidência no código: `src/hooks/useDropboxFiles.ts:30,45` só tem as ações `check` e `list`; não há download, upload nem anexo a mockup. `supabase/functions/dropbox-list/index.ts:34-46` exige `DROPBOX_ACCESS_TOKEN`. Sem entrada no menu (FE-009).
- O que falta: o token, as ações de arquivo e o vínculo com mockups e pedidos.
- Impacto no negócio: as artes dos clientes continuam fora do portal.
- Esforço: M
- Prioridade: P3

#### FE-191  Painel "Saúde dos Testes & CI" com números fixos
- Status: STUB/MOCK
- Origem: `src/pages/TestDashboard.tsx:10` ("This page simulates a test dashboard that would read from CI artifacts"), rota `/admin/saude-testes` (`App.tsx:124`).
- Evidência no código: `:12-27` traz cobertura e resultados Playwright literais; `:47` mostra o badge "Pipeline: Sucesso" fixo; `:58` mostra "754" testes; `:165-170` tem botões sem ação.
- O que falta: ler artefatos do CI (GitHub Actions) ou remover.
- Impacto no negócio: dá falsa sensação de qualidade a quem audita.
- Esforço: M
- Prioridade: P2

#### FE-192  Exportação Excel da lista de clientes (guia de integração não executado)
- Status: NAO_INICIADA
- Origem: `docs/EXCEL_INTEGRATION_GUIDE.md:3-8` (diz que `src/components/export/ExportExcelButton.tsx` já foi criado) e `:70-98` ("3. ClientList").
- Evidência no código: `src/components/export/` não existe. `ClientsPage.tsx` não exporta nada. `src/utils/excelExport.ts:135` (`exportMultipleSheets`) não tem uso. Orçamentos e pedidos exportam por outro caminho.
- O que falta: exportar clientes e atualizar o guia.
- Impacto no negócio: a base de clientes não sai do portal para planilha.
- Esforço: P
- Prioridade: P3

#### FE-193  Utilitários de infraestrutura planejados sem uso
- Status: ORFA
- Origem e evidência (0 importadores ou exports sem uso):
  - `src/lib/admin-export-utils.ts` (`exportToExcel`/`importFromExcel` genéricos)
  - `src/lib/audit-logger.ts` (`logAdminAction`)
  - `src/lib/storage-resilience.ts` (fallback entre buckets)
  - `src/lib/print-area-grouping.ts`
  - `src/lib/theme-presets.ts:1030-1034` (`exportThemeConfig`/`importThemeConfig`, sem import/export de skin)
  - `src/utils/resilience.ts:90-96` (circuit breakers `erp`, `ai` e `database` sem uso; ERP não integrado)
  - `src/utils/templateExport.ts:91` (`readTemplateFile`, sem importação de templates de arquivo)
  - `src/utils/quotePdfUtils.ts` (`generateQuotePDF`), `src/utils/quote-data-mapper.ts`, `src/utils/formatters.ts`
  - `src/lib/navigation/filter-dev-only-items.ts`, `src/lib/system/dev-infra-messages.ts` (deprecado)
- O que falta: remover ou ligar (ex.: importação de templates e de skins).
- Impacto no negócio: dívida técnica.
- Esforço: P
- Prioridade: P3

#### FE-194  Cadastro de ramos e segmentos de atividade sem tela
- Status: ORFA
- Origem: `src/hooks/useRamoAtividade.ts:16-108` e `src/hooks/useRamoAtividadeFilho.ts:16-132` (listar, criar, atualizar, excluir e ativar ramos e segmentos).
- Evidência no código: nenhum consumidor. No admin só existe a associação produto↔ramo (`components/admin/products/ProductRamosSection.tsx`). Os hooks `useProdutoRamoAtividade.ts` e `useProdutoPersonalizacao.ts` também estão órfãos.
- O que falta: uma tela de manutenção da taxonomia, que hoje alimenta o filtro "Ramos/Segmentos".
- Impacto no negócio: a taxonomia de público só muda por banco.
- Esforço: P
- Prioridade: P3

#### FE-195  Bloqueio geográfico por país gravado como cidade ("provisório")
- Status: PARCIAL
- Origem: `src/hooks/useGeoBlocking.ts:103` ("Temporariamente usando countryName como city_name para compatibilidade de UI").
- Evidência no código: `addCountry` insere em `city_whitelist` (`:99-106`). Não há tabela nem modelo de país. O `docs/SCOPE_ALIGNMENT.md` classifica geo-blocking como baixa prioridade.
- O que falta: um modelo próprio de país (ou abandonar a funcionalidade).
- Impacto no negócio: whitelist ambígua (cidade e país misturados).
- Esforço: P
- Prioridade: P3

### 20. Tipos e enums com estados planejados que nenhum código produz (consolidado)

| Tipo / enum | Valores sem produtor no frontend | Item |
|---|---|---|
| `SearchResultType` (`components/search/useGlobalSearch.ts:27-42`) | quote, order, collection, kit, mockup, art_file, cart_template, reminder, conversation, magic_up, category, component, media | FE-040 |
| `EmailEventType` (`hooks/useTransactionalEmail.ts:6-11`) | quote_sent, quote_approved, quote_rejected, order_created (e o endpoint responde 501) | FE-086 |
| status de `custom_kits` (trigger) | ready, shared, archived; o front grava `complete` (inválido) | FE-110 |
| `quote_status` (enum do banco, 13 valores) | o Kanban mostra só 5; `revision` e `viewed` sem rótulo em `lib/quote-status-config.ts`; `types/quote.ts:4` desatualizado | FE-080 |
| `FeatureFlag` (`lib/feature-flags.ts:12-21`) | nenhuma flag é lida | FE-180 |
| `RecentItem.type` (`components/command/commandActions.tsx:33`) | product, client, quote | FE-007 |
| `QuantityPriceCalculatorProps` (`components/pricing/QuantityPriceCalculator.tsx:22-27`) | `productBasePrice`, `productName`, `onSelectTechnique` declarados e ignorados | FE-120 |
| `AIMockupAssistantProps.onSuggestionApply` (`components/ai/AIMockupAssistant.tsx:28`) | nunca invocado | FE-130 |

---

## Apêndice: lista bruta de componentes, hooks e páginas órfãos (arquivo + export)

### A. Arquivos da fatia inalcançáveis a partir de `src/main.tsx`

Método: o script `<scripts-da-auditoria>/graph.mjs` (Node puro, alias `@/` → `src/`) percorre a partir de `src/main.tsx` os imports estáticos, os `import()` dinâmicos (com granularidade por nome em `.then(m => ({ default: m.X }))` e `const { X } = await import()`), os re-exports `export * / export { } from` (resolvidos por nome, para não marcar um arquivo de barrel como usado à toa) e os side-effect imports. Testes (`*.test.*`, `__tests__`, `src/test(s)`) e `vi.mock` não contam como importadores. "0 importadores" significa que nenhum arquivo não-teste importa o arquivo. "Só importado por órfão" significa que o importador também é inalcançável. Componentes shadcn em `src/components/ui/*` que só aparecem pelo barrel `ui/index.ts` são inofensivos (kit de UI). O resto aponta para funcionalidade planejada e não ligada.

| Arquivo | Exports | Situação |
|---|---|---|
| `src/components/BridgeStatusBanner.tsx` | (barrel/re-export) | 0 importadores |
| `src/components/LoadingScreen.tsx` | (barrel/re-export) | 0 importadores |
| `src/components/ai/AIChat.tsx` | ChatMessage, ProductMention, AIChatProps, AIChat | só importado por órfão: components/ai/index.ts |
| `src/components/ai/AIRecommendationsPanel.tsx` | AIRecommendationsPanelProps, AIRecommendationsPanel | só importado por órfão: components/ai/index.ts |
| `src/components/audit/AuditHistory.tsx` | AuditHistory | só importado por órfão: components/audit/index.ts, pages/admin/AdminProductFormPage.tsx |
| `src/components/audit/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/auth/PasskeyLogin.tsx` | PasskeyLogin | 0 importadores |
| `src/components/auth/QuickTestLogin.tsx` | QuickTestLogin | 0 importadores |
| `src/components/auth/SocialLoginButtons.tsx` | SocialLoginButtons | 0 importadores |
| `src/components/cart/BundleSuggestionCard.tsx` | BundleSuggestionCard | 0 importadores |
| `src/components/cart/CouponInput.tsx` | CouponInput | só importado por órfão: components/cart/MiniCart.tsx |
| `src/components/cart/MiniCart.tsx` | MiniCart | 0 importadores |
| `src/components/categories/CategorySidebarPanel.tsx` | CategorySidebarPanel, default | só importado por órfão: components/categories/index.ts |
| `src/components/categories/CategoryTreeNavigation.tsx` | CategoryTreeNavigation, default | só importado por órfão: components/categories/CategoryTreeNavigator.tsx, components/categories/index.ts |
| `src/components/categories/CategoryTreeNavigator.tsx` | (barrel/re-export) | 0 importadores |
| `src/components/categories/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/common/GlassElements.tsx` | GlassCard, GlassPanel, GlassOverlay, GlassButton, GlassHeader, GlassSidebar, … | 0 importadores |
| `src/components/common/GlobalMotionOverlay.tsx` | GlobalMotionOverlay | 0 importadores |
| `src/components/common/ImageWithFallback.tsx` | ImageWithFallback | 0 importadores |
| `src/components/common/StatusTimeline.tsx` | StatusTimeline, HorizontalStatusBar, CurrentStatus | 0 importadores |
| `src/components/compare/ComparisonShortcutsCheatsheet.tsx` | ComparisonShortcutsCheatsheet | 0 importadores |
| `src/components/compare/ComparisonWeightsPopover.tsx` | ComparisonWeightsPopover | 0 importadores |
| `src/components/compare/FocusModeToggle.tsx` | useFocusMode, FocusModeToggle | 0 importadores |
| `src/components/compare/HistoricalPriceOverlay.tsx` | HistoricalPriceOverlay | 0 importadores |
| `src/components/compare/ImageZoomCell.tsx` | ImageZoomCell | 0 importadores |
| `src/components/compare/SortableColumnWrapper.tsx` | SortableColumnWrapper | 0 importadores |
| `src/components/effects/MiniConfetti.tsx` | MiniConfetti | só importado por órfão: components/effects/SuccessCelebration.tsx, components/effects/index.ts |
| `src/components/effects/SkeletonTransition.tsx` | SkeletonTransition | 0 importadores |
| `src/components/effects/SuccessCelebration.tsx` | SuccessCelebration | só importado por órfão: components/effects/index.ts |
| `src/components/effects/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/engraving/PricingPanel.tsx` | PricingPanel | só importado por órfão: pages/EngravingRegistrationPage.tsx |
| `src/components/engraving/TechniquesPanel.tsx` | TechniquesPanel | só importado por órfão: pages/EngravingRegistrationPage.tsx |
| `src/components/favorites/QuickListPicker.tsx` | QuickListPicker | 0 importadores |
| `src/components/filters/FilterSection.tsx` | FilterSection | 0 importadores |
| `src/components/filters/SavedFilters.tsx` | SavedFilter, SavedFiltersProps, useSavedFilters, SavedFilters, FilterChipProps, FilterChip, … | só importado por órfão: components/filters/index.ts |
| `src/components/filters/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/goals/SalesGoalsCard.tsx` | SalesGoalsCard | 0 importadores |
| `src/components/kit-builder/KitComparisonDialog.tsx` | KitComparisonDialog | 0 importadores |
| `src/components/layout/LayoutComponents.tsx` | Container, Section, Grid, Stack, Divider, Spacer, … | só importado por órfão: components/layout/index.ts |
| `src/components/layout/PageHeader.tsx` | PageHeader, PageHeaderCompact | 0 importadores |
| `src/components/layout/PanelComponents.tsx` | SidePanel, CollapsibleSidebar, ResizablePanelGroup, ExpandablePanel | só importado por órfão: components/layout/index.ts |
| `src/components/layout/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/loading/LoadingOverlay.tsx` | LoadingOverlay, Spinner, LoadingDots, ProgressLoader | só importado por órfão: components/loading/index.ts |
| `src/components/loading/SkeletonShimmer.tsx` | SkeletonShimmer, TextSkeleton, CardSkeleton, TableRowSkeleton, TableSkeleton, AvatarSkeleton, … | só importado por órfão: components/loading/index.ts |
| `src/components/loading/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/mobile/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/navigation/Breadcrumbs.tsx` | BreadcrumbItem, Breadcrumbs, useBreadcrumbs | só importado por órfão: components/layout/PageHeader.tsx |
| `src/components/navigation/DynamicBreadcrumbs.tsx` | DynamicBreadcrumbs, CompactBreadcrumbs | 0 importadores |
| `src/components/navigation/FlowProgressBar.tsx` | FlowProgressBar | 0 importadores |
| `src/components/novelties/NoveltiesSection.tsx` | NoveltiesSection | 0 importadores |
| `src/components/onboarding/RestartTourButton.tsx` | RestartTourButton | só importado por órfão: components/onboarding/index.ts |
| `src/components/onboarding/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/orders/MultiLevelTracker.tsx` | MultiLevelTracker | só importado por órfão: components/orders/OrderTrackingTimeline.tsx |
| `src/components/orders/OrderEmptyState.tsx` | OrderEmptyState | 0 importadores |
| `src/components/orders/OrderSkeletonCard.tsx` | OrderSkeletonCard | 0 importadores |
| `src/components/orders/OrderTrackingTimeline.tsx` | OrderTrackingTimeline | 0 importadores |
| `src/components/orders/PilotApprovalPanel.tsx` | PilotApprovalPanel | 0 importadores |
| `src/components/orders/RevisionRequest.tsx` | RevisionRequest | 0 importadores |
| `src/components/personalization/TechniqueSLACard.tsx` | TechniqueSLACard | só importado por órfão: components/personalization/index.ts |
| `src/components/personalization/TechniqueSelector.tsx` | TechniqueSelector | só importado por órfão: components/personalization/index.ts |
| `src/components/personalization/ThemeCustomization.tsx` | ThemeCustomizationValue, ThemeCustomization | 0 importadores |
| `src/components/personalization/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/pricing/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/pricing/simulator/PriceResultV51.tsx` | PriceResultV51, QuoteCodeBadge | só importado por órfão: components/pricing/simulator/index.ts |
| `src/components/pricing/simulator/QuantityAndResult.tsx` | QuantityAndResult | só importado por órfão: components/pricing/simulator/index.ts |
| `src/components/pricing/simulator/StepIndicator.tsx` | StepIndicator | só importado por órfão: components/pricing/simulator/index.ts |
| `src/components/pricing/simulator/upsell/UpsellPlusPlus.tsx` | UpsellPlusPlus, default | só importado por órfão: components/pricing/simulator/upsell/index.ts |
| `src/components/pricing/simulator/upsell/index.ts` | (barrel/re-export) | só importado por órfão: components/pricing/simulator/index.ts |
| `src/components/pricing/simulator/upsell/upsell-engine.ts` | UpsellType, UpsellPriority, UpsellSuggestion, QUANTITY_TIERS, generateSuggestions | só importado por órfão: components/pricing/simulator/upsell/UpsellPlusPlus.tsx, components/pricing/simulator/upsell/index.ts |
| `src/components/products/EnhancedProductCard.tsx` | EnhancedProductCard | só importado por órfão: components/products/index.ts |
| `src/components/products/KitVisualComposition.tsx` | KitItem, KitVisualComposition | 0 importadores |
| `src/components/products/PriceHistoryChart.tsx` | PricePoint, PriceHistoryChart | 0 importadores |
| `src/components/products/ProductHoverPreview.tsx` | ProductHoverPreview | só importado por órfão: components/products/index.ts |
| `src/components/products/ProductIntelligence.tsx` | ProductIntelligence | só importado por órfão: components/products/index.ts |
| `src/components/products/ProductSectionNav.tsx` | ProductSectionNav | 0 importadores |
| `src/components/products/ProductVariations.tsx` | ProductVariation, ProductVariations | 0 importadores |
| `src/components/products/RecentlyViewedBar.tsx` | RecentlyViewedBar | só importado por órfão: components/products/index.ts |
| `src/components/products/RelatedProducts.tsx` | RelatedProducts, RecommendedProducts | só importado por órfão: components/products/index.ts |
| `src/components/products/VariantGridMatrix.tsx` | VariantGridItem, BulkAction, VariantGridMatrix | só importado por órfão: components/admin/products/ProductVariantsSection.tsx, components/admin/products/useProductVariants.ts |
| `src/components/products/ZoomableGallery.tsx` | ZoomableGallery | só importado por órfão: components/products/index.ts |
| `src/components/products/customization/ConfigurationPanel.tsx` | ConfigurationPanel | só importado por órfão: components/products/customization/LocationCard.tsx |
| `src/components/products/customization/LocationCard.tsx` | LocationGroupData, LocationCard | só importado por órfão: components/products/customization/index.ts |
| `src/components/products/customization/TechniqueOption.tsx` | TechniqueOptionProps, TechniqueOption | só importado por órfão: components/products/customization/LocationCard.tsx, components/products/customization/index.ts |
| `src/components/products/customization/VariationSelector.tsx` | VariationSelector | só importado por órfão: components/products/customization/LocationCard.tsx |
| `src/components/products/customization/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/products/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/products/variant-grid/BulkToolbar.tsx` | BulkToolbar | só importado por órfão: components/products/VariantGridMatrix.tsx |
| `src/components/products/variant-grid/VariantGridHelpers.ts` | SIZE_ORDER, getSizeOrder, isLightColor, formatStock, stockColor | só importado por órfão: components/products/VariantGridMatrix.tsx |
| `src/components/products/zoomable-gallery/GalleryThumbnails.tsx` | GalleryThumbnails, FullscreenThumbnails, BlurThumb | só importado por órfão: components/products/ZoomableGallery.tsx |
| `src/components/products/zoomable-gallery/GalleryToolbar.tsx` | GalleryToolbar | só importado por órfão: components/products/ZoomableGallery.tsx |
| `src/components/products/zoomable-gallery/useGalleryZoom.ts` | useGalleryZoom | só importado por órfão: components/products/ZoomableGallery.tsx |
| `src/components/quote/MarginInsightBadge.tsx` | MarginInsightBadge | 0 importadores |
| `src/components/quotes/ClientPicker.tsx` | ClientData, ClientPicker | 0 importadores |
| `src/components/quotes/ItemsListEditor.tsx` | QuoteItemRow, ItemsListEditor | 0 importadores |
| `src/components/quotes/OneClickReorderQuote.tsx` | OneClickReorderQuote | só importado por órfão: components/quotes/QuoteCard.tsx |
| `src/components/quotes/QuoteCard.tsx` | QuoteCardData, QuoteCard | 0 importadores |
| `src/components/quotes/QuoteFilters.tsx` | QuoteFiltersValue, QuoteFilters | 0 importadores |
| `src/components/quotes/QuoteItemsList.tsx` | QuoteItemsList | 0 importadores |
| `src/components/quotes/QuoteMetricsDashboard.tsx` | QuoteMetricsDashboard | 0 importadores |
| `src/components/quotes/QuotePersonalizationSelector.tsx` | QuotePersonalizationSelector | 0 importadores |
| `src/components/quotes/QuoteShareDialog.tsx` | QuoteShareDialog | 0 importadores |
| `src/components/quotes/QuoteTemplatePicker.tsx` | QuoteTemplatePicker | 0 importadores |
| `src/components/ramo-atividade/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/search/AdvancedSearch.tsx` | AdvancedSearch | só importado por órfão: components/search/index.ts |
| `src/components/search/GlobalSearch.tsx` | GlobalSearch, useGlobalSearch | 0 importadores |
| `src/components/search/SearchWithSuggestions.tsx` | SearchWithSuggestions | só importado por órfão: components/search/index.ts |
| `src/components/search/SmartSuggestions.tsx` | SmartSuggestions, InlineSuggestions, SmartFilters | 0 importadores |
| `src/components/search/VisualSearchButton.tsx` | VisualSearchButton | só importado por órfão: components/search/AdvancedSearch.tsx, components/search/index.ts |
| `src/components/search/voice/VoiceOverlaySections.tsx` | VoiceSuggestions, VoiceTextInput, VoiceOverlayFooter | 0 importadores |
| `src/components/simulation/SimulationPriceSourceBadge.tsx` | SimulationPriceSourceBadgeProps, SimulationPriceSourceBadge | 0 importadores |
| `src/components/simulator/MockupPreview.tsx` | MockupPreview | 0 importadores |
| `src/components/simulator/NicheRecommendationBadge.tsx` | NicheRecommendationBadge, useNicheRecommendations | 0 importadores |
| `src/components/simulator/ScenarioComparison.tsx` | SimulationScenario, ScenarioComparison | só importado por órfão: hooks/useSimulation.ts |
| `src/components/simulator/StockAlert.tsx` | StockAlert, StockBadge | 0 importadores |
| `src/components/simulator/TechniqueCard.tsx` | TechniqueCard | 0 importadores |
| `src/components/simulator/TechniqueCardHelpers.tsx` | TECHNIQUE_THUMBNAILS, getTechniqueStyle, getTechniqueThumbnail, getSlaInfo, TechniquePreview | só importado por órfão: components/simulator/TechniqueCard.tsx |
| `src/components/ui/DataCard.tsx` | DataCard, DataCardGrid, MiniStatCard | só importado por órfão: components/ui/index.ts |
| `src/components/ui/FocusTrap.tsx` | FocusTrap, useFocusTrap, AccessibleModal | só importado por órfão: components/ui/index.ts |
| `src/components/ui/LoadingButton.tsx` | LoadingButton, IconButton | só importado por órfão: components/ui/index.ts |
| `src/components/ui/LoadingOverlay.tsx` | LoadingOverlay, InlineLoader, SkeletonPulse, default | só importado por órfão: components/ui/index.ts |
| `src/components/ui/LoadingScreen.tsx` | default | só importado por órfão: components/LoadingScreen.tsx |
| `src/components/ui/LoadingState.tsx` | LoadingState, LoadingSkeleton, LoadingCard, LoadingTable, LoadingButton | só importado por órfão: components/ui/index.ts |
| `src/components/ui/Sparkline.tsx` | Sparkline | só importado por órfão: components/ui/index.ts |
| `src/components/ui/StatusBadge.tsx` | StatusBadge, mapToStatus | só importado por órfão: components/ui/index.ts |
| `src/components/ui/UrgencyBadge.tsx` | UrgencyBadge, LimitedStockBadge, TrendingBadge, FlashSaleBadge, LastUnitsBadge | só importado por órfão: components/ui/index.ts |
| `src/components/ui/carousel.tsx` | CarouselApi, Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext | só importado por órfão: components/ui/index.ts |
| `src/components/ui/index.ts` | (barrel/re-export) | 0 importadores |
| `src/components/ui/input-otp.tsx` | InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator | só importado por órfão: components/ui/index.ts |
| `src/components/ui/pagination.tsx` | Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, … | só importado por órfão: components/ui/index.ts |
| `src/hooks/gravacao/gravacao-constants.ts` | TECHNIQUE_COLORS, TECHNIQUE_ICONS, AREA_SHAPES, QUANTITY_TIERS_REFERENCE, getTechniqueColor, getTechniqueIcon, … | só importado por órfão: hooks/useGravacaoV2.ts |
| `src/hooks/gravacao/index.ts` | (barrel/re-export) | 0 importadores |
| `src/hooks/gravacao/useFornecedoresGravacao.ts` | useFornecedoresGravacao | só importado por órfão: hooks/gravacao/index.ts |
| `src/hooks/gravacao/useTecnicasGravacao.ts` | useTecnicasGravacao, useTecnicaGravacao | só importado por órfão: hooks/gravacao/index.ts |
| `src/hooks/gravacao/useVariantesGravacao.ts` | useVariantesGravacao | só importado por órfão: hooks/gravacao/index.ts |
| `src/hooks/simulation/simulationClipboard.ts` | formatCurrency, copyOptionToClipboard, copyAllOptionsToClipboard | só importado por órfão: hooks/useSimulation.ts |
| `src/hooks/simulation/simulationPriceFetcher.ts` | fetchOptionForTechnique, fetchAllOptions | só importado por órfão: hooks/useSimulation.ts |
| `src/hooks/simulator/index.ts` | (barrel/re-export) | 0 importadores |
| `src/hooks/useAccessSecurity.ts` | (barrel/re-export) | 0 importadores |
| `src/hooks/useCategoriesTree.ts` | CategoryTreeItem, CategoryNode, CategoryOption, useCategoriesTree, useCategorySelection | só importado por órfão: components/categories/CategorySidebarPanel.tsx, components/categories/CategoryTreeNavigation.tsx |
| `src/hooks/useColors.ts` | (barrel/re-export) | 0 importadores |
| `src/hooks/useComparison.ts` | useComparison | 0 importadores |
| `src/hooks/useComparisonWeights.ts` | ComparisonWeights, DEFAULT_WEIGHTS, useComparisonWeights | só importado por órfão: components/compare/ComparisonWeightsPopover.tsx |
| `src/hooks/useFavorites.ts` | FavoriteItem, useFavorites | só importado por órfão:  |
| `src/hooks/useInfiniteScroll.ts` | useInfiniteScroll | 0 importadores |
| `src/hooks/usePrintAreas.ts` | usePrintAreas, useTechniques, useTechniqueStats, useHasPrintAreas | só importado por órfão: hooks/tecnicas/index.ts |
| `src/hooks/useProductSeoAI.ts` | useProductSeoAI | só importado por órfão: components/admin/products/ProductFormFullscreen.tsx |
| `src/hooks/useProductSupplierSources.ts` | SupplierSource, SupplierSourceInput, useProductSupplierSources | só importado por órfão: components/admin/products/sections/ProductSupplierSection.tsx |
| `src/hooks/useProdutoPersonalizacao.ts` | ComponentLocation, ComponentWithLocations, useProdutoPersonalizacao | 0 importadores |
| `src/hooks/useProdutoRamoAtividade.ts` | ProdutoRamo, useProdutoRamoAtividade | 0 importadores |
| `src/hooks/useQuotes.ts` | (barrel/re-export) | 0 importadores |
| `src/hooks/useRecentProducts.ts` | RecentProduct, useRecentProducts | 0 importadores |
| `src/hooks/useRecentlyViewed.ts` | useRecentlyViewed | 0 importadores |
| `src/hooks/useSalesGoals.ts` | SalesGoal, CreateGoalInput, useSalesGoals | só importado por órfão: components/goals/SalesGoalsCard.tsx |
| `src/hooks/useSimulation.ts` | useSimulation | só importado por órfão: components/simulator/ScenarioComparison.tsx, components/simulator/TechniqueCard.tsx |
| `src/hooks/useSimulatorPreferences.ts` | useSimulatorPreferences | só importado por órfão: hooks/useSimulation.ts |
| `src/hooks/useSupplierFiscalData.ts` | SupplierFiscalData, FiscalOverrideInput, useSupplierFiscalData | só importado por órfão: components/admin/products/SupplierFiscalInfo.tsx |
| `src/hooks/useTechniquePricingOptions.ts` | ColorOption, SizeOption, TechniquePricingInfo, useTechniquePricingOptions, useMultipleTechniquePricing | só importado por órfão: components/simulator/TechniqueCard.tsx, hooks/useSimulation.ts |
| `src/hooks/useTechniqueRecommendations.ts` | TechniqueRecommendation, TechniqueWithRecommendation, UseTechniqueRecommendationsResult, useTechniqueRecommendations, SortOption, sortTechniques | só importado por órfão: components/simulator/TechniqueCard.tsx, components/simulator/TechniqueCardHelpers.tsx |
| `src/hooks/useTransactionalEmail.ts` | EmailEventType, sendTransactionalEmail | 0 importadores |
| `src/integrations/lovable/index.ts` | lovable | só importado por órfão: components/auth/SocialLoginButtons.tsx |
| `src/lib/admin-export-utils.ts` | exportToExcel, importFromExcel | 0 importadores |
| `src/lib/audit-logger.ts` | logAdminAction | 0 importadores |
| `src/lib/export-collection-pdf.ts` | exportCollectionPDF | 0 importadores |
| `src/lib/feature-flags.ts` | FeatureFlag, isFeatureEnabled, setFeatureFlag, getAllFlags, getFlagRegistry, isUserInCanary | 0 importadores |
| `src/lib/kit-builder/mock-data.ts` | MOCK_BOXES, MOCK_ITEMS | só importado por órfão: lib/kit-builder/index.ts |
| `src/lib/navigation/filter-dev-only-items.ts` | NavFlagItem, NavRoles, isItemVisibleForRoles, filterDevOnlyItems | 0 importadores |
| `src/lib/pdf/whitelabel-comparison.ts` | ClientBranding, fetchClientBranding, exportWhitelabelComparisonPDF | 0 importadores |
| `src/lib/personalization/adapters/print-area.adapter.ts` | NormalizedPrintAreaRow, adaptPrintAreaRow, adaptPrintAreaRows | só importado por órfão: lib/personalization/adapters/index.ts |
| `src/lib/personalization/repositories/priceTable.repository.ts` | PriceTableFilters, PriceTableOrderBy, PriceTableQueryOptions, findAll, findById, findByCodeOption, … | só importado por órfão: lib/personalization/index.ts, lib/personalization/repositories/index.ts |
| `src/lib/personalization/repositories/technique.repository.ts` | TechniqueFilters, TechniqueOrderBy, TechniqueQueryOptions, findAll, findById, findByCode, … | só importado por órfão: lib/personalization/index.ts, lib/personalization/repositories/index.ts |
| `src/lib/personalization/services/pricing.service.ts` | PricingRequest, PricingResponse, BatchPricingRequest, BatchPricingResponse, ComparisonRequest, ComparisonResponse, … | só importado por órfão: lib/personalization/index.ts, lib/personalization/services/index.ts |
| `src/lib/print-area-grouping.ts` | groupPrintAreasByComponent, getUniqueTechniques, filterGroupsByTechnique, filterGroupsByComponent, FlattenedTechnique, flattenTechniques, … | 0 importadores |
| `src/lib/security/file-validation.ts` | ValidationResult, ValidationOptions, validateFile | só importado por órfão: components/admin/ImageUploadButton.tsx |
| `src/lib/storage-resilience.ts` | resilientUpload, getResilientUrl | 0 importadores |
| `src/lib/system/dev-infra-messages.ts` | shouldShowDevInfraMessages | 0 importadores |
| `src/lib/validations/authSchema.ts` | loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, LoginFormData, SignupFormData, … | só importado por órfão: lib/validations/index.ts |
| `src/lib/validations/goalSchema.ts` | salesGoalSchema, SalesGoalFormData | só importado por órfão: lib/validations/index.ts |
| `src/lib/validations/profileSchema.ts` | profileSchema, ProfileFormData | só importado por órfão: lib/validations/index.ts |
| `src/pages/EngravingRegistrationPage.tsx` | EngravingRegistrationContent | só importado por órfão: pages/admin/AdminCadastrosPage.tsx |
| `src/pages/GestorApprovalsPage.tsx` | default | 0 importadores |
| `src/pages/PWAInstallPage.tsx` | default | 0 importadores |
| `src/pages/PersonalizationSimulator.tsx` | default | 0 importadores |
| `src/pages/PublicQuoteApprovalPage.tsx` | default | 0 importadores |
| `src/pages/QAPage.tsx` | default | 0 importadores |
| `src/pages/public-approval/PublicQuoteItems.tsx` | PublicQuoteItemsList, PublicQuoteTotals | só importado por órfão: pages/PublicQuoteApprovalPage.tsx |
| `src/pages/public-approval/PublicQuoteStatusScreens.tsx` | LoadingScreen, ExpiredScreen, AlreadyRespondedScreen, ErrorScreen, SubmittedScreen | só importado por órfão: pages/PublicQuoteApprovalPage.tsx |
| `src/pages/public-approval/usePublicQuoteApproval.ts` | PublicSeller, AlreadyRespondedData, QuoteData, SignatureReceipt, PublicQuoteApprovalState, usePublicQuoteApproval, … | só importado por órfão: pages/PublicQuoteApprovalPage.tsx, pages/public-approval/PublicQuoteStatusScreens.tsx |
| `src/pages/quotes/QuoteApprovalHistoryPage.tsx` | default | 0 importadores |
| `src/services/encryption.ts` | encryptData, decryptData, protectPII, revealPII | 0 importadores |
| `src/types/external-db.ts` | ExternalProduct, ExternalTechnique, ExternalPrintArea, MockupTechnique | só importado por órfão: components/personalization/TechniqueSLACard.tsx, components/personalization/TechniqueSelector.tsx |
| `src/types/gravacao-database.ts` | TecnicaGravacao, TecnicaGravacaoVariante, FornecedorGravacao, TecnicaFaixaArea, TecnicaFaixaPontos, HotStampingFitaOpcao, … | só importado por órfão: hooks/gravacao/useFornecedoresGravacao.ts, hooks/gravacao/useTecnicasGravacao.ts |
| `src/types/index.ts` | (barrel/re-export) | 0 importadores |
| `src/types/mockup.ts` | MockupDraft, PersonalizationArea, LogoData, GeneratedMockup | só importado por órfão: types/index.ts |
| `src/types/product.ts` | Product, ProductColor, ProductVariation, KitItem, ProductMetadata, ProductFilters, … | só importado por órfão: types/index.ts |
| `src/types/quote.ts` | QuoteStatus, ClientResponse, Quote, QuoteItem, QuoteWithItems, QuoteInput, … | só importado por órfão: types/index.ts |
| `src/types/simulation.ts` | Technique | só importado por órfão: components/simulation/SimulationPriceSourceBadge.tsx, components/simulator/MockupPreview.tsx |
| `src/utils/campaignExport.ts` | CampaignExportRow, campaignRowsToCsv | só importado por órfão: pages/admin/AdminCampanhasPage.tsx |
| `src/utils/cnpj-lookup.ts` | CnpjData, fetchCnpjData | só importado por órfão: components/admin/products/new-supplier/useNewSupplierForm.ts, components/admin/suppliers-manager/useSuppliersManager.ts |
| `src/utils/formatters.ts` | formatCurrency, formatDate, formatCNPJ, formatPhone | 0 importadores |
| `src/utils/masks.ts` | maskCnpj, maskPhone, validateCnpj, maskCep, ESTADOS_BR | só importado por órfão: components/admin/products/new-supplier/tabs/AddressTab.tsx, components/admin/products/new-supplier/tabs/BasicDataTab.tsx |
| `src/utils/pixMask.ts` | applyPixMask, validateCpfDigits, validateCnpjDigits, validatePixKey, pixPlaceholder | só importado por órfão: components/admin/products/NewSupplierDialog.tsx, components/admin/products/new-supplier/useNewSupplierForm.ts |
| `src/utils/productPdfExport.ts` | exportProductPdf | só importado por órfão: pages/admin/AdminProductFormPage.tsx |
| `src/utils/quote-data-mapper.ts` | mapQuoteToProposalData | 0 importadores |
| `src/utils/quotePdfUtils.ts` | generateQuotePDF | 0 importadores |
| `src/utils/viacep.ts` | ViaCepResult, fetchAddressByCep | só importado por órfão: components/admin/products/new-supplier/useNewSupplierForm.ts, components/admin/suppliers-manager/useSuppliersManager.ts |

Arquivo importado **somente por teste**: `src/hooks/useFavorites.ts` (export `useFavorites`, importado só em `src/tests/hooks/useFavorites.test.ts`). O app usa `stores/useFavoritesStore`.

### B. Exports sem nenhuma referência fora do próprio arquivo (hooks, services e libs selecionadas, em arquivos alcançáveis)

Método: `<scripts-da-auditoria>/unused-exports.mjs` monta um índice de tokens de todos os arquivos não-teste de `src/`. Abaixo estão os exports (`function`, `const`, `class`, `enum`) cujo nome não aparece em nenhum outro arquivo e não tem uso interno. A lista completa (298 entradas, incluindo `components/` e `lib/`) está em `<scripts-da-auditoria>/unused-exports.txt`.

| Arquivo:linha | Export |
|---|---|
| `src/hooks/admin/useAuditLog.ts:228` | fetchAllAuditLogs |
| `src/hooks/intelligence/intelligenceHelpers.ts:18` | filterByProductIds |
| `src/hooks/orders/extensions/useOrderPayments.ts:35` | getSicoobFinancialDate |
| `src/hooks/orders/useOrderNotifications.ts:21` | useOrderStatusNotifications |
| `src/hooks/quotes/quoteHelpers.ts:145` | buildItemsInsertPayload |
| `src/hooks/quotes/quoteHelpers.ts:177` | buildPersonalizationsInsertPayload |
| `src/hooks/useAiUsage.ts:113` | useAiQuotaStatus |
| `src/hooks/useColorSystem.ts:170` | useColorGroups |
| `src/hooks/useColorSystem.ts:186` | useColorNuances |
| `src/hooks/useColorSystem.ts:199` | useColorVariations |
| `src/hooks/useColorSystem.ts:235` | findGroupBySlug |
| `src/hooks/useColorSystem.ts:242` | findVariationBySlug |
| `src/hooks/useCommemorativeDates.ts:127` | useProductsByCommemorativeDate |
| `src/hooks/useCommemorativeDates.ts:150` | useCommemorativeDateColorGroups |
| `src/hooks/useCommercialIntelligence.ts:335` | useOpportunities |
| `src/hooks/useCommercialIntelligence.ts:377` | useRevenueTrend |
| `src/hooks/useCrmCompanies.ts:72` | useCrmCompaniesLegacy |
| `src/hooks/useCrmCompanies.ts:84` | useCrmCompanyLegacy |
| `src/hooks/useCrmCompanies.ts:141` | useCrmCustomer |
| `src/hooks/useCustomizationPrice.ts:37` | useCustomizationPriceCalculator |
| `src/hooks/useExternalCategoriesQuery.ts:78` | useCategoryById |
| `src/hooks/useExternalCategoriesQuery.ts:88` | useCategoriesByIds |
| `src/hooks/useExternalDatabase.ts:244` | useExternalProductVariants |
| `src/hooks/useExternalDatabase.ts:264` | useExternalSupplierAttributeDefinitions |
| `src/hooks/useExternalDatabase.ts:268` | useExternalSupplierProductAttributes |
| `src/hooks/useExternalDatabase.ts:272` | useExternalProductSuppliers |
| `src/hooks/useExternalDatabase.ts:280` | useExternalPriceTables |
| `src/hooks/useExternalDatabase.ts:317` | useExternalClientContacts |
| `src/hooks/useExternalDatabase.ts:321` | useExternalOrganizations |
| `src/hooks/useExternalDatabase.ts:329` | useExternalRamosAtividadeFilho |
| `src/hooks/useExternalDatabase.ts:347` | useExternalMaterialGroups |
| `src/hooks/useExternalDatabase.ts:351` | useExternalMaterialTypes |
| `src/hooks/useExternalDatabase.ts:355` | useExternalColorGroups |
| `src/hooks/useExternalDatabase.ts:359` | useExternalColorVariations |
| `src/hooks/useExternalSimulator.ts:210` | useExternalProduct |
| `src/hooks/useExternalSimulator.ts:322` | useExternalProductsList |
| `src/hooks/useFavoriteReactions.ts:81` | useMyListReactions |
| `src/hooks/useGenericFuzzySearch.ts:139` | useQuoteFuzzySearch |
| `src/hooks/useGravacaoPriceV2.ts:292` | useProductPrintAreasV2 |
| `src/hooks/useGravacaoPriceV2.ts:320` | useCustomizationPriceV2 |
| `src/hooks/useGravacaoPriceV2.ts:398` | calculateCustomizationPrice |
| `src/hooks/useGravacaoPriceV2.ts:418` | getColorSelectorConfig |
| `src/hooks/useMaterialTypes.ts:38` | useMaterialTypesByGroup |
| `src/hooks/useMaterialTypes.ts:103` | useMaterialSearch |
| `src/hooks/useNovelties.ts:209` | useExpiringNovelties |
| `src/hooks/useNovelties.ts:382` | useNoveltyCount |
| `src/hooks/useNovelties.ts:407` | useIsProductNovelty |
| `src/hooks/useProductFuzzySearch.ts:65` | looksLikeProductCode |
| `src/hooks/useProductImages.ts:142` | transformToDisplayImages |
| `src/hooks/useProductImages.ts:155` | getPrimaryImageUrl |
| `src/hooks/useProductImages.ts:167` | getImageUrls |
| `src/hooks/useProductImages.ts:195` | useProductImagesBatch |
| `src/hooks/useProductImages.ts:210` | usePrimaryImage |
| `src/hooks/useProducts.ts:122` | useRelatedProducts |
| `src/hooks/useProductsByCategory.ts:125` | useCategoryDescendants |
| `src/hooks/useRamoAtividade.ts:16` | useRamosAtividade |
| `src/hooks/useRamoAtividade.ts:54` | useCreateRamoAtividade |
| `src/hooks/useRamoAtividade.ts:72` | useUpdateRamoAtividade |
| `src/hooks/useRamoAtividade.ts:90` | useDeleteRamoAtividade |
| `src/hooks/useRamoAtividade.ts:108` | useToggleRamoAtividade |
| `src/hooks/useRamoAtividadeFilho.ts:16` | useSegmentos |
| `src/hooks/useRamoAtividadeFilho.ts:27` | useSegmentosPorRamo |
| `src/hooks/useRamoAtividadeFilho.ts:60` | useSegmento |
| `src/hooks/useRamoAtividadeFilho.ts:76` | useCreateSegmento |
| `src/hooks/useRamoAtividadeFilho.ts:95` | useUpdateSegmento |
| `src/hooks/useRamoAtividadeFilho.ts:113` | useDeleteSegmento |
| `src/hooks/useRamoAtividadeFilho.ts:132` | useToggleSegmento |
| `src/hooks/useReplenishments.ts:329` | useReplenishmentCount |
| `src/hooks/useSupplierComparison.ts:105` | getSupplierProductsInCategory |
| `src/hooks/useTecnicasUnificadas.ts:91` | useTecnicaUnificada |
| `src/hooks/useTecnicasUnificadas.ts:96` | useTecnicaPorCodigo |
| `src/hooks/useTecnicasUnificadas.ts:176` | calculatePriceForQuantityLegacy |
| `src/hooks/useVariantStock.ts:263` | useProductVariantStock |
| `src/lib/crm-db.ts:333` | insertCrm |
| `src/lib/crm-db.ts:350` | updateCrm |
| `src/lib/crm-db.ts:369` | updateCrmByFilter |
| `src/lib/crm-db.ts:388` | deleteCrm |
| `src/lib/crm-db.ts:402` | deleteCrmByFilter |
| `src/lib/sentry.ts:115` | setSentryUser |
| `src/lib/sentry.ts:130` | getSentryErrorBoundary |
| `src/lib/sw-register.ts:57` | unregisterServiceWorker |
| `src/lib/sw-register.ts:70` | isPWA |
| `src/lib/sw-register.ts:78` | requestNotificationPermission |
| `src/lib/theme-presets.ts:1030` | exportThemeConfig |
| `src/lib/theme-presets.ts:1034` | importThemeConfig |
| `src/utils/excelExport.ts:135` | exportMultipleSheets |
| `src/utils/excelExport.ts:223` | formatPercentage |
| `src/utils/excelExport.ts:230` | formatStatus |
| `src/utils/resilience.ts:90` | erpCircuitBreaker |
| `src/utils/resilience.ts:91` | aiCircuitBreaker |
| `src/utils/resilience.ts:96` | databaseCircuitBreaker |
| `src/utils/templateExport.ts:91` | readTemplateFile |

### C. Links internos para rotas inexistentes (todo o `src/`)

| Destino | Origem |
|---|---|
| `/kit-builder` | `components/products/ProductCategoryBadges.tsx:77` |
| `/catalogo` | `pages/OrdersPage.tsx:256`, `components/command/commandActions.tsx:100`, mais 7 fora da fatia (FE-003) |
| `/cliente/:id` | `components/search/useGlobalSearch.ts:352` |
| `/checkout` | `components/cart/MiniCart.tsx:128` (órfão) |
| `/instalar` | `components/layout/Header.tsx:118` |
| `/tecnicas`, `/datas-comemorativas`, `/relatorios`, `/ajuda` | `components/command/commandActions.tsx:129,165,174,241` |
| `/admin/newsletter`, `/admin/campanhas`, `/admin/qa/release-evidences`, `/admin/seguranca/rls` | `components/layout/SidebarReorganized.tsx:227,228,250,253` |
| `/admin/empresas`, `/admin/configuracoes` | `components/access/DevAccessDeniedPage.tsx:66-67` |
| `/auth/callback` | `components/auth/SocialLoginButtons.tsx:24` (órfão), `lib/rbac/route-matrix.ts:55` |
| `/admin/usuarios/promover` | `lib/rbac/route-matrix.ts:73`, `pages/admin/AdminUsuariosPage.tsx:354` (fora da fatia) |
| `/carrinhos/:cartId` | `components/cart/cart-utils/CartExport.ts:78` |
| `/bi`, `/produtos/1..5` | `components/search/GlobalSearch.tsx:59,74`, `SmartSuggestions.tsx:59-94` (órfãos) |
| Fora da fatia | `/admin` (`components/security/MfaEnrollmentDialog.tsx:272`), `/admin/auditoria/enterprise` (`pages/admin/AdminAuditPage.tsx:231`), `/admin/cadastros/produto[/novo]` (`components/admin/products/useProductsManager.ts:316-317`, `pages/admin/AdminProductFormPage.tsx:206,250`), `/admin/descontos` (`components/dashboard/MyDiscountRequestsWidget.tsx:109`) |

### D. `state` ou parâmetros de navegação enviados e não consumidos

| Produtor | Payload | Consumidor esperado | Situação |
|---|---|---|---|
| `pages/CollectionDetailPage.tsx:107,153`, `pages/collections/useCollectionsPageState.ts:183` | `state.fromCollection/preloadProducts/clientId/clientName` | `hooks/quote/useQuoteInitialization.ts` | ignorado (FE-060) |
| `components/pricing/ProductPriceSimulator.tsx:340`, `components/pricing/QuantityPriceCalculator.tsx:67` | `/orcamentos` + `state.fromSimulator/product/...` | lista de orçamentos | ignorado (FE-087) |
| `pages/trends/TrendsCharts.tsx:185` | `/orcamentos/novo?produto=` | `useQuoteInitialization` (lê só `items[]`) | ignorado (FE-087) |
| `components/expert/chat/useExpertChat.ts` | `/orcamentos/novo?edit=` | — | ignorado (fora da fatia) |
| `components/products/ProductCategoryBadges.tsx:76` | `/mockup-generator` + `state.preSelectedProduct` | `hooks/useMockupGenerator.ts:159` (lê `?product_id`) | ignorado (FE-131) |
| `components/dashboard/UpcomingDatesWidget.tsx:33` | `/filtros?data=` | `pages/filters/filters-page-helpers.ts` (lê `datasComemorativas`) | ignorado (FE-022) |
| `components/command/commandActions.tsx:184-187` | `CustomEvent('export-pdf')` | — | sem ouvinte (FE-007) |

## Fontes lidas

- Raiz e documentos: `AGENTS.md`, `README.md`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `.env.production.example`, `.env.e2e.example`, `public/manifest.json`, `public/sw.js`, `docs/ROUTES.md`, `docs/INVENTARIO_FUNCIONALIDADES_v2.md`, `docs/SCOPE_ALIGNMENT.md`, `docs/MODULES.md`, `docs/AUTH_PASSKEYS.md`, `docs/EXCEL_INTEGRATION_GUIDE.md`, `docs/execucao/decisoes_pendentes.md`, `docs/execucao/fechamento-tecnico-2026-10-08.md`.
- Entrada e rotas: `src/main.tsx`, `src/App.tsx`, `src/AuthEntry.tsx`, `src/routes/config/{public,products,quotes,tools,admin,dev,sicoob,sicoob-rbac}.ts`, `src/lib/rbac/route-matrix.ts`, `src/lib/navigation/{restricted-routes,filter-dev-only-items}.ts`, `src/lib/access/role-policy.ts`, `src/lib/auth/auth-utils.ts`.
- Layout e navegação: `src/components/layout/{MainLayout,Header,SidebarReorganized,DevRoute,SicoobRoute}.tsx`, `src/components/command/{GlobalCommandBar,commandActions}.tsx`, `src/components/mobile/SmartMobileNav.tsx`, `src/components/navigation/OrganizationSwitcher.tsx`, `src/components/access/DevAccessDeniedPage.tsx`, `src/hooks/useGlobalShortcuts.ts`, `src/constants/onboarding.ts`.
- Busca: `src/components/search/{useGlobalSearch,search-types,GlobalSearchPalette,GlobalSearch,SmartSuggestions,VisualSearchButton}.ts(x)`, `src/hooks/useSearch.ts`.
- Catálogo e filtros: `src/pages/{Index,FiltersPage}.tsx`, `src/pages/filters/{filters-page-helpers,useFiltersPageState}.ts`, `src/hooks/{useCatalogFiltering,useAdvancedFilters}.ts`, `src/hooks/catalog/useCatalogFilters.ts`, `src/components/filters/{FilterPanel,filter-panel/types,filter-panel/sections/SimpleFilters}.tsx`, `src/components/catalog/{CatalogActiveFilters,CatalogToolbar}.tsx`, `src/constants/filters.ts`, `src/data/{mockData,mock-match-products}.ts`.
- Produto: `src/pages/ProductDetail.tsx`, `src/hooks/useProductIntelligenceBadges.ts`, `src/lib/stock-chart-utils.ts`, `src/components/common/IntelligenceBadges.tsx`, `src/components/products/{ProductCategoryBadges,PriceHistoryChart}.tsx`.
- Orçamentos: `src/pages/{QuoteDetailPage,QuoteViewPage,QuotesListPage,QuotesKanbanPage,MeusOrcamentos,QuoteApprovalPage,PublicQuoteApprovalPage}.tsx`, `src/pages/quote-view/QuoteBitrixSync.ts`, `src/hooks/quote/useQuoteInitialization.ts`, `src/hooks/useQuoteVersions.ts`, `src/hooks/useTransactionalEmail.ts`, `src/components/quotes/{QuoteKanbanBoard,QuoteBuilderSummaryColumn,QuoteManagerApprovalBanner,QuoteConsolidationPanel}.tsx`, `src/lib/quote-status-config.ts`, `src/types/{quote,orders}.ts`, `src/integrations/supabase/types.ts` (enums).
- Pedidos e gestor: `src/pages/{OrdersPage,OrderDetailPage,GestorCompras,GestorApprovalsPage,GestorOrcamentos,NotificationsPage}.tsx`, `src/services/OrderService.ts`, `src/components/orders/{FinancialPanel,OrderFilters,PilotApprovalPanel,RevisionRequest,OrderTrackingTimeline}.tsx`, `src/hooks/usePaBudget.ts`, `src/hooks/orders/useOrderNotifications.ts`.
- Clientes: `src/pages/{ClientsPage,ClientDetailPage}.tsx`, `src/lib/crm-db.ts`.
- Carrinho, coleções e favoritos: `src/pages/seller-carts/useSellerCartsPage.ts`, `src/components/cart/{MiniCart,BundleSuggestionCard,cart-utils/CartExport}.tsx`, `src/pages/CollectionDetailPage.tsx`, `src/pages/collections/useCollectionsPageState.ts`.
- Comparador: `src/components/compare/{ComparisonScoreCard,ComparisonWeightsPopover,HistoricalPriceOverlay,FocusModeToggle,ImageZoomCell,SortableColumnWrapper,ComparisonShortcutsCheatsheet}.tsx`, `src/lib/pdf/whitelabel-comparison.ts`, `src/hooks/useComparisonShortcuts.ts`.
- Kits: `src/pages/{KitBuilderPage,KitLibraryPage}.tsx`, `src/hooks/useCustomKitPersistence.ts`, `src/components/kit-builder/{FreightEstimator,KitComparisonDialog}.tsx`, `src/lib/kit-builder/mock-data.ts`.
- Simulador e preços: `src/pages/{PriceSimulatorPage,SimuladorWizard,PersonalizationSimulator}.tsx`, `src/components/pricing/{QuantityPriceCalculator,ProductPriceSimulator}.tsx`, `src/hooks/simulator/useWizardPersistence.ts`, `src/components/simulator/*`, `src/lib/personalization/*`.
- Mockup, IA e Match: `src/pages/{MockupGenerator,ProductMatchPage}.tsx`, `src/components/ai/{AIMockupAssistant,AIChat,index}.tsx`, `src/hooks/useMockupGenerator.ts`.
- Tendências e inteligência: `src/pages/{TrendsPage,CommercialIntelligencePage,BusinessIntelligencePage,CustomizableDashboard}.tsx`, `src/pages/trends/{is-demo-mode,trends-mock}.ts`, `src/hooks/useCommercialIntelligence.ts`, `src/components/goals/SalesGoalsCard.tsx`, `src/hooks/useSalesGoals.ts`, `src/components/reports/ScheduledReportsManager.tsx`.
- Auth e conta: `src/pages/{Auth,SSOCallbackPage,VerificationPage,ResetPassword}.tsx`, `src/components/auth/{SocialLoginButtons,PasskeyLogin,QuickTestLogin}.tsx`, `src/hooks/useWebAuthn.ts`, `src/integrations/lovable/index.ts`, `src/lib/validations/profileSchema.ts`, `src/services/admin/UserService.ts`.
- PWA e infraestrutura: `src/hooks/usePWAInstall.ts`, `src/pages/PWAInstallPage.tsx`, `src/lib/sw-register.ts`, `src/lib/feature-flags.ts`, `src/lib/sentry.ts`, `src/lib/system/dev-gate/providers.ts`, `src/services/encryption.ts`, `src/lib/access/request-dev-access.ts`, `src/hooks/useGeoBlocking.ts`, `src/hooks/useDropboxFiles.ts`, `src/pages/{DropboxBrowserPage,TestDashboard,QAPage}.tsx`.
- Backend consultado só para confirmar consumo pelo frontend: `supabase/functions/{send-transactional-email,send-scheduled-reports,favorites-watcher,comparison-price-watcher,dropbox-list}/index.ts`, `supabase/config.toml`, `supabase/migrations/{20260412231951_…,20260927110200_quote_status_workflow_validation,20260927200207_duplicate_order_atomic}.sql` e a lista de `cron.schedule` em todas as migrations.
- Scripts auxiliares (fora do repositório): `<scripts-da-auditoria>/{graph.mjs,slice.mjs,links.mjs,routerefs.mjs,deadbuttons.mjs,unused-exports.mjs}` e saídas `graph-out.json`, `links.txt`, `deadbuttons.txt`, `unused-exports.txt`.
