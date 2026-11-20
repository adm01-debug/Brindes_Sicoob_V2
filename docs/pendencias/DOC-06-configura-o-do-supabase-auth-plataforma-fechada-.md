# DOC-06 — Configuração do Supabase Auth (plataforma fechada, HIBP no servidor, verificação de e-mail) sem prova

- Origem: Tema A — README.md (raiz) e visão geral (Documentação funcional)
- Status auditoria: BLOQUEADA_EXTERNA | Prioridade: P1 | Esforco: P
- Impacto no negocio: se o cadastro público estiver ligado no servidor, qualquer pessoa cria conta e entra numa plataforma que deveria ser só por convite.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

versionar `[auth]` no `config.toml` (ou um teste remoto que prove `disable_signup`, HIBP e e-mail confirmado) e remover `signUp` do contexto.

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
