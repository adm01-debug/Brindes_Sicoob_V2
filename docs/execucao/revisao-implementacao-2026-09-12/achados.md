# Achados e condições de fechamento — 12/09/2026

> **Snapshot histórico:** os estados abaixo descrevem o candidato anterior. Consulte a [revalidação corretiva posterior](../revalidacao-corretiva-2026-09-12.md) para o estado atual, as correções locais, as simulações e os cinco grupos ainda pendentes.

As prioridades indicam risco para a liberação; nenhuma correção local equivale a produção. Títulos históricos são preservados no JSON para rastrear o escopo original.

## A01 · P0 · Logística canônica corrigida localmente, aguardando homologação real

**Estado:** Corrigido localmente no escopo original.

Rastreio e status usam RPC canônica com estado esperado; comprovante privado. Não há evidência de aplicação remota.

**Fechamento:** Aplicar e validar no schema alvo, incluindo falha, arquivo privado e usuário autorizado; aceite operacional.

**Subetapas diretamente associadas:** E028.08, E070.08, E074.04, E076.04.

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](../../../src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/services/sicoob/fulfillmentService.ts](../../../src/services/sicoob/fulfillmentService.ts), [supabase/migrations/20260912090000_sicoob_fulfillment.sql](../../../supabase/migrations/20260912090000_sicoob_fulfillment.sql), [tests/services/sicoobFulfillmentService.test.ts](../../../tests/services/sicoobFulfillmentService.test.ts).

## A02 · P0 · Notas no modelo legado; pagamentos e piloto provisórios no detalhe Sicoob

**Estado:** Parcial.

Logística reconciliada. Notas continuam no legado; useOrderPayments retorna [] e useOrderPilotApprovals retorna [] com mutate vazio. Os hooks provisórios são importados pelo detalhe Sicoob.

**Fechamento:** Persistir notas, pagamentos e piloto no domínio correto; remover hooks provisórios; ensaiar conciliação e autorização com dados segregados.

**Subetapas diretamente associadas:** E011.06, E070.01, E074.04, E078.02.

**Referências:** [src/components/sicoob/orders/OrderLogisticsTab.tsx](../../../src/components/sicoob/orders/OrderLogisticsTab.tsx), [src/hooks/orders/extensions/index.ts](../../../src/hooks/orders/extensions/index.ts), [src/hooks/orders/extensions/useOrderInvoices.ts](../../../src/hooks/orders/extensions/useOrderInvoices.ts), [src/pages/sicoob/orders/OrderDetailPage.tsx](../../../src/pages/sicoob/orders/OrderDetailPage.tsx), [src/services/OrderService.ts](../../../src/services/OrderService.ts), [src/services/sicoob/fulfillmentService.ts](../../../src/services/sicoob/fulfillmentService.ts), [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql](../../../supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql), [supabase/migrations/20260912090000_sicoob_fulfillment.sql](../../../supabase/migrations/20260912090000_sicoob_fulfillment.sql), [tests/services/sicoobFulfillmentService.test.ts](../../../tests/services/sicoobFulfillmentService.test.ts).

## A03 · P0 · Recompra reconsulta produto-base, mas criação e composição continuam incompletas

**Estado:** Parcial.

Serviço e rota foram corrigidos; preço e estoque-base são consultados. Cabeçalho e itens ainda são inserts separados; cleanup ignora erro. Variante, mínimo, múltiplo e mapeamento de PA não homologados.

**Fechamento:** RPC de criação idempotente, composição/SKU revalidada, rollback integral e ensaio da recompra até aprovação com dados reais segregados.

**Subetapas diretamente associadas:** E014.05, E079.01, E079.04, E079.10.

**Referências:** [src/components/orders/OneClickReorder.tsx](../../../src/components/orders/OneClickReorder.tsx), [src/routes/config/quotes.ts](../../../src/routes/config/quotes.ts), [src/services/sicoob/orderService.ts](../../../src/services/sicoob/orderService.ts).

## A04 · P0 · Autosave trata erro explícito, mas aceita atualização sem linha persistida

**Estado:** Parcial.

Erro explícito é tratado com retry. S08 reproduz lastSavedAt após resposta sem erro, mas com zero linhas atualizadas. Concorrência e recuperação de sessão não foram encerradas.

**Fechamento:** Exigir confirmação da linha persistida e tratar zero linhas; testar falha, troca de kit, duas gravações fora de ordem e sessão interrompida.

**Subetapas diretamente associadas:** E027.09, E028.08, E055.09, E057.10.

**Referências:** [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json), [scripts/revisao/pendencias-2026-09-12.cenarios.tsx](../../../scripts/revisao/pendencias-2026-09-12.cenarios.tsx), [scripts/revisao/vitest-pendencias-2026-09-12.config.ts](../../../scripts/revisao/vitest-pendencias-2026-09-12.config.ts), [src/components/kit-builder/KitSummary.tsx](../../../src/components/kit-builder/KitSummary.tsx), [src/hooks/useKitAutoSave.ts](../../../src/hooks/useKitAutoSave.ts), [src/hooks/useKitBuilder.ts](../../../src/hooks/useKitBuilder.ts), [src/hooks/useKitStockValidation.ts](../../../src/hooks/useKitStockValidation.ts), [tests/hooks/useKitAutoSave.test.tsx](../../../tests/hooks/useKitAutoSave.test.tsx), [tests/hooks/useKitStockValidation.test.tsx](../../../tests/hooks/useKitStockValidation.test.tsx).

## A05 · P0 · Estoque por variante corrigido; demanda repetida e servidor ainda incompletos

**Estado:** Parcial.

Variante selecionada e erro de consulta foram corrigidos. S07 reproduz demanda sintética repetida sem agregação; hook compara cada linha ao mesmo estoque. Ainda há validação comercial somente cliente.

**Fechamento:** Agregar demanda por SKU, validar relação variante/produto, estoque e restrições no servidor; ensaiar kits persistidos e substituição.

**Subetapas diretamente associadas:** E055.03, E055.07, E073.08, E085.02.

**Referências:** [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json), [scripts/revisao/pendencias-2026-09-12.cenarios.tsx](../../../scripts/revisao/pendencias-2026-09-12.cenarios.tsx), [scripts/revisao/vitest-pendencias-2026-09-12.config.ts](../../../scripts/revisao/vitest-pendencias-2026-09-12.config.ts), [src/components/kit-builder/KitSummary.tsx](../../../src/components/kit-builder/KitSummary.tsx), [src/hooks/useKitAutoSave.ts](../../../src/hooks/useKitAutoSave.ts), [src/hooks/useKitBuilder.ts](../../../src/hooks/useKitBuilder.ts), [src/hooks/useKitStockValidation.ts](../../../src/hooks/useKitStockValidation.ts), [tests/hooks/useKitAutoSave.test.tsx](../../../tests/hooks/useKitAutoSave.test.tsx), [tests/hooks/useKitStockValidation.test.tsx](../../../tests/hooks/useKitStockValidation.test.tsx).

## A06 · P1 · Métricas artificiais e erros convertidos em zero persistem em outros módulos

**Estado:** Parcial.

Previsões e contador saíram de pedidos. statsService ainda usa meta fixa, +0% e ignora erros; /gestor/agregados exibe dados fixos. Não há remoção global de métricas fictícias.

**Fechamento:** Substituir mocks ativos por fonte confirmada ou estado indisponível; separar erro de zero; conciliar indicadores e verificar telas por papel.

**Subetapas diretamente associadas:** E009.10, E026.07, E042.07, E089.08.

**Referências:** [src/components/sicoob/orders/LogisticsCommandCenter.tsx](../../../src/components/sicoob/orders/LogisticsCommandCenter.tsx), [src/pages/sicoob/GestorConsolidatedOrdersPage.tsx](../../../src/pages/sicoob/GestorConsolidatedOrdersPage.tsx), [src/pages/sicoob/orders/OrderDetailPage.tsx](../../../src/pages/sicoob/orders/OrderDetailPage.tsx), [src/pages/sicoob/orders/OrdersPage.tsx](../../../src/pages/sicoob/orders/OrdersPage.tsx), [src/services/sicoob/statsService.ts](../../../src/services/sicoob/statsService.ts).

## A07 · P0 · Versionamento transacional corrigido localmente, sem aceite de jornada completa

**Estado:** Corrigido localmente no escopo original.

Versionamento usa RPC transacional com família, concorrência e proteção de ciclos; ensaios SQL e regressão do serviço disponíveis. Não certifica edição direta de proposta/arte aceita.

**Fechamento:** Aplicar migrations no banco próprio e repetir concorrência/rollback via API; validar arte e condições da proposta completa.

**Subetapas diretamente associadas:** E059.01, E059.04, E059.10, E068.09.

**Referências:** [docs/execucao/evidencias/versionamento-orcamento-atomico.json](../../../docs/execucao/evidencias/versionamento-orcamento-atomico.json), [src/hooks/useQuoteVersions.ts](../../../src/hooks/useQuoteVersions.ts), [src/services/quotes/quoteVersionService.ts](../../../src/services/quotes/quoteVersionService.ts), [supabase/migrations/20260912100000_quote_versioning_atomic.sql](../../../supabase/migrations/20260912100000_quote_versioning_atomic.sql), [supabase/migrations/20260912130000_quote_versioning_family_roots.sql](../../../supabase/migrations/20260912130000_quote_versioning_family_roots.sql), [supabase/migrations/20260912150000_quote_versioning_cycle_lock.sql](../../../supabase/migrations/20260912150000_quote_versioning_cycle_lock.sql), [tests/services/quoteVersionService.test.ts](../../../tests/services/quoteVersionService.test.ts).

## A08 · P0 · Carregamento de organização ainda conserva contexto obsoleto em falha ou corrida

**Estado:** Parcial.

Troca explícita une papel e organização. fetchOrganizations mantém respostas antigas e estado no catch; lista sem organização ativa não zera currentRole. Corrida inferida do fluxo assíncrono, não reproduzida em API real.

**Fechamento:** Descartar respostas de sessão/contexto obsoleto, falhar sem preservar papel antigo e testar revogação/logout/duas respostas fora de ordem.

**Subetapas diretamente associadas:** E012.05, E025.05, E025.08, E025.10.

**Referências:** [src/contexts/AuthContext.tsx](../../../src/contexts/AuthContext.tsx), [src/contexts/OrganizationContext.tsx](../../../src/contexts/OrganizationContext.tsx).

## A09 · P1 · Histórico da busca principal segmentado e testado localmente

**Estado:** Corrigido localmente no escopo original.

Busca principal usa usuário/cooperativa/PA e tem teste de isolamento. O achado não certifica outros stores: vistos recentemente são tratados em A20.

**Fechamento:** Confirmar busca após troca/logout com duas contas reais e validar retenção de históricos por contexto.

**Subetapas diretamente associadas:** E023.04, E025.05, E044.09, E050.04.

**Referências:** [src/components/catalog/CatalogHeader.tsx](../../../src/components/catalog/CatalogHeader.tsx), [src/hooks/catalog/useCatalogSearchState.ts](../../../src/hooks/catalog/useCatalogSearchState.ts), [src/hooks/useSearch.ts](../../../src/hooks/useSearch.ts), [tests/hooks/useSearch.test.ts](../../../tests/hooks/useSearch.test.ts).

## A10 · P0 · Redação comercial recursiva corrigida no contrato local

**Estado:** Corrigido localmente no escopo original.

Redação recursiva cobre setup_cost, unit_cost, margem e fornecedor; regressão dirigida aprovada.

**Fechamento:** Confirmar respostas de cada operação do bridge e ACL mínima da identidade remota sem escrita na origem.

**Subetapas diretamente associadas:** E003.07, E048.01, E086.06.

**Referências:** [supabase/functions/_shared/catalog-redaction.ts](../../../supabase/functions/_shared/catalog-redaction.ts), [supabase/functions/external-db-bridge/index.ts](../../../supabase/functions/external-db-bridge/index.ts), [tests/functions/catalog-redaction.test.ts](../../../tests/functions/catalog-redaction.test.ts).

## A11 · P2 · Exportação de campanhas corrigida e testada localmente

**Estado:** Corrigido localmente no escopo original.

Colisão de nome corrigida; CSV escapa delimitadores/aspas/quebras e possui teste. Não certifica campanha institucional com destinos.

**Fechamento:** Validar download/exportação na jornada autenticada e arquivo aberto com dados permitidos.

**Subetapas diretamente associadas:** E051.01, E090.02, E090.04.

**Referências:** [src/pages/admin/AdminCampanhasPage.tsx](../../../src/pages/admin/AdminCampanhasPage.tsx), [src/utils/campaignExport.ts](../../../src/utils/campaignExport.ts), [tests/utils/campaignExport.test.ts](../../../tests/utils/campaignExport.test.ts).

## A12 · P1 · Eventos de status e notificações in-app tornaram-se transacionais

**Estado:** Corrigido localmente no escopo original.

Transições canônicas gravam histórico e notificações in-app na mesma transação. Repetição, destinatários e falha com rollback foram simulados.

**Fechamento:** Verificar aplicação real, destinatários autorizados e histórico no schema completo; formalizar canais externos se exigidos.

**Subetapas diretamente associadas:** E029.09, E068.02, E068.09, E070.09.

**Referências:** [docs/execucao/evidencias/eventos-status-sicoob.json](../../../docs/execucao/evidencias/eventos-status-sicoob.json), [src/services/sicoob/orderService.ts](../../../src/services/sicoob/orderService.ts), [supabase/migrations/20260912110000_sicoob_order_status_events.sql](../../../supabase/migrations/20260912110000_sicoob_order_status_events.sql), [tests/services/sicoobOrderService.test.ts](../../../tests/services/sicoobOrderService.test.ts).

## A13 · P1 · CodeQL atual possui 13 resultados sem triagem conclusiva

**Estado:** Aberto.

SARIF atual tem 13 resultados; 26 era o snapshot anterior. Workflow com upload:never preserva artefato e não aplica gate de severidade. Contagem menor não prova correções individuais.

**Fechamento:** Triar cada resultado por caminho alcançável, impacto e teste; corrigir ou justificar falsos positivos; definir gate e retenção das evidências.

**Subetapas diretamente associadas:** E013.06, E019.02, E020.04, E086.09.

**Referências:** [.github/workflows/codeql.yml](../../../.github/workflows/codeql.yml), [.github/workflows/e2e.yml](../../../.github/workflows/e2e.yml), [docs/execucao/revisao-implementacao-2026-09-12/ci.json](../../../docs/execucao/revisao-implementacao-2026-09-12/ci.json), [docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json](../../../docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json), [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json), [e2e/flows/26-complete-flow.spec.ts](../../../e2e/flows/26-complete-flow.spec.ts), [e2e/routes/_factories.ts](../../../e2e/routes/_factories.ts), [playwright.config.ts](../../../playwright.config.ts).

## A14 · P0 · CI passou com lacunas de cobertura e instabilidade

**Estado:** Parcial.

Falhas originais de qualidade/E2E foram corrigidas. CI atual passou, mas smoke ignora 33, projetos autenticados são excluídos sem credenciais e oito casos exigiram retry. Jornada real não homologada.

**Fechamento:** Gate de release deve exigir credenciais de homologação, cenários autenticados e conteúdo persistido; resolver flakiness e registrar escopo executado.

**Subetapas diretamente associadas:** E019.05, E090.05, E095.02.

**Referências:** [.github/workflows/codeql.yml](../../../.github/workflows/codeql.yml), [.github/workflows/e2e.yml](../../../.github/workflows/e2e.yml), [docs/execucao/revisao-implementacao-2026-09-12/ci.json](../../../docs/execucao/revisao-implementacao-2026-09-12/ci.json), [docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json](../../../docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json), [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json), [e2e/flows/26-complete-flow.spec.ts](../../../e2e/flows/26-complete-flow.spec.ts), [e2e/routes/_factories.ts](../../../e2e/routes/_factories.ts), [playwright.config.ts](../../../playwright.config.ts).

## A15 · P0 · Aprovação financeira ainda não verifica toda a política institucional

**Estado:** Parcial.

Há alçada, profile ativo e autoaprovação no servidor; falta vínculo atual em organization_members, arte/delegação e aceite institucional. S01–S04 refutam snapshot imutável.

**Fechamento:** Resolver A17, verificar vínculo/competência corrente, aplicar política aceita por cooperativa e repetir matriz positiva/negativa real.

**Subetapas diretamente associadas:** E018.04, E018.05, E018.06, E064.07, E065.07.

**Referências:** [docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json](../../../docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json), [scripts/revisao/simular-pendencias-2026-09-12.py](../../../scripts/revisao/simular-pendencias-2026-09-12.py), [supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql](../../../supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql), [supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql](../../../supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql).

## A16 · P1 · Consolidação não implementa distribuição e recebimento por destino

**Estado:** Aberto.

RPC apenas cria grupo; não vincula pedidos. Página ativa usa dois lotes fixos e botões sem ação. Remessa canônica é única por pedido e não reconcilia itens por destino.

**Fechamento:** Implementar divisão por destino/item, recebimentos parciais, divergências e reconciliação; percorrer três destinos e operador real.

**Subetapas diretamente associadas:** E056.02, E056.03, E074.03, E076.03, E078.05.

**Referências:** [src/pages/sicoob/GestorConsolidatedOrdersPage.tsx](../../../src/pages/sicoob/GestorConsolidatedOrdersPage.tsx), [supabase/migrations/20260503000002_sicoob_consolidation_logic.sql](../../../supabase/migrations/20260503000002_sicoob_consolidation_logic.sql), [supabase/migrations/20260912090000_sicoob_fulfillment.sql](../../../supabase/migrations/20260912090000_sicoob_fulfillment.sql).

## A17 · P0 · Política vinculada não é imutável e fallback pode trocar a regra aplicada

**Estado:** Aberto.

S01–S04: base técnica muda ao publicar política; edição administrativa muda conteúdo/impedimento de referência já usada; global mais recente vence específica; referência do pedido continua editável.

**Fechamento:** Congelar conteúdo e referência, definir precedência específica/global, impedir mudança retroativa e repetir S01–S04 com esquema/RLS completo.

**Subetapas diretamente associadas:** E008.08, E008.09, E018.05, E059.04, E061.02, E064.07, E066.03, E066.05, E068.03, E099.04.

**Referências:** [supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql](../../../supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql), [supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql](../../../supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql), [docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json](../../../docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json), [scripts/revisao/simular-pendencias-2026-09-12.py](../../../scripts/revisao/simular-pendencias-2026-09-12.py).

## A18 · P1 · Trigger de itens não cobre pós-aprovação nem ambos os lados da transferência

**Estado:** Aberto.

S05 altera itens de pedido confirmado para 200 mantendo total aprovado 100. S06 transfere item de pedido em análise para draft. Escritas como postgres demonstram lacuna de invariante; não demonstram permissão de UPDATE ao comprador via RLS.

**Fechamento:** Preservar composição após aceite, comparar OLD/NEW.order_id e exigir revisão formal com total consistente; repetir como ator autenticado e escritor privilegiado.

**Subetapas diretamente associadas:** E059.04, E059.06, E059.10, E064.07, E069.04, E085.06, E086.09.

**Referências:** [supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql](../../../supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql), [supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql](../../../supabase/migrations/20260912140000_sicoob_approval_confirmation_followup.sql), [docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json](../../../docs/execucao/revisao-implementacao-2026-09-12/simulacoes.json), [scripts/revisao/simular-pendencias-2026-09-12.py](../../../scripts/revisao/simular-pendencias-2026-09-12.py).

## A19 · P1 · Asserções E2E genéricas podem aprovar uma tela sem o conteúdo esperado

**Estado:** Aberto.

Happy público e autenticado padrão aceitam qualquer heading; timeout aceita body. Fluxo 26 percorre catálogo→URL de novo orçamento sem salvar item ou decidir pedido. Além da exclusão autenticada, falta poder de detecção.

**Fechamento:** Exigir identidade e conteúdo do fixture, ação e resultado persistido, verificar mock atingido e estados específicos; uma resposta inválida deve fazer o happy falhar.

**Subetapas diretamente associadas:** E013.05, E019.07, E050.08, E059.07, E086.04, E090.05, E095.02.

**Referências:** [docs/execucao/revisao-implementacao-2026-09-12/ci.json](../../../docs/execucao/revisao-implementacao-2026-09-12/ci.json), [docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json](../../../docs/execucao/revisao-implementacao-2026-09-12/resumo-codeql.json), [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json), [.github/workflows/e2e.yml](../../../.github/workflows/e2e.yml), [.github/workflows/codeql.yml](../../../.github/workflows/codeql.yml), [playwright.config.ts](../../../playwright.config.ts), [e2e/routes/_factories.ts](../../../e2e/routes/_factories.ts), [e2e/flows/26-complete-flow.spec.ts](../../../e2e/flows/26-complete-flow.spec.ts).

## A20 · P1 · Vistos recentemente sobrevivem em memória à limpeza da chave no logout

**Estado:** Aberto.

S09 executa o store real e a remoção de chave utilizada pelo logout: lista continua em memória. Chave e store não contêm usuário/cooperativa; a troca de organização não possui isolamento próprio.

**Fechamento:** Segmentar por identidade/contexto, limpar store e timers, testar troca de organização e A→logout→B sem recarregar a SPA.

**Subetapas diretamente associadas:** E015.08, E025.05, E025.08, E044.09, E087.08.

**Referências:** [src/stores/useRecentlyViewedStore.ts](../../../src/stores/useRecentlyViewedStore.ts), [src/contexts/AuthContext.tsx](../../../src/contexts/AuthContext.tsx), [scripts/revisao/pendencias-2026-09-12.cenarios.tsx](../../../scripts/revisao/pendencias-2026-09-12.cenarios.tsx), [docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json](../../../docs/execucao/revisao-implementacao-2026-09-12/testes-dirigidos.json).
