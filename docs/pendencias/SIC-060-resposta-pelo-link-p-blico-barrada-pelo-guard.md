# SIC-060 — Resposta pelo link público barrada pelo guard

- Origem: 7. Aprovação (interna e link público) (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: o cliente ou a cooperativa clica em "aprovar" e recebe erro.

## Estado real conferido

CODIGO em main e877d0c58 (aplicacao em producao CONFIRMADA em 2026-11-21 via swagger: RPC `apply_local_quote_approval_response` presente com sufixo `_core_20261013` (introduzido pela migration 13120512); comportamento (flag + restauracao em erro) NAO exercitado nesta sessao - sem SQL direto). Migration `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql`: wrapper `apply_local_quote_approval_response` seta `app.quote_governance_write=true` com restauracao em erro (l.78-125); nucleo inacessivel a anon/authenticated (REVOKE l.73-76); EXECUTE so para service_role (l.118-125).

## O que falta (auditoria)

RPC — setar a flag; simulação com toda a cadeia; E2E com token válido (ABERTO; objeto existe em produção, comportamento pendente).

## Camadas afetadas

- Banco (RPC wrapper + guard governan?a)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- apply_local_quote_approval_response


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- CODIGO em main (migracao 20261013120512). APLICACAO EM PRODUCAO CONFIRMADA em 2026-11-21: RPC `apply_local_quote_approval_response` presente com sufixo `_core_20261013` (obj. criado somente por essa migracao). COMPORTAMENTO (flag + restauracao em erro + link publico) NAO EXERCITADO - sem SQL direto. Pendente: E2E com token valido do link publico.
