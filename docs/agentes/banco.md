# Banco de dados — referência para agentes

Ler quando for rodar SQL, criar/aplicar migration, auditar RLS ou o ledger. Resumo das regras no
`AGENTS.md`; aqui está o detalhe. Errar o banco já causou retrabalho real neste repo (seção
"Incidentes").

## Onde se trabalha

| Situação | Banco | Como |
|---|---|---|
| Diagnóstico | **produção, só leitura** | `SELECT` pela Management API (`scripts/db/supabase-sql-client.mjs`, `readOnly: true` por padrão) ou MCP de leitura; nunca escrita para "testar" |
| Migration nova | arquivo em `supabase/migrations/` | PR → merge → entrada na allowlist → `apply-sicoob-migrations.yml` (abaixo) |
| Teste de comportamento de banco | **Postgres descartável** | simuladores `scripts/qa/simular-*.py` no CI (`ci.yml:89-132`, `sicoob-ci.yml:47-62`), imagem `public.ecr.aws/supabase/postgres:17.6.1.063` |
| DDL destrutivo, segredos, rotação de chaves | **só com o dono do projeto** | — |

1. **Não existe banco local neste front.** O client lê `VITE_SUPABASE_URL` /
   `VITE_SUPABASE_PUBLISHABLE_KEY` e lança erro se faltarem (`src/integrations/supabase/client.ts:29-42`);
   não há equivalente a um `*_LOCAL_SUPABASE_*`. `npm run dev` usa o `.env` que estiver na máquina — e
   o `.env` gerado pelo Lovable Cloud (`README.md:118`) é o de **produção**. Confira antes de testar tela:
   não há guard no front que impeça isso.
2. **E2E/QA nunca aponta para o banco oficial.** `scripts/e2e-target.mjs:1-4` tem
   `FORBIDDEN_PROJECT_IDS = { cfmzkthhgliqelozlmwu, doufsxqlfjyuvxuezpln }` e recusa destino igual a
   esses (`:40`); o destino precisa ser HTTPS, host `<projectId>.supabase.co`, sem porta/path/query e
   com chave publicável (nunca service_role) — `scripts/e2e-target.mjs:25-50`. Modelo em `.env.e2e.example`.
3. **O CI builda contra URL falsa de propósito:** `VITE_SUPABASE_URL: http://127.0.0.1:59999`
   (`.github/workflows/ci.yml:136`, `sicoob-ci.yml:88,109`, `bundle-check.yml:31`, `lighthouse.yml:42`) e
   `https://e2e-public.invalid` no E2E público (`e2e.yml:43-45`). Build verde no CI não prova nada sobre o banco.

## Banco OFICIAL

| O que | Valor |
|---|---|
| Projeto Supabase | **`cfmzkthhgliqelozlmwu`** (`supabase/config.toml:1`) |
| URL | `https://cfmzkthhgliqelozlmwu.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/cfmzkthhgliqelozlmwu |
| Como rodar SQL | **Management API**, não conexão Postgres: `POST /v1/projects/<ref>/database/query` com `SUPABASE_ACCESS_TOKEN` (`scripts/db/supabase-sql-client.mjs:4,36`; `readOnly` default `true` em `:23`). Motivo registrado: evita depender da resolução IPv6 do host Postgres (`.github/workflows/migration-ledger-drift.yml:2`) |
| Host Postgres (quando usado) | `db.cfmzkthhgliqelozlmwu.supabase.co` (user `postgres`) ou `*.pooler.supabase.com` (user `postgres.cfmzkthhgliqelozlmwu`), porta 5432, `sslmode=verify-full` forçado (`scripts/db/audit-core-rls.mjs:8-23`) |
| Ledger | `supabase_migrations.schema_migrations` |
| Versão do Postgres do projeto | **NÃO VERIFICADO** — não há registro no repo; só a imagem de teste descartável `17.6.1.063` (`PENDENCIAS.md:155`) |

### MCP de SQL — estado real

**Não existe configuração de MCP versionada neste repo** (sem `.mcp.json`). O único nome citado em
docs é **`SUPABASE_Brindes_Sicoob_-_V2`**, e sempre registrando falha
`Management API 401: Invalid access token`
(`docs/execucao/lacunas-funcionalidades-2026-10-11/04-docs-funcionais.md:7`,
`.../01-plano-encerramento.md:227`). Já houve sessão em que "os MCPs SQL conectados apontam para
outros bancos" (`docs/execucao/auditoria-paridade-local-github-supabase-2026-09-24.md:78`).

**Antes de rodar qualquer SQL, confirme em qual projeto o MCP carregado está** (`project_id`/`ref` na
resposta). MCP com nome parecido apontando para outro banco é o erro mais caro aqui.

### Bancos que NÃO são este projeto

- **`doufsxqlfjyuvxuezpln`** — catálogo mestre externo, **somente leitura imposta em código**:
  `supabase/functions/_shared/external-read-only.ts:2` fixa `CATALOG_ORIGIN` e `:19-21` recusa qualquer
  coisa fora de `GET|HEAD` em `/rest/v1/` com `CATALOG_READ_ONLY`. A interface não pode gravar nesse
  mestre (`docs/plano-implementacao/plano-100-etapas.md:11`).
- **`pgxfvjmuubtbowutlide`** — CRM externo, acessado pela edge `crm-db-bridge` (`src/lib/crm-db.ts:4`,
  `src/types/crm.ts:2`).
- **`nmojwpihnslkssljowjh`**, **`bojgeppypmtormfjsyun`**, **`hgbzltfwozdkcudofypy`** — projetos de outra
  origem (Lovable antigo / config antiga) ainda citados em migrations históricas de `pg_cron`/`pg_net`
  (`supabase/migrations/20260429163414_schedule_connections_auto_test_cron.sql:28`,
  `supabase/migrations/20260503155739_*.sql:29`). **Legado: não usar.** Auditorias antigas feitas contra
  `nmojwpihnslkssljowjh` não valem para o canônico (alerta em
  `docs/pesquisa/2026-09-11/anexos/auditoria-tecnica-b.md:81`).
- Credenciais dos externos: SSOT com aliases em `supabase/functions/_shared/credentials.ts:1-9`
  (tabela `integration_credentials` → `Deno.env.get` → aliases, cache 60s).

## Migrations

**Estado de hoje:** 590 arquivos em `supabase/migrations/*.sql`, contra **135 versões no ledger**
(`scripts/db/migration-ledger-baseline.json`). Isso é passivo histórico conhecido, não bug a corrigir
em passagem: a baseline de 2026-10-22 registra `local_count 606`, `finding_count 504`
(`local_sem_ledger: 463`, `conteudo_nao_verificado: 19`, `nome_divergente: 9`, `conteudo_divergente: 1`,
`remota_sem_arquivo: 12`) e a política explícita **"não autoriza replay nem reparo artificial do
ledger"**.

Pastas:

- `supabase/migrations/` — o vivo.
- `supabase/migrations_archive/` (`2025/`, `2026-09/`) — arquivo morto. "Nunca devem ser reaplicados"
  (`supabase/migrations_archive/README.md:3`).
- `supabase/preflight/sicoob-reconciliation-contract.sql` — preflight **somente leitura** do contrato
  Sicoob; rodar antes e depois de migration de reconciliação. "Conforme" não é autorização de deploy (`:1-8`).
- `supabase/cron/cron-config.sql` — script **manual**, fora das migrations (`CREATE EXTENSION pg_cron`,
  `cron.schedule`, lê `app.supabase_service_role_key`). Vários jobs documentados não têm `cron.schedule`
  em nenhuma migration (`docs/execucao/lacunas-funcionalidades-2026-10-11/03-planos-melhorias-correcoes.md:321`).

Regras:

1. **Nome:** `YYYYMMDDHHMMSS_verbo_objeto.sql`, descritivo — nunca o UUID que algumas ferramentas geram
   (`CONTRIBUTING.md:90`). Há nomes legados fora do padrão (`001_notification_system.sql`, arquivos com
   UUID); não os imite.
2. **Migration mesclada é imutável.** O Supabase rastreia por *nome de arquivo*: editar o arquivo não
   reaplica nada e cria drift silencioso. Precisa corrigir? Migration nova com o delta.
   `node scripts/check-migration-immutability.mjs` bloqueia no CI comparando com `origin/main`
   (`ci.yml:49`). Incidente que originou o guard: PR #7, 2026-09-13, cinco migrations editadas in-place
   (`scripts/check-migration-immutability.mjs:13-19`).
3. **Como o DDL entra em produção:** `.github/workflows/apply-sicoob-migrations.yml` —
   **só `workflow_dispatch`**, input `confirmar = APLICAR`, `if: github.ref == 'refs/heads/main'` (`:20`),
   `environment: construction` (`:24`), concurrency serial (`cancel-in-progress: false`, `:14-16`), três
   passos: `--check` → `--apply` → `--require-applied` (`:38-51`). **Não há run automático**
   (`PENDENCIAS.md:125-130`).
4. **Allowlist, não descoberta automática.** `scripts/db/apply-sicoob-migrations.mjs` aplica **somente** os
   arquivos de uma allowlist fixa com sha256 por arquivo (29 entradas, `:20-132`) e "jamais descobre ou
   aplica automaticamente outros arquivos locais" (`:2-6`). Migration fora da allowlist não sobe por esse
   caminho — incluir o arquivo na allowlist faz parte da PR.
5. **Marcador de executor no ledger:** o hash gravado precisa casar
   `^sha256:([a-f0-9]{64}); executor:allowlisted-management-api$`
   (`scripts/db/apply-sicoob-migrations.mjs:18`, `scripts/db/check-migration-ledger-drift.mjs:12`).
6. **DDL aplicado via MCP/Management API exige o `.sql` no mesmo commit/PR — nunca depois.**
   `docs/RUNBOOKS/MCP_DDL_APPLICATION.md:31-33`. Origem da regra: em 15-16/09/2026 o baseline
   `sicoob_reconciliation_baseline` foi aplicado em produção e o SQL ficou só dentro de
   `schema_migrations.statements` (versão `20260915143442`), sem arquivo em nenhuma branch, por dias
   (`:15-27`). Reincidiu em 2026-10-22 com
   `20261022120000_add_public_favorites_to_security_definer_allowlist.sql` (`PENDENCIAS.md:168-172`).
   E **não** use `repair --status applied` para representar DDL que não rodou (`:49`).
7. **Destrutivo:** operação destrutiva isolada em migration própria; backup em
   `_backup_<original>_YYYYMMDD` antes de `DROP`; RLS ON em toda tabela nova; comandos de "Down"
   documentados no corpo da PR (`CONTRIBUTING.md:85-91`). Renomear/apagar tabela ou coluna sem backup é
   proibido (`CONTRIBUTING.md:61`).
8. **Drift:** `.github/workflows/migration-ledger-drift.yml` — `schedule: 0 6 * * *` (UTC) + dispatch
   restrito à `main`, `environment: construction`, roda
   `scripts/db/check-migration-ledger-drift.mjs --baseline-file scripts/db/migration-ledger-baseline.json`
   (`:43`) e `scripts/db/audit-core-rls.mjs` com `if: always()` (`:45-49`). O script **nunca aplica
   arquivo nem repara ledger** (`check-migration-ledger-drift.mjs:2`). Exit 1 = pendência; **exit 2 =
   impossível verificar** (`docs/RUNBOOKS/MCP_DDL_APPLICATION.md:58-59`) — exit 2 é limite de evidência,
   não aprovação. Falha pendente registrada: run 41175713780, `[ledger] Verificação indisponível`
   (`PENDENCIAS.md:261,363`).
   Limitação conhecida: o drift fica verde porque compara contra a baseline congelada, sem `supabase db diff`
   (`docs/execucao/lacunas-funcionalidades-2026-10-11/03-planos-melhorias-correcoes.md:276`).

## Scripts de banco (o que fazem / como rodar)

| Script | O que faz |
|---|---|
| `scripts/db/supabase-sql-client.mjs` | cliente SQL via Management API; `readOnly` default `true` |
| `scripts/db/apply-sicoob-migrations.mjs` | allowlist + sha256; `--verify-files \| --check \| --apply \| --require-applied` |
| `scripts/db/check-migration-ledger-drift.mjs` | drift bidirecional arquivo↔ledger contra a baseline |
| `scripts/db/audit-core-rls.mjs` | RLS de `profiles`, `quote_history`, `quotes`, `workspace_notifications` (`:6`); precisa `SUPABASE_DB_URL` |
| `scripts/db/check-live-api-inventory.mjs` | inventário esperado × ao vivo; bloqueia se o `project_ref` divergir (`:18-24`) — `npm run check:live-api-inventory` |
| `scripts/db/check-runtime-refs.mjs` | varre `src/**` e `supabase/functions/**` por `.from()`/`.rpc()`/`.storage.from()` e confere contra o inventário; recusa cache > 30 dias — roda em `ci.yml:53` |
| `scripts/db/classify-migration-backlog.mjs` | triagem do passivo fora do ledger, sem executar SQL |
| `scripts/db/compare-types-api.mjs` | `src/integrations/supabase/types.ts` × snapshot OpenAPI; não toca no banco |
| `scripts/check-migration-immutability.mjs` | gate de CI contra editar migration já mesclada |
| `scripts/test-rls.mjs` | cross-check de RLS cross-tenant pela edge `rls-audit`; **só em homologação**: precisa `E2E_SUPABASE_URL`/`E2E_SUPABASE_PROJECT_ID`/`E2E_ALLOWED_PROJECT_ID` + chaves `E2E_*` (guarda `validateE2ETarget` recusa oficial, catálogo, CRM e legados); falha se `rls-audit` rodar 0 cenários ou se não houver 2 tenants — `npm run test:rls` |
| `scripts/scan-rls-security.mjs` | RPCs `check_tables_rls` / `audit_empty_rls_policies`; falha com tabela pública sem RLS |
| `scripts/check-security-definer-acl.mjs` | `SECURITY DEFINER` em `public` executável por `PUBLIC`/`anon` → falha (lints Supabase 0028/0029) — `npm run check:security-definer-acl` |
| `scripts/audit-technical-rls.sql` | policies de tabelas técnicas precisam de `is_dev(auth.uid())`; proíbe `USING (true)` |
| `scripts/db-performance-audit.mjs` | auditoria mensal (`db-performance-audit.yml`, `0 0 1 * *`) |

## RLS

- **Canônico: `docs/security/RLS_MATRIX.md`** (`:1-8`) — cenários ALLOW/DENY, lacunas e regras críticas
  das tabelas do vendedor; validação pela edge `rls-integration-tests` (botão "Testar RLS" em
  `/admin/auditoria-propriedade`) e RPC `audit_rls_matrix()` no cron `ownership-audit`.
- `docs/security/SELLER_SCOPE_CHECKER.md` + `npm run check:seller-scope` (`ci.yml:56-59`) fecham o perímetro
  do escopo de vendedor.
- `docs/04_EXPLICACAO_DAS_POLICIES.md` é didático e usa a nomenclatura antiga ("Gifts Store") — histórico.
- `sicoob_rls_validation.sql` (raiz) roda em `BEGIN … ROLLBACK` mas **desabilita triggers**
  (`ALTER TABLE public.profiles DISABLE TRIGGER ALL`, `:1-11`) — não rodar no canônico sem necessidade.
- Risco aceito, não corrigir de passagem: `relforcerowsecurity = false` em `e2e_cleanup_rate_limit` —
  ligar `FORCE RLS` quebra a RPC `e2e_cleanup_check_rate_limit` (`PENDENCIAS.md:182-184`).

## Edge functions e secrets

- **106 diretórios com `index.ts`** em `supabase/functions/` (`_shared`, `tests` e `graphify-out` não são
  funções).
- Deploy: `.github/workflows/deploy-sicoob-functions.yml` — **manual, nunca automático no merge**: só
  `workflow_dispatch` com `confirmar = PUBLICAR` e `github.ref == 'refs/heads/main'` (`:16`),
  `environment: construction` (`:20`), Supabase CLI pinada `2.120.0` (`:29-31`). Publica **21 funções
  nomeadas** (`:42-63`): `expert-chat`, `send-transactional-email`, `external-db-bridge`,
  `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`,
  `sicoob-kit-quote`, `sicoob-reorder`, `bi-copilot`, `comparison-ai-advisor`, `get-app-logs`,
  `get-visitor-info`, `secure-upload`, `auth-integrity-check`, `crm-db-bridge` e os 6 workers de
  `pg_cron` (`webhook-dispatcher`, `connections-auto-test`, `sicoob-approval-notifications`,
  `process-batch-export`, `send-scheduled-reports`, `connections-health-check`).
  Confirmação por diff antes/depois em `scripts/ci/verify-supabase-functions-published.mjs`
  (`requiredFunctions` em `:4-29`): exige `status ACTIVE` e versão não regressiva para cada uma.
  As outras ~87 funções **não sobem por esse workflow**.
- **Depois de republicar:** o diff antes/depois prova que a versão subiu, não que o agendamento rodou.
  Rode `scripts/inventario/banco.sql` (seção `cron`) e confira `execucoes_24h` e `falhas_24h` dos 6 workers
  de `pg_cron`; republicar uma função cron não perde a agenda (`cron.job`), mas só a execução seguinte
  mostra se ela voltou saudável.
- `verify_jwt` é por função em `supabase/config.toml:5-82`. Onde é `false`, a validação está no handler;
  cron e chamadas internas autenticam por `INTERNAL_FUNCTION_SECRET` e **falham fechado** se o segredo
  não existir (`supabase/config.toml:32-34`, `supabase/functions/_shared/internal-service-auth.ts:34`).
- Secrets: tabela em `docs/secrets.md:34-62`. `SUPABASE_URL`/`SERVICE_ROLE_KEY`/`ANON_KEY` vêm do próprio
  Supabase; `VITE_*` ficam no provedor de hospedagem; vários estão marcados "preencher" (`RESEND_API_KEY`,
  `NOTIFICATION_FROM_EMAIL`, `SICOOB_APPROVAL_WORKER_SECRET`, `INTERNAL_FUNCTION_SECRET`). Configuração via
  dashboard Supabase, n8n ou GitHub Secrets (`CONTRIBUTING.md:68`) — **nunca** em código, commit ou resposta.
- Declarados e sem nenhum leitor (código morto): `BITRIX24_DOMAIN`, `BITRIX24_USER_ID`, `BITRIX24_TOKEN`,
  `MCP_SHARED_SECRET` (`docs/execucao/lacunas-funcionalidades-2026-10-11/07-edge-functions-integracoes.md:338`).

## Incidentes que já custaram retrabalho

1. DDL via MCP sem `.sql` versionado — duas vezes (2026-09-15/16 e 2026-10-22). Ver regra 6.
2. Cinco migrations editadas in-place antes de ir a produção (PR #7, 2026-09-13) → guard de imutabilidade.
3. Front apontando para `cfmzkthhgliqelozlmwu` enquanto `config.toml` registrava
   `hgbzltfwozdkcudofypy` (`docs/execucao/revisao-implementacao-2026-09-12.md:141`).
4. Auditoria de RLS bloqueada por quota do projeto: `check_tables_rls falhou: Service for this project is
   restricted … exceed_egress_quota` (`PENDENCIAS.md:19-35`).
5. Credenciais privilegiadas expostas a `workflow_dispatch` de branch arbitrária — hoje os workflows
   sensíveis estão restritos à `main` (`PENDENCIAS.md:251`). Run 41198505589 marcado **"não rerodar"**
   (`PENDENCIAS.md:349`).

Sessões paralelas commitam no mesmo repo e no mesmo banco: re-sync antes de editar e confira o ledger ao
vivo antes de registrar migration.
