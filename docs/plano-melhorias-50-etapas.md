# Runbook de correções e melhorias — 50 etapas

> Versão em texto do plano publicado como artifact em 2026-09-13
> (https://claude.ai/code/artifact/71600452-aedf-447a-8da3-580ac2050a2e).
> Ver também [correcoes-validacao-2026-09-13.md](./correcoes-validacao-2026-09-13.md) e
> [correcoes-validacao-2026-09-14.md](./correcoes-validacao-2026-09-14.md) para o que mudou
> depois que cada etapa de risco foi verificada contra o código real antes de ser
> executada — várias premissas abaixo foram corrigidas ou descartadas lá.

Diagnóstico de origem (2026-09-13): `main` local 11 commits atrás de `origin/main`
(desde resolvido — ver histórico do commit que trouxe este arquivo), 29 arquivos
sem commit num worktree secundário, 1.189 erros TypeScript e 2.774 ESLint suprimidos
em baseline, 8 edge functions sinalizadas sem autenticação (a maioria falso-positivo —
ver doc de correções), zero regras de proteção em `main`.

## Fase 0 — Estabilizar (hoje, ordem obrigatória)
1. Preservar o worktree órfão (`~/hermes-workspaces/chat-sicoob-20260911130857`) antes de qualquer outra ação — commit + push.
2. Fast-forward de `main` local para `origin/main` + reinstalar dependências.
3. Configurar `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` nos secrets do GitHub.
4. Configurar `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (ambiente restrito) para o workflow de compliance agendado.
5. Atualizar e mesclar o PR aberto do worktree. ✅ feito 2026-09-14: PR #7 (`execucao/sicoob-20260911130857`, idempotência real em recompra e conversão de kit) mesclado via GitHub — detectado nesta sessão como um `non-fast-forward` no push local, reconciliado com `git rebase origin/main` sem conflitos (nenhum arquivo em comum com os fixes de tipo em andamento).
6. Fechar PRs cujo conteúdo já foi absorvido por outro merge, apagando as branches.

## Fase 1 — Governança do repositório (semana 1)
7. Ativar proteção de branch em `main` (PR obrigatório, checks obrigatórios, sem force-push).
8. Um só gerenciador de pacotes — ✅ feito 2026-09-14: `ci.yml` já tinha migrado pra npm no PR #6; convertido `security-compliance.yml` (o único ainda em bun, e que nunca tinha rodado com sucesso mesmo antes disso — faltava instalar dependências) e removido `bun.lock`.
9. Tirar artefatos gerados (`dependencies.json`, `api_usage.json`, `service_map.txt`, etc.) do controle de versão. ✅ feito 2026-09-13.
10. Tirar PDFs grandes de `public/` para fora do bundle servido. ✅ feito 2026-09-13.
11. Impedir volta de arquivos de sonda (`tsconfig.probe.*`) — **já resolvido** upstream, sem ação necessária.
12. Convenção de commits aplicada por hook + isolar edições automáticas (Lovable) do fluxo direto em `main` — **pendente de confirmação**: como o Lovable interage com este repositório.
13. Consolidar os três diretórios de teste (`tests/`, `src/tests/`, `src/test/`) numa convenção só.
14. Política de migrations: nome padronizado, revisão obrigatória, imutabilidade após merge. ✅ feito 2026-09-14: `scripts/check-migration-immutability.mjs` (gate em `ci.yml`) + seção nova em `CONTRIBUTING.md`.

## Fase 2 — Dívida de tipos e lint (semanas 2–5, contínuo)
15. Corrigir nomes de scripts de lint mal nomeados. ✅ feito 2026-09-13.
16. Transformar o baseline de typecheck em ratchet por arquivo — **já implementado**: `check-typecheck-baseline.mjs` já falha por arquivo individual, não por total agregado. Nenhuma ação necessária.
17. Zerar os 10 arquivos com mais erros de tipo, começando por `QuoteService.ts`. 🔄 em andamento: `QuoteService.ts` ✅ (15→0), `CompanyContactSelector.tsx` ✅ (14→0), `useGroupPersonalization.ts` ✅ (13→0, de graça via correção do `untypedFrom<T>` em `supabase-untyped.ts`), `products-detail.ts` ✅ (16→0), `QuoteBuilderPage.tsx`+`useQuoteBuilderState.ts` ✅ (12→0, 3 bugs reais + 2 funcionalidades nunca ligadas, ver doc de correções), `kitPdfGenerator.ts` ✅ (10→0, achado bônus: `tscheck-files.mjs` tinha falso-positivo de `lastAutoTable` — corrigido), `SupabaseConnectionsTab.tsx`+`connectionStatus.ts` ✅ (8→0, 3 causas reais: union heterogênea sem `readOnly` nos 2 outros membros, tipo mais estrito que o dado real, retorno de função incompatível com union `void | Promise<void>`), `ProductVariationAxesConfig.tsx` ✅ (8→0, mesmo padrão de guarda de `useQuoteBuilderState.ts`: dois loops sobre o mesmo array fixo, TS não propaga a garantia de chave entre eles), `ConfigurationPanelV6.tsx` ✅ (8→0, achado real: campos `requiredFields` do `PRICE_CONTRACT` só geram aviso de dev quando ausentes, nunca bloqueiam — `.toFixed()` direto quebraria em produção; corrigido com fallback `?? 0` e guarda de bloco, não supressão de tipo), `VirtualizedReplenishmentList.tsx` ✅ (8→0, mesmo padrão de guarda: índice do virtualizer garantido pelo `count: products.length` da config, mas TS não propaga essa relação), `VoiceTranscriptPanel.tsx` ✅ (8→0, `ACTION_META` tipado como `Record<string, T>` tornava até o próprio acesso por ponto às chaves declaradas `T | undefined`; corrigido com `Record<ActionMetaKey, T>` + helper `getActionMeta` com type guard, mantendo o fallback pra `answer` que já existia pras 2 ações não mapeadas), `FocusTrap.tsx` ✅ (8→0, acesso por índice já protegido por checagem de `.length` que o TS não propaga — asserção de não-nulo nos 4 pontos). Baseline total: 1189→1049 (**achado bônus**: a atualização do baseline também capturou 4 arquivos não tocados nesta etapa — `useQuoteTemplates.ts`, `AuditEvidenceDashboard.tsx`, `PublicCollectionPage.tsx`, `PublicComparisonPage.tsx` — cujo total real já era menor que o baseline anterior registrava; confirmado sem regressão via 2 rodadas independentes de `tsc` completo). A lista dos "10 arquivos com mais erros" original já foi totalmente superada — 12 unidades de trabalho zeradas nesta etapa; seguindo pelos próximos arquivos no topo do baseline atual: `use2FA.ts` ✅ (8→0, tabela `user_2fa_settings` existe na migration mas está ausente do `types.ts` gerado — drift real, corrigido via `untypedFrom<T>`, que ganhou suporte a `upsert`), `useCatalogFiltering.ts` ✅ (8→0, 4 causas: tipo solto `Record<string,string>` em vez de `ProductColor`; `supplierSalesMap` tipado como `Map<string,number>` quando o dado real é `Map<string,SupplierSalesEntry>`; guarda defensiva de `materials` (array vs. string legada) narrowed a `never` pelo TS; filtro "temas" nunca teve o campo `tags.temas` no tipo — achado real de feature morta desde o commit `322509aa8`, mantido como campo opcional sem alterar comportamento pra não arriscar leitura de dado errado em produção, ver doc de correções), `useExternalDatabase.ts` ✅ (8→0, 3 causas: retorno de `invokeWithRetry` é `unknown` na fronteira — corrigido com `EdgeFunctionEnvelope` explícito; genérico `T` sem constraint quebrava o operador `in` — `T extends object` em vez de `Record<string,unknown>`, mesma armadilha documentada em `supabase-untyped.ts` pra interfaces nomeadas; `useExternalCompanies('companies')` mirava tabela inexistente no bridge errado — convertido pro mesmo padrão de stub deprecated já usado em `useExternalBusinessSectors`, preservando a assinatura pro consumidor `ExternalDatabaseTest.tsx`), `useMagicUpState.ts` ✅ (8→0, 6 causas: `.map()` anotado com `Tables<>` completo em vez do shape estreito do `.select()` explícito; `MagicUpProduct.images` declarado como array de objetos ricos quando o dado real (`PromobrindProduct.images`) é `string[] | null` — corrigido o tipo da interface, achado sem consumidor do shape rico; cadeia `.filter().map().filter()` sem tipo intermediário quebrando o overload do filter final; chave de `Map` vinda de `unknown` sem cast local; `shape: string` vs. união `AreaShape` — cast explícito; par `qualityDiagnosis`/`curationStatus` explícito no retorno, 100% sobrescrito pelo `...generation` spread seguinte — código morto removido, ver doc de correções), `FavoritesPage.tsx` ✅ (8→0, causa única propagada em 4 arquivos: `useEnrichedFavoriteItems.ts` importava `Product` de `@/types/product` — shape de linha crua do banco — quando o dado real é `@/types/product-catalog` — shape de catálogo/UI; duas interfaces homônimas genuinamente diferentes. Corrigido o import e o mesmo bug em cascata em `FavoritesViewHeader.tsx`, `FavoritePresentationLauncher.tsx` e `ExportFavoritesButton.tsx`; achado bônus fora do escopo: `TS18048` pré-existente em loop de geração de PDF, corrigido com asserção de não-nulo pra não estourar complexidade cognitiva do lint, ver doc de correções), `GestorApprovalsPage.tsx` (+ variante `sicoob/`) ✅ (10→0, **achado real de bug de produção** — mesma categoria do `useExternalCompanies()`: embeds PostgREST `approver:approver_id(full_name, email)` e `profiles:created_by(full_name)` miravam FK real pra `auth.users(id)`, schema interno não-embutível pelo PostgREST e sem essas colunas públicas — os embeds nunca funcionaram em runtime, sempre voltaram vazio. Corrigido com busca separada em `public.profiles` (que tem `user_id → auth.users(id)`) e merge no client, sem migration de schema — decisão de código de aplicação, não mudança de arquitetura; demais erros do lote: `formatCurrency` trocado do `@/lib/utils` deprecated (`number`) pro `@/lib/format` (`number | null | undefined`), `new Date(created_at)` nullable extraído pra função `toSafeDate()` pra não estourar complexidade ciclomática do lint, `title` nullable com `?? undefined`, ver doc de correções), `OrderDetailPage.tsx` ✅ (8→0, 3 causas reais: dead code `useState(Componente)` disfarçando import não usado — `Tooltip` sem nenhum uso real deletado (import + hack), `MessageSquare`/`Badge` usados de verdade, só o hack removido; 3 handlers (`handleRequestApproval`, `handleApprove`, `handleEscalate`) sem o guard `if (!orderData) return;` já presente em `handleReject` no mesmo arquivo — aplicado o mesmo padrão; `SicoobOrder` (tipo hand-written) sem o campo `approval_policy_version`, presente na tabela real desde as migrations de alçada superior e no `types.ts` gerado — terceira instância de drift de tipo confirmada na sessão, ver doc de correções), `useQuoteTemplates.ts` (1 restante neste lote).
18. Regenerar o baseline de ESLint — **prioridade rebaixada**: `fetch-depth: 0` em todo workflow relevante garante que o gate real (`lint:baseline`) sempre usa diff contra `origin/main`, nunca o snapshot desatualizado. Regenerar ainda vale pra dashboard (etapa 50), não é mais um gate quebrado.
19. Reduzir os `any` explícitos, começando por `src/App.tsx` e `src/lib/`.
20. Trocar `console.*` pelo logger estruturado — **prioridade rebaixada**: `vite.config.ts` já usa `esbuild.pure` pra eliminar `console.log/debug/info` do bundle de produção (mantém `warn`/`error` de propósito). Resíduo real no `dist/` é código de biblioteca vendorizada, não nosso. Migração pra logger continua válida como qualidade/observabilidade, não como vazamento de dado.
21. Auditar cada `eslint-disable`/`ts-ignore` — exigir motivo ou remover.
22. Tratar `types.ts` gerado com detecção de drift em CI.
23. Quebrar os arquivos acima de 700 linhas em `pages/sicoob/orders/` e afins.

## Fase 3 — Segurança (semanas 2–3, paralelo à Fase 2)
24. Classificar as edge functions restantes — **corrigido**: 6 das 8 originalmente sinalizadas eram falso-positivo (já tinham auth/rate-limit/stub). Só `categories-api` tinha gap real (✅ corrigido 2026-09-13) e `generate-mockup-nanobanana` era código órfão sem handler (✅ corrigido 2026-09-13).
25. Blindar `image-proxy` contra SSRF — **não necessário**: já tem allowlist de domínio, anti-hotlinking e rate limit.
26. Isolar/remover `external-db-inspect`/`migrate-helper` — **não necessário**: a primeira já exige role `dev`, a segunda já é stub 410 sem chamador.
27. Fechar gap de `search_path` em `SECURITY DEFINER` (10 de 362 funções sem verificação clara — checar contra o Postgres real do projeto, não via MCP genérico).
28. Adicionar Content-Security-Policy (hoje zero).
29. `.env.production` — **corrigido**: `ANON_KEY`/`PROJECT_ID` são usados em 4 lugares reais (`PublicComparisonPage.tsx` e afins); não tocar sem mapear todos os usos.
30. Secret scanning no pre-commit e no GitHub (gitleaks).
31. Promover checks de RLS/escopo (`test:rls`, `check:seller-scope`) a required no CI.
32. Rate limiting real (compartilhado, não em memória por instância) nas functions públicas.

## Fase 4 — Testes e CI (semanas 3–4)
33. Cobrir as edge functions `sicoob-*` com testes de auth/idempotência.
34. E2E: falhar em `main`, avisar (não bloquear) em PR de fork sem secrets.
35. Verificar se os thresholds de cobertura (80%/75%) refletem a realidade medida.
36. Política de flaky: quarentena com prazo de 14 dias, não supressão silenciosa.
37. Consolidar os 10 workflows em ~4, com setup comum extraído.
38. Desacoplar `build` de `npm audit` (rede não deve poder quebrar deploy). ✅ feito 2026-09-14.
39. Testes de invariante (pgTAP ou `tests/scenarios`) para as migrations atômicas de Sicoob.
40. Decidir o destino dos simuladores Python em `scripts/qa/`.

## Fase 5 — Performance e build (semana 5)
41. Orçamento de bundle com número que falha, não só warning.
42. Garantir que `mockData.ts`/telas de dev não vão pro bundle de produção — **achado mais sério do que bundle size**: `useSearch.ts` (busca central, 4 consumidores) usava `CATEGORIES`/`SUPPLIERS` de mockData com nomes reais de negócio hardcoded ("BRINDES SICOOB", "XBZ Brindes") em vez do catálogo real. ✅ corrigido 2026-09-14 (migrado pra `useSuppliers()`/`useExternalCategoriesQuery()`). `PUBLICO_ALVO`/`DATAS_COMEMORATIVAS`/`ENDOMARKETING`/`NICHOS`/`FAIXAS_PRECO` (mesmo arquivo) investigados e confirmados como taxonomia fixa legítima — sem bug, só nomenclatura de arquivo confusa.
43. Justificar ou substituir `vendor/pptxgenjs-browser`.
44. Carregar sob demanda o painel admin de conexões.
45. Lighthouse com thresholds que realmente falham o CI.

## Fase 6 — Operação e release (semana 6, depois recorrente)
46. Tags semver + CHANGELOG automático (release-please/changesets).
47. Inventário canônico de segredos e variáveis de ambiente.
48. Ligar alertas nas functions de monitoramento já existentes (`health-check`, `error-monitor`).
49. Política de branches/worktrees — commit no mesmo dia, limpeza semanal.
50. Painel de dívida técnica com tendência semanal (typecheck, eslint, `any`, cobertura, bundle).

---

**Legenda de status usada acima:** ✅ = feito e verificado nesta sessão; sem marca = ainda
não iniciado; "corrigido"/"não necessário" = a investigação de risco mudou a etapa antes
da execução (ver [doc de correções](./correcoes-validacao-2026-09-13.md) para a evidência).
