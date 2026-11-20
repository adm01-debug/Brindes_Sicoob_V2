# FE-110 — Salvar kit completo grava status inválido; ciclo de vida do kit não implementado

- Origem: 11. Kits (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: o vendedor recebe erro ao salvar um kit pronto e não consegue organizar kits por estágio.

## Estado real conferido

PRONTO (verificado em main e877d0c58).

- `custom-kit-payload.ts` grava um kit v?lido como `status:'ready'` e inv?lido como `draft`; a doc interna do arquivo explica que o banco s? aceita ('draft','ready','shared','archived') e que gravar `complete` fazia o salvamento falhar (`Invalid kit status`).
- Migration `20260414193435` cria `validate_status_fields()` que, para `custom_kits`, valida `NEW.status IN ('draft','ready','shared','archived')` (banco).
- `status.ts` define os 4 status can?nicos.
- `shared` ? derivado de `kit_share_tokens`: `useKitShare.generateShareLink()` cria token `active` (status derivado); `revokeShareLink()` marca `revoked`. `KitTemplatesMetricsPage` conta tokens active/revoked/viewed. Nenhuma UI grava `status:'shared'` direto no kit (derivado via token ? n?o ? gap).
- Migrations `20260417002650` e `20260414193435` tamb?m validam `quotes` e `orders`.

## O que falta (auditoria)

mapear para `ready`, marcar `shared` ao gerar link e permitir arquivar.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main e877d0c58 (salvar kit grava status valido; ciclo de status correto)
