# Validação do plano — sessão 2026-09-14

Continuação de [correcoes-validacao-2026-09-13.md](./correcoes-validacao-2026-09-13.md).
Mesmo princípio: cada etapa foi verificada contra o código real antes de ser
marcada como feita ou descartada.

## Achados que corrigem o plano original

| Etapa | Alegação original | Realidade verificada | Ação |
|---|---|---|---|
| 08 (lockfiles) | "bun é carga viva em 2 workflows" | `ci.yml` já tinha migrado pra `npm` (mudança veio no PR #6, depois do meu primeiro levantamento). Só `security-compliance.yml` ainda usava bun — e esse workflow **nunca rodou com sucesso** mesmo antes disso: faltava um passo de instalar dependências (nem `npm ci` nem `bun install`), e `test-audit-scripts.mjs` chamava `bun` internamente via `execFileSync`, hardcoded. | Convertido `security-compliance.yml` inteiro pra npm, adicionado `npm ci`, corrigido o `execFileSync('bun', ...)` interno pra `process.execPath`. `bun.lock` removido — nada mais referencia. Testado localmente sob node (falha graciosamente por falta de credenciais reais, como esperado — sem mais erro de binário ausente). |
| 16 (ratchet por arquivo) | "hoje o gate só compara o total, um arquivo pode piorar se outro melhorar" | **Já é por arquivo.** `check-typecheck-baseline.mjs` falha se `n > allowed` pra qualquer arquivo individual, ou se um arquivo novo introduz erro — exatamente o design que eu ia propor. | Nenhuma ação de infraestrutura — só usei o mecanismo (`--update`) depois de zerar `QuoteService.ts`. |
| 18 (baseline ESLint desatualizado) | "regenerar é urgente, baseline de maio desatualizado" | `ci.yml`/`security.yml`/`sicoob-ci.yml` rodam com `fetch-depth: 0` — o gate real (`lint:baseline`) sempre compara contra `origin/main` via diff de git, nunca cai no fallback do snapshot `.eslint-baseline.json`. O snapshot é só informativo hoje, não é o que bloqueia PR. | Prioridade rebaixada de P1 pra P3 — regenerar ainda vale pra relatório/dashboard (etapa 50), mas não é um gate quebrado como eu descrevi. |
| 20 (console.* vaza pra produção) | "306 console.* sem tratamento, precisa esbuild.drop" | `vite.config.ts` já usa `esbuild.pure: ['console.log','console.debug','console.info']` em produção (mantém `warn`/`error` de propósito, decisão correta) — dead-code-elimination remove a maioria. Resíduo real checado no `dist/`: 2 arquivos ainda têm `console.log`, mas ambos vêm de código de biblioteca vendorizada (`xlsx`, provável `recharts` no chunk da página de BI), não do código próprio. | Nenhuma ação — mecanismo já correto. Migração completa pra logger estruturado (306 ocorrências) continua válida como melhoria de observabilidade, não de vazamento de dado — rebaixada de segurança pra qualidade. |
| tscheck-files.mjs | (não fazia parte do plano original) | **Achado novo**: o script chamava `npx tsgo`, um pacote que não existe no registro do npm (404). Sempre reportava "0 erro(s)" pra qualquer arquivo, sempre — ferramenta de typecheck rápido usada por devs estava completamente muda, dando falsa confiança. | Corrigido pra `npx tsc` (o compilador real). Confirmado: agora reporta os mesmos 15 erros que o baseline já registrava pra `QuoteService.ts`. |

## Trabalho de etapa 17 (zerar arquivos com mais erros)

**`src/services/QuoteService.ts`: 15 → 0 erros**, verificado com `tscheck-files.mjs`
corrigido e com o typecheck completo do projeto (1189 → 1174, sem regressão em
nenhum outro arquivo). Nada de `as any` novo — pelo contrário, removido um
`as any` pré-existente em `consolidate()` que se mostrou desnecessário assim que
testado sem ele. Correções, todas por coerção explícita `null → undefined` nos
pontos onde uma linha do banco (nullable) vira `QuoteItem`/`Partial<Quote>`
(que não aceitam `null`, só `undefined`) — não por relaxar os tipos de domínio
compartilhados, pra não alterar contrato de outros consumidores desses tipos:

- `list()`: parâmetro `scope: string` → `scope: SalesScope` (tipo já existia,
  só não estava sendo usado aqui).
- `getById()`: 8 campos de `quote_items` (`product_id`, `notes`, `sort_order`,
  `color_hex`, `color_name`, `product_image_url`, `product_sku`, `subtotal`,
  `unit_cost`) são `T | null` no banco mas `QuoteItem` só aceita `T | undefined`
  pra eles — coercão `?? undefined`/`?? ""` em cada um.
- `reorder()`: removida a desestruturação de `converted_at` — campo que nunca
  existiu na tabela `quotes` nem no tipo `Quote` (dead code).
- `reorderFromOrder()`: mesmo padrão de coerção pros campos de `orders` e
  `order_items`.
- `insertItemsWithPersonalizations()`: guarda `item &&` antes de acessar
  `item.personalizations` (`noUncheckedIndexedAccess` corretamente sinalizava
  que `items[i]` pode ser `undefined`).
- `logHistory()`: `clientMetadata` ganhou anotação de tipo explícita
  (`Record<string, unknown>`) — sem ela, o spread de `params.metadata` depois
  dos campos nomeados confundia a inferência do TS pros campos `ip`/`user_agent`
  (chegava a inferir `{}` pra eles). Cast final pra `Json` no insert.

Nenhum teste unitário dedicado a `QuoteService.ts` foi encontrado no repo — gap
separado, fora do escopo desta correção pontual.

**`src/components/quotes/CompanyContactSelector.tsx`: 14 → 0 erros.** Dois
padrões: `noUncheckedIndexedAccess` em array já checado por `.length` (TS não
propaga a narrativa — trocado por desestruturação `const [c] = data; if (!c)
return null;`), e um mismatch arquitetural real entre `SelectedContactInfo`
(campos via `undefined`, pensado pro callback público) e `ContactOption` (campos
via `null`, o que os subcomponentes `ContactDropdown`/`SingleContactDisplay`
sempre esperaram — eles mesmos já convertem `null→undefined` só no boundary do
callback). A query usava o tipo errado; corrigido pra `ContactOption[]`. Uma
non-null assertion justificada e comentada (`contacts[0]!`) onde o ramo do
ternário já garante o comprimento.

**`src/lib/supabase-untyped.ts` (`untypedFrom<T>`): constraint genérica
corrigida — achado de alto impacto.** `T extends Record<string, unknown>`
exigia index signature implícito, que uma interface comum nunca satisfaz
estruturalmente — rejeitava o próprio caso de uso documentado no cabeçalho do
arquivo. Usado por 13 arquivos. Corrigido pra `T extends object`. Resolveu de
graça os 13 erros de `useGroupPersonalization.ts` (zerado) sem editar esse
arquivo — puro efeito colateral de consertar a raiz compartilhada. Mudança
é só em nível de tipo, zero impacto em runtime.

**`src/lib/external-db/products-detail.ts`: 16 → 0 erros.** Mesma causa raiz
espalhada pelo arquivo inteiro: `InvokeResult<T>.records` é `T[] | undefined`
por contrato (`invoke.ts`), mas ~10 pontos tratavam como sempre presente
(`result.records[0]`, `.then(r => r.records)`, `result.records.forEach(...)`,
etc.) — inclusive nos 4 fetches paralelos (`imagesPromise`, `variantsPromise`,
`videosPromise`, `kitPromise`) cujo `.catch` já tinha fallback `[]`; só o
caminho de sucesso (`.then`) não coeria. Corrigido com `?? []` em cada ponto
de consumo (mesmo padrão já usado no `.catch` de cada promise e no
`return data ?? [];` de `useGroupPersonalization.ts`) e `?.[0]` nos dois
lookups de registro único (`fetchPromobrindProductById`,
`fetchPromobrindProductBySku`). Zero mudança de comportamento: todo `?? []`
substitui um `undefined` que já seria tratado como lista vazia downstream
(`.length`, `.forEach`, `.map`). Nenhum teste unitário dedicado a este
arquivo no repo — os 4 consumidores diretos (`useProducts.ts`,
`useCategories.ts`, `ProductPersonalizationRules.tsx`,
`AdminProductFormPage.tsx`) mockam a função inteira em seus próprios testes,
sem exercitar esta lógica interna — mesmo gap já registrado para
`QuoteService.ts`. Baseline total: 1145 → 1129.

## Achado fora da etapa 17: busca usando dado de negócio hardcoded (não mock de teste)

Verificando a etapa 42 (mockData não deve ir pro bundle de produção), achei algo
mais sério do que "bundle grande": `src/hooks/useSearch.ts` — a busca central do
app, usada por 4 componentes/hooks — importava `CATEGORIES`/`SUPPLIERS` de
`@/data/mockData` com **nomes reais de negócio congelados no código-fonte**
("BRINDES SICOOB", "XBZ Brindes", "Stricker Brasil", "Asia Import"). Não é dado
fictício de teste — é dado de referência real, desatualizado desde que foi
escrito, sem nenhum jeito de refletir uma categoria ou fornecedor novo/removido
no catálogo real.

`useSuppliers()` já existe especificamente pra isso (o próprio comentário do
hook diz *"Substitui o uso de SUPPLIERS do mockData"*) e outros 3 arquivos já o
usam — só `useSearch.ts` ficou pra trás numa migração incompleta. Corrigido pra
usar `useSuppliers()` + `useExternalCategoriesQuery()` (mesmos hooks React
Query já usados em outros lugares do catálogo). Adicionados 2 testes que provam
a correção diretamente (nome do catálogo mockado aparece, nome antigo
hardcoded não aparece mais). Ver commit `3708ad53a`.

Investigado também `PUBLICO_ALVO`/`DATAS_COMEMORATIVAS`/`ENDOMARKETING`/
`NICHOS`/`FAIXAS_PRECO` (mesmo arquivo, `ProductMarketingSection.tsx` consome o
primeiro trio): são taxonomias fixas de classificação/marketing, não ligadas ao
catálogo vivo (fornecedor/categoria mudam conforme o negócio cresce; "Dia dos
Pais" ou "Dia do Advogado" não mudam). Hardcode aqui é uma escolha legítima, não
o mesmo bug de `CATEGORIES`/`SUPPLIERS` — só está mal nomeado (misturado num
arquivo chamado "mockData.ts" junto com `PRODUCTS`/clientes genuinamente
fictícios). Sem ação necessária; renomear/separar o arquivo é cosmético, não
prioritário.

## Etapa 38 (desacoplar build de npm audit)

Confirmado o mesmo problema do plano original: `"build": "npm run
generate:audit && npm run check:npm-audit && vite build"` fazia o build de
produção depender de uma chamada de rede ao registro do npm. `ci.yml` já roda
`check:npm-audit` num passo próprio e independente (não precisa do embutido em
`build`); `lighthouse.yml`/`bundle-check.yml` chamam `npm run build` sem passo
de audit próprio — perdem a cobertura incidental que ganhavam de graça, mas
essa não é a função deles (bundle size / lighthouse, não segurança). Corrigido:
`build` agora é só `vite build`; `generate:audit` (echo no-op) removido;
`build:dev` manteve `typecheck:baseline` (não depende de rede, sem motivo pra
tirar). Testado: `npm run build` roda limpo, mesma composição de chunks.
