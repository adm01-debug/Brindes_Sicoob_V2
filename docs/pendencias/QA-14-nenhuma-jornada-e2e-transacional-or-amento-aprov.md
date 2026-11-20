# QA-14 — Nenhuma jornada E2E transacional (orçamento → aprovação → pedido)

- Origem: B. E2E (Playwright) (Testes, CI e infraestrutura)
- Status auditoria: NAO_INICIADA | Prioridade: P1 | Esforco: G
- Impacto no negocio: o fluxo que gera receita não tem prova automatizada no navegador antes de cada publicação.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

um spec serial com fixture de homologação cobrindo criar → enviar → aprovar (`/approve/:token`) → converter → validar pedido e verba.

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
