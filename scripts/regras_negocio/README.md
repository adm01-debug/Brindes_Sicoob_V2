# regras_negocio — regras de negócio para agentes de IA

Produtor da fonte **regras de negócio** do contexto para agentes. Lê código, migrations/`types.ts` e
`docs/contexto/regras/manual/` (texto humano) e publica, na branch gerada `contexto`:

| Arquivo | Conteúdo |
|---|---|
| `docs/contexto/regras/07-REGRAS-DE-NEGOCIO.md` | regras manuais · RLS por operação · constraints/CHECK/FK/colunas calculadas · triggers + `RAISE EXCEPTION` · máquinas de estado (colunas de status, mapas de transição, valores usados no código) · validações (Zod + refine, react-hook-form, inputs) · fórmulas · parâmetros e prazos · mensagens de erro · testes como especificação · eventos de webhook · efeitos colaterais |
| `docs/contexto/regras/10-ACESSO-E-SEGURANCA.md` | perfis, matriz tabela × operação → quem pode, onde o RLS é ignorado (service_role, SECURITY DEFINER), edge functions públicas, rotas protegidas, multi-tenancy, soft delete, PII, colunas de dinheiro |
| `docs/contexto/regras/11-GLOSSARIO-E-LACUNAS.md` | glossário, seed, inconsistências código × schema (NÃO VERIFICADO) e lacunas que só o dono do negócio responde |
| `docs/contexto/regras/manifest.json` | `gerado_em`, `commit`, `entrada`, `arquivos` — lido pelo `indice.py` |
| `docs/contexto/00-INDEX.md` | índice único das três fontes (banco real, código, regras), gerado por `indice.py` |

O que **não** é daqui (cada fato tem um dono): schema real → snapshot do banco
(`docs/contexto/supabase/`, `scripts/supabase_snapshot/`); rotas/módulos/hooks/edges/grafo →
`docs/contexto/codigo/` (`scripts/ai-context/gerar.mjs`); estado medido do banco e das rotas →
`inventario/estado/` (`scripts/inventario/`).

## Arquivos

- `generate.py` — gerador (stdlib, poucos segundos). `--profile regras` escreve só 07/10/11;
  `--schema-snapshot` faz o capítulo de schema apontar para o snapshot em vez de reconstruir.
- `indice.py` — monta `00-INDEX.md` lendo o `manifest.json` de cada fonte
  (`--fonte "NOME=CAMINHO[@BRANCH]"`); fonte em outra branch entra como "como ler" (git show / raw),
  sem inventar conteúdo.
- `publish.sh` — publicação genérica (push / PR / branch derivada) para uso avulso; **neste repo
  não é usado**: o job `publicar` do `contexto.yml` monta a branch `contexto` e o índice.
- Workflow: job `regras` (+ `publicar`) em `.github/workflows/contexto.yml`.

O índice distingue `ok`, `parcial` (falha de coleta ou reaproveitamento), `não verificável`
(manifest ilegível), `desatualizado` e fonte ausente. Código/regras com commit igual ao HEAD
continuam atuais apesar da idade da coleta; banco real segue o limite de idade configurado.

## Fontes SQL

SQL em diretórios de histórico (`_foreign`, `_superseded` e `supabase/migrations_archive/`)
continua no inventário de arquivos, mas **não** entra na reconstrução do schema nem na extração de
regras. A reconstrução é estática: só o snapshot descreve o banco em produção.

## Regras humanas

`docs/contexto/regras/manual/*.md` (exceto README e TEMPLATE) entram na seção A do 07 com
prioridade máxima e nunca são sobrescritos. Comece copiando o
`TEMPLATE-regras-de-negocio.md` (criado na 1ª execução) para `regras.md`. Editar `manual/` na main
dispara o workflow.

## Rodar local

```bash
npm run contexto:regras
python3 scripts/regras_negocio/indice.py --repo . --out docs/contexto/00-INDEX.md \
  --fonte "banco real=docs/contexto/supabase" --fonte "codigo=docs/contexto/codigo" \
  --fonte "regras de negocio=docs/contexto/regras"
```

Ler o resultado: `git fetch origin contexto && git show origin/contexto:docs/contexto/00-INDEX.md`.

## Testes

```bash
npm run contexto:regras:test   # python3 scripts/regras_negocio/test_generate.py
```

A suíte usa fixtures locais e cobre SQL ativo versus histórico, objetos do schema, fontes
Prisma/tipos e a saída do perfil `regras`. Nenhum teste acessa banco ou API de LLM.

Replicado do Zapp Web V2 (`scripts/regras_negocio/`); o gerador é genérico e veio sem alteração,
fora o nome do diretório de SQL histórico deste repo.
