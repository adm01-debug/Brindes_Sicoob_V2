# FE-001 — Detalhe do orçamento reduzido; página completa sem acesso

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P0 | Esforco: P
- Impacto no negocio: o vendedor não consegue gerar, enviar nem assinar a proposta pelo caminho normal da tela, e o fluxo de venda trava.

## Estado real conferido

PRONTO em main e877d0c58. Rotas canonicas ja montam QuoteViewPage em /orcamentos/:id (src/routes/config/quotes.ts:38) e /orcamentos/:id/visualizar (l.46). QuoteViewPage.tsx renderiza QuoteItemsTable + QuoteTotalsSummary (l.132), PdfGenerationDialog (l.93), QuoteHistoryPanel (l.69), QuoteApprovalLinkCard/QuoteVersionHistory/QuoteWhatsAppShare (l.132-136). QuoteDetailPage.tsx (164 linhas) e orf?: zero imports externos; todos os componentes dela (Comments/ConvertToOrder/SingularApproval/History/Versions) existem na canonica.

## O que falta (auditoria)

decidir uma página canônica. Ou `/orcamentos/:id` passa a montar `QuoteViewPage`, ou os recursos são incorporados à `QuoteDetailPage`. Também é preciso mostrar os itens no detalhe e corrigir as mensagens.

## Camadas afetadas

- Front (rotas /orcamentos/:id e /orcamentos/:id/visualizar)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- QuoteViewPage, quotes.ts (rota canonica)


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main (rota canonica resolvida); residuo: remover QuoteDetailPage.tsx orfa (chore de limpeza, nao funcional)
