# Branches sem PR — anexo do ledger de recuperação

Índice e regra em [`README.md`](README.md).

## Branches sem PR — veredito individual

| branch | veredito | pode apagar | detalhe |
|---|---|---|---|
| `audit/revisao-plano-20260924` | PARCIAL | **não** | [abaixo](#b-auditrevisao-plano-20260924) |
| `backup/local-rascunho-20261031` | PARCIAL | **não** | [abaixo](#b-backuplocal-rascunho-20261031) |
| `claude/project-workflows-analysis-5n6hva` | INCORPORADA | sim | [abaixo](#b-claudeproject-workflows-analysis-5n6hva) |
| `computador_local` | INCORPORADA | sim | [abaixo](#b-computadorlocal) |
| `devin/1791201000-ux-onda2` | PERDIDA | **não** | [abaixo](#b-devin1791201000-ux-onda2) |
| `docs/plano150-20260927` | INCORPORADA | sim | [abaixo](#b-docsplano150-20260927) |
| `execucao/sicoob-20260911130857` | PARCIAL | **não** | [abaixo](#b-execucaosicoob-20260911130857) |
| `feat/pdf-playwright-scripts-art-261108-0516` | INCORPORADA | sim | [abaixo](#b-featpdf-playwright-scripts-art-261108-0516) |
| `fix/execucao-plano-20260928` | INCORPORADA | sim | [abaixo](#b-fixexecucao-plano-20260928) |
| `fix/sicoob-aprovacao-legada-20260923` | PARCIAL | **não** | [abaixo](#b-fixsicoob-aprovacao-legada-20260923) |
| `fix/sicoob-conclusao-20260922` | PARCIAL | **não** | [abaixo](#b-fixsicoob-conclusao-20260922) |
| `fix/sicoob-csp-202635` | INCORPORADA | sim | [abaixo](#b-fixsicoob-csp-202635) |
| `fix/sicoob-intelligence-truth-20260924` | PARCIAL | **não** | [abaixo](#b-fixsicoob-intelligence-truth-20260924) |
| `fix/sicoob-p0-operacional-20260923` | PARCIAL | **não** | [abaixo](#b-fixsicoob-p0-operacional-20260923) |
| `fix/sicoob-p0-seguranca-20260923` | PARCIAL | **não** | [abaixo](#b-fixsicoob-p0-seguranca-20260923) |
| `fix/sicoob-trust-data-20260924` | INCORPORADA | sim | [abaixo](#b-fixsicoob-trust-data-20260924) |
| `contexto` | INCORPORADA | **não** | [abaixo](#b-contexto) |

Legenda: `INCORPORADA` = conteúdo está na `main`; `PARCIAL` = parte está, parte não;
`PERDIDA` = o que a branch entrega não existe na `main` sob nenhum nome.

`origin/contexto` **não** se apaga em nenhuma hipótese: é a branch de contexto gerado,
regerada a cada 10 minutos pelo `contexto.yml` e lida pelos agentes
(`docs/agentes/contexto-ia.md`).

### Justificativa de cada branch

<a id="b-auditrevisao-plano-20260924"></a>

#### `audit/revisao-plano-20260924` — PARCIAL · pode apagar: NÃO

Branch de auditoria documental: um único commit próprio (`0e028b5ee`, 24/09/2026, 27 arquivos, +21.598 linhas) que gerou a matriz de revisão dos planos (250 etapas, 1.000 requisitos, benchmark de 32 melhorias) e o script Python que a produz. Não entrega código de produto — é diagnóstico/planejamento.

Arquivos que existem na branch e não na `main`:

- `src/hooks/useSupplierTrust.ts`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `.env.production`

A recuperar:

- **Dados reais de confiança do fornecedor na página de produto (badges de prazo de entrega / fornecedor verificado)** — A main renderiza os badges de confiança com constante vazia hardcoded: `const EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null }` em src/pages/product-detail/ProductDetailHeroSections.tsx:24, consumida em :212. Ou seja, o cliente nunca vê prazo de entrega nem selo de fornecedor verificado — a seção existe na tela e não mostra nada. A branch tem o hook de 117 linhas que busca o dado real (variant_supplier_sources.lead_time_days + suppliers.active via invokeExternalDb/invokeBatchBridge) e era ligado em src/pages/ProductDetail.tsx:29,55. Na main não há nenhum consumidor de SupplierTrustData com dado real (git grep DynamicTrustBadges|SupplierTrustData origin/main -- src: só a definição e o uso vazio). Ao recuperar, descarte o fallback getMockSupplierTrust do hook original (AGENTS.md proíbe mock) e use estado vazio/erro explícito. Ressalva: este arquivo NÃO é trabalho desta branch — vem da main antiga (commit 6193793a7) e está em 261 branches remotas; a recuperação é de escopo global, não desta branch.

<details><summary>Evidência</summary>

PROVA DE QUE A CONTRIBUIÇÃO PRÓPRIA DA BRANCH É 1 COMMIT
- `git log -1 --format='%H %ci %s' origin/audit/revisao-plano-20260924` → 0e028b5ee, 2026-09-24 08:30:12 -0300, "docs: revisa planos e registra lacunas funcionais comprovadas".
- `git rev-list --count 0e028b5ee ^6193793a7` → 1. `git diff --name-only 6193793a7 0e028b5ee | wc -l` → 27.
- `git branch -r --contains 6193793a7 | wc -l` → 261. O pai era o tip da main daquela época; logo tudo que não está nesses 27 arquivos é main-antiga, não trabalho desta branch.
- `git branch -a --contains 0e028b5ee` → origin/audit/revisao-plano-20260924 e remotes/pr/31. CORREÇÃO DA PREMISSA DA TAREFA: a branch NÃO é órfã de PR — seu commit está em pr/31. Estado da PR #31 NÃO VERIFICADO (gh pr view devolveu HTTP 403: GraphQL bloqueado nesta sessão).

CONFERÊNCIA DOS 27 ARQUIVOS PRÓPRIOS CONTRA A MAIN (loop git cat-file -e + git diff --quiet)
- 21 IDÊNTICOS byte a byte, incluindo o relatório principal docs/execucao/revisao-do-plano-2026-09-24.md e todos os 19 artefatos de docs/execucao/revisao-plano-20260924/ (matriz-250-etapas.*, requisitos-1000.*, benchmark-32.*, avaliacoes-*, checks.json, resumo.json, protecao-github.json, prs-abertos.json, simular-*.json) e scripts/revisao/vitest-rascunhos-20260924.config.ts.
- 6 DIVERGEM, e em todos os 6 a main é a versão mais nova (detalhe por arquivo no campo de divergentes). Nenhuma melhoria da branch está ausente da main.

ÁRVORES
- origin/main 4.329 arquivos vs branch 3.712. `comm -13` → 17 arquivos só na branch. `git merge-base` vazio (re-enraizamento), como avisado.
- Ruído descartado conforme o passo 2: graphify-out/ (9 arquivos — .gitignore da main linha 74 "graphify-out/", e AGENTS.md diz que o grafo fica fora do Git), supabase/.temp/cli-latest (.gitignore linha 80 "supabase/.temp/*").

OS 7 ARQUIVOS NÃO-RUÍDO AUSENTES DA MAIN, UM POR UM
1. src/hooks/useSupplierTrust.ts (117 linhas) — PERDIDO de verdade, ver campo "recuperar".
2. src/components/intelligence/TopCategoriesCard.tsx (158 linhas) — REIMPLEMENTADO com outro nome. A main tem src/components/intelligence/TopProductFamiliesCard.tsx (152 linhas) no mesmo slot do TrendsPage (import em src/pages/TrendsPage.tsx:37), mesma fonte (product_views), mesma heurística de primeiro termo, e o modelo completo em src/pages/trends/trends-projections.ts:55-62 (ProductFamilyTrend com family, trendingScore, classification 'rising|stable|falling|new', growthPercent) + buildProductFamilyTrends/extractProductFamily na linha 337-344. A versão da main é superior: tem estado de erro com role="alert" e botão "Tentar novamente", e recebe dado por props em vez de useQuery interno. Nada a recuperar.
3. src/components/orders/InvoicePaymentPanel.tsx (48 linhas) — OBSOLETO. `git grep -n InvoicePayment` na própria branch só encontra o arquivo se autodeclarando (linhas 6 e 10): era código morto já em 24/09, nunca importado. Além disso é cosmético e viola AGENTS.md: três `(order as any)` e a frase fixa "Liberação financeira concluída para produção." sem nenhuma checagem. Não recuperar.
4. src/types/jspdf-autotable.d.ts (13 linhas) — REIMPLEMENTADO melhor. A branch aumentava o módulo jspdf declarando lastAutoTable.finalY; a main trocou por helper tipado src/lib/pdf/auto-table.ts (getAutoTableFinalY(document, fallback)), consumido em 8 lugares (CartExport.ts, dossierPdfGenerator.ts, export-collection-pdf.ts, exportHelpers.ts, useQuotesDashboard.ts, OrdersPage.tsx, SicoobReportsPage.tsx). Nada a recuperar.
5. tests/hooks/useCollections.test.tsx (54 linhas) — RENOMEADO. `diff` contra origin/main:tests/hooks/useCollections.react.test.tsx devolve 1 linha de diferença (o nome do describe: 'useCollections' → 'useCollections com React Query'). E a main ainda ganhou tests/hooks/useCollections.test.ts com 14 testes de arquitetura de variantes que a branch não tem. Nada a recuperar.
6. scripts/revisao/pendencias-2026-09-12.cenarios.tsx (86 linhas) — RENOMEADO, `diff` contra origin/main:scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx é VAZIO (idêntico byte a byte; a main só acrescentou .test para o vitest coletar). Nada a recuperar.
7. .env.production — remoção INTENCIONAL e correta da main; NÃO recuperar. Só contém 4 chaves VITE_* (públicas por definição, AGENTS.md). A main substituiu por .env.production.example e passou a ignorar o arquivo real em .gitignore linha 18 ".env.production".

PASSO 4 (documento ainda descreve o sistema?) — o relatório docs/execucao/revisao-do-plano-2026-09-24.md está preservado byte a byte na main como registro histórico, e já foi SUPERADO por docs/execucao/revisao-do-plano-2026-09-27.md e pelo plano de encerramento T001-T100 de 01/10/2026 (ambos referenciados em docs/plano-implementacao/README.md na main, ausentes na branch). Como diagnóstico atual, o documento está vencido; como histórico, já está na main.

PASSO 5 (branch contexto) — CONFIRMADO que é gerada automaticamente: .github/workflows/contexto.yml existe na main, publica na branch `contexto`, e o último commit de origin/contexto é de 2026-11-18 12:22:53 por contexto[bot] ("chore(contexto): 1 fonte(s) regerada(s) @ main 5ecb93f [skip ci]"). RESSALVA VERIFICADA: o intervalo real NÃO é de 10 minutos — o cron é `7 * * * *`, ou seja HORÁRIO (linha "schedule:" do arquivo), mais push na main em ~13 caminhos e workflow_dispatch. O nome do workflow e o AGENTS.md dizem "10 min" e estão errados.

POR QUE pode_apagar=false — a contribuição exclusiva desta branch está 100% na main (provado acima), mas a árvore dela carrega src/hooks/useSupplierTrust.ts, que é trabalho útil ausente da main. Apagar esta branch isoladamente não perde nada (o arquivo está em 261 branches), mas pela regra de ouro ela só deve ser apagada depois que o item 1 de "recuperar" estiver registrado no ledger de recuperação.

</details>

<a id="b-backuplocal-rascunho-20261031"></a>

#### `backup/local-rascunho-20261031` — PARCIAL · pode apagar: NÃO

Não é uma branch de feature: é um snapshot da `main` local do dono em 31/10/2026, salvo antes de sincronizar com a `origin/main` (commit 3915d2c22, "backup: rascunho local da main ... pre-sincronizacao"). O único trabalho próprio dela é o rascunho não publicado daquele dia: contratos das edge functions `health-check` e `bi-share-dossier` + teste, mais um hook de badges de confiança do fornecedor.

Arquivos que existem na branch e não na `main`:

- `src/hooks/useSupplierTrust.ts`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `AUDITORIA.md`
- `PLANO_100.md`
- `.env.production`
- `supabase/.temp/cli-latest`
- `supabase/.temp/linked-project.json`
- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/historico/2026-09-11/GRAPH_REPORT.md`
- `graphify-out/historico/2026-09-11/cost.json`
- `graphify-out/historico/2026-09-11/diagnostico.json`
- `graphify-out/historico/2026-09-11/graph.html`
- `graphify-out/historico/2026-09-11/graph.json`
- `graphify-out/historico/2026-09-11/vis-network.min.js`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `graphify-out/memory/query_20261029_001231_a75da537_permissions_auth_timeout_guard_access_role___mapea.md`

A recuperar:

- **Religar os badges de confiança do fornecedor na página de produto (fornecedor verificado + prazo de entrega), sem mock** — A main renderiza `DynamicTrustBadges` com `EMPTY_SUPPLIER_TRUST` fixo (ProductDetailHeroSections.tsx:24 e :212), então prova social na página de produto está morta hoje. A branch tinha a fonte real (variant_supplier_sources.lead_time_days + suppliers.active). Não se deve copiar o hook da branch: ele caía em `getMockSupplierTrust` e inventava `avgRating`, o que viola a regra de 'sem mock' e não tem tabela de avaliações ativa na main (só em supabase/migrations_archive/2025). A main já tem a fonte auditável pronta em `src/hooks/useProductSupplierSources.ts` (lead_time_days na linha 17, is_preferred na linha 20): derivar `isVerified` e `deliveryDays` dela e deixar `avgRating: null` entrega os dois badges verdadeiros com diff mínimo.

<details><summary>Evidência</summary>

1) NATUREZA DA BRANCH. `git log -5 origin/backup/local-rascunho-20261031` → tip 3915d2c22 (31/10/2026) "backup: rascunho local da main em 2026-10-31 (pre-sincronizacao com origin/main)"; os commits anteriores são de 23/09/2026 ("etapa 17"). `git merge-base origin/main origin/backup/...` → vazio (main re-enraizada). Toda a comparação foi por conteúdo de árvore.

2) ÁRVORES. `git ls-tree -r --name-only`: main 4329 arquivos, branch 3691. Exclusivos da branch: 27 (16 são graphify-out/ e supabase/.temp/, ambos gerados e fora do Git). Exclusivos da main: 665. Divergentes no conteúdo: 1852 — em todos os casos checados a main é a versão mais nova.

3) O DELTA REAL DA BRANCH É O COMMIT DE BACKUP. `git show --stat 3915d2c22` → 20 arquivos. Comparação byte a byte (md5 do blob) contra a main: IDÊNTICOS em `supabase/functions/health-check/contract.ts`, `supabase/functions/health-check/index.ts`, `supabase/functions/bi-share-dossier/contract.ts` e `tests/edge-functions/public-health-and-bi-share.test.ts`. Ou seja: o trabalho de contratos das edge functions e o teste JÁ ESTÃO na main, sem perda. Os 4 divergentes têm a main à frente: `bi-share-dossier/index.ts` (main usa `npm:@supabase/supabase-js@2.95.0` e loga `err.message`, a branch usava `esm.sh` e `err.name`); `secretNormalizers.ts` (main já refatorado com tabela `SECRET_NORMALIZERS`, a branch é a versão pré-refatoração em if/else); `ChurnRiskBanner.tsx` (main já extraiu `buildReactivationHook`/`getRiskTheme`); `.typecheck-baseline.json` (branch=165 erros, main=0 em 12/11/2026). `docs/correcoes-validacao-2026-09-14.md`: `git diff --numstat` branch→main = "12 0" (main é superconjunto estrito; a seção "useSeverityChangeNotifier.ts (etapa 17)" está na main, linha 6626).

4) TESTE MECÂNICO DE SUPERCONJUNTO. Extraí todos os símbolos exportados (`export function|const|class|interface|type|enum`) de src/, supabase/functions/, scripts/, tests/, e2e/ nos dois lados: main 4372, branch 3991. Só 9 símbolos existem na branch e não na main, e 8 estão incorporados ou foram removidos de propósito:
 - `__authDebugInternals` → main renomeou para `authDebugInternals` (src/lib/auth/auth-debug.ts:146).
 - `__resetSchemaStatsForTests` → main renomeou para `resetSchemaStatsForTests` (schema-detection.ts:151).
 - `__TEST__` → falso positivo do meu regex: main exporta em `useFocusContext.ts:83` (`export { testExports as __TEST__ }`).
 - `TopCategoriesCard` + `MOCK_TOP_CATEGORIES` → reimplementados na main como `src/components/intelligence/TopProductFamiliesCard.tsx` (mesma heurística "primeiro termo do nome", mesmos badges rising/new, mais estado de erro com retry), usado em TrendsPage.tsx:632. O mock foi descartado de propósito.
 - `InvoicePaymentPanel` → era stub com `(order as any).invoice_number` e texto fixo "Liberação financeira concluída". A main tem implementação real: `src/components/sicoob/orders/OrderInvoicesTab.tsx`, `OrderPaymentsTab.tsx`, `src/hooks/orders/extensions/useOrderInvoices.ts`, `useOrderPayments.ts` e testes. Não recuperar.
 - `useZoneCommandPaletteShortcut` → a main tem `useZoneCommandPalette` (ZoneCommandPalette.tsx:177) sem o listener de Ctrl+K. NÃO é regressão: o teste da main documenta a decisão — `tests/components/admin/connections/ZoneCommandPalette.test.tsx:20` "não captura Ctrl+K, reservado à barra global de comandos" (`src/components/command/GlobalCommandBar.tsx`).
 - `useSupplierTrust` / `getMockSupplierTrust` → ÚNICA lacuna funcional real (detalhada no item de recuperação).

5) OUTROS ARQUIVOS EXCLUSIVOS, JULGADOS. `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`: md5 idêntico a `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx` da main (b720c7d2e68b5eb335ba289b92eaf549) — só renomeado. `src/types/jspdf-autotable.d.ts`: a main resolveu melhor, sem augmentation global de módulo, via `src/lib/pdf/auto-table.ts:2-9`. `tests/hooks/useCollections.test.tsx`: a main tem o mesmo teste em `tests/hooks/useCollections.react.test.tsx:46` ("should initialize with empty collections") mais `tests/hooks/useCollections.test.ts` com 14 casos. `.env.production`: contém só 4 chaves `VITE_*` (públicas por definição, nenhum service_role) e está no `.gitignore` da main (linha 18) — não recuperar, não há segredo exposto.

6) DOCUMENTOS. `AUDITORIA.md` (24/09/2026, 36 achados) e `PLANO_100.md` (36 etapas) estão SUPERADOS: o "Risco 1" (A-022) que o plano mandava corrigir em E-002 já está feito na main — `supabase/functions/webhook-dispatcher/index.ts:87` `authorize(req, { requireRole: "supervisor", enforceServerSide: true })` + `:90` `requireInternalService(req, "WEBHOOK_DISPATCHER_SECRET")` + entrada no manifesto `_shared/edge-authz-manifest.ts:93`. A main também tem auditorias e planos posteriores: `RELATORIO_AUDITORIA_EXAUSTIVA.md`, `AUDIT_EXPORT_FILTERED.md`, `docs/execucao/revisao-plano-20261001/`, `docs/plano-implementacao/plano-encerramento-100-etapas-20261001/`, `docs/execucao/lacunas-funcionalidades-2026-10-11/`. Documento histórico superado = OBSOLETO.

7) BANCO E CI, SEM PERDA. Migrations: nenhuma exclusiva da branch e nenhuma divergente no conteúdo (main 610 arquivos, branch 530). Workflows: nenhum exclusivo da branch; os 11 divergentes têm a main maior em todos. Steps que só existem na branch, todos superados: ci.yml "Verificar tipos das funções de fronteira alteradas" (lista fixa de 11 funções) → main "Verificar tipos das Edge Functions (cobertura total)"; e2e.yml "Exigir credenciais da jornada autenticada" → main "Verificar credenciais da jornada autenticada" + job `validate-source` + "Validar destino exclusivo de homologação", e 3 shards em vez de 4 por decisão comentada no arquivo (limite de 40 min); sicoob-ci.yml "Iniciar servidor local sintético" (usava `npm run dev`) → main "Build de produção sintético" + "Iniciar servidor de preview"; codeql.yml "Preservar resultado SARIF" → main "Preservar resultado SARIF como artefato" com action pinada por SHA, mais o gate "Publicar resumo e bloquear achados do SARIF" (`scripts/check-codeql-sarif.mjs`); security-compliance.yml "Cross-Organization Access Test" rodava `scripts/test-rls-compliance.mjs` contra o Supabase de PRODUÇÃO (secret VITE_SUPABASE_URL) — a main substituiu por "Database RLS Scan", "Security Definer ACL Scan" e o job `seller-quote-rls-test` com "Validar destino exclusivo de homologação". Esse step da branch violava a regra "E2E/QA nunca aponta para o oficial": NÃO recuperar.

8) BRANCH `contexto` (confirmação pedida). É gerada automaticamente: `.github/workflows/contexto.yml` linha 20 `name: Contexto para agentes de IA (10 min)`, e `git log origin/contexto` mostra commits automáticos — o mais recente de hoje, 18/11/2026 12:22, "chore(contexto): 1 fonte(s) regerada(s) @ main 5ecb93f [skip ci]". Não contém trabalho humano a recuperar.

NÃO VERIFICADO: não li linha a linha os 1852 arquivos divergentes. A garantia vem do teste de símbolos exportados do item 4 (cobre src/, supabase/functions/, scripts/, tests/, e2e/) somado ao item 3, que mostra que o delta próprio da branch são 20 arquivos. Uma mudança puramente interna a uma função existente, sem novo símbolo exportado, escaparia desse teste.

</details>

<a id="b-claudeproject-workflows-analysis-5n6hva"></a>

#### `claude/project-workflows-analysis-5n6hva` — INCORPORADA · pode apagar: sim

Branch de 27/09/2026 (tip ee12961e7) que entregou um plano de 100 etapas para os workflows do GitHub Actions e 5 commits de correção de CI (ci, e2e, codeql, security, security-compliance, bundle-check, sicoob-ci, lighthouse, deploy-functions, db-audit, migration-drift, dependabot, sentinel, lighthouserc). O resto da árvore é um snapshot antigo do repositório inteiro.

Arquivos que existem na branch e não na `main`:

- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `supabase/.temp/cli-latest`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`

<details><summary>Evidência</summary>

1) Sem historico comum, conforme avisado: `git merge-base origin/main origin/claude/project-workflows-analysis-5n6hva` retorna vazio. Tip da branch: ee12961e746bba2e46c2179c074f87120dfccf48, "fix: remove dependency-type invalido dentro do bloco ignore do dependabot", 27/09/2026.

2) Estrutura das arvores: branch 3860 arquivos, main 4329. `comm` entre `git ls-tree -r --name-only` dos dois lados: 14 arquivos so na branch, 483 so na main. Direcao do drift: `git diff --shortstat origin/main origin/claude/... -- src/ tests/ supabase/ scripts/ e2e/` = 2099 arquivos, 104.955 insercoes / 154.157 delecoes, ou seja a branch tem ~49 mil linhas MENOS de codigo e teste que a main. src/: main 1931 arquivos vs branch 1896. tests/: main 570 vs branch 452. A branch e um snapshot anterior, nao um avanco.

3) Trabalho proprio da branch (5 commits acima do snapshot) e onde ele esta:
   - 68dfe7057 docs(ci) plano 100 etapas -> `docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md` EXISTE na main e `git diff --numstat` entre os dois lados nesse arquivo nao retorna nada: BYTE A BYTE IDENTICO.
   - 901c7d9a1 fix(ci) 15 falhas criticas -> `.github/pull_request_template.md` identico (diff vazio, 26 linhas nos dois lados, o template com "Evidencia verificada" citado no AGENTS.md); `.github/dependabot.yml` identico (diff vazio); demais workflows: main igual ou superior (detalhado em arquivos_divergentes_relevantes).
   - de46a3ae4 chore(sentinel) timeout-minutes: 5 -> presente na main (`git diff` de branch-protection-sentinel.yml mostra apenas a action @v4 da branch contra o SHA pinado da main; o `timeout-minutes: 5` e contexto nao alterado).
   - 4933fbf20 paths-ignore/cache/npm ci -> unico item nao adotado e o `paths-ignore` no `pull_request`, revertido de proposito em 08/11/2026 (AGENTS.md).
   - d8777a0c7 deploy-functions/db-audit/migration-drift -> main superou todos.

4) Os 4 arquivos exclusivos da branch que nao sao lixo gerado:
   - `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`: `diff` contra `origin/main:scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx` = IDENTICO. Foi apenas renomeado para `.test.tsx` na main (para o vitest coletar). Incorporado.
   - `tests/hooks/useCollections.test.tsx` (54 linhas): `diff` contra `origin/main:tests/hooks/useCollections.react.test.tsx` = 1 linha, so o rotulo do describe ('useCollections' -> 'useCollections com React Query'). A main ainda tem `tests/hooks/useCollections.test.ts` com 229 linhas. Incorporado e ampliado.
   - `src/components/intelligence/TopCategoriesCard.tsx` (158 linhas, categorias em alta a partir de `product_views` + trending score): reimplementado na main como `src/components/intelligence/TopProductFamiliesCard.tsx` (152 linhas, mesmo cabecalho "familias de produtos em alta extraidas de product_views"), com props de estado (isLoading/isError/onRetry), calculo movido para `src/pages/trends/trends-projections.ts` e consumido por `src/pages/TrendsPage.tsx` (`git grep -ln TopProductFamiliesCard origin/main` -> componente + TrendsPage + `tests/components/intelligence/market-signals-error-states.test.tsx`). Na branch o TopCategoriesCard tinha o mesmo unico consumidor (TrendsPage) e nenhum teste. Reimplementado com outro nome, melhor.
   - `src/types/jspdf-autotable.d.ts` (13 linhas, augmentation global de `jsPDF.lastAutoTable`): a main resolveu o mesmo problema com helper local `src/lib/pdf/auto-table.ts:2-9` (`lastAutoTable?:` opcional, mais seguro) + casts locais em `src/utils/personalizationExport.ts:211` e `src/utils/sicoob/orderDossierExport.ts:13-15`. Reintroduzir a augmentation global conflitaria com a tipagem opcional da main. Superado.

5) Lixo que NAO deve ser recuperado: `graphify-out/**` (9 arquivos) e `supabase/.temp/cli-latest` foram commitados por engano. `origin/main:.gitignore:73-74` ignora `graphify-out/` ("Saida gerada pelo graphify (grafo local por maquina)") e `:80` ignora `supabase/.temp/*`. AGENTS.md tambem diz que o grafo fica fora do Git.

6) Sem perda de banco: `git diff --name-only ... -- supabase/migrations/` lista 61 arquivos, e o cruzamento com as duas arvores mostra ZERO migrations presentes nos dois lados com conteudo diferente — os 61 sao migrations que so existem na main. Nenhuma migration exclusiva da branch, nenhuma violacao de imutabilidade.

7) Item 5 da tarefa confirmado: `origin/main:.github/workflows/contexto.yml` existe (414 linhas, ausente nesta branch antiga), nome "Contexto para agentes de IA (10 min)", publica na branch gerada `contexto` a partir de tres produtores (scripts/ai-context, scripts/supabase_snapshot, scripts/regras_negocio). A branch `contexto` e gerada automaticamente e nao e trabalho de agente a recuperar.

NAO VERIFICADO: nao reli os 2099 arquivos divergentes de src/tests/supabase um a um; o julgamento de que a main esta a frente neles se apoia no balanco de linhas (-49 mil na branch), nos 483 arquivos exclusivos da main contra 14 da branch (12 deles lixo gerado) e na ausencia de qualquer arquivo de codigo, migration ou edge function exclusivo da branch.

</details>

<a id="b-computadorlocal"></a>

#### `computador_local` — INCORPORADA · pode apagar: sim

`computador_local` nao e uma branch de trabalho: e um ponteiro parado no tip da main de 17/11/2026 18:12 (commit #296, "assinar URLs de storage privado"). Nao contem nenhuma alteracao propria — e a main um commit atras, com a arvore identica byte a byte.

<details><summary>Evidência</summary>

1) `git merge-base origin/main origin/computador_local` => c2b00997c90fc5722ec1de6ddf35099e19ad4300, que E o PROPRIO TIP da branch (`git log -1 origin/computador_local` => c2b00997... "fix: assinar URLs de storage privado (imagens, logos, videos e artes de mockup) (#296)", 17/11/2026 18:12). Ou seja: aqui, ao contrario das branches antigas, HA historico compartilhado com a main.

2) `git merge-base --is-ancestor origin/computador_local origin/main` => exit 0 (ANCESTOR=SIM).

3) `git rev-list --count origin/main..origin/computador_local` => 0. Nenhum commit exclusivo da branch. `git rev-list origin/main..origin/computador_local` => saida vazia.

4) Comparacao por CONTEUDO DE ARVORE (como exigido):
   - `comm -13 <(git ls-tree -r --name-only origin/main|sort) <(git ls-tree -r --name-only origin/computador_local|sort)` => VAZIO. Zero arquivos existem na branch e nao na main.
   - `comm -23 ...` => apenas 2 arquivos que a main tem e a branch nao: src/lib/quotes/quote-draft-scope.ts e tests/lib/quotes/quote-draft-scope.test.ts (main evoluiu depois).
   - Contagem: branch 4327 arquivos, main 4329.

5) `git diff --numstat origin/computador_local origin/main` => somente 4 arquivos, todos adicoes na direcao main (7/1 src/hooks/useQuoteBuilderState.ts, 8/0 src/lib/quotes/quote-draft-scope.ts, 1/1 src/pages/QuoteBuilderPage.tsx, 27/0 tests/lib/quotes/quote-draft-scope.test.ts). Esse delta e exatamente o unico commit que a main tem a frente: `git log origin/computador_local..origin/main` => 5ecb93f45d1785f1a3f6902a90277a545283009f, 18/11/2026 09:18, "fix: isola rascunho de orcamento por cooperativa e PA (#304)". Contagem: `git rev-list --count origin/computador_local..origin/main` => 1.

6) PROVA BYTE A BYTE (hash de arvore): `git rev-parse origin/computador_local^{tree}` => 4fb64bb16d4f8a8dd98f124aa905e61a294714a6 e `git rev-parse 'origin/main~1^{tree}'` => 4fb64bb16d4f8a8dd98f124aa905e61a294714a6. Hashes IDENTICOS. A arvore da branch e, byte a byte, a arvore da main um commit atras. Nao existe um unico byte na branch que nao esteja na main.

7) Sobre a branch `contexto` (item 5 do roteiro, verificado para o registro, nao e esta branch): `git show origin/main:.github/workflows/contexto.yml` confirma que ela e gerada automaticamente — cabecalho diz "UMA branch gerada (`contexto`)" e "a saida vai para a branch `contexto`"; `name: Contexto para agentes de IA (10 min)`. NAO VERIFICADO o cron atual em detalhe: a main tem o commit 223fcf71 "chore: contexto agendado de 10 min para 1x/hora (#280)", portanto a cadencia real pode ser horaria, nao de 10 min — nao li o bloco `schedule` do arquivo.

NAO VERIFICADO: nao foi checado se existe PR associada a esta branch (restricao de somente leitura local; nao consultei a API do GitHub). Irrelevante para o veredito, pois a prova de arvore e suficiente.

</details>

<a id="b-devin1791201000-ux-onda2"></a>

#### `devin/1791201000-ux-onda2` — PERDIDA · pode apagar: NÃO

Onda 2 do pacote de UX de navegação: guarda unificada de "alterações não salvas" (store + diálogo global + useDirtyGuard), "voltar" que primeiro fecha o modal/menu aberto, menu de histórico para voltar vários passos, restauração de scroll no POP (window e grades virtualizadas), filtros persistidos na URL em orçamentos/pedidos, correção de corrida no autosave do kit (incluindo identidade do kit no payload) e limpeza do histórico de navegação no logout. Nada disso está na main.

Arquivos que existem na branch e não na `main`:

- `src/lib/overlay.ts`
- `src/stores/useNavigationGuardStore.ts`
- `src/hooks/useDirtyGuard.ts`
- `src/hooks/useScrollRestoration.ts`
- `src/components/common/NavigationGuardDialog.tsx`
- `src/components/common/NavigationHistoryMenu.tsx`
- `tests/lib/overlay.test.tsx`
- `tests/stores/useNavigationGuardStore.test.ts`
- `tests/hooks/useScrollRestoration.test.tsx`
- `tests/hooks/useSmartNavigation.test.tsx`
- `tests/components/NavigationGuardDialog.test.tsx`
- `tests/components/NavigationHistoryMenu.test.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`

A recuperar:

- **Recuperar a entrega inteira pela branch origin/devin/1791190000-ux-onda1 (PR #100), nao por esta: ux-onda2 e subconjunto byte a byte dela** — A PR #101 (ux-onda2 -> ux-onda1) foi MERGEADA em 12/10/2026 (merge_commit_sha e2c9279); quem foi fechada sem merge em 31/10 15:54 foi a PR #100 (ux-onda1 -> main). git diff --numstat ux-onda1 ux-onda2 nao lista nenhum arquivo exclusivo de ux-onda2, e ux-onda1 ainda traz GlobalConfirmDialog, uxMetrics, a troca de window.confirm por dialogo do design system em ~12 telas admin e um useScrollRestoration melhor (reaplica window.scrollTo nas tentativas escalonadas, nao so uma vez). Trabalhar na ux-onda2 jogaria fora a Onda 3.
- **Guarda unificada de alteracoes nao salvas no voltar global (botao, breadcrumbs, swipe, atalho)** — Hoje a main so pede confirmacao em 3 rotas por substring e com window.confirm (src/hooks/useSmartNavigation.ts:38), e o useUnsavedChangesGuard existente e local por pagina. Montar kit ou orcamento em qualquer outra rota e apertar voltar/swipe perde o trabalho do vendedor sem aviso.
- **Autosave do kit: incluir identidade no payload e corrigir a corrida com o save manual** — Na main buildAutoSavePayload nao envia kitIdentityLabels/kitIdentityDetails: a cada autosave o kit salvo perde nome, cor, icone, descricao e favorito que o usuario definiu. E um save manual que ultrapasse um autosave em voo deixa gravado o snapshot antigo. Dado de cliente perdido silenciosamente.
- **Limpar o historico de navegacao no logout (vazamento entre usuarios no mesmo navegador)** — src/stores/useNavigationStore.ts:50 persiste em localStorage 'navigation-history' os titulos das paginas visitadas (nomes de orcamentos e kits) e clearSensitiveBrowserData() (AuthContext.tsx:100-112) nao apaga essa chave nem chama clear(). Logout + login de outro vendedor na mesma maquina expoe os orcamentos do anterior.
- **Voltar fecha o overlay aberto antes de sair da pagina, com tooltip excluido e tour protegido do Escape** — Comportamento esperado de app: com modal/menu aberto, voltar fecha o overlay em vez de abandonar a tela. Sem isso o usuario sai da pagina sem perceber e perde o contexto.
- **Restauracao de scroll ao voltar (window + grades virtualizadas) e menu de historico de varios passos** — Voltar do detalhe do produto para o catalogo hoje joga o usuario no topo da grade; em catalogo longo isso derruba a navegacao de quem monta kit. O useScrollRestoration da ux-onda1 e o melhor dos dois (reaplica em 0/150/400/900ms).
- **Filtros de orcamentos e pedidos persistidos na URL e ressincronizados** — Filtro perdido ao voltar do detalhe obriga o vendedor a refiltrar a cada consulta; com a querystring a visao filtrada tambem passa a ser compartilhavel por link.
- **Suite de testes da entrega (6 arquivos, ~418 linhas) que nunca entrou na main** — Sem esses testes a guarda de navegacao entra sem rede de protecao; eles ja existem prontos na branch e cobrem POP vs PUSH, overlay x tooltip, resolucao do guard e dedup do smart-back.

<details><summary>Evidência</summary>

COMANDOS E SAIDAS-CHAVE (tudo somente leitura; nenhum commit, push ou checkout).

1) Sem ancestralidade comum, como previsto: `git merge-base origin/main origin/devin/1791201000-ux-onda2` -> vazio. Head da branch: c1c9095f17319ac78f4198fe8c1482491bfa4acf, "test(nav): importa ReactNode no teste de restauracao de scroll", 11/10/2026, autor Joaquim Promo Brindes <adm01@promobrindes.com.br>. 15 commits de UX sobre a base dc08200b (PR #98, 08/10/2026).

2) Arquivos so na branch: `comm -13 <(git ls-tree -r --name-only origin/main|sort) <(git ls-tree -r --name-only origin/devin/1791201000-ux-onda2|sort)` -> 14 arquivos (os 12 de navegacao + TopCategoriesCard.tsx + pendencias-2026-09-12.cenarios.tsx).

3) Escopo real dos 15 commits: `git diff --numstat origin/devin/1791201000-ux-onda2~15 origin/devin/1791201000-ux-onda2` -> 28 arquivos, 1088 insercoes / 95 delecoes. Nenhum em supabase/, .github/workflows/ ou scripts/ — e so front + testes, sem DDL, sem segredo, sem workflow.

4) A melhoria NAO esta na main sob nenhum nome. `git grep -l <padrao> origin/main -- src tests` deu 0 para: dismissTopmostOverlay, hasOpenOverlay, useNavigationGuardStore, useDirtyGuard, useScrollRestoration, data-scroll-restore, NavigationHistoryMenu, NavigationGuardDialog, requestConfirmation, goBackStack. O unico parente na main e src/hooks/useUnsavedChangesGuard.ts, que e guarda LOCAL por pagina (beforeunload + guardNavigation(action)), nao a guarda global do voltar.

5) A main nao evoluiu esses arquivos desde 08/10 — comparacao de md5 base(~15) x main x branch, arquivo por arquivo: IDENTICOS a base (logo a melhoria da branch e puramente aditiva e ainda aplicavel): UnsavedChangesDialog.tsx, MainLayout.tsx, OnboardingTour.tsx, OrderFilters.tsx, VirtualizedProductGrid.tsx, AuthContext.tsx, useCustomKitPersistence.ts, useKitAutoSave.ts, useSmartNavigation.ts, QuotesListPage.tsx, AdminTemasPage.tsx, tests/hooks/useKitAutoSave.test.tsx. Evoluiram na main por OUTRO assunto (conflito trivial): PersistentBreadcrumbs.tsx (+1 linha: rotulo "/gestor/delegacoes"), KitBuilderPage.tsx (path do PageSEO /kit-builder -> /montar-kit), OrdersPage.tsx (botao /catalogo -> /filtros), QuoteBuilderPage.tsx (readOnly/canEdit e draftScopeId). `diff <(git show ...~15:src/hooks/useKitAutoSave.ts) <(git show origin/main:src/hooks/useKitAutoSave.ts)` -> saida vazia (byte a byte igual).

6) PREMISSA DA TAREFA INCORRETA — esta branch TEM PR. `gh api repos/adm01-debug/Brindes_Sicoob_V2/pulls/101` -> head devin/1791201000-ux-onda2, base devin/1791190000-ux-onda1, merged=true, merge_commit_sha e2c92799f8d12849dbb8a7318dac2fdfb8e14250, closed_at 2026-10-12T10:39:44Z. `git rev-parse pr/101 origin/devin/1791201000-ux-onda2` -> mesmo SHA c1c9095. Ou seja: a Onda 2 foi integrada na Onda 1 e quem morreu na janela de 31/10 15:54 foi a PR #100: `gh api .../pulls/100` -> head devin/1791190000-ux-onda1, base main, merged=false, closed_at 2026-10-31T15:54:26Z.

7) ux-onda1 e superconjunto byte a byte de ux-onda2. `git diff --numstat origin/devin/1791190000-ux-onda1 origin/devin/1791201000-ux-onda2` nao lista nenhum arquivo exclusivo da onda2; as diferencas sao a onda1 ter a MAIS: GlobalConfirmDialog.tsx (28 linhas), src/lib/uxMetrics.ts (31 linhas), trackUx instrumentado em useSmartNavigation/useScrollRestoration/NavigationHistoryMenu, troca de window.confirm por dialogo do design system em ~12 paginas admin (head aeb7fb645, "Onda 3"), e um useScrollRestoration superior (restoreAll reaplica window.scrollTo em 0/150/400/900ms; a onda2 so faz um scrollTo imediato). Portanto a recuperacao correta e pela ux-onda1 / PR #100.

8) Risco de regressao baixo: a variante usada pela branch no PageTransition ja existe na main — `git grep -n "dynamic-slide" origin/main -- src` -> src/components/effects/PageTransition.tsx:13 e :34. Nenhuma dependencia nova em package.json nos 15 commits.

9) Privacidade confirmada na main: `git show origin/main:src/stores/useNavigationStore.ts | grep -nE "name:|clear"` -> :47 clear() existe, :50 name: 'navigation-history' (persistido com title de cada pagina); `git show origin/main:src/contexts/AuthContext.tsx` linhas 100-112 mostram clearSensitiveBrowserData() removendo apenas product-favorites, product-comparison, recently-viewed-products e duplicate_product — 'navigation-history' fica.

10) Os 2 arquivos fora do escopo UX: (a) `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` — `diff` contra `origin/main:scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx` -> IDENTICO, foi so renomeado para .test.tsx na main; nada a recuperar. (b) `src/components/intelligence/TopCategoriesCard.tsx` (159 linhas) — a main o substituiu por `src/components/intelligence/TopProductFamiliesCard.tsx` (152 linhas), reimplementacao melhor (orientada a props, com estado de erro, retry e tipo ProductFamilyTrend de pages/trends/trends-projections); OBSOLETO, nao recuperar.

11) Passo 5 da tarefa (branch contexto): confirmado que e gerada por workflow, mas o intervalo do enunciado esta desatualizado — `git show origin/main:.github/workflows/contexto.yml` linha 37: `- cron: '7 * * * *'` (HORARIA, minuto 7), mais push em branches [main] (linha 23) e workflow_dispatch; CONTEXTO_BRANCH=contexto (linha 61). Ultimo commit de origin/contexto: ede4a5b1e 2026-11-18 12:22:53 +0000 "chore(contexto): 1 fonte(s) regerada(s) @ main 5ecb93f [skip ci]" — viva e automatica, nao auditavel como trabalho humano.

NAO VERIFICADO: nao rodei vitest, typecheck, lint nem build sobre o conteudo da branch (a tarefa proibe escrita e npm install, e a base da branch e de 08/10 — o resultado nao seria representativo de um rebase na main atual). O custo de rebase e a passagem no CI precisam ser medidos na PR de recuperacao.

CONCLUSAO SOBRE APAGAR: pode_apagar=false. Nenhuma linha util desta branch esta na main. Ela nao tem conteudo exclusivo (e subconjunto byte a byte de origin/devin/1791190000-ux-onda1), entao apagar ux-onda2 nao destroi nada DESDE QUE ux-onda1 continue existindo — mas pela regra do dono so liberar a deleção depois que o conteudo estiver na main.

</details>

<a id="b-docsplano150-20260927"></a>

#### `docs/plano150-20260927` — INCORPORADA · pode apagar: sim

Branch de documentação com um único commit próprio (f47e5d8e3, 27/09/2026) que criou o "Plano de correções e melhorias em 150 etapas" (plano.md/json, etapas.csv, rastreabilidade.csv, validacao.json), o gerador Python do plano e os links nos dois READMEs de docs. Não altera código de produto.

Arquivos que existem na branch e não na `main`:

- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependencias_sustentam_as_notificacoes_de_ap.md`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `supabase/.temp/cli-latest`
- `tests/hooks/useCollections.test.tsx`

A recuperar:

- **Resíduo da linhagem antiga da main (NÃO é trabalho desta branch): 3 arquivos de código e 1 teste que existem na árvore antiga e não na main atual** — Vêm do commit pai 3094cbab2 (main pré-reenraizamento), não do commit desta branch, e estão em 247 refs — apagar esta branch não os perde. Além disso, 3 dos 4 já foram substituídos na main por implementação melhor: jspdf-autotable.d.ts -> wrapper tipado src/lib/pdf/auto-table.ts; InvoicePaymentPanel.tsx (48 linhas, sem nenhum import em toda a branch = código morto) -> src/components/orders/OrderInvoicesManager.tsx + src/hooks/orders/extensions/useOrderInvoices.ts + tests/hooks/useOrderInvoices.test.tsx; useCollections.test.tsx -> tests/hooks/useCollections.test.ts + tests/hooks/useCollections.react.test.tsx. Só TopCategoriesCard.tsx (card de categorias em alta na TrendsPage) não tem equivalente na TrendsPage atual, e usa heurística crua (primeira palavra do nome do produto como categoria), tipo de "inteligência simulada" que a main removeu deliberadamente (ex. 7be296acf, afcc1e2ba) — recuperar só se o dono quiser a visão de categorias na tela de Tendências, aí com dados reais via src/hooks/bi/useIndustryCategoryTrends.ts.

<details><summary>Evidência</summary>

1) Contribuição própria da branch = 1 commit. `git log --oneline origin/docs/plano150-20260927` -> topo f47e5d8e3 "docs: cria plano de correções e melhorias em 150 etapas"; pai 3094cbab2 (main antiga, PR #41). `git merge-base origin/main origin/docs/plano150-20260927` -> vazio (reenraizamento confirmado), por isso toda comparação foi por conteúdo de árvore.

2) `git show --name-status f47e5d8e3` -> 8 arquivos: M docs/README.md, M docs/plano-implementacao/README.md, A docs/plano-implementacao/plano-150-etapas-20260927/{etapas.csv,plano.json,plano.md,rastreabilidade.csv,validacao.json}, A scripts/revisao/gerar-plano-150-20260927.py.

3) Comparação de blob (byte a byte) branch vs origin/main: os 6 arquivos criados são IDÊNTICOS na main — etapas.csv 5457c74585cede1040253bc24a936119d8af7318, plano.json 551f8221ce8ebe6463cf41bb5021c8fcf6f9d8d8, plano.md 79d9f2d49981a53d7cc49748a307cfdaf79b5c0d, rastreabilidade.csv 0bf6eb157ec3e2aa35070581a855494ad20338b3, validacao.json 0b5986432d512f40d1fb9d4c4220e4bf758cdfac, gerar-plano-150-20260927.py 14655db5790a869f651d5945930ddcde5dd7280d (mesmo hash nos dois lados).

4) `git show origin/main:docs/plano-implementacao/README.md | grep -n "150 etapas"` -> linhas 64-66 contêm a seção exata adicionada pelo commit (texto idêntico ao diff). Linha 3 da main: o plano de encerramento de 01/10/2026 "Consolida as 150 etapas funcionais e as 100 de workflows auditadas".

5) `git show origin/main:docs/README.md | grep -n "plano-150\|150 etapas"` -> nenhum resultado; o arquivo tem 55 linhas na main (branch tinha 128) e aponta para o plano de encerramento (linha 17) e para docs/plano-implementacao/README.md (linha 41). Única diferença real = o parágrafo de índice, superseded.

6) Arquivos só na branch: `comm -13 <(sort main.txt) <(sort branch.txt)` -> 15, todos herdados do pai 3094cbab2 (verificado: `git ls-tree -r --name-only 3094cbab2` lista TopCategoriesCard.tsx, InvoicePaymentPanel.tsx, jspdf-autotable.d.ts, useCollections.test.tsx). graphify-out/* e supabase/.temp/cli-latest são artefato gerado/fora do Git hoje (AGENTS.md: "Grafo em graphify-out/ ... fora do Git"). scripts/revisao/pendencias-2026-09-12.cenarios.tsx é BYTE-IDÊNTICO a scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx da main (`diff` dos dois blobs = vazio) — só renomeado.

7) `git for-each-ref --contains 3094cbab2` -> 247 refs; a árvore antiga não depende desta branch para sobreviver.

8) Passo 5 do roteiro — CORREÇÃO FACTUAL VERIFICADA: a branch `contexto` é gerada por .github/workflows/contexto.yml, mas o cron é `7 * * * *` (linha 37: "minuto 7") = HORÁRIO, não a cada 10 min, mais `push: branches: [main]` (linhas 22-23). O nome do workflow ("Contexto para agentes de IA (10 min)", linha 19) e o AGENTS.md dizem 10 min e estão desatualizados em relação ao cron real. A saída vai para a branch `contexto` porque a main tem branch protection (linhas 11-14). Logo `contexto` é descartável/regenerável — nunca candidata a recuperação de trabalho.

NÃO VERIFICADO: não executei typecheck, lint ou testes (tarefa é somente leitura).

</details>

<a id="b-execucaosicoob-20260911130857"></a>

#### `execucao/sicoob-20260911130857` — PARCIAL · pode apagar: NÃO

Snapshot de execucao de 13/09/2026 (tip 47c474a6, "fix(sicoob): corrige a migration de follow-up e os simuladores de QA") contendo o estado inteiro do produto naquela data — paginas monoliticas, mocks de confianca de fornecedor, WebAuthn/webhooks legados e 19 migrations de bootstrap "GIFTS STORE" de jan/2025. A main de 18/11/2026 e a evolucao direta desse mesmo codigo, com dois meses de refatoracao, endurecimento de seguranca e 831 arquivos a mais.

Arquivos que existem na branch e não na `main`:

- `.env.production`
- `api_usage.json`
- `audit_report.pdf`
- `bun.lock`
- `dependencies.json`
- `service_map.txt`
- `triage-edge-typecheck.json`
- `supabase/.temp/cli-latest`
- `public/AUDIT_ENTERPRISE_FINAL.pdf`
- `public/reports/AUDIT_REPORT_20a6b98b1.pdf`
- `public/reports/AUDIT_REPORT_37d88d6bf.pdf`
- `public/reports/AUDIT_REPORT_3b0427aef.pdf`
- `public/reports/AUDIT_REPORT_6a6993b3a.pdf`
- `public/reports/AUDIT_REPORT_892fa9f31.pdf`
- `public/reports/AUDIT_REPORT_afc944619.pdf`
- `public/reports/AUDIT_REPORT_b342d62cb.pdf`
- `public/reports/AUDIT_REPORT_d9912d316.pdf`
- `public/reports/AUDIT_REPORT_e3392dc9c.pdf`
- `public/reports/AUDIT_REPORT_e6b40b200.pdf`
- `public/reports/AUDIT_REPORT_ea7691634.pdf`
- `public/reports/AUDIT_REPORT_f9c1c233d.pdf`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/hooks/useSupplierTrust.ts`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `supabase/migrations/20250103_01_remove_gamification.sql`
- `supabase/migrations/20250103_02_rls_organizations.sql`
- `supabase/migrations/20250103_03_seed_final.sql`
- `supabase/migrations/20250103_04_tests_final.sql`
- `supabase/migrations/20250103_05_rls_remaining.sql`
- `supabase/migrations/20250103_05_rls_remaining_FIXED.sql`
- `supabase/migrations/20250103_06_validation_final.sql`
- `supabase/migrations/20250103_07_complete_catalog_structure.sql`
- `supabase/migrations/20250103_complete_schema.sql`
- `supabase/migrations/20250103_mockup_ai_complete.sql`
- `supabase/migrations/20250103_rls_no_gamification.sql`
- `supabase/migrations/20250103_rls_policies.sql`
- `supabase/migrations/20250103_schema_no_gamification.sql`
- `supabase/migrations/20250103_seed_data.sql`
- `supabase/migrations/20250103_seed_no_gamification.sql`
- `supabase/migrations/20250103_seed_updated.sql`
- `supabase/migrations/20250103_test_queries.sql`
- `supabase/migrations/20250103_tests_no_gamification.sql`
- `supabase/migrations/20250103_tests_updated.sql`
- `supabase/migrations/20251227_add_tags_to_quotes.sql`
- `supabase/migrations/20251227_audit_log_universal.sql`
- `supabase/migrations/20251227_product_price_history.sql`
- `supabase/migrations/20251227_push_subscriptions.sql`
- `supabase/migrations/20251227_quote_comments.sql`
- `supabase/migrations/20251227_secure_approval_tokens.sql`
- `supabase/migrations/20251227_sql_optimizations.sql`
- `supabase/migrations/20251227_sync_jobs.sql`
- `supabase/migrations/20251227_user_filter_presets.sql`
- `supabase/migrations/20251228_analytics_events.sql`
- `supabase/migrations/20251228_audit_trail.sql`
- `supabase/migrations/20251228_cache_entries.sql`
- `supabase/migrations/20251228_feature_flags.sql`
- `supabase/migrations/20251228_optimization_logs.sql`
- `supabase/migrations/20251228_quote_versioning.sql`
- `supabase/migrations/20251228_rate_limits.sql`
- `supabase/migrations/20251228_redis_config.sql`
- `supabase/migrations/20251228_scheduled_reports.sql`
- `supabase/migrations/20251228_template_versions.sql`
- `supabase/migrations/20251228_two_factor_secrets.sql`
- `supabase/migrations/20251228_websocket_sessions.sql`

A recuperar:

- **Religar os selos de confianca do fornecedor na pagina do produto com dado real (sem mock)** — A main renderiza DynamicTrustBadges com a constante EMPTY_SUPPLIER_TRUST (ProductDetailHeroSections.tsx:24 e :212), entao prazo de entrega e 'fornecedor aprovado' nunca aparecem — prova social morta na tela de venda. A main JA tem a fonte certa: useProductSupplierSources(productId) retorna lead_time_days (src/hooks/useProductSupplierSources.ts:17,38) sobre variant_supplier_sources. A recuperacao e trocar a constante por esse hook; NAO recuperar o src/hooks/useSupplierTrust.ts da branch como esta, porque ele cai em getMockSupplierTrust em todo caminho de erro e o avgRating dele e 100% mock (comentario 'Mock rating (no ratings table exists yet)', linhas 98-100) — mock e proibido por AGENTS.md. avgRating fica null ate existir tabela de avaliacoes (nao ha product_reviews referenciado na main).

<details><summary>Evidência</summary>

LINHAGEM. `git log -1 origin/execucao/sicoob-20260911130857` = 47c474a67b7fce2f2640f31fd032cf195baa8501, 13/09/2026. main = 5ecb93f45, 18/11/2026. Arvores: branch 3498 arquivos, main 4329 (`git ls-tree -r --name-only | wc -l`).

MAIN E SUPERCONJUNTO MEDIDO. tests: 399 na branch / 570 na main; scripts: 72 / 189; supabase/functions: 167 / 191; e2e: 151 / 153; .github/workflows: 10 / 16, com ZERO workflow exclusivo da branch (`comm -23`). docs: ZERO arquivos exclusivos da branch, 310 exclusivos da main. tests/rls: lista de 7 arquivos IDENTICA nos dois lados. Divida tecnica: `.eslint-baseline.json` tem 3585 linhas na branch contra 3 na main; `.typecheck-baseline.json` 441 contra 3 — a main esta zerada, a branch carregava 3582 pendencias de lint.

TESTE MECANICO DE SIMBOLOS. Extraidos todos os `export function|const|class|interface|type|enum` de src+supabase/functions+scripts+tests+e2e: 3952 simbolos na branch, 4205 na main. `comm -23` => apenas 12 simbolos exclusivos da branch, todos resolvidos: MOCK_TOP_CATEGORIES e getMockSupplierTrust (mocks, removidos de proposito — AGENTS.md proibe mock); __TEST__, __authDebugInternals, __resetSchemaStatsForTests (ganchos internos de teste; os arquivos src/lib/auth/auth-debug.ts, src/lib/personalization/adapters/schema-detection.ts e src/components/admin/connections/useFocusContext.ts seguem existindo na main); buildWhatsAppUrl/handleDownloadPDF/handleSyncBitrix (reimplementados em src/pages/quote-view/useQuoteViewData.ts:143,193,239 e ligados em src/pages/QuoteViewPage.tsx:157); useZoneCommandPaletteShortcut (virou useZoneCommandPalette em src/components/admin/connections/ZoneCommandPalette.tsx:177 + ZoneCommandTrigger.tsx); TopCategoriesCard; InvoicePaymentPanel; useSupplierTrust.

ARQUIVOS EXCLUSIVOS, UM A UM. (a) TopCategoriesCard.tsx: reimplementado como src/components/intelligence/TopProductFamiliesCard.tsx, com a mesma heuristica ("familia e aproximada pelo primeiro termo do nome do produto"), alimentado por computeProductFamilyTrends em src/pages/trends/trends-projections.ts:337 usando calculateTrendingScore (linha 354) e ligado na UI em src/pages/TrendsPage.tsx:632 — versao da main e superior (recebe dados por prop, tem estados de erro/retry). (b) InvoicePaymentPanel.tsx: era CODIGO MORTO na branch — `git grep` nao encontra nenhum import dele em src; a main cobre o assunto com src/components/orders/OrderInvoicesManager.tsx (hook real useOrderInvoices, upload e download de NF) e FinancialPanel.tsx. (c) src/types/jspdf-autotable.d.ts: removido de proposito — scripts/tscheck-files.mjs:26 na main documenta que esse .d.ts global gerava falso-positivo; a main usa casts locais em src/lib/pdf/auto-table.ts:9 e src/utils/sicoob/orderDossierExport.ts:13. (d) tests/hooks/useCollections.test.tsx: a main tem DOIS testes do mesmo hook (tests/hooks/useCollections.test.ts e tests/hooks/useCollections.react.test.tsx). (e) scripts/revisao/pendencias-2026-09-12.cenarios.tsx: renomeado — `diff` contra scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx da main retorna exit=0, byte a byte identico. (f) .env.production: contem somente VITE_SUPABASE_URL/PUBLISHABLE_KEY/ANON_KEY/PROJECT_ID (verificado com os valores suprimidos) — toda VITE_* e publica por definicao, nao ha service_role nem PAT; a main substituiu por .env.production.example, correto. (g) Ruido descartado: bun.lock (no .gitignore), dependencies.json, api_usage.json, service_map.txt, triage-edge-typecheck.json, supabase/.temp/cli-latest, audit_report.pdf e os 12 PDFs de public/reports/.

MIGRATIONS. As 21 de 20251227/20251228 estao TODAS na main, apenas renomeadas com timestamp completo; amostra byte a byte: `diff <(git show branch:supabase/migrations/20251227_secure_approval_tokens.sql) <(git show main:supabase/migrations/20251227100002_secure_approval_tokens.sql)` => exit=0. As 19 de 20250103_* nao existem na main e sao obsoletas: cabecalho "GIFTS STORE - REMOVER GAMIFICACAO / Data: 03/01/2025", criam e depois dropam tabelas de gamificacao (user_points, achievements, rewards), e vem em variantes rascunho do mesmo arquivo (_FIXED, _updated, _no_gamification, complete_schema, mockup_ai_complete, test_queries) — geracao anterior do projeto, superada pelo ledger de 590 migrations da main.

DIVERGENCIAS GRANDES, TODAS EXPLICADAS. 1866 arquivos divergem. Os 25 maiores onde a branch tem MAIS linhas foram abertos nos dois lados: src/pages/sicoob/orders/OrdersPage.tsx (904 linhas na branch contra 313 na main) e um monolito que a main quebrou em funcoes tipadas (useOrderFilters, useOrdersData, useOrderExports, tipos SicoobOrder, utils isCommittedSicoobOrder/sumCommittedSicoobOrders) — mesma lista de arquivos no diretorio, mesma funcionalidade; o useGlobalShortcuts que a branch chamava dentro da pagina (linha 89) subiu para src/components/layout/MainLayout.tsx na main, cobertura maior. Tres casos de "branch tem muito mais codigo" sao remocoes DELIBERADAS de seguranca na main, com justificativa escrita no proprio arquivo: supabase/functions/quote-public-view/index.ts (419 -> 27 linhas, "Compatibilidade encerrada. O fluxo antigo gravava a resposta em bancos distintos, sem transacao e sem verificar os erros das escritas", responde 410), supabase/functions/product-webhook/index.ts (300 -> 6 linhas, "endpoint_desativado"), src/hooks/useWebAuthn.ts (349 -> 33 linhas, "O fluxo antigo comparava somente credential_id e podia declarar um user_id autenticado sem verificar resposta, origem, RP ID ou contador"). Recuperar qualquer um desses seria reintroduzir vulnerabilidade.

NAO VERIFICADO: nao rodei typecheck, lint nem vitest (tarefa somente leitura); nao abri individualmente os 1866 arquivos divergentes — a cobertura vem do teste de simbolos exportados (12 de 3952 exclusivos, todos auditados) somado aos 25 maiores deltas de linha a favor da branch.

</details>

<a id="b-featpdf-playwright-scripts-art-261108-0516"></a>

#### `feat/pdf-playwright-scripts-art-261108-0516` — INCORPORADA · pode apagar: sim

Branch de 08/11/2026 (sem PR) cujo delta proprio sao 4 commits sobre 9 arquivos de scripts: implementar geracao real de PDF via Playwright em scripts/md-to-pdf-stub.mjs e "amaciar" exit codes de scripts historicos/QA (sair 0 em vez de 1 quando havia divergencia ou falta de Docker). Todo o resto da arvore e a main antiga de 08/11 herdada por fork, nao trabalho da branch.

Arquivos que existem na branch e não na `main`:

- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`

<details><summary>Evidência</summary>

1) DELTA PROPRIO DA BRANCH = 9 ARQUIVOS. `git log --oneline -15 origin/feat/pdf-playwright-scripts-art-261108-0516` mostra que acima do ultimo squash de PR mergeada (ff7f2a4e5 "...(#225)") ha somente 4 commits: 1858c8918 (feat PDF Playwright), 28eff1d4a, 95dead5ca, 3d1e7355a. `git show --stat` desses 4 commits: scripts/md-to-pdf-stub.mjs, scripts/check-codeql-sarif.mjs, scripts/qa/postgres_ready.py, scripts/revisao/gerar-matriz.py, gerar-revisao-2026-09-{12,24,27}.py, simular-pendencias-2026-09-12.py, simular-status-20260927.py. `git merge-base` retorna vazio (main re-enraizada), por isso toda a comparacao foi por conteudo de arvore.

2) O FEAT PRINCIPAL ESTA NA MAIN, EM VERSAO SUPERIOR. `git diff origin/main <branch> -- scripts/md-to-pdf-stub.mjs`: main=182 linhas vs branch=144; a main importa `chromium` de playwright, tem o mesmo `page.pdf()`/CSS e ainda adiciona o que a branch nao tem (descoberta do relatorio mais recente por data de commit via `recency()`, busca em reports/ e public/reports/, fallback do dossie V5 e guarda "a saida sobrescreveria a entrada"). O diff main->branch so REMOVE codigo.

3) AS DEMAIS MUDANCAS DA BRANCH SAO FALSO-VERDE QUE A MAIN REJEITOU DE PROPOSITO. `scripts/qa/postgres_ready.py`: branch=44 linhas saindo 0 sem Docker; main=106 linhas cujo docstring diz textualmente "no CI ... sem Docker ela FALHA (exit 1). Sair 0 ali deixava o job verde sem afirmar nada", com QA_ALLOW_SKIP/QA_REQUIRE_DOCKER, SIGTERM handler, tail de log e `run_overlapping` (prova real de concorrencia) — nada disso existe na branch. `scripts/check-codeql-sarif.mjs`: main lanca erro quando `run.results` esta ausente ou `executionSuccessful=false`; a branch usa `run.results ?? []` (engole analise nao confiavel). `scripts/revisao/gerar-matriz.py`, `gerar-revisao-2026-09-12/27.py`: main tem `_garantir_commit()` (fetch do commit historico em clone raso) e mantem exit 1; a branch apagou o helper e trocou exit 1 por exit 0. `gerar-revisao-2026-09-27.py`: main tem `lineterminator='\n'` no CSV (evita 1641 linhas de diff falso), a branch nao. `scripts/revisao/simular-status-20260927.py` e byte-identico nos dois lados. `simular-pendencias-2026-09-12.py`: unica diferenca da branch e whitespace em fim de linha.

4) OS 2 ARQUIVOS "AUSENTES NA MAIN" NAO SAO PERDA. `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` foi apenas RENOMEADO na main para `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx` — `diff` entre os dois blobs retorna vazio (IDENTICOS) e `scripts/revisao/vitest-pendencias-2026-09-12.config.ts` da main ja aponta para o novo nome. `src/components/intelligence/TopCategoriesCard.tsx` (159 linhas) foi REIMPLEMENTADO na main como `src/components/intelligence/TopProductFamiliesCard.tsx` (152 linhas), importado em src/pages/TrendsPage.tsx:37, com a query extraida para `src/pages/trends/trends-projections.ts` e ganhando estados de erro/retry (`ProductFamiliesError`) que a versao da branch nao tinha.

5) TESTE DE DIRECAO EM TODOS OS 226 ARQUIVOS DIVERGENTES. Para cada caminho divergente levantei todos os blobs historicos da branch (`git log --format='%H:<path>' <branch> -- <path>` = 3190 pares, resolvidos com `git cat-file --batch-check`) e comparei com o blob da main: 0 de 226 arquivos tem a versao da main dentro do historico da branch. Ou seja, em nenhum arquivo a main esta num estado que a branch ja passou — a main e sempre posterior. Numstat confirma o padrao (ex.: `0 14` em supabase/functions/_shared/authorize.ts, `0 43` em src/integrations/supabase/types.ts, `0 14` em .github/workflows/ci.yml e tests/p0/webhooks-resilience.test.ts: a branch nao adiciona nada).

6) OS CASOS EM QUE A BRANCH TINHA MAIS LINHAS FORAM ABERTOS UM A UM E TODOS SAO DECISAO DELIBERADA DA MAIN. supabase/functions/health-check/index.ts: branch=73 linhas sondando banco com SERVICE_ROLE e CORS "*"; main=4 linhas delegando a `health-check/contract.ts` (liveness com allowlist de CORS, 405 fora de GET, "nao acessa banco, secrets ou servicos externos"), com as sondas profundas em system-healthcheck/connections-health-check/migration-health-check. src/components/search/GlobalSearch.tsx: o listener Cmd/Ctrl+K de 12 linhas da branch existe na main em src/components/command/GlobalCommandBar.tsx:64. src/components/admin/connections/ZoneCommandPalette.tsx + ZoneCommandTrigger.tsx: a main removeu o atalho local de proposito e documenta isso em teste — tests/components/admin/connections/ZoneCommandPalette.test.tsx:20 "nao captura Ctrl+K, reservado a barra global de comandos". src/hooks/quote/useQuoteInitialization.ts: o parse de `items[]` foi extraido para src/hooks/quote/quote-url-prefill.ts:45 e useQuoteUrlPrefill.ts:45. scripts/check-npm-audit.mjs: a funcao `summarize` saiu para scripts/lib/npm-audit-policy.mjs (existe na main). src/pages/PublicFavoriteListPage.tsx e src/hooks/useFavoriteReactions.ts: tipos/queries extraidos para modulos proprios. scripts/api_map.cjs e scripts/generate_api_map.js: a unica diferenca e a branch exigir `\)` no regex, o que deixa de casar `supabase.rpc('fn', { args })` — regressao, nao melhoria. scripts/check_tables.js: a main tem `if (missing.length > 0) process.exit(1)` que a branch apagou. scripts/load-test.mjs: a main manda Authorization Bearer e reserva o slot antes do await; a branch nao. scripts/db/.inventory-cache.json (996 linhas de diferenca) e cache gerado — ruido, como package-lock.json e docs gerados.

7) RUIDO IGNORADO conforme instrucao: package-lock.json, package.json, scripts/db/.inventory-cache.json, docs/** e relatorios (PENDENCIAS.md, RELATORIO_CI.md, AGENTS.md), todos com a main a frente.

8) CONTEXTO (checagem pedida, nao se aplica a esta branch): `git show origin/main:.github/workflows/contexto.yml` confirma "name: Contexto para agentes de IA (10 min)" e que a saida vai para a branch gerada `contexto` — ela e produzida por automacao, nao por agente.

NAO VERIFICADO: nao rodei os scripts (tarefa somente leitura, sem npm install e sem Docker); a conclusao e por leitura de codigo byte a byte.

</details>

<a id="b-fixexecucao-plano-20260928"></a>

#### `fix/execucao-plano-20260928` — INCORPORADA · pode apagar: sim

Branch de execução do "plano de 150 etapas" (28/09/2026) que endureceu o salvamento de orçamentos (idempotência por chave + row_version otimista), isolou o rascunho de autosave por usuário, corrigiu o histórico de verba por cooperativa nos relatórios Sicoob e fechou gates de CI. É a branch de origem da PR #74, que foi MERGEADA; os 2 commits posteriores foram reaplicados na branch irmã `fix/execucao-plano-final-20260928` e também chegaram à main.

Arquivos que existem na branch e não na `main`:

- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/types/jspdf-autotable.d.ts`
- `supabase/.temp/cli-latest`
- `tests/hooks/useCollections.test.tsx`

<details><summary>Evidência</summary>

1) IDENTIDADE E PR
`git log -1 origin/fix/execucao-plano-20260928` = bfca3b285c2241a0e9a22702784a0cde1a8d5d13 (28/09/2026 14:00, Joaquim Ataides, "fix: reconcilia contratos e fecha gates de construção"). `git merge-base origin/main <branch>` = vazio (main re-enraizada), por isso toda a comparação abaixo é por conteúdo de árvore.
A afirmação da tarefa de que a branch "não tem PR associada" está ERRADA. `git for-each-ref --contains a1f3f00` devolve `refs/remotes/pr/74`, e `gh api repos/adm01-debug/Brindes_Sicoob_V2/pulls/74` devolve: {"number":74,"head":"fix/execucao-plano-20260928","base":"main","merged":true,"merged_at":"2026-09-28T16:34:40Z","merge_commit_sha":"7d616832b116631523eb6f10ddc93d30fa4496da"}. Ou seja, a branch É a cabeça da PR #74, que foi mergeada com squash.

2) QUAL É O TRABALHO PRÓPRIO DA BRANCH
Base comum = 89ca16ef4b704412d0175d2949f33ffc36a37f8a (compartilhada por ~30 branches, logo era a main da época). Acima dela só há 3 commits: a1f3f00 (= PR #74, mergeada), 1ebfe6a e bfca3b2. `git diff --name-only 89ca16e bfca3b2` = 49 arquivos, 645 inserções / 185 remoções.
Os 2 commits pós-merge foram reaplicados na branch irmã `fix/execucao-plano-final-20260928` como e49873a ("fix: fecha gates de CI e restringe idempotência") e 0f61abd ("fix: reconcilia contratos e fecha gates de construção") — mesmos assuntos, mesma autoria, mesmo dia.

3) VERIFICAÇÃO LINHA A LINHA
Script rodado: para cada um dos 49 arquivos, extraí todas as linhas ADICIONADAS por `git diff -U0 89ca16e bfca3b2 -- <arquivo>` e procurei cada uma (grep -F exato) dentro de `git show origin/main:<arquivo>`. Resultado: 49/49 arquivos existem na main; 30 arquivos com 100% das linhas adicionadas presentes na main; 16 com linhas faltando, todos abertos e julgados manualmente abaixo; 3 ignorados como ruído gerado (.typecheck-baseline.json, docs/E2E_SMOKE_COVERAGE.md, scripts/db/.inventory-cache.json).

4) JULGAMENTO DOS 16 DIVERGENTES — TODOS SUPERADOS PELA MAIN
- supabase/migrations/20260928162048_quote_save_idempotency.sql: a branch MUTOU a migration já mergeada (md5→sha256, policy FOR ALL→SELECT+INSERT, grants restritos), o que AGENTS.md proíbe ("Migration mesclada é imutável"). A main fez certo: manteve a histórica e criou `supabase/migrations/20260928173500_harden_quote_save_idempotency.sql`, que contém TUDO o que a branch queria e mais — CHECK length IN (32,64) preservando retries legados, as duas policies separadas, `extensions.digest(...,'sha256')`, `GRANT SELECT, INSERT` apenas, e DOIS extras que a branch não tinha: o `EXISTS (... q.seller_id = auth.uid())` no INSERT e o `p_history` dentro do hash.
- src/services/QuoteService.ts: main:330 `idempotencyKey: string`, main:335 `rpc('save_quote_atomic_idempotent')`, main:339 `p_idempotency_key`, main:354 `expectedRowVersion: number`, main:360 a mesma guarda `Number.isInteger(...) < 1`, main:379 `p_expected_row_version: params.expectedRowVersion`. Idêntico em efeito.
- src/hooks/useQuoteBuilderState.ts: main:388 `expectedRowVersion`, main:401 `createIdempotencyKeyRef`, main:276-285 a mesma lógica extraída para helper, main:326 `canPersistQuoteVersion` (equivalente ao bloqueio "Recarregue a página antes de salvar"). Incorporado e refatorado.
- src/hooks/quote/useQuoteInitialization.ts: main:24 `setExpectedRowVersion`, main:105 `setters.setExpectedRowVersion(validRowVersion(quote.row_version))` — main usa helper, a branch usava expressão inline.
- src/components/quotes/QuoteAutoSave.tsx + src/pages/QuoteBuilderPage.tsx: main:21 `scopeId?: string | null`, main:37 `getQuoteDraftIdForScope`, main:50 `useScopedQuoteDraftId`, main:219-220 chaves `quote:${scopeId}:${quoteId}` / `draft:${scopeId}:${draftId}`, main:85 "Salvo neste dispositivo", main:24/26 `data: unknown` e `onRestore?: (data: Record<string, unknown>)`. A main foi além: `QuoteBuilderPage.tsx:135` passa `scopeId={state.draftScopeId}` (isolamento por cooperativa/PA, PR #304 de 18/11/2026), não só por user.id.
- src/hooks/useAutoSave.ts: main:5-6 `AUTO_SAVE_VERSION` / `AUTO_SAVE_RETENTION_MS`, main:45 `parseStoredAutoSave`, main:60 a mesma expiração de 30 dias, main:228 `interval = 2000`. Envelope versionado incorporado.
- src/services/sicoob/orderService.ts: main:22 `statuses?: string[]`, main:40 `if (filters?.statuses?.length) return query.in("status", filters.statuses)`. Idêntico.
- src/pages/sicoob/reports/SicoobReportsPage.tsx: a branch corrigia `pa_budgets.eq("cooperative_id", ...)` (coluna inexistente) resolvendo os PAs da cooperativa em 2 queries. A main resolve melhor, em 1 query: main:71 `'...postos_atendimento!inner(nome, cooperativa_id)'` e main:82 `query.eq('postos_atendimento.cooperativa_id', cooperativeId)`, com paginação (`fetchAllBudgetHistoryRows`, pageSize 1000) e consolidação por período. O `eq('cooperative_id', ...)` que sobra em main:173 é de `fetchOrdersInRange` sobre `sicoob_orders`, tabela que tem essa coluna — não é o bug.
- src/pages/admin/RLSAuditPage.tsx: as 3 linhas "faltando" são contadores inline; main:26-27 `conformingTables: latest.filter(status === "success")` / `tablesWithIssues: latest.filter(status !== "success")` — main conta o último log por tabela, a branch contava todos os logs. Main é mais correta.
- src/hooks/admin/useAccessSecurity.ts: main:6 `type AccessSecurityUpdate = Database[...]["Update"]`, main:80 `.update(updates as AccessSecurityUpdate)`. Incorporado.
- src/components/quotes/ReorderCatalogValidityBanner.tsx: comentário `rls-allow` presente na main (`git grep -c rls-allow origin/main -- src` lista o arquivo com 1 ocorrência; 28 arquivos no total adotaram a convenção).
- src/pages/quote-view/QuoteBitrixSync.ts: a branch só anotava `rls-allow` num `supabase.from("quotes").update(...)` direto. A main reescreveu o arquivo (118 linhas vs 100) e eliminou o update direto: usa `updateQuoteStatusAtomically(quoteId, 'sent', ...)`. Superado por algo melhor.
- src/components/mockup/approval/OffscreenLayoutCapture.tsx: apenas remoção de um cast `as Record<string, unknown>`; sem valor de negócio, main já tipada.
- .github/workflows/apply-sicoob-migrations.yml: a versão da BRANCH É PIOR e violaria AGENTS.md — usa `supabase db push --include-all --yes` ("Proibido supabase db push"), `runs-on: self-hosted`, `actions/checkout@v4` sem pin. A main usa `scripts/db/apply-sicoob-migrations.mjs --check/--apply/--require-applied` (allowlist + ledger), `concurrency: sicoob-construction-migrations`, guarda `github.ref == 'refs/heads/main'` e todas as actions fixadas por SHA. Nada a recuperar.
- .github/workflows/codeql.yml: a branch adiciona `paths-ignore: docs/**, *.md`, `continue-on-error: true` em 3 passos, `if-no-files-found: warn` e actions sem pin. A main removeu de propósito o `paths-ignore` (correção de 08/11/2026 citada no AGENTS.md), tem `upload: never` + `scripts/check-codeql-sarif.mjs` bloqueando achados, actions por SHA e `if-no-files-found: error`. A branch AFROUXAVA o gate.
- deno.json: branch `nodeModulesDir: "auto"` e `mcp-lite@^0.10.0`; main `"none"` e versão fixa `0.10.0`. Main é a correta.
- scripts/check-critical-test-skip-budget.mjs: branch tem baseline agregado único (`const baseline = 41`); a main tem `BASELINE_BY_FILE` por arquivo, com exit 2 para raiz ausente, anotações `::error` no CI e regex de skip muito mais ampla (.todo/.only/.fails/xit/{skip:true}). Main é a catraca mais apertada.
- 9 arquivos de teste tocados pela branch (tests/services/sicoobBudgetService.test.ts 42/42, quoteReorder.test.ts 37/37, useAutoSave.test.tsx 22/22, sicoobLogisticsReportService.test.ts 14/14, useKitStockForecast.test.ts byte-idêntico, etc.): 100% das asserções novas estão na main.

5) OS 14 ARQUIVOS SÓ-NA-BRANCH NÃO SÃO TRABALHO DA BRANCH
`git cat-file -e 89ca16e:<arquivo>` teve sucesso para todos os 5 arquivos não-graphify, provando que já existiam na base e que foi a MAIN que os removeu depois — nenhum deles foi criado pelos 3 commits (não aparecem em `git diff --name-only 89ca16e bfca3b2`). Destino de cada um na main: `tests/hooks/useCollections.test.tsx` → substituído por `tests/hooks/useCollections.test.ts` + `tests/hooks/useCollections.react.test.tsx`; `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` → renomeado para `...cenarios.test.tsx`; `src/types/jspdf-autotable.d.ts` → shim de `doc.lastAutoTable` desnecessário (jspdf-autotable ^5.0.9 em package.json:184 já traz tipos); `src/components/intelligence/TopCategoriesCard.tsx` → código morto, `git grep TopCategoriesCard origin/main -- src` não retorna nada e a pasta tem `CategoryRanking.tsx`/`TopProductFamiliesCard.tsx`; `supabase/.temp/cli-latest` → cache do CLI. Os 9 `graphify-out/*` estão fora do Git por decisão explícita do AGENTS.md ("Grafo em graphify-out/ ... fora do Git — cada clone gera o seu").

6) BRANCH `contexto` (passo 5 da tarefa) — CONFIRMADO
`git show origin/main:.github/workflows/contexto.yml` começa com "Contexto para agentes de IA: UM workflow, TRES produtores independentes ... UMA branch gerada (`contexto`)" e o nome do workflow é "Contexto para agentes de IA (10 min)". Gerada automaticamente; não é trabalho de agente a preservar.

NÃO VERIFICADO: não comparei conteúdo dos 9 arquivos de graphify-out/ (artefato gerado, ignorado pelo Git por regra do projeto) nem rodei testes/typecheck — a tarefa é somente leitura.

</details>

<a id="b-fixsicoob-aprovacao-legada-20260923"></a>

#### `fix/sicoob-aprovacao-legada-20260923` — PARCIAL · pode apagar: NÃO

Branch sem PR (HEAD 792f5230c, 23/09/2026) que fez duas coisas: endureceu documentos/exportações do Sicoob (migration 20260923130000 + reescrita da edge `process-batch-export` com CSV/XLSX/PDF reais, storage privado e anti-injeção de fórmula) e removeu a página pública de aprovação legada (`PublicQuoteApprovalPage` e sua pasta), consolidando as rotas em `QuoteApprovalPage`. Toda a camada de banco/edge já está na main; o que sobrou fora dela é a faxina dos arquivos órfãos e um hook de dados reais de fornecedor.

Arquivos que existem na branch e não na `main`:

- `src/hooks/useSupplierTrust.ts`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `.env.production`
- `supabase/.temp/cli-latest`
- `graphify-out/.gitignore`
- `graphify-out/README.md`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.json`
- `graphify-out/graph.html`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`

A recuperar:

- **Apagar da main a aprovação pública legada órfã (a entrega que a branch fez e a main não replicou)** — São 6 arquivos sem rota que falam com um endpoint já desligado (410). O risco de negócio não é o código parado: é um agente futuro reapontar `/approve/:token` para essa página — que ainda parece completa e tem testes verdes — e quebrar a aprovação do cliente final, a etapa que fecha o pedido. A main já decidiu a favor da branch nas rotas (public.ts:45,49,73) e já blinda a decisão em tests/scenarios/aprovacao-publica-roteamento.mjs:16; só falta remover o cadáver. A deleção é segura: nenhum arquivo de src/ importa esses módulos fora deles mesmos.
- **Religar os selos de confiança do produto a dados reais de fornecedor** — O hook existe SÓ nesta branch e não tem equivalente na main sob nenhum nome: ele lia `variant_supplier_sources.lead_time_days` e `suppliers.is_active` pelo bridge do catálogo externo. Hoje a main exibe DynamicTrustBadges com placeholder fixo `EMPTY_SUPPLIER_TRUST` (ProductDetailHeroSections.tsx:24,212), ou seja, prazo de entrega e fornecedor verificado nunca aparecem na tela do produto. É prova social que sustenta conversão, perdida no re-enraizamento da main (o arquivo nasceu em 28/03/2026, commit 4f4df2580, muito antes desta branch).
- **Remover o e2e P0 skipado que aponta para rota inexistente** — O teste navega para `/orcamento-publico/INVALID_TOKEN`, rota que não existe na main. Fica skipado para sempre, consome o orçamento de skip de tests/p0 vigiado por scripts/check-critical-test-skip-budget.mjs e dá falsa sensação de cobertura sobre vazamento de orçamento por token inválido. A branch já o havia removido; se a cobertura importa, reescreva contra `/approve/:token`.

<details><summary>Evidência</summary>

COMPARAÇÃO POR CONTEÚDO (sem ancestralidade; `git merge-base origin/main origin/fix/sicoob-aprovacao-legada-20260923` sai vazio, exit=1).

1) Conjunto de arquivos: `git ls-tree -r --name-only` → main 4329 arquivos, branch 3683. Só na branch: 17 (lista acima). Só na main: 663.

2) Camada de banco/edge/CI: ZERO perda. `comm -13` sobre os prefixos: nenhum arquivo em supabase/migrations/, supabase/functions/ ou .github/ existe apenas na branch. E `awk '$3 ~ /^supabase\/migrations\// && $1+0>0'` sobre `git diff --numstat origin/main origin/branch` não retorna NADA — nenhuma linha de migration é exclusiva da branch (main 610 migrations vs branch 511).

3) Commit 7fe33979a ("protege documentos e exportações") = INCORPORADO:
   - supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql: md5 ed8ce0a9 idêntico nos dois lados.
   - supabase/functions/process-batch-export/index.ts: 129 linhas nos dois; `git diff branch:... main:...` mostra UMA linha de diferença — a main troca `https://esm.sh/@supabase/supabase-js@2` por `npm:@supabase/supabase-js@2.119.0`. Todos os marcadores da branch estão na main: claim_sicoob_export_jobs, enqueue_due_sicoob_scheduled_exports, sicoob_export_orders_for_actor, file_path, escapeCsv, XLSX, pdfBytes, exportacao_indisponivel, requireInternalService; `getPublicUrl` = 0 ocorrências (storage deixou de ser público).
   - src/utils/sicoob/orderDossierExport.ts: main tem "DOSSIÊ OPERACIONAL DO PEDIDO" (linha 47) e "Relatório gerado no portal" (49) — exatamente a troca do commit; a main ainda removeu a linha "Meta 10/10".
   - e2e/routes/public/approve.spec.ts: main usa edgeFnName 'quote-approval' e o payload `approval: {status,response,responded_at}` do commit, mais mocks de timeout/503 que a branch não tinha.
   - BatchExportDialog.tsx / useExportJobs.ts: main tem o download por `createSignedUrl(job.file_path, 300)` e tipagem `Json` (a branch ainda usava `any`).
   - docs/DEPLOYMENT.md: a branch registrava a migration no "lote"; a main reescreveu o doc (65 linhas, sem a lista do lote) → edição OBSOLETA.

4) Commit 792f5230c ("remove aprovação pública legada") = PARCIAL. A intenção está na main: `git show origin/main:src/routes/config/public.ts` → `/approve/:token`(45), `/proposta/:token`(49) e `/public/orcamento/:token/aprovacao`(73) todos em `@/pages/QuoteApprovalPage`; `tests/scenarios/aprovacao-publica-roteamento.mjs:16` faz `assert.doesNotMatch(routes, /import\("@\/pages\/PublicQuoteApprovalPage"\)/)`; e `supabase/functions/quote-public-view/index.ts` responde 410 `endpoint_descontinuado`. Mas `git ls-tree -r --name-only origin/main | grep -i public` ainda lista PublicQuoteApprovalPage.tsx, public-approval/{PublicQuoteItems,PublicQuoteStatusScreens,usePublicQuoteApproval} e tests/public-approval/*. `git grep -n 'public-approval' origin/main -- src` só acha os imports internos da própria página órfã (PublicQuoteApprovalPage.tsx:32,33,40) e `usePublicQuoteApproval.ts:80` chama o endpoint 410.

5) Os 17 arquivos só-da-branch, um por um:
   - RUÍDO, não recuperar: graphify-out/* (10) e supabase/.temp/cli-latest são ignorados por desenho na main (.gitignore:74 `graphify-out/`, :80 `supabase/.temp/*`). `.env.production` está no .gitignore da main (linha 18); contém só 4 chaves VITE_* (VITE_SUPABASE_URL, PUBLISHABLE_KEY, ANON_KEY, PROJECT_ID) — públicas por definição, nenhum service_role; não deve voltar.
   - REIMPLEMENTADO na main: TopCategoriesCard.tsx → src/components/intelligence/TopProductFamiliesCard.tsx (mesma fonte `product_views`, mesmo conceito "em alta", mesmos ícones Layers/TrendingUp/Sparkles, e ainda ganhou estados de erro e retry); está plugado em TrendsPage.tsx:37,632 (main 714 linhas vs branch 422). jspdf-autotable.d.ts → src/lib/pdf/auto-table.ts. tests/hooks/useCollections.test.tsx → tests/hooks/useCollections.react.test.tsx (mesmo teste 'should initialize with empty collections') + useCollections.test.ts com 14 casos. scripts/revisao/pendencias-2026-09-12.cenarios.tsx → .cenarios.test.tsx na main, 86 linhas nos dois lados e os mesmos 3 casos S07/S08/S09. InvoicePaymentPanel.tsx → órfão já na própria branch (`git grep InvoicePaymentPanel` só acha o próprio arquivo) e a main tem src/components/orders/OrderInvoicesManager.tsx.
   - PERDIDO: src/hooks/useSupplierTrust.ts. Na branch está ligado (ProductDetail.tsx:29 importa, :55 chama). Na main não existe sob nenhum nome e `getMockSupplierTrust` também foi removido de SocialProof.tsx; o único consumidor de DynamicTrustBadges passa `EMPTY_SUPPLIER_TRUST` fixo (ProductDetailHeroSections.tsx:24,212).

6) Onde a branch tem MAIS linhas que a main, é a main que está à frente (amostra do numstat, added>0): supabase/functions/health-check/index.ts (branch 78 linhas, main 4) — a main reduziu a sonda a liveness pura ("não acessa banco, secrets ou serviços externos", via ./contract.ts), enquanto a versão da branch cria cliente service_role e devolve `error.message` do banco num endpoint sem auth; verify-email (branch 76, main 27) — a main desativou o endpoint legado com justificativa de segurança, a branch ainda aceitava token/UUID; materials-api, commemorative-dates e connections-hub-audit — a main migrou para os módulos compartilhados (_shared/catalog-client.ts, _shared/authorize.ts) que a branch não tinha. Nada a recuperar aí.

7) Item 5 do roteiro, confirmado: `.github/workflows/contexto.yml` existe na main, se chama "Contexto para agentes de IA (10 min)" e o próprio cabeçalho declara que a saída vai para a branch gerada `contexto` (push com GITHUB_TOKEN para não disparar outros workflows). `origin/contexto` é gerada, não é trabalho de agente.

NÃO VERIFICADO: não abri um a um os 2525 arquivos divergentes — a main trocou o estilo de aspas (prettier) e isso infla todo diff. A triagem foi feita pelo numstat priorizando added>0 em src/, supabase/, tests/, e2e/, scripts/ e .github/, mais o conjunto completo de arquivos. Também não rodei testes nem build (tarefa somente leitura).

</details>

<a id="b-fixsicoob-conclusao-20260922"></a>

#### `fix/sicoob-conclusao-20260922` — PARCIAL · pode apagar: NÃO

Não é branch de feature: é o TRONCO ANTIGO do repositório congelado em 22/09/2026 (19.207 commits), cujo último trabalho próprio foi tornar a aprovação pública de orçamento transacional e assinada (RPCs `get_public_quote_approval`/`submit_signed_quote_response`, migration `20260922200000_public_quote_approval_contract.sql`, edge `quote-approval`) mais uma longa série de commits "zera N erros TS (etapa 17)". Esse trabalho está na main; a main evoluiu ~2 meses além dele.

Arquivos que existem na branch e não na `main`:

- `src/hooks/useSupplierTrust.ts`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `.env.production`
- `supabase/.temp/cli-latest`
- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`

A recuperar:

- **Selos de confiança do fornecedor com dado real na página de produto (hook useSupplierTrust)** — Hoje o vendedor vê os selos sempre vazios: a main passa EMPTY_SUPPLIER_TRUST fixo. O prazo de entrega (lead_time_days) e o fornecedor verificado são informação de venda que já existe no catálogo externo. Recuperar SEM o fallback mock da branch (getMockSupplierTrust foi removido de propósito da main — AGENTS.md proíbe mock): sem dado, manter vazio.
- **Templates HTML de e-mail transacional (6 eventos)** — A main devolve 501 nessa edge. Quando o envio real for implementado, os 6 templates da branch poupam retrabalho de design. Não recuperar o corpo da função: ele devolvia success:true sem enviar nada.

<details><summary>Evidência</summary>

COMPARAÇÃO POR ÁRVORE (sem merge-base, como exigido)
`git merge-base origin/main origin/fix/sicoob-conclusao-20260922` -> vazio (confirmado).
`git log -1 origin/fix/...` -> 1248084a8, Tue Sep 22 17:35:36 2026, "Corrige aprovação pública transacional e valida contratos no Supabase".
`git log --format=%h origin/fix/... | wc -l` -> 19207 commits (é o tronco antigo, não uma branch de feature).
`git ls-tree -r --name-only` -> main 4.329 arquivos, branch 3.623. Só na branch: 16. Só na main: 722. Divergentes em conteúdo: 1.871.

NADA DE BANCO, EDGE OU CI SE PERDEU (prova mecânica)
`git ls-tree ... -- supabase/migrations` -> branch 511, main 610; `comm -13` (só na branch) = VAZIO.
`git diff --numstat origin/main BRANCH -- supabase/migrations | awk '$1 != "0"'` -> VAZIO: nenhuma migration tem uma única linha de conteúdo que só exista na branch.
`-- supabase/functions` (index.ts) -> branch 103 funções, main 106; só na branch = VAZIO.
`-- .github/workflows` -> branch 11, main 16; só na branch = VAZIO.
Testes: e2e main 153 / branch 151; tests/ main 570 / branch 418.

O TRABALHO PRÓPRIO DA BRANCH ESTÁ NA MAIN
`git diff --quiet origin/main BRANCH -- supabase/migrations/20260922200000_public_quote_approval_contract.sql` -> IDÊNTICO byte a byte. A main ainda tem o follow-up `20260922225000_secure_public_quote_approval.sql` (411 linhas) que a branch não tem.
docs/execucao/backend-aprovacao-publica-20260922.md + os 3 JSONs de evidência: presentes na main.
scripts/qa/simular-aprovacao-publica.py: branch 107 linhas / main 729 linhas (main é superconjunto).
tests/scenarios/edge-aprovacao-publica.mjs e sql/public-quote-approval-fixture.sql: presentes na main, maiores.

ONDE A BRANCH PARECE "MAIOR", É A MAIN QUE MELHOROU (verificado arquivo por arquivo nos 12 maiores casos)
- supabase/functions/quote-approval/index.ts: main 88 linhas vs branch 50. A main ADICIONA rate limit por hash(IP+token) via RPC check_rate_limit, torna a assinatura OBRIGATÓRIA e grava IP/user-agent. O único trecho exclusivo da branch é o fallback legado sem assinatura (`submit_quote_response`), removido de propósito.
- supabase/functions/verify-email/index.ts: a branch confirmava e-mail de qualquer conta passando o UUID do usuário em `auth.admin.getUserById(token)` + `email_confirm: true`. É uma falha de segurança. A main desativou com 410. NÃO RECUPERAR.
- supabase/functions/quote-public-view/index.ts: branch 16 KB, main 977 B devolvendo 410 "endpoint_descontinuado" — o fluxo antigo gravava em bancos distintos sem transação. Decisão deliberada, documentada no próprio arquivo.
- src/components/quotes/QuoteSignaturePad.tsx: branch 211 linhas vs main 146 — mesmo comportamento (validDocument/maskDocument/submit idênticos em lógica), a main só compactou e extraiu subcomponentes.
- Modularização confirmada por `git ls-tree`: src/components/search/ (GlobalSearchPaletteView, useGlobalSearch, SearchResultGroups...), src/components/security/ (SecurityDashboardSections, useSecurityData), src/pages/product-detail/ (ProductDetailHeroSections), supabase/functions/health-check/contract.ts, src/components/common/WeeklyActivityHeatmap.tsx (dedup de Collections/FavoritesHeatmap).
- src/pages/quote-view/QuoteActionHandlers.ts: handleDownloadPDF e handleSyncBitrix migraram para useQuoteViewData.ts/QuoteBitrixSync.ts; buildWhatsAppUrl foi reimplementado como src/components/quotes/QuoteWhatsAppShare.tsx (usado em QuoteViewPage.tsx:31,132).

OS 16 ARQUIVOS SÓ DA BRANCH, UM A UM
- src/components/intelligence/TopCategoriesCard.tsx -> REIMPLEMENTADO na main como src/components/intelligence/TopProductFamiliesCard.tsx (mesma fonte `product_views`, mesma heurística de primeiro termo do nome, e a main ainda adiciona estados de erro/retry). Usado em TrendsPage.tsx:37.
- src/types/jspdf-autotable.d.ts -> REIMPLEMENTADO como src/lib/pdf/auto-table.ts (presente na main, ausente na branch).
- tests/hooks/useCollections.test.tsx -> SUPERADO por tests/hooks/useCollections.test.ts + tests/hooks/useCollections.react.test.tsx na main.
- src/components/orders/InvoicePaymentPanel.tsx -> CÓDIGO MORTO já na própria branch: `git grep -l InvoicePaymentPanel BRANCH -- src tests` só encontra o próprio arquivo. Nada a recuperar.
- src/hooks/useSupplierTrust.ts -> ÚNICA PERDA REAL (ver acima).
- scripts/revisao/pendencias-2026-09-12.cenarios.tsx -> cenário de revisão de 12/09/2026, histórico superado.
- graphify-out/* (9 arquivos, incl. graph.json de 33.873 linhas) -> AGENTS.md diz que o grafo fica FORA do Git e cada clone gera o seu; a main corretamente não o rastreia. Ruído.
- supabase/.temp/cli-latest -> lixo de CLI.
- .env.production (576 bytes) -> contém apenas 4 variáveis `VITE_*` (URL, PUBLISHABLE_KEY, ANON_KEY, PROJECT_ID). Por AGENTS.md toda `VITE_*` é pública, então NÃO há segredo vazado; mas o arquivo está no `.gitignore` da main (linha 18) e rastreado nessa branch de um repo público. Mais um motivo para não trazer nada dessa pasta.

BRANCH `contexto` (confirmação pedida no passo 5)
`git show origin/main:.github/workflows/contexto.yml` -> "name: Contexto para agentes de IA (10 min)", cabeçalho declara "UMA branch gerada (`contexto`)" e explica que a saída vai para essa branch porque a main tem branch protection. CONFIRMADO: `contexto` é 100% gerada por automação, não contém trabalho humano/agente a recuperar.

NÃO VERIFICADO: não li linha a linha os 1.871 arquivos divergentes. A varredura foi por tamanho — isolei os 72 arquivos em que a branch é >1,5 KB maior que a main e inspecionei os 12 maiores (todos explicados acima); os 60 restantes ficam na faixa de 1,5–2,2 KB, consistente com a compactação de formatação já comprovada em QuoteSignaturePad.tsx.

</details>

<a id="b-fixsicoob-csp-202635"></a>

#### `fix/sicoob-csp-202635` — INCORPORADA · pode apagar: sim

Branch de 23/09/2026 cujo trabalho proprio sao 2 commits: aplicar a Content-Security-Policy tambem na Vercel (novo vercel.json), alinhar a CSP do Cloudflare (public/_headers), criar o cenario anti-drift tests/scenarios/csp-providers.mjs e documentar em docs/SECURITY.md. Todo esse conteudo esta na main hoje, boa parte byte a byte.

Arquivos que existem na branch e não na `main`:

- `.env.production`
- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependencias_sustentam_as_notificacoes_de_ap.md`
- `supabase/.temp/cli-latest`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/hooks/useSupplierTrust.ts`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`

A recuperar:

- **Badges de confianca do fornecedor com dado real na pagina de produto (hook useSupplierTrust)** — A main ainda renderiza os badges, mas alimentados por constante vazia: src/pages/product-detail/ProductDetailHeroSections.tsx:24 define EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null } e a linha 212 passa isso para DynamicTrustBadges. Como appendSupplierTrustBadges (src/components/common/SocialProof.tsx:241-255) so emite badge quando isVerified, deliveryDays <= 5 ou avgRating >= 4.0, nenhum dos tres badges (Fornecedor verificado, Entrega rapida, Qualidade) aparece jamais para o comprador. A arvore da branch tem src/hooks/useSupplierTrust.ts (117 linhas) buscando dado real de variant_supplier_sources (lead_time_days) e suppliers (active) via bridge do catalogo externo, consumido por src/pages/ProductDetail.tsx; a main nao tem hook equivalente (git grep -rn getMockSupplierTrust origin/main -- src = vazio). Recuperar vale, porem SEM o fallback mock do hook original (viola a regra de nenhum mock): sem fonte real, nao renderizar badge. Ressalva: este arquivo NAO foi escrito nesta branch, veio da main de setembro e foi removido depois; existe em dezenas de outras refs (origin/audit/revisao-plano-20260924, origin/backup/local-rascunho-20261031, refs/remotes/pr/1..21), portanto apagar esta branch nao perde a ultima copia.

<details><summary>Evidência</summary>

1) Sem ancestralidade: `git merge-base origin/main origin/fix/sicoob-csp-202635` retorna vazio; head da branch = 361dc30b3 (23/09/2026, "docs(seguranca): registra csp entregue"); main = 5ecb93f45 (18/11/2026, PR #304). Comparacao feita por conteudo de arvore.

2) Trabalho proprio da branch = 2 commits apos o merge da PR #22 (d389b4be7). `git show --stat 13dfccdaa` = .gitignore (+1), docs/SECURITY.md (+7), public/_headers (1 linha), tests/scenarios/csp-providers.mjs (+29), vercel.json (novo, 42 linhas). `git show --stat 361dc30b3` = docs/plano-melhorias-50-etapas.md (+3/-1).

3) Prova byte a byte na main (`git ls-tree origin/main ...`):
- public/_headers = blob 40ecda09b88429520c7f14d4d0213726d9e85f1f, exatamente o blob pos-commit da branch (cabecalho do diff: `index ce13c3e70..40ecda09b`). Identico.
- docs/SECURITY.md = blob d4867513b059e25c50a2b6a684dcd85d67de280e, exatamente o blob pos-commit da branch (`index 2af81d817..d4867513b`). Identico, inclusive a secao "Browser Security Headers".
- tests/scenarios/csp-providers.mjs = blob de88611e4785bfb0756818c4680e2e558f621496 nos DOIS lados. Identico.

4) `git diff --numstat origin/main origin/fix/sicoob-csp-202635 -- vercel.json public/_headers tests/scenarios/csp-providers.mjs docs/SECURITY.md .gitignore docs/plano-melhorias-50-etapas.md` devolve apenas:
   0	33	.gitignore
   0	5	docs/plano-melhorias-50-etapas.md
   0	6	vercel.json
Zero adicoes em todos: a branch nao tem uma unica linha que a main nao tenha nesses arquivos; a main e superconjunto. As 6 linhas extras do vercel.json da main sao o bloco `rewrites` para /index.html (SPA), ganho posterior. O `.vercel` do .gitignore da branch esta na main em .gitignore:21 (`git show origin/main:.gitignore | grep -n '\.vercel'`).

5) Arquivos so na branch — nenhum e trabalho desta branch; todos vieram da main de setembro e foram removidos ou renomeados depois:
- RUIDO/GERADO: graphify-out/** (grafo local, fora do Git por regra do AGENTS.md), supabase/.temp/cli-latest, .env.production (somente chaves VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PROJECT_ID — publicas por definicao, nenhum segredo).
- RENOMEADO, identico: scripts/revisao/pendencias-2026-09-12.cenarios.tsx (blob 2c407af8250660a4c1e57e81f7a0b7263ae6c22b) = scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx na main (mesmo blob 2c407af8). Mesmos 3 casos.
- SUPERADO: tests/hooks/useCollections.test.tsx tinha 1 caso ("should initialize with empty collections"); a main tem tests/hooks/useCollections.react.test.tsx com o mesmo caso MAIS tests/hooks/useCollections.test.ts com 13 casos.
- SUPERADO: src/components/intelligence/TopCategoriesCard.tsx extraia categoria por heuristica de prefixo de nome sobre product_views; a main reimplementou em src/components/intelligence/CategoryRanking.tsx + TopProductFamiliesCard.tsx + src/hooks/bi/useIndustryCategoryTrends.ts, consumidos por src/pages/TrendsPage.tsx.
- CODIGO MORTO: src/components/orders/InvoicePaymentPanel.tsx (48 linhas) nao era importado por ninguem nem na propria branch (`git grep -l InvoicePaymentPanel origin/fix/sicoob-csp-202635 -- src` lista so o proprio arquivo). A main tem src/components/orders/OrderInvoicesManager.tsx.
- SUPERADO: src/types/jspdf-autotable.d.ts (13 linhas) — a main resolve a tipagem com o helper src/lib/pdf/auto-table.ts (getAutoTableFinalY), com divida de typecheck em zero.
- NAO INCORPORADO: src/hooks/useSupplierTrust.ts (ver campo recuperar).

6) Os 1734 arquivos em que a branch tem linhas que a main nao tem sao a divergencia natural de 23/09 para 18/11 do codebase inteiro (a main evoluiu), nao trabalho desta branch.

7) Item 5 do roteiro, confirmado: .github/workflows/contexto.yml existe na main (blob 89ddddd649ea5cba38ce3a8664adb5c4000cc5b1) e seu cabecalho declara a geracao automatica da branch `contexto` a cada 10 min por tres produtores (codigo/, supabase/, regras/). Esta auditoria nao e sobre a branch `contexto`.

NAO VERIFICADO: se a CSP realmente servida em producao pela Vercel hoje bate com o vercel.json da main — nenhuma requisicao HTTP foi feita (tarefa restrita a leitura do repositorio).

</details>

<a id="b-fixsicoob-intelligence-truth-20260924"></a>

#### `fix/sicoob-intelligence-truth-20260924` — PARCIAL · pode apagar: NÃO

Branch de 24/09/2026 com 2 commits próprios que tiram dado falso da tela do produto: remove a confiança de fornecedor simulada por hash (`getMockSupplierTrust`, hook `useSupplierTrust`) e a inteligência de mercado gerada por mock (`generateMockIntelligence`/`generateMockVelocities`), passando a exibir selo de classe/giro só quando a view real responde. Nunca teve PR.

Arquivos que existem na branch e não na `main`:

- `tests/hooks/useProductIntelligenceBadges.test.ts`

A recuperar:

- **Remover o resíduo morto de `isDemo` / selo "dados ilustrativos" do detalhe do produto** — É a única parte da branch que não chegou à main. Não muda o que o cliente vê hoje (o flag é sempre `false`, logo o selo nunca aparece), mas deixa na base um caminho pronto para voltar a rotular dado como ilustrativo e um contrato de hook mentiroso. Diff de ~8 linhas em 3 arquivos.

<details><summary>Evidência</summary>

COMANDOS E SAÍDAS

1) Delta próprio da branch (sem merge-base com a main; `git merge-base origin/main origin/fix/...` retorna vazio). A branch tem só 2 commits acima do último commit de main antiga (`6193793a7`, PR #30):
   git log --format='%h %s' -3 origin/fix/sicoob-intelligence-truth-20260924
     639d807ca fix(catálogo): remover inteligência ilustrativa
     5455eb84d fix(catálogo): remover confiança simulada de fornecedor
     6193793a7 Audita paridade entre repositório, GitHub e Supabase Sicoob (#30)  <- herança da main antiga
   git diff --stat 6193793a7 639d807ca  -> 8 arquivos, 155 inserções, 247 deleções:
     src/components/common/IntelligenceBadges.tsx, src/components/common/SocialProof.tsx,
     src/hooks/useProductIntelligenceBadges.ts, src/hooks/useSupplierTrust.ts (deletado),
     src/pages/ProductDetail.tsx, src/pages/product-detail/ProductDetailHero.tsx,
     tests/components/SocialProof.test.tsx (novo), tests/hooks/useProductIntelligenceBadges.test.ts (novo)

2) JÁ ESTÁ NA MAIN — confiança de fornecedor simulada:
   git grep -n "getMockSupplierTrust|useSupplierTrust" origin/main -- src tests e2e  -> ZERO resultado.
   `src/hooks/useSupplierTrust.ts` não existe em nenhum dos dois lados (`git cat-file -e` falha em main e na branch).
   A main usa exatamente a constante que a branch criou:
     origin/main:src/pages/product-detail/ProductDetailHeroSections.tsx:212  <DynamicTrustBadges trust={EMPTY_SUPPLIER_TRUST} .../>
   O refactor da branch (`appendProductFlagBadges` / `appendSupplierTrustBadges`, `trust.deliveryDays !== null`) está presente em origin/main:src/components/common/SocialProof.tsx:220 e :241-251. O único diff branch->main nesse arquivo é extração posterior de constantes de cor (PRIMARY_TONE/WARNING_TONE) — evolução da main, não perda.
   O teste novo `tests/components/SocialProof.test.tsx` existe na main e `git diff --numstat` entre os dois lados retorna VAZIO (idêntico byte a byte).

3) JÁ ESTÁ NA MAIN — inteligência ilustrativa:
   origin/main:src/hooks/useProductIntelligenceBadges.ts:1-8 — cabeçalho: "Uses real data from mv_product_intelligence + mv_stock_velocity. Market badges are omitted until the source views return real data." Os imports de `generateMockIntelligence`/`generateMockVelocities`/`isRealIntelligence` de `@/lib/stock-chart-utils` NÃO existem mais nesse arquivo na main.
   A função pura foi reimplementada com outro nome: branch `deriveProductIntelligenceBadges` -> main `buildBadgeResult` (origin/main:src/hooks/useProductIntelligenceBadges.ts:142). Mesma garantia: `if (!intelligence) return { badges, turnoverScore: null, demandLevel: null, ... }` (linha 149-151).
   O teste da branch também foi reimplementado: main tem `tests/hooks/intelligence-badges.test.ts`, caso "does not invent market badges or metrics when intelligence is absent", cobrindo `buildBadgeResult`. Por isso `tests/hooks/useProductIntelligenceBadges.test.ts` ausente da main NÃO é perda de cobertura.

4) O QUE NÃO ESTÁ NA MAIN (único resíduo):
   git grep -n "isDemo|dados ilustrativos" origin/main:
     src/components/common/IntelligenceBadges.tsx:60   isDemo?: boolean;
     src/components/common/IntelligenceBadges.tsx:64   export function IntelligenceBadges({ badges, turnoverScore, isDemo, className })
     src/components/common/IntelligenceBadges.tsx:124-126  {isDemo && (<Badge ...>dados ilustrativos</Badge>)}
     src/hooks/useProductIntelligenceBadges.ts:41   isDemo: boolean;
     src/hooks/useProductIntelligenceBadges.ts:150  isDemo: false
     src/hooks/useProductIntelligenceBadges.ts:160  isDemo: false
     src/pages/ProductDetail.tsx:217, :258, :311   fiação isDemo -> intelligenceDemo -> <IntelligenceBadges isDemo=...>
   git grep -n "isDemo: true|isDemo = true" origin/main -- src/hooks src/components/common src/pages/ProductDetail.tsx  -> ZERO resultado. Logo o selo é inalcançável: código morto, não regressão visível.

5) Arquivos da árvore da branch ausentes da main: 17 no total (`comm -23`), mas 16 são herança da main antiga, não autoria desta branch (graphify-out/*, .env.production, supabase/.temp/cli-latest, scripts/revisao/pendencias-2026-09-12.cenarios.tsx, src/types/jspdf-autotable.d.ts, src/components/intelligence/TopCategoriesCard.tsx, src/components/orders/InvoicePaymentPanel.tsx, tests/hooks/useCollections.test.tsx). Cruzamento com `git diff --name-only 6193793a7 639d807ca` confirma que só `tests/hooks/useProductIntelligenceBadges.test.ts` é da branch.
   NÃO VERIFICADO: se `src/components/intelligence/TopCategoriesCard.tsx` e `src/components/orders/InvoicePaymentPanel.tsx` (sem equivalente por nome na main) são remoção deliberada da re-raiz ou perda real — está fora do delta desta branch e aparece em qualquer branch antiga; precisa de auditoria própria da re-raiz, não desta.

6) Fora de escopo, mas relevante para o mesmo problema de negócio: a main AINDA mostra inteligência mockada em outra tela — origin/main:src/components/inventory/risk/ProductRiskDetail.tsx:37-40 importa `generateMockIntelligence`/`isRealIntelligence` e linha 189 gera o mock, com rótulo demo na linha 201. Esta branch nunca tocou esse arquivo; é estado atual da main, não trabalho perdido.

NÃO VERIFICADO: nada foi executado (typecheck, lint, vitest) — trabalho estritamente de leitura, conforme a restrição da tarefa.

</details>

<a id="b-fixsicoob-p0-operacional-20260923"></a>

#### `fix/sicoob-p0-operacional-20260923` — PARCIAL · pode apagar: NÃO

Branch de hardening P0 de 23-24/09/2026 (snapshot da main antiga + 5 commits próprios): isolou documentos/exportações do pedido por RLS, trocou URL pública por URL assinada no download de exportação, exigiu segredo interno no cron de conexões, exigiu admin/dev no ownership-repair, reescreveu o worker process-batch-export com claim atômico, despiu o dossiê do verniz de "certificado digital" e removeu a página legada de aprovação pública. Foi mergeada na main pela PR #24, mas a remoção da aprovação pública legada (PR #26) entrou na branch 33 segundos DEPOIS do merge e nunca chegou à main.

Arquivos que existem na branch e não na `main`:

- `src/pages/public-approval/ (remoção pendente — ver recuperar item 1; os arquivos EXISTEM na main e deveriam ter sido apagados)`
- `src/hooks/useSupplierTrust.ts`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `supabase/.temp/cli-latest`

A recuperar:

- **Apagar a aprovação pública legada na main (o que a PR #26 fez e nunca chegou lá)** — Tela de aprovação sem login, com 841 linhas, invocando uma edge já desativada (410), fora do roteamento e invisível a qualquer revisão. É a única corrida provada: a PR #24 (branch → main) mergeou às 00:14:17Z de 25/09 e a PR #26 (remoção → branch) às 00:14:50Z, 33 segundos depois. A própria main já pediu essa limpeza no item EDG-08 (docs/execucao/lacunas-funcionalidades-2026-10-11/indice-lacunas.csv:611) e ela libera 1 das 100 vagas de edge function ao despublicar quote-public-view.
- **Religar os selos de confiança do fornecedor na ficha do produto** — Hoje o cliente nunca vê 'fornecedor verificado' nem prazo de entrega: a main passa um objeto vazio hardcoded (ProductDetailHeroSections.tsx:24). O componente que exibe existe e é testado (tests/components/SocialProof.test.tsx), só falta quem busque o dado. Ao recuperar, traga SOMENTE o caminho de dado real do hook da branch e descarte o fallback getMockSupplierTrust — mock em produção é proibido por AGENTS.md.

<details><summary>Evidência</summary>

COMPARAÇÃO POR CONTEÚDO (merge-base vazio, como avisado):
`git merge-base origin/main origin/fix/sicoob-p0-operacional-20260923` → vazio.
`git ls-tree -r --name-only` main=4329 arquivos, branch=3684; `comm -13` → 16 arquivos só na branch.
`git diff --numstat origin/main <branch>` → 2519 arquivos divergentes (a main evoluiu 7 semanas depois).

ISOLAMENTO DO TRABALHO PRÓPRIO DA BRANCH (o resto é snapshot da main antiga):
`git log --oneline <branch> --not origin/fix/sicoob-intelligence-truth-20260924 origin/fix/sicoob-trust-data-20260924 origin/audit/revisao-plano-20260924 origin/fix/execucao-plano-20260928 origin/fix/execucao-plano-final-20260928` → exatamente 5 commits:
  b93ba46c8 fix(sicoob): remove aprovação pública legada (#26)
  757a76edb fix(seguranca): protege crons de conexoes
  94e7c84bc fix(seguranca): alinha reparo de ownership ao banco
  afade736e fix(sicoob): apresenta dossiê como relatório operacional
  7fe33979a fix(sicoob): protege documentos e exportações
`git diff --stat d389b4be b93ba46c8` → 27 arquivos, +640/-1047.

PROVA DA CORRIDA (gh api, leitura):
PR #24 head=fix/sicoob-p0-operacional-20260923 base=main merged=true merged_at=2026-09-25T00:14:17Z
PR #26 head=fix/sicoob-aprovacao-legada-20260923 base=fix/sicoob-p0-operacional-20260923 merged=true merged_at=2026-09-25T00:14:50Z merge_commit_sha=b93ba46c8
→ a remoção entrou na branch 33s APÓS a branch ir para a main. Nenhuma PR abre com esta branch como head além da #24.

JÁ INCORPORADO (hash de blob idêntico, `git rev-parse origin/main:<f>` vs `<branch>:<f>`):
  supabase/migrations/20260923130000_secure_sicoob_documents_and_exports.sql — IDÊNTICO
  supabase/migrations/20260923140000_secure_legacy_connection_crons.sql — IDÊNTICO
  supabase/functions/ownership-repair/index.ts — IDÊNTICO (guarda .in("role",["admin","dev"]) + 403)
  src/utils/sicoob/orderDossierExport.ts — IDÊNTICO ("DOSSIÊ OPERACIONAL DO PEDIDO")
  scripts/revisao/pendencias-2026-09-12.cenarios.tsx → main renomeou para .cenarios.test.tsx, `diff` dos dois = vazio

JÁ INCORPORADO COM A MAIN À FRENTE (diff branch→main só mostra melhoria posterior):
  supabase/functions/connections-auto-test/index.ts — main linhas 2/122/132 têm requireInternalService, 405 metodo_nao_permitido; única diferença é esm.sh → npm:
  supabase/functions/process-batch-export/index.ts — única diferença é esm.sh → npm:@supabase/supabase-js@2.119.0; os 239 linhas reescritos estão lá
  src/components/orders/BatchExportDialog.tsx — main:43 createSignedUrl("exports", 300), :131 file_path, :137 retryJob, :180 texto novo; main ainda tipou filters como Json
  src/hooks/infrastructure/useExportJobs.ts — main:7/:100 rpc retry_own_sicoob_export_job, :19 file_path
  src/pages/sicoob/orders/OrderDetailPage.tsx — main:198 "Exportar dossiê do pedido" + "Relatório operacional"
  tests/p0/rls-data-integrity.test.ts — main:103/:114/:182 têm os 3 testes que a branch dessakipou, e 14 outros ativos; tests/p0/README.md da main é mais forte ainda
  tests/scenarios/operacoes-internas-seguras.mjs — main:131 "correções P0 isolam documentos..." com claim_sicoob_export_jobs e createSignedUrl

NÃO INCORPORADO (prova do que falta):
  `git grep -n 'PublicQuoteApprovalPage' origin/main -- src` → só auto-referência em src/pages/PublicQuoteApprovalPage.tsx:32/33/40. Zero importadores.
  `git show origin/main:src/routes/config/public.ts` linha 45-47 → /approve/:token usa @/pages/QuoteApprovalPage.
  `git show origin/main:supabase/functions/quote-public-view/index.ts` → status 410 "endpoint_descontinuado".
  docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md:1089 → "src/pages/PublicQuoteApprovalPage.tsx | default | 0 importadores".
  `git grep -n 'SupplierTrustData|getMockSupplierTrust|supplierTrust' origin/main -- src` → 3 hits, todos em SocialProof.tsx (declaração do tipo). Nenhum produtor.
  `git show origin/main:src/pages/product-detail/ProductDetailHeroSections.tsx` :24 EMPTY_SUPPLIER_TRUST hardcoded, :212 passado a DynamicTrustBadges.

RUÍDO DESCARTADO COM MOTIVO:
  graphify-out/** (9 arquivos) e supabase/.temp/cli-latest — `git show origin/main:.gitignore` linhas 74 e 80 ignoram ambos; são artefato local por clone (AGENTS.md: "fora do Git — cada clone gera o seu").
  src/types/jspdf-autotable.d.ts — substituído na main por src/lib/pdf/auto-table.ts (getAutoTableFinalY, tipagem local sem .d.ts global).
  src/components/intelligence/TopCategoriesCard.tsx — reimplementado na main como src/components/intelligence/TopProductFamiliesCard.tsx, usado em TrendsPage.tsx:37, com estado de erro e botão "Tentar novamente" que a versão da branch não tinha.
  src/components/orders/InvoicePaymentPanel.tsx — 48 linhas, zero importadores TAMBÉM na branch, usa `(order as any).invoice_number`; a main tem src/components/orders/OrderInvoicesManager.tsx no lugar.
  tests/hooks/useCollections.test.tsx — 54 linhas, 1 teste ("should initialize with empty collections"); a main tem tests/hooks/useCollections.test.ts + tests/hooks/useCollections.react.test.tsx.

NÃO VERIFICADO: se as duas migrations 20260923130000/140000 foram efetivamente APLICADAS no banco cfmzkthhgliqelozlmwu (auditei só o repositório, conforme a restrição de somente leitura de arquivos). A branch `contexto` não foi tocada nesta auditoria — não é objeto desta tarefa.

</details>

<a id="b-fixsicoob-p0-seguranca-20260923"></a>

#### `fix/sicoob-p0-seguranca-20260923` — PARCIAL · pode apagar: NÃO

Branch é uma foto de 23/09/2026 que endureceu as operações internas Sicoob (guard de segredo interno nas edge functions, cron do worker de exportação só com Vault configurado, validação de constraints históricas) e, antes disso, zerou dezenas de erros de TypeScript. Todo o núcleo de segurança já está na main byte a byte; sobraram dois pedaços pequenos que nunca chegaram lá.

Arquivos que existem na branch e não na `main`:

- `src/hooks/useSupplierTrust.ts`
- `.github/workflows/verify-supabase-management-token.yml`
- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `.env.production`
- `graphify-out/graph.json`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/.gitignore`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `supabase/.temp/cli-latest`

A recuperar:

- **Caminho de dado real dos selos de confiança do fornecedor (sem o fallback mock)** — Hoje a página de produto mostra os selos de confiança sempre vazios: a main passa a constante EMPTY_SUPPLIER_TRUST em ProductDetailHeroSections.tsx:24, então 'Fornecedor verificado', 'Entrega rápida' e 'Qualidade' nunca aparecem para o cliente, mesmo quando variant_supplier_sources tem lead_time_days e o fornecedor está ativo. A main acertou em remover o mock (o hook da branch caía em getMockSupplierTrust e logava 'using mock'), mas removeu junto a consulta real e nunca a substituiu. Recuperar só a parte real: prazo de entrega e fornecedor ativo vindos do banco; avaliação fica fora até existir tabela de ratings (não inventar nota).
- **Workflow de verificação do token de gerenciamento Supabase (workflow_dispatch)** — Valida, sem imprimir a credencial, se o SUPABASE_ACCESS_TOKEN tem acesso de gerenciamento ao projeto oficial cfmzkthhgliqelozlmwu antes de disparar apply-sicoob-migrations.yml ou deploy-sicoob-functions.yml. Com as 6 migrations aprovadas ainda pendentes de aplicação, descobrir token inválido no meio do run de migration custa tempo e deixa estado parcial. Porque mexe em workflow/CI, o AGENTS.md manda abrir a PR e chamar o dono em vez de mergear sozinho.

<details><summary>Evidência</summary>

COMANDOS E SAIDAS-CHAVE

1) Snapshot e datas
   git log -1 --format='%H %ci %s' origin/fix/sicoob-p0-seguranca-20260923
     -> 133dc45dae33255ed087bb9dfa3523ea9a0de661 2026-09-23 15:45:07 -0300 "ci: valida token de gerenciamento Supabase manualmente"
   git log -1 --format='%H %ci %s' origin/main
     -> 5ecb93f45d1785f1a3f6902a90277a545283009f 2026-11-18 09:18:28 -0300 "fix: isola rascunho de orcamento por cooperativa e PA (#304)"
   Branch = foto de 23/09; main tem ~2 meses de evolucao em cima. Sem ancestralidade comum (main re-enraizada), comparado so por conteudo de arvore.

2) Arvores
   git ls-tree -r --name-only (branch -> 3689 arquivos; main -> 4329)
   comm -23: apenas 18 arquivos existem na branch e nao na main (lista no campo arquivos_ausentes_na_main).
   comm -13: 658 arquivos existem so na main (main e superconjunto em quase tudo).

3) O payload de seguranca da branch (motivo do nome) ESTA NA MAIN, BYTE A BYTE
   Commits de seguranca da branch: 8d362d022 "fix(security): protege operacoes internas Sicoob",
   bdef3992d "fix(security): evita cron sem Vault configurado", 20f2c932f "reconcilia banco remoto e valida constraints Sicoob".
   Comparacao de blob SHA (git rev-parse <ref>:<arquivo>) -> IDENTICO em todos:
     supabase/migrations/20260923100000_validate_sicoob_historical_constraints.sql  IDENTICO
     supabase/migrations/20260923110000_harden_internal_operations.sql              IDENTICO
     supabase/migrations/20260923111000_schedule_secure_export_worker.sql           IDENTICO
     supabase/migrations/20260923112000_fix_connection_sync_and_favorites.sql       IDENTICO
     supabase/functions/_shared/internal-service-auth.ts                            IDENTICO
     supabase/functions/_shared/internal-service-auth.test.ts                       IDENTICO
   E a main ainda avancou alem: tem 20260923130000_secure_sicoob_documents_and_exports.sql e
   20260923140000_secure_legacy_connection_crons.sql, que a branch nao tem.

4) Teste de cenario de seguranca: main e superconjunto
   git diff --stat origin/main <branch> -- tests/scenarios/operacoes-internas-seguras.mjs -> "2 insertions(+), 89 deletions(-)"
   (direcao main->branch: a branch tem 89 linhas MENOS). As 2 linhas exclusivas da branch eram o assert de
   "rejeitar metodo antes do guard" escrito com indexOf para 3 funcoes; a main faz o mesmo generalizado na
   linha 14 do proprio arquivo: assert.ok(source.search(/req\.method !== ['"]POST['"]/) < guard, ...).
   Nada perdido.

5) Docs de deploy/Vault: reescritos e ampliados na main
   A branch documentava a ordem de publicacao e os segredos de Vault em docs/DEPLOYMENT.md (linhas 6,19,41,48).
   A main nao fala de Vault nesse arquivo, mas docs/secrets.md da main cobre tudo e mais:
   linha 51 INTERNAL_FUNCTION_SECRET, 52 WEBHOOK_DISPATCHER_SECRET, 70 "exige ainda dois segredos no Supabase Vault",
   83-86 "sicoob_internal_function_secret ... Sem os dois valores, o job apenas registra aviso e nao faz chamada HTTP".
   git diff --stat mostra main maior que a branch em README.md e docs/DEPLOYMENT.md. Documento da branch e historico superado.

6) Arquivos de codigo so-da-branch, um por um
   - src/components/intelligence/TopCategoriesCard.tsx: REIMPLEMENTADO na main como
     src/components/intelligence/TopProductFamiliesCard.tsx + src/pages/trends/trends-projections.ts:344-371
     (mesma heuristica de primeiro termo do nome, mesmo calculateTrendingScore de src/lib/trending-score.ts,
     mesmo filtro views >= 2, mesmos selos rising/NOVO). Ligado em src/pages/TrendsPage.tsx:37 e :632.
     A versao da main e melhor: tem estado de erro, botao "Tentar novamente" e dados por props.
   - src/types/jspdf-autotable.d.ts: SUPERADO. A main trocou a augmentacao global do modulo jsPDF por
     src/lib/pdf/auto-table.ts (getAutoTableFinalY com narrowing local), usado por 15 arquivos de export.
   - tests/hooks/useCollections.test.tsx: SUPERADO. A main tem tests/hooks/useCollections.test.ts
     (mesmos mocks de AuthContext/supabase, mais cobertura, inclui CollectionVariantInfo) e ainda
     tests/hooks/useCollections.react.test.tsx.
   - scripts/revisao/pendencias-2026-09-12.cenarios.tsx: diff contra
     scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx da main -> IDENTICO (so renomeado para .test.tsx).
   - src/components/orders/InvoicePaymentPanel.tsx: codigo morto ja na propria branch
     (git grep InvoicePaymentPanel na branch retorna somente o proprio arquivo, nenhum import).
     Usa (order as any) tres vezes e texto fixo "Liberacao financeira concluida para producao" sem dado real
     (quebraria o baseline zero de lint/typecheck). A main entrega NF/pagamento de verdade em
     src/components/orders/OrderInvoicesManager.tsx, src/components/sicoob/orders/OrderInvoicesTab.tsx e
     src/hooks/orders/extensions/useOrderInvoices.ts. Nada a recuperar.
   - .env.production, graphify-out/* (10 arquivos), supabase/.temp/cli-latest: artefatos que o .gitignore da main
     proibe explicitamente (linha 18 ".env.production", 74 "graphify-out/", 80 "supabase/.temp/*").
     Foram commitados por engano na branch. O .env.production contem apenas VITE_* do projeto oficial
     cfmzkthhgliqelozlmwu (anon/publishable, publicas por definicao no AGENTS.md) - nao e vazamento de
     service_role, mas NAO deve ser recuperado.

7) Divergencia de arquivos grandes = refatoracao da main, nao perda
   Os maiores "ganhos" de linha da branch (OrdersPage +805, OrderDetailPage +680, CollectionDetailPage +557)
   sao codigo verboso antigo que a main compactou. Teste objetivo: extrai todas as strings de UI longas da
   versao da branch e procurou cada uma na arvore src/tests/functions da main. Resultado: 0 ausencias em
   OrderDetailPage, CollectionDetailPage, QuoteBuilderSummaryColumn e FavoritesPage; em OrdersPage as 3 unicas
   "ausentes" eram "Exportacao CSV/PDF/XLSX concluida", que a main gera por template na linha 188
   (`Exportacao ${kind.toUpperCase()} concluida`) dentro do hook useOrderExports - comportamento identico.

NAO VERIFICADO: nao rodei typecheck, lint nem vitest (tarefa somente leitura); nao comparei linha a linha os
1850 arquivos comuns divergentes - a amostragem foi dirigida aos arquivos onde a branch adiciona mais de 40
linhas em src/, supabase/, scripts/, tests/, e2e/ e .github/workflows/ (25 maiores inspecionados).

</details>

<a id="b-fixsicoob-trust-data-20260924"></a>

#### `fix/sicoob-trust-data-20260924` — INCORPORADA · pode apagar: sim

Branch de "verdade do dado" no catálogo: removeu o hook que fabricava selos de confiança do fornecedor (useSupplierTrust) e a inteligência ilustrativa dos badges da página de produto, trocando ambos por dado real com null quando a fonte não existe. Já entrou na main pela PR #34 (mergeada em 25/09/2026) e desde então foi reimplementada/ampliada na main.

Arquivos que existem na branch e não na `main`:

- `src/components/intelligence/TopCategoriesCard.tsx`
- `src/components/orders/InvoicePaymentPanel.tsx`
- `src/types/jspdf-autotable.d.ts`
- `tests/hooks/useProductIntelligenceBadges.test.ts`
- `tests/hooks/useCollections.test.tsx`
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx`
- `.env.production`
- `graphify-out/.gitignore`
- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/README.md`
- `graphify-out/cost.json`
- `graphify-out/diagnostico.json`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/mapear_backend.py`
- `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`
- `supabase/.temp/cli-latest`

<details><summary>Evidência</summary>

1) PREMISSA DA TAREFA ESTÁ ERRADA: a branch TEM PR, e ela foi MERGEADA.
   gh api repos/adm01-debug/Brindes_Sicoob_V2/pulls/34 →
   {"number":34,"title":"Remove selos simulados de fornecedor","head":"fix/sicoob-trust-data-20260924","base":"main","merged":true,"merged_at":"2026-09-25T00:17:18Z"}
   gh api .../pulls/36 → {"title":"Remove inteligência ilustrativa da página de produto","head":"fix/sicoob-intelligence-truth-20260924","base":"fix/sicoob-trust-data-20260924","merged":true,"merged_at":"2026-09-25T00:17:57Z"}
   gh api "pulls?state=all&head=adm01-debug:fix/sicoob-trust-data-20260924" → 1 resultado (#34).
   Ou seja: #36 empilhou na branch, e #34 levou tudo para a main em 25/09/2026, 2 meses antes do re-root.

2) ESCOPO REAL DA BRANCH (só 2 commits próprios; o resto é main antiga):
   git log origin/fix/sicoob-trust-data-20260924 → 38b52cb2 "fix(catálogo): remover inteligência ilustrativa (#36)"; 5455eb84 "fix(catálogo): remover confiança simulada de fornecedor"; 6193793a = main antiga (#30).
   git show --stat 5455eb84 → SocialProof.tsx (+47/-...), useSupplierTrust.ts (-117, apagado), ProductDetail.tsx, ProductDetailHero.tsx, tests/components/SocialProof.test.tsx (+32)
   git show --stat 38b52cb2 → IntelligenceBadges.tsx, useProductIntelligenceBadges.ts, ProductDetail.tsx, tests/hooks/useProductIntelligenceBadges.test.ts (+30)

3) COMPARAÇÃO DE ÁRVORE: git ls-tree -r --name-only → main 4329 arquivos, branch 3690; apenas 17 arquivos existem só na branch; 656 só na main (main evoluiu).

4) CADA FIX DA BRANCH ESTÁ NA MAIN:
   - useSupplierTrust.ts (hook que fabricava confiança): AUSENTE na main — git cat-file -e origin/main:src/hooks/useSupplierTrust.ts falha. Remoção efetivada.
   - tests/components/SocialProof.test.tsx: hash IDÊNTICO nos dois lados (git rev-parse origin/main:<f> == branch:<f>).
   - origin/main:src/components/common/SocialProof.tsx:197 → "/** Dados de confiança obtidos de uma fonte auditável. */" com SupplierTrustData {isVerified; deliveryDays: number|null; avgRating: number|null} vindo por prop, e appendSupplierTrustBadges só emite selo quando o dado existe (linhas 241-252). Diff branch→main em SocialProof.tsx = só extração de constantes de cor (PRIMARY_TONE etc.).
   - deriveProductIntelligenceBadges foi REIMPLEMENTADA COM OUTRO NOME: origin/main:src/hooks/useProductIntelligenceBadges.ts:142 `export function buildBadgeResult(...)` com `if (!intelligence) return { badges, turnoverScore: null, demandLevel: null, isLoading, isDemo: false }` — mesma semântica do commit da branch, mais o campo isDemo.
   - Diff branch→main em IntelligenceBadges.tsx = extração de PRIMARY_BADGE_COLORS/PULSE_ANIMATION + prop isDemo. Main é a versão posterior.

5) TESTE DA BRANCH NÃO FOI PERDIDO, FOI AMPLIADO:
   origin/main:tests/hooks/intelligence-badges.test.ts tem 10 `it` sobre buildBadgeResult, incluindo os 2 da branch: linha 50 "does not invent market badges or metrics when intelligence is absent" e linha 79 "derives market badges and metrics from real intelligence and velocity" (+ classe B, classe C, limiar de tendência, estoque zero, velocity ausente). Superset estrito do arquivo de 2 testes da branch.

6) OS OUTROS 15 ARQUIVOS SÓ-NA-BRANCH (nenhum é trabalho desta branch; todos resolvidos):
   - TopCategoriesCard.tsx → sucedido por origin/main:src/components/intelligence/TopProductFamiliesCard.tsx (mesmo conceito: "famílias de produtos em alta extraídas de `product_views`", mesma heurística de primeiro termo, mesmos ícones Layers/TrendingUp/Sparkles, + estado de erro com botão "Tentar novamente"). TrendsPage.tsx existe na main.
   - InvoicePaymentPanel.tsx → CÓDIGO MORTO já na própria branch: git grep "InvoicePaymentPanel" origin/fix/... -- 'src/**' retorna só a própria definição, nenhum import. Conteúdo é ilustrativo: `(order as any).invoice_number`, `(order as any).payment_status` e texto fixo "Liberação financeira concluída para produção." — exatamente o que o esforço de "remover dado simulado" eliminou.
   - src/types/jspdf-autotable.d.ts → main tem wrapper tipado origin/main:src/lib/pdf/auto-table.ts, usado por 9 arquivos (CartExport.ts, dossierPdfGenerator.ts, kitPdfGenerator.ts, etc.).
   - tests/hooks/useCollections.test.tsx → main tem tests/hooks/useCollections.react.test.tsx com o MESMO `it('should initialize with empty collections')` + tests/hooks/useCollections.test.ts com 14 testes de variantes.
   - scripts/revisao/pendencias-2026-09-12.cenarios.tsx → diff BYTE A BYTE VAZIO contra origin/main:scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx (puro rename).
   - .env.production, graphify-out/** (10 arquivos), supabase/.temp/cli-latest → a main os IGNORA de propósito: origin/main:.gitignore linha 18 `.env.production`, linha 74 `graphify-out/`, linha 80 `supabase/.temp/*`. Remoção é melhoria, não perda. Nota: o .env.production da branch tem 4 chaves, todas `VITE_*` (URL, PUBLISHABLE_KEY, ANON_KEY, PROJECT_ID) — públicas por definição (AGENTS.md), sem vazamento de service_role.

NÃO VERIFICADO: não rodei vitest/typecheck (tarefa é somente leitura); a conclusão é por comparação de conteúdo de árvore e leitura de código, não por execução de teste.

</details>

<a id="b-contexto"></a>

#### `contexto` — INCORPORADA · pode apagar: NÃO

Branch de saída de máquina, não trabalho de agente: contém apenas o contexto para IA (snapshots do banco, inventário de código e regras de negócio) publicado automaticamente pelo workflow `.github/workflows/contexto.yml` da main. Nenhuma linha de código de produto existe nela.

Arquivos que existem na branch e não na `main`:

- `docs/contexto/00-INDEX.md`
- `docs/contexto/codigo/INDEX.md`
- `docs/contexto/supabase/README.md`
- `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md`
- `docs/contexto/supabase/errors.md`
- `docs/contexto/supabase/ (759 arquivos gerados: 487 .sql de snapshot + .md + manifest.json)`
- `docs/contexto/codigo/ (18 arquivos gerados pelo scripts/ai-context/gerar.mjs)`
- `docs/contexto/regras/ (5 arquivos gerados pelo scripts/regras_negocio/generate.py)`

<details><summary>Evidência</summary>

1) A branch é gerada por máquina, confirmado nos dois lados:
- `git log -1 --format='%H %ci %an %s' origin/contexto` → `ede4a5b1e 2026-11-18 12:22:53 +0000 contexto[bot] chore(contexto): 1 fonte(s) regerada(s) @ main 5ecb93f [skip ci]`. Autor é `contexto[bot]`; os 15 commits do topo têm todos a mesma forma.
- `git show origin/main:.github/workflows/contexto.yml` existe na main, linhas 1-19 ("UMA branch gerada (`contexto`)", "Como ler: git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md"), com `schedule: cron '7 * * * *'` + `push: branches [main]` e job `publicar` com `permissions: contents: write`.
- `git show origin/main:AGENTS.md:137-140` instrui os agentes a LER essa branch. `docs/agentes/contexto-ia.md` está na main.

2) A branch não contém código nenhum:
- `git ls-tree -r --name-only origin/contexto | cut -d/ -f1 | sort | uniq -c` → `785 docs`, `1 vercel.json`, `1 README.md` (787 arquivos no total; a main tem 4334).
- `git ls-tree -r --name-only origin/contexto | grep -E '^(src|supabase|scripts|tests|e2e|\.github)/'` → saída VAZIA. Zero arquivos em src/, supabase/functions/, supabase/migrations/, scripts/, tests/, e2e/ ou .github/workflows/.
- Extensões: 487 `.sql`, 278 `.md`, 22 `.json` — todos artefatos de snapshot/inventário.

3) Os 783 arquivos ausentes da main são, por projeto, saída e não fonte. As fontes que os produzem estão todas na main: `scripts/ai-context/gerar.mjs`, `scripts/supabase_snapshot/snapshot.py`, `scripts/regras_negocio/generate.py`, `scripts/regras_negocio/indice.py` (confirmado por `git ls-tree -r --name-only origin/main | grep -E '^scripts/(ai-context|supabase_snapshot|regras_negocio)/'`). O cabeçalho do workflow explica por que a saída não vai para a main: "A main tem branch protection (push direto = GH006) e um PR a cada 10 min dispararia o CI inteiro".

4) Os 4 arquivos presentes nos dois lados (`comm -12`), nenhum com melhoria a recuperar:
- `docs/contexto/regras/manual/README.md` e `docs/contexto/regras/manual/TEMPLATE-regras-de-negocio.md` → `git diff --numstat` vazio nos dois: IDÊNTICOS à main (o workflow copia `manual/` da main).
- `README.md` (−365/+4) e `vercel.json` (−48/+1) divergem, mas NÃO são trabalho: são stubs escritos literalmente pelo workflow em `contexto.yml:368-378` (`cat > "$PUB/README.md"` com o texto "nao edite nem abra PR desta branch"; `cat > "$PUB/vercel.json"` com `{"ignoreCommand":"exit 0",...}` para impedir preview deploy). A versão da main é a boa e está intacta.

5) A branch está em dia, não é histórico morto: `docs/contexto/00-INDEX.md:3` diz "Gerado automaticamente por indice.py · 2026-11-18 12:22 UTC · HEAD `5ecb93f45d`"; `git merge-base --is-ancestor 5ecb93f origin/main` → verdadeiro, e `git rev-list --count 5ecb93f..origin/main` → 2 (apenas 2 commits de defasagem, de hoje).

6) Por isso `pode_apagar=false`: não há trabalho perdido, mas a branch é infraestrutura VIVA e o caminho de leitura documentado em AGENTS.md:137. Apagá-la cega todo agente até a próxima execução do `contexto.yml`. Não é candidata a limpeza.

7) Achado operacional colhido de passagem (não é trabalho a recuperar desta branch): `docs/contexto/supabase/errors.md` na branch registra a seção `grants` falhando com "canceling statement due to statement timeout", e o 00-INDEX marca a fonte do banco como "parcial". O snapshot de grants não está sendo coletado.

</details>



## As 6 branches re-medidas pelos commits próprios

A primeira medição dessas branches comparava a árvore inteira contra a `main` e produzia
ruído: branch antiga carrega milhares de arquivos da linhagem velha que nada têm a ver com o
trabalho dela. A segunda medição isola **só os commits que existem naquela branch e em mais
nenhuma ref**, e confere arquivo por arquivo o que esses commits tocaram.

| branch | commits próprios | arquivos tocados | perdas achadas |
|---|---|---|---|
| `claude/project-workflows-analysis-5n6hva` | 6 | 16 | 0 |
| `feat/pdf-playwright-scripts-art-261108-0516` | 4 | 9 | 0 |
| `fix/execucao-plano-20260928` | 2 | 32 | 0 |
| `fix/sicoob-csp-202635` | 2 | 6 | 0 |
| `fix/sicoob-trust-data-20260924` | 2 | 8 | 3 |
| `docs/plano150-20260927` | 1 | 8 | 1 |

#### `claude/project-workflows-analysis-5n6hva`

ISOLAMENTO DO TRABALHO PRÓPRIO. A ref refs/verif/claude_project-workflows-analysis-5n6hva tem exatamente 6 commits que não existem em nenhuma outra ref de refs/verif nem na origin/main, todos de 27/09/2026, partindo do commit base 18480a47b ("implementa delegações temporárias de aprovação Sicoob (#52)"). Em ordem cronológica: 68dfe7057 "docs(ci): plano de correções dos workflows GitHub em 100 etapas"; 901c7d9a1 "fix(ci): corrigir 15 falhas críticas nos workflows GitHub Actions"; d8777a0c7 "chore: melhorias em deploy-functions, db-audit e migration-drift"; 4933fbf20 "chore: paths-ignore, cache v4, npm ci flags, ordem de steps"; de46a3ae4 "chore(sentinel): adiciona timeout-minutes: 5"; ee12961e7 "fix: remove dependency-type inválido dentro do bloco ignore do dependabot". A primeira tentativa de listagem excluindo também refs/remotes/pr/* e origin/main veio vazia porque não existe refs/remotes/pr neste clone (a variável virou argumento vazio e o comando degenerou); excluindo apenas as outras seis refs de refs/verif a lista saiu com os 6 commits acima, e o `git log --oneline` confirma que o sétimo commit já é 18480a47b, presente na história compartilhada das branches antigas.

ARQUIVOS TOCADOS. O diff de ponta a ponta `git diff --name-status 18480a47b REF` lista 16 arquivos: 15 modificados (.github/dependabot.yml, .github/pull_request_template.md, .lighthouserc.cjs e os 12 workflows branch-protection-sentinel, bundle-check, ci, codeql, db-performance-audit, deploy-sicoob-functions, e2e, lighthouse, migration-ledger-drift, security-compliance, security, sicoob-ci) e 1 adicionado (docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md). Conferi commit a commit: a união dos arquivos tocados pelos 6 commits individualmente é exatamente a mesma lista de 16, portanto nenhum arquivo foi criado e depois apagado dentro da própria branch.

COMPARAÇÃO COM A MAIN POR BLOB. Três arquivos são byte a byte idênticos aos da main (mesmos hashes de blob no mesmo caminho): .github/dependabot.yml, .github/pull_request_template.md e docs/plano-implementacao/plano-workflows-github-100-etapas-20260927.md. Ou seja, o plano de 100 etapas e as correções de dependabot e do template de PR chegaram integralmente à main. Os outros 13 diferem, e abri cada um dos 13 nos dois lados.

ARQUIVO A ARQUIVO (todos caem em (a) "a main tem igual ou mais"):

1. branch-protection-sentinel.yml — a branch adicionou `timeout-minutes: 5` ao job verify-merge-pattern e incluiu "gpt-engineer-app[bot]" na lista de bots oficiais. A main tem as duas coisas (linhas `timeout-minutes: 5` logo após `runs-on`, e o case com "gpt-engineer-app[bot]"), além de pinar actions/checkout por SHA (3d3c42e5aac5 # v7.0.1).

2. bundle-check.yml — a branch removeu o gatilho `push: branches: [main]`, acrescentou `permissions: contents: read`, `timeout-minutes: 15`, `npm ci --no-audit --no-fund`, env VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY sintéticos no build e `if-no-files-found: warn`. A main contém todos esses itens; o único trecho da branch ausente na main é o bloco `paths-ignore` (docs/**, *.md, .github/CODEOWNERS) sobre o `pull_request`, removido de propósito (ver item final sobre paths-ignore). A main ainda acrescenta `if: github.actor != 'Copilot'` e pina as três actions por SHA.

3. ci.yml — a branch trocou `branches: [main, develop]` por `[main]`, usou `npm ci --no-audit --no-fund` e substituiu a lista manual de 28 `deno check` por `find ... -print0 | xargs -0 deno check` cobrindo _shared e todos os entry points. A main tem tudo isso e mais: `deno check --no-config`, exclusão do mcp-server com `deno check --config supabase/functions/mcp-server/deno.json`, dois testes Deno adicionais, passo de integridade do AGENTS.md, `apply-sicoob-migrations.mjs --verify-files` e seis simulações QA novas. Só falta na main o `paths-ignore`.

4. codeql.yml — a branch trocou `upload: never` por `upload: if-supported`, removeu o passo condicional "Publicar resultado no painel de segurança" e afrouxou `if-no-files-found` de error para warn. A main reverteu deliberadamente para `upload: never`, com comentário explicando que o Code Scanning não está habilitado e que o upload responde HTTP 403, voltou `if-no-files-found: error` (mais estrito que a branch) e acrescentou o passo "Publicar resumo e bloquear achados do SARIF" rodando scripts/check-codeql-sarif.mjs, além de pinar codeql-action v4 por SHA e adicionar setup-node. A main é estritamente mais forte; o `upload: if-supported` da branch não é melhoria perdida, é mudança descartada por motivo documentado no próprio arquivo da main.

5. db-performance-audit.yml — a branch adicionou `permissions: contents: read`, concurrency, `timeout-minutes: 20`, `cache: npm`, `npm ci --no-audit --no-fund` e o passo "Verificar secrets obrigatórios". A main tem os cinco (linhas 8, 11, 20, 27 e 32 do arquivo da main) e ainda acrescenta a guarda `if: github.event_name != 'workflow_dispatch' || github.ref == 'refs/heads/main'` e a execução de scripts/db/check-live-api-inventory.mjs antes da auditoria.

6. deploy-sicoob-functions.yml — a branch adicionou `timeout-minutes: 15` e removeu `migrate-helper` das duas listas (publicação e verificação). Grep em origin/main por "migrate-helper" nesse workflow não retorna nada: a remoção foi preservada. A main ainda restringe o dispatch a refs/heads/main, sobe a CLI Supabase para 2.120.0 pinada por SHA, amplia a allowlist (expert-chat, external-db-bridge, bi-copilot, comparison-ai-advisor, get-app-logs, get-visitor-info, secure-upload, auth-integrity-check) e troca o laço jq pelo script scripts/ci/verify-supabase-functions-published.mjs comparando snapshots antes/depois.

7. e2e.yml — a branch removeu o gatilho de push, adicionou `permissions: contents: read` e env VITE_SUPABASE_*, mas também DEGRADOU o arquivo: rebaixou checkout/setup-node v6→v4, upload-artifact v7→v4, cache v5→v4 e cortou a regressão de 4 shards para 2. A main tem `permissions: contents: read` (linhas 11-12), não tem push, e está muito além: job validate-source, separação entre `e2e` público em PR e `e2e-authenticated` por workflow_dispatch no environment e2e-qa, validate-e2e-target.mjs, personas viewer/manager/dev com TOTP, 3 shards com max-parallel 1 e actions pinadas por SHA. Nada da branch se perde e os rebaixamentos dela não devem voltar.

8. lighthouse.yml — a branch removeu o push, adicionou `permissions`, `timeout-minutes: 15`, `npm ci --no-audit --no-fund`, env sintético no build e o passo "Upload Lighthouse reports" apontando para .lighthouseci/. A main tem todos (linhas 7, 18, 28 e 48), acrescenta a instalação/localização do Chromium do Playwright com CHROME_PATH e `include-hidden-files: true`. Só o `paths-ignore` não está lá, e o LHCI_GITHUB_APP_TOKEN foi trocado por CHROME_PATH porque o upload agora é filesystem.

9. .lighthouserc.cjs — a mudança da branch foi `upload.target` de 'temporary-public-storage' para 'filesystem' com `outputDir: '.lighthouseci'`. A main tem exatamente isso. A diferença restante é a main ter chromeFlags e o LCP afrouxado de 2500 para 2600 ms com comentário justificando — mudança posterior da main, não perda.

10. migration-ledger-drift.yml — a branch adicionou `npm ci --no-audit --no-fund` e o passo "Verificar secret obrigatório" para SUPABASE_DB_URL. A main mantém o passo de verificação, mas sobre SUPABASE_ACCESS_TOKEN, porque trocou a conexão Postgres direta pela Management API (comentário no topo do arquivo: "Usa a Management API para não depender da resolução IPv6"); a ideia da branch sobrevive adaptada. A main ainda adiciona environment construction, guarda de dispatch só na main, `--baseline-file scripts/db/migration-ledger-baseline.json` e o passo "Auditar RLS das tabelas centrais".

11. security-compliance.yml — a branch trocou `[main, master]` por `[main]`, adicionou permissions, concurrency, `timeout-minutes: 20`, `npm ci --no-audit --no-fund`, o passo "Preparar diretório de relatórios" (mkdir -p reports), `if-no-files-found: warn`, simplificou o path do artefato e REMOVEU o passo falso "Generate PDF Report" (que só copiava um .md). Na main: permissions na linha 14, concurrency na 17, timeout na 27, mkdir na 42, `if-no-files-found: warn` na 79, e grep por "Generate PDF" não retorna nada — a remoção do passo enganoso foi preservada. O "Cross-Organization Access Test" que ainda existe na branch foi movido na main para o job dedicado seller-quote-rls-test, com environment e2e-qa, validate-e2e-target.mjs e o mesmo scripts/test-rls-compliance.mjs: caso (b), coberto sob outra forma e mais seguro.

12. security.yml — a branch adicionou `timeout-minutes: 10` ao job gitleaks. A main tem, e ainda acrescenta um job npm-audit inteiro (check:npm-audit), guardas `if: github.actor != 'Copilot'`, gitleaks-action pinada v3 com GITLEAKS_VERSION 8.30.1. Falta apenas o `paths-ignore`.

13. sicoob-ci.yml — a branch adicionou `npm ci --no-audit --no-fund`, cache dos browsers do Playwright e trocou `npm run dev` por build de produção + `npx vite preview` no gate de experiência, além de criar uma âncora YAML (&sicoob_paths / *sicoob_paths) para não repetir a lista de paths. A main tem npm ci com flags, o cache (em actions/cache v6 pinada) e exatamente o mesmo par "Build de produção sintético" + "Iniciar servidor de preview" com `npx vite preview --host 127.0.0.1 --port 4178`. A âncora não existe na main porque a main removeu de vez o filtro `paths` do gatilho `pull_request` — o workflow passa a rodar em toda PR, o que é mais cobertura, não menos. A main ainda sobe os timeouts (10→25 e 20→30), adiciona três simulações QA novas, VITE_ENABLE_DEMO_PAGES e um job agregador `sicoob-gate`.

SOBRE OS BLOCOS paths-ignore. O único conjunto de linhas da branch que não aparece em lugar nenhum da main são os blocos `paths-ignore` (docs/**, *.md, .github/CODEOWNERS, reports/**) em bundle-check, ci, codeql, lighthouse e security, mais o filtro `paths` em pull_request do sicoob-ci. Isso não é perda: o AGENTS.md registra a decisão de 08/11/2026 de remover `paths-ignore` do `pull_request` de codeql.yml e lighthouse.yml justamente para que os checks obrigatórios sempre reportem, já que com branch protection `strict: true` um check pulado por filtro de path trava o merge de PRs só de documentação. A main aplicou essa política de forma mais ampla. Reintroduzir esses blocos reverteria uma correção posterior e deliberada.

CONCLUSÃO. Nenhum caso (d). Os 3 arquivos idênticos provam que parte do trabalho foi mergeada tal qual; nos outros 13 a main contém cada melhoria da branch (ou uma versão estritamente superior dela), e as poucas divergências restantes são decisões posteriores e documentadas da main contra o que a branch fez. A branch pode ser apagada.

#### `feat/pdf-playwright-scripts-art-261108-0516`

ISOLAMENTO DO TRABALHO PRÓPRIO

A ref `refs/verif/feat_pdf-playwright-scripts-art-261108-0516` aponta para 3d1e7355a4066b3154c8af8706cd25f40fbba691 (08/11/2026 06:03:45 +0000, "fix: scripts históricos de revisão saem 0 em divergência esperada").

Excluindo as 6 outras refs de refs/verif, todas as refs/remotes/pr/* e origin/main, sobraram apenas 2 commits. Investiguei e descobri a causa: a ref refs/remotes/pr/226 é a PR DESTA MESMA branch (ela contém os dois primeiros commits próprios, 1858c89 e 28eff1d), por isso excluí-la escondia metade do trabalho. A pr/226 não é ancestral nem descendente da nossa ponta: ela diverge em 28eff1d e segue por fc688e8 e d667bb9, enquanto a nossa branch segue por 95dead5 e 3d1e735. Repetindo o cálculo com todas as refs menos a pr/226, obtive exatamente 4 commits próprios, batendo com a expectativa da tarefa:

1. 1858c89186aa2669702712bb3091c75e96c82da0 — "feat: implementa geração real de PDF via Playwright e corrige bugs em scripts" (5 arquivos)
2. 28eff1d4a02207a97194fc57b6cecad07ba9ff79 — "fix: corrige sys.exit(0) falso-sucesso e AssertionError cru em 3 scripts" (3 arquivos)
3. 95dead5cafa28d75a3a4a2b1fbafeb64ca1c43f0 — "fix: postgres_ready.py exit 0 quando Docker ausente (skip gracioso em CI)" (1 arquivo)
4. 3d1e7355a4066b3154c8af8706cd25f40fbba691 — "fix: scripts históricos de revisão saem 0 em divergência esperada" (5 arquivos)

ARQUIVOS TOCADOS

O diff de ponta a ponta (1858c89^ até a ponta) dá 9 arquivos, todos com status M (modificado). Conferi commit a commit: nenhum commit tem status A ou D, portanto nenhum arquivo foi criado e depois apagado dentro da branch. Os 9 arquivos são: scripts/check-codeql-sarif.mjs, scripts/md-to-pdf-stub.mjs, scripts/qa/postgres_ready.py, scripts/revisao/gerar-matriz.py, scripts/revisao/gerar-revisao-2026-09-12.py, scripts/revisao/gerar-revisao-2026-09-24.py, scripts/revisao/gerar-revisao-2026-09-27.py, scripts/revisao/simular-pendencias-2026-09-12.py e scripts/revisao/simular-status-20260927.py.

COMPARAÇÃO POR BLOB CONTRA A MAIN

Comparei blob a blob (git rev-parse <ref>:<caminho> dos dois lados), nunca por git log. Todos os 9 caminhos existem na main com o mesmo nome. Um é idêntico byte a byte (simular-status-20260927.py, blob 49a2f8c8956067f37b459e60efa00916ecba131f nos dois lados). Os outros 8 diferem, e abri cada diff inteiro.

1. scripts/md-to-pdf-stub.mjs — caso (a). A contribuição central da branch (trocar o stub pela geração real de PDF com Playwright + marked) está na main: linha 24 importa chromium de playwright, linha 29 importa marked, linha 96 chama marked.parse, linha 106 aborta toda requisição de rede com page.route, linha 113 define @page size A4 e linha 134 chama page.pdf com format A4. O tratamento de argumento explícito inexistente que a branch criou (retorno do objeto {error} em resolveInput) e o mkdirSync recursivo do diretório de saída aparecem sem alteração nos dois lados. A main ainda acrescenta: ordenação de relatórios pela data do último commit via git log --format=%ct em vez de ordem lexicográfica de nome (função recency), busca também no diretório reports/ além de public/reports/, fallback do dossiê V5 em reports/ e na raiz, e uma guarda nova que aborta quando a saída sobrescreveria a entrada. Nada da branch ficou de fora.

2. scripts/check-codeql-sarif.mjs — caso (a). A correção da branch (capturar ENOENT em readdir e lançar mensagem amigável) está idêntica nos dois lados, nas linhas 44 a 51 de ambos os arquivos. A main acrescenta duas validações que a branch não tinha: lança erro se run.results não for array (em vez de tratar ausência como "nenhum achado") e lança erro se alguma invocação registrar executionSuccessful=false.

3. scripts/qa/postgres_ready.py — caso (a). A branch trocou sys.exit(1) por sys.exit(0) nas 3 condições de Docker indisponível. A main reescreveu o módulo com uma decisão mais fina e documentada: a função docker_is_mandatory() faz com que fora do CI o script saia 0 com aviso (exatamente o efeito que a branch queria na máquina local) e dentro do CI saia 1, com as variáveis QA_ALLOW_SKIP=1 e QA_REQUIRE_DOCKER=1 para inverter cada caso. O docstring da main explica por escrito por que sair 0 no CI é errado: "Sair 0 ali deixava o job verde sem afirmar nada". Ou seja, a main não perdeu a mudança, ela a superou com uma regra explícita, e ainda acrescenta timeout de 30s em vez de 5s, handler de SIGTERM para não deixar container órfão, detecção de container que morreu antes de ficar pronto, tail de log nas mensagens de erro e a função run_overlapping para provar sobreposição real de transações.

4. scripts/revisao/gerar-matriz.py — caso (a). O _historical_excepthook da main é caractere por caractere igual ao da branch, inclusive com AssertionError na tupla e sys.exit(1), que foi exatamente o que o commit 28eff1d fez. A main acrescenta a função _garantir_commit, que resolve a causa raiz (clone raso sem o commit histórico) em vez de mascarar o sintoma.

5. scripts/revisao/gerar-revisao-2026-09-27.py — caso (a). O hook da main mantém FileNotFoundError, KeyError, AssertionError e subprocess.CalledProcessError, que é a tupla completa que a branch montou. A única diferença de comportamento é sys.exit(1) na main contra sys.exit(0) na branch, e a main acrescenta a correção de lineterminator='\n' no csv.DictWriter (que elimina 1641 linhas de diff falso por CRLF) e o _garantir_commit.

6. scripts/revisao/gerar-revisao-2026-09-24.py — caso (a). A main mantém AssertionError no hook, que foi o acréscimo do commit 1858c89. A main não tem subprocess.CalledProcessError nem o import subprocess que o commit 3d1e735 acrescentou, mas isso não é perda: conferi por grep que a versão da main não usa subprocess em lugar nenhum do arquivo, portanto CalledProcessError é uma exceção que não pode ser levantada ali e o import existia só para alimentar a tupla. A main ainda remove a referência a .env.production da lista REFS['segredos'], ficando só docs/secrets.md.

7. scripts/revisao/gerar-revisao-2026-09-12.py — caso (a), com uma ressalva que registro por honestidade. A melhoria concreta do commit 1858c89 neste arquivo era trocar o assert cru por print + sys.exit no teste de "código mudou após o candidato": isso está na main, nas linhas 316 e 317, como print('❌ Código mudou após o candidato') seguido de sys.exit(1). A ressalva é que a main removeu o _historical_excepthook inteiro deste arquivo. Verifiquei no estado anterior ao trabalho (1858c89^) que esse hook já existia antes da branch: a branch apenas acrescentou AssertionError e CalledProcessError à tupla dele. A main eliminou o hook e, no lugar, acrescentou _garantir_commit(COMMIT) e _garantir_commit(ANTERIOR), que levantam RuntimeError nomeando a causa real quando o clone é raso. O docstring da main diz explicitamente que o hook estava "mascarando a ausência total de comparação como divergência histórica benigna". Com o hook fora, os demais asserts do arquivo (linhas 94, 105, 187, 310 e 338 a 348) voltam a imprimir traceback cru em vez de aviso formatado. Não classifico isso como perda porque a main é maior, não menor: ela troca um mascaramento que terminava em exit 0 por falha explícita com exit diferente de zero e trata a causa raiz do problema; o que se vai é só o enfeite da mensagem, e justamente a semântica que a branch escolheu no último commit (sair 0 em divergência) é a que a main rejeitou de propósito.

8. scripts/revisao/simular-pendencias-2026-09-12.py — caso (a). A única diferença entre os dois lados é espaço em branco no fim de uma linha, removido na main. O _require_docker da main tem sys.exit(0) nas 3 condições de Docker indisponível, que é exatamente o estado final que o commit 3d1e735 deixou na branch.

9. scripts/revisao/simular-status-20260927.py — blob idêntico ao da main.

VERIFICAÇÕES EXTRAS

Nenhum dos 9 arquivos é artefato gerado ou lixo, então o caso (c) não se aplica a nenhum. Procurei o caso de arquivo com o mesmo caminho mas documento completamente diferente: não ocorre aqui, todos os 9 são a mesma ferramenta nos dois lados, com as mesmas funções e o mesmo propósito, e os diffs são incrementais e legíveis. Procurei também o caso de melhoria por remoção, isto é, algo que a branch tirou e a main ainda tem: nos 8 diffs, as linhas que existem só na branch são sempre o código antigo que a própria branch substituiu (o auto-descobrimento lexicográfico antigo em md-to-pdf-stub, o run.results ?? [] em check-codeql-sarif, o _require_docker simples em postgres_ready, os sys.exit(0) nos scripts de revisão e o import subprocess morto em gerar-revisao-2026-09-24), e em todos esses pontos a main tem a versão nova ou uma posterior. Conferi por fim o package.json: a branch não o tocou, a main tem marked 18.1.2 contra 18.1.0 da branch e @playwright/test ^1.64.1 contra ^1.63.0, portanto as dependências de que os scripts precisam continuam declaradas e mais novas.

CONCLUSÃO

Zero casos (d). Os 4 commits próprios da branch estão integralmente refletidos na main, em 8 dos 9 arquivos acompanhados de melhorias posteriores e no nono em versão idêntica. A branch pode ser apagada sem perda.

#### `fix/execucao-plano-20260928`

ESCOPO REAL DA BRANCH. A ref refs/verif/fix_execucao-plano-20260928 aponta para bfca3b285. Excluindo as outras seis refs de refs/verif e a origin/main, sobraram exatamente 2 commits próprios, do mais antigo para o mais novo: (1) 1ebfe6a5c "fix: fecha gates de CI e restringe idempotência" (4 arquivos) e (2) bfca3b285 "fix: reconcilia contratos e fecha gates de construção" (28 arquivos). O commit pai do primeiro, a1f3f00cd, é compartilhado com outras branches antigas e não é trabalho desta. O diff de ponta a ponta (git diff 1ebfe6a5c^ refs/verif/fix_execucao-plano-20260928) deu 32 arquivos: 2 criados (.github/workflows/apply-sicoob-migrations.yml e tests/services/sicoobBudgetService.test.ts) e 30 modificados. Rodei git log --diff-filter=D no intervalo dos dois commits e não houve nenhuma deleção: nenhum arquivo foi criado e depois apagado dentro da branch, então o diff de ponta a ponta não esconde nada.

O QUE A BRANCH "ENDURECEU". O pedido mencionava endurecimento de salvamento: é o salvamento de orçamento (quote save). O primeiro commit reescreveu supabase/migrations/20260928162048_quote_save_idempotency.sql, trocando o hash de idempotência de md5 para sha256 via extensions.digest, elevando o CHECK de length(payload_hash) de 32 para 64, quebrando a policy única quote_save_idempotency_actor_only (FOR ALL) em duas policies separadas de SELECT e INSERT com (SELECT auth.uid()) = actor_id, e reduzindo o GRANT de SELECT/INSERT/UPDATE/DELETE para apenas SELECT/INSERT. O resto do commit foram três ajustes menores: continue-on-error no passo de análise do codeql.yml, regeneração de docs/E2E_SMOKE_COVERAGE.md e troca de .sort() por .sort((a,b)=>a.localeCompare(b)) em src/hooks/useKitStockForecast.ts. O segundo commit foi faxina de contratos de tipo: remoção de casts "as Record<string, unknown>" em updates do Supabase (useAccessSecurity, useSellerCarts, OffscreenLayoutCapture, useFavoriteLists, useKitTemplates, useWizardDrafts, useExportJobs, FilterPresets), tipagem forte de UserService.updateHierarchy e SicoobHierarchyTab, reescrita de RLSAuditPage para as colunas reais de sicoob_rls_audit_logs (executed_at, status, issue_details, resolved) com escape de CSV, correção de AdminVerbasPage de entity_type para resource_type, correção de pa_budgets que era filtrada por uma coluna cooperative_id inexistente (passou a resolver os PAs da cooperativa em postos_atendimento) em budgetService e SicoobReportsPage, um teste novo para isso, comentários rls-allow em seis pontos de leitura pré-RPC, filtro .eq("seller_id", user.id) em useDiscountApproval, salt copiado para novo Uint8Array em encryption.ts, imports do deno.json, novo workflow apply-sicoob-migrations.yml, e atualização dos artefatos .typecheck-baseline.json, scripts/db/.inventory-cache.json e do baseline de scripts/check-critical-test-skip-budget.mjs.

CONFRONTO ARQUIVO A ARQUIVO CONTRA A MAIN. Comparei os 32 arquivos por blob (git rev-parse <ref>:<caminho> dos dois lados). Nenhum está ausente da main. Quatro são byte a byte idênticos na main: src/components/admin/MockupPromptManager.tsx, src/components/filters/FilterPresets.ts, src/services/admin/UserService.ts e src/hooks/useKitTemplates.ts. Para os 28 que diferem, abri os dois lados e conferi símbolo por símbolo.

A migration 20260928162048 na main é a versão anterior ao endurecimento, com md5 e CHECK de 32, porque migration mesclada é imutável. O endurecimento está na main em um arquivo separado, supabase/migrations/20260928173500_harden_quote_save_idempotency.sql, que faz tudo o que a branch fazia e mais: troca o CHECK para IN (32, 64) preservando retries legados em md5, recria as duas policies de SELECT e INSERT, e a de INSERT ainda exige EXISTS em public.quotes com q.seller_id = auth.uid(), o que a branch não tinha; o hash sha256 passa a incluir também p_history, separado por 0x1F em vez de dois-pontos; valida jsonb_typeof de p_history; mantém v_legacy_hash em md5 para comparar linhas antigas; faz REVOKE ALL inclusive de authenticated antes de conceder SELECT e INSERT; e adiciona GRANT USAGE ON SCHEMA extensions TO authenticated, sem o qual a chamada a extensions.digest da branch quebraria em runtime. Ou seja, a main é estritamente superior nesse ponto.

Os demais arquivos: .github/workflows/codeql.yml na main usa upload: never com justificativa, actions pinadas por SHA e um passo novo que roda scripts/check-codeql-sarif.mjs bloqueando achados, em vez do continue-on-error da branch, que apenas afrouxava o gate. .github/workflows/apply-sicoob-migrations.yml existe na main em versão muito mais evoluída: roda só na main, com concurrency, actions pinadas por SHA, runner ubuntu-latest e três passos sobre scripts/db/apply-sicoob-migrations.mjs (--check, --apply, --require-applied) com allowlist e ledger, no lugar do supabase db push --include-all que a branch usava e que o AGENTS.md proíbe. .typecheck-baseline.json na main está em total 0 (gerado em 12/11/2026), contra 153 da branch. scripts/check-critical-test-skip-budget.mjs na main abandonou o total agregado e passou a orçamento por arquivo (BASELINE_BY_FILE com 4 entradas de 1 skip cada), bem mais apertado que o baseline 41 da branch. deno.json na main tem os mesmos imports, com mcp-lite pinado em 0.10.0 exato em vez do ^0.10.0 da branch, e nodeModulesDir "none". docs/E2E_SMOKE_COVERAGE.md na main foi regerado em 08/11/2026 e já traz "Vitrine inicial" na linha 23. scripts/db/.inventory-cache.json na main é um snapshot novo, de 13/11/2026, com 225 relations e 247 functions contra 215 e 217 da branch; as nove funções que aparecem só na lista da branch (archive_old_admin_audit_logs, capture_sicoob_order_approval_policy, normalize_quote_parent_root, protect_latest_quote_version_deletion, protect_sicoob_approval_policy_version, queue_sicoob_approval_escalation, queue_sicoob_approval_notifications, require_sicoob_artwork_before_production, validate_sicoob_order_document) são funções de trigger que a Data API não expõe, e conferi que todas continuam definidas em migrations da main, de uma a três migrations cada; é artefato gerado, não perda.

No front, todas as melhorias estão na main: SicoobHierarchyTab tem o campo tipado como "pa_id" | "singular_id" | "carteira_id", o catch com error instanceof Error e já não importa Button nem Save nem mantém updatingId; OffscreenLayoutCapture faz .update({ layout_url: layoutUrl }) sem cast; useAccessSecurity declara AccessSecurityUpdate e os toggles usam .update({ is_active: isActive }) sem cast; useExportJobs lista os campos explicitamente com filters as Json; useWizardDrafts usa as unknown as Json; useFavoriteLists tem FavoriteListUpdate e descarta item_count; useSellerCarts atualiza notes e status sem cast; useKitStockForecast tem o localeCompare na linha 39; useQuotes, quoteStatusTransition, OrderService, ReorderCatalogValidityBanner e useDiscountApproval têm os comentários rls-allow equivalentes, e useDiscountApproval tem o .eq("seller_id", user.id) na linha 237; AdminVerbasPage usa resource_type na linha 125; RLSAuditPage tem o tipo RLSAuditLog, a função csvCell, o select por executed_at/status/issue_details/resolved e ainda ganhou summarizeLatestRlsAuditLogs; budgetService na main é idêntico ao da branch mais getBudgetByPa por competência; SicoobReportsPage na main substituiu a consulta por um join postos_atendimento!inner com filtro em postos_atendimento.cooperativa_id, paginação de 1000 em 1000 e consolidação por competência, bem além da branch (a ocorrência de cooperative_id que resta na main, linha 173, é em fetchOrdersInRange sobre sicoob_orders, outra tabela, que tem essa coluna); tests/services/sicoobBudgetService.test.ts na main contém os três casos da branch com o mesmo texto e um quarto caso para a consulta por competência.

Sobre os dois casos que a instrução mandou vigiar: não houve nenhum arquivo com mesmo caminho e conteúdo completamente diferente (os títulos, seções e símbolos conferem em todos os 28 que diferem); e as mudanças que removiam algo foram todas verificadas pelo lado negativo, isto é, confirmei que a main também não tem mais o que a branch removeu (updated_by e created_by em MockupPromptManager, os casts as Record<string, unknown>, os imports Button e Save e o estado updatingId em SicoobHierarchyTab, o entity_type em AdminVerbasPage, o filtro por cooperative_id em pa_budgets, os logs tipados como any em RLSAuditPage, os GRANT de UPDATE e DELETE na tabela de idempotência). O único remanescente é o comentário rls-allow de QuoteBitrixSync, que não existe na main porque o arquivo foi reescrito e o update direto em public.quotes deixou de existir ali, então o comentário perdeu objeto.

CONCLUSÃO. Nenhum caso (d). Todo o trabalho próprio dos dois commits está na main, em versão igual ou superior, e em vários pontos (idempotência de orçamento, gate de CodeQL, gate de skip, workflow de migrations, baseline de typecheck, relatórios Sicoob) a main é claramente mais forte. A branch pode ser apagada.

#### `fix/sicoob-csp-202635`

ISOLAMENTO DO TRABALHO PRÓPRIO. Excluindo as outras seis refs de refs/verif, mais refs/remotes/pr/* e origin/main, a lista de commits veio vazia; o motivo é que a própria PR desta branch (refs/remotes/pr/27) contém os mesmos commits, e não que a branch não tenha trabalho. Excluindo apenas as outras refs de refs/verif restaram exatamente 2 commits próprios, confirmados como os dois commits de topo da PR 27 (refs/remotes/pr/27 e refs/verif/fix_sicoob-csp-202635 têm 0 commits de diferença em cada lado): (1) 13dfccdaa "fix(seguranca): aplica csp na vercel"; (2) 361dc30b3 "docs(seguranca): registra csp entregue". O commit-base do trabalho é d389b4be7 "fix(security): fecha operações internas e ACLs administrativas (#22)", que não é da branch.

ARQUIVOS TOCADOS PELO TRABALHO PRÓPRIO. git diff --name-status 13dfccdaa^ refs/verif/fix_sicoob-csp-202635 devolveu 6 arquivos: M .gitignore, M docs/SECURITY.md, M docs/plano-melhorias-50-etapas.md, M public/_headers, A tests/scenarios/csp-providers.mjs, A vercel.json. Verifiquei commit a commit (git show --stat de cada um dos 2 commits) e não há nenhum arquivo criado e depois apagado dentro da branch: o primeiro commit toca 5 arquivos (80 inserções, 1 remoção) e o segundo toca só docs/plano-melhorias-50-etapas.md; git log --diff-filter=D no intervalo não devolveu nada.

ARQUIVO POR ARQUIVO CONTRA A MAIN.

1) vercel.json (criado pela branch, 42 linhas). Existe na main. Comparei o JSON parseado dos dois lados: o bloco "headers" tem a mesma source "/:path*" e exatamente as mesmas 8 chaves de header, na mesma ordem (Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, Cross-Origin-Embedder-Policy, Content-Security-Policy). A string de CSP é idêntica (comparação de igualdade exata deu True) e a comparação diretiva por diretiva (quebrando por ponto e vírgula) não achou nenhuma diretiva presente na branch e ausente na main, nenhuma diferença de valor em diretiva comum e nenhuma diretiva extra na main. As 14 diretivas conferidas: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.lovable.app https://*.lovableproject.com https://cdn.gpteng.co https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src com 'self', https e wss de *.supabase.co, *.lovable.app, *.lovableproject.com, api.cnpja.com, www.spotgifts.com.br, api.openai.com, generativelanguage.googleapis.com, api.elevenlabs.io, *.cloudflarestream.com e customer-*.cloudflarestream.com; media-src 'self' blob: mais os dois domínios de stream; frame-src 'self' mais os dois de stream e challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests. A main ainda tem a mais um bloco "rewrites" (/(.*) para /index.html) que a branch não tinha — ou seja, a main é superconjunto. Classificação (a).

2) public/_headers. Blob idêntico nos dois lados: 40ecda09b88429520c7f14d4d0213726d9e85f1f tanto em origin/main:public/_headers quanto em refs/verif/fix_sicoob-csp-202635:public/_headers. A única mudança da branch neste arquivo foi uma REMOÇÃO (tirar "http:" da diretiva img-src, deixando "img-src 'self' data: blob: https:"). Como esse era o caso de risco apontado — melhoria que remove algo —, conferi explicitamente o texto da main: a linha Content-Security-Policy da main já traz "img-src 'self' data: blob: https:" sem "http:". A remoção não se perdeu. Classificação (a).

3) tests/scenarios/csp-providers.mjs (criado pela branch, 29 linhas). Blob idêntico nos dois lados: de88611e4785bfb0756818c4680e2e558f621496. Li o conteúdo da main: tem os dois testes ("CSP é entregue com a mesma política em Cloudflare e Vercel" e "CSP fecha vetores de execução e mantém somente transportes necessários"), incluindo as asserções negativas doesNotMatch de img-src com http: e de script-src com 'unsafe-eval'. O cenário é efetivamente executado na main: package.json da main, linha 91, define "test:scenarios": "node --test tests/scenarios/*.mjs", que casa com o arquivo por glob (por isso não há menção ao nome do arquivo em scripts ou workflows, nem na branch nem na main). Classificação (a).

4) docs/SECURITY.md. Blobs diferem (a main evoluiu), mas a seção que a branch acrescentou está na main palavra por palavra: "## Browser Security Headers" com os dois bullets sobre CSP emitida por Cloudflare (public/_headers) e Vercel (vercel.json) e sobre o cenário tests/scenarios/csp-providers.mjs rejeitar divergência. Diff de linhas ordenadas da versão da branch contra a da main não devolveu nenhuma linha presente só na branch. Classificação (a).

5) docs/plano-melhorias-50-etapas.md. Caminho igual nos dois lados e blobs diferentes (branch da3da81f1, main 925905a23), então conferi título e estrutura em vez de tamanho: os dois são o mesmo documento, "# Runbook de correções e melhorias — 50 etapas", com a mesma lista numerada. A main tem 101 linhas contra 96 da branch porque ganhou dois adendos no topo (revisão de 27/09/2026 e revisão de 24/09/2026). O item 28 reescrito pela branch está na main nas linhas 65 a 67, idêntico: "28. Adicionar Content-Security-Policy — ✅ corrigido: `public/_headers` cobre hospedagem compatível e `vercel.json` entrega a mesma política na Vercel; o cenário `csp-providers.mjs` bloqueia divergência entre provedores." Diff de linhas ordenadas não devolveu nenhuma linha presente só na branch. Classificação (a).

6) .gitignore. A branch acrescentou uma linha, ".vercel". A main tem ".vercel" na linha 21. Diff de linhas ordenadas não devolveu nenhuma linha presente só na branch. Classificação (a).

CONCLUSÃO. Nenhum arquivo caiu no caso (d): não há conteúdo da branch ausente da main, não há versão da main menor que a da branch, não há remoção da branch desfeita na main e não há documento homônimo com conteúdo distinto. Dois dos seis arquivos (vercel.json e tests/scenarios/csp-providers.mjs, os únicos criados pela branch) estão na main com blob idêntico ou superconjunto, e o terceiro arquivo de código (public/_headers) tem blob idêntico. A branch pode ser apagada sem perda.

#### `fix/sicoob-trust-data-20260924`

ISOLAMENTO DO TRABALHO PRÓPRIO

A branch refs/verif/fix_sicoob-trust-data-20260924 tem exatamente 2 commits que não existem em nenhuma outra ref de refs/verif nem na origin/main. São eles, do mais antigo para o mais novo:

1. 5455eb84d86184cb7c7c2c318f2aad790409973d — "fix(catálogo): remover confiança simulada de fornecedor"
2. 38b52cb2428090a535f5ad75720439cf2d49b2cd — "fix(catálogo): remover inteligência ilustrativa (#36)"

Ambos são de adm01-debug, datados de 24/09/2026, co-autoria de Joaquim Ataides. Observação metodológica importante: as refs remotas pr/34 e pr/36 contêm esses mesmos dois commits, porque são as pull requests desta própria branch; excluí-las do rev-list apagaria o trabalho próprio e faria a branch parecer vazia. Por isso o conjunto de exclusão usado foi apenas as outras seis refs de refs/verif mais a origin/main. Confirmei com git merge-base --is-ancestor que nenhum dos dois commits é ancestral da origin/main, coerente com o re-enraizamento da main em 11/11/2026.

ARQUIVOS TOCADOS PELO TRABALHO PRÓPRIO

O diff de ponta a ponta (5455eb84^ até a ponta da branch) toca 8 arquivos: 5 modificados, 1 apagado e 2 criados. Verifiquei commit a commit e nenhum arquivo foi criado e depois apagado dentro da própria branch, logo o diff de ponta a ponta não esconde nada. Os 8 arquivos são src/components/common/IntelligenceBadges.tsx, src/components/common/SocialProof.tsx, src/hooks/useProductIntelligenceBadges.ts, src/hooks/useSupplierTrust.ts (apagado), src/pages/ProductDetail.tsx, src/pages/product-detail/ProductDetailHero.tsx, tests/components/SocialProof.test.tsx (criado) e tests/hooks/useProductIntelligenceBadges.test.ts (criado).

O conteúdo do trabalho é único e coerente: tirar da tela de produto todo selo de confiança e de inteligência de mercado que era fabricado em vez de vir de fonte auditável. Concretamente a branch apagou a função determinística getMockSupplierTrust de SocialProof.tsx (que derivava isVerified, deliveryDays e avgRating de um hash do id do produto), apagou o hook useSupplierTrust.ts inteiro (que consultava o banco externo mas caía no mock sempre que a consulta falhava ou não achava fornecedor, e que inclusive usava o mock como avgRating mesmo no caminho de sucesso, com o comentário "Mock rating (no ratings table exists yet)"), parou de passar supplierTrust por ProductDetail e ProductDetailHero passando a usar uma constante vazia EMPTY_SUPPLIER_TRUST, removeu do hook useProductIntelligenceBadges o fallback para generateMockIntelligence e generateMockVelocities, removeu o campo isDemo do resultado desse hook, removeu a prop isDemo e o selo visual "dados ilustrativos" de IntelligenceBadges.tsx, e acrescentou dois testes que travam esse comportamento.

CONFRONTO ARQUIVO A ARQUIVO CONTRA A MAIN

src/components/common/SocialProof.tsx — caso (a). A main tem exatamente a mesma versão da branch, mais um ganho adicional: extraiu as strings de classe para as constantes PRIMARY_TONE, WARNING_TONE, PRIMARY_TEXT e SUCCESS_TEXT (origin/main linhas 18 a 22). A quebra em appendProductFlagBadges, appendShippingBadge e appendSupplierTrustBadges, o comentário "Dados de confiança obtidos de uma fonte auditável" e a ausência de getMockSupplierTrust estão todos na main. Um git grep por getMockSupplierTrust na main não retorna nada.

src/hooks/useSupplierTrust.ts — caso (a). A branch apagou e a main também não tem o arquivo. Procurei por outro caminho e por resíduos: git ls-tree da main não tem nenhum arquivo com "suppliertrust" ou "supplier-trust" no nome, e um grep por MockSupplierTrust, mockSupplierTrust, "isVerified: abs" e "avgRating: abs" na main não retorna nada. A remoção foi preservada.

src/pages/product-detail/ProductDetailHero.tsx — caso (b). A main refatorou o arquivo (81 linhas contra 387 da branch), movendo as seções para src/pages/product-detail/ProductDetailHeroSections.tsx. A melhoria da branch está lá: a interface ProductDetailHeroProps da main não tem mais a prop supplierTrust (que era tipada any), e a constante EMPTY_SUPPLIER_TRUST aparece em ProductDetailHeroSections.tsx linha 24, usada na linha 212 em DynamicTrustBadges trust={EMPTY_SUPPLIER_TRUST}. Conteúdo coberto.

tests/components/SocialProof.test.tsx — caso (a). O arquivo na main é byte a byte idêntico ao da branch (diff vazio, 32 linhas nos dois lados), com os dois testes "não apresenta confiança de fornecedor sem dados auditáveis" e "mantém os selos factuais do produto".

tests/hooks/useProductIntelligenceBadges.test.ts — caso (b). Esse caminho não existe na main, mas o conteúdo está na main sob outro nome: tests/hooks/intelligence-badges.test.ts, que testa buildBadgeResult (o nome que a main deu à função que a branch chamou de deriveProductIntelligenceBadges). A cobertura da main é superconjunto: são 9 casos contra 2, incluindo os dois da branch (não inventar classificação quando a inteligência está vazia, e exibir classificação só quando ela vem da visão) mais classe B, classe C, limiar de tendência em 1.3, estoque zero, combinação de flags editoriais, ausência de linhas de velocidade e estado de carregamento. Nada se perde aqui.

src/hooks/useProductIntelligenceBadges.ts — caso (d) parcial. A parte principal está na main: o cabeçalho da main diz "Market badges are omitted until the source views return real data", não há mais import de generateMockIntelligence, generateMockVelocities nem isRealIntelligence, e quando intelligence é nulo a main devolve badges só de catálogo com turnoverScore e demandLevel nulos. Porém a main manteve o que a branch removeu: o campo isDemo continua declarado em ProductIntelligenceBadgesResult (origin/main linha 41) e é devolvido como isDemo: false nos dois returns (linhas 150 e 160), e CatalogFlags ainda carrega lowStock e stock (linhas 32 e 33), que a branch tinha eliminado por não serem usados. É esse campo morto que mantém vivo o encanamento do selo falso descrito abaixo.

src/components/common/IntelligenceBadges.tsx — caso (d). Confirmado o caso que já era conhecido. A main ainda tem a prop isDemo na interface IntelligenceBadgesProps (origin/main linha 60), ainda a desestrutura na assinatura do componente (linha 64) e ainda renderiza o bloco {isDemo && (<Badge ... >dados ilustrativos</Badge>)} nas linhas 124 a 128. A branch removeu as três coisas. Hoje o selo não aparece na tela porque useProductIntelligenceBadges devolve isDemo: false nos dois returns, ou seja, é código morto — mas é código morto que reintroduz um selo de "dados ilustrativos" no detalhe do produto no instante em que alguém voltar a alimentar esse campo. A única melhoria da branch que a main já tem nesse arquivo é a guarda turnoverScore !== null && turnoverScore !== undefined, que a main também adotou.

src/pages/ProductDetail.tsx — caso (d). A main ainda desestrutura isDemo do hook (origin/main linha 217: isDemo: intellIsDemo), ainda declara intelligenceDemo: boolean na interface LoadedProductDetailProps (linha 276 em diante) e ainda repassa isDemo={intelligenceDemo} para o componente na linha 311. A branch tinha cortado as três pontas. O restante das mudanças da branch nesse arquivo está na main: não há mais import nem uso de useSupplierTrust, e supplierTrust não é mais passado para ProductDetailHero (git grep por supplierTrust em src/pages na main não retorna nenhuma ocorrência).

CONCLUSÃO

Dos 8 arquivos, 5 estão cobertos pela main com conteúdo igual ou melhor e 3 carregam perda: o eixo "remover o selo isDemo / dados ilustrativos" nunca chegou à main. A perda é de código morto, não de comportamento visível hoje, mas é exatamente o tipo de resíduo que a branch existia para apagar: o selo fabricado continua escrito, tipado e ligado da página até o componente. Como há caso (d), a branch não está liberada para exclusão. Para liberar, basta um fix de três arquivos: tirar prop e bloco do selo em IntelligenceBadges.tsx, tirar o campo isDemo (e, de quebra, lowStock/stock de CatalogFlags) em useProductIntelligenceBadges.ts, e tirar a desestruturação, a prop da interface e o repasse em ProductDetail.tsx. O teste tests/hooks/intelligence-badges.test.ts da main precisa perder as três asserções sobre isDemo junto.

**Perda: `src/components/common/IntelligenceBadges.tsx`** — A branch removeu a prop isDemo e o selo visual "dados ilustrativos" do componente de selos de inteligência. A main ainda tem os dois: a prop declarada na interface, desestruturada na assinatura do componente e o bloco JSX que renderiza o Badge com o texto "dados ilustrativos". Hoje é código morto (o hook devolve isDemo: false nos dois caminhos), mas é o encanamento completo de um selo fabricado, pronto para voltar à tela de detalhe do produto assim que alguém alimentar o campo.

Evidência: origin/main:src/components/common/IntelligenceBadges.tsx:60 (isDemo?: boolean;), :64 (export function IntelligenceBadges({ badges, turnoverScore, isDemo, className })), :124 a :128 ({isDemo && (<Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-border">dados ilustrativos</Badge>)}). Na branch, git show refs/verif/fix_sicoob-trust-data-20260924:src/components/common/IntelligenceBadges.tsx não tem nenhuma dessas três ocorrências (121 linhas contra 131 da main).

**Perda: `src/pages/ProductDetail.tsx`** — A branch cortou as três pontas que ligam a página ao selo falso: a desestruturação de isDemo vinda do hook, o campo intelligenceDemo na interface de props do subcomponente e o repasse isDemo={intelligenceDemo} para IntelligenceBadges. A main mantém as três. É o que mantém vivo o caminho do selo "dados ilustrativos" descrito no item anterior.

Evidência: origin/main:src/pages/ProductDetail.tsx:217 (const { badges: intellBadges, turnoverScore: intellTurnover, isDemo: intellIsDemo } = useProductIntelligenceBadges(id, catalogFlags);), interface LoadedProductDetailProps com intelligenceDemo: boolean a partir da linha 276, e :311 (<IntelligenceBadges badges={intelligenceBadges} turnoverScore={turnoverScore} isDemo={intelligenceDemo} />). A versão da branch chama <IntelligenceBadges badges={intellBadges} turnoverScore={intellTurnover} /> sem isDemo.

**Perda: `src/hooks/useProductIntelligenceBadges.ts`** — Perda parcial. O essencial foi preservado na main: o fallback para generateMockIntelligence e generateMockVelocities sumiu e os selos de mercado só saem quando a visão de inteligência devolve dado real. O que a main não absorveu foi a limpeza do campo isDemo, que continua declarado no tipo de resultado e devolvido como false nos dois returns, e a remoção de lowStock e stock de CatalogFlags, campos que a branch eliminou por não serem lidos em lugar nenhum. É esse campo isDemo que sustenta os dois itens acima.

Evidência: origin/main:src/hooks/useProductIntelligenceBadges.ts:41 (isDemo: boolean; em ProductIntelligenceBadgesResult), :150 (return { badges, turnoverScore: null, demandLevel: null, isLoading, isDemo: false };), :160 (isDemo: false, no return final) e :32-:33 (lowStock?: boolean; stock?: number; em CatalogFlags). Na branch, a interface ProductIntelligenceBadgesResult termina em isLoading e CatalogFlags só tem featured, newArrival e onSale. O teste da main tests/hooks/intelligence-badges.test.ts também ainda afirma isDemo: false em três casos.

#### `docs/plano150-20260927`

ISOLAMENTO DO TRABALHO PRÓPRIO. Excluindo todas as outras refs de refs/verif, as 304 refs de refs/remotes/pr e origin/main, a lista de commits próprios veio VAZIA. Reduzindo a exclusão (só as outras refs de refs/verif + origin/main) sobra exatamente 1 commit: f47e5d8e33389d3f65478ec9c3e6419edc1a753c — "docs: cria plano de correções e melhorias em 150 etapas" (27/09/2026). A lista inicial veio vazia porque esse commit também está em refs/remotes/pr/44 (verificado com git merge-base --is-ancestor contra as 304 refs de PR: pr/44 é a única que o contém). Ou seja, o trabalho desta branch virou a PR #44. NÃO são 15 commits próprios: o topo da branch é f47e5d8e3 e seu pai (3094cbab2, "Torna atualização em lote de orçamentos transacional (#41)") é exatamente o merge-base com refs/verif/claude_project-workflows-analysis-5n6hva, refs/verif/fix_execucao-plano-20260928 e refs/verif/feat_pdf-playwright-scripts-art-261108-0516 — todos os 19.407 commits anteriores são história compartilhada, não trabalho desta branch. Assunto do único commit próprio: "docs: cria plano de correções e melhorias em 150 etapas".

ARQUIVOS TOCADOS PELO TRABALHO PRÓPRIO (8, todos no mesmo commit; como há só 1 commit, não existe arquivo criado e apagado dentro da branch): M docs/README.md; M docs/plano-implementacao/README.md; A docs/plano-implementacao/plano-150-etapas-20260927/etapas.csv; A docs/plano-implementacao/plano-150-etapas-20260927/plano.json; A docs/plano-implementacao/plano-150-etapas-20260927/plano.md; A docs/plano-implementacao/plano-150-etapas-20260927/rastreabilidade.csv; A docs/plano-implementacao/plano-150-etapas-20260927/validacao.json; A scripts/revisao/gerar-plano-150-20260927.py. Total 12.627 inserções, zero remoções.

O "PLANO DE 150 ETAPAS" ESTÁ INTEIRO NA MAIN, BIT A BIT. Comparando blob a blob (git rev-parse <ref>:<caminho>), os 6 arquivos criados pelo commit são IDÊNTICOS na main, no mesmo caminho: etapas.csv (151 linhas), plano.json (7.882 linhas), plano.md (3.789 linhas), rastreabilidade.csv (295 linhas), validacao.json (323 linhas) e scripts/revisao/gerar-plano-150-20260927.py (179 linhas). Classificação (a) para os seis. A main inclusive usa esses arquivos em trabalho posterior: docs/execucao/revisao-plano-20260928/matriz-150.csv e matriz-150.json auditam etapa por etapa (P003 a P150) citando plano.json, rastreabilidade.csv e validacao.json; docs/execucao/revisao-plano-20260928/fontes-sha256.json registra os hashes desses mesmos arquivos; docs/execucao/lacunas-funcionalidades-2026-10-11/01-plano-encerramento.md também os referencia. Portanto a main tem o plano E o que foi construído em cima dele.

docs/plano-implementacao/README.md — classificação (a). O commit acrescentou a seção "## Plano de correções em 150 etapas — 27/09/2026" com o parágrafo de links. Essa seção está na main nas linhas 64-66 de docs/plano-implementacao/README.md, com texto idêntico. Além dela, a main tem mais: a linha 3 traz o "Plano de encerramento — 01/10/2026" (100 etapas / 1.000 itens) que declara consolidar as 150 etapas.

docs/README.md — classificação (b). A versão da branch é o índice antigo de 131 linhas assinado "Pink e Cerébro", e o commit apenas acrescentou no fim a seção "## Plano atual de correções do portal Sicoob" com um link para plano-150-etapas-20260927/plano.md. Na main, docs/README.md é OUTRO documento (55 linhas, reescrito, com atualizações de 29/10/2026) e não contém a string "150 etapas" nem "plano-150" — mas ele aponta para "[Planos de implementação](./plano-implementacao/README.md)" na seção "Planos e auditorias", e esse arquivo carrega o parágrafo idêntico com os quatro links do plano de 150 etapas. A navegação até o plano está preservada, em um salto a mais. Nenhum conteúdo substantivo se perde: o que a branch acrescentou aqui era só um ponteiro.

CASO (d) CONFIRMADO — docs/RUNBOOKS/CREDENTIAL_ROTATION.md. Mesmo caminho nos dois lados, documentos completamente distintos. Branch (124 linhas): "# 🔐 Runbook P0: Rotação de Credenciais — Incidente `.env` Exposto", severidade P0, janela de 24 h, com a ORDEM SEQUENCIAL de execução por integração — 3.1 Supabase (reset do service_role, listagem prévia de consumidores: n8n, Edge Functions, Cloudflare Workers, .env local), 3.2 n8n (Settings → Variables, recriar Credentials, disparar workflow de validação), 3.3 Bitrix24 (webhook clássico `<id-de-webhook-Bitrix24-redigido>` marcado como INVÁLIDO e a confirmar revogado; OAuth Bitrix24 ↔ n8n `<client-OAuth-Bitrix24-redigido>` a revogar e reemitir), 3.4 Evolution API/WhatsApp (regenerar apikey por instância, atualizar n8n e a variável EVOLUTION_API_KEY) — mais checklist de fechamento, hardening pós-rotação, tempo estimado, bloqueios e critério de sucesso. Main (150 linhas): "# Rotação de credenciais — Brindes Sicoob V2", outro documento — tabela de classificação público/privado, estado verificado em 07/10/2026, consumidores conhecidos, procedimento genérico, validação por tipo, calendário de 90/180 dias, resposta a incidente e checklist. A main cita n8n uma única vez e NÃO cita Bitrix24 nem Evolution API nesse arquivo (git grep -c confirmou: bitrix = 0 ocorrências). O roteiro sequencial por integração não existe em nenhum outro lugar da main sob outro nome (docs/RUNBOOKS da main tem só CREDENTIAL_ROTATION.md e MCP_DDL_APPLICATION.md, os mesmos dois da branch).

RESSALVA IMPORTANTE SOBRE ESSE CASO (d), que muda quem deve preservá-lo: ele NÃO é trabalho desta branch. O arquivo foi introduzido pelo commit e5c13fb45 ("docs(security): P0 credential rotation runbook (#75)"), que é história compartilhada — é ancestral de 5 das 6 outras refs de refs/verif (claude_project-workflows-analysis-5n6hva, feat_pdf-playwright-scripts-art-261108-0516, fix_execucao-plano-20260928, fix_sicoob-csp-202635, fix_sicoob-trust-data-20260924), não sendo ancestral apenas de computador_local, que é a própria main. Apagar só esta branch não apaga esse conteúdo; ele some apenas quando a última dessas seis branches antigas for apagada. Observe também que o runbook da branch é de outro projeto: fala do repositório `adm01-debug/Promo_Gifts` e do Supabase `allrjhkpuscmgbsnmjlv`, não do `cfmzkthhgliqelozlmwu` oficial do Brindes Sicoob V2 — o dono precisa decidir se o roteiro ainda vale para este portal antes de portá-lo.

CONCLUSÃO. O trabalho próprio desta branch (o plano de 150 etapas, seus 5 artefatos de dados e o gerador Python) está 100% na main, byte a byte, no mesmo caminho, e já foi auditado por documentos posteriores da main. Pelo critério estrito de trabalho próprio, a branch estaria liberada. Marquei liberada_para_exclusao = false apenas por causa do CREDENTIAL_ROTATION.md, que existe no retrato desta branch e cujo conteúdo não tem equivalente na main — seguindo a regra "false se houver QUALQUER caso (d)" —, registrando que esse conteúdo é compartilhado com outras cinco branches antigas e que basta preservá-lo uma vez (portar o roteiro sequencial para a main ou arquivá-lo) para liberar todas elas.

**Perda: `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`** — Runbook P0 de rotação de credenciais com ordem sequencial por integração: 3.1 Supabase (reset do service_role depois de listar consumidores em n8n, Edge Functions, Cloudflare Workers e .env local), 3.2 n8n (Settings/Variables, recriação de Credentials, workflow de validação), 3.3 Bitrix24 (webhook clássico <id-de-webhook-Bitrix24-redigido> marcado como INVÁLIDO a confirmar revogado e OAuth Bitrix24 n8n <client-OAuth-Bitrix24-redigido> a reemitir), 3.4 Evolution API/WhatsApp (regenerar apikey por instância e atualizar EVOLUTION_API_KEY), mais checklist de fechamento, hardening, tempo estimado, bloqueios e critério de sucesso. A main tem outro documento no mesmo caminho: política de classificação e calendário de rotação do Brindes Sicoob V2, sem Bitrix24, sem Evolution API e com uma única menção a n8n. Ressalva: este arquivo não é trabalho desta branch (veio do commit compartilhado e5c13fb45) e está presente em outras cinco branches antigas; além disso o roteiro é do projeto adm01-debug/Promo_Gifts e do Supabase allrjhkpuscmgbsnmjlv, não do cfmzkthhgliqelozlmwu oficial.

Evidência: git log --oneline refs/verif/docs_plano150-20260927 -- docs/RUNBOOKS/CREDENTIAL_ROTATION.md = e5c13fb45 'docs(security): P0 credential rotation runbook (#75)'. Branch linha 1: '# 🔐 Runbook P0: Rotação de Credenciais — Incidente `.env` Exposto', linhas 27/42/49/63 = '### 3.1 Supabase', '### 3.2 n8n', '### 3.3 Bitrix24', '### 3.4 Evolution API (WhatsApp)'. Main linha 1: '# Rotação de credenciais — Brindes Sicoob V2'; git grep -c -i 'bitrix' origin/main -- docs/RUNBOOKS/CREDENTIAL_ROTATION.md = 0 ocorrências; git grep -c -i 'n8n' no mesmo arquivo = 1. git ls-tree -r --name-only origin/main -- docs/RUNBOOKS lista apenas CREDENTIAL_ROTATION.md e MCP_DDL_APPLICATION.md.



## As branches liberadas para exclusão, com a prova

#### `claude/project-workflows-analysis-5n6hva` — liberada: NÃO

Arquivos: 4381 no total · 4379 idênticos à `main` · 2 divergentes · 0 ausentes da `main` · 0 commits próprios

A branch `claude/project-workflows-analysis-5n6hva` foi auditada por conteúdo (sha de blob), não por histórico, porque a `origin/main` foi re-enraizada em 11/11/2026 e `git merge-base` entre as duas é vazio, o que torna `git log` e `git diff A...B` inúteis para concluir qualquer coisa sobre conteúdo. A comparação foi feita listando a árvore completa das duas referências com `git ls-tree -r --format='%(objectname) %(path)'` e cruzando os pares sha+caminho com `comm`. O commit auditado da branch é ee12961e746bba2e46c2179c074f87120dfccf48 e o da main é ca76bcdbb29867c7649976e2ebc71b5fa18bac38.

Medição: a branch tem 4381 arquivos versionados. Desses, 4379 são byte-idênticos à main, isto é, a main contém exatamente o mesmo blob (mesmo sha de objeto) no mesmo caminho. Apenas 2 arquivos divergem. Além disso, o cruzamento só por caminho mostra que zero arquivos existem na branch e não existem na main; o inverso é que a main tem 3 arquivos a mais que a branch não tem. Ou seja, a branch não é portadora de nenhum caminho exclusivo.

Arquivo divergente 1: `scripts/db/apply-sicoob-migrations.mjs`. Blob na branch a815... (na verdade e32cf2a677144fcd5f4f27382f25bcc42cdf776e) contra 74919e5ff35578077608c68211b31b6423784d46 na main. O `git diff --numstat` entre o blob da branch e o da main devolve `4 0`, isto é, a main tem quatro linhas a mais e nenhuma linha a menos; a versão da branch é um subconjunto estrito da versão da main. As quatro linhas que a main acrescenta são a entrada de allowlist da migration nova, dentro do array `TARGETS`, logo após a entrada de `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql`: um objeto com `file: "supabase/migrations/20261118150000_fix_connections_auto_test_interval_hourly.sql"` e `sha256: "5dd6f2a121b197070166d84a602083ca67492f16f1e1270449534a9155604f89"`. Caso (a): a main tem a mesma coisa e mais. Nada se perde ao apagar a branch.

Arquivo divergente 2: `src/pages/ClientsPage.tsx`. Blob a815d2ffe3338d37404070214e485c764fa7c613 na branch contra f37203904e3c72d68c7e3c8b0f85d3ae3e5c7a55 na main; `git diff --numstat` devolve `51 10`, cinquenta e uma linhas adicionadas e dez removidas no sentido branch → main. A versão da branch é a versão antiga da tela, aquela com os indicadores inventados: um array literal `kpis` precedido do comentário "Indicadores mockados para demonstração de excelência visual (KPIs)", com os valores digitados à mão "Novos (Mês)" = "12", "Ticket Médio" = "R$ 4.2k" e "Taxa Retenção" = "94%". A versão da main substitui isso por medição real: importa `useClientsPortfolioKpis` (linha 19), define `type KpisQuery` (linha 40) e a função `montarKpis` (linha 42), que monta três cartões — "Total Clientes", "Compraram no mês" (linha 58) e "Ticket médio (N dias)" (linha 66) — alimentados pelo hook instanciado na linha 80 e consumidos na linha 92, com estado de carregamento por cartão (`kpi.carregando`) em vez do `isLoading` global da lista, e com a grade ajustada de quatro para três colunas. As dez linhas removidas são exatamente o bloco mockado. Portanto a main não só contém tudo o que a branch tinha nesse arquivo em forma equivalente, como o supera: nenhum comportamento da versão da branch desaparece, apenas os números falsos, e isso é remoção deliberada, documentada no próprio código. Caso (a).

Reforço de que a main está à frente, e não atrás: os três arquivos que existem só na main são `src/hooks/useClientsPortfolioKpis.ts` (o hook que faz a medição, com cabeçalho explicando que "novos clientes no mês" e "taxa de retenção" saíram da tela por falta de dado e de definição de negócio, respeitando `applySellerScope` e paginando o PostgREST com `PAGE_SIZE = 1000` e `TICKET_WINDOW_DAYS = 90`), `tests/hooks/useClientsPortfolioKpis.test.ts` (o teste desse hook) e `supabase/migrations/20261118150000_fix_connections_auto_test_interval_hourly.sql` (a correção de `get_connections_auto_test_interval` para cron horário). Confirmei que esse arquivo de migration não existe na branch: `git rev-parse FETCH_HEAD:supabase/migrations/20261118150000_fix_connections_auto_test_interval_hourly.sql` falha com "does not exist in 'FETCH_HEAD'". Isso casa com a entrada de allowlist que a branch também não tem, o que fecha a leitura: a branch é simplesmente um retrato da main de antes desses dois trabalhos entrarem.

Conclusão: nenhum arquivo cai no caso (d). Não há um único byte na branch que não esteja na main em versão igual ou mais nova. A branch não carrega trabalho exclusivo de nenhum agente, não carrega migration, script, teste, documento ou configuração que a main desconheça, e seus dois arquivos divergentes são versões anteriores de arquivos que a main já tem evoluídos. A exclusão é segura e não perde nada.

**Ressalvas:** Nenhuma ressalva sobre perda de conteúdo. Observação de método: a auditoria é sobre o conteúdo versionado das árvores git (4381 caminhos na branch, 4384 na main); arquivos não versionados que tenham existido no ambiente de trabalho daquela sessão não são visíveis por nenhuma referência git e, por definição, não são recuperáveis nem perdíveis pela exclusão da branch.

Tentativa de refutação: `evidencias.md`, seção `claude/project-workflows-analysis-5n6hva`.

#### `computador_local` — liberada: sim

Arquivos: 4381 no total · 4379 idênticos à `main` · 2 divergentes · 0 ausentes da `main` · 0 commits próprios

RESUMO DA DECISÃO: a branch `computador_local` pode ser apagada com segurança. Ela não contém nenhum arquivo, nenhuma linha e nenhum commit que não esteja já presente em `origin/main`. Dos 4381 arquivos versionados na branch, 4379 são byte-idênticos à main (mesmo sha de blob, ou seja, conteúdo rigorosamente igual), 0 arquivos existem só na branch, e os 2 arquivos restantes existem na main em versão mais nova e mais completa. Além disso, a branch é ancestral direta da main, o que é a prova mais forte possível de incorporação.

1) INVENTÁRIO MEDIDO DOS ARQUIVOS. Listei a árvore completa dos dois lados com `git ls-tree -r <ref> --format='%(objectname) %(path)'`, que imprime o sha do blob (a impressão digital do conteúdo do arquivo) ao lado do caminho. A branch `origin/computador_local` tem 4381 arquivos versionados. A `origin/main` tem 4384. Cruzando as duas listas pelo par (caminho + sha do blob), 4379 arquivos coincidem exatamente, ou seja, são byte a byte iguais. Cruzando só pelo caminho, nenhum caminho da branch está faltando na main: todos os 4381 caminhos da branch existem na main. Portanto não há o caso (d) — não existe um único arquivo da branch que a main desconheça. Sobram exatamente 2 arquivos que existem nos dois lados mas com conteúdo diferente, e eles estão detalhados abaixo.

2) PRIMEIRO ARQUIVO DIVERGENTE — `scripts/db/apply-sicoob-migrations.mjs`. Na branch o blob é e32cf2a677144fcd5f4f27382f25bcc42cdf776e; na main é 74919e5ff35578077608c68211b31b6423784d46. O `git diff --numstat` entre os dois blobs devolve exatamente "4 0", isto é, quatro linhas acrescentadas e zero linhas removidas no sentido branch → main. A main é, literalmente, a versão da branch mais quatro linhas. As quatro linhas são uma nova entrada no array `TARGETS`, logo após a entrada do arquivo `supabase/migrations/20261118130700_bind_sicoob_scan_evidence_hash.sql` (linha 204 do arquivo), registrando na allowlist a migration `supabase/migrations/20261118150000_fix_connections_auto_test_interval_hourly.sql` com o hash sha256 `5dd6f2a121b197070166d84a602083ca67492f16f1e1270449534a9155604f89`. Este é o caso (a): a main tem tudo o que a branch tem, e ainda tem uma migration a mais autorizada a ser aplicada. Nenhuma linha da branch foi descartada. Apagar a branch não remove nada desse arquivo.

3) SEGUNDO ARQUIVO DIVERGENTE — `src/pages/ClientsPage.tsx`. Na branch o blob é a815d2ffe3338d37404070214e485c764fa7c613; na main é f37203904e3c72d68c7e3c8b0f85d3ae3e5c7a55. O `git diff --numstat` devolve "51 10": a main acrescenta 51 linhas e remove 10 em relação à branch. Esse é o único ponto onde a main de fato descarta linhas que a branch tinha, então examinei linha por linha o que foi removido. As dez linhas removidas são, todas elas, o bloco de KPIs falsos da tela de clientes, que na branch vinha sob o comentário "Indicadores mockados para demonstração de excelência visual (KPIs)" e continha os números digitados à mão "Novos (Mês)" = 12, "Ticket Médio" = "R$ 4.2k" e "Taxa Retenção" = "94%", mais o import do ícone `Target` que só servia a esse bloco e a troca do grid de `md:grid-cols-4` para `md:grid-cols-3`. Nada disso era trabalho a preservar: era dado inventado dentro do código, exatamente o que as regras do projeto proíbem. Em troca, a main acrescenta 51 linhas que substituem esses números fictícios por medição real: importa o hook `useClientsPortfolioKpis` (origin/main:src/pages/ClientsPage.tsx linha 19), o chama dentro do componente (linha 80), e monta os cartões pela função `montarKpis`, que expõe "Compraram no mês" (linha 58) e "Ticket médio (90 dias)" (linha 66) com estado de carregamento próprio por cartão. Este é o caso (a) na forma mais clara: a main tem a mesma tela, mais o comportamento correto, e o que ficou para trás foi mock. Confirmei também que essa substituição veio acompanhada do código de apoio, que só existe na main: o hook `src/hooks/useClientsPortfolioKpis.ts`, com 122 linhas, que respeita o escopo de visibilidade do usuário via `applySellerScope` e pagina a consulta ao PostgREST, e o teste `tests/hooks/useClientsPortfolioKpis.test.ts`, com 149 linhas. Ou seja, a divergência não é uma perda: é a branch estar atrasada em relação a uma melhoria já mergeada.

4) ARQUIVOS QUE SÓ A MAIN TEM. Pela mesma comparação de árvores, a main tem três arquivos que a branch não tem: `src/hooks/useClientsPortfolioKpis.ts`, `tests/hooks/useClientsPortfolioKpis.test.ts` e `supabase/migrations/20261118150000_fix_connections_auto_test_interval_hourly.sql`. Isso é o esperado e reforça a conclusão: são justamente os arquivos novos que acompanham as duas divergências descritas acima. Arquivo que existe só na main nunca é motivo para preservar uma branch; é prova de que a main está à frente.

5) PROVA INDEPENDENTE POR HISTÓRICO. Embora o enunciado da auditoria avise que a `origin/main` foi re-enraizada em 11/11/2026 e que o merge-base costuma vir vazio para branches antigas, neste caso específico o merge-base NÃO é vazio: `git merge-base origin/main origin/computador_local` devolve 71d515bd8a7a47fadf0a4d6f5b29098516392909, que é exatamente o commit de ponta da própria branch. E `git merge-base --is-ancestor origin/computador_local origin/main` retorna sucesso. Em outras palavras, a branch `computador_local` é ancestral direta da `main`: toda a sua história, até o último commit, já está dentro da história da main. O número de commits próprios da branch, isto é, commits que estão nela e não na main, é zero. A main está dois commits à frente: `eeb3c4ee2 fix(clientes): KPIs da carteira passam a ser medidos, não digitados à mão (#314)` e `ca76bcdbb fix(db): intervalo de auto-teste le agendamento de 2 e 4 horas (#310)`. Esses dois commits explicam, um a um, as duas divergências de conteúdo encontradas no passo 2 e no passo 3. A ponta da branch é o commit `71d515bd8 fix(auth): logout apaga o historico de navegacao do vendedor anterior (#312)`, de 18/11/2026 às 12:27 (-0300), que já está mergeado na main. A conclusão pelo histórico e a conclusão pelo conteúdo batem perfeitamente, por dois caminhos independentes.

6) CONCLUSÃO. Não sobrou nenhum arquivo no caso (d). Não há nenhum arquivo no caso (b) — nada precisou ser procurado sob outro nome, porque nenhum caminho estava faltando. Não foi preciso invocar o caso (c) — nenhum arquivo precisou ser classificado como lixo ou artefato efêmero para fechar a conta, embora valha registrar que as únicas linhas descartadas entre branch e main eram dados mockados dentro de `src/pages/ClientsPage.tsx`, substituídos por medição real. Os dois arquivos divergentes se enquadram no caso (a), com a main contendo versão igual mais acréscimos. A branch `computador_local` é um instantâneo atrasado da main, sem um único byte exclusivo, e pode ser apagada sem perder trabalho de ninguém. Como ela é ancestral da main, mesmo depois de apagada o commit 71d515bd8 continua alcançável pelo histórico da main, então a operação é reversível na prática.

**Ressalvas:** Nenhuma ressalva de perda de trabalho. Dois pontos de contexto, ambos sem risco: (1) o nome "computador_local" sugere que a branch pode ter sido usada como ponto de sincronização de uma máquina local; o que estiver no disco dessa máquina e nunca tiver sido commitado não aparece em nenhuma auditoria de Git e não é afetado pela exclusão da branch remota — a exclusão só remove o ponteiro remoto, não o commit 71d515bd8, que continua acessível porque é ancestral de origin/main. (2) A auditoria foi feita contra origin/main no estado ca76bcdbb (18/11/2026, 14:47 -0300) e contra origin/computador_local no estado 71d515bd8 (18/11/2026, 12:27 -0300), ambos após `git fetch origin computador_local` nesta sessão; se alguém empurrar novos commits para a branch depois desta leitura, a auditoria precisa ser refeita.

Tentativa de refutação: `evidencias.md`, seção `computador_local`.

#### `feat/pdf-playwright-scripts-art-261108-0516` — liberada: sim

Arquivos: 4138 no total · 3843 idênticos à `main` · 293 divergentes · 2 ausentes da `main` · 4 commits próprios

RESUMO DA DECISÃO

A branch `feat/pdf-playwright-scripts-art-261108-0516` pode ser apagada com segurança. Todo o conteúdo que ela produziu já está na `main`, em versão igual ou mais completa, e nenhum arquivo dela ficou sem correspondente. Isso foi verificado comparando blobs (sha de conteúdo), não histórico de commits, porque a `main` foi re-enraizada em 11/11/2026 e não compartilha ancestral com esta branch.

NÚMEROS MEDIDOS

A branch (ponta `3d1e7355a4066b3154c8af8706cd25f40fbba691`) tem 4138 arquivos versionados. A `main` (`ca76bcdbb`, de 18/11/2026) tem 4384. Comparando caminho a caminho:

- 3843 arquivos da branch são byte-idênticos à `main`: mesmo caminho e mesmo sha de blob.
- 293 arquivos existem nos dois lados com o mesmo caminho, mas com sha de blob diferente.
- 2 arquivos existem na branch e não existem na `main` sob aquele caminho.
- 3843 + 293 + 2 = 4138, ou seja, todos os arquivos da branch foram classificados; nenhum ficou de fora.

QUAL FOI O TRABALHO REAL DESTA BRANCH

A branch carrega toda a história antiga do repositório (19505 commits), mas o trabalho próprio dela é muito pequeno. O último commit da branch que veio de uma PR já mergeada é `ff7f2a4e5` ("fix: erros não tratados em check-bundle-budget, api_map e gerar-matriz (#225)", mergeada em 08/11/2026 às 05:44 UTC). Comparando a árvore da ponta da branch com a árvore desse commit (`git diff --name-status ff7f2a4e5 origin/feat/pdf-playwright-scripts-art-261108-0516`), o resultado são exatamente 9 arquivos modificados e nenhum arquivo adicionado ou removido:

1. scripts/check-codeql-sarif.mjs
2. scripts/md-to-pdf-stub.mjs
3. scripts/qa/postgres_ready.py
4. scripts/revisao/gerar-matriz.py
5. scripts/revisao/gerar-revisao-2026-09-12.py
6. scripts/revisao/gerar-revisao-2026-09-24.py
7. scripts/revisao/gerar-revisao-2026-09-27.py
8. scripts/revisao/simular-pendencias-2026-09-12.py
9. scripts/revisao/simular-status-20260927.py

Esses 9 arquivos são os 4 commits próprios da branch: `1858c8918` (geração real de PDF via Playwright), `28eff1d4a`, `95dead5ca` e `3d1e7355a`. Esse conjunto foi aberto como a PR #226 ("feat: geração real de PDF via Playwright + correção de bugs em scripts"), que consta no GitHub como mergeada em 2026-11-08T06:03:12Z.

Isso parte a auditoria em dois blocos, e os dois foram fechados.

BLOCO 1 — OS 285 ARQUIVOS DIVERGENTES QUE A BRANCH NUNCA TOCOU (caso (a))

Dos 293 arquivos divergentes, 285 têm, na branch, exatamente o mesmo sha de blob que tinham no commit base `ff7f2a4e5`. Isto é, a branch não escreveu uma única linha neles: são apenas a fotografia da `main` antiga de 08/11/2026, congelada. A `main` atual evoluiu esses arquivos nos 59 commits que vieram depois da re-enraização. Como a branch não contribuiu com nada neles, apagá-la não remove nenhuma linha de trabalho. A verificação é reproduzível com um laço que, para cada caminho divergente, compara `git rev-parse <branch>:<caminho>` com `git rev-parse ff7f2a4e5:<caminho>`: dá igual nos 285 e diferente só nos 8 do bloco 2.

Os 285 caminhos são estes, agrupados por área:

Workflows e configuração de repositório (12): .github/workflows/bundle-check.yml, .github/workflows/ci.yml, .github/workflows/codeql.yml, .github/workflows/e2e.yml, .github/workflows/lighthouse.yml, .github/workflows/security.yml, .github/workflows/sicoob-ci.yml, .gitignore, .gitleaks.toml, .gitleaksignore, .hermes.md, .typecheck-baseline.json.

Raiz e documentação (16): AGENTS.md, PENDENCIAS.md, README.md, RELATORIO_CI.md, docs/BRANCH_PROTECTION.md, docs/DEPLOYMENT.md, docs/EDGE_FUNCTIONS.md, docs/README.md, docs/correcoes-validacao-2026-09-14.md, docs/execucao/evidencias/autoridade-verbas-sicoob.json, docs/execucao/lacunas-funcionalidades-2026-10-11/05-frontend-nucleo.md, docs/execucao/lacunas-funcionalidades-2026-10-11/08-banco-migrations.md, docs/execucao/lacunas-funcionalidades-2026-10-11/indice-lacunas.csv, docs/plano-implementacao/README.md, docs/secrets.md, docs/security/RLS_MATRIX.md.

Dependências e e2e (3): package.json, package-lock.json, e2e/routes/public/lista-publica.spec.ts.

Scripts (76, excluídos os 8 do bloco 2): scripts/api_map.cjs, scripts/audit-export.mjs, scripts/check-critical-test-skip-budget.mjs, scripts/check-edge-authorization.mjs, scripts/check-edge-functions-health.mjs, scripts/check-edge-request-id-propagation.mjs, scripts/check-edge-structured-logging.mjs, scripts/check-eslint-baseline.mjs, scripts/check-migration-immutability.mjs, scripts/check-npm-audit.mjs, scripts/check-price-freshness-coverage.mjs, scripts/check-route-ref-usage.mjs, scripts/check-seller-scope.mjs, scripts/check-sicoob-hardcoded-colors.mjs, scripts/check-smoke-tags.mjs, scripts/check-typecheck-baseline.mjs, scripts/check_tables.js, scripts/ci/verify-supabase-functions-published.mjs, scripts/compare-edge-functions.mjs, scripts/db/.check-runtime-refs-allowlist.json, scripts/db/.inventory-cache.json, scripts/db/apply-sicoob-migrations.mjs, scripts/db/audit-core-rls.mjs, scripts/db/check-migration-ledger-drift.mjs, scripts/db/check-runtime-refs.mjs, scripts/db/classify-migration-backlog.mjs, scripts/db/compare-types-api.mjs, scripts/db/import-api-inventory.mjs, scripts/db/migration-ledger-baseline.json, scripts/db/supabase-sql-client.mjs, scripts/e2e-cleanup.mjs, scripts/e2e-feature-summary.mjs, scripts/e2e-smoke-coverage-doc.mjs, scripts/e2e-smoke-summary.mjs, scripts/e2e-target.mjs, scripts/enterprise-dossier-builder.mjs, scripts/fix-edge-cors-allowlist.mjs, scripts/generate-audit-dossier.mjs, scripts/generate-enterprise-report.mjs, scripts/generate_api_map.js, scripts/healthcheck.mjs, scripts/lib/cli.mjs, scripts/lib/edge-authorization-contract.mjs, scripts/load-test.mjs, scripts/migrate-edge-cors-allowlist.mjs, scripts/qa/simular-aprovacao-desconto-atomica.py, scripts/qa/simular-autoridade-verbas-sicoob.py, scripts/qa/simular-conversao-pedido-sicoob.py, scripts/qa/simular-convites-sicoob.py, scripts/qa/simular-duplicacao-pedido-atomica.py, scripts/qa/simular-escopo-orcamento-ativo.py, scripts/qa/simular-eventos-status-sicoob.py, scripts/qa/simular-governanca-orcamento.sh, scripts/qa/simular-verba-atomica.py, scripts/qa/simular-verba-legada.py, scripts/revisao/lacunas-20260927.cenarios.tsx, scripts/revisao/lacunas-20260928.cenarios.tsx, scripts/revisao/rascunhos-20260924.cenarios.tsx, scripts/revisao/simular-lacunas.mjs, scripts/revisao/vitest-pendencias-2026-09-12.config.ts, scripts/run-smoke-filtered.mjs, scripts/scan-rls-security.mjs, scripts/seed-qa.mjs, scripts/simulate-webhooks.mjs, scripts/smoke-tests.mjs, scripts/test-audit-scripts.mjs, scripts/test-rls-compliance.mjs, scripts/test-rls.mjs, scripts/triage-edge-typecheck.mjs, scripts/tscheck-files.mjs, scripts/typecheck-edge-functions.mjs, scripts/validate-audit-links.mjs, scripts/validate-docs-consistency.mjs, scripts/validate-e2e-target.mjs, scripts/validate-lovable-sync-target.mjs, scripts/validate-wcag-colors.mjs.

Front-end em src/ (115): src/App.tsx, src/components/admin/CouponManager.tsx, src/components/admin/ImageUploadButton.tsx, src/components/admin/OwnershipRepairDialog.tsx, src/components/admin/ProductsManager.tsx, src/components/admin/categories/CategoriesManager.tsx, src/components/admin/connections/ZoneCommandPalette.tsx, src/components/admin/connections/ZoneCommandTrigger.tsx, src/components/admin/products/ProductPreviewPanel.tsx, src/components/admin/products/image-gallery/ImageGrid.tsx, src/components/admin/products/image-gallery/ImagePreviewDialog.tsx, src/components/admin/products/image-gallery/useProductImageGallery.ts, src/components/admin/products/new-supplier/tabs/BasicDataTab.tsx, src/components/admin/products/new-supplier/useNewSupplierForm.ts, src/components/admin/products/sections/engraving/useEngravingWizard.ts, src/components/admin/products/video-gallery/useProductVideoGallery.ts, src/components/admin/suppliers-manager/SupplierFormDialog.tsx, src/components/admin/suppliers-manager/SupplierTable.tsx, src/components/admin/suppliers-manager/useSuppliersManager.ts, src/components/admin/telemetry/BreakerStatusCard.tsx, src/components/admin/telemetry/ColdVsWarmCrmCard.tsx, src/components/ai/AIChat.tsx, src/components/bi/ClientLookalikes.tsx, src/components/cart/MiniCart.tsx, src/components/cart/cart-company-options.ts, src/components/common/EnhancedSpotlight.tsx, src/components/common/OptimizedImage.tsx, src/components/common/PersistentBreadcrumbs.tsx, src/components/expert/chat/useExpertChat.ts, src/components/favorites/FavoritesClientPicker.tsx, src/components/intelligence/ConversionFunnel.tsx, src/components/intelligence/HotSearchesCard.tsx, src/components/intelligence/TrendsForecastChart.tsx, src/components/intelligence/TrendsHeatmap.tsx, src/components/intelligence/UnmetDemandCard.tsx, src/components/layout/MainLayout.tsx, src/components/layout/SidebarReorganized.tsx, src/components/mockup/ArtFileUpload.tsx, src/components/mockup/approval/OffscreenLayoutCapture.tsx, src/components/orders/FinancialPanel.tsx, src/components/products/ProductCardImage.tsx, src/components/products/share/ShareContactSelector.tsx, src/components/quotes/CompanyContactSelector.tsx, src/components/quotes/QuoteAutoSave.tsx, src/components/quotes/QuoteConsolidationPanel.tsx, src/components/quotes/QuoteHistoryTimeline.tsx, src/components/quotes/company-contact/CompanySearchDropdown.tsx, src/components/search/GlobalSearch.tsx, src/components/search/useGlobalSearch.ts, src/components/sicoob/orders/OrderBudgetIntelligence.tsx, src/components/sicoob/orders/SLABadge.tsx, src/contexts/AuthContext.tsx, src/hooks/bi/useClientSeasonality.ts, src/hooks/bi/useClientVsIndustry.ts, src/hooks/bi/useIndustryCategoryTrends.ts, src/hooks/bi/useIndustryTrends.ts, src/hooks/mockup/mockupGenerationService.ts, src/hooks/quote/useQuoteInitialization.ts, src/hooks/sicoob/useSicoobOrder.ts, src/hooks/useAutoSave.ts, src/hooks/useColorEnrichment.ts, src/hooks/useCrmCompanies.ts, src/hooks/useCustomKitPersistence.ts, src/hooks/useExternalSimulator.ts, src/hooks/useExternalVariantStock.ts, src/hooks/useFavoriteReactions.ts, src/hooks/useKitBuilderQueries.ts, src/hooks/useMagicUpState.ts, src/hooks/useNovelties.ts, src/hooks/usePaBudget.ts, src/hooks/useProductImages.ts, src/hooks/useProductInsights.ts, src/hooks/useProductIntelligenceBadges.ts, src/hooks/useQuoteBuilderState.ts, src/hooks/useReplenishments.ts, src/hooks/useSicoobApprovals.ts, src/hooks/useSimilarProducts.ts, src/hooks/useSimulation.ts, src/integrations/supabase/types.ts, src/lib/access/role-policy.ts, src/lib/cloud-status.ts, src/lib/crm-db.ts, src/lib/external-db/products-detail.ts, src/lib/external-db/products-lightweight.ts, src/lib/external-db/products.ts, src/lib/mockup-storage.ts, src/lib/storage-resilience.ts, src/lib/telemetry/bridgeCallMetrics.ts, src/pages/ClientsPage.tsx, src/pages/GestorOrcamentos.tsx, src/pages/HelpCenterPage.tsx, src/pages/PublicFavoriteListPage.tsx, src/pages/QuoteBuilderPage.tsx, src/pages/TrendsPage.tsx, src/pages/admin/AdminCMSPage.tsx, src/pages/admin/AdminCampanhasPage.tsx, src/pages/admin/AdminCentraisPage.tsx, src/pages/admin/AdminConexoesPage.tsx, src/pages/admin/AdminCooperativasPage.tsx, src/pages/admin/AdminNewsletterPage.tsx, src/pages/admin/AdminPAsPage.tsx, src/pages/admin/AdminProductFormPage.tsx, src/pages/admin/AdminSingularesPage.tsx, src/pages/admin/AdminVerbasPage.tsx, src/pages/admin/ai-usage/AiQuotaManager.tsx, src/pages/admin/sicoob/tabs/CooperativasTab.tsx, src/pages/admin/sicoob/tabs/PAsTab.tsx, src/pages/quote-view/useQuoteViewData.ts, src/pages/quotes-dashboard/useQuotesDashboard.ts, src/pages/sicoob/GestorApprovalsPage.tsx, src/pages/sicoob/orders/OrderDetailPage.tsx, src/pages/trends/TrendsCharts.tsx, src/pages/trends/TrendsKpiCards.tsx, src/pages/trends/is-demo-mode.ts, src/pages/trends/trends-mock.ts, src/pages/trends/trends-queries.ts, src/routes/config/sicoob-rbac.ts, src/services/OrderService.ts, src/services/QuoteService.ts, src/services/sicoob/logisticsReportService.ts, src/services/sicoob/orderService.ts.

Supabase (24): supabase/config.toml, supabase/functions/_shared/ai-usage.ts, supabase/functions/_shared/authorize.ts, supabase/functions/_shared/connection-test-runner.ts, supabase/functions/_shared/credentials.test.ts, supabase/functions/_shared/credentials.ts, supabase/functions/_shared/edge-authz-manifest.ts, supabase/functions/_shared/external-db-aliases.ts, supabase/functions/admin-audit-hook/index.ts, supabase/functions/bi-share-dossier/index.ts, supabase/functions/connections-auto-test/index.ts, supabase/functions/connections-health-check/index.ts, supabase/functions/connections-hub-audit/index.ts, supabase/functions/crm-db-bridge/index.ts, supabase/functions/crm-db-bridge/inspectInsertResult.test.ts, supabase/functions/crm-db-bridge/singleton-client.test.ts, supabase/functions/expert-chat/index.ts, supabase/functions/health-check/index.ts, supabase/functions/process-scheduled-reports/index.ts, supabase/functions/secure-upload/index.ts, supabase/functions/send-scheduled-reports/index.ts, supabase/functions/sicoob-document-ingest/index.ts, supabase/functions/trends-insights/index.ts, supabase/functions/webhook-dispatcher/index.ts, supabase/functions/webhook-inbound/index.ts.

Testes (26): tests/admin/route-ref-checker.test.ts, tests/components/QuoteConsolidationPanel.history.test.tsx, tests/components/QuoteHistoryTimeline.test.tsx, tests/components/admin/ProductsManager.test.tsx, tests/components/admin/connections/ZoneCommandPalette.test.tsx, tests/components/cart/cart-company-options.test.ts, tests/components/command/GlobalCommandBar.test.tsx, tests/components/quotes/QuoteAutoSave.readonly.test.tsx, tests/helpers/supabase-mock.ts, tests/hooks/intelligence-badges.test.ts, tests/hooks/useAutoSave.test.tsx, tests/lib/cloud-status.test.ts, tests/lib/external-db-aliases.test.ts, tests/lib/external-db-bridge-telemetry.test.ts, tests/lib/external-db-products-lightweight-pagination.test.ts, tests/p0/edge-functions-failing.test.ts, tests/p0/webhooks-resilience.test.ts, tests/pages/HelpCenterPage.test.tsx, tests/pages/TrendsKpiCards.test.tsx, tests/pages/trends-queries.test.ts, tests/scenarios/catalogo-somente-leitura.mjs, tests/scenarios/edge-authorization.mjs, tests/scenarios/gate-autorizacao.mjs, tests/scenarios/operacoes-internas-seguras.mjs, tests/scenarios/quality-gates.mjs, tests/scenarios/supabase-sql-client.scenario.mjs, tests/scripts/apply-sicoob-migrations-scanner.test.ts, tests/scripts/check-codeql-sarif.test.ts, tests/scripts/classify-migration-backlog.test.ts, tests/scripts/e2e-target.test.ts, tests/services/sicoobLogisticsReportService.test.ts, tests/services/sicoobOrderService.test.ts.

BLOCO 2 — OS 8 ARQUIVOS DIVERGENTES QUE A BRANCH REALMENTE ESCREVEU

Para cada um, comparei três versões: a base `ff7f2a4e5`, a ponta da branch e a `main` atual.

1. scripts/check-codeql-sarif.mjs — caso (a). A branch acrescentou um try/catch em `inspectSarif` que traduz `ENOENT` em mensagem clara ("Diretório não encontrado. Execute o passo CodeQL antes deste gate"). Esse bloco está na `main`, nas linhas 47 e 48 de `scripts/check-codeql-sarif.mjs`, confirmado por leitura direta do arquivo da `main`. Além disso, a `main` tem o que a branch não tem: rejeita SARIF com execução sem a lista `results` e com `invocations[].executionSuccessful === false`, ou seja, a `main` é estritamente mais completa.

2. scripts/md-to-pdf-stub.mjs — caso (a). Este é o coração da branch: trocar o stub por geração real de PDF com Playwright. A `main` mantém `import { chromium } from 'playwright'` e a função `mdToPdf` (aparecem como linhas de contexto inalteradas no diff branch→main), e vai além: descobre o relatório mais recente pela data do último commit (função `recency`, usando `git log -1 --format=%ct`), procura primeiro em `reports/` e só depois em `public/reports/`, trata dossiê V5 tanto em `reports/` quanto na raiz, e acrescenta uma guarda que aborta quando a saída coincidiria com a entrada. Nada do que a branch escreveu se perdeu.

3. scripts/qa/postgres_ready.py — caso (a). A branch trocou três `sys.exit(1)` por `sys.exit(0)` para pular quando não há Docker. A `main` resolveu o mesmo problema melhor, com a função `_docker_unavailable` e `docker_is_mandatory()`: sem Docker, falha (exit 1) no CI, onde a prova é obrigatória, e sai 0 em máquina local, com as variáveis `QA_ALLOW_SKIP` e `QA_REQUIRE_DOCKER` para inverter cada caso. A `main` ainda acrescenta timeout de 30 segundos, handler de SIGTERM, detecção de container que morreu antes de ficar pronto e a função `run_overlapping` para provar concorrência de transações. A versão da `main` é mais nova e mais completa em todos os pontos.

4. scripts/revisao/gerar-matriz.py — caso (a). A branch adicionou `AssertionError` ao `_historical_excepthook` e trocou `sys.exit(0)` por `sys.exit(1)`. As duas mudanças estão presentes na `main`, inalteradas (o diff branch→main não toca nessas linhas). A `main` acrescenta a função `_garantir_commit`, que falha quando o commit histórico de referência não está no clone raso do CI.

5. scripts/revisao/gerar-revisao-2026-09-12.py — caso (a). A branch tinha ampliado o `_historical_excepthook` e trocado um `assert` por aviso com `sys.exit(0)`. A `main` removeu o excepthook inteiro e trocou o aviso por `❌ Código mudou após o candidato` com `sys.exit(1)`, colocando no lugar `_garantir_commit(COMMIT)` e `_garantir_commit(ANTERIOR)`. É uma substituição deliberada e mais rigorosa: a branch mascarava a falha, a `main` ataca a causa (clone raso sem os commits históricos). Não há conteúdo da branch perdido, há conteúdo da branch superado.

6. scripts/revisao/gerar-revisao-2026-09-24.py — caso (a). A branch adicionara `import subprocess` e `subprocess.CalledProcessError` à lista tolerada, mantendo `sys.exit(0)`. A `main` manteve `AssertionError` (que veio da branch), retirou `CalledProcessError` da lista e passou a sair 1, além de remover `.env.production` da lista de fontes de segredos. Mais nova e deliberadamente mais estrita.

7. scripts/revisao/gerar-revisao-2026-09-27.py — caso (a). As duas contribuições da branch estão na `main`: a lista ampliada do excepthook com `AssertionError` e `subprocess.CalledProcessError` (linha 14 da versão da `main`) e o `stderr=subprocess.DEVNULL` no `git diff --name-only`. A `main` adiciona `sys.exit(1)` no lugar de 0, `lineterminator='\n'` no CSV (evita 1641 linhas de diff falso por CRLF) e `_garantir_commit(BASE)` / `_garantir_commit(ANTIGA)`.

8. scripts/revisao/simular-pendencias-2026-09-12.py — caso (a). A única diferença entre branch e `main` é a remoção de espaços em branco no fim de uma linha (1 linha adicionada, 1 removida, em um bloco de SQL dentro de uma f-string). Todas as mensagens de aviso que a branch escreveu estão intactas na `main`.

Observação complementar: o nono arquivo tocado pela branch, `scripts/revisao/simular-status-20260927.py`, é byte-idêntico à `main` (blob `49a2f8c8956067f37b459e60efa00916ecba131f` nos dois lados), o que confirma de forma independente que a PR #226 chegou à `main`.

BLOCO 3 — OS 2 ARQUIVOS QUE NÃO EXISTEM NA MAIN NAQUELE CAMINHO

1. scripts/revisao/pendencias-2026-09-12.cenarios.tsx — caso (b), renomeado. O mesmo arquivo está na `main` como `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx`, com sha de blob exatamente igual: `2c407af8250660a4c1e57e81f7a0b7263ae6c22b` nos dois lados. É byte por byte o mesmo conteúdo, só com o sufixo `.test` acrescentado para o Vitest reconhecer o arquivo. A `main` já aponta para o nome novo em `scripts/revisao/vitest-pendencias-2026-09-12.config.ts:8` e em `scripts/automation.config.json:1049`. Zero perda.

2. src/components/intelligence/TopCategoriesCard.tsx — caso (b), renomeado e reescrito. Na `main` ele é `src/components/intelligence/TopProductFamiliesCard.tsx`, com o mesmo papel (famílias/categorias em alta extraídas da tabela `product_views`), a mesma prop `days` e os mesmos ícones `Layers`, `TrendingUp` e `Sparkles`. A versão da `main` é mais completa: recebe os dados prontos via `ProductFamilyTrend` de `@/pages/trends/trends-projections` em vez de fazer a própria `useQuery`, e acrescenta estado de erro com botão de nova tentativa (componente `ProductFamiliesError`, props `isError`, `isFetching`, `onRetry`). O consumidor foi migrado: `src/pages/TrendsPage.tsx:37` importa `TopProductFamiliesCard` e a linha 632 o renderiza. A `main` ainda ganhou um `src/components/intelligence/CategoryRanking.tsx` que não existia. Importante: esse arquivo não foi escrito por esta branch — o blob na branch (`f15ceddf0840226e2f778703620689c249afce06`) é idêntico ao do commit base `ff7f2a4e5`, então a branch apenas carregava a cópia antiga.

CONCLUSÃO

Nenhum arquivo caiu no caso (d). Dos 4138 arquivos da branch: 3843 são byte-idênticos à `main`; 285 divergem mas a branch nunca os tocou (são a `main` antiga congelada em 08/11/2026); 8 foram escritos pela branch e todos os 8 estão na `main` em versão igual ou mais completa; e 2 existem na `main` sob outro nome, um deles com blob idêntico. A PR #226, que é exatamente o trabalho desta branch, consta como mergeada em 2026-11-08T06:03:12Z. Portanto a branch `feat/pdf-playwright-scripts-art-261108-0516` está integralmente incorporada à `main` e pode ser apagada sem perda de trabalho.

**Ressalvas:** Nenhum arquivo caiu no caso (d). Duas observações que não bloqueiam a exclusão, mas que o dono deve saber: (1) em quatro dos scripts históricos de revisão a `main` reverteu de propósito a escolha da branch de "sair 0 quando há divergência" e passou a sair 1, resolvendo a causa raiz com a função `_garantir_commit` (clone raso do CI não tinha os commits históricos). Ou seja, parte do trabalho da branch foi deliberadamente substituída por algo melhor na `main`, não perdida por acidente; apagar a branch não desfaz nada. (2) O arquivo `src/components/intelligence/TopCategoriesCard.tsx` não existe mais com esse nome na `main`: ele virou `src/components/intelligence/TopProductFamiliesCard.tsx`. Essa renomeação não foi feita por esta branch (o blob na branch é idêntico ao do commit base ff7f2a4e5), então não há trabalho desta branch envolvido.

Tentativa de refutação: `evidencias.md`, seção `feat/pdf-playwright-scripts-art-261108-0516`.

#### `fix/execucao-plano-20260928` — liberada: sim

Arquivos: 3897 no total · 2037 idênticos à `main` · 1860 divergentes · 14 ausentes da `main` · 5 commits próprios

AUDITORIA POR CONTEÚDO (BLOB), NÃO POR HISTÓRICO

A branch `fix/execucao-plano-20260928` aponta para o commit bfca3b285c2241a0e9a22702784a0cde1a8d5d13. A `origin/main` aponta para ca76bcdbb29867c7649976e2ebc71b5fa18bac38. Confirmei que `git merge-base origin/main FETCH_HEAD` não devolve nada (saída vazia): as duas pontas não compartilham ancestral, porque a main foi re-enraizada em 11/11/2026. Por isso nenhuma conclusão abaixo usa contagem de commits, `git log` ou diff de três pontos. Tudo foi medido comparando o sha do blob de cada caminho (`git ls-tree -r`) e, quando o sha diferia, lendo o conteúdo dos dois lados.

NÚMEROS MEDIDOS

A árvore da branch tem 3.897 arquivos versionados. A árvore da main tem 4.384 arquivos, ou seja, 487 arquivos a mais no total. Cruzando os dois inventários de blob:

- 2.037 arquivos da branch são byte-idênticos à main (mesmo caminho e mesmo sha de blob);
- 1.846 arquivos existem nos dois lados sob o mesmo caminho, mas com sha de blob diferente;
- 14 arquivos existem só na branch, sob aquele caminho exato;
- 501 caminhos existem só na main.

Portanto 1.860 arquivos da branch (1.846 + 14) não são byte-idênticos à main e precisam de justificativa individual. Eles se dividem em dois grupos muito desiguais, e essa separação é o eixo da auditoria.

GRUPO 1 — 1.805 ARQUIVOS QUE A BRANCH NUNCA TOCOU (caso "a": a main tem versão mais nova)

O último commit da branch que pertence à linha antiga do projeto (e não a esta branch) é 8028c879d "docs: registra reconciliação do GitHub com o Supabase Sicoob (#70)", uma PR já mesclada na main antiga. Os 5 commits próprios desta branch vêm depois dele: 21e382274 (RLS policy explícita nas 9 tabelas internas), 89ca16ef4 (Lighthouse CI — Chromium no runner), a1f3f00cd (consistência de orçamentos e logística), 1ebfe6a5c (gates de CI e idempotência) e bfca3b285 (reconcilia contratos e fecha gates de construção). O diff de dois pontos dentro da própria história da branch, 8028c879d..bfca3b285, toca exatamente 51 arquivos.

Rodei uma verificação arquivo a arquivo nos 1.805 caminhos divergentes que NÃO estão nesses 51: para cada um, comparei o sha do blob na branch com o sha do mesmo caminho em 8028c879d. O resultado foi zero divergências (contador `divergentes_da_base=0`). Isso prova, por conteúdo e não por história, que nesses 1.805 arquivos a branch não escreveu uma única linha: ela carrega literalmente o mesmo blob que já existia no projeto em 28/09/2026. Qualquer diferença deles para a main é evolução feita na main depois dessa data, nunca trabalho desta branch. Não há nada a perder neles ao apagar a branch, porque não há nada de autoral neles. Pela mesma razão os 501 arquivos que só a main tem são ganho da main, não perda da branch.

GRUPO 2 — OS 51 ARQUIVOS QUE A BRANCH REALMENTE ESCREVEU

Comparei cada um dos 51 contra a main. Dez já estão byte-idênticos na main, isto é, o trabalho da branch entrou sem alteração nenhuma: src/components/admin/MockupPromptManager.tsx, src/components/filters/FilterPresets.ts, src/hooks/useKitTemplates.ts, src/services/admin/UserService.ts, src/services/encryption.ts, supabase/migrations/20260928140600_rls_deny_all_internal_tables.sql, tests/components/LoadingScreen.test.tsx, tests/components/PriceFreshnessBadge.colorAndIcon.test.tsx, tests/components/PriceFreshnessBadge.thresholdHosts.test.tsx e tests/hooks/useKitStockForecast.test.ts. Vale registrar que a migration 20260928140600_rls_deny_all_internal_tables.sql, que era o entregável de segurança do commit 21e382274, está na main com o mesmo sha de blob — o fechamento da falha "Enterprise Compliance" foi preservado.

Nos 41 restantes extraí, para cada arquivo, todas as linhas que os commits próprios da branch ADICIONARAM (diff -U0 de 8028c879d para bfca3b285, lado "+") e testei linha a linha se cada uma existe no arquivo correspondente da main. Em 19 desses 41 arquivos o resultado foi zero linhas ausentes, ou seja, a main contém integralmente o texto adicionado pela branch e ainda o cerca de código novo: e2e/routes/_catalog.ts, src/components/admin/users/SicoobHierarchyTab.tsx, src/hooks/infrastructure/useExportJobs.ts, src/hooks/quotes/useQuotes.ts, src/hooks/simulator/useWizardDrafts.ts, src/hooks/useDiscountApproval.ts, src/hooks/useFavoriteLists.ts, src/hooks/useKitStockForecast.ts, src/hooks/useSellerCarts.ts, src/integrations/supabase/types.ts, src/pages/admin/AdminVerbasPage.tsx, src/services/OrderService.ts, src/services/quoteStatusTransition.ts, src/services/sicoob/budgetService.ts, src/services/sicoob/logisticsReportService.ts, tests/hooks/useAutoSave.test.tsx, tests/services/quoteReorder.test.ts, tests/services/sicoobBudgetService.test.ts e tests/services/sicoobLogisticsReportService.test.ts. Nos quatro arquivos de teste e em e2e/routes/_catalog.ts a main é superconjunto estrito (o diff para a main é só adição: 65+/0-, 19+/0-, 15+/0-, 30+/0- e 12+/0-).

Sobraram 22 arquivos em que alguma linha adicionada pela branch não aparece literalmente na main. Abri cada um e verifiquei o que a main tem no lugar. Nenhum deles é perda de função; todos são caso (a) — a main tem versão igual ou mais completa — ou caso (c) — artefato gerado. Detalhando:

src/services/QuoteService.ts: as 4 linhas "ausentes" são assinaturas antigas. A main tem o mesmo recurso, com mais rigor: `static async create` com campo `idempotencyKey` (linha 330) repassado como `p_idempotency_key` ao RPC (linha 339), e `static async update` com `expectedRowVersion` (linha 354), validação `Number.isInteger(params.expectedRowVersion) || params.expectedRowVersion < 1` (linha 360) e `p_expected_row_version` enviado ao banco (linha 379). A branch não validava o inteiro; a main valida.

src/hooks/useQuoteBuilderState.ts: as 11 linhas "ausentes" eram o bloco inline de salvamento. A main extraiu isso em funções nomeadas e preservou toda a semântica: `canPersistQuoteVersion` (linha 326) com a mesma mensagem "Não foi possível confirmar a versão do orçamento. Recarregue a página antes de salvar." (linha 328), `createIdempotencyKeyRef` (linha 401), `params.idempotencyKeyRef.current ??= crypto.randomUUID()` (linha 284), update com `row_version: expectedRowVersion` e `expectedRowVersion` (linhas 279-281) e `setExpectedRowVersion(result.row_version ?? params.expectedRowVersion)` (linha 345). A main ainda acrescentou `canEdit`, `tags` e `profile?.pa_id` às dependências (linha 622).

src/hooks/useAutoSave.ts: as 9 linhas "ausentes" eram a montagem do objeto persistido. A main tem `AUTO_SAVE_VERSION` (linha 5), a interface `StoredAutoSave` (linha 8), `parseStoredAutoSave` (linha 45) com as mesmas guardas de tipo, a mesma gravação `{version, savedAt, data}` (linhas 103-109) e ainda uma retenção que a branch não tinha: `AUTO_SAVE_RETENTION_MS` descartando rascunho velho (linhas 59-60).

src/components/quotes/QuoteAutoSave.tsx: as 12 linhas "ausentes" eram o cálculo inline da chave de rascunho. A main mantém `createQuoteDraftId`, o `sessionStorage.getItem/setItem` do draftId (linhas 40-44), o texto "Salvo neste dispositivo" (linha 85) e o escopo por usuário, agora num hook dedicado `useScopedQuoteDraftId(enabled, scopeId, quoteId)` (linha 215) com as mesmas chaves `quote:${scopeId}:${quoteId}` e `draft:${scopeId}:${draftId}` (linhas 216-220).

src/pages/QuoteBuilderPage.tsx: as 9 linhas "ausentes" eram o restaurador de rascunho inline. A main as tem na função `restoreQuoteDraft` (linhas 46-53, incluindo `setTags` com o mesmo filtro de string) e passa `scopeId={state.draftScopeId}` ao `QuoteAutoSave` (linha 135).

src/services/sicoob/orderService.ts: as 4 linhas "ausentes" são o filtro por lista de status. A main tem `statuses?: string[]` (linha 22) e `if (filters?.statuses?.length) return query.in("status", filters.statuses);` seguido do fallback `filters?.status` (linhas 40-41) — mesma regra, escrita em duas linhas.

src/pages/sicoob/reports/SicoobReportsPage.tsx: as 17 linhas "ausentes" eram a busca em duas etapas (ler `postos_atendimento` por `cooperativa_id`, depois `pa_budgets` com `in(pa_id, ...)`). A main substituiu isso por `fetchBudgetHistoryPage` (linha 61) com join `postos_atendimento!inner(nome, cooperativa_id)` (linha 71) e filtro `query.eq('postos_atendimento.cooperativa_id', cooperativeId)` (linha 82), mais paginação (linhas 92-98) e exibição do nome do PA (linha 108). Mesma regra de negócio, uma consulta em vez de duas, com paginação que a branch não tinha. O `import type { DateRange } from 'react-day-picker'` também está na main (linha 26).

src/pages/admin/RLSAuditPage.tsx: as 3 linhas "ausentes" eram os contadores inline. A main os calcula em `auditSummary` com `conformingTables` e `tablesWithIssues` (linhas 26-27) e os exibe nos mesmos cartões `text-success` e `text-destructive` (linhas 117 e 129).

src/hooks/quote/useQuoteInitialization.ts: a linha "ausente" era o ternário de validação de `row_version`. A main faz o mesmo com um helper: `setters.setExpectedRowVersion(validRowVersion(quote.row_version))` (linha 105).

src/hooks/admin/useAccessSecurity.ts: as 2 linhas "ausentes" diferem só no nome do parâmetro. A main tem `supabase.from("ip_whitelist").update({ is_active: isActive }).eq("id", id)` (linha 114) e o equivalente para `city_whitelist` (linha 143).

src/components/mockup/approval/OffscreenLayoutCapture.tsx: a linha "ausente" era `.update({ layout_url: urlData.publicUrl })`. A main faz `.update({ layout_url: layoutUrl })` (linha 71), mesma coluna, URL em variável.

src/components/quotes/ReorderCatalogValidityBanner.tsx e src/pages/quote-view/QuoteBitrixSync.ts: as linhas "ausentes" são comentários `// rls-allow`. A main mantém a convenção, com texto reescrito — em ReorderCatalogValidityBanner.tsx o comentário está na linha 88, logo acima do `supabase.from('quotes')` da linha 89.

.github/workflows/codeql.yml: as 4 linhas "ausentes" eram a gambiarra para o runner self-hosted que expunha Node 12 (`actions/setup-node@v4` com `continue-on-error`). Na main o job roda em `ubuntu-latest` (linha 29) com `actions/setup-node` fixado por SHA na v7.1.0 (linha 41) e Node 24 (linha 43). A causa do remendo deixou de existir: obsoleto.

.github/workflows/lighthouse.yml: as 15 linhas "ausentes" eram a busca/instalação de Chromium via apt-get no runner self-hosted. A main roda em `ubuntu-latest` (linha 17) e resolve o mesmo problema instalando o Chromium do Playwright e exportando `CHROME_PATH` (linhas 32-35), inclusive com `test -x "$CHROME_PATH"`. Mesma necessidade, solução melhor: obsoleto.

.github/workflows/apply-sicoob-migrations.yml: as 23 linhas "ausentes" são o job que rodava `supabase db push --include-all --yes` num runner self-hosted. Essa abordagem é hoje proibida pela regra do projeto ("Proibido `supabase db push`"). A main implementa o fluxo oficial: `ubuntu-latest`, `environment: construction`, confirmação `APLICAR`, "Preflight read-only da allowlist e do ledger" (linha 38), "Aplicar allowlist com ledger atômico" (linha 43) e "Confirmar contrato e ledger remotos" (linha 48). A versão da branch não pode ser recuperada: ela viola a política vigente.

scripts/check-critical-test-skip-budget.mjs: a única linha "ausente" é `const baseline = 41;`, um orçamento global de skips. A main substituiu por orçamento POR ARQUIVO, `BASELINE_BY_FILE` (linha 33), com `evaluate(byFile, baseline = BASELINE_BY_FILE)` (linha 59) e soma dos permitidos (linha 89). O diff branch→main é 115+/17-: a main é estritamente mais completa e mais restritiva.

deno.json: as 2 linhas "ausentes" são `"nodeModulesDir": "auto"` e `"mcp-lite": "npm:mcp-lite@^0.10.0"`. A main tem `"nodeModulesDir": "none"` e `"mcp-lite": "npm:mcp-lite@0.10.0"` — a dependência está lá, com versão travada em vez de faixa, e o modo de node_modules foi mudado de propósito. Decisão posterior da main, não perda.

.typecheck-baseline.json: as 2 linhas "ausentes" são o carimbo `"generatedAt": "2026-09-28T16:46:42.137Z"` e `"total": 153`. Arquivo gerado por script. A main tem `"generatedAt": "2026-11-12T19:55:05.432Z"`, `"total": 0` e `"files": {}` — a dívida de typecheck foi zerada. Restaurar o baseline da branch seria reintroduzir 153 erros tolerados.

docs/E2E_SMOKE_COVERAGE.md: a linha "ausente" é o carimbo "Gerado automaticamente por scripts/e2e-smoke-coverage-doc.mjs em 2026-09-28". O próprio arquivo diz "Não edite à mão". A main tem o mesmo documento com carimbo de 2026-11-08, gerado pelo mesmo script a partir de e2e/routes/_catalog.ts.

scripts/db/.inventory-cache.json: as 22 linhas "ausentes" são conteúdo de um snapshot gerado/importado por scripts/db/import-api-inventory.mjs. A branch tem a coleta de 28/09 em 546 linhas; a main tem a coleta de `"generated_at":"2026-11-13T17:35:00Z"` compactada numa linha só, já com o projeto `cfmzkthhgliqelozlmwu`, as funções e os buckets atuais. Snapshot de estado, mais novo na main.

supabase/migrations/20260928162048_quote_save_idempotency.sql: 11 linhas da branch não estão na main. Aqui a main NÃO é um superconjunto: é uma variante da mesma migration, sob o mesmo nome de arquivo, e ela é a que vale, porque migration mesclada é imutável e já foi aplicada. A tabela `public.quote_save_idempotency`, a função `public.save_quote_atomic_idempotent`, o `pg_advisory_xact_lock`, o `ENABLE ROW LEVEL SECURITY` e os `REVOKE ALL ... FROM PUBLIC, anon` estão nos dois lados. As diferenças são três: o CHECK do hash é `length(payload_hash) = 32` na main contra 64 na branch, porque a main usa `md5(...)` onde a branch usava `extensions.digest(..., 'sha256')`; a main tem uma policy única `quote_save_idempotency_actor_only FOR ALL` no lugar das duas policies separadas de SELECT e INSERT da branch; e a main concede `SELECT, INSERT, UPDATE, DELETE` ao papel `authenticated` onde a branch concedia só `SELECT, INSERT`. O recurso de idempotência de salvamento de orçamento está na main e funcionando; o que se perde ao apagar a branch é apenas o rascunho mais restritivo dessa mesma migration, que de todo modo não poderia ser aplicado por cima.

GRUPO 3 — OS 14 CAMINHOS QUE NÃO EXISTEM NA MAIN

Nenhum deles é caso (d). Verifiquei um por um:

Nove são a saída local do graphify: graphify-out/.gitignore, graphify-out/GRAPH_REPORT.md, graphify-out/README.md, graphify-out/cost.json, graphify-out/diagnostico.json, graphify-out/graph.html, graphify-out/graph.json, graphify-out/mapear_backend.py e graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md. São caso (c), lixo gerado: o .gitignore da main ignora `graphify-out/` na linha 74 ("Saída gerada pelo graphify (grafo local por máquina)"), e a regra do projeto é que o grafo fica fora do Git e cada clone gera o seu com `npm run graph:setup`. Foram commitados por engano na branch.

supabase/.temp/cli-latest também é caso (c): o .gitignore da main ignora `supabase/.temp/*` na linha 80. É cache do CLI do Supabase.

scripts/revisao/pendencias-2026-09-12.cenarios.tsx é caso (b): o mesmo arquivo está na main como scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx, e o diff de conteúdo entre os dois é VAZIO — byte por byte igual, só renomeado para o sufixo .test.tsx que o Vitest coleta.

tests/hooks/useCollections.test.tsx é caso (b): está na main como tests/hooks/useCollections.react.test.tsx, com 54 linhas nos dois lados e uma única linha de diferença, o rótulo do describe ("useCollections" virou "useCollections com React Query"). O renome foi necessário porque a main também tem tests/hooks/useCollections.test.ts, com 229 linhas e 13 casos de teste sobre variantes, que a branch não tem.

src/types/jspdf-autotable.d.ts é caso (b): a branch declarava globalmente `jsPDF.lastAutoTable.finalY` por augmentação de módulo. A main resolve a mesma necessidade sem poluir o tipo global, com o helper `getAutoTableFinalY(document, fallback)` em src/lib/pdf/auto-table.ts, e mantém a dependência `"jspdf-autotable": "^5.0.9"` no package.json (linha 184), usada em src/lib/bi/dossierPdfGenerator.ts, src/lib/export-collection-pdf.ts e src/components/cart/cart-utils/CartExport.ts.

src/components/intelligence/TopCategoriesCard.tsx é caso (b) com (a): na branch são 158 linhas, importadas por src/pages/TrendsPage.tsx (linha 19) e renderizadas na linha 392. A main não tem esse arquivo, mas tem src/components/intelligence/TopProductFamiliesCard.tsx, 152 linhas, que é o sucessor renomeado: mesmo propósito declarado no cabeçalho ("famílias de produtos em alta extraídas de `product_views`. A família é uma aproximação pelo primeiro termo do nome do produto", contra "categorias em alta extraídas da tabela `product_views` via prefixo de SKU/nome" da branch), mesmos ícones Layers/TrendingUp/Sparkles, mesmos componentes Card/Badge/Skeleton. O TrendsPage da main o importa na linha 37 e o renderiza na linha 632. A versão da main ainda é mais completa: recebe os dados de fora (`data?: ProductFamilyTrend[]`), tem estados `isLoading`, `isError`, `isFetching` e um bloco de erro com botão de nova tentativa (`ProductFamiliesError`), que a branch não tinha.

CONCLUSÃO

Dos 1.860 arquivos não byte-idênticos, 1.805 não foram escritos por esta branch (são o estado do projeto em 28/09/2026, provado por igualdade de blob com 8028c879d), 41 são arquivos autorais cuja contribuição está integralmente na main — em 19 deles literalmente, nos outros 22 reescrita em forma igual ou mais completa, ou substituída por decisão posterior documentada (workflows em runner GitHub, proibição do `supabase db push`, orçamento de skip por arquivo, baseline de typecheck zerado) — e 14 são caminhos ausentes da main que se resolvem em artefato ignorado pelo Git (10), renome com conteúdo idêntico ou quase idêntico (3) e componente sucedido por outro mais completo (1). Zero arquivos caem no caso (d). Não há trabalho desta branch que exista só nela e tenha valor recuperável. A branch pode ser apagada.

**Ressalvas:** 1) supabase/migrations/20260928162048_quote_save_idempotency.sql é o único arquivo em que a main não é superconjunto: a main usa md5 (CHECK length=32) onde a branch usava sha256 (CHECK length=64), tem uma policy `quote_save_idempotency_actor_only FOR ALL` no lugar das duas policies separadas de SELECT/INSERT da branch, e concede SELECT+INSERT+UPDATE+DELETE a `authenticated` onde a branch concedia só SELECT+INSERT. O recurso está na main e a migration é imutável, então nada é recuperável da branch; se o dono quiser o hash mais forte e o GRANT mais estreito, isso é uma migration NOVA, não um motivo para manter a branch. 2) graphify-out/ (9 arquivos) e supabase/.temp/cli-latest estavam commitados na branch e são ignorados pelo .gitignore da main — não devem ser restaurados em hipótese alguma. 3) Não auditei se a re-raiz da main de 11/11/2026 perdeu conteúdo do projeto como um todo; o que afirmo é que, nos 1.805 arquivos divergentes que esta branch não tocou, ela carrega exatamente o mesmo blob de 8028c879d, portanto nada se perde que seja específico desta branch.

Tentativa de refutação: `evidencias.md`, seção `fix/execucao-plano-20260928`.

#### `fix/sicoob-csp-202635` — liberada: sim

Arquivos: 3690 no total · 1816 idênticos à `main` · 1857 divergentes · 17 ausentes da `main` · 2 commits próprios

RESUMO DA DECISÃO

A branch `fix/sicoob-csp-202635` tem como topo o commit `361dc30b3f222c268eaebeebf8c259cbedf5be70`. A árvore desse commit contém 3690 arquivos versionados. Comparando essa árvore com a árvore de `origin/main` (topo `ca76bcdbb`, "fix(db): intervalo de auto-teste le agendamento de 2 e 4 horas (#310)"), por conteúdo de blob e não por histórico, o resultado medido é: 1816 arquivos byte-idênticos (mesmo sha de blob), 1857 arquivos que existem nos dois lados com conteúdo diferente, 17 arquivos que existem só na branch e não existem na main sob o mesmo caminho, e 711 arquivos que existem só na main. Nenhum arquivo cai no caso (d). A branch pode ser apagada.

ATENÇÃO METODOLÓGICA: durante a auditoria o ponteiro `FETCH_HEAD` deste clone foi sobrescrito por um fetch concorrente de outra branch (`fix/sicoob-trust-data-20260924`, topo `38b52cb24`). Por isso todas as medições finais foram refeitas com a branch gravada num ref próprio e estável, `refs/auditoria/csp-202635`, que resolve para `361dc30b3`. Quem repetir a conferência deve usar o sha explícito `361dc30b3f222c268eaebeebf8c259cbedf5be70` e não `FETCH_HEAD`.

1. O QUE ESTA BRANCH REALMENTE PRODUZIU

A branch nasce do commit `d389b4be788c4ab11f5d6b31731c54ba04dbe939` ("fix(security): fecha operações internas e ACLs administrativas (#22)") e acrescenta exatamente dois commits próprios, ambos de Joaquim Ataides em 23/09/2026:

- `13dfccdaadaf3c013d60514fb77f534cf11d7406` — "fix(seguranca): aplica csp na vercel", 5 arquivos, 80 inserções e 1 remoção.
- `361dc30b3f222c268eaebeebf8c259cbedf5be70` — "docs(seguranca): registra csp entregue", 1 arquivo, 3 inserções e 1 remoção.

O diff de árvore entre a base `d389b4be7` e o topo `361dc30b3` confirma que a branch tocou exatamente 6 caminhos, nem um a mais: `.gitignore` (M), `docs/SECURITY.md` (M), `docs/plano-melhorias-50-etapas.md` (M), `public/_headers` (M), `tests/scenarios/csp-providers.mjs` (A) e `vercel.json` (A). Esse número de 6 caminhos é o fato central desta auditoria, porque significa que todas as outras 1868 divergências em relação à main não são autoria desta branch: são conteúdo que a branch apenas herdou da main antiga de setembro de 2026 e que a main atual já evoluiu por conta própria.

O trabalho desta branch foi aberto como PR #27, "fix(segurança): entrega CSP pela Vercel", e consta como mergeada em 2026-09-25T00:15:05Z. A PR mergeada por si só não prova nada depois do re-enraizamento da main em 11/11/2026, por isso cada um dos 6 arquivos foi conferido por conteúdo abaixo.

2. OS 6 ARQUIVOS DE AUTORIA DA BRANCH, UM A UM

2.1. `public/_headers` — BYTE-IDÊNTICO na main. Mesmo sha de blob nos dois lados: `40ecda09b88429520c7f14d4d0213726d9e85f1f`. Nada a recuperar.

2.2. `tests/scenarios/csp-providers.mjs` — BYTE-IDÊNTICO na main. Mesmo sha de blob nos dois lados: `de88611e4785bfb0756818c4680e2e558f621496`. Este é o cenário de teste criado pela branch para impedir divergência de CSP entre provedores; está integralmente na main.

2.3. `docs/SECURITY.md` — BYTE-IDÊNTICO na main. Mesmo sha de blob nos dois lados: `d4867513b059e25c50a2b6a684dcd85d67de280e`. O texto que a branch escreveu sobre a CSP continua lá, incluindo a linha 22 da versão da main, que cita `tests/scenarios/csp-providers.mjs` como guarda contra desvio, e a linha 24, sobre limitar exceções à diretiva relevante.

2.4. `vercel.json` — caso (a): a main tem versão mais completa. Blob da branch `b20343b5a5fb8766c914db24cde86d7dd1b53429`, blob da main `c8ce4a835e760c1b6c536ea889b9f0d0f3f3d203`. O numstat entre os dois blobs é 6 linhas adicionadas e 0 removidas. Ou seja, a main contém tudo o que a branch escreveu e mais seis linhas. As seis linhas a mais são o bloco `rewrites` que redireciona `/(.*)` para `/index.html`, necessário para o roteamento SPA e que a branch não tinha. Todos os oito cabeçalhos escritos pela branch estão na main com o mesmo valor: `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Cross-Origin-Embedder-Policy` e, o que importa aqui, `Content-Security-Policy`. A string completa da CSP é idêntica caractere a caractere nos dois arquivos, desde `default-src 'self'` até `upgrade-insecure-requests`, passando pelas listas de `script-src`, `style-src`, `img-src`, `font-src`, `connect-src`, `media-src`, `frame-src`, `worker-src`, `object-src`, `base-uri`, `form-action` e `frame-ancestors`. A prova disso é aritmética e não visual: zero linhas removidas no numstat significa que nenhuma linha da versão da branch foi perdida.

2.5. `.gitignore` — caso (a): a main tem versão mais completa. Blob da branch `6368c27456628896b63e3091a8a9eef414c8214b`, blob da main `803ea783f448e1405cd3ed7d41fe0468fa00c5d1`, numstat de 33 linhas adicionadas e 0 removidas. A única linha que este commit da branch acrescentou foi `.vercel`, e ela está na main em `.gitignore:21`. Além disso, a comparação linha a linha dos dois arquivos, com `comm -23` sobre as linhas ordenadas e sem espaço à direita, devolveu conjunto vazio: não existe uma única linha presente no `.gitignore` da branch que esteja ausente do `.gitignore` da main.

2.6. `docs/plano-melhorias-50-etapas.md` — caso (a): a main tem versão mais completa. Blob da branch `da3da81f11f6e6fc74dd64560b5d0ba505ab87dc`, blob da main `925905a23a5542559e1e765a7f2b44e17def1347`, numstat de 5 linhas adicionadas e 0 removidas. O que a branch escreveu neste arquivo foi a marcação da etapa 28 como corrigida. Esse texto está na main, nas linhas 65 a 67, com a redação exata: "28. Adicionar Content-Security-Policy — corrigido: `public/_headers` cobre hospedagem compatível e `vercel.json` entrega a mesma política na Vercel; o cenário `csp-providers.mjs` bloqueia divergência entre provedores." As 5 linhas que a main tem a mais são dois adendos posteriores, de 24/09/2026 e de 27/09/2026, apontando para `docs/execucao/revisao-do-plano-2026-09-24.md` e `docs/execucao/revisao-do-plano-2026-09-27.md`.

Conclusão da seção 2: dos 6 arquivos de autoria da branch, 3 estão byte-idênticos na main e 3 estão na main em versão estritamente maior, sem perda de nenhuma linha. Não existe um único byte escrito por esta branch que não esteja hoje na `origin/main`.

3. OS 17 ARQUIVOS QUE EXISTEM SÓ NA BRANCH, UM A UM

Nenhum destes 17 arquivos foi criado ou alterado pelos dois commits da branch; todos vieram da main antiga. Ainda assim, cada um foi classificado individualmente, porque apagar a branch apaga também esta cópia deles.

3.1 a 3.9. Os nove arquivos sob `graphify-out/`: `graphify-out/.gitignore` (49 bytes), `graphify-out/GRAPH_REPORT.md` (16168 bytes), `graphify-out/README.md` (1899 bytes), `graphify-out/cost.json` (99 bytes), `graphify-out/diagnostico.json` (4788 bytes), `graphify-out/graph.html` (829608 bytes), `graphify-out/graph.json` (1026881 bytes), `graphify-out/mapear_backend.py` (2226 bytes) e `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md` (889 bytes). Caso (c), lixo e artefato gerado. O `AGENTS.md` do projeto diz, na seção "Grafo de código (graphify)", que o grafo fica em `graphify-out/`, fora do Git, e que cada clone gera o seu. A main formalizou isso: o `.gitignore` da main ignora `graphify-out/` nas linhas 73 e 74, com o comentário "Saída gerada pelo graphify (grafo local por máquina)". São saídas de ferramenta, regeneráveis por `npm run graph:setup` e `npm run graph:update`. O único arquivo deste conjunto que não é saída pura é `graphify-out/mapear_backend.py`, um script avulso de 2226 bytes que roda a biblioteca graphify sobre `supabase/functions` e grava o resultado em `graphify-out`; ele também é descartável, porque a main já carrega a cadeia de ferramentas mantida e documentada para a mesma finalidade, em `scripts/graphify/README.md`, `scripts/graphify/setup.sh`, `scripts/graphify-local.mjs`, `scripts/graphify-local.unit.mjs`, `.graphifyignore`, `graphify.local.json` e a skill `.devin/skills/graphify/SKILL.md`. Nenhum arquivo da main faz referência a `mapear_backend`.

3.10. `.env.production` — caso (c), arquivo efêmero e deliberadamente banido do Git. Ele contém apenas quatro variáveis, todas com prefixo `VITE_`, portanto públicas por definição conforme o `AGENTS.md`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PROJECT_ID`. A main não só deixou de versioná-lo como o ignora explicitamente, em `.gitignore:18` (`.env.production`), e colocou no lugar o modelo `.env.production.example`, cujo cabeçalho diz "Referência local. Preencha os valores reais somente no provedor de hospedagem ou em um arquivo .env.production ignorado pelo Git". O modelo cobre `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` e `VITE_SUPABASE_PROJECT_ID`. A quarta chave, `VITE_SUPABASE_ANON_KEY`, foi deixada de fora do modelo de propósito, por ser duplicata da publishable key no modelo novo de chaves do Supabase. Não há perda de trabalho: há remoção intencional de um arquivo de ambiente do repositório.

3.11. `supabase/.temp/cli-latest` — caso (c), lixo de ferramenta. O conteúdo inteiro do arquivo é a string `v2.115.0`, um cache de versão da CLI do Supabase. A main ignora todo esse diretório em `.gitignore:80` (`supabase/.temp/*`).

3.12. `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` — caso (b), existe na main sob outro nome. A main tem `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx`, e o diff de conteúdo entre o arquivo da branch e o da main é vazio: zero linhas adicionadas e zero removidas, conteúdo idêntico, apenas com o sufixo `.test` acrescentado ao nome para que o Vitest o colete. Os arquivos irmãos `scripts/revisao/simular-pendencias-2026-09-12.py` e `scripts/revisao/vitest-pendencias-2026-09-12.config.ts` continuam na main, assim como a documentação em `docs/execucao/revisao-implementacao-2026-09-12.md` e o registro em `scripts/automation.config.json`.

3.13. `tests/hooks/useCollections.test.tsx` — caso (b) somado ao caso (a). A main tem o mesmo teste em `tests/hooks/useCollections.react.test.tsx`, com diferença de exatamente 1 linha adicionada e 1 removida: o rótulo do bloco `describe` passou de `'useCollections'` para `'useCollections com React Query'`, para não colidir com o segundo arquivo de teste. Além desse, a main tem ainda `tests/hooks/useCollections.test.ts`, um arquivo maior, com 200 linhas a mais e 25 a menos em relação ao da branch. O hook `src/hooks/useCollections.ts` e seus consumidores continuam na main. Cobertura preservada e ampliada.

3.14. `src/types/jspdf-autotable.d.ts` — caso (a) somado ao caso (b). São 13 linhas que faziam um `declare module "jspdf"` global para acrescentar `lastAutoTable.finalY` à interface `jsPDF`. A main abandonou a augmentação global de tipo e pôs no lugar um acessor tipado e seguro em `src/lib/pdf/auto-table.ts`, a função `getAutoTableFinalY(document: unknown, fallback: number): number`, que lê `lastAutoTable?.finalY` e devolve o fallback quando o valor não é numérico, com o comentário "Lê a posição final exposta em runtime pelo plugin jspdf-autotable". É a mesma necessidade resolvida de forma melhor, porque elimina a mentira de tipo e trata o caso de o plugin não ter rodado. O plugin `jspdf-autotable` continua em uso intenso na main, em pelo menos catorze arquivos, entre eles `src/lib/bi/dossierPdfGenerator.ts`, `src/lib/export-collection-pdf.ts`, `src/utils/quotePdfUtils.ts`, `src/utils/kitPdfGenerator.ts`, `src/utils/sicoob/orderDossierExport.ts`, `src/pages/sicoob/orders/OrdersPage.tsx` e `src/pages/sicoob/reports/SicoobReportsPage.tsx`.

3.15. `src/components/intelligence/TopCategoriesCard.tsx` — caso (b) somado ao caso (a). São 158 linhas. A main tem o sucessor direto em `src/components/intelligence/TopProductFamiliesCard.tsx`, renomeado porque o conceito "categoria" era na verdade uma aproximação pelo primeiro termo do nome do produto. A comparação de conteúdo entre os dois acusa 126 linhas adicionadas e 132 removidas, mas trata-se do mesmo componente: mesma fonte de dados, a tabela `product_views`; mesma heurística de família pelo primeiro termo do nome; mesmos ícones `Layers`, `TrendingUp` e `Sparkles`; mesmos elementos de UI `Card`, `Badge` e `Skeleton`. A versão da main é mais completa em três pontos verificáveis: ela aceita os dados por propriedade, tipados como `ProductFamilyTrend` vindos de `@/pages/trends/trends-projections`, em vez de fazer a própria consulta dentro do componente; ela tem estado de erro de verdade, o bloco `ProductFamiliesError` com `role="alert"` e botão "Tentar novamente", algo que a versão da branch não tinha; e ela expõe `isLoading`, `isError`, `isFetching` e `onRetry` como propriedades em `TopProductFamiliesCard.tsx:12` a `19`, com a assinatura em `TopProductFamiliesCard.tsx:125`. Além disso, a versão da branch dependia de dados simulados, importando `MOCK_TOP_CATEGORIES` de `@/pages/trends/trends-mock`, prática que o `AGENTS.md` proíbe. O ponto de uso também foi preservado: na branch o componente era usado em `src/pages/TrendsPage.tsx:392`; na main o sucessor é importado em `src/pages/TrendsPage.tsx:37` e usado em `src/pages/TrendsPage.tsx:632`.

3.16. `src/components/orders/InvoicePaymentPanel.tsx` — caso (c) somado ao caso (a). São 48 linhas de um cartão somente de leitura com o título "NF + Pagamento", que lia `(order as any).invoice_number` e `(order as any).payment_status` com casts para `any` e exibia um texto fixo, "Liberação financeira concluída para produção.", sem qualquer verificação de que a liberação tivesse de fato ocorrido. Esse componente é código morto já dentro da própria branch: a busca por `InvoicePaymentPanel` em `src`, `tests`, `e2e`, `scripts` e `supabase` na árvore da branch devolve apenas o próprio arquivo, nenhum importador. A main não perdeu a funcionalidade, ela a implementou de verdade: `src/components/orders/OrderInvoicesManager.tsx` é um gerenciador de notas fiscais completo, ligado ao hook `src/hooks/orders/extensions/useOrderInvoices.ts` e ao `src/services/OrderService.ts`, e está efetivamente montado na tela em `src/pages/OrderDetailPage.tsx:118`, com o import em `src/pages/OrderDetailPage.tsx:27`. Há ainda `src/components/sicoob/orders/OrderInvoicesTab.tsx` para a trilha Sicoob e o painel financeiro `src/components/orders/FinancialPanel.tsx`, montado em `src/components/orders/OrderDetailSheet.tsx:45`, que exibe subtotal, desconto, frete e total com `formatCurrency` e diz explicitamente "Margem: não calculada neste pedido" em vez de inventar número.

3.17. `src/hooks/useSupplierTrust.ts` — caso (c) somado ao caso (a). São 117 linhas. O próprio cabeçalho do arquivo declara o problema: "Falls back to deterministic mock when no real data is available", e o corpo importa e devolve `getMockSupplierTrust` quando não acha dado real. Isso é exatamente o que o `AGENTS.md` proíbe, dado simulado apresentado como informação de negócio. A remoção foi uma decisão deliberada do projeto, não um acidente do re-enraizamento: existe um commit posterior, `5455eb84d`, intitulado "fix(catálogo): remover confiança simulada de fornecedor", seguido de `38b52cb24`, "fix(catálogo): remover inteligência ilustrativa (#36)". A main reflete essa decisão: não existe mais `useSupplierTrust`, nem `getMockSupplierTrust`, nem a chave de query `supplier-trust` em lugar algum de `src` ou `tests`. O que sobreviveu é a parte legítima: a interface `SupplierTrustData` continua em `src/components/common/SocialProof.tsx:198`, agora com o comentário "Dados de confiança obtidos de uma fonte auditável", e a função `appendSupplierTrustBadges` em `src/components/common/SocialProof.tsx:241` continua desenhando os selos de fornecedor verificado, prazo de entrega e avaliação. O consumidor na tela de produto passa a entregar `EMPTY_SUPPLIER_TRUST`, em `src/pages/product-detail/ProductDetailHeroSections.tsx:212`, ou seja, nenhum selo é exibido enquanto não houver dado real. Apagar esta cópia do hook não perde trabalho: perde um mock que o projeto decidiu remover.

4. OS 1857 ARQUIVOS QUE DIVERGEM E EXISTEM NOS DOIS LADOS

Destes 1857, apenas 3 são de autoria da branch, e já foram tratados individualmente nos itens 2.4, 2.5 e 2.6: `vercel.json`, `.gitignore` e `docs/plano-melhorias-50-etapas.md`, todos com a main contendo versão estritamente maior, com zero linhas removidas.

Os outros 1854 caem todos no caso (a) por uma razão medida e não por presunção: eles são byte-idênticos entre a base da branch, `d389b4be7`, e o topo da branch, `361dc30b3`. O diff de árvore entre esses dois commits lista exatamente seis caminhos, e nenhum desses 1854 está entre eles. Portanto a branch não escreveu um único byte em nenhum deles. Qualquer diferença que esses arquivos apresentem hoje em relação à `origin/main` é evolução da main posterior a 23/09/2026, isto é, conteúdo mais novo, produzido por outras entregas, visível no histórico recente da main com PRs como a #310, a #314, a #312, a #309 e a #306. Apagar esta branch não pode perder trabalho nesses 1854 arquivos porque não há trabalho desta branch neles para perder. A lista completa dos 1857 caminhos divergentes, com o status de cada um, ficou gravada em /tmp/claude-0/-home-user-Brindes-Sicoob-V2/3ba6c9af-072f-5116-800f-50c3fa71a713/scratchpad/td2.txt, e os números de linha de cada diferença em /tmp/claude-0/-home-user-Brindes-Sicoob-V2/3ba6c9af-072f-5116-800f-50c3fa71a713/scratchpad/numstat.txt, para quem quiser abrir caminho por caminho.

Em sentido contrário, a main tem 711 arquivos que a branch nem conhece, o que confirma que a main é o tronco adiante e a branch é o passado.

5. VEREDITO

Não há nenhum arquivo no caso (d). Os 6 arquivos escritos por esta branch estão na `origin/main`, três deles com o mesmo sha de blob e três em versão maior sem nenhuma linha perdida. Os 17 arquivos que só existem na branch são, em todos os casos, saída gerada e ignorada pelo Git, arquivo de ambiente deliberadamente banido, cache de ferramenta, arquivo renomeado na main com conteúdo igual, ou código que a main substituiu por implementação mais completa e ligada à tela, inclusive em dois casos em que a remoção foi uma decisão explícita do projeto contra dado simulado. Os 1854 arquivos divergentes restantes não contêm uma linha sequer de autoria desta branch. A branch `fix/sicoob-csp-202635` está liberada para exclusão.

**Ressalvas:** 1. O ponteiro `FETCH_HEAD` deste clone foi sobrescrito no meio da auditoria por um fetch concorrente da branch `fix/sicoob-trust-data-20260924` (topo `38b52cb24`). Todas as medições finais foram refeitas com o sha explícito `361dc30b3f222c268eaebeebf8c259cbedf5be70`. Quem repetir a conferência NÃO deve usar `FETCH_HEAD`; use o sha ou um ref próprio.

2. Esta auditoria responde apenas por `fix/sicoob-csp-202635`. Os 17 arquivos que só existem nesta branch vieram da main antiga, não desta branch; alguns deles (por exemplo `src/hooks/useSupplierTrust.ts`) também existem em outras branches não auditadas, e a conclusão aqui vale para esta cópia, não para as outras branches.

3. Não auditei os 711 arquivos que existem só na main nem o conteúdo interno dos 1854 arquivos divergentes de terceiros, porque está provado que a branch não escreveu nenhum byte neles (diff de árvore `d389b4be7` contra `361dc30b3` lista exatamente 6 caminhos). Se o dono quiser saber se a re-raiz da main de 11/11/2026 perdeu algo da main ANTIGA, essa é outra pergunta e exige auditoria do tronco, não desta branch.

4. Nenhuma alteração foi feita no repositório. Foi criado um ref local de leitura `refs/auditoria/csp-202635` apontando para `361dc30b3`, e arquivos temporários na pasta de rascunho da sessão. Nada foi commitado, enviado ou apagado.

Tentativa de refutação: `evidencias.md`, seção `fix/sicoob-csp-202635`.

#### `fix/sicoob-trust-data-20260924` — liberada: NÃO

Arquivos: 3690 no total · 1815 idênticos à `main` · 1858 divergentes · 17 ausentes da `main` · 2 commits próprios

RESUMO DA DECISÃO

A branch `fix/sicoob-trust-data-20260924` pode ser apagada. Todo o trabalho que ela produziu já está na `origin/main`, em versão igual ou mais completa, e nenhum arquivo dela se enquadra no caso (d) "não existe na main de forma alguma".

IDENTIFICAÇÃO E NÚMEROS MEDIDOS

A ponta da branch é o commit 38b52cb2428090a535f5ad75720439cf2d49b2cd, de 24/09/2026, com assunto "fix(catálogo): remover inteligência ilustrativa (#36)". A `origin/main` auditada está em ca76bcdbb29867c7649976e2ebc71b5fa18bac38, de 11/11/2026. Como a `main` foi re-enraizada (ela tem apenas 59 commits, o mais antigo de 11/11/2026, enquanto a branch carrega 19390 commits do histórico antigo do projeto), não existe base comum e nenhuma conclusão aqui vem de `git log` ou de `git diff` com três pontos. Tudo abaixo foi medido comparando o sha do blob de cada caminho.

A árvore da branch tem 3690 arquivos; a da `main`, 4384. Desses 3690: 1815 são byte-idênticos à `main` (mesmo caminho e mesmo sha de blob); 1858 existem na `main` no mesmo caminho mas com conteúdo diferente; 17 não existem na `main` naquele caminho.

O QUE ESTA BRANCH REALMENTE AUTOROU

É decisivo separar o que a branch criou do que ela apenas herdou. A branch tem exatamente 2 commits próprios acima do estado do projeto em 24/09: 5455eb84d86184cb7c7c2c318f2aad790409973d ("fix(catálogo): remover confiança simulada de fornecedor", de Joaquim Ataides) e a própria ponta 38b52cb (merge/squash da PR #36). O commit imediatamente anterior a esses dois é 6193793a7fad6ec7e1dacd0e68075e3685016e28 ("Audita paridade entre repositório, GitHub e Supabase Sicoob (#30)"), que já era conteúdo da linha principal do projeto. O comando `git diff --name-status 6193793 38b52cb` devolve exatamente 8 caminhos, e nenhum outro: modificados `src/components/common/IntelligenceBadges.tsx`, `src/components/common/SocialProof.tsx`, `src/hooks/useProductIntelligenceBadges.ts`, `src/pages/ProductDetail.tsx` e `src/pages/product-detail/ProductDetailHero.tsx`; apagado `src/hooks/useSupplierTrust.ts`; criados `tests/components/SocialProof.test.tsx` e `tests/hooks/useProductIntelligenceBadges.test.ts`. Ou seja, os outros 3682 arquivos da branch são cópia exata do estado de 24/09 da linha principal, não trabalho original desta branch; apagar a branch não pode perder autoria que ela não tem.

VERIFICAÇÃO DOS 8 ARQUIVOS DE TRABALHO PRÓPRIO

1. `src/hooks/useSupplierTrust.ts` — a branch apagou este hook. Na `main` ele continua inexistente (`git cat-file -e origin/main:src/hooks/useSupplierTrust.ts` falha) e `git grep useSupplierTrust origin/main -- src tests` não devolve nenhuma ocorrência de código; só sobra uma citação histórica em `docs/AUDIT_FRONTEND_DATABASE.md:418`. A deleção foi preservada. Caso (a).

2. `src/components/common/SocialProof.tsx` — a branch removeu a função `getMockSupplierTrust` (hash determinístico do id do produto que inventava `isVerified`, `deliveryDays` e `avgRating`) e trocou o comentário "Supplier trust data — will come from real DB in the future" por "Dados de confiança obtidos de uma fonte auditável". A `main` mantém exatamente esse texto em `src/components/common/SocialProof.tsx:197`, não tem `getMockSupplierTrust` em lugar nenhum, e ainda acrescenta uma refatoração que a branch não tem: constantes de tom (`PRIMARY_TONE`, `WARNING_TONE`, `PRIMARY_TEXT`, `SUCCESS_TEXT`) e a quebra de `DynamicTrustBadges` em `appendProductFlagBadges`, `appendShippingBadge` e `appendSupplierTrustBadges`. O diff branch→main é de 20 linhas adicionadas e 15 removidas, todas de refatoração, nenhuma reintroduzindo dado simulado. Caso (a), main mais nova.

3. `src/pages/ProductDetail.tsx` — a branch removeu o import e a chamada de `useSupplierTrust` e parou de passar `supplierTrust` para o hero. Na `main` não existe nenhuma ocorrência de `useSupplierTrust` nem de `supplierTrust` em `src`. Caso (a).

4. `src/pages/product-detail/ProductDetailHero.tsx` — a branch removeu a prop `supplierTrust: any` e introduziu a constante `EMPTY_SUPPLIER_TRUST = { isVerified: false, deliveryDays: null, avgRating: null }` passada a `DynamicTrustBadges`. Na `main` esse mesmo trecho vive em `src/pages/product-detail/ProductDetailHeroSections.tsx:24` (a constante) e `:212` (o uso em `<DynamicTrustBadges trust={EMPTY_SUPPLIER_TRUST} ...>`), porque o hero foi dividido em seções — por isso o arquivo encolheu 326 linhas da branch para a main. Caso (a) combinado com (b): conteúdo preservado, apenas movido de arquivo.

5. `tests/components/SocialProof.test.tsx` — teste criado por esta branch. Está na `main` byte a byte: mesmo sha de blob ea74d5fe5b nos dois lados. Caso (a), idêntico.

6. `src/hooks/useProductIntelligenceBadges.ts` — a branch removeu o fallback para dados falsos (`generateMockIntelligence`, `generateMockVelocities`, `isRealIntelligence` de `@/lib/stock-chart-utils`) e o campo `isDemo`. Na `main` nenhuma dessas três funções aparece em `src`, e o cabeçalho do arquivo diz "Market badges are omitted until the source views return real data": quando a visão de inteligência não traz dado, a `main` devolve só os selos de catálogo, `turnoverScore: null` e `demandLevel: null`, exatamente o comportamento que a branch queria. A `main` manteve o campo `isDemo` na interface, mas ele é retornado com o literal `false` nos dois caminhos de saída de `buildBadgeResult`. O efeito de negócio pretendido pela branch — nenhum número inventado na ficha do produto — está entregue, por uma implementação diferente e com mais funções nomeadas. Caso (a).

7. `src/components/common/IntelligenceBadges.tsx` — a branch removeu a prop `isDemo` e o selo "dados ilustrativos". A `main` ainda carrega a prop (`src/components/common/IntelligenceBadges.tsx:60` e `:64`) e o bloco do selo (`:124`–`:126`), alimentado por `src/pages/ProductDetail.tsx:217` e `:311`. Como o hook descrito no item 6 devolve `isDemo: false` sempre, esse selo nunca é renderizado na tela do produto: é código morto, não um dado ilustrativo exibido ao usuário. É a única diferença de forma entre branch e main nesta frente, e está registrada nas ressalvas. Não é perda de funcionalidade, é limpeza pendente na `main`. Caso (a) com ressalva.

8. `tests/hooks/useProductIntelligenceBadges.test.ts` — único arquivo criado pela branch que não existe na `main` sob esse caminho. A cobertura equivalente está em `tests/hooks/intelligence-badges.test.ts`, que testa `buildBadgeResult` (o nome que a `main` deu à função que a branch chamava de `deriveProductIntelligenceBadges`) com 9 casos contra os 2 da branch. Os dois casos da branch estão cobertos: "não inventa classificação quando a visão de inteligência está vazia" corresponde a "does not invent market badges or metrics when intelligence is absent" e a "preserves catalog-controlled badges while omitting unavailable market intelligence"; "exibe classificação apenas quando ela vem da visão de inteligência" corresponde a "derives market badges and metrics from real intelligence and velocity" e às asserções de `turnoverScore` e `demandLevel`. A `main` ainda testa classes ABC B e C, o limiar exato de tendência 1.3, estoque zero e ausência de velocidade. Caso (b), em versão mais completa.

OS OUTROS 16 ARQUIVOS QUE SÓ EXISTEM NA BRANCH

Todos os 16 já existiam no commit base 6193793, isto é, são herança do estado antigo do repositório e não trabalho desta branch (verificado um a um com `git cat-file -e 6193793:<caminho>`).

`.env.production` — arquivo de ambiente que a `main` deliberadamente deixou de versionar: o `.gitignore` da `main` o ignora na linha 18, e no lugar dele há `.env.production.example` com as mesmas chaves documentadas. As quatro chaves do arquivo da branch são `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_PROJECT_ID`, todas com prefixo `VITE_`, portanto públicas por definição; não há `service_role` nem token privado. Caso (c): efêmero e indesejado no Git; apagar a branch remove um arquivo de ambiente versionado, o que é um ganho.

`graphify-out/.gitignore`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/README.md`, `graphify-out/cost.json`, `graphify-out/diagnostico.json`, `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/mapear_backend.py` e `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md` — nove artefatos gerados pelo graphify. O `.gitignore` da `main` ignora `graphify-out/` na linha 74, com o comentário "Saída gerada pelo graphify (grafo local por máquina)", e o próprio AGENTS.md diz que o grafo fica fora do Git porque cada clone gera o seu. Caso (c) para todos os nove.

`supabase/.temp/cli-latest` — arquivo de 8 bytes escrito pela CLI do Supabase; o `.gitignore` da `main` ignora `supabase/.temp/*` na linha 80. Caso (c).

`scripts/revisao/pendencias-2026-09-12.cenarios.tsx` — existe na `main` como `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx`, com o mesmo sha de blob 2c407af8250660a4c1e57e81f7a0b7263ae6c22b, ou seja, byte a byte igual, apenas renomeado para ser coletado pelo Vitest. Caso (b).

`tests/hooks/useCollections.test.tsx` — existe na `main` como `tests/hooks/useCollections.react.test.tsx`, com uma única linha diferente: o rótulo do `describe` passou de `'useCollections'` para `'useCollections com React Query'`, para não colidir com a outra suíte `tests/hooks/useCollections.test.ts`, que a `main` também tem e que é 200 linhas maior. Caso (b), com cobertura ampliada.

`src/types/jspdf-autotable.d.ts` — a declaração de módulo que adicionava `lastAutoTable.finalY` ao tipo do jsPDF. A `main` resolveu o mesmo problema sem aumentar o tipo de biblioteca de terceiros: `src/lib/pdf/auto-table.ts` expõe `getAutoTableFinalY(document, fallback)`, que lê a posição em runtime e cai no valor padrão quando ela não é um número. A função é usada em `src/lib/bi/dossierPdfGenerator.ts` (linhas 15, 126, 189, 299, 419, 433, 473) e em `src/pages/quotes-dashboard/useQuotesDashboard.ts` (linhas 13 e 225), exatamente nos pontos onde a branch usava `doc.lastAutoTable.finalY` cru. Caso (b), em solução mais segura.

`src/components/intelligence/TopCategoriesCard.tsx` — o card "Categorias em Alta" da página de tendências. A `main` tem o mesmo recurso em `src/components/intelligence/TopProductFamiliesCard.tsx`, renderizado em `src/pages/TrendsPage.tsx:632`, com o nome corrigido para "famílias de produtos" porque a heurística sempre foi o primeiro termo do nome do produto, não a categoria cadastrada. A lógica foi movida para `src/pages/trends/trends-projections.ts`, que importa o mesmo `calculateTrendingScore` de `@/lib/trending-score` (linha 2), usa `extractProductFamily` no lugar de `extractCategory` (linha 344), aplica o mesmo corte `views >= 2` (linha 371) e expõe o tipo `ProductFamilyTrend` (linha 55). A versão da `main` ainda acrescenta o que a da branch não tinha: estado de erro com botão "Tentar novamente", distinção entre falha com e sem dados em cache, e testes em `tests/pages/trends-queries.test.ts`. Caso (b) combinado com (a).

`src/components/orders/InvoicePaymentPanel.tsx` — painel "NF + Pagamento" que nunca foi ligado a nada: `git grep InvoicePaymentPanel` na ponta da branch, em `src`, `tests` e `e2e`, não encontra nenhum importador além do próprio arquivo. Além de código morto, ele era hardcode: fazia dois casts para `any` para ler `invoice_number` e `payment_status`, e exibia sempre, fixa, a frase "Liberação financeira concluída para produção", independentemente do estado real do pedido. A `main` trata nota fiscal de verdade, com dados reais, em `src/components/orders/OrderInvoicesManager.tsx`, `src/components/sicoob/orders/OrderInvoicesTab.tsx`, `src/hooks/orders/extensions/useOrderInvoices.ts`, `src/services/OrderService.ts` e `src/types/orders.ts`. Caso (a) e (c) ao mesmo tempo: o que existia era lixo não ligado, e o recurso real está na `main` em versão muito superior.

OS 1858 ARQUIVOS DIVERGENTES

Desses 1858, exatamente 5 foram tocados pelos commits próprios da branch (`IntelligenceBadges.tsx`, `SocialProof.tsx`, `useProductIntelligenceBadges.ts`, `ProductDetail.tsx` e `ProductDetailHero.tsx`) e já foram justificados um a um acima. Os outros 1853 têm na branch exatamente o mesmo conteúdo que tinham no commit base 6193793 de 24/09, provado pelo `git diff --name-status` entre a base e a ponta, que lista só 8 caminhos. São, portanto, a fotografia do projeto em 24/09, e não produção desta branch; o que a `main` tem neles é o resultado de sete semanas de trabalho mesclado depois disso. Todos os 1853 continuam existindo na `main` no mesmo caminho, nenhum caminho sumiu, e a `main` tem 694 arquivos a mais no total.

A direção da diferença também foi medida. Nos 1858 divergentes, a `main` é maior em 1228 arquivos, menor em 626 e igual em 4, somando 19282357 bytes na `main` contra 19087707 na branch. Os casos em que a branch é maior foram inspecionados e todos confirmam que a `main` é mais nova, não mais pobre: `.eslint-baseline.json` tem 110944 bytes a mais na branch porque ali a dívida registrada é de 2774 erros, com carimbo de 03/05/2026, enquanto na `main` o arquivo diz `"totalErrors": 0` com carimbo de 08/11/2026, e `.typecheck-baseline.json` diz `"total": 0` em 12/11/2026; os nove arquivos seguintes incluem capturas de tela de evidência em `docs/execucao/evidencias/visual/`, que são artefatos regerados; e os componentes grandes encolheram porque foram divididos em módulos, como `src/components/search/GlobalSearchPalette.tsx`, que na `main` convive com `GlobalSearchPaletteView.tsx`, `SearchResultGroups.tsx`, `GlobalSearchIdleState.tsx`, `GlobalSearchHelpers.tsx`, `useGlobalSearch.ts` e a pasta `voice/`, nenhum deles existente na branch.

CONCLUSÃO

Nenhum arquivo da branch cai no caso (d). Os 1815 idênticos não precisam de ação. Dos 17 exclusivos, 11 são lixo ou efêmero que a própria `main` passou a ignorar por `.gitignore` (um `.env.production` só com chaves `VITE_`, nove saídas do graphify e um temporário da CLI do Supabase), 5 existem na `main` sob outro caminho ou nome, com conteúdo igual ou mais completo, e 1 era código morto nunca importado cujo recurso real está na `main` em módulo próprio. Dos 1858 divergentes, 5 são o trabalho da branch, todos verificados como presentes na `main` em versão igual ou mais nova, e 1853 são o estado de 24/09 que a branch apenas carregava. Pode apagar.

**Ressalvas:** 1) `src/components/common/IntelligenceBadges.tsx` na main ainda tem a prop `isDemo` (linhas 60 e 64) e o selo "dados ilustrativos" (linhas 124-126), que a branch havia removido. Não é perda: `buildBadgeResult` em `src/hooks/useProductIntelligenceBadges.ts` devolve `isDemo: false` nos dois caminhos de retorno, então o selo nunca renderiza. Sobrou código morto na main — vale limpar depois, não impede apagar a branch.
2) A auditoria comprova que esta branch não é a origem dos 1853 arquivos divergentes que ela apenas herdou do commit base 6193793 (24/09). Se o dono quiser saber se a re-enraizamento da main de 11/11 perdeu algo do histórico antigo do projeto, isso é outra auditoria, independente desta branch — apagá-la não muda esse quadro, porque ela não é autora desse conteúdo.
3) A branch versiona `.env.production` (só chaves `VITE_*`, públicas por definição; nenhum `service_role` ou token privado). A main ignora esse arquivo por `.gitignore:18`. Apagar a branch elimina um arquivo de ambiente versionado no repositório público.

Tentativa de refutação: `evidencias.md`, seção `fix/sicoob-trust-data-20260924`.

#### `docs/plano150-20260927` — liberada: NÃO

Arquivos: 3806 no total · 1933 idênticos à `main` · 1858 divergentes · 15 ausentes da `main` · 1 commits próprios

RESUMO DA DECISÃO

A branch `docs/plano150-20260927` (ponta `f47e5d8e33389d3f65478ec9c3e6419edc1a753c`) pode ser apagada. Todo o conteúdo que ela criou já está na `origin/main` (`ca76bcdbb29867c7649976e2ebc71b5fa18bac38`), e nenhum arquivo dela se enquadra no caso (d) "não existe na main de forma alguma". Abaixo está a conta completa, medida arquivo por arquivo por sha de blob, e a classificação individual de cada arquivo que não é byte-idêntico e que importa.

1. CONTAGEM MEDIDA

A branch tem 3806 arquivos versionados; a main tem 4384. Comparando caminho a caminho pelo sha do blob:

- 1933 arquivos são byte-idênticos na main (mesmo sha de blob, mesmo caminho);
- 1858 arquivos existem na main no mesmo caminho com conteúdo diferente;
- 15 arquivos existem na branch e não existem na main naquele caminho.

1933 + 1858 + 15 = 3806, fecha com o total.

2. O QUE ESTA BRANCH REALMENTE CRIOU

A branch tem exatamente 1 commit próprio: `f47e5d8e3 docs: cria plano de correções e melhorias em 150 etapas`, de 27/09/2026, autoria Joaquim Ataides. O pai desse commit é `3094cbab22adfa012edcca5278680fa739df46ca` ("Torna atualização em lote de orçamentos transacional (#41)"), que é a ponta da main antiga, anterior ao re-enraizamento de 11/11/2026 — confirmei que `3094cbab2` não é mais alcançável a partir de `origin/main` e que `git merge-base origin/main FETCH_HEAD` retorna vazio, exatamente como o enunciado previa.

O diff de árvore entre `3094cbab2` e `f47e5d8e3` tem exatamente 8 arquivos, 12627 linhas inseridas e nenhuma removida. Esse é todo o trabalho autoral da branch. Os outros 3798 arquivos da branch são cópia literal da main antiga daquele dia; a branch não encostou em nenhum deles. Por isso os 1858 "divergentes" não representam trabalho da branch que possa ser perdido: são apenas o retrato da main de 27/09/2026 contra a main de hoje, que evoluiu quase dois meses depois.

3. OS 8 ARQUIVOS AUTORAIS DA BRANCH, UM A UM

(a-identicos) Cinco deles estão na main com o mesmo sha de blob, byte por byte:
- `docs/plano-implementacao/plano-150-etapas-20260927/etapas.csv` — sha 5457c74585cede1040253bc24a936119d8af7318 nos dois lados;
- `docs/plano-implementacao/plano-150-etapas-20260927/plano.json` — sha 551f8221ce8ebe6463cf41bb5021c8fcf6f9d8d8 nos dois lados;
- `docs/plano-implementacao/plano-150-etapas-20260927/plano.md` — sha 79d9f2d49981a53d7cc49748a307cfdaf79b5c0d nos dois lados;
- `docs/plano-implementacao/plano-150-etapas-20260927/rastreabilidade.csv` — sha 0bf6eb157ec3e2aa35070581a855494ad20338b3 nos dois lados;
- `scripts/revisao/gerar-plano-150-20260927.py` — sha 14655db5790a869f651d5945930ddcde5dd7280d nos dois lados.
Mais um, `docs/plano-implementacao/plano-150-etapas-20260927/validacao.json`, sha 0b5986432d512f40d1fb9d4c4220e4bf758cdfac nos dois lados. São seis arquivos idênticos, ou seja, o plano de 150 etapas inteiro (markdown, JSON, CSVs e o script gerador) está na main sem perder um byte.

Os outros dois são os índices que o commit editou:

- `docs/plano-implementacao/README.md` — caso (a). A branch acrescentou ao fim um bloco de 4 linhas com o título "## Plano de correções em 150 etapas — 27/09/2026" e o parágrafo de links. Extraí as 4 últimas linhas da versão da branch e as linhas 63 a 66 da versão da main e comparei com `diff`: resultado vazio, bloco idêntico. Na main esse bloco está nas linhas 64 e 66 do arquivo. A main ainda tem a mais, na linha 3, o aviso do "Plano de encerramento — 01/10/2026" apontando para `plano-encerramento-100-etapas-20261001/plano.md`, que diz textualmente que "Consolida as 150 etapas funcionais e as 100 de workflows auditadas, preservando a rastreabilidade dos planos anteriores". Ou seja, a main não só preservou o texto da branch como o superou com um plano consolidador posterior.

- `docs/README.md` — caso (a). Aqui a main divergiu bastante (55 linhas acrescidas, 131 removidas em relação à branch) porque o índice foi reescrito entre outubro e novembro de 2026: a versão da main tem avisos de 29/10/2026 sobre concorrência do autosave de orçamentos e revalidação do catálogo somente leitura, a seção "Comece por aqui" apontando para o plano de encerramento de 100 etapas, a seção "Referências por assunto" e a seção "Regras de segurança operacional". O parágrafo que a branch tinha acrescentado ("## Plano atual de correções do portal Sicoob", com link direto para `plano-150-etapas-20260927/plano.md`) não sobreviveu literalmente — a main não contém a string "150" nesse arquivo. Isso não é perda de conteúdo: o plano continua publicado e referenciado, porque `docs/README.md` da main, na seção "Planos e auditorias", aponta para `./plano-implementacao/README.md`, e é esse arquivo que carrega o bloco das 150 etapas verificado no item anterior. O caminho de navegação para o plano continua existindo, um clique mais longo, e a decisão editorial de reorganizar o índice é posterior e deliberada.

4. OS 15 ARQUIVOS QUE NÃO EXISTEM NA MAIN NAQUELE CAMINHO

Nenhum deles foi criado por esta branch — todos vêm da main antiga re-enraizada. Mesmo assim, verifiquei cada um, porque o risco de perda vale para qualquer trabalho, não só o desta branch.

Caso (c) — lixo/efêmero, 10 arquivos. Nove são saída do graphify: `graphify-out/.gitignore`, `graphify-out/GRAPH_REPORT.md`, `graphify-out/README.md`, `graphify-out/cost.json`, `graphify-out/diagnostico.json`, `graphify-out/graph.html`, `graphify-out/graph.json`, `graphify-out/mapear_backend.py` e `graphify-out/memory/query_20260922_210155_quais_dependências_sustentam_as_notificações_de_ap.md`. O `AGENTS.md` do projeto declara que o grafo fica "fora do Git — cada clone gera o seu", e a `.gitignore` da main confirma isso na linha 74 (`graphify-out/`, sob o comentário "Saída gerada pelo graphify (grafo local por máquina)"). A main não versiona nenhum arquivo sob `graphify-out/`. O décimo é `supabase/.temp/cli-latest`, 8 bytes, coberto pela linha 80 da `.gitignore` da main (`supabase/.temp/*`, sob o comentário "Estado efêmero gerado por `supabase link` e pela CLI local"). São artefatos regeneráveis por comando, não trabalho de ninguém.

Caso (b) — existe na main sob outro nome, 2 arquivos, ambos byte-idênticos após o rename.
- `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` está na main como `scripts/revisao/pendencias-2026-09-12.cenarios.test.tsx`. Mesmo sha de blob nos dois lados: 2c407af8250660a4c1e57e81f7a0b7263ae6c22b. O `git diff --no-index` entre os dois conteúdos saiu vazio. Foi só o acréscimo do sufixo `.test` para o Vitest reconhecer o arquivo.
- `tests/hooks/useCollections.test.tsx` está na main como `tests/hooks/useCollections.react.test.tsx`. O diff entre os dois é de exatamente uma linha: `describe('useCollections', ...)` virou `describe('useCollections com React Query', ...)`. Todo o resto (mocks de AuthContext e do cliente Supabase, o `createWrapper` com QueryClient, o teste "should initialize with empty collections") é idêntico. O rename foi necessário porque a main passou a ter também `tests/hooks/useCollections.test.ts`, um arquivo bem maior, com 13 testes da arquitetura de variantes (criação de coleção, variante ao adicionar produto, deduplicação, remoção, `addProductToMultipleCollections`, `getCollectionProductVariant`, `getCollectionProductItems`, `isProductInCollection`, `getProductCollections`, `deleteCollection`). Cobertura muito maior do que a da branch.

Caso (a)/(b) — superado por versão mais nova e mais completa na main, 3 arquivos.
- `src/components/intelligence/TopCategoriesCard.tsx` (6276 bytes na branch, importado no `src/pages/TrendsPage.tsx:19` e renderizado na linha 392 da branch). Na main esse componente existe como `src/components/intelligence/TopProductFamiliesCard.tsx`: mesma estrutura visual (ícone `Layers`, badge de crescimento com `TrendingUp`, badge "NOVO" com `Sparkles`, numeração em bolinha `bg-chart-4/15`, badge de volume), mesma heurística de agrupar pelo primeiro termo do nome do produto a partir de `product_views`, mesmo `calculateTrendingScore` e mesmo filtro `views >= 2`. A main tem a mais: a consulta foi tirada do componente e tipada em `src/pages/trends/trends-projections.ts` (interface `ProductFamilyTrend` na linha 55, `extractProductFamily` na linha 344, `calculateTrendingScore` na linha 354), eliminando o `untypedFrom` que a branch usava; o componente ganhou props de erro e recarga (`isError`, `isFetching`, `onRetry`) com o bloco `ProductFamiliesError` e botão "Tentar novamente"; está registrado em `src/pages/TrendsPage.tsx:37` e `:632`; e tem teste em `tests/components/intelligence/market-signals-error-states.test.tsx`, linhas 39, 61 e 76, cobrindo erro sem dados, erro com dados antigos e estado vazio. Nada se perde, ganha-se tipagem, estados de erro e teste.
- `src/components/orders/InvoicePaymentPanel.tsx` (1895 bytes na branch). Confirmei por `git grep` que, na própria branch, esse arquivo não é importado em lugar nenhum de `src`, `tests` ou `e2e` — era código morto já em 27/09/2026. O conteúdo dele é um painel estático: lê `(order as any).invoice_number` e `(order as any).payment_status` com cast para `any`, e exibe fixo a frase "Liberação financeira concluída para produção" sem nenhuma condição. A main substituiu isso por implementação real e integrada: `src/components/sicoob/orders/OrderInvoicesTab.tsx` e `src/components/sicoob/orders/OrderPaymentsTab.tsx`, ambos registrados em `src/pages/sicoob/orders/OrderDetailPage.tsx` (imports nas linhas 31 e 32, renderização na linha 245 sob as abas `invoices` e `payments` com controle de permissão `canManageFulfillment`), alimentados pelos hooks `src/hooks/orders/extensions/useOrderInvoices.ts` (consulta real à tabela `sicoob_order_invoices` e mutações de ingestão via `sicoobDocumentIngestService`) e `src/hooks/orders/extensions/useOrderPayments.ts`, com testes em `tests/hooks/useOrderInvoices.test.tsx` e `tests/hooks/useOrderPayments.test.ts`, e migration de apoio `supabase/migrations/20260922225200_materialize_overdue_sicoob_payments.sql`. Apagar a branch descarta um mock morto, não uma funcionalidade.
- `src/types/jspdf-autotable.d.ts` (231 bytes na branch). Era uma declaração global que aumentava o módulo `jspdf` para expor `lastAutoTable.finalY`. A main trocou essa abordagem por `src/lib/pdf/auto-table.ts`, que declara a interface `AutoTableState` localmente e exporta `getAutoTableFinalY(document, fallback)`, lendo `lastAutoTable?.finalY` e caindo no fallback quando o plugin não populou o valor. É a mesma informação, sem poluir o tipo global de `jsPDF` e com tratamento do caso em que o plugin não rodou. Único arquivo da main cujo nome casa com "autotable" ou "auto-table".

Caso (d) — nenhum. Nenhum arquivo da branch ficou sem correspondência na main.

5. OS 1858 ARQUIVOS DIVERGENTES

Como demonstrado no item 2, a branch não alterou nenhum deles: o commit autoral tocou 8 arquivos, e os 1850 restantes são a foto da main de 27/09/2026. Ainda assim medi a direção da divergência, arquivo por arquivo, comparando o tamanho do blob na main com o tamanho na branch: em 1225 arquivos a versão da main é maior ou igual, e em 633 é menor. Inspecionei as maiores reduções para garantir que encolher não significou perder.

As quatro maiores reduções são justamente sinais de saúde ou de regeneração: `.eslint-baseline.json` caiu de 111028 para 84 bytes e `.typecheck-baseline.json` de 8737 para 77 bytes, o que corresponde exatamente ao que o `AGENTS.md` afirma — a dívida de lint e de typecheck está zerada; as capturas de tela de evidência visual (`docs/execucao/evidencias/visual/loja-1440.png`, `loja-390.png`, `loja-320.png`, `demo-1440.png`, `login-1440.png`, `demo-390.png`, `demo-320.png`, `login-320.png`, `login-390.png`) foram regeradas com o front atual; e `package-lock.json` encolheu 56212 bytes porque as dependências mudaram. `public/AUDIT_ENTERPRISE_FINAL.md` caiu de 69294 para 3835 bytes — é documento de auditoria antigo que foi resumido na main.

As reduções em código-fonte que examinei são componentização, não exclusão: `src/pages/product-detail/ProductDetailHero.tsx` caiu de 21554 para 3756 bytes porque a main criou `src/pages/product-detail/ProductDetailHeroSections.tsx`, que não existe na branch; `src/components/search/GlobalSearchPalette.tsx` caiu de 18387 para 1764 bytes porque a main criou `src/components/search/GlobalSearchPaletteView.tsx`, também inexistente na branch; `src/components/security/SecurityDashboard.tsx` caiu de 18723 para 2940 bytes porque a main criou `src/components/security/SecurityDashboardSections.tsx`, idem. Em todos os três casos o diretório correspondente da main tem estritamente mais arquivos do que o da branch. O conteúdo migrou para arquivos vizinhos.

6. CONCLUSÃO

O único trabalho autoral desta branch é o plano de 150 etapas de 27/09/2026, e ele está na main com os mesmos shas de blob em todos os seis arquivos de conteúdo, mais o bloco de índice byte-idêntico em `docs/plano-implementacao/README.md`. Os 15 arquivos que a branch tem e a main não tem são, em dez casos, artefatos gerados que a própria `.gitignore` da main exclui; em dois casos, renames com conteúdo idêntico; e em três casos, implementações antigas que a main substituiu por versões tipadas, integradas e testadas. Não há caso (d). A branch pode ser apagada sem perda de trabalho de ninguém.

**Ressalvas:** Três ressalvas que não bloqueiam a exclusão, mas o dono deve saber.

1. O parágrafo "## Plano atual de correções do portal Sicoob" que a branch tinha acrescentado ao fim de `docs/README.md` não existe mais nesse arquivo na main — o índice foi reescrito em outubro/novembro de 2026. O plano continua publicado e linkado, só que via `docs/plano-implementacao/README.md` (linhas 64 e 66), para onde o `docs/README.md` da main aponta na seção "Planos e auditorias". Se o dono quiser o atalho direto de volta no índice principal, isso é uma edição de uma linha, independente desta branch.

2. Os nove arquivos de `graphify-out/` e o `supabase/.temp/cli-latest` estavam commitados na branch e hoje são ignorados pela `.gitignore` da main (linhas 74 e 80). Isso significa que, ao apagar a branch, some do Git o grafo gerado em 22/09/2026 — inclusive o `GRAPH_REPORT.md` e a nota `graphify-out/memory/query_20260922_210155_...md`. É saída de ferramenta, regenerável com `npm run graph:setup` / `npm run graph:update`, e o próprio `AGENTS.md` diz que ela deve ficar fora do Git. Nada a recuperar.

3. Esta auditoria cobre a árvore de arquivos da branch, não o histórico de commits abaixo dela. Como a main foi re-enraizada em 11/11/2026, os commits antigos (#24 a #41) alcançáveis a partir de `f47e5d8e3` deixam de ser alcançáveis quando a branch for apagada. O conteúdo deles está na árvore da main atual (confirmado: zero arquivos no caso (d)), mas as mensagens e a autoria desses commits antigos somem com a branch. Se o dono quiser preservar esse histórico, a saída é criar uma tag apontando para `f47e5d8e3` antes de apagar a referência — decisão dele, não bloqueio técnico.

Tentativa de refutação: `evidencias.md`, seção `docs/plano150-20260927`.


