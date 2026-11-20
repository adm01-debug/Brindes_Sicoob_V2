# FE-087 — Simulador de Preços e Tendências → Orçamento sem pré-carga

- Origem: 8. Orçamentos (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o cálculo feito no simulador se perde e precisa ser refeito.

## Estado real conferido

PRONTO em main e877d0c58. useQuoteInitialization (src/hooks/quote/useQuoteInitialization.ts) importa do location.state: fromSimulator+simulationData (l.269-283), fromCart (l.287-299), templateItems (l.350-358); e sugestoes BI via query string (parseQuoteSuggestionParams l.110-118). SimuladorWizard navega com {fromSimulator:true, simulationData} (l.385).

## O que falta (auditoria)

padronizar o contrato de importação para o construtor.

## Camadas afetadas

- Front (builder/import)


## Regras de negocio

- ver `_regras-de-negocio.md`

## Raio de impacto

- useQuoteInitialization, useQuoteBuilderState, SimuladorWizard


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main
