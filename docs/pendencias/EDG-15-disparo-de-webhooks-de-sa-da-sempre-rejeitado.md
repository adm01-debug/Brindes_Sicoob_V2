# EDG-15 — Disparo de webhooks de saída sempre rejeitado

- Origem: n8n / webhooks (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: nenhuma automação externa (n8n, ERP, Slack) recebe aviso de orçamento criado, pedido criado ou desconto aprovado.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

despachante SQL que leia o segredo do Vault (padrão de `20260923140000`), atualizar o cron de retry, documentar o segredo, teste ponta a ponta.

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
