# PLC-03 — Publicação em produção sem gate de CI e "quem é produção" indefinido

- Origem: A. CI/CD, GitHub e governança de entrega (Planos de melhorias e correções)
- Status auditoria: NAO_INICIADA | Prioridade: P1 | Esforco: M
- Impacto no negocio: a equipe pode estar olhando ou divulgando o endereço de outro produto, e o código entra no ar sem validação.

## Estado real conferido

PARCIAL - publicador DEFINIDO: README.md:321-329 e docs/DEPLOYMENT.md:12-23 identificam Vercel como publicador oficial e o papel residual do Lovable. PROPOSTA de condicionar deploy ao CI segue em aberto, mas a definicao de ambiente de producao NAO falta.

## O que falta (auditoria)

apenas condicionar o build da Vercel ao status do commit (gate CI) - decisao de publicador ja registrada; README/DEPLOYMENT ja corrigidos.

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
