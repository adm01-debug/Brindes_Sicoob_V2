# Itens a recuperar — tabela completa

Levantamento de 18/11/2026. Índice e regra de exclusão em [`README.md`](README.md).

**Conteúdo íntegro, sem corte.** A primeira versão desta tabela truncava a evidência em
140/300/160 caracteres, o que esvaziava o propósito dela: aqui está o texto completo de cada
achado, incluindo caminhos de arquivo e o porquê. É longo de propósito.

A coluna **origem** diz de onde veio: `PR #NNN` é PR fechada sem merge; `PR #NNN (resgatado na
refutação)` é item que a segunda rodada encontrou **depois** de a PR ter sido dada como "nada a
recuperar" — esses quatro casos são a razão de a auditoria ter tido duas rodadas; e `branch …`
é achado da auditoria de branches sem PR.


### KPIs e paginação reais em /clientes (hoje hardcoded)

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/pages/ClientsPage.tsx, src/hooks/useCrmCompanies.ts, src/lib/crm-db.ts, tests/hooks/useCrmClientsPage.test.ts, tests/hooks/useCrmCompanies.pagination.test.ts, tests/pages/ClientsPage.pagination.test.tsx`

Main tem KPI literalmente inventado (ClientsPage.tsx:46-50: "Novos (Mês)"="12", "Ticket Médio"="R$ 4.2k", "Taxa Retenção"="94%") e carrega no máximo 200 clientes (useCrmCompanies.ts:46), filtrando em memória — o "Total Clientes" é a contagem dos 200. A PR traz selectCrmPage/selectCrmStrict/selectCrmByIdStrict + flag `unavailable` em CrmResponse (a #291 NÃO adiciona isso: grep por unavailable/Strict no patch dela volta vazio), useCrmClientsPage com count exact por KPI (total, novos no mês, com localização, com CNPJ), useAllCrmCompanies com teto de 10.000 e erro explícito, e ClientKpiCards com estado de erro.


### Fim do mock silencioso no BI de cliente (mock só no cliente demo)

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/hooks/bi/useClientBI.ts, src/hooks/bi/useClientSeasonality.ts, src/hooks/bi/useClientCategoryAffinity.ts, src/hooks/bi/useIndustryCategoryTrends.ts, src/hooks/bi/useClientAffinity.ts, src/hooks/bi/useIndustryTrends.ts, src/hooks/bi/useClientVsIndustry.ts, src/hooks/bi/useClientsComparison.ts, src/hooks/bi/useBIDossierExport.ts, src/components/bi/ExecutiveSummaryButton.tsx, src/components/bi/ClientHealthHero.tsx, src/components/bi/ClientVsIndustryComparison.tsx, src/components/bi/ClientCategoryRadar.tsx, src/components/bi/ClientSeasonalityHeatmap.tsx, src/components/bi/ClientLookalikes.tsx, src/components/bi/ClientAffinityProducts.tsx, src/components/bi/IndustryTrendingProducts.tsx, src/components/bi/ClientOverview360.tsx, src/components/bi/BIAiCopilot.tsx, src/components/bi/BIBriefingMode.tsx, src/components/bi/ClientComparator.tsx, src/components/bi/ExportDossierButton.tsx`

Na main, 6 hooks de BI caem em dado fictício para cliente REAL quando a consulta volta vazia ou falha, sem nada na tela indicando isso — e esse número entra no Resumo Executivo copiado e no PPTX enviado ao cliente. A PR restringe mock ao cliente demo via isDemoClient, propaga o erro (throw em vez de engolir) e adiciona isError/isUnavailable/refetch em cada hook + estado "indisponível" com botão de tentar novamente em cada card. A infra demoClient.ts já existe na main, só não é usada nesses hooks.


### Health Score deixa de usar benchmark setorial inventado

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/hooks/bi/useClientHealthScore.ts, tests/hooks/useClientHealthScore.reliable-data.test.ts`

Quando não há amostra setorial, a main compara o cliente contra constantes chumbadas (10 pedidos, ticket R$ 2.500, potencial R$ 30.000) e devolve um score 0-100 com aparência de confiável. A PR zera o peso do componente sem fonte, renormaliza os pesos restantes, e devolve tier "unknown" + unavailableReason ('source-error' \| 'insufficient-data') + getAvailableHealthScore()=null, com o texto do resumo executivo trocado para 'pontuação indisponível'. Depende do item anterior (hasEnoughSample/isError nos hooks-fonte).


### Gráfico de inteligência de mercado com série e fornecedores aleatórios

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/components/intelligence/MarketIntelligenceChart.tsx, tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx`

A main gera a série diária com Math.random e inventa 4 fornecedores com nome ('Brasil Brindes', mock-supplier-1..4) sempre que a query real volta vazia, e isso é renderizado em /inteligencia-comercial. A PR remove o gerador e apresenta estado vazio/erro explícito com retry.


### Página Match de Produtos servindo catálogo fictício

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/pages/ProductMatchPage.tsx, src/data/mock-match-products.ts`

A main usa MOCK_MATCH_PRODUCTS quando useProducts volta vazio, sem avisar, e não distingue catálogo vazio de catálogo com erro. A PR passa a usar só o catálogo real e adiciona CatalogSearchState com loading / 'Catálogo indisponível — não exibimos produtos fictícios quando a consulta falha' / vazio / retry; o arquivo de mock é removido (nenhum outro consumidor).


### Assistente de layout do Mockup é IA falsa (setTimeout + Math.random)

- **origem:** PR #112 · **impacto:** alto · **tipo:** ui
- **arquivos:** `src/components/ai/AIMockupAssistant.tsx, src/components/ai/AIChat.tsx, src/pages/MockupGenerator.tsx, tests/components/AIMockupAssistant.history.test.tsx, tests/components/AIChat.sse.test.ts, tests/components/AIChat.message-limit.test.ts`

A main apresenta ao vendedor um 'Matheus, seu expert em layouts' que não chama IA nenhuma: aguarda 1,5s e devolve uma das 4 frases fixas sorteadas, inclusive afirmações técnicas inventadas ('mantenha o logo entre 8-12cm'). A PR substitui pelo componente AIChat real apontando para expert-chat em assistantMode='layout' (a metade edge desse modo vem na #291). Falta também o parser SSE: a main faz response.json() contra uma resposta text/event-stream, então o AIChat atual nem funcionaria se fosse montado — a PR traz readAssistantSse/contentFromStreamEvent e AI_CHAT_MAX_MESSAGES.


### crm-db-bridge e trends-insights fora do allowlist de deploy e do config.toml

- **origem:** PR #112 · **impacto:** alto · **tipo:** workflow
- **arquivos:** `.github/workflows/deploy-sicoob-functions.yml, supabase/config.toml`

O allowlist de 13 funções do workflow autorizado não inclui crm-db-bridge nem trends-insights, e o config.toml não tem entrada para nenhuma das duas. Resultado: todo o hardening dessas duas funções que vem na #291 (papéis múltiplos, vínculo ativo, contrato quote_directory, redação de log, zod estrito, paginação por cursor) fica no repositório e nunca chega a produção. A #291 não toca workflow nenhum e o patch dela em config.toml adiciona outras 5 entradas, não estas. A PR #112 adicionava as duas no allowlist e '[functions.crm-db-bridge] verify_jwt = false' / '[functions.trends-insights] verify_jwt = false'. Mexer em workflow é item de chamar o dono (AGENTS.md).


### Trace e vídeo do Playwright gravando senha e TOTP reais das contas técnicas

- **origem:** PR #112 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `playwright.config.ts, e2e/helpers/auth.ts`

O `use` global da main liga trace e video em 'on-first-retry' para TODOS os projects, e o project 'setup' (que digita E2E_*_PASSWORD e gera o código TOTP) não tem override. Numa primeira repetição de falha no login, o trace serializa as ações de preenchimento e o vídeo mostra a digitação, e os dois sobem como artifact do CI. A PR desliga trace e video só nesse project (screenshot only-on-failure continua) e torna o helper de auth capaz de validar a sessão sem reexpor a credencial.


### Validação de acesso falha aberta: erro no RPC mantém a sessão viva

- **origem:** PR #112 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `src/contexts/AuthContext.tsx, tests/contexts/AuthContext.test.tsx, tests/e2e/auth-role-contract.test.ts`

Em main, se get_sicoob_access_state falhar (rede, RLS, RPC fora), o catch do fetchUserData só loga e a sessão local continua — e o revalidador por visibilidade também engole o erro. A PR encerra a sessão com motivo 'access_state_unavailable' e mensagem própria, de-duplica a chamada por usuário (pendingAccessStates) e evita a dupla carga no INITIAL_SESSION.


### Dados de um usuário sobrevivem ao login de outro no mesmo navegador

- **origem:** PR #112 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `src/contexts/AuthContext.tsx, src/hooks/useFavoriteLists.ts, src/stores/useFavoritesStore.ts, src/hooks/useFavoriteReactions.ts, tests/hooks/useFavoriteListsQueryKeys.test.ts, tests/stores/useFavoritesStoreHydration.test.ts`

A main só limpa product-favorites/product-comparison/recently-viewed no logout (clearSensitiveBrowserData). Se o usuário A fecha a aba sem sair e o usuário B entra, os favoritos de A continuam no localStorage e na store. Pior: as query keys de favoritos não têm o id do usuário (LISTS_KEY=['favorite-lists'], ITEMS_KEY(listId), [FAVORITE_TRASH_KEY]), então o cache do react-query de A é servido a B. A PR adiciona isolateSensitiveBrowserData (compara 'sicoob-active-user-id' e zera no troco de usuário) e passa todas as chaves a favoriteListsQueryKey(user.id)/favoriteItemsQueryKey(user.id,listId)/TRASH_KEY(user.id), além de expor error/refetch. Pode ter interseção com a frente 'busca global e favoritos' de outro agente — o recorte aqui é isolamento por usuário, não feature de favoritos.


### Preço de personalização inventado e botão do simulador que descarta a simulação

- **origem:** PR #112 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/components/pricing/calculator/QuantityComparisonTable.tsx, src/components/pricing/calculator/types.ts, src/components/pricing/QuantityPriceCalculator.tsx, src/components/pricing/simulator/ProductSearch.tsx, src/components/pricing/simulator/types.ts, src/pages/PriceSimulatorPage.tsx, tests/components/pricing/QuantityPriceCalculator.test.tsx, tests/components/pricing/QuantityComparisonTable.test.tsx, tests/components/pricing/simulator/ProductSearch.test.tsx`

Quatro defeitos distintos, todos ainda na main: (1) o cálculo multiplica o preço por 1+(cores-1)*0,10 e por sizeModifier (0,8/1/1,3) — majoração que não existe na tabela de preço por técnica e tiragem; (2) handlingPrice fica fora do total de personalização; (3) produto sem sale_price entra como R$ 0,00 ('p.sale_price ?? 0') e pode ser importado para orçamento como se fosse grátis; (4) o botão 'Criar Orçamento a partir desta Simulação' navega para /orcamentos com state {product, techniques, quantities}, shape que nenhum consumidor lê — useQuoteInitialization espera /orcamentos/novo com {fromSimulator, simulationData}. A PR corrige os quatro: isPriceConfigurationSupported, minimumSupportedQuantity (célula 'Mín. N' em vez de preço fora de faixa), calculateCustomizationTotal com handlingPrice, hasValidSalePrice + priceAvailable com bloqueio do botão e alerta, e navegação correta com personalizations calculadas.


### Suíte de testes e scripts de QA da PR (cai na frente de outro agente)

- **origem:** PR #112 · **impacto:** alto · **tipo:** teste
- **arquivos:** `tests/, supabase/functions/_shared/pii-redaction.test.ts, supabase/functions/_shared/prompt-safety.test.ts, supabase/functions/_shared/ai-usage-stream.test.ts, supabase/functions/crm-db-bridge/search-query.test.ts, scripts/qa/simular-search-analytics-legado.py, scripts/qa/simular-cotas-ia.py, scripts/qa/supabase_postgres_container.py, scripts/qa/test_supabase_postgres_container.py, tests/scenarios/sql/search-analytics-legacy-compatibility-fixture.sql, e2e/helpers/catalog-fixture.ts, e2e/routes/app/tendencias.spec.ts, .github/workflows/ci.yml, .github/workflows/sicoob-ci.yml`

60 arquivos em tests/, 4 testes de edge function, 4 scripts Python de QA, 1 fixture SQL, 1 helper e 1 spec de e2e ausentes da main, mais os dois passos de CI que executam os scripts novos. Isso cai integralmente nas frentes 'suíte de testes perdida' e 'scripts de QA perdidos' que outro agente já está planejando — registro aqui apenas para o inventário não perder o volume; não detalho plano.


### Rotas /clientes e /clientes/:id fora do bloco AdminRoute — qualquer papel autenticado abre a lista e o detalhe de clientes do CRM

- **origem:** PR #119 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/App.tsx, /home/user/Brindes_Sicoob_V2/src/routes/app-router.tsx, /home/user/Brindes_Sicoob_V2/src/pages/sicoob/vendedor/SellerDashboardPage.tsx, /home/user/Brindes_Sicoob_V2/tests/security/privileged-client-data-guards.test.ts, /home/user/Brindes_Sicoob_V2/src/lib/access/role-policy.ts`

Mover /clientes e /clientes/:id para dentro de <Route element={<AdminRoute />}> (a PR fez isso no app-router.tsx:97-106), remover os dois atalhos 'Ver Clientes' do painel do vendedor (SellerDashboardPage.tsx:32,135) e trazer o teste estático que trava a regra. Não há nenhuma outra barreira: role-policy.ts não lista /clientes.


### Botão 'Criar Orçamento a partir desta Simulação' do calculador de quantidade aponta para a rota errada e descarta a simulação

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/pricing/QuantityPriceCalculator.tsx, /home/user/Brindes_Sicoob_V2/src/hooks/quote/useQuoteInitialization.ts, /home/user/Brindes_Sicoob_V2/src/components/pricing/calculator/types.ts, /home/user/Brindes_Sicoob_V2/tests/components/pricing/QuantityPriceCalculator.test.tsx, /home/user/Brindes_Sicoob_V2/tests/components/pricing/QuantityComparisonTable.test.tsx`

Navegar para /orcamentos/novo com state.simulationData no formato que useQuoteInitialization já consome, calcular as personalizações (setup, manuseio, unitário, total) para a quantidade escolhida, bloquear produto sem preço de venda, validar quantidade mínima por técnica e expor o seletor de quantidade do orçamento. Hoje o clique cai na lista de orçamentos e o payload é ignorado.


### Produto sem sale_price exibido como R$ 0,00 no simulador de preços

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/pricing/simulator/ProductSearch.tsx, /home/user/Brindes_Sicoob_V2/src/components/pricing/simulator/types.ts, /home/user/Brindes_Sicoob_V2/tests/components/pricing/simulator/ProductSearch.test.tsx`

Trazer hasValidSalePrice()/priceAvailable: hoje `price: p.sale_price ?? 0` transforma produto sem preço cadastrado em produto grátis na busca, na comparação e no total. A PR passa a rotular 'Preço indisponível' e desabilita a importação para orçamento.


### Deep link 'Confirmar sugestões do BI → novo orçamento' sem consumidor: a tela abre vazia

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/quote/useQuoteInitialization.ts, /home/user/Brindes_Sicoob_V2/src/components/bi/ConfirmQuoteSuggestionsModal.tsx, /home/user/Brindes_Sicoob_V2/src/hooks/quote/useQuoteProductSearch.ts, /home/user/Brindes_Sicoob_V2/tests/hooks/useQuoteInitialization.suggestions.test.ts, /home/user/Brindes_Sicoob_V2/tests/hooks/useQuoteInitialization.suggestions.integration.test.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useQuoteProductSearch.suggestions.test.ts`

parseQuoteSuggestionParams + loadQuoteProductsByIds: ler source=bi-suggestions, clientId e productIds (sanitizados, máx. 20) e pré-carregar cliente e itens no builder. A main publica o link mas nunca lê a query string.


### Estimador de frete do kit-builder apresenta tabela SEDEX/PAC inventada como valor estimado

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/kit-builder/FreightEstimator.tsx, /home/user/Brindes_Sicoob_V2/tests/scenarios/freight-truthfulness-contract.scenario.mjs`

Remover FREIGHT_TABLE/SEDEX/PAC e passar a 'Cotação pendente', deixando explícito que nenhum valor estimado entra no orçamento; o cenário .mjs vira catraca automática em npm run test:scenarios.


### Painel de Qualidade do Catálogo publica percentuais heurísticos e promessa de sincronização inexistente

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/admin/CatalogQualityDashboard.tsx, /home/user/Brindes_Sicoob_V2/tests/scenarios/real-indicators-contract.scenario.mjs`

Substituir as heurísticas por contagem exata (countMode 'exact', view v_products_missing_primary_image, filtro main_category_id_isnull), marcar métrica não aferida como null em vez de 0 e apagar o texto 'sincronizações automáticas a cada 6 horas'. NÃO VERIFICADO se a view existe hoje no catálogo externo — checar antes de implementar.


### Gráfico de Inteligência de Mercado gera série e fornecedores com Math.random() quando não há dado real

- **origem:** PR #119 · **impacto:** alto · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/intelligence/MarketIntelligenceChart.tsx, /home/user/Brindes_Sicoob_V2/tests/components/intelligence/MarketIntelligenceChart.stale-cache.test.tsx`

Remover generateMockMarketData e o fallback `hasRealData ? realData : mock`, usar EMPTY_MARKET_DATA, distinguir erro de vazio, sinalizar cache obsoleto (isStale) e oferecer 'Tentar novamente'.


### Fronteira de demonstração incompleta no BI: hooks devolvem MOCK_CLIENT_STATS/MOCK_SUGGESTIONS para cliente real sem histórico

- **origem:** PR #119 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientBI.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientAffinity.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientCategoryAffinity.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useBIDossierExport.ts, /home/user/Brindes_Sicoob_V2/tests/hooks/bi-demo-boundary.test.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useClientBI.real-data.test.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useClientCategoryAffinity.error.test.tsx`

Gatear todo mock por isDemoClient(clientId) (a infra src/lib/bi/demoClient.ts já está na main, só 3 dos 10 consumidores foram migrados) e separar hasData / isUnavailable / error, para que falha de consulta não seja serializada como 'cliente sem compras'. Inclui getAvailableClientHistory, que impede que o dossiê e o copiloto afirmem zero compras por causa de um erro de rede.


### Zonas de BI e inteligência sem estado de erro/indisponibilidade — copiloto, briefing, resumo executivo, health score e comparações apresentam lacuna como fato

- **origem:** PR #119 · **impacto:** alto · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/bi/BIAiCopilot.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/BIBriefingMode.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ExecutiveSummaryButton.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientHealthHero.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientLookalikes.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientCategoryRadar.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientComparator.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientVsIndustryComparison.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/IndustryTrendingProducts.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientOverview360.tsx, /home/user/Brindes_Sicoob_V2/src/components/bi/ClientSeasonalityHeatmap.tsx, /home/user/Brindes_Sicoob_V2/src/components/common/IntelligenceBadges.tsx, /home/user/Brindes_Sicoob_V2/src/components/intelligence/CategoryRanking.tsx, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientsComparison.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientHealthScore.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientVsIndustry.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useClientSeasonality.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useIndustryTrends.ts, /home/user/Brindes_Sicoob_V2/src/hooks/bi/useIndustryCategoryTrends.ts, /home/user/Brindes_Sicoob_V2/src/hooks/useProductIntelligenceBadges.ts`

Propagar isError/refetch de cada fonte até a UI e exibir 'indisponível' nomeando a fonte que falhou, com retry (role="alert"/role="status"). Hoje a main não tem nenhuma dessas barreiras — grave porque o copiloto e o briefing alimentam o prompt de IA com números que podem ser lacuna, e a PR traz ~20 testes de disponibilidade para travar isso (tests/components/bi/*.availability.test.tsx, tests/hooks/*.errors.test.*).


### 11 migrations versionadas na main que o aplicador nunca pode aplicar (fora da allowlist)

- **origem:** PR #119 · **impacto:** alto · **tipo:** migration
- **arquivos:** `/home/user/Brindes_Sicoob_V2/scripts/db/apply-sicoob-migrations.mjs, /home/user/Brindes_Sicoob_V2/supabase/migrations/20261015233500_restrict_search_analytics_grants.sql, /home/user/Brindes_Sicoob_V2/supabase/migrations/20261016163000_harden_ai_usage_quotas.sql, /home/user/Brindes_Sicoob_V2/supabase/migrations/20261016171500_secure_public_favorite_share_rpc.sql, /home/user/Brindes_Sicoob_V2/supabase/migrations/20261016172000_minimize_public_favorite_share_payload.sql, /home/user/Brindes_Sicoob_V2/supabase/migrations/20261016173000_remove_redundant_pa_budget_select_policy.sql`

Entradas de allowlist (arquivo + sha256) e as pós-condições que a PR escrevia para essas 11 migrations — telemetria de busca (6 arquivos), cota de IA, 3 de compartilhamento público de favoritos e 1 de policy redundante de verba de PA. Sem a entrada, apply-sicoob-migrations.yml ignora o arquivo: é DDL de produção, então é item para o dono decidir. NÃO VERIFICADO se o banco já tem esses objetos por outro caminho (não consultei produção).


### Publicador canônico de edge functions guiado pelo manifesto (hoje a main publica lista fixa de 13 e as outras ~93 nunca sobem)

- **origem:** PR #119 · **impacto:** alto · **tipo:** script-ci
- **arquivos:** `/home/user/Brindes_Sicoob_V2/scripts/deploy-edge-functions.mjs, /home/user/Brindes_Sicoob_V2/scripts/lib/edge-runtime-contract.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/edge-runtime-contract.test.mjs, /home/user/Brindes_Sicoob_V2/.github/workflows/deploy-sicoob-functions.yml, /home/user/Brindes_Sicoob_V2/docs/EDGE_FUNCTIONS_DRIFT.md`

Os dois módulos (validateEdgeRuntimeContract: função local sem contrato, contrato sem função local, verify_jwt divergente, source-only publicada, publicada sem contrato) e o cenário que trava o contrato; o workflow passa a chamar o script, publicar o inventário inteiro, exigir avanço de versão e subir artifacts/edge-deployment-report.json. Os campos runtime/gatewayVerifyJwt já existem no manifesto da main, então falta só o executor. Mexe em workflow de deploy → deixar a PR aberta para o dono.


### Cenários e fixtures SQL de contrato ausentes de tests/scenarios — inclusive os das 5 migrations recuperadas na #305

- **origem:** PR #119 · **impacto:** alto · **tipo:** teste
- **arquivos:** `/home/user/Brindes_Sicoob_V2/tests/scenarios/access-log-marketing-acl.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/business-realtime-contract.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/custom-kit-pinning-contract.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/view-notification-hardening.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/real-indicators-contract.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/freight-truthfulness-contract.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/public-health-contract.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/manager-approval-delegation-route.scenario.mjs, /home/user/Brindes_Sicoob_V2/tests/scenarios/sql/access-log-marketing-acl-fixture.sql, /home/user/Brindes_Sicoob_V2/tests/scenarios/sql/business-realtime-fixture.sql, /home/user/Brindes_Sicoob_V2/tests/scenarios/sql/storage-acl-hardening-fixture.sql, /home/user/Brindes_Sicoob_V2/tests/scenarios/sql/view-notification-hardening-fixture.sql, /home/user/Brindes_Sicoob_V2/tests/scenarios/sql/search-analytics-legacy-compatibility-fixture.sql, /home/user/Brindes_Sicoob_V2/tests/migrations/storage-acl-hardening.test.ts, /home/user/Brindes_Sicoob_V2/tests/migrations/search-analytics-reconciliation.test.ts`

A #305 trouxe as migrations, mas não os contratos que impedem a regressão delas. Como package.json:91 roda `node --test tests/scenarios/*.mjs`, cada arquivo entra como catraca automática de CI. Dois casos à parte: manager-approval-delegation-route já é satisfeito pela main (as 4 asserções passam) — falta só o arquivo; public-health-contract também já passa (health-check e bi-share-dossier foram endurecidos na main).


### Diretório de empresas do carrinho e dos favoritos não migrado para o DTO fechado do bridge — quebra para vendedor quando a #291 mergear

- **origem:** PR #119 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/cart/cart-company-options.ts, /home/user/Brindes_Sicoob_V2/src/components/cart/CartCompanyPickerDialog.tsx, /home/user/Brindes_Sicoob_V2/src/components/cart/CartCompanyPicker.tsx, /home/user/Brindes_Sicoob_V2/src/components/cart/CartCompanyDirectoryResults.tsx, /home/user/Brindes_Sicoob_V2/src/components/favorites/FavoritesClientPicker.tsx, /home/user/Brindes_Sicoob_V2/tests/components/cart/cart-company-options.test.ts, /home/user/Brindes_Sicoob_V2/tests/components/favorites/FavoritesClientPicker.directory.test.tsx, /home/user/Brindes_Sicoob_V2/tests/security/privileged-client-data-guards.test.ts`

A #291 recupera a política (canAccessCrmRequest nega select de CRM para papel vendedor) e o listQuoteDirectoryCompanies em src/lib/crm-db.ts, mas só migra CompanyContactSelector e CompanySearchDropdown. Os seletores de carrinho e de favoritos continuam em selectCrm('companies'), então passam a receber 403. Falta também buildCartCompanyAccessScope (chaves de localStorage 'cart-companies-recent'/'favorites' e queryKey hoje compartilhadas entre contas no mesmo navegador), busca no servidor com debounce em vez de baixar o diretório inteiro, e o estado de erro CartCompanyDirectoryResults. Este é um gap de cobertura da #291, não um tema novo.


### Fallback do catálogo local + timeout de 8s + propagação de erro na busca global (useGlobalSearch)

- **origem:** PR #145 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/components/search/useGlobalSearch.ts`

A main nunca lê o `error` de supabase.functions.invoke('semantic-search') (useGlobalSearch.ts:98), não tem timeout, não tem fallback para os produtos já carregados no ProductsContext, não repõe o searchIntent em cache hit e não limpa isSearching/isAIProcessing quando a query encurta para <3 chars. Resultado: com a edge fora do ar (ex.: LOVABLE_API_KEY ausente) ou lenta, a busca global devolve zero resultados e o indicador de IA fica girando. A PR entrega: `if (error) throw error`, SEMANTIC_SEARCH_TIMEOUT_MS=8000 com Promise.race + abort, searchLoadedProducts/createLocalFallback via useProductsContextSafe (que já existe na main em src/contexts/ProductsContextDef.ts:22), merge sem duplicar ids quando a semântica não traz produto, e cleanup de AbortController no unmount. CAI NO TEMA 'busca global e favoritos' que outro agente está planejando — não detalho plano.


### BI do Cliente: substituir dados simulados por estado explícito de amostra (dataStatus/hasData/hasEnoughData) nos 8 hooks e 9 componentes

- **origem:** PR #176 · **impacto:** alto · **tipo:** regra-de-negocio
- **arquivos:** `src/hooks/bi/useClientBI.ts, src/hooks/bi/useClientAffinity.ts, src/hooks/bi/useClientCategoryAffinity.ts, src/hooks/bi/useClientSeasonality.ts, src/hooks/bi/useIndustryTrends.ts, src/hooks/bi/useIndustryCategoryTrends.ts, src/hooks/bi/useClientVsIndustry.ts, src/hooks/bi/useClientHealthScore.ts, src/lib/bi/executive-summary.ts, src/components/bi/ClientOverview360.tsx, src/components/bi/ClientAffinityProducts.tsx, src/components/bi/ClientCategoryRadar.tsx, src/components/bi/ClientHealthHero.tsx, src/components/bi/ClientSeasonalityHeatmap.tsx, src/components/bi/IndustryTrendingProducts.tsx, src/components/bi/ExecutiveSummaryButton.tsx, src/components/bi/BIBriefingMode.tsx, src/components/bi/BIAiCopilot.tsx`

Tudo. A main ainda importa `@/lib/bi/mockData` em 6 hooks e cai no mock quando o cliente não tem histórico. Falta: trocar `isMock` por `dataStatus: loading\|unavailable\|insufficient\|available` + `hasData`; em useClientHealthScore, adicionar `hasEnoughData` e o resultado `insufficientHealthResult()` (hoje o score é calculado sobre crescimento fabricado de 50% e potencial fixo de R$ 30.000); em useClientVsIndustry, parar de devolver o benchmark de demonstração; em useClientSeasonality, separar `hasClientData`/`hasIndustryData` e não estimar meses sem amostra; nos componentes, trocar os selos 'Simulado'/'Dados simulados · em breve dados reais' por estados vazio/erro com role=status\|alert e exibir '—' em vez de número inventado.


### Front da aprovação pública desalinhado da migration de redação já aplicada: key React quebrada e tipos de campos que a RPC não devolve mais

- **origem:** PR #176 · **impacto:** alto · **tipo:** ui
- **arquivos:** `src/components/quotes/QuoteApprovalCard.tsx, src/hooks/useQuoteApprovalToken.ts`

A migration 20261118130600 (já na main) devolve itens sem `id`, sem `expires_at`, `subtotal` e `discount_amount` na raiz e sem `technique_id` nas personalizações. Falta: trocar `key={item.id}` por chave derivada (`${item.product_sku ?? item.product_name}-${index}`) e remover do tipo PublicQuoteApproval os campos que deixaram de existir, para o TS parar de prometer dados ausentes.


### Gate do antivírus não amarra o parecer ao arquivo: requireCleanScannerVerdict aceita verdict sem conferir sha256

- **origem:** PR #176 · **impacto:** alto · **tipo:** seguranca
- **arquivos:** `supabase/functions/sicoob-document-ingest/scanner.ts, supabase/functions/sicoob-document-ingest/index.ts, tests/unit/sicoob-document-scanner.test.ts`

Adicionar `sha256: string` ao `ScannerVerdict`, recusar com 503 quando `verdict.sha256` estiver ausente ou divergir (case-insensitive) de `input.sha256`, e passar o hash DO PARECER para `scan_evidence` em vez do hash calculado localmente. Hoje a constraint recuperada pela #305 é satisfeita por construção e não protege de parecer referente a outro arquivo (replay/resposta trocada do scanner).


### Incluir no workflow de publicação as edge functions chamadas por cron: connections-auto-test, process-batch-export e sicoob-approval-notifications (a main acrescentou connections-health-check como quarto caso depois da PR)

- **origem:** PR #178 · **impacto:** alto · **tipo:** workflow
- **arquivos:** `.github/workflows/deploy-sicoob-functions.yml`

A allowlist da main tem 13 funcoes e nenhuma dessas 4. Cron jobs versionados invocam todas elas contra `v_project_url` (projeto oficial): `supabase/migrations/20260923140000_secure_legacy_connection_crons.sql:36` -> connections-auto-test; `supabase/migrations/20260923111000_schedule_secure_export_worker.sql:34` -> process-batch-export; `supabase/migrations/20260922224300_schedule_sicoob_approval_worker.sql:35` e `20260922225500_monitor_sicoob_approval_worker.sql:37` -> sicoob-approval-notifications; `supabase/migrations/20261118130000_harden_storage_and_public_favorites_acl.sql:153` -> connections-health-check. Como `deploy-sicoob-functions.yml` (dispatch com PUBLICAR) e a unica rota autorizada de deploy, correcao nessas 4 funcoes nao tem como chegar a producao. Atencao: mexer em workflow exige deixar a PR aberta e chamar o dono (AGENTS.md).


### Contrato unico de credenciais E2E por papel: loginAs('user') deve usar E2E_USER_*, nao E2E_VIEWER_* (e o papel viewer deve sair do workflow e do .env.e2e.example)

- **origem:** PR #178 · **impacto:** alto · **tipo:** script-ci
- **arquivos:** `e2e/helpers/auth.ts, .github/workflows/e2e.yml, .env.e2e.example, e2e/fixtures/auth.setup.ts`

A main mantem a contradicao que a PR diagnosticou: `e2e/fixtures/auth.setup.ts:54-65` gera `.auth/storageState.json` logado com `E2E_USER_EMAIL`, enquanto `e2e/helpers/auth.ts:246,254` resolve o papel 'user' como `E2E_VIEWER_EMAIL \|\| E2E_USER_EMAIL`. Com `E2E_VIEWER_*` preenchido — e o workflow falha fechado sem ele (`.github/workflows/e2e.yml:141`) — o storageState nunca casa com a conta pedida e `restoreRoleStorage` rejeita a sessao, exatamente os 23 erros registrados na PR. Pior: a conta viewer nao tem alvo de limpeza (`e2e/helpers/cleanup-client.ts:340,355` so purga E2E_USER_EMAIL/E2E_ADMIN_EMAIL) e `e2e/flows/22-header-sticky.spec.ts:177,200` afirma sobre `E2E_USER_EMAIL!` numa sessao que seria do viewer. Falta: extrair `credentialsForRole(role, env)` com fallback explicito (manager->admin) e sem viewer, e remover `E2E_VIEWER_*` do export e do gate de credenciais do workflow (e2e.yml:99-100, 141, 294-295). NAO recuperar o `storedSessionEmail` da PR: a main ja valida a conta restaurada em runtime via `getStoredSessionEmail(page)` em e2e/helpers/auth.ts:171-176, solucao melhor que o parse estatico do localStorage.


### Reconciliacao do estado de registro no sicoob-document-ingest (registration-state) — CAI NO TEMA JA PLANEJADO POR OUTRO AGENTE ("registration-state do sicoob-document-ingest"), portanto nao detalho plano

- **origem:** PR #179 · **impacto:** alto · **tipo:** edge-function
- **arquivos:** `supabase/functions/sicoob-document-ingest/registration-state.ts, supabase/functions/sicoob-document-ingest/registration-state.test.ts, supabase/functions/sicoob-document-ingest/index.ts`

Perda real, confirmada: a main nao tem o modulo nem qualquer logica de estado de registro. Hoje, em origin/main:supabase/functions/sicoob-document-ingest/index.ts:117, `if (registerError) throw registerError` cai no catch da linha 122, que apaga cegamente o objeto final (linha 124) e o de quarentena (linha 125) em QUALQUER erro — inclusive quando a RPC register_sicoob_clean_document ja persistiu o registro e apenas a resposta se perdeu. Resultado: linha em sicoob_document_registry apontando para objeto de storage inexistente. A PR classificava o desfecho em not_attempted/confirmed/unknown, relia o registro para comparar os 9 campos esperados + status clean, e so apagava o que o plano de limpeza autorizava, preservando os objetos no caso unknown. Como o tema esta sob planejamento de outro agente, sinalizo apenas a existencia e a severidade.


### Religar os badges de confiança do fornecedor na página de produto (fornecedor verificado + prazo de entrega), sem mock

- **origem:** branch `backup/local-rascunho-20261031` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/pages/product-detail/ProductDetailHeroSections.tsx, src/pages/ProductDetail.tsx, src/hooks/useProductSupplierSources.ts, src/components/common/SocialProof.tsx`

A main renderiza `DynamicTrustBadges` com `EMPTY_SUPPLIER_TRUST` fixo (ProductDetailHeroSections.tsx:24 e :212), então prova social na página de produto está morta hoje. A branch tinha a fonte real (variant_supplier_sources.lead_time_days + suppliers.active). Não se deve copiar o hook da branch: ele caía em `getMockSupplierTrust` e inventava `avgRating`, o que viola a regra de 'sem mock' e não tem tabela de avaliações ativa na main (só em supabase/migrations_archive/2025). A main já tem a fonte auditável pronta em `src/hooks/useProductSupplierSources.ts` (lead_time_days na linha 17, is_preferred na linha 20): derivar `isVerified` e `deliveryDays` dela e deixar `avgRating: null` entrega os dois badges verdadeiros com diff mínimo.


### Recuperar a entrega inteira pela branch origin/devin/1791190000-ux-onda1 (PR #100), nao por esta: ux-onda2 e subconjunto byte a byte dela

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** alto · **tipo:** branch
- **arquivos:** `origin/devin/1791190000-ux-onda1, src/lib/overlay.ts, src/stores/useNavigationGuardStore.ts, src/hooks/useDirtyGuard.ts, src/hooks/useScrollRestoration.ts, src/components/common/NavigationGuardDialog.tsx, src/components/common/NavigationHistoryMenu.tsx, src/components/common/GlobalConfirmDialog.tsx, src/lib/uxMetrics.ts`

A PR #101 (ux-onda2 -> ux-onda1) foi MERGEADA em 12/10/2026 (merge_commit_sha e2c9279); quem foi fechada sem merge em 31/10 15:54 foi a PR #100 (ux-onda1 -> main). git diff --numstat ux-onda1 ux-onda2 nao lista nenhum arquivo exclusivo de ux-onda2, e ux-onda1 ainda traz GlobalConfirmDialog, uxMetrics, a troca de window.confirm por dialogo do design system em ~12 telas admin e um useScrollRestoration melhor (reaplica window.scrollTo nas tentativas escalonadas, nao so uma vez). Trabalhar na ux-onda2 jogaria fora a Onda 3.


### Guarda unificada de alteracoes nao salvas no voltar global (botao, breadcrumbs, swipe, atalho)

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/stores/useNavigationGuardStore.ts, src/hooks/useDirtyGuard.ts, src/components/common/NavigationGuardDialog.tsx, src/hooks/useSmartNavigation.ts, src/components/layout/MainLayout.tsx, src/pages/KitBuilderPage.tsx, src/pages/QuoteBuilderPage.tsx`

Hoje a main so pede confirmacao em 3 rotas por substring e com window.confirm (src/hooks/useSmartNavigation.ts:38), e o useUnsavedChangesGuard existente e local por pagina. Montar kit ou orcamento em qualquer outra rota e apertar voltar/swipe perde o trabalho do vendedor sem aviso.


### Autosave do kit: incluir identidade no payload e corrigir a corrida com o save manual

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/hooks/useKitAutoSave.ts, src/hooks/useCustomKitPersistence.ts, tests/hooks/useKitAutoSave.test.tsx`

Na main buildAutoSavePayload nao envia kitIdentityLabels/kitIdentityDetails: a cada autosave o kit salvo perde nome, cor, icone, descricao e favorito que o usuario definiu. E um save manual que ultrapasse um autosave em voo deixa gravado o snapshot antigo. Dado de cliente perdido silenciosamente.


### Limpar o historico de navegacao no logout (vazamento entre usuarios no mesmo navegador)

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/contexts/AuthContext.tsx`

src/stores/useNavigationStore.ts:50 persiste em localStorage 'navigation-history' os titulos das paginas visitadas (nomes de orcamentos e kits) e clearSensitiveBrowserData() (AuthContext.tsx:100-112) nao apaga essa chave nem chama clear(). Logout + login de outro vendedor na mesma maquina expoe os orcamentos do anterior.


### Apagar da main a aprovação pública legada órfã (a entrega que a branch fez e a main não replicou)

- **origem:** branch `fix/sicoob-aprovacao-legada-20260923` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/pages/PublicQuoteApprovalPage.tsx, src/pages/public-approval/usePublicQuoteApproval.ts, src/pages/public-approval/PublicQuoteItems.tsx, src/pages/public-approval/PublicQuoteStatusScreens.tsx, tests/public-approval/usePublicQuoteApproval.test.ts, tests/public-approval/PublicQuoteStatusScreens.test.tsx`

São 6 arquivos sem rota que falam com um endpoint já desligado (410). O risco de negócio não é o código parado: é um agente futuro reapontar `/approve/:token` para essa página — que ainda parece completa e tem testes verdes — e quebrar a aprovação do cliente final, a etapa que fecha o pedido. A main já decidiu a favor da branch nas rotas (public.ts:45,49,73) e já blinda a decisão em tests/scenarios/aprovacao-publica-roteamento.mjs:16; só falta remover o cadáver. A deleção é segura: nenhum arquivo de src/ importa esses módulos fora deles mesmos.


### Apagar a aprovação pública legada na main (o que a PR #26 fez e nunca chegou lá)

- **origem:** branch `fix/sicoob-p0-operacional-20260923` · **impacto:** alto · **tipo:** branch
- **arquivos:** `src/pages/PublicQuoteApprovalPage.tsx, src/pages/public-approval/PublicQuoteItems.tsx, src/pages/public-approval/PublicQuoteStatusScreens.tsx, src/pages/public-approval/usePublicQuoteApproval.ts, tests/public-approval/PublicQuoteStatusScreens.test.tsx, tests/public-approval/usePublicQuoteApproval.test.ts, e2e/flows/p0/03-quote-blocked.spec.ts`

Tela de aprovação sem login, com 841 linhas, invocando uma edge já desativada (410), fora do roteamento e invisível a qualquer revisão. É a única corrida provada: a PR #24 (branch → main) mergeou às 00:14:17Z de 25/09 e a PR #26 (remoção → branch) às 00:14:50Z, 33 segundos depois. A própria main já pediu essa limpeza no item EDG-08 (docs/execucao/lacunas-funcionalidades-2026-10-11/indice-lacunas.csv:611) e ela libera 1 das 100 vagas de edge function ao despublicar quote-public-view.


### Ranking de categorias engole falha do mercado e trunca a base

- **origem:** PR #112 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `src/hooks/useCommercialIntelligence.ts, src/components/intelligence/CategoryRanking.tsx, src/components/intelligence/ConversionFunnel.tsx, tests/components/intelligence/CategoryRanking.errors.test.tsx, tests/components/intelligence/analytics-query-errors.test.tsx, tests/hooks/useCategoryRanking.errors.test.tsx`

A main captura a falha da consulta de estoque externo e só loga um warn, continuando a apresentar o ranking rotulado como 'Combinado' com apenas a receita interna; e as consultas de order_items / stock_daily_summary usam limite fixo (5000, e select sem range nos order_items) sem detectar truncamento. A PR adiciona CategoryRankingData com marketAvailable/marketError, força o modo de ordenação para 'internal' quando não há mercado, pagina order_items e as linhas externas com teto explícito e erro quando a paginação não avança, e acrescenta banner de erro + 'Tentar novamente' no CategoryRanking e no ConversionFunnel (hoje o funil também engole o error de cada uma das 4 queries).


### Painel de telemetria do admin mostra 0 quando a consulta falha

- **origem:** PR #112 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/pages/admin/telemetry/useErrorCounters.ts, src/pages/admin/telemetry/useTelemetryData.ts, src/pages/admin/AdminTelemetriaPage.tsx, tests/pages/AdminTelemetriaPage.test.tsx`

useErrorCounters não expõe isError e devolve 'query.data?.errors1h ?? 0'; useTelemetryData também não expõe isError. Com a query falhando, o painel de operação exibe '0 erros na última hora' — um falso 'tudo certo'. A PR troca o tipo do contador para number\|null, exibe 'Falha', e adiciona TelemetryFailureBanner ('nenhum valor foi interpretado como zero') + TelemetryTable com estado de erro e retry.


### Rascunho de orçamento perde cliente, contato e todas as condições comerciais

- **origem:** PR #112 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `src/pages/QuoteBuilderPage.tsx, tests/pages/QuoteBuilderPage.behavior.test.tsx`

O autosave da main grava só {clientId, validUntil, discountType, discountValue, notes, internalNotes, items, tags}. Ao restaurar, o vendedor perde contactId, companyInfo, contactInfo, validityDays, negotiationMarkup, paymentTerms, deliveryTime/Mode/Date e shippingType/Cost — e a tela diz 'Rascunho restaurado!'. A PR exporta buildQuoteDraftData/restoreQuoteDraft cobrindo todos esses campos, com coerção segura (validDraftDate, draftString, draftNumber, draftTags).


### Edição de orçamento com contato falsificado e estado residual do orçamento anterior

- **origem:** PR #112 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `src/hooks/quote/useQuoteInitialization.ts, tests/hooks/useQuoteInitialization.reset.test.ts, tests/hooks/useQuoteInitialization.loading.test.tsx, tests/hooks/useQuoteInitialization.mapping.test.ts`

Dois defeitos: (1) setContactId recebe quote.client_id, satisfazendo artificialmente a seleção de contato com o id da empresa (o modelo legado não persiste contact_id); (2) os aplicadores só escrevem quando o campo é truthy, então abrir o orçamento B depois do A mantém payment_terms, shipping_type/cost, negotiation_markup, tags, items, discount e delivery do A em tela — e esses valores vão para o save. A PR normaliza sempre (ou valor do orçamento, ou o default) e adiciona setQuoteLoadError + reloadKey para falha de carga.


### Deep link 'Visualizar com Logo' não leva o produto ao gerador de mockup

- **origem:** PR #112 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/components/products/ProductCategoryBadges.tsx, src/hooks/useMockupGenerator.ts, tests/hooks/useMockupGenerator.test.ts`

O badge navega para /mockup-generator passando state.preSelectedProduct, mas nada na rota lê essa chave (só SimuladorWizard lê, para /simulador) — o usuário cai num gerador vazio. A PR passa ?product_id= e faz o useMockupGenerator resolver o id pelo provider com estados loading/failed e botão de retry, distinguindo a janela de debounce de 50ms do fetch em lote de uma falha real. Também remove o último import de @/data/mockData nesse componente.


### Chips de filtro de categoria vindos de mock e lead time inventado na comparação

- **origem:** PR #112 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/components/catalog/CatalogActiveFilters.tsx, src/components/compare/CompareTableView.tsx, src/hooks/useExternalCategoriesQuery.ts, tests/hooks/useExternalCategoriesQuery.test.ts`

CatalogActiveFilters resolve o nome da categoria selecionada contra a constante CATEGORIES de @/data/mockData; para categoria real o find falha e o chip simplesmente não aparece (retorna null) — o usuário não vê nem consegue remover o filtro ativo. A PR usa useCategoriesByIds (dado real) com fallback textual. No CompareTableView, a main fabrica a linha 'Lead time' a partir do stockStatus ('1-3 dias' / '5-10 dias' / 'Sob consulta'), ou seja, promessa de prazo inventada numa tabela que o vendedor mostra ao cliente; a PR troca por 'Prazo de entrega' lido de product.leadTimeDays, ou 'Sob consulta'.


### Página Match de Produtos cai em catálogo fictício quando a consulta real volta vazia ou falha

- **origem:** PR #119 · **impacto:** medio · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/pages/ProductMatchPage.tsx, /home/user/Brindes_Sicoob_V2/src/data/mock-match-products.ts`

Trocar `dbProducts.length > 0 ? dbProducts : MOCK_MATCH_PRODUCTS` pelos três estados explícitos (carregando / catálogo indisponível com retry / nenhum produto ativo) e deletar o mock.


### Lista de clientes trunca em 200 registros e apresenta o recorte como total da base

- **origem:** PR #119 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/useCrmCompanies.ts, /home/user/Brindes_Sicoob_V2/src/pages/ClientsPage.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useCrmCompanies.pagination.test.ts, /home/user/Brindes_Sicoob_V2/tests/pages/ClientsPage.pagination.test.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useCrmClientsPage.test.ts`

useAllCrmCompanies com paginação de 1.000 em 1.000, teto duro de 10.000 e erro explícito ao estourar ('a consulta foi interrompida para não exibir totais parciais'), além de selectCrmByIdStrict/selectCrmPage e ordenação estável. Hoje os KPIs da tela de clientes somam no máximo 200 empresas, sem aviso.


### Gates de CI órfãos: scripts existem na main e nenhum workflow os executa

- **origem:** PR #119 · **impacto:** medio · **tipo:** workflow
- **arquivos:** `/home/user/Brindes_Sicoob_V2/.github/workflows/ci.yml, /home/user/Brindes_Sicoob_V2/scripts/validate-docs-consistency.mjs, /home/user/Brindes_Sicoob_V2/scripts/check-edge-request-id-propagation.mjs, /home/user/Brindes_Sicoob_V2/scripts/consolidate-console-snapshot.mjs, /home/user/Brindes_Sicoob_V2/scripts/qa/supabase_postgres_container.py, /home/user/Brindes_Sicoob_V2/scripts/qa/test_supabase_postgres_container.py`

Quatro passos do job de segurança/contratos: node scripts/validate-docs-consistency.mjs, node scripts/check-edge-request-id-propagation.mjs, STRICT_REF_WARNINGS='1' na suíte com upload do console-snapshot, e `python3 -m unittest scripts/qa/test_supabase_postgres_container.py` (este último exige trazer o helper supabase_postgres_container.py, que não está na main). Mexe em workflow → PR aberta para o dono.


### Catraca de skip de teste crítico por identidade (hoje só conta quantidade, pode ser burlada trocando o skip)

- **origem:** PR #119 · **impacto:** medio · **tipo:** script-ci
- **arquivos:** `/home/user/Brindes_Sicoob_V2/scripts/check-critical-test-skip-budget.mjs, /home/user/Brindes_Sicoob_V2/scripts/critical-test-skips-baseline.json, /home/user/Brindes_Sicoob_V2/tests/scenarios/critical-test-skips.scenario.mjs`

collectCriticalSkips/compareCriticalSkips + baseline por identidade do skip (arquivo + título), em vez de BASELINE_BY_FILE por contagem. Hoje trocar um skip aprovado por outro não revisado mantém o total e passa no gate.


### Concorrência entre abas: rascunho de orçamento e notificações lidas sobrescrevem estado da outra aba

- **origem:** PR #119 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/useAutoSave.ts, /home/user/Brindes_Sicoob_V2/src/components/quotes/QuoteAutoSave.tsx, /home/user/Brindes_Sicoob_V2/src/hooks/useWorkspaceNotifications.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useAutoSave.test.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useWorkspaceNotifications-cache-invalidation.test.tsx, /home/user/Brindes_Sicoob_V2/tests/components/quotes/QuoteProductSelector.concurrent-save.test.tsx`

No autosave: estado 'conflict' ('Rascunho alterado em outra aba' / 'Recarregue para conciliar'), escuta de StorageEvent, snapshot salvo para recomputar hasChanges e reset ao trocar de chave. Nas notificações: readIdsRef para leitura só transitar de não lida para lida e BroadcastChannel por usuário para espelhar confirmações entre abas sem reabrir o badge.


### CategoryRanking/useCommercialIntelligence: ranking de categorias sem paginação do catálogo externo e sem sinalizar indisponibilidade do dado de mercado

- **origem:** PR #119 · **impacto:** medio · **tipo:** regra-de-negocio
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/useCommercialIntelligence.ts, /home/user/Brindes_Sicoob_V2/src/components/intelligence/CategoryRanking.tsx, /home/user/Brindes_Sicoob_V2/tests/hooks/useCategoryRanking.errors.test.tsx, /home/user/Brindes_Sicoob_V2/tests/components/intelligence/CategoryRanking.errors.test.tsx, /home/user/Brindes_Sicoob_V2/tests/components/intelligence/analytics-query-errors.test.tsx`

Paginação (CATEGORY_PAGE_SIZE 1000, chunk de filtro 100, teto 100000) em vez de limit: 5000 fixo, e o contrato CategoryRankingData { items, marketAvailable, marketError } para a tela distinguir 'sem venda' de 'mercado indisponível'.


### Cache de favoritos sem particionamento por usuário (queryKey global)

- **origem:** PR #119 · **impacto:** medio · **tipo:** seguranca
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/hooks/useFavoriteLists.ts, /home/user/Brindes_Sicoob_V2/tests/hooks/useFavoriteListsQueryKeys.test.ts, /home/user/Brindes_Sicoob_V2/src/hooks/useEnrichedFavoriteItems.ts, /home/user/Brindes_Sicoob_V2/src/hooks/useFavoriteReactions.ts`

favoriteListsQueryKey(userId)/favoriteItemsQueryKey(userId, listId)/TRASH_KEY(userId): hoje as chaves são ['favorite-lists'] e [FAVORITE_ITEMS_KEY, listId], sem o usuário, então o cache do React Query sobrevive à troca de conta na mesma aba. CAI no tema 'busca global e favoritos' que o outro agente está planejando — registro aqui só para não se perder.


### Teste de fallback da busca global (edge com erro e edge sem resposta)

- **origem:** PR #145 · **impacto:** medio · **tipo:** teste
- **arquivos:** `tests/components/search/useGlobalSearch-fallback.test.tsx`

Arquivo inteiro (122 linhas) não existe na main. Cobre os dois caminhos do item anterior: invoke retornando {data:null,error} e invoke pendurado com fake timers avançando 8s, asseverando resultados do catálogo local e isSearching/isAIProcessing em false. Sem ele a correção do hook não tem catraca. Mesmo tema da busca global.


### Toast de remoção de favorito mostra sempre 'Item' (bug vivo na main)

- **origem:** PR #145 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/hooks/useFavoriteLists.ts, src/pages/FavoritesPage.tsx`

Na main, removeItem.onSuccess lê o nome do produto do 3º argumento (`ctx`) da mutation, mas não existe nenhum onMutate em useFavoriteLists.ts, então ctx é sempre undefined e o toast de undo sai literalmente como 'Item removido' para qualquer produto. A PR passa `{ id, productName }` como variables da mutation, lê de `variables.productName` e ajusta o texto para '<nome> removido dos favoritos'; exige atualizar os 3 call sites de FavoritesPage. CAI NO TEMA 'busca global e favoritos'.


### Card de favorito indisponível (favorito cujo produto não resolve desaparece da tela)

- **origem:** PR #145 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/pages/FavoritesPage.tsx`

A main só renderiza os favoritos que o catálogo conseguiu resolver; item salvo cujo product_id não volta do catálogo simplesmente não aparece em nenhuma das 3 views (grid/list/table) e, se for o único, a página mostra o estado vazio — o usuário não vê nem consegue remover. A PR adiciona UnavailableFavoriteCard (data-testid favorite-item/favorite-remove, aria-label próprio), deriva unavailableFavoriteIds a partir de resolvedProductIds e injeta os cards nas 3 views, com ações 'Tentar novamente' (getProductsByIds) e 'Remover'. CAI NO TEMA 'busca global e favoritos'.


### Spec e2e de visualização de orçamento sem asserção de happy path

- **origem:** PR #145 · **impacto:** medio · **tipo:** teste
- **arquivos:** `e2e/routes/quotes/view.spec.ts`

Na main o spec só declara `successBody: quote` e nunca verifica que a tela renderizou: não distingue a resposta de objeto único (header Accept application/vnd.pgrst.object+json) da de lista, não mocka quote_items e não tem happyAssert. A PR adiciona successBodyForRequest, setupSuccessMocks(quote_items=[]) e happyAssert no h1 'Orçamento Q-E2E-001'. A infraestrutura para isso JÁ está na main (_factories.ts), só o spec ficou atrás — recuperação é de baixo risco. Possível sobreposição com o tema 'suíte de testes perdida' de outro agente.


### restoreRoleStorage aceita storage de outra conta antes de falhar

- **origem:** PR #145 · **impacto:** medio · **tipo:** teste
- **arquivos:** `e2e/helpers/auth.ts`

A main restaura o arquivo de storage do papel e só então faz poll de 10s esperando o e-mail bater; quando a sessão global foi criada com E2E_USER_EMAIL e o fluxo pede E2E_VIEWER_EMAIL, o teste queima 10s e falha em vez de cair para o login por UI. A PR inspeciona as chaves sb-*-auth-token do arquivo antes de restaurar e retorna false se o e-mail não é o pedido. Possível sobreposição com 'suíte de testes perdida'.


### Helper `getUserCredentials` que alinha a identidade do storageState global de E2E à identidade usada por `loginAs('user')`, mais os dois testes unitários de precedência viewer→user

- **origem:** PR #148 · **impacto:** medio · **tipo:** teste
- **arquivos:** `e2e/helpers/user-credentials.ts, tests/e2e/user-credentials.test.ts, e2e/fixtures/auth.setup.ts, e2e/helpers/auth.ts`

Na main, `auth.setup.ts:54-55` lê apenas `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` para gerar o `storageState.json` compartilhado, enquanto `auth.ts:246,254` resolve o papel `user` como `E2E_VIEWER_* \|\| E2E_USER_*`. Com os dois pares provisionados e apontando para contas diferentes (o workflow injeta ambos: `.github/workflows/e2e.yml:99-100,294-295`), os specs que herdam o storageState testam uma conta e os que chamam `loginAs('user')` testam outra — divergência silenciosa de escopo/papel em toda a suíte autenticada. Falta na main: o módulo `e2e/helpers/user-credentials.ts` (20 linhas, exporta `getUserCredentials(env)` com precedência viewer-completo → fallback user), a substituição das duas leituras diretas em `auth.setup.ts` por esse helper, o uso do helper nos dois ternários de `loginAs`, e o teste `tests/e2e/user-credentials.test.ts` (2 casos: prioriza par viewer; cai no par user quando o viewer está incompleto). Possível sobreposição com o tema 'suíte de testes perdida' que outro agente está planejando — se for o mesmo pacote, cai nele.


### Projeção de allowlist na edge quote-approval (defesa em profundidade sobre a redação feita no RPC)

- **origem:** PR #176 · **impacto:** medio · **tipo:** edge-function
- **arquivos:** `supabase/functions/quote-approval/index.ts, tests/scenarios/edge-aprovacao-publica.mjs`

A main repassa o payload bruto do RPC ao cliente público. Falta a projeção `publicQuoteProjection()` com `pick()` por allowlist (raiz, item e personalização) para que qualquer campo novo acrescentado ao RPC no futuro não vaze por omissão, mais o cenário que prova a não-exposição de unit_cost/setup_cost/total_cost/internal_notes/signature_evidence.


### Pós-condições das duas migrations de segurança recém-aplicadas não são verificadas pelo aplicador

- **origem:** PR #176 · **impacto:** medio · **tipo:** script-ci
- **arquivos:** `scripts/db/apply-sicoob-migrations.mjs, tests/scripts/apply-sicoob-migrations-scanner.test.ts`

As migrations entraram na allowlist (20261118130600/130700), mas o passo `--require-applied` não confere o contrato delas no banco. Falta: `validateRecentSecurityMigrationContract` + a query que valida, para `quote_approval_public_items(uuid)`, `get_public_quote_approval(text)` e `register_sicoob_clean_document(...)`, que são SECURITY DEFINER, com `search_path=pg_catalog, public`, EXECUTE só para service_role (anon/authenticated/PUBLIC negados) e com o corpo igual ao da migration; e que a constraint `sicoob_document_registry_scan_evidence_sha256_match` existe, está NOT VALID e tem a semântica esperada. Depende de generalizar `extractFunctionBody` (a main só aceita o delimitador literal `AS $function$`; as duas migrations novas usam `AS $$`) e de exportar a função.


### Cleanup do E2E não purga as personas VIEWER/MANAGER/DEV e nunca casa o prefixo [E2E:<slug>] que a própria fixture gera

- **origem:** PR #176 · **impacto:** medio · **tipo:** teste
- **arquivos:** `e2e/helpers/cleanup-client.ts, e2e/global-setup.ts, e2e/global-teardown.ts, tests/unit/e2e-cleanup-client.test.ts`

Dois defeitos reais na main. (a) `purgeAll` só varre `userEmail` e `adminEmail`; o workflow configura também VIEWER/MANAGER/DEV, cujos resíduos nunca são apagados — falta `additionalUserEmails`. (b) O filtro padrão é o prefixo literal `[E2E]`, que não casa com os nomes criados por `e2eScope(slug)` = `[E2E:<slug>]` ('[E2E:' difere de '[E2E]' no 5º caractere), então setup/teardown globais deixam para trás tudo que passou com sucesso — falta `purgeAllE2eTestData` varrendo prefixo configurado + `[E2E]` + `[E2E:`. Falta também a validação de `E2E_TEST_PREFIX` para recusar prefixo fora do namespace e o teste unitário do cliente de cleanup (a main só testa o CLI, não a biblioteca). Não recuperar: a troca de prefixo por teste (`[E2E] <hash>`) e a remoção da fixture `cleanupOnFailure` — é redesenho, não correção.


### Suíte de testes dos hooks de BI inexistente na main (4 arquivos)

- **origem:** PR #176 · **impacto:** medio · **tipo:** teste
- **arquivos:** `tests/hooks/bi/useClientBI.test.ts, tests/hooks/bi/useClientCategoryAffinity.test.tsx, tests/hooks/bi/useClientSeasonality.test.tsx, tests/hooks/bi/useIndustryTrends.test.tsx`

O diretório tests/hooks/bi/ não existe na main. São os testes que travam a regressão do item do BI: distinguem 'insufficient' de 'unavailable' de 'available' e provam que nenhuma categoria/KPI é inventado quando não há amostra. Devem vir junto com a remoção dos mocks, não antes.


### Catraca de paridade entre os workers cron e o workflow de publicacao (tests/scripts/scheduled-edge-deploy-parity.test.ts)

- **origem:** PR #178 · **impacto:** medio · **tipo:** teste
- **arquivos:** `tests/scripts/scheduled-edge-deploy-parity.test.ts, .github/workflows/deploy-sicoob-functions.yml`

Nao existe nenhum teste na main que compare as funcoes invocadas por migrations com a allowlist do workflow (git ls-tree origin/main tests/scripts/ nao tem nada de 'parity' nem de 'edge-deploy'). Sem a catraca, o item anterior volta a divergir em silencio a cada nova migration de cron. O teste da PR precisa de adaptacao, nao copia: ele exige `expect(lists).toHaveLength(2)` e a main tem UMA unica lista `for function_name in` — o passo de confirmacao foi refatorado para `node scripts/ci/verify-supabase-functions-published.mjs`. Tambem assume que 'dispatch_sicoob_' aparece na migration, o que nao cobre as migrations de cron legadas de connections/export (nessas o grep por /functions/v1/ ja basta).


### Teste de contrato dos papeis E2E (tests/e2e/auth-role-contract.test.ts)

- **origem:** PR #178 · **impacto:** medio · **tipo:** teste
- **arquivos:** `tests/e2e/auth-role-contract.test.ts, e2e/helpers/auth.ts`

Nao existe na main (git ls-tree origin/main tests/e2e/ nao lista auth-role-contract). Cobre o cruzamento de contas entre papeis — o 'user' alinhado ao storageState canonico, editor com fallback explicito para admin, admin e dev sem cruzar. So faz sentido junto com a extracao de `credentialsForRole`; os 2 casos de `storedSessionEmail` do arquivo devem ser descartados, porque a main resolve isso em runtime.


### Gate de header sticky: medir o header sem esperar o marcador de permissoes, e tratar /403 como redirect legitimo

- **origem:** PR #178 · **impacto:** medio · **tipo:** script-ci
- **arquivos:** `e2e/flows/22-header-sticky.spec.ts`

A main chama `gotoAndSettle(page, routePath)` sem opcoes em e2e/flows/22-header-sticky.spec.ts:65, logo espera `[data-route-pending]` completo (permissoes inclusas) — causa dos 4 casos que expiraram em e2e/helpers/nav.ts antes de chegar a medicao sticky, segundo a propria PR. A infraestrutura para o fix JA esta na main: `e2e/helpers/nav.ts:67,70-71` aceita `waitForPermissions: false` e troca o seletor para `[data-route-pending="lazy"]`; so o gate nao usa. Falta tambem renomear o retorno 'redirected-to-login' para cobrir /403 (a regex de linha 68 ja aceita login\|403, mas a mensagem de skip em :125,:141 mente) e reescrever a mensagem de erro, que hoje aponta cegamente para regressao CSS de overflow/transform quando a falha pode ser de prontidao de rota. Tema vizinho: 'UX Onda 1/2 (guardas de navegacao)' esta com outro agente — aqui o escopo e so o spec do gate de CI, nao os guards de rota.


### Centralizar a imagem Postgres das simulacoes de QA em GHCR presa a digest (POSTGRES_IMAGE)

- **origem:** PR #178 · **impacto:** medio · **tipo:** script-ci
- **arquivos:** `scripts/qa/postgres_ready.py, scripts/qa/simular-acl-efetiva.py, scripts/qa/simular-controles-auditoria.py`

A main continua com a imagem literal `public.ecr.aws/supabase/postgres:17.6.1.063` repetida em dois scripts e sem digest (simular-acl-efetiva.py:23 e simular-controles-auditoria.py:23). A PR movia para `ghcr.io/supabase/postgres:17.6.1.063@sha256:178f0976...` numa constante unica em postgres_ready.py, e o run 145773579 da PR confirmou os dois simuladores verdes com a imagem GHCR — era a correcao do rate limit de ECR. `postgres_ready.py` da main evoluiu bastante (passou a exigir Docker no CI), mas nao tem a constante. Como esses simuladores sao prova obrigatoria no CI, uma recusa do registry derruba o job sem relacao com o codigo. Checar se outros scripts de scripts/qa/ precisam do mesmo pin antes de aplicar.


### Escape de curinga LIKE/ILIKE nas buscas do crm-db-bridge (helper compartilhado escapeIlikeSearchTerm + 3 pontos de chamada + teste Deno)

- **origem:** PR #179 · **impacto:** medio · **tipo:** seguranca
- **arquivos:** `supabase/functions/_shared/ilike-pattern.ts, supabase/functions/crm-db-bridge/index.ts, supabase/functions/crm-db-bridge/search-pattern.test.ts`

A main interpola o termo de busca cru no padrao ILIKE em tres caminhos do crm-db-bridge: handleBatch (origin/main:supabase/functions/crm-db-bridge/index.ts:596), handleSelect (linha 754) e handleSearch (linha 778), todos como `%${q.search.term}%` / `%${search.term}%`. Um termo contendo % ou _ vira curinga e amplia a consulta no CRM externo alem do que o chamador pediu (retorno de linhas nao solicitadas; `%` sozinho casa a tabela inteira ate o limite). Nao e injecao de SQL (supabase-js parametriza), e injecao de curinga de padrao. O arquivo supabase/functions/_shared/ilike-pattern.ts, com a funcao de 3 linhas que escapa [\\%_], nao existe na main, nem qualquer equivalente: o unico escape desse tipo na main e uma copia local inline em origin/main:supabase/functions/e2e-cleanup/index.ts:294, ou seja a ideia existe no repo mas nunca foi aplicada ao crm-db-bridge. O teste search-pattern.test.ts (2 casos: literalizar %/_ e duplicar barra invertida) tambem nao existe.


### Clamp do retângulo de destaque do Onboarding Tour ao viewport

- **origem:** PR #94 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/components/onboarding/OnboardingTour.tsx`

A PR calculava `highlightBox` limitando left/top/right/bottom a [0, window.innerWidth/innerHeight] antes de desenhar a borda de destaque. A main desenha a borda com `top: rect.top - 4, left: rect.left - 4, width: rect.width + 8, height: rect.height + 8` sem nenhum limite, então quando o alvo do passo está na borda da tela a borda do spotlight sai do viewport (offset negativo / largura além da janela) e cria scroll horizontal. Falta portar o clamp para o componente `TargetHighlight`, que na main é uma função separada recebendo `rect`.


### Cinco nomes acessíveis (aria-label) que a main não reimplementou

- **origem:** PR #94 · **impacto:** medio · **tipo:** ui
- **arquivos:** `src/pages/CollectionDetailPage.tsx, src/pages/CollectionsPage.tsx, src/components/inventory/StockFilterToolbar.tsx, src/components/inventory/VariantStockTable.tsx, src/pages/QuotesKanbanPage.tsx, src/components/common/PersistentBreadcrumbs.tsx`

A main refez a varredura de aria-label da PR #94 com texto próprio em ~20 dos 25 arquivos (ex.: QuotesListPage usa "Buscar orçamento por número, cliente ou empresa", AdvancedPriceSearchPage usa `aria-label={label}`), mas 5 controles continuaram sem nome acessível: (a) input de busca de /colecoes/:id; (b) botão X que dispensa a dica em /colecoes; (c) botão X que limpa a busca em StockFilterToolbar; (d) Button X que limpa o filtro da VariantStockTable; (e) botão X que limpa a busca no kanban de orçamentos. Os dois primeiros são visíveis no carregamento inicial de rotas cobertas pelas suítes e2e/routes/app/colecao-detail.spec.ts e colecoes.spec.ts, cujo teste @a11y reprova input/botão sem nome. Falta também o `type="button"` que a PR punha no botão de breadcrumbs intermediários (a main tem o aria-label, mas não o type).


### Dados reais de confiança do fornecedor na página de produto (badges de prazo de entrega / fornecedor verificado)

- **origem:** branch `audit/revisao-plano-20260924` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts, src/pages/product-detail/ProductDetailHeroSections.tsx, src/components/common/SocialProof.tsx`

A main renderiza os badges de confiança com constante vazia hardcoded: `const EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null }` em src/pages/product-detail/ProductDetailHeroSections.tsx:24, consumida em :212. Ou seja, o cliente nunca vê prazo de entrega nem selo de fornecedor verificado — a seção existe na tela e não mostra nada. A branch tem o hook de 117 linhas que busca o dado real (variant_supplier_sources.lead_time_days + suppliers.active via invokeExternalDb/invokeBatchBridge) e era ligado em src/pages/ProductDetail.tsx:29,55. Na main não há nenhum consumidor de SupplierTrustData com dado real (git grep DynamicTrustBadges\|SupplierTrustData origin/main -- src: só a definição e o uso vazio). Ao recuperar, descarte o fallback getMockSupplierTrust do hook original (AGENTS.md proíbe mock) e use estado vazio/erro explícito. Ressalva: este arquivo NÃO é trabalho desta branch — vem da main antiga (commit 6193793a7) e está em 261 branches remotas; a recuperação é de escopo global, não desta branch.


### Voltar fecha o overlay aberto antes de sair da pagina, com tooltip excluido e tour protegido do Escape

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/lib/overlay.ts, src/hooks/useSmartNavigation.ts, src/components/onboarding/OnboardingTour.tsx, tests/lib/overlay.test.tsx`

Comportamento esperado de app: com modal/menu aberto, voltar fecha o overlay em vez de abandonar a tela. Sem isso o usuario sai da pagina sem perceber e perde o contexto.


### Restauracao de scroll ao voltar (window + grades virtualizadas) e menu de historico de varios passos

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useScrollRestoration.ts, src/components/common/NavigationHistoryMenu.tsx, src/components/common/PersistentBreadcrumbs.tsx, src/components/products/VirtualizedProductGrid.tsx`

Voltar do detalhe do produto para o catalogo hoje joga o usuario no topo da grade; em catalogo longo isso derruba a navegacao de quem monta kit. O useScrollRestoration da ux-onda1 e o melhor dos dois (reaplica em 0/150/400/900ms).


### Filtros de orcamentos e pedidos persistidos na URL e ressincronizados

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/pages/QuotesListPage.tsx, src/pages/OrdersPage.tsx, src/components/orders/OrderFilters.tsx`

Filtro perdido ao voltar do detalhe obriga o vendedor a refiltrar a cada consulta; com a querystring a visao filtrada tambem passa a ser compartilhavel por link.


### Suite de testes da entrega (6 arquivos, ~418 linhas) que nunca entrou na main

- **origem:** branch `devin/1791201000-ux-onda2` · **impacto:** medio · **tipo:** branch
- **arquivos:** `tests/lib/overlay.test.tsx, tests/stores/useNavigationGuardStore.test.ts, tests/hooks/useScrollRestoration.test.tsx, tests/hooks/useSmartNavigation.test.tsx, tests/components/NavigationGuardDialog.test.tsx, tests/components/NavigationHistoryMenu.test.tsx`

Sem esses testes a guarda de navegacao entra sem rede de protecao; eles ja existem prontos na branch e cobrem POP vs PUSH, overlay x tooltip, resolucao do guard e dedup do smart-back.


### Religar os selos de confianca do fornecedor na pagina do produto com dado real (sem mock)

- **origem:** branch `execucao/sicoob-20260911130857` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/pages/product-detail/ProductDetailHeroSections.tsx, src/hooks/useProductSupplierSources.ts, src/components/common/SocialProof.tsx`

A main renderiza DynamicTrustBadges com a constante EMPTY_SUPPLIER_TRUST (ProductDetailHeroSections.tsx:24 e :212), entao prazo de entrega e 'fornecedor aprovado' nunca aparecem — prova social morta na tela de venda. A main JA tem a fonte certa: useProductSupplierSources(productId) retorna lead_time_days (src/hooks/useProductSupplierSources.ts:17,38) sobre variant_supplier_sources. A recuperacao e trocar a constante por esse hook; NAO recuperar o src/hooks/useSupplierTrust.ts da branch como esta, porque ele cai em getMockSupplierTrust em todo caminho de erro e o avgRating dele e 100% mock (comentario 'Mock rating (no ratings table exists yet)', linhas 98-100) — mock e proibido por AGENTS.md. avgRating fica null ate existir tabela de avaliacoes (nao ha product_reviews referenciado na main).


### Religar os selos de confiança do produto a dados reais de fornecedor

- **origem:** branch `fix/sicoob-aprovacao-legada-20260923` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts, src/pages/product-detail/ProductDetailHeroSections.tsx, src/components/common/SocialProof.tsx`

O hook existe SÓ nesta branch e não tem equivalente na main sob nenhum nome: ele lia `variant_supplier_sources.lead_time_days` e `suppliers.is_active` pelo bridge do catálogo externo. Hoje a main exibe DynamicTrustBadges com placeholder fixo `EMPTY_SUPPLIER_TRUST` (ProductDetailHeroSections.tsx:24,212), ou seja, prazo de entrega e fornecedor verificado nunca aparecem na tela do produto. É prova social que sustenta conversão, perdida no re-enraizamento da main (o arquivo nasceu em 28/03/2026, commit 4f4df2580, muito antes desta branch).


### Selos de confiança do fornecedor com dado real na página de produto (hook useSupplierTrust)

- **origem:** branch `fix/sicoob-conclusao-20260922` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts (recuperar de origin/fix/sicoob-conclusao-20260922), src/pages/product-detail/ProductDetailHeroSections.tsx:24, src/pages/product-detail/ProductDetailHeroSections.tsx:212, src/components/common/SocialProof.tsx:198`

Hoje o vendedor vê os selos sempre vazios: a main passa EMPTY_SUPPLIER_TRUST fixo. O prazo de entrega (lead_time_days) e o fornecedor verificado são informação de venda que já existe no catálogo externo. Recuperar SEM o fallback mock da branch (getMockSupplierTrust foi removido de propósito da main — AGENTS.md proíbe mock): sem dado, manter vazio.


### Badges de confianca do fornecedor com dado real na pagina de produto (hook useSupplierTrust)

- **origem:** branch `fix/sicoob-csp-202635` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts, src/pages/product-detail/ProductDetailHeroSections.tsx, src/components/common/SocialProof.tsx`

A main ainda renderiza os badges, mas alimentados por constante vazia: src/pages/product-detail/ProductDetailHeroSections.tsx:24 define EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null } e a linha 212 passa isso para DynamicTrustBadges. Como appendSupplierTrustBadges (src/components/common/SocialProof.tsx:241-255) so emite badge quando isVerified, deliveryDays <= 5 ou avgRating >= 4.0, nenhum dos tres badges (Fornecedor verificado, Entrega rapida, Qualidade) aparece jamais para o comprador. A arvore da branch tem src/hooks/useSupplierTrust.ts (117 linhas) buscando dado real de variant_supplier_sources (lead_time_days) e suppliers (active) via bridge do catalogo externo, consumido por src/pages/ProductDetail.tsx; a main nao tem hook equivalente (git grep -rn getMockSupplierTrust origin/main -- src = vazio). Recuperar vale, porem SEM o fallback mock do hook original (viola a regra de nenhum mock): sem fonte real, nao renderizar badge. Ressalva: este arquivo NAO foi escrito nesta branch, veio da main de setembro e foi removido depois; existe em dezenas de outras refs (origin/audit/revisao-plano-20260924, origin/backup/local-rascunho-20261031, refs/remotes/pr/1..21), portanto apagar esta branch nao perde a ultima copia.


### Religar os selos de confiança do fornecedor na ficha do produto

- **origem:** branch `fix/sicoob-p0-operacional-20260923` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts, src/pages/product-detail/ProductDetailHeroSections.tsx, src/components/common/SocialProof.tsx`

Hoje o cliente nunca vê 'fornecedor verificado' nem prazo de entrega: a main passa um objeto vazio hardcoded (ProductDetailHeroSections.tsx:24). O componente que exibe existe e é testado (tests/components/SocialProof.test.tsx), só falta quem busque o dado. Ao recuperar, traga SOMENTE o caminho de dado real do hook da branch e descarte o fallback getMockSupplierTrust — mock em produção é proibido por AGENTS.md.


### Caminho de dado real dos selos de confiança do fornecedor (sem o fallback mock)

- **origem:** branch `fix/sicoob-p0-seguranca-20260923` · **impacto:** medio · **tipo:** branch
- **arquivos:** `src/hooks/useSupplierTrust.ts (versão da branch, como referência), src/pages/product-detail/ProductDetailHeroSections.tsx (linhas 24 e 212 da main), src/components/common/SocialProof.tsx (linhas 198-253 da main), src/hooks/useVariantSupplierSources.ts (já existe na main, reaproveitar)`

Hoje a página de produto mostra os selos de confiança sempre vazios: a main passa a constante EMPTY_SUPPLIER_TRUST em ProductDetailHeroSections.tsx:24, então 'Fornecedor verificado', 'Entrega rápida' e 'Qualidade' nunca aparecem para o cliente, mesmo quando variant_supplier_sources tem lead_time_days e o fornecedor está ativo. A main acertou em remover o mock (o hook da branch caía em getMockSupplierTrust e logava 'using mock'), mas removeu junto a consulta real e nunca a substituiu. Recuperar só a parte real: prazo de entrega e fornecedor ativo vindos do banco; avaliação fica fora até existir tabela de ratings (não inventar nota).


### Badges de inteligência de produto e detalhe de risco sem estado de erro

- **origem:** PR #112 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `src/components/common/IntelligenceBadges.tsx, src/hooks/useProductIntelligenceBadges.ts, src/pages/ProductDetail.tsx, src/components/inventory/risk/ProductRiskDetail.tsx, tests/components/common/IntelligenceBadges.errors.test.tsx, tests/pages/ProductDetail.intelligence-errors.test.tsx, tests/components/inventory/ProductRiskDetail.loading.test.ts`

A main já removeu o fallback de mock (generateMockIntelligence) desses badges — isso está obsoleto. O que sobra: o hook não expõe isError/isFetching/isEmpty/hasMarketData/retry, então quando a materialized view falha a ficha do produto simplesmente não mostra badge nenhum, indistinguível de 'produto sem indicador'. A PR adiciona esse contrato e o MarketIntelligenceStatus ('Sem indicadores de mercado disponíveis para este produto' / erro com retry), e o mesmo para ProductRiskDetail.


### Barra de progresso falsa no grid de Novidades

- **origem:** PR #112 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `src/components/novelties/NoveltyProductGrid.tsx, src/components/replenishments/ReplenishmentProductGrid.tsx, src/components/replenishments/ReplenishmentToolbar.tsx, tests/components/ReplenishmentToolbar.test.tsx`

useLoadingProgress incrementa a porcentagem com Math.random a cada 300ms e a tela escreve 'Carregando 47% dos produtos...' — número sem relação com o carregamento real. A PR troca por indicador indeterminado com role=progressbar e aria-valuetext.


### Gate de skip não cobre os cenários P0 de Playwright

- **origem:** PR #112 · **impacto:** baixo · **tipo:** script-ci
- **arquivos:** `scripts/check-critical-test-skip-budget.mjs`

A main já evoluiu para baseline por arquivo e regex que aceita .spec. (melhor que a PR), mas as raízes varridas continuam ['tests/p0','tests/rls','tests/security'] — e2e/flows/p0 fica fora, então skip em cenário P0 de Playwright não é contabilizado. Só falta acrescentar a raiz.


### Documentação de execução e runbooks da PR (cai na frente de outro agente)

- **origem:** PR #112 · **impacto:** baixo · **tipo:** doc
- **arquivos:** `docs/execucao/auditoria-validacao-2026-10-16.md, docs/execucao/revisao-plano-20261015/fechamento-tendencias-crm.md, docs/EDGE_FUNCTIONS_DRIFT.md, docs/DEPLOYMENT.md, docs/RUNBOOK_CONNECTIONS.md, docs/secrets.md, docs/FUNCIONALIDADES_E_FERRAMENTAS.md, README.md`

Dois documentos de execução ausentes e atualizações em 6 docs existentes. Cai na frente 'docs perdidos' de outro agente.


### Workflow e2e exige segredos E2E_VIEWER_* que nenhum spec usa

- **origem:** PR #119 · **impacto:** baixo · **tipo:** workflow
- **arquivos:** `/home/user/Brindes_Sicoob_V2/.github/workflows/e2e.yml, /home/user/Brindes_Sicoob_V2/e2e/helpers/auth.ts, /home/user/Brindes_Sicoob_V2/tests/e2e/auth-role-contract.test.ts`

Remover E2E_VIEWER_EMAIL/PASSWORD dos dois jobs e da checagem de credenciais, e trazer o teste que fixa o contrato credentialsForRole (user/editor/admin/dev, com admin só como fallback explícito do editor) para impedir cruzamento de contas. Mexe em workflow → dono.


### Telemetria administrativa e filtros de pedidos sem estado de erro / com lista de status incompleta

- **origem:** PR #119 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/pages/admin/telemetry/useTelemetryData.ts, /home/user/Brindes_Sicoob_V2/src/pages/admin/telemetry/useErrorCounters.ts, /home/user/Brindes_Sicoob_V2/src/pages/admin/AdminTelemetriaPage.tsx, /home/user/Brindes_Sicoob_V2/src/components/orders/OrderFilters.tsx, /home/user/Brindes_Sicoob_V2/src/constants/orders.ts, /home/user/Brindes_Sicoob_V2/tests/pages/AdminTelemetriaPage.test.tsx`

Expor isError/error das queries de telemetria até a página (hoje falha vira 'nenhum evento'); e no OrderFilters tornar o componente controlado (prop values) e derivar as opções de ORDER_STATUS_FLOW/ORDER_STATUS_LABELS — a lista fixa atual tem 6 dos 10 status (faltam enviado_vendedor, em_separacao, em_transporte, entregue, cancelado).


### Bootstrap resiliente do reporter de erros (retry do chunk)

- **origem:** PR #119 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/lib/error-reporter-bootstrap.ts, /home/user/Brindes_Sicoob_V2/src/main.tsx, /home/user/Brindes_Sicoob_V2/tests/lib/error-reporter-bootstrap.test.ts`

bootstrapErrorReporter com 2 retentativas e backoff, mantendo os listeners precoces até o módulo definitivo carregar. Na main, src/main.tsx remove os listeners antes do import resolver, então um chunk que falha durante deploy deixa uma janela sem captura de erro.


### Código morto de busca que a PR apagava

- **origem:** PR #119 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `/home/user/Brindes_Sicoob_V2/src/components/search/GlobalSearch.tsx, /home/user/Brindes_Sicoob_V2/src/components/search/SmartSuggestions.tsx, /home/user/Brindes_Sicoob_V2/src/components/intelligence/TopCategoriesCard.tsx`

A PR deletava GlobalSearch.tsx e SmartSuggestions.tsx (substituídos pelo GlobalSearchPalette, que já é o que o Header monta). TopCategoriesCard.tsx já não existe na main. CAI no tema 'busca global e favoritos'. NÃO VERIFICADO se src/components/search/SmartSuggestions.tsx está realmente sem consumidor — o SmartSuggestions usado em seller-carts/CartSidebar.tsx:20 vem de components/cart/CartUtilComponents.


### Flake de corrida no teste de acessibilidade do AdminVerbasPage

- **origem:** PR #145 · **impacto:** baixo · **tipo:** teste
- **arquivos:** `e2e/audit-validation.spec.ts`

A main decide entre 'tem verbas' e 'Nenhuma verba encontrada' lendo progressBars.count() na hora, antes de a tabela terminar de carregar — se a linha ainda não renderizou, cai no else e falha. A PR insere expect.poll até aparecer progressbar, botão 'Editar verba' ou a célula de vazio, e passa a aceitar o caso em que há botão de editar sem progressbar.


### aria-label no Switch 'Ilimitado' das cotas de IA

- **origem:** PR #145 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `src/pages/admin/ai-usage/AiQuotaManager.tsx`

A main já rotulou o Input de limite (linha 52) mas o Switch 'Ilimitado' (linha 51) continua sem nome acessível — com uma linha por papel, leitor de tela não distingue qual switch é de qual papel. A PR adiciona aria-label=`Uso ilimitado de IA para ${papel}`. Obs.: o texto do aria-label do Input na main é diferente do da PR; manter o da main (é equivalente).


### workflow_dispatch em Bundle Size Check e Lighthouse

- **origem:** PR #145 · **impacto:** baixo · **tipo:** workflow
- **arquivos:** `.github/workflows/bundle-check.yml, .github/workflows/lighthouse.yml`

Os dois workflows na main só disparam em pull_request, então não há como reexecutá-los na main (tentativa retorna HTTP 422) para provar que uma falha histórica foi corrigida. A PR adiciona `workflow_dispatch` com guarda `if: github.event_name != 'workflow_dispatch' \|\| github.ref == 'refs/heads/main'`. É mudança de workflow: pelo AGENTS.md exige o dono, não merge automático.


### Retry de erro transitório do PostgREST e timeout de 45 s nas três asserções anônimas de INSERT/UPDATE/DELETE do teste de RLS de `e2e_cleanup_rate_limit`

- **origem:** PR #148 · **impacto:** baixo · **tipo:** teste
- **arquivos:** `tests/rls/e2e-cleanup-rate-limit.test.ts`

A main já usa `retryTransientPostgrest` e 45 s no `beforeAll`, no `afterAll` e no caso de SELECT anônimo (linhas 75,82,90,96), mas deixou as três chamadas anônimas de escrita sem retry e com timeout de 15 s (`origin/main:tests/rls/e2e-cleanup-rate-limit.test.ts:99-103,105-120,122-136`). A PR envolvia essas três chamadas no mesmo retry e subia o timeout para 45 s, mantendo as asserções de bloqueio intactas. É endurecimento contra flake, não mudança de regra de segurança — por isso impacto baixo. NÃO RECUPERAR a outra metade dessa mudança: a flag `quotaExhausted` + `isQuotaExhaustedError` + `ctx.skip()` (pr/148 linhas 47,69-78,92,102,111,129) contraria a postura atual da main, que passou a FALHAR em HTTP 402 em vez de tolerar quota (`origin/main:tests/security/edge-authz-bypass.test.ts:78-81`), e consumiria orçamento de skip em `tests/rls`.


### Escopar os secrets do workflow E2E por step em vez de deixa-los no `env:` do job, de modo que `npm ci` e `npx playwright install` nao rodem com E2E_SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY no ambiente — mais a assercao de CI que trava isso

- **origem:** PR #164 · **impacto:** baixo · **tipo:** seguranca
- **arquivos:** `.github/workflows/e2e.yml, tests/scenarios/e2e-supabase-isolation.mjs`

Na main, os jobs `e2e-authenticated` (env nas linhas 89-119) e `e2e-regression` (env nas linhas 288-314) declaram todos os secrets no nivel do job, incluindo a service_role do projeto de QA (linhas 115/119 e 310/314). Por isso os steps `Install deps` (`npm ci`, linhas 133 e 328) e `Install Playwright (--with-deps)` (linhas 171 e 338) executam codigo de terceiros (postinstall de dependencias, instalador do Playwright) com essas credenciais visiveis. A PR #164 movia cada secret para o `env:` do step que o usa e cobria a regra com duas assercoes em tests/scenarios/e2e-supabase-isolation.mjs ('nao deve expor segredos no ambiente global do job' e 'npm ci nao deve receber segredos'). A main nao tem assercao equivalente — tests/scenarios/e2e-workflow-trust.scenario.mjs so cobre origem confiavel, github.sha e max-parallel. Recuperar e so o movimento env-de-job -> env-de-step (o passo `Verificar credenciais da jornada autenticada` da main, linha ~136, le ~16 variaveis do env de job e precisaria receber as suas) mais a assercao estrutural no cenario de workflow que a main ja tem. Nada do validador nem dos secrets dedicados precisa ser tocado: isso a main ja fez melhor. Mitigante honesto: as chaves sao do projeto isolado de QA (nao producao), o job so roda em workflow_dispatch a partir da main e dentro do environment protegido `e2e-qa` — por isso o impacto e baixo, nao alto. Observacao de processo: por ser mudanca em .github/workflows, AGENTS.md manda deixar a PR aberta e chamar o dono.


### assertProjectRef recusa project ref válido que contenha dígito

- **origem:** PR #176 · **impacto:** baixo · **tipo:** script-ci
- **arquivos:** `scripts/db/supabase-sql-client.mjs, tests/scenarios/supabase-sql-client.scenario.mjs`

Trocar `/^[a-z]{20}$/` por `/^[a-z0-9]{20}$/` e acrescentar o cenário que prova o aceite. Refs do Supabase são alfanuméricos; hoje qualquer projeto com dígito no ref é recusado antes da chamada remota, embora os três refs em uso hoje sejam só de letras (bug latente, não ativo).


### Cobertura perdida de coerção/defaults do productFormSchema e canário anon no teste de RLS do cleanup

- **origem:** PR #176 · **impacto:** baixo · **tipo:** teste
- **arquivos:** `tests/product-form-improvements.test.ts, tests/rls/e2e-cleanup-rate-limit.test.ts`

Em tests/product-form-improvements.test.ts, o caso que prova que `sale_price: '15.90'` é coagido a 15.9 e que os defaults do schema são aplicados (único teste que ancora o comportamento do zod v4 no formulário de produto). Em tests/rls/e2e-cleanup-rate-limit.test.ts, limpar o canário do INSERT anon caso ele passe inesperadamente e verificar no afterAll que a fixture ficou com count 0 — hoje um INSERT anon bem-sucedido deixaria resíduo no projeto de QA.


### Atualizar os docs de lacunas que descrevem codigo que a main ja corrigiu (FE-140, FE-030, ADM-43, EDG-24, EDG-30 + indice-lacunas.csv)

- **origem:** PR #178 · **impacto:** baixo · **tipo:** doc
- **arquivos:** `docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md, docs/execucao/lacunas-funcionalidades-2026-10-11/06-frontend-admin-bi-ia.md, docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md, docs/execucao/lacunas-funcionalidades-2026-10-11/indice-lacunas.csv, docs/execucao/lacunas-funcionalidades-2026-10-11.md`

Os docs da main citam comportamento que o codigo da main nao tem mais: 05-frontend-nucleo.md:30 e :643 dizem que Tendencias abre em MODO DEMO e so desliga com ?demo=0, mas src/pages/trends/is-demo-mode.ts da main retorna false por padrao e exige ?demo=1; :260 atribui a useProductIntelligenceBadges.ts o texto 'falling back to mock data', que nao existe mais no arquivo (a main nao importa generateMockIntelligence/generateMockVelocities e devolve isDemo: false em :150,:160); 06-frontend-admin-bi-ia.md:34,480-481 repete o mesmo sobre ADM-43; 07-edge-functions-integracoes.md:485-489 (EDG-30) ainda diz 'cobre 7 de 100' e lista 7 funcoes, quando a allowlist tem 13. AGENTS.md manda corrigir o doc no mesmo PR do fix — essa divida ficou. Tema vizinho: 'docs perdidos' esta com outro agente; aqui sao docs que EXISTEM na main e estao errados, nao docs sumidos. EDG-24 so deve ser reescrito depois que a PR #292 fechar, porque o texto novo depende do codigo dela.


### Guardar os passos de resumo do E2E com hashFiles(results.json) em vez de rodar as cegas

- **origem:** PR #178 · **impacto:** baixo · **tipo:** workflow
- **arquivos:** `.github/workflows/e2e.yml`

A main roda `node scripts/e2e-smoke-summary.mjs` com `if: always()` e sem guarda (e2e.yml:208-210) e o mesmo para o feature summary (:357-359). O script sai com codigo 2 quando results.json nao existe (scripts/e2e-smoke-summary.mjs:44-49), entao uma falha anterior a escrita do relatorio produz um segundo step vermelho sem informacao. A PR trocava por `if: always() && hashFiles('playwright-report/results.json') != ''`. Nao esconde nada — o job ja falha de qualquer forma — e so limpa o diagnostico. NAO recuperar o resto do diff de e2e.yml da PR: a remocao de `continue-on-error` e de `\|\| true` ja esta na main (grep -c continue-on-error = 0, nenhum '\|\| true'), e os `always()` extras nos steps de fail-fast ficaram redundantes depois disso.


### Teste que prova que a falha de um lote intermediário de remessas aborta a consolidação (caso 'interrompe a consolidação se qualquer lote de remessas falhar')

- **origem:** PR #181 · **impacto:** baixo · **tipo:** teste
- **arquivos:** `tests/services/sicoobLogisticsReportService.test.ts, src/services/sicoob/logisticsReportService.ts`

A main tem 5 casos (origin/main:tests/services/sicoobLogisticsReportService.test.ts:20,31,59,70,86); o teste de erro (linha 59) usa um único lote, e o teste de particionamento (linha 86) sempre devolve sucesso em todos os lotes. Nenhum caso faz o 2o lote retornar `{ data: null, error }` e verifica que a promise rejeita com esse erro sem seguir para os lotes restantes. O comportamento existe no código (origin/main:src/services/sicoob/logisticsReportService.ts:76 — `if (error) throw error` dentro do laço), mas uma regressão que mova o throw para fora do laço, ou que acumule erro em vez de propagar, passaria verde hoje. A PR cobria isso com ~15 linhas (201 pedidos, 2 lotes, erro no segundo, `expect(inFilter).toHaveBeenCalledTimes(2)`).


### Endurecer o redator de mensagem de erro do gate de ledger (`formatLedgerError` da main vaza credenciais que a PR já redigia)

- **origem:** PR #187 · **impacto:** baixo · **tipo:** seguranca
- **arquivos:** `scripts/db/check-migration-ledger-drift.mjs, tests/scenarios/migration-ledger.mjs`

A main tem `formatLedgerError` (scripts/db/check-migration-ledger-drift.mjs:154-163), usado no catch do `main()`, que cobre apenas `Bearer <x>` e os rótulos `(access\|service\|publishable\|api)[_-]?key` e `token` em `chave=valor`, com corte em 240 caracteres. A `formatLedgerDiagnostic` da PR cobria, além disso: credenciais embutidas em URL e qualquer `esquema://...` (vira `[URL redigida]`), `Basic <base64>`, JWT nu (`eyJ...`), chaves `sb_secret_*`/`sb_publishable_*`, a lista longa de rótulos (`password`, `passwd`, `secret_key`, `authorization`, `service_role_key`, `access_token`, `refresh_token`, `private_key`, `anon_key`, `cookie`, `set-cookie`, `session_id`, `csrf_token`) inclusive em JSON com aspas, colapso de `\r\n\t` para evitar injeção de linha no log do Actions, e saneamento do próprio `error.name`/`error.code` por regex (a main interpola `e?.code ?? e?.name` cru). Falta também o teste adversarial correspondente: a main tem 1 assert em tests/scenarios/migration-ledger.mjs:15-22 (só Bearer + SUPABASE_ACCESS_TOKEN=), a PR tinha um teste com 7 famílias de vetores.


### Logo Sicoob do Header oculta em viewports abaixo de 400px

- **origem:** PR #94 · **impacto:** baixo · **tipo:** ui
- **arquivos:** `src/components/layout/Header.tsx`

A PR trocava `ml-1 mr-1 flex h-9 items-center rounded-lg bg-[#003641] px-2.5` por `ml-1 mr-1 hidden h-9 items-center rounded-lg bg-[#003641] px-2.5 min-[400px]:flex` no bloco da logo mobile, para o cluster esquerdo não empurrar o Header em telas de 320-360px. A main mantém `flex` incondicional.


### Resíduo da linhagem antiga da main (NÃO é trabalho desta branch): 3 arquivos de código e 1 teste que existem na árvore antiga e não na main atual

- **origem:** branch `docs/plano150-20260927` · **impacto:** baixo · **tipo:** branch
- **arquivos:** `src/components/intelligence/TopCategoriesCard.tsx, src/components/orders/InvoicePaymentPanel.tsx, src/types/jspdf-autotable.d.ts, tests/hooks/useCollections.test.tsx`

Vêm do commit pai 3094cbab2 (main pré-reenraizamento), não do commit desta branch, e estão em 247 refs — apagar esta branch não os perde. Além disso, 3 dos 4 já foram substituídos na main por implementação melhor: jspdf-autotable.d.ts -> wrapper tipado src/lib/pdf/auto-table.ts; InvoicePaymentPanel.tsx (48 linhas, sem nenhum import em toda a branch = código morto) -> src/components/orders/OrderInvoicesManager.tsx + src/hooks/orders/extensions/useOrderInvoices.ts + tests/hooks/useOrderInvoices.test.tsx; useCollections.test.tsx -> tests/hooks/useCollections.test.ts + tests/hooks/useCollections.react.test.tsx. Só TopCategoriesCard.tsx (card de categorias em alta na TrendsPage) não tem equivalente na TrendsPage atual, e usa heurística crua (primeira palavra do nome do produto como categoria), tipo de "inteligência simulada" que a main removeu deliberadamente (ex. 7be296acf, afcc1e2ba) — recuperar só se o dono quiser a visão de categorias na tela de Tendências, aí com dados reais via src/hooks/bi/useIndustryCategoryTrends.ts.


### Remover o e2e P0 skipado que aponta para rota inexistente

- **origem:** branch `fix/sicoob-aprovacao-legada-20260923` · **impacto:** baixo · **tipo:** branch
- **arquivos:** `e2e/flows/p0/03-quote-blocked.spec.ts`

O teste navega para `/orcamento-publico/INVALID_TOKEN`, rota que não existe na main. Fica skipado para sempre, consome o orçamento de skip de tests/p0 vigiado por scripts/check-critical-test-skip-budget.mjs e dá falsa sensação de cobertura sobre vazamento de orçamento por token inválido. A branch já o havia removido; se a cobertura importa, reescreva contra `/approve/:token`.


### Templates HTML de e-mail transacional (6 eventos)

- **origem:** branch `fix/sicoob-conclusao-20260922` · **impacto:** baixo · **tipo:** branch
- **arquivos:** `supabase/functions/send-transactional-email/index.ts (versão da branch, só a função buildEmailContent)`

A main devolve 501 nessa edge. Quando o envio real for implementado, os 6 templates da branch poupam retrabalho de design. Não recuperar o corpo da função: ele devolvia success:true sem enviar nada.


### Remover o resíduo morto de `isDemo` / selo "dados ilustrativos" do detalhe do produto

- **origem:** branch `fix/sicoob-intelligence-truth-20260924` · **impacto:** baixo · **tipo:** branch
- **arquivos:** `src/hooks/useProductIntelligenceBadges.ts, src/components/common/IntelligenceBadges.tsx, src/pages/ProductDetail.tsx`

É a única parte da branch que não chegou à main. Não muda o que o cliente vê hoje (o flag é sempre `false`, logo o selo nunca aparece), mas deixa na base um caminho pronto para voltar a rotular dado como ilustrativo e um contrato de hook mentiroso. Diff de ~8 linhas em 3 arquivos.


### Workflow de verificação do token de gerenciamento Supabase (workflow_dispatch)

- **origem:** branch `fix/sicoob-p0-seguranca-20260923` · **impacto:** baixo · **tipo:** branch
- **arquivos:** `.github/workflows/verify-supabase-management-token.yml`

Valida, sem imprimir a credencial, se o SUPABASE_ACCESS_TOKEN tem acesso de gerenciamento ao projeto oficial cfmzkthhgliqelozlmwu antes de disparar apply-sicoob-migrations.yml ou deploy-sicoob-functions.yml. Com as 6 migrations aprovadas ainda pendentes de aplicação, descobrir token inválido no meio do run de migration custa tempo e deixa estado parcial. Porque mexe em workflow/CI, o AGENTS.md manda abrir a PR e chamar o dono em vez de mergear sozinho.


### Dependência não registrada e sem guarda: o lockfile da main prende 57 pacotes (48 de produção, 9 dev) ao registry privado de terceiro `europe-west1-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`. Os 10 workflows que rodam `npm ci` dependem desse host de fornecedor continuar público; não há `.npmrc`, nenhum doc e nenhum gate de CI que detecte isso. A PR #137 diagnosticou exatamente isso e parou aí — a conclusão que ela construiu em cima (npm ci impossível) está errada hoje e NÃO deve ser recuperada; o que falta é a metade não feita: normalizar os 57 `resolved` para `registry.npmjs.org` (mantendo os `integrity`, que já existem em todas as 57) ou registrar a dependência explicitamente e adicionar uma checagem que falhe se o lockfile apontar para host fora de `registry.npmjs.org`. Risco é de disponibilidade/vendor-lock, não de tamper.

- **origem:** PR #137 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `/home/user/Brindes_Sicoob_V2/package-lock.json, /home/user/Brindes_Sicoob_V2/package.json, /home/user/Brindes_Sicoob_V2/.github/workflows/ci.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/security.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/bundle-check.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/e2e.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/lighthouse.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/migration-ledger-drift.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/security-compliance.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/sicoob-ci.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/apply-sicoob-migrations.yml, /home/user/Brindes_Sicoob_V2/.github/workflows/db-performance-audit.yml`




### NÃO É RECUPERAÇÃO — referência órfã encontrada de passagem: scripts/revisao/gerar-revisao-2026-09-12.py aponta 3 vezes para scripts/revisao/pendencias-2026-09-12.cenarios.tsx, caminho que não existe mais na main (o arquivo foi renomeado para .cenarios.test.tsx, com conteúdo byte-idêntico). Nenhum trabalho foi perdido: o gerador apenas cita um caminho morto. Registro por honestidade de varredura, não como item a recuperar da PR #149 — o arquivo nunca foi tocado por esta PR.

- **origem:** PR #149 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `/home/user/Brindes_Sicoob_V2/scripts/revisao/gerar-revisao-2026-09-12.py, /home/user/Brindes_Sicoob_V2/scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx`




### Hardening completo de trends-insights (vínculo ativo + papel, rate limit de IA, bot protection, zod strict, redação de PII nos termos de busca, paginação por cursor com falha explícita) — ausente da main, presente na pr/112, e apontado pela #154 como a versão publicada em produção (v9). Inclui dois módulos compartilhados que a main não tem nenhuma cópia: _shared/pii-redaction.ts e _shared/portal-access-policy.ts, com seus testes (um deles em tests/security/). Não cai em nenhum tema dos outros agentes: #291/#292 vêm das PRs #119/#178/#179, e a tarefa #4 (métricas reais do Gestor de Compras) é front da PR #157; isto é edge da PR #112.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `supabase/functions/trends-insights/index.ts, supabase/functions/trends-insights/pagination.ts, supabase/functions/_shared/pii-redaction.ts, supabase/functions/_shared/pii-redaction.test.ts, supabase/functions/_shared/portal-access-policy.ts, tests/security/portal-access-policy.test.ts, tests/edge-functions/trends-insights-pagination.test.ts`




### Bug de correção de negócio na main (não só hardening): trends-insights entrega número errado ao Gestor quando a consulta falha ou estoura o tempo. O bloco de consulta descarta o erro do PostgREST e não pagina; com statement_timeout=8s do papel authenticated, um período longo resulta em 'zero atividade' e a IA narra o período como se não tivesse movimento. A pr/112 corrigiu com cursor estável e aborto explícito, com teste. Trabalho parcial clássico: começou e a main não terminou.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `supabase/functions/trends-insights/index.ts, supabase/functions/trends-insights/pagination.ts, tests/edge-functions/trends-insights-pagination.test.ts`




### Operação quote_directory do crm-db-bridge (diretório de empresas e contatos do CRM para orçamento), com o módulo de busca search-query.ts e seu teste — ausente da main, apontada pela #154 como publicada em produção (v13). A main tem 1022 linhas contra 1241 da pr/112. Risco direto e imediato: a tarefa #15 desta fila propõe pôr crm-db-bridge na allowlist de publicação; publicar a fonte da main apagaria a operação e o hardening que estão em produção.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `supabase/functions/crm-db-bridge/index.ts, supabase/functions/crm-db-bridge/search-query.ts, supabase/functions/crm-db-bridge/search-query.test.ts, .github/workflows/deploy-sicoob-functions.yml`




### O próprio inventário de paridade publicado x main e a regra operacional que ele criou ('preservar as versões publicadas que estão à frente de main antes de publicar') não existem em nenhuma forma na main. É a única salvaguarda escrita contra um publish regressivo, e o que a main tem (inventario/estado/edges.json) mede apenas o repositório, não produção. Recuperar os números de 29/10 como verdade seria errado; recuperar a regra e refazer a medição com token sbp_ não é.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `inventario/estado/edges.json, docs/EDGE_FUNCTIONS.md, docs/agentes/servicos.md, .github/workflows/deploy-sicoob-functions.yml`




### Nove das dez funções que a #154 mediu como 'fonte da main à frente da publicada' (correções de sanitização de erro) estão fora da allowlist de 13 e, portanto, nenhum workflow do repositório consegue publicá-las: admin-audit-hook, bi-share-dossier, e2e-cleanup, github-fix-config, quote-sync, rls-audit, sicoob-seed, sicoob-seed-qa, sync-quote-bitrix (só get-app-logs está na allowlist). Correção que existe no repo e nunca chega a produção é trabalho parcial. bi-share-dossier cai no tema 'hardening de bi-share-dossier e health-check' que outro agente já planeja — não detalho esse.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `.github/workflows/deploy-sicoob-functions.yml, supabase/functions/admin-audit-hook/index.ts, supabase/functions/rls-audit/index.ts, supabase/functions/sync-quote-bitrix/index.ts`




### Limpeza dos registros-canário rls-e2e-* no banco canônico nunca foi concluída e os dois documentos subestimam o volume. Decisão do dono (deleção de dado em produção). O registro do bloqueio existe na main, mas com número errado.

- **origem:** PR #154 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `RELATORIO_CI.md, PENDENCIAS.md, tests/rls/e2e-cleanup-rate-limit.test.ts`




### Transição da chave HMAC do bi-share-dossier (links públicos já emitidos são invalidados ao introduzir/trocar BI_SHARE_SECRET) — CAI NO TEMA 'hardening de bi-share-dossier e health-check' já em planejamento por outro agente; registro apenas para não se perder, NÃO reivindico e não detalho plano. É alerta documental da PR #158 (P-20261029-09), não código dela.

- **origem:** PR #158 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `supabase/functions/bi-share-dossier/contract.ts, supabase/functions/bi-share-dossier/index.ts`




### Único resíduo real (cosmético, NÃO vale PR): o `::notice title=Função sem alteração` por função quando a versão remota fica igual. A PR emitia esse aviso no bash inline; o verificador da main aceita versão igual mas não registra qual função ficou sem alteração — imprime só uma linha agregada de sucesso (verify-supabase-functions-published.mjs:85-88). Nenhum gate, regra de negócio ou segurança depende disso; é observabilidade de log. Recuperar seria churn.

- **origem:** PR #161 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `/home/user/Brindes_Sicoob_V2/scripts/ci/verify-supabase-functions-published.mjs, /home/user/Brindes_Sicoob_V2/.github/workflows/deploy-sicoob-functions.yml`




### Manifesto de integridade das 194 fontes da revisão de 01/10/2026 ausente da main (cai no tema "docs perdidos" de outro agente — não detalho plano). É o único arquivo da PR #85 genuinamente ausente, é internamente válido (194/194 contra a árvore da PR) e é o manifesto de evidência mais completo do projeto (o equivalente de 28/09 que a main guarda tem 3 entradas). Não é código morto no sentido alegado: a main mantém a supressão de secret-scan dele. Restaurar exige adicionar os fingerprints novos do commit na MESMA PR, senão o gate Gitleaks acusa 6 achados.

- **origem:** PR #85 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `docs/execucao/revisao-plano-20261001/fontes-sha256.json, /home/user/Brindes_Sicoob_V2/.gitleaksignore, /home/user/Brindes_Sicoob_V2/.github/workflows/security.yml, /home/user/Brindes_Sicoob_V2/docs/execucao/revisao-plano-20260928/fontes-sha256.json`




### Dívida de config viva na main: 12 das 60 linhas do `.gitleaksignore` (20% do arquivo, o caminho mais referenciado de toda a allowlist) suprimem achados de um arquivo que não existe na main, e os dois commits citados são heads de PRs fechadas e re-enraizadas (pr/85 e pr/87), fora do histórico atual. Item independente do anterior: se a decisão for NÃO restaurar o manifesto, essas 12 linhas devem sair; se for restaurar, elas precisam ser substituídas pelos fingerprints do commit novo. Hoje a allowlist afirma uma supressão que não corresponde a nada — exatamente o tipo de ruído que faz triagem de secret-scan perder achado real. Não cai em nenhum dos temas já em andamento listados na tarefa.

- **origem:** PR #85 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `/home/user/Brindes_Sicoob_V2/.gitleaksignore, /home/user/Brindes_Sicoob_V2/.github/workflows/security.yml`




### Dois gates estáticos de CI (drift do doc de cobertura smoke e validação de tags @smoke) deixaram de rodar em qualquer gatilho. No head da #97 eram steps sem `if:` no job `e2e` disparado por `pull_request` em `ubuntu-latest`, bloqueando todo PR mesmo sem secrets; a main os moveu para `e2e-authenticated`, que é `workflow_dispatch`-only e morre antes de alcançá-los porque o environment `e2e-qa` está sem secrets. Hoje qualquer agente pode adicionar um `test()` fora de um describe `@smoke` (que o project `chromium-smoke` ignora silenciosamente, playwright.config.ts:262-266) ou alterar a suíte sem regenerar `docs/E2E_SMOKE_COVERAGE.md`, e nenhum check obrigatório pega. Recuperação de custo zero e sem exposição: os dois steps no job público `e2e`, que é required check.

- **origem:** PR #97 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `pr/97:.github/workflows/e2e.yml:78-85, origin/main:.github/workflows/e2e.yml:177-184, origin/main:.github/workflows/e2e.yml:82, origin/main:.github/workflows/e2e.yml:125-126, origin/main:scripts/validate-e2e-target.mjs:27-37, origin/main:scripts/check-smoke-tags.mjs, origin/main:scripts/e2e-smoke-coverage-doc.mjs, origin/main:docs/agentes/github-ci.md:34, origin/main:docs/agentes/github-ci.md:55-65, origin/main:playwright.config.ts:262-266`




### Degradação graciosa sem credenciais ficou pela metade na main: o escritor de `SKIP_E2E` (aviso + skip dos steps autenticados, permitindo que o resto do job rode sem secrets) foi removido, mas os 4 guards que o leem continuam no arquivo. Resultado: condição morta e perda do único mecanismo que permitia ao job de PR executar a parte não autenticada do gate. Atribuição honesta: o step vem da base f1c130ee, não do diff da #97 — mas é a #97 que tornava esse job executável (self-hosted → ubuntu-latest), e o comportamento está no head e não na main.

- **origem:** PR #97 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `pr/97:.github/workflows/e2e.yml:57-63, origin/main:.github/workflows/e2e.yml:136-148, origin/main:.github/workflows/e2e.yml:194, origin/main:.github/workflows/e2e.yml:221, origin/main:.github/workflows/e2e.yml:229, origin/main:.github/workflows/e2e.yml:238, origin/main:docs/agentes/github-ci.md:76`




### Annotations de diagnóstico de falha ficaram inalcançáveis na main: ela removeu o `continue-on-error: true` que o head tinha em `e2e_header_sticky` e `e2e_run`, mas manteve os dois steps que dependem de `steps.<id>.outcome == 'failure'` sem `if: always()`. Sem continue-on-error o job aborta no step que falhou, então as mensagens `::error title=Header sticky regression::` (com a causa raiz típica em MainLayout.tsx) e `::error title=Regression failed::` nunca são emitidas. O job falha de qualquer forma — o que se perde é só o diagnóstico, mas é comportamento do head ausente da main e código morto hoje.

- **origem:** PR #97 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `pr/97:.github/workflows/e2e.yml:138, pr/97:.github/workflows/e2e.yml:237, origin/main:.github/workflows/e2e.yml:227-241, origin/main:.github/workflows/e2e.yml:343-354, origin/main:.github/workflows/e2e.yml:396-400`




### Cache de browsers Playwright ausente justamente no único job que roda em todo PR. O head da #97 e os dois jobs autenticados da main têm `actions/cache` para `~/.cache/ms-playwright`; o job público `e2e` da main instala chromium sem cache em cada PR. Impacto é tempo/custo de CI, não comportamento — item marginal, listado por completude.

- **origem:** PR #97 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `pr/97:.github/workflows/e2e.yml:65-70, origin/main:.github/workflows/e2e.yml:57-61, origin/main:.github/workflows/e2e.yml:164-169, origin/main:.github/workflows/e2e.yml:331-336`




### Lacuna de capacidade (NÃO recuperar como estava): não existe mais nenhuma forma de rodar jornada autenticada ou regressão contra uma branch antes do merge — `e2e-authenticated` e `e2e-regression` são dispatch-only e `validate-source` aborta qualquer dispatch fora de `refs/heads/main`. O input `source_ref` da #97 realmente não deve voltar: daria `service_role` de homologação a código de branch arbitrária, e aqui concordo com o veredito do outro agente. Mas a lacuna de negócio existe e tem forma segura já disponível (`environment: e2e-staging`, com revisor obrigatório `adm01-debug` e `can_admins_bypass: false`) — decisão do dono, não recuperação de código.

- **origem:** PR #97 (resgatado na refutação) · **impacto:** — · **tipo:** refutação
- **arquivos:** `origin/main:.github/workflows/e2e.yml:19-32, origin/main:.github/workflows/e2e.yml:82, origin/main:.github/workflows/e2e.yml:274-276, pr/97:.github/workflows/e2e.yml:10-15, origin/main:docs/agentes/github-ci.md:44`


