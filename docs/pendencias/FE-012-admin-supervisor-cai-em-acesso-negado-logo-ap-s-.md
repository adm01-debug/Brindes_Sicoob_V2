# FE-012 — Admin/supervisor cai em "acesso negado" logo após o login

- Origem: 1. Rotas e navegação (Frontend núcleo)
- Status auditoria: PARCIAL | Prioridade: P1 | Esforco: P
- Impacto no negocio: a primeira tela do administrador depois do login é um bloqueio.

## Estado real conferido

PRONTO em main e877d0c58. A home / e o catalogo (Index.tsx) acessivel a todos os papeis, logo nao ha 403 pos-login. /configuracoes e /perfil redirecionam para /admin/usuarios (App.tsx:93-94). Admin tem 18 rotas proprias (admin.ts). Nao ha landing dedicada por papel, mas nao existe o sintoma de acesso negado.

## O que falta (auditoria)

uma rota inicial própria para supervisor/admin (ex.: `/admin/usuarios` ou `/gestor`).

## Camadas afetadas

- Front (router)


## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- App.tsx, Index.tsx, admin.ts


## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- PRONTO em main (sem landing por papel, sintoma de 403 inexistente)
