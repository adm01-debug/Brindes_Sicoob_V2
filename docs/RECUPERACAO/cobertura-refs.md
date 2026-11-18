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
origin/claude/fix-prod-cors-audit-261118-1034:<caminho>`. **A ref não se apaga enquanto
esses 13 não tiverem entrado ou sido declarados obsoletos com justificativa.**

### 6 relatórios de execução, só nessa ref

`docs/execucao/auditoria-planejamento-2026-10-16/achados-consolidados.json`,
`docs/execucao/auditoria-planejamento-2026-10-16/matriz-100-etapas.json`,
`docs/execucao/execucao-integrada-plano-2026-10-16.md`,
`docs/execucao/validacao-ci-observabilidade-2026-10-16.md`,
`docs/execucao/validacao-integrada-2026-10-18.md`,
`docs/execucao/validacao-lote-seguranca-concorrencia-2026-10-18.md`.

São evidência de execução de outro agente, sem dependência de código: entram por PR de
docs quando a fila abrir. Mesma ref de origem.
