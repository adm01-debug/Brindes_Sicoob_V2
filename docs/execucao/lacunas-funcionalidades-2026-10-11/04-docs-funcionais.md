# Fatia 04 — Documentação descritiva/arquitetura × código (prefixo DOC)

Repositório: `/home/user/Brindes_Sicoob_V2` · HEAD `dc08200` (main, 08/10/2026) · análise em 11/10/2026.
Método: leitura integral dos documentos da fatia + verificação no código (rotas em `src/App.tsx` e `src/routes/config/*.ts`, imports reais, chamadas `functions.invoke`, migrations, `src/integrations/supabase/types.ts`, workflows). Somente leitura; nenhum arquivo do repo foi alterado.

Limitações de verificação:
- Estado remoto do banco (`cron.job`, configurações do Supabase Auth, secrets) **não pôde ser consultado**: o MCP `SUPABASE_Brindes_Sicoob_-_V2` respondeu `Management API 401: Invalid access token`. Itens que dependem disso estão marcados como BLOQUEADA_EXTERNA ou com a ressalva "agendamento remoto não verificável".
- GitHub: `gh api repos/adm01-debug/Brindes_Sicoob_V2/rulesets` respondeu `[]` (11/10/2026); `branches/main/protection` e `actions/secrets` responderam 403 pelo proxy.

---

## Resumo

### Contagem por status (64 itens)

| Status | Qtde | IDs |
|---|---|---|
| ORFA | 13 | DOC-01, 03, 04, 11, 16, 17, 18, 19, 21, 24, 29, 50, 51 |
| STUB/MOCK | 11 | DOC-02, 08, 12, 13, 20, 27, 28, 30, 34, 37, 52 |
| PARCIAL | 7 | DOC-05, 09, 23, 25, 44, 58, 59 |
| NAO_INICIADA | 7 | DOC-14, 15, 33, 35, 40, 45, 57 |
| BLOQUEADA_EXTERNA | 10 | DOC-06, 32, 36, 38, 39, 41, 42, 47, 48, 56 |
| DOC_DIVERGENTE | 16 | DOC-07, 10, 22, 26, 31, 43, 46, 49, 53, 54, 55, 60, 61, 62, 63, 64 |

**Conferidos como concluídos (não listados como itens): ~55 verificações**, entre elas: Flow com SSE (`expert-chat/index.ts:1278`), voz, TTS, histórico com busca e filtro por data (`ChatHistoryPanel.tsx:28-34`) e filtros integrados; catálogo com 3 layouts e grade virtualizada (`FiltersPage.tsx:374-438`, `CatalogContent.tsx:250-251`); filtros na URL (gênero, tamanhos, cores — `filters-page-helpers.ts:111-119`); simulador em 4 etapas com rascunho em `simulator_wizard_drafts`; versionamento e comentários na página de detalhe; página pública de aprovação com assinatura (`QuoteApprovalPage` + `QuoteSignaturePad`); kits (link público `/kit/:token`, biblioteca, templates, kits semelhantes, detector de duplicatas, colaboração, realtime, atalho G K); coleções e favoritos (lixeira, reações públicas, export, heatmap, atalhos); agente de voz ElevenLabs; MFA TOTP real (`use2FA.ts`) e MFA obrigatório no `AdminRoute`; HIBP no cliente em redefinição/criação de usuário; Security Center completo; Connections Hub (playground, janela de falha, cron de auto-teste); circuit breaker (ADR 0005); `DevRoute`/`restricted-routes` (ADR 0006); fluxo de redefinição com aprovação (ADR 0004); `tests/rls/`; seller-scope checker no CI; gate strict-ref; Magic Up Onda 5 (componentes + 4 testes); 19 skins; service worker + `offline.html`; gates de log estruturado/request-id; Gitleaks/Dependabot/CodeQL; imutabilidade de migrations no CI; Husky e template de PR; pedidos Sicoob com dados reais (nota "mock" do `api_dependency_map.json` superada); workflow de pedido com `em_producao/em_separacao/em_transporte`; piloto, rastreio e comprovante de entrega; `migrate-helper` neutralizado (410) com gate de CI.

### Os 10 achados mais graves

1. **DOC-01 (P0, ORFA)** — PDF da proposta, link público de aprovação, histórico de versões, sincronização com Bitrix e modo apresentação só existem em `/orcamentos/:id/visualizar`, rota que nenhuma tela abre. A lista ainda orienta o vendedor a "gerar e assinar o PDF no detalhe", e o detalhe não tem PDF.
2. **DOC-02 (P1, STUB)** — "Copiar link" e "Enviar por WhatsApp" na lista mandam ao cliente a URL interna autenticada `/orcamentos/:id`, não o link público de aprovação.
3. **DOC-27 (P1, STUB)** — `send-notification`: e-mail, SMS, WhatsApp e push não existem. Ela grava log falso "push success". Com "Não perturbe" ou resumo ativo, a notificação vai para filas que ninguém processa e se perde. Nenhum código chama a função.
4. **DOC-29 (P1, ORFA)** — 12 rotinas declaradas como "pg_cron" sem agendamento versionado: vigias de preço, lembrete de orçamento, resumo, relatórios, saúde de conexões, auditoria de propriedade, monitor de erros e relatório mensal.
5. **DOC-28 (P1, STUB)** — o e-mail transacional (mudança de status de pedido) responde 501 "ainda não implementado", e o `OrderService` engole o erro.
6. **DOC-24 (P1, ORFA)** — o aviso "preço estimado, cálculo oficial indisponível" do simulador (`SimulationPriceSourceBadge`) não aparece em nenhuma tela. Só há um toast por sessão, então o vendedor pode fechar orçamento com preço heurístico.
7. **DOC-05 (P1, PARCIAL)** — a restrição por IP/geolocalização roda no navegador depois do login e libera o acesso quando a validação falha (fail-open).
8. **DOC-06 (P1, BLOQUEADA_EXTERNA)** — a plataforma fechada (cadastro público desativado, HIBP no servidor, verificação de e-mail) não tem configuração versionada nem prova. O `AuthContext` expõe `supabase.auth.signUp`.
9. **DOC-42 (P1, BLOQUEADA_EXTERNA)** — o incidente `migrate-helper` (service role exposta) ainda tem passos pendentes: rotação de chaves e revisão de logs sem evidência; o checklist do runbook de rotação está vazio.
10. **DOC-38 (P1, BLOQUEADA_EXTERNA)** — a `main` continua sem ruleset (`gh api .../rulesets` → `[]` em 11/10/2026), apesar do CONTRIBUTING dizer "sem exceção".

---

## Itens

### Tema A — README.md (raiz) e visão geral

### DOC-01  PDF, link público de aprovação e versões do orçamento sem caminho na interface
- Status: ORFA
- Origem: `README.md:200-202` ("Versionamento… Aprovação do cliente via link público com token único… Exportação PDF profissional"); `.lovable/memory/features/quote-system-master-spec.md:3` ("aprovação pública por token").
- Evidência no código: `PdfGenerationDialog`, `QuoteApprovalLinkCard`, `QuoteVersionHistory`, `QuoteWhatsAppShare`, `PresentationMode` e `QuoteBitrixSync` só são importados em `src/pages/QuoteViewPage.tsx:25-35`, roteada em `src/routes/config/quotes.ts:46` (`/orcamentos/:id/visualizar`). `grep -rn "/visualizar" src e2e` só encontra a definição da rota. Toda a navegação vai para `/orcamentos/${id}` (ex.: `QuotesConfigurableList.tsx:230,243`, `QuoteKanbanBoard.tsx:126`, `useQuoteBuilderState.ts:342`), que abre `QuoteDetailPage.tsx`; os imports dela (`QuoteDetailPage.tsx:11-18`) não têm PDF nem geração de link. Além disso, `QuotesListPage.tsx:143` mostra o toast "Gere e assine o PDF no detalhe do orçamento" e navega para essa página sem PDF.
- O que falta: ligar o PDF, o link de aprovação, as versões e o Bitrix à página de detalhe, ou criar um botão "Visualizar/Enviar proposta" que leve a `/visualizar`. Consolidar as duas páginas.
- Impacto no negócio: o vendedor não consegue gerar a proposta em PDF nem o link de aprovação pelo caminho normal. O ciclo de venda trava.
- Esforço: P
- Prioridade: P0

### DOC-02  "Copiar link" e "WhatsApp" na lista enviam URL interna, não o link de aprovação
- Status: STUB/MOCK
- Origem: `.lovable/memory/features/quote-system-master-spec.md:14` ("ações rápidas (duplicar / link / WhatsApp / aprovar)"); `README.md:201`.
- Evidência no código: `src/components/quotes/QuoteRowQuickActions.tsx:34-44` — `buildShareUrl` devolve `${APP_BASE_URL}/orcamentos/${quote.id}` (rota protegida por `ProtectedRoute`, `App.tsx:98`). O texto do WhatsApp diz "Visualize os detalhes aqui: <link interno>".
- O que falta: gerar ou reutilizar o token de `quote_approval_tokens` (`useQuoteApproval`) e enviar `/approve/:token` ou `/proposta/:token`.
- Impacto no negócio: o cliente recebe um link que pede login e não consegue ver nem aprovar a proposta.
- Esforço: P
- Prioridade: P1

### DOC-03  Flow em "modo CRM" (análise do cliente) inalcançável
- Status: ORFA
- Origem: `README.md:207` ("Modo CRM: análise de cliente, propostas personalizadas"); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:95` (`ExpertChatButton`).
- Evidência no código: o backend aceita `clientId` (`supabase/functions/expert-chat/index.ts:27,614-667`). O único ponto de entrada da interface é `QuickQuoteFAB.tsx:218-225`, que abre `ExpertChatDialog` **sem** `clientId`. `ExpertChatButton.tsx` (que recebe `clientId`) não é importado em lugar nenhum (`grep -rn "ExpertChatButton" src` → só o próprio arquivo).
- O que falta: abrir o Flow com `clientId`/`clientName` a partir de `ClientDetailPage` e do BI (botão "Perguntar ao Flow sobre este cliente").
- Impacto no negócio: a análise de cliente com dados do CRM, vendida como diferencial, não está disponível.
- Esforço: P
- Prioridade: P2

### DOC-04  Login social Google
- Status: ORFA
- Origem: `README.md:229` ("Google OAuth como login social").
- Evidência no código: `src/components/auth/SocialLoginButtons.tsx:27` implementa `lovable.auth.signInWithOAuth("google")`, mas nenhum arquivo o importa (`grep -rln SocialLoginButtons src` → só ele mesmo). `src/pages/Auth.tsx` não tem nenhuma ocorrência de "google". `PasskeyLogin.tsx` também está órfão.
- O que falta: decidir se o login social entra (a SCOPE_ALIGNMENT fala em "Email/SSO Sicoob") e então montar o botão em `Auth.tsx` e habilitar o provedor, ou remover do README.
- Impacto no negócio: o recurso anunciado não existe para o usuário. Expectativa errada em demonstrações.
- Esforço: P
- Prioridade: P2

### DOC-05  Restrição por IP/geolocalização: validação no cliente, depois do login, e liberando em caso de falha
- Status: PARCIAL
- Origem: `README.md:232` ("Proteção HIBP e restrição por IP/Geolocalização"); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:46-59`.
- Evidência no código: `src/pages/Auth.tsx:104-127` (`checkAuthenticatedAccess`) só valida depois que a sessão foi criada e então faz `signOut`. `src/hooks/useIPValidation.ts:117,129` diz "fail-open: se não conseguir validar, permite". A validação depende do navegador chamar `validate-access`; quem usa a API diretamente com a anon key ignora a regra. O geo-blocking virou lista de cidades (`useGeoBlocking.ts:41` → `city_whitelist`).
- O que falta: aplicar a regra no servidor (hook de Auth, ou verificação em RLS/edge na emissão e renovação do token), mudar para fail-closed quando a regra estiver ativa e testar.
- Impacto no negócio: a restrição dá falsa sensação de segurança; um acesso de IP não autorizado não é barrado de fato.
- Esforço: M
- Prioridade: P1

### DOC-06  Configuração do Supabase Auth (plataforma fechada, HIBP no servidor, verificação de e-mail) sem prova
- Status: BLOQUEADA_EXTERNA (requer acesso administrativo ao projeto `cfmzkthhgliqelozlmwu`)
- Origem: `README.md:228-232`; `docs/adr/0004-closed-platform-policy.md` ("Signup público desabilitado"); `.lovable/memory/security/production-hardening-baseline.md:14` (`password_hibp_enabled=true`, `disable_signup=true`).
- Evidência no código: `supabase/config.toml` não tem seção `[auth]`. `src/contexts/AuthContext.tsx:310-324` expõe `signUp` via `supabase.auth.signUp`. A consulta remota falhou (MCP 401).
- O que falta: versionar `[auth]` no `config.toml` (ou um teste remoto que prove `disable_signup`, HIBP e e-mail confirmado) e remover `signUp` do contexto.
- Impacto no negócio: se o cadastro público estiver ligado no servidor, qualquer pessoa cria conta e entra numa plataforma que deveria ser só por convite.
- Esforço: P
- Prioridade: P1

### DOC-07  Multi-tenancy por `organization_id` "com isolamento completo"
- Status: DOC_DIVERGENTE
- Origem: `README.md:244`; `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md:84,273` (`user_organizations`, `organization_invites`); `docs/02_INTEGRACAO_FRONTEND_REACT.md:18-212`; `docs/04_EXPLICACAO_DAS_POLICIES.md:45-108` (`user_is_org_member`, `is_org_admin`, policies de categorias/fornecedores); `docs/architecture/ER_DIAGRAM.md` (ORGANIZATIONS→QUOTES).
- Evidência no código: só **4 de 240** tabelas/views em `types.ts` têm `organization_id` (`orders`, `order_items`, `organization_members`, `quotes`). `user_organizations`, `organization_invites`, `categories` e `techniques` não existem (0 `CREATE TABLE` em migrations; 0 em `types.ts`). As funções `user_is_org_member`, `is_org_admin` e `is_org_owner_or_admin` têm 0 ocorrências em migrations. O isolamento real do Sicoob usa cooperativa/PA/vendedor.
- O que falta: reescrever o README e os docs 01-04 para o modelo real (cooperativas → PAs → vendedores) ou concluir a multi-tenancy.
- Impacto no negócio: quem consulta os documentos acredita num isolamento entre clientes que o banco não implementa nessas tabelas.
- Esforço: G
- Prioridade: P2

### DOC-08  Estimativa de frete SEDEX/PAC do montador de kits é tabela fixa
- Status: STUB/MOCK
- Origem: `README.md:214` ("Estimativa de frete (SEDEX/PAC)").
- Evidência no código: `src/components/kit-builder/FreightEstimator.tsx:1-5` ("Tabela interna estimada — sem integração CEP real") e `:22-43` (preços fixos por faixa de peso, "SP Capital como referência").
- O que falta: integrar uma cotação real (Correios ou agregador) por CEP de destino, ou deixar claro na tela que é estimativa.
- Impacto no negócio: o cliente recebe valor de frete inventado; risco de margem negativa ou de perder a venda.
- Esforço: M
- Prioridade: P2

### DOC-09  Deep linking do catálogo não inclui o modo de visualização
- Status: PARCIAL
- Origem: `README.md:190` ("Deep linking completo (gênero, tamanhos, cores, views)").
- Evidência no código: filtros vão para a URL (`src/pages/filters/filters-page-helpers.ts:104-119`), mas a visualização (grade/lista/tabela) fica em `useState` (`useFiltersPageState.ts:64`) ou `localStorage` (`useCatalogDisplay.ts:21`), sem parâmetro `view` na URL.
- O que falta: serializar `view` na URL nas duas telas de catálogo.
- Impacto no negócio: um link compartilhado não abre na mesma visualização (impacto pequeno).
- Esforço: P
- Prioridade: P3

### DOC-10  Divergências descritivas do README
- Status: DOC_DIVERGENTE
- Origem: `README.md:199` (stepper de 6 etapas), `:217` (rota `/bi`), `:173,178,266,348-349` (106/104 funções, 534/529 migrations), `:270-274` (`generate-pdf`, `send-email`, `tts-*`, `fetch-product-details`), `:193` (etapas "Local → Grupo → Variação → Configuração"), `:288` (Bitrix "REST API + OAuth2"), `:317-322` (deploy automático pelo Lovable).
- Evidência no código: stepper com 4 etapas (`QuoteBuilderStepper.tsx:18-21`); rota real `/ferramentas/bi` (`routes/config/products.ts:66`); 106 funções com `index.ts` e 577 migrations; as 4 funções citadas não existem em `supabase/functions/`; etapas reais Produto/Local/Especificações/Comparativo; Bitrix usa webhook clássico `BITRIX24_WEBHOOK_URL` (`bitrix-sync/index.ts:44`); o deploy tem fluxo manual (`docs/DEPLOYMENT.md`, `deploy-sicoob-functions.yml`).
- O que falta: atualizar o README.
- Impacto no negócio: documento de venda e onboarding com promessas imprecisas.
- Esforço: P
- Prioridade: P3

### DOC-11  BI: dossiê em PDF de 5 páginas e link público de dossiê sem acesso
- Status: ORFA
- Origem: `.lovable/memory/features/business-intelligence-module.md:12-13` ("header inclui `<ExportDossierButton>`") e `:42-50`; rota `/dossie/:token` em `docs/ROUTES.md:71`.
- Evidência no código: `src/components/bi/ExportDossierButton.tsx` não é importado em nenhum lugar (a página importa só `ExecutiveSummaryButton`, que gera PPTX — `BusinessIntelligencePage.tsx:27-46`). `bi-share-dossier/index.ts:126` cria token via POST, mas nenhum código do front chama POST (`PublicDossierPage.tsx:42` só lê). A assinatura usa `BI_SHARE_SECRET` com fallback para `SUPABASE_SERVICE_ROLE_KEY` (`bi-share-dossier/index.ts:14`).
- O que falta: montar `ExportDossierButton` no cabeçalho, criar o botão "Compartilhar dossiê" (POST) e exigir `BI_SHARE_SECRET` próprio.
- Impacto no negócio: o vendedor não leva o dossiê do cliente para a reunião nem envia o link.
- Esforço: P
- Prioridade: P2

### DOC-12  BI mostra dados simulados quando falta histórico real
- Status: STUB/MOCK
- Origem: `.lovable/memory/features/business-intelligence-module.md:3,34-37` ("fallback mock quando volume insuficiente"); `README.md:218-220` ("Métricas de vendas em tempo real").
- Evidência no código: `src/lib/bi/mockData.ts` é consumido por `useClientBI`, `useIndustryTrends`, `useClientCategoryAffinity`, `useIndustryCategoryTrends`, `useClientSeasonality` e `useClientAffinity`; existe um "cliente demo" (`BusinessIntelligencePage.tsx:28,219,236`).
- O que falta: substituir os mocks por estados vazios explícitos (ou por RPCs sobre `orders`, como o próprio documento prevê, linhas 61-63) e não exibir números fictícios para clientes reais.
- Impacto no negócio: decisão comercial tomada com números inventados.
- Esforço: M
- Prioridade: P2

### Tema B — docs/FUNCIONALIDADES_E_FERRAMENTAS.md (inventário)

### DOC-13  Passkeys/WebAuthn: hook com retorno fixo
- Status: STUB/MOCK
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:38-42`; `docs/AUTH_PASSKEYS.md` (verificação no servidor pendente).
- Evidência no código: `src/hooks/useWebAuthn.ts:17-31` devolve `isSupported:false`, `registerPasskey`→`false` e `authenticateWithPasskey`→`{success:false}`. O `PasskeyManager` continua na tela de segurança (`SecurityDashboardSections`). `PasskeyLogin.tsx` está órfão.
- O que falta: desafio e verificação no servidor (`@simplewebauthn/server`) e integração com o Supabase Auth, ou remover o painel. A SCOPE_ALIGNMENT (linha 44) tira o tema do escopo.
- Impacto no negócio: a tela oferece um recurso que nunca funciona.
- Esforço: G
- Prioridade: P3

### DOC-14  CAPTCHA, reautenticação e página `Security.tsx`
- Status: NAO_INICIADA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:21` (`useReauthentication`), `:73` (`src/pages/Security.tsx`), `:78-81` (`useCaptcha`).
- Evidência no código: `grep -rniE "captcha|turnstile|hcaptcha|recaptcha" src supabase/functions` → nenhuma ocorrência; `grep -rniE "reauthenticat|useReauth" src` → nenhuma; `src/pages/Security.tsx` não existe. Existe step-up (`step-up-verify`) só para operações administrativas.
- O que falta: CAPTCHA no login e na redefinição de senha, e reautenticação para ações sensíveis do usuário comum (ou retirar do inventário).
- Impacto no negócio: login mais exposto a robôs de força bruta, com mitigação parcial por rate-limit.
- Esforço: M
- Prioridade: P3

### DOC-15  Perfil e configurações do próprio usuário
- Status: NAO_INICIADA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1103-1105` (`src/pages/ProfilePage.tsx`), `:1095` (`AdminPanel.tsx`).
- Evidência no código: `ProfilePage.tsx` e `AdminPanel.tsx` não existem. `App.tsx:92-93` redireciona `/configuracoes` e `/perfil` para `/admin/usuarios` (protegida por `AdminRoute`), então um usuário comum cai em 403. Os atalhos para `/configuracoes` em `commandActions.tsx:220`, `BackButton.tsx:24` e `PersistentBreadcrumbs.tsx:36` levam ao mesmo lugar. `DevAccessDeniedPage.tsx:67` aponta para `/admin/configuracoes`, que não existe.
- O que falta: uma página de autosserviço (dados, senha, MFA, preferências de notificação) acessível a qualquer papel.
- Impacto no negócio: o usuário não troca a própria senha nem ativa MFA sem pedir ao administrador; mais chamados de suporte.
- Esforço: M
- Prioridade: P2

### DOC-16  Integração Bitrix24 (sincronização de empresas/negócios) sem interface nem agendamento
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:471-477` (`BitrixSyncPageV2`, `useBitrixSync`, `useBitrixSyncAsync`); `README.md:288`; `docs/architecture/C4_CONTEXT.md:72` ("Sync -->|OAuth2| Bitrix"); `CONTRIBUTING.md:95-96` ("`crm.item.get`… OAuth2 sempre").
- Evidência no código: `supabase/functions/bitrix-sync/index.ts` existe, mas nenhum código do front a chama (`grep "bitrix-sync" src` → só um rótulo em `Breadcrumbs.tsx:54`); os 3 arquivos citados não existem. A função usa `crm.company.list/get` com webhook clássico (`:44,77,142`), o oposto do que o CONTRIBUTING exige. A `docs/SCOPE_ALIGNMENT.md:39` declara Bitrix fora do escopo. (A sincronização de orçamento via `sync-quote-bitrix`/n8n é outro fluxo, ligado à página órfã do DOC-01.)
- O que falta: decisão de escopo; se mantido, interface e agendamento, OAuth2 e `crm.item.get`; se não, remover função e documentação.
- Impacto no negócio: o CRM não recebe nem envia clientes automaticamente, ao contrário do que os documentos prometem.
- Esforço: M
- Prioridade: P2

### DOC-17  Painel de recomendações de IA e chat reutilizável
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:101-109` (`AIRecommendationsPanel`, `AIChat`); `docs/API.md:5-32`.
- Evidência no código: o barrel `src/components/ai/index.ts` e seus componentes não são importados por nenhum arquivo (`grep -rn "components/ai" src` → 0). Na página de produto só está ligado `SmartRecommendations` (`ProductDetail.tsx`).
- O que falta: montar o painel no dashboard ou no orçamento, ou apagar o código.
- Impacto no negócio: sugestões de venda cruzada por IA ficam restritas à página de produto.
- Esforço: P
- Prioridade: P3

### DOC-18  Gerador de mockups: templates de posicionamento e upload de arquivo de arte
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:146-149` (`ArtFileUpload`, `TemplateSelector`, `SaveTemplateDialog`) e a tabela `mockup_templates`/`art_file_attachments`.
- Evidência no código: os três componentes, mais `GenerateButton` (`:155`) e `lib/print-area-grouping.ts` (`:166`), não são importados por nenhum arquivo; `mockup_templates` não é lida em `src/`.
- O que falta: ligar à `MockupGenerator`.
- Impacto no negócio: o vendedor refaz o posicionamento do logo a cada mockup e não anexa a arte final do cliente.
- Esforço: P
- Prioridade: P2

### DOC-19  Gráfico de histórico de preços do produto
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:281-284`.
- Evidência no código: `src/components/products/PriceHistoryChart.tsx` não é importado por nenhum arquivo.
- O que falta: montar na página do produto (havendo fonte de histórico no catálogo externo).
- Impacto no negócio: o vendedor não mostra a evolução de preço ao negociar.
- Esforço: P
- Prioridade: P3

### DOC-20  Cadastros administrativos (produtos, fornecedores, preços de gravação) não gravam nada
- Status: STUB/MOCK
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:273-277` (registro de produtos), `:981` (`EngravingRegistrationPage`), `:1096` (`AdminCadastrosPage`); `docs/ROUTES.md:13-14`; `docs/INVENTARIO_FUNCIONALIDADES_v2.md:30` (admin → `/admin/cadastros`).
- Evidência no código: `/admin/cadastros` abre `ProductRegistrationPage` (`routes/config/admin.ts:22-23`), cujo `createProduct` (`useProductRegistration.ts:156-171`) e a importação em massa chamam `external-db-bridge` com `insert`, que responde `403 CATALOG_READ_ONLY` (`external-db-bridge/index.ts:479-481`). O hub `AdminCadastrosPage` (produtos, fornecedores e personalização via `EngravingRegistrationPage` e `useTecnicaMutations` → `invokeExternalDbSingle`) está órfão.
- O que falta: decisão: ou retirar as telas de escrita (o catálogo é só leitura) e documentar que a manutenção é no sistema de origem, ou criar um canal de escrita autorizado.
- Impacto no negócio: o administrador preenche o formulário e sempre recebe erro; tempo perdido e chamados.
- Esforço: M
- Prioridade: P2

### DOC-21  Metas de vendas
- Status: ORFA
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:500-504` (`SalesGoalsCard`, `useSalesGoals`).
- Evidência no código: a tabela `sales_goals` existe em `types.ts`, mas `SalesGoalsCard.tsx` e `useSalesGoals.ts` só se referenciam entre si; não há tela de cadastro de metas.
- O que falta: tela de cadastro (gestor) e exibição do card no dashboard do vendedor (`/vendedor/dashboard`, `/dashboard`).
- Impacto no negócio: sem acompanhamento de meta por vendedor dentro do portal.
- Esforço: M
- Prioridade: P2

### DOC-22  Gamificação e loja de recompensas
- Status: DOC_DIVERGENTE
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:492-498` (`RewardsStorePage`, `useGamification`, `useRewardsStore`); `docs/API.md:169-179` (`useGamification()`).
- Evidência no código: os arquivos não existem; a tabela `achievements` não está em `types.ts`. A `docs/SCOPE_ALIGNMENT.md:47` declara o tema fora do escopo.
- O que falta: remover da API.md e do inventário (ou repriorizar).
- Impacto no negócio: documentação promete um recurso descartado.
- Esforço: P
- Prioridade: P3

### DOC-23  Notificações push (Web Push)
- Status: PARCIAL
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:541-546`; `docs/NOTIFICATION_SYSTEM.md:96` ("Push Notifications — Web Push API").
- Evidência no código: `src/hooks/usePushNotifications.tsx:12-60` usa só a API `Notification` do navegador com a aba aberta: não há `pushManager.subscribe`, chave VAPID nem envio no servidor. A migration `005_push_subscriptions.sql` existe, mas a tabela não está em `types.ts` (não aplicada).
- O que falta: assinatura Web Push, persistência em `push_subscriptions` e envio pelo servidor.
- Impacto no negócio: o gestor não é avisado de aprovações pendentes com o portal fechado.
- Esforço: M
- Prioridade: P2

### DOC-24  Aviso visual de preço estimado no simulador
- Status: ORFA
- Origem: `.lovable/memory/features/simulation-price-source-badge.md:9-16` (bloco âmbar "Estimativa — cálculo oficial indisponível… Confirme o valor antes de fechar o orçamento").
- Evidência no código: `src/components/simulation/SimulationPriceSourceBadge.tsx` não é importado por nenhum arquivo; `useSimulation.ts:251-260` só dispara um toast uma vez por sessão.
- O que falta: renderizar o badge em cada opção ou cartão de técnica do simulador e no item do orçamento.
- Impacto no negócio: o vendedor pode fechar orçamento com preço heurístico achando que é oficial; risco direto de margem.
- Esforço: P
- Prioridade: P1

### DOC-25  Inteligência de mercado: limpeza diária do cache e validação Zod
- Status: PARCIAL
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1265-1266` ("Zod-validated… Limpeza diária via `pg_cron` (`cleanup-ai-insights-cache`, 03:00)").
- Evidência no código: cache, cota e telemetria existem (`market-intelligence-insights/index.ts:226,249,363`), mas não há import de zod na função e `grep cleanup-ai-insights-cache\|cleanup_ai_insights_cache supabase/migrations` → nenhuma ocorrência.
- O que falta: o cron de limpeza e o schema Zod da entrada.
- Impacto no negócio: a tabela de cache cresce sem limite (custo de banco); entrada sem validação.
- Esforço: P
- Prioridade: P3

### DOC-26  Inventário de funcionalidades desatualizado (arquivos inexistentes e órfãos)
- Status: DOC_DIVERGENTE
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` (todo o documento, "Última atualização 03/03/2026").
- Evidência no código: dos **643 caminhos** citados, **78 não existem** (ex.: `useAutoSave.tsx`:372, `PublicQuoteApproval.tsx`:414, `QuoteQRCode.tsx`:415, `QuoteProposalPreview.tsx`:431, `notificationService.ts`:535, `FavoritesContext.tsx`:555, `ComparisonContext.tsx`:571, `useVoiceCommands.ts`:591, `useVoiceFeedback.ts`:593, `UserBehaviorTracking.tsx`:525, `AddFutureStockDialog.tsx`:1033, `useFutureStock.ts`:1035, 18 componentes do simulador legado :955-972, vários hooks utilitários :728-783). Entre os existentes, **39 não são importados** por nenhum arquivo, por exemplo `GlobalSearch`, `SmartSuggestions`, `DynamicBreadcrumbs`, `PageHeader`, `NoveltiesSection`, `CategoryTreeNavigator`, `KitVisualComposition`, `ProductVariations`, `CatalogQualityDashboard`, `StockBadge`, `ThemeCustomization`, `PersonalizationSimulator` (página legada sem rota), `useFavorites`, `useComparison`, `useRecentlyViewed`, `ImageWithFallback`, `StatusTimeline`, `LoadingScreen`. Fora do inventário também estão órfãos `SavedFilters`, `ZoomableGallery`, `RecentlyViewedBar`, `QuoteShareDialog` e `QuoteMetricsDashboard`.
- O que falta: regenerar o inventário a partir do código e apagar ou religar o código órfão.
- Impacto no negócio: o documento de referência engana quem planeja e audita; há código morto acumulado.
- Esforço: M
- Prioridade: P3

### Tema C — docs/NOTIFICATION_SYSTEM.md e e-mail

### DOC-27  Sistema de notificações multicanal (e-mail, SMS, WhatsApp, push, "Não perturbe", resumo)
- Status: STUB/MOCK
- Origem: `docs/NOTIFICATION_SYSTEM.md:93-110` ("✅ Email via Resend… SMS… WhatsApp… DND… Digest diário… 100%"), `:318` ("PRODUÇÃO-READY"); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:532-539`.
- Evidência no código: `supabase/functions/send-notification/index.ts:107-131` só insere em `workspace_notifications` e grava `notification_logs` com `channel:'push', status:'success'` sem enviar nada. Com "Não perturbe" ativo, a notificação vai para `scheduled_notifications` (`:84`) e com resumo ativo para `notification_digests` (`:90`); **nenhum código consome as duas tabelas** (só a própria função e um painel de leitura, `useNotificationOmnichannel.ts`). O horário do "Não perturbe" usa a hora do servidor (UTC) (`:64-76`). `send-digest/index.ts:55-62` só conta não lidas e não envia. **Nenhum código chama `send-notification`** (`grep` em `src`, `supabase/functions` e migrations → só o manifesto). `NotificationCenter.tsx` e `src/lib/notifications.ts` não existem. A tela de preferências oferece "E-mail" e "WhatsApp (Beta)" (`NotificationPreferences.tsx:29-31`) sem efeito.
- O que falta: transporte real por canal, worker das agendadas e dos resumos com fuso America/Sao_Paulo, chamadas da função nos eventos de negócio, e remover os toggles sem efeito.
- Impacto no negócio: o usuário configura e-mail ou WhatsApp e nada chega. Quem liga "Não perturbe" ou "Resumo" deixa de receber os avisos que dependem dessa função.
- Esforço: G
- Prioridade: P1

### DOC-28  E-mail transacional (status de pedido, orçamento enviado/aprovado)
- Status: STUB/MOCK
- Origem: `docs/NOTIFICATION_SYSTEM.md:95`; manifesto "Envio de e-mail trans" (`supabase/functions/_shared/edge-authz-manifest.ts:173`).
- Evidência no código: `supabase/functions/send-transactional-email/index.ts:45-50` responde 501 "O envio deste email ainda não está implementado". `src/services/OrderService.ts:419-433` chama a função ao mudar status de pedido e engole o erro em `console.error`. `src/hooks/useTransactionalEmail.ts` não é usado.
- O que falta: implementar o envio (Resend já é usado em `_shared/approval-delivery.ts`) com fila durável e recibo.
- Impacto no negócio: o comprador não recebe e-mail de mudança de status do pedido; aumentam ligações e cobranças.
- Esforço: M
- Prioridade: P1

### Tema D — Rotinas agendadas (memórias .lovable, manifesto e documentos)

### DOC-29  Funções de rotina declaradas como "pg_cron" sem agendamento
- Status: ORFA (agendamento remoto não verificável: MCP 401)
- Origem: `supabase/functions/_shared/edge-authz-manifest.ts:93-109` (rationale "pg_cron"); `.lovable/memory/features/quote-system-master-spec.md:34-40` (`cron.schedule('quote-followup-reminders-daily'…)`); `.lovable/memory/features/collections-roadmap.md:21`; `.lovable/memory/features/favorites-roadmap.md:19`; `.lovable/memory/integrations/connections-hub.md:16,30` (`connections-health-check` a cada 15 min); `docs/SLA_REVIEW.md:21`; `docs/GO_LIVE_CHECKLIST.md:24` (`error-monitor` ativo).
- Evidência no código: as migrations agendam só: auto-revoke MCP, keepalive do bridge, connections-auto-test, partições/limpezas SQL, hardening, webhook-retry/cleanup, exportação, outbox de aprovação Sicoob e pagamentos vencidos (`grep -rn "cron.schedule" supabase/migrations`). `grep -rhoE "functions/v1/[a-z-]+" supabase/migrations` mostra só 5 funções chamadas por cron. **Sem agendamento e sem chamada viável:** `collections-watcher`, `favorites-watcher`, `comparison-price-watcher`, `quote-followup-reminders`, `send-digest`, `process-queue`, `process-scheduled-reports`, `send-scheduled-reports`, `cleanup-notifications` (edge), `connections-health-check`, `ownership-audit`, `monthly-health-report`, `error-monitor` e `qa-block-monitor` (estes três sem nenhum chamador). Todas as que exigem `requireInternalService` não podem ser chamadas pelo navegador.
- O que falta: migrations com `cron.schedule` + `net.http_post` e `x-sicoob-internal-secret` vindo do Vault (padrão de `20260923140000_secure_legacy_connection_crons.sql`) e evidência no ledger remoto.
- Impacto no negócio: alertas de queda de preço, lembretes de orçamento parado, resumos, relatórios agendados, alertas de integração caída e o monitor de erros simplesmente não rodam.
- Esforço: M
- Prioridade: P1

### DOC-30  Botão "Executar auditoria agora" (auditoria de propriedade) sempre falha
- Status: STUB/MOCK
- Origem: `docs/ROUTES.md:12` (`/admin/auditoria-propriedade`); `docs/INVENTARIO_FUNCIONALIDADES_v2.md:53` (`ownership-audit`).
- Evidência no código: `src/pages/admin/OwnershipAuditAdminPage.tsx:431` faz `functions.invoke('ownership-audit')` com o JWT do usuário, mas `supabase/functions/ownership-audit/index.ts:21` exige `requireInternalService` (cabeçalho `x-sicoob-internal-secret`) → 401/503. Também não há cron (DOC-29), então não há relatório.
- O que falta: autorização mista (dev via JWT ou segredo interno) ou um RPC dedicado, além do cron.
- Impacto no negócio: a tela de auditoria de registros órfãos fica sempre vazia ou com erro.
- Esforço: P
- Prioridade: P2

### Tema E — Observabilidade, SLO, SLA, DR, Go-Live, flags

### DOC-31  Métricas de entrega de webhooks e painel `/admin/observabilidade`
- Status: DOC_DIVERGENTE
- Origem: `docs/OBSERVABILITY.md:38-47` ("Funções consumidoras já instrumentadas… `webhook-inbound`, `webhook-dispatcher`, `product-webhook`, `sync-quote-bitrix`, `quote-sync`, `bitrix-sync`"; "Dashboard (admin → `/admin/observabilidade`)"); `docs/CONNECTORS_INVENTORY.md:36`.
- Evidência no código: `grep -rln webhook_delivery_metrics supabase/functions` → nenhuma ocorrência (nenhuma função escreve na tabela); `get_webhook_delivery_summary` só aparece na migration `20260427122230_…sql` e em `types.ts`; a rota `/admin/observabilidade` não existe. O "Client Logging Gate" (`:122`) não tem script em `scripts/`.
- O que falta: gravar a métrica nas funções, criar o painel ou o card no App Health e o gate de log no cliente.
- Impacto no negócio: falhas de integração com CRM e n8n passam despercebidas.
- Esforço: M
- Prioridade: P2

### DOC-32  Sentry: DSN em produção e regras de alerta
- Status: BLOQUEADA_EXTERNA (conta Sentry, Slack #ops, PagerDuty)
- Origem: `docs/OBSERVABILITY.md:52-64` (tabela de alertas P0-P2); `.lovable/memory/infrastructure/hardening-roadmap.md:56` ("`VITE_SENTRY_DSN` em Build Secrets ativa em produção").
- Evidência no código: `src/lib/sentry.ts:26-29` só carrega com `VITE_SENTRY_DSN`; não há DSN versionado (correto), nem evidência de que exista no provedor, nem das regras de alerta. O monitor por cron (`error-monitor`) não tem agendamento (DOC-29).
- O que falta: confirmar o DSN no build de produção, criar as regras de alerta e registrar evidência.
- Impacto no negócio: erros em produção sem alerta; o time descobre pelo cliente.
- Esforço: P
- Prioridade: P1

### DOC-33  SLO/SLI sem medição
- Status: NAO_INICIADA
- Origem: `docs/SLO.md:7-28` (99,9% de uptime, p95 < 400 ms, Bitrix < 5 s, "0% de divergência de preços… comparação automatizada `quote_items.unit_price` × `order_items.unit_price`", MTTR P0 < 4 h).
- Evidência no código: `grep -rniE "error_budget|errorBudget|\bslo\b"` em `src`, `supabase/functions`, `scripts` → nenhuma ocorrência; não existe verificação automática de divergência de preço orçamento→pedido (`grep price_divergence` → nenhuma ocorrência).
- O que falta: coleta dos SLIs (uptime das funções, latência p95), painel de error budget e job de integridade de preço na conversão.
- Impacto no negócio: as metas de serviço não são medidas, então não podem ser cobradas nem cumpridas.
- Esforço: M
- Prioridade: P2

### DOC-34  Relatório mensal de performance por e-mail e alertas por SMS
- Status: STUB/MOCK
- Origem: `docs/SLA_REVIEW.md:20-21` ("alertas SMS para a equipe de infraestrutura"; "Relatórios… enviados automaticamente para `management@promogifts.com.br` todo dia 01").
- Evidência no código: `supabase/functions/monthly-health-report/index.ts:36-74` monta o JSON e só o devolve (sem e-mail); nenhum chamador nem cron (DOC-29); nenhuma integração de SMS (`grep -rni twilio\|sms supabase/functions` → nenhuma ocorrência).
- O que falta: agendar, enviar por e-mail (Resend) e definir o canal de alerta crítico.
- Impacto no negócio: a gestão não recebe o relatório mensal prometido.
- Esforço: M
- Prioridade: P2

### DOC-35  Plano de recuperação de desastres (modo leitura, página de manutenção, teste de restauração)
- Status: NAO_INICIADA
- Origem: `docs/DR.md:19` (versionamento de buckets), `:26` ("Modo de Leitura" via feature flag), `:27` (página de manutenção estática), `:35` (simulação semestral de restauração).
- Evidência no código: não existe flag de modo leitura (`grep -rniE "read_only_mode|maintenance_mode|modo_leitura"` → nenhuma ocorrência); não há página de manutenção em `public/`; nenhuma evidência de teste de restauração em `docs/evidencias/`. Só `useCloudStatus` + `CloudStatusBanner` existem.
- O que falta: flag e banner de modo leitura, página estática, roteiro e evidência de restore (PITR depende do plano Supabase).
- Impacto no negócio: numa falha grave não há procedimento testado; RTO de 2 h e RPO de 24 h não comprovados.
- Esforço: M
- Prioridade: P2

### DOC-36  Checklist de Go-Live sem nenhum item cumprido ou evidenciado
- Status: BLOQUEADA_EXTERNA (operação real, verbas e homologação com gestor)
- Origem: `docs/GO_LIVE_CHECKLIST.md:6-27` (todos `[ ]`), `:31` ("Status: 🔴 BLOQUEADO | 🟡 RISCO | 🟢 LIBERADO", sem preenchimento).
- Evidência no código: o documento não tem responsável, data nem status. Itens dependentes estão pendentes: `error-monitor` sem agendamento (DOC-29), verbas dos PAs dependem de carga real e não há evidência de backup verificado.
- O que falta: executar o checklist com evidências (link para os runs e consultas) e assinar.
- Impacto no negócio: não há critério formal para dizer que o portal está pronto para produção.
- Esforço: M
- Prioridade: P1

### DOC-37  Feature flags e toggles do sistema sem efeito
- Status: STUB/MOCK
- Origem: `docs/DR.md:26` ("via Feature Flag"); toggles exibidos em `/admin/usuarios`.
- Evidência no código: `src/lib/feature-flags.ts` (registro com `mfa`, `voice_commands`…) tem `isFeatureEnabled` com **0 consumidores**. `SystemFeatureToggles.tsx:52-63` grava `feature_cart_system`, `feature_direct_chat`, `feature_cms_blog` e `feature_budget_enforcement` em `system_settings`, mas nenhum código lê essas chaves (`grep` → só o próprio componente e a migration de seed `20260504182837_…sql:53-57`). O módulo de newsletter (`feature_marketing_newsletter`) tem `AdminNewsletterPage.tsx` órfã.
- O que falta: ligar as flags aos pontos de decisão (por exemplo, validação de verba no checkout) ou remover os toggles.
- Impacto no negócio: o administrador "desliga" a validação de verba e nada muda, ou acha que mudou.
- Esforço: P
- Prioridade: P2

### Tema F — Segurança e governança (SECURITY*, secrets, branch protection, runbooks, ADRs, docs/security)

### DOC-38  Proteção da branch `main`
- Status: BLOQUEADA_EXTERNA (decisão do dono e permissão de administração do repositório)
- Origem: `docs/branch-protection-pendente.md:13-43`; `CONTRIBUTING.md:7` ("Toda alteração em main passa por Pull Request. Sem exceção"); `docs/deploy-flow.md:87`.
- Evidência no código: `gh api repos/adm01-debug/Brindes_Sicoob_V2/rulesets` → `[]` (11/10/2026). Só há o workflow reativo `branch-protection-sentinel.yml`. O último push em `main` (#98, `dc08200`) teve `startup_failure` nos workflows de push.
- O que falta: aplicar o ruleset documentado, com bypass do Lovable e checks obrigatórios.
- Impacto no negócio: qualquer pessoa ou agente pode enviar direto para produção sem revisão.
- Esforço: P
- Prioridade: P1

### DOC-39  Secret scanning e push protection
- Status: BLOQUEADA_EXTERNA (plano GitHub Advanced Security)
- Origem: `docs/SECURITY_ALERTS.md:14` ("⏳ Depende de GitHub Advanced Security/plano"), `:71-73` (CodeQL sem upload).
- Evidência no código: `codeql.yml` com `upload: never`; a API não expõe `security_and_analysis` (resposta vazia).
- O que falta: contratar ou habilitar GHAS, ou aceitar formalmente o risco (o Gitleaks cobre parcialmente).
- Impacto no negócio: um segredo publicado não é revogado automaticamente.
- Esforço: P
- Prioridade: P2

### DOC-40  Inventário de segredos: script de conferência e coluna "Configurado em"
- Status: NAO_INICIADA
- Origem: `docs/secrets.md:7-9` ("Preencher a coluna 'Configurado em'"), `:96` ("`scripts/check-secrets-inventory.mjs`, a criar").
- Evidência no código: `scripts/check-secrets-inventory.mjs` não existe. Várias linhas seguem "**preencher**" (por exemplo `BITRIX24_WEBHOOK_URL`, `N8N_QUOTE_WEBHOOK_URL`, `BI_SHARE_SECRET`, `INTERNAL_FUNCTION_SECRET`). `gh api …/actions/secrets` respondeu 403.
- O que falta: criar o script e ligar no CI; preencher a coluna com evidência.
- Impacto no negócio: integrações quebram em silêncio quando falta um segredo.
- Esforço: P
- Prioridade: P3

### DOC-41  Pentests trimestrais e monitoramento externo de disponibilidade
- Status: BLOQUEADA_EXTERNA (fornecedor de pentest e contratação de Better Stack, Checkly ou UptimeRobot)
- Origem: `docs/SECURITY_PLAN.md:6-11` (monitor externo), `:20-22` (Q2 "Agendado", Q3/Q4 "Pendente").
- Evidência no código: nenhuma evidência de pentest em `docs/` nem de monitor externo configurado.
- O que falta: contratar e executar, guardando o relatório e o painel.
- Impacto no negócio: sem validação independente de segurança; queda do portal sem alerta externo.
- Esforço: M
- Prioridade: P2

### DOC-42  Pós-incidente `migrate-helper`: rotação de credenciais e revisão de logs
- Status: BLOQUEADA_EXTERNA (painel Supabase e logs de invocação)
- Origem: `.lovable/plan/remoção-da-edge-function-migrate-helper-2026-08-16.md:17-21` (passos 2-4: desativar o deploy, rotacionar chaves, verificar logs); `docs/RUNBOOKS/CREDENTIAL_ROTATION.md:115-125,140-150` (calendário com "revisão de presença", checklist vazio).
- Evidência no código: o código foi neutralizado (`supabase/functions/migrate-helper/index.ts` → 410) e o gate de CI existe (`scripts/check-edge-authorization.mjs:150-152`). Porém o diretório e o bloco `[functions.migrate-helper]` continuam (`supabase/config.toml`), e o runbook diz que "revisão de presença… não comprova a data da última rotação" (`:123-125`). Não há evidência de rotação da service role nem de revisão dos logs.
- O que falta: rotacionar `SUPABASE_SERVICE_ROLE_KEY` e a senha do banco, revisar os logs da função e registrar evidência saneada.
- Impacto no negócio: se a chave vazou, alguém pode ler e alterar todos os dados (clientes, orçamentos, pedidos).
- Esforço: P
- Prioridade: P1

### DOC-43  ADR 0003: "100% das edge functions com Zod"
- Status: DOC_DIVERGENTE
- Origem: `docs/adr/0003-zod-edge-functions.md:12`; `CHANGELOG.md` ("50 Edge Functions com validação Zod (100% de cobertura)").
- Evidência no código: **22 funções** leem `req.json()` sem zod nem `_shared/validate`: `admin-audit-hook`, `auth-integrity-check`, `bi-copilot`, `bi-share-dossier`, `block-ip-temporarily`, `e2e-cleanup`, `force-global-logout`, `get-app-logs`, `kit-ai-builder`, `market-intelligence-insights`, `ownership-audit`, `ownership-repair`, `quote-approval`, `send-transactional-email`, `sicoob-approval-notifications`, `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-kit-quote`, `sicoob-reorder`, `sicoob-seed-qa`, `step-up-verify`, `trends-insights`.
- O que falta: schemas Zod e um gate de CI que exija validação.
- Impacto no negócio: entradas malformadas podem causar erro ou comportamento inesperado em funções sensíveis (aprovação, logout global, bloqueio de IP).
- Esforço: M
- Prioridade: P2

### DOC-44  ADR 0008: soft-delete unificado
- Status: PARCIAL
- Origem: `docs/adr/0008-unified-soft-delete-policy.md:4` ("Proposta"), `:13-18` (`deleted_at` em orçamentos, pedidos, clientes e produtos; trigger; RLS escondendo apagados).
- Evidência no código: em `types.ts` só `quotes` tem `deleted_at`; `orders`, `order_items`, `sicoob_orders`, `quote_items`, `custom_kits`, `collections` e `favorite_lists` não têm.
- O que falta: decidir (aceitar ou recusar a ADR) e aplicar colunas, trigger e RLS.
- Impacto no negócio: exclusão de pedido é definitiva, sem trilha (risco de LGPD e auditoria).
- Esforço: G
- Prioridade: P3

### DOC-45  ADR 0009: migrations "expand & contract"
- Status: NAO_INICIADA
- Origem: `docs/adr/0009-expand-contract-migrations.md:4` ("Proposta"), `:31-34` (regras de ouro).
- Evidência no código: nenhum gate que detecte `RENAME`/`DROP COLUMN`/mudança de tipo em migrations novas (`scripts/` não tem checagem equivalente; `check-migration-immutability.mjs` cobre só edição de migration já mesclada).
- O que falta: aceitar a ADR e criar o gate.
- Impacto no negócio: risco de quebra em produção numa mudança de schema.
- Esforço: M
- Prioridade: P3

### DOC-46  Regra dos helpers RBAC não cumprida nas policies novas
- Status: DOC_DIVERGENTE
- Origem: `docs/RBAC_HELPERS.md:23` ("**Nunca** escreva `has_role(auth.uid(), 'admin')` em uma nova policy").
- Evidência no código: migrations de setembro de 2026 em diante usam o padrão, por exemplo `20260916150000_storage_bucket_reconciliation.sql:16-17`, `20260916180000_create_password_reset_requests.sql:38-39`, `20260916190000_create_audit_log.sql:45` e `20260922152000_group_personalization_templates.sql:99-100`. Não há gate que impeça.
- O que falta: refatorar para `is_supervisor_or_above` ou `can_*` e criar o gate.
- Impacto no negócio: a política de acesso fica inconsistente quando os papéis legados forem removidos.
- Esforço: P
- Prioridade: P3

### DOC-47  Lacunas conhecidas na matriz RLS (admin não enxerga coleções e campanhas alheias)
- Status: BLOQUEADA_EXTERNA (decisão de produto)
- Origem: `docs/security/RLS_MATRIX.md:163`.
- Evidência no código: as policies de `magic_up_campaigns` são só `auth.uid() = user_id` (`20260420185009_…sql:96-99`); não há policy de bypass para administrador em `collections`.
- O que falta: decidir e, se for o caso, adicionar policy com `is_admin(auth.uid())`.
- Impacto no negócio: o suporte não consegue ver nem corrigir coleções e campanhas de um vendedor.
- Esforço: P
- Prioridade: P3

### DOC-48  ADR 0001 (buckets): PDF de proposta em bucket privado enviado ao Bitrix por URL "pública"
- Status: BLOQUEADA_EXTERNA (decisão de produto sobre o contrato com Bitrix)
- Origem: `docs/adr/0001-nomes-de-buckets-storage.md` ("Ressalva conhecida (não resolvida nesta sessão)": `proposals` não é público e `getPublicUrl()` não abre fora do Supabase).
- Evidência no código: o fluxo continua em `src/pages/quote-view/QuoteBitrixSync.ts` (página órfã, DOC-01).
- O que falta: decidir entre `createSignedUrl` com expiração e bucket público, e ajustar a integração.
- Impacto no negócio: o link da proposta enviado ao CRM não abre para o contato do cliente.
- Esforço: P
- Prioridade: P2

### DOC-49  Auditorias "enterprise": criptografia em repouso e "cold storage" dados como concluídos
- Status: DOC_DIVERGENTE
- Origem: `docs/audits/AUDIT_ENTERPRISE_FINAL.md:219` ("Criptografia de Dados em Repouso… `src/services/encryption.ts` ✅ Concluído"); `docs/audits/ENTERPRISE_AUDIT_REPORT_V6.md:16,28` ("Arquitetura de Cold Storage implementada"); `docs/audits/AUDITORIA_ENTERPRISE_FINAL.md:81` ("Todos os roadmaps foram cumpridos").
- Evidência no código: `src/services/encryption.ts` não tem nenhum consumidor (`grep encrypt` → nenhuma ocorrência fora do arquivo). `archive_old_admin_audit_logs()` foi removida e o cron desagendado (`20261007212428_remove_obsolete_admin_audit_crons.sql:9-16`). Os links de evidência apontam para `github.com/promo-gifts/app` e para `20250103_02_rls_organizations.sql`, que não existe.
- O que falta: retificar os relatórios ou implementar (cifrar PII de fato e definir retenção ou arquivamento).
- Impacto no negócio: relatórios de auditoria com certificação inverídica podem gerar exposição em due diligence ou LGPD.
- Esforço: M
- Prioridade: P2

### Tema G — Rotas (docs/ROUTES.md, INVENTARIO, menus)

### DOC-50  ROUTES.md desatualizado e páginas planejadas sem rota
- Status: ORFA
- Origem: `docs/ROUTES.md:3` ("gerado automaticamente via `scripts/generate-routes-map.mjs`"), `:9` (`/admin/usuarios/promover`), `:14` (`/admin/cadastros/produto/:id`), `:20` (`/admin/kit-templates/metricas`), `:28` (`/admin/seguranca/exemplos-challenge`), `:39` (`AdminConexoesStatusPage`), `:43` (`/admin/qa` → `QAPage`), `:53` (`/favoritos` → FiltersPage), `:55` (`/carrinhos/:cartId`), `:65-66` (`PublicQuoteApprovalPage`), `:72` (`/auth/callback`), `:84` (`/orcamentos/:id` → QuoteViewPage); `.lovable/memory/features/kit-library-system.md:50` (métricas de templates).
- Evidência no código: nenhuma dessas rotas está em `src/routes/config/*.ts` nem em `App.tsx` (lista extraída: 126 caminhos). Páginas existentes e **não importadas**: `AdminPromoverUsuarioPage`, `AdminProductFormPage`, `KitTemplatesMetricsPage`, `DevChallengeExamplesPage`, `AdminConexoesStatusPage`, `QAPage`, `PublicQuoteApprovalPage`, além de `AdminPAsPage`, `AdminSingularesPage`, `AdminCooperativasPage`, `AdminCentraisPage`, `AdminCampanhasPage`, `AdminNewsletterPage`, `AdminBusinessDashboardPage`, `AdminAuditPage`, `AuditEnterprisePage`, `AuditEvidenceDashboard`, `RLSAuditPage`, `qa/QARunDetailPage`, `qa/ReleaseEvidencesPage`, `quotes/QuoteApprovalHistoryPage` e `GestorApprovalsPage` (raiz). O gerador não roda no CI (`grep generate-routes-map package.json .github` → nenhuma ocorrência). O ROUTES.md omite cerca de 40 rotas reais (sicoob-rbac, públicas `/public/*`, `/status`…).
- O que falta: decidir rota a rota (registrar ou apagar), rodar o gerador no CI e falhar quando houver divergência.
- Impacto no negócio: telas prontas (promover supervisor, métricas de templates, gestão de centrais, histórico de aprovações) ficam inacessíveis; o mapa engana o time.
- Esforço: P
- Prioridade: P2

### DOC-51  "Instalar App" leva a rota inexistente (`/instalar` → 404)
- Status: ORFA
- Origem: `docs/MOBILE.md:83` ("Service Worker para offline", PWA); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:641-646`.
- Evidência no código: `src/components/layout/Header.tsx:118` faz `navigate('/instalar')`, mas `/instalar` não está registrada; `src/pages/PWAInstallPage.tsx` (que declara `path="/instalar"` no SEO, linha 12) não é importada.
- O que falta: registrar a rota pública ou protegida para `PWAInstallPage`.
- Impacto no negócio: o usuário de celular clica em "Instalar App" e cai em "Página não encontrada".
- Esforço: P
- Prioridade: P2

### DOC-52  Menu do usuário: item "Ajuda" sem ação
- Status: STUB/MOCK
- Origem: menu de conta do cabeçalho (navegação documentada em `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:660-667`).
- Evidência no código: `src/components/layout/Header.tsx:130` — `<DropdownMenuItem …><HelpCircle/>Ajuda</DropdownMenuItem>` sem `onClick` nem link.
- O que falta: apontar para uma central de ajuda, FAQ ou canal de suporte.
- Impacto no negócio: o usuário procura ajuda e nada acontece.
- Esforço: P
- Prioridade: P3

### DOC-53  INVENTARIO v2: rotas e perfis inexistentes
- Status: DOC_DIVERGENTE
- Origem: `docs/INVENTARIO_FUNCIONALIDADES_v2.md:15` ("5 perfis"), `:27` (`/meus-pedidos`), `:29` (`/painel-kpis`), `:74` ("fonte de verdade para a governança").
- Evidência no código: `grep -rn "meus-pedidos\|painel-kpis" src` → nenhuma ocorrência. O enum `app_role` tem 9 valores (`admin, manager, vendedor, supervisor, dev, gestor_compras, gerente_pa, comprador_pac, comprador_singular` — `types.ts:12969+`).
- O que falta: corrigir o inventário ("fonte de verdade") ou criar as rotas.
- Impacto no negócio: treinamento e permissões planejados com base em rotas que não existem.
- Esforço: P
- Prioridade: P3

### Tema H — Demais documentos (order-workflow, SICOOB_TESTING, SCOPE, testing, locale, guias)

### DOC-54  order-workflow.md: testes citados não existem e status divergem
- Status: DOC_DIVERGENTE
- Origem: `docs/order-workflow.md:6` (fluxo em `src/hooks/useOrders.ts`), `:7-15` (pending → … → completed), `:33` ("`src/hooks/useOrders.test.ts` e `src/types/sicoob/orders.test.ts`").
- Evidência no código: os dois arquivos de teste não existem, e `grep -rln canTransitionTo` em `*.test.*` → nenhuma ocorrência. O hook está em `src/hooks/orders/useOrders.ts`. O enum do banco `order_status` está em português (`rascunho, enviado_gestor, …, concluido, cancelado`), enquanto o front usa `pending/confirmed/in_production…` (`src/types/sicoob/orders.ts:3`, `src/constants/orders.ts:67`).
- O que falta: testes das regras de transição e alinhar documento, front e enum.
- Impacto no negócio: uma regra que impede pular etapas do pedido não tem teste; risco de pedido "entregue" sem produção.
- Esforço: P
- Prioridade: P2

### DOC-55  SICOOB_TESTING.md: papéis de teste não existem no RBAC
- Status: DOC_DIVERGENTE
- Origem: `SICOOB_TESTING.md:26-30` (`sicoob_pa`, `sicoob_singular`, `sicoob_central`, `sicoob_gestor`), `:10` (senha padrão `password123`).
- Evidência no código: esses valores não existem no enum `app_role`. `supabase/functions/sicoob-seed/index.ts:24-48,174` grava o papel em `profiles.role` e não em `user_roles` (contrariando a ADR 0002: "Roles ficam em `user_roles` (jamais em `profiles`)"). O seed exige `SICOOB_TEST_USER_PASSWORD` (`:17`), então o documento está desatualizado quanto ao padrão.
- O que falta: alinhar seed e documento aos papéis reais (`gerente_pa`, `gestor_compras`, `comprador_*`) atribuídos em `user_roles`.
- Impacto no negócio: a massa de teste não reproduz as permissões reais; a homologação por papel fica inválida.
- Esforço: P
- Prioridade: P2

### DOC-56  SCOPE_ALIGNMENT contradiz README e inventário
- Status: BLOQUEADA_EXTERNA (decisão de negócio sobre o escopo)
- Origem: `docs/SCOPE_ALIGNMENT.md:39` (Bitrix fora), `:43` (IP/Geo fora), `:44` (WebAuthn/2FA fora), `:47` (gamificação fora), `:57` (`bitrix_clients` → "Tabela `clients` nativa… ✅ Mapeado").
- Evidência no código: o README (`:229-232,288`) e o inventário anunciam esses itens; o código mantém telas de IP/Geo, Passkeys e `bitrix-sync`. A tabela `clients` não existe (`types.ts` e migrations → 0).
- O que falta: o dono decidir o escopo e alinhar todos os documentos e o código (remover ou concluir).
- Impacto no negócio: time e cliente trabalham com expectativas opostas sobre o que o portal faz.
- Esforço: P
- Prioridade: P2

### DOC-57  Testes de contrato (Pact) com o n8n
- Status: NAO_INICIADA
- Origem: `docs/testing/CONTRACT_TESTS_PACT.md:57-60` (instalar `@pact-foundation/pact`, Pact Broker, `test:contract` no `ci.yml`).
- Evidência no código: `grep pact package.json` → nenhuma ocorrência; não há `test:contract`.
- O que falta: implementar ou arquivar o plano.
- Impacto no negócio: uma mudança no n8n pode quebrar a sincronização de orçamentos sem aviso.
- Esforço: M
- Prioridade: P3

### DOC-58  Configuração global de locale e fuso (pt-BR / America/Sao_Paulo)
- Status: PARCIAL
- Origem: `docs/CONFIGURACAO_LOCALE_PT_BR.md:283-316,381-384` (`src/lib/locale-config.ts`, `setupLocale()` no `main.tsx`, `date-fns-tz`); `docs/POLITICA_IDIOMA_PT_BR.md:48,71-76` (fuso fixo; `setDefaultOptions`).
- Evidência no código: o `calendar.tsx` usa `ptBR`, `index.html` tem `lang="pt-BR"` e `date-utils.ts` existe, mas `locale-config.ts` não existe, não há `setDefaultOptions` nem `setupLocale` (o comentário órfão está em `sw-register.ts:8`), `date-fns-tz` não está instalado e há 1 única ocorrência de `America/Sao_Paulo` em `src`. O "Não perturbe" das notificações usa UTC (DOC-27).
- O que falta: concluir o checklist.
- Impacto no negócio: datas e horários podem aparecer com 3 h de diferença (prazos, "Não perturbe").
- Esforço: P
- Prioridade: P3

### DOC-59  Exportação Excel: componente reutilizável e lista de clientes
- Status: PARCIAL
- Origem: `docs/EXCEL_INTEGRATION_GUIDE.md:6` (`ExportExcelButton.tsx` "já criado"), `:70-97` (ClientList).
- Evidência no código: `src/components/export/ExportExcelButton.tsx` não existe; orçamentos e pedidos exportam via `orderExportUtils`/`excelExport` (`QuotesListPage.tsx:27,106-108`), mas `ClientsPage.tsx` não exporta.
- O que falta: exportação na lista de clientes e corrigir o guia.
- Impacto no negócio: a carteira de clientes não sai em planilha.
- Esforço: P
- Prioridade: P3

### DOC-60  HOOKS_USAGE_GUIDE: `useCRUD` inexistente
- Status: DOC_DIVERGENTE
- Origem: `docs/HOOKS_USAGE_GUIDE.md:8` (`import { useCRUD } from '@/hooks/useCRUD'`) e exemplos com tabelas `products`/`clients`.
- Evidência no código: `src/hooks/useCRUD.ts` não existe; as tabelas `products`/`clients` não são locais.
- O que falta: reescrever o guia com os hooks reais.
- Impacto no negócio: novos desenvolvedores seguem um padrão inexistente.
- Esforço: P
- Prioridade: P3

### DOC-61  Documentos de performance contraditórios e auditoria trimestral vencida
- Status: DOC_DIVERGENTE
- Origem: `docs/PERFORMANCE.md:11` (Redis), `:16` (Lighthouse > 95), `:17` ("não há mais dashboard interno em `/admin/performance` nem coleta via `web-vitals`"); `docs/PERFORMANCE_AUDIT.md:3` ("Última auditoria 2026-04-17 · Próxima revisão: Trimestral").
- Evidência no código: `/admin/performance` existe (`routes/config/dev.ts:14-16`, `AdminPerformancePage.tsx:283` consulta `web-vitals`); `useWebVitals` está ativo em `App.tsx:64`; `.lighthouserc.cjs:14-17` exige 0,9; não há Redis. Não existe auditoria de performance posterior a abril de 2026 em `docs/`.
- O que falta: corrigir os documentos e refazer a auditoria (há duas revisões trimestrais vencidas).
- Impacto no negócio: metas de performance sem base real.
- Esforço: P
- Prioridade: P3

### DOC-62  Documentos e memórias referenciados que não existem no repositório
- Status: DOC_DIVERGENTE
- Origem: `docs/README.md:22-47` (`ANALISE_EXAUSTIVA_GIFTS_STORE.md`, `MELHORIAS_PENDENTES_PLANO_IMPLEMENTACAO.md`, `DIAGRAMAS_PROCESSOS_GIFTS_STORE.md`), `:129` ("Documentação atualizada e completa"), `:134-173` (Master Module Index mem://); `docs/ONBOARDING.md:27` (`mem://index.md`); `docs/SECURITY_RUNBOOK.md:3,62-65`.
- Evidência no código: os 3 documentos não existem. **29 memórias `mem://` citadas** não estão em `.lovable/memory/` (há só 10 arquivos), entre elas `architecture/external-db-bridge-and-resilience-v4`, `features/keyboard-shortcuts-registry`, `security/anti-scraping-protection`, `security/mfa-enforcement-authorize`, `architecture/operational-resilience-and-disaster-recovery` e `index`.
- O que falta: recuperar o conteúdo (exportar do Lovable) ou remover as referências.
- Impacto no negócio: perda de conhecimento de arquitetura; onboarding quebrado.
- Esforço: M
- Prioridade: P3

### DOC-63  Edge functions documentadas como ativas, mas desativadas (410/501)
- Status: DOC_DIVERGENTE
- Origem: `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:295` (`cleanup-novelties`), `:300` (`product-webhook`), `:130` (`generate-mockup-nanobanana`); `docs/OBSERVABILITY.md:41` (`product-webhook` instrumentada); `.lovable/memory/security/production-hardening-baseline.md:17` (wire-up de token em `quote-public-view`); `docs/architecture/C4_CONTEXT.md:23` ("N8N -->|Ingere Dados| System").
- Evidência no código: `product-webhook/index.ts`, `cleanup-novelties/index.ts`, `generate-mockup-nanobanana/index.ts` e `quote-public-view/index.ts` respondem 410; `send-transactional-email` responde 501 (DOC-28).
- O que falta: atualizar os documentos (ou remover as funções e os blocos do `config.toml`).
- Impacto no negócio: integrações externas antigas (n8n de produtos) podem estar chamando endpoints mortos sem ninguém saber.
- Esforço: P
- Prioridade: P3

### DOC-64  SECURITY_RUNBOOK: Security Center "somente admins", mas a rota exige `dev`
- Status: DOC_DIVERGENTE
- Origem: `docs/SECURITY_RUNBOOK.md:7`; `.lovable/memory/security/production-hardening-baseline.md:26` (logout global "admin-only").
- Evidência no código: `/admin/seguranca-acesso` está em `devRoutes` (`routes/config/dev.ts:22-25`), protegida por `DevRoute` ("Apenas `dev` passa", `DevRoute.tsx:21`), conforme a ADR 0006.
- O que falta: corrigir o runbook (quem aciona bloqueio de IP e logout global num incidente).
- Impacto no negócio: num incidente, o administrador de plantão descobre na hora que não tem acesso.
- Esforço: P
- Prioridade: P3

---

## Fontes lidas

Integralmente: `README.md`, `docs/README.md`, `docs/MODULES.md`, `docs/FUNCIONALIDADES_E_FERRAMENTAS.md` (1.297 linhas; 643 caminhos verificados por script), `docs/INVENTARIO_FUNCIONALIDADES_v2.md`, `docs/ROUTES.md`, `docs/API.md`, `docs/API_DEPENDENCY_MAP.md`, `docs/api_dependency_map.json`, `docs/NOTIFICATION_SYSTEM.md`, `docs/OBSERVABILITY.md`, `docs/SLO.md`, `docs/SLA_REVIEW.md`, `docs/DR.md`, `docs/GO_LIVE_CHECKLIST.md`, `docs/MOBILE.md`, `docs/DARK_MODE.md`, `docs/ACCESSIBILITY.md`, `docs/MAGIC_UP_ONDA5_A11Y.md`, `docs/EXCEL_INTEGRATION_GUIDE.md`, `docs/CONNECTORS_INVENTORY.md`, `docs/SECURITY.md`, `docs/SECURITY_ALERTS.md`, `docs/SECURITY_PLAN.md`, `docs/SECURITY_RUNBOOK.md`, `docs/secrets.md`, `docs/branch-protection-pendente.md`, `docs/SCOPE_ALIGNMENT.md`, `docs/SKINS_INVENTORY.md`, `docs/order-workflow.md`, `docs/deploy-flow.md`, `docs/DEPLOYMENT.md`, `docs/HOOKS_USAGE_GUIDE.md`, `docs/FORM_VALIDATION.md`, `docs/RBAC_HELPERS.md`, `docs/PERFORMANCE.md`, `docs/PERFORMANCE_AUDIT.md`, `docs/ONBOARDING.md`, `docs/POLITICA_IDIOMA_PT_BR.md` (regras e configurações), `docs/CONFIGURACAO_LOCALE_PT_BR.md` (checklist), `docs/adr/*` (10 ADRs), `docs/architecture/C4_CONTEXT.md`, `docs/architecture/ER_DIAGRAM.md`, `docs/testing/CONTRACT_TESTS_PACT.md`, `docs/testing/STRICT_REF_WARNING_GATE.md`, `docs/security/SELLER_SCOPE_CHECKER.md`, `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`, `docs/RUNBOOKS/MCP_DDL_APPLICATION.md`, `.lovable/memory/**` (10 arquivos), `.lovable/plan/remoção-da-edge-function-migrate-helper-2026-08-16.md`, `.hermes.md`, `CONTRIBUTING.md`, `SECURITY.md`, `SICOOB_TESTING.md`, `CHANGELOG.md`.
Por seções e pendências: `docs/01_CRIAR_PRIMEIRA_ORGANIZATION.md`, `docs/02_INTEGRACAO_FRONTEND_REACT.md`, `docs/03_ARQUITETURA_DO_SISTEMA.md`, `docs/04_EXPLICACAO_DAS_POLICIES.md` (títulos, tabelas e funções citadas), `docs/security/RLS_MATRIX.md` (lacunas ⚠️), `docs/audits/*` (9 relatórios: gaps, pendências e alegações de conclusão), `docs/AUTH_PASSKEYS.md` (gaps), `docs/evidencias/*` (lista de arquivos). `.devin/skills/graphify/SKILL.md` só listado (ferramental, sem funcionalidade de produto).
Código consultado: `src/App.tsx`, `src/routes/config/*.ts`, `src/integrations/supabase/types.ts`, `supabase/config.toml`, `supabase/functions/*` (106 funções), `supabase/migrations/*` (577; todos os `cron.schedule`), `.github/workflows/*`, `scripts/*`, `package.json`.
