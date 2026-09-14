# Workflow de Pedidos - Documentação Técnica

## Workflow Principal (Onda A)

### Status de Pedido
Os pedidos seguem o fluxo definido em `src/hooks/useOrders.ts`:
1. **pending**: Aguardando processamento inicial.
2. **waiting_approval**: Em análise de crédito ou operacional.
3. **confirmed**: Pagamento e dados validados.
4. **in_production**: Sendo fabricado/personalizado.
5. **in_separation**: Em triagem e embalagem.
6. **in_transit**: Coletado pela transportadora.
7. **delivered**: Entregue ao destino.
8. **completed**: Processo finalizado.
9. **cancelled**: Pedido cancelado.

### Regras de Transição
As transições são validadas tanto no Frontend (`canTransitionTo`) quanto no Banco de Dados (Trigger `tr_validate_main_order_status`).
Qualquer tentativa de pular etapas (ex: de `pending` para `delivered`) resultará em erro.

## Workflow Sicoob

### Status Sicoob
Localizado em `src/types/sicoob/orders.ts`:
- **draft** -> **pending** -> **waiting_approval** -> **confirmed** -> **logistic** -> **completed**
- Suporte a **rejected** (volta para draft/pending) e **cancelled**.

### Auditoria e Timeline
Todas as mudanças de status são registradas na tabela `order_audit_events` via triggers, garantindo um histórico imutável para compliance.
Componentes de UI como `OrderAuditTimeline` consomem estes eventos para exibir a trilha de auditoria.

## Testes
- Testes unitários para lógica de transição: `src/hooks/useOrders.test.ts` e `src/types/sicoob/orders.test.ts`.
- Rodar com: `npx vitest run`
