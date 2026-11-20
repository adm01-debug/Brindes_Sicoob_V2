# FE-140 — Tendências abre com dados fictícios para todos

- Origem: 14. Tendências, inteligência e BI (Frontend núcleo)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: P
- Impacto no negocio: a área de "insights" mostra tendências inventadas a vendedores e gestores.

## Estado real conferido

IMPLEMENTADO - padrao invertido: dados reais sao o padrao e demo so com ?demo=1 (src/pages/trends/is-demo-mode.ts:9-11; TrendsPage.tsx:143). Ver ADM-43. Validacao das consultas reais em producao NAO executada nesta sessao.

## O que falta (auditoria)

inverter o padrão (dados reais, demo opcional) e validar as consultas reais.

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
