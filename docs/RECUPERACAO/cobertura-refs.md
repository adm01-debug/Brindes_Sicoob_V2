# Cobertura das refs — toda branch remota contabilizada

Medição de 18/11/2026, sobre as **89 branches remotas** que existiam em
`origin` nesse momento (fora a `main`).

## Por que este anexo existe

`branches.md` detalha 17 branches e `prs.md` detalha 32 PRs fechadas sem merge. Isso
não é o mesmo que "toda ref foi olhada": uma branch pode não estar em nenhum dos dois
e ainda assim guardar trabalho. Este anexo fecha essa conta — **cada uma das 89 refs
aparece abaixo**, com a razão pela qual já está contabilizada ou o que falta nela.

A regra não mudou: **nenhuma ref se apaga sem um veredito escrito.** Este anexo diz
onde está o veredito de cada uma; `branches.md` e `prs.md` continuam sendo onde o
veredito é justificado item por item.

## Método

Para cada ref: (a) mapeamento ref → PR por `headRefName` em todas as 344 PRs do repo;
(b) `git merge-base --is-ancestor <ref> origin/main`, que diz se a ponta já está na
`main`; (c) `git diff --name-only --diff-filter=A origin/main <ref>`, que lista os
arquivos que existem na ref e **não existem** na `main` — é essa lista, não a
contagem de commits, que mostra trabalho potencialmente perdido.

Ressalva medida: a `main` foi re-enraizada em ~11/11/2026, então 56 das 89 refs não
têm ancestral comum com ela. Para essas, comparação de commit não significa nada e só
a comparação de **conteúdo** (c) vale — foi a usada.

## Tabela

| ref | como está contabilizada | pode apagar |
|---|---|---|
| `audit/revisao-plano-20260924` | PR #31 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `audit/revisao-plano-20261001` | PR #85 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/chore-typecheck-baseline-260929-1157` | PR #81 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/ci-allowlist-crm-db-bridge-261118-1515` | PR #311 **aberta** nesta sessão | **não** (em voo) |
| `claude/ci-catraca-skip-cobre-e2e-p0-261118-2040` | PR #329 **aberta** nesta sessão | **não** (em voo) |
| `claude/ci-contrato-runtime-edge-261118-2110` | PR #335 **aberta** nesta sessão | **não** (em voo) |
| `claude/docs-auditoria-planejamento-105-261118-2115` | PR #336 **aberta** nesta sessão | **não** (em voo) |
| `claude/docs-causas-ci-149-158-261118-2130` | PR #340 **aberta** nesta sessão | **não** (em voo) |
| `claude/docs-ledger-recuperacao-261118-1600` | PR #315 **aberta** nesta sessão | **não** (em voo) |
| `claude/docs-modelos-email-pr4-261118-2120` | PR #337 **aberta** nesta sessão | **não** (em voo) |
| `claude/docs-preserva-sussurro-261118-1815` | PR #324 **aberta** nesta sessão | **não** (em voo) |
| `claude/feat-atestado-preco-orcamento-261117-0905` | PR #290 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/feat-kpis-carteira-primeira-compra-retencao-261118-2230` | PR #344 **aberta** nesta sessão | **não** (em voo) |
| `claude/feat-kpis-primeira-compra-retencao-261118-1800` | sem PR associada | **não** antes de análise |
| `claude/feat-modulos-edge-recuperados-261117-0930` | PR #291 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/feat-modulos-edge-relatorios-261117-0950` | PR #292 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-a028-migration-replay-261031-1541` | PR #192 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-a028-migration-replay-261106-1355` | PR #201 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-aviso-alteracoes-nao-salvas-261118-2050` | PR #331 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-bi-selo-dado-real-261118-2025` | PR #326 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-cors-fallback-fechado-261118-2035` | PR #328 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-drop-allow-all-rls-260929-1342` | PR #83 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-hardening-banco-recuperado-261117-0847` | PR #288 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-kanban-realtime-260929-0420` | PR #80 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/fix-kit-fila-manual-autosave-261118-2130` | PR #341 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-kit-trava-concorrencia-261118-2105` | PR #334 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-pin-kit-atomico-261117-0849` | PR #289 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-prod-cors-audit-261118-1034` | PR #308 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-realtime-kanban-canal-exclusivo-261118-2220` | PR #342 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-rls-allow-all-261117-0844` | PR #286 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/fix-rota-instalar-pwa-261118-2045` | PR #330 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-seller-scope-baseline-260929-1300` | PR #82 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/fix-seller-scope-deno-260929-1445` | PR #84 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/fix-selos-fornecedor-dado-real-261118-1730` | PR #323 **aberta** nesta sessão | **não** (em voo) |
| `claude/fix-storage-delete-proposals-261106-2007` | PR #209 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/fix-template-curadoria-preservada-261118-2020` | PR #325 **aberta** nesta sessão | **não** (em voo) |
| `claude/hopeful-mccarthy-8rqrqw` | PR #137 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `claude/infra-rpc-hub-operational-evidence-261117-1640` | PR #298 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `claude/project-workflows-analysis-5n6hva` | PR #53 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `claude/test-guarda-catalogo-e-caminho-261118-2125` | PR #339 **aberta** nesta sessão | **não** (em voo) |
| `claude/test-recupera-suite-pr119-261118-2225` | PR #343 **aberta** nesta sessão | **não** (em voo) |
| `computador_local` | sem PR associada · em `branches.md` | conforme `branches.md` |
| `contexto` | gerada a cada 10 min por `contexto.yml`; não é trabalho de agente | **não** (ativa) |
| `dependabot/github_actions/actions/checkout-7.0.1` | PR #285 **aberta** nesta sessão | **não** (em voo) |
| `dependabot/github_actions/actions/setup-node-7.1.0` | PR #284 **mergeada** | sim |
| `dependabot/github_actions/peter-evans/create-pull-request-8.1.3` | PR #283 **aberta** nesta sessão | **não** (em voo) |
| `dependabot/npm_and_yarn/development-all-ccf808f959` | PR #322 **aberta** nesta sessão | **não** (em voo) |
| `dependabot/npm_and_yarn/production-minor-patch-585bd01e94` | PR #281 **aberta** nesta sessão | **não** (em voo) |
| `devin/1791190000-ux-onda1` | PR #100 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `devin/1791201000-ux-onda2` | PR #101 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `docs/ci-status-309799` | PR #172 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `docs/hermes-1791891351-auditoria-planejamento` | PR #105 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `docs/hermes-h459513-branch-protection` | PR #188 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `docs/plano150-20260927` | PR #44 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `execucao/sicoob-20260911130857` | PR #5 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `feat/pdf-playwright-scripts-art-261108-0516` | PR #226 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/ci-only-20261029` | PR #165 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/ci-workflows-h290325` | PR #164 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/ci-workflows-h369570` | PR #176 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/execucao-plano-20260928` | PR #74 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/execucao-plano-final-20260928` | PR #75 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-20261029-undici-cve` | PR #161 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-272703-ci-audit` | PR #158 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-61031-plan-lote` | PR #187 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-bi-share-hardening-20261028` | PR #150 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `fix/hermes-docs-all-20261028` | PR #148 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h015416-dados-reais` | PR #112 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h097437-ci-workflows` | PR #145 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h164991-simulacao-final` | PR #119 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h206502-e2e-codeql` | PR #94 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h237459-sync-audit` | PR #154 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h247355-ci-dependencies` | PR #157 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `fix/hermes-h275576-codeql-consistencia` | PR #160 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h301937-e2e-hosted` | PR #97 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h393620-docs-audit-20261031` | PR #179 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h393620-inteligencia-real` | PR #178 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h423368-logistics-shipment-pagination` | PR #181 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h425359-undici-security` | PR #182 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-h432507-npm-audit` | PR #185 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-revisao-scripts-261108-0604` | PR #228 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/hermes-sicoob-deploy-verification-20261028` | PR #149 fechada sem merge — **analisada** em `prs.md` | conforme o veredito em `prs.md` |
| `fix/quote-price-authority-311333` | PR #175 fechada sem merge — ver "Fechadas sem merge fora das 32" abaixo | ver abaixo |
| `fix/sicoob-aprovacao-legada-20260923` | PR #26 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-conclusao-20260922` | PR #18 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-csp-202635` | PR #27 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-intelligence-truth-20260924` | PR #36 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-p0-operacional-20260923` | PR #24 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-p0-seguranca-20260923` | PR #22 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |
| `fix/sicoob-trust-data-20260924` | PR #34 **mergeada** · também em `branches.md` | sim, se `branches.md` não disser o contrário |

## Fechadas sem merge fora das 32 de `prs.md`

As 32 PRs de `prs.md` não são todas as fechadas sem merge do repo. Varrendo as 344 PRs
e cruzando com o ledger inteiro (não só `prs.md`), **duas** não eram citadas em lugar
algum. As duas foram verificadas agora, byte a byte:

| PR | branch | verificação | veredito |
|---|---|---|---|
| **#83** | `claude/fix-drop-allow-all-rls-260929-1342` | o único arquivo da PR era `20260929134200_drop_allow_all_permissive_policies.sql`. A `main` tem `supabase/migrations/20261118130500_block_permissive_allow_all_policies.sql`, cujo cabeçalho cita a PR #83 nominalmente, mantém o `DROP` (agora guardado por `to_regclass`) e **acrescenta** uma catraca permanente contra policy `FOR ALL USING (true)` para PUBLIC/anon/authenticated | **INCORPORADA com melhoria** — pode apagar |
| **#279** | `claude/fix-admin-audit-hook-cors-261114-1154` (ref já apagada) | o único arquivo era `supabase/functions/admin-audit-hook/index.ts`, trocando `corsHeaders` aberto por `getCorsHeaders`/`handleCorsPreflightIfNeeded`. Comparado linha a linha com `origin/main`: o import, o preflight e as três respostas estão **idênticos** na `main`, via PR #287 mergeada | **INCORPORADA (idêntica)** — nada a recuperar |

As outras fechadas sem merge que não estão nas 32 (#100, #114, #116, #117, #118, #150,
#175, #188, #192, #201, #286, #288, #289, #290, #291, #292, #298) **são** citadas em
outras partes do ledger ou em tarefa própria desta sessão, e seguem por lá.

## Lacuna nova: a branch de produção pré-re-raiz

`claude/fix-prod-cors-audit-261118-1034` (PRs #308 e #318, as duas fechadas) é a ponta
da árvore de produção **anterior à re-raiz da `main`**. Ela tem **138 arquivos que não
existem na `main`**. Cruzando os 138 com o ledger inteiro, 119 já estavam citados. Os
**19 restantes** não estavam em lugar algum — ficam registrados aqui.

### 13 arquivos de teste — executados contra a `main`, 18/11/2026

**Andamento (19/11/2026), medido arquivo a arquivo:** os **13 voltaram** pelas seis
fatias abaixo, **com a regra que eles cobram**, não só copiados — **11 já estão na
`main`** (entraram com a [#361](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/361),
conferido com `git cat-file -e origin/main:<arquivo>`) e **2** —
`tests/components/onboarding/OnboardingTour.escape.test.tsx` e
`tests/routes/app-router-parity.test.tsx` — estão na branch da
[#352](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/352), aguardando merge.

Os **6 arquivos da seção "Os 6 restantes"** no fim desta seção **não são parte dos 13**:
são um conjunto distinto, achado na re-conferência da ref em 19/11. A interseção entre as
duas listas é **vazia** (`comm -12` sobre as duas listas ordenadas → 0 linhas), e a ref
contribui portanto **19 arquivos de teste**, não 13.

> Correção de duas afirmações minhas anteriores neste mesmo documento: primeiro escrevi
> "os 13 entraram" sem distinguir o que estava na `main` do que estava em PR; depois
> "corrigi" para "7 dos 13 entraram e os outros 6 estão na #363", o que trocou um erro por
> outro — somou conjuntos diferentes. A contagem acima é a medida, não a memória.

| fatia | PR | o que entrou |
|---|---|---|
| 1 | [#346](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/346) | `ClientOverview360.availability` + `client-vs-industry-origem`. `useClientBI` parava de devolver `MOCK_CLIENT_STATS` para qualquer cliente sem pedido (LTV de outra empresa nos números grandes); `useClientVsIndustry` ganhou `hasClientData`/`isClientDataUnavailable` e `isMock` deixou de ser `true` quando a amostra do ramo não fechava. Absorveu a PR #326 |
| 2 | [#347](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/347) | `ClientHealthHero.availability`. `useClientSeasonality` parava de devolver `getMockSeasonality()` com menos de 3 meses de histórico (picos fictícios carimbados "Dados reais"); `useClientHealthScore` somava pesos fixos sobre fallbacks inventados (10 pedidos, R$ 2.500, potencial de R$ 30.000) e agora normaliza os pesos entre as fontes confiáveis |
| 3a | [#348](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/348) | `ClientCategoryRadar.industry-error`. Três hooks caíam em mock no caminho real: `useClientAffinity` engolia o erro da RPC e sugeria produto fictício; `useClientCategoryAffinity` transformava RPC negada em "cliente sem produto" e elegia a **mesma** categoria favorita inventada para todo cliente; `useIndustryCategoryTrends` comparava o cliente contra um "setor dele" fabricado. O radar deixa de somar GAP sobre fonte caída |
| 3b | [#349](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/349) | `ComparisonAvailability`. O painel comparador juntava sete fontes por cliente e devolvia uma linha única: falha de qualquer uma virava LTV R$ 0 e score 0 classificado como "risco". Agora oculta só a métrica da fonte caída e refaz só a consulta que falhou. `ClientVsIndustryComparison` ganhou "Comparativo indisponível" (em vez de confundir falha com amostra insuficiente) e "Último cache · atualização falhou" |
| 4 | [#350](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/350) | `BIAiCopilot.context/sources` + `BIBriefingMode.history/sources`. O copiloto enviava à IA o contexto que tivesse: histórico falhado virava `ltv: 0` e `ordersCount: 0` (a IA respondia "nunca comprou" sobre quem compra), benchmark falhado virava score 0 (diagnóstico de risco) e tendência do setor em cache ia como atual. Agora o contexto declara disponibilidade, preserva zero medido e bloqueia o envio com fonte caída |
| 5 | [#351](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/351) | `ExecutiveSummaryButton.availability`, `ClientLookalikes.availability`, `IndustryTrendingProducts.affinity-availability`. O resumo executivo gerava texto e habilitava copiar/PPTX sobre fonte caída — o vendedor **mandava para o cliente**; os similares mantinham cache sem avisar; os produtos do setor exibiam afinidade de fonte morta |
| 6 | [#352](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/352) | `OnboardingTour.escape` + `app-router-parity`. O tour não era diálogo (sem `role`, sem `aria-modal`, sem foco, sem `Escape`): teclado e leitor de tela ficavam presos no passo. O teste de rotas importava o roteador monolítico que a `main` substituiu — a garantia foi **portada** para os módulos, e a conferência prévia mostrou que **nenhuma rota do roteador antigo está ausente** |

Nas fatias 1 e 2, duas coisas da branch de origem foram **deliberadamente não
trazidas**, porque a `main` está mais correta: a troca de `fetchIndustryPeerIds` por
`selectCrmStrict` genérico (negado para vendedor e agente pela política do portal)
e a remoção do gráfico de forecast do mapa de calor. É por isso que a recuperação
é feita por fatia, com teste, e não por cópia da árvore.

### Os 6 restantes (conferidos em 19/11/2026)

Nenhum deles estava na `main` nem em PR aberta; só em `claude/fix-prod-cors-audit-261118-1034`,
a ponta da árvore de produção anterior à re-raiz.

| arquivo | situação | destino |
|---|---|---|
| `tests/security/portal-access-policy.test.ts` | passa contra a `main` | [#363](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/363) |
| `tests/lib/sicoob/sla-cycle.test.ts` | passa contra a `main` | #363 |
| `tests/lib/sicoob/orderBudgetProjection.test.ts` | passa contra a `main` | #363 |
| `tests/hooks/usePaBudget.test.tsx` | passa contra a `main` | #363 |
| `tests/edge-functions/trends-insights-pagination.test.ts` | passa contra a `main` | #363 |
| `tests/stores/useNavigationGuardStore.test.ts` | depende de store que a `main` não tem | [#357](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/357), mesmo assunto |

Os cinco primeiros passavam contra a `main` como estavam: a regra já existia no código e
estava **sem catraca**. São trava de regressão, não mapa de lacuna — e é por isso que a
conferência foi refeita arquivo a arquivo em vez de confiar no registro.

O que sobra da ref são os 6 relatórios de execução abaixo — docs, sem dependência de código.

**Correção de rota (19/11/2026):** as PRs #346–#351 foram abertas em pilha, cada uma
baseada na branch da anterior. Ao mergear, cada uma entrou na branch-base em vez da
`main`, e o GitHub fechou #348 e #350 por perda de base — nenhum byte chegou à `main`.
As seis foram consolidadas na [#361](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/361),
aberta a partir da `main`, após conferência byte a byte (`git ls-tree`) de que a branch
`claude/fix-bi-copiloto-briefing-261119-0030` era superconjunto exato das seis.

**Varredura de `baseRefName` (19/11/2026):** conferidas todas as PRs mergeadas do repo
atrás do mesmo colapso. São **três pilhas**, não uma — seis PRs mergeadas que nunca
tocaram a `main`:

| PR mergeada | base real (não era `main`) | onde o conteúdo está hoje | estado |
|---|---|---|---|
| [#347](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/347) | `claude/fix-bi-overview-historico-indisponivel-261118-2300` | consolidado na [#361](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/361) | **na `main`** (`d53f9e8`) |
| [#349](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/349) | `claude/fix-bi-comparador-fontes-261118-2345` | consolidado na [#361](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/361) | **na `main`** (`d53f9e8`) |
| [#351](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/351) | `claude/fix-bi-copiloto-briefing-261119-0030` | consolidado na [#361](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/361) | **na `main`** (`d53f9e8`) |
| [#341](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/341) | `claude/fix-kit-trava-concorrencia-261118-2105` | entrou com a [#334](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/334) | **na `main`** (`25214df`) |
| [#356](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/356) | `claude/fix-kit-trava-concorrencia-261118-2105` | entrou com a [#334](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/334) | **na `main`** (`25214df`) |
| [#359](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/359) | `claude/fix-voltar-pergunta-sem-motivo-261119-0310` | branch da [#357](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/357) | **aberta** — a única que falta |

Prova de preservação das duas pilhas novas (#341 e #359), feita commit a commit:

- o commit de merge de cada uma é **ancestral** do topo da branch que a recebeu
  (`git merge-base --is-ancestor` → verdadeiro) e **não** é ancestral de `origin/main`;
- toda linha que elas adicionaram continua presente no topo da branch: #341 em
  `src/pages/KitBuilderPage.tsx` (6/6), `tests/hooks/useKitAutoSave.test.tsx` (57/57) e
  `src/hooks/useKitAutoSave.ts` (24/24 — a única linha que o comparador textual marcou,
  `retry, syncPersistedVersion, flushPending,`, existe no topo acrescida de
  `capturarSnapshotAtual`, ou seja superconjunto); #359 em `src/hooks/useSmartNavigation.ts`
  (10/10), com `src/pages/MockupGenerator.tsx` e `src/pages/SimuladorWizard.tsx`
  **byte a byte idênticos** (mesmo hash de blob).

**Estado em 19/11/2026, 02:35 UTC:** a **#361** entrou (`d53f9e8`) e a **#334** entrou
(`25214df`). Das seis PRs colapsadas, **cinco estão em produção**; falta a **#359**, atrás
da **#357**.

Conferência por linha das duas que entraram pela #334, contra `origin/main`:

| PR colapsada | arquivos | linhas presentes na `main` |
|---|---|---|
| #341 | `useKitAutoSave.ts`, `KitBuilderPage.tsx`, `useKitAutoSave.test.tsx` | **87/87** |
| #356 | `KitBuilderPage.tsx`, `kit-builder-guarda-saida.test.tsx` | **52/52** |

A única linha que o comparador textual marcou (`retry, syncPersistedVersion, flushPending,`)
existe na `main` acrescida de `capturarSnapshotAtual`, em `useKitAutoSave.ts:461` —
superconjunto, não falta.

Consequência operacional: as branches das pilhas de BI e de kit tiveram o conteúdo
confirmado na `main` e entram no portão de exclusão (seção abaixo). A branch
`claude/fix-voltar-pergunta-sem-motivo-261119-0310` **não** pode ser apagada: ela ainda é a
única cópia do que foi mergeado na #359.


`npx vitest run` com os 13 materializados sobre `origin/main`: **28 asserções falham,
1 passa**. Não entram na `main` como estão (CI vermelha); são **mapa de lacuna**, igual
aos 52 da `pr/119`, e cada um nomeia uma capacidade que falta:

| arquivo | o que ele cobra e a `main` não cumpre |
|---|---|
| `tests/components/bi/BIAiCopilot.context-availability.test.ts` | copiloto de BI tem de declarar contexto indisponível em vez de responder sobre o nada |
| `tests/components/bi/BIAiCopilot.sources-availability.test.tsx` | idem, para a lista de fontes |
| `tests/components/bi/BIBriefingMode.history-availability.test.ts` | briefing tem de dizer que o histórico não veio |
| `tests/components/bi/BIBriefingMode.sources-availability.test.tsx` | idem, para as fontes do briefing |
| `tests/components/bi/ClientCategoryRadar.industry-error.test.tsx` | esperava o texto "Dados incompletos" no radar de categoria |
| `tests/components/bi/ClientHealthHero.availability.test.tsx` | o cartão de saúde do cliente tem de ter estado de indisponibilidade |
| `tests/components/bi/ClientLookalikes.availability.test.tsx` | esperava erro explícito "CRM indisponível" |
| `tests/components/bi/ClientOverview360.availability.test.tsx` | esperava o texto "Histórico indisponível" |
| `tests/components/bi/ComparisonAvailability.test.tsx` | comparativo não pode renderizar rótulo vazio quando falta dado |
| `tests/components/bi/ExecutiveSummaryButton.availability.test.tsx` | o botão de resumo executivo tem de se desabilitar sem dado |
| `tests/components/bi/IndustryTrendingProducts.affinity-availability.test.tsx` | afinidade por setor tem de declarar ausência de dado |
| `tests/components/onboarding/OnboardingTour.escape.test.tsx` | o tour tem de ser diálogo acessível e fechar no `Escape` (o `vi.fn()` do fechamento não é chamado) |
| `tests/routes/app-router-parity.test.tsx` | paridade entre as rotas registradas e o roteador |

Os 11 primeiros são a **mesma regra de negócio** que as PRs #323 e #326 desta sessão já
aplicaram em dois pontos: nenhum número inventado, nenhum selo de "dado real" sobre
dado ausente. São, portanto, a continuação natural desse trabalho, não refugo.

Ficam recuperáveis porque a origem está escrita: `git show
origin/claude/fix-prod-cors-audit-261118-1034:<caminho>`. Os **13 entraram** pelas fatias
1 a 6 (PRs #346 a #352): 11 já na `main` pela **#361**, 2 na **#352**. Os **6 outros**
arquivos (conjunto distinto, ver "Os 6 restantes") estão na **#363** e na **#357**. A ref
só pode ser apagada quando **#352**, **#357** e **#363** estiverem na `main` e os 6
relatórios abaixo tiverem entrado.

### 6 relatórios de execução, só nessa ref

`docs/execucao/auditoria-planejamento-2026-10-16/achados-consolidados.json`,
`docs/execucao/auditoria-planejamento-2026-10-16/matriz-100-etapas.json`,
`docs/execucao/execucao-integrada-plano-2026-10-16.md`,
`docs/execucao/validacao-ci-observabilidade-2026-10-16.md`,
`docs/execucao/validacao-integrada-2026-10-18.md`,
`docs/execucao/validacao-lote-seguranca-concorrencia-2026-10-18.md`.

São evidência de execução de outro agente, sem dependência de código: entram por PR de
docs quando a fila abrir. Mesma ref de origem.

## Refs liberadas por verificação byte a byte

Esta seção só recebe ref cuja verificação está escrita e é reproduzível. Apagar
sem isto é o que o ledger existe para impedir.

### `claude/feat-modulos-edge-relatorios-261117-0950` (PR #292, fechada) — **LIBERADA em 19/11/2026**

Comparação feita com `git diff --diff-filter=A origin/main <branch>` e `diff`
arquivo a arquivo. Para ser reproduzível, os dois lados: branch
`claude/feat-modulos-edge-relatorios-261117-0950` e a `main` de 19/11/2026 — resolva os
SHAs com `git rev-parse origin/claude/feat-modulos-edge-relatorios-261117-0950` e
`git rev-parse origin/main`, porque a `main` avança. O resultado tem **uma exceção
esperada**, marcada na tabela: `TopCategoriesCard.tsx` aparece como ausente.

| arquivo | resultado |
|---|---|
| `supabase/functions/sicoob-document-ingest/registration-state.ts` | **idêntico byte a byte** ao da `main` |
| `supabase/functions/sicoob-document-ingest/registration-state.test.ts` | **idêntico byte a byte** ao da `main` |
| `supabase/functions/sicoob-document-ingest/index.ts` | a `main` é **superset**: o único delta é o campo `sha256` em `evidence`, que **só a `main` tem**. A branch é a versão *anterior* à migration `20261118130700`; aplicá-la hoje derrubaria 100% dos uploads de NF, XML e comprovante (a RPC levanta `22023` e a constraint `sicoob_document_registry_scan_evidence_sha256_match` recusa) |
| `src/components/intelligence/TopCategoriesCard.tsx` | único arquivo ausente da `main` — é a **exceção conhecida** desta comparação: quem rodar o `git diff --diff-filter=A` acima verá este arquivo listado (e o seu export ausente), e isso **não** é perda de trabalho. **Superado** por `TopProductFamiliesCard.tsx`: mesma fonte (`product_views`), mesma heurística (primeiro termo do nome), e melhor — recebe os dados por prop em vez de consultar dentro do cartão, e tem estados de erro e `onRetry` que o antigo não tinha |
| todos os demais | existem na `main` |

**Conclusão:** zero trabalho a recuperar. A máquina de estado que esta branch
carregava — `confirmed`/`rejected`/`unknown`, `isDefinitiveRpcRejection`,
`getDocumentCleanupPlan` e a preservação dos objetos quando o desfecho é
desconhecido — **está inteira na `main`**, e foi conferida linha a linha em
`supabase/functions/sicoob-document-ingest/index.ts:137-199`.

A mesma evidência foi publicada como comentário na própria PR #292, para
sobreviver independentemente deste arquivo. Os commits continuam acessíveis
pela PR mesmo depois de a branch ser apagada.

### `claude/feat-modulos-edge-recuperados-261117-0930` (PR #291, fechada) — **LIBERADA em 19/11/2026**

Método, nesta ordem:

1. **Arquivo ausente:** `git diff --name-only --diff-filter=A origin/main <branch>` → **0**. Nenhum arquivo existe só na branch.
2. **Símbolo ausente:** varri os **93 arquivos** de `src/` e `supabase/functions/` que diferem, extraí de cada versão da branch os símbolos exportados (`export function|const|class|interface|type`) e procurei cada um no arquivo correspondente da `main` → **0 ausências**.
3. **Fora de `src/` e `supabase/functions/`:** conferi um a um os arquivos de workflow e de script que diferem. As duas únicas linhas que pareciam exclusivas da branch não são:
   - `.github/workflows/deploy-sicoob-functions.yml` — `auth-integrity-check` **está** na allowlist da `main` (linha 55); a diferença era só a continuação de linha (`\`).
   - `scripts/db/apply-sicoob-migrations.mjs` — as contagens de RLS consolidada **estão** na `main` (linha 984), e numa forma **melhor**: `>= 222` em vez do `=== 222` da branch, que reprovaria no instante em que uma policy nova fosse criada.
4. **Amostragem de conteúdo:** onde a branch tem mais linhas, é a `main` que está à frente. Exemplo conferido: `src/components/cart/cart-company-options.ts` — a branch usa `selectCrm` genérico, que a política do portal passou a negar para `vendedor` e `agente`; a `main` usa `fetchQuoteDirectoryCompanies`, o contrato fechado. Aplicar a versão da branch deixaria o seletor de empresa do carrinho **vazio** justamente para esses papéis.

**Conclusão:** zero trabalho a recuperar. Evidência também publicada como comentário na própria PR #291.

## Varredura mecânica das 93 refs — e o que ela encontrou

Rodei, em 19/11/2026, a mesma verificação das duas refs liberadas acima sobre
**todas as 93 refs remotas**, em dois passos por ref:

1. `git diff --name-only --diff-filter=A origin/main <ref>` — arquivos que existem só na ref;
2. para cada arquivo que difere em `src/`, `supabase/functions/` e `scripts/`, extração dos símbolos exportados da versão da ref e busca de cada um no arquivo correspondente da `main`.

Resultado do passo 2 em **todas** as refs: **zero símbolos exportados ausentes
da `main`**. Nenhuma função, constante, classe, interface ou tipo exportado por
qualquer branch deixou de existir na `main`.

Sobrou o passo 1: **960 pares ref/arquivo**, que se concentram em pouquíssimos
arquivos distintos. Classifiquei cada um:

| arquivo ausente da `main` | em quantas refs | veredito |
|---|---|---|
| `src/components/intelligence/TopCategoriesCard.tsx` | 55 | **superado** por `TopProductFamiliesCard.tsx` — mesma fonte (`product_views`), mesma heurística, e com estados de erro e `onRetry` que o antigo não tinha |
| `graphify-out/*` (8 arquivos) | 18 | **não é trabalho**: grafo gerado, que o `AGENTS.md` declara fora do Git ("cada clone gera o seu") |
| `supabase/.temp/cli-latest` | 21 | **não é trabalho**: arquivo temporário do CLI |
| `src/types/jspdf-autotable.d.ts` | 21 | **obsoleto**: declarava `doc.lastAutoTable`, padrão que a `main` não usa — ela chama `autoTable(doc, …)` e o pacote v5 traz os próprios tipos. `npm run typecheck` passa sem ele |
| `.env.production` | 8 | **não recuperar**: `.env*` não se commita (`AGENTS.md`). Conferi o conteúdo: só variáveis `VITE_*`, que o próprio `AGENTS.md` define como públicas (URL, publishable key, anon key, project id). Não há segredo exposto — mas o arquivo sai junto com as refs |
| `src/components/orders/InvoicePaymentPanel.tsx` | 10 | **nunca foi ligado**: `git grep` na própria branch de origem mostra que nada importa esse componente, nem lá. A capacidade existe na `main` por outro caminho (`OrderInvoicesManager`, `OrderInvoicesTab`, `OrderLogisticsTab`, `FinancialPanel`) |
| `src/hooks/useSupplierTrust.ts` | 7 | **não recuperar**, decisão já registrada em `branches.md`: o hook cai em `getMockSupplierTrust` em todo caminho de erro e inventa `avgRating`. O que valia dele — o prazo de entrega real — entra pela PR #323 |
| `tests/components/bi/*`, `tests/lib/sicoob/*`, `tests/hooks/usePaBudget`, `tests/edge-functions/*`, `tests/security/portal-access-policy` | 4 a 6 cada | **em recuperação**: são os testes das PRs #343 e #346–#352 |
| `tests/stores/useNavigationGuardStore.test.ts` | 4 | pertence à UX Onda 1; o store equivalente da `main` é outro (`@/lib/overlay` + `GlobalConfirmDialog`), e a garantia foi recuperada em #306 e #357 |

**O que isso significa.** A pergunta "esta ref tem trabalho que a `main` não
tem?" está respondida mecanicamente para as 93: nenhuma tem símbolo exportado
exclusivo, e os arquivos exclusivos caem todos nas nove linhas acima. O que a
varredura **não** cobre, e por isso cada ref ainda precisa do olho humano antes
de sumir, é mudança *dentro* de uma função existente — foi exatamente assim que
o campo `sha256` da PR #292 apareceu, e ele era o detalhe que invertia o
veredito.

## Os 2 arquivos de código que sobraram — veredito de 19/11/2026

A varredura de arquivos ausentes reduziu 960 pares ref/arquivo a 9 arquivos distintos.
Sete já tinham veredito. Estes dois ficaram, e foram lidos na íntegra antes de decidir.

### `src/hooks/useSupplierTrust.ts` — **obsoleto, não recuperar**

117 linhas, vivo em `audit/revisao-plano-20260924`, importado por `ProductDetail.tsx`
naquela ref. O cabeçalho dele diz o que faz: *"Falls back to deterministic mock when no
real data is available"* — e chama `getMockSupplierTrust()` em **três** caminhos
(sem produto, sem variante, sem fonte de fornecedor). É exatamente o defeito que esta
recuperação passou a sessão inteira removendo: número fabricado apresentado como medido.

Prova de que não compila mais: `getMockSupplierTrust` **não existe na `main`**
(`git grep` em `origin/main -- src/` devolve só `SupplierTrustData` e o renderizador do
selo). O import do hook aponta para um símbolo que a `main` apagou.

A parte útil dele — ler prazo de entrega do catálogo — está na
[#323](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/323), com dado real e teste:
`supplierTrustFromProduct()` usa `leadTimeDays` do catálogo, e deixa `isVerified` e
`avgRating` de fora **de propósito**, porque o catálogo não tem homologação de fornecedor
nem avaliação de comprador — eram justamente os dois campos que o hook fabricava.
Isso encerra também a pendência do selo morto de `fix/sicoob-trust-data-20260924`.

### `src/components/orders/InvoicePaymentPanel.tsx` — **obsoleto, não recuperar**

48 linhas, vivo em `audit/revisao-plano-20260924` e **importado por ninguém, nem na
própria ref**. Dois problemas de fundo, não de estilo:

1. afirma `"Liberação financeira concluída para produção"` **incondicionalmente**, sem
   olhar nenhum campo do pedido — a mesma classe de mentira na tela;
2. lê `(order as any).invoice_number` e `(order as any).payment_status`, campos que não
   existem no tipo de pedido.

A `main` já tem o módulo de notas fiscais inteiro, com fonte real: `OrderInvoicesManager`,
`OrderInvoicesTab`, `useOrderInvoices` e `OrderService`. O painel órfão é estritamente
inferior.

## Portão de exclusão de branch (19/11/2026)

Conferência de todas as 95 refs remotas contra a `main`:

```
IDENTICAS A MAIN: 0 / 95
```

Esse `0 / 95` é a medida **estrita** de identidade byte a byte com a `main`, e ela é severa
de propósito: qualquer linha que a `main` depois melhorou faz a branch deixar de ser
idêntica. Não significa "nada foi incorporado" — significa que identidade byte a byte não
serve sozinha como portão. O que serve é o veredito por item, e é o que a tabela abaixo
registra.

**Estado em 19/11/2026, 05:25 UTC** (a tabela abaixo substitui a versão de 02:40 do mesmo
dia: a #315, a #361, a #363 e a #357 entraram na `main` entre uma medição e outra, e dizer
"pendente" sobre PR mergeada seria registro falso). O portão, grupo por grupo:

| grupo | condição | estado em 19/11/2026 05:25 UTC |
|---|---|---|
| as 4 da pilha de BI (`fix-bi-*`, `recover-bi-stack`) | **#361** entrar na `main` | **cumprida e executada** — #361 e #315 na `main`; as 4 refs apagadas, reversíveis por `refs/pull/<n>/head` |
| `claude/feat-atestado-preco-orcamento-261117-0905` (#290) | veredito escrito de cada item | **cumprida e executada** — ver "nada a recuperar" abaixo; ref apagada |
| as 2 do kit (`fix-kit-trava-concorrencia`, `fix-kit-fila-manual-autosave`) | **#334** entrar na `main` | **já apagadas pelo GitHub** no merge da #334 (`delete_branch_on_merge`). O conteúdo está na `main` — #341 87/87 e #356 52/52 linhas, conferido **antes** da exclusão |
| `fix-prod-cors-audit-261118-1034` | **#363** e **#357** entrarem | **cumprida** — as duas na `main`; medição de hoje na "Sétima varredura" abaixo |
| `fix-rls-allow-all`, `fix-hardening-banco-recuperado`, `infra-rpc-hub-operational-evidence` | conteúdo na `main` | **cumprida** — "Sétima varredura" abaixo |
| as demais `claude/*` com PR aberta | a PR correspondente entrar | pendente — #311, #323, #324, #325, #328 |
| refs pré-re-raiz sem PR | cada item da ref ter veredito escrito aqui — incorporado ou obsoleto justificado | pendente para as que ainda não foram medidas |

A última linha não é atalho: a regra central está em
[`docs/RECUPERACAO/README.md`](./README.md) e exige, para **toda** ref, que cada item
associado esteja incorporado ou tenha obsolescência justificada. A entrada da #315
publica os vereditos; ela não os substitui.

## Portão de exclusão medido nas 93 branches (19/11/2026)

Para **cada** branch remota: diff do merge-base com a `main`, e para cada linha que ela
acrescenta, verificação de que a linha existe na versão da `main` daquele arquivo.

Das 93, **5** passam de 95% das linhas presentes **e** não têm PR aberta. As outras 88
ficam: ou têm PR aberta (apagar destruiria trabalho não mergeado) ou têm conteúdo de
verdade fora da `main`. A medição é severa de propósito e tem um falso positivo conhecido:
**linha que a `main` depois melhorou conta como ausente** — por isso cada candidata passou
por conferência linha a linha, com um cético instruído a refutar a exclusão.

| branch | linhas na `main` | veredito | base |
|---|---|---|---|
| `claude/fix-bi-overview-historico-indisponivel-261118-2300` (#346) | 754/766 | **incorporada** | cético não conseguiu refutar: `comm -13` entre as listas de arquivos das duas pontas volta vazio (nenhum arquivo existe só na branch); 8 dos 12 arquivos são byte-idênticos à `main` |
| `claude/recover-bi-stack-261119-0230` (#360) | 2199/2205 | **incorporada** | cético: a branch é *estritamente mais pobre* — `git diff --name-status` dá 18 M + 11 D e **zero A**, e os 11 D são testes que a `main` tem e a branch não |
| `claude/fix-bi-comparador-fontes-261118-2345` (#348) | 1358/1363 | **incorporada** | 4 linhas superadas em `useClientHealthScore.ts` (`growthPct: 0` → `growthPct: null`; `availableWeight === 0` → `lacksDiagnosableHistory`, que também pega prospect sem compra) + a linha contestada abaixo |
| `claude/fix-bi-copiloto-briefing-261119-0030` (#350) | 2199/2205 | **incorporada** | idem, mais o filtro de `ClientLookalikes` que saiu do hook para `excluirJaComprados` |
| `claude/feat-atestado-preco-orcamento-261117-0905` (#290) | 2698/2792 | **nada a recuperar** | ver abaixo |

### A única linha contestada em todo o repositório

As branches #348, #350 e #360 traziam, em `src/hooks/bi/useClientsComparison.ts`:

```ts
seasonality: [Boolean(seas.isError), Boolean(seas.industryError), crm].some(Boolean),
```

A `main` tem só `seasonality: Boolean(seas.isError)`. Duas agentes independentes marcaram
isso como **perda**, seguindo a instrução de preferir "ausente" na dúvida. **Decidi contra
as duas**, pelo código: `useClientSeasonality.ts:171` faz
`const nextPeak = findNextPeak(topClient)`, e `topClient` é `pickTop(client, "quotesCount", 3)`
— as células **do próprio cliente**. `topIndustry` alimenta apenas `topIndustryMonths` e o
texto do insight, não o próximo pico.

Logo apagar a célula de sazonalidade porque o recorte **setorial** ou o CRM falharam
esconderia um número que foi medido no histórico do cliente — o pecado oposto, e igualmente
grave, ao de exibir número inventado. A `main` mantém o valor medido e **continua** avisando
a fonte caída com retry (`getFailedSources` usa `Boolean(seas.isError || seas.industryError)`).
Supersessão deliberada e documentada em comentário, não perda.

### `claude/feat-atestado-preco-orcamento-261117-0905` (#290): nada a recuperar

94 das 2792 linhas não casavam textualmente. Conferidas uma a uma, nos 7 arquivos:

| arquivo | o que eram as linhas | veredito |
|---|---|---|
| `scripts/db/.check-runtime-refs-allowlist.json` | 24/24 "ausentes" | artefato: a `main` tem as **mesmas 24 entradas** mais uma (`set_custom_kit_pinned`); difere só na indentação — e a **branch** está com encoding UTF-8 duplo corrompido, a `main` correto |
| `src/hooks/useQuoteBuilderState.ts` | 47/549 | artefato: mesmos 25 símbolos importados, só aspas e quebra de linha diferentes; a `main` importa um símbolo a mais (`buildQuoteDraftScope`) |
| `src/services/QuoteService.ts` | 3/198 | superada: a `main` busca **em lote** (`.in('quote_id', ids)`) em vez de por orçamento, mantendo a ordenação |
| `supabase/functions/quote-price-attestation/contract.ts` | 3/217 | superada: `allowedImages` na `main` agrega 6 fontes de imagem, a branch agregava menos |
| `supabase/functions/quote-price-attestation/index.ts` | 12/342 | artefato do desdobramento: a lógica está em `handler.ts` na `main`, em versão superconjunto |
| `supabase/migrations/20261117092000_quote_price_attestation_gate.sql` | 1/420 | a migration existe na `main` com **o mesmo nome**, 452 linhas (vs 420), com um predicado a mais |
| `tests/scenarios/sql/quote-atomic-save-fixture.sql` | 4/7 | superada: a `main` tem as mesmas 4 instruções em versão idempotente (`IF NOT EXISTS`, `ON CONFLICT`) |

**Nenhuma funcionalidade da #290 está fora da `main`.** A ref pode ser apagada junto com as
outras quatro, respeitando a regra do `README.md` (veredito escrito — este — mais a entrada
da #315).

## P0 do orçamento: resolvido em produção (19/11/2026, 02:30 UTC)

`quote-price-attestation` não existia no projeto (teto de edge functions do plano:
`402 entitlement_required / function.max_count`), e sem ela `QuoteService` não salvava nem
editava orçamento. A [#364](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/364)
passou a servir o atesto de dentro de `sicoob-kit-quote`, que já estava publicada.

Deploy: corrida [44444710505](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/44444710505).
`sicoob-kit-quote` **publicou** às 02:30:29; a corrida ficou vermelha **no último item** da
allowlist, `quote-price-attestation`, exatamente com o `402` do teto do plano. Vermelho
esperado, correção publicada.

Prova A/B contra produção, sem autenticação — duas camadas de auth diferentes respondendo
conforme o `op`:

| chamada | resposta | caminho que atendeu |
|---|---|---|
| `{"op":"price-attestation"}` | `401 {"error":"Token inválido"}` | atesto (`authenticateUser`) |
| `{"kitName":"controle","kitType":"montado"}` | `401 {"error":"Sessão inválida ou expirada."}` | kit (`userClient.auth.getUser`) |

Antes do deploy a **primeira** chamada devolvia a mensagem do fluxo de kit, ou seja o `op`
não era desviado. **NÃO VERIFICADO:** o salvamento ponta a ponta com sessão real de
vendedor — depende de credencial de usuário, que esta sessão não tem.

## Quarta varredura: rotas (19/11/2026)

As três varreduras anteriores olham arquivos, símbolos exportados e linhas. Nenhuma
pega uma **rota** sumida, porque rota vive dentro de arquivo: dá para perder
`/clientes/:id` sem nenhum arquivo sumir e sem nenhum símbolo deixar de ser exportado.

Varredura das 94 refs remotas contra a `main`, extraindo os caminhos de `src/routes/`
e de `src/App.tsx`:

```
rotas na main: 133
rotas presentes em alguma ref e ausentes da main: 0
```

O único candidato que apareceu, `/clientes/:id` em 4 refs antigas, é **falso positivo
do extrator**, não regressão: a `main` monta a rota em `src/App.tsx:145` como
`path={CLIENT_DETAIL_ROUTE}`, e o extrator só enxergava literais. Conferido abrindo o
arquivo.

O mesmo ponto cego existia no teste de paridade da [#352](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/352),
só que ao contrário: ele aceitava a constante como prova de publicação, então apagar o
`<Route>` de `App.tsx` o deixava verde. Corrigido na mesma PR — agora exige rota montada,
e falha com `expected [ '/clientes/:id' ] to deeply equal []` quando a montagem some.

**Saldo das quatro varreduras:** nenhum arquivo, símbolo exportado ou rota de outro agente
está fora da `main` sem veredito escrito.

## Quinta varredura: banco (19/11/2026)

As quatro anteriores conferem o repositório. Nenhuma responde à pergunta que importa para
o usuário final: **o código que está no ar encontra o banco que está no ar?** Uma RPC que
o front chama e que não existe no banco é funcionalidade perdida sem nenhum arquivo,
símbolo ou rota ter sumido.

Extração de toda chamada `.rpc("...")` em `src/` na `main`, conferida contra
`pg_proc`/`public` do projeto oficial `cfmzkthhgliqelozlmwu` (consulta somente leitura):

```
RPCs chamadas pelo front : 73
ausentes no banco        : 0
```

O método foi validado com controle: uma RPC inventada (`rpc_que_nao_existe_controle`)
entrou na mesma consulta e foi corretamente apontada como ausente, então o resultado zero
é medição e não falso silêncio.

Conferido no mesmo momento: `crm-db-bridge` responde em produção (`status 200`, 236 ms) —
a ponte com o CRM está viva, e é por isso que a ausência dela na allowlist de publicação
(PR #311) é um congelamento real, não um detalhe de configuração.

**Saldo das cinco varreduras:** nenhum arquivo, símbolo exportado, rota ou função de banco
de outro agente está fora da `main` sem veredito escrito.

## Sexta varredura: o que está no ar (19/11/2026) — achou um P0

A quinta conferiu RPCs. Esta conferiu **edge functions**: as 61 que o front chama na `main`,
todas com fonte no repositório, pingadas no projeto oficial.

```
edge functions chamadas pelo front : 61
com fonte no repositório           : 61
não publicadas                     :  1  → quote-price-attestation (404)
```

404 aqui é "não publicada", não "rota errada": a função devolve `405` para GET quando está
no ar (`index.ts:220`). Foi a única das 61 a devolver 404; as outras testadas devolveram 200.

**Impacto:** `requestQuotePriceAttestation` (`src/services/QuoteService.ts:258`) **lança
exceção** quando a invocação falha, e é chamada antes de salvar nos dois caminhos —
`QuoteService.ts:381` (criar) e `:428` (editar). Sem a função no ar, **salvar e editar
orçamento estavam quebrados em produção**, com a mensagem "Não foi possível validar os
preços do orçamento."

**Causa:** a PR #317 entrou na `main` às 22:42 de 18/11 já com `quote-price-attestation` na
allowlist de publicação (linha 56 do `deploy-sicoob-functions.yml`). O último dispatch de
`Publicar funções Sicoob` tinha sido às 21:33 — **antes**. A Vercel publica a `main`
sozinha; o deploy de edge function é manual. O front passou a exigir uma função que ninguém
mandou subir.

**Ação e o que ela revelou:** dispatch de `deploy-sicoob-functions.yml` em 19/11 01:20
([run 44436096498](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/44436096498)).
13 das 14 funções publicaram; a 14ª, que é **nova** (criação, não atualização), parou em:

```
unexpected create function status 402: {"message":"Max number of functions reached for project",
  "error":{"code":"entitlement_required","feature":"function.max_count"}}
```

Ou seja, **não era esquecimento de dispatch**: o projeto Supabase bateu o teto de edge
functions do plano. O dispatch de 21:33 também teria falhado. O bloqueio é de plano, e
continua de pé.

As três saídas — subir o plano (custo), apagar uma função morta para liberar vaga (deleção
em produção, e exige token `sbp_` para listar e evidenciar qual está sem uso), ou voltar o
front ao caminho sem atestado (regressão de segurança: o preço volta a poder ser forjado no
cliente) — são todas decisão do dono. Registradas na
[#317](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/317#issuecomment-6996753511).

**Regra que fica:** merge de PR que adiciona edge function **não publica nada**, e a
allowlist não garante vaga no plano. A allowlist
diz o que *pode* subir, não o que subiu. Depois de cada merge desse tipo, o dispatch é
obrigatório — e o ping é a única prova de que subiu.

Isto também mostra por que a varredura de branch, sozinha, não basta: este trabalho não
estava perdido em branch nenhuma. Estava na `main`, mergeado, com teste, e mesmo assim fora
do ar.

## Sétima varredura: as 4 últimas branches contabilizadas (19/11/2026)

Fecha o portão de exclusão sobre as 4 refs que ainda tinham conteúdo fora da `main`
e nenhuma PR aberta. Todas as 4 têm PR **fechada** com `refs/pull/<n>/head` preservado
pelo GitHub — apagar a branch é reversível, a medida abaixo é que decide.

| ref | PR | o que ela tem | onde está na `main` | veredito |
|---|---|---|---|---|
| `claude/fix-rls-allow-all-261117-0844` | [#286](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/286) | `20260929134200_drop_allow_all_permissive_policies.sql` (23 linhas) | `20261118130500_block_permissive_allow_all_policies.sql` | **superconjunto na `main`** — apagar |
| `claude/infra-rpc-hub-operational-evidence-261117-1640` | [#298](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/298) | `20261117164000_add_connections_hub_operational_evidence.sql` (62 linhas) | absorvida em `20261118130000_harden_storage_and_public_favorites_acl.sql:178-244` | **superconjunto na `main`** — apagar |
| `claude/fix-hardening-banco-recuperado-261117-0847` | [#288](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/288) | 4 migrations de endurecimento (1.010 linhas) | as 4 renumeradas para `2026111813xx_*`, mesma ordem | **superconjunto na `main`** — apagar |
| `claude/fix-prod-cors-audit-261118-1034` | [#308](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/308), [#318](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/318) | ponta da árvore de produção pré-re-raiz; **115 arquivos** ainda fora da `main` | os 115 citados no ledger com veredito (medição abaixo) | **contabilizada** — apagar |

### Por que "superconjunto" e não "idêntico"

As quatro migrations de #288 e a de #286 **não** batem byte a byte com as da `main`, e isso
é deliberado — a versão da `main` é a corrigida:

- `harden_storage_and_public_favorites_acl`: a da branch repetia o DELETE antigo
  (`owner = auth.uid() OR <escopo>`). Em 06/11/2026 a `main` estreitou esse DELETE
  (`20261106200300_restrict_proposals_delete_scope.sql`). Trazer o arquivo da branch
  **devolveria** a quem subiu o PDF o poder de apagá-lo depois de perder o escopo do
  orçamento. A da `main` usa só o escopo e a asserção final cobra a ausência de `owner`.
- `harden_access_blocked_log_and_marketing_view_acl`: a da branch **abortava** — o preflight
  exigia uma policy administrativa de SELECT que o banco oficial não tem. A da `main` cria
  essa policy com helper semântico.
- `drop_allow_all_permissive_policies`: a da branch abortava com `42P01` —
  `public.categories`, `suppliers` e `products` não existem mais, e `DROP POLICY IF EXISTS`
  tolera policy ausente, não relação ausente. A da `main` guarda cada DROP com `to_regclass`
  e **acrescenta uma catraca** que falha se qualquer policy `FOR ALL USING (true)` para
  PUBLIC/anon/authenticated voltar a aparecer em `public`.
- `get_connections_hub_operational_evidence`: a da `main` é `STABLE`, exige também
  `cron.job_run_details`, e filtra pelos 2 cron jobs e 4 triggers que o **único** consumidor
  lê (`supabase/functions/connections-hub-audit/index.ts:55-65`). Devolver tudo, como a da
  branch, não entregava nada a mais a quem consome.

### Os 115 arquivos da branch de produção, medidos hoje

`comm -23` entre a árvore da ref e a da `main` devolve **115 caminhos**. Passando cada um
por `grep -rF` em `docs/RECUPERACAO/`, `docs/agentes/` e `PENDENCIAS.md`, **111 já tinham
veredito escrito** e 4 apareciam como não citados:
`20261016180000_harden_storage_and_public_favorites_acl.sql`,
`20261016190000_enable_scoped_business_realtime.sql`,
`20261016193000_pin_custom_kit_atomically.sql` e
`20261016201500_restore_view_invoker_and_notification_scope.sql`. São os **nomes antigos**
das migrations da PR #119: as quatro estão na `main` renumeradas para `2026111813xx_*`
(mesmo slug), e o ledger as cita pelo nome novo. Não citado ≠ não recuperado — a conferência
foi por slug, não por nome de arquivo. Com isso, **115/115 contabilizados**.

Um único arquivo da ref **não foi trazido**:
`tests/stores/useNavigationGuardStore.test.ts`, que exercita `useNavigationGuardStore` — um
store que a `main` não tem. Não por esquecimento: as três garantias existem na `main`, cada
uma em outro lugar, **todas com teste**.

1. registrar/remover escopo sujo com mensagem → `src/lib/navigation/dirty-registry.ts`
   (`declararEstadoDaRota`/`esquecerRota`/`mensagemDaRota`), coberta por
   `tests/lib/navigation/dirty-registry.test.ts`;
2. resposta antiga não pode resolver o pedido atual → `src/stores/useConfirmDialogStore.ts`,
   onde `ask()` numera cada pedido (`id: nextRequestId`) e `resolve(requestId, confirmed)`
   sai cedo se `pending.id !== requestId`; `ask()` ainda cancela o pedido anterior para não
   deixar Promise pendurada. Coberta por `tests/stores/useConfirmDialogStore.test.ts:34`
   ("uma resposta antiga não resolve um pedido concorrente") e `:25`;
3. `clearAll` no logout → `limparRegistroDeRotas()`, chamada de
   `src/contexts/AuthContext.tsx:289` e `:387`, coberta por
   `tests/hooks/useSmartNavigation.registro-sujo.test.tsx`.

> Correção de uma afirmação minha na primeira versão desta seção. Eu havia escrito que a
> garantia 2 "não se aplica", porque `performBackNavigation` usa `await askConfirm(...)`,
> uma chamada local. Errado: `askConfirm` delega ao store global, que tem pedido numerado e
> a guarda contra resposta obsoleta. A conclusão não muda — ela fica mais forte: o arquivo
> da ref não cobre nada que a `main` já não cubra. Apontado pela revisão da #365.

Os outros 18 estão na `main`, conferidos um a um com `git cat-file -e origin/main:<arquivo>`.

## Oitava varredura: as 62 refs restantes, uma a uma (19/11/2026)

A sétima varredura fechou o portão sobre 4 refs. Faltava o mesmo para o resto: **62 refs
remotas** (fora a `main`). Esta seção mede todas e dá base de certeza para cada uma.

### Classificação por estado de PR

| grupo | quantas | base da certeza |
|---|---|---|
| PR **mergeada** | 15 | o conteúdo está na `main` por definição do merge |
| PR **fechada sem merge** | 44 | **as 44 já tinham veredito escrito** neste ledger — conferido mecanicamente, por número de PR (`#N`, `pull/N`) e por nome de branch, sobre `docs/RECUPERACAO/`. Zero sem cobertura |
| **sem PR nenhuma** | 3 | nenhum veredito por número de PR as alcançaria; resolvidas abaixo |

### As 3 sem PR — o buraco que a classificação por PR não cobria

| ref | medida | veredito |
|---|---|---|
| `contexto` | 815 arquivos exclusivos, todos sob `docs/contexto/` | **infraestrutura, não se apaga** — regerada a cada 10 min por `contexto.yml`, citada no `AGENTS.md` |
| `computador_local` | **0 commits** e 0 arquivos fora da `main`; a ponta é um commit da própria `main` (#324) | espelho; nada a recuperar |
| `claude/feat-kpis-primeira-compra-retencao-261118-1800` | 1 commit órfão `feat(clientes)`, nunca virou PR | **já na `main`, com um bug dele corrigido** (abaixo) |

O commit órfão recuperava "Novos (Mês)" e "Taxa Retenção", removidos pela #314. A `main`
tem os dois (`primeiraCompraNoMes`, `retencaoPercentual` em
`src/hooks/useClientsPortfolioKpis.ts`) **e conserta dois defeitos da versão da branch**:

1. a consulta de histórico **não paginava**. Cliente com muitos pedidos ficava fora do teto
   de resposta do PostgREST e era contado como **primeira compra do mês** — número errado
   na tela do vendedor. A `main` tem `historicoDoLote` com paginação e parada antecipada;
2. `applySellerScope` vinha no **fim** da cadeia, onde `scripts/check-seller-scope.mjs` não
   enxerga que a consulta está sob escopo. Na `main` ele entra logo após o `.from(...)`.

### O que a medição de conteúdo mostrou — e o falso positivo que ela criou

`comm -23` entre cada árvore e a da `main` acusava 6 a 8 arquivos "exclusivos" em **quase
toda** branch, inclusive nas do dependabot e numa PR aberta minha. Não era trabalho perdido:
são os **6 arquivos da aprovação pública legada**, que a `main` removeu de propósito na
[#354](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/354).

Conferido que a remoção não custou funcionalidade: **nenhuma rota apontava** para
`PublicQuoteApprovalPage` antes da remoção (`git grep` em `fed706761^` sobre `src/routes/`
volta vazio), e o fluxo público vivo está em `src/routes/config/public.ts:45` —
`/approve/:token` → `QuoteApprovalPage`.

Descontados esses 6, as branches **pós-re-raiz** deixam só **3 arquivos** distintos fora da
`main`, todos resolvidos:

| arquivo | veredito |
|---|---|
| `src/components/intelligence/TopCategoriesCard.tsx` | removido de propósito em `c3834edc4` ("órfão substituído por `TopProductFamiliesCard`"); `git grep` confirma que **nada na `main` o importa** |
| `scripts/revisao/pendencias-2026-09-12.cenarios.tsx` | removido em `b391d84ec` ([#263](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/263)) |
| `20261106135500_fix_cleanup_old_notifications_drop.sql` e `20261117091000_pin_custom_kit_atomically.sql` | na `main` renumeradas, mesmo slug. A da `main` é **superconjunto**: a de `cleanup_old_notifications` acrescenta o `CREATE OR REPLACE` que preserva o hardening de ACL, ausente na da branch |

### Por que contagem de commit não serve para as refs antigas

`git rev-list --count origin/main..<ref>` devolve ~19.400 para 54 refs. Não são 19.400
commits perdidos: é a **re-raiz da `main`**. Essas refs não compartilham história com ela,
então toda a árvore conta como ausente — o mesmo motivo pelo qual `git diff origin/main...`
responde `no merge base`. Para elas, o que mede é conteúdo, e o veredito é o que este ledger
já registrava.

**Conclusão: 62 de 62 com base de certeza escrita.** Nenhuma ref restante contém trabalho
que não esteja na `main` ou que não tenha obsolescência justificada aqui.

### Conferência byte a byte: os 243 caminhos ausentes da `main`

A classificação por PR não basta sozinha, e a identidade de blob também não: `computador_local`
tem **0 commits** fora da `main` e ainda assim 6 blobs "fora", porque a `main` andou depois.
Hash de blob mede quanto a `main` evoluiu, não trabalho perdido.

O que mede é a **união dos caminhos** que não existem na `main`, sobre as 61 refs (fora
`contexto`, que é artefato gerado): **249 caminhos**, **243** descontando os 6 que a #354
removeu de propósito.

> **Correção de 19/11/2026, após revisão.** A primeira versão desta seção dizia "235 com
> cobertura (citados neste ledger, **ou** presentes na `main` com o mesmo nome ou slug)".
> Isso somava duas bases muito diferentes e dava a entender equivalência de conteúdo, que
> não foi o que se mediu. Comparando de fato — blob da ref contra a contraparte de mesmo
> nome na `main` — o resultado é:
>
> | resultado | quantos | o que significa |
> |---|---|---|
> | contraparte de mesmo nome, **conteúdo diferente** | 17 | 9 são migrations renumeradas, já conferidas byte a byte aqui: a da `main` é superconjunto. O resto são falsos pares do casamento por nome (`graphify-out/README.md` × `docs/README.md`) |
> | contraparte de mesmo nome, **conteúdo idêntico** | **0** | nenhuma ref tem arquivo igual ao da `main` — a `main` evoluiu em todos |
> | **sem contraparte** na `main` | 172 | não há o que comparar; a base é o veredito escrito, não conteúdo |
>
> Dos 172 sem contraparte, **100 são arquivos de teste**. Destes, **95 têm veredito citado
> neste ledger**, escrito pelas ondas de recuperação anteriores, e **5 não tinham** — são
> exatamente os 5 da tabela abaixo. Dois deles viraram correção
> ([#369](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/369) e
> [#370](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/370)), o que diz algo sobre a
> taxa: amostrando 8 arquivos sem veredito, 2 eram buraco real.
>
> O que fica provado por conteúdo, portanto, são as 9 migrations. O resto se apoia em
> veredito escrito — que é o critério do `README.md` desta pasta, mas **não** é a mesma
> coisa que comparação byte a byte, e este ledger não deve sugerir que seja.

Os **8 caminhos sem veredito algum**, um a um:

| arquivo | onde estava | veredito |
|---|---|---|
| `graphify-out/memory/query_*.md` | várias | artefato do graphify, fora do Git por `.gitignore` — não é trabalho |
| `docs/execucao/auditoria-planejamento-2026-10-13/inventario-repositorio.json` | idem | inventário gerado por script, regerável |
| `supabase/migrations/20261029102059_block_inactive_quote_status_retries.sql` | `fix/hermes-h247355-ci-dependencies` | **regra na `main`, em posição melhor** (abaixo) |
| `tests/hooks/useClientBI.no-fallback.test.ts` | `fix/hermes-h015416-dados-reais` | equivalente na `main`: `tests/hooks/bi/useClientBI.test.ts` |
| `tests/hooks/useClientSeasonality.no-fallback.test.ts` | idem | coberto pelas suítes de disponibilidade de BI (`BIAiCopilot.sources-availability`, `ExecutiveSummaryButton.availability`, `useClientHealthScore.diagnostico`) |
| `tests/hooks/useProductIntelligenceBadges.no-fallback.test.ts` | idem | equivalente na `main`: `tests/hooks/intelligence-badges.test.ts` |
| `tests/edge-functions/catalog-readonly-rpc.test.ts` | `fix/quote-price-authority-311333` | **era buraco real — recuperado** na [#370](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/370) |
| `tests/scripts/validate-e2e-supabase-target.test.ts` | `fix/hermes-bi-share-hardening-20261028` | **tinha 2 casos sem equivalente — recuperados** na [#369](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/369) |

**A migration do ator inativo.** A regra ("conta desativada não transiciona orçamento") está
na `main` em `20261030210000_require_active_actor_for_quote_status_retry.sql`, com o mesmo
`sicoob_actor_is_active` e o mesmo `ERRCODE 42501`. A diferença é onde a guarda entra: a da
branch ficava **dentro** do núcleo `..._core_20261013`; a da `main` fica no **invólucro**,
antes de chamá-lo, porque o núcleo pode retornar cedo quando o status pedido já está
confirmado. A posição da `main` também cobre quem chama o invólucro direto.

**O teste do catálogo somente leitura — eu havia fechado cedo demais.** Escrevi que
`tests/scenarios/catalogo-somente-leitura.mjs` era superconjunto, porque recusa `POST`,
`PUT`, `PATCH` e `DELETE` nas duas formas de chamada e ainda recusa redirecionamento
(32/32 passando). A revisão da #367 mostrou que isso é a camada de **transporte**, e o
arquivo perdido exercitava a de cima: `catalog.rpc(..., { get: true })`, a integração com
o `supabase-js`. Conferido: `grep -E "createClient|\.rpc\(|get: true"` naquele cenário
volta **vazio**.

Importa porque RPC no PostgREST é **POST por padrão** — só com `{ get: true }` o cliente
emite `GET`. Sem catraca nessa camada, um `get: true` esquecido faz o transporte barrar com
`CATALOG_READ_ONLY` e o catálogo parar, com o teste de transporte seguindo verde. E a falha
chega como **dado**, não como exceção: o `supabase-js` captura o erro do fetch e devolve em
`error`. Recuperado na [#370](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/370).

**O que a varredura devolveu ao sistema: dois buracos reais**, ambos em catraca de regra
escrita no `AGENTS.md`, ambos recuperados com prova de que travam.

1. **Destino de E2E** ("E2E/QA nunca aponta para o oficial nem para o catálogo"). A `main`
   não cobria **falha fechada por configuração ausente**, embora `scripts/e2e-target.mjs:22`
   recuse. Recuperado na #369 — removendo a checagem, caem os 5 casos.
   *Correção:* a primeira versão desta seção dizia "dois casos, incluindo endpoint sem
   HTTPS". O caso de HTTPS **já existia** na `main`, como `"endpoint sem TLS"`; eu procurei
   por "HTTPS" e não por "TLS" e acrescentei duplicata, removida depois da revisão.
2. **Catálogo somente leitura** ("NÃO escrever no catálogo externo"). A `main` cobria o
   transporte, não a integração com o `supabase-js`. Recuperado na #370 — liberando `POST`
   na guarda de `external-read-only.ts`, o caso cai.

Os dois saíram de uma amostra de 8 arquivos sem veredito. Taxa de 2 em 8 é o argumento
contra encerrar varredura por contagem.

### Veredito por ref — as 62, uma linha cada

A seção acima adjudica o conjunto: os **243 caminhos** ausentes da `main`, 235 com cobertura
e os 8 restantes um a um. Como os exclusivos de **toda** ref são subconjunto desses 243, cada
ref herda veredito da adjudicação — e aqui ela está escrita linha a linha, sem agregado.

A coluna "excl." é a contagem de caminhos daquela ref que não existem na `main`. Ela **não**
mede trabalho perdido: inclui os 6 que a #354 removeu de propósito e, nas refs pré-re-raiz,
a árvore anterior inteira. Serve para localizar, não para concluir.

| ref | PR(s) | estado | excl. | base da certeza |
|---|---|---|---|---|
| `audit/revisao-plano-20260924` | #31 | PR mergeada | 23 | conteúdo na `main` pelo merge |
| `audit/revisao-plano-20261001` | #85 | PR fechada sem merge | 21 | veredito escrito neste ledger |
| `claude/chore-typecheck-baseline-260929-1157` | #81 | PR fechada sem merge | 20 | veredito escrito neste ledger |
| `claude/ci-allowlist-crm-db-bridge-261118-1515` | #311 | PR aberta | 6 | em curso nesta sessão |
| `claude/feat-kpis-primeira-compra-retencao-261118-1800` | — | sem PR | 6 | veredito individual acima |
| `claude/fix-a028-migration-replay-261031-1541` | #192 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `claude/fix-a028-migration-replay-261106-1355` | #201 | PR fechada sem merge | 9 | veredito escrito neste ledger |
| `claude/fix-bi-selo-dado-real-261118-2025` | #326 | PR fechada sem merge | 6 | veredito escrito neste ledger |
| `claude/fix-drop-allow-all-rls-260929-1342` | #83 | PR fechada sem merge | 21 | veredito escrito neste ledger |
| `claude/fix-kanban-realtime-260929-0420` | #80 | PR fechada sem merge | 20 | veredito escrito neste ledger |
| `claude/fix-pin-kit-atomico-261117-0849` | #289 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `claude/fix-seller-scope-baseline-260929-1300` | #82 | PR fechada sem merge | 20 | veredito escrito neste ledger |
| `claude/fix-seller-scope-deno-260929-1445` | #84 | PR fechada sem merge | 20 | veredito escrito neste ledger |
| `claude/fix-storage-delete-proposals-261106-2007` | #209 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `claude/hopeful-mccarthy-8rqrqw` | #141, #139, #137, #136, #135, #134, #133, #132, #131, #130, #129, #126 | PR mergeada | 8 | conteúdo na `main` pelo merge |
| `claude/project-workflows-analysis-5n6hva` | #53 | PR mergeada | 20 | conteúdo na `main` pelo merge |
| `computador_local` | — | sem PR | 0 | veredito individual acima |
| `contexto` | — | sem PR | 815 | artefato gerado — **não se apaga** |
| `dependabot/github_actions/peter-evans/create-pull-request-8.1.3` | #283 | PR aberta | 6 | em curso nesta sessão |
| `dependabot/npm_and_yarn/development-all-ccf808f959` | #322 | PR aberta | 0 | em curso nesta sessão |
| `dependabot/npm_and_yarn/production-minor-patch-585bd01e94` | #281 | PR aberta | 6 | em curso nesta sessão |
| `devin/1791190000-ux-onda1` | #100 | PR fechada sem merge | 15 | veredito escrito neste ledger |
| `devin/1791201000-ux-onda2` | #101 | PR mergeada | 15 | conteúdo na `main` pelo merge |
| `docs/ci-status-309799` | #172 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `docs/hermes-1791891351-auditoria-planejamento` | #105 | PR fechada sem merge | 11 | veredito escrito neste ledger · contém 1 dos 8 adjudicados |
| `docs/hermes-h459513-branch-protection` | #188 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `docs/plano150-20260927` | #44 | PR mergeada | 21 | conteúdo na `main` pelo merge |
| `execucao/sicoob-20260911130857` | #7, #6, #5 | PR mergeada | 73 | conteúdo na `main` pelo merge |
| `feat/pdf-playwright-scripts-art-261108-0516` | #226 | PR mergeada | 8 | conteúdo na `main` pelo merge |
| `fix/ci-only-20261029` | #165 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/ci-workflows-h290325` | #164 | PR fechada sem merge | 10 | veredito escrito neste ledger |
| `fix/ci-workflows-h369570` | #176 | PR fechada sem merge | 18 | veredito escrito neste ledger |
| `fix/execucao-plano-20260928` | #74 | PR mergeada | 20 | conteúdo na `main` pelo merge |
| `fix/execucao-plano-final-20260928` | #75 | PR fechada sem merge | 20 | veredito escrito neste ledger |
| `fix/hermes-20261029-undici-cve` | #161 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-272703-ci-audit` | #158 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-61031-plan-lote` | #187 | PR fechada sem merge | 11 | veredito escrito neste ledger |
| `fix/hermes-bi-share-hardening-20261028` | #150 | PR fechada sem merge | 14 | veredito escrito neste ledger · contém 1 dos 8 adjudicados |
| `fix/hermes-docs-all-20261028` | #148 | PR fechada sem merge | 10 | veredito escrito neste ledger |
| `fix/hermes-h015416-dados-reais` | #112 | PR fechada sem merge | 55 | veredito escrito neste ledger |
| `fix/hermes-h097437-ci-workflows` | #145 | PR fechada sem merge | 9 | veredito escrito neste ledger |
| `fix/hermes-h164991-simulacao-final` | #119 | PR fechada sem merge | 115 | veredito escrito neste ledger |
| `fix/hermes-h206502-e2e-codeql` | #94 | PR fechada sem merge | 11 | veredito escrito neste ledger |
| `fix/hermes-h237459-sync-audit` | #154 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-h247355-ci-dependencies` | #157 | PR fechada sem merge | 25 | veredito escrito neste ledger · contém 4 dos 8 adjudicados |
| `fix/hermes-h275576-codeql-consistencia` | #160 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-h301937-e2e-hosted` | #97 | PR fechada sem merge | 11 | veredito escrito neste ledger |
| `fix/hermes-h393620-docs-audit-20261031` | #179 | PR fechada sem merge | 11 | veredito escrito neste ledger |
| `fix/hermes-h393620-inteligencia-real` | #178 | PR fechada sem merge | 11 | veredito escrito neste ledger |
| `fix/hermes-h423368-logistics-shipment-pagination` | #181 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-h425359-undici-security` | #182 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-h432507-npm-audit` | #185 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-revisao-scripts-261108-0604` | #228 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/hermes-sicoob-deploy-verification-20261028` | #149 | PR fechada sem merge | 8 | veredito escrito neste ledger |
| `fix/quote-price-authority-311333` | #175 | PR fechada sem merge | 11 | veredito escrito neste ledger · contém 1 dos 8 adjudicados |
| `fix/sicoob-aprovacao-legada-20260923` | #26 | PR mergeada | 17 | conteúdo na `main` pelo merge |
| `fix/sicoob-conclusao-20260922` | #18 | PR mergeada | 22 | conteúdo na `main` pelo merge |
| `fix/sicoob-csp-202635` | #27 | PR mergeada | 23 | conteúdo na `main` pelo merge |
| `fix/sicoob-intelligence-truth-20260924` | #36 | PR mergeada | 23 | conteúdo na `main` pelo merge |
| `fix/sicoob-p0-operacional-20260923` | #24 | PR mergeada | 16 | conteúdo na `main` pelo merge |
| `fix/sicoob-p0-seguranca-20260923` | #22 | PR mergeada | 24 | conteúdo na `main` pelo merge |
| `fix/sicoob-trust-data-20260924` | #34 | PR mergeada | 23 | conteúdo na `main` pelo merge |

**62 de 62 com veredito escrito.** As 4 refs apagadas em 19/11 (seção "Sétima varredura")
não aparecem aqui porque já não existem; o veredito delas está lá.
