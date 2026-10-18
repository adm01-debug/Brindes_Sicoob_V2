/**
 * Manifest SSOT — Authorization requirements per Edge Function
 * --------------------------------------------------------------
 * Cada edge function deployada deve aparecer aqui com sua categoria
 * de autorização. Este manifest é a fonte de verdade consumida pelo
 * gate de CI (`scripts/check-edge-authorization.mjs`) e pelos testes
 * de bypass (`tests/security/edge-authz-bypass.test.ts`).
 *
 * Categorias:
 *   - "public":          chamável sem autenticação (rotas públicas por token,
 *                        webhooks com assinatura, health, image-proxy etc.).
 *   - "authenticated":   exige JWT válido, qualquer role (incl. agente).
 *   - "supervisor":      exige role >= supervisor (admin/dev).
 *   - "dev":             exige role dev.
 *   - "service":         só pode ser chamada server-to-server (cron / outra edge),
 *                        validando segredo interno dedicado antes do service_role.
 *   - "scoped":          autenticação custom (token/HMAC/scope MCP) — validada
 *                        in-function com lógica própria.
 *
 * Política: TODA edge nova precisa ser adicionada aqui no mesmo PR
 * que cria a função. O gate CI falha se houver função em
 * `supabase/functions/<name>/index.ts` ausente do manifest.
 */
export type AuthzCategory =
  | "public"
  | "authenticated"
  | "supervisor"
  | "dev"
  | "service"
  | "scoped";

export interface AuthzEntry {
  /** Categoria principal */
  category: AuthzCategory;
  /** Comentário curto explicando a decisão */
  rationale: string;
  /**
   * Mecanismo de enforcement. Default = "shared-authorize" (helper SSOT).
   * "custom" = implementação própria legítima (validação inline de
   * has_role, scope MCP, HMAC, etc.) — exige rationale claro.
   */
  enforcedBy?: "shared-authorize" | "custom";
  /** Se true, o teste de bypass anon é dispensado */
  skipAnonBypassTest?: boolean;
  /** Se true, o teste de bypass authenticated é dispensado */
  skipAuthBypassTest?: boolean;
  /** Presença esperada no runtime canônico; o padrão é deployed. */
  runtime?: "deployed" | "source-only";
  /**
   * Contrato explícito do gateway. Quando omitido, o publicador canônico usa
   * `false`, preservando o runtime atual; a autorização continua obrigatória
   * no handler conforme a categoria declarada acima.
   */
  gatewayVerifyJwt?: boolean;
}

export const EDGE_AUTHZ_MANIFEST: Record<string, AuthzEntry> = {
  // ---------------- Públicas por design ----------------
  "migrate-helper": { category: "public", rationale: "Função desativada: retorna somente HTTP 410, sem acesso a ambiente ou banco", runtime: "source-only" },
  "kit-public-view": { category: "public", rationale: "Visualização de kit por token público" },
  "quote-public-view": { category: "public", rationale: "Endpoint legado inerte: retorna 410 sem acessar dados, credenciais ou rede" },
  "favorites-public-react": { category: "public", rationale: "Reactions anônimas em lista pública" },
  "comparisons-public-react": { category: "public", rationale: "Reactions em comparação pública" },
  "collections-public-react": { category: "public", rationale: "Reactions em coleção pública" },
  "image-proxy": { category: "public", rationale: "Proxy de imagens (anti-hotlink CDN externos)" },
  "cnpj-lookup": { category: "public", rationale: "Lookup CNPJ via API pública" },
  "health-check": { category: "public", rationale: "Liveness sem dependências internas para uptime monitors", gatewayVerifyJwt: false },
  "system-healthcheck": { category: "dev", rationale: "Diagnóstico global revela topologia e latência internas" },
  "migration-health-check": { category: "dev", rationale: "Metadados administrativos restritos a desenvolvedor" },
  "get-visitor-info": { category: "public", rationale: "Geo/IP do visitante para anti-fraude" },
  "verify-email": {
    category: "authenticated",
    rationale: "Endpoint legado inerte; confirmação ocorre somente pelo fluxo assinado do Supabase Auth",
    gatewayVerifyJwt: true,
  },
  "log-login-attempt": { category: "public", rationale: "Telemetria de login (anti-bruteforce)" },
  "auth-integrity-check": { category: "dev", rationale: "Diagnóstico restrito à administração técnica" },
  "rate-limit-check": { category: "public", rationale: "Rate-limit consult anonymous" },
  "commemorative-dates": { category: "public", rationale: "Calendário público" },
  "categories-api": { category: "public", rationale: "Catálogo de categorias público" },
  "materials-api": { category: "public", rationale: "Catálogo de materiais público" },
  "analyze-logo-colors": { category: "public", rationale: "Extração de cores via foto pública" },
  "visual-search": { category: "public", rationale: "Busca por imagem (anônima)" },
  "semantic-search": { category: "public", rationale: "Busca semântica (anônima)" },
  "detect-new-device": { category: "public", rationale: "Anti-fraude pré-login" },
  "bi-share-dossier": { category: "public", rationale: "Dossiê compartilhado por token" },
  "dropbox-list": { category: "public", rationale: "Listagem pública de arquivos curados" },
  "quote-approval": {
    category: "public",
    rationale: "Aprovação/assinatura de orçamento pelo cliente via token público (quote_approval_tokens) + rate limit",
    enforcedBy: "custom",
    skipAnonBypassTest: true,
  },

  // ---------------- Webhooks (assinatura própria) ----------------
  "webhook-inbound": { category: "scoped", rationale: "HMAC-SHA256 inline" },
  "webhook-dispatcher": { category: "scoped", rationale: "Disparo interno com segredo; teste/replay exigem supervisor", enforcedBy: "custom" },
  "product-webhook": { category: "public", rationale: "Endpoint inerte: retorna 410, sem acesso a dados ou segredos" },

  // ---------------- Cron / service-to-service ----------------
  "cleanup-notifications": { category: "service", rationale: "pg_cron diário" },
  "cleanup-novelties": { category: "public", rationale: "Função inerte: responde 410 sem acessar dados ou segredos" },
  "collections-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "favorites-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "comparison-price-watcher": { category: "service", rationale: "pg_cron — price drop watcher" },
  "process-queue": { category: "service", rationale: "pg_cron — fila de jobs" },
  "process-scheduled-reports": { category: "service", rationale: "pg_cron — relatórios" },
  "monthly-health-report": { category: "service", rationale: "Relatório mensal protegido por segredo interno dedicado", enforcedBy: "custom" },
  "process-batch-export": { category: "service", rationale: "Processamento de exportações protegido por segredo interno dedicado", enforcedBy: "custom" },
  "send-scheduled-reports": { category: "service", rationale: "pg_cron — envio batch" },
  "send-digest": { category: "service", rationale: "pg_cron — digest semanal" },
  "quote-followup-reminders": { category: "service", rationale: "pg_cron — followup orçamentos" },
  "send-notification": { category: "service", rationale: "Disparo interno entre edges protegido por segredo dedicado", enforcedBy: "custom" },
  "connections-health-check": { category: "service", rationale: "pg_cron — health connections" },
  "connections-auto-test": { category: "service", rationale: "pg_cron — auto-test connections" },
  "connections-hub-audit": { category: "dev", rationale: "Auditoria administrativa autenticada por papel dev" },
  "ownership-audit": { category: "service", rationale: "pg_cron diário — auditoria órfãos" },
  "sicoob-approval-notifications": {
    category: "service",
    rationale: "Worker periódico da outbox de aprovações; autentica com segredo dedicado e usa a service role somente no banco",
    enforcedBy: "custom",
    skipAnonBypassTest: true,
  },

  // ---------------- Authenticated (qualquer user logado) ----------------
  "admin-audit-hook": {
    category: "authenticated",
    rationale: "Registra eventos de auditoria do usuário logado (valida JWT via auth.getUser inline)",
    enforcedBy: "custom",
  },
  "ai-recommendations": { category: "authenticated", rationale: "Recomendações IA do user logado" },
  "elevenlabs-scribe-token": { category: "authenticated", rationale: "Token TTS do user" },
  "elevenlabs-tts": { category: "authenticated", rationale: "TTS do user" },
  "expert-chat": {
    category: "authenticated",
    rationale: "Chat IA do user; valida JWT dentro do handler para aceitar publishable keys",
    enforcedBy: "custom",
    gatewayVerifyJwt: false,
  },
  "external-db-bridge": {
    category: "authenticated",
    rationale: "Bridge para BD externo; valida JWT e RBAC dentro do handler para aceitar publishable keys",
    enforcedBy: "custom",
    gatewayVerifyJwt: false,
  },
  "sicoob-reorder": {
    category: "authenticated",
    rationale: "Revalida usuário, pedido e catálogo antes de chamar a RPC interna de recompra",
    enforcedBy: "custom",
    gatewayVerifyJwt: true,
  },
  "sicoob-kit-quote": {
    category: "authenticated",
    rationale: "Revalida usuário, composição, estoque, preço e personalização antes de chamar a RPC interna de orçamento do kit",
    enforcedBy: "custom",
    gatewayVerifyJwt: true,
  },
  "sicoob-artwork-register": {
    category: "authenticated",
    rationale: "Baixa a arte privada sob RLS, calcula sua identidade criptográfica e chama a RPC interna exclusiva de serviço",
    enforcedBy: "custom",
    gatewayVerifyJwt: true,
  },
  "sicoob-document-ingest": {
    category: "authenticated",
    rationale: "Valida JWT e escopo do pedido antes de inspecionar, escanear e promover documentos privados",
    enforcedBy: "custom",
    gatewayVerifyJwt: true,
  },
  "generate-ad-image": { category: "authenticated", rationale: "Magic Up Ads do user" },
  "generate-ad-prompt": { category: "authenticated", rationale: "Magic Up Ads do user" },
  "generate-mockup": { category: "authenticated", rationale: "Mockup IA do user" },
  "generate-mockup-nanobanana": { category: "authenticated", rationale: "Stub 410 legado consolidado em generate-mockup; preservado apenas como fonte histórica", runtime: "source-only" },
  "generate-product-seo": { category: "authenticated", rationale: "SEO de produto do user" },
  "kit-ai-builder": { category: "authenticated", rationale: "Kit IA do user" },
  "kit-identity-suggest": { category: "authenticated", rationale: "Sugestão visual do user" },
  "magic-up-score": { category: "authenticated", rationale: "Scoring criativo do user" },
  "voice-agent": { category: "authenticated", rationale: "Voice agent do user" },
  "quote-sync": { category: "authenticated", rationale: "Sync do orçamento do próprio vendedor" },
  "sync-quote-bitrix": { category: "authenticated", rationale: "Sync do orçamento do vendedor" },
  "trends-insights": { category: "authenticated", rationale: "Insights do BI" },
  "comparison-ai-advisor": { category: "authenticated", rationale: "Conselheiro IA na comparação" },
  "market-intelligence-insights": { category: "authenticated", rationale: "BI insights" },
  "bi-copilot": { category: "authenticated", rationale: "BI copilot" },
  "send-transactional-email": { category: "authenticated", rationale: "Envio de e-mail trans (user logado)" },
  "step-up-verify": { category: "authenticated", rationale: "MFA step-up — quem está fazendo" },
  "validate-access": { category: "authenticated", rationale: "Validação de acesso pós-login" },
  "force-global-logout": { category: "authenticated", rationale: "Logout global do próprio user" },
  "secure-upload": { category: "authenticated", rationale: "Upload com scan VirusTotal anti-malware — exige JWT (uso de SERVICE_ROLE_KEY interno; auditoria em file_scan_logs com user_id obrigatório)" },

  // ---------------- Supervisor (admin) ----------------
  "bitrix-sync": { category: "supervisor", rationale: "Sync no CRM externo — admin/dev", enforcedBy: "shared-authorize" },
  "manage-users": { category: "supervisor", rationale: "Gestão de usuários via has_role inline", enforcedBy: "custom" },
  "block-ip-temporarily": { category: "supervisor", rationale: "Bloqueio de IP — has_role inline", enforcedBy: "custom" },
  "ownership-repair": { category: "supervisor", rationale: "Reparo de órfãos com autorização central e validação adicional na RPC", enforcedBy: "shared-authorize" },
  "sicoob-approval-reconciliation": { category: "supervisor", rationale: "Reconciliação auditada de notificações incertas ou falhas", enforcedBy: "shared-authorize", gatewayVerifyJwt: true },
  "error-monitor": { category: "supervisor", rationale: "Monitoramento de erros e alertas de sistema; fonte preservada para futura republicação", enforcedBy: "shared-authorize", runtime: "source-only" },
  "external-connections-sync": { category: "supervisor", rationale: "Sincroniza credenciais externas por uma fronteira administrativa autenticada", enforcedBy: "shared-authorize", gatewayVerifyJwt: true },

  // ---------------- Dev-only ----------------
  "secrets-manager": { category: "dev", rationale: "is_dev() inline check", enforcedBy: "custom" },
  "connection-tester": { category: "dev", rationale: "is_dev() inline check", enforcedBy: "custom" },
  "github-credentials-test": { category: "dev", rationale: "is_dev() inline check", enforcedBy: "custom" },
  "github-fix-config": { category: "dev", rationale: "Escreve no repo via PAT — dev only", enforcedBy: "shared-authorize" },
  "external-db-inspect": { category: "dev", rationale: "Inspeção de metadados do catálogo restrita a dev", enforcedBy: "shared-authorize" },
  "rls-audit": { category: "dev", rationale: "Auditoria via usuário dev ou service_role com alvo administrativo explícito", enforcedBy: "shared-authorize" },
  "rls-integration-tests": { category: "dev", rationale: "Testes RLS — dev/cron only", enforcedBy: "custom" },
  "rls-matrix-export": { category: "dev", rationale: "Export matriz — has_role inline", enforcedBy: "custom" },
  "e2e-cleanup": { category: "scoped", rationale: "Cleanup E2E — segredo dedicado, allowlist, rate limit e escopo por usuário", enforcedBy: "custom" },
  "full-op-diagnostics": { category: "dev", rationale: "Diagnóstico — has_role(dev) inline", enforcedBy: "custom" },
  "mcp-keys-issue": { category: "dev", rationale: "MCP keys — has_role(dev) + step-up token", enforcedBy: "custom" },
  "mcp-keys-revoke": { category: "dev", rationale: "MCP keys — has_role(dev) inline", enforcedBy: "custom" },
  "mcp-keys-rotate": { category: "dev", rationale: "MCP keys — has_role(dev) + step-up token", enforcedBy: "custom" },
  "mcp-keys-update": { category: "dev", rationale: "MCP keys — has_role(dev) inline", enforcedBy: "custom" },
  "e2e-auth-test": { category: "dev", rationale: "Teste de fluxo auth preservado como fonte local; não publicado no runtime canônico", enforcedBy: "shared-authorize", runtime: "source-only" },
  "get-app-logs": { category: "dev", rationale: "Acesso a logs estruturados via console dev", enforcedBy: "shared-authorize" },
  "qa-block-monitor": { category: "dev", rationale: "Monitor de bloqueios preservado como fonte local; retirado do runtime por capacidade", enforcedBy: "shared-authorize", runtime: "source-only" },
  "sicoob-seed": { category: "dev", rationale: "Seed do módulo Sicoob; exige dev e senha injetada no ambiente", enforcedBy: "shared-authorize" },
  "sicoob-seed-qa": { category: "dev", rationale: "Seed QA do módulo Sicoob; exige dev e senha injetada no ambiente", enforcedBy: "shared-authorize" },
  "sicoob-seed-debug": { category: "dev", rationale: "Diagnóstico sanitizado preservado como fonte local; não publicado no runtime canônico", enforcedBy: "shared-authorize", runtime: "source-only" },

  // ---------------- Scoped (auth custom) ----------------
  "mcp-server": { category: "scoped", rationale: "Token MCP com escopos read/write/admin", enforcedBy: "custom" },
  "crm-db-bridge": { category: "scoped", rationale: "JWT + RBAC custom interno", enforcedBy: "custom" },
};
