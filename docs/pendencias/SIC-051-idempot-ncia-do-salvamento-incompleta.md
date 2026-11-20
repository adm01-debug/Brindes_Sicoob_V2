# SIC-051 — Idempotência do salvamento incompleta

- Origem: 6. Orçamento e versionamento (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: em rede ruim, o vendedor ou PA pode gerar orçamento duplicado ou ver erro em algo que já salvou.

## Estado real conferido

PRONTO - save_quote_atomic_idempotent (20260928173500_harden_quote_save_idempotency.sql) cria orcamento 1x por ator+chave (hash SHA-256/MD5), rejeita chave reusada com conteudo diferente (22023) e reapresenta o salvo; front usa save_quote_atomic_idempotent_attested + replay get_quote_save_idempotent_replay (src/services/QuoteService.ts create).

## O que falta (auditoria)

persistir a intenção com o rascunho, contrato idempotente para edição e INSERT no ledger só via RPC.

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
