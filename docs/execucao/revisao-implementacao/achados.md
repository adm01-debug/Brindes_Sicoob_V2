# Achados priorizados da revisão

Código auditado: `6f1c5f94f612c13071b8dbe61b500b915e50b123`. Todos os achados estão abertos. P0 impede liberar o fluxo afetado no piloto; não afirma incidente em produção. Reprodução local ou conferência em ambiente segregado, conforme indicado.

## A01 — Logística omite o estado anterior e anuncia conclusão antes de confirmar o pedido

**P0 · reproduzido localmente · Aberto**

As duas ações chamam updateStatus.mutate sem currentStatus. O serviço exige esse valor e rejeita antes da rede. No upload, o toast positivo não aguarda a mutation. A atualização de logística pode ocorrer antes da falha de status.

**Referências:**

- [src/components/sicoob/orders/OrderLogisticsTab.tsx:38](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx#L38)
- [src/components/sicoob/orders/OrderLogisticsTab.tsx:78](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx#L78)
- [src/services/sicoob/orderService.ts:119](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts#L119)
- [src/hooks/sicoob/useSicoobOrder.ts:38](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useSicoobOrder.ts#L38)

**Plano:** E028.08, E070.08, E074.04, E076.04

**Reprodução / conferência:** Em ambiente segregado, abrir pedido elegível e confirmar rastreio ou foto. A simulação A01 reproduz a rejeição do serviço sem acessar bancos.

**Condição de fechamento:** Tornar currentStatus obrigatório no contrato tipado, transmitir estado lido, aguardar confirmação e impedir sucesso parcial silencioso. Testar rastreio, foto, erro e concorrência após reconciliar o modelo A02.

## A02 — Extensões financeiras e logísticas usam pedidos de outro modelo

**P0 · contradicao estatica · Aberto**

A tela carrega sicoob_orders, mas transmite seu ID aos hooks legados. Migrations de order_logistics/order_invoices/order_payments referenciam public.orders. Não foi localizado adaptador de reconciliação nessa passagem. O schema realmente implantado permanece desconhecido.

**Referências:**

- [src/pages/sicoob/orders/OrderDetailPage.tsx:150](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx#L150)
- [src/pages/sicoob/orders/OrderDetailPage.tsx:658](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx#L658)
- [src/services/OrderService.ts:87](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts#L87)
- [supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql:13](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502175334_93cdfc03-97b2-4de9-9e60-5152452316b5.sql#L13)
- [supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql:100](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260502174252_a88e3c13-46b8-4ce4-b1b8-c8500d390f3d.sql#L100)

**Plano:** E011.06, E070.01, E074.04, E078.02

**Reprodução / conferência:** Criar somente um sicoob_order num banco segregado com o schema reconciliado e tentar incluir logística/nota/pagamento. Verificar relação e FK; não executar escrita no banco mestre de catálogo.

**Condição de fechamento:** Definir um agregado canônico e reconciliar FKs, serviços, RLS e dados antes de remendar telas isoladas. Homologar cada extensão com pedidos Sicoob de duas cooperativas.

## A03 — Recompra usa serviço legado e navega para rota inexistente

**P0 · reproduzido localmente · Aberto**

O botão chama useOrders/OrderService legado e navega para /pedidos/:id/editar, ausente do mapa de rotas. Há também métodos de recompra Sicoob, mas esse botão não os utiliza. As duplicações copiadas não reconfirmam preço/estoque.

**Referências:**

- [src/components/orders/OneClickReorder.tsx:27](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/orders/OneClickReorder.tsx#L27)
- [src/routes/config/sicoob.ts:8](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/routes/config/sicoob.ts#L8)
- [src/services/OrderService.ts:355](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/OrderService.ts#L355)
- [src/services/sicoob/orderService.ts:240](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts#L240)

**Plano:** E014.05, E079.01, E079.04, E079.10

**Reprodução / conferência:** A simulação A03 aciona o handler real com serviço substituído e captura /pedidos/novo-pedido/editar; inspeção do mapa não encontra esse prefixo.

**Condição de fechamento:** Usar serviço canônico, criar rascunho transacional, reconfirmar variante/preço/estoque e encaminhar para rota existente. Testar produto inativo, preço alterado e endereço novo.

## A04 — Autosave de kit indica salvamento mesmo quando o banco retorna erro

**P0 · reproduzido localmente · Aberto**

Respostas error do Supabase não são inspecionadas no update/insert. lastSavedAt é atualizado mesmo com data=null/error. O snapshot avança antes da confirmação, prejudicando nova tentativa sem alteração.

**Referências:**

- [src/hooks/useKitAutoSave.ts:60](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts#L60)
- [src/hooks/useKitAutoSave.ts:82](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts#L82)
- [src/hooks/useKitAutoSave.ts:115](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitAutoSave.ts#L115)

**Plano:** E027.09, E028.08, E055.09, E057.10

**Reprodução / conferência:** A simulação A04 devolve erro controlado no update e constata que lastSavedAt recebe uma data.

**Condição de fechamento:** Inspecionar error, separar salvando/salvo/falhou, atualizar snapshot apenas após confirmação e oferecer recuperação. Testar update, insert, desconexão, navegação e repetição sem duplicar kit.

## A05 — Validação de kit soma cores diferentes e oculta erro de consulta

**P0 · reproduzido localmente · Aberto**

O hook agrupa estoque por product_id, ignorando a variante escolhida; também não retorna error/isError. A consulta tem limit=500 sem evidência de paginação completa. Disponibilidade não está garantida pela ausência de alertas.

**Referências:**

- [src/hooks/useKitStockValidation.ts:33](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitStockValidation.ts#L33)
- [src/hooks/useKitStockValidation.ts:62](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useKitStockValidation.ts#L62)

**Plano:** E055.03, E055.07, E073.08, E085.02

**Reprodução / conferência:** A05: verde=0, azul=100 e pedido de 50 verdes retorna hasStockIssues=false. A05b: consulta com erro e data undefined também retorna false, sem estado de erro.

**Condição de fechamento:** Validar por identificador estável de variante, agregar demanda repetida, tratar paginação e falha explicitamente. Reconfirmar no serviço do portal sem escrever no catálogo externo.

## A06 — Telas reais exibem previsões e presença sem fonte operacional

**P1 · confirmado por leitura · Aberto**

Há probabilidades fixas de 94/87/82%, alegação de 12 PAs, previsão de receita por multiplicador 1,4 + 25.000, meta fixa de 500.000 e contador de gestores baseado em Math.random. Consultas de estatísticas ignoram error e podem mostrar zero em indisponibilidade.

**Referências:**

- [src/hooks/sicoob/useAIOrderPredictor.ts:23](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/sicoob/useAIOrderPredictor.ts#L23)
- [src/pages/sicoob/orders/OrdersPage.tsx:400](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx#L400)
- [src/pages/sicoob/orders/OrdersPage.tsx:415](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrdersPage.tsx#L415)
- [src/pages/sicoob/orders/OrderDetailPage.tsx:119](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx#L119)
- [src/pages/sicoob/orders/OrderDetailPage.tsx:366](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/sicoob/orders/OrderDetailPage.tsx#L366)
- [src/services/sicoob/statsService.ts:115](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/statsService.ts#L115)

**Plano:** E009.10, E026.07, E042.07, E089.08

**Reprodução / conferência:** Seguir a importação AIOrderPredictor na rota real /sicoob/pedidos e o intervalo do detalhe. Nenhum desses cálculos comprova probabilidade, presença ou meta da cooperativa.

**Condição de fechamento:** Remover projeções/presença sem fonte; dados reais devem informar escopo, período, atualização e base. Distinguir indisponível de zero e conciliar indicadores com pedidos.

## A07 — Versionamento de orçamento não é uma operação atômica

**P0 · risco por fluxo estatico · Aberto**

O cliente consulta máximo+1, desmarca as versões anteriores, cria outra quote e só depois grava version/is_latest_version. Chamadas intermediárias não inspecionam todos os erros. Duas sessões ou falha intermediária podem deixar numeração/versão vigente incoerentes; constraints reais não foram consultadas.

**Referências:**

- [src/hooks/useQuoteVersions.ts:119](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts#L119)
- [src/hooks/useQuoteVersions.ts:137](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts#L137)
- [src/hooks/useQuoteVersions.ts:213](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useQuoteVersions.ts#L213)

**Plano:** E059.01, E059.04, E059.10, E068.09

**Reprodução / conferência:** Simular duas sessões criando revisão e falhar após desmarcar a versão atual num ambiente segregado. Achado por inspeção; concorrência dessa rotina ainda não executada nesta revisão.

**Condição de fechamento:** Mover numeração, snapshot, substituição e auditoria para uma transação com controle de versão. Não alterar aprovação histórica; invalidar decisões conforme regra explícita.

## A08 — Troca de organização pode manter papel do contexto anterior

**P0 · risco por fluxo estatico · Aberto**

currentOrg muda antes da consulta assíncrona do papel. Erro ou resposta fora de ordem não limpa/invalida o papel anterior. Não há proteção de rascunho nem reconciliação integral de cache nesse fluxo. Isso comprova incoerência possível de interface, não bypass de RLS em produção.

**Referências:**

- [src/contexts/OrganizationContext.tsx:117](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx#L117)
- [src/contexts/OrganizationContext.tsx:131](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/OrganizationContext.tsx#L131)

**Plano:** E012.05, E025.05, E025.08, E025.10

**Reprodução / conferência:** Em teste controlado, atrasar a resposta de um vínculo, trocar novamente e fazer a primeira resposta chegar por último; também simular erro ao consultar o novo papel.

**Condição de fechamento:** Publicar contexto e competência como um estado consistente, negar ações durante troca, descartar respostas antigas e isolar cache por usuário/organização/PA. Testar revogação e duas trocas rápidas.

## A09 — Histórico de busca fica compartilhado entre sessões no mesmo navegador

**P1 · confirmado por leitura · Aberto**

search-history é uma chave global e não está na limpeza de logout. A UI nova expõe o histórico legado. Favoritos também usam chave de consulta sem usuário; seu alcance exige teste separado, pois existem filtros de usuário no servidor.

**Referências:**

- [src/hooks/useSearch.ts:8](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts#L8)
- [src/hooks/useSearch.ts:34](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useSearch.ts#L34)
- [src/contexts/AuthContext.tsx:167](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/contexts/AuthContext.tsx#L167)
- [src/hooks/useFavoriteLists.ts:55](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/hooks/useFavoriteLists.ts#L55)

**Plano:** E023.04, E025.05, E044.09, E050.04

**Reprodução / conferência:** Buscar um termo na conta A, sair e entrar como B no mesmo navegador; verificar sugestões/histórico. Não é necessário usar dados pessoais no cenário.

**Condição de fechamento:** Isolar histórico por contexto e limpar estado em memória/persistido na troca; revisar favoritos, comparações e vistos recentemente com testes entre contas.

## A10 — Lista de redação comercial não cobre custos de personalização

**P0 · reproduzido localmente · Aberto**

A lista remove seis nomes de campos, mas preserva setup_cost e unit_cost. O alias de técnicas constrói setup_cost; a allowlist também contém variant_cost_tiers e tabelas comerciais internas. Não foi verificada exposição na implantação remota.

**Referências:**

- [supabase/functions/_shared/catalog-redaction.ts:2](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/catalog-redaction.ts#L2)
- [supabase/functions/_shared/external-db-aliases.ts:156](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-aliases.ts#L156)
- [supabase/functions/_shared/external-db-config.ts:48](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/_shared/external-db-config.ts#L48)
- [supabase/functions/external-db-bridge/index.ts:923](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/functions/external-db-bridge/index.ts#L923)

**Plano:** E003.07, E048.01, E086.06

**Reprodução / conferência:** A10 aplica a função real a objeto sintético e confirma a preservação de setup_cost/unit_cost aninhados.

**Condição de fechamento:** Definir DTO positivo de campos comerciais permitidos e revisar tabelas, aliases, relações e RPCs por papel. Testar respostas reais sanitizadas sem exportar segredos ou custos restritos.

## A11 — Página legada de campanhas possui exportação com colisão de nome

**P2 · corrigido localmente; pendente de validação na interface**

O parâmetro format ('xlsx' ou 'csv') sombreia format do date-fns e é chamado como função. Com datas, a falha ocorre antes do try. A página não foi localizada no registro atual de rotas; não se afirma defeito exposto ao comprador.

**Referências:**

- [src/pages/admin/AdminCampanhasPage.tsx:131](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/AdminCampanhasPage.tsx#L131)
- [src/pages/admin/AdminCampanhasPage.tsx:136](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/pages/admin/AdminCampanhasPage.tsx#L136)

**Plano:** E051.01, E090.02, E090.04

**Reprodução / conferência:** Ao reaproveitar o componente em teste isolado, exportar campanha com data; verificar TypeError por tentativa de chamar string.

**Correção local (12/09/2026):** `handleExport` passou a usar
`exportFormat`, preservando a função `format` do `date-fns` para datas e nomes
de arquivo. O CSV foi extraído para um utilitário com BOM UTF-8 e escape de
aspas, vírgulas e quebras de linha; os casos especiais têm teste unitário.

**Condição de fechamento:** Validar os botões XLSX e CSV no navegador com uma
campanha real em homologação, incluindo datas e os caracteres especiais.

## A12 — Auditoria e notificação de outros status podem falhar sem bloquear a alteração

**P1 · corrigido localmente; pendente de aplicação e validação remota**

Fora das RPCs críticas, update do pedido e insert de auditoria são operações separadas. Supabase retorna error sem necessariamente lançar exceção; catch não basta. Email usa endereço do ator e não uma matriz de destinatários por evento.

**Referências:**

- [src/services/sicoob/orderService.ts:147](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts#L147)
- [src/services/sicoob/orderService.ts:170](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/orderService.ts#L170)

**Plano:** E029.09, E068.02, E068.09, E070.09

**Reprodução / conferência:** Simular sucesso de update e erro de insert/invoke; conferir status sem trilha/notificação. Essa sequência foi inspecionada, não executada remotamente.

**Correção local (12/09/2026):** a migração
`20260912110000_sicoob_order_status_events.sql` substitui os efeitos no
cliente por gatilho transacional no histórico canônico e em
`workspace_notifications`, que é a fonte da interface in-app. Transições
comuns e solicitações de alçada passaram a usar RPCs com comparação do estado.
O cenário descartável exercitou destinatários, repetição, concorrência e
rollback quando a notificação falha. O envio de e-mail do navegador foi
removido porque não havia trabalhador de entrega nem confirmação de resultado.

**Condição de fechamento:** Aplicar a migração no Supabase Sicoob, regenerar
tipos e validar RLS/destinatários com perfis reais de PA, cooperativa e Central.

## A13 — Análise CodeQL possui 26 alertas sem triagem conclusiva

**P1 · evidencia ci · Aberto**

O job concluiu a análise e disponibilizou SARIF com 26 resultados de 12 regras. Inclui runtime, scripts e testes; alertas não equivalem a 26 vulnerabilidades exploráveis. Code scanning remoto não está habilitado neste repositório e upload foi desativado.

**Referências:**

- [.github/workflows/codeql.yml:1](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/codeql.yml#L1)

**Plano:** E013.06, E019.02, E020.04, E086.09

**Reprodução / conferência:** Conferir resumo-codeql.json e o artefato codeql-javascript-typescript do run 34643989511.

**Condição de fechamento:** Triar regra, alcance, autorização, falso positivo e responsabilidade. Registrar correção ou justificativa por resultado; manter análise com falha explícita conforme política de severidade acordada.

## A14 — Qualidade e regressão E2E falharam no candidato auditado

**P0 · evidencia ci · Aberto**

Quality Gate falha em max-lines-per-function durante ESLint; causa raiz não confirmada. E2E registra falhas em rotas públicas e termina cancelado no limite de 30 minutos. Smoke aprovado contém somente cinco cenários públicos mais fixture; 33 foram ignorados.

**Referências:**

- [scripts/check-eslint-baseline.mjs:1](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/scripts/check-eslint-baseline.mjs#L1)
- [.github/workflows/e2e.yml:1](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/.github/workflows/e2e.yml#L1)

**Plano:** E019.05, E090.05, E095.02

**Reprodução / conferência:** Consultar runs 34643989419 e 34643989627 no commit 6f1c5f9; inspecionar etapas e artefatos, sem considerar skips como aprovação.

**Condição de fechamento:** Reproduzir lint nas mesmas condições da CI, corrigir regressões/fixtures com diagnóstico e executar jornada autenticada com contas de homologação. Não liberar apenas por aumentar timeout ou afrouxar gates.

## A15 — Aprovação financeira ainda não verifica toda a política institucional

**P0 · confirmado por leitura · Aberto**

RPCs locais já validam identidade, relação, estado, saldo e repetição. Ainda faltam vínculo ativo explícito, impedimento de autoaprovação conforme política, versão imutável da proposta/arte e competência específica de marca. Política vigente de cada cooperativa não foi confirmada.

**Referências:**

- [supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql:147](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260911143000_sicoob_order_budget_atomicity.sql#L147)
- [src/services/sicoob/approvalService.ts:26](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/services/sicoob/approvalService.ts#L26)

**Plano:** E018.04, E018.05, E018.06, E064.07, E065.07

**Reprodução / conferência:** Inspecionar sicoob_actor_can_approve e pré-condições das RPCs. Ensaiar revogação de vínculo, proposta substituída e proibição local de autoaprovar após confirmar a política.

**Condição de fechamento:** Preservar a correção transacional existente e acrescentar precondições versionadas no servidor, com casos positivos e negativos por cooperativa.

## A16 — Consolidação não implementa distribuição e recebimento por destino

**P1 · confirmado por leitura · Aberto**

A consolidação registra agrupamento e contém atualização de orders como comentário de trabalho futuro. Isso não implementa alocação de quantidade por destino, remessa parcial, conferência e conciliação financeira. A UI logística opera no pedido inteiro.

**Referências:**

- [supabase/migrations/20260503000002_sicoob_consolidation_logic.sql:1](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/supabase/migrations/20260503000002_sicoob_consolidation_logic.sql#L1)
- [src/components/sicoob/orders/OrderLogisticsTab.tsx:16](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/6f1c5f94f612c13071b8dbe61b500b915e50b123/src/components/sicoob/orders/OrderLogisticsTab.tsx#L16)

**Plano:** E056.02, E056.03, E074.03, E076.03, E078.05

**Reprodução / conferência:** Revisar a rotina de consolidação e percorrer o modelo disponível procurando vínculo item-destino-remessa-recebimento; o ensaio de três destinos não foi demonstrado.

**Condição de fechamento:** Após A02, modelar alocação e saldos por item/destino, reconciliação de frete/recebimento e eventos idempotentes. Homologar três PAs e entrega parcial antes do piloto.
