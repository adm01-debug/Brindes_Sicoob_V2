# EDG-06 — Seis funções leem o catálogo só por variável de ambiente

- Origem: Catálogo / bridge (Edge Functions e integrações)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: credencial salva em `/admin/conexoes` não vale para filtros de material, categorias e datas; a vitrine pode aparecer vazia sem alarme.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

trocar por `resolveCredential("EXTERNAL_PROMOBRIND_URL"/"_SERVICE_ROLE_KEY")` como no `external-db-bridge`; responder erro explícito em vez de lista vazia.

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

- NAO INICIADO
