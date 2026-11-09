# Contexto gerado para agentes de IA

Quatro automações mantêm o repositório descrevendo o **estado real** do projeto, para um agente não
gastar sessão (nem token) redescobrindo o que já está medido. Nada aqui é escrito à mão: tudo sai de
script, e script que divergiu da realidade é corrigido no mesmo PR do fix.

## Onde está cada fato (cada um tem um dono)

| Pergunta | Fonte | Onde fica |
|---|---|---|
| Como é o banco de verdade (tabelas, RLS, funções, triggers, cron, lints) | `scripts/supabase_snapshot/snapshot.py` | branch `contexto`: `docs/contexto/supabase/` |
| Onde fica o código (rotas, módulos, hooks, componentes, edges, testes, CI, convenções) | `scripts/ai-context/gerar.mjs` | branch `contexto`: `docs/contexto/codigo/` |
| O que pode e o que não pode (regras de negócio, RLS por operação, estados, validações, fórmulas, lacunas) | `scripts/regras_negocio/generate.py` | branch `contexto`: `docs/contexto/regras/` |
| Estado medido: tabela órfã, alerta de cron, fila travada, rota sem menu, edge sem chamador | `scripts/inventario/*` | **main**: `inventario/estado/*.json` |

Índice único das três primeiras: `docs/contexto/00-INDEX.md` (gerado por
`scripts/regras_negocio/indice.py`), que também marca cada fonte como `ok`, `parcial`,
`desatualizado` ou ausente — não confie numa fonte sem olhar o índice.

## Como ler sem trocar de branch

```sh
git fetch origin contexto
git show origin/contexto:docs/contexto/00-INDEX.md
git show origin/contexto:docs/contexto/codigo/INDEX.md
git show origin/contexto:docs/contexto/supabase/README.md
git show origin/contexto:docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md
cat inventario/estado/README.md          # este está na main
```

Por URL (sem clone):
`https://raw.githubusercontent.com/adm01-debug/Brindes_Sicoob_V2/contexto/docs/contexto/00-INDEX.md`.

## Quem roda, quando

| Workflow | Quando | O que faz | Secret |
|---|---|---|---|
| `.github/workflows/contexto.yml` | push em `main` que toque código/banco/scripts das automações + a cada 10 min (minuto 7) + dispatch | 3 jobs independentes (um por fonte) + `publicar`, que monta o índice e faz **push na branch `contexto`** (nunca na main; `[skip ci]`, `vercel.json` com `ignoreCommand` para não gerar preview) | `SUPABASE_DB_URL` (opcional) |
| `.github/workflows/inventario-estado-semanal.yml` | segunda, 10:41 UTC + dispatch | refaz `inventario/estado/` e **abre PR** (`automation/inventario-estado`, auto-merge) só se o conteúdo mudou | `SUPABASE_ACCESS_TOKEN` (environment `construction`) |

A branch `contexto` é **gerada**: não edite, não abra PR dela, não a use como base. Push com
`GITHUB_TOKEN` não dispara outros workflows, então não há laço de CI.

## Pendências deste doc

1. **`SUPABASE_DB_URL` ainda não existe** neste repositório. Sem ele o job `banco` sai verde com
   aviso e `docs/contexto/supabase/` fica vazia — `codigo/` e `regras/` funcionam normalmente. Como
   cadastrar (session pooler, usuário `postgres`, o porquê): `scripts/supabase_snapshot/README.md`.
2. `inventario/estado/banco.json` só nasce no primeiro run do workflow semanal (ou numa execução
   manual com `SUPABASE_ACCESS_TOKEN`): o inventário do banco não pode ser gerado sem credencial, e
   o repositório não traz dado de banco inventado. `rotas.json` e `edges.json` já estão commitados.
3. `docs/contexto/regras/manual/` está só com README + TEMPLATE. O que **só o dono sabe** (regras
   comerciais, prazos, exceções, o que não mudar e por quê) precisa ser escrito ali: entra na seção
   A do `07-REGRAS-DE-NEGOCIO.md` com prioridade sobre tudo que foi extraído do código.

Replicado do Zapp Web V2, onde as mesmas automações rodam (`contexto.yml`,
`inventario-estado-semanal.yml`). Detalhe de cada script no README da sua pasta:
`scripts/ai-context/`, `scripts/regras_negocio/`, `scripts/supabase_snapshot/`,
`scripts/inventario/`.
