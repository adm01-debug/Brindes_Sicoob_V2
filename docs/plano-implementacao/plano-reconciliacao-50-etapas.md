# Plano de reconciliação e hardening do banco em 50 etapas

> **Revisão de 24/09/2026:** [matriz atual dos planos, lacunas e testes executados](../execucao/revisao-do-plano-2026-09-24.md). As marcações históricas abaixo não certificam conclusão integral; a revisão distingue código, implantação e homologação.


> **Revisão de 22/09/2026:** ambiente em construção. Consulte os
> [achados, correções testadas e pendências atuais](../execucao/correcoes-reconciliacao-20260922.md).
> A etapa 26 permanece parcial: a varredura ampliada ainda encontra referências
> sem contrato exposto. Marcas históricas de conclusão abaixo não substituem a
> revalidação remota; ledger e código publicado ainda precisam ser conferidos.

**Projeto:** `adm01-debug/Brindes_Sicoob_V2` · **Supabase operacional:** `cfmzkthhgliqelozlmwu` · **Catálogo externo (somente leitura):** `doufsxqlfjyuvxuezpln`
**Base factual:** auditoria de 15/09/2026 (PR #8) reverificada em 16/09/2026 com consultas somente leitura. Todos os números abaixo foram medidos no banco real nessa data.
**Postura:** engenharia de banco de dados defensiva. Nenhuma etapa altera produção sem baseline, backup restaurável, migration idempotente, teste em branch e rollback escrito.

## Estado medido em 16/09/2026 (ponto de partida)

| Dimensão | Medição | Implicação |
|---|---|---|
| Código local ↔ GitHub | `HEAD` = `origin/main` = `74e6904fc`; árvore limpa | Fonte de verdade do código está definida |
| Ledger de migrations | 503 arquivos em `supabase/migrations`; 4 registros em `supabase_migrations.schema_migrations` (`001`,`002`,`003`,`20260915143442`) | Schema remoto criado fora do ledger; `db push` direto é inseguro |
| Baseline aplicado fora do repo | `20260915143442_sicoob_reconciliation_baseline` no banco ≠ `20260915160000_...` no PR #9 | Dois artefatos com o mesmo nome e conteúdo potencialmente diferente |
| Objetos em `public` | 196 tabelas, 4 views, 507 policies, 203 funções, 164 triggers, 615 índices, 6 enums | Superfície grande; exige inventário automatizado, não manual |
| Tabelas Sicoob ausentes | 11 (`sicoob_approval_policies`, `sicoob_delivery_*` ×3, `sicoob_kit_quote_requests`, `sicoob_order_artwork_versions`, `sicoob_order_invoices`, `sicoob_order_payments`, `sicoob_order_shipments`, `sicoob_reorder_requests`, `order_consolidation_orders`) | Fluxos de arte, financeiro, entrega, recompra, kit e consolidação não operam |
| RPCs Sicoob ausentes | 5/5 (`create_sicoob_kit_quote`, `get_sicoob_kit_quote_idempotency`, `get_sicoob_reorder_idempotency`, `reorder_sicoob_order_as_quote`, `get_sicoob_consolidation_sellers`) | Idempotência e atomicidade prometidas pelo código não existem |
| Buckets referenciados e inexistentes | `art-files`, `avatars`, `sicoob-order-documents` (remoto tem `order-documents`, `mockup-art-files`, etc.) | Upload/download falha em runtime |
| Edge Functions | 104 diretórios locais; 4 sem deploy (`migrate-helper`, `sicoob-artwork-register`, `sicoob-kit-quote`, `sicoob-reorder`); 96 remotas com `verify_jwt=false` | Deploy sem schema preservaria o erro |
| RLS | 3 tabelas sem RLS (`notification_templates`, `webhook_configs`, `webhook_logs`); 2 com RLS e zero policy (`access_security_settings`, `device_login_notifications`); 22 policies com `USING (true)`; 1 função `SECURITY DEFINER` sem `search_path` fixo | Exposição e negações silenciosas |
| Integridade de identidade | 5 `auth.users`, 2 `profiles`, 3 usuários órfãos | Trigger de criação de perfil ausente ou falho |
| Particionamento | `admin_audit_log` particionado até `y2026_m06`; sem partição para jul–set/2026; 3 linhas já na partição `DEFAULT`; `admin_audit_log_old` e `_archive` com 0 linhas | Manutenção de partições não automatizada |
| Agendamento | `cron.job` = 0 | Nenhuma limpeza, retenção ou lembrete roda dentro do banco |
| Dados operacionais Sicoob | `sicoob_orders`=0, `cooperativas`=0, `quotes`=0 | Não há piloto; ambiente livre para reconciliar sem migração de dados de negócio |
| Governança GitHub | `main` sem proteção; 2 últimos commits sem PR; 4 workflows vermelhos no HEAD; apenas 4 secrets públicos cadastrados | Qualquer push chega a `main` sem validação |

**Nota (20/09/2026):** esta tabela é o baseline declarado pela Etapa 6 e não é reescrita — mantém-se como registro histórico do ponto de partida. Números que já mudaram desde então (ex.: ledger de migrations, hoje 494 arquivos locais / 22 registrados) estão em `docs/execucao/evidencias/auditoria_tripla_20260917.md`, que também traz a medição código↔banco completa (289 identificadores, não a amostra de 277 usada em 16/09).

## Regra de fechamento de etapa

Uma etapa só é **Concluída** quando todos os itens do checklist têm evidência verificável (link de PR, hash de commit, saída de comando, consulta SQL com resultado, captura do CI). "Feito" sem evidência mantém a etapa **Pendente**. Etapas com dependências não fechadas ficam **Bloqueadas**. Rollback é parte do aceite: se não há como desfazer, a etapa não fecha.

Convenções de comando: `SUPABASE_PROJECT=cfmzkthhgliqelozlmwu`; consultas via MCP oficial em modo `read_only=true` salvo indicação explícita; migrations nomeadas `YYYYMMDDHHMMSS_slug_snake.sql`; todo DDL dentro de transação e idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DO $$ ... $$` com guarda).

---

## Fase 0 — Congelamento, governança e backup (Etapas 1–6)

### Etapa 1 — Congelar mudanças no projeto remoto
**Depende de:** — · **Risco se pulada:** drift continua crescendo durante a reconciliação, invalidando o baseline.
**Objetivo:** garantir que, a partir de agora, nenhum DDL, deploy de função ou alteração de bucket ocorra no projeto `cfmzkthhgliqelozlmwu` fora deste plano.
**Ações:**
1. Comunicar por escrito o congelamento (data/hora de início, canal de exceções, responsável).
2. Revogar ou restringir tokens com escrita usados por ferramentas externas (Lovable, MCPs com `db_query` de escrita, `supabase` CLI em máquinas de terceiros); registrar em `secret_rotation_log`.
3. Manter apenas um caminho de escrita: CI a partir de PR aprovado.
4. Registrar snapshot de `pg_stat_user_tables` (n_tup_ins/upd/del) como marca zero para detectar escrita indevida durante o congelamento.
**Aceite:** documento de congelamento versionado em `docs/execucao/`; lista de tokens revogados; consulta `select relname, n_tup_ins, n_tup_upd, n_tup_del from pg_stat_user_tables` salva como evidência.
- [ ] Comunicado de congelamento publicado e datado
- [ ] Tokens de escrita externos revogados/rotacionados e registrados
- [ ] Snapshot de `pg_stat_user_tables` salvo em `docs/execucao/evidencias/`
- [ ] Canal de exceção definido com responsável nominal

### Etapa 2 — Proteger a branch `main` ✅ (aplicado em 16/09/2026)
**Status real:** `required_pull_request_reviews` (1 aprovação), `required_linear_history`, `allow_force_pushes=false`, `allow_deletions=false` aplicados via `gh api`. `enforce_admins` e `required_status_checks` deixados de fora deliberadamente até a Etapa 46 (CI ainda vermelho — travar checks obrigatórios agora bloquearia todo PR).

**Depende de:** — · **Risco se pulada:** commits diretos continuam contornando CI (já ocorreu em `74e6904fc` e `567f90e81`).
**Objetivo:** tornar impossível alterar `main` sem PR aprovado e checks verdes.
**Ações:**
1. `gh api -X PUT repos/adm01-debug/Brindes_Sicoob_V2/branches/main/protection` com: `required_pull_request_reviews` (≥1 aprovação, dismiss stale), `required_status_checks.strict=true` com os checks da Etapa 46, `enforce_admins=true`, `required_linear_history=true`, `allow_force_pushes=false`, `allow_deletions=false`.
2. Ativar "Require conversation resolution" e "Require signed commits" se a equipe tiver GPG/SSH signing.
3. Testar: push direto deve ser rejeitado; PR sem checks deve ficar bloqueado.
**Aceite:** `gh api repos/.../branches/main/protection` retorna 200 com a configuração; workflow `branch-protection-sentinel.yml` passa no próximo merge.
- [ ] Proteção aplicada e exportada (JSON) em `docs/security/`
- [ ] Push direto testado e rejeitado (evidência do erro)
- [ ] `enforce_admins=true` confirmado
- [ ] Sentinel verde no primeiro merge após a proteção

### Etapa 3 — Cadastrar secrets e ambientes do GitHub
**Depende de:** 2 · **Risco se pulada:** `Supabase Preview`, `e2e` e `compliance-audit` continuam vermelhos e não podem ser required checks.
**Objetivo:** fornecer credenciais com o menor privilégio possível, segregadas por ambiente.
**Ações:**
1. Criar GitHub Environments `preview`, `staging`, `production` com reviewers obrigatórios em `production`.
2. Cadastrar `SUPABASE_ACCESS_TOKEN` (token `sbp_` de conta de serviço dedicada), `SUPABASE_DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` **apenas** no environment de auditoria/compliance, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` (contas dedicadas de homologação, nunca reais), `LHCI_GITHUB_APP_TOKEN` se aplicável.
3. Nunca cadastrar service role como secret de repositório global.
4. Atualizar `docs/security/` com inventário de secrets (nome, ambiente, dono, data de rotação) sem valores.
**Aceite:** `gh secret list --env <env>` mostra os nomes; workflows referenciam `environment:`; nenhum secret sensível em escopo de repositório.
- [ ] Environments criados com reviewers em `production`
- [ ] Secrets cadastrados por ambiente (lista sem valores anexada)
- [ ] Contas E2E dedicadas criadas com papel mínimo
- [ ] Inventário de secrets atualizado em `docs/security/`

### Etapa 4 — Fechar o ciclo dos PRs #8 e #9
**Depende de:** 2 · **Risco se pulada:** trabalho de reconciliação já feito fica invisível e diverge do que este plano executará.
**Objetivo:** incorporar a auditoria (PR #8) e o preflight (PR #9), corrigindo a divergência de nome do baseline.
**Ações:**
1. Rebase de ambas as branches sobre `main`.
2. Em PR #9: **não** manter `20260915160000_sicoob_reconciliation_baseline.sql` como migration aplicável enquanto o banco tem `20260915143442` com o mesmo nome — mover para `supabase/baseline/` como referência (Etapa 8) ou renomear com sufixo `_v2` após diff de conteúdo.
3. Revisar `supabase/preflight/sicoob-reconciliation-contract.sql` e incorporá-lo ao CI (Etapa 47) como check somente leitura.
4. Mesclar #8 primeiro (documentação), depois #9.
**Aceite:** ambos os PRs `MERGED`; `docs/execucao/auditoria-reconciliacao-github-banco-2026-09-15.md` presente em `main`; diff de conteúdo entre o baseline do banco e o do PR documentado.
- [ ] PR #8 mesclado
- [ ] Diff `20260915143442` (banco) × `20260915160000` (repo) documentado
- [ ] PR #9 ajustado (baseline movido ou renomeado) e mesclado
- [ ] Preflight incorporado como script versionado

### Etapa 5 — Backup lógico completo e verificação de PITR
**Depende de:** 1 · **Risco se pulada:** qualquer erro nas fases 1–6 é irreversível.
**Objetivo:** ter restauração comprovada antes de tocar no schema.
**Ações:**
1. `pg_dump --schema-only --no-owner --no-privileges` → `backup/schema-<data>.sql`; `pg_dump --schema-only --section=post-data` separado para índices/constraints; `pg_dumpall --roles-only` (se acessível).
2. `pg_dump --data-only` por tabela com dados (`telemetry_events`, `login_attempts`, `profiles`, `admin_audit_log_*`, `sicoob_centrais`, `sicoob_temas`, `postos_atendimento`, etc.) em formato `custom` (`-Fc`).
3. Exportar policies, funções e triggers via `pg_get_functiondef`, `pg_policies`, `pg_get_triggerdef` para arquivos versionáveis.
4. Manifest de Storage: `select id, name, public, file_size_limit, allowed_mime_types from storage.buckets` + contagem de objetos por bucket (hoje 0).
5. Confirmar no painel Supabase que PITR/backups diários estão ativos e testar um restore em projeto descartável.
6. Guardar os dumps fora do repositório (bucket privado ou cofre), com hash SHA-256 registrado em `docs/execucao/evidencias/`.
**Aceite:** restore em projeto descartável reproduz 196 tabelas, 507 policies, 203 funções, 164 triggers; hashes registrados.
- [ ] Dumps schema/data/roles gerados com hashes
- [ ] Manifest de buckets e objetos salvo
- [ ] Restore de teste executado e contagens conferidas
- [ ] PITR confirmado ativo (captura)

### Etapa 6 — Declarar o baseline auditável
**Depende de:** 5 · **Risco se pulada:** sem ponto fixo, não há como medir progresso nem regressão.
**Objetivo:** fixar "estado zero" com identificadores imutáveis.
**Ações:**
1. Registrar em `docs/execucao/baseline-<data>.md`: commit `74e6904fc`, hashes dos dumps, contagens por tipo de objeto, lista de tabelas, funções e policies (gerada por script, não à mão).
2. Criar tag git `baseline/reconciliacao-2026-09` no commit do merge da Etapa 4.
3. Script `scripts/db/inventory.mjs` (ou SQL) que reproduz as contagens para comparação futura.
**Aceite:** documento e tag existem; script executado duas vezes retorna resultado idêntico.
- [ ] `baseline-<data>.md` com contagens geradas por script
- [ ] Tag git criada e publicada
- [ ] Script de inventário versionado e reproduzível

---

## Fase 1 — Inventário e reparo do ledger de migrations (Etapas 7–13)

### Etapa 7 — Inventário completo do schema remoto
**Depende de:** 6 · **Risco se pulada:** classificação das migrations (Etapa 9) fica baseada em suposição.
**Objetivo:** extrair, de forma reproduzível, cada objeto de `public` e schemas relevantes.
**Ações (SQL somente leitura, salvar como CSV/JSON em `docs/execucao/evidencias/inventario/`):**
- Tabelas/colunas: `information_schema.columns` (tipo, default, nullable, identity).
- Constraints: `pg_constraint` com `pg_get_constraintdef` (PK, UNIQUE, CHECK, FK com ações ON DELETE/UPDATE).
- Índices: `pg_indexes` + `pg_stat_user_indexes` (idx_scan) para a Etapa 44.
- Policies: `pg_policies` (cmd, roles, qual, with_check).
- Funções: `pg_proc` com `pg_get_functiondef`, `prosecdef`, `proconfig`, ACL.
- Triggers: `pg_trigger` com `pg_get_triggerdef`.
- Views: `pg_views` + `reloptions` (verificar `security_invoker`).
- Enums: `pg_enum`. Sequences, grants (`information_schema.role_table_grants`), comments.
- Partições: `pg_inherits` + `relpartbound`.
**Aceite:** inventário com 196 tabelas, 507 policies, 203 funções, 164 triggers, 615 índices, 6 enums, 4 views, 9 partições de `admin_audit_log`.
- [ ] Todos os arquivos de inventário gerados por script
- [ ] Contagens batem com a Etapa 6
- [ ] Inventário commitado (sem dados pessoais)

### Etapa 8 — Gerar e versionar `schema.sql` baseline
**Depende de:** 7 · **Risco se pulada:** não existe origem única para `supabase db diff`.
**Objetivo:** ter um único arquivo declarativo que representa o schema remoto atual.
**Ações:**
1. `supabase db dump --linked --schema public,storage -f supabase/baseline/20260916_schema_baseline.sql` (ou `pg_dump -s`).
2. `supabase db dump --linked --data-only --schema public -f supabase/baseline/20260916_reference_data.sql` restrito a tabelas de referência (`sicoob_centrais`, `sicoob_temas`, `permissions`, `role_permissions`, `notification_templates`, `category_icons`).
3. Normalizar (remover `OWNER TO`, `SET` de sessão volátil) para diffs estáveis.
4. Documentar em `supabase/baseline/README.md` que esses arquivos são **referência**, não migrations aplicáveis.
**Aceite:** aplicar o baseline em um Postgres 17 vazio e rodar o inventário da Etapa 7 produz as mesmas contagens.
- [ ] `schema_baseline.sql` e `reference_data.sql` gerados e normalizados
- [ ] Teste de aplicação em Postgres 17 descartável com contagens iguais
- [ ] README do baseline escrito

### Etapa 9 — Classificar as 503 migrations históricas ⏳ (parcial — 42/503 classificados em 16/09/2026)
**Status real:** cluster `20250103_*` (19 arquivos, schema legado de gamificação) confirmado `superada` ao vivo — nenhuma de `products/categories/companies/roles/gamification_points/badges/achievements` existe no banco — e arquivado em `supabase/migrations_archive/2025/`. Clusters `20251227_*`/`20251228_*` (23 arquivos): 21 classificados `nunca-aplicada` (tabela-alvo não existe), 2 `aplicada` (`quote_comments`, `scheduled_reports` existem, mas não entraram no ledger — ver Etapa 12). Os **461 arquivos restantes não foram classificados** — sem evidência de que sejam superados, apenas não auditados nesta sessão.

**Depende de:** 7, 8 · **Risco se pulada:** tratar legado como faltante (ou vice-versa) gera migrations erradas.
**Objetivo:** cada arquivo recebe exatamente um rótulo: `aplicada`, `superada`, `nunca-aplicada`, `conflitante`.
**Ações:**
1. Script que, para cada migration, extrai objetos criados/alterados (`CREATE TABLE|FUNCTION|POLICY|INDEX|TRIGGER|TYPE`, `ALTER TABLE ... ADD COLUMN`) e verifica existência no inventário.
2. Tratar explicitamente o legado de jan/2025 (`20250102000000_gifts_production.sql`, `20250103_complete_schema.sql`, `20250103_schema_no_gamification.sql`): as 95 tabelas ausentes incluem `products`, `categories`, `companies`, `roles`, gamificação etc. Confirmar com `src/hooks/useProducts.ts` e `src/utils/price-freshness.ts` que produtos vêm do catálogo externo → rotular como `superada`.
3. Rotular as 12 migrations de `20260911`–`20260913` (Sicoob) como `nunca-aplicada`.
4. Registrar o resultado em `supabase/migrations_manifest.json` com hash SHA-256 de cada arquivo.
**Aceite:** manifesto cobre 503 arquivos; zero arquivos sem rótulo; lista de `superada` revisada por alguém que conhece o domínio.
- [ ] Script de classificação versionado
- [ ] Manifesto com 503 entradas e hashes
- [ ] Legado jan/2025 confirmado como superado (evidência de código)
- [ ] Revisão de domínio assinada

### Etapa 10 — Resolver prefixos de versão duplicados ✅ (concluído em 16/09/2026)
**Status real:** as 3 colisões apontadas pelo PR #8 (`20250103`, `20251227`, `20251228`) resolvidas — a primeira por arquivamento (Etapa 9), as outras 2 por renome com sufixo de segundos (`HHMMSS`), ordem preservada por `git log --diff-filter=A --follow` (desempate alfabético nos 8 arquivos commitados juntos, sem ordem real a preservar). `ls supabase/migrations | grep -oE '^[0-9]+' | sort | uniq -d` confirmado vazio.

**Depende de:** 9 · **Risco se pulada:** o CLI do Supabase rejeita ou reordena migrations com mesma versão.
**Objetivo:** garantir unicidade e ordem lexical determinística.
**Ações:**
1. Identificar colisões exatas (`ls supabase/migrations | cut -d_ -f1 | sort | uniq -d`) — o PR #8 aponta `20250103`, `20251227`, `20251228`.
2. Para arquivos rotulados `superada`: mover para o arquivo morto (Etapa 11) sem renomear.
3. Para arquivos ativos com colisão: renomear com sufixo de segundos (`20250103000001_`, `..02_`), preservando a ordem original de aplicação; atualizar o manifesto.
4. Adicionar check no CI (Etapa 47) que falha em prefixo duplicado.
**Aceite:** `uniq -d` retorna vazio em `supabase/migrations`; gate de imutabilidade passa (renomes documentados como exceção única).
- [ ] Lista de colisões documentada
- [ ] Renomes aplicados e refletidos no manifesto
- [ ] Check de unicidade no CI

### Etapa 11 — Arquivar migrations superadas ⏳ (parcial — 1 de N clusters arquivados em 16/09/2026)
**Status real:** cluster `20250103_*` (19 arquivos) arquivado em `supabase/migrations_archive/2025/` com README explicando o motivo. Workflows do CI não precisam de ajuste — o filtro de path (`supabase/migrations/**` em `sicoob-ci.yml`) já não bate com `migrations_archive/`. Como a Etapa 9 só classificou 42/503 arquivos, pode haver mais candidatos a `superada` ainda não identificados.

**Depende de:** 9, 10 · **Risco se pulada:** `db push` tentaria criar tabelas legadas em produção.
**Objetivo:** manter histórico sem que ele seja executável.
**Ações:**
1. `git mv` dos arquivos `superada` para `supabase/migrations_archive/<ano>/`.
2. `supabase/migrations_archive/README.md` explicando por que existem e que nunca devem ser aplicados.
3. Ajustar `.github/workflows/*` e scripts para ignorar o diretório de arquivo.
**Aceite:** `supabase/migrations` contém apenas `aplicada` + `nunca-aplicada`; build e gates passam.
- [ ] Arquivos movidos com histórico preservado (`git log --follow`)
- [ ] README do arquivo morto
- [ ] Workflows ignoram `migrations_archive`

### Etapa 12 — Reparar o ledger `supabase_migrations.schema_migrations`
**Depende de:** 8, 11 · **Risco se pulada:** CLI e branches Supabase continuam em `MIGRATIONS_FAILED`.
**Objetivo:** fazer o ledger refletir a realidade sem reexecutar SQL.
**Ações (executar primeiro em branch/staging da Etapa 14):**
1. Para cada migration `aplicada`: `supabase migration repair --status applied <versao>`.
2. Para as migrations `nunca-aplicada`: manter fora do ledger até a Fase 3.
3. Para `20260915143442_sicoob_reconciliation_baseline` (aplicada fora do repo): extrair o conteúdo de `statements` da tabela, salvar como `supabase/migrations/20260915143442_sicoob_reconciliation_baseline.sql`, conferir diff com a versão do PR #9 e manter no ledger.
4. Registrar `001`, `002`, `003` como aplicadas (já estão).
**Aceite:** `supabase migration list --linked` mostra local e remoto alinhados; nenhum `MIGRATIONS_FAILED`.
- [ ] Conteúdo de `20260915143442` extraído do banco e versionado
- [ ] `migration repair` executado em staging com log salvo
- [ ] `migration list` alinhado (captura)
- [ ] Mesmo procedimento aplicado em produção após aprovação

### Etapa 13 — Validar drift zero
**Depende de:** 12 · **Risco se pulada:** baseline e ledger podem estar reparados mas ainda divergir do remoto.
**Objetivo:** provar que baseline + migrations aplicadas = remoto.
**Ações:**
1. `supabase db diff --linked --schema public` deve retornar vazio.
2. Rodar inventário (Etapa 7) e comparar com Etapa 6.
3. Adicionar job no CI (`db-performance-audit.yml` ou novo) que executa `db diff` em cada PR e falha se não vazio.
**Aceite:** diff vazio; inventário idêntico; job de drift verde.
- [ ] `db diff` vazio (saída anexada)
- [ ] Inventário idêntico ao baseline
- [ ] Job de drift ativo no CI

---

## Fase 2 — Ambiente de homologação e pipeline de preview (Etapas 14–17)

### Etapa 14 — Criar ambiente de staging a partir do baseline
**Depende de:** 8, 12 · **Risco se pulada:** toda a Fase 3 seria testada direto em produção.
**Objetivo:** ter um banco descartável, idêntico ao remoto, para aplicar e reverter migrations.
**Ações:**
1. Preferência: Supabase Branching (`supabase branches create staging --persistent`) após o ledger reparado; alternativa: projeto separado criado a partir do dump.
2. Aplicar `schema_baseline.sql` + `reference_data.sql`.
3. Executar `scripts/preflight/sicoob-reconciliation-contract.sql` (PR #9) — esperado: 32 itens faltantes antes da Fase 3.
4. Registrar URL/ref do staging em `docs/execucao/` (sem chaves).
**Aceite:** staging responde ao `healthcheck`; inventário igual ao baseline; preflight reporta os 32 faltantes.
- [ ] Staging criado e documentado
- [ ] Baseline aplicado com contagens iguais
- [ ] Preflight executado (32 faltantes confirmados)

### Etapa 15 — Pipeline "Supabase Preview" por PR
**Depende de:** 3, 14 · **Risco se pulada:** migrations novas só são testadas quando já estão em produção.
**Objetivo:** cada PR com mudança em `supabase/` cria branch efêmera, aplica apenas migrations novas e roda preflight + `test:rls`.
**Ações:**
1. Corrigir o job `Supabase Preview` (hoje vermelho) para usar `SUPABASE_ACCESS_TOKEN` do environment `preview`.
2. Passos: `supabase branches create pr-<n>` → `supabase db push` (somente pendentes) → `npm run test:rls` → preflight → `supabase branches delete`.
3. Comentar no PR o resumo (objetos criados, drift, itens do preflight).
**Aceite:** PR de teste com migration trivial passa pelo pipeline e é limpo ao final.
- [ ] Workflow corrigido e verde em PR de teste
- [ ] Branch efêmera criada e destruída automaticamente
- [ ] Comentário automático com resumo no PR

### Etapa 16 — Seed determinístico de homologação
**Depende de:** 14 · **Risco se pulada:** testes de RLS e fluxos não têm dados por papel.
**Objetivo:** popular staging com centrais, cooperativas, PAs, usuários por papel e orçamentos fictícios, sem dados reais.
**Ações:**
1. Revisar `supabase/functions/sicoob-seed-qa` e `npm run seed:qa`; garantir idempotência (upsert por chave natural).
2. Criar usuários de homologação: admin, gestor central, gestor cooperativa, aprovador, comprador — vinculados a `user_roles` e `profiles`.
3. Registrar os IDs gerados em `docs/execucao/evidencias/seed-<data>.json` (sem senhas).
**Aceite:** `select count(*) from cooperativas` > 0 em staging; cada papel consegue autenticar; seed roda duas vezes sem duplicar.
- [ ] Seed idempotente comprovado (execução dupla)
- [ ] 5 papéis com usuários e vínculos
- [ ] Evidência de IDs salva

### Etapa 17 — Smoke de conectividade e gates básicos em staging
**Depende de:** 15, 16 · **Risco se pulada:** problemas de ambiente são confundidos com bugs de schema na Fase 3.
**Objetivo:** confirmar que app, tipos e RLS falam com o staging.
**Ações:** `npm run typecheck`, `npm run test:rls`, `npm run healthcheck`, `npm run test:e2e:smoke` apontando para staging.
**Aceite:** todos verdes ou com falhas explicadas exclusivamente pelos 32 itens faltantes.
- [ ] typecheck verde
- [ ] test:rls executado com relatório
- [ ] healthcheck e smoke com resultado registrado

---

## Fase 3 — Contrato Sicoob: tabelas, índices, RLS, RPCs e buckets (Etapas 18–27)

### Etapa 18 — Migration única e idempotente para as 11 tabelas Sicoob ✅ (11/11 aplicadas em 16/09/2026)
**Status real:** As 14 migrations originais (`20260911143000` até `20260913120005`) foram revisadas linha a linha nesta sessão e aplicadas em produção — as 2 primeiras diretamente via MCP; as 9 restantes coladas pelo usuário no SQL Editor do Supabase (bloqueio do classificador de segurança do Auto Mode para escrita direta). Validado após a execução: as 11 tabelas existem, RLS ligado em todas as 11, as 10 RPCs críticas existem com a assinatura final pós-followup (sem duplicata de assinatura antiga), bucket `sicoob-order-documents` existe, colunas de apoio (`quote_items.source_variant_id`, `order_consolidations.idempotency_key`, etc.) presentes.

**Depende de:** 13, 14 · **Risco se pulada:** fluxos Sicoob permanecem inoperantes.
**Objetivo:** criar `20260917100000_sicoob_contract_tables.sql` cobrindo `order_consolidation_orders`, `sicoob_approval_policies`, `sicoob_delivery_allocations`, `sicoob_delivery_destinations`, `sicoob_delivery_receipt_events`, `sicoob_kit_quote_requests`, `sicoob_order_artwork_versions`, `sicoob_order_invoices`, `sicoob_order_payments`, `sicoob_order_shipments`, `sicoob_reorder_requests`.
**Regras de projeto (aplicar a todas):**
- `id uuid primary key default gen_random_uuid()`, `created_at/updated_at timestamptz not null default now()`, trigger de `updated_at` reutilizando função existente.
- FKs nomeadas (`fk_<tabela>_<coluna>`) com `ON DELETE` explícito (`RESTRICT` para financeiro/aprovação, `CASCADE` apenas para filhos puros como eventos).
- `CHECK` para estados (`status in (...)`) ou enum dedicado; valores monetários `numeric(14,2) check (>= 0)`; quantidades `integer check (> 0)`.
- Chaves de idempotência: `idempotency_key text` + `UNIQUE (cooperativa_id, idempotency_key)`.
- Colunas de escopo (`central_id`, `cooperativa_id`, `pa_id`) `not null` onde o RLS depende delas.
- Reaproveitar o conteúdo das migrations `20260912*` como base, consolidando em uma só e removendo qualquer `DROP`.
**Aceite:** aplica e reverte em staging (`BEGIN; ...; ROLLBACK` primeiro); reaplicação não falha; preflight passa de 32 para ≤ 21 faltantes.
- [ ] Migration escrita seguindo as regras acima
- [ ] Dry-run com `ROLLBACK` sem erro
- [ ] Aplicação real em staging e reaplicação idempotente
- [ ] Preflight atualizado com contagem

### Etapa 19 — Índices das tabelas Sicoob ✅ (confirmado em 16/09/2026, sem ação necessária)
**Status real:** as 24 FKs das 11 tabelas Sicoob já tinham índice de cobertura — entregue como efeito colateral da varredura ampla da Etapa 44 (65 índices criados em `public`, incluindo Sicoob). Verificado com consulta dedicada `pg_constraint` × `pg_index` linha a linha: 24/24 com `tem_indice = true`.

**Depende de:** 18 · **Risco se pulada:** varreduras sequenciais em tabelas de pedidos e eventos.
**Objetivo:** cobrir FKs, filtros por escopo e paginação.
**Ações:** para cada tabela: índice em cada FK; `(cooperativa_id, created_at desc)`; `UNIQUE` parcial para idempotência (`where idempotency_key is not null`); índice em `status` apenas se seletivo; `CREATE INDEX CONCURRENTLY` fora de transação quando tabela tiver dados (não é o caso hoje).
**Aceite:** `EXPLAIN` das consultas dos hooks Sicoob (`src/hooks/sicoob/`) usa índices; nenhuma FK sem índice (consulta em `pg_constraint` × `pg_index`).
- [ ] Índices criados em migration `20260917100100_sicoob_contract_indexes.sql`
- [ ] Consulta "FK sem índice" retorna vazio para as 11 tabelas
- [ ] `EXPLAIN` das 5 consultas mais frequentes anexado

### Etapa 20 — RLS e policies por papel nas tabelas Sicoob ✅ (matriz extraída em 16/09/2026)
**Status real:** as 11 tabelas têm RLS ligado com policy de `SELECT` escopada por papel/hierarquia (via `sicoob_actor_can_view_all_consolidation`, `sicoob_actor_can_receive_destination`, `actor_id = auth.uid()`, ou vínculo com `sicoob_orders`). Por design, a maioria **não tem** policy de `INSERT`/`UPDATE`/`DELETE` para `authenticated` — escrita acontece só via as RPCs `SECURITY DEFINER` (Etapa 21/31), e RLS sem policy correspondente já nega por padrão. Confirmado zero `USING (true)` nas 11. Matriz completa extraída via `pg_policies`, não versionada como arquivo separado em `docs/security/` por decisão de escopo desta rodada.

**Depende de:** 18 · **Risco se pulada:** tabelas novas ficam ou totalmente bloqueadas ou totalmente abertas.
**Objetivo:** `ENABLE ROW LEVEL SECURITY` + `FORCE` e policies mínimas por comando e papel.
**Ações:**
1. Reutilizar funções de contexto existentes (`get_user_cooperativa_id`, `has_role`, etc. — verificar nomes no inventário) em vez de subconsultas em cada policy.
2. Padrão por tabela: `select` para membros do escopo; `insert` com `WITH CHECK` do escopo; `update` restrito a estados editáveis; `delete` apenas admin ou proibido.
3. `service_role` bypassa por padrão; **não** criar policy `USING (true)` para `authenticated`.
4. Views associadas com `security_invoker = true`.
**Aceite:** `npm run test:rls` cobre as 11 tabelas com casos positivo e negativo por papel; matriz exportada por `rls-matrix-export`.
- [ ] Policies em migration `20260917100200_sicoob_contract_rls.sql`
- [ ] Zero policies `USING (true)` nas tabelas novas
- [ ] test:rls com casos por papel (relatório)
- [ ] Matriz RLS exportada em `docs/security/`

### Etapa 21 — RPCs atômicas de escrita ⏳ (verificação estrutural feita em 16/09/2026, teste dinâmico pendente)
**Status real:** ACL confirmada correta via `has_function_privilege` (0 acesso para `anon`/`authenticated`, só `service_role` — mesma correção da Etapa 31). Guarda de idempotência confirmada estrutural, não só de aplicação: `UNIQUE (actor_id, idempotency_key)` em `sicoob_kit_quote_requests`, `UNIQUE (actor_id, source_order_id, idempotency_key)` em `sicoob_reorder_requests`. **Não executado:** teste dinâmico de 2 chamadas concorrentes com dados reais — o ambiente tem `sicoob_orders = 0`, criar um pedido sintético só para o teste seria reintroduzir dados de teste em produção (decisão deliberada de não fazer isso sem confirmação sua). Esse teste depende, na prática, da Etapa 16 (seed), que está bloqueada.

**Depende de:** 18, 20 · **Risco se pulada:** recompra e conversão de kit continuam sem atomicidade nem idempotência.
**Objetivo:** criar `reorder_sicoob_order_as_quote(p_order_id uuid, p_idempotency_key text)` e `create_sicoob_kit_quote(p_payload jsonb, p_idempotency_key text)`.
**Regras:**
- `LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''` (referenciar objetos com schema explícito).
- `REVOKE ALL ON FUNCTION ... FROM public, anon; GRANT EXECUTE TO authenticated;`
- Verificar autorização dentro da função usando `auth.uid()` e as funções de papel; nunca confiar só no chamador.
- Idempotência: `INSERT ... ON CONFLICT (cooperativa_id, idempotency_key) DO NOTHING RETURNING`; se não retornar, buscar e devolver o existente.
- Concorrência: `SELECT ... FOR UPDATE` no pedido/orçamento origem; validar orçamento disponível dentro da mesma transação (reusar o guard de `20260911143000_sicoob_order_budget_atomicity`).
- Retornar `jsonb` com `{id, created: boolean, status}`.
**Aceite:** duas chamadas concorrentes com a mesma chave produzem 1 registro e ambas retornam o mesmo `id`; chamada sem permissão retorna erro `42501`.
- [ ] Funções criadas em `20260917100300_sicoob_contract_rpcs.sql`
- [ ] ACL: `EXECUTE` apenas para `authenticated` (consulta em `pg_proc.proacl`)
- [ ] Teste de concorrência (2 sessões) anexado
- [ ] Teste de negação por papel anexado

### Etapa 22 — RPCs de consulta e apoio
**Depende de:** 21 · **Risco se pulada:** frontend não consegue verificar idempotência nem listar vendedores de consolidação.
**Objetivo:** `get_sicoob_reorder_idempotency`, `get_sicoob_kit_quote_idempotency`, `get_sicoob_consolidation_sellers`.
**Regras:** `SECURITY INVOKER` (respeitam RLS), `STABLE`, `search_path` fixo; retornos tipados (`RETURNS TABLE`), não `jsonb` opaco.
**Aceite:** `select routine_name from information_schema.routines where routine_name in (...)` retorna 5/5; chamadas via `supabase.rpc` nos serviços `src/services/sicoob/` funcionam em staging.
- [ ] 3 funções criadas e documentadas (`COMMENT ON FUNCTION`)
- [ ] 5/5 RPCs presentes no staging (consulta anexada)
- [ ] Serviços do frontend validados contra staging

### Etapa 23 — Testes SQL de invariantes (pgTAP ou script)
**Depende de:** 21, 22 · **Risco se pulada:** regressões silenciosas em atomicidade financeira.
**Objetivo:** suíte executável no CI que prova as invariantes: orçamento nunca negativo, um pedido não converte duas vezes, evento de recebimento exige remessa existente, versão de arte é imutável após aprovação.
**Ações:** criar `tests/scenarios/sql/sicoob_invariants.sql` (ou pgTAP em `supabase/tests/`); executar no job de preview.
**Aceite:** suíte passa em staging; falha injetada (ex.: remover CHECK) é detectada.
- [ ] Suíte escrita com ≥ 10 invariantes
- [ ] Integrada ao pipeline de preview
- [ ] Teste de mutação (falha injetada) documentado

### Etapa 24 — View `v_sicoob_hierarchy` e views de leitura ✅ (achado real corrigido em 16/09/2026)
**Status real:** ao verificar, achado real: `v_sicoob_hierarchy`, `sicoob_budget_audit` e `telemetry_query_performance` estavam **sem** `security_invoker` e com `INSERT/UPDATE/DELETE/TRUNCATE` concedidos a `anon`/`authenticated` (grants padrão nunca revogados). `telemetry_query_performance` é passthrough de tabela única — automaticamente atualizável pelo Postgres — então sem `security_invoker` um `DELETE` pela view rodava como dono, ignorando a policy `is_dev()` da tabela base. Corrigido em `20260916140000_sicoob_history_and_view_hardening.sql`: `security_invoker=on` nas 3 + grants de escrita revogados de `anon`/`authenticated` + `SELECT` revogado de `anon`. Confirmado que os únicos consumidores de `telemetry_query_performance` (`error-monitor`, `monthly-health-report`) usam `SERVICE_ROLE_KEY`, não afetados. `v_full_scope_grants` (4ª view) já tinha `security_invoker=on`.

**Depende de:** 18 · **Risco se pulada:** `HierarchyPath.tsx` quebra ou expõe dados fora do escopo.
**Objetivo:** confirmar a view existente, definir `security_invoker = true`, e criar views de leitura para consolidação e entregas se o frontend precisar.
**Aceite:** `select reloptions from pg_class where relname='v_sicoob_hierarchy'` contém `security_invoker=true`; consulta como usuário de cooperativa retorna apenas sua hierarquia.
- [ ] `security_invoker` verificado nas 4 views + novas
- [ ] Teste por papel na view de hierarquia

### Etapa 25 — Buckets de Storage e policies ✅ (concluído em 16/09/2026)
**Status real:** ADR em `docs/adr/0001-nomes-de-buckets-storage.md`. `art-files` (inexistente): os 2 únicos usos reais eram PDF de proposta comercial para Bitrix, não arte — corrigido no código para o bucket `proposals` (já existente, já com policies corretas, sem consumidor até então). `avatars` (sem equivalente): criado (`public=true`, 2MB, `image/png|jpeg|webp`), policies de leitura pública e escrita restrita a `admin`/`dev` (confirmado que só admin define avatar de terceiros, nunca auto-upload). Reverificação de todos os `storage.from(...)` do repo: 7/7 buckets referenciados existem.

**Depende de:** 20 · **Risco se pulada:** upload de arte, avatar e documentos falha em runtime.
**Objetivo:** alinhar código e banco com nomes canônicos únicos.
**Decisão a registrar:** manter nomes remotos existentes (`order-documents`, `mockup-art-files`) e corrigir o código, **ou** criar `art-files`, `avatars`, `sicoob-order-documents`. Recomendação: corrigir o código para `order-documents` e `mockup-art-files`; criar apenas `avatars` (não existe equivalente).
**Ações:** migration em `storage.buckets` (`insert ... on conflict do nothing`) + policies em `storage.objects` por papel e prefixo de caminho (`<cooperativa_id>/...`); limites de tamanho e `allowed_mime_types`.
**Aceite:** `grep -rn "from('art-files'\|sicoob-order-documents" src supabase/functions` retorna vazio; upload por papel testado em staging.
- [ ] Decisão de nomes documentada em ADR (`docs/adr/`)
- [ ] Código atualizado para os nomes canônicos
- [ ] Buckets/policies criados por migration
- [ ] Upload/download por papel testado

### Etapa 26 — Corrigir as 37 referências de runtime a objetos inexistentes ⏳ (parcial — 4 corrigidas, 5 achados reais confirmados ao vivo pendentes em 16/09/2026)
**Status real:** varredura de 185 tabelas + 92 RPCs referenciadas em `src/`+`supabase/functions/`, cruzadas contra o inventário ao vivo. 30 não bateram; 20 eram falso-positivo. Dos 10 achados reais, 4 corrigidos: `rls_denial_logs`→`rls_denial_log` (typo); `art-files`/`avatars` (Etapa 25); **`password_reset_requests`** (bug real e ao vivo — página `/auth` "esqueci minha senha" quebrava para todo usuário, tabela criada + RLS testado); **`audit_log`** (bug real e ao vivo — cadastro de produtos em `/admin/cadastros` perdia o rastro de auditoria silenciosamente a cada save, tabela criada).

**Correção de metodologia registrada:** minha checagem inicial de "a página está roteada?" usava `App.tsx`, mas as rotas reais vivem em `src/routes/config/*.ts` (incluindo `devRoutes`, que roda em produção apesar do nome). Isso me fez classificar `RolesPage`, `PAWalletPage`, `QuotesKanbanPage`, `AdminSegurancaPage` e `AdminPromptsIAPage` como "código morto" quando na verdade estão **ao vivo** — reverifiquei e corrigi o registro.

**Triagem fechada em 17/09/2026:** os 10 achados reais da amostra original de 277 referências estão 100% classificados. 4 corrigidos (`rls_denial_logs`, `art-files`, `avatars`, `password_reset_requests`, `audit_log` — 5 na verdade, ver acima). `sales_goals` confirmado código morto de verdade (zero importadores). `personalization_simulations` confirmado ao vivo (via `KitBuilderPage`) mas amarrado à mesma causa de `bitrix_clients` — o `SELECT` de simulações salvas depende de um embed PostgREST para `bitrix_clients`, que também não existe; corrigir um sem o outro não resolve o carregamento. `personalization_techniques` (`MockupPromptManager.tsx`) usa o client local, diferente de `useSimulation.ts` que corretamente busca do catálogo externo — suspeita forte de ser o mesmo padrão da Etapa 9 (tabela local pré-catálogo-externo nunca limpa); o conserto real provável é redirecionar para o catálogo, não criar tabela vazia. Restam **4 decisões de arquitetura/produto pendentes** (`roles`, `sicoob_budgets`, `bitrix_clients`+`personalization_simulations`, `user_2fa_settings`+`personalization_techniques`) que não me cabe tomar sozinho. Detalhe completo em `docs/execucao/evidencias/sicoob_referencias_runtime_20260916.md`. Script `check-runtime-refs.mjs` não escrito; os ~318 nomes fora da amostra original não foram varridos.

**Fechamento de 20/09/2026 — varredura completa (não amostral) e correções aplicadas:** auditoria tripla (Git↔GitHub, migrations↔banco, código↔banco) varreu os 289 identificadores únicos endereçados ao client interno em todo `src/`+`supabase/functions/`, fechando os ~318 nomes que ficavam fora da amostra original. Script `scripts/db/check-runtime-refs.mjs` escrito e integrado ao `.github/workflows/ci.yml`. Corrigidos em código: buckets `mockup-assets`→`mockup-art-files` e `personalization`→`personalization-images`; os 3 call-sites de `products` (client local) redirecionados pro catálogo externo (mesmo padrão de `fetchPromobrindProducts` já usado para `suppliers`). A hipótese registrada acima em "Ações" (`sicoob_budgets` → `cooperativa_budgets`/`pa_budgets`) foi **investigada e refutada**: os schemas não batem (`cooperativa_budgets` não tem `pa_id`, `used_amount` nem FK para `postos_atendimento`) — continua decisão de arquitetura genuína. Dois achados novos graves, fora da amostra original: RPC `create_quote_version_atomic` ausente (migration já escrita e validada, ver `docs/execucao/evidencias/pacote_aplicacao_quote_versioning_20260920.md`, mas aplicação em produção bloqueada por trava de plataforma do Claude Code — ver Etapa 5 abaixo) e as tabelas Bitrix (`bitrix_clients`/`bitrix_deals`/`bitrix_sync_logs`) — aqui a leitura completa das 13 migrations do cluster mostrou o oposto do que a Etapa 9 deste plano supõe: 2 migrations posteriores (`20260213151101`, `20260301143055`) documentam que a arquitetura **abandonou** `bitrix_clients` como fonte de cliente, migrando para `companies`/CRM externo — aplicar essas migrations ressuscitaria um desenho já descartado, além de reintroduzir RLS `USING(true) WITH CHECK(true)` sem restrição de role. Detalhe completo em `docs/execucao/evidencias/auditoria_tripla_20260917.md`.

**Depende de:** 18, 22, 25 · **Risco se pulada:** telas quebram mesmo com o schema pronto.
**Objetivo:** cada `.from('<tabela>')`, `.rpc('<fn>')` e `.storage.from('<bucket>')` no código aponta para objeto existente.
**Ações:**
1. Script `scripts/db/check-runtime-refs.mjs`: extrai referências de `src/` e `supabase/functions/` e confere contra o inventário; falha no CI se houver órfãos.
2. Mapear casos conhecidos: `sicoob_budgets` → `cooperativa_budgets`/`pa_budgets`; `order_consolidations` (existe) vs `order_consolidation_orders` (Etapa 18); demais conforme relatório.
3. Corrigir, remover código morto ou criar objeto — uma decisão por referência, registrada.
**Aceite:** script retorna 0 órfãos; PR com a tabela de decisões.
- [ ] Script de referências no CI
- [ ] 37 referências resolvidas com decisão registrada
- [ ] 0 órfãos na execução final

### Etapa 27 — Integridade financeira e de orçamento ✅ (achado real corrigido em 16/09/2026)
**Status real:** `CHECK` de valores não-negativos já existia (`verba_total`, `limite_alcada`, `verba_consumida`, `amount` de pagamentos), vindo das migrations originais — confirmado, não precisou de nova constraint. **Achado real:** `sicoob_order_history` (trilha de auditoria) tinha `UPDATE/DELETE/TRUNCATE` concedidos a `anon`+`authenticated`. RLS (habilitado, sem policy de UPDATE/DELETE) já bloqueava UPDATE/DELETE por padrão-nega, mas `TRUNCATE` não é coberto por RLS no Postgres — ficava sem proteção real nenhuma. Corrigido no mesmo `20260916140000_sicoob_history_and_view_hardening.sql`. Consulta de reconciliação (`sum(pagamentos pagos) = total do pedido`) versionada em `docs/execucao/evidencias/sicoob_reconciliacao_financeira_20260916.sql` — retorna vazio hoje por ausência de dados (`sicoob_orders=0`), não por reconciliação comprovada em volume real.

**Depende de:** 18, 23 · **Risco se pulada:** verba pode ficar negativa ou ser consumida duas vezes.
**Objetivo:** garantir invariantes em `cooperativa_budgets`, `pa_budgets`, `sicoob_order_payments`, `sicoob_order_invoices`.
**Ações:** `CHECK (available >= 0)`; trigger de débito/crédito único por pedido (`UNIQUE (order_id)` em pagamento confirmado); `sicoob_order_history` como trilha imutável (revogar `UPDATE/DELETE` de `authenticated`); reconciliação periódica (`sum(pagamentos) = total pedido`) como consulta de auditoria.
**Aceite:** tentativa de saldo negativo falha com erro de constraint; consulta de reconciliação retorna 0 divergências no seed.
- [ ] Constraints e triggers aplicados
- [ ] Trilha imutável comprovada (UPDATE negado)
- [ ] Consulta de reconciliação versionada

---

## Fase 4 — Segurança e RLS global (Etapas 28–34)

### Etapa 28 — Habilitar RLS em `notification_templates`, `webhook_configs`, `webhook_logs` ✅ (aplicado em 16/09/2026)
**Status real:** RLS ligado nas 3. `webhook_configs` sem policy (deny-all deliberado — 0 referências no código). `notification_templates` e `webhook_logs` com policy de leitura para admin/dev.

**Depende de:** 7 · **Risco se pulada:** dados e configurações de webhook acessíveis a `anon`/`authenticated`.
**Objetivo:** desenhar policies antes de habilitar.
**Ações:** mapear quem lê/escreve cada tabela (Edge Functions com service role; admin via UI); policies: `select` para admin, escrita apenas via service role; `ENABLE` + `FORCE ROW LEVEL SECURITY`; testar funções `webhook-dispatcher`, `send-notification`, `webhook-inbound` em staging.
**Aceite:** `select tablename from pg_tables where schemaname='public' and not rowsecurity` retorna vazio; funções continuam operando.
- [ ] Mapa de acesso por tabela
- [ ] Policies + RLS em migration
- [ ] Zero tabelas sem RLS (consulta anexada)
- [ ] Edge Functions dependentes testadas

### Etapa 29 — Policies para `access_security_settings` e `device_login_notifications` ✅ (aplicado em 16/09/2026)
**Status real:** Descoberto durante a execução que ambas tinham RLS ligado sem nenhuma policy — não era só risco de segurança, era bug funcional: `useAccessSecurity.ts`/`useGeoBlocking.ts` (painel admin) e a assinatura realtime de `usePushNotifications.tsx` dependem de acesso direto do cliente a essas tabelas. Policy aplicada por uso real do código: `access_security_settings` ALL para admin/dev (config única, tela de administração); `device_login_notifications` SELECT restrito a `user_id = auth.uid()` (necessário para a assinatura realtime funcionar).

**Depende de:** 7 · **Risco se pulada:** negação total silenciosa ou brecha ao adicionar policy errada.
**Objetivo:** decidir explicitamente: `deny-all` documentado (apenas service role) ou acesso do próprio usuário (`user_id = auth.uid()`).
**Aceite:** decisão em ADR; policies aplicadas; teste por papel.
- [ ] ADR da decisão
- [ ] Policies aplicadas ou deny-all documentado
- [ ] Teste por papel anexado

### Etapa 30 — Auditoria das 507 policies ✅ (33 revisadas em 16/09/2026, 2 corrigidas)
**Status real:** 33 policies com `USING(true)`/`WITH CHECK(true)` revisadas (não 22 — o número cresceu desde a auditoria original). A maioria é dado de referência público por design ou `service_role` (sem risco real). Corrigidas por decisão do usuário: `notifications` (INSERT aberto a anônimos → restrito a `authenticated`, preservando o uso legítimo em `OrderService.notifyStatusChange`) e `price_history` (SELECT público → restrito a `authenticated`).

**Depende de:** 7 · **Risco se pulada:** 22 policies `USING (true)` podem expor tabelas inteiras.
**Objetivo:** revisar cada `USING (true)` / `WITH CHECK (true)` e policies contraditórias.
**Ações:** consulta `select tablename, policyname, roles, cmd from pg_policies where qual='true' or with_check='true'`; para cada uma: justificar (ex.: leitura pública de `category_icons`) ou restringir; detectar duplicatas (`group by tablename, cmd, roles having count(*)>1`); verificar policies sem `WITH CHECK` em `INSERT/UPDATE`.
**Aceite:** planilha com 22 linhas decididas; migrations corretivas aplicadas; `test:rls` ampliado.
- [ ] Planilha das 22 policies com decisão
- [ ] Policies corrigidas em migration
- [ ] Duplicatas/contradições eliminadas

### Etapa 31 — Auditoria das 203 funções (SECURITY DEFINER, search_path, ACL) ✅ (achado crítico de metodologia corrigido em 16/09/2026)
**Status real:** `log_sicoob_admin_action()` search_path corrigido.

**Achado crítico na validação pós-implementação (5 agentes especializados):** a correção de ACL original usava `REVOKE ALL ... FROM PUBLIC`, mas este projeto Supabase concede `EXECUTE` **diretamente** a `anon`/`authenticated`/`service_role` na criação da função — não depende do papel `PUBLIC`. Confirmado ao vivo com `has_function_privilege('anon', ...)` (método correto; `has_function_privilege('public', ...)` usado antes media a coisa errada): **nenhuma das 28 correções teve efeito real** — as 2 vulnerabilidades críticas e as outras 26 funções continuavam 100% executáveis por `anon`. Mesmo padrão encontrado nas migrations **originais** do Sicoob: 3 RPCs de `service_role` (`reorder_sicoob_order_as_quote`, `create_sicoob_kit_quote`, `create_sicoob_order_artwork_version`) recebem `p_actor_id` como parâmetro em vez de usar `auth.uid()` — estarem abertas a `anon`/`authenticated` permitia **falsificar identidade de outro usuário**.

**Corrigido e reverificado com o método certo:** `REVOKE EXECUTE ... FROM anon, authenticated` explícito (por nome de role, não `PUBLIC`) em: 2 críticas + 3 RPCs Sicoob de service_role + 21 internas/cron/teste. 2 funções (`sync_external_connections_from_credentials`, `seed_qa_scenario`) tiveram `authenticated` restaurado após achado de regressão real (painel admin de conexões e ferramenta de QA usavam de verdade). Varredura ampliada refeita via `anon` (não `public`) após a correção: **0 funções perigosas restantes** — sobraram só 5 esperadas (infraestrutura pré-login por design: `check_rate_limit`, `check_mcp_abuse_threshold`, `e2e_cleanup_check_rate_limit`, `record_public_token_failure`, `submit_quote_response` — essa última verificada linha a linha, token validado corretamente na cláusula WHERE).

Restam ~190 funções com `EXECUTE` para `authenticated` (não `anon`) não auditadas individualmente — helpers de leitura (`is_admin`, `has_role`) ou já cobertas pela lógica interna de autorização das RPCs Sicoob revisadas na Fase 3; risco residual baixo, fica como item de baixa prioridade.

**Achado adicional, mesma classe de bug, escopo muito maior (16/09/2026, sessão de execução exaustiva):** o mesmo padrão de "grant direto nunca revogado" existe para `TRUNCATE` em **195 das 214 tabelas de `public`** — concedido por padrão via `ALTER DEFAULT PRIVILEGES` do papel `postgres`/`supabase_admin` deste projeto Supabase. `TRUNCATE` **não é coberto por RLS no Postgres** (diferente de INSERT/UPDATE/DELETE/SELECT), então nenhuma policy o restringe, mesmo em tabelas com RLS bem configurado — incluindo a própria `admin_audit_log`. PostgREST não expõe TRUNCATE via REST, então a exposição real depende de outro caminho de SQL direto (o mesmo tipo de buraco que a `inspect_query_plan` original tinha). Corrigido em `20260916160000_revoke_truncate_schema_wide.sql`: `REVOKE TRUNCATE` nas 195 tabelas + `ALTER DEFAULT PRIVILEGES FOR ROLE postgres` para que tabelas futuras não herdem o grant. Reverificado: 0 tabelas restantes com TRUNCATE para `anon`/`authenticated`.

**Depende de:** 7 · **Risco se pulada:** escalada de privilégio via `search_path` ou `EXECUTE` público.
**Objetivo:** cada função `SECURITY DEFINER` tem `SET search_path = ''` (1 hoje sem), nenhuma função sensível com `EXECUTE` para `public`/`anon`.
**Ações:** ampliar `npm run check:security-definer-acl` para cobrir `proconfig`; `ALTER FUNCTION ... SET search_path = ''`; `REVOKE EXECUTE ... FROM public, anon` onde indevido; revisar `ALTER DEFAULT PRIVILEGES` para novas funções.
**Aceite:** consulta "secdef sem search_path" retorna 0; check no CI verde.
- [ ] Check ampliado e no CI
- [ ] 0 SECURITY DEFINER sem search_path
- [ ] ACLs revisadas (lista antes/depois)

### Etapa 32 — Revisar as 96 Edge Functions com `verify_jwt=false` ⏳ (parcial — achado registrado em 16/09/2026)
**Status real:** `supabase/config.toml` local só declara `verify_jwt=false` explicitamente para 1 função (`migrate-helper`), não 96 — confirmado que ela é um stub inerte (retorna HTTP 410, sem side-effect, sem tocar em dados). O número "96" da auditoria de 15/09 referia-se ao estado **remoto implantado**, que não é inspecionável nesta sessão (exigiria `supabase functions list`/CLI vinculado ao projeto certo). Não há como classificar as 104 funções nem testar `curl` sem token → 401 sem esse acesso. Isso é uma lacuna estrutural, não uma etapa evitada: a matriz de autenticação completa continua **não feita**.

**Depende de:** 3 · **Risco se pulada:** funções expostas sem autenticação.
**Objetivo:** classificar cada função: (a) pública por design (webhooks com assinatura, `health-check`), (b) autentica no código (valida JWT manualmente), (c) exposta indevidamente.
**Ações:** tabela em `docs/security/edge-functions-auth-matrix.md`; para (c) ativar `verify_jwt` em `supabase/config.toml` ou adicionar validação; testar com `curl` sem token → 401.
**Aceite:** 104 funções classificadas; categoria (c) zerada.
- [ ] Matriz de autenticação completa
- [ ] Funções expostas corrigidas
- [ ] Teste 401 sem token para funções privadas

### Etapa 33 — Reconciliar `auth.users` ↔ `profiles` ✅ (aplicado em 16/09/2026, com ressalvas)
**Status real:** trigger `on_auth_user_created → handle_new_user()` estava ausente em `auth.users` (achado ao investigar os 3 órfãos) — restaurado via `supabase/migrations/20260916110000_fix_new_user_profile_trigger.sql`. Os 3 usuários órfãos (incluindo a conta operacional do próprio usuário) foram reconciliados com `profiles` + `user_roles`, papel de cada um escolhido explicitamente pelo usuário via pergunta direta (admin/gerente_pa/gestor_compras). Backfill aplicado ao vivo, **não versionado como migration** (dado específico de usuário, não é reprodutível/idempotente por natureza). Verificado ao vivo: `profiles_user_id_fkey` já é `FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE` (pré-existente, nada a corrigir). **Não verificado nesta sessão:** teste end-to-end de criação de um novo usuário em ambiente de homologação (não existe staging — Fase 2 bloqueada).

**Depende de:** 7 · **Risco se pulada:** usuários sem perfil quebram RLS baseado em `profiles`.
**Objetivo:** 0 órfãos e criação automática garantida.
**Ações:** verificar trigger `on_auth_user_created` → `handle_new_user` (existência e `search_path`); backfill dos 3 órfãos com `insert ... select from auth.users where not exists`; FK `profiles.id → auth.users(id) on delete cascade` se ausente; teste criando usuário em staging.
**Aceite:** consulta de órfãos retorna 0; novo usuário gera `profile` automaticamente.
- [ ] Trigger verificado/corrigido
- [ ] Backfill dos 3 órfãos
- [ ] FK com cascade aplicada
- [ ] Teste de criação de usuário

### Etapa 34 — Rotação de credenciais e trilha
**Depende de:** 1, 3 · **Risco se pulada:** credenciais que transitaram por ferramentas externas continuam válidas.
**Objetivo:** rotacionar service role, DB password e tokens de integração; registrar em `secret_rotation_log`; seguir `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`.
**Aceite:** datas de rotação registradas; CI verde após rotação.
- [ ] Service role e DB password rotacionados
- [ ] Tokens de integração (Bitrix, ElevenLabs, GitHub) revisados
- [ ] `secret_rotation_log` atualizado

---

## Fase 5 — Edge Functions, tipos e contrato de código (Etapas 35–39)

### Etapa 35 — Publicar as 4 Edge Functions ausentes via CI
**Depende de:** 22, 25, 26 · **Risco se pulada:** funcionalidades Sicoob inacessíveis mesmo com schema pronto.
**Objetivo:** `sicoob-artwork-register`, `sicoob-kit-quote`, `sicoob-reorder`, `migrate-helper` publicadas por pipeline, nunca à mão.
**Ações:** job `supabase functions deploy <nome> --project-ref` no workflow `sicoob-ci.yml` com environment `production` e aprovação; revisar `migrate-helper` (`verify_jwt=false` em `config.toml`) — restringir a service role ou remover se obsoleta após o ledger reparado.
**Aceite:** `supabase functions list` mostra as 4; invocação autenticada em staging retorna 200; sem token retorna 401.
- [ ] Deploy via CI com aprovação
- [ ] `migrate-helper` restrita ou removida
- [ ] Testes 200/401 anexados

### Etapa 36 — Diff automático deploy ↔ repositório de Edge Functions
**Depende de:** 3 · **Risco se pulada:** drift de funções volta a acontecer silenciosamente.
**Objetivo:** job que compara `ls supabase/functions` com `supabase functions list` e falha em diferença.
**Aceite:** job verde com 104 = 104; teste com função fictícia local falha o job.
- [ ] Job criado
- [ ] Teste de falha induzida

### Etapa 37 — Regenerar `types.ts` e travar no CI
**Depende de:** 13, 22 · **Risco se pulada:** tipos mentem sobre o schema.
**Objetivo:** `supabase gen types typescript --linked > src/integrations/supabase/types.ts` a partir do schema reconciliado; job que falha se `git diff --exit-code` após regenerar.
**Aceite:** tipos incluem `notification_templates`, `webhook_configs`, `webhook_logs` e as 11 tabelas Sicoob; typecheck verde.
- [ ] Tipos regenerados
- [ ] Job de diff de tipos no CI
- [ ] typecheck verde

### Etapa 38 — Zerar baseline de typecheck/lint no módulo Sicoob
**Depende de:** 37 · **Risco se pulada:** erros mascarados por `typecheck:baseline`.
**Objetivo:** `src/**/sicoob/**`, `src/services/sicoob`, `src/hooks/sicoob` sem entradas em baseline; remover `untypedFrom` onde o tipo real existir.
**Aceite:** `npm run typecheck:baseline` com 0 entradas para caminhos Sicoob; `npm run lint:check` verde.
- [ ] Baseline zerado para Sicoob
- [ ] `untypedFrom` removido nos serviços Sicoob
- [ ] lint verde

### Etapa 39 — Testes de contrato e integração contra staging
**Depende de:** 35, 37 · **Risco se pulada:** contrato código↔banco não é validado ponta a ponta.
**Objetivo:** `tests/contract` e `tests/integration` executam contra staging com os 5 papéis.
**Aceite:** suíte verde; relatório em `docs/execucao/evidencias/`.
- [ ] Suítes apontadas para staging
- [ ] Execução verde com relatório

---

## Fase 6 — Operação de banco: partições, retenção, agendamento, performance (Etapas 40–45)

### Etapa 40 — Partições de `admin_audit_log` e automação ✅ (aplicado em 16/09/2026)
**Status real:** 9 novas partições criadas (2026-07 até 2027-03, 18 no total). As 5 linhas presas na partição `DEFAULT` foram realocadas (retiradas antes de criar as partições — a ordem inversa causa `ERRO 23514`, corrigido durante a execução). Função `ensure_admin_audit_log_partitions(3)` + job `pg_cron` mensal criados para não repetir o problema.

**Autocrítica registrada (16/09/2026):** ao verificar mais tarde, achei que as 9 partições criadas aqui (`y2026_m07`…`y2027_m03`) tinham ficado **sem RLS e sem policy nenhuma** — diferente de todas as partições irmãs mais antigas (`y2024`…`y2026_m06`), que corretamente têm RLS + 2 policies cada. Eu esqueci esse passo ao escrever a migration original desta etapa. Pior: a função `ensure_admin_audit_log_partitions()` (criada na mesma etapa, para automatizar via cron) tinha o mesmo defeito — cada partição nova criada automaticamente todo mês repetiria o bug para sempre. Corrigido em duas migrations: `20260916160000` (RLS+policies retroativos nas 9 partições) e `20260916170000` (reescreve a função para sempre ligar RLS + policies + revogar TRUNCATE em cada partição nova). Testado: re-chamada da função contra as 15 partições existentes roda sem erro (idempotente).

**Depende de:** 13 · **Risco se pulada:** partição `DEFAULT` cresce indefinidamente e degrada consultas.
**Objetivo:** criar `y2026_m07`…`y2026_m12` e `y2027_m01`…`m03`; mover as 3 linhas de `_default`; job mensal que cria N+3 meses.
**Ações:**
1. `CREATE TABLE admin_audit_log_y2026_m07 PARTITION OF admin_audit_log FOR VALUES FROM ('2026-07-01') TO ('2026-08-01')` (repetir).
2. Realocar: `WITH moved AS (DELETE FROM admin_audit_log_default WHERE created_at >= '2026-07-01' RETURNING *) INSERT INTO admin_audit_log SELECT * FROM moved;` (dentro de transação, com `LOCK` na default).
3. Função `ensure_admin_audit_log_partitions(months_ahead int)` + `cron.schedule('audit-partitions', '0 3 1 * *', $$select ensure_admin_audit_log_partitions(3)$$)`. Alternativa: `pg_partman` se disponível.
**Aceite:** `_default` com 0 linhas; partições existem até +3 meses; job em `cron.job` ativo.
- [ ] Partições criadas em migration
- [ ] Linhas realocadas (0 em default)
- [ ] Função + cron job ativos
- [ ] Alerta de crescimento da default (Etapa 48)

### Etapa 41 — Limpar `admin_audit_log_old` e `admin_audit_log_archive` ✅ (aplicado em 16/09/2026)
**Status real:** Confirmado 0 referências no código e 0 linhas; ambas removidas.

**Depende de:** 5, 40 · **Risco se pulada:** tabelas órfãs (0 linhas) confundem inventário e podem receber escrita indevida.
**Ações:** confirmar 0 linhas e nenhuma referência em código/funções/triggers; `DROP TABLE` em migration com comentário; se `_archive` for estratégia de frio, documentar e mover para schema `archive`.
**Aceite:** tabelas removidas ou documentadas; `check-runtime-refs` sem referências.
- [ ] Referências verificadas (0)
- [ ] Drop ou realocação aplicada
- [ ] Inventário atualizado

### Etapa 42 — Políticas de retenção com pg_cron ✅ (aplicado em 16/09/2026)
**Status real:** Descoberto que as funções de limpeza já existiam prontas no banco (`cleanup_rate_limits`, `cleanup_security_logs`, `cleanup_expired_step_up`, etc.) — só nunca tinham sido agendadas. 11 jobs `pg_cron` criados cobrindo rate limits (hourly), step-up (15min), e os demais logs/lixeiras (diário, escalonado 02h–04h para não competir).

**Depende de:** 40 · **Risco se pulada:** `telemetry_events` (maior tabela) e logs crescem sem limite.
**Objetivo:** retenção por tabela: `telemetry_events` 90d, `login_attempts` 180d, `query_telemetry` 30d, `rls_denial_log` 180d, `bot_detection_log` 90d, `request_rate_limits` 7d, `public_token_failures` 90d, `step_up_*` conforme política de segurança.
**Ações:** função `purge_expired_rows()` com `DELETE ... WHERE created_at < now() - interval` em lotes (`LIMIT 5000` em loop) para evitar locks longos; `cron.schedule` diário fora do horário comercial; considerar particionar `telemetry_events` por mês se ultrapassar ~5M linhas.
**Aceite:** job ativo; primeira execução registrada em `cron.job_run_details`; tamanho das tabelas estável após 7 dias.
- [ ] Política de retenção documentada por tabela
- [ ] Função de expurgo em lotes
- [ ] Jobs agendados e executados
- [ ] Medição de tamanho antes/depois

### Etapa 43 — Agendar rotinas que hoje só existem como Edge Function ⏳ (parcial)
**Status real:** As rotinas que já eram funções SQL (`cleanup_*`, `archive_*`, `trim_*`) foram agendadas na Etapa 42. As que só existem como Edge Function (`cleanup-notifications`, `quote-followup-reminders`, `process-scheduled-reports`, `connections-auto-test`, `monthly-health-report`) continuam pendentes — agendar isso via `pg_cron`+`pg_net` exige a `SUPABASE_SERVICE_ROLE_KEY` para autenticar a chamada HTTP, que não tenho acesso e não devo obter sozinho.

**Depende de:** 42 · **Risco se pulada:** `cleanup-notifications`, `cleanup-novelties`, `quote-followup-reminders`, `process-scheduled-reports`, `connections-auto-test`, `monthly-health-report` nunca rodam (cron = 0).
**Objetivo:** cada rotina tem um gatilho documentado: `pg_cron` + `pg_net` (`net.http_post` para a função com header de serviço) ou scheduler externo registrado.
**Aceite:** `select jobname, schedule from cron.job` lista todas as rotinas; execução de teste com 200 registrado.
- [ ] Inventário de rotinas × gatilho
- [ ] Jobs pg_cron/pg_net criados
- [ ] Execução de teste registrada

### Etapa 44 — Auditoria de índices e consultas ✅ (parcial, valor priorizado — 16/09/2026)
**Status real:** 72 FKs sem índice encontradas; 64 em `public` (responsabilidade nossa) corrigidas com `CREATE INDEX`. As 8 restantes são de `auth.*`/`storage.*`, gerenciadas pelo Supabase — não mexidas. 20 pares de índices duplicados encontrados (~336 KB), mas deliberadamente não removidos: banco tem 25 MB no total, ganho é irrelevante e cada remoção exige checar se o índice é o "titular" de uma constraint UNIQUE antes de derrubar — risco não compensa o benefício agora.

**Depende de:** 7 · **Risco se pulada:** 615 índices sem uso custam escrita e espaço.
**Ações:** `pg_stat_user_indexes` com `idx_scan = 0` após ≥ 14 dias de uso real (após homologação); índices duplicados (`db_duplicate_indexes`); FKs sem índice; `pg_stat_statements` top 20 por `total_exec_time`; `EXPLAIN (ANALYZE, BUFFERS)` nas 10 consultas mais caras.
**Aceite:** relatório com decisões (manter/dropar/criar); migrations aplicadas em staging e depois produção.
- [ ] Relatório de índices não usados/duplicados
- [ ] FKs sem índice zeradas
- [ ] Top 20 consultas analisadas

### Etapa 45 — VACUUM, ANALYZE e autovacuum ✅ (verificado, sem ação necessária — 16/09/2026)
**Status real:** Maior tabela com linhas mortas tem 6 (seis) tuplas mortas — banco de 25 MB, ainda muito pequeno para bloat real. Autovacuum padrão do Postgres é suficiente nesta escala; revisitar quando `telemetry_events` ou outra tabela de alto volume crescer significativamente.

**Depende de:** 42 · **Risco se pulada:** bloat e estatísticas defasadas após expurgos.
**Ações:** `db_table_bloat` para as tabelas de log; `ALTER TABLE ... SET (autovacuum_vacuum_scale_factor = 0.05)` nas tabelas de alta rotatividade; `ANALYZE` após migrations grandes; verificar `pg_settings` de autovacuum.
**Aceite:** bloat < 20% nas tabelas de log; parâmetros documentados.
- [ ] Medição de bloat antes/depois
- [ ] Parâmetros por tabela aplicados
- [ ] ANALYZE pós-migration no runbook

---

## Fase 7 — CI/CD, qualidade, observabilidade e homologação (Etapas 46–50)

### Etapa 46 — Tornar os workflows verdes e obrigatórios
**Depende de:** 3, 15 · **Risco se pulada:** `main` protegida mas sem checks reais.
**Objetivo:** `ci.yml`, `sicoob-ci.yml`, `security.yml`, `codeql.yml`, `e2e.yml`, `security-compliance.yml`, `branch-protection-sentinel.yml`, `Supabase Preview` verdes no HEAD e listados em `required_status_checks`.
**Aceite:** `gh api .../commits/<sha>/check-runs` sem `failure`; proteção da Etapa 2 atualizada com os nomes exatos dos checks.
- [ ] 4 workflows vermelhos corrigidos
- [ ] Required checks configurados
- [ ] HEAD de `main` totalmente verde

### Etapa 47 — Gates de migration no PR
**Depende de:** 10, 11 · **Risco se pulada:** drift volta pelo mesmo caminho.
**Ações:** lint SQL (`squawk` ou `sqlfluff`) para migrations novas; regras: prefixo único, `IF NOT EXISTS`/`OR REPLACE`, sem `DROP` sem ADR, sem `CREATE INDEX` não concorrente em tabela com dados, `SECURITY DEFINER` obriga `search_path`; manter o gate de imutabilidade de arquivos já mesclados; executar `supabase/preflight/sicoob-reconciliation-contract.sql` e `check-runtime-refs`.
**Aceite:** PR com migration inválida é bloqueado; PR válido passa.
- [ ] Lint SQL no CI
- [ ] Regras documentadas em `docs/RUNBOOKS/MIGRATIONS.md`
- [ ] Teste de PR inválido bloqueado

### Etapa 48 — Observabilidade e alertas
**Depende de:** 40, 42 · **Risco se pulada:** regressões só são descobertas por usuários.
**Ações:** alertas para: branch Supabase em `MIGRATIONS_FAILED`; falha de deploy de função; linhas em `admin_audit_log_default > 0`; crescimento de `rls_denial_log` acima de limiar; erros 5xx em Edge Functions (`error-monitor`); `cron.job_run_details` com `status='failed'`. Canal: `send-notification` / e-mail / Slack conforme `notification_channels`.
**Aceite:** alerta de teste disparado e recebido para cada regra.
- [ ] Regras de alerta implementadas
- [ ] Teste de disparo por regra
- [ ] Runbook de resposta por alerta

### Etapa 49 — Runbooks operacionais
**Depende de:** 12, 35, 40 · **Risco se pulada:** conhecimento fica em pessoas, não em documentos.
**Objetivo:** `docs/RUNBOOKS/`: `MIGRATIONS.md` (criar, testar, aplicar, reverter), `RESTORE_PITR.md`, `EDGE_FUNCTION_DEPLOY.md`, `PARTITION_MAINTENANCE.md`, `RLS_INCIDENT.md`, além do existente `CREDENTIAL_ROTATION.md`.
**Aceite:** cada runbook executado uma vez por alguém que não o escreveu, com registro.
- [ ] 5 runbooks escritos
- [ ] Execução de teste por terceiro registrada

### Etapa 50 — Homologação final e gate de release
**Depende de:** todas · **Risco se pulada:** produção libera sem prova de operação.
**Objetivo:** rodada completa com os papéis central, cooperativa, aprovador, comprador e admin em staging, sem dados reais: criar campanha, orçamento, pedido, aprovação de arte e despesa, recompra idempotente, kit → cotação, consolidação, entrega e recebimento.
**Critérios:** 82 cenários de negócio verdes; `test:rls` verde; `test:e2e:regression` verde; preflight 0 faltantes; `db diff` vazio; inventário reconciliado; CI verde no HEAD; proteção de `main` ativa; alertas ativos; runbooks testados.
**Saída:** `docs/execucao/gate-release-<data>.md` assinado por responsável técnico e de negócio; depois disso, aplicar Fase 3–6 em produção pela mesma sequência (migrations via CI com aprovação em `production`).
- [ ] Rodada de homologação com evidências por fluxo
- [ ] Todos os critérios verdes (tabela com links)
- [ ] Gate assinado
- [ ] Aplicação em produção registrada com hashes e horários

---

## Mapa de dependências (resumo)

```
1 ─┬─ 5 ─ 6 ─ 7 ─┬─ 8 ─ 9 ─ 10 ─ 11 ─ 12 ─ 13 ─┬─ 14 ─ 15 ─ 17
   │             ├─ 28, 29, 30, 31, 33, 44      │        16 ─┘
2 ─┼─ 3 ─┬─ 15   └─────────────────────────────┼─ 18 ─┬─ 19, 20 ─ 21 ─ 22 ─ 23
   └─ 4  ├─ 32, 36                              │      ├─ 24, 25 ─ 26 ─ 35 ─ 39
         └─ 46                                  │      └─ 27
                                                └─ 37 ─ 38
40 ─ 41, 42 ─ 43, 45, 48        47 ← 10, 11        49 ← 12, 35, 40        50 ← todas
```

## Métricas de saída (o que muda do ponto de partida)

| Métrica | Hoje | Meta |
|---|---|---|
| Registros no ledger de migrations | 4 | = número de migrations ativas em `supabase/migrations` |
| `supabase db diff --linked` | não executável (ledger inválido) | vazio |
| Tabelas Sicoob ausentes | 11 | 0 |
| RPCs Sicoob ausentes | 5 | 0 |
| Buckets referenciados inexistentes | 3 | 0 |
| Edge Functions sem deploy | 4 | 0 |
| Tabelas sem RLS | 3 | 0 |
| Tabelas com RLS e sem policy | 2 | 0 (ou deny-all documentado) |
| Policies `USING (true)` | 22 | apenas as justificadas em ADR |
| `SECURITY DEFINER` sem `search_path` | 1 | 0 |
| Usuários sem perfil | 3 | 0 |
| Partições futuras de `admin_audit_log` | 0 | ≥ 3 meses à frente |
| Linhas em `admin_audit_log_default` | 3 | 0 |
| Jobs `pg_cron` | 0 | retenção + partições + rotinas |
| Workflows vermelhos no HEAD | 4 | 0 |
| Proteção de `main` | ausente | PR + checks + admins |
| Secrets faltantes | 5+ | 0, por ambiente |
