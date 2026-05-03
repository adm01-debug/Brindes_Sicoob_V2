# Observabilidade — Promo Gifts

> **SSOT** para logs estruturados, correlação por `request_id` e dashboards/alertas.
> Última atualização: 2026-04-27 (Onda Observability).

## 1. Correlação ponta-a-ponta (`request_id`)

Cada chamada do client → edge function → DB carrega um único `request_id` (UUIDv4):

| Camada       | Origem                                               | Header                | Helper                                              |
|--------------|------------------------------------------------------|-----------------------|-----------------------------------------------------|
| Client       | `newRequestId()` em `src/lib/telemetry/requestId.ts` | `X-Request-Id`        | `createClientLogger(scope)`                         |
| Edge Fn      | `getOrCreateRequestId(req)` (`_shared/request-id.ts`)| `X-Request-Id` (echo) | `createStructuredLogger({ fn, requestId, req })`    |
| DB           | gravado em colunas `request_id` (auditoria/metrics)  | n/a                   | passar via parâmetro RPC ou body de insert         |
| Sentry       | tag `request_id` em `captureException`               | n/a                   | `createClientLogger(...).error(...)` faz forwarding |

**Regra:** toda nova edge function DEVE usar `createStructuredLogger`. Toda chamada `supabase.functions.invoke` em rota crítica DEVE enviar `headers: log.headers()`.

## 2. Logger estruturado (formato JSON)

Edge:
```json
{"ts":"2026-04-27T12:00:00Z","level":"info","fn":"quote-sync","request_id":"…","event":"request_end","method":"POST","path":"/quote-sync","status":200,"duration_ms":124}
```

Client (em PROD):
```json
{"ts":"…","level":"warn","scope":"auth.signIn","request_id":"…","event":"signin_failed","reason":"invalid_credentials"}
```

Severidades:
- `info`  → fluxo normal (não dispara alerta).
- `warn`  → 4xx, validação, rate-limit. Sentry `captureMessage`.
- `error` → 5xx, exceção não tratada, integração quebrada. Sentry `captureException`.

## 3. Webhooks — métricas e dashboard

Tabela: `public.webhook_delivery_metrics` (append-only, escrita por `service_role`).

Funções consumidoras já instrumentadas (escrevem 1 linha por entrega):
- `webhook-inbound`, `webhook-dispatcher`, `product-webhook`, `sync-quote-bitrix`, `quote-sync`, `bitrix-sync`.

Dashboard (admin → `/admin/observabilidade`):

```sql
SELECT * FROM public.get_webhook_delivery_summary(60);  -- últimos 60 min
```

Retorna por `source` × `direction` × `status_class` (2xx/3xx/4xx/5xx):
- `total`, `failures`, `p95_ms`, `last_failure_at`.

## 4. Alertas Sentry

| Alerta                       | Condição                                                | Severidade | Canal       |
|------------------------------|---------------------------------------------------------|------------|-------------|
| 5xx burst (edge)             | `event.tags.scope:edge.* level:error` ≥ 5 em 5 min      | P1         | Slack #ops  |
| 4xx anômalo (auth)           | `scope:auth.*` `event:*_failed` ≥ 20 em 10 min          | P2         | Slack #ops  |
| Webhook outbound failing     | `scope:webhook.outbound level:error` ≥ 3 em 5 min       | P1         | PagerDuty   |
| Webhook inbound 4xx          | `scope:webhook.inbound event:reject_*` ≥ 10 em 10 min   | P2         | Slack #int  |
| Step-up MFA bypass attempt   | `scope:auth.stepUp event:bypass_attempt`                | P0         | PagerDuty   |
| AI gateway saturation        | `scope:ai.gateway event:rate_limited` ≥ 50 em 5 min     | P2         | Slack #ai   |

Configurar via Sentry → Alerts → Create Alert Rule, filtrando pelas tags
`scope`, `event` e `request_id` emitidas pelos loggers.

### Métrica complementar: webhook 5xx via DB

Cron Sentry/cronjob externo pode rodar:
```sql
SELECT source, failures, p95_ms, last_failure_at
FROM public.get_webhook_delivery_summary(15)
WHERE status_class = '5xx' AND failures >= 3;
```
e disparar webhook se retornar linhas.

## 5. Rotas críticas instrumentadas (client)

- `auth.signIn`, `auth.signOut`, `auth.stepUp`, `auth.passwordRecovery`
- `quote.create`, `quote.approvePublic`, `quote.syncBitrix`
- `mcp.issueKey`, `mcp.revokeKey`
- `magicUp.generate`, `magicUp.share`
- `comparison.publicShare`
- `connections.testCredentials`

Padrão:
```ts
const log = createClientLogger('quote.create');
log.info('start', { items: cart.length });
try {
  const { data, error } = await supabase.functions.invoke('quote-sync', {
    body: payload,
    headers: log.headers(),       // propaga X-Request-Id
  });
  if (error) { log.error('failed', { err: error }); throw error; }
  log.info('ok', { quoteId: data.id });
} catch (err) {
  log.error('exception', { err });
  throw err;
}
```

## 6. Como debugar uma falha

1. Pegue o `request_id` exibido ao usuário ou no erro do Sentry (tag `request_id`).
2. **Edge logs** (Lovable Cloud → Edge Function logs): grep pelo id.
3. **Auth logs** / **DB logs**: idem.
4. **Webhook metrics**: `SELECT * FROM webhook_delivery_metrics WHERE request_id = '…'`.

## 7. App Health Dashboard (`/admin/telemetria`)

O dashboard administrativo centraliza a visão de saúde da aplicação:
- **Saúde Global:** Latência média, taxa de erro (%), disponibilidade de serviços (External DB, CRM, Cloudflare).
- **Consumo de IA:** Quotas por usuário/singular e latência de inferência.
- **Auditoria de Chaves:** Eventos de emissão/rotação de chaves MCP.
- **Diagnóstico Operacional:** Verificação de conectores e latência de RPCs críticos.

## 8. Gates de CI (Prevenção de Regressão)

A plataforma utiliza gates rigorosos para manter a qualidade da observabilidade:
- **Edge Structured-Logging Gate:** `scripts/check-edge-structured-logging.mjs` bloqueia PRs se novas Edge Functions não usarem o logger estruturado.
- **Edge Request-Id Propagation Gate:** Garante que o `X-Request-Id` seja propagado para serviços externos.
- **Client Logging Gate:** Força o uso de `createClientLogger` em rotas críticas (Checkout, Auth, Admin).
- **ESLint Baseline Gate:** `.eslint-baseline.json` bloqueia a introdução de novos warnings de lint que prejudiquem a observabilidade (ex: console.logs puros).
- **Webhook Alerts → Sentry:** Monitoramento contínuo de webhooks inbound/outbound via cron job.

## 9. Onboarding Prático: Do Frontend ao Sentry

Para capturar e rastrear uma falha em tempo real, siga este fluxo:

1. **No Frontend (Captura):**
   Ao implementar uma nova ação, use o logger para gerar o `request_id`.
   ```ts
   // src/pages/MyNewPage.tsx
   const log = createClientLogger('my-feature.action');
   
   const handleAction = async () => {
     log.info('iniciando_acao', { userId: user.id });
     try {
       const { data, error } = await supabase.functions.invoke('my-function', {
         headers: log.headers() // ESSENCIAL: Propaga o X-Request-Id
       });
       if (error) throw error;
     } catch (err) {
       // O log.error automaticamente envia para o Sentry com a tag request_id
       log.error('falha_na_acao', { error: err });
     }
   };
   ```

2. **No Browser (Inspecionar):**
   - Abra o Console do DevTools.
   - Procure pelo log estruturado: `{"event": "falha_na_acao", "request_id": "550e8400-e29b-..."}`.
   - Copie o `request_id`.

3. **No Sentry (Localizar):**
   - Vá para **Issues** ou **Discover**.
   - Filtre por `request_id:550e8400-e29b-...`.
   - Você verá o erro exato, o rastro do usuário e os logs de backend correlacionados.

4. **Nas Edge Functions (Confirmar):**
   - No painel da Lovable Cloud → **Edge Function Logs**, cole o `request_id` na busca.
   - Você verá o ciclo de vida completo da requisição, desde o `request_start` até o `request_end` (ou erro).

---

## 10. Gates de CI (Prevenção de Regressão)
... keep existing code



