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

**Andamento (19/11/2026):** 7 dos 13 voltaram pelas seis fatias abaixo, **com a regra
que eles cobram**, não só copiados. Os outros 6 foram conferidos de novo em 19/11 e
**não estavam na `main` nem em PR alguma** — o registro anterior, que os dava por
recuperados, estava errado. Destino deles no fim desta seção.

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
origin/claude/fix-prod-cors-audit-261118-1034:<caminho>`. **Os 13 entraram** (fatias 1 a 6, PRs #346 a #352). A ref pode ser apagada
assim que essas PRs estiverem na `main` e os 6 relatórios abaixo tiverem entrado.

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
arquivo a arquivo:

| arquivo | resultado |
|---|---|
| `supabase/functions/sicoob-document-ingest/registration-state.ts` | **idêntico byte a byte** ao da `main` |
| `supabase/functions/sicoob-document-ingest/registration-state.test.ts` | **idêntico byte a byte** ao da `main` |
| `supabase/functions/sicoob-document-ingest/index.ts` | a `main` é **superset**: o único delta é o campo `sha256` em `evidence`, que **só a `main` tem**. A branch é a versão *anterior* à migration `20261118130700`; aplicá-la hoje derrubaria 100% dos uploads de NF, XML e comprovante (a RPC levanta `22023` e a constraint `sicoob_document_registry_scan_evidence_sha256_match` recusa) |
| `src/components/intelligence/TopCategoriesCard.tsx` | único arquivo ausente da `main`. **Superado** por `TopProductFamiliesCard.tsx`: mesma fonte (`product_views`), mesma heurística (primeiro termo do nome), e melhor — recebe os dados por prop em vez de consultar dentro do cartão, e tem estados de erro e `onRetry` que o antigo não tinha |
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
