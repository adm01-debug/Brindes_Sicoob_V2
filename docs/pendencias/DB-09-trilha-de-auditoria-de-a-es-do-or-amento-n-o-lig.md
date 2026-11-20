# DB-09 — Trilha de auditoria de ações do orçamento não ligada

- Origem: Orçamentos (Banco e migrations)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: M
- Impacto no negocio: não se sabe se o cliente abriu ou baixou a proposta, nem quem alterou o quê, e falta prova em disputa comercial.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

chamar `log_quote_action` ao abrir, baixar o PDF e assinar a proposta, e criar uma aba de "Acessos" no orçamento.

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
