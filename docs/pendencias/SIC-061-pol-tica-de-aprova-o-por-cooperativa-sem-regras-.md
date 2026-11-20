# SIC-061 — Política de aprovação por cooperativa sem regras de alçada e sem tela

- Origem: 7. Aprovação (interna e link público) (Fluxos Sicoob)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: G
- Impacto no negocio: cada cooperativa não consegue configurar suas regras; todas operam com a mesma regra técnica.

## Estado real conferido

PARCIAL - alcada existe por cooperativa no banco: pa_budgets.limite_alcada (migration 20260502143127) e pa_category_thresholds.limite_alcada por categoria (20260504211811); confirm_sicoob_order valida server-side (20260911143000). Sem tela de regras por cooperativa e sem n minimo de propostas/janelas/responsaveis.

## O que falta (auditoria)

atributos de alçada por valor e categoria, nº mínimo de propostas, janelas e responsáveis, e tela de cadastro e versão. Os valores reais dependem das cooperativas.

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
