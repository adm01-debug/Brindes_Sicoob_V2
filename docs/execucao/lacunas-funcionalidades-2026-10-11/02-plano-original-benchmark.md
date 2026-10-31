# Plano original de 100 etapas (11/09/2026), revisões de 11–12/09 e benchmark/backlog da pesquisa: funcionalidades não executadas

Fatia: PLB. Código conferido em `HEAD = dc08200` (main, 08/10/2026). Data da conferência: 11/10/2026.
Método: as 767 subetapas "N" (145) e "P" (622) da matriz de 12/09 foram reagrupadas por funcionalidade de produto e conferidas no código atual por meio de rotas, importações, RPCs invocadas, migrations e grep. Os dois resultados possíveis foram registrar o item como pendência ou contá-lo como concluído. Itens de processo e documentação (aceite, responsável nominal, pesquisa) foram agregados em blocos BLOQUEADA_EXTERNA por tema.
Limite: a consulta ao banco canônico pelo MCP `SUPABASE_Brindes_Sicoob_-_V2` falhou com `Management API 401: Invalid access token`, e a listagem de Edge Functions exige token `sbp_`. Por isso nenhum item foi confirmado como "ligado em produção com tráfego real". "Concluído" significa apenas que o código existe e está ligado no repositório.

## Resumo

### Contagem por status (63 itens desta fatia)

| Status | Itens |
|---|---:|
| NAO_INICIADA | 14 |
| PARCIAL | 31 |
| STUB/MOCK | 5 |
| ORFA | 2 |
| BLOQUEADA_EXTERNA | 11 |
| **Total** | **63** |

### Conferidos como concluídos no código (fora da lista de itens): 25 capacidades

Estas capacidades estavam como N ou P nas revisões de 11–12/09 e hoje existem e estão ligadas no código. Nenhuma tem prova de produção.
1. Convites institucionais com cooperativa, PA, papel, validade, reenvio, revogação e tela de aceite (E016): `src/pages/sicoob/SicoobInvitationsPage.tsx:148-189`, `src/pages/sicoob/SicoobInvitationAcceptPage.tsx:87-170`, `supabase/migrations/20260927220000_sicoob_institutional_invitations.sql`.
2. Delegação temporária com vigência, revogação e indicação de autoridade delegada (núcleo de E067): `supabase/migrations/20260927203000_sicoob_approval_delegations.sql`, `src/pages/sicoob/GestorApprovalsPage.tsx:17-20,62-70`.
3. Notas, parcelas e versões de arte no domínio Sicoob (achado A02): `src/hooks/orders/extensions/useOrderInvoices.ts:23`, `useOrderPayments.ts:52`, `useOrderPilotApprovals.ts:44-110`.
4. Produção bloqueada sem arte vigente aprovada (E065.09): trigger `tr_require_sicoob_artwork_before_production` em `supabase/migrations/20260912180000_sicoob_finance_artwork.sql:533-559`.
5. Recompra com nova consulta de preço, estoque e mínimo pelo servidor (E079.03–05): `supabase/functions/sicoob-reorder/index.ts`, chamada em `src/services/sicoob/orderService.ts:275-290`.
6. Kit convertido em orçamento com preço, estoque agregado por SKU, mínimo, variante e personalização validados no servidor, gravação atômica e idempotente (A05/E055.03): `supabase/functions/sicoob-kit-quote/catalog.ts:111-200`, `src/pages/kit-builder/useKitBuilderQuote.ts:40`.
7. Consolidação por PA com alocação por item e recebimento por quantidades (recebidas, avariadas, faltantes) em eventos imutáveis e idempotentes (A16/E076.03/E076.08): `supabase/migrations/20260912190000_sicoob_consolidation_distribution.sql:558-680`, `src/pages/sicoob/GestorConsolidatedOrdersPage.tsx:380-411`.
8. Lotes, metas e percentuais fictícios retirados de agregados e estatísticas, com "Economia comprovada: Não medida" (A06/E089.08): `src/pages/sicoob/reports/SicoobReportsPage.tsx:405-409`, `src/services/sicoob/statsService.ts`.
9. Histórico de busca segmentado por usuário, cooperativa e PA (Bench B01): `src/hooks/useCatalogState.ts:194`.
10. Faixas de orçamento no catálogo (Bench B02) e trilhos móveis compactos (Bench B03): `src/pages/Index.tsx` (`onSelectBudget`).
11. Catálogo externo com contrato somente leitura e redação de custo, margem e fornecedor (Bench B04/B05): `supabase/functions/external-db-bridge/index.ts:933,1502`, `supabase/functions/_shared/catalog-redaction.ts:5-24`.
12. Orçamento atômico com versão e idempotência (Bench B06): `src/services/QuoteService.ts:191,223` (`save_quote_atomic_idempotent` / `save_quote_atomic`).
13. Portal com noindex e robots, sem sitemap (Bench B07).
14. Cor e estoque por variante no card (Bench B13): `src/components/products/ProductCard.tsx:223`.
15. Vistos recentemente separados por usuário e organização, limpos ao trocar de sessão (Bench B14/A20): `src/stores/useRecentlyViewedStore.ts:3-75`.
16. Autosave com estados salvando, salvo, erro e offline, mais concorrência por `row_version` (Bench B16): `src/components/quotes/QuoteAutoSave.tsx:20-60`.
17. Resumo fixo no desktop e barras de ação móveis (Bench B20): `src/pages/QuoteBuilderPage.tsx:95,120`, `src/components/mobile/MobileProductActions.tsx:50`, `KitMobileSummaryBar.tsx`.
18. Compartilhamento com expiração e revogação para kit, lista, coleção e aprovação de proposta (Bench B22): `src/components/quotes/QuoteApprovalLinkCard.tsx`, `src/components/kit-builder/KitShareLinkDialog.tsx`.
19. Comparador de versões de proposta (E059.05): `src/components/quotes/QuoteVersionCompare.tsx`.
20. Avisos de aprovação por outbox com estados entregue e falhou (E029.09): `supabase/functions/_shared/approval-delivery.ts:37-80`.
21. Login sem acesso de teste nem métricas inventadas (Backlog B13); `migrate-helper` desativado com 410 (Backlog B02); `QuickTestLogin` sem importação.
22. Política de aprovação com snapshot e precedência por cooperativa (A15/A17, Backlog B17 em código): `supabase/migrations/20260922161000_repair_sicoob_approval_policy_snapshot.sql`.
23. Decisões e histórico gravados na mesma transação (Backlog B28): `supabase/migrations/20260912110000_sicoob_order_status_events.sql`, `20260927100000_quote_history_immutable.sql`.
24. Documentos privados com quarentena e URLs assinadas (Backlog B41): `supabase/migrations/20260922225600_sicoob_document_quarantine_gate.sql`, `20260923130000_secure_sicoob_documents_and_exports.sql`.
25. Transição de status de orçamento que verifica o escopo antes do retorno idempotente (Backlog B08, falha reproduzida em 01/10): `supabase/migrations/20260928182000_idempotent_quote_status_notifications.sql` (`can_manage_quote_scope` na linha 46 da função, antes do `RETURN` da linha 67).

### Os 10 achados mais graves

1. **PLB-27: avaria e falta não têm fluxo de resolução.** Quando o recebimento registra avaria ou falta, o pedido fica parado em `logistic` e não existe tela nem RPC para resolver a ocorrência, repor, dar crédito ou reabrir. A migration admite isso no comentário: "O pedido permanece em logística até que a divergência seja resolvida pelo fluxo operacional" (`20260912190000...sql:668`).
2. **PLB-32: a verba só tem "total" e "consumida" por mês.** Faltam os estados planejado, reservado e comprometido, o centro de custo, a consulta a competências anteriores e o tratamento de virada de período (`pa_budgets`; `src/hooks/usePaBudget.ts:28-33`).
3. **PLB-33: pedido de aumento de limite sem ninguém para decidir.** O PA grava em `limit_increase_requests` (`approvalService.ts:159-160`), mas nenhuma tela ou RPC aprova, rejeita ou aplica o pedido. O PA fica sem resposta.
4. **PLB-40: comentários do pedido Sicoob gravam na tabela legada.** A aba usa `order_comments`, cuja FK aponta para `orders(id)` e não para `sicoob_orders` (`20260502174252...sql:207`; `useOrderComments.ts:16`). O comentário em pedido Sicoob tende a falhar. Os domínios `/pedidos` (legado) e `/sicoob/pedidos` continuam coexistindo.
5. **PLB-23: o comprador não consegue distribuir quantidades entre destinos.** A distribuição é automática e coloca 100% de cada item na PA do pedido (`20260913120004...sql:66`). Não há data necessária por destino nem importação de planilha. O cenário de 600 kits em 3 PAs do dossiê é inviável.
6. **PLB-13 e PLB-14: não existe campanha institucional.** Faltam briefing, data do evento, destinos e centro de custo. A tela genérica de campanhas existe, mas o menu leva a `/admin/campanhas`, que não tem rota.
7. **PLB-43: não há conciliação financeira.** Notas e parcelas existem, mas nada cruza proposta, entrega e NF. Recebimento parcial e quitação não são reconciliados.
8. **PLB-18 e PLB-19: aprovação de arte incompleta.** A arte é aprovada por quem tem alçada financeira (`assert_sicoob_approval_actor`, `20260912180000...sql:413`). Não existe competência de marca nem fila de artes, e a versão não se liga ao item, à técnica, à posição nem à dimensão.
9. **PLB-09 e PLB-10: o "custo total" não é total.** O frete vem de tabela fixa por peso com referência em São Paulo capital (`FreightEstimator.tsx:21,75`), não há frete por destino e os tributos não são explicitados.
10. **PLB-04 e PLB-49: dados inventados e botões sem efeito na frente do comprador.** O comparador mostra "Lead time 1-3 dias / 5-10 dias" calculado a partir do status de estoque (`CompareTableView.tsx:41-55,227`). "Central de Ajuda" leva a `/ajuda`, que não tem rota. O item "Ajuda" do menu do usuário e o botão "Solicitar Aumento de Limite" do painel do PA não fazem nada.

## Itens

### Catálogo e descoberta

### PLB-01  Múltiplo de compra e mínimo uniforme
- Status: PARCIAL
- Origem do plano: `docs/plano-implementacao/plano-100-etapas.md:1236` (E043.04 "Mostrar mínimo e múltiplo de compra quando conhecidos"); E046.04, E048.02, E055.04; dossiê §6.1 ("mínimo, múltiplo").
- Evidência no código: o mínimo aparece na PDP (`src/pages/product-detail/ProductDetailHeroSections.tsx`, `minQuantity`) e é validado no kit no servidor (`supabase/functions/sicoob-kit-quote/catalog.ts:160-200`). Múltiplo de venda: grep `múltiplo de|order_multiple|purchase_multiple|sale_multiple|quantity_step` em `src` e `supabase/functions` retornou 0 ocorrências.
- O que falta: modelar o múltiplo e o lote de embalagem; exibir mínimo e múltiplo no card e na lista; validar os dois no servidor para orçamento avulso e recompra.
- Impacto no negócio: o comprador pode pedir uma quantidade que o fornecedor não vende, o que obriga a refazer a proposta.
- Esforço: M
- Prioridade: P2

### PLB-02  Horário da consulta de estoque e condição de reconfirmação
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1320` (E046.07); E043.05; benchmark `benchmark-promo-gifts-v4.md:335` (B17 "Exibir validade do preço e timestamp da consulta de estoque").
- Evidência no código: preço tem `PriceFreshnessBadge` em card, lista e quick view (`src/components/products/ProductCard.tsx:227`, `PriceFreshnessBadge.tsx:289-293`). Para estoque, grep `stock.*(updated_at|checked_at)|estoque (consultado|atualizado)` em componentes e páginas não encontrou exibição. O card mostra só "N un" (`EnhancedProductCard.tsx:77`).
- O que falta: mostrar data e hora da última leitura de estoque e o aviso "sujeito a reconfirmação" no card, na PDP e no orçamento.
- Impacto no negócio: o comprador decide com estoque possivelmente desatualizado sem saber disso.
- Esforço: P
- Prioridade: P2

### PLB-03  Correção sugerida explícita e vocabulário de sinônimos
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1265` (E044.06 "Apresentar correção sugerida sem apagar a busca original"); E023.06, E044.03; `:662` (E022.03, sinônimos).
- Evidência no código: só há busca aproximada silenciosa (`src/hooks/useCatalogFiltering.ts:154`, `useProductFuzzySearch`). Grep `Você quis dizer|didYouMean|sinônimo|synonym` em `src`: 0 ocorrências.
- O que falta: sugestão "Você quis dizer…" que preserve o termo digitado e dicionário de sinônimos aprovado. Os sinônimos dependem da pesquisa (PLB-54).
- Impacto no negócio: buscas com termos do dia a dia da cooperativa voltam vazias ou trazem resultados trocados sem aviso.
- Esforço: M
- Prioridade: P3

### PLB-04  Comparação nas dimensões de decisão Sicoob (prazo inventado)
- Status: STUB/MOCK
- Origem do plano: `plano-100-etapas.md:1396` (E049.02 "Priorizar preço entregue, mínimo, prazo e personalização"); E049.03; benchmark `:333` (B15).
- Evidência no código: a linha "Lead time" do comparador é calculada a partir do status de estoque. `src/components/compare/CompareTableView.tsx:41-55` devolve "1-3 dias", "5-10 dias" ou "Sob consulta", renderizados na linha 227 com destaque "menor é melhor". Status desconhecido cai em "5-10 dias". Não há preço entregue (frete e personalização) nem normalização de quantidade.
- O que falta: tirar o prazo inventado; usar prazo real de produção e transporte; comparar preço entregue com quantidade normalizada.
- Impacto no negócio: o comprador escolhe o brinde com base num prazo que ninguém prometeu.
- Esforço: M
- Prioridade: P1

### PLB-05  Listas por campanha e colaboração por cooperativa
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1423-1424` (E050.02 e E050.03); benchmark `:274` ("Coleções pessoais e de campanha").
- Evidência no código: `favorite_lists` e `collections` só têm `user_id` e `client_id`, sem `campaign_id` nem membros (`src/integrations/supabase/types.ts`; `src/hooks/useFavoriteLists.ts:12,32`). Colaboração existe apenas no kit (`src/components/kit-builder/KitCollaborationPanel.tsx`).
- O que falta: listas ligadas a uma campanha, com dono, colaboradores da mesma cooperativa e permissão de edição.
- Impacto no negócio: a equipe de marketing da cooperativa não consegue montar a seleção em conjunto.
- Esforço: M
- Prioridade: P3

### PLB-06  Recomendações explicáveis por regra
- Status: PARCIAL
- Origem do plano: benchmark `:346` (B25 "Recomendações por ocasião, histórico e regras comerciais explicáveis"); backlog `backlog.md:60` (B40 "Sugestão informa critério e não inventa probabilidade").
- Evidência no código: `src/components/products/SmartRecommendations.tsx:56,86-91` mostra "score %" e "reason" produzidos por IA (`useAIRecommendations`). Não há regra explícita por ocasião ou histórico da cooperativa.
- O que falta: regras determinísticas (ocasião, recompra, faixa) com o critério exibido, sem percentual de "probabilidade" inventado.
- Impacto no negócio: um percentual sem base pode orientar mal a compra e tirar a credibilidade do portal.
- Esforço: M
- Prioridade: P3

### PLB-07  Estoque futuro com nível de confiança
- Status: PARCIAL
- Origem do plano: benchmark `:347` (B26); `:281` ("Data, quantidade, fonte da consulta e incerteza").
- Evidência no código: `src/hooks/useKitStockForecast.ts:44` usa `BUFFER_DAYS = 3` fixo e as datas de entrada informadas pelo fornecedor. `src/components/products/FutureStockModal.tsx:117` só funciona com a API SPOT. Não há nível de confiança nem fonte e horário da previsão.
- O que falta: indicar fonte, data da consulta e grau de incerteza da reposição.
- Impacto no negócio: um prazo de fechamento de kit baseado em previsão sem ressalva pode virar atraso de evento.
- Esforço: M
- Prioridade: P3

### PLB-08  Catálogo personalizado por cooperativa sem bifurcar código
- Status: PARCIAL
- Origem do plano: benchmark `:353` (B32); E022.07 (curadoria por assembleia e evento).
- Evidência no código: existem tema por cooperativa (`src/pages/admin/sicoob/tabs/CooperativasTab.tsx:50-60`, `sicoob_temas`) e política de aprovação por cooperativa. Grep `catalog_policy|allowed_products|blocked_categories|cooperative_catalog`: 0 ocorrências. O texto "Curadoria para cooperativas" é apenas um rótulo (`CatalogStorefrontHero.tsx:70`).
- O que falta: curadoria configurável (categorias e produtos permitidos ou destacados) por cooperativa.
- Impacto no negócio: toda cooperativa vê o mesmo catálogo, sem as regras e preferências locais.
- Esforço: G
- Prioridade: P3

### Personalização, custo e prazo

### PLB-09  Frete por destino (tabela fixa)
- Status: STUB/MOCK
- Origem do plano: `plano-100-etapas.md:1371` (E048.04); E056.06; `:1643` (E058.03 "frete por destino"); dossiê §6.2 item 2.
- Evidência no código: `src/components/kit-builder/FreightEstimator.tsx:21` traz uma "Tabela interna estimada por faixa de peso (SP Capital como referência)" e a linha 75 avisa "sem integração CEP real". O orçamento recebe `shippingCost` digitado à mão (`src/hooks/useQuoteBuilderState.ts:387`). Grep `melhorenvio|frenet|correios|rodonaves` em `src/services`, `src/hooks` e `supabase/functions`: nenhuma integração.
- O que falta: cotação por CEP de cada destino, ou cotação manual registrada por destino, somada ao total.
- Impacto no negócio: o valor aprovado pode estourar a verba quando o frete real chegar.
- Esforço: M
- Prioridade: P1

### PLB-10  Tributos incluídos ou pendentes na proposta
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1372` (E048.05); `:1644` (E058.04).
- Evidência no código: grep `tribut|imposto|ICMS|IPI` em `src/components/quote`, `src/components/quotes` e `src/pages/Quote*`: 0 ocorrências. Os tributos só aparecem no cadastro de fornecedor.
- O que falta: mostrar na proposta quais tributos estão incluídos e quais faltam calcular. A regra fiscal depende de decisão (PLB-58).
- Impacto no negócio: a cooperativa aprova um valor sem saber se ele inclui impostos.
- Esforço: M
- Prioridade: P1

### PLB-11  Prazo decomposto (análise, arte, produção, transporte) e promessa de prazo
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1373` (E048.06); backlog `backlog.md:50` (B42 "Definir produção e promessa de prazo").
- Evidência no código: a PDP mostra um número único `leadTimeDays` ou "Consultar prazo" (`ProductDetailHeroSections.tsx:243`). O componente `src/components/personalization/TechniqueSLACard.tsx`, com prazo por técnica, só é reexportado em `src/components/personalization/index.ts:1` e nenhum consumidor o usa (ORFA).
- O que falta: prazo em etapas com responsável; alerta quando a data necessária não cabe no prazo viável (E052.07).
- Impacto no negócio: o evento chega antes do brinde.
- Esforço: M
- Prioridade: P2

### PLB-12  Análise manual quando o catálogo não tem dado suficiente
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1346` (E047.06).
- Evidência no código: grep `análise manual|protocolo` nos fluxos de personalização: nenhum encaminhamento. Também não há tabela de solicitação técnica (lista de tabelas em `types.ts`).
- O que falta: botão "solicitar análise técnica" com protocolo e responsável.
- Impacto no negócio: produtos sem ficha completa ficam fora da compra ou são comprados no escuro.
- Esforço: M
- Prioridade: P3

### Campanhas, briefing e marca

### PLB-13  Campanha institucional com briefing
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1453-1460` (E051.02, E051.04 data do evento × recebimento, E051.09); backlog `backlog.md:34` (B21); benchmark `:349` (B28 "Modelos de campanha salvos pela cooperativa"); dossiê §6.2 item 1.
- Evidência no código: a tabela `campaigns` tem só `budget, description, start_date, end_date, name, status` e não tem `cooperative_id`, destinos, público, data do evento nem centro de custo (`types.ts`). `sicoob_orders` e `quotes` não têm `campaign_id`. Grep `event_date|data do evento`: 0 ocorrências. O "briefing" existente é criativo, do Magic Up (`src/pages/magic-up/MagicUpConfigPanel.tsx`).
- O que falta: entidade de campanha por cooperativa (objetivo, público, data do evento e de recebimento, destinos, verba e centro de custo, responsável), ligada a itens, kits, propostas e pedidos, com modelos reaproveitáveis.
- Impacto no negócio: a principal forma de compra do Sicoob (campanha sazonal) não tem lugar no portal.
- Esforço: G
- Prioridade: P1

### PLB-14  Tela de campanhas sem rota
- Status: ORFA
- Origem do plano: E051 e E052; benchmark `:139` (Marketing: campanhas, kits, calendário).
- Evidência no código: `src/pages/admin/AdminCampanhasPage.tsx` (398 linhas, CRUD e exportação) não é importada por nenhuma configuração de rota. O menu aponta `/admin/campanhas` (`src/components/layout/SidebarReorganized.tsx:228`), que cai em NotFound. O mesmo acontece com `AdminNewsletterPage` em `/admin/newsletter`.
- O que falta: registrar a rota com o guard adequado, ou retirar o link e a página.
- Impacto no negócio: o administrador clica em "Campanhas" e recebe página inexistente.
- Esforço: P
- Prioridade: P2

### PLB-15  Marcos de campanha e planejamento regressivo
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1480-1481` (E052.02, E052.03); E052.05, E052.07, E052.10.
- Evidência no código: não há tabela de marcos nem cálculo regressivo (grep `milestone|marco|regressiv` nos módulos Sicoob: 0 ocorrências).
- O que falta: marcos encadeados (escolha, cotação, arte, autorização, produção) com responsável, próxima ação e alerta de conflito de prazo.
- Impacto no negócio: atrasos de arte ou aprovação só aparecem quando o evento já está perto.
- Esforço: G
- Prioridade: P2

### PLB-16  Biblioteca institucional de marcas e ativos
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1507,1511` (E053.02 propriedade e permissão de uso; E053.06 vigência); E053.08.
- Evidência no código: a única biblioteca é a do Magic Up, por usuário (`magic_up_brand_kits` com `user_id, client_id, logo_urls`; `src/components/magic-up/MagicUpLogoLibrary.tsx`). Não há ativo por cooperativa com dono, permissão, versão vigente ou snapshot no pedido.
- O que falta: biblioteca por cooperativa com propriedade, autorização de uso, vigência e preservação histórica.
- Impacto no negócio: arte com logo errado ou desatualizado chega à produção.
- Esforço: M
- Prioridade: P2

### PLB-17  Assistente de briefing estruturado para kits e campanhas
- Status: PARCIAL
- Origem do plano: benchmark `:350` (B29); `:128` ("briefing estruturado antes de qualquer geração assistida").
- Evidência no código: o kit aceita só prompt livre (`src/components/kit-builder/KitAIPromptDialog.tsx`, `body: { prompt }`). O seletor de ocasião é genérico (`KitOccasionSelector.tsx`: welcome, year-end, event…). Não há assistente para campanha.
- O que falta: formulário estruturado (ocasião, público, quantidade, faixa, data) antes da IA, também disponível para campanhas.
- Impacto no negócio: as sugestões de IA ignoram verba e prazo reais da cooperativa.
- Esforço: M
- Prioridade: P3

### Arte e prova técnica

### PLB-18  Prova técnica ligada ao item, à especificação e à proposta
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1536-1537` (E054.04, E054.05); `:1670` (E059.03 "versões de arte exigidas por cada item"); `:1833,1837` (E065.01, E065.05); benchmark `:351` (B30 "Mockup assistido com versionamento de arte"); backlog `backlog.md:35` (B22).
- Evidência no código: `sicoob_order_artwork_versions` só tem `order_id`. O snapshot guarda apenas hash, tamanho e MIME do arquivo (`supabase/migrations/20260912180000_sicoob_finance_artwork.sql:85-105`; `supabase/functions/sicoob-artwork-register/index.ts:62-78`). Não há item, técnica, posição nem dimensão. A arte só nasce depois do pedido, não na proposta. `generated_mockups` não se liga à versão de arte. A aba do pedido não compara versões (`OrderPilotApprovalsTab.tsx`).
- O que falta: versão de arte por item com especificação técnica, ligada desde a proposta, com comparação entre versões e vínculo com o mockup.
- Impacto no negócio: a produção pode receber arte aprovada sem a especificação de aplicação correta.
- Esforço: G
- Prioridade: P1

### PLB-19  Competência de marca e fila de aprovação de artes
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1839` (E065.07 "Validar poder de aprovação de marca no escopo da cooperativa"); `:1779` (E063.01); Compromisso 4 do plano ("Aprovar a arte e autorizar a despesa são decisões distintas"); backlog B23.
- Evidência no código: `decide_sicoob_order_artwork` usa o mesmo `assert_sicoob_approval_actor` da aprovação financeira (`20260912180000...sql:413`). A aba de arte só aparece para `isSupervisorOrAbove` (`src/pages/sicoob/orders/OrderDetailPage.tsx:141-145`). `GestorApprovalsPage` lista só solicitações de alçada (colunas nas linhas 120-125). A delegação só cobre `approve_order` e `reject_order` (`20260927203000...sql:25`).
- O que falta: papel e competência de marca por cooperativa; fila de artes pendentes para o marketing; delegação dessa competência.
- Impacto no negócio: quem aprova o gasto também aprova a marca, sem o crivo do marketing.
- Esforço: M
- Prioridade: P1

### Kits

### PLB-20  Capacidade de embalagem validada no servidor
- Status: PARCIAL
- Origem do plano: benchmark `:337` (B19 "Validar capacidade de embalagem, preço e estoque do kit no servidor"); `plano-100-etapas.md:1565` (E055.06).
- Evidência no código: a capacidade só é checada no cliente (`src/hooks/useKitBuilder.ts:40`). O servidor (`supabase/functions/sicoob-kit-quote/catalog.ts:111-200`) valida preço, estoque, mínimo e variante, mas não volume nem dimensão da caixa.
- O que falta: validar volume e capacidade da caixa no servidor (e múltiplo, PLB-01).
- Impacto no negócio: um kit fisicamente impossível de montar pode virar orçamento.
- Esforço: M
- Prioridade: P2

### PLB-21  Modelos de kit por ocasião Sicoob, público e faixa de orçamento
- Status: PARCIAL
- Origem do plano: benchmark `:336` (B18); `:122` ("modelos por ocasião, público, faixa de orçamento e quantidade").
- Evidência no código: `kit_templates` tem `category`, `tag` e `total_price`. Grep `faixa|budget|priceRange|ocasi|audience` em `KitTemplates.tsx`, `KitLibraryPage.tsx` e `useKitTemplates.ts`: 0 filtros. As ocasiões são genéricas (`KitOccasionSelector.tsx`). `src/pages/admin/KitTemplatesMetricsPage.tsx` não tem rota (ORFA).
- O que falta: filtrar modelos por ocasião institucional, público e faixa de valor; rotear as métricas dos modelos.
- Impacto no negócio: montar um kit "até R$ 50 para assembleia" exige busca manual.
- Esforço: M
- Prioridade: P2

### PLB-22  Reordenar itens do kit por botões
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1567` (E055.08).
- Evidência no código: só arrastar, com `KeyboardSensor` (`src/components/kit-builder/SelectedItemsBadges.tsx:112-116,131`, "arraste para reordenar"). Não há botões mover para cima e para baixo.
- O que falta: alternativa por botões, exigida pelo critério WCAG 2.2 2.5.7.
- Impacto no negócio: barreira de acessibilidade para quem não arrasta.
- Esforço: P
- Prioridade: P3

### Distribuição, entrega e recebimento

### PLB-23  Distribuição por destino definida pelo comprador
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1588,1591,1593` (E056.02, E056.05, E056.07); E056.03, E056.09, E056.10; backlog `backlog.md:38` (B25); benchmark `:352` (B31).
- Evidência no código: só existe distribuição automática na consolidação do gestor. `allocate_sicoob_consolidation_by_order_pa` insere 100% de cada item na PA do pedido (`supabase/migrations/20260913120004_sicoob_consolidation_distribution_followup.sql:66`). `sicoob_delivery_destinations` não tem data necessária nem restrição. Proposta e orçamento não têm destinos. Grep de importação de distribuição: 0 ocorrências.
- O que falta: o comprador dividir quantidades de itens e kits entre vários destinos, com saldo a distribuir, data necessária, restrições, importação de planilha e impacto em custo e prazo.
- Impacto no negócio: a campanha para vários PAs exige pedidos separados ou planilha fora do portal.
- Esforço: G
- Prioridade: P1

### PLB-24  Expedição parcial por destino com saldo a expedir
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2080-2081` (E074.02, E074.03); E074.08, E074.09.
- Evidência no código: há uma remessa por pedido, com `order_id NOT NULL UNIQUE` (`supabase/migrations/20260912090000_sicoob_fulfillment.sql:7`; `20260922225100...sql:74` `ON CONFLICT (order_id)`). A consolidação despacha o lote inteiro (`dispatch_sicoob_order_consolidation`).
- O que falta: várias remessas por pedido e por destino com itens e quantidades, saldo a expedir e trava de troca de destino após expedição.
- Impacto no negócio: entregas escalonadas não são controladas.
- Esforço: M
- Prioridade: P2

### PLB-25  Rastreio com eventos e previsão por destino
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2106,2110` (E075.01, E075.05); E075.03, E075.04.
- Evidência no código: só há código de rastreio manual e link externo `rastreie.com.br` (`src/components/sicoob/orders/LogisticsCommandCenter.tsx:110`), com o aviso "A localização em tempo real não é fornecida" (linha 119). Grep `tracking_events|delivery_attempt`: nenhuma tabela de eventos.
- O que falta: eventos de tentativa, atraso e endereço por remessa e destino, com data da última atualização.
- Impacto no negócio: o PA não sabe se a entrega atrasou antes do evento.
- Esforço: M
- Prioridade: P2

### PLB-26  Estado "parcialmente entregue" e itens em estágios diferentes
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2114` (E075.09); `:1973` (E070.06); `:2137` (E076.05); dossiê §6.2 item 6.
- Evidência no código: `OrderStatus` não tem estado parcial (`src/types/sicoob/orders.ts:3`). O estado parcial só existe na consolidação (`partially_received`). No fluxo sem consolidação, `in_transit` passa a `delivered` por status e foto, sem conferir quantidades (`SICOOB_VALID_TRANSITIONS`, linhas 28-43). Não há separação entre aceite físico e aceite de qualidade.
- O que falta: estado por item e destino, pedido "parcialmente entregue" e conferência por quantidade também no fluxo direto.
- Impacto no negócio: um pedido parece concluído com unidades ainda em falta.
- Esforço: M
- Prioridade: P2

### PLB-27  Ocorrências de avaria, falta e troca até a solução
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2160-2166` (E077.01, E077.04, E077.06, E077.07); E077.09, E077.10; backlog `backlog.md:39` (B26).
- Evidência no código: o recebimento só registra quantidades avariadas e faltantes com observação (`src/pages/sicoob/GestorConsolidatedOrdersPage.tsx:397-408`). Com divergência, o pedido não sai de `logistic` ("O pedido permanece em logística até que a divergência seja resolvida pelo fluxo operacional", `20260912190000...sql:666-670`), e esse fluxo não existe. Grep `occurrence|ocorrência|claim|reposição.*crédito` em `src` e migrations: não há tabela, tela nem RPC.
- O que falta: ocorrência com protocolo, categoria, evidência (foto), investigação, solução (reposição, coleta, crédito), discordância e reabertura, e baixa do pedido ao resolver.
- Impacto no negócio: pedidos com problema ficam parados para sempre e a cooperativa cobra por fora.
- Esforço: G
- Prioridade: P1

### Proposta e solicitação

### PLB-28  Solicitação institucional distinta do construtor do vendedor
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1614,1616` (E057.01, E057.03); `:1626` E057.07; `:770` (E026.03); benchmark `:276` ("Carrinhos por fornecedor: Não expor — um orçamento do comprador").
- Evidência no código: o PA usa o mesmo construtor do vendedor (`useQuoteBuilderState.ts:163-164,585`), com seletor de "cliente", desconto, markup de negociação (`QuoteBuilderSummaryColumn.tsx:214-217`) e notas internas. O menu mostra "Carrinhos" (workspace de carrinhos do vendedor) a todos os papéis (`SidebarReorganized.tsx:136`; `src/pages/SellerCartsPage.tsx:1-10`).
- O que falta: fluxo de solicitação do comprador sem campos comerciais do vendedor, que preserve campanha e destinos.
- Impacto no negócio: o comprador vê ferramentas que não entende e campos que não deveria editar.
- Esforço: G
- Prioridade: P2

### PLB-29  Centro de custo e rateio
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1646` (E058.06); E017.02, E051.05, E062.01; dossiê §7.3.
- Evidência no código: grep `centro de custo|cost_center|costCenter|rateio` em `src`, `supabase/functions` e migrations: 0 ocorrências. Nenhuma coluna aparece em `quotes`, `sicoob_orders` ou `pa_budgets`.
- O que falta: modelar o centro de custo e fazer o rateio na proposta, no pedido e na verba.
- Impacto no negócio: a contabilidade da cooperativa não consegue alocar o gasto.
- Esforço: M
- Prioridade: P1

### PLB-30  Cotações externas, fornecedor único e comparação exigida na decisão
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1696,1701` (E060.02, E060.07); E060.10; `:1807` (E064.02); dossiê §6.2 item 3.
- Evidência no código: grep `external_quote|fornecedor único|single_source|cotações externas`: 0 ocorrências. Não há tabela de proposta de fornecedor (lista de tabelas em `types.ts`).
- O que falta: anexar 2 ou 3 propostas com fornecedor e validade, registrar justificativa de fornecedor único e exibir a comparação na decisão do aprovador, conforme a política (PLB-56).
- Impacto no negócio: cooperativas cuja política exige três cotações não conseguem cumprir a regra no portal.
- Esforço: G
- Prioridade: P2

### PLB-31  PDF da proposta: "Versão" mostra o status e selo de autenticidade sem verificação
- Status: STUB/MOCK
- Origem do plano: `plano-100-etapas.md:1675` (E059.08 "identificação inequívoca da versão"); `:774` (E026.07 "Retirar… selos e afirmações de oficialidade sem origem comprovada").
- Evidência no código: `src/components/pdf/proposal/ProposalFooter.tsx:28` imprime "Versão {data.status}". As linhas 23-24 trazem "Documento Autêntico / Hash: …", mas o hash são os 8 primeiros caracteres do UUID (`src/components/quotes/PdfGenerationDialog.tsx:220`). No pedido, "Protocolo Digital SIC-<uuid>" e "Integridade: Protegida por regras transacionais" são texto fixo (`src/pages/sicoob/orders/OrderDetailPage.tsx:225`).
- O que falta: imprimir o número da versão; usar hash real do conteúdo com verificação, ou retirar o selo.
- Impacto no negócio: o documento afirma uma autenticidade que não pode ser comprovada, o que é risco em auditoria.
- Esforço: P
- Prioridade: P2

### Verba

### PLB-32  Verba com quatro estados, competência e centro de custo
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:522` (E017.01); `:529` (E017.08 pedido parcial e mudança de período); `:1753` (E062.02); `:1756` (E062.05); backlog `backlog.md:29` (B16).
- Evidência no código: `pa_budgets` tem só `verba_total`, `verba_consumida` e `limite_alcada` por `ano/mes`. `src/hooks/usePaBudget.ts:28-33` consulta apenas o mês corrente. Grep `verba_reservada|committed_amount|reserved_amount|verba_planejada`: 0 ocorrências.
- O que falta: planejado, reservado, comprometido e consumido; histórico por competência; virada de período; pedido parcial e estorno parcial.
- Impacto no negócio: o saldo exibido não mostra o que já está comprometido e a verba pode estourar.
- Esforço: G
- Prioridade: P1

### PLB-33  Pedido de aumento de limite sem fila de decisão
- Status: ORFA
- Origem do plano: `plano-100-etapas.md:1759` (E062.08 "Mostrar exceções aprovadas sem ocultar seu efeito sobre o saldo"); E066.01, E066.02.
- Evidência no código: o PA cria o pedido em `limit_increase_requests` (`src/services/sicoob/approvalService.ts:159-160`; `src/pages/sicoob/PAWalletPage.tsx:320-328`). Nenhuma página, hook ou RPC lê esses pedidos para aprová-los ou aplicá-los: grep `limit_increase` só encontra `PAWalletPage` e `approvalService`.
- O que falta: fila do gestor para decidir, aplicação do valor em `pa_budgets` com trilha e aviso ao PA.
- Impacto no negócio: o PA pede mais verba e nunca recebe resposta.
- Esforço: M
- Prioridade: P1

### PLB-34  Verba inventada (R$ 50.000) e selo "Análise em Tempo Real"
- Status: STUB/MOCK
- Origem do plano: `plano-100-etapas.md:774` (E026.07); Compromisso 6 do plano ("Não publicar números de demonstração como resultados reais").
- Evidência no código: `src/pages/sicoob/orders/OrderDetailPage.tsx:252` passa `allocatedBudget={budget?.verba_total || 50000}`. `src/components/sicoob/orders/OrderBudgetIntelligence.tsx:40` exibe o selo "Análise em Tempo Real".
- O que falta: mostrar "verba não configurada" em vez de R$ 50.000 e retirar o selo.
- Impacto no negócio: o aprovador vê uma verba que a PA não tem.
- Esforço: P
- Prioridade: P2

### Aprovação e governança

### PLB-35  Fila de aprovações orientada à decisão e devolução para correção
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1779` (E063.01); `:1782` (E063.04); `:1810` (E064.05 "aprovação, rejeição e devolução com finalidades distintas").
- Evidência no código: `src/pages/sicoob/GestorApprovalsPage.tsx:120-125` tem só data, PA, valor, motivo e excesso, sem filtros por campanha ou situação e sem critério de ordenação. O detalhe oferece apenas Rejeitar, Escalar e Aprovar (`OrderDetailPage.tsx:178`). A devolução acontece via `rejected → draft` (`types/sicoob/orders.ts:39`).
- O que falta: separar despesa, arte e exceção; filtros e ordem explicados; ação "devolver para correção" distinta de "rejeitar".
- Impacto no negócio: o gestor perde tempo e a rejeição soa definitiva quando era apenas um ajuste.
- Esforço: M
- Prioridade: P2

### PLB-36  Exceções governadas com validade e limites
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1860,1865` (E066.01, E066.06); E066.07, E066.10.
- Evidência no código: só existem a escalação à diretoria e o pedido de aumento de limite (órfão, PLB-33). Grep `exception|exceção` nas tabelas Sicoob: nenhuma tabela de exceção com prazo, quantidade ou cotação, validade e recálculo.
- O que falta: tipos de exceção previstos na política, quem solicita e quem decide, validade, limites e recálculo das aprovações.
- Impacto no negócio: exceções viram combinados informais sem trilha.
- Esforço: M
- Prioridade: P2

### PLB-37  Delegação restrita (sem arte e só no painel admin)
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1889` (E067.03 a E067.10); E099.07.
- Evidência no código: a constraint aceita só `approve_order` e `reject_order` (`20260927203000...sql:22-25`). A interface existe apenas em `src/pages/admin/sicoob/tabs/ApprovalDelegationsTab.tsx`, sob `AdminRoute` com MFA. O gestor de cooperativa não delega sozinho.
- O que falta: delegar a competência de arte; autoatendimento do gestor dentro da sua autoridade; ensaio com regras diferentes por cooperativa.
- Impacto no negócio: nas férias do aprovador, alguém do suporte técnico precisa intervir.
- Esforço: P
- Prioridade: P3

### PLB-38  Dossiê completo e linha do tempo única do pedido
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1923` (E068.10 "Reconstruir um pedido… a partir do histórico e seus documentos"); benchmark `:339` (B21 "linha do tempo única de orçamento, verba, arte, pedido e entrega").
- Evidência no código: `src/components/orders/OrderHistoryTimeline.tsx:2,13` lê só `useSicoobOrderHistory` (status). `src/utils/sicoob/orderDossierExport.ts`: grep `artwork|payment|invoice|receipt|shipment` dá 0 ocorrências, ou seja, o dossiê leva só itens e status.
- O que falta: incluir no histórico e no dossiê a proposta e sua versão, arte, verba, NF, pagamentos, remessas e recebimentos.
- Impacto no negócio: em auditoria, ninguém reconstrói quem aprovou o quê e o que chegou.
- Esforço: M
- Prioridade: P2

### PLB-39  Revisão depois da aprovação e cancelamento parcial
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1943,1945,1947` (E069.03, E069.05, E069.07).
- Evidência no código: itens só podem ser editados em `draft` (`supabase/migrations/20260922224600_mutate_sicoob_order_items_atomic.sql:37-41`; `types/sicoob/orders.ts:50-52`). Grep `cancelamento parcial|partial_cancel|cancel_item`: 0 ocorrências.
- O que falta: fluxo formal de revisão (quantidade, destino, arte) que invalide os aceites afetados, cancelamento por item ou destino e confirmação do fornecedor.
- Impacto no negócio: qualquer ajuste depois da aprovação exige cancelar tudo e recomeçar.
- Esforço: G
- Prioridade: P2

### Pedido e execução

### PLB-40  Dois domínios de pedido e comentários Sicoob na tabela legada
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1968` (E070.01 "Reconciliar estados… no contrato canônico"); backlog `backlog.md:37` (B24 "Unificar estados e transições").
- Evidência no código: `/pedidos` e `/pedidos/:id` continuam roteados ao domínio legado `orders` (`src/App.tsx`; `src/services/OrderService.ts:24-121`) e recebem links de `QuoteOrderBadge.tsx:52` e `MyPendingOrdersWidget.tsx:102`. A aba "Comentários" do pedido Sicoob usa `OrderService.listComments/addComment` (`src/hooks/orders/extensions/useOrderComments.ts:16,24`) em `order_comments`, cuja FK aponta para `orders(id)` (`supabase/migrations/20260502174252...sql:207`; também em `types.ts`). Nenhuma migration altera essa FK, e o pedido Sicoob não é espelhado em `orders`.
- O que falta: comentários com FK para `sicoob_orders` e aposentar ou redirecionar o domínio legado.
- Impacto no negócio: a conversa do pedido falha, e há dois "pedidos" diferentes para o mesmo usuário.
- Esforço: M
- Prioridade: P1

### PLB-41  Passagem formal do pedido ao fornecedor
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:1999,2003` (E071.02, E071.06); E071.07, E071.08.
- Evidência no código: grep `purchase_order|ordem de compra|supplier_order|aceite do fornecedor` não encontrou nada no fluxo Sicoob. Os acertos estão em estoque e PDF genérico.
- O que falta: pacote imutável (versão comercial, arte e especificação) enviado ao fornecedor, aceite das condições, registro de divergência antes de produzir e bloqueio de pacote substituído.
- Impacto no negócio: a produção pode começar com versão errada sem prova do que foi combinado.
- Esforço: G
- Prioridade: P2

### PLB-42  Produção e controle de qualidade
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:2027-2030` (E072.03, E072.05, E072.06); E072.10.
- Evidência no código: só existe o status `in_production`. Grep `quality_inspection|inspeção de qualidade|produced_quantity|rejected_quantity`: 0 ocorrências fora de textos de PDF.
- O que falta: confirmar materiais e técnica, registrar lote, quantidades produzidas, rejeitadas e pendentes, e inspeção ligada à arte aprovada.
- Impacto no negócio: lote com defeito só aparece no recebimento.
- Esforço: G
- Prioridade: P2

### PLB-43  Conciliação de proposta, entrega e documento financeiro
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2192` (E078.06); E078.05; backlog `backlog.md:40` (B27).
- Evidência no código: NF e parcelas no domínio Sicoob (`useOrderInvoices.ts:23`, `useOrderPayments.ts:52`; o campo "ID da conciliação" é texto livre em `OrderPaymentsTab.tsx:169`). Não há regra que compare quantidades e valores contratados, recebidos e faturados, nem que impeça encerrar com divergência.
- O que falta: conciliação tripla, recebimento parcial sem presumir quitação e bloqueio de encerramento com divergência.
- Impacto no negócio: a cooperativa pode pagar por itens que não recebeu.
- Esforço: G
- Prioridade: P1

### PLB-44  Reconfirmação de disponibilidade com evidência e reserva
- Status: BLOQUEADA_EXTERNA
- Origem do plano: `plano-100-etapas.md:2056` (E073.05); E073.01, E073.06; Compromisso 1 do plano.
- Evidência no código: `supabase/functions/sicoob-kit-quote/index.ts:144,236` devolve `stockReserved: false`. A revalidação de 12/09 deixa em aberto "Definir e implementar a semântica de reserva no catálogo externo somente leitura" (`docs/execucao/revalidacao-corretiva-2026-09-12.md`, checklist).
- O que falta: contrato de reserva ou confirmação comercial com o fornecedor, porque o catálogo não pode receber escrita; registro da evidência no portal; checagem obrigatória antes de liberar produção.
- Impacto no negócio: estoque mostrado no orçamento pode acabar antes da produção.
- Esforço: M
- Prioridade: P2

### PLB-45  Recompra sem revalidar arte e sem diferenças por item
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2219,2221` (E079.06, E079.08); E079.07; backlog `backlog.md:56` (B35 "Preço vencido, produto inativo e arte alterada são sinalizados").
- Evidência no código: só aparece a contagem "N item(ns) mudaram de preço" (`src/components/quotes/ReorderCatalogValidityBanner.tsx:45`). Nada marca arte antiga para nova validação de marca, e não há comparação item a item.
- O que falta: listar as diferenças por item, exigir nova validação da arte antiga e reconfirmar destinos e competência.
- Impacto no negócio: a recompra reaproveita arte vencida ou fora do padrão sem aviso.
- Esforço: M
- Prioridade: P2

### Início, navegação e ajuda

### PLB-46  Início orientado às pendências
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:1206` (E042.01); dossiê §6.1 ("arte aguardando revisão, pedido devolvido, orçamento perto do vencimento, entrega com divergência").
- Evidência no código: `/` é a vitrine do catálogo (`src/pages/Index.tsx`). Os painéis de PA e gestor mostram contagens (`PADashboardPage.tsx:136`, `GestorDashboardPage.tsx:96-109`), sem lista de artes pendentes, devolvidos, recebimentos ou orçamentos a vencer.
- O que falta: lista acionável de pendências por papel.
- Impacto no negócio: pendências se perdem e os prazos estouram.
- Esforço: M
- Prioridade: P2

### PLB-47  Troca de cooperativa sem aviso de trabalho não salvo
- Status: NAO_INICIADA
- Origem do plano: `plano-100-etapas.md:746` (E025.06); E025.03.
- Evidência no código: `src/components/navigation/OrganizationSwitcher.tsx:58` chama `switchOrganization` direto, sem guarda. O `useUnsavedChangesGuard` existe, mas o switcher não o usa.
- O que falta: confirmação antes de trocar de contexto com rascunho aberto e distinção visual entre trocar de unidade e trocar de papel.
- Impacto no negócio: rascunho perdido ou gravado no contexto errado.
- Esforço: P
- Prioridade: P3

### PLB-48  Navegação por papel: comprador vê ferramentas de vendedor e markup
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:636` (E021.04); E021.02; benchmark `:279` ("Margem/markup: Restringir — visível apenas a papéis internos") e `:291` ("Administração extensa no menu: Rejeitar").
- Evidência no código: "Carrinhos", "Match", "Preços por Tiragem", "Inteligência de Mercado" e "Business Analytic" aparecem para todos os autenticados (`SidebarReorganized.tsx:136,163-177`). As restrições cobrem só `/admin/usuarios|cadastros|sicoob` (`src/lib/navigation/restricted-routes.ts:29-33`). O kit mostra "Simulação de Margem" a qualquer papel (`src/components/kit-builder/KitSummary.tsx:57`; `KitMarginSimulator.tsx:34`).
- O que falta: menu e rotas por tarefa e papel, e ocultar markup e margem para comprador e aprovador.
- Impacto no negócio: o comprador cooperado vê lógica de margem de vendedor, o que gera ruído e desconfiança.
- Esforço: M
- Prioridade: P2

### PLB-49  Central de ajuda e suporte com links mortos e botões sem ação
- Status: STUB/MOCK
- Origem do plano: `plano-100-etapas.md:2243,2247` (E080.03, E080.07 "acompanhar solicitações de suporte pelo protocolo"); `:827` (E028.09).
- Evidência no código: "Central de Ajuda" navega para `/ajuda` (`src/components/command/commandActions.tsx:241`), que não tem rota em `src/routes/config/*` nem em `App.tsx` e cai em NotFound. O item "Ajuda" do menu do usuário não tem `onClick` (`src/components/layout/Header.tsx:130`). O botão "Solicitar Aumento de Limite" do painel do PA não tem handler (`src/pages/sicoob/PADashboardPage.tsx:240-246`). Grep `support_ticket|protocolo de suporte`: 0 ocorrências.
- O que falta: página de ajuda com respostas sobre quantidade, arte, verba e entrega; canal de suporte com protocolo; ligar ou remover os botões mortos.
- Impacto no negócio: o usuário clica em "Ajuda" e não acontece nada, e o atendimento fica todo no telefone.
- Esforço: M
- Prioridade: P2

### Avisos e indicadores

### PLB-50  Avisos por evento: só aprovação sai do portal
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:850` (E029.02 "destinatário de arte, despesa, atraso e divergência"); `:855` (E029.07 calendário operacional); backlog `backlog.md:42` (B29).
- Evidência no código: e-mail e Slack existem só para a outbox de aprovação (`supabase/functions/_shared/approval-delivery.ts:37-58`, que depende de `RESEND_API_KEY`). Arte, atraso e divergência geram só aviso in-app. O convite institucional não é enviado: o gestor copia o link (`SicoobInvitationsPage.tsx:148-165`, link devolvido, sem envio). Grep `feriado|holiday|business_hours`: 0 ocorrências no agendamento. Os comentários de orçamento ainda gravam notificação pelo navegador (`src/hooks/useQuoteComments.ts:172`).
- O que falta: matriz de eventos e destinatários com envio externo, envio de convite e calendário operacional por cooperativa.
- Impacto no negócio: pessoas não ficam sabendo do que precisam aprovar ou receber.
- Esforço: M
- Prioridade: P2

### PLB-51  Indicadores de ciclo, retrabalho, entrega e funil
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2490-2492` (E089.04, E089.05, E089.06); benchmark `:341` (B23 "métricas do funil sem dados fictícios"); dossiê §10.
- Evidência no código: `src/pages/sicoob/reports/SicoobKpiPage.tsx:281-299` tem ticket médio, volume, quantidade de pedidos e unidades entregues. Grep `tempo médio de aprovação|cycle time|approval_time`: 0 ocorrências. Não há funil Sicoob de solicitação até recebimento.
- O que falta: tempo até aprovar a arte e a despesa, espera versus processamento, devoluções por motivo, contratado versus recebido por destino e funil real.
- Impacto no negócio: a diretoria não consegue medir se o portal reduziu trabalho e prazo.
- Esforço: M
- Prioridade: P2

### PLB-52  Core Web Vitals das jornadas autenticadas no domínio de homologação
- Status: PARCIAL
- Origem do plano: benchmark `:342` (B24); `plano-100-etapas.md:2361` (E084.10).
- Evidência no código: a coleta de campo grava em `telemetry_events` (`src/hooks/infrastructure/useWebVitals.ts:20-31`). O Lighthouse mede só `http://localhost:4173/login` (`.lighthouserc.cjs:6`).
- O que falta: medir catálogo, orçamento e aprovação autenticados no domínio alvo e publicar o p75.
- Impacto no negócio: lentidão nas telas de compra pode passar despercebida.
- Esforço: P
- Prioridade: P3

### Acessibilidade

### PLB-53  Jornada completa por teclado, zoom e leitor de tela
- Status: PARCIAL
- Origem do plano: `plano-100-etapas.md:2273` (E081.03); E081.06, E081.08, E082, E083; benchmark `:326` (B11); backlog `backlog.md:44` (B31).
- Evidência no código: há axe por rota (`e2e/routes/_shared.ts`, `e2e/helpers/waits.ts`). Grep `zoom|200%|400%|reflow` em `e2e`: 0 ocorrências. Não há roteiro de teclado de compra, aprovação e recebimento.
- O que falta: ensaio manual e automatizado da compra inteira (teclado, zoom 200/400%, leitor de tela, 320 px, aparelho real).
- Impacto no negócio: risco de excluir usuários e de não conformidade com WCAG 2.2 AA.
- Esforço: M
- Prioridade: P2

### Governança e validações externas (agregadas)

### PLB-54  Pesquisa e usabilidade com compradores e marketing
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E004–E006 (`plano-100-etapas.md:156-236`); E021.08, `:662` E022.03, E026.09, E030, E088; backlog `backlog.md:48` (B37).
- Evidência no código: não se aplica a código. A matriz de 27/09 registra E030, E088 e E082 como "V", sem participantes.
- O que falta: recrutar participantes de duas cooperativas, coletar consentimento, observar tarefas e reavaliar prioridades.
- Impacto no negócio: as prioridades seguem baseadas em hipótese, não no uso real.
- Esforço: G
- Prioridade: P1

### PLB-55  Responsáveis nominais, revisores e aceite das 100 etapas
- Status: BLOQUEADA_EXTERNA
- Origem do plano: `plano-100-etapas.md:22` (regra de conclusão); E001.08, E010.07, E040.05, E095.10; "Registro de fechamento" em cada etapa. `etapas.csv` está com `estado=Pendente` e os campos `responsavel_nominal` e `revisor` vazios nas 100 linhas.
- Evidência no código: não se aplica (`docs/plano-implementacao/etapas.csv`).
- O que falta: nomear responsável e revisor e registrar evidência e aceite por etapa.
- Impacto no negócio: nenhuma etapa pode ser dada como concluída formalmente.
- Esforço: P
- Prioridade: P1

### PLB-56  Políticas institucionais por cooperativa (alçada, cotação, arte, cancelamento, calendário)
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E008 (`plano-100-etapas.md:264`); benchmark `:325` (B10); Compromisso 3 do plano; E099.
- Evidência no código: o motor de políticas com snapshot já existe (concluído nº 22). Falta o conteúdo vigente aprovado pelas cooperativas.
- O que falta: aceite formal de cada cooperativa piloto.
- Impacto no negócio: o portal aplica regras que a cooperativa ainda não validou.
- Esforço: M
- Prioridade: P0

### PLB-57  Aceite da marca Sicoob (guia vigente, logo, tipografia, contraste)
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E031, E092; backlog `backlog.md:43` (B30); dossiê §8, com divergência RGB/HEX do turquesa e branco sobre `#00AE9D` em 2,78:1.
- Evidência no código: não se aplica. Os tokens existem, sem aceite do responsável pela marca.
- O que falta: validação formal pelo responsável de marca.
- Impacto no negócio: risco de uso indevido da marca institucional.
- Esforço: P
- Prioridade: P1

### PLB-58  Dados comerciais: SLA e origem de preço, estoque e prazo; regras de tributo, frete e pagamento
- Status: BLOQUEADA_EXTERNA
- Origem do plano: benchmark `:327` (B12); dossiê §10 ("origem do preço comercial e regras de personalização/frete; condição de pagamento e reconfirmação de estoque").
- Evidência no código: dependência direta de PLB-09, PLB-10, PLB-11 e PLB-44.
- O que falta: decisão de negócio sobre quem vende e fatura, a regra fiscal e o SLA do dado comercial.
- Impacto no negócio: sem essa decisão não existe proposta firme.
- Esforço: M
- Prioridade: P0

### PLB-59  Privilégio somente leitura da identidade no catálogo mestre
- Status: BLOQUEADA_EXTERNA
- Origem do plano: benchmark `:323` (B08); backlog `backlog.md:12` (B04).
- Evidência no código: a ponte recusa escrita (`supabase/functions/external-db-bridge/index.ts:36,479`), mas a ACL da credencial no projeto `doufsxqlfjyuvxuezpln` nunca foi certificada (`docs/execucao/revisao-plano-20261001/matriz-150.md:152`).
- O que falta: comprovação administrativa da ACL de leitura.
- Impacto no negócio: risco residual de escrita no catálogo mestre.
- Esforço: P
- Prioridade: P0

### PLB-60  Homologação real, piloto, primeira compra e segunda cooperativa
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E090–E100 (`plano-100-etapas.md:2502-2816`); benchmark `:324` (B09); backlog B09, `backlog.md:47` (B34), `:59` (B39).
- Evidência no código: o fechamento técnico de 08/10 lista como pendentes a decisão de piloto, as operações reais em duas cooperativas, a conciliação e os 30 dias de estabilidade (`docs/execucao/fechamento-tecnico-2026-10-08.md:66-74`).
- O que falta: decisão de piloto, compra real acompanhada até a conciliação e segunda cooperativa com regras diferentes.
- Impacto no negócio: sem isso o portal não está "pronto", pela regra do próprio projeto.
- Esforço: G
- Prioridade: P0

### PLB-61  Exportação ou integração ERP/SISBR
- Status: BLOQUEADA_EXTERNA
- Origem do plano: backlog `backlog.md:57` (B36); dossiê §10.
- Evidência no código: grep `sisbr|totvs|\berp\b`: 0 ocorrências.
- O que falta: especificação e autorização da cooperativa.
- Impacto no negócio: lançamento contábil manual em duplicidade.
- Esforço: M
- Prioridade: P3

### PLB-62  Operação: suporte, treinamento e incidente controlado
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E020.10, E094; backlog `backlog.md:45` (B32).
- Evidência no código: existem monitor do worker e runbooks. Ainda não houve incidente controlado, treinamento nem responsável operacional.
- O que falta: equipe e responsáveis designados, além de um ensaio de falha e recuperação.
- Impacto no negócio: falha em produção sem dono nem roteiro testado.
- Esforço: M
- Prioridade: P1

### PLB-63  Privacidade (LGPD): atendimento a titular e revogação
- Status: BLOQUEADA_EXTERNA
- Origem do plano: E087 (`plano-100-etapas.md:2421`, E087.09).
- Evidência no código: existem artefatos de retenção. Os ensaios de pedido de titular e de revogação dependem do jurídico e da operação.
- O que falta: processo aprovado e ensaio em ambiente segregado.
- Impacto no negócio: risco regulatório.
- Esforço: M
- Prioridade: P2

## Status atual das 32 melhorias do benchmark Promo Gifts V4

Origem: `docs/pesquisa/2026-09-11/benchmark-promo-gifts-v4.md:316-353` (P0 = B01–B12; P1 = B13–B24; P2 = B25–B32).

| ID | Melhoria | Status em HEAD | Evidência / item |
|---|---|---|---|
| B01 | Histórico de busca com seleção e limpeza | Concluído | `useCatalogState.ts:194` |
| B02 | Entrada por faixa de orçamento | Concluído | `Index.tsx` (`onSelectBudget`) |
| B03 | Atalhos compactos no mobile | Concluído (sem teste em aparelho real) | `CatalogStorefrontHero` |
| B04 | Catálogo externo com contrato somente leitura | Concluído | `external-db-bridge/index.ts:36,479` |
| B05 | Remover custo e margem das respostas | Concluído (API); markup na tela é PLB-48 | `catalog-redaction.ts:5-24` |
| B06 | Orçamento/pedido atômico com versão e idempotência | Concluído | `QuoteService.ts:191,223` |
| B07 | Bloquear indexação | Concluído | — |
| B08 | ACL somente leitura no catálogo | BLOQUEADA_EXTERNA | PLB-59 |
| B09 | Login → orçamento → aprovação em homologação real | BLOQUEADA_EXTERNA | PLB-60 |
| B10 | Política de verba, alçada, arte e cancelamento com responsáveis | BLOQUEADA_EXTERNA | PLB-56 |
| B11 | Jornada por teclado, zoom e leitor | PARCIAL | PLB-53 |
| B12 | SLA e origem de preço, estoque e prazo | BLOQUEADA_EXTERNA | PLB-58 |
| B13 | Cor no card com estoque por variante | Concluído | `ProductCard.tsx:223` |
| B14 | Vistos recentemente por usuário | Concluído | `useRecentlyViewedStore.ts` |
| B15 | Comparação nas dimensões Sicoob | STUB/MOCK (prazo inventado) | PLB-04 |
| B16 | Autosave com estado explícito | Concluído | `QuoteAutoSave.tsx:20-60` |
| B17 | Validade do preço e horário do estoque | PARCIAL (preço sim, estoque não) | PLB-02 |
| B18 | Modelos de kit por ocasião e faixa | PARCIAL | PLB-21 |
| B19 | Capacidade de embalagem, preço e estoque no servidor | PARCIAL (falta capacidade) | PLB-20 |
| B20 | Resumo fixo e barra móvel | Concluído | `QuoteBuilderPage.tsx:95,120` |
| B21 | Linha do tempo única | PARCIAL | PLB-38 |
| B22 | Compartilhamento seguro e expirável | Concluído | `QuoteApprovalLinkCard.tsx` |
| B23 | Métricas de funil sem dados fictícios | PARCIAL | PLB-51 |
| B24 | Core Web Vitals em homologação | PARCIAL | PLB-52 |
| B25 | Recomendações explicáveis | PARCIAL | PLB-06 |
| B26 | Estoque futuro com confiança | PARCIAL | PLB-07 |
| B27 | Recompra com nova consulta | PARCIAL (preço, estoque e mínimo ok; arte e diferenças não) | PLB-45 |
| B28 | Modelos de campanha por cooperativa | NAO_INICIADA (+ tela órfã) | PLB-13, PLB-14 |
| B29 | Assistente de briefing | PARCIAL | PLB-17 |
| B30 | Mockup assistido com versionamento de arte | PARCIAL | PLB-18 |
| B31 | Entrega distribuída com reconciliação | PARCIAL | PLB-23, PLB-27 |
| B32 | Catálogo por cooperativa sem bifurcar | PARCIAL | PLB-08 |

Totais: 12 concluídos, 14 PARCIAL, 1 STUB/MOCK, 1 NAO_INICIADA e 4 BLOQUEADA_EXTERNA.

## Status atual dos 42 itens do backlog da pesquisa (`backlog.csv` / `backlog.json`)

Origem: `docs/pesquisa/2026-09-11/backlog.md:9-60`. Todos começaram como "Proposto — não implementado nesta análise".

| ID | Entrega | Status em HEAD | Evidência / item |
|---|---|---|---|
| B01 | Identificar produção e dois bancos | Concluído no código | `supabase/config.toml:1` (`cfmzkthhgliqelozlmwu`); fechamento 08/10 |
| B02 | Conter migrate-helper | Concluído | resposta 410; não publicável |
| B03 | API externa somente leitura | Concluído | `external-db-bridge/index.ts:36,479` |
| B04 | Credencial externa de privilégio mínimo | BLOQUEADA_EXTERNA | PLB-59 |
| B05 | Fonte correta e mapeamento de campos | Concluído no código | ponte, contrato compartilhado, `BridgeStatusBanner` |
| B06 | Unificar papéis e escopos | PARCIAL: matriz técnica existe, falta aceite do piloto | PLB-56 |
| B07 | Composição de rotas | Concluído no código; pendências de menu por papel | PLB-48 |
| B08 | Autorização das RPCs | Concluído no código | concluído nº 25 |
| B09 | Isolamento real | BLOQUEADA_EXTERNA (2 cooperativas reais) | PLB-60 |
| B10 | Gates de CI | Concluído (fechamento 08/10) | — |
| B11 | Dependências de risco | Concluído (0 vulnerabilidades, fechamento 08/10) | — |
| B12 | Erros no fluxo crítico | Concluído (TypeScript 0, fechamento 08/10) | — |
| B13 | Limpar o acesso de produção | Concluído | `Auth.tsx:704`; `QuickTestLogin` sem importação |
| B14 | Onboarding do piloto (convite) | Concluído no código; falta envio do convite | PLB-50 |
| B15 | Cooperativa, PA e competência | PARCIAL | PLB-29, PLB-32 |
| B16 | Compromisso e estorno atômicos | PARCIAL (atômico ok; faltam 4 estados) | PLB-32 |
| B17 | Regras por cooperativa | Concluído no código; aceite externo | PLB-56 |
| B18 | Curadoria por finalidade e restrições | PARCIAL | PLB-01, PLB-08, PLB-21 |
| B19 | Separar preço, custo e total entregue | PARCIAL | PLB-09, PLB-10 |
| B20 | Proposta versionada e válida | Concluído no código; PDF com defeito | PLB-31 |
| B21 | Campanha com briefing curto | NAO_INICIADA | PLB-13 |
| B22 | Aprovar arte exata para produção | PARCIAL | PLB-18 |
| B23 | Separar arte e autorização de despesa | PARCIAL | PLB-19 |
| B24 | Unificar estados e transições | PARCIAL | PLB-40, PLB-26 |
| B25 | Distribuir por PA e destino | PARCIAL | PLB-23 |
| B26 | Entrega parcial e divergência | PARCIAL | PLB-26, PLB-27 |
| B27 | Conciliar documentos e recebimento | PARCIAL | PLB-43 |
| B28 | Registrar decisões na transação | Concluído no código | concluído nº 23 |
| B29 | Avisos com estado verdadeiro | PARCIAL | PLB-50 |
| B30 | Identidade e ativos autorizados | BLOQUEADA_EXTERNA | PLB-57 |
| B31 | Jornadas por teclado e móvel | PARCIAL | PLB-53 |
| B32 | Saúde e suporte | BLOQUEADA_EXTERNA / PARCIAL | PLB-62, PLB-49 |
| B33 | Substituir promessas por evidências | PARCIAL (restam R$ 50.000, selos e prazo inventado) | PLB-34, PLB-31, PLB-04 |
| B34 | Primeiro pedido acompanhado | BLOQUEADA_EXTERNA | PLB-60 |
| B35 | Repetir a partir do histórico | PARCIAL | PLB-45 |
| B36 | Exportação ERP/SISBR | BLOQUEADA_EXTERNA | PLB-61 |
| B37 | Validar hipóteses com compradores | BLOQUEADA_EXTERNA | PLB-54 |
| B38 | Eficiência e prazo reais | PARCIAL | PLB-51 |
| B39 | Segunda cooperativa | BLOQUEADA_EXTERNA | PLB-60 |
| B40 | Curadoria baseada em evidência | PARCIAL | PLB-06 |
| B41 | Documentos e links compartilhados | Concluído no código | concluído nº 24 |
| B42 | Produção e promessa de prazo | NAO_INICIADA / PARCIAL | PLB-11, PLB-41, PLB-42 |

Totais aproximados: 16 concluídos no código, 17 PARCIAL, 2 NAO_INICIADA e 7 BLOQUEADA_EXTERNA. Linhas com status duplo foram contadas pelo status mais restritivo.

## Fontes lidas

Plano e revisões:
- `docs/plano-implementacao/plano-100-etapas.md` (introdução nas linhas 1-74; etapas E016–E100 nas linhas citadas), `etapas.csv`
- `docs/execucao/revisao-implementacao-2026-09-12.md`; `docs/execucao/revisao-implementacao-2026-09-12/matriz.csv` (1.000 linhas, filtradas por N e P), `benchmark-32-melhorias.md`
- `docs/execucao/revisao-implementacao-2026-09-11.md` e a pasta `revisao-implementacao/` (listagem e benchmark de 11/09)
- `docs/execucao/checkpoint-local-2026-09-11.md`
- `docs/execucao/revalidacao-corretiva-2026-09-12.md`, `revisao-do-plano-2026-10-01.md`, `fechamento-tecnico-2026-10-08.md`
- `docs/execucao/revisao-plano-20260927/benchmark-32.md` e `requisitos-1000.csv` (estado por etapa em 27/09); `revisao-plano-20261001/matriz-150.md` (linha 152)

Pesquisa:
- `docs/pesquisa/2026-09-11/README.md`, `dossie.md` (§6, §7.3, §8, §9, §10), `benchmark-promo-gifts-v4.md` (inteiro), `backlog.md`, `backlog.csv`

Código (principais):
- Rotas: `src/App.tsx`, `src/routes/config/{public,products,quotes,tools,admin,sicoob,sicoob-rbac}.ts`, `src/lib/navigation/restricted-routes.ts`, `src/components/layout/SidebarReorganized.tsx`, `Header.tsx`, `src/components/command/commandActions.tsx`
- Sicoob: `src/pages/sicoob/*` (OrderDetailPage, GestorConsolidatedOrdersPage, GestorApprovalsPage, PAWalletPage, PADashboardPage, SicoobInvitations*, reports/*), `src/components/sicoob/orders/*`, `src/hooks/orders/extensions/*`, `src/hooks/usePaBudget.ts`, `src/services/sicoob/approvalService.ts`, `src/services/OrderService.ts`, `src/types/sicoob/orders.ts`
- Catálogo, kit e orçamento: `ProductCard.tsx`, `PriceFreshnessBadge.tsx`, `CompareTableView.tsx`, `SmartRecommendations.tsx`, `useKitStockForecast.ts`, `kit-builder/*` (FreightEstimator, KitSummary, KitMarginSimulator, SelectedItemsBadges, KitOccasionSelector, KitAIPromptDialog, KitCollaborationPanel), `useQuoteBuilderState.ts`, `QuoteBuilderSummaryColumn.tsx`, `ReorderCatalogValidityBanner.tsx`, `pdf/proposal/ProposalFooter.tsx`, `PdfGenerationDialog.tsx`, `AdminCampanhasPage.tsx`, `TechniqueSLACard.tsx`, `src/integrations/supabase/types.ts` (colunas de `campaigns`, `pa_budgets`, `sicoob_orders`, `quotes`, `favorite_lists`, `collections`, `kit_templates`, `sicoob_*`)
- Edge Functions: `sicoob-kit-quote/{index,catalog}.ts`, `sicoob-reorder`, `sicoob-artwork-register`, `sicoob-approval-notifications`, `_shared/approval-delivery.ts`, `_shared/catalog-redaction.ts`, `external-db-bridge/index.ts`
- Migrations: `20260912090000_sicoob_fulfillment`, `20260912180000_sicoob_finance_artwork`, `20260912190000_sicoob_consolidation_distribution`, `20260913120004_*_followup`, `20260922224600_mutate_sicoob_order_items_atomic`, `20260922225100_sicoob_canonical_fulfillment`, `20260927203000_sicoob_approval_delegations`, `20260927220000_sicoob_institutional_invitations`, `20260928182000_idempotent_quote_status_notifications`, `20260502174252_*` (order_comments)
- Testes e CI: `e2e/routes/_shared.ts`, `.lighthouserc.cjs`, `.github/workflows/*` (listagem)
- Tentativa de consulta ao banco vivo pelo MCP `SUPABASE_Brindes_Sicoob_-_V2`: falhou com 401 (sem evidência de produção).
