# Tabelas/views órfãs (banco → código) — 17/09/2026

Origem: Etapa 21 do `docs/plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md`. As 21 abaixo não têm referência confirmada em `.from()`/`.rpc()` do client interno em `src/`+`supabase/functions/` (varredura completa via `scripts/db/check-runtime-refs.mjs`, direção banco→código ainda não automatizada no script — feita manualmente aqui). Contagem de linhas via MCP read-only em 17/09/2026. "Migration de origem" é a primeira migration local que cria a tabela (rastreabilidade, não indica "pendente de aplicação" — todas as 21 já existem ao vivo).

**Dono:** nenhuma coluna abaixo tem dono nomeado — não há como inferir isso de código/schema. Precisa ser preenchido por quem prioriza (Etapa 38 do plano de correções).

| Objeto | Linhas | Migration de origem | Categoria sugerida | Dono |
|---|---|---|---|---|
| `admin_config_audit` | 14 | `20260503210523_c20e48ce-...` | manter-infra (trilha de auditoria de config, tem dado real) | a definir |
| `blog_posts` | 0 | `20260504190214_5806e636-...` | investigar — confirmar ausência de rota antes de decidir (Etapa 23 do plano de correções) | a definir |
| `magic_up_comments` | 0 | `20260420185009_19ba5060-...` | investigar — feature "Magic Up" parcialmente implementada (Etapa 24 do plano de correções) | a definir |
| `magic_up_public_shares` | 0 | `20260420185009_19ba5060-...` | investigar — idem `magic_up_comments` | a definir |
| `magic_up_reactions` | 0 | `20260420185009_19ba5060-...` | investigar — idem `magic_up_comments` | a definir |
| `manager_notification_config` | 0 | `20260504211811_2c878015-...` | investigar — sem dado, sem uso; confirmar se feature de notificação a gestor foi abandonada ou não terminada | a definir |
| `mockup_templates` | 0 | `20260216125012_7b8dd710-...` | investigar — nome sugere feature de templates de mockup nunca ligada à UI | a definir |
| `notification_channels` | 0 | `20260504210817_51f845c9-...` | investigar — `send_notification`/`notifications` existem e são usados; esta tabela específica de canais não | a definir |
| `order_logistics_tracking` | 0 | `20260502174252_a88e3c13-...` | investigar — existe `order_logistics` (sem `_tracking`) em uso; possível duplicidade de escopo | a definir |
| `pa_singularidades` | 0 | `20260503175512_115f0a9c-...` | candidato-remoção — nome relacionado à família `pontos_atendimento`/`singulares`, ver linha abaixo | a definir |
| `pontos_atendimento` | 0 | `20260503175512_115f0a9c-...` | candidato-remoção — nome quase-duplicado de `postos_atendimento` (existe, em uso ativo em todo o app); forte suspeita de resíduo de iteração de nomenclatura anterior (Etapa 22 do plano de correções) | a definir |
| `portfolio_items` | 0 | `20260504190237_f7e4591a-...` | investigar — sem rota nem componente identificado nesta rodada | a definir |
| `qa_rls_audits` | 0 | `20260503210523_c20e48ce-...` | manter-infra (provável ferramenta de QA/ops, mesma migration de `admin_config_audit`) | a definir |
| `quote_audit_logs` | 0 | `20260509175720_8b74bfb2-...` | investigar — `sicoob_order_history`/`order_audit_events` cobrem auditoria de pedido; esta parece ser o equivalente para orçamento, nunca ligada | a definir |
| `sensitive_access_logs` | 0 | `20260503210856_c31b8c3b-...` | manter-infra (nome sugere trilha de segurança para consumo manual/ops) | a definir |
| `sicoob_budget_audit` *(view)* | 0 | `20260916140000_sicoob_history_and_view_hardening.sql` (hardening da view; a tabela-base `pa_budgets` é anterior) | candidata a ligar ao `AuditEvidenceDashboard.tsx` — view pronta, calcula discrepância entre verba registrada e verba calculada de pedidos, nunca consumida (Etapa 26 do plano de correções) | a definir |
| `telemetry_logs` | 0 | `20260503172408_b6bcb7cb-...` | investigar — `telemetry_events`/`query_telemetry` são as tabelas de telemetria realmente usadas (4.360 e uso ativo); esta parece redundante ou substituída | a definir |
| `test_suites_runs` | 0 | `20260529193319_9305cf9b-...` | manter-infra (provável rastro de execução de suíte de testes, uso manual/CI) | a definir |
| `v_full_scope_grants` *(view)* | 0 | pré-existente, `security_invoker` já confirmado correto (Etapa 24 do plano principal) | candidata a ligar ao `AuditEvidenceDashboard.tsx` — junta `step_up_audit_log` com concessões de escopo total, útil para auditoria de segurança (Etapa 26 do plano de correções) | a definir |
| `webhook_configs` | 0 | `003_notification_templates.sql` (uma das 22 migrations já no ledger oficial) | investigar — RLS ligado, zero policy (deny-all deliberado, Etapa 28 do plano principal); confirmar se é infraestrutura para feature de webhook nunca lançada | a definir |
| `webhook_logs` | 0 | `003_notification_templates.sql` | investigar — só recebe `cleanup_webhook_logs()` via cron (que teria 0 linhas pra limpar); `webhook_deliveries`/`webhook_delivery_metrics` parecem ser as tabelas realmente usadas hoje — suspeita de tabela substituída | a definir |

## Observação metodológica

Esta tabela cobre só os 21 nomes que a auditoria de 17/09/2026 já tinha levantado. `scripts/db/check-runtime-refs.mjs` hoje só valida a direção código→banco; estender pra banco→código (Etapa 27 do plano de correções cobre isso para funções, mas não para tabelas/views) fica como trabalho futuro se quiser essa direção automatizada também.

Todas as 21 têm RLS habilitado (confirmado via `supabase_db_list_tables`) e 0 linhas, exceto `admin_config_audit` (14 linhas). Nenhuma delas está na allowlist de `check-runtime-refs.mjs` porque não são referências quebradas — são objetos que existem e não são usados, o problema inverso.
