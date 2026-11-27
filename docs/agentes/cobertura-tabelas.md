# Cobertura de tabelas: veredito

Levantamento de 27/11/2026 sobre as tabelas de `public` que não aparecem em `src/`.
Serve para evitar trabalho duplicado: abrir tela para tabela sem uso não agrega.

## Método

1. Listadas as 244 tabelas de `public` (`pg_tables`).
2. Para cada uma, `grep -rF` em `src/**/*.ts` e `src/**/*.tsx`.
3. A varredura **anterior** contava `src/integrations/supabase/types.ts`, que declara
   todas as tabelas e por isso produzia 46 falsos positivos. Sem `types.ts` sobram **2**.

## Resultado

| Tabela | Linhas | Veredito |
| --- | --- | --- |
| `_backup_custom_kits_pinned_20261118` | — | Backup de migration já aplicada. Não é domínio; sem tela. |
| `push_subscriptions` | 0 | Backend órfão — ver abaixo. |

Todas as demais 242 tabelas têm referência no front.

## `push_subscriptions`

Existe a tabela (`user_id, endpoint, p256dh, auth, user_agent, device_type, is_active,
last_used_at`) e a migration `20261125133000_harden_push_subscriptions_initplan.sql`,
mas **nenhum código grava nela**:

- `src/hooks/usePushNotifications.tsx` só usa a `Notification` API do navegador
  (`requestPermission` / `new Notification`) — notificação local, sem servidor.
- A única outra menção é a lista `SYSTEM_TABLES` em
  `supabase/functions/_shared/external-db-config.ts:125`.
- `count(*) = 0`.

Ou seja: não é uma tela faltando, é o **registro de inscrição** faltando. Sem ele o
servidor não tem para onde enviar push quando o app está fechado. Fechar isso exige
três partes juntas — não faz sentido entregar só a tela:

1. `serviceWorker` com handler `push` e `pushManager.subscribe(VAPID)` no front.
2. `upsert` em `push_subscriptions` após a permissão (hoje a permissão é pedida e
   o endpoint nunca é salvo).
3. Remetente no servidor usando as chaves VAPID.

Fica registrado como funcionalidade pendente, não como tabela morta.

## Outras tabelas com volume, todas já cobertas

`admin_config_audit` (123), `mcp_access_violations` (2.060) e
`sicoob_approval_worker_dispatches` (41.654) aparecem no código; o que faltava
nelas era painel/monitoramento, não referência.

## Como repetir

```bash
psql -X -q -A -t "$SUPABASE_DB_URL" -c "select tablename from pg_tables where schemaname='public' order by 1" > /tmp/tabelas.txt
while read -r t; do
  grep -rqF "$t" src --include=*.ts --include=*.tsx || echo "$t"
done < /tmp/tabelas.txt
```