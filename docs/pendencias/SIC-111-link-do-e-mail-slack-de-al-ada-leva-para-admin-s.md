# SIC-111 — Link do e-mail/Slack de alçada leva para /admin/sicoob

- Origem: 12. Notificações (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o aprovador clica no e-mail e cai numa tela proibida (403).

## Estado real conferido

CONFIRMADO - supabase/functions/_shared/approval-delivery.ts monta link fixo new URL("/admin/sicoob", PUBLIC_APP_URL). A rota /admin/sicoob EXISTE (routes/config/admin.ts SicoobManagementPage) mas fica sob AdminRoute (src/components/layout/AdminRoute.tsx) que exige role supervisor/dev/gestor_compras; o aprovador comum (gerente_pa/comprador_pac) cai em 403. Correcao: link para /gestor/aprovacoes (PA_ROLES) ou /sicoob/pedidos/:id.

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
