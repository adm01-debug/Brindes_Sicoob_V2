# Casos de Teste E2E por Papel

Este documento detalha cada caso de teste (TC) e cenário negativo (NEG) referenciados no `CHECKLIST_EXECUCAO_PREVIEW_POR_PAPEL.md`.

## 1. Gerente PA (GP)

### TC-GP-01: Configurar Notificações
- **Objetivo:** Validar persistência das preferências de notificação.
- **Passos:**
  1. Login como `qa+gerente@sicoob.test`.
  2. Ir para Configurações / Notificações.
  3. Alterar toggles de Email e Push.
  4. Recarregar página.
- **Asserção:** Toggles mantêm o estado alterado.

### TC-GP-02: Criar Pedido Normal
- **Objetivo:** Fluxo feliz de criação de pedido.
- **Passos:**
  1. Adicionar produto ao carrinho.
  2. Finalizar checkout.
- **Asserção:** Pedido em `/meus-pedidos` com status `enviado_gestor`.

### TC-GP-03: Criar Pedido Acima da Verba
- **Objetivo:** Validar bloqueio/alerta de verba insuficiente.
- **Passos:**
  1. Adicionar itens que superem R$ 5.000.
- **Asserção:** Banner vermelho visível; pedido marcado para alçada.

... (mais casos conforme checklist)

## 2. Gestor Compras (GC)

### TC-GC-01: Aprovar Lote no Kanban
- **Objetivo:** Aprovação massiva de pedidos.
- **Passos:**
  1. Selecionar múltiplos pedidos em `/gestor/aprovacoes`.
  2. Clicar em "Aprovar em Lote".
- **Asserção:** Todos mudam para `aprovado_gestor`.

... (mais casos)
