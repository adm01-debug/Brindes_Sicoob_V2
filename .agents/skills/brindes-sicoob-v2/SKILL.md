---
name: brindes-sicoob-v2
description: Convenções de código e commit do Brindes Sicoob V2 (TypeScript, Conventional Commits). Use ao alterar código, criar testes ou escrever mensagem de commit neste repositório; as regras operacionais ficam em AGENTS.md.
---

# Brindes Sicoob V2 — convenções

As regras de trabalho (banco, fluxo Git, PR, comunicação) estão em `AGENTS.md` na raiz — este skill só
resume convenções de código e commit.

## Commits

Padrão Conventional Commits (`CONTRIBUTING.md` > "Commits"): `<tipo>(<escopo opcional>): descrição curta`,
em PT-BR, imperativo, primeira linha curta e sem ponto final. Tipos que aparecem de fato na `main`
(`git log --format=%s`): `fix docs chore infra feat ci` — `refactor` e `hotfix` existem só como prefixo
de branch em `CONTRIBUTING.md`.

Não há hook `commit-msg` neste repo (só `.husky/pre-commit` e `.husky/pre-push`) — o padrão não é
cobrado por máquina; siga mesmo assim, inclusive via MCP.

Exemplo: `fix(db): corrige roles e tabelas na função sicoob-seed`

Branch: `claude/<fix|feat|chore|docs|refactor|infra>-<slug>-<AAMMDD-HHMM>` (ver `AGENTS.md`). Os prefixos
`feat/ fix/ chore/ docs/ refactor/ hotfix/` de `CONTRIBUTING.md` continuam válidos para humanos.

## Código

- Linguagem: TypeScript (front Vite + React em `src/`, edge functions Deno em `supabase/functions/`).
- Funções `camelCase`, componentes/classes `PascalCase`, constantes `SCREAMING_SNAKE_CASE`.
- Exports nomeados; siga o padrão de import do arquivo vizinho (alias `@/` para `src/`).
- Testes unitários em `tests/` espelhando `src/` (Vitest); E2E em `e2e/` (Playwright). Rode só o que tocou:
  `npx vitest run <caminho>`.
- Chamada a serviço externo passa pelo `CircuitBreaker` (`src/lib/security/circuit-breaker.ts`);
  grade de produto usa `role="grid"/"row"/"gridcell"`; imagem de produto usa `loading="lazy"`
  (`CONTRIBUTING.md` > "Padrões de Excelência").
- Siga os padrões já existentes no módulo; não desvie sem motivo registrado na PR.
