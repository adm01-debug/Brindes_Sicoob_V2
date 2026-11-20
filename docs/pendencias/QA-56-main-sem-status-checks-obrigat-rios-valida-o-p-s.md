# QA-56 — `main` sem status checks obrigatórios; validação pós-configuração nunca feita

- Origem: M. Branch protection e governança (Testes, CI e infraestrutura)
- Status auditoria: NAO_INICIADA | Prioridade: P0 | Esforco: P
- Impacto no negocio: qualquer código com teste quebrado pode ser mesclado e publicado, como já aconteceu (QA-38).

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

tornar obrigatórios *Segurança, contratos e build*, `sicoob-gate`, *Gitleaks*, `bundle-stats` e o smoke E2E (depois da QA-11), e registrar a validação.

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
