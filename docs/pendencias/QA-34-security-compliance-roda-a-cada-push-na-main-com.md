# QA-34 — `security-compliance` roda a cada push na `main` com service role no banco canônico

- Origem: G. Segurança (gitleaks / CodeQL / audit / dependabot / compliance) (Testes, CI e infraestrutura)
- Status auditoria: PARCIAL | Prioridade: P2 | Esforco: P
- Impacto no negocio: cada merge cria e apaga usuários no banco de produção com chave administrativa.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

environment protegido, gatilho só agendado e retenção de 7 dias.

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
