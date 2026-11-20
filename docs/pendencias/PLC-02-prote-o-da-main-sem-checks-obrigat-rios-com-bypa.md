# PLC-02 — Proteção da `main` sem checks obrigatórios, com bypass de admin e ajustes de repositório pendentes

- Origem: A. CI/CD, GitHub e governança de entrega (Planos de melhorias e correções)
- Status auditoria: NAO_INICIADA | Prioridade: P0 | Esforco: P
- Impacto no negocio: qualquer merge, inclusive de administrador, chega à produção sem passar pelos testes.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

exigir os checks (`Segurança, contratos e build`, `sicoob-gate`, `e2e`, `Gitleaks`, `bundle-stats`), ativar `enforce_admins`, resolução de conversas, última aprovação após push e "branch atualizada", deixar só squash, apagar a branch no merge, migrar para ruleset e decidir sobre um segundo revisor humano.

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
