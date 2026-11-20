# ADM-43 — Tendências abre em modo demo para todos

- Origem: Inteligência Comercial (`/inteligencia-comercial`) e Tendências (`/tendencias`) (Admin, BI e IA)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: P
- Impacto no negocio: buscas em alta, funil e demanda não atendida exibidos ao time são fictícios.

## Estado real conferido

IMPLEMENTADO - src/pages/trends/is-demo-mode.ts:9-11 ativa dados ficticios apenas com ?demo=1 (opt-in); TrendsPage.tsx:143,180-193 usa isDemoMode para escolher mocks vs indicadores reais; tests/pages/trends-demo-mode.test.ts:8-24 cobre padrao real e opt-in. Validacao das consultas reais em producao NAO executada nesta sessao.

## O que falta (auditoria)

decidir o fim da avaliação e inverter o padrão (demo só por opt-in).

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
