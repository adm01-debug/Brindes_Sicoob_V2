# DB-01 — Passivo de 491 divergências de ledger (repositório × banco)

- Origem: Ledger e governança de schema (Banco e migrations)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: G
- Impacto no negocio: se for preciso recriar o banco (desastre, novo ambiente, nova cooperativa), o repositório não reconstrói o que está em produção.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

classificar individualmente os ~460 arquivos; mover para `migrations_archive/` os superados/nunca aplicáveis (ver DB-02 e DB-03); registrar no ledger, por `migration repair` auditado, os que comprovadamente já têm efeito no banco; reconciliar as 10 divergências de nome/conteúdo e gravar `statements` das 19 não verificadas; gerar um `schema.sql` de baseline que reproduza o banco.

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
