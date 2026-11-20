# SIC-024 — Pedido de aumento de verba quebrado e sem decisão

- Origem: 3. Verba/orçamento por PA e competência (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: M
- Impacto no negocio: o PA não consegue pedir mais verba; o botão existe mas falha.

## Estado real conferido

PARCIAL ? solicitar funciona; decis?o N?O existe.

- PAWalletPage.tsx: dialog 'Solicitar Aumento de Verba' chama sicoobApprovalService.createLimitIncreaseRequest (supabase.from('limit_increase_requests').insert), com RLS SELECT (admin/supervisor/gestor_pa/gestor_singular/criador) e INSERT (gestor_pa); hist?rico listado (approved/rejected/pending).
- N?O EXISTE tela de decis?o: nenhum outro arquivo em src/ l?/escreve limit_increase_requests (s? PAWalletPage); n?o h? RPC decide_limit_increase_request nem fun??o no banco. Solicita??o fica 'pending' para sempre e o limite nunca muda. current_limit nunca preenchido no insert.

## O que falta (auditoria)

RLS, RPC de solicitar/decidir com alçada, aplicação ao `pa_budgets` com trilha, tela de decisão do gestor e notificação.

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
