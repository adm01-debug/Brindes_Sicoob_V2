# 02 — Matriz de cenários

Cada linha é um cenário rastreado de ponta a ponta (interface → hook → chamada → backend → banco →
resposta → interface) ou executado de verdade.

- **EXECUTADO** = comando, teste ou consulta rodado nesta sessão, com a saída registrada abaixo.
- **RASTREADO** = caminho seguido pelo código, sem execução.

Nenhum cenário envolveu escrita em banco, storage ou serviço externo de produção.

## Parte A — Verificações executadas (ambiente desta sessão)

Ambiente: container Linux, Node v22.23.5, npm 10.9.9, 4 CPUs, `node_modules` instalado por
`npm ci --no-audit --no-fund` (943 pacotes em 14 s) após liberar o host `europe-west1-npm.pkg.dev`,
que o próprio `package-lock.json` exige em 57 pacotes e o proxy de egresso recusava com 403.

| # | Verificação | Comando | Resultado | Veredito |
|---|---|---|---|---|
| A1 | Tipagem da aplicação e dos scripts | `npm run typecheck` | exit 0, sem diagnósticos | ✅ passa |
| A2 | Lint de `src` | `npx eslint src` | exit 1 — **870 problemas: 1 erro e 869 avisos**. O erro é `complexity 13` (máximo 10) em `src/components/sicoob/orders/OrderInvoicesTab.tsx:19` | ❌ **achado** |
| A3 | Gate de regressão de lint | `node scripts/check-eslint-baseline.mjs` | exit 0 — imprime "ESLint gate — 1 erro(s) globais", "Arquivos de aplicação alterados analisados: 0", "✅ Nenhuma regressão de lint nos arquivos alterados" | ⚠️ **achado**: o gate é diferencial e **não barra** o erro global |
| A4 | Baseline de lint declarado | leitura de `.eslint-baseline.json` | `{"generatedAt":"2026-11-08T05:11:06.280Z","totalErrors":0,"counts":{}}` — declara zero, mas o repositório tem 1 erro | ⚠️ **achado** |
| A5 | Gate de baseline de tipagem | `node scripts/check-typecheck-baseline.mjs` | exit 0; `.typecheck-baseline.json` com `total: 0` | ✅ confere |
| A6 | Autorização de edge functions | `node scripts/check-edge-authorization.mjs` | exit 0 | ✅ passa |
| A7 | Logging estruturado de edge | `node scripts/check-edge-structured-logging.mjs` | exit 0 | ✅ passa |
| A8 | Orçamento de skip de teste crítico | `node scripts/check-critical-test-skip-budget.mjs` | exit 0 — "✅ Nenhum skip novo adicionado aos contratos críticos" | ✅ passa |
| A9 | Escopo de vendedor | `node scripts/check-seller-scope.mjs` | exit 0 — "todas as queries para tabelas críticas aplicam seller scope" | ✅ passa |
| A10 | `errorElement` nas rotas | `node scripts/check-route-error-element.mjs` | exit 0 | ✅ passa |
| A11 | Aninhamento `asChild` | `node scripts/check-aschild-nesting.mjs` | exit 0 — 1.198 arquivos analisados | ✅ passa |
| A12 | Cores hardcoded em caminho Sicoob | `node scripts/check-sicoob-hardcoded-colors.mjs` | exit 0 | ✅ passa |
| A13 | Integridade do `AGENTS.md` | `node scripts/ci/check-agents-md-integrity.mjs` | exit 0 — 8 seções, 72.468 bytes | ✅ passa |
| A14 | Tags da suíte de smoke | `node scripts/check-smoke-tags.mjs` | exit 0 | ✅ passa |
| A15 | Doc de cobertura de smoke | `node scripts/e2e-smoke-coverage-doc.mjs --check` | exit 0 — "E2E_SMOKE_COVERAGE.md em dia" | ✅ passa |
| A16 | Inventário de rotas medido | `node scripts/inventario/gerar-rotas.mjs --check` | exit 1 — "`inventario/estado/rotas.json` desatualizado: rode `node scripts/inventario/gerar-rotas.mjs` e commite o resultado" | ❌ **achado** |
| A17 | ACL de funções `SECURITY DEFINER` | `node scripts/check-security-definer-acl.mjs` | exit 0 **sem verificar**: "VITE_SUPABASE_URL/SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios" | ⚠️ **achado**: sem credencial o gate não verifica nada e ainda assim termina com sucesso |
| A18 | Vulnerabilidades de dependência | `npm audit --audit-level=high` | exit 0 — **"found 0 vulnerabilities"** | ⚠️ **achado**: `PENDENCIAS.md` e `RELATORIO_CI.md` afirmam que `undici` e `zod` altos bloqueiam o CI; na árvore atual não há mais nenhuma |
| A19 | Build de produção | `npm run build` | exit 0. Avisos: plugin PostCSS sem a opção `from`; "Some chunks are larger than 600 kB after minification" | ⚠️ passa com avisos |
| A20 | Suíte Vitest completa | `npx vitest run --reporter=dot --silent` | exit 0 — **597 arquivos aprovados, 4 ignorados (601); 6.882 testes aprovados, 68 ignorados (6.950)**, em 202 s | ✅ passa |
| A21 | Projeto Supabase dos MCPs disponíveis | `get_project_url` nos MCPs Supabase | `doufsxqlfjyuvxuezpln` (catálogo externo) e `pgxfvjmuubtbowutlide` (CRM); nenhum é `cfmzkthhgliqelozlmwu` | ⛔ banco oficial fora de alcance |
| A22 | Suíte Playwright | — | **não executada**: destino E2E isolado não configurado e o cleanup global grava/exclui dados | ⛔ não coberto |

### O que a Parte A já estabelece

Tipagem, build e a suíte Vitest inteira estão verdes nesta árvore, e não há vulnerabilidade alta de
dependência — ao contrário do que a documentação de CI do repositório afirma. Os problemas que
sobram nesta parte são de **gate**: três verificações passam sem garantir o que prometem (A3/A4 toleram
um erro real de lint; A17 termina com sucesso sem ter verificado nada) e um artefato medido está
desatualizado (A16).

<!-- CENARIOS:PARTE-B -->
