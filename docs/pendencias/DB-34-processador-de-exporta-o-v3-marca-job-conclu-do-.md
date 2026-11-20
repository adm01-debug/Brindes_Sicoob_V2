# DB-34 — Processador de exportação v3 marca job concluído sem gerar arquivo

- Origem: Segurança/RBAC (Banco e migrations)
- Status auditoria: STUB/MOCK | Prioridade: P3 | Esforco: P
- Impacto no negocio: se alguém a chamar por engano, os pedidos de exportação aparecem como prontos e o arquivo nunca existe.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

remover a função (ou revogar `EXECUTE`).

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
