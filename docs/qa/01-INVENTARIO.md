# 01 — Inventário do sistema e registro de cobertura

Auditoria de QA somente-leitura executada em 22–23/11/2026, sobre `claude_04/practical-hypatia-y9cftg`
(mesmo árvore de `main` em `54e7819` — `fix: extrai parser de moeda e validação do componente de notas (#404)`).

> Este arquivo é o registro de cobertura. Cada item termina com **revisado** ou
> **não revisado + motivo**. A auditoria só pode se dizer exaustiva no que estiver marcado aqui.

## 1. Suposições declaradas

O dono não preencheu o bloco `<contexto>`. O que segue foi deduzido do código e da documentação do
próprio repositório, e é a base de leitura dos achados:

| Suposição | Evidência |
|---|---|
| É o portal de brindes/materiais do Sicoob: catálogo, orçamento, pedido, verba por PA, aprovação, kit e recompra. | `src/routes/config/sicoob-rbac.ts`, `src/services/sicoob/`, `docs/agentes/regras-dominio.md` |
| Hierarquia de papéis: `dev > gestor_compras > comprador_singular > gerente_pa > comprador_pac > agente`; `vendedor` e `supervisor` por contexto; `admin`/`manager` são aliases legados de `supervisor`. | `src/lib/roles.ts:4,32-36`, `docs/agentes/regras-dominio.md` |
| Fonte da verdade de papel é a tabela `user_roles`, espelhada em `profiles.role`. Não existe papel "Central" — Central é só organização. | `SICOOB_TESTING.md:27,30` |
| Verba de PA é mensal por período (`ano`/`mes`), e a autoridade de gasto é validada por trigger **no banco**, não no front. | `src/services/sicoob/budgetService.ts:41-48`, `src/services/sicoob/statsService.ts:32-33` |
| O catálogo de produtos vive em projeto Supabase externo, somente leitura imposta em código. | `supabase/functions/_shared/external-read-only.ts:19-21` |
| Publicação do front é na Vercel, direto da `main`, sem esperar o CI. | `AGENTS.md`, `docs/agentes/servicos.md` |

## 2. Stack e pontos de entrada

| Item | Valor | Evidência |
|---|---|---|
| Front | Vite + React + TypeScript, React Router com rotas declaradas em `src/routes/config/` | `vite.config.ts`, `src/App.tsx` |
| Entrada do app | `index.html` → `src/main.tsx` → `src/App.tsx` → `src/AuthEntry.tsx` | — |
| Backend | Supabase (Postgres + Edge Functions em Deno) | `supabase/config.toml:1` |
| Projeto Supabase oficial | `cfmzkthhgliqelozlmwu` | `supabase/config.toml:1` |
| Build | `vite build`, saída `dist`, target `esnext`, `manualChunks` manual (inclui `supabase-vendor`) | `vite.config.ts:50,53,60-74` |
| Deploy do front | Vercel, SPA rewrite `/(.*) → /index.html`, headers de segurança no próprio `vercel.json` + `public/_headers` | `vercel.json:3-30` |
| Deploy de edge functions | Só por `deploy-sicoob-functions.yml` (dispatch manual com `PUBLICAR`, allowlist) | `.github/workflows/deploy-sicoob-functions.yml` |
| Migrations | Só por `apply-sicoob-migrations.yml` (dispatch com `APLICAR`, environment `construction`) | `.github/workflows/apply-sicoob-migrations.yml` |
| Testes | Vitest (`tests/`), Playwright (`e2e/`) | `vitest.config.ts`, `playwright.config.ts` |
| Gerenciador | npm (`npm ci`), Node 24 | `package-lock.json`, `AGENTS.md` |

## 3. Inventário quantitativo

| Camada | Quantidade | Fonte da contagem |
|---|---|---|
| Arquivos `.ts`/`.tsx` em `src/` | 1.938 | `find src -type f \( -name '*.ts' -o -name '*.tsx' \) \| wc -l` |
| Páginas (`src/pages/**/*.tsx`) | 163 | `find src/pages -name '*.tsx' \| wc -l` |
| Rotas distintas declaradas | 101 | `grep -rhoE 'path:\s*"[^"]+"' src/routes/config/ \| sort -u \| wc -l` |
| Arquivos de configuração de rota | 8 (`admin`, `dev`, `products`, `public`, `quotes`, `sicoob-rbac`, `sicoob`, `tools`) | `ls src/routes/config/` |
| Hooks (`src/hooks/`) | 314 | `find src/hooks \| wc -l` |
| Serviços (`src/services/`) | 23 | `find src/services -type f \| wc -l` |
| Edge functions (diretórios) | 110 | `ls supabase/functions \| wc -l` |
| Entradas no manifesto de autorização de edge | 107 | `grep -cE '^\s{2}"?[a-z0-9-]+"?:\s*\{' supabase/functions/_shared/edge-authz-manifest.ts` |
| Funções com `verify_jwt = false` em `config.toml` | 22 | `grep -c 'verify_jwt = false' supabase/config.toml` |
| Migrations | 624 | `ls supabase/migrations \| wc -l` |
| Tabelas criadas por migration (nomes distintos, inclui partições e backups) | 295 | `grep -rhoiE 'create table ...' supabase/migrations/ \| sort -u \| wc -l` |
| Migrations mencionando `SECURITY DEFINER` | 254 | `grep -rli 'security definer' supabase/migrations/ \| wc -l` |
| Arquivos de teste Vitest | 351 | `find tests -name '*.test.ts' \| wc -l` |
| Arquivos em `e2e/` | 153 | `find e2e -type f \| wc -l` |
| Workflows de CI | 17 | `ls .github/workflows \| wc -l` |
| Variáveis `import.meta.env.VITE_*` usadas | 16 | `grep -rhoE 'import\.meta\.env\.[A-Z_]+' src/ \| sort -u \| wc -l` |
| Variáveis `Deno.env.get(...)` nas edge functions | 39 | `grep -rhoE "Deno\.env\.get\(..." supabase/functions/ \| sort -u \| wc -l` |
| Buckets de storage referenciados no código | 6: `avatars`, `exports`, `personalization-images`, `proposals`, `sicoob-order-documents`, `supplier-logos` | `grep -rhoE "storage\.from\(...\)" src/ supabase/functions/` |

### Categorias do manifesto de autorização de edge

| Categoria | Funções | Significado (de `edge-authz-manifest.ts:24-30`) |
|---|---|---|
| `authenticated` | 32 | exige sessão válida |
| `public` | 24 | acessível sem sessão |
| `dev` | 23 | só papel `dev` |
| `service` | 16 | exige `x-sicoob-internal-secret` antes de criar cliente `service_role` |
| `supervisor` | 7 | `supervisor` ou acima |
| `scoped` | 5 | escopo por vendedor/PA |

### Workflows com agendamento (`schedule:`)

`codeql.yml`, `contexto.yml`, `db-performance-audit.yml`, `inventario-estado-semanal.yml`,
`migration-ledger-drift.yml`, `security-compliance.yml`, `security.yml`.

## 4. Atores e papéis

| Ator | Como entra | Alcance esperado |
|---|---|---|
| Visitante sem login | rotas de `public.ts` e tokens (`/approve/:token`, `/convite/:token`, `/dossie/:token`, `/colecao-publica/:token`, `/comparar-publica/:token`) | só o que o token libera |
| `agente` / `comprador_pac` | portal Sicoob | compra dentro do próprio PA, limitada pela verba do período |
| `gerente_pa` | `/pa/verba`, `/dashboard-pa` | gestão da verba e dos pedidos do próprio PA; alçada de aprovação própria |
| `comprador_singular` (rótulo de UI: "Gestor Singular") | `/gestor/*` | pedidos agregados, convites, aprovações, delegações e auditoria da Singular |
| `gestor_compras` | `/gestor/*`, relatórios | acima do Singular na hierarquia |
| `vendedor` | `/vendedor/dashboard` | só a própria carteira — escopo imposto por gate de CI (`scripts/check-seller-scope.mjs`) |
| `supervisor` (aliases legados `admin`, `manager`) | `/admin/*` | administração, segurança, telemetria |
| `dev` | `/admin/*` + rotas de `dev.ts` (48) | tudo, inclusive `admin_audit_log` e emissão de chave MCP |
| Serviço interno (máquina) | edge functions categoria `service` | só com `x-sicoob-internal-secret` |

## 5. Jornadas principais mapeadas

1. **Comprar (agente/comprador PAC):** catálogo → produto → carrinho → pedido → consumo de verba do PA → documento do pedido.
2. **Gerir verba (gerente PA):** `/pa/verba` → orçamento do período (`ano`/`mes`) → consumo → centro de custo e rateio.
3. **Aprovar (gerente PA / Singular):** solicitação → `/gestor/aprovacoes` ou `/approve/:token` → decisão → efeito no pedido e na verba.
4. **Consolidar (Singular / gestor de compras):** `/gestor/agregados` → pedidos agregados → auditoria (`/gestor/auditoria`).
5. **Convidar (Singular):** `/gestor/convites` → `/convite/:token` → criação de conta e vínculo de papel/PA.
6. **Orçar kit e recomprar:** catálogo externo → `sicoob-kit-quote` / `sicoob-reorder` com idempotência por hash SHA-256 do intento canonicalizado.
7. **Vender (vendedor):** `/vendedor/dashboard` → orçamentos e pedidos da própria carteira → aprovação de desconto.
8. **Administrar (supervisor/dev):** `/admin/*` — conexões, segurança, RLS, telemetria, validade de preços, consumo de IA.

## 6. Registro de cobertura por camada

Preenchido ao fim da varredura (Fase 2). Ver `03-ACHADOS.md` para os achados e `00-RESUMO.md`
para o que ficou de fora.

| Camada | Itens no escopo | Status | Observação |
|---|---|---|---|
| Interface — rotas e proteção | 101 rotas, 8 arquivos de config, 163 páginas | revisado | ver achados `ROTA-*` |
| Interface — formulários, ações e estados | páginas e componentes de escrita do fluxo Sicoob | revisado | amostragem priorizada por fluxo de dinheiro e pedido |
| Interface — código morto e duplicação | `src/components`, `src/hooks`, `src/services` | revisado | via grafo `graphify-out/graph.json` + confirmação por grep |
| Hooks e estado | 314 hooks, `src/stores`, `src/contexts` | revisado | foco em cache de React Query, realtime e corrida |
| Regras de negócio | `src/lib/sicoob/**`, `src/lib/access/**`, `src/services/sicoob/**` + SQL correspondente | revisado | base: `docs/agentes/regras-dominio.md` |
| Edge functions — autenticação e autorização | 110 funções + manifesto + `config.toml` + allowlist de deploy | revisado | ver achados `EDGE-*` |
| Edge functions — robustez e contrato | 110 funções | revisado | validação de entrada, idempotência, timeout, formato de erro |
| Banco — RLS e permissões | SQL de 624 migrations, `sicoob_rls_validation.sql` | revisado **só pelo código** | **banco ao vivo não acessível nesta sessão** (ver §7) |
| Banco — integridade, índices e schema | SQL das migrations + `src/integrations/supabase/types.ts` + `inventario/estado/` | revisado **só pelo código** | idem |
| Banco — funções, triggers e `SECURITY DEFINER` | 254 migrations com `SECURITY DEFINER` | revisado **só pelo código** | idem |
| Integrações e webhooks | Lovable AI, ElevenLabs, Bitrix24, Resend, CNPJa, VirusTotal, Dropbox, n8n/SalesPro, catálogo e CRM externos | revisado | entrega externa real não exercitada |
| Infraestrutura, deploy e CI | 17 workflows, `vercel.json`, `public/_headers`, `scripts/ci/**` | revisado | estado remoto dos runs conferido via GitHub MCP |
| Segurança transversal | repositório inteiro | revisado | segredos, IDOR, escalada, injeção, upload |
| Performance e carga | hooks, serviços, edge functions, bundle | revisado | sem medição em produção |
| Experiência de uso, acessibilidade e mobile | telas dos fluxos principais | revisado por amostragem | sem navegador contra ambiente real |
| Testes e confiabilidade da suíte | 351 testes Vitest, 153 arquivos e2e | revisado | suíte Vitest executada; Playwright **não** executado |

## 7. Camadas e verificações NÃO cobertas

| Item | Motivo exato |
|---|---|
| **Banco de produção ao vivo (`cfmzkthhgliqelozlmwu`)** | Nenhum MCP Supabase desta sessão aponta para esse projeto. Verificado: `get_project_url` do MCP "GESTÃO DE PRODUTOS" retorna `https://doufsxqlfjyuvxuezpln.supabase.co` (catálogo externo) e o de "GESTÃO DE CLIENTES" retorna `https://pgxfvjmuubtbowutlide.supabase.co` (CRM). Os MCPs "ZAPP WEB V2", "PROMO CHAMPIONS" e "PROMO FINANCE" são de outros produtos (tabelas de chat e de financeiro, conferidas por `db_list_tables`). Também não existe `SUPABASE_ACCESS_TOKEN` no ambiente, então `scripts/db/supabase-sql-client.mjs` não roda. Consequência: schema real, policies ativas, índices em uso, registros órfãos e planos de consulta **não foram medidos** — só o SQL das migrations foi lido. |
| **Suíte Playwright (e2e autenticado)** | O destino E2E isolado não está configurado (`E2E_SUPABASE_PROJECT_ID`, `E2E_SUPABASE_URL`, `E2E_SUPABASE_PUBLISHABLE_KEY`, `E2E_SUPABASE_SERVICE_ROLE_KEY` ausentes, conforme `PENDENCIAS.md` e `RELATORIO_CI.md`), e o cleanup global grava/exclui dados. Rodar apontando para produção violaria a regra de auditoria somente-leitura. |
| **Entrega real de webhook e de e-mail** | Exige segredo de ambiente e serviço externo; não há ambiente de homologação provisionado. |
| **Medição de performance em produção** | Sem acesso a métricas do banco oficial nem a run de Lighthouse válido (último run disponível está com logs expirados). |
