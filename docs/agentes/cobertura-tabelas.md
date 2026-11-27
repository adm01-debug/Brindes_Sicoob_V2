# Cobertura de tabelas: veredito

Levantamento de 27/11/2026 sobre as tabelas de `public` que nenhum código de `src/`
consome. Serve para não repetir levantamento nem abrir tela para tabela sem uso.

## Método

1. Listadas as 244 tabelas de `public` (`pg_tables`).
2. Para cada uma, `grep -rF` em `src/**/*.ts` e `src/**/*.tsx`, **excluindo `types.ts`**.
3. Contado `count(*)` em produção para cada tabela sem referência.

**`types.ts` invalida o levantamento:** `src/integrations/supabase/types.ts` declara todas
as tabelas (473 blocos). Incluí-lo na busca dá positivo para tudo. Foi assim que a primeira
varredura chegou a "46 tabelas sem UI" e uma segunda, sem excluir o arquivo, a "2" — os dois
números estavam errados. O número real, com `--exclude=types.ts`, é **64**.

## Por que 64 não são 64 lacunas

Das 64, **18 são partições de `admin_audit_log`** (`_y2024`, `_y2026_m01`…`_y2027_m03`,
`_default`) — são artefato de particionamento da mesma tabela, não domínio próprio.

Sobram 46 tabelas. Destas:

- **1 é backup** de migration aplicada: `_backup_custom_kits_pinned_20261118`.
- **17 são infraestrutura/telemetria** sem tela por desenho: `e2e_cleanup_audit`,
  `e2e_cleanup_rate_limit`, `telemetry_logs`, `test_suites_runs`, `optimization_queue_runs`,
  `quote_save_idempotency`, `order_duplicate_requests`, `webhook_retry_claims`,
  `step_up_tokens`, `step_up_challenges`, `step_up_audit_log`, `quote_consolidations`,
  `sicoob_approval_deliveries`, `sicoob_approval_delivery_archive`,
  `sicoob_delivery_receipt_events`, `sicoob_invitation_events`, `admin_config_audit`.
- **1 é órfã de verdade:** `push_subscriptions` (ver abaixo).
- **As demais 27** têm migration e código de backend mas **0 linhas** em produção: são
  funcionalidades construídas e nunca usadas. Ver a tabela de decisão.

Conta: 18 partições + 1 backup + 17 infra + 1 órfã + 27 sem uso = **64**.

## As 27 com backend e zero linhas

`bitrix_deals`, `bitrix_sync_logs`, `webhook_configs`, `webhook_logs`, `notification_templates`,
`notification_channels`, `manager_notification_config`, `quote_audit_logs`,
`sensitive_access_logs`, `export_audit_log`, `magic_up_comments`, `magic_up_public_shares`,
`magic_up_reactions`, `portfolio_items`, `mockup_templates`, `blog_posts`,
`follow_up_reminders`, `sicoob_performance_reports`, `sicoob_document_registry`,
`sicoob_kit_quote_requests`, `sicoob_quote_reorder_requests`, `sicoob_reorder_requests`,
`pontos_atendimento`, `order_logistics_tracking`, `mcp_access_violations`,
`quote_approval_evidence_keys`, `admin_audit_log`.

**Não são lacunas de tela.** São tabelas que a operação nunca alimentou. Criar uma tela
para `blog_posts` não faz o blog existir; criar tela de `webhook_configs` não gera webhook.
A pergunta certa é de negócio (o recurso vai ser usado?), e enquanto a resposta for não, tela
é custo sem retorno. Duas merecem atenção separada porque o backend está ativo:

- `mcp_access_violations` — **2.060 linhas** de varredura anônima. O evento acontece; falta
  visão. É o único caso com evidência de uso real e sem superfície.
- `admin_config_audit` — 123 linhas, parou em 27/10. Acompanha a mudança de configuração;
  `admin_audit_log` já cobre o mesmo terreno.

## `push_subscriptions` — o elo que falta

A tabela existe (`user_id, endpoint, p256dh, auth, user_agent, device_type, is_active,
last_used_at`), há a migration `20261125133000_harden_push_subscriptions_initplan.sql` e
**já existe um handler `push` no service worker** (`public/sw.js:150`). Mas nada grava na
tabela (`count(*) = 0`):

- `src/hooks/usePushNotifications.tsx` pede permissão e chama `new Notification(...)` —
  notificação local, só com a aba aberta. Não faz `pushManager.subscribe()`.
- `public/sw.js:150` está rotulado `// Push notifications (para futura implementação)`: o
  receptor pronto não recebe nada porque nenhum servidor tem o `endpoint` para enviar.
- A outra menção à tabela é `SYSTEM_TABLES` em
  `supabase/functions/_shared/external-db-config.ts:125`, que a **bloqueia** no bridge externo.

Falta o elo do meio: `pushManager.subscribe({ applicationServerKey: VAPID_PUBLIC_KEY })`
após a permissão, seguido do upsert. Peças 1 (receptor) e 3 (tabela + RLS) já existem.
Não é caso de tela nova; se a tela de Notificações já permite ativar push, é lá que o
botão precisa persistir a inscrição.

## Como repetir

```bash
psql -X -q -A -t "$SUPABASE_DB_URL" \
  -c "select tablename from pg_tables where schemaname='public' order by 1" > /tmp/tabelas.txt
while read -r t; do
  grep -rqF "$t" src --include=*.ts --include=*.tsx --exclude=types.ts || echo "$t"
done < /tmp/tabelas.txt
```