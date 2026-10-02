# Auditoria Técnica — Brindes_Sicoob_V2 — 2026-10-02

Auditoria das 20 dimensões do plano-mestre (o template anuncia 22 mas enumera 20), executada sobre `main` em `e3c62ebc3` + branch `fix/devin-1790937792-quote-item-identity` (PR #88).

## Fase 0 — Inventário do Sistema

```
├── Repositório: adm01-debug/Brindes_Sicoob_V2 (privado, branch main)
├── Stack: React 18 + TS + Vite 6 · Supabase (Postgres 17.6, projeto cfmzkthhgliqelozlmwu, us-east-1)
│   · 109 edge functions (Deno) · Vercel (SPA + headers) · Bitrix24 · n8n · Bling · Evolution API
├── Integrações: Bitrix24 (CRM/BizProc), Evolution/WhatsApp, Bling (NFe), Cloudflare Stream,
│   cnpja, OpenAI/Gemini/ElevenLabs, Spotgifts
├── Ambientes: produção Vercel + previews por PR; Supabase único verificado
├── Escala: 1.891 arquivos em src/ (~316k LOC) · 565 migrations · 416 arquivos de teste
│   (5.592 testes, 112 skipped) · 128 specs e2e · ~110 rotas · 13 workflows GH
├── Último commit em main: 2026-10-01 (e3c62ebc3)
└── Data do último deploy: NÃO AUDITÁVEL — sem acesso ao painel Vercel/Supabase remoto
```

## Fase 1 — As 20 Dimensões

### 1. Arquitetura — **7/10**
- Evidências: separação `pages/`/`components/`/`hooks/`/`services/`/`lib/`; RPCs transacionais concentram escritas críticas (`save_quote_atomic`, `bulk_update_quote_status_atomic`); scripts de gate próprios.
- Gaps: páginas monolíticas (TrendsPage 425 linhas/1 função, complexidade 34); alguns fluxos misturam UI+effects no mesmo arquivo.
- Ações: extrair containers/hooks das páginas >300 linhas (lista em `lint:baseline`).

### 2. Autenticação — **8/10**
- Evidências: `auth.uid()` verificado ANTES do retorno idempotente em `bulk_update_quote_status_atomic` (migration 20260928182000, linhas 46-55); signups desabilitados no projeto; políticas RLS amarradas a `seller_id`/org.
- Gaps: MFA, política de senha e gestão de sessão não auditáveis no código (painel Supabase).
- Ações: verificar enforcement de MFA para admins; documentar política de sessão em `docs/secrets.md`.

### 3. Autorização — **8/10**
- Evidências: ~100% das tabelas com `ENABLE ROW LEVEL SECURITY` + policies (varredura regex em todas as 565 migrations); gate `check-seller-scope.mjs`; `get_user_org_ids`/`can_view_all_sales` para escopo organizacional; REVOKE EXECUTE em funções internas.
- Gaps: `check:security-definer-acl` depende de credenciais remotas (skip local); escopo por papel depende de dados de `profiles` (não auditável sem produção).
- Ações: rodar `check:security-definer-acl` com credenciais em CI agendado.

### 4. Banco de Dados — **7/10**
- Evidências: 565 migrations forward-only com gate de imutabilidade (`check-migration-immutability.mjs`); FKs com ON DELETE CASCADE; triggers de `row_version`; RPCs recalculam totais no servidor.
- Gaps: antes do PR #88, `save_quote_atomic` deletava e recriava itens a cada edição (churn de identidade, quebra vínculos derivados); tabelas auxiliares sem índice de cobertura verificado (db-performance-audit roda agendado — saída não auditável).
- Ações: ✅ PR #88 (upsert-reconcile por id); revisar artefatos do db-performance-audit mensalmente.

### 5. CI/CD — **8/10**
- Evidências: 13 workflows — `ci.yml` (typecheck/lint/testes/build), `e2e.yml`, `codeql.yml`, `security.yml`, `security-compliance.yml`, `lighthouse.yml`, `bundle-check.yml`, `migration-ledger-drift.yml`, `sicoob-ci.yml`, `apply-sicoob-migrations.yml`, `branch-protection-sentinel.yml`, `db-performance-audit.yml`, `deploy-sicoob-functions.yml`.
- Gaps: e2e roda com `E2E_USER_EMAIL`/`E2E_USER_PASSWORD` **ausentes** (docs/secrets.md:80-81) — cobertura e2e parcialmente cega.
- Ações: provisionar usuário de teste no projeto cfmzkthhgliqelozlmwu e cadastrar secrets (ação humana — GitHub org/repo settings).

### 6. Data Integrity — **7,5/10**
- Evidências: save atômico com recálculo de totais + row_version otimista + idempotency keys; simulação dockerizada cobre atomicidade/RLS/concorrência (`simular-salvamento-orcamento-atomico.py`).
- Gaps RESOLVIDOS neste PR: identidade de `quote_items` (delete-recreate → upsert-reconcile); paginação de pedidos sem desempate (`orderService` ganhou `ORDER BY id`).
- Gaps abertos: reconciliação de `quote_item_personalizations` continua delete-recreate (aceitável — filha sem vínculos externos); sem soft-delete/auditoria de deleção de itens.
- Ações: ✅ PR #88; avaliar trigger de auditoria para `quote_items` se compliance exigir trilha.

### 7. Documentação — **8/10**
- Evidências: `docs/` com 75 arquivos — runbooks (`RUNBOOK_CONNECTIONS.md`), `secrets.md` com rastreio de secrets ausentes, planos de execução datados com evidências JSON em `docs/execucao/evidencias/`.
- Gaps: docs de decisões arquiteturais (ADR) inexistentes; alguns planos duplicam conteúdo de CLAUDE.md/AGENTS.md.
- Ações: adotar `docs/adr/` para decisões; consolidar índice de planos.

### 8. Infraestrutura / DevOps — **7/10**
- Evidências: Vercel com preview por PR (ativo no PR #88), headers de segurança em `vercel.json`, Supabase gerenciado PG17.
- Gaps: blueprint Devin inexistente (sugestão enviada nesta sessão); sem IaC das configs Vercel/Supabase dashboard; ambientes não separados (prod único verificado).
- Ações: aprovar blueprint; documentar topologia de ambientes em DEPLOYMENT.md.

### 9. Logging / Monitoring — **6/10**
- Evidências: `src/lib/logger.ts` com níveis e gating por env; `structuredLogger.ts`, `bridgeCallMetrics.ts`, `secretsManagerCallMetrics.ts` no telemetry; `admin-audit-hook` edge function.
- Gaps: destino agregador de logs não confirmado (Sentry importado mas DSN/sink não auditável); sem log retention policy documentada; 307 `console.*` residuais em 153 arquivos — só 8 são `console.log`, o restante é warn/error (1 removido no PR #88).
- Ações: confirmar sink de logs (Sentry/Axiom/Datadog) e registrar em docs; migrar os 8 `console.log` restantes para o logger estruturado.

### 10. Observabilidade — **6/10**
- Evidências: `webVitals.ts`, `requestId.ts`, `longTaskWatchdog.ts`, `instrumentationControl.ts`; `check-edge-request-id-propagation.mjs` garante propagação.
- Gaps: sem dashboards/SLOs visíveis; alertas dependem de sink externo não auditável; tracing distribuído frontend→edge ausente (requestId existe, join não verificado).
- Ações: definir 3-5 SLOs (save de orçamento, checkout público, sync Bitrix) e apontar alertas.

### 11. Lógica de Negócio — **7/10**
- Evidências: domínio rico e modelado (orçamentos com versionamento, kits, personalizações, verbas cooperativa por PA+período — P124-126 já corrigidos); reordenação persiste intenção client-side; fluxo formal de status separado do save.
- Gaps: validação server-side de preço de catálogo inexiste (preço é negociado — decisão de negócio, não gap técnico); algumas regras (desconto×frete) replicadas cliente+servidor (dupla fonte).
- Ações: extrair tabela de regras de cálculo para doc único (`docs/regras-orcamento.md`).

### 12. Manutenibilidade — **5,5/10**
- Evidências: 3.247 erros eslint globais (gate diferencial impede crescimento); 153 erros tsc tolerados por baseline; 442 `any` em src/; funções com complexidade até 34.
- Gaps: débito técnico legado grande; baselines não têm burn-down automático.
- Ações: ratchet de `any` (contagem só desce — como o DP V3); orçamento semanal de redução de baseline eslint (ex.: −100/sprint).

### 13. Operacionalidade — **7/10**
- Evidências: scripts/qa reproduzíveis com evidência JSON; `e2e-cleanup` com guarda; runbooks de conexões; `plano-encerramento-100-etapas` rastreável.
- Gaps: procedimentos de incidente (oncall/rollback) não documentados ponta a ponta; rollback de edge functions depende de redeploy manual.
- Ações: runbook de incidente P0 (detecção→mitigação→comunicação).

### 14. Performance — **6,5/10**
- Evidências: paginação server-side com `.range()`; bundle-check e lighthouse em CI; chunks lazy por rota; `trends-mock` saiu do chunk principal neste PR (chunk próprio confirmado no build).
- Gaps: chunks >600kB (lucide-react 767kB, VoiceSearchOverlay 593kB, xlsx 499kB); sem manualChunks; N+1 em algumas listagens (não exaustivamente medido).
- Ações: manualChunks para vendors (lucide, xlsx, jszip, html2canvas); orçamento de chunk <400kB no bundle-check.

### 15. Qualidade de Código — **6/10**
- Evidências: convenções consistentes (pt-BR, tipos locais por domínio, helpers compartilhados); gates impedem regressão; code review via CodeRabbit/cubic/Devin Review ativos.
- Gaps: dívidas medidas nos baselines; duplicação de literais (sonarjs flags); funções longas em páginas.
- Ações: burn-down gradual (ver Manutenibilidade); sem big-bang.

### 16. Segurança — **8/10**
- Evidências: CSP real servido via `vercel.json` (default-src 'self', object-src 'none', frame-ancestors 'self', upgrade-insecure-requests) + HSTS preload + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + COOP/CORP/COEP; gitleaks + codeql + security-compliance em CI; RLS ~100%; REVOKE em funções internas; rate-limiter compartilhado em edge functions públicas.
- Gaps: `script-src 'unsafe-inline'` na CSP (trade-off do bootstrap Vite); rate limiting cobre só ~7 das 109 edge functions; scanner de dependências externo (Snyk homologado?) não confirmado; branch protection real (diferente do sentinel) não auditável via código.
- Ações: CSP com nonce/hash (médio); estender `_shared/rate-limiter` às funções públicas restantes; confirmar proteção de branch no painel (humano).

### 17. Testes — **7,5/10**
- Evidências: 5.592 testes passando / 112 skipped; cobertura alvo 80% stmts / 75% branches no CI; 128 specs e2e; testes de cenário SQL dockerizados com evidência; budget de skips críticos (41/41).
- Gaps: e2e sem credenciais funcionais (secrets ausentes → fluxos autenticados cegos); cobertura real por módulo não auditada aqui.
- Ações: provisionar credenciais e2e (humano) + adicionar spec e2e do fluxo de orçamento quando credencial existir.

### 18. Tipagem / Type Safety — **6,5/10**
- Evidências: strict TS; baseline gate em 153; `types.ts` gerado do schema Supabase; 442 `any` pontuais.
- Gaps: `as any` em queries fora do schema tipado (supabase-untyped); erros de baseline concentrados não queimam.
- Ações: regenerar `types.ts` após cada migration no CI; ratchet de `any`.

### 19. Validação — **7,5/10**
- Evidências: zod (^3.22.4) disponível e usado; RPC valida shape/totais/escopo antes de escrever (duas passagens); mensagens de erro em pt-BR com SQLSTATEs semânticos (22023/40001/42501/23514).
- Gaps: validação de formulários cliente não uniforme (zod parcial); edge functions variam no rigor de payload.
- Ações: schema zod compartilhado para payloads das edge functions públicas mais chamadas.

### 20. Operações (Processos) — **7/10**
- Evidências: secrets.md rastreia secrets ausentes; planos datados em docs/execucao; PR template completo; merge squash; sentinel de branch protection.
- Gaps: sem processo formal de revisão de baselines (eslint/tsc) cadenciado; ownership de módulos não declarado (CODEOWNERS ausente?).
- Ações: CODEOWNERS por domínio (quotes, sicoob, magicup); cadência mensal de revisão de baselines.

## Fase 2 — Scorecard

```
╔══════════════════════════════════╦═══════╦═══════════════════════════════════════════════════╗
║ DIMENSÃO                         ║ NOTA  ║ GAP PRINCIPAL PARA 10/10                          ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════════════╣
║ 1.  Arquitetura                  ║  7,0  ║ Páginas monolíticas >300 linhas                     ║
║ 2.  Autenticação                 ║  8,0  ║ MFA/sessão não auditáveis sem painel                ║
║ 3.  Autorização                  ║  8,0  ║ gate ACL depende de credencial remota               ║
║ 4.  Banco de Dados               ║  7,0  ║ churn de identidade (resolvido PR #88)              ║
║ 5.  CI/CD                        ║  8,0  ║ e2e sem credenciais (secrets ausentes)              ║
║ 6.  Data Integrity               ║  7,5  ║ auditoria de deleção de itens                       ║
║ 7.  Documentação                 ║  8,0  ║ sem ADRs; índice de planos disperso                 ║
║ 8.  Infraestrutura / DevOps      ║  7,0  ║ sem IaC de Vercel/Supabase; ambiente único          ║
║ 9.  Logging / Monitoring         ║  6,0  ║ sink de logs não confirmado                         ║
║ 10. Observabilidade              ║  6,0  ║ sem SLOs/dashboards                                 ║
║ 11. Lógica de Negócio            ║  7,0  ║ regras de cálculo em dupla fonte                    ║
║ 12. Manutenibilidade             ║  5,5  ║ 3.247 erros eslint + 153 tsc legados                ║
║ 13. Operacionalidade             ║  7,0  ║ runbook de incidente P0 ausente                     ║
║ 14. Performance                  ║  6,5  ║ chunks >600kB; sem manualChunks                     ║
║ 15. Qualidade de Código          ║  6,0  ║ complexidade/literais em páginas                    ║
║ 16. Segurança                    ║  8,0  ║ CSP unsafe-inline; rate-limit parcial               ║
║ 17. Testes                       ║  7,5  ║ e2e autenticado cego sem credencial                 ║
║ 18. Tipagem / Type Safety        ║  6,5  ║ 442 any; baseline estagnado                         ║
║ 19. Validação                    ║  7,5  ║ zod não uniforme em edge functions                  ║
║ 20. Operações (Processos)        ║  7,0  ║ sem CODEOWNERS/cadência de baseline                 ║
╠══════════════════════════════════╬═══════╬═══════════════════════════════════════════════════╣
║ NOTA GERAL PONDERADA             ║ 7,3   ║ pesos ×3 Seg/Auth/Authz/DI · ×2 BD/Tip/Val/Test/Arq ║
╚══════════════════════════════════╩═══════╩═══════════════════════════════════════════════════╝
```

Cálculo: (8+8+8+7,5)×3 + (7+6,5+7,5+7,5+7)×2 + (8+7+6+6+7+5,5+7+6,5+6+7) = 94,5 + 71 + 74 = **239,5 / 33 pesos = 7,26 ≈ 7,3/10**.

## Top 10 ações por ROI

| # | Ação | Impacto | Esforço | Status |
|---|------|---------|---------|--------|
| 1 | Preservar identidade de `quote_items` no save atômico | Alto | Médio | ✅ PR #88 |
| 2 | Desempate `id` na paginação de pedidos Sicoob | Alto | Baixo | ✅ PR #88 |
| 3 | `trends-mock` fora do chunk principal | Médio | Baixo | ✅ PR #88 |
| 4 | `console.log` residual → logger | Baixo | Baixo | ✅ PR #88 (1 arquivo; restam 7 dos 8 arquivos com console.log) |
| 5 | Credenciais e2e (E2E_USER_*) no GitHub | Alto | Baixo | ⛔ humano — criar usuário no Supabase + secrets |
| 6 | Estender rate-limiter às edge functions públicas | Alto | Médio | backlog |
| 7 | CSP `script-src` sem unsafe-inline (nonce) | Alto | Médio | backlog |
| 8 | Ratchet de `any` (442→só desce) | Médio | Baixo | backlog |
| 9 | manualChunks vendors (lucide 767kB, xlsx, jszip) | Médio | Baixo | backlog |
| 10 | SLOs + dashboards (save orçamento, sync Bitrix) | Médio | Médio | backlog |

## Roadmap — 3 ondas

| Onda | Escopo |
|------|--------|
| 🔴 Quick Wins (agora) | ✅ PR #88 (identidade de itens, paginação estável, mock lazy, log); credenciais e2e (humano); rate-limiter nas ~100 edge functions públicas restantes |
| 🟠 Sprint 1 | CSP com nonce; ratchet `any`; manualChunks + orçamento de chunk; migrar 8 console.log restantes para o logger; regenerar types.ts por migration no CI |
| 🟡 Sprint 2 | SLOs/dashboards; burn-down de baselines (eslint −100/sprint); CODEOWNERS; runbook P0; extração de páginas >300 linhas |

## Não auditável (sem acesso)

- Painel Supabase (MFA, pooler, PITR, política de senha)
- Painel Vercel (regiões, functions config, firewall)
- Produção (métricas reais, dados de perfil/roles)
- Bitrix24/n8n/Bling/Evolution (estado dos webhooks e workflows)
- Saída do workflow `db-performance-audit` agendado

## Evidências geradas nesta sessão

- `docs/execucao/evidencias/identidade-itens-orcamento.json` — simulação Postgres 17 da nova migração
- `scripts/qa/simular-identidade-itens-orcamento.py` — harness reproduzível
- Build local: chunk `trends-mock-*.js` separado confirmado
- Gates: typecheck 153/153 · eslint differential limpo · vitest 26/26 nos arquivos tocados · migration immutability ok
