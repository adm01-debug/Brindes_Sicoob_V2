# SIC-060 — Resposta pelo link público barrada pelo guard

- Origem: 7. Aprovação (interna e link público) (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: o cliente ou a cooperativa clica em "aprovar" e recebe erro.

## Estado real conferido

PRONTO em main e877d0c58. Migration `supabase/migrations/20261013120512_fix_quote_governance_writers_and_freeze_content.sql`: wrapper `apply_local_quote_approval_response` seta `app.quote_governance_write=true` com restauracao em erro (l.78-125); nucleo inacessivel a anon/authenticated (REVOKE l.73-76); EXECUTE so para service_role (l.118-125).

## O que falta (auditoria)

RPC — setar a flag; simulação com toda a cadeia; E2E com token válido.

## Camadas afetadas

- Banco (RPC wrapper + guard governan?a)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- apply_local_quote_approval_response


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (codigo em main); pendente: confirmar aplicacao das migrations no banco de producao
