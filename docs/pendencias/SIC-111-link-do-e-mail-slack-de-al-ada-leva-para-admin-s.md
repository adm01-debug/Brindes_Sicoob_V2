# SIC-111 — Link do e-mail/Slack de alçada leva para /admin/sicoob

- Origem: 12. Notificações (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o aprovador clica no e-mail e cai numa tela proibida (403).

## Estado real conferido

CONFIRMADO - supabase/functions/_shared/approval-delivery.ts monta link fixo new URL("/admin/sicoob", PUBLIC_APP_URL); rota /admin/sicoob nao existe em sicoob-rbac.ts (defineRoute /gestor/aprovacoes na linha 18). Aprovador que clica cai em rota proibida. Correcao: link para /gestor/aprovacoes (ou pedido especifico).

## O que falta (auditoria)

edge — link profundo para `/sicoob/pedidos/:id` ou `/gestor/aprovacoes`.

## Camadas afetadas

- 

## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
