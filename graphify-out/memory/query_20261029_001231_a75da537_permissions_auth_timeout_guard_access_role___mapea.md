---
type: "code"
date: "2026-10-29T00:12:31.913474+00:00"
question: "permissions auth timeout guard access role — mapear o carregamento de permissões no gate de autenticação e o bloqueio E2E do dashboard"
contributor: "graphify"
outcome: "dead_end"
source_nodes: ["authorize.ts", "PERMISSIONS", "auth-integrity-check/index.ts"]
---

# Q: permissions auth timeout guard access role — mapear o carregamento de permissões no gate de autenticação e o bloqueio E2E do dashboard

## Answer

Dead end para a UI: o grafo recuperou authorize.ts, PERMISSIONS e auth-integrity-check/index.ts, mas a versão existente graphify-out/graph.json não contém ProtectedRoute nem AuthContext. A análise correta exigiu leitura direta de src/components/layout/ProtectedRoute.tsx e src/contexts/AuthContext.tsx; o grafo está desatualizado/incompleto para a camada React.

## Outcome

- Signal: dead_end

## Source Nodes

- authorize.ts
- PERMISSIONS
- auth-integrity-check/index.ts