# Checagem "migration existe?" para os 21 órfãos banco→código — 17/09/2026

**Nota de escopo:** diferente das RPCs/tabelas da Fase C do plano de correções (que estavam *ausentes* do banco e precisavam dessa checagem para decidir "aplicar migration pronta" vs. "nunca foi construído"), estas 21 tabelas/views já existem **ao vivo** no banco (confirmado pela auditoria de 17/09). A checagem abaixo não muda se elas devem ser mantidas — serve para localizar a migration de origem de cada uma, útil para quem for investigar o propósito original nas Etapas 21-26. As 43 funções órfãs não foram checadas nesta rodada (fora do escopo desta execução).

**Resultado: as 21/21 têm pelo menos 1 arquivo de migration correspondente.** Nenhuma foi criada só via MCP sem qualquer rastro em `supabase/migrations/`. Vários arquivos listados são migrations posteriores que só tocam índices/RLS/grants dessas tabelas (ex.: `20260916130000_add_missing_fk_indexes.sql`, `20260916100000_security_hardening.sql`), não a definição original — não filtrei qual arquivo tem o `CREATE TABLE` de fato vs. quais são ajustes posteriores, por escopo de tempo.

| Objeto | Migrations que o referenciam |
|---|---|
| `blog_posts` | `20260504182837_a8f0e9b4...`, `20260504190214_5806e636...`, `20260916130000_add_missing_fk_indexes.sql` |
| `magic_up_comments` | `20260420185009_19ba5060...`, `20260426135521_227101ce...` |
| `magic_up_public_shares` | `20260420185009_19ba5060...`, `20260426135521_227101ce...`, `20260427115542_a0e36268...` |
| `magic_up_reactions` | `20260420185009_19ba5060...`, `20260426135521_227101ce...` |
| `manager_notification_config` | `20260504211811_2c878015...`, `20260916130000_add_missing_fk_indexes.sql` |
| `mockup_templates` | `20260216125012_7b8dd710...`, `20260416195918_397d6363...`, `20260426135521_227101ce...` |
| `notification_channels` | `20260504210817_51f845c9...`, `20260514211229_24d07ec2...` |
| `order_logistics_tracking` | `20260502174252_a88e3c13...`, `20260916130000_add_missing_fk_indexes.sql` |
| `pa_singularidades` | `20260503175512_115f0a9c...`, `20260517124846_126d6f73...`, `20260916130000_add_missing_fk_indexes.sql` |
| `pontos_atendimento` | `20260503175512_115f0a9c...`, `20260916130000_add_missing_fk_indexes.sql` |
| `portfolio_items` | `20260504182837_a8f0e9b4...`, `20260504190237_f7e4591a...` |
| `qa_rls_audits` | `20260503210523_c20e48ce...`, `20260503210856_c31b8c3b...` |
| `quote_audit_logs` | `20260509175720_8b74bfb2...`, `20260916130000_add_missing_fk_indexes.sql` |
| `sensitive_access_logs` | `20260503210856_c31b8c3b...`, `20260916130000_add_missing_fk_indexes.sql` |
| `sicoob_budget_audit` (view) | `20260503214557_f7ee25b6...`, `20260916140000_sicoob_history_and_view_hardening.sql` |
| `telemetry_logs` | `20260503172408_b6bcb7cb...`, `20260515134521_5a4fd25a...`, `20260522200433_ee407c31...`, `20260529192614_d5a5681b...` |
| `test_suites_runs` | `20260529193319_9305cf9b...` |
| `v_full_scope_grants` (view) | `20260425212807_54b0bb33...` |
| `webhook_configs` | `003_notification_templates.sql`, `20260916100000_security_hardening.sql`, `20260916130000_add_missing_fk_indexes.sql` |
| `webhook_logs` | `003_notification_templates.sql`, `20260916100000_security_hardening.sql` |
| `admin_config_audit` | `20260503210523_c20e48ce...`, `20260503210856_c31b8c3b...`, `20260513171226_af89fa27...`, `20260916130000_add_missing_fk_indexes.sql` |

**Pendente:** função-a-função para as 43 funções órfãs, e distinguir "migration de criação" vs. "migration de ajuste posterior" por tabela.
