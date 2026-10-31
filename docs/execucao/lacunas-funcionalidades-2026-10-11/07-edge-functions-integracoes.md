# Edge Functions e Integrações — funcionalidades planejadas e não executadas (fatia EDG)

> Escopo: `supabase/functions/**` (106 funções com `index.ts` + `_shared` + `tests` + diretório vazio `graphify-out`), `supabase/config.toml`, `docs/EDGE_FUNCTIONS.md`, `docs/EDGE_FUNCTIONS_DRIFT.md`, `docs/CONNECTORS_INVENTORY.md`, `docs/RUNBOOK_CONNECTIONS.md`, `docs/secrets.md`, scripts de edge e `.github/workflows/deploy-sicoob-functions.yml`. HEAD `dc08200` (main). Análise estática, somente leitura; nenhuma função remota foi invocada. Onde o estado remoto importa, cito a evidência versionada (`docs/execucao/...`) e marco "a confirmar".

## Resumo

**Itens levantados: 56** (cada item agrupa um problema; a matriz abaixo classifica também cada uma das 106 funções).

| Status | Itens | Funções na matriz |
|---|---:|---:|
| NAO_INICIADA | 5 | — |
| PARCIAL | 25 | 16 |
| STUB/MOCK | 8 | 5 |
| ORFA | 12 | 30 |
| BLOQUEADA_EXTERNA | 6 | 25 |
| OK (sem pendência nesta fatia) | — | 30 |

Fatos estruturais:
- 106 fontes executáveis × 100 publicadas: o projeto bateu o limite de 100 funções (`docs/execucao/reconciliacao-online-2026-09-28.md:24-26`, `docs/execucao/fechamento-tecnico-2026-10-08.md:43-45`). Seis fontes estão fora do runtime por decisão registrada.
- 13 das 16 funções classificadas como `service` no manifesto (`_shared/edge-authz-manifest.ts:92-115`, quase todas rotuladas "pg_cron") **não têm agendamento nem chamador em nenhuma migration, função ou workflow**; só `connections-auto-test`, `process-batch-export` e `sicoob-approval-notifications` têm cron versionado.
- 17 funções de IA dependem do gateway `ai.gateway.lovable.dev` com `LOVABLE_API_KEY`, que `docs/secrets.md:31` ainda marca como "preencher".
- Nenhuma chamada do frontend aponta para função inexistente; há chamadas a funções inertes/quebradas (`quote-public-view` 410 em página não roteada; `ownership-audit` exige segredo interno que o navegador não tem; `send-transactional-email` responde 501). O E2E referencia `create-order`, função que não existe.

### 10 achados mais graves

1. **EDG-28** — Envio de NF-e (PDF/XML) e comprovante de entrega dos pedidos Sicoob responde sempre 503: scanner antimalware obrigatório sem `SICOOB_MALWARE_SCANNER_URL`/`_TOKEN` (ausentes no remoto em 28/09).
2. **EDG-20** — `send-transactional-email` devolve 501 "ainda não está implementado": nenhum e-mail ao cliente sobre orçamento enviado/aprovado/recusado, pedido criado ou mudança de status Sicoob.
3. **EDG-15** — Webhooks de saída (`quote.created`, `order.created`…) nunca são entregues: o trigger chama `webhook-dispatcher` sem o segredo exigido e o cron de retry também não o envia.
4. **EDG-41** — 13 rotinas "de cron" sem agendamento: alertas de queda de preço, relatórios agendados, digest, follow-up, incidentes de conectores, auditoria de órfãos e relatório mensal nunca rodam.
5. **EDG-05** — As telas de administração do catálogo (produtos, fornecedores, técnicas, imagens, vídeos, tags, materiais, kits) disparam ~81 escritas que o `external-db-bridge` recusa com `CATALOG_READ_ONLY`.
6. **EDG-01** — Toda a IA (17 funções: chat especialista, mockup, Magic Up, busca semântica/visual, BI copilot, voz) depende de `LOVABLE_API_KEY` sem configuração confirmada no projeto canônico.
7. **EDG-21** — E-mails de aprovação Sicoob (outbox) e OTP do step-up dependem de `RESEND_API_KEY`/`NOTIFICATION_FROM_EMAIL` "não verificados" e de homologação Slack/Resend nunca feita.
8. **EDG-12** — Sincronização de orçamento com o Bitrix usa mapa fixo de 7 e-mails de vendedores da Promo Brindes, não tem fila/retry e descarta itens sem `bitrix_product_id`.
9. **EDG-16** — Segredos HMAC de webhooks cadastrados pela UI vão para o banco, mas as funções só leem variáveis de ambiente: saídas sem assinatura e entradas sempre 401.
10. **EDG-32** — `verify-email` (pública, órfã) confirma o e-mail de qualquer conta só com o UUID do usuário.

## Matriz completa das funções

Legenda de status na matriz: `OK` = implementada e ligada, sem pendência encontrada nesta fatia (não significa "em produção com tráfego real"). "(DB/env)" = resolvida por `resolveCredential`/`getCredential` (tabela `integration_credentials` primeiro, ambiente como fallback). `INTERNAL_FUNCTION_SECRET` entra via `_shared/internal-service-auth.ts:29-44` (cabeçalho `x-sicoob-internal-secret`).

| # | Função | Propósito | Quem chama (arquivo) | Segredos exigidos (além de SUPABASE_*) | Status | Observação |
|---|---|---|---|---|---|---|
| 1 | `admin-audit-hook` | Grava auditoria de ações admin | src/utils/adminAudit.ts:39 | — | OK | CORS `*` inline. |
| 2 | `ai-recommendations` | Recomenda produtos por perfil (IA) | src/hooks/useAIRecommendations.ts:108 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem chave devolve fallback fixo (EDG-01/EDG-02). |
| 3 | `analyze-logo-colors` | Extrai paleta de logo (IA) | src/hooks/useLogoColorAnalysis.ts:63 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Depende do gateway Lovable (EDG-01). |
| 4 | `auth-integrity-check` | Valida usuários de teste | src/components/auth/QuickTestLogin.tsx:53 (componente não montado) | — | ORFA | EDG-31. |
| 5 | `bi-copilot` | "Pergunte ao BI" com IA | src/components/bi/BIAiCopilot.tsx:53 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem validação de JWT no handler (EDG-03). |
| 6 | `bi-share-dossier` | Link público de dossiê BI | src/pages/PublicDossierPage.tsx:42 (só GET) | BI_SHARE_SECRET | PARCIAL | POST (criar link) sem chamador; segredo cai para service role (EDG-38). |
| 7 | `bitrix-sync` | Lê/sincroniza empresas e deals Bitrix | nenhum (só rótulo em Breadcrumbs.tsx:54) | BITRIX24_WEBHOOK_URL | ORFA | create_deal/update_deal não implementados (EDG-10). |
| 8 | `block-ip-temporarily` | Bloqueia IP temporariamente | src/components/admin/security/BlockIpButton.tsx:36 | — | OK | Bloqueio só vale para funções com bot-protection. |
| 9 | `categories-api` | Categorias do catálogo externo | src/hooks/useProductsByCategory.ts:27,138 | EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY | PARCIAL | Credencial só via env (EDG-06). |
| 10 | `cleanup-notifications` | Apaga notificações lidas antigas | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Duplica cron SQL `cleanup-old-notifications` (EDG-26/EDG-41). |
| 11 | `cleanup-novelties` | Endpoint inerte (410) | nenhum | — | ORFA | Publicado ocupando vaga (EDG-08). |
| 12 | `cnpj-lookup` | Consulta CNPJ na CNPJá | src/utils/cnpj-lookup.ts:27 | CNPJA_API_KEY | BLOQUEADA_EXTERNA | EDG-36. |
| 13 | `collections-public-react` | Reações em coleção pública | src/pages/PublicCollectionPage.tsx:280 | — | OK | CORS `*` inline. |
| 14 | `collections-watcher` | Alerta queda de preço (coleções) | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Lê `products` local inexistente (EDG-07/EDG-41). |
| 15 | `commemorative-dates` | Datas comemorativas do catálogo | src/hooks/useCommemorativeDates.ts:62 | EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY | PARCIAL | Sem env devolve vazio silencioso (EDG-06). |
| 16 | `comparison-ai-advisor` | Conselheiro IA de comparação | src/components/compare/AIComparisonAdvisor.tsx:57 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem validação de JWT no handler (EDG-03). |
| 17 | `comparison-price-watcher` | Alerta queda de preço (comparações) | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Depende de `price_history` local (EDG-07/EDG-41). |
| 18 | `comparisons-public-react` | Reações em comparação pública | src/pages/PublicComparisonPage.tsx:244 | — | OK | CORS `*` inline. |
| 19 | `connection-tester` | Teste manual de conectores | src/hooks/useConnectionTester.ts:124,155 (+3) | EXTERNAL_PROMOBRIND_*/EXTERNAL_CRM_* (DB), BITRIX24_WEBHOOK_URL (DB), N8N_BASE_URL/N8N_API_KEY (DB) | PARCIAL | Teste "mcp" é fingido (EDG-48). |
| 20 | `connections-auto-test` | Auto-teste periódico de conectores | cron `connections-auto-test` (migr. 20260923140000:122) | INTERNAL_FUNCTION_SECRET, Vault: sicoob_project_url, sicoob_internal_function_secret | OK | Cron confirmado ativo em 28/09. |
| 21 | `connections-health-check` | Incidentes de conectores p/ admins | nenhum (sem cron; UI useRecentIncidents.ts:6 espera) | INTERNAL_FUNCTION_SECRET | ORFA | EDG-41. |
| 22 | `connections-hub-audit` | Auditoria do hub de conexões | src/components/admin/connections/IntegrationsHealthCard.tsx:251 | — | STUB/MOCK | Checagem de funções fixa ok=true; executa RPCs de cron (EDG-47). |
| 23 | `crm-db-bridge` | Ponte para banco do CRM | src/lib/crm-db.ts:94,181; telemetria admin | LOG_CRM_BRIDGE_VERBOSE, EXTERNAL_CRM_URL (DB/env), EXTERNAL_CRM_SERVICE_ROLE_KEY (DB/env), EXTERNAL_CRM_ANON_KEY (DB/env) | OK | Escrita de vendedor vazia por desenho; código morto de quotes. |
| 24 | `detect-new-device` | Detecta novo dispositivo/IP | src/hooks/useDeviceDetection.ts:94 | — | PARCIAL | E-mail nunca enviado; confia em userId do corpo (EDG-27). |
| 25 | `dropbox-list` | Lista arquivos do Dropbox | src/hooks/useDropboxFiles.ts:29,44 | DROPBOX_ACCESS_TOKEN | BLOQUEADA_EXTERNA | Sem auth e sem refresh de token (EDG-35). |
| 26 | `e2e-auth-test` | Teste de RLS por papel (dev) | nenhum | — | ORFA | Fonte não publicável (seção 4). |
| 27 | `e2e-cleanup` | Limpeza de dados de E2E | e2e/helpers/cleanup-client.ts:141; .github/workflows/e2e.yml:59 | E2E_CLEANUP_RATE_LIMIT_MAX, E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS, E2E_CLEANUP_TOKEN, E2E_CLEANUP_ALLOWED_EMAILS | OK | Depende de E2E_CLEANUP_TOKEN no GitHub. |
| 28 | `elevenlabs-scribe-token` | Token efêmero STT ElevenLabs | src/hooks/voice/scribeTokenCache.ts:43 | ELEVENLABS_API_KEY | BLOQUEADA_EXTERNA | EDG-51. |
| 29 | `elevenlabs-tts` | Síntese de voz ElevenLabs | src/hooks/voice/playTtsAudio.ts:104 | ELEVENLABS_API_KEY | BLOQUEADA_EXTERNA | EDG-51. |
| 30 | `error-monitor` | Alerta rajada de erros | nenhum | — | ORFA | Fonte não publicável; bug coluna `content` (EDG-43). |
| 31 | `expert-chat` | Chat especialista com IA | src/components/expert/chat/useExpertChat.ts:200; src/components/ai/AIChat.tsx:90 | LOVABLE_API_KEY, EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY, EXTERNAL_CRM_URL (DB/env), EXTERNAL_CRM_SERVICE_ROLE_KEY (DB/env), EXTERNAL_CRM_ANON_KEY (DB/env) | BLOQUEADA_EXTERNA | IA (EDG-01) + catálogo via env (EDG-06). |
| 32 | `external-connections-sync` | Sincroniza credenciais→conexões | src/components/admin/connections/LastSyncRunPanel.tsx:127 | — | OK | — |
| 33 | `external-db-bridge` | Ponte leitura catálogo externo | ~70 chamadas em src (ex.: src/lib/external-db/invoke.ts:13); cron keepalive | EXTERNAL_PROMOBRIND_URL (DB/env), EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY (DB/env) | PARCIAL | Escritas do admin recusadas (EDG-05). |
| 34 | `external-db-inspect` | Inspeção de schema externo (dev) | src/pages/admin/AdminExternalDbPage.tsx:29; src/hooks/useExternalDbInspect.ts:33 | EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY | PARCIAL | Credencial só env (EDG-06). |
| 35 | `favorites-public-react` | Reações em favoritos públicos | src/hooks/useFavoriteReactions.ts:55 (URL do projeto fixa) | — | OK | URL de projeto hardcoded no front. |
| 36 | `favorites-watcher` | Alerta queda de preço (favoritos) | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Lê `products` local inexistente (EDG-07/EDG-41). |
| 37 | `force-global-logout` | Logout global de usuários | src/components/admin/security/ForceGlobalLogoutDialog.tsx:34 | — | OK | — |
| 38 | `full-op-diagnostics` | Diagnóstico operacional (dev) | src/components/admin/security/keys/diagnostics/FullOpDiagnosticsPanel.tsx:81 | — | OK | — |
| 39 | `generate-ad-image` | Gera imagem publicitária (IA) | src/hooks/useMagicUpGeneration.ts:200 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 40 | `generate-ad-prompt` | Gera prompt de campanha (IA) | src/components/magic-up/PromptGenerator.tsx:96 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 41 | `generate-mockup` | Mockup de produto com IA | src/hooks/mockup/mockupGenerationService.ts:240 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 42 | `generate-mockup-nanobanana` | Stub 410 (mockup legado) | nenhum | — | ORFA | Substituída por generate-mockup (EDG-04). |
| 43 | `generate-product-seo` | Gera SEO de produto (IA) | src/hooks/useProductSeoAI.ts:55 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 44 | `get-app-logs` | Consulta telemetria (dev) | src/components/admin/telemetry/AppLogsTable.tsx:69 | — | OK | CORS `*` inline. |
| 45 | `get-visitor-info` | Geo-IP do visitante | nenhum | — | ORFA | ip-api.com via HTTP (EDG-37). |
| 46 | `github-credentials-test` | Testa credenciais GitHub | src/components/admin/connections/GitHubCredentialsTester.tsx:53 | GITHUB_TOKEN/GITHUB_REPO/GITHUB_DEFAULT_BRANCH (DB/env) | ORFA | Testa integração sem consumidor (EDG-37). |
| 47 | `github-fix-config` | Reescreve tsconfig via API GitHub | nenhum | GITHUB_PAT | ORFA | Repo fixo `adm01-debug/gifts-store` (EDG-37). |
| 48 | `health-check` | Liveness do banco/catálogo | só scripts manuais (scripts/healthcheck.mjs:17) | EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY | ORFA | Sem monitor de uptime (EDG-45). |
| 49 | `image-proxy` | Proxy anti-hotlink de imagens | src/utils/imageProxy.ts:49 | — | OK | — |
| 50 | `kit-ai-builder` | Monta kit por prompt (IA) | src/components/kit-builder/KitAIPromptDialog.tsx:40 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem validação de JWT no handler (EDG-03). |
| 51 | `kit-identity-suggest` | Sugere identidade visual do kit | src/hooks/useKitIdentitySuggestion.ts:40 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem validação de JWT no handler (EDG-03). |
| 52 | `kit-public-view` | Visualização pública de kit | src/pages/PublicKitViewPage.tsx:45 | — | OK | CORS `*` inline. |
| 53 | `log-login-attempt` | Telemetria de tentativas de login | src/contexts/AuthContext.tsx:370; src/hooks/useIPValidation.ts:151 | — | OK | — |
| 54 | `magic-up-score` | Nota de qualidade criativa (IA) | src/hooks/useMagicUpGeneration.ts:231 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 55 | `manage-users` | CRUD e promoção de usuários | src/services/admin/UserService.ts:52,67; PromotionDialog.tsx:77 | — | OK | — |
| 56 | `market-intelligence-insights` | Insights comerciais com IA | src/components/intelligence/MarketIntelligenceInsightsCard.tsx:44 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Sem chave devolve fallback (EDG-02). |
| 57 | `materials-api` | Materiais do catálogo externo | src/services/materialService.ts:122 | EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY | PARCIAL | Sem env devolve vazio silencioso (EDG-06). |
| 58 | `mcp-keys-issue` | Emite chave MCP (step-up) | src/components/admin/connections/IssueMcpKeyForm.tsx:355 | — | OK | Depende do step-up (EDG-21). |
| 59 | `mcp-keys-revoke` | Revoga chave MCP | src/components/admin/security/keys/useMcpKeys.ts:242; McpTab.tsx:76 | — | OK | — |
| 60 | `mcp-keys-rotate` | Rotaciona chave MCP (step-up) | src/components/admin/security/keys/RotateMcpKeyDialog.tsx:105 | — | OK | Depende do step-up (EDG-21). |
| 61 | `mcp-keys-update` | Atualiza escopos/expiração MCP | src/components/admin/security/keys/UpdateMcpKeyDialog.tsx:221 | — | OK | — |
| 62 | `mcp-server` | Servidor MCP para assistentes IA | clientes MCP externos; URL exibida em McpTab.tsx:33 | — | PARCIAL | 4 ferramentas de leitura; escopos sem ferramenta (EDG-50). |
| 63 | `migrate-helper` | Endpoint inerte (410) | nenhum | — | ORFA | Fonte não publicável (seção 4). |
| 64 | `migration-health-check` | Checa migração cooperativas/PA | nenhum | — | ORFA | EDG-49. |
| 65 | `monthly-health-report` | Relatório mensal de saúde | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Não persiste nem envia (EDG-43/EDG-41). |
| 66 | `ownership-audit` | Varredura de registros órfãos | src/pages/admin/OwnershipAuditAdminPage.tsx:431 (falha: exige segredo interno) | INTERNAL_FUNCTION_SECRET | PARCIAL | Sem cron e botão manual quebrado (EDG-42). |
| 67 | `ownership-repair` | Reparo de órfãos (admin) | src/components/admin/OwnershipRepairDialog.tsx:77 | — | OK | — |
| 68 | `process-batch-export` | Gera exportações CSV/XLSX/PDF | cron `process-export-queue` (migr. 20260923111000:78) | INTERNAL_FUNCTION_SECRET, Vault: sicoob_project_url, sicoob_internal_function_secret | OK | PDF textual simplificado. |
| 69 | `process-queue` | Agrupa notificações não lidas | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | STUB/MOCK | Não processa nada (EDG-26). |
| 70 | `process-scheduled-reports` | Envia relatórios agendados | nenhum (sem cron) | RESEND_API_KEY, INTERNAL_FUNCTION_SECRET | ORFA | Duplicada; ignora escopo do usuário (EDG-24). |
| 71 | `product-webhook` | Endpoint inerte (410) | nenhum | — | ORFA | Publicado ocupando vaga (EDG-08). |
| 72 | `qa-block-monitor` | Monitor de bloqueios/RLS (dev) | nenhum | — | ORFA | Fonte não publicável (EDG-43). |
| 73 | `quote-approval` | Aprovação/assinatura pública orçamento | src/pages/QuoteApprovalPage.tsx:47; src/hooks/useQuoteApprovalToken.ts:40 | — | PARCIAL | Observação do cliente descartada (EDG-29). |
| 74 | `quote-followup-reminders` | Lembrete de orçamento não visto | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | ORFA | Marca is_sent sem enviar (EDG-25/EDG-41). |
| 75 | `quote-public-view` | Endpoint legado inerte (410) | src/pages/public-approval/usePublicQuoteApproval.ts:80 (página não roteada) | — | ORFA | EDG-08. |
| 76 | `quote-sync` | Sync legado orçamento→n8n/SalesPro | src/hooks/quotes/useQuotes.ts:264 (hook nunca usado) | N8N_QUOTE_WEBHOOK_URL, SALESPRO_WEBHOOK_URL, QUOTE_SYNC_API_KEY, EXTERNAL_CRM_URL (DB/env), EXTERNAL_CRM_SERVICE_ROLE_KEY (DB/env), EXTERNAL_CRM_ANON_KEY (DB/env) | ORFA | Sem auth no handler (EDG-11). |
| 77 | `rate-limit-check` | Consulta de rate-limit genérica | nenhum | — | ORFA | EDG-37. |
| 78 | `rls-audit` | Auditoria de RLS (dev) | src/components/admin/security/RlsAuditPanel.tsx:41 | — | OK | — |
| 79 | `rls-integration-tests` | Testes de RLS sob demanda | src/components/admin/RlsIntegrationTestsDialog.tsx:49 | — | OK | — |
| 80 | `rls-matrix-export` | Exporta matriz RLS CSV/PDF | src/pages/admin/OwnershipAuditAdminPage.tsx:456 | — | OK | — |
| 81 | `secrets-manager` | Cofre de credenciais de integração | src/hooks/useSecretsManager.ts:109 (+4) | — | PARCIAL | Aceita segredos que nenhuma função lê (EDG-14/EDG-16). |
| 82 | `secure-upload` | Upload com checagem VirusTotal | src/components/admin/ImageUploadButton.tsx:35; SecureUploadManager.tsx:70 | VIRUSTOTAL_API_KEY | PARCIAL | Só consulta hash; sem chave não varre (EDG-34). |
| 83 | `semantic-search` | Busca semântica global (IA) | src/components/search/useGlobalSearch.ts:97 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-01. |
| 84 | `send-digest` | Resumo periódico de notificações | nenhum (sem cron) | INTERNAL_FUNCTION_SECRET | STUB/MOCK | Só conta; não envia (EDG-22). |
| 85 | `send-notification` | Roteador omnichannel de notificações | nenhum | INTERNAL_FUNCTION_SECRET | ORFA | Saídas sem consumidor (EDG-23). |
| 86 | `send-scheduled-reports` | Envia relatórios agendados (dup.) | nenhum (sem cron) | RESEND_API_KEY, INTERNAL_FUNCTION_SECRET | ORFA | Marca "sent" sem enviar (EDG-24). |
| 87 | `send-transactional-email` | E-mail transacional de eventos | src/services/OrderService.ts:419; src/hooks/useTransactionalEmail.ts:21 (sem uso) | — | STUB/MOCK | Retorna 501 (EDG-20). |
| 88 | `sicoob-approval-notifications` | Worker da outbox de aprovações | cron (migr. 20260922224300:35, 20260922225500:37) | SICOOB_APPROVAL_WORKER_SECRET, Vault: sicoob_project_url, sicoob_approval_worker_secret, RESEND_API_KEY, NOTIFICATION_FROM_EMAIL, PUBLIC_APP_URL | BLOQUEADA_EXTERNA | Resend/Slack não homologados (EDG-21). |
| 89 | `sicoob-approval-reconciliation` | Reconciliação de entregas incertas | src/pages/admin/sicoob/SicoobApprovalReconciliationPage.tsx:29 | — | OK | — |
| 90 | `sicoob-artwork-register` | Registra identidade da arte | src/hooks/orders/extensions/useOrderPilotApprovals.ts:92 | — | OK | — |
| 91 | `sicoob-document-ingest` | Ingestão NF-e/comprovante com antivírus | src/services/sicoob/documentIngestService.ts:19 | SICOOB_MALWARE_SCANNER_URL, SICOOB_MALWARE_SCANNER_TOKEN | BLOQUEADA_EXTERNA | Scanner ausente → 503 (EDG-28). |
| 92 | `sicoob-kit-quote` | Orçamento de kit revalidado | src/pages/kit-builder/useKitBuilderQuote.ts:40 | — | OK | — |
| 93 | `sicoob-reorder` | Recompra de pedido/orçamento | src/services/QuoteService.ts:253,274; src/services/sicoob/orderService.ts:275,290 | — | OK | — |
| 94 | `sicoob-seed` | Seed de personas Sicoob | src/components/auth/QuickTestLogin.tsx:88 (não montado) | SICOOB_TEST_USER_PASSWORD, SICOOB_TEST_EMAIL_PA, SICOOB_TEST_EMAIL_SINGULAR, SICOOB_TEST_EMAIL_CENTRAL, SICOOB_TEST_EMAIL_GESTOR | ORFA | EDG-31. |
| 95 | `sicoob-seed-debug` | Diagnóstico de auth admin (dev) | nenhum | — | ORFA | Fonte não publicável (seção 4). |
| 96 | `sicoob-seed-qa` | Seed de contas QA | scripts/seed-qa.mjs:17 | SICOOB_QA_USER_PASSWORD | BLOQUEADA_EXTERNA | Segredo ausente no remoto (EDG-31). |
| 97 | `step-up-verify` | Desafio step-up senha+OTP e-mail | src/hooks/useStepUpAuth.ts:64,83 | RESEND_API_KEY, NOTIFICATION_FROM_EMAIL | BLOQUEADA_EXTERNA | OTP depende do Resend (EDG-21). |
| 98 | `sync-quote-bitrix` | Envia orçamento ao Bitrix via n8n | src/pages/quote-view/QuoteBitrixSync.ts:66 | N8N_QUOTE_WEBHOOK_URL, EXTERNAL_CRM_URL (DB/env), EXTERNAL_CRM_SERVICE_ROLE_KEY (DB/env), EXTERNAL_CRM_ANON_KEY (DB/env), EXTERNAL_PROMOBRIND_URL (DB/env), EXTERNAL_PROMOBRIND_SERVICE_ROLE_KEY (DB/env) | PARCIAL | EDG-12. |
| 99 | `system-healthcheck` | Saúde global (dev) | src/lib/cloud-status.ts:108 | VITE_EXTERNAL_DB_URL, VITE_CRM_BRIDGE_URL | STUB/MOCK | Auth sempre "healthy"; envs VITE_* (EDG-46). |
| 100 | `trends-insights` | Insights de tendências (IA) | src/components/intelligence/TrendsInsightsCard.tsx:39 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Resposta fixa sem tool_call (EDG-02). |
| 101 | `validate-access` | Valida IP/cidade no login | src/hooks/useIPValidation.ts:108 | — | OK | ip-api.com via HTTP (uso não comercial). |
| 102 | `verify-email` | Confirma e-mail por "token" | nenhum | — | ORFA | Token = UUID do usuário (EDG-32). |
| 103 | `visual-search` | Busca por imagem (IA) | src/components/search/VisualSearchButton.tsx:63 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | Fallback lê `products` local (EDG-07). |
| 104 | `voice-agent` | Comandos de voz com IA | src/hooks/voice/processTranscript.ts:17 | LOVABLE_API_KEY | BLOQUEADA_EXTERNA | EDG-51. |
| 105 | `webhook-dispatcher` | Dispara webhooks de saída HMAC | trigger dispatch_quote_webhook_event (migr. 20260927200500:99); WebhookPlaygroundPanel.tsx:52; FailedDeliveriesPanel.tsx:109 | WEBHOOK_DISPATCHER_SECRET, secret_ref dinâmico (OUTBOUND_WEBHOOK_SECRET_*) | PARCIAL | Disparo real sempre rejeitado (EDG-15/EDG-16). |
| 106 | `webhook-inbound` | Recebe webhooks de terceiros HMAC | terceiros (URL exibida em WebhooksTab.tsx:88) | hmac_secret_ref dinâmico (INBOUND_WEBHOOK_HMAC_*) | PARCIAL | Só registra; sem processamento (EDG-17). |

### Mapa de chamadas — síntese

- **Funções sem nenhum chamador** (src, outra função, migration/pg_cron, workflow, script de produção): `bitrix-sync`, `cleanup-notifications`, `cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`, `connections-health-check`, `e2e-auth-test`, `error-monitor`, `favorites-watcher`, `generate-mockup-nanobanana`, `get-visitor-info`, `github-fix-config`, `migrate-helper`, `migration-health-check`, `monthly-health-report`, `process-queue`, `process-scheduled-reports`, `product-webhook`, `qa-block-monitor`, `quote-followup-reminders`, `rate-limit-check`, `send-digest`, `send-notification`, `send-scheduled-reports`, `sicoob-seed-debug`, `verify-email` (26). `health-check` só é chamado por scripts manuais (`scripts/healthcheck.mjs:17`, `scripts/load-test.mjs:6`).
- **Chamadas apenas a partir de código morto**: `quote-public-view` (`src/pages/public-approval/usePublicQuoteApproval.ts:80`; `PublicQuoteApprovalPage` não está em `src/routes/config/public.ts`, que usa `QuoteApprovalPage` nas linhas 46/50/74), `quote-sync` (`src/hooks/quotes/useQuotes.ts:264`, `syncQuoteToBitrix` exportado e nunca consumido), `sicoob-seed` e `auth-integrity-check` (`src/components/auth/QuickTestLogin.tsx:53,88`, componente sem importador), `sendTransactionalEmail` (`src/hooks/useTransactionalEmail.ts:21`, sem importador).
- **Chamadas que falham por contrato**: `ownership-audit` pelo navegador (`src/pages/admin/OwnershipAuditAdminPage.tsx:431`) contra `requireInternalService` (`ownership-audit/index.ts:21`); trigger SQL → `webhook-dispatcher` sem segredo (`20260927200500_atomic_order_webhook_guard.sql:99-104` × `webhook-dispatcher/index.ts:70`); ~81 escritas do admin → `external-db-bridge` (`external-db-bridge/index.ts:480`).
- **Frontend chamando função inexistente**: nenhum caso em `src/`. Em teste: `e2e/flows/p0/04-checkout-blocked.spec.ts:11-14` simula falha de `create-order`, que não existe.
- **Chamadas entre funções**: só importação de módulos (`sicoob-reorder` → `sicoob-kit-quote/catalog.ts`; `sicoob-artwork-register` → `sicoob-document-ingest/inspection.ts`). Nenhuma Edge invoca outra por HTTP; o `send-notification` "disparo interno entre edges" (manifesto:105) não tem emissor.
- **pg_cron/pg_net que chamam Edge**: `connections-auto-test` e `external-db-bridge` (keepalive) — `20260923140000_secure_legacy_connection_crons.sql:111-126`; `process-batch-export` — `20260923111000_schedule_secure_export_worker.sql:78-82`; `sicoob-approval-notifications` — `20260922224300_schedule_sicoob_approval_worker.sql:35,58` e `20260922225500_monitor_sicoob_approval_worker.sql:37,99`; `webhook-dispatcher` — trigger (`20260927200500:99`) e cron `webhook-retry-failed` (`20260419132122_*.sql:64-71,144-148`). Migrations antigas ainda apontam para projetos de outra origem (`nmojwpihnslkssljowjh` em `20260424154125_*.sql:16` e `20260429163414_*.sql:28`; `bojgeppypmtormfjsyun` em `20260503155739_*.sql:29`), substituídas pelos despachantes do Vault.

### Segredos (`Deno.env.get`) — inventário e lacunas em `docs/secrets.md`

Lidos em código de produção: `ALLOW_HTTP_FETCH`, `BITRIX24_WEBHOOK_URL`, `BI_SHARE_SECRET`, `CNPJA_API_KEY`, `DROPBOX_ACCESS_TOKEN`, `E2E_CLEANUP_TOKEN`, `E2E_CLEANUP_ALLOWED_EMAILS`, `E2E_CLEANUP_RATE_LIMIT_MAX`, `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`, `ELEVENLABS_API_KEY`, `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY`, `GITHUB_PAT`, `INTERNAL_FUNCTION_SECRET`, `LOG_CREDENTIAL_RESOLUTION`, `LOG_CRM_BRIDGE_VERBOSE`, `LOVABLE_API_KEY`, `N8N_QUOTE_WEBHOOK_URL`, `NOTIFICATION_FROM_EMAIL`, `PUBLIC_APP_URL`, `QUOTE_SYNC_API_KEY`, `RESEND_API_KEY`, `SALESPRO_WEBHOOK_URL`, `SICOOB_APPROVAL_WORKER_SECRET`, `SICOOB_MALWARE_SCANNER_URL`, `SICOOB_MALWARE_SCANNER_TOKEN`, `SICOOB_QA_USER_PASSWORD`, `SICOOB_TEST_EMAIL_{PA,SINGULAR,CENTRAL,GESTOR}`, `SICOOB_TEST_USER_PASSWORD`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VIRUSTOTAL_API_KEY`, `VITE_EXTERNAL_DB_URL`, `VITE_CRM_BRIDGE_URL`, `WEBHOOK_DISPATCHER_SECRET`; nomes dinâmicos `outbound_webhooks.secret_ref` e `inbound_webhook_endpoints.hmac_secret_ref`; e, via `resolveCredential` (DB → env → alias, `_shared/credentials.ts:32-41,430-556`): `EXTERNAL_PROMOBRIND_{URL,SERVICE_ROLE_KEY,ANON_KEY}`, `EXTERNAL_CRM_{URL,SERVICE_ROLE_KEY,ANON_KEY}`, `BITRIX24_WEBHOOK_URL`, `N8N_BASE_URL`, `N8N_API_KEY`. Só em testes: `TEST_USER_JWT`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_ADMIN_JWT`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `CRM_SUPABASE_*`.

| Lido pelo código e **ausente** de `docs/secrets.md` | Onde |
|---|---|
| `WEBHOOK_DISPATCHER_SECRET` | `webhook-dispatcher/index.ts:70` (só citado em `supabase/config.toml:173-174`) |
| `SICOOB_MALWARE_SCANNER_URL`, `SICOOB_MALWARE_SCANNER_TOKEN` | `sicoob-document-ingest/index.ts:34-35` |
| `SICOOB_QA_USER_PASSWORD` | `sicoob-seed-qa/index.ts` |
| `EXTERNAL_PROMOBRIND_*` e `EXTERNAL_CRM_*` (nomes canônicos DB-first) | `external-db-bridge/index.ts:1635-1636`, `crm-db-bridge/index.ts:63-65`, `sync-quote-bitrix/index.ts:79-83`, `quote-sync/index.ts:21-23`, `expert-chat/index.ts:621-623` (o doc só lista os aliases legados) |
| `N8N_BASE_URL`, `N8N_API_KEY` | `_shared/connection-test-runner.ts:202-203` |
| `OUTBOUND_WEBHOOK_SECRET_*`, `INBOUND_WEBHOOK_HMAC_*` (dinâmicos) | `webhook-dispatcher/index.ts:109,198`; `webhook-inbound/index.ts:88`; gerados em `src/components/admin/connections/WebhooksTab.tsx:107,125` |
| `TEST_USER_JWT` (testes) | `external-db-bridge/lightweightSelect.e2e.test.ts`, `performance.test.ts` |

| Documentado e **sem leitor** em funções | Observação |
|---|---|
| `N8N_PRODUCT_WEBHOOK_SECRET` (`docs/secrets.md:32`) | `product-webhook` virou 410 |
| `WEBHOOK_HMAC_SECRET` (`docs/secrets.md:36`) | só `scripts/simulate-webhooks.mjs:8` |
| `TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER/WHATSAPP_NUMBER` (`docs/NOTIFICATION_SYSTEM.md:136-141`) | nenhum código |
| `BITRIX24_DOMAIN`, `BITRIX24_USER_ID`, `BITRIX24_TOKEN`, `MCP_SHARED_SECRET`, `GITHUB_TOKEN/REPO/DEFAULT_BRANCH` (allowlist `secrets-manager/index.ts:16-33`) | sem consumidor real (EDG-14) |

### As 6 fontes declaradas não publicáveis

| Fonte | O que representa | Substituta? | Conclusão |
|---|---|---|---|
| `e2e-auth-test` | Com JWT de dev, testa SELECT em `postos_atendimento` e `pa_budgets` e devolve o papel (`e2e-auth-test/index.ts:25-40`); retirada do runtime (`docs/execucao/evidencias/atomicidade-orcamento-e-inspecao-arte-20260927.md:64`). | Sim: `rls-integration-tests` (ligada em `RlsIntegrationTestsDialog.tsx:49`) e suítes RLS/E2E em CI. | Sem perda funcional. |
| `error-monitor` | Conta erros em `telemetry_query_performance` nos últimos 5 min e notifica admins se ≥10 (`error-monitor/index.ts:31-64`). | **Não.** Só o monitor específico da outbox Sicoob (`20260922225500_*.sql:99`). | Funcionalidade de alerta sem substituta; além disso exige JWT de supervisor (não roda por cron) e grava coluna `content` inexistente (EDG-43). |
| `generate-mockup-nanobanana` | Stub 410 (`index.ts:1-12`). | Sim: `generate-mockup` (`mockupGenerationService.ts:240`). | Sem perda; fonte morta (EDG-04). |
| `migrate-helper` | Stub 410 de ferramenta de migração desativada (`index.ts:1-6`). | Sim: workflow `apply-sicoob-migrations.yml` + ledger. | Sem perda. |
| `qa-block-monitor` | Detecta erros críticos, violações de RLS e telemetria parada em `query_telemetry` (`index.ts:21-56`); retirado por capacidade (`reconciliacao-online-2026-09-28.md:24`). | **Não** (só consulta manual via `get-app-logs`). | Monitor de vazamento de RLS sem substituto automático (EDG-43). |
| `sicoob-seed-debug` | Verifica se `auth.admin.listUsers` responde (`index.ts:13-26`). | Sim: `full-op-diagnostics`. | Sem perda. |

Observação: o manifesto marca `runtime: "source-only"` só em 4 delas (`edge-authz-manifest.ts:185,203,205,208`); `migrate-helper` (linha 55) e `generate-mockup-nanobanana` (linha 161) seguem como "deployed" no manifesto, contrariando a decisão de `fechamento-tecnico-2026-10-08.md:45`.

### Webhooks de entrada/saída: registro, fila e retry

| Fluxo | Registro | Fila | Retry | Situação |
|---|---|---|---|---|
| Saída `webhook-dispatcher` | Assinaturas em `outbound_webhooks` criadas pela UI (`WebhooksTab.tsx:107-110`); trigger `dispatch_quote_webhook_event` em `quotes`, `orders`, `discount_approval_requests`, `kit_share_tokens` (`20260419130037_*.sql:337-352`; corpo vigente `20260927200500_*.sql:4-110`) | Não há: chamada síncrona `extensions.http_post` com timeout de 5 s e erro engolido (`20260927200500:99-110`) | Em processo, com `sleep` de 5/30/120 s (`webhook-dispatcher/index.ts:182-239`); cron `webhook-retry-failed` a cada 10 min (`20260419132122_*.sql:144-148`); disjuntor após 5 falhas | **Quebrado**: trigger e cron não enviam `x-sicoob-internal-secret` (EDG-15) |
| Entrada `webhook-inbound` | Endpoints em `inbound_webhook_endpoints` via UI (`WebhooksTab.tsx:125-128`); nenhum seed | Apenas registro em `inbound_webhook_events`; nenhum consumidor | Responsabilidade do emissor (500 se não gravar, `index.ts:112-114`) | Sem processamento de negócio (EDG-17) |
| Orçamento → Bitrix `sync-quote-bitrix` | Botão na tela do orçamento (`QuoteBitrixSync.ts:66`) → `N8N_QUOTE_WEBHOOK_URL` | Não | Só disjuntor; E2E de "enfileirar para retry" está `test.skip` (`e2e/flows/p0/03-quote-blocked.spec.ts:11`) | Parcial (EDG-12) |
| `quote-sync` | Nenhum chamador vivo; `sync_all_pending` sem cron | Não | Não | Órfã (EDG-11) |
| `product-webhook` | — | — | — | 410 |
| `bitrix-sync` | Não registrado em nada | — | — | Órfã (EDG-10) |

### Documentação × diretório

- `docs/EDGE_FUNCTIONS.md` (inventário de 17/04, autodeclarado histórico na linha 3) lista 48 linhas; `tests` (linha 57) não é função. Documentadas inexistentes: **nenhuma**. Existentes não documentadas: **59** — `admin-audit-hook`, `auth-integrity-check`, `bi-copilot`, `bi-share-dossier`, `block-ip-temporarily`, `collections-public-react`, `collections-watcher`, `comparison-ai-advisor`, `comparison-price-watcher`, `comparisons-public-react`, `connection-tester`, `connections-auto-test`, `connections-health-check`, `connections-hub-audit`, `e2e-auth-test`, `e2e-cleanup`, `error-monitor`, `external-connections-sync`, `favorites-public-react`, `favorites-watcher`, `force-global-logout`, `full-op-diagnostics`, `get-app-logs`, `github-credentials-test`, `kit-ai-builder`, `kit-identity-suggest`, `magic-up-score`, `market-intelligence-insights`, `mcp-keys-issue`, `mcp-keys-revoke`, `mcp-keys-rotate`, `mcp-keys-update`, `mcp-server`, `migrate-helper`, `migration-health-check`, `monthly-health-report`, `ownership-audit`, `ownership-repair`, `process-batch-export`, `qa-block-monitor`, `quote-approval`, `quote-followup-reminders`, `rls-audit`, `rls-integration-tests`, `rls-matrix-export`, `secrets-manager`, `secure-upload`, `sicoob-approval-notifications`, `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote`, `sicoob-reorder`, `sicoob-seed`, `sicoob-seed-debug`, `sicoob-seed-qa`, `step-up-verify`, `system-healthcheck`, `webhook-inbound`.
- `docs/EDGE_FUNCTIONS_DRIFT.md` (03/05/2026) afirma 89 reais, 92 documentadas e "Nenhuma" divergência. Reaplicando a regra de `scripts/compare-edge-functions.mjs` ao `docs/INVENTARIO_FUNCIONALIDADES_v2.md` hoje: 106 reais e **17 ausentes do inventário** — `admin-audit-hook`, `error-monitor`, `external-connections-sync`, `get-app-logs`, `migrate-helper`, `monthly-health-report`, `process-batch-export`, `qa-block-monitor`, `quote-approval`, `sicoob-approval-notifications`, `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote`, `sicoob-reorder`, `sicoob-seed-qa`, `system-healthcheck`.
- `docs/RUNBOOK_CONNECTIONS.md:165-174` lista `quote-sync` e `quote-public-view` como dependentes do CRM; a primeira é órfã e a segunda responde 410.

## Itens

### IA

### EDG-01  Gateway de IA Lovable sem credencial confirmada (17 funções)
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md:31` (`LOVABLE_API_KEY` — "preencher"); `docs/FUNCIONALIDADES_E_FERRAMENTAS.md:1283` ("auto-configurado", verdade só no ambiente Lovable).
- Evidência no código: `Deno.env.get("LOVABLE_API_KEY")` em `ai-recommendations`, `analyze-logo-colors`, `bi-copilot`, `comparison-ai-advisor`, `expert-chat:584`, `generate-ad-image:61`, `generate-ad-prompt:26`, `generate-mockup:46`, `generate-product-seo:54`, `kit-ai-builder:31`, `kit-identity-suggest:70`, `magic-up-score:67`, `market-intelligence-insights:274`, `semantic-search:236`, `trends-insights:29`, `visual-search:58`, `voice-agent:39`; destino fixo `https://ai.gateway.lovable.dev/v1/chat/completions` (ex.: `market-intelligence-insights/index.ts:285`). Nenhuma evidência de paridade lista essa chave (`docs/execucao/evidencias/paridade-online-20260928.json`, bloco `segredos_conferidos_apenas_por_nome`).
- O que falta: confirmar a chave no projeto `cfmzkthhgliqelozlmwu` (a chave é emitida para projetos Lovable Cloud) ou migrar para provedor próprio com segredo dedicado; registrar teste real de uma chamada por função.
- Impacto no negócio: sem a chave, chat especialista, mockups, Magic Up, busca semântica/visual, BI copilot e voz ficam fora do ar ou respondem genérico.
- Esforço: M
- Prioridade: P1

### EDG-02  Respostas determinísticas/fixas quando a IA falha
- Status: STUB/MOCK
- Origem: comportamento de contingência não documentado como degradação ao usuário.
- Evidência no código: `ai-recommendations/index.ts:34-46,134-139` (sem chave devolve os 6 primeiros produtos com score 0,8→0,55 e texto padrão); `market-intelligence-insights/index.ts:274-278` (`buildFallback`, definido na linha 88); `trends-insights/index.ts:179-186` (texto fixo "em breve haverá padrões claros").
- O que falta: sinalizar `fallback:true` na UI de forma visível e registrar métrica; ou remover o fallback e exibir indisponibilidade.
- Impacto no negócio: vendedor recebe "recomendação" que é só a ordem da lista, sem saber que a IA não rodou.
- Esforço: P
- Prioridade: P3

### EDG-03  Funções de IA "authenticated" sem validação de JWT no handler
- Status: PARCIAL
- Origem: `_shared/edge-authz-manifest.ts:163-164,170,172` (categoria `authenticated`, `enforcedBy` padrão "shared-authorize").
- Evidência no código: `bi-copilot/index.ts`, `comparison-ai-advisor/index.ts`, `kit-ai-builder/index.ts`, `kit-identity-suggest/index.ts` não chamam `authorize`/`authenticateRequest`/`auth.getUser` (apenas CORS e a chave do gateway); `scripts/check-edge-authorization.mjs:11-15` só exige `authorize` para `supervisor`/`dev`.
- O que falta: validar sessão no handler (como `generate-ad-image` via `authenticateRequest`) e aplicar cota por usuário (`_shared/ai-usage.ts`).
- Impacto no negócio: qualquer portador da chave pública pode consumir créditos de IA da empresa, dependendo só do gateway.
- Esforço: P
- Prioridade: P1

### EDG-04  `generate-mockup-nanobanana` mantida como fonte morta
- Status: ORFA
- Origem: `docs/EDGE_FUNCTIONS.md:35` (ainda descrita como "Mockup via Gemini 3 Flash Image"); `edge-authz-manifest.ts:161` sem `runtime: "source-only"`.
- Evidência no código: `generate-mockup-nanobanana/index.ts:1-12` responde 410; consolidada em `generate-mockup`.
- O que falta: remover a fonte e a entrada do manifesto/docs, ou marcar `source-only`.
- Impacto no negócio: nenhum para o cliente; ruído de inventário.
- Esforço: P
- Prioridade: P3

### Catálogo / bridge

### EDG-05  Telas de administração do catálogo escrevem num catálogo somente leitura
- Status: PARCIAL
- Origem: catálogo externo `doufsxqlfjyuvxuezpln` declarado somente leitura (`_shared/external-read-only.ts:1-25`); telas admin de produto continuam publicadas.
- Evidência no código: `external-db-bridge/index.ts:480` (`CATALOG_READ_ONLY`, 403 para insert/update/delete/upsert/batch_insert); 81 chamadas de escrita em 24 arquivos de `src/`, p.ex. `src/components/admin/products/ProductMaterialsSection.tsx:168-198`, `kit-components/api.ts:25-132`, `video-gallery/useProductVideoGallery.ts:336-388`, `image-gallery/useProductImageGallery.ts:258-392`, `src/hooks/gravacao/useTecnicasGravacao.ts`, `src/hooks/useSupplierFiscalData.ts`, `src/pages/admin/AdminProductFormPage.tsx`; trechos de escrita mortos em `external-db-bridge/index.ts:890-920,1463`.
- O que falta: decisão de produto — esconder/remover as telas de edição ou criar um canal de escrita no sistema de origem do catálogo; remover o caminho de escrita morto do bridge.
- Impacto no negócio: administrador clica em salvar produto, foto, técnica ou fornecedor e recebe erro.
- Esforço: G
- Prioridade: P1

### EDG-06  Seis funções leem o catálogo só por variável de ambiente
- Status: PARCIAL
- Origem: `docs/RUNBOOK_CONNECTIONS.md:174` ("Todas usam `resolveCredential()` — DB-first") e `_shared/credentials.ts:32-41` (aliases).
- Evidência no código: `Deno.env.get('EXTERNAL_SUPABASE_URL'|'EXTERNAL_SUPABASE_SERVICE_KEY')` em `categories-api/index.ts:31-32`, `commemorative-dates/index.ts:54-58`, `materials-api/index.ts:58-73`, `external-db-inspect/index.ts:46-49`, `health-check/index.ts:37-38`, `expert-chat/index.ts:832-833,1092-1093`; `materials-api`, `commemorative-dates` e `external-db-inspect` devolvem payload vazio com HTTP 200 quando ausente.
- O que falta: trocar por `resolveCredential("EXTERNAL_PROMOBRIND_URL"/"_SERVICE_ROLE_KEY")` como no `external-db-bridge`; responder erro explícito em vez de lista vazia.
- Impacto no negócio: credencial salva em `/admin/conexoes` não vale para filtros de material, categorias e datas; a vitrine pode aparecer vazia sem alarme.
- Esforço: P
- Prioridade: P2

### EDG-07  Funções que leem `products` local (inexistente) e `price_history` não alimentado
- Status: PARCIAL
- Origem: `collections-watcher/index.ts:3-4`, `favorites-watcher/index.ts:3-4`, `comparison-price-watcher/index.ts:3-7` (alertas de queda de preço); `docs/execucao/evidencias/products_companies_fix_20260917.md` (front migrado para o catálogo externo).
- Evidência no código: `.from("products")` com cliente local em `collections-watcher/index.ts:73`, `favorites-watcher/index.ts:66`, `visual-search/index.ts:181-186` (fallback); o tipo gerado do banco canônico não tem tabela `products` (`src/integrations/supabase/types.ts`, só `price_history` na linha 6634); nenhuma rotina grava `price_history` a partir do catálogo externo (`product-webhook` está 410).
- O que falta: ler preços do catálogo externo via `createReadOnlyCatalogFetch`; definir processo que alimente `price_history`; só então agendar (EDG-41).
- Impacto no negócio: "avise-me quando baixar o preço" de favoritos, coleções e comparações não funciona; busca visual perde o plano B.
- Esforço: M
- Prioridade: P2

### EDG-08  Endpoints inertes (410) ainda publicados e página morta chamando um deles
- Status: ORFA
- Origem: `docs/EDGE_FUNCTIONS.md:21,47,48` descrevem `cleanup-novelties`, `product-webhook` e `quote-public-view` como ativos.
- Evidência no código: `cleanup-novelties/index.ts:1-8`, `product-webhook/index.ts:1-6`, `quote-public-view/index.ts:12-27` (todos 410); publicadas (não constam de `nao_publicadas` em `paridade-online-20260928.json`); `src/pages/public-approval/usePublicQuoteApproval.ts:80` ainda invoca `quote-public-view`, mas `PublicQuoteApprovalPage` não está roteada.
- O que falta: despublicar as 3 rotas (libera 3 das 100 vagas, EDG-55) e apagar `PublicQuoteApprovalPage`/`usePublicQuoteApproval`.
- Impacto no negócio: vagas de função ocupadas por endpoints que só dizem "desativado".
- Esforço: P
- Prioridade: P3

### EDG-09  Diagnóstico `creds_health` não expandido
- Status: PARCIAL
- Origem: `_shared/credentials.ts:254-255` ("currently crm-db-bridge; expand to quote-sync/expert-chat/quote-public-view in follow-up PRs").
- Evidência no código: `buildCredentialsHealth` só é usado em `crm-db-bridge/index.ts:198,847`.
- O que falta: expor `?op=creds_health` em `expert-chat` e `external-db-bridge` (as outras duas citadas viraram órfã/410).
- Impacto no negócio: diagnóstico de credencial do chat e do catálogo continua manual.
- Esforço: P
- Prioridade: P3

### CRM / Bitrix

### EDG-10  `bitrix-sync` sem chamador e com ações de deal não implementadas
- Status: ORFA
- Origem: `docs/CONNECTORS_INVENTORY.md:13-14` ("Sincronização de orçamentos e pedidos", "Importação de perfis de clientes e organizações"); `Bitrix24Tab.tsx:58` ("Sincronização automática de orçamentos e contatos com o Bitrix24").
- Evidência no código: nenhum `invoke('bitrix-sync')` (só rótulo em `src/components/navigation/Breadcrumbs.tsx:54`); `bitrix-sync/index.ts:9-17` aceita `create_deal`/`update_deal`, mas o `switch` não os trata e cai em `Unknown action` (`index.ts:573-577`); credencial lida só do ambiente (`index.ts:44-50`), ignorando a salva pela UI; tabelas `bitrix_clients`/`bitrix_deals` sem leitor no front (`src/hooks/useCrmCompanies.ts:3` "Substitui useClients (que usava bitrix_clients)").
- O que falta: decidir se a importação Bitrix→portal continua; se sim, agendar `sync_full`, implementar `create_deal`/`update_deal`, usar `resolveCredential`; se não, despublicar.
- Impacto no negócio: a "sincronização automática" prometida na tela de conexões não acontece.
- Esforço: M
- Prioridade: P2

### EDG-11  `quote-sync` legado: sem uso, sem autenticação e lendo a base errada
- Status: ORFA
- Origem: `docs/EDGE_FUNCTIONS.md:49` ("Sync de orçamento (interno)", JWT); manifesto `authenticated` (`edge-authz-manifest.ts:167`).
- Evidência no código: `quote-sync/index.ts:102-120` não valida usuário e usa service role; busca o orçamento no banco do CRM (`index.ts:245-258`), não no portal; integra SalesPro (`index.ts:331-350`); único chamador `src/hooks/quotes/useQuotes.ts:261-275` exportado e nunca usado.
- O que falta: despublicar (o fluxo vigente é `sync-quote-bitrix`) ou, se SalesPro for requisito, reescrever com auth e fonte correta.
- Impacto no negócio: endpoint exposto que pode disparar envios ao n8n/SalesPro sem controle; nenhum ganho atual.
- Esforço: P
- Prioridade: P2

### EDG-12  `sync-quote-bitrix`: fluxo ativo, porém incompleto
- Status: PARCIAL
- Origem: E2E "orçamento é salvo localmente e enfileirado para retry" (`e2e/flows/p0/03-quote-blocked.spec.ts:11`, `test.skip`); `docs/OBSERVABILITY.md` rota crítica `quote.syncBitrix`.
- Evidência no código: mapa fixo de 7 e-mails da Promo Brindes → ID de vendedor Bitrix (`sync-quote-bitrix/index.ts:11-19`), vendedor fora do mapa segue sem `seller_id` (`226-229`); cor nunca enviada (`item.color` em `265`, coluna é `color_name`); itens sem `bitrix_product_id` descartados (`246-254`); chamada ao n8n sem autenticação (`426-430`); sem fila/retry, apenas disjuntor; o ID devolvido é gravado pelo navegador (`src/pages/quote-view/QuoteBitrixSync.ts:81-87`); depende de `N8N_QUOTE_WEBHOOK_URL` (só env, `219-223`).
- O que falta: tabela de vínculo vendedor↔Bitrix no banco, corrigir `color_name`, assinar o webhook do n8n, fila durável com retry e persistência server-side do ID.
- Impacto no negócio: orçamento de vendedor novo entra no CRM sem responsável, sem cor e podendo perder itens; falha do n8n exige reenvio manual.
- Esforço: M
- Prioridade: P1

### EDG-13  Recebimento de eventos do Bitrix (leads/negócios)
- Status: NAO_INICIADA
- Origem: `docs/CONNECTORS_INVENTORY.md:15` ("Webhooks: Recebimento de atualizações de leads e negócios").
- Evidência no código: não existe handler Bitrix; `webhook-inbound` só grava evento genérico com HMAC (`webhook-inbound/index.ts:88-111`), formato que webhooks de saída do Bitrix24 não produzem (eles enviam token de aplicação no corpo — a confirmar com a conta Bitrix).
- O que falta: endpoint específico (validação por token de aplicação), mapeamento lead/deal → tabelas do portal e processamento.
- Impacto no negócio: mudanças de negociação feitas no CRM não voltam ao portal.
- Esforço: M
- Prioridade: P2

### EDG-14  Segredos cadastráveis na UI que nenhuma função usa
- Status: ORFA
- Origem: allowlist `secrets-manager/index.ts:16-33` e campos em `Bitrix24Tab.tsx:58`.
- Evidência no código: `BITRIX24_DOMAIN`, `BITRIX24_USER_ID`, `BITRIX24_TOKEN`, `MCP_SHARED_SECRET` sem nenhum leitor em `supabase/functions`; `GITHUB_TOKEN/REPO/DEFAULT_BRANCH` só testados por `github-credentials-test/index.ts:78-79`, enquanto `github-fix-config/index.ts:19` lê `GITHUB_PAT`.
- O que falta: remover da allowlist/UI ou ligar a um consumidor real.
- Impacto no negócio: administrador preenche credenciais que não fazem nada e acredita que a integração está configurada.
- Esforço: P
- Prioridade: P3

### n8n / webhooks

### EDG-15  Disparo de webhooks de saída sempre rejeitado
- Status: PARCIAL
- Origem: `docs/CONNECTORS_INVENTORY.md:26,32-33` (eventos `quote.created`/`order.created` assinados, retry com backoff); `supabase/config.toml:173-176`.
- Evidência no código: `webhook-dispatcher/index.ts:64-72` exige `WEBHOOK_DISPATCHER_SECRET` no cabeçalho `x-sicoob-internal-secret` para disparo operacional; o trigger `dispatch_quote_webhook_event` envia só `Content-Type` (`20260927200500_atomic_order_webhook_guard.sql:99-104`) e engole a exceção (`107-109`); o cron `webhook-retry-failed` envia `Authorization: Bearer` de `app.supabase_service_role_key` (`20260419132122_*.sql:30-40,64-71`), também sem o cabeçalho; como nada é registrado em `webhook_deliveries` no 401, nem o retry nem o replay da UI (`FailedDeliveriesPanel.tsx:109`) têm o que reprocessar. `WEBHOOK_DISPATCHER_SECRET` não está em `docs/secrets.md`. Só o modo teste (`WebhookPlaygroundPanel.tsx:52`) funciona.
- O que falta: despachante SQL que leia o segredo do Vault (padrão de `20260923140000`), atualizar o cron de retry, documentar o segredo, teste ponta a ponta.
- Impacto no negócio: nenhuma automação externa (n8n, ERP, Slack) recebe aviso de orçamento criado, pedido criado ou desconto aprovado.
- Esforço: P
- Prioridade: P1

### EDG-16  Segredos HMAC criados pela UI não chegam às funções
- Status: PARCIAL
- Origem: `docs/CONNECTORS_INVENTORY.md:33` ("Assinatura HMAC-SHA256 mandatória em todos os eventos").
- Evidência no código: a UI gera os nomes `OUTBOUND_WEBHOOK_SECRET_<ts>` e `INBOUND_WEBHOOK_HMAC_<slug>` (`WebhooksTab.tsx:107,125`) e o `secrets-manager` aceita esses prefixos gravando em `integration_credentials` (`secrets-manager/index.ts:35-38`), mas `webhook-dispatcher/index.ts:109,198` e `webhook-inbound/index.ts:88` usam apenas `Deno.env.get(secret_ref)`; sem segredo o dispatcher envia **sem** `X-Signature-256` e o inbound marca toda chamada como inválida (401).
- O que falta: resolver via `resolveCredential` (DB-first) e falhar fechado quando faltar segredo.
- Impacto no negócio: integrações de terceiros são recusadas e as nossas saem sem assinatura, abrindo espaço para falsificação.
- Esforço: P
- Prioridade: P1

### EDG-17  `webhook-inbound` registra, mas não processa
- Status: PARCIAL
- Origem: `docs/CONNECTORS_INVENTORY.md:27` ("Endpoints customizáveis para receber dados de terceiros").
- Evidência no código: grava em `inbound_webhook_events` com `processed: accepted` (`webhook-inbound/index.ts:101-111`), mas nenhum consumidor lê a tabela para agir (só o painel `src/components/admin/connections/InboundEventsPanel.tsx:172`); CORS `*` inline (`index.ts:8-12`); sem `verify_jwt = false` em `supabase/config.toml` (ver EDG-40); teste é placeholder (`supabase/functions/tests/webhook_test.ts:9-13`).
- O que falta: roteador por `source_system`/`event_type` com handlers de negócio, fila de processamento e reprocessamento.
- Impacto no negócio: dados enviados por parceiros ficam parados num log.
- Esforço: M
- Prioridade: P2

### EDG-18  n8n: gatilhos de workflow por evento e enriquecimento de pedidos
- Status: NAO_INICIADA
- Origem: `docs/CONNECTORS_INVENTORY.md:18-19`.
- Evidência no código: o único uso operacional de n8n é `N8N_QUOTE_WEBHOOK_URL` em `sync-quote-bitrix`/`quote-sync`; `N8N_BASE_URL`/`N8N_API_KEY` só servem ao ping de `_shared/connection-test-runner.ts:201-204`; não há chamada de enriquecimento.
- O que falta: definir eventos e contratos; reutilizar `webhook-dispatcher` (após EDG-15) para disparos e criar retorno de enriquecimento.
- Impacto no negócio: automações prometidas (ex.: enriquecer pedido, disparar fluxos) dependem de ação manual.
- Esforço: M
- Prioridade: P2

### EDG-19  Sem fila durável de webhooks: retry dentro da própria requisição
- Status: PARCIAL
- Origem: `docs/CONNECTORS_INVENTORY.md:32` ("Retry com backoff exponencial").
- Evidência no código: `webhook-dispatcher/index.ts:182-239` repete até 5 vezes com `setTimeout` de 5/30/120 s dentro da mesma execução (pode ultrapassar o tempo máximo da Edge; o trigger desiste após 5 s); retry externo depende do cron quebrado (EDG-15).
- O que falta: outbox de webhooks com lease e backoff (o padrão já existe em `sicoob_approval_deliveries`).
- Impacto no negócio: em instabilidade do destino, eventos se perdem sem rastro.
- Esforço: M
- Prioridade: P2

### E-mail / notificação

### EDG-20  E-mail transacional responde 501
- Status: STUB/MOCK
- Origem: `docs/EDGE_FUNCTIONS.md:55` ("Email transacional"); `docs/NOTIFICATION_SYSTEM.md:95` ("Email Notifications — Via Resend API ✅").
- Evidência no código: `send-transactional-email/index.ts:45-51` devolve 501 "O envio deste email ainda não está implementado" para `quote_sent`, `quote_approved`, `quote_rejected`, `order_created`, `sicoob_order_status_change`, `sicoob_order_approval_request` (`6-13`); chamado em `src/services/OrderService.ts:393-430` (`notifyStatusChange`), erro só vai ao console.
- O que falta: transporte durável com recibo (reaproveitar o padrão de `_shared/approval-delivery.ts`), modelos por evento, remetente Sicoob.
- Impacto no negócio: cliente e cooperativa não recebem e-mail de orçamento, aprovação, recusa ou mudança de status do pedido.
- Esforço: M
- Prioridade: P1

### EDG-21  Entrega via Resend não confirmada (aprovações Sicoob e OTP do step-up)
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md:25-27` ("configuração remota ainda não verificada"); `docs/execucao/notificacoes-duraveis-20260922.md:53-62` (homologar Slack/Resend com destinos de teste — não executado).
- Evidência no código: `_shared/approval-delivery.ts:55-56` e `_shared/step-up-otp-delivery.ts:33-37` exigem `RESEND_API_KEY` e `NOTIFICATION_FROM_EMAIL`; `sicoob-approval-notifications/index.ts:35-37` exige `SICOOB_APPROVAL_WORKER_SECRET` (presente segundo `paridade-online-20260928.json`); `step-up-verify` usa o OTP para liberar emissão/rotação de chaves MCP.
- O que falta: confirmar segredos, domínio remetente verificado no Resend, webhook Slack real e teste ponta a ponta com recibo.
- Impacto no negócio: aprovadores podem não ser avisados de pedidos pendentes e operações sensíveis com step-up ficam travadas.
- Esforço: P
- Prioridade: P1

### EDG-22  Digest de notificações configurável na UI, mas nunca enviado
- Status: STUB/MOCK
- Origem: `src/components/settings/NotificationPreferences.tsx:53-54` ("Diário (Todo dia às 08:00)", "Semanal"); `docs/NOTIFICATION_SYSTEM.md:105`; `docs/EDGE_FUNCTIONS.md:52`.
- Evidência no código: `send-digest/index.ts:27-63` só agrupa e conta não lidas, não envia nada nem lê `notification_digests`; `send-notification/index.ts:89-91,150-171` grava em `notification_digests`, que ninguém consome; sem cron (EDG-41).
- O que falta: consumidor de `notification_digests` com envio por e-mail e agendamento.
- Impacto no negócio: usuário ativa "resumo diário" e nunca recebe nada.
- Esforço: M
- Prioridade: P2

### EDG-23  Omnichannel de notificações e canais push/SMS/WhatsApp
- Status: NAO_INICIADA
- Origem: `docs/NOTIFICATION_SYSTEM.md:24,95-99,136-141` (Push "estrutura pronta", SMS/WhatsApp Twilio); tabela `notification_channels` com `'email','push','whatsapp','sms'` e provedores `sendgrid/fcm/twilio` (`20260504210817_*.sql:2-9`).
- Evidência no código: `send-notification` (DND, agendamento, digest) não tem chamador; grava `scheduled_notifications` (`index.ts:136-147`) sem despachante; registra `channel: 'push'` em `notification_logs` mas só insere notificação interna (`index.ts:107-130`); nenhum código Twilio/FCM/Web Push em `src/` ou `supabase/functions`.
- O que falta: despachante de `scheduled_notifications`, adaptadores de canal com segredos próprios, ligar emissores a `send-notification`.
- Impacto no negócio: avisos ficam restritos ao sino do portal; nada chega por celular ou WhatsApp.
- Esforço: G
- Prioridade: P2

### EDG-24  Relatórios agendados: UI cria, ninguém envia
- Status: ORFA
- Origem: `src/components/reports/ScheduledReportsManager.tsx` (montado em `src/pages/CustomizableDashboard.tsx:72`) e `src/hooks/useScheduledReports.ts`; `docs/EDGE_FUNCTIONS.md:46,54`.
- Evidência no código: duas funções para o mesmo trabalho, ambas sem cron: `process-scheduled-reports` (consulta orçamentos/pedidos de **todos** os vendedores sem filtrar `user_id`, `index.ts:49-93`; ignora resposta do Resend, `101-113`) e `send-scheduled-reports` (marca `sent` mesmo sem `RESEND_API_KEY`, `index.ts:51-70`); remetente fixo "Promo Gifts <noreply@promogifts.com.br>" (`process-…:108`, `send-…:167`); tipos `clients`/`products` oferecidos na UI não têm geração.
- O que falta: manter uma só função, filtrar pelo dono, remetente Sicoob, falhar quando não enviar, implementar tipos faltantes e agendar.
- Impacto no negócio: gestor agenda relatório e não recebe; se ligado como está, pode receber dados de outros vendedores.
- Esforço: M
- Prioridade: P2

### EDG-25  Lembrete de follow-up marca "enviado" sem enviar
- Status: PARCIAL
- Origem: `quote-followup-reminders/index.ts:1-5` ("Cria notificações para vendedores…").
- Evidência no código: insere em `follow_up_reminders` com `is_sent: true` e `sent_at` (`index.ts:69-80`) sem notificação, e-mail ou push; sem cron (EDG-41).
- O que falta: notificar o vendedor (workspace_notifications/e-mail) e agendar.
- Impacto no negócio: orçamentos sem visualização do cliente esfriam sem alerta ao vendedor.
- Esforço: P
- Prioridade: P2

### EDG-26  `cleanup-notifications` e `process-queue` redundantes/vazias
- Status: STUB/MOCK
- Origem: `docs/EDGE_FUNCTIONS.md:20,45` ("Job pg_cron").
- Evidência no código: `cleanup-notifications/index.ts:31-38` chama a mesma RPC já agendada em SQL (`20260916120000_admin_audit_log_operations.sql:92`); `process-queue/index.ts:27-72` só conta não lidas e devolve números.
- O que falta: despublicar ambas (liberam vagas, EDG-55) ou dar a `process-queue` um papel real (ex.: despachante de EDG-23).
- Impacto no negócio: nenhum direto; ocupam capacidade e confundem a operação.
- Esforço: P
- Prioridade: P3

### EDG-27  Alerta de novo dispositivo sem e-mail e sem autenticação
- Status: PARCIAL
- Origem: tabela `device_login_notifications.email_sent` (`20260521103842_*.sql:118`); `docs/EDGE_FUNCTIONS.md:25`.
- Evidência no código: `detect-new-device/index.ts:98-106` grava `email_sent: false` e nunca envia; aceita `userId`/`userEmail` do corpo sem validar sessão (`13-17,42-46`) e usa service role para criar notificação.
- O que falta: validar JWT e usar `auth.user.id`; enviar e-mail de alerta.
- Impacto no negócio: titular não é avisado de login suspeito; terceiros podem gerar alertas falsos para qualquer conta.
- Esforço: P
- Prioridade: P2

### Sicoob

### EDG-28  Envio de NF-e e comprovante de entrega bloqueado pelo antivírus ausente
- Status: BLOQUEADA_EXTERNA
- Origem: manifesto (`edge-authz-manifest.ts:153-157`) e fluxo de logística (`src/components/sicoob/orders/OrderLogisticsTab.tsx:11`, `src/hooks/orders/extensions/useOrderInvoices.ts:4`).
- Evidência no código: `sicoob-document-ingest/index.ts:34-35` lê `SICOOB_MALWARE_SCANNER_URL`/`SICOOB_MALWARE_SCANNER_TOKEN`; `scanner.ts:25` responde 503 "Scanner antimalware obrigatório não configurado"; ambos "ausente" em `docs/execucao/evidencias/paridade-online-20260928.json` (`segredos_conferidos_apenas_por_nome`); segredos não documentados em `docs/secrets.md`.
- O que falta: contratar/provisionar o scanner, configurar os segredos e documentá-los; teste com PDF/XML reais.
- Impacto no negócio: fornecedor/operação não consegue anexar nota fiscal nem comprovante de entrega; o ciclo do pedido não fecha.
- Esforço: M
- Prioridade: P0

### EDG-29  Aprovação pública descarta a observação do cliente
- Status: PARCIAL
- Origem: contrato `submit_quote_response(_response_notes)` (`src/integrations/supabase/types.ts:12901-12904`).
- Evidência no código: `quote-approval/index.ts:34,70` valida `notes` (até 2000 caracteres), mas não o repassa à RPC `submit_signed_quote_response` (`77-81`), que não tem parâmetro de observação; `seller: null` fixo na resposta (`68`); front não envia `notes` (`src/pages/QuoteApprovalPage.tsx:47-54`).
- O que falta: parâmetro de observação na RPC assinada e campo no formulário; dados do vendedor na projeção pública.
- Impacto no negócio: o cliente recusa sem poder dizer por quê, e não vê com quem falar.
- Esforço: P
- Prioridade: P2

### EDG-30  Pipeline de publicação cobre 7 de 100 funções
- Status: PARCIAL
- Origem: `docs/DEPLOYMENT.md:24-30` (deploy manual) e `AGENTS.md` ("Pronto = ligado em produção").
- Evidência no código: `.github/workflows/deploy-sicoob-functions.yml:42-52,58-66` publica e confere só `expert-chat`, `external-db-bridge`, `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote`, `sicoob-reorder`; `sicoob-approval-notifications`, `quote-approval`, `process-batch-export` e as demais dependem de publicação manual.
- O que falta: publicação versionada (lista derivada do manifesto `runtime: deployed`) com verificação de versão.
- Impacto no negócio: correções podem ficar no GitHub sem chegar ao ar, sem alarme.
- Esforço: P
- Prioridade: P2

### EDG-31  Seeds e diagnóstico de QA sem caminho de uso
- Status: ORFA
- Origem: `SICOOB_TESTING.md`; `scripts/seed-qa.mjs:17`.
- Evidência no código: `sicoob-seed` e `auth-integrity-check` só chamados por `QuickTestLogin` (`src/components/auth/QuickTestLogin.tsx:53,88`), componente sem importador; `sicoob-seed-qa` exige `SICOOB_QA_USER_PASSWORD`, "ausente" no remoto (`paridade-online-20260928.json`, `segredo_seed_qa`).
- O que falta: decidir se as personas de QA são recriadas por script (configurar o segredo) e despublicar o que não for usado.
- Impacto no negócio: nenhum para cliente; ocupa vagas e superfície de ataque de funções privilegiadas.
- Esforço: P
- Prioridade: P3

### Segurança / auth

### EDG-32  `verify-email` confirma e-mail de qualquer conta pelo UUID
- Status: ORFA
- Origem: `docs/EDGE_FUNCTIONS.md:60` ("Verificação de email no signup"); manifesto público (`edge-authz-manifest.ts:67`).
- Evidência no código: `verify-email/index.ts:34-45` trata o "token" como ID do usuário (`auth.admin.getUserById(token)`) e marca `email_confirm: true`; sem chamador no front.
- O que falta: despublicar e remover; a confirmação nativa do Supabase Auth já cobre o caso.
- Impacto no negócio: brecha que permite ativar contas sem posse do e-mail.
- Esforço: P
- Prioridade: P1

### EDG-33  Desafio WebAuthn no servidor (`webauthn-challenge`)
- Status: NAO_INICIADA
- Origem: `docs/AUTH_PASSKEYS.md:8,15,29` (criar Edge `webauthn-challenge`, verificar assinatura com `@simplewebauthn/server`).
- Evidência no código: não existe a função; `src/hooks/useWebAuthn.ts` e `src/components/security/PasskeyManager.tsx` operam só no cliente.
- O que falta: funções de desafio/verificação de registro e asserção (precisa de vaga — EDG-55).
- Impacto no negócio: passkeys oferecidas na tela não têm validação de servidor; não servem como fator forte.
- Esforço: M
- Prioridade: P2

### EDG-34  `secure-upload` não varre arquivos de fato
- Status: PARCIAL
- Origem: manifesto ("Upload com scan VirusTotal anti-malware", `edge-authz-manifest.ts:177`).
- Evidência no código: consulta só o hash no VirusTotal (`secure-upload/index.ts:81-86`); arquivo desconhecido é liberado ("Permitido upload inicial", `101-103`); sem `VIRUSTOTAL_API_KEY` não há verificação alguma (`75-77`); devolve URL pública (`163-165`).
- O que falta: submissão do arquivo ou o mesmo scanner obrigatório de EDG-28, falha fechada sem chave.
- Impacto no negócio: imagens e artes enviadas por usuários podem carregar malware sem detecção.
- Esforço: M
- Prioridade: P2

### EDG-35  `dropbox-list`: credencial ausente, sem renovação e sem autenticação
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md:23` (`DROPBOX_ACCESS_TOKEN` — "preencher").
- Evidência no código: `dropbox-list/index.ts:34-46` lê token estático; não há fluxo de refresh; aceita qualquer `path` (`5-8`) sem verificar usuário (manifesto "público", `edge-authz-manifest.ts:79`).
- O que falta: app Dropbox com refresh token, restrição de pasta e autenticação.
- Impacto no negócio: biblioteca de arquivos curados fica indisponível; se configurada como está, expõe a conta inteira.
- Esforço: P
- Prioridade: P2

### EDG-36  `cnpj-lookup` depende de `CNPJA_API_KEY` não configurada
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md:22` ("preencher").
- Evidência no código: `cnpj-lookup/index.ts:57-60` responde erro sem a chave; chamada em `src/utils/cnpj-lookup.ts:27` (cadastro de fornecedor).
- O que falta: contratar/configurar a chave CNPJá.
- Impacto no negócio: cadastro de fornecedor sem preenchimento automático por CNPJ.
- Esforço: P
- Prioridade: P2

### EDG-37  Utilitários órfãos publicados
- Status: ORFA
- Origem: `docs/EDGE_FUNCTIONS.md:37,38,50`.
- Evidência no código: `get-visitor-info` e `rate-limit-check` sem chamador; `github-fix-config/index.ts:19-20` grava no repositório fixo `adm01-debug/gifts-store` com `GITHUB_PAT`; `github-credentials-test` valida `GITHUB_TOKEN/REPO` sem consumidor (`index.ts:78-79`); `get-visitor-info` e `validate-access` usam `http://ip-api.com` (plano gratuito não comercial, `validate-access/index.ts:22-23`).
- O que falta: despublicar os quatro; trocar o provedor de geolocalização de `validate-access`.
- Impacto no negócio: superfície de ataque e vagas consumidas sem retorno.
- Esforço: P
- Prioridade: P3

### EDG-38  Dossiê BI compartilhável sem criação de link e sem conteúdo
- Status: PARCIAL
- Origem: rota pública `/dossie/:token` (`src/routes/config/public.ts:61,85`; `src/lib/rbac/route-matrix.ts:54`).
- Evidência no código: POST que cria o token (`bi-share-dossier/index.ts:127-170`) sem chamador; a página só exibe o payload do token (`src/pages/PublicDossierPage.tsx:42-60`); sem `BI_SHARE_SECRET` a assinatura usa a service role (`index.ts:14`).
- O que falta: botão "compartilhar dossiê" no BI, conteúdo do dossiê na página pública e segredo dedicado obrigatório.
- Impacto no negócio: vendedor não consegue enviar o dossiê do cliente por link.
- Esforço: P
- Prioridade: P2

### EDG-39  Padrão de CORS não aplicado
- Status: PARCIAL
- Origem: `docs/EDGE_FUNCTIONS.md:77` ("Sempre importar CORS de `_shared/cors.ts` — nunca declarar inline").
- Evidência no código: CORS `*` declarado inline em 28 funções — em 26 como cabeçalho efetivo (ex.: `cleanup-notifications/index.ts:4-7`, `webhook-inbound/index.ts:8-12`, `sicoob-approval-notifications/index.ts:6-9`, `mcp-server/index.ts:14`, `secure-upload/index.ts:5-8`) e em 2 só como fallback (`expert-chat/index.ts:513-516`, `external-db-bridge/index.ts:448-452`); a allowlist aceita qualquer `*.lovable.app`/`*.lovableproject.com` e usa origem de fallback Lovable (`_shared/cors.ts:4-27,45-46`); não há domínio de produção do portal.
- O que falta: padronizar via `getCorsHeaders`, remover curingas Lovable e incluir o domínio definitivo.
- Impacto no negócio: qualquer site hospedado na Lovable pode chamar as APIs pelo navegador de um usuário logado.
- Esforço: P
- Prioridade: P2

### EDG-40  `config.toml` não declara gateway das funções com autenticação própria
- Status: PARCIAL
- Origem: `supabase/config.toml:1-77`; manifesto com `gatewayVerifyJwt` só em 2 entradas (`edge-authz-manifest.ts:130,136`).
- Evidência no código: `webhook-inbound` (HMAC), `mcp-server` (`x-mcp-key`, `mcp-server/index.ts:125,461`), `kit-public-view`, `image-proxy`, `bi-share-dossier`, `*-public-react`, `health-check` não têm `[functions.<nome>]`; o padrão é `verify_jwt = true`, que exige JWT Supabase de quem chama.
- O que falta: declarar `verify_jwt = false` onde a autenticação é própria e conferir o estado remoto (a confirmar).
- Impacto no negócio: parceiros e clientes MCP sem JWT do Supabase podem ser barrados antes do código.
- Esforço: P
- Prioridade: P2

### Saúde / monitoramento

### EDG-41  13 rotinas "de cron" sem agendamento
- Status: ORFA
- Origem: manifesto `edge-authz-manifest.ts:93-109` ("pg_cron diário", "pg_cron — price drop watcher" etc.); `docs/EDGE_FUNCTIONS.md:20,45,46,52`; comentário "cron-driven (every 15min)" em `connections-health-check/index.ts:3`.
- Evidência no código: nenhuma migration, workflow ou função agenda/chama `cleanup-notifications`, `collections-watcher`, `favorites-watcher`, `comparison-price-watcher`, `process-queue`, `process-scheduled-reports`, `send-scheduled-reports`, `send-digest`, `quote-followup-reminders`, `connections-health-check`, `ownership-audit`, `monthly-health-report`, `send-notification` (busca por nome em `supabase/migrations` = 0). Todas exigem `INTERNAL_FUNCTION_SECRET`, então só um despachante do Vault poderia chamá-las. A UI de incidentes espera o cron (`src/components/admin/connections/useRecentIncidents.ts:4-10`).
- O que falta: decidir quais permanecem, criar despachantes `dispatch_sicoob_*` como em `20260923140000`, e despublicar as demais.
- Impacto no negócio: alertas de preço, relatórios, lembretes, incidentes de integração e auditorias automáticas simplesmente não acontecem.
- Esforço: P
- Prioridade: P1

### EDG-42  Auditoria de órfãos: botão "Executar agora" sempre falha
- Status: PARCIAL
- Origem: `ownership-audit/index.ts:3-10` ("Invocada via cron diário … ou manualmente por admin").
- Evidência no código: `requireInternalService` em `ownership-audit/index.ts:21`; o admin chama do navegador em `src/pages/admin/OwnershipAuditAdminPage.tsx:428-445`, sem como enviar o segredo → 401/503; sem cron (EDG-41).
- O que falta: caminho admin com `authorize(supervisor)` e caminho cron com segredo.
- Impacto no negócio: registros sem dono não são detectados nem sob demanda.
- Esforço: P
- Prioridade: P2

### EDG-43  Monitores de erro sem execução e sem substituto
- Status: PARCIAL
- Origem: `docs/OBSERVABILITY.md:52-62`; manifesto "fonte preservada para futura republicação" (`edge-authz-manifest.ts:185`).
- Evidência no código: `error-monitor` (fonte não publicável) exige JWT de supervisor e insere coluna `content` inexistente em `workspace_notifications` (`error-monitor/index.ts:57-64`; schema exige `message`); `qa-block-monitor` (não publicável) só devolve JSON; `monthly-health-report/index.ts:57-75` calcula e não grava nem envia, e reporta SLA 100% sem pedidos (`53-55`).
- O que falta: um monitor agendado único que persista resultado e notifique (corrigindo a coluna), dentro da capacidade disponível.
- Impacto no negócio: rajadas de erro e vazamentos de RLS só são notados quando alguém abre o painel.
- Esforço: M
- Prioridade: P2

### EDG-44  Alertas Sentry e gates de observabilidade das Edge Functions
- Status: NAO_INICIADA
- Origem: `docs/OBSERVABILITY.md:52-75` (alertas "5xx burst (edge)", "Webhook outbound failing", "AI gateway saturation", cron consultando `get_webhook_delivery_summary`) e `:121-124` (gate de propagação de request-id; "Webhook Alerts → Sentry via cron job").
- Evidência no código: nenhuma Edge envia a Sentry (`_shared/structured-logger.ts:96-102` só `console.*`); `get_webhook_delivery_summary` sem chamador (`docs/execucao/evidencias/funcoes_orfas_20260917.md`); `scripts/check-edge-request-id-propagation.mjs` não está em workflow nem `package.json`.
- O que falta: drenagem dos logs das Edges para Sentry/alerta, regras de alerta e ligar o gate no CI.
- Impacto no negócio: falhas de integração e de IA são descobertas pelo cliente, não pela equipe.
- Esforço: M
- Prioridade: P2

### EDG-45  `health-check` sem monitor de disponibilidade
- Status: ORFA
- Origem: manifesto "Health endpoint para uptime monitors" (`edge-authz-manifest.ts:63`).
- Evidência no código: só scripts manuais chamam a rota (`scripts/healthcheck.mjs:17`, `scripts/load-test.mjs:6`, `scripts/smoke-tests.mjs:14`); `scripts/check-edge-functions-health.mjs` não está em CI; nenhum monitor externo versionado; a checagem do catálogo usa `EXTERNAL_SUPABASE_*` só do ambiente (EDG-06).
- O que falta: monitor de disponibilidade (externo ou workflow agendado) com alerta.
- Impacto no negócio: indisponibilidade do portal ou do catálogo não gera aviso.
- Esforço: P
- Prioridade: P2

### EDG-46  `system-healthcheck` com resultado fixo
- Status: STUB/MOCK
- Origem: chamado pelo status de nuvem (`src/lib/cloud-status.ts:108`).
- Evidência no código: `system-healthcheck/index.ts:63-64` marca `auth` sempre "healthy"; verifica `VITE_EXTERNAL_DB_URL`/`VITE_CRM_BRIDGE_URL` (`67,87`), nomes de variável de build que não existem no ambiente da Edge → "skipped".
- O que falta: checagem real de Auth e dos bridges (`external-db-bridge`/`crm-db-bridge` `?op=ping`).
- Impacto no negócio: painel mostra "saudável" mesmo com login ou integrações fora.
- Esforço: P
- Prioridade: P3

### EDG-47  `connections-hub-audit` aprova sem verificar e executa rotinas
- Status: STUB/MOCK
- Origem: `IntegrationsHealthCard.tsx:251` (auditoria do hub).
- Evidência no código: funções obrigatórias sempre `ok: true, detail: "registered"` (`connections-hub-audit/index.ts:103-108`); a "checagem de cron" executa `retry_failed_webhook_deliveries` e `cleanup_webhook_logs` (`84-101`), apagando logs ao auditar; regra `ok` só é falsa em erro de permissão (`98`).
- O que falta: consultar `cron.job` via RPC de leitura, testar funções por ping e remover efeitos colaterais.
- Impacto no negócio: relatório verde enganoso sobre webhooks que estão quebrados (EDG-15).
- Esforço: P
- Prioridade: P2

### EDG-48  Teste de conexão "MCP" fingido
- Status: STUB/MOCK
- Origem: aba MCP de `/admin/conexoes`.
- Evidência no código: `_shared/connection-test-runner.ts:210-215` só conta chaves não revogadas e devolve `ok: true` sem chamar o `mcp-server`.
- O que falta: chamada `ping` real ao `mcp-server` com chave de teste.
- Impacto no negócio: conexão MCP aparece "ok" mesmo se o servidor estiver fora.
- Esforço: P
- Prioridade: P3

### EDG-49  `migration-health-check` sem chamador
- Status: ORFA
- Origem: manifesto (`edge-authz-manifest.ts:65`).
- Evidência no código: nenhum chamador; só teste do contrato (`tests/edge-functions/migration-health-check.test.ts:2`).
- O que falta: ligar a um painel dev ou despublicar.
- Impacto no negócio: nenhum direto; vaga ocupada.
- Esforço: P
- Prioridade: P3

### MCP

### EDG-50  `mcp-server` expõe só 4 ferramentas de leitura
- Status: PARCIAL
- Origem: `docs/CONNECTORS_INVENTORY.md:23` ("estoque, status de pedido"); escopos `products:read`, `code:read`, `code:write` em `_shared/mcp-scopes.ts:8-16`; comentário de ferramentas `write/admin` em `mcp-server/index.ts:4,170-198`.
- Evidência no código: só `list_quotes`, `get_quote`, `list_companies` (lê nomes de `quotes`, não o CRM), `list_recent_orders` e `ping` (`mcp-server/index.ts:276-365`); nenhuma ferramenta de estoque/produto nem de escrita; leituras com service role sem recorte por organização.
- O que falta: ferramentas de catálogo/estoque e status de pedido, CRM real via bridge, recorte por escopo de dados, e remover escopos sem ferramenta.
- Impacto no negócio: assistentes de IA não respondem disponibilidade de produto, só listam orçamentos.
- Esforço: M
- Prioridade: P2

### Mídia / imagem

Sem item adicional: mockup, Magic Up e análise de logo estão cobertos por EDG-01 (gateway), EDG-04 (Nano Banana), EDG-07 (fallback da busca visual) e EDG-34 (upload). `image-proxy` está ligado (`src/utils/imageProxy.ts:49`).

### Voz

### EDG-51  Voz depende de ElevenLabs e do gateway de IA
- Status: BLOQUEADA_EXTERNA
- Origem: `docs/secrets.md:24` (`ELEVENLABS_API_KEY` — "preencher").
- Evidência no código: `elevenlabs-scribe-token` e `elevenlabs-tts` leem `ELEVENLABS_API_KEY`; `voice-agent/index.ts:39-40` exige `LOVABLE_API_KEY`; chamadas em `src/hooks/voice/scribeTokenCache.ts:43`, `playTtsAudio.ts:104`, `processTranscript.ts:17`.
- O que falta: contas/chaves configuradas e teste real de transcrição e síntese.
- Impacto no negócio: comandos por voz não funcionam.
- Esforço: P
- Prioridade: P3

### Governança (documentação, segredos, capacidade)

### EDG-52  `docs/EDGE_FUNCTIONS.md` desatualizado
- Status: PARCIAL
- Origem: `docs/EDGE_FUNCTIONS.md:3` (remete ao manifesto como fonte).
- Evidência no código: 59 funções não documentadas; `tests` listado como função (`:57`); 410 descritos como ativos (`:21,47,48`); "Job pg_cron" sem cron (`:20,45,46,52`); `send-transactional-email` como funcional (`:55`); categorias divergentes do manifesto (ex.: `ai-recommendations` "Public" × `authenticated`; `categories-api`/`materials-api`/`cnpj-lookup` "JWT" × `public`).
- O que falta: gerar a tabela a partir do manifesto + mapa de chamadas, no CI.
- Impacto no negócio: quem opera confia num inventário que não reflete o sistema.
- Esforço: P
- Prioridade: P3

### EDG-53  Relatório de divergência obsoleto e scripts fora do CI
- Status: PARCIAL
- Origem: `docs/EDGE_FUNCTIONS_DRIFT.md:1-13` (03/05/2026, "Nenhuma" divergência).
- Evidência no código: hoje 106 funções e 17 ausentes do inventário (seção "Documentação × diretório"); `scripts/compare-edge-functions.mjs`, `check-edge-functions-health.mjs`, `fix-edge-cors-allowlist.mjs`, `migrate-edge-cors-allowlist.mjs` sem uso em workflow/`package.json`; `_shared/validate.ts` sem importador; `supabase/functions/graphify-out/` vazio.
- O que falta: rodar a comparação no CI e regenerar o relatório; limpar artefatos.
- Impacto no negócio: drift volta a acontecer sem aviso.
- Esforço: P
- Prioridade: P3

### EDG-54  Inventário de segredos incompleto e verificador não criado
- Status: PARCIAL
- Origem: `docs/secrets.md:7-9` (coluna "Configurado em" a preencher) e `:96-99` (`scripts/check-secrets-inventory.mjs`, "a criar").
- Evidência no código: o script não existe; 9 segredos lidos e não documentados e 4 documentados sem leitor (tabelas da seção "Segredos").
- O que falta: criar o verificador no CI e preencher a coluna de configuração por ambiente.
- Impacto no negócio: integrações quebram por segredo esquecido e só se descobre em produção.
- Esforço: P
- Prioridade: P2

### EDG-55  Capacidade esgotada: 106 fontes para 100 vagas
- Status: PARCIAL
- Origem: `docs/execucao/reconciliacao-online-2026-09-28.md:24-26` (HTTP 402 no limite de 100 funções).
- Evidência no código: 100 publicadas, 6 fora; ao menos 14 publicadas são inertes ou órfãs (`cleanup-novelties`, `product-webhook`, `quote-public-view`, `cleanup-notifications`, `process-queue`, `send-digest`, `quote-sync`, `verify-email`, `get-visitor-info`, `rate-limit-check`, `github-fix-config`, `github-credentials-test`, `migration-health-check`, um dos dois de relatórios).
- O que falta: plano de despublicação/consolidação para abrir espaço a `webauthn-challenge`, monitores e handlers de webhook.
- Impacto no negócio: qualquer funcionalidade nova de backend fica bloqueada por falta de vaga.
- Esforço: P
- Prioridade: P2

### EDG-56  Testes e scripts de integração placeholder
- Status: STUB/MOCK
- Origem: cobertura de webhooks e health declarada em `docs/OBSERVABILITY.md:121-124` e E2E P0.
- Evidência no código: `supabase/functions/tests/webhook_test.ts:9-13` (`assertEquals(1, 1)`); `_shared/tests/integration.test.ts:4-15` (scaffold com asserções triviais); `scripts/simulate-webhooks.mjs:5` importa `{ crypto } from 'crypto'` (exportação inexistente; o script falha ao assinar); E2E P0 em `test.skip` incluindo função inexistente `create-order` (`e2e/flows/p0/04-checkout-blocked.spec.ts:11-14`).
- O que falta: testes reais de `webhook-inbound`/`webhook-dispatcher` e dos cenários P0.
- Impacto no negócio: regressões nas integrações passam pelo CI sem serem pegas.
- Esforço: M
- Prioridade: P3

## Fontes lidas

- Documentação: `AGENTS.md`; `docs/EDGE_FUNCTIONS.md`; `docs/EDGE_FUNCTIONS_DRIFT.md`; `docs/CONNECTORS_INVENTORY.md`; `docs/RUNBOOK_CONNECTIONS.md`; `docs/secrets.md`; `docs/DEPLOYMENT.md`; `docs/OBSERVABILITY.md` (seções 4–8); `docs/NOTIFICATION_SYSTEM.md` (trechos); `docs/AUTH_PASSKEYS.md`; `docs/INVENTARIO_FUNCIONALIDADES_v2.md` (comparação automática); `docs/plano-melhorias-50-etapas.md` (busca por etapas de edge/segredos); `docs/execucao/fechamento-tecnico-2026-10-08.md`; `docs/execucao/reconciliacao-online-2026-09-28.md`; `docs/execucao/notificacoes-duraveis-20260922.md`; `docs/execucao/aplicacao-migrations-20260923.md`; `docs/execucao/evidencias/paridade-online-20260928.json`; `docs/execucao/evidencias/funcoes_orfas_20260917.md`; `docs/execucao/evidencias/products_companies_fix_20260917.md`.
- Configuração e CI: `supabase/config.toml`; `.github/workflows/deploy-sicoob-functions.yml`, `ci.yml`, `e2e.yml` (trechos), varredura de `scripts`/`secrets` em todos os workflows; `package.json` (scripts).
- Código das funções: `index.ts` de todas as 106 funções (leitura integral das inertes, de cron, de webhooks, Bitrix/n8n, notificação, monitoramento, seeds, segurança e MCP; leitura dirigida das de IA, Sicoob e bridges); `_shared/edge-authz-manifest.ts`, `cors.ts`, `internal-service-auth.ts`, `credentials.ts`, `connection-test-runner.ts`, `connection-timeouts.ts`, `external-read-only.ts`, `approval-delivery.ts`, `step-up-otp-delivery.ts`, `structured-logger.ts`; `supabase/functions/tests/*`, `_shared/tests/*`.
- Migrations: todas as 15 com `cron.schedule`/`net.http_post`, em especial `20260419130037`, `20260419132122`, `20260424154125`, `20260429163414`, `20260503155739`, `20260504210817`, `20260916120000`, `20260922224300`, `20260922225500`, `20260923111000`, `20260923140000`, `20260927200500`; busca por nome de cada função em `supabase/migrations`.
- Frontend (mapa de chamadas): busca de `functions.invoke(`, `getSupabaseFunctionUrl(`, `functions/v1/` e constantes de nome em `src/`, com leitura dos chamadores citados; `src/integrations/supabase/types.ts` (tabelas `workspace_notifications`, `query_telemetry`, `telemetry_query_performance`, ausência de `products`); `src/routes/config/public.ts`.
- Scripts: `scripts/check-edge-authorization.mjs`, `compare-edge-functions.mjs`, `check-edge-functions-health.mjs`, `simulate-webhooks.mjs`, `healthcheck.mjs`; testes `e2e/flows/p0/03-quote-blocked.spec.ts`, `04-checkout-blocked.spec.ts`, `tests/p0/webhooks-resilience.test.ts`.
- Ferramentas auxiliares (fora do repo): `<scripts-da-auditoria>/callmap.mjs`, `fnscan.mjs`, `authscan.mjs`, `matrix.mjs`.
