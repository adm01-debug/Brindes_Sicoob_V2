# EDG-15 — Disparo de webhooks de saída sempre rejeitado

- Origem: n8n / webhooks (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: nenhuma automação externa (n8n, ERP, Slack) recebe aviso de orçamento criado, pedido criado ou desconto aprovado.

## Estado real conferido

PARCIAL - despachante SQL implementado e versionado: supabase/migrations/20261029213000_secure_webhook_dispatcher_callers.sql:162-181 lê `webhook_dispatcher_secret` do Vault e envia `x-sicoob-internal-secret` (compativel com supabase/functions/webhook-dispatcher/index.ts:84-91); retry_failed_webhook_deliveries atualizado na mesma migration; docs/secrets.md:89-91 documenta o segredo. PENDENTE: verificar aplicacao da migration no banco, provisionar o segredo no Vault e homologar entrega ponta a ponta (NAO VERIFICADO).

## O que falta (auditoria)

confirmar aplicacao em producao da 20261029213000, provisionar webhook_dispatcher_secret no Vault e homologar disparo ponta a ponta (webhook-dispatcher responde). NAO recriar a migration.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
