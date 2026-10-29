# Pendências de CI — adm01-debug/Brindes_Sicoob_V2

## Correção adicional P034 — retry de status por ator inativo — 29/10/2026

- A leitura somente de funções do banco canônico encontrou que a RPC podia retornar id/status/row_version quando um vendedor desativado repetia o status já atual do orçamento. A operação não gravava, mas revelava dados do orçamento e contornava a validação de ator ativo no caminho idempotente.
- Reproduzido em PostgreSQL descartável; a nova migration candidata verifica ator ativo antes de consultar os IDs e revalida autorização/transição no retry. Cenários de ator inativo/ausente, quote removido, ator sem escopo, lote misto e conflito de versão passaram; retry autorizado mantém sem escrita nem incremento de versão.
- O banco canônico continua sem alterações. Migration e simulador estão apenas na worktree; não aplicar pela CLI nesta branch. A verificação transacional do executor agora também compara fonte, `SECURITY DEFINER`, `search_path` e ACL da função interna antes de confirmar o lote.
- Validação local completa: build e typecheck passaram; lint com 0 erros/872 avisos e gate sem regressão frente a `origin/main`; Vitest 5.877 passou/68 ignorados (baseline atual igual); `npm run test:scenarios` 226/226; `npm run check:npm-audit` sem vulnerabilidades; simuladores de governança, escopo e retry passaram; `--verify-files` confirmou o hash da allowlist.
- **Pendente:** concluir validações locais e CI da PR, revisão e fluxo autorizado em `main` antes da aplicação controlada. A migration não está no ledger canônico.
- E2E autenticado continua bloqueado até provisionar/configurar a homologação segregada que o usuário confirmou que fará. O check Copilot mantém bloqueio externo HTTP 402/quota já registrado.

### Checks remotos do commit `786fb404` — PR #157

| Workflow/check | Resultado e causa | Evidência |
|---|---|---|
| `Qualidade contínua` | ✅ `success`; suíte completa, cobertura, simulações PostgreSQL (incluindo retry por ator inativo) e build concluídos | [run 40858678038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858678038) |
| `Security Scan` / npm audit | ✅ `success` | [run 40858677961](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858677961) |
| `CodeQL` | ✅ `success` | [run 40858678051](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858678051) |
| `Lighthouse Performance Audit` | ✅ `success` | [run 40858677980](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858677980) |
| `Portal Sicoob` e `Bundle Size Check` | ✅ `success` | [Portal 40858677953](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858677953), [bundle 40858677966](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858677966) |
| `E2E (Playwright)` | ❌ preflight parou antes do Supabase: `E2E_SUPABASE_PROJECT_ID` vazio; shards regressivos foram ignorados. A variável ainda não consta na lista atual de variáveis do repositório. | [run 40858678011](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858678011) |
| `Running Copilot Code Review` | ❌ serviço Copilot retornou HTTP 402 `quota`: limite adicional do plano atingido; não é falha de código | [run 40858699722](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40858699722) |

Também passaram Gitleaks, origem confiável, verba/aprovação transacionais, gate Sicoob, responsividade e Preview Comments. Vercel Agent Review ficou `neutral` por billing desativado. A PR continua aberta, sem merge.

## Complemento de recuperação P033 — 29/10/2026

- Ajuste local testado: quando uma transição de status falha após o salvamento, a edição existente continua aberta, preserva o snapshot confirmado e oferece “Revisar orçamento”; uma criação abre o detalhe do registro salvo para prevenir duplicação.
- Resultado local: build/typecheck passaram, lint sem erros (872 avisos) e suíte completa em 5.877 aprovados/68 ignorados. Teste focado passou 8/8. Detalhes em `RELATORIO_CI.md`.
- Dependência externa confirmada pelo usuário: configurar homologação Supabase isolada e variáveis/credenciais de teste nas Actions. Até lá, o E2E de dois usuários não executa; P033 continua parcial e a PR #157 deve permanecer sem merge enquanto o check E2E obrigatório estiver bloqueado.
- A aplicação canônica permanece intacta; não houve escrita, migration nem deploy de função.

## Rechecagem do GitHub e banco canônico — 29/10/2026 09:43 UTC

- A branch local/remota e o head da PR #157 coincidem em `2b8993d95cdb175956a667d61d249319072624d9`; `main` continua em `e9d59026793b84fabeaec9da890a068f64d49c3`. A PR está aberta, sem merge. O diff não altera migrations nem Edge Functions.
- O MCP canônico voltou a responder em modo somente leitura: 137 entradas no ledger até `20261022230000`; as duas RPCs de transição P033 estão presentes. Esta leitura substitui a pendência histórica de timeout acima, sem apagar o registro do incidente.
- A comparação de versão/nome encontrou 125 correspondências entre 587 arquivos locais e 137 linhas do ledger, 462 arquivos locais fora do ledger e 12 versões no ledger sem arquivo local/em `main`. As 12 fontes existem na branch da PR #151, ainda aberta e com checks falhos; não estão integradas à `main`.
- Não considerar os 462 arquivos locais como pendentes de aplicação; não aplicar lote nem gravar entradas artificiais no ledger. Os fingerprints SQL de todas as 125 versões comuns não foram recalculados nesta rechecagem.
- Nenhuma escrita, migration, deploy de função ou alteração no banco foi feita. P033 não requer migration adicional: seu diff só consome RPCs já existentes.
- Checks da PR #157: gates locais/remotos de segurança, build, tipos, lint e testes verdes; E2E bloqueado pela variável `E2E_SUPABASE_PROJECT_ID` vazia; Copilot Review bloqueado por HTTP 402/quota; Vercel Agent Review neutral por billing desativado. Manter a PR sem merge até resolver os checks obrigatórios.

Relatório detalhado: [`docs/execucao/auditoria-github-supabase-2026-10-29.md`](docs/execucao/auditoria-github-supabase-2026-10-29.md).

## Revalidação de concorrência e reconciliação — 29/10/2026

- Na branch `fix/hermes-h247355-ci-dependencies`, a correção P033 passa a enviar `row_version` observada na tela em transições individuais, aprovação com PDF, edição/reabertura, sincronização Bitrix e expiração em lote. Versões ausentes ou inválidas falham sem escrita; a RPC retorna a nova versão para o estado local.
- O contrato foi conferido nas migrations versionadas `20260927110000_bulk_quote_status_atomic.sql`, `20260927163021_quote_pdf_approval_atomic.sql` e no wrapper de governança `20261013120512_fix_quote_governance_writers_and_freeze_content.sql`. Elas recebem os parâmetros de versão esperada e retornam `row_version`; este diff não altera migrations, funções Edge nem schema.
- Validação local: `npm run build` e `npm run typecheck` passaram; `npm run lint` teve 0 erros e 872 avisos (baseline: 0/873); suíte completa: 459 arquivos passaram, 4 ignorados; 5.875 testes passaram e 68 foram ignorados (baseline: 5.871/68). Os 14 testes direcionados do fluxo também passaram.
- A consulta de leitura ao MCP do projeto canônico `cfmzkthhgliqelozlmwu` expirou duas vezes (Management API 544/timeout). Assim, o estado vivo do ledger/funções não foi reconfirmado nesta rodada. O banco permanece intacto; não executar migration ou escrita para contornar o timeout.
- Publicação em andamento nesta branch/PR #157. O SHA publicado antes desta alteração ainda era `73bb0d4e746ef195e09dd9ed3aa81413f4562913`; o novo commit e checks remotos serão registrados após o push. A PR continuará sem merge enquanto E2E autenticado e Copilot Review estiverem bloqueados pelas pendências externas descritas abaixo.

## Reconciliação verificada — 29/10/2026

Esta atualização prevalece sobre estados históricos abaixo quando houver divergência.

### Rechecagem da branch publicada — 29/10/2026 09:02 UTC

- O HEAD da PR [#157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157) é `a8a98c1a026b035513cf25e7a9d7537456078892`, igual ao HEAD da worktree validada. A branch está publicada; a PR permanece aberta, sem merge. A `main` é `e9d59026793b84fabeaec9da890a068f64d49c3`.
- No run [E2E 40845940456](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40845940456), o preflight falhou antes de acessar o Supabase porque `E2E_SUPABASE_PROJECT_ID` está vazio. A listagem de variáveis do repositório retornou zero variáveis. O shard dependente foi ignorado por consequência; isso não valida a jornada autenticada.
- O Copilot Review [run 40845955624](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40845955624) falhou por HTTP 402 `quota` (limite de uso adicional do plano). O check `Qualidade contínua` [run 40845940524](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40845940524) ainda estava em execução na consulta de 09:02 UTC.
- Concluídos com sucesso no SHA atual: gate Sicoob, npm audit, CodeQL, Gitleaks, bundle, Lighthouse, responsividade, origem confiável, verba/aprovação e preview Vercel. Vercel Agent Review ficou `neutral` por billing desativado.
- O ledger do projeto canônico `cfmzkthhgliqelozlmwu` foi consultado em modo somente leitura: 137 migrations; mais recente `20261022230000_repair_migration_ledger_and_harden_search_path`. A PR não altera `supabase/migrations` nem `supabase/functions`; não há mudança a importar para o banco neste escopo. Nenhuma escrita, migration ou publicação de função foi feita.
- Bloqueio externo: provisionar um projeto de homologação Supabase segregado e configurar `E2E_SUPABASE_PROJECT_ID` e credenciais correspondentes exclusivamente para esse projeto. Não apontar os testes aos projetos canônico ou de catálogo.

### Código no GitHub

- PR [#157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157), SHA atual `a8a98c1a026b035513cf25e7a9d7537456078892`, está publicada e **aberta**, sem merge; `main` consultada em `e9d59026793b84fabeaec9da890a068f64d49c3`. A situação dos checks está na rechecagem acima; os IDs `40835463522` e `40835479687` referem-se a runs históricos.
- As rotas de orçamento e compartilhamento público de proposta já estão no `main`; testes focados em `QuoteShareDialog` e navegação passaram (93 testes). A simulação local de aprovação pública e o simulador de conversão também passaram em PostgreSQL descartável, sem rede.

### Banco canônico `cfmzkthhgliqelozlmwu`

- Nenhuma escrita, migration ou publicação de função foi feita nesta verificação.
- Evidência remota somente leitura já coletada: migration `20261013120512` (governança/congelamento de conteúdo) consta no catálogo; os quatro guardas restritivos de `pa_budgets` estavam ativos. O arquivo da migration `20261013115605` (isolamento de verbas) existe no `main` e na branch da PR, mas sua linha no ledger remoto não foi confirmada nesta rodada.
- A consulta direta atual ao gateway do Supabase falhou duas vezes com Management API 544/timeout; o conector oficial Supabase negou permissão (`-32600`), e a CLI local não tem projeto vinculado (`LegacyProjectNotLinkedError`). Portanto, a ativação remota dos triggers de congelamento de C-04 **não foi reconfirmada nesta rodada**; não inferir sucesso a partir do arquivo SQL local.
- C-04 está parcial: triggers locais impedem edição comercial/itens/personalizações após envio ou decisão e `save_quote_atomic` recalcula totais no servidor; a fonte autorizada do preço unitário e dos custos de personalização continua pendente da decisão comercial 2 em `docs/execucao/lacunas-funcionalidades-2026-10-11.md`.

### Próxima ação bloqueada

Restabelecer consulta read-only autorizada ao projeto canônico (ou vincular a CLI com acesso de leitura) para confirmar ledger e triggers de C-04. Até essa confirmação, não aplicar migrations, não escrever no banco e não mesclar a PR #157 enquanto E2E e Copilot Review permanecerem em falha.

### Proteção do destino dos testes remotos — 29/10/2026

- O workflow E2E passa a exigir a variável de Actions `E2E_SUPABASE_PROJECT_ID`, igual ao `VITE_SUPABASE_PROJECT_ID`, e confere que `VITE_SUPABASE_URL` pertence exatamente a esse projeto HTTPS.
- O guard rejeita explicitamente o projeto canônico `cfmzkthhgliqelozlmwu`, o catálogo `doufsxqlfjyuvxuezpln`, refs malformadas e URLs divergentes **antes** do teste com chave administrativa.
- Testes locais determinísticos do guard: 11 passaram; nenhum teste remoto foi executado nesta validação. Para habilitar o E2E, ainda é necessário provisionar homologação segregada e cadastrar a variável e os secrets correspondentes (URL, chave publicável, project ref e personas de teste). Até lá, o job falha de forma explícita e segura; não configurar o destino para os projetos protegidos.
- A contagem de canários consultada no banco canônico permaneceu em 9 antes e depois da execução remota de 29/10. Origem e idade dessas linhas não foram determinadas; elas não foram apagadas.

### Resultado dos checks após o guard — SHA `c5db317`

- E2E [run 40844345741](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40844345741): o step `Validar alvo Supabase segregado para E2E` falhou porque `E2E_SUPABASE_PROJECT_ID` estava vazio. O log mostra o preflight encerrando com “Configure URL, project ref e E2E_SUPABASE_PROJECT_ID de homologação.” O step de autorização/RLS não rodou e o shard regressivo foi pulado como consequência do gate; não classificar a jornada como aprovada. **Ação:** provisionar homologação, configurar a variável e alinhar URL, chave publicável, project ref e personas de teste ao mesmo projeto, depois reexecutar.
- Copilot Review [run 40844360713](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40844360713): falhou em `Processing Request (Linux)` com HTTP 402 `quota`: o plano atingiu o limite de uso adicional. **Ação externa:** restaurar limite/uso do serviço Copilot e reexecutar o check; não há correção de código que elimine essa quota.
- `npm audit`, CodeQL, Gitleaks, bundle, Lighthouse, responsividade, verba/aprovação, origem confiável, gate Sicoob, Vercel Preview Comments e `Segurança, contratos e build` concluíram com sucesso. Vercel Agent Review ficou `neutral` por billing desativado. Nenhum merge foi realizado.

## Estado atual — 29/10/2026

Os itens de 22/10 abaixo são histórico e não representam o estado atual. Rechecagem dos últimos runs na `main`:

| Workflow | Run | Estado atual |
|---|---|---|
| `Security Scan` | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | Falha por vulnerabilidades altas em `undici` e `zod`; correção em andamento na branch de CI. |
| `Qualidade contínua` | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | Mesmo bloqueio do gate `npm audit`. |
| `CodeQL` | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | Falha por mistura de versões: `init` 4.39.1, `autobuild/analyze` 4.38.2. |
| `Publicar funções Sicoob` | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | As publicações terminaram; a verificação final falhou pois `sicoob-approval-reconciliation` ficou na versão 5 (antes 5) após a CLI registrar “No change found”. Não houve evidência de falha de credencial. |

**Workflows verdes na última execução consultada:** `Migration ledger drift` (dispatch manual), `Branch Protection Sentinel`, `Enterprise Compliance & Audit Reporting` e `Portal Sicoob`. A execução agendada anterior do ledger drift falhou, mas não é a mais recente.

**PRs ainda afetados:** #150, #151 e #156 têm checks de dependências/CodeQL falhando. No #156, a validação remota de autorização/RLS também apresentou timeout. A correção do CodeQL usa o SHA oficial 4.39.1 uniforme e aguarda confirmação na CI do PR. Nenhum desses PRs foi integrado à `main`.

### PR #157 — correções de CI em validação

PR: [#157](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/157), branch `fix/hermes-h247355-ci-dependencies`, SHA consultado `e9285be0ebfd7c8b64a621c802d770581bd42d47`.

| Check no PR | Resultado | Evidência / pendência |
|---|---|---|
| npm audit | ✅ success | [Run 40831182622](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182622); zero vulnerabilidades. |
| CodeQL | ✅ success | [Run 40831182640](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182640); SHA único v4.39.1. |
| Segurança, contratos e build | ✅ success | [Run 40831182653](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182653); suíte, tipagem, simulações PostgreSQL e build concluídos. |
| Gitleaks, origem confiável, bundle, Lighthouse, verba/aprovação, entrada responsiva, gate Sicoob e Vercel Preview Comments | ✅ success | Runs do SHA atual: [E2E/origem](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182569), [qualidade](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182653), [segurança](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182622), [Lighthouse](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182689) e [gate Sicoob](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182567). |
| `e2e` | ❌ failure | [Run 40831182569](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831182569): `tests/rls/e2e-cleanup-rate-limit.test.ts` excedeu 45 s no `beforeAll` ao consultar `e2e_cleanup_rate_limit`; 51 testes passaram, 4 foram ignorados e os shards foram pulados pelo gate smoke. Causa provável: latência/indisponibilidade do Supabase remoto; validar conectividade e resposta dessa tabela no projeto de construção. |
| Copilot PR reviewer | ❌ failure | [Run 40831197720](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40831197720): HTTP 402 `quota`, limite de uso adicional do plano Copilot atingido. Requer aumentar o limite/uso adicional ou aguardar o reset em `github.com/settings/copilot/features`. |
| Vercel Agent Review | ⚪ neutral | Billing do time desativado; revisão automatizada não executada. Não foi falha de código. |

**Ação necessária para E2E:** a execução atual ultrapassou o timeout de 45 s no `beforeAll` do teste de RLS, ao consultar a tabela `e2e_cleanup_rate_limit`. Verificar disponibilidade, policy RLS e latência da tabela no projeto Supabase de construção antes de novo rerun; a execução não comprovou sucesso do gate remoto.

**Ação necessária para os checks externos:** o administrador do time deve resolver o limite do Copilot. Para o ECR Public, aguardar a cota se restabelecer; se persistir, migrar as simulações para um registry espelho aprovado. O rerun confirmou falha recorrente de infraestrutura, sem erro de teste/código.

O check do workflow manual `Publicar funções Sicoob` não roda em PR: ele exige `refs/heads/main` e input `PUBLICAR`. A correção foi reproduzida localmente em cinco testes positivos/negativos, mas a confirmação remota permanece pendente até a branch chegar à `main`; esta rodada não publicou funções.

**Integração:** PR #157 inclui alteração de dependências e código da aplicação, e os checks obrigatórios do PR não estão todos verdes. Não foi mesclado nem publicado em produção. Nenhuma escrita, migration ou publicação foi feita no Supabase nesta rodada.

### Reconciliação do banco canônico

Leitura do MCP do projeto `cfmzkthhgliqelozlmwu`: 137 migrations registradas; a mais recente é `20261022230000_repair_migration_ledger_and_harden_search_path`. A verificação `Migration ledger drift` mais recente na `main` permanece verde ([run 40670784182](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40670784182)). A auditoria anterior identificou 12 entradas remotas sem arquivo-fonte na `main`; o PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) restaura esses arquivos. Não reaplicar essas migrations: já constam no ledger remoto. O PR #157 não altera migrations nem schema.

### Atualização da correção de dependências

- `undici` passou de `8.10.2` para `8.12.3`, dentro da faixa semver já declarada por `vite-plugin-mkcert`; o `npm audit` local deixou de reportar os oito advisories desse pacote.
- `zod` passou para `4.6.7` e `@hookform/resolvers` para `6.0.2`; foram adaptados os dois usos legados incompatíveis e adicionados testes para mensagens obrigatórias do schema de metas.
- O audit local agora passa sem vulnerabilidades. Typecheck e 276 testes focados também passaram; a suíte completa pós-commit passou com 5.841 testes aprovados e 68 ignorados, sem regressão (baseline 5.839/68); build, lint e typecheck também passaram.
- As três versões do CodeQL foram alinhadas ao mesmo SHA 4.39.1. A verificação do deploy de funções foi corrigida para aceitar versão igual apenas com confirmação “No change found” específica da função. Os cinco testes unitários direcionados passaram. Ambas as correções ainda aguardam CI no PR; a última execução da `main` continua refletindo o código anterior.
- Não houve alterações no Supabase nesta rodada: não era necessário aplicar migration nem publicar funções para corrigir a lógica de confirmação.
- A `main` remota continua vulnerável até esta branch ser enviada, passar os checks e ser integrada. Os workflows correspondentes ainda não foram reexecutados na `main`.

Atualizado em: 2026-10-29

## Rechecagem final da branch principal e PR #157 — 29/10/2026

Inventário baseado na última execução de cada workflow em `main` no momento da consulta. A `main` continua no SHA `e9d59026793b84fabeaec9da890a068f64d49c3`; a PR #157 permanece aberta no SHA `905b433100c70996fe13af0a3bc63fd6a32014c7`.

| Workflow | Último run em `main` | Situação / causa provável | Situação no SHA da PR #157 |
|---|---|---|---|
| `Qualidade contínua` | [40602982964](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982964) | `failure`: gate de dependências vulneráveis no código anterior. | ✅ [40860463113](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463113) |
| `Security Scan` | [40602983158](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983158) | `failure`: advisories altos de dependências no código anterior. | ✅ [40860463149](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463149) |
| `CodeQL` | [40602983073](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983073) | `failure`: versões divergentes das actions CodeQL. | ✅ [40860463102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463102) |
| `Bundle Size Check` | [36353765911](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765911) | `failure` na última execução da `main`; correção validada apenas no PR. | ✅ [40860463104](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463104) |
| `Lighthouse Performance Audit` | [36353765910](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36353765910) | `failure` na última execução da `main`; correção validada apenas no PR. | ✅ [40860463157](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463157) |
| `E2E (Playwright)` | [37775702358](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/37775702358) | `startup_failure` na última execução da `main`. | ❌ [40860463163](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860463163): preflight bloqueado porque `E2E_SUPABASE_PROJECT_ID` está vazia; nenhum teste autenticado foi validado neste run. |
| `Publicar funções Sicoob` | [40772348102](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40772348102) | `failure`: verificação final não confirmou incremento da versão de `sicoob-approval-reconciliation` após “No change found”. | Sem execução equivalente em PR: workflow manual restrito à `main`; reprodução unitária local não substitui a confirmação remota. |
| `Running Copilot Code Review` | — | Não é workflow da aplicação na `main`; no PR atual falhou por HTTP 402 `quota`, limite adicional de uso do Copilot. | ❌ [40860478178](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40860478178) |

**Workflows verdes na última execução consultada em `main`:** `Migration ledger drift` ([40828393693](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40828393693)), `Branch Protection Sentinel` ([40602983038](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602983038)), `Portal Sicoob` ([39868499315](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/39868499315)), `Monthly DB Audit` ([36794161452](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36794161452)) e `Enterprise Compliance & Audit Reporting` ([40602982958](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40602982958)). `Aplicar migrations Sicoob` teve última execução cancelada; cancelamento não foi contado como falha.

**Ação externa pendente, assumida pelo usuário:** provisionar Supabase de homologação segregado e configurar no GitHub Actions `E2E_SUPABASE_PROJECT_ID`, URL/ref/chave publicável e personas de teste desse mesmo projeto. A resposta foi “Sim, vou configurar”; até a rechecagem, a variável não constava entre as variáveis do repositório. Depois, reexecutar E2E e confirmar os shards/regressão. Não usar o banco canônico nem o banco de catálogo.

**Outros bloqueios:** o Copilot requer restauração/aumento da cota ou nova execução após reset; `Publicar funções Sicoob` requer confirmação em execução manual autorizada na `main`. Essas falhas permanecem registradas e não foram mascaradas por reruns locais.

**Banco canônico:** consulta somente leitura ao projeto `cfmzkthhgliqelozlmwu`; 137 migrations registradas, última `20261022230000_repair_migration_ledger_and_harden_search_path`. A candidata `20261029102059_block_inactive_quote_status_retries` ainda não consta no ledger. Nenhuma escrita ou migration foi executada. A PR não foi mesclada porque E2E e Copilot continuam sem sucesso e contém alteração de aplicação; portanto, as correções ainda não chegaram à `main`.

Cada seção abaixo descreve um workflow que falha por motivo externo ao código do repositório.
O erro exato foi extraído do run mais recente disponível em main.

---

~~## Workflow: `npm_and_yarn` — Dependabot `@vitest/mocker` Update~~

> ✅ **RESOLVIDO em 2026-10-22** — `vitest` e todos `@vitest/*` atualizados para 4.1.12 no commit `b32e5e4`. CVEs GHSA-qxg6-89mg-rqv8 e GHSA-xp26-3454-mjgp corrigidas.

---

## Workflow: Enterprise Compliance & Audit Reporting

**Run atual:** `39780447872` · Job `119830039718`  
**Step:** "Database RLS Scan"  
**Erro exato:**

```
check_tables_rls falhou: Service for this project is restricted due to the following violations:
exceed_edge_functions_invocations_quota, exceed_egress_quota.
The project owner must upgrade their plan or remove spend caps to restore service.
```

**Causa raiz:** Quota de edge functions e egress do projeto Supabase esgotada — o workflow
chama funções via Management API e o projeto rejeita por billing.

**O que você precisa fazer:**

1. Acesse o painel do Supabase do projeto em uso pelos testes.
2. Verifique se há spend caps ativos e remova-os, ou adicione créditos ao plano.
3. Após restaurar a quota, o workflow deve passar sem nenhuma mudança de código.

---

## Workflow: `e2e` — Smoke gate Playwright bloqueado por quota Supabase

**Situação:** Duas partes distintas neste workflow:

### Parte 1 — Testes vitest (authz + RLS) ✅ Resolvido

> ✅ **RESOLVIDO em 2026-10-22** — `edge-authz-bypass.test.ts` atualizado para aceitar HTTP 402
> (quota Supabase). `e2e-cleanup-rate-limit.test.ts` atualizado para tratar quota com
> `isQuotaExhaustedError` + flag `quotaExhausted`. Fix aplicado no PR #141.

### Parte 2 — Smoke gate Playwright ⚠️ Externo

**Causa raiz:** A quota Supabase esgotada (`exceed_edge_functions_invocations_quota`,
`exceed_egress_quota`) faz com que o endpoint de autenticação retorne HTTP 402. A fixture
global do Playwright (`tests/e2e/fixtures/auth.ts`) não consegue criar sessão → todos os
39 testes são pulados em 0ms → o job detecta 0 testes passando e falha com:

```
🛑 Fail-fast se smoke falhou (gate)
::error title=Smoke gate failed::...
Process completed with exit code 1.
```

**Este não é um bug no código** — é a mesma causa raiz do workflow Enterprise Compliance.
A falha é inevitável enquanto a quota Supabase não for restaurada.

**O que você precisa fazer:**

1. Restaure a quota Supabase (mesma ação da seção Enterprise Compliance acima).
2. Após restaurar, o smoke gate passa automaticamente sem nenhuma mudança de código.

---

## Workflow: `copilot-pull-request-reviewer`

**Run atual:** `39785094125` · SHA `4f5de103`  
**Erro exato:**

```
SessionModelError: You've reached your additional usage limit for your plan.
Go to https://github.com/settings/copilot/features for more details.
(Request ID: E01C:2B4931:27FA876:2E0CFAE:6AD9FDF4)
errorType: 'quota', statusCode: 402
```

**Causa raiz:** Quota mensal do GitHub Copilot esgotada.

**O que você precisa fazer:**

1. Acesse `github.com/settings/billing` e verifique o uso do Copilot.
2. Atualize o plano ou aguarde o reset do ciclo de faturamento.

---

## Workflow: `lighthouse` (Lighthouse Performance Audit)

**Trigger:** `on: pull_request` com `paths-ignore: ['docs/**', '*.md', '.github/CODEOWNERS']` — **não dispara em push à main**.  
**Run mais recente disponível:** `36353765910` · Job `108717316857` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404 — run de 25 dias; steps retornados vazios pela API).  
**Estado em PR #136:** SKIPPED corretamente (mudanças apenas em `*.md`).

**Causa provável da falha de Set/27:** O workflow executa `npx @lhci/cli@0.13.0 autorun` e usa o secret `LHCI_GITHUB_APP_TOKEN` para integração com GitHub Checks. Sem o token configurado (ou com token expirado), o LHCI retorna erro de autenticação mas ainda gera relatório; a falha pode ser de orçamento de performance ou de token. Logs indisponíveis para confirmar.

**Impacto:** Zero em push à main — workflow só corre em PRs. Em PRs com mudanças de código, pode falhar por:
1. `LHCI_GITHUB_APP_TOKEN` ausente/expirado no repositório.
2. Orçamento de performance configurado em `.lighthouserc.*` não sendo atingido.

**O que você precisa fazer:**
1. Verifique se o secret `LHCI_GITHUB_APP_TOKEN` está configurado em Settings → Secrets and variables → Actions.
2. Na próxima abertura de PR com mudanças de código, observe o log do job `lighthouse` para confirmar a causa raiz.
3. Sem ação imediata necessária — não bloqueia push à main.

---

## Workflow: `bundle-stats` (Bundle Size Check)

**Trigger:** `on: pull_request` — **não dispara em push à main**.  
**Run mais recente disponível em main:** `36353765911` · Job `108717316864` · SHA `99dd8778` · 2026-09-27  
**Log:** expirado (HTTP 404).  
**Estado em PR #136:** **success** ✅ · Run `39787553405` · Job `119854596437`.

**Causa da falha de Set/27:** Logs indisponíveis. Possível causa: script `scripts/qa/check-bundle-budget.mjs` com limite de orçamento ultrapassado no código daquele PR.  
**Estado atual:** Não é um bloqueio — no código atual (PR #136) o check PASSOU.

---

## Workflow: `Aplicar migrations Sicoob` (`apply-sicoob-migrations.yml`)

**Trigger:** `workflow_dispatch` apenas (manual) — requer input `confirmar: "APLICAR"` e branch `main`.  
**Não há runs automáticos.** Workflow só executa quando o owner aciona manualmente via GitHub UI ou API.  
**Último run:** não disponível (nenhum run automático indexado em `branch=main`).  
**Ação necessária:** Nenhuma no momento — workflow é utilitário para aplicar migrations ao banco de construção sob demanda.

---

## Workflow: `Monthly DB Audit` (`db-performance-audit.yml`)

**Trigger:** Cron `0 0 1 * *` (dia 1 de cada mês às 00:00 UTC) + `workflow_dispatch`.  
**Próxima execução automática:** 2026-11-01 00:00 UTC.  
**Estado:** Não avaliável até 2026-11-01. O workflow requer secrets `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` — se ausentes, o job falha com `::error::Secrets ausentes`.  
**O que verificar em Nov/01:**
1. Se o run falhar por secrets ausentes: configure `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` em Settings → Secrets and variables → Actions.
2. Se falhar por Supabase quota: mesma ação da seção Enterprise Compliance.

---

## Workflow: `Segurança, contratos e build` (`ci.yml`) — ECR Rate Limit

**Commits afetados:** `5b34841` e `7211e12` (branch `claude/hopeful-mccarthy-8rqrqw`)
**Runs:** `39850827027` · `39852468612`
**Step:** "Simular controles de auditoria" / "Simular ACL efetiva"
**Erro exato:**

```
RuntimeError: docker run falhou após 3 tentativas:
Unable to find image 'public.ecr.aws/supabase/postgres:17.6.1.063' locally
docker: Error response from daemon: toomanyrequests: Data limit exceeded
```

**Causa raiz:** Rate limit do ECR Public da AWS ao puxar a imagem Docker `public.ecr.aws/supabase/postgres:17.6.1.063` nos scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`. Não é um bug no código do PR — é throttling de infraestrutura externa. Em execuções posteriores (ex: run `39780447863`) o rate limit se dissipar naturalmente e o workflow retornou **success**.

**O que você precisa fazer:** Nenhuma ação imediata. Se a falha persistir em execuções futuras:
1. Habilitar o Amazon ECR pull-through cache ou autenticar no ECR antes do pull.
2. Alternativa: migrar os scripts para usar a imagem via GHCR ou Docker Hub se disponível.

---

## Gaps de banco de dados identificados em auditoria (2026-10-22)

### Gap 1 — CRÍTICO: Migration `20261022120000` ausente de `supabase_migrations.schema_migrations`

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no commit `48ee07f`.

A migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` foi aplicada ao banco fora do Supabase CLI (via Management API), portanto nunca foi registrada em `supabase_migrations.schema_migrations`. O schema estava correto, mas o ledger do Supabase ficou dessincronizado. Inserção de reparo realizada no commit acima.

### Gap 2 — MÉDIO: `e2e_cleanup_check_rate_limit` com `search_path` incompleto

**Status:** ✅ RESOLVIDO — migration de reparo aplicada no mesmo commit.

A função SECURITY DEFINER `e2e_cleanup_check_rate_limit` tinha `SET search_path TO 'public'` sem o `pg_catalog` explicitamente como primeiro elemento, diferentemente das outras funções SECURITY DEFINER do projeto (`get_public_favorite_list` e `get_public_favorite_reactions`). Corrigido para `pg_catalog, public` por consistência com o padrão de hardening do projeto.

### Gap 3 — MÉDIO: `relforcerowsecurity = false` em `e2e_cleanup_rate_limit`

**Status:** ⚠️ Não corrigido — avaliação: risco aceitável pelo design atual.

A tabela `e2e_cleanup_rate_limit` tem `FORCE ROW LEVEL SECURITY` desabilitado, o que permite à role `postgres` (dono) acessar diretamente sem passar pelo RLS. Em produção isso é aceitável: a única escrita legítima é via RPC SECURITY DEFINER `e2e_cleanup_check_rate_limit` que roda como `postgres` por design. Adicionar `FORCE ROW LEVEL SECURITY` quebraria a RPC.

---

## Inventário completo de falhas — main (status=failure, consultado em 2026-10-22 19:30 UTC)

Lista lida via API (`branch=main`, 50 runs, último run de cada workflow).

| Workflow | Run mais recente | Conclusão | Causa | Status |
|---|---|---|---|---|
| Security Scan | `39835755469` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Qualidade contínua | `39835755495` (SHA `82262c4`) | failure | dompurify CVE (CRITICAL) | ✅ Resolvido por PR #141 (pending merge) |
| Enterprise Compliance & Audit Reporting | `39835755339` (SHA `82262c4`) | failure | Supabase quota esgotada | ⚠️ Externo — ver seção acima |
| Running Copilot Code Review | `39785094125` (SHA `4f5de103`) | failure | Quota GitHub Copilot 402 | ⚠️ Externo — ver seção acima |
| npm_and_yarn @vitest/mocker | `39775463512` (SHA `ae1b92b3`) | failure | `security_update_not_possible` Dependabot | ✅ Resolvido por PR #139 |

**Workflows verdes (última execução = success):**
Branch Protection Sentinel, CodeQL, Migration Ledger Drift, Portal Sicoob, Dependabot updates gerais.

---

~~## Gap de Segurança: Ausência de `npm audit` no CI~~

> ✅ **RESOLVIDO em 2026-10-22** — Job `npm-audit` adicionado ao `security.yml` no commit `b32e5e4`. Roda em PRs, push para main e schedule semanal com `--audit-level=high`.

---

## Workflows corrigidos (resolvidos em PRs anteriores)

| Workflow | Causa | Correção | PR |
|---|---|---|---|
| Branch Protection Sentinel | Squash merge com mensagem customizada sem `(#NNN)` | PR mergeado sem `commit_message` custom (GitHub gera título com `(#NNN)`) | #128 |
| Enterprise Compliance — Security Definer ACL | `audit_security_definer_acl()` sem `get_public_favorite_list` e `get_public_favorite_reactions` | Migration `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` | #126 |
| Migration Ledger Drift | Fingerprint de `20261022120000` calculado com `local_sha256` incorreto; novo digest correto: `e2815b0...` | Corrigido fingerprint no `migration-ledger-baseline.json` | #129 |
| 5 CVEs high (vite ≤6.4.3) | GHSA-698v, GHSA-r825, GHSA-587h, GHSA-9jrq, GHSA-rq7h | `vite` 6.4.3 → 6.4.5 | #126 |
| Qualidade contínua (`ci.yml`) — ECR rate limit | `toomanyrequests: Data limit exceeded` ao puxar `public.ecr.aws/supabase/postgres:17.6.1.063` em dois steps (scripts `simular-controles-auditoria.py` e `simular-acl-efetiva.py`) | Rate limit do ECR Public se dissipou naturalmente; run `39780447863` → **success** | automático |

---

## Rechecagem pós-commit `0003e00ed` — 29/10/2026

### PR #157 — checks do SHA `0003e00ed361bd0d73527e670396a7def11a6c35`

| Check | Estado | Motivo / evidência |
|---|---|---|
| `e2e` | ❌ failure | [Run 40821761584](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761584): `tests/rls/e2e-cleanup-rate-limit.test.ts`, cenário “UPDATE como anon falha”, excedeu 15 s. A chamada REST remota ficou sem resposta dentro do limite; não há evidência de que a asserção de RLS falhou. Reprodução remota local indisponível sem as credenciais de teste do GitHub Actions; sem `RUN_REMOTE_RLS_TESTS=1`, o teste pula e não exercita o Supabase. A repetição no PR #151 indica instabilidade persistente do teste remoto, não uma falha nova causada pelo commit documental. |
| `Segurança, contratos e build` | ❌ failure | [Run 40821761554](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761554): `simular-controles-auditoria.py` não obteve a imagem `public.ecr.aws/supabase/postgres:17.6.1.063`; ECR respondeu `toomanyrequests: Data limit exceeded` após três tentativas. |
| `npm audit — CVE Scan` | ✅ success | [Run 40821761612](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761612). |
| `Analyze (javascript-typescript)` | ✅ success | [Run 40821761556](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761556). |
| `Gitleaks — Secret Scan` | ✅ success | [Run 40821761612](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821761612). |
| `e2e` regressivo por shards | ⏭️ skipped | O gate E2E falhou no teste remoto anterior; os shards não rodaram. |
| `copilot-pull-request-reviewer` | ❌ failure externo | [Run 40821772919](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40821772919): limite de uso adicional do Copilot (HTTP 402). Não é check obrigatório da proteção da branch. |
| Vercel Agent Review | ⚪ neutral | Billing de revisão do time desativado; não é falha de build. |

Os demais checks obrigatórios remotos concluíram com sucesso. O PR continua aberto e não pode ser mesclado enquanto `e2e` e `Segurança, contratos e build` estiverem vermelhos. As correções de npm audit/CodeQL estão demonstradas no PR, mas a `main` ainda conserva os workflows com falha até integração; nenhum deploy foi feito.

### Ledger Supabase e repositório

Leitura do ledger canônico retornou 137 entradas, com última versão `20261022230000`. A `main` carece das fontes de 12 migrations já aplicadas; o PR [#151](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/151) as restaura e, no snapshot de seu branch, as 137 versões remotas têm fonte correspondente. O PR #151 segue bloqueado pelos checks `e2e`, `npm audit`, CodeQL e `Segurança, contratos e build`; não marcar a reconciliação como concluída antes de o conteúdo chegar à `main` com checks verdes.

Os 462 arquivos locais sem entrada no ledger são passivo histórico registrado na baseline. Não executar esses arquivos em lote, não fabricar linhas no ledger e não alterar o schema para “alinhar” contagens. O PR #157 não contém mudança de banco e nenhum comando de escrita/migration foi executado nesta sessão.

### Atualização após novo diagnóstico — 29/10/2026

No SHA `6ce1a6b52a991fd0db5e11f455c56f619c5ae4ab`, o [run E2E 40822748029](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40822748029) terminou com `Hook timed out in 45000ms` em `beforeAll` de `tests/rls/e2e-cleanup-rate-limit.test.ts:71`. A operação que travou foi a inserção administrativa do canário, antes das asserções de RLS. O mesmo SHA também mostra, no MCP, timeout de Management API ao executar `supabase_db_health` e `supabase_db_query` read-only. O ledger continua legível pelo endpoint de migrations, mas isso não demonstra saúde do PostgREST nem permite reexecutar localmente o cenário sem credenciais do Actions. Pendência: restaurar/conferir a disponibilidade REST do Supabase de construção e então rerodar o E2E; manter o gate falhando até haver resposta real.

Para o ECR, os dois scripts `scripts/qa/simular-controles-auditoria.py` e `scripts/qa/simular-acl-efetiva.py` usam a imagem oficial GHCR `ghcr.io/supabase/postgres:17.6.1.063`. A inspeção `docker manifest inspect` confirmou digests por plataforma idênticos entre ECR e GHCR; os dois simuladores passaram localmente e o [run CI 40823699675](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/40823699675) passou o gate Segurança/Contratos/Build. Considerar corrigido no branch #157; ainda não certificado na `main` enquanto o PR não for integrado.

## Retificação da auditoria GitHub × banco — 29/10/2026

- **GitHub:** o código local está publicado em `fix/hermes-h247355-ci-dependencies` no SHA `a036bfdead2fd136120e545655a79222487ebe91`, no PR #157. O PR está aberto, não integrado; `main` continua em `e9d59026793b84fabeaec9da890a068f64d49c3`.
- **Supabase canônico:** leitura somente de `supabase_migrations.schema_migrations` confirmou 137 versões até `20261022230000`. Nenhuma escrita foi feita.
- **Diferença real:** `main` (e o branch do PR #157) têm fonte para 125/137 versões. Faltam as 12 migrations listadas em `RELATORIO_CI.md`; o branch do PR #151 tem fontes para 137/137. Esse PR #151 permanece separado e bloqueado por checks, então não declarar a reconciliação da `main` concluída.
- **Escopo do PR #157:** não altera migrations, schema, dados nem Edge Functions. Não existe operação de banco a executar para publicar as mudanças desse PR.
- **CI mais recente observado:** E2E falhou durante setup remoto; Lighthouse falhou uma vez por LCP 2.610–2.617 ms contra limite 2.600 ms, com rerun ainda em andamento; `Segurança, contratos e build` ainda estava em execução; Copilot reviewer retornou HTTP 402. Os demais gates obrigatórios observados estavam verdes. Não integrar até a conclusão dos gates exigidos.
- **Ação pendente:** resolver o setup/disponibilidade do Supabase remoto para o E2E, aguardar o rerun do Lighthouse e a conclusão do gate de segurança/build; depois repetir a prova de checks. O bloqueio do Copilot depende do serviço/limite externo e não é resolvido por alteração de aplicação.

## Atualização C-07 — BI e métricas presumidas — 29/10/2026

O lote do PR #157 removeu as principais métricas sintéticas catalogadas em C-07: fallback de BI por cliente, benchmark de demonstração, sazonalidade simulada, badges de mercado inventados, ETA inferido do status de estoque, verba presumida de R$ 50 mil, estimativa heurística de share-of-wallet e referência de limite de 10% no texto de reprovação. Falhas de consulta agora aparecem como indisponibilidade, separadas de amostra vazia.

**Estado:** correções implementadas e validadas localmente no branch do PR; ainda não disponíveis na `main`. A integração continua pendente dos gates remotos do PR. O banco canônico segue somente leitura; este lote não precisa de migration nem escrita de dados.

**Validação local:** build e typecheck passaram; lint sem erros e 872 avisos (baseline 873); suíte completa com 5.855 testes aprovados e 68 ignorados. Não houve regressão observada nos checks locais.
