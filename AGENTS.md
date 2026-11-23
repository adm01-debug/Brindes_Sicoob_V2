# AGENTS.md — Brindes Sicoob V2

Regras do dono para qualquer agente de IA; vencem `docs/` (histórico). Detalhe em `docs/agentes/<tema>.md`;
divergiu da realidade → corrija no mesmo PR do fix. Responda sempre em PT-BR.

## Postura
- O dono não é dev: decide negócio; o agente executa a engenharia inteira via MCP. Nunca passo manual do
  dono nem pedir que ele revise diff.
- Qualidade + velocidade, mínimo de tokens. Decida como dev sênior; pergunte só com custo, arquitetura,
  dado destrutivo em produção, trade-off de negócio ou item "chame o dono". Para ler, não peça permissão.
- Verdade acima de validação: não sabe → diga; falhou → diga. Afirmação sobre código cita evidência
  (arquivo:linha, diff, saída de comando); sem evidência = "NÃO VERIFICADO" + motivo; nunca "testado" sem
  ter rodado. Branch/commit/PR não provam nada — leia o código.
- Diff mínimo, zero churn: causa raiz, não reescrita; não refatore, renomeie ou comente o que não foi pedido;
  não reescreva arquivo inteiro para mudar 3 linhas. Dependência nova ou bump major só se indispensável (avise na PR).
- `APROVADO` = execute o plano como descrito, sem reconfirmar.
- Uma tarefa por vez, cada uma com sua branch/PR. Outro bug → "Próximos passos". Travou → reporte o erro
  exato e pare; não contorne regra. Releia o pedido antes de concluir.
- Tokens: leia só o trecho necessário; grafo antes de busca por texto; exploração ampla → subagente;
  nenhuma tool "por garantia"; não gere código que não será aplicado.
- Segredos nunca em código, commit ou resposta — só em env/secret do serviço (edge: dashboard Supabase,
  `supabase secrets` ou tabela `integration_credentials` via `/admin/conexoes`). PAT exposto em chat →
  rotacionar na hora (`docs/RUNBOOKS/CREDENTIAL_ROTATION.md`). Nunca imprima nem commite `.env*`,
  tokens ou `service_role`. **Toda `VITE_*` é pública** — nunca segredo com esse prefixo.

## Bugs e funcionalidades
- Diagnóstico antes de patch: logs e estado real, ponto exato (arquivo:linha), causa; várias causas → liste
  todas, corrija a pedida.
- Antes da PR: `npm run typecheck:baseline`, `npm run lint:baseline` e `npx vitest run <caminho tocado>`.
  Só erro seu conta; erro herdado da `main` → "Próximos passos". A dívida de lint e de typecheck está em
  **zero** (`.eslint-baseline.json`, `.typecheck-baseline.json`): não há margem.
- "Pronto" = PR mergeada + deploy confirmado + comportamento verificado (log, query ou request real); faltou
  um → diga onde parou. Deploy do front **não é automático pelo CI** — Vercel publica a `main` sem
  esperar o CI (decidido 08/11/2026, ver `docs/agentes/servicos.md`) — confirme o deploy antes de dizer
  que subiu.
- Funcionalidade pronta = integrada ponta a ponta (rota registrada em `src/routes/config/`, entrada na UI,
  hook/serviço chamado, edge invocada **e no `edge-authz-manifest.ts`**, tabela com RLS, estados
  erro/loading/vazio, submit), sem mock, hardcode ou TODO. Pela metade não é pronto; não cabe na sessão →
  entregue o funcional e liste o que falta, em ordem, com arquivos. Nunca deixe código morto ou feature
  "quase" sem dizer.
- Teste crítico nunca é resolvido com `skip`: o orçamento de skip em `tests/p0`, `tests/rls` e
  `tests/security` é catraca de CI (`scripts/check-critical-test-skip-budget.mjs`).

## Comunicação
- Resultado primeiro, só o que muda decisão do dono. Sem introdução, recapitulação, narração, hedging,
  disclaimer, lição de moral ou cortesia. Efeito no negócio; técnica só se perguntarem. Resposta e plano
  proporcionais ao tamanho do fix; não despeje log — cite a linha que importa. Caminhos, comandos e links
  completos. Destrutivo de verdade: uma linha ("isso apaga X, sem volta — confirma?").
- Toda execução fecha com exatamente 3 "Próximos passos" (`N. [título] — [por quê] · [arquivo]`), por
  impacto, do que você viu, executáveis via MCP, para não-dev; nada de genérico ("adicionar testes",
  "melhorar documentação", "revisar segurança"). É um menu: `1`, `1 e 3`, `APROVADO 2`, "todos" ou o bloco
  devolvido = executar na ordem, sem reconfirmar. Só consulta, já rejeitadas ou nada pendente →
  `Próximos passos: nada pendente neste escopo.`

## Fluxo Git — detalhe em `docs/agentes/github-ci.md`
- Repo `adm01-debug/Brindes_Sicoob_V2`, `main`, **público**. Escrita no GitHub: MCP
  **`GITHUB - MCP - FOREVER`** (`github_push_files`: `files` + `delete` num commit); `git push` só em repo
  autorizado na sessão.
- Nunca commite em `main`. Só escreva em branch que **você** criou nesta sessão; branch alheia ou já
  existente é somente leitura. Antes do push, confira que o último commit é seu.
- PR aberta nos mesmos arquivos → pare e avise o dono (liste via `github_graphql`). Há muitas PRs de outros
  agentes abertas neste repo ao mesmo tempo — essa checagem não é formalidade.
- Branch de `main` atualizado: `claude/<fix|feat|chore|docs|refactor|ci>-<slug>-<AAMMDD-HHMM>`.
- Commit PT-BR, 1 atômico, Conventional Commits `<tipo>(<escopo>): <assunto>` sem ponto final. Tipos em uso
  na `main`: `fix docs chore infra feat ci`. **Não há hook `commit-msg` nem commitlint** — siga o padrão
  mesmo assim. Nunca `--no-verify` para fugir de `pre-commit`/`pre-push`: eles replicam o CI.
- PR sempre: título = o que muda; corpo = causa + o que foi verificado, com evidência. Use
  `.github/pull_request_template.md` (o de 26 linhas, com "Evidência verificada"). **Um assunto por
  PR** — PR misturando CI + feature + docs em >30 arquivos é rejeitado na triagem.
- **Fechar o ciclo é obrigatório — abrir PR não é entregar.** Depois de criar a PR: ative
  `gh pr merge <n> --auto --squash` (auto-merge está ligado; a PR entra sozinha quando os 10 checks
  obrigatórios ficarem verdes e as conversas estiverem resolvidas) e acompanhe até `MERGED`. Check
  vermelho → diagnostique (`gh run view <id> --log-failed`) e corrija na mesma PR; falha de infra
  (rate limit de registry, timeout de Supabase) → re-rode uma vez
  (`gh run rerun <id> --failed`). Comentário de bot (qodo/codex/copilot) → responda e resolva a
  thread; achado "High" de segurança exige correção ou justificativa técnica, nunca silêncio.
- **Limite de fila:** não abra PR nova enquanto houver mais de 5 PRs suas abertas. Esvaziar a fila
  tem prioridade sobre aumentá-la.
- Mergeie sem aprovação (squash, apague a branch) PR sua pronta: os **10 checks obrigatórios** verdes, sem
  conflito, **todas as conversas de bot resolvidas** (`required_conversation_resolution: true`), escopo
  comum (front, edge, config). **Deixe aberta e chame o dono**: DDL/migration em produção; CI/workflows,
  segredos, Dockerfile/runner, Portainer, Cloudflare/Terraform; deleção de dado, arquitetura ou custo;
  conflito com PR de outro agente.
- Conflito: rebase em `main`; `--force-with-lease` só na sua branch. `strict: true` → PR `BEHIND` não
  mergeia mesmo com CI verde: atualize a branch, nunca mexa no `strict`.
- **PR só de `docs/**`/`*.md` mergeia normalmente** desde a correção de 08/11/2026: `codeql.yml`/
  `lighthouse.yml` não têm mais `paths-ignore` no `pull_request`, então `Analyze (javascript-typescript)`
  e `lighthouse` sempre reportam (detalhe em `docs/agentes/github-ci.md`).
- Merge = produção (Vercel publica a `main` sem esperar o CI): confira o deploy e reporte. CI
  vermelha → leia o resumo da falha antes de qualquer patch; do seu merge → `fix:` em branch nova na mesma
  sessão.
- Fim: link da PR + estado.

## Banco — ler `docs/agentes/banco.md` antes de SQL, migration ou deploy
- Oficial: Supabase **`cfmzkthhgliqelozlmwu`** (`supabase/config.toml:1`); SQL pela **Management API**
  (`scripts/db/supabase-sql-client.mjs`, `readOnly` default), com `SUPABASE_ACCESS_TOKEN`. **Não há MCP de
  SQL versionado neste repo** — confirme em qual projeto o MCP carregado está antes de rodar qualquer coisa.
- NÃO escrever no catálogo externo **`doufsxqlfjyuvxuezpln`** (somente leitura imposta por código) nem no
  CRM **`pgxfvjmuubtbowutlide`**; `nmojwpihnslkssljowjh`, `bojgeppypmtormfjsyun` e `hgbzltfwozdkcudofypy`
  são legado de outra origem. E2E/QA nunca aponta para o oficial nem para o catálogo
  (`scripts/e2e-target.mjs`).
- Diagnóstico = produção só leitura; teste de banco = Postgres descartável (`scripts/qa/simular-*.py`).
  `npm run dev` usa o `.env` local e **não há banco local neste front** — se o `.env` for o de produção, a
  tela fala com produção.
- DDL só pelo fluxo de `banco.md`: arquivo → PR → merge → entrada na allowlist →
  `apply-sicoob-migrations.yml` (dispatch com `APLICAR`, environment `construction`). Migration mesclada é
  **imutável**; DDL aplicado via MCP/Management API exige o `.sql` no **mesmo** commit/PR. Proibido
  `supabase db push`. O ledger ao vivo é a verdade.
- Destrutivo, segredos e rotação: só com o dono. Backup em `_backup_<tabela>_YYYYMMDD` antes de `DROP`;
  RLS ON em toda tabela nova; policy nova usa helper semântico, nunca `has_role(...,'admin')`.

## Serviços
- **Deploy/Vercel** — ler `docs/agentes/servicos.md` ao confirmar deploy ou mexer em env/domínio/CSP.
  Vercel é o publicador oficial (decidido 08/11/2026); nenhum workflow publica o front. CSP
  duplicada em `vercel.json` e `public/_headers` — mexeu em uma, mexa na outra.
- **Edge functions** — deploy só por `deploy-sicoob-functions.yml` (dispatch com `PUBLICAR`, allowlist de
  15 funções); as outras ~93 não sobem por ali. Confirme o run; nunca deploy manual.
- **GitHub/CI** — ler `docs/agentes/github-ci.md` ao mexer em settings, branch protection ou workflows
  (10 required checks, `strict=true`, `enforce_admins=true`, conversas resolvidas). Mudou perímetro →
  atualize a tabela desse doc na mesma PR.
- **Integrações** (Lovable AI, ElevenLabs, Bitrix24, Resend, CNPJa, VirusTotal, Dropbox, n8n/SalesPro,
  catálogo e CRM externos) — tabela de código ↔ segredo em `docs/agentes/servicos.md`; secrets em
  `docs/secrets.md`.
- **Regras de domínio** — ler `docs/agentes/regras-dominio.md` ao mexer em papéis Sicoob, escopo de
  vendedor, verba de PA, kit/recompra, preço do catálogo, aprovação, upload ou cleanup de E2E.

## Stack e comandos — detalhe em `docs/agentes/mapa-repo.md`
- Vite + React + TS (`src/`), Supabase (`supabase/functions/` com 106 funções, `supabase/migrations/` com
  590 arquivos), Vitest (`tests/`), Playwright (`e2e/`), **npm** (`npm ci`; não há `bun.lock` — está no
  `.gitignore`), Node 24.
- `npx vitest run <caminho>`; `node scripts/tscheck-files.mjs <arquivos>` (ou `npm run typecheck`);
  `npx eslint <arquivos>`; `npm run test:scenarios`; `npm run test:e2e:smoke`; `npm run build`;
  `npm run check:agents-md` (integridade deste arquivo e de `docs/agentes/`).
- Antes de qualquer tarefa: `PENDENCIAS.md` (o que está quebrado), `RELATORIO_CI.md` (estado do CI),
  `inventario/estado/` (estado medido do banco e das rotas, regerado por script) e o doc de
  `docs/agentes/` do tema. `docs/ROUTES.md` é gerado — não edite à mão.
- **Contexto gerado para agentes** (não redescubra o que já está medido): branch `contexto`,
  `git show origin/contexto:docs/contexto/00-INDEX.md` — três fontes (`codigo/`, `supabase/`,
  `regras/`) regeradas a cada 10 min por `contexto.yml`; `inventario/estado/*.json` pelo
  `inventario-estado-semanal.yml`. Detalhe em `docs/agentes/contexto-ia.md`.
- Automação em `scripts/<nome>/` com README (leia antes de alterar); nunca em `supabase/` nem `src/`.

## Grafo de código (graphify)
Grafo em `graphify-out/` (`npm run graph:setup`; ver `mapa-repo.md`), fora do Git — cada clone gera o seu.
Quando `graphify-out/graph.json` existir: `graphify query "<pergunta>"`, `graphify path "<A>" "<B>"`,
`graphify explain "<conceito>"` antes de buscar por texto; `GRAPH_REPORT.md` só para revisão ampla.
Alterou código ou o report não é do HEAD atual → `npm run graph:update` (só AST). Em nuvem o grafo é gerado
em segundo plano (`.claude/hooks/session-start.sh`) — siga sem ele até terminar.
