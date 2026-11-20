# DOC-05 — Restrição por IP/geolocalização: validação no cliente, depois do login, e liberando em caso de falha

- Origem: Tema A — README.md (raiz) e visão geral (Documentação funcional)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: a restrição dá falsa sensação de segurança; um acesso de IP não autorizado não é barrado de fato.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

aplicar a regra no servidor (hook de Auth, ou verificação em RLS/edge na emissão e renovação do token), mudar para fail-closed quando a regra estiver ativa e testar.

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
