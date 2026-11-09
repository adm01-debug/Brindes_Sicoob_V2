# ai-context — contexto de código para agentes de IA

**O que faz:** `gerar.mjs` lê o repositório (zero dependências, Node ≥ 18) e escreve JSONs +
`INDEX.md` com rotas, menu, módulos, componentes, hooks, edge functions, banco
(migrations/`types.ts`), testes, CI, scripts, convenções e baseline de git. Genérico:
React/Next/Vue/Svelte/Nuxt/Remix/Astro, Express/Hono/Fastify/Nest, FastAPI/Flask/Django,
Supabase/Prisma/Drizzle/TypeORM/SQL. Saída determinística (só `manifest.json` tem data).

**Como rodar:**

```bash
npm run contexto:ia            # escreve docs/contexto/codigo/
npm run contexto:ia:test       # node --test scripts/ai-context/gerar.unit.mjs
npm run contexto:ia:cenarios   # 217 repositórios sintéticos (~37 s)
node scripts/ai-context/gerar.mjs [--root <dir>] [--out <dir>] [--quiet]
```

**Config** (`ai-context.config.json` na raiz): `out`, `skipDirs`, `srcDirs`, `menuFiles`,
`routeFiles`, `aliases`, `typesFile`, `maxFileMB`, `publicacao` (texto do rodapé do `INDEX.md`;
env `AI_CONTEXT_PUBLICACAO` tem precedência). Neste repo o arquivo aponta `routeFiles` para
`src/routes/config/*.ts` e `menuFiles` para `src/components/layout/SidebarReorganized.tsx` — sem
isso o gerador acha só as ~21 rotas declaradas inline no `App.tsx` em vez das 138.

**Neste repo:** o job `codigo` de `.github/workflows/contexto.yml` roda o gerador a cada push em
`main` e a cada 10 min, e publica em `docs/contexto/codigo/` na branch gerada `contexto` (índice
único em `docs/contexto/00-INDEX.md`).

```bash
git fetch origin contexto && git show origin/contexto:docs/contexto/codigo/INDEX.md
```

**Secrets:** nenhum (lê só arquivos do repo e `git log`).

## Alcance dos alertas

- O schema reconstruído ignora diretórios de SQL histórico (`_foreign/`, `_superseded/` e
  `supabase/migrations_archive/`): são histórico, não migrations vigentes. Os demais SQLs continuam
  sendo considerados.
- Alertas de tabela/RPC/edge inexistente e o mapa de chamadores excluem testes, stories e raízes de
  ferramentas/documentação (`scripts/`, `bin/`, `tools/`, `.github/`, `docs/`, `inventario/`,
  `analise/`, `examples/`). Esses arquivos continuam nos inventários próprios; uma raiz desse tipo
  que contenha aplicação pode ser declarada em `srcDirs`.
- As relações são extraídas estaticamente: referência encontrada não prova execução; ausência de
  chamador não prova que uma edge não tenha consumidor externo. `TODO`/`FIXME` são candidatos a
  revisão, não defeitos confirmados.

Replicado do Zapp Web V2 (`scripts/ai-context/`). Única mudança no gerador: rota declarada como
objeto aceita `component:` embrulhado por um helper (`lazyWithRetry(() => import(...))`), que é o
padrão deste repo.
