# DB-25 — Assinaturas Realtime sem publicação correspondente

- Origem: Notificações (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: o selo de "aprovação de desconto pendente", os comentários colaborativos de kit e a lista de pedidos Sicoob não atualizam sozinhos; o usuário precisa recarregar.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

decidir caso a caso entre publicar (com RLS adequada) e trocar por polling, e alinhar o check de hardening com as telas.

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
