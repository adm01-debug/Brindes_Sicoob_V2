# DB-14 — Enums de status de pedido sem coluna

- Origem: Pedidos (Banco e migrations)
- Status auditoria: ORFA | Prioridade: P3 | Esforco: P
- Impacto no negocio: baixo; a duplicidade confunde e a etapa "retirada no local" planejada não existe.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

decidir entre enum e CHECK (e remover o enum morto); avaliar se "pronto para retirada" é etapa de negócio.

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
