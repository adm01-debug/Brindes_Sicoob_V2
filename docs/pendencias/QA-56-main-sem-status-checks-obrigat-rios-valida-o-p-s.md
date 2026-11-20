# QA-56 — `main` sem status checks obrigatórios; validação pós-configuração nunca feita

- Origem: M. Branch protection e governança (Testes, CI e infraestrutura)
- Status auditoria: NAO_INICIADA | Prioridade: P0 | Esforco: P
- Impacto no negocio: qualquer código com teste quebrado pode ser mesclado e publicado, como já aconteceu (QA-38).

## Estado real conferido

PARCIAL - branch protection ATIVO com 10 checks obrigatorios (docs/agentes/github-ci.md:34-39): Gitleaks, npm audit, Analyze, Seguranca/contratos/build, e2e, bundle-stats, lighthouse, Verba/transacionais, Entrada responsiva, Validar origem. strict=true, enforce_admins=true, required_conversation_resolution=true (comentario de bot nao resolvido bloqueia merge). require_last_push_approval=false - DECISAO deliberada (um unico colaborador humano; docs/BRANCH_PROTECTION.md).

## O que falta (auditoria)

decidir se `sicoob-gate` entra no perímetro obrigatorio (hoje roda na esteira mas NAO lista entre os 10 checks obrigatorios) e registrar a validacao pos-configuracao. Manter nomes do perímetro canonico de docs/agentes/github-ci.md:34-39 e NAO reativar aprovação pos-push (decisao de BRANCH_PROTECTION.md).

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
