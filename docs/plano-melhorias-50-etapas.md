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
5. Atualizar e mesclar o PR aberto do worktree.
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
17. Zerar os 10 arquivos com mais erros de tipo, começando por `QuoteService.ts`. 🔄 em andamento: `QuoteService.ts` ✅ (15→0), `CompanyContactSelector.tsx` ✅ (14→0), `useGroupPersonalization.ts` ✅ (13→0, de graça via correção do `untypedFrom<T>` em `supabase-untyped.ts`), `products-detail.ts` ✅ (16→0), `QuoteBuilderPage.tsx`+`useQuoteBuilderState.ts` ✅ (12→0, 3 bugs reais + 2 funcionalidades nunca ligadas, ver doc de correções), `kitPdfGenerator.ts` ✅ (10→0, achado bônus: `tscheck-files.mjs` tinha falso-positivo de `lastAutoTable` — corrigido). Baseline total: 1189→1107. Faltam ~4 dos 10 originais (a lista muda conforme os fixes cascateiam por arquivos compartilhados).
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
