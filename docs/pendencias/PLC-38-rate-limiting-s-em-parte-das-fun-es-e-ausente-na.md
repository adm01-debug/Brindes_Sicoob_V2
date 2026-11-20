# PLC-38 — Rate limiting só em parte das funções e ausente nas RPCs públicas

- Origem: D. Observabilidade e segurança de borda (Planos de melhorias e correções)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: o link público de aprovação e as APIs abertas podem ser abusados (força bruta de token, custo de IA).

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

aplicar o limitador a todas as funções públicas e proteger as RPCs públicas (limitação no banco ou só via Edge).

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
