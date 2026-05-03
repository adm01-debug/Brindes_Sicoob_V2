# Inventário Exaustivo de Funcionalidades v2 — Promo Gifts

> Documento técnico-executivo atualizado em 2026-05-03.
> Reflete o estado real da plataforma Promo Gifts (Catálogo B2B + Vertical Sicoob).

## 1. Resumo Executivo
A **Promo Gifts** é uma plataforma B2B dual-mode (Catálogo Geral + Especialização Sicoob) de alta performance. 

**Números Reais:**
- **~80+ páginas/rotas** (Públicas, Catálogo, App, Sicoob, Admin, Dev)
- **150+ hooks customizados**
- **600+ componentes** modulares
- **~80 tabelas** no banco de dados com RLS estrito
- **~90 Edge Functions** (IA, Integrações, Automações, Segurança)
- **5 perfis de acesso** (`admin`, `vendedor`, `gestor_compras`, `gerente_pa`, `dev`)

## 2. Visão Geral do Sistema
Plataforma multi-tenant com separação lógica e visual via **Skins Factory**. 
- **SSOT (Single Source of Truth):** Banco de dados externo para dados de produtos e estoque. O banco local (Supabase) atua como cache e persistência de dados de aplicação (pedidos, orçamentos, perfis).
- **Arquitetura Multi-DB:** Conexão com Supabase Local, Catálogo Externo e CRM DB.
- **Multimodal:** Suporte a áudio, IA generativa e assistentes conversacionais.
- **Master Index:** Toda a arquitetura está mapeada no [Master Module Index (MODULES.md)](docs/MODULES.md).

## 3. Perfis de Usuário e Governança
| Papel | Escopo | Rotas Chave |
|-------|--------|-------------|
| **`gerente_pa`** | Operação de Postos de Atendimento Sicoob | `/sicoob/pedidos`, `/meus-pedidos` |
| **`gestor_compras`** | Aprovação e gestão de verbas | `/orcamentos/dashboard`, `/orcamentos` |
| **`vendedor`** | Gestão de pedidos, logística e CRM | `/orcamentos`, `/painel-kpis` |
| **`admin`** | Gestão de usuários, cadastros de negócio e CMS | `/admin/usuarios`, `/admin/cadastros` |
| **`dev`** | Operações técnicas, segurança e telemetria | `/admin/telemetria`, `/admin/seguranca`, `/admin/conexoes` |

## 4. Módulos de Destaque
- **Comparação 10/10:** Score IA, radar de atributos, duel mode, share público, sparklines 30d.
- **Coleções & Favoritos:** Paridade total, listas públicas, reações anônimas, watcher de preços.
- **Kit Maker:** Wizard de montagem de kits com motion design, sugestão de identidade visual via IA.
- **Magic Up Advertising:** Geração automática de banners e criativos via IA, scoring de anúncios.
- **Quote Builder:** Precisão de 4 casas decimais, assinatura eletrônica, aprovação pública, templates.
- **CRM Bridge:** Integração bidirecional robusta com Bitrix24 e SalesPro via `crm-db-bridge`.
- **MCP Security:** Gestão de chaves, auditoria de uso, auto-revogação por papel e diagnóstico de telemetria.
- **App Health:** Telemetria em tempo real, health dashboard e monitoramento de latência de RPCs.

## 5. Lista de Edge Functions (~90)
A plataforma conta com uma vasta camada de lógica serverless, categorizada abaixo:

### IA & Multimodalidade
- `ai-recommendations`, `bi-copilot`, `comparison-ai-advisor`, `generate-ad-image`, `generate-ad-prompt`, `generate-mockup`, `generate-mockup-nanobanana`, `generate-product-seo`, `kit-ai-builder`, `kit-identity-suggest`, `semantic-search`, `voice-agent`, `trends-insights`, `visual-search`, `elevenlabs-tts`, `elevenlabs-scribe-token`, `analyze-logo-colors`.

### Integrações & Sync
- `bitrix-sync`, `crm-db-bridge`, `external-db-bridge`, `external-db-inspect`, `product-webhook`, `quote-sync`, `sync-quote-bitrix`, `bi-share-dossier`, `dropbox-list`, `github-credentials-test`, `github-fix-config`.

### Segurança & Governança (MCP)
- `auth-integrity-check`, `block-ip-temporarily`, `mcp-keys-issue`, `mcp-keys-revoke`, `mcp-keys-rotate`, `mcp-keys-update`, `mcp-server`, `rls-audit`, `validate-access`, `step-up-verify`, `ownership-audit`, `ownership-repair`, `force-global-logout`, `log-login-attempt`, `detect-new-device`.

### Monitoramento & Saúde
- `health-check`, `full-op-diagnostics`, `connection-tester`, `connections-auto-test`, `connections-health-check`, `connections-hub-audit`, `migration-health-check`, `rls-integration-tests`, `rls-matrix-export`, `process-queue`, `process-scheduled-reports`.

### Comunicação & Notificação
- `send-notification`, `send-digest`, `send-scheduled-reports`, `send-transactional-email`, `quote-followup-reminders`, `cleanup-notifications`, `verify-email`.

### Public Share (React Templates)
- `collections-public-react`, `comparisons-public-react`, `favorites-public-react`, `kit-public-view`, `quote-public-view`.

### Utilidades & Outros
- `cnpj-lookup`, `image-proxy`, `categories-api`, `materials-api`, `commemorative-dates`, `expert-chat`, `get-visitor-info`, `magic-up-score`, `manage-users`, `market-intelligence-insights`, `sicoob-seed`, `sicoob-seed-debug`, `webhook-dispatcher`, `webhook-inbound`.

## 6. Arquitetura de Segurança e Observabilidade
- **RLS First:** Políticas em todas as tabelas, audit trail imutável via triggers.
- **MFA Enforcement:** Autorização baseada em AAL2 e step-up tokens.
- **Observabilidade:** Logs estruturados JSON, correlação via `X-Request-Id`, alertas Sentry via monitor cron em rotas críticas.
- **Anti-Scraping:** Detecção de bots, rate limiting agressivo (`rate-limit-check`) e proteção contra hotlinking.

---
*Este inventário é a fonte de verdade para a governança do projeto.*
