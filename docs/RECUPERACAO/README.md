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

## O que falta, em ordem

1. **Métricas do Gestor de Compras (PR #157)** — capacidade inteira fora da `main`.
2. **Trava otimista e fila única no Kit Builder** — duas abas ainda se sobrescrevem em
   silêncio, e salvamento manual concorrente com autosave ainda pode criar dois kits iguais
   (`kit-builder.md`, lacunas 2, 3, 4, 10 e 12).
3. **Auditoria integral da PR #105** — 89 arquivos de diagnóstico, scripts de reprodução e SQL.
4. **Contrato de runtime das edge functions** (`edge-runtime-contract`, da PR #119) e a
   reconciliação `--verify-live`.
5. **`crm-db-bridge` na allowlist de publicação** (PR #311) — decisão do dono, toca workflow.

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
