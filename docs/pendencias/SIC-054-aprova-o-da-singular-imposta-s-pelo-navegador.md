# SIC-054 — Aprovação da Singular imposta só pelo navegador

- Origem: 6. Orçamento e versionamento (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: um PA consegue comprar sem o aval da Singular.

## Estado real conferido

PRONTO (gate server-side em main e877d0c58).

- Convers?o quote?pedido: `convert_quote_to_sicoob_order` (migration `20260922224500` e wrapper `20261013120512`) exige `v_quote.status IN ('approved','approved_singular')` ? "Apenas or?amentos aprovados podem ser convertidos." RPC SECURITY DEFINER; o core ? REVOKE de authenticated (`convert_quote_to_sicoob_order_core_20261013`), s? cham?vel via wrapper com contexto `app.quote_governance_write=true`.
- Aprova??o server-side: `approve_quote_with_pdf_atomic` valida `p_manager_id IS DISTINCT FROM v_actor_id` (err 42501 ? identidade do aprovador) e `sicoob_actor_can_approve` rejeita self-approval (`NOT policy.forbid_self_approval OR o.created_by IS DISTINCT FROM p_actor_id`).
- Transi??o de status: `guard_sicoob_approval_status_transition` (trigger) s? aceita `pending?waiting_approval` via opera??o 'prepare'/'request', `waiting_approval?escalated_to_board` via 'escalate', `?confirmed` via 'confirm'/'approve' ? updates diretos pelo navegador s?o bloqueados (err 42501).
- `freeze_sicoob_order_while_approval_pending` bloqueia alterar valor/itens de pedido em `waiting_approval`/`escalated_to_board`.
- Escopo: `sicoob_actor_can_approve` resolve a pol?tica `get_sicoob_order_approval_policy(o.id)` com a Singular do ator ? aprova??o ? ligada ? unidade, n?o ao navegador.

Ou seja: um PA n?o converte sem status aprovado, e o status aprovado n?o ? grav?vel direto pelo cliente (exige RPC com autoriza??o server-side). Item da auditoria residido.

## O que falta (auditoria)

RPC — obrigar orçamentos de PA a passar pela Singular; UI — liberar a ação a `comprador_singular`.

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
