# DOC-01 — PDF, link público de aprovação e versões do orçamento sem caminho na interface

- Origem: Tema A — README.md (raiz) e visão geral (Documentação funcional)
- Status auditoria: ORFA | Prioridade: P0 | Esforco: P
- Impacto no negocio: o vendedor não consegue gerar a proposta em PDF nem o link de aprovação pelo caminho normal. O ciclo de venda trava.

## Estado real conferido

PRONTO em main e877d0c58. `src/pages/QuoteViewPage.tsx`: PdfGenerationDialog com approvalLink + WhatsApp + sync Bitrix (l.93), trilha QuoteHistoryPanel (l.69), QuoteApprovalLinkCard/QuoteVersionHistory/QuoteWhatsAppShare (l.132-136). Rotas publicas `/approve/:token` e `/proposta/:token` -> QuoteApprovalPage em `src/routes/config/public.ts`.

## O que falta (auditoria)

ligar o PDF, o link de aprovação, as versões e o Bitrix à página de detalhe, ou criar um botão "Visualizar/Enviar proposta" que leve a `/visualizar`. Consolidar as duas páginas.

## Camadas afetadas

- Front (QuoteViewPage, rotas publicas)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- QuoteViewPage, QuoteApprovalPage, public.ts


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO (em main)
