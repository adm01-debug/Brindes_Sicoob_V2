# PLC-39 — CSP e cabeçalhos de segurança ausentes na raiz do domínio publicado

- Origem: D. Observabilidade e segurança de borda (Planos de melhorias e correções)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: a página de entrada do portal fica sem proteção contra injeção de scripts e clickjacking.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

regra explícita para `/` (ou `source: "/(.*)"`) com teste automatizado da resposta publicada, e CSP com nonce.

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
