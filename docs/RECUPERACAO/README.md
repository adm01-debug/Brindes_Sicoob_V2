# Ledger de recuperação — trabalho de agentes fora da `main`

Levantamento de 18/11/2026. Mede, arquivo por arquivo, o que existe nas branches e nas
PRs fechadas sem merge e **não** existe na `main`, dá veredito a cada uma e registra o que
já voltou. É a condição para apagar qualquer branch ou PR.

## A regra

> **Nada é apagado sem estar nesta tabela com veredito.** Só pode ser apagado o que está
> marcado como incorporado à `main` (comparação por conteúdo, não por histórico) ou como
> obsoleto com a justificativa escrita. Trabalho parcial não é descartado: é terminado.

Por que comparação por conteúdo: a `main` foi **re-enraizada** em 11/11/2026. `git merge-base`
entre a `main` e as branches antigas volta vazio, e `git log` não prova incorporação nenhuma.
O que prova é comparar as árvores (`git ls-tree` + hash de blob) e ler o código dos dois lados.

## Contabilidade, medida hoje

| medida | valor | como foi medido |
|---|---|---|
| arquivos na `main` | 4.381 | `git ls-tree -r --name-only origin/main` |
| branches remotas | 74 | `git ls-remote --heads origin` |
| PRs fechadas sem merge | 76 | GraphQL, `states: CLOSED`, `merged: false` |
| arquivos fora da `main`, união de todas as fechadas | 486 | união das árvores menos a `main`, descontado ruído (`graphify-out/`, `supabase/.temp/`, `public/reports/`, `.env*`) |
| idem, descontando dependabot e as PRs desta sessão | **480** | 24 PRs de dependabot e 7 minhas não entram |
| desses, em PR já auditada byte a byte | **331** | as 32 PRs da varredura |
| desses, em PR fechada sem auditoria dedicada | **149** | 11 PRs, todas cobertas pela auditoria de capacidades (abaixo) |
| itens catalogados para recuperar | **122** | 82 das PRs + 14 resgatados pela refutação + 26 das branches |

Script da contabilidade: a medição acima é reproduzível com `git ls-tree` por ref; o
inventário por arquivo (caminho → em quais PRs aparece) foi gerado nesta sessão e seus
números estão nesta tabela.

### As 11 PRs sem auditoria dedicada, e onde cada uma está coberta

| PR | arquivos fora da `main` | onde está coberta |
|---|---|---|
| #105 | 87 | 87 são `docs/execucao/`; os 2 de código são resíduo da linhagem antiga da `main` (`TopCategoriesCard.tsx` → reimplementado como `TopProductFamiliesCard.tsx`; `pendencias-2026-09-12.cenarios.tsx` → renomeado com `.test.tsx`, byte-idêntico) |
| #157 | 21 | capacidade "Métricas reais do Gestor de Compras" — veredito: a `main` resolveu melhor |
| #117, #118, #114, #116 | 10, 5, 2, 5 | capacidade "Copiloto Sussurro" — veredito: plano abandonado; **os documentos têm de ser preservados antes de apagar as branches** |
| #175 | 8 | recuperada na PR **#290**, aberta |
| #150 | 6 | capacidade "Hardening de bi-share-dossier e health-check" — ainda faz sentido |
| #100 | 4 | capacidade "UX Onda 1" — é o **superconjunto** da `devin/1791201000-ux-onda2`; parcialmente recuperada na #306 |
| #83 | 1 | recuperada na PR **#305** (migration que dropa as policies "Allow all") |
| #201 | 1 | superada pela migration `20260301000000` da `main` |

## As 74 branches remotas

| classe | quantas | o que fazer |
|---|---|---|
| de PR fechada sem merge | 45 | presas ao veredito da PR correspondente (tabela abaixo) |
| auditadas byte a byte, sem PR | 17 | veredito individual (tabela abaixo) |
| dependabot | 5 | somem com o merge ou o fechamento da PR; nada a recuperar |
| desta sessão | 6 | somem com o merge das PRs #310–#314 |

### Branches sem PR, veredito individual

| branch | veredito | pode apagar | itens | resumo |
|---|---|---|---|---|
| `audit/revisao-plano-20260924` | PARCIAL | **não** | 1 | Branch de auditoria documental: um único commit próprio (`0e028b5ee`, 24/09/2026, 27 arquivos, +21.598 linhas) que gerou a matriz de revisão dos planos (250 etapas, 1.000 requisitos, benchma… |
| `backup/local-rascunho-20261031` | PARCIAL | **não** | 1 | Não é uma branch de feature: é um snapshot da `main` local do dono em 31/10/2026, salvo antes de sincronizar com a `origin/main` (commit 3915d2c22, "backup: rascunho local da main ... pre-si… |
| `claude/project-workflows-analysis-5n6hva` | INCORPORADA | sim | 0 | Branch de 27/09/2026 (tip ee12961e7) que entregou um plano de 100 etapas para os workflows do GitHub Actions e 5 commits de correção de CI (ci, e2e, codeql, security, security-compliance, bu… |
| `computador_local` | INCORPORADA | sim | 0 | `computador_local` nao e uma branch de trabalho: e um ponteiro parado no tip da main de 17/11/2026 18:12 (commit #296, "assinar URLs de storage privado"). Nao contem nenhuma alteracao propri… |
| `devin/1791201000-ux-onda2` | PERDIDA | **não** | 8 | Onda 2 do pacote de UX de navegação: guarda unificada de "alterações não salvas" (store + diálogo global + useDirtyGuard), "voltar" que primeiro fecha o modal/menu aberto, menu de histórico … |
| `docs/plano150-20260927` | INCORPORADA | sim | 1 | Branch de documentação com um único commit próprio (f47e5d8e3, 27/09/2026) que criou o "Plano de correções e melhorias em 150 etapas" (plano.md/json, etapas.csv, rastreabilidade.csv, validac… |
| `execucao/sicoob-20260911130857` | PARCIAL | **não** | 1 | Snapshot de execucao de 13/09/2026 (tip 47c474a6, "fix(sicoob): corrige a migration de follow-up e os simuladores de QA") contendo o estado inteiro do produto naquela data — paginas monoliti… |
| `feat/pdf-playwright-scripts-art-261108-0516` | INCORPORADA | sim | 0 | Branch de 08/11/2026 (sem PR) cujo delta proprio sao 4 commits sobre 9 arquivos de scripts: implementar geracao real de PDF via Playwright em scripts/md-to-pdf-stub.mjs e "amaciar" exit code… |
| `fix/execucao-plano-20260928` | INCORPORADA | sim | 0 | Branch de execução do "plano de 150 etapas" (28/09/2026) que endureceu o salvamento de orçamentos (idempotência por chave + row_version otimista), isolou o rascunho de autosave por usuário, … |
| `fix/sicoob-aprovacao-legada-20260923` | PARCIAL | **não** | 3 | Branch sem PR (HEAD 792f5230c, 23/09/2026) que fez duas coisas: endureceu documentos/exportações do Sicoob (migration 20260923130000 + reescrita da edge `process-batch-export` com CSV/XLSX/P… |
| `fix/sicoob-conclusao-20260922` | PARCIAL | **não** | 2 | Não é branch de feature: é o TRONCO ANTIGO do repositório congelado em 22/09/2026 (19.207 commits), cujo último trabalho próprio foi tornar a aprovação pública de orçamento transacional e as… |
| `fix/sicoob-csp-202635` | INCORPORADA | sim | 1 | Branch de 23/09/2026 cujo trabalho proprio sao 2 commits: aplicar a Content-Security-Policy tambem na Vercel (novo vercel.json), alinhar a CSP do Cloudflare (public/_headers), criar o cenari… |
| `fix/sicoob-intelligence-truth-20260924` | PARCIAL | **não** | 1 | Branch de 24/09/2026 com 2 commits próprios que tiram dado falso da tela do produto: remove a confiança de fornecedor simulada por hash (`getMockSupplierTrust`, hook `useSupplierTrust`) e a … |
| `fix/sicoob-p0-operacional-20260923` | PARCIAL | **não** | 2 | Branch de hardening P0 de 23-24/09/2026 (snapshot da main antiga + 5 commits próprios): isolou documentos/exportações do pedido por RLS, trocou URL pública por URL assinada no download de ex… |
| `fix/sicoob-p0-seguranca-20260923` | PARCIAL | **não** | 2 | Branch é uma foto de 23/09/2026 que endureceu as operações internas Sicoob (guard de segredo interno nas edge functions, cron do worker de exportação só com Vault configurado, validação de c… |
| `fix/sicoob-trust-data-20260924` | INCORPORADA | sim | 0 | Branch de "verdade do dado" no catálogo: removeu o hook que fabricava selos de confiança do fornecedor (useSupplierTrust) e a inteligência ilustrativa dos badges da página de produto, trocan… |
| `contexto` | INCORPORADA | **não** | 0 | Branch de saída de máquina, não trabalho de agente: contém apenas o contexto para IA (snapshots do banco, inventário de código e regras de negócio) publicado automaticamente pelo workflow `.… |
Legenda do veredito: `INCORPORADA` = conteúdo está na `main`; `PARCIAL` = parte está,
parte não; `PERDIDA` = o que a branch entrega não existe na `main` sob nenhum nome.

**Podem ser apagadas agora** (veredito `INCORPORADA` e `pode apagar = sim`):
`claude/project-workflows-analysis-5n6hva`, `computador_local`,
`feat/pdf-playwright-scripts-art-261108-0516`, `fix/execucao-plano-20260928`,
`fix/sicoob-csp-202635`, `fix/sicoob-trust-data-20260924`, `docs/plano150-20260927`.

Duas dessas sete aparecem com 1 item na coluna: em `docs/plano150-20260927` o item é resíduo
da linhagem antiga da `main` (está em 247 refs, não se perde ao apagar a branch) e em
`fix/sicoob-csp-202635` é o tema global dos selos de confiança do fornecedor, rastreado em
`itens.md` com outras seis origens. Nenhum dos dois é trabalho próprio dessas branches.

`origin/contexto` **não** se apaga: é a branch de contexto gerado, regerada a cada 10
minutos pelo `contexto.yml` e lida pelos agentes (`docs/agentes/contexto-ia.md`).

## As 32 PRs fechadas sem merge, auditadas uma a uma

A coluna "refutada?" é o segundo passo: cada veredito de "nada a recuperar" foi entregue a
outro agente com a instrução de **derrubá-lo**. Quatro caíram — sem esse passo, essas PRs
seriam fechadas perdendo trabalho.

| PR | veredito | itens | refutada? | o que sustenta |
|---|---|---|---|---|
| #3 | NADA_A_RECUPERAR | 0 | não | Os 23 arquivos da PR estão na main. 22 deles são byte-idênticos (mesmo blob SHA). O único que difere, docs/pesquisa/2026-09-11/README.md, está na main em versão estritamente mais nova: a main acrescen… |
| #4 | NADA_A_RECUPERAR | 0 | não | Os 13 arquivos da PR estão todos na main, e nos dois únicos que divergem a main é superconjunto estrito. (1) `git diff --name-only d75459d2 pr/4 / wc -l` = 13, zero fora de `docs/plano-implementacao/`… |
| #75 | NADA_A_RECUPERAR | 0 | não | Os 49 arquivos caem em três grupos, todos verificados por conteúdo: (1) 7 idênticos à main; (2) a parte substantiva (reconciliação de contratos, idempotência de recompra, allowlist/ledger de migration… |
| #80 | NADA_A_RECUPERAR | 0 | não | Os 3 arquivos da PR já estão cobertos ou são obsoletos. (1) `src/hooks/useRealtimeSync.ts`: a main implementou o MESMO fix com a mesma técnica e foi além — `const instanceId = useId()` (origin/main:sr… |
| #81 | NADA_A_RECUPERAR | 0 | não | A PR tem exatamente 1 arquivo e 1 commit. `git diff --numstat 0984d364572c6123b188d53b98dd58ce387242f9 pr/81` devolve só `17 15 .typecheck-baseline.json`, e `git diff --name-only` confirma que nenhum … |
| #82 | NADA_A_RECUPERAR | 0 | não | A PR #82 é 100% supressão de checker estático — nenhuma linha de lógica de negócio, UI, RLS, migration ou edge. Os três mecanismos que ela mexia já estão resolvidos na main, por caminhos diferentes e … |
| #84 | NADA_A_RECUPERAR | 0 | não | A PR não entrega regra de negócio, UI, migration nem teste — é só anotação de gate, allowlist temporária e import map. Os três pontos estão resolvidos na main, de forma igual ou melhor: (1) a main tem… |
| #85 | NADA_A_RECUPERAR | 0 | **sim** (+2) | Dos 30 arquivos da PR, 25 estão byte-idênticos na main (inclusive o relatório `docs/execucao/revisao-do-plano-2026-10-01.md`, as 105 linhas, e toda a matriz de evidências: `matriz-150.json/.csv/.md`, … |
| #94 | RECUPERAR | 3 | — | Dos 101 arquivos, 100 já estão na main com conteúdo igual ou mais evoluído — confirmado arquivo por arquivo comparando blobs (`git rev-parse origin/main:<f>` vs `pr/94:<f>`) e lendo o código. Sobraram… |
| #97 | NADA_A_RECUPERAR | 0 | **sim** (+5) | O diff proprio da PR e de 1 arquivo, 16 adicoes / 3 remocoes (`git diff --numstat a974d77 pr/97` → `16 3 .github/workflows/e2e.yml`), e cada uma das 4 mudancas de comportamento ja esta na main ou foi … |
| #112 | RECUPERAR | 22 | — | Confirmei lendo o código que a main ainda serve número inventado em tela de produção em pelo menos 6 lugares distintos, e que a maior parte do que já foi reivindicado por outras frentes (#291/#292/#29… |
| #119 | RECUPERAR | 24 | — | A #119 não é um lote homogêneo: ela misturava cinco frentes (contratos de segurança de edge/CRM, verdade do dado em BI e inteligência, guardas de navegação, catracas de CI e migrations). A frente de e… |
| #137 | NADA_A_RECUPERAR | 0 | **sim** (+1) | A PR toca 1 único arquivo, RELATORIO_CI.md (`git diff --numstat e4bfa015 pr/137` → `28 7 RELATORIO_CI.md`; `git diff --stat ... -- PENDENCIAS.md` vazio, blob idêntico `f723111e`). Não há código, migra… |
| #145 | RECUPERAR | 9 | — | A PR #145 era anunciada como 'dependências vulneráveis e gates de CI', e nessa parte ela é quase toda obsoleta: a main já está em zod ^4.6.7, já resolve undici 8.12.3, já usa um SHA mais novo do codeq… |
| #148 | RECUPERAR | 2 | — | A quase totalidade da PR é obsoleta: a main já tem zod 4.6.7 e undici 8.12.3 (`origin/main:package.json:217`, `origin/main:package-lock.json:13446`), já alinhou os três passos do CodeQL no mesmo SHA 3… |
| #149 | NADA_A_RECUPERAR | 0 | não | Os 4 arquivos da PR estão cobertos ou superados. (a) O gate do deploy foi reimplementado na main com outro nome — saiu do shell inline para scripts/ci/verify-supabase-functions-published.mjs — e conté… |
| #154 | NADA_A_RECUPERAR | 0 | **sim** (+6) | A PR só adiciona texto (88 linhas em `PENDENCIAS.md`, 74 em `RELATORIO_CI.md`; `git diff --numstat e9d5902 pr/154` = `88 1 PENDENCIAS.md` / `74 0 RELATORIO_CI.md`; a única remoção é a linha de data). … |
| #158 | NADA_A_RECUPERAR | 0 | não | A PR toca exatamente 2 arquivos, ambos Markdown de estado efêmero de CI (`git diff --name-status e9d5902 pr/158` → `M PENDENCIAS.md`, `M RELATORIO_CI.md`; os 5 commits são todos `docs(ci):`). Nenhum a… |
| #160 | NADA_A_RECUPERAR | 0 | não | A PR tocava 1 arquivo e 2 linhas, ambas apenas o SHA de `github/codeql-action/autobuild` e `/analyze` (`git diff --numstat e9d5902 pr/160` → `2 2 .github/workflows/codeql.yml`). A main já não tem a di… |
| #161 | NADA_A_RECUPERAR | 0 | não | Os 10 arquivos da PR se dividem em três grupos, todos já resolvidos na main: (1) o código (zod v4 + adaptações) está idêntico na main; (2) os 3 workflows foram reimplementados na main de forma estrita… |
| #164 | RECUPERAR | 1 | — | A main nao herdou esta PR, mas re-resolveu quase tudo dela por outro caminho e de forma mais forte: (a) o isolamento do destino E2E virou scripts/e2e-target.mjs + scripts/validate-e2e-target.mjs, com … |
| #165 | NADA_A_RECUPERAR | 0 | não | Os dois únicos arquivos da PR foram superados pela main, cada um por uma razão diferente, e nenhuma linha da PR carrega comportamento que a main não tenha. 1) `.github/workflows/codeql.yml` — a PR ali… |
| #172 | NADA_A_RECUPERAR | 0 | não | PR #172 nao contem uma linha de codigo, workflow, migration, teste ou script — apenas 69 linhas adicionadas em dois relatorios de status (PENDENCIAS.md e RELATORIO_CI.md), datadas 29/10/2026. A main c… |
| #176 | RECUPERAR | 9 | — | O bloco de CI/CD está genuinamente obsoleto: a main evoluiu além dele (environment `e2e-qa` com `E2E_SUPABASE_*` + `scripts/validate-e2e-target.mjs`, `continue-on-error` já removido, CodeQL em pin mai… |
| #178 | RECUPERAR | 8 | — | A parte de "métricas fictícias" (front) já está na main na íntegra e é obsoleta. Mas sobraram 5 itens reais, todos verificados linha a linha na main: (1) o workflow de publicação de edge functions não… |
| #179 | RECUPERAR | 2 | — | Dos 29 arquivos, a esmagadora maioria já está na main (reformatada por prettier, o que derrubou o cov% da heurística) ou foi superada por implementação melhor. Confirmei lendo o código: todo o bloco d… |
| #181 | RECUPERAR | 1 | — | O núcleo da PR já está na main, reimplementado com outro nome: `listShipmentsByOrderIds` (pr/181) virou `listShipmentsForOrders` na main, com a mesma constante `SHIPMENT_ORDER_ID_BATCH_SIZE = 200`, o … |
| #182 | NADA_A_RECUPERAR | 0 | não | Os três objetivos da PR já estão na main, por conteúdo: (1) `package-lock.json` da main traz `undici` 8.12.3 com a mesma integridade `sha512-+fdndUTwBP86...` que a PR propunha (origin/main:package-loc… |
| #185 | NADA_A_RECUPERAR | 0 | não | Os 6 arquivos da PR estão cobertos: os 3 arquivos de código são byte-a-byte idênticos à main; os dois bumps de dependência estão na main exatamente nas mesmas versões (`zod ^4.6.7`, `@hookform/resolve… |
| #187 | RECUPERAR | 1 | — | Os dois entregáveis principais já estão na main, e melhores: o estado de erro do histórico de orçamento existe em `src/components/quotes/QuoteHistoryTimeline.tsx` (bloco `if (isError)`, `role="alert"`… |
| #209 | NADA_A_RECUPERAR | 0 | não | A PR #209 foi fechada porque foi refeita e mergeada como PR #212 (merge commit 55eaf6cfb024fba49f3646a8d13acaf1333b3524, 2026-11-07T16:50:29Z, mensagem: "fix(db): restringe DELETE do bucket proposals … |
| #228 | NADA_A_RECUPERAR | 0 | não | Os 5 arquivos são só de `scripts/revisao/` (diff total 21+/18−). Duas metades: (a) o guard de Docker gracioso (`simular-status-20260927.py` e `simular-pendencias-2026-09-12.py`) JÁ ESTÁ na main, idênt… |
## As 11 capacidades perdidas, com plano e crítica

| capacidade | existe na main | ainda faz sentido | esforço | ordem |
|---|---|---|---|---|
| UX Onda 1 e 2: guardas de navegação (bloqueio central de saída com alterações não salvas), confirmação unifica… | False | **sim** | grande | 2 |
| Métricas reais do Gestor de Compras (fim de métrica fictícia) — PR #157 | True | não | pequeno | 9 |
| kit-builder: persistencia e coordenador de concorrencia (pr/119) | False | **sim** | medio | 1 |
| Copiloto de vendas Sussurro (motor de análise e sugestões) — pr/116 + plano em pr/114, pr/117, pr/118 | False | não | pequeno | 9 |
| Scripts de QA e verificação de deploy perdidos (PRs #119, #112, #150, #157, #164, #179, #187) | False | **sim** | medio | 1 |
| Suíte de testes perdida nas ~20 PRs fechadas sem merge em 31/10/2026 (diagnóstico dizia 133 arquivos; são 122) | False | **sim** | grande | 1 |
| Hardening perdido: bi-share-dossier e health-check publico (PR #150) | True | **sim** | pequeno | 3 |
| sicoob-document-ingest: estado de registro (confirmed/rejected/unknown) e escape de ILIKE | False | **sim** | pequeno | 1 |
| Paginação de remessas logísticas e histórico de orçamento (PRs #181 e #187) | True | não | pequeno | 9 |
| Busca global, favoritos e cota de IA (PR #145 / branch origin/fix/hermes-h097437-ci-workflows) | False | **sim** | medio | 1 |
| Documentacao perdida em docs/ (diagnostico mecanico: 125 arquivos; contagem real: 118) | True | não | pequeno | 9 |
Duas foram **recusadas com evidência**, e isso também é resultado: "Métricas reais do Gestor
de Compras" (a `main` já não tem métrica fictícia ali e resolveu por outro caminho, melhor) e
"Copiloto Sussurro" (plano declaradamente não executado — o próprio documento diz "nenhuma
etapa foi executada"). Para o Sussurro a condição é explícita: **os 17 documentos de plano e
as ~760 linhas de motor precisam ser preservados em PR de documentação antes de as branches
`claude/fervent-carson-12ai3u`, `claude/feat-copilot-engine-261016-1542`,
`claude/docs-compliance-lgpd-261016-1541` e `claude/docs-cerebro-vendas-261016-1541` serem
apagadas.**

## Os 122 itens

Tabela completa, com impacto, tipo, o que falta e arquivos: [`itens.md`](itens.md).

Distribuição: **39 de impacto alto**, 41 médio, 25 baixo, 17 sem classificação.

O tema que mais aparece não é um só item: é **dado inventado apresentado como medição**.
Sete branches diferentes apontaram, de forma independente, os selos de confiança do
fornecedor alimentados por constante vazia na página de produto. E a varredura das PRs
encontrou o mesmo padrão em KPI de carteira, BI de cliente, health score, inteligência de
mercado, match de produtos, assistente de layout e estimativa de frete.

## Achados sistêmicos

1. **Produção esteve à frente do repositório em edge functions.** O `crm-db-bridge` publicado
   (v13, 15/10/2026) já tinha o contrato fechado `quote_directory` e a política que nega
   leitura genérica de CRM a `vendedor` e `agente`; a `main` não tinha nada disso. Consequência
   medida: os 13 consumidores de CRM do front ficaram vazios para esses papéis **desde 15/10**.
   A PR #154 já havia medido isso e criado a regra "preservar as versões publicadas que estão à
   frente da `main` antes de publicar" — a regra se perdeu com a PR.
2. **95 das 108 edge functions não têm caminho autorizado de publicação.** A allowlist do
   `deploy-sicoob-functions.yml` tem 13 nomes. Qualquer correção nas outras não chega a
   produção. A PR **#311** (aberta, decisão do dono) acrescenta o `crm-db-bridge`.
3. **O inventário que o `AGENTS.md` manda ler nunca foi gerado.** `inventario-estado-semanal.yml`
   tem 3 execuções, todas `startup_failure`; `inventario/estado/banco.json` não existe. Os
   agentes estão lendo estado estático de 10 dias atrás e os alertas de banco não existem.
4. **Duas suítes críticas de RLS estão permanentemente puladas.** `tests/rls/personas.test.ts`
   depende de `TEST_SELLER_PASSWORD`/`TEST_ADMIN_PASSWORD`, que não existem em workflow nenhum;
   `tests/rls/no-empty-rls-policies.test.ts` depende de `SUPABASE_SERVICE_ROLE_KEY`, que o
   `ci.yml` não define. São duas catracas verdes que não testam nada.
5. **O lockfile prende 57 pacotes a um registry privado de terceiro**
   (`europe-west1-npm.pkg.dev/lovable-core-prod/...`). Se esse host sair do ar, `npm ci` falha e
   nenhum deploy sai. Achado da PR #137, resgatado pela refutação.
6. **`migration-ledger-drift` está vermelho por motivo obsoleto** (baseline desatualizada,
   anterior à aplicação de 18/11), o que mascara drift real.

## O que já voltou nesta sessão

| PR | o que recuperou | estado |
|---|---|---|
| #305 | 8 migrations de segurança perdidas (de #119, #176, #83) e o destravamento do aplicador autorizado | mergeada e **aplicada** no banco |
| #306 | confirmação unificada no lugar dos 19 `window.confirm` (de #119/#100), mais devolução de foco | mergeada |
| #307 | destaque de kit como operação atômica no banco (de #119/#289) | mergeada |
| #309 | contrato fechado do CRM e migração dos 13 consumidores (de #119/#178/#179/#291) | mergeada |
| #312 | logout apaga o histórico de navegação que vazava entre vendedores (de `devin/…ux-onda2`) | mergeada |
| #310 | leitura do intervalo de auto-teste de 2 e 4 horas (achado de #291) | aberta, CI verde |
| #311 | `crm-db-bridge` na allowlist de publicação (de #112/#154) | **aberta, decisão do dono** |
| #313 | autosave do kit para de rebaixar o kit concluído e grava a identidade (de `…ux-onda2`) | aberta |
| #314 | KPIs de `/clientes` medidos em vez de digitados (de #112) | aberta |

## O que falta, em ordem

1. Tirar o mock do BI de cliente: número fictício de cliente real entra no Resumo Executivo e
   no PPTX enviado ao cliente. A infraestrutura de gate (`src/lib/bi/demoClient.ts`) já está na
   `main` e só 3 dos 10 consumidores foram migrados.
2. Religar os selos de confiança do fornecedor na página de produto — sete branches apontaram.
3. Preservar os documentos do Sussurro (condição para apagar 4 branches).
4. Os quatro achados de CI da PR #97 (gates que deixaram de rodar, `SKIP_E2E` pela metade,
   anotações inalcançáveis, cache do Playwright ausente no único job que roda em todo PR).
5. Repontar o lockfile para o registry público.
6. A suíte de testes perdida: 122 arquivos sob `tests/` que as PRs fechadas tinham.

## Como atualizar este documento

Ao recuperar um item, marque-o em [`itens.md`](itens.md) e mova a branch ou PR de origem para
"pode apagar" **somente** quando todos os seus itens estiverem marcados. Ao apagar, registre
aqui a data e o commit que incorporou o conteúdo.
