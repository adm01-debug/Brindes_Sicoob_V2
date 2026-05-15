# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### 🚀 Hardening 10/10 (Onda 3 - Performance & Segurança de Ativos)
- **Segurança:** Removida dependência vulnerável `xlsx` (^0.18.5) e migrado para `@e965/xlsx` (0.20.3) em todo o sistema.
- **Performance:** Refatorado `CatalogQualityDashboard` para suporte a grandes volumes (>5k SKUs) com cache `react-query`.
- **Governança:** Adicionado indicador global de `SidebarFooterHealth` para monitoramento proativo de infraestrutura (Banco + Sync).
- **Hardening:** Implementada sanitização rigorosa em componentes de exportação de dados.

### 🚀 Hardening 10/10 (Onda 2 - Maturidade Máxima)


### 🚀 Adicionado — Hardening 10/10 (Onda 1)
- ESLint integrado ao pipeline de CI (`.github/workflows/ci.yml`)
- Verificação HIBP (Have I Been Pwned) habilitada para senhas fracas/vazadas
- Hardening de RLS em buckets públicos de Storage (UPDATE/DELETE restrito ao dono)


### 🔒 Segurança
- CSP restritivo com allow-list de domínios externos (Supabase, Cloudflare Stream, CNPJa, OpenAI, Gemini, ElevenLabs)
- HSTS com `preload` (max-age 2 anos) — preparado para inclusão na lista HSTS Preload do Chromium

---

## [3.4.0] - 2025-04-10

### Adicionado
- Sincronização de orçamentos com SalesPro v3.4 (4 casas decimais em `unit_price`/`total_price`)
- Sistema de assinatura eletrônica de orçamentos (MP 2.200-2/2001)
- Workflow de aprovação de descontos com alçada por vendedor

### Corrigido
- Race condition em `acquire_ai_quota` (lock pessimista adicionado)

---

## [3.3.0] - 2025-03-25

### Adicionado
- Suíte Magic Up de marketing com IA (Gemini 3 Pro / Nano Banana Pro)
- Comparador de produtos com chave composta (productId::variant_id)
- Sistema de coleções privadas

---

## [3.2.0] - 2025-03-10

### Adicionado
- Catálogo com busca semântica (8 níveis + re-rank pg_trgm)
- Sistema de Estoque Futuro com previsões de reposição
- Multi-variant carousel nos cards de produto

---

## [3.0.0] - 2025-02-01

### 💥 Breaking
- Plataforma fechada: sign-up público desabilitado, cadastro apenas via convite admin
- RLS migrado para arquitetura SECURITY DEFINER + has_role()

### Adicionado
- 50 Edge Functions com validação Zod (100% de cobertura)
- Anti-scraping: bot detection + rate limit persistente + anti-hotlinking
- Logger estruturado (`src/lib/logger.ts`) substituindo todos os `console.*`

[Unreleased]: https://github.com/promo-gifts/app/compare/v3.4.0...HEAD
[3.4.0]: https://github.com/promo-gifts/app/compare/v3.3.0...v3.4.0
[3.3.0]: https://github.com/promo-gifts/app/compare/v3.2.0...v3.3.0
[3.2.0]: https://github.com/promo-gifts/app/compare/v3.0.0...v3.2.0
[3.0.0]: https://github.com/promo-gifts/app/releases/tag/v3.0.0
