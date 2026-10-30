# Observabilidade — Promo Gifts

> Referência de implementação e proposta operacional para logs estruturados e correlação por `request_id`.
> Atualizado em 30/10/2026. A existência do código de instrumentação não confirma configuração ativa de Sentry, dashboards ou canais externos.

## 1. Correlação ponta-a-ponta (`request_id`)

Chamadas instrumentadas podem propagar o mesmo `request_id` (UUIDv4) do cliente à Edge Function e ao banco. A cobertura não é global: o cliente envia o header somente em fluxos que o implementam, e o banco recebe o valor se o writer/RPC o encaminhar.

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
- `warn`  → 4xx, validação, rate-limit. O logger atual grava no console; não encaminha `warn` a `captureMessage`.
- `error` → 5xx, exceção não tratada, integração quebrada. Sentry `captureException`.

## 3. Métricas de webhook — implementação pendente

O repositório não mostra writers ativos para `public.webhook_delivery_metrics` nem rota `/admin/observabilidade`. Portanto, a tabela e o resumo não são uma fonte operacional comprovada e não devem ser usados para afirmar que entregas estão monitoradas. O painel encontrado no código é `/admin/telemetria`; valide as métricas que ele realmente consulta antes de tomar decisões.

## 4. Alertas sugeridos (configuração externa não verificada)

As regras abaixo são sugestões de operação, não evidência de alertas já cadastrados. Confirme o projeto, os filtros e os destinos no provedor antes de tratar qualquer regra como ativa.

| Alerta                       | Condição                                                | Severidade | Canal       |
|------------------------------|---------------------------------------------------------|------------|-------------|
| 5xx burst (edge)             | `event.tags.scope:edge.* level:error` ≥ 5 em 5 min      | P1         | Slack #ops  |
| 4xx anômalo (auth)           | `scope:auth.*` `event:*_failed` ≥ 20 em 10 min          | P2         | Slack #ops  |
| Webhook outbound failing     | `scope:webhook.outbound level:error` ≥ 3 em 5 min       | P1         | PagerDuty   |
| Webhook inbound 4xx          | `scope:webhook.inbound event:reject_*` ≥ 10 em 10 min   | P2         | Slack #int  |
| Step-up MFA bypass attempt   | `scope:auth.stepUp event:bypass_attempt`                | P0         | PagerDuty   |
| AI gateway saturation        | `scope:ai.gateway event:rate_limited` ≥ 50 em 5 min     | P2         | Slack #ai   |

Se Sentry estiver habilitado no ambiente, configurar via Sentry → Alerts → Create Alert Rule, filtrando pelas tags
`scope`, `event` e `request_id` emitidas pelos loggers.

### Métrica complementar: webhook 5xx via DB

Uma integração futura só deve consultar esse RPC depois que a existência da função e a gravação dos dados forem comprovadas no ambiente:
```sql
SELECT source, failures, p95_ms, last_failure_at
FROM public.get_webhook_delivery_summary(15)
WHERE status_class = '5xx' AND failures >= 3;
```
O monitoramento por webhook não está ativo apenas por este exemplo existir.

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

## 6. Como investigar uma falha

1. Extraia o `request_id` do log estruturado, do header de resposta ou do evento Sentry, se essa integração estiver habilitada.
2. Consulte os logs de Edge Functions, Auth e banco no provedor configurado para o ambiente; o provedor e a retenção devem ser confirmados antes da investigação.
3. Procure o mesmo identificador nos logs disponíveis.
4. A tabela de métricas de webhook não possui writer confirmado no código atual; não use-a como evidência de monitoramento ativo.

## 7. App Health Dashboard (`/admin/telemetria`)

O código contém uma página administrativa de telemetria. A implementação consultada usa `get_app_health_summary`; itens adicionais abaixo são objetivos a confirmar, não capacidades garantidas:
- **Saúde Global:** Latência média, taxa de erro (%), disponibilidade de serviços (External DB, CRM, Cloudflare).
- **Consumo de IA:** Quotas por usuário/singular e latência de inferência.
- **Auditoria de Chaves:** Eventos de emissão/rotação de chaves MCP.
- **Diagnóstico Operacional:** Verificação de conectores e latência de RPCs críticos.

## 8. Gates de CI (Prevenção de Regressão)

Gates encontrados na branch atual:
- **Edge Structured-Logging Gate:** `scripts/check-edge-structured-logging.mjs` bloqueia PRs se novas Edge Functions não usarem o logger estruturado.
- **Edge Request-Id Propagation Gate:** `scripts/check-edge-request-id-propagation.mjs` verifica padrões estáticos; não prova cobertura de toda chamada externa.
- **ESLint Baseline Gate:** `scripts/check-eslint-baseline.mjs` compara o lint com seu baseline; não é um gate específico de `console.log` nem força `createClientLogger` no cliente.
- **Webhook Alerts → Sentry:** integração externa proposta; cron e destino ainda precisam de evidência de configuração.

## 9. Exemplo de correlação no frontend

O exemplo mostra o uso do logger no código. A entrega ao Sentry depende da configuração do ambiente e não deve incluir dados pessoais ou credenciais no payload:

1. **No Frontend (Captura):**
   Ao implementar uma nova ação, use o logger para gerar o `request_id`.
   ```ts
   // src/pages/MyNewPage.tsx
   const log = createClientLogger('my-feature.action');
   
   const handleAction = async () => {
     log.info('iniciando_acao');
     try {
       const { data, error } = await supabase.functions.invoke('my-function', {
         headers: log.headers() // ESSENCIAL: Propaga o X-Request-Id
       });
       if (error) throw error;
     } catch (err) {
       // O logger pode encaminhar o erro ao Sentry quando configurado.
       log.error('falha_na_acao', { error: err });
     }
   };
   ```

2. Copie o `request_id` do log estruturado e procure o identificador nos sistemas de observabilidade efetivamente habilitados no ambiente.




## 11. Retornos antecipados nas Edge Functions

`withStructuredLogging(nome, handler)` instrumenta início, resposta e exceções,
acrescentando `X-Request-Id` inclusive em 401, 403, 405 e 429. O wrapper preserva
corpo/status/headers da resposta e não registra corpo da requisição, credenciais
ou texto de exceções inesperadas. Para casos não tratados, retorna 500 genérico.

O gate verifica chamadas reais por AST, incluindo imports com alias. Importar o
logger sem chamá-lo não satisfaz o contrato. Isso continua sendo inspeção estática;
os cenários executáveis verificam o comportamento do wrapper. O stub desativado
`migrate-helper` é dispensado exclusivamente pelo hash do código inerte revisado.
Mudanças nesse stub invalidam a exceção. A allowlist legada não deve crescer.
