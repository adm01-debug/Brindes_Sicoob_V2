# SIC-050 — Autorização de status por escopo: corrigida no SQL, falta a versão da tela

- Origem: 6. Orçamento e versionamento (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: duas pessoas mudando o status ao mesmo tempo podem sobrescrever a decisão uma da outra.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

serviço e UI — transportar a versão observada pela tela; teste de regressão negativo no conjunto de CI.

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
