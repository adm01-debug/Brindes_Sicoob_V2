# ADM-15 — Links internos quebrados nos componentes da fatia

- Origem: Painel admin, navegação e rotas (Admin, BI e IA)
- Status auditoria: RESOLVIDO | Prioridade: P1 | Esforco: P
- Impacto no negocio: cliques em "buscas em alta", "demanda não atendida", "ver todas as solicitações" e "datas comemorativas" terminam em 404 ou em catálogo sem filtro.

## Estado real conferido

CORRIGIDO na PR #390 (branch claude/fix-adm15-links-261121-1440, commit e614a3aea).

- (1) UpcomingDatesWidget.tsx:33 agora navega `/filtros?datasComemorativas=<slug>` — key lida por `deserializeFilters` via `ARRAY_FILTER_KEYS` (filters-page-helpers.ts:14,63-102).
- (2) MyDiscountRequestsWidget.tsx tinha botão "Ver todas" navegando `/admin/descontos` (rota inexistente). Após análise (reviews Devin/Codex na PR #390): o widget já é a listagem completa do próprio vendedor (infinite scroll, filtros, seller_id = auth.uid()), e o destino `/admin/limites-desconto` é admin-only (AdminRoute exige supervisor/dev) → vendedor receberia 403. Decisão: botão removido; o histórico completo continua acessível no próprio widget.
- (3) SmartSuggestions.tsx:52-104 — MOCK_SUGGESTIONS agora aponta `/filtros?search=<term>` (rota de busca real); `/produtos` é página de filtros e a rota de detalhe é `/produto/:id`, então os antigos `/produtos/1..5` eram destinos inexistentes.
- (4) UnmetDemandCard.tsx:82 `/filtros?search=<term>` — correto, sem mudança.

## O que falta (auditoria)

nada para este item. Validar deploy após merge (Vercel automático).

## Camadas afetadas

- dashboard/widgets (navegação), busca com sugestões

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- Componentes isolados; typecheck e eslint limpos nos arquivos tocados.

## Dependencias

- 

## Criterio de aceite

- Navegações chegarem a destinos existentes com filtro aplicado.

## Estado final

- RESOLVIDO (PR #390) — aguardando merge/deploy
