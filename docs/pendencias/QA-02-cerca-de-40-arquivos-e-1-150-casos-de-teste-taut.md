# QA-02 — Cerca de 40 arquivos e 1.150 casos de teste tautológicos (lógica copiada para dentro do teste)

- Origem: A. Testes unitários (Vitest / Deno) (Testes, CI e infraestrutura)
- Status auditoria: STUB/MOCK | Prioridade: P1 | Esforco: G
- Impacto no negocio: a contagem de testes passa uma falsa sensação de segurança, porque o código de produção pode quebrar com todos esses testes verdes.

## Estado real conferido

NAO IMPLEMENTADO

## O que falta (auditoria)

substituir as cópias pelo import real (Deno compartilhado via módulos puros, hooks via `renderHook`) ou excluir os arquivos. Renomear `tests/e2e/` e corrigir `docs/TESTING.md`.

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
