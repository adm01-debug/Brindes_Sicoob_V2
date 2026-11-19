# Ledger de recuperação — trabalho de agentes fora da `main`

Levantamento de 18/11/2026, **revisado no mesmo dia**. Mede, arquivo por arquivo, o que
existe nas branches e nas PRs fechadas sem merge e **não** existe na `main`, dá veredito a
cada uma e registra o que já voltou. É a condição para apagar qualquer branch ou PR.

## A regra

> **Nada é apagado sem estar neste documento com veredito.** Só pode ser apagado o que está
> marcado como incorporado à `main` (comparação por conteúdo, não por histórico) ou como
> obsoleto com a justificativa escrita. Trabalho parcial não é descartado: é terminado.

Por que comparação por conteúdo: a `main` foi **re-enraizada** em 11/11/2026. `git merge-base`
entre a `main` e as branches antigas volta vazio, e `git log` não prova incorporação nenhuma.
O que prova é comparar as árvores (`git ls-tree` + hash de blob) e ler o código dos dois lados.

**Nenhuma justificativa aqui é truncada.** A primeira versão deste documento resumia cada
veredito numa célula de tabela cortada com reticências — 52 delas. Veredito cortado não
sustenta exclusão. Agora cada item tem a justificativa inteira no anexo correspondente.

## Onde está cada coisa

| arquivo | o que traz |
|---|---|
| [`reauditoria.md`](reauditoria.md) | os 16 descartes derrubados na segunda rodada, um a um |
| [`branches.md`](branches.md) | veredito de cada branch sem PR, as 6 re-medidas pelos commits próprios e a prova das liberadas |
| [`prs.md`](prs.md) | as 32 PRs fechadas sem merge, com intenção, veredito e itens a recuperar |
| [`capacidades.md`](capacidades.md) | as 11 capacidades perdidas, com plano e crítica ao plano |
| [`kit-builder.md`](kit-builder.md) | as 13 lacunas de persistência do Kit Builder confirmadas contra a PR #119 |
| [`itens.md`](itens.md) | o inventário arquivo a arquivo: cada caminho fora da `main` e em quais refs aparece |
| [`testes-pr119.md`](testes-pr119.md) | a suíte de 106 arquivos da PR #119, executada contra a `main`: 8 entram sem mexer em `src/`, 52 são lacuna medida |
| [`cobertura-refs.md`](cobertura-refs.md) | as 89 branches remotas, uma por uma: onde está o veredito de cada e o que ainda falta nelas |
| [`evidencias.md`](evidencias.md) | a medição bruta e as refutações, sem corte |

## O que a segunda rodada mudou

Cada "nada a recuperar" foi entregue a um agente novo, **sem ver a justificativa original**,
com a instrução de derrubá-la. Onde o primeiro não achou nada, um segundo olhou de outro ângulo.

| medida | valor |
|---|---|
| descartes reauditados | 29 |
| **descartes derrubados** | **16** |
| descartes confirmados | 13 |
| branches re-medidas pelos commits próprios | 6 |
| perdas achadas nessas branches | 4 |
| lacunas do Kit Builder apontadas / confirmadas | 26 / 13 |

A primeira medição das branches comparava a árvore inteira contra a `main`, o que produz
ruído: branch antiga carrega milhares de arquivos da linhagem velha que nada têm a ver com o
trabalho dela. A segunda isola **só os commits que existem naquela branch e em mais nenhuma
ref**. Foi assim que apareceu a remoção do selo "dados ilustrativos" (`fix/sicoob-trust-data`),
que a primeira rodada deu como incorporada.

## Decisões revistas

**`docs/RUNBOOKS/CREDENTIAL_ROTATION.md` da `docs/plano150-20260927` não volta para a `main`.**
Eu tinha concluído o contrário. O arquivo é o runbook de incidente de **outro projeto**
(`adm01-debug/Promo_Gifts`, Supabase `allrjhkpuscmgbsnmjlv`, não o oficial
`cfmzkthhgliqelozlmwu`) e traz identificadores de credencial em texto puro — um webhook
Bitrix24 e um app OAuth. Este repositório é **público**. Trazê-lo para cá publicaria
credencial de outro sistema e substituiria a política de rotação correta que a `main` já tem.
O arquivo não é trabalho próprio daquela branch (veio do commit compartilhado `e5c13fb45`) e
continua existindo em outras cinco refs antigas: apagar a branch não o perde.

**A exposição de CORS era menor do que o achado dizia.** São 19 funções com curinga de
verdade, nenhuma na allowlist de publicação, e das 19 só 3 têm chamador no navegador — uma
delas a página pública de kit, onde o curinga é correto. O defeito real eram dois *fallbacks*
que abriam em vez de fechar (`external-db-bridge`, `mcp-server`), corrigidos na PR #328.

## O que já voltou nesta sessão

| PR | o que recupera |
|---|---|
| #305, #306 | migrations de RLS e a Onda 1 de UX (guardas de navegação) |
| #310 | intervalo do teste automático de conexões, que rodava de hora em hora |
| #313 | kit concluído volta a gravar status que o banco aceita; identidade do kit no autosave |
| #314 | KPIs da carteira de clientes medidos, não digitados |
| #316 | caminho de dado real do BI deixa de devolver categoria fictícia |
| #319 | fechar um diálogo deixa de limpar o formulário de mockup |
| #320 | chave `autoprefixer` duplicada no `package.json` |
| #321 | selo "dados ilustrativos" que nunca podia aparecer, removido |
| #323 | selo de prazo de entrega volta a aparecer, com o dado do catálogo |
| #324 | plano e motor do Copiloto "Sussurro" preservados antes de apagar 4 branches |
| #325 | "Atualizar template" deixa de apagar a categoria e reativar template desligado |
| #326 | BI deixa de carimbar "Dados reais" sobre número inventado |
| #327 | abrir um kit salvo deixa de regravá-lo no banco |
| #328 | fallback de CORS deixa de abrir para qualquer origem |
| #329 | catraca de skip crítico passa a cobrir os 23 cenários P0 de E2E |
| #330 | rota `/instalar` registrada e o convite de instalação do app volta a funcionar fora do cabeçalho |
| #331 | salvar orçamento deixa de manter o aviso de "alterações não salvas" |
| #332 | **mergeada** — indicadores reais do Gestor de Compras dentro da própria tela (PR #157) |
| #333 | SLA de aprovação em 24h medido do histórico, com recorte por cooperativa |
| #334 | trava otimista: duas abas no mesmo kit param de se sobrescrever em silêncio |
| #335 | contrato de runtime das edge functions ganha fiscal no CI (da PR #119) |
| #336 | auditoria de planejamento de 13/10 recuperada: 75 dos 87 arquivos da PR #105 |
| #337 | modelos de e-mail transacional da PR #4 preservados, sem o "enviado" falso |
| #338 | **mergeada** — Ctrl+K deixa de roubar o foco de quem está digitando |
| #339 | guarda do catálogo externo no E2E e caminhos de teste renomeados |
| #340 | três causas de falha de CI que só existiam nas PRs #149 e #158 |
| #341 | salvar durante o autosave de um kit novo para de criar dois kits |

## O que falta, em ordem

1. ~~**KPIs de primeira compra e retenção da carteira**~~ — **RESOLVIDO em 19/11/2026.**
   Este item estava desatualizado e mandava preservar uma ref cujo trabalho já havia
   entrado. Medido antes de corrigir: `origin/main:src/hooks/useClientsPortfolioKpis.ts`
   exporta `primeiraCompraNoMes` (`:41`) e `retencaoPercentual` (`:49`), calcula os dois
   (`:222` e `:226`), `src/pages/ClientsPage.tsx:53` e `:55` levam ambos à tela, e
   `tests/hooks/useClientsPortfolioKpis.test.ts` os cobre. A `main` está **à frente** da
   ref: tem uma guarda de paginação (`:156-185`) que a ref não tinha, contra contar como
   primeira compra o cliente cujos pedidos ficaram de fora da página.
   A ref foi arquivada em `arquivo/claude-feat-kpis-primeira-compra-retencao-261118-1800`
   e a branch, apagada — recuperável com
   `git fetch origin refs/tags/arquivo/claude-feat-kpis-primeira-compra-retencao-261118-1800`.
2. **Suíte de testes da PR #119** — triagem **executada** em 18/11/2026
   ([`testes-pr119.md`](testes-pr119.md)). A condição de exclusão da ref é **a lista fechada
   abaixo**, não "todos os arquivos da PR":
   - os **8 arquivos Vitest que passam contra a `main` como estão** (PR própria, sem tocar em
     `src/`);
   - os **3 cenários `.mjs` aprovados**: `manager-approval-delegation-route` como está, mais
     `access-log-marketing-acl` e `view-notification-hardening`, que só precisam do caminho
     corrigido da migration;
   - o cenário `business-realtime-contract` **junto da correção de uma linha** que ele cobre
     (`commonService.ts:18`, PR #342).

   Fora dessa lista, nada prende a ref: os **52 Vitest que falham** medem comportamento que a
   `main` não tem e ficam registrados como lacuna ligada a `capacidades.md` (recuperar o teste
   exige recuperar antes a capacidade, e é ela que fica na fila, não o arquivo);
   `edge-runtime-contract.test.mjs` fica **descartado como obsoleto** — o contrato foi
   reimplementado por outro caminho na PR #335 — e `critical-test-skips.scenario.mjs` também,
   porque a `main` já fiscaliza a mesma regra por `scripts/check-critical-test-skip-budget.mjs`.
   Os 7 simuladores `.py` exigem Docker, não rodam neste ambiente e seguem pendentes de
   medição, sem bloquear a ref.
3. **`crm-db-bridge` na allowlist de publicação** (PR #311) — decisão do dono, toca workflow.
4. **`WEBHOOK_DISPATCHER_SECRET`** — provisionamento pendente, bloqueado por classificador.
5. **13 testes de BI e o tour de onboarding da branch de produção pré-re-raiz** —
   `claude/fix-prod-cors-audit-261118-1034` tem 138 arquivos ausentes da `main`; 19 não
   estavam no ledger. Os 13 de teste foram executados contra a `main` (28 falham, 1 passa):
   cobram a mesma regra das PRs #323 e #326 — nenhum selo de dado real sobre dado ausente —
   em 11 pontos do BI que ninguém cobriu, mais `Escape` no tour e paridade de rotas. Lista,
   motivo de cada falha e comando de origem em [`cobertura-refs.md`](cobertura-refs.md).
   **A ref não se apaga enquanto esses 13 não entrarem ou não forem declarados obsoletos.**
6. **`connections-auto-test` divergente em produção** — fora da allowlist de publicação,
   sem PR (`RELATORIO_CI.md`, item 4.1).

Saíram desta lista por terem PR aberta ou mergeada: métricas do Gestor de Compras (#332
mergeada, #333), trava otimista e fila única do Kit Builder (#327, #334, #341), auditoria da
PR #105 (#336) e contrato de runtime das edge functions (#335).

## Quando uma branch pode ser apagada

Só quando **todos** os itens que a citam neste documento estiverem com PR **mergeada**, ou
marcados obsoletos com a justificativa escrita. Enquanto houver item pendente, a branch fica.

`origin/contexto` **não** se apaga em nenhuma hipótese: é a branch de contexto gerado,
regerada a cada 10 minutos pelo `contexto.yml` e lida pelos agentes
(`docs/agentes/contexto-ia.md`).

## Como atualizar este documento

1. Toda recuperação entra com o número da PR na seção do item correspondente.
2. Branch só sai da lista quando a PR que recupera o trabalho dela estiver **mergeada**
   (não aberta, não aprovada: mergeada).
3. Veredito novo exige a mesma prova dos outros: comparação por conteúdo e leitura dos dois
   lados, com arquivo e linha. Branch, commit e PR não provam nada.
4. Nenhuma justificativa pode ser truncada. Se não couber na tabela, vai para o anexo do item.
