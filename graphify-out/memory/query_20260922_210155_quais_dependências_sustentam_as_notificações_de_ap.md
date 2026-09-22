---
type: "query"
date: "2026-09-22T21:01:55.401529+00:00"
question: "Quais dependências sustentam as notificações de aprovação e suas repetições?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["EmailRequest", "retryWithBackoff"]
---

# Q: Quais dependências sustentam as notificações de aprovação e suas repetições?

## Answer

Consulta expandida com termos do grafo: notification approval email webhook retry. O nó EmailRequest aponta para send-transactional-email/index.ts:L10; retryWithBackoff aponta para _shared/retry-backoff.ts:L79. O mapa estrutural não prova fila ou entrega. A inspeção posterior de código e SQL confirmou ausência de outbox e confirmação fictícia no endpoint legado. Ver docs/execucao/notificacoes-duraveis-20260922.md para correções e limites.

## Outcome

- Signal: useful

## Source Nodes

- EmailRequest
- retryWithBackoff