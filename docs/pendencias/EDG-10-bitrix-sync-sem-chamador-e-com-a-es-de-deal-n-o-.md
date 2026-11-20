# EDG-10 — `bitrix-sync` sem chamador e com ações de deal não implementadas

- Origem: CRM / Bitrix (Edge Functions e integrações)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: M
- Impacto no negocio: a "sincronização automática" prometida na tela de conexões não acontece.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

decidir se a importação Bitrix→portal continua; se sim, agendar `sync_full`, implementar `create_deal`/`update_deal`, usar `resolveCredential`; se não, despublicar.

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
