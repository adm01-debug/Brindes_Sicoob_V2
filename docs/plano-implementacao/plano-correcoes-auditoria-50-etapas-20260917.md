# Plano de correções da auditoria tripla em 50 etapas

> **Adendo de 27/09/2026:** [estado de implementação, evidências e limites](../execucao/revisao-do-plano-2026-09-27.md). Preservadas as marcações históricas abaixo.

> **Revisão de 24/09/2026:** [matriz atual dos planos, lacunas e testes executados](../execucao/revisao-do-plano-2026-09-24.md). As marcações históricas abaixo não certificam conclusão integral; a revisão distingue código, implantação e homologação.


> **Revisão de 22/09/2026:** o projeto está em construção. A
> [execução atual, com evidências e estado das 50 etapas](../execucao/correcoes-reconciliacao-20260922.md)
> corrige premissas deste documento: não aplicar migrations históricas em bloco,
> não usar RPC separada de `set_config` como contexto transacional e não tratar
> inventário de nomes como homologação. O conteúdo abaixo preserva o plano histórico.

**Projeto:** `adm01-debug/Brindes_Sicoob_V2` · **Supabase operacional:** `cfmzkthhgliqelozlmwu` · **Catálogo externo (somente leitura):** `doufsxqlfjyuvxuezpln`

**Relação com o plano principal:** este documento é complementar a `docs/plano-implementacao/plano-reconciliacao-50-etapas.md`, não um substituto. O plano principal continua sendo a fonte de verdade para a reconciliação estrutural (Fases 0-7, hoje com Fase 1 — ledger de migrations — só 42/503 classificados). Este plano trata especificamente dos achados da **auditoria tripla de 17/09/2026** (Git↔GitHub, migrations locais↔banco aplicado, código↔banco bidirecional exaustivo). Onde um achado já tem etapa correspondente no plano principal (ex.: a migration-baseline órfã já está prevista na Etapa 12 dele), este plano referencia em vez de duplicar.

**Base factual:** 3 rodadas de auditoria independentes em 17/09/2026 — varredura de 1.193 `.from()` + 125 `.rpc()` + 23 `.storage.from()` em `src/`+`supabase/functions/`, resultando em 289 identificadores únicos endereçados ao client interno, cada um conferido contra o inventário ao vivo (216 tabelas, 4 views, 167 funções, 13 buckets) — mais verificação pessoal direta via MCP/git dos dois achados mais graves. Fecha os ~318 nomes que a Etapa 26 do plano principal tinha deixado fora da amostra original.

**Achado metodológico central desta rodada** (o que muda a priorização de tudo abaixo): a maioria dos objetos "ausentes" encontrados hoje **já tem migration escrita no repositório — só nunca foi aplicada ao banco**, porque caem no mesmo backlog de 472 migrations não registradas no ledger que o plano principal já mapeou (Fase 1, Etapas 9-13, hoje 42/503 classificados). Confirmado por grep direto: `create_quote_version_atomic` (`20260912100000` + followup), o subsistema inteiro de `bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs` (13 arquivos, dez/2025-mar/2026), e `check_rls_enabled`/`get_enum_values` (`20260504135425`) têm migration pronta. Só `sicoob_budgets`, `error_logs` e `companies` (nos call-sites quebrados) genuinamente nunca tiveram migration — e `products`/`companies` locais só existem no cluster legado de jan/2025 já confirmado **superado** pela Etapa 9 do plano principal. Tratar "migration não aplicada" como "arquitetura a decidir" seria trabalho e risco desnecessários; a Fase C abaixo reflete essa distinção.

**Postura e convenções:** idênticas às do plano principal (engenharia defensiva, nenhuma etapa altera produção sem dry-run/rollback escrito, `SUPABASE_PROJECT=cfmzkthhgliqelozlmwu`, migrations idempotentes) — ver lá a "Regra de fechamento de etapa" completa, reaplicada aqui sem repetir o texto.

## Estado medido em 17/09/2026 (ponto de partida desta rodada)

| Dimensão | Medição | Implicação |
|---|---|---|
| `main` local ↔ `origin/main` | 3 commits atrás (trivial) | `git pull` antes de qualquer coisa |
| Commits sem PR cobrindo | 4-5 (`e3db49229`…`d6974924f` + mudanças não commitadas desta sessão) com schema real já em produção | Gap de governança ativo, não só histórico |
| Migration-baseline `20260915143442` | Aplicada no banco (2.681 bytes armazenados), sem arquivo com esse timestamp em nenhum branch | Baseline de produção sem fonte rastreável |
| Ledger de migrations | 494 arquivos locais, 22 no ledger oficial | Mesmo padrão já conhecido do plano principal, números atualizados |
| Referências código→banco quebradas (client interno) | 9 novas confirmadas, além das já fechadas na Etapa 26 do plano principal | 2 delas (Bitrix, versionamento de orçamento) são achados críticos de impacto real |
| Objetos banco→código sem uso confirmado | 21 tabelas/views + 43 funções + 2 buckets | Maioria explicável (partições, cron, RLS helper); ~10 candidatos genuínos a limpeza |

---

## Fase A — Fechar o ciclo Git ↔ GitHub (Etapas 1-4)

### Etapa 1 — Atualizar `main` local
**Depende de:** — · **Risco se pulada:** decisões tomadas contra uma `main` local desatualizada.
**Objetivo:** `main` local == `origin/main`.
**Ações:** `git fetch origin`; `git switch main`; `git pull --ff-only origin main`; confirmar SHA idêntico. `main` não está checked out em nenhum worktree ativo hoje, então o pull é seguro sem stash.
**Aceite:** `git rev-parse main` == `git rev-parse origin/main`.
- [ ] `main` atualizada e confirmada

### Etapa 2 — Abrir PR retroativa para os commits sem revisão
**Depende de:** 1 · **Risco se pulada:** `e3db49229` (ACL/falsificação de identidade), `824cfa3bf` (views sem `security_invoker`), `1fd123847` (TRUNCATE em 195 tabelas) e `d6974924f` (`password_reset_requests`/`audit_log`) seguem em produção sem revisão — exatamente o que a proteção de `main` (Etapa 2 do plano principal) deveria impedir.
**Objetivo:** `gh pr create --base main --head execucao/sicoob-reconciliacao-20260916` cobrindo esses commits + o que resultar desta sessão.
**Ações:** 1. Confirmar ausência de conflito com `main` pós-pull; 2. Descrever a PR resumindo os 4-5 commits; 3. Abrir; 4. Investigar por que a branch protection não capturou esses pushes (aplicados antes da proteção, ou bypass de admin).
**Aceite:** PR aberta; causa do gap identificada.
- [ ] PR aberta
- [ ] Causa do gap de proteção investigada e registrada

### Etapa 3 — Revisar e mergear a PR retroativa
**Depende de:** 2, e das correções mecânicas desta sessão (Etapas 15-16) incluídas antes do merge · **Risco se pulada:** schema de produção continua sem paridade formal com `main`.
**Objetivo:** revisão real do diff acumulado (código já roda em produção — foco em achar o que a revisão original perderia).
**Ações:** revisão linha a linha; confirmar checks obrigatórios (ou registrar exceção justificada se o CI ainda tiver dívida pré-existente — Etapa 46 do plano principal); merge; deletar branch remota se for o fim do ciclo desta branch de trabalho.
**Aceite:** PR `MERGED`; `main` == HEAD da branch de trabalho.
- [ ] Revisão registrada
- [ ] Merge concluído

### Etapa 4 — Limpar artefatos untracked nos worktrees
**Depende de:** — · **Risco se pulada:** nenhum (cosmético), mas polui auditorias futuras.
**Objetivo:** remover `graphify-out/` do worktree de `execucao/sicoob-reconciliacao-20260915`.
**Ações:** confirmar zero referência versionada; remover; adicionar ao `.gitignore` se a ferramenta continuar em uso.
**Aceite:** `git status` limpo nesse worktree.
- [ ] Pasta removida

---

## Fase B — Reparar a migration-baseline órfã (extensão pontual da Etapa 12 do plano principal) — Etapas 5-8

### Etapa 5 — Extrair o SQL real de `20260915143442_sicoob_reconciliation_baseline`
**Depende de:** acesso MCP (já disponível) · **Risco se pulada:** o baseline mais crítico do projeto Sicoob continua sem fonte confiável em qualquer lugar do repositório.
**Objetivo:** reconstituir o `.sql` a partir de `supabase_migrations.schema_migrations.statements` para essa versão e versionar.
**Ações:** `select statements from supabase_migrations.schema_migrations where version='20260915143442'` (read_only); reconstituir preservando ordem; salvar como `supabase/migrations/20260915143442_sicoob_reconciliation_baseline.sql` na branch atual (hoje esse arquivo não existe com esse timestamp em nenhum branch).
**Aceite:** arquivo criado, hash SHA-256 registrado.
- [ ] SQL extraído e versionado

### Etapa 6 — Comparar com `20260915160000_sicoob_reconciliation_baseline.sql`
**Depende de:** 5 · **Risco se pulada:** dois arquivos com nome conceitual igual e conteúdo relacionado mas não idêntico (confirmado: 2.681 vs 2.708 bytes, hashes diferentes) ficam sem reconciliação.
**Objetivo:** determinar se `20260915160000` (existe só no branch `execucao/sicoob-reconciliacao-20260915`, commit `0b99ee634`) é rascunho anterior do mesmo baseline ou artefato divergente.
**Ações:** diff semântico entre `git show 0b99ee634:supabase/migrations/20260915160000_....sql` e o arquivo da Etapa 5; documentar veredito em `docs/execucao/evidencias/`.
**Aceite:** veredito documentado.
- [ ] Diff semântico feito e documentado

### Etapa 7 — Resolver o arquivo duplicado/divergente
**Depende de:** 6 · **Risco se pulada:** `db push`/`migration repair` fica ambíguo sobre qual arquivo é a verdade.
**Objetivo:** um único arquivo ativo por baseline aplicado.
**Ações:** se mesmo conteúdo essencial: `git mv` de `20260915160000_...` para `supabase/migrations_archive/` com README explicando que foi superado pelo arquivo extraído do banco; se divergente: registrar como decisão de arquitetura pendente, não resolver sozinho.
**Aceite:** no máximo 1 arquivo ativo para esse baseline.
- [ ] Resolvido (arquivado ou decisão escalada)

### Etapa 8 — Reparar o ledger para essa versão
**Depende de:** 7 · **Risco se pulada:** CLI do Supabase continua reportando drift nessa migration especificamente.
**Objetivo:** `supabase migration list --linked` alinhado para `20260915143442`.
**Ações:** `supabase migration repair --status applied 20260915143442` (em staging se existir; senão registrar a mesma ressalva já usada nas Etapas 12/14 do plano principal sobre ausência de staging).
**Aceite:** sem `MIGRATIONS_FAILED` para essa versão.
- [ ] Ledger reparado com evidência anexada

---

## Fase C — Corrigir as referências código→banco quebradas ao vivo (Etapas 9-20)

### Etapa 9 — Aplicar o subsistema Bitrix (13 migrations já escritas, nunca aplicadas)
**Depende de:** — · **Risco se pulada:** `bitrix-sync` e `QuotesKanbanPage.tsx` seguem 100% quebrados; um subsistema inteiro corre risco de se perder dentro do backlog genérico de 472 migrations não classificadas.
**Objetivo:** revisar e aplicar como cluster coeso os 13 arquivos (`20251214185703` até `20260301143055`) que definem `bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs` e suas evoluções — só o primeiro (`20251214185703`) tem o `CREATE TABLE`; os outros 12 são ALTER/índice/RLS/função sobre as mesmas tabelas.
**Ações:** 1. Listar os 13 em ordem cronológica e ler cada um; 2. Confirmar cadeia coerente sem `DROP` conflitante; 3. Dry-run (`BEGIN;...ROLLBACK`) antes de aplicar de verdade; 4. Reauditar RLS/ACL com o método correto (ver Etapa 12 abaixo) antes de aplicar — não assumir que desenho de dez/2025 já segue o padrão de segurança atual; 5. Aplicar e registrar no ledger.
**Aceite:** as 3 tabelas existem, RLS correto, sync e Kanban funcionando ponta a ponta.
- [ ] 13 arquivos revisados como cluster
- [ ] RLS/ACL reauditados antes de aplicar
- [ ] Dry-run sem erro
- [ ] Aplicado e testado ponta a ponta

### Etapa 10 — Aplicar `create_quote_version_atomic` (migration + followup já escritos)
**Depende de:** — · **Risco se pulada:** criação de nova versão de orçamento continua quebrada para todo usuário — achado mais grave desta rodada.
**Objetivo:** aplicar `20260912100000_quote_versioning_atomic.sql` + `20260913120001_quote_versioning_atomic_followup.sql` (o followup existe porque uma versão anterior tinha bug — commit `47c474a67`, "corrige a migration de follow-up e os simuladores de QA", branch `execucao/sicoob-20260911130857`, tem o contexto).
**Ações:** 1. Ler o commit `47c474a67` para entender o que o followup corrigiu; 2. Confirmar que aplicar os dois em ordem é seguro (`CREATE OR REPLACE` no followup reaplica por cima); 3. Dry-run; 4. Aplicar; 5. Testar criação de versão ponta a ponta + concorrência (2 chamadas simultâneas com a mesma origem).
**Aceite:** RPC existe; fluxo de versionamento funciona; concorrência não duplica.
- [ ] Contexto do followup lido
- [ ] Aplicado após dry-run
- [ ] Testado ponta a ponta + concorrência

### Etapa 11 — Aplicar `check_rls_enabled`/`get_enum_values` (migration já escrita)
**Depende de:** — · **Risco se pulada:** `migration-health-check` continua sempre retornando resultado errado.
**Objetivo:** aplicar `20260504135425_....sql`.
**Ações:** confirmar dependências; dry-run; aplicar; testar a edge function com um caso conhecido (RLS ligado numa tabela real).
**Aceite:** health-check retorna resultado correto.
- [ ] Aplicado e testado com caso conhecido

### Etapa 12 — Reauditar ACL/RLS de tudo aplicado nas Etapas 9-11 com o método correto
**Depende de:** 9, 10, 11 · **Risco se pulada:** a Etapa 31 do plano principal já achou, na mesma época/origem destas migrations, o padrão "grant direto para `anon`/`authenticated` nunca revogado" e "`REVOKE ALL FROM PUBLIC` não tem efeito porque o projeto concede direto por role, não via `PUBLIC`" — é razoável esperar o mesmo defeito aqui.
**Objetivo:** confirmar com `has_function_privilege('anon', ...)`/`has_function_privilege('authenticated', ...)` (método correto, não `'public'`) que nenhuma função recém-aplicada está executável por quem não deveria.
**Ações:** rodar a mesma varredura da Etapa 31 do plano principal restrita às funções/tabelas aplicadas aqui; corrigir ACL onde necessário.
**Aceite:** 0 funções/tabelas perigosas entre as recém-aplicadas.
- [ ] Varredura rodada
- [ ] ACL corrigida onde necessário

### Etapa 13 — Varredura dirigida "migration existe, nunca aplicada" para os itens restantes
**Depende de:** — · **Risco se pulada:** tratar `error_logs`/`sicoob_budgets`/`companies`/buckets como decisão de arquitetura sem essa checagem — já descartei migration para os três primeiros por grep nesta sessão, mas o mesmo método precisa valer para as listas das Fases D/E antes de classificá-las.
**Objetivo:** aplicar `grep -rl "<nome>" supabase/migrations/` a cada item das listas de órfãos código→banco e banco→código antes de rotular como "decisão pendente".
**Ações:** rodar para todos os itens das Etapas 21 e 27; anotar achados nos respectivos documentos.
**Aceite:** nenhum item classificado como decisão de arquitetura sem essa checagem prévia.
- [ ] Checagem rodada para todos os itens das Fases D/E

### Etapa 14 — `sicoob_budgets`: confirmar identidade com `cooperativa_budgets`
**Depende de:** — · **Risco se pulada:** continua quebrado; `cooperativa_budgets` (existente, zero uso, criada em 3 migrations de 02/05/2026) fica sem propósito claro.
**Objetivo:** nenhuma migration define `sicoob_budgets` (confirmado) — checar se é o mesmo conceito de `cooperativa_budgets` sob nome diferente.
**Ações:** comparar colunas de `cooperativa_budgets` com o que `budgetService.ts` espera; se bater, trocar a referência no código; se não, registrar como decisão de arquitetura genuína.
**Aceite:** decisão registrada; correção aplicada se for o caso.
- [ ] Schema comparado e decisão registrada

### Etapa 15 — `products`/`companies` nos call-sites locais: apontar para o client externo
**Depende de:** — · **Risco se pulada:** continua quebrado nas 2 páginas públicas + hook de templates (11 consumidores) + `whitelabel-comparison.ts`; a única migration que já definiu essas tabelas localmente é do cluster legado de jan/2025, já confirmado **superado** pela Etapa 9 do plano principal — criar de novo contrariaria decisão arquitetural já tomada.
**Objetivo:** trocar os call-sites para o client externo, seguindo o mesmo padrão já correto no resto do app.
**Ações:** 1. `PublicComparisonPage.tsx:85`; 2. `PublicCollectionPage.tsx:100`; 3. `useQuoteTemplates.ts:133`; 4. `src/lib/pdf/whitelabel-comparison.ts` (`companies`, hoje código morto — decidir entre corrigir para o client externo ou remover o módulo, dado que ninguém importa); 5. Verificar as 4 edge functions que usam `products` (`product-webhook` ×5, `visual-search`, `collections-watcher`, `favorites-watcher`).
**Aceite:** páginas públicas e templates voltam a mostrar produto; `whitelabel-comparison.ts` resolvido.
- [ ] 3 call-sites de `src/` corrigidos
- [ ] `whitelabel-comparison.ts` corrigido ou removido
- [ ] Edge functions verificadas
- [ ] Testado manualmente nas rotas públicas

### Etapa 16 — Corrigir os 2 buckets errados (mecânico)
**Depende de:** — · **Risco se pulada:** geração de mockup (`MockupGenerator.tsx`) e upload de foto de piloto (`PilotApprovalPanel.tsx`, hoje código morto) continuam apontando para bucket inexistente.
**Objetivo:** `mockup-assets` → `mockup-art-files` (já existe); `personalization` → `personalization-images` (já existe).
**Ações:** `src/lib/mockup-storage.ts:41,53`; `OffscreenLayoutCapture.tsx:95,104`; `OrderService.ts:257,263`; testar upload nos dois fluxos (o segundo vale corrigir mesmo sendo código morto hoje, é trivial).
**Aceite:** `grep -rn "mockup-assets\|'personalization'" src` vazio; upload testado.
- [ ] 2 buckets corrigidos nos 3 arquivos
- [ ] Upload de mockup testado

### Etapa 17 — `set_config` em `mcp-keys-revoke`: criar wrapper exposto corretamente
**Depende de:** — · **Risco se pulada:** `request.mcp_actor` nunca é setado de verdade — o comentário no código assume "falhas ocasionais", mas falha **sempre** (função `pg_catalog` nunca é exposta via PostgREST, nenhuma migration resolveria isso — é falha de desenho, não backlog).
**Objetivo:** função `public`, `SECURITY DEFINER`, ACL restrita a `service_role`, que chama `set_config` internamente e é de fato exposta via `/rpc/`.
**Ações:** criar a wrapper; trocar a chamada em `mcp-keys-revoke/index.ts:200`; se decidido que não vale o esforço, remover a chamada morta e corrigir o comentário para não prometer o que nunca funcionou.
**Aceite:** `request.mcp_actor` setado de verdade em teste, ou código morto removido com comentário corrigido.
- [ ] Decisão registrada e implementada
- [ ] Testado

### Etapa 18 — `error_logs`: decidir considerando que Sentry já está integrado
**Depende de:** — · **Risco se pulada:** `error-reporter.ts` (importado em `main.tsx` + 2 error boundaries + `structuredLogger.ts`/`webVitals.ts`) já encaminha para `@sentry/react` (real, lazy-loaded sob `VITE_SENTRY_DSN`) **e também** tenta gravar em `error_logs`, que não existe — sem saber se o DSN está configurado em produção, não dá pra saber se o app está genuinamente cego ou só com um caminho redundante quebrado.
**Objetivo:** confirmar `VITE_SENTRY_DSN` em produção antes de decidir.
**Ações:** 1. Checar variável de ambiente de produção; 2. Se configurado: `error_logs` é redundante — decidir entre remover a escrita local ou mantê-la como fallback barato (criar a tabela é trivial); 3. Se não configurado: prioridade sobe — decidir entre configurar Sentry (mais barato, já integrado) ou criar `error_logs`.
**Aceite:** decisão registrada com base no estado real de produção.
- [ ] DSN de produção verificado
- [ ] Decisão registrada e executada

### Etapa 19 — Escrever `scripts/db/check-runtime-refs.mjs`
**Depende de:** 9-18 (para não gerar falso-vermelho nas próprias correções desta fase) · **Risco se pulada:** sem esse script (pedido desde a Etapa 26 do plano principal, nunca escrito), toda auditoria de referência continua manual — foi assim que os achados desta rodada escaparam da anterior.
**Objetivo:** script que extrai `.from()`/`.rpc()`/`.storage.from()`, segue indireção de 1 nível (wrapper de variável — o gap que escondeu `create_quote_version_atomic`), separa client interno de externo pelo identificador importado, confere contra o inventário ao vivo via MCP, e trata `.storage.from()` quebrado em 2 linhas.
**Ações:** portar a lógica usada manualmente nesta auditoria; saída com arquivo:linha; exit code 1 se não vazio (exceto allowlist de decisões pendentes).
**Aceite:** reproduz os achados de hoje contra o estado pré-correção; roda limpo pós Fase C.
- [ ] Script escrito e versionado
- [ ] Validado contra os achados conhecidos
- [ ] 0 órfãos não-documentados pós Fase C

### Etapa 20 — Adicionar o script ao CI
**Depende de:** 19 · **Risco se pulada:** regressão futura só é achada na próxima auditoria manual, não no PR que a introduziu.
**Objetivo:** job no `sicoob-ci.yml` rodando o script em todo PR, com allowlist versionada para decisões arquiteturais ainda pendentes.
**Ações:** adicionar o job; allowlist com data de revisão; testar com referência quebrada de propósito.
**Aceite:** PR de teste com `.from('tabela_inexistente')` é bloqueado.
- [ ] Job no CI
- [ ] Teste de bloqueio anexado

---

## Fase D — Triagem dos achados banco→código (Etapas 21-26)

### Etapa 21 — Registrar as 21 tabelas/views órfãs com dono nomeado
**Depende de:** 13 · **Risco se pulada:** lista fica só em relatório, sem dono nem prazo, não vira ação.
**Objetivo:** cada um dos 21 (`blog_posts`, `magic_up_comments`/`_public_shares`/`_reactions`, `manager_notification_config`, `mockup_templates`, `notification_channels`, `order_logistics_tracking`, `pa_singularidades`, `pontos_atendimento`, `portfolio_items`, `qa_rls_audits`, `quote_audit_logs`, `sensitive_access_logs`, `sicoob_budget_audit`, `telemetry_logs`, `test_suites_runs`, `v_full_scope_grants`, `webhook_configs`, `webhook_logs`, `admin_config_audit`) recebe dono e categoria inicial (manter/investigar/candidato a remoção).
**Ações:** tabela em `docs/execucao/evidencias/orfaos_banco_20260917.md`.
**Aceite:** 21/21 preenchidos.
- [ ] Tabela criada com 21/21

### Etapa 22 — Família `pontos_atendimento`/`singulares`/`pa_singularidades` vs. `postos_atendimento`/`cooperativas`
**Depende de:** 21 · **Risco se pulada:** nomenclatura duplicada confunde leitura do schema e pode esconder gravação no lugar errado.
**Objetivo:** confirmar vestígio de iteração de nomenclatura anterior (hipótese da auditoria), não dado ativo.
**Ações:** `select count(*)` nas 3 tabelas antigas; se vazias e sem FK: mover para arquivo/deprecated com aprovação (mesma cautela da Etapa 41 do plano principal); se tiverem dado, investigar por que nunca migrou.
**Aceite:** decisão registrada e executada.
- [ ] Contagem/FKs verificadas
- [ ] Decisão executada

### Etapa 23 — `blog_posts`
**Depende de:** 21 · **Risco se pulada:** tabela morta no inventário de segurança sem necessidade.
**Objetivo:** confirmar ausência de rota (`src/routes/config/*.ts`) e decidir remoção.
**Ações:** confirmar zero rotas; `DROP TABLE` com aprovação ou documentar como reserva para feature futura.
**Aceite:** decisão executada.
- [ ] Decisão executada

### Etapa 24 — "Magic Up": 3 das 6 tabelas nunca usadas
**Depende de:** 21 · **Risco se pulada:** feature parcialmente implementada fica em limbo.
**Objetivo:** entender por que comentários/compartilhamento público/reações nunca foram ligados enquanto o resto da feature funciona.
**Ações:** revisar o restante do código da feature; decidir entre terminar ou remover as 3 tabelas + UI órfã relacionada.
**Aceite:** decisão de produto registrada.
- [ ] Decisão registrada

### Etapa 25 — RPCs Sicoob prontas mas nunca chamadas (`sicoob_performance_reports`, `sicoob_approval_policies`, `sicoob_order_shipments`)
**Depende de:** 21 · **Risco se pulada:** funcionalidade já construída (schema + RPC) fica invisível ao usuário final.
**Objetivo:** confirmar se falta só o call-site no frontend e ligar.
**Ações:** procurar tela candidata em `src/`; ligar se existir e usar caminho errado; registrar como pendência de frontend se não existir.
**Aceite:** decisão registrada; ligação aplicada se for o caso.
- [ ] Telas investigadas
- [ ] Ligação aplicada ou registrada como pendência

### Etapa 26 — Views `sicoob_budget_audit`/`v_full_scope_grants` → `AuditEvidenceDashboard.tsx`
**Depende de:** 21 · **Risco se pulada:** views de auditoria prontas seguem sem consumidor — fit óbvio e barato com o painel já existente (o mesmo arquivo corrigido nesta sessão para `rls_denial_log`).
**Objetivo:** adicionar seção ao dashboard consumindo essas 2 views.
**Ações:** confirmar schema; adicionar card/tabela no padrão visual existente; confirmar `security_invoker` antes de expor.
**Aceite:** dashboard mostra os dados para um admin.
- [ ] UI adicionada e testada como admin

---

## Fase E — Funções e buckets órfãos (Etapas 27-28)

### Etapa 27 — Classificar as 43 funções órfãs
**Depende de:** 13 · **Risco se pulada:** parte é ferramental de ops legítimo, parte pode ser código morto — sem classificar, limpeza é arriscada.
**Objetivo:** marcar cada uma como ferramenta de ops (manter), chamada indireta não capturada pela auditoria (reclassificar), ou órfã de verdade.
**Ações:** estender o script da Etapa 19 para checar `pg_proc` referenciando `pg_proc` (chamada função→função além de 1 nível); rodar contra as 43; revisar manualmente o resto.
**Aceite:** 43/43 classificadas.
- [ ] Script estendido e 43/43 classificadas

### Etapa 28 — Buckets órfãos `order-documents` e `component-media`
**Depende de:** — · **Risco se pulada:** confusão futura entre `order-documents`/`sicoob-order-documents` e entre o bucket e a tabela homônima `component_media` (usada).
**Objetivo:** confirmar resquício de nomenclatura (mesmo padrão da Etapa 25 do plano principal) e decidir.
**Ações:** confirmar 0 objetos armazenados; remover ou renomear com ADR.
**Aceite:** decisão executada.
- [ ] Decisão executada

---

## Fase F — Prevenção de regressão (Etapas 29-33)

### Etapa 29 — Job de CI: drift de ledger de migrations
**Depende de:** — · **Risco se pulada:** o gap achado nesta rodada (baseline órfã) se repete quando alguém aplicar DDL via MCP sem commitar no mesmo dia.
**Objetivo:** job periódico (schedule, não por PR — aplicação via MCP não passa por PR) comparando `supabase_migrations.schema_migrations` remoto contra `supabase/migrations/*.sql` de `main`.
**Ações:** reaproveitar a query desta auditoria; agendar via GitHub Actions `schedule` diário; notificar (issue automático, mesmo padrão da Etapa 48 do plano principal).
**Aceite:** testado contra o estado de hoje (pré Fase B), acusaria `20260915143442` corretamente.
- [ ] Job criado, agendado e validado

### Etapa 30 — Investigar e corrigir o gap de branch protection
**Depende de:** 2 · **Risco se pulada:** commits continuam chegando sem PR mesmo com a proteção da Etapa 2 do plano principal aplicada.
**Objetivo:** entender o mecanismo exato (timing, bypass de admin, ou a proteção nunca cobriu branches que não são `main`) e fechar.
**Ações:** conforme achado da Etapa 2 desta fase.
**Aceite:** causa raiz entendida; mitigação aplicada ou aceite documentado.
- [ ] Causa raiz identificada e mitigada

### Etapa 31 — Alerta de "commit sem PR há mais de N dias"
**Depende de:** 30 · **Risco se pulada:** schema em produção sem revisão só é achado na próxima auditoria manual, meses depois.
**Objetivo:** job periódico listando commits em branch remota sem PR cobrindo, acima de um limiar (ex.: 3 dias).
**Ações:** script via `gh api`; agendar; notificar.
**Aceite:** testado contra o estado de hoje, acusaria os 4 commits corretamente.
- [ ] Job criado e validado

### Etapa 32 — Runbook: aplicar DDL via MCP corretamente
**Depende de:** — · **Risco se pulada:** o padrão "aplica primeiro, documenta depois (às vezes nunca)" que causou o achado da Fase B se repete por falta de processo escrito.
**Objetivo:** `docs/RUNBOOKS/MCP_DDL_APPLICATION.md` — extrair e commitar o `.sql` no mesmo commit/PR da aplicação via MCP, nunca depois; se emergencial, issue de follow-up com prazo.
**Ações:** escrever, usando `20260915143442` como exemplo do que não fazer.
**Aceite:** runbook existe e é referenciado no ponto de entrada do processo (CLAUDE.md/CONTRIBUTING).
- [ ] Runbook escrito e referenciado

### Etapa 33 — Varredura dedicada a `.storage.from()` quebrado em 2 linhas
**Depende de:** — · **Risco se pulada:** a auditoria original (Etapa 26 do plano principal) não pegava esse padrão de formatação — pode haver mais casos além dos já achados hoje (`proposals`, `personalization`, `qa-evidences`).
**Objetivo:** regex tolerante a quebra de linha entre `.storage.from(` e o nome do bucket, em todo `src/`+`supabase/functions/`.
**Ações:** rodar; conferir achados contra os 13 buckets reais.
**Aceite:** lista completa, independente de formatação.
- [ ] Varredura feita e cruzada com os buckets reais

---

## Fase G — Consolidação de documentação (Etapas 34-38)

### Etapa 34 — Persistir o relatório da auditoria tripla
**Depende de:** — · **Risco se pulada:** o trabalho de hoje (3 rodadas + verificação pessoal) fica só na conversa.
**Objetivo:** `docs/execucao/evidencias/auditoria_tripla_20260917.md`, formato igual ao de `sicoob_referencias_runtime_20260916.md`.
**Ações:** escrever o consolidado apresentado nesta sessão.
**Aceite:** documento commitado.
- [ ] Documento escrito e versionado

### Etapa 35 — Atualizar a Etapa 26 do plano principal
**Depende de:** 34 · **Risco se pulada:** o plano principal registra a Etapa 26 como fechada para a amostra de 277, mas hoje foram achadas 9 referências reais adicionais fora dela.
**Objetivo:** adenda linkando para este plano e para o novo doc de evidência.
**Ações:** editar sem reescrever o que já está correto.
**Aceite:** Etapa 26 reflete a varredura 100% (não amostral) de 17/09.
- [ ] Etapa 26 atualizada

### Etapa 36 — Atualizar "Estado medido" do plano principal
**Depende de:** — · **Risco se pulada:** a tabela do topo do plano principal ainda mostra números de 15-16/09 (ex.: "503/4" quando hoje é "494/22") — desatualização já notada nesta auditoria.
**Objetivo:** reconferir cada linha contra o estado atual e atualizar com data de 17/09/2026.
**Ações:** não confiar na memória — reconferir linha a linha.
**Aceite:** tabela atualizada.
- [ ] Tabela reconferida e atualizada

### Etapa 37 — Documento único de decisões arquiteturais pendentes
**Depende de:** 14, 15, 17, 18, 22, 24 · **Risco se pulada:** decisões pendentes espalhadas em vários docs, difícil de cobrar.
**Objetivo:** `docs/execucao/decisoes_pendentes.md` consolidando `roles`, `sicoob_budgets`/`cooperativa_budgets` (se não resolvido mecanicamente), `user_2fa_settings`+`personalization_techniques`, `error_logs`/Sentry, família `pontos_atendimento`, "Magic Up" incompleto — cada uma com 2-3 linhas de contexto e link para a etapa que detalha.
**Ações:** consolidar sem duplicar decisões já resolvidas.
**Aceite:** lista única e atual.
- [ ] Documento criado

### Etapa 38 — Levar as decisões pendentes para quem decide
**Depende de:** 37 · **Risco se pulada:** correção trava indefinidamente em itens que não são decisão técnica.
**Objetivo:** ação humana — agendar revisão com responsável de produto/arquitetura.
**Ações:** fora do escopo de código; registrar compromisso e prazo aqui.
**Aceite:** decisões coletadas e registradas de volta no doc da Etapa 37.
- [ ] Reunião/decisão assíncrona registrada

---

## Fase H — Validação final (Etapas 39-45)

### Etapa 39 — Rerun completo do `check-runtime-refs.mjs`
**Depende de:** 20 e as correções decididas na Fase C · **Risco se pulada:** sem essa validação, não há prova de que as correções fecharam os achados.
**Objetivo:** 0 órfãos não-documentados.
**Aceite:** saída limpa (ou só allowlist de decisões ainda pendentes).
- [ ] Script rodado com saída anexada

### Etapa 40 — Suite de testes pós-correção
**Depende de:** 39 · **Risco se pulada:** correções mecânicas (troca de bucket/client) podem ter efeito colateral não percebido.
**Ações:** `npm run typecheck`, `npm run test:rls`, `npm run healthcheck`.
**Aceite:** verdes, ou falhas explicadas por dívida pré-existente conhecida.
- [ ] 3 suítes rodadas e registradas

### Etapa 41 — Teste manual dos fluxos críticos corrigidos
**Depende de:** 9, 10, 15, 16 · **Risco se pulada:** teste automatizado não cobre necessariamente a jornada completa.
**Objetivo:** criar versão de orçamento, ver produto em página pública/coleção, gerar mockup, sincronizar com Bitrix (se mantido) — testados manualmente ponta a ponta.
**Aceite:** 4/4 funcionando, com evidência.
- [ ] 4 fluxos testados com evidência

### Etapa 42 — Confirmar `main` == branch de trabalho pós-merge
**Depende de:** 3 · **Risco se pulada:** —.
**Aceite:** `git log main..origin/execucao/sicoob-reconciliacao-20260916` vazio.
- [ ] Confirmado

### Etapa 43 — Confirmar reparo do ledger para o escopo desta rodada
**Depende de:** 8 · **Risco se pulada:** —.
**Objetivo:** `supabase migration list --linked` sem `MIGRATIONS_FAILED` para as versões tratadas aqui (não exige resolver as 494-22 restantes — isso é escopo do plano principal).
**Aceite:** confirmado para o escopo tratado.
- [ ] Confirmado

### Etapa 44 — Nota de mudanças para stakeholders externos
**Depende de:** 9 (se Bitrix afetado) · **Risco se pulada:** integração externa (Bitrix24, catálogo externo) surpreendida por mudança de comportamento.
**Ações:** comunicar quem administra essas integrações.
**Aceite:** comunicação enviada e registrada (ou N/A justificado).
- [ ] Comunicação enviada

### Etapa 45 — Atualizar CHANGELOG/nota de release
**Depende de:** 39, 40, 41 · **Risco se pulada:** histórico de correções fica só nos commits individuais.
**Aceite:** entrada de changelog existe resumindo esta rodada.
- [ ] CHANGELOG atualizado

---

## Fase I — Débito técnico para o próximo ciclo (Etapas 46-50)

### Etapa 46 — Backlog formal das decisões não resolvidas
**Depende de:** 38 · **Risco se pulada:** pendências não decididas a tempo somem.
**Ações:** converter o doc da Etapa 37 em itens de backlog rastreável, com dono e prazo.
**Aceite:** cada pendência viva tem item de backlog linkado.
- [ ] Itens de backlog criados

### Etapa 47 — Agendar `check-runtime-refs.mjs` semanalmente (não só por PR)
**Depende de:** 20 · **Risco se pulada:** referências que quebram por mudança no banco (não no código — ex.: tabela dropada via MCP) não são pegas por gate de PR.
**Ações:** job agendado (cron semanal) contra `main` e o banco ao vivo.
**Aceite:** job ativo, primeira execução registrada.
- [ ] Job agendado e validado

### Etapa 48 — Reforçar a prioridade da Fase 2 (staging) do plano principal
**Depende de:** — · **Risco se pulada:** toda esta rodada de correções (Fase C) foi testada direto em produção por falta de staging — mesmo risco estrutural documentado desde a Etapa 21 do plano principal, não sustentável no médio prazo.
**Ações:** nenhuma ação nova — apontar explicitamente a dependência e o risco acumulado para quem prioriza o plano principal.
**Aceite:** risco comunicado formalmente.
- [ ] Risco comunicado

### Etapa 49 — Prazo de decisão para os órfãos remanescentes
**Depende de:** 21, 27, 28 · **Risco se pulada:** itens "investigar" ficam eternamente como "investigar".
**Ações:** revisar as tabelas dessas etapas, adicionar coluna de prazo.
**Aceite:** 0 itens sem prazo.
- [ ] Prazos definidos

### Etapa 50 — Retrospectiva: por que a Etapa 26 original não pegou esses achados
**Depende de:** todas · **Risco se pulada:** o próximo ciclo repete os mesmos gaps de método (indireção de RPC via wrapper, `.storage.from()` quebrado em 2 linhas, ausência de checagem de bucket, não checar se "ausente" já tem migration pronta antes de escalar como decisão de arquitetura).
**Objetivo:** `docs/execucao/retrospectiva_auditoria_20260917.md` — o que a varredura de 16/09 fez certo, o que perdeu, e como o script da Etapa 19 fecha esses gaps permanentemente.
**Aceite:** gaps de método listados um a um com a correção correspondente no script.
- [ ] Retrospectiva escrita

---

## Métricas de saída desta rodada

| Métrica | Hoje (17/09/2026) | Meta |
|---|---|---|
| Commits em produção sem PR | 4-5 | 0 |
| Migration-baseline sem fonte rastreável | 1 (`20260915143442`) | 0 |
| Referências código→banco quebradas (client interno, confirmadas) | 9 | 0 |
| Subsistemas com migration pronta e nunca aplicada | ≥2 (Bitrix, versionamento de orçamento) | 0 |
| Script `check-runtime-refs.mjs` | não existe | no CI, bloqueando PR |
| Tabelas/views órfãs sem dono nomeado | 21 | 0 (todas com dono e categoria) |
| Funções órfãs sem classificação | 43 | 0 |
| Decisões arquiteturais pendentes sem prazo | todas | 0 |
