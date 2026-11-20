# DB-06 — Busca visual por imagem chama RPC com assinatura inexistente

- Origem: Catálogo (Banco e migrations)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: P
- Impacto no negocio: a busca de produto por foto, recurso de diferenciação comercial, nunca devolve resultado.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

passar os candidatos do catálogo externo em `_products` (como faz `supabase/functions/semantic-search/index.ts:32`) e remover o fallback local.

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
