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

**`src/pages/QuoteBuilderPage.tsx` + `src/hooks/useQuoteBuilderState.ts`: 12 → 0
erros.** Ao contrário dos arquivos anteriores, aqui a maioria dos 12 erros não
era coerção de tipo — era o hook `useQuoteBuilderState` simplesmente não
expor (ou expor errado) propriedades que a página já consumia. Achados reais:

- `s.handleProductClick` apontava pra `search.setProductSearchOpen`
  (`Dispatch<SetStateAction<boolean>>`) mas era usado como
  `onProductClick: (p: Product) => void` em `QuoteProductSelector` — clicar
  num produto na busca chamaria `setProductSearchOpen(product)`, passando um
  objeto onde se esperava `boolean`. Corrigido pra apontar pra
  `setSelectedProductForColor` (que já existia no hook e é exatamente o setter
  que abre o seletor de cor/variante do produto clicado).
- `SaveAsTemplateButton` recebia `payment_terms: s.payment_terms` e
  `delivery_time: s.delivery_time` — essas chaves não existem no hook, que
  expõe `paymentTerms`/`deliveryTime` (camelCase). Corrigido pra usar os nomes
  certos; antes disso, "Salvar como template" sempre gravava `undefined`
  nesses dois campos.
- `s.defaultTemplate` não existia — só `s.templates` (array). Adicionado
  `defaultTemplate = templates.find(t => t.is_default)` no hook.
- Acesso a `s.items[s.activeItemIndex]` dentro de uma IIFE reindexava o array
  sem guarda (`noUncheckedIndexedAccess`), apesar do ternário externo já ter
  checado a existência — a checagem não atravessa o limite da função. Corrigido
  com guarda local (`if (idx === null || !item) return null;`) antes de usar
  `item`.
- `s.confirmAllStalePrices` e `s.hasUnsavedData` não existiam no hook, embora
  a página e `useUnsavedChangesGuard`/`QuoteBuilderSummaryColumn` já
  estivessem com toda a UI construída à espera deles — funcionalidades reais,
  nunca ligadas, não dívida de tipo:
  - `confirmAllStalePrices`: existe um teste já escrito
    (`tests/components/QuoteBuilderSummaryColumn.confirmAll.test.tsx`) cujo
    comentário diz explicitamente "espelha a lógica real do hook" e usa o
    critério "aging OU stale" (`days >= threshold * 0.5`). Implementado usando
    `getPriceFreshness(...).shouldWarn` (campo que já existe em
    `price-freshness.ts` com exatamente essa semântica) em vez de `.isStale`
    (que só cobre o caso mais severo) — sem essa correção o botão "Confirmar
    todos" já teria a assinatura de tipo certa mas o comportamento errado.
  - `hasUnsavedData`: o guard de "sair sem salvar" (`useUnsavedChangesGuard` +
    `UnsavedChangesDialog`) estava todo importado e renderizado na página, mas
    recebia `undefined` (`hasUnsavedChanges` nunca dispararia) — o aviso de
    perda de dados nunca funcionou. Implementado via snapshot: captura o
    estado do formulário só depois que `loadingQuote` vira `false` (pra não
    contar os dados recém-carregados de um orçamento existente como "não
    salvos") e compara contra o estado atual a cada render.

Sem teste dedicado a `useQuoteBuilderState.ts` (hook grande, muitas
dependências externas — auth, RBAC, Supabase, router — e único consumidor é a
própria página); os testes de `QuoteBuilderSummaryColumn` (15 testes, já
existentes) foram usados como validação do contrato de `confirmAllStalePrices`
e passaram sem alteração. `useQuoteBuilderState.ts` já tinha 6 erros
pré-existentes (não relacionados, em `applyTemplate`/`getTemplateItems` vs.
`QuoteTemplateItem`) — confirmados inalterados antes/depois desta correção,
fora do escopo desta etapa. Baseline total: 1129 → 1117.

**`src/utils/kitPdfGenerator.ts`: 10 → 0 erros.** Três causas distintas, todas
puramente de tipo (mudança de comportamento zero, confirmado abaixo):

- `hexToRgb`: `m[1]` (grupo de captura do regex) é `string | undefined` sob
  `noUncheckedIndexedAccess`, mas o regex `^([0-9a-f]{6})$` garante que, se
  `m` deu match, o grupo 1 sempre existe — o `undefined` nunca acontece na
  prática. Corrigido com uma guarda local (`const captured = m?.[1]; if
  (!captured) return null;`) que só formaliza uma garantia que já era
  verdadeira, sem mudar o caminho de execução.
- 9 ocorrências de `fillColor`/`textColor: PRIMARY as unknown as number[]`
  (e variantes com `GRAY_800`/`WHITE`/literal inline) — cast pro tipo ERRADO.
  O tipo real esperado por `jspdf-autotable` é `Color = [number, number,
  number] | number | string | false` (uma tupla de 3, não um array de
  tamanho livre); `PRIMARY` etc. são `readonly [n,n,n]` (`as const`), que não
  satisfazem a tupla mutável diretamente — daí o cast, só que pro tipo
  errado. Corrigido pra `[...PRIMARY]` (spread cria uma tupla mutável nova,
  mesmos 3 números, sem cast nenhum) — o mesmo padrão que já funcionava sem
  erro 2 linhas abaixo (`alternateRowStyles: { fillColor: [248, 250, 252] }`,
  array literal direto, nunca precisou de cast).
- 3 ocorrências de `doc.lastAutoTable` (`Property 'lastAutoTable' does not
  exist on type 'jsPDF'`) — **falso-positivo do `tscheck-files.mjs`, não erro
  real**: o projeto já tem `src/types/jspdf-autotable.d.ts` fazendo a
  augmentation certa (`declare module "jspdf" { interface jsPDF {
  lastAutoTable: {...} } }`), e o baseline do projeto inteiro (fonte da
  verdade) já contava só 10 erros pra este arquivo, não 13 — confirmando que
  esses 3 nunca existiram no build real. Causa raiz: `tscheck-files.mjs`
  monta um tsconfig temporário com `include: files` (só os arquivos pedidos),
  o que **descarta os `.d.ts` ambientes de `src/types/`** do programa
  (eles não são importados por ninguém, só pegos pelo glob `include`
  original). Reproduzido também em `src/lib/bi/dossierPdfGenerator.ts` e
  `src/utils/productPdfExport.ts` (baseline: 0 erros reais pra
  `lastAutoTable`, mas o `tscheck-files.mjs` isolado acusava erro nos três).
  **Corrigido na ferramenta** (`scripts/tscheck-files.mjs`): o tsconfig
  temporário agora sempre inclui `src/**/*.d.ts` junto dos arquivos pedidos.
  Verificado: os três arquivos voltam a reportar corretamente (0, 0 e 0 dos
  erros de `lastAutoTable` respectivamente). Troquei também o import de
  `jsPDF` neste arquivo de `import jsPDF from 'jspdf'` (default) pra `import
  { jsPDF } from 'jspdf'` (nomeado, mesmo estilo dos dois arquivos que já
  funcionavam) — não era estritamente necessário (a augmentation vale pra
  qualquer estilo de import, já que os dois se referem à mesma classe), mas
  deixa o arquivo consistente com o padrão que comprovadamente funciona.

Sem teste dedicado a `kitPdfGenerator.ts` (único consumidor:
`KitBuilderPage.tsx`, sem teste próprio também) — mesmo gap já registrado
para outros arquivos desta etapa. Baseline total: 1117 → 1107.

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

## `SupabaseConnectionsTab.tsx` + `connectionStatus.ts` (etapa 17, 8 → 0 erros)

Três causas reais, nenhuma delas cosmética:

- **`ENVS` como union heterogênea**: o array `as const` tem 3 objetos; só o
  primeiro (`local`) declara `readOnly: true`. Os outros dois (`promobrind`,
  `crm`) não declaram a chave `readOnly` nenhuma — não é `readOnly: false`,
  é a propriedade **ausente**. TypeScript infere uma union de 3 shapes
  distintos, e `env.readOnly` só existe no primeiro membro — todo acesso a
  `env.readOnly` no `.map()` (6 ocorrências) dava TS2339. Corrigido
  adicionando `readOnly: false` explícito nos outros dois objetos, alinhando
  o shape dos 3 membros da union.
- **`ResolveStatusInput.last` mais estrito que o dado real**:
  `connectionStatus.ts` declarava `last?: { ok: boolean } | null`, mas o tipo
  real passado (`LastTestInfo`, de `LastTestLine.tsx`) tem `ok: boolean |
  null` (fica `null` antes do primeiro teste rodar). Corrigido widening o
  tipo do parâmetro pra `{ ok: boolean | null } | null` — sem mudança de
  comportamento, porque a única leitura do campo é `last?.ok === false`, e
  `null === false` já era `false` antes e continua sendo.
- **`onRefreshed={list}` incompatível por causa da assinatura de retorno**:
  `RefreshFromDbButton.onRefreshed` é `() => void | Promise<void>`; `list`
  (de `useSecretsManager`) é `(names?: string[]) => Promise<SecretStatus[]>`.
  A regra especial do TypeScript que permite qualquer retorno quando o alvo é
  `void` puro não se aplica a uniões como `void | Promise<void>` — por isso
  `onSaved={list}` (que tem alvo `() => void` puro, em `SecretField.tsx`)
  compila e este não. Corrigido envolvendo a chamada: `onRefreshed={() => {
  void list(); }}` (mesmo padrão fire-and-forget já usado no
  `useEffect(() => { list(); }, [list])` da linha 60 do próprio arquivo).

Verificado: `tests/components/admin/connections/connectionStatus.test.ts`
(8 testes, cobre `resolveSupabaseConnectionStatus` diretamente) passa sem
alteração — o widening de tipo não muda nenhum caso testado. Sem teste
dedicado pro componente `SupabaseConnectionsTab.tsx` em si (mesmo gap já
registrado para outros arquivos desta etapa). Baseline total: 1107 → 1099.

## `ProductVariationAxesConfig.tsx` (etapa 17, 8 → 0 erros)

Causa única, repetida em 8 pontos do mesmo bloco JSX: `axisState` é montado por
um `useMemo` que itera `VARIANT_AXES` (array fixo de 3 eixos: cor, tamanho,
capacidade) construindo `Record<string, { active: boolean; values: string[] }>`
— uma chave por eixo. Mais abaixo, dentro do JSX, um `.map()` separado sobre
esse mesmo `VARIANT_AXES` reindexa `axisState[axis.key]` pra renderizar cada
card de eixo. Como são dois loops distintos sobre o mesmo array, o TypeScript
não consegue provar que as chaves usadas pra indexar são exatamente as mesmas
que foram usadas pra popular — mesmo sendo garantido em runtime (mesmo array,
mesma ordem, mesma função de chave) — e sob `noUncheckedIndexedAccess` o
resultado do índice é `{ active: boolean; values: string[] } | undefined`.
Todo uso de `state.active`/`state.values` no restante do bloco (6 acessos, até
a linha 273) herdava o `TS18048 'state' is possibly 'undefined'`.

Corrigido com uma guarda local logo após a indexação, mesmo padrão já usado em
`QuoteBuilderPage.tsx` nesta mesma etapa:

```tsx
const state = axisState[axis.key];
if (!state) return null;
```

Formaliza uma garantia que já era verdadeira (nunca dispara em runtime, já que
as chaves vêm do mesmo `VARIANT_AXES`) sem alterar nenhum caminho de execução.

Sem teste dedicado a `ProductVariationAxesConfig.tsx` no repo — mesmo gap já
registrado para outros arquivos desta etapa. Baseline total: 1099 → 1091.

## `ConfigurationPanelV6.tsx` (etapa 17, 8 → 0 erros)

Diferente dos arquivos anteriores desta etapa, aqui os `T | undefined` do
`noUncheckedIndexedAccess` refletem um risco real, não uma garantia perdida
por limite de escopo. `CustomizationPriceResponseV6` (tipo do retorno de
`fn_get_customization_price`) declara `faixa`, `num_cores`, `preco_unitario`,
`valor_gravacao`, `setup_total` e `total_cobrado` como opcionais de propósito
— são campos `requiredFields` no `PRICE_CONTRACT` (`rpc-contracts.ts`), mas
`validateRpcPayload` (`rpc-validator.ts`) só **loga** um aviso em dev quando
o payload real vem incompleto (visto nos próprios logs de teste desta sessão:
"Payload de fn_get_customization_price faltando campos: ..."), nunca bloqueia
`setPrice(result)` em `useCustomizationPrice.ts`. Ou seja: um payload
incompleto do backend chega inteiro ao componente, e o componente chamava
`.toFixed()` direto nesses campos — um `TypeError: Cannot read properties of
undefined` real em produção se o RPC alguma vez omitir um desses campos, não
hipotético.

Corrigido com fallback defensivo, não supressão de tipo:

- `price.faixa`: bloco inteiro (`Faixa: X a Y peças`) agora só renderiza
  `{price.faixa && (...)}` — sem faixa, sem essa linha, em vez de "Faixa:
  undefined a undefined".
- `num_cores`, `preco_unitario`, `valor_gravacao`, `setup_total`,
  `total_cobrado`: derivados uma vez em consts locais (`price?.campo ?? 0`)
  logo após o hook, reusadas em todos os pontos de leitura — campo ausente
  vira `R$ 0,00` em vez de crashar a tela inteira de configuração.

Sem teste dedicado a `ConfigurationPanelV6.tsx` no repo — mesmo gap já
registrado para outros arquivos desta etapa; `tests/hooks/useGravacaoPriceV2.test.ts`
(8 testes, cobre o adapter que alimenta este fluxo) passa sem alteração.
Baseline total: 1091 → 1083.

## `VirtualizedReplenishmentList.tsx` (etapa 17, 8 → 0 erros)

Mesmo padrão de `noUncheckedIndexedAccess` já visto em outros arquivos desta
etapa: `products[virtualRow.index]` indexa um array (`products: Replenishment
WithDetails[]`) com um índice vindo de `virtualizer.getVirtualItems()`. Como
o virtualizer é configurado com `count: products.length`, o índice nunca
excede os limites do array em runtime — mas o TypeScript não consegue provar
essa relação entre a config do `useVirtualizer` e o array original, então
todo uso de `item.product_id`/`item.product_name` no restante do `.map()`
(8 acessos) herdava `TS18048 'item' is possibly 'undefined'`.

Corrigido com uma guarda local logo após a indexação:

```tsx
const item = products[virtualRow.index];
if (!item) return null;
```

Sem teste dedicado no repo; componente é referenciado apenas por
`ReplenishmentProductGrid.tsx`.

## `VoiceTranscriptPanel.tsx` (etapa 17, 8 → 0 erros)

Causa distinta dos demais arquivos desta etapa: `ACTION_META` era tipado como
`Record<string, {...}>` — um índice genérico de string, não as 6 chaves reais
usadas (`search`, `filter`, `navigate`, `sort`, `clear`, `answer`). Sob
`noUncheckedIndexedAccess`, isso torna **todo** acesso a `ACTION_META`,
inclusive por notação de ponto nas próprias chaves que o objeto acabou de
declarar (linhas 20-25, atribuindo os ícones reais do lucide-react por cima
dos placeholders `() => null`), tipado como `T | undefined`.

Investigação: `VoiceAgentAction["action"]` (`src/hooks/voice/types.ts`) é uma
união de **8** valores, não 6 — inclui também `open_oracle` e `open_cart`
(usados de fato em `FiltersPage.tsx` e `useVoiceSearchAction.ts`). O código já
tinha um fallback intencional pra essas duas ações não mapeadas
(`ACTION_META[actionType] || ACTION_META.answer`), então não é um bug de
runtime novo — é o tipo genérico (`Record<string, T>`) mascarando tanto o caso
real (chave ausente, já tratado) quanto o caso impossível (chave declarada no
literal, nunca ausente) com o mesmo `T | undefined`.

Corrigido tipando `ACTION_META` como `Record<ActionMetaKey, {...}>` (união
literal das 6 chaves reais, não `string`) — resolve as atribuições por ponto
nas linhas 20-25 sem indireção. Para a leitura com chave dinâmica (que pode
ser uma das 8, incluindo as 2 não mapeadas), foi adicionado um helper
`getActionMeta(action: string)` com type guard `action in ACTION_META`,
preservando exatamente o mesmo fallback pro `answer` que já existia — mudança
de tipo, não de comportamento.

Sem teste dedicado no repo; componente é referenciado apenas por
`VoiceSearchOverlay.tsx`.

## `FocusTrap.tsx` (etapa 17, 8 → 0 erros)

Mesmo padrão nas 4 ocorrências (2 na função `FocusTrap`, repetidas na função
`useFocusTrap`): acesso a `elements[0]`/`elements[elements.length - 1]` já
protegido por um `if (elements.length > 0)` ou `if (elements.length === 0)
return;` imediatamente acima — a invariante de que o índice existe é
verdadeira em runtime, mas o TypeScript não propaga um `.length` checado pra
um acesso por índice separado sob `noUncheckedIndexedAccess`.

Corrigido com asserção de não-nulo (`elements[0]!`) nos 4 pontos, já que a
ausência de `undefined` está provada pela checagem de `.length` na linha
imediatamente acima — não é supressão de um caso real, é o mesmo tipo de
limite de inferência já documentado nos outros arquivos desta etapa.

Sem teste dedicado no repo.

## `use2FA.ts` (etapa 17, 8 → 0 erros)

Causa: a tabela `user_2fa_settings` existe na migration
`20251231024837_c924e1c3-b77f-4076-9cdc-195effdf6ea2.sql` mas está **ausente**
do `src/integrations/supabase/types.ts` gerado — drift real entre schema e
tipos (mesma classe de problema da etapa 22), confirmado via
`grep -rn "user_2fa_settings" src/integrations/supabase/types.ts` (sem
resultado). Todo `supabase.from('user_2fa_settings')` caía na união de erro
genérica do client tipado.

Corrigido substituindo os 4 pontos de chamada (`fetchSettings`, `enable2FA`,
`disable2FA` × 2) por `untypedFrom<TwoFactorSettingsRow>('user_2fa_settings')`
(`src/lib/supabase-untyped.ts`), com uma interface local documentando o
drift. O helper `untypedFrom` não tinha suporte a `upsert` (só
`select`/`insert`/`update`/`delete`) — adicionado ao
`UntypedQueryBuilder<T>` porque `enable2FA` precisa de upsert real (criar ou
atualizar as configurações de 2FA do usuário).

Teste dedicado: `tests/hooks/use2FA.test.ts` — 6/6 passando.

## `useCatalogFiltering.ts` (etapa 17, 8 → 0 erros)

Quatro causas independentes:

1. **Tipo solto em vez do tipo real**: os 3 callbacks de filtro de cor
   usavam `(c: Record<string, string>)` em vez de `ProductColor`
   (`@/hooks/useProducts`), que é o tipo real de `p.colors[]`.
2. **Tipo da interface desalinhado com o dado real**: `supplierSalesMap` era
   declarado como `Map<string, number>` na interface
   `CatalogFilteringOptions`, mas o dado real (rastreado até
   `useCatalogState.ts` → `useSupplierSalesRanking.ts`) é
   `Map<string, SupplierSalesEntry>` — é o que `sortProducts()` já esperava.
3. **Guarda defensiva narrowed a `never`**: o fallback de `materials` (linha
   ~134) trata o caso de dado legado vindo como string solta em vez de
   array, mas como `p.materials` é tipado como `string[]`, o TS provava a
   branch `else` de `Array.isArray()` como inalcançável. Corrigido
   re-tipando a variável local como `unknown` antes do `Array.isArray()`,
   preservando a defesa em runtime sem `any`.
4. **Achado real — filtro "temas" nunca conectado**: o "New Sicoob Theme
   Filter" lê `p.tags?.temas`, campo que não existia em `Product['tags']`.
   Investigação via `git log --all -S"New Sicoob Theme Filter"` encontrou um
   único commit (`322509aa8`, `gpt-engineer-app[bot]`, 2026-05-17) que
   introduziu o filtro e nunca mais tocou nele — o filtro está 100% ligado
   na UI (`FilterPanel.tsx`, `useFilterPanelState.ts`,
   `CatalogActiveFilters.tsx`) mas o campo de dado nunca existiu. Como
   mapear "temas" pra um campo real (`ramo`? `nicho`?) é uma decisão de
   negócio que não deve ser adivinhada (AGENTS.md, regra 1), a correção foi
   deliberadamente conservadora: `temas?: string[]` como campo **opcional**
   em `Product['tags']` (zero mudança de comportamento — resolve pra
   `[]`/no-op exatamente como hoje) + espelhar o mesmo `parseTagList` dos
   outros 5 campos de tag em `product-mapper.ts`, pra que o filtro passe a
   funcionar automaticamente se a origem (JSONB `tags` do banco externo)
   algum dia passar a enviar `temas`. Campo opcional evita tocar as ~40
   construções literais de `Product['tags']` em
   `src/data/mock-match-products.ts` (27 ocorrências, `Product` local
   próprio, não afetado).

Sem teste dedicado pro hook em si; suíte relacionada
`tests/utils/product-mapper.test.ts` (afetada pela mudança #4) — 15/15
passando.

## `useExternalDatabase.ts` (etapa 17, 8 → 0 erros)

Três causas independentes:

1. **Fronteira não tipada**: `invokeWithRetry()`
   (`src/lib/external-db/invoke.ts`) retorna
   `Promise<{ data: unknown; error: Error | null }>`. O `data` era acessado
   direto (`data?.success`, `data.data`, `data?.error`) sem cast, gerando
   4 `TS2339`. Confirmado o envelope real devolvido pelo edge function
   `external-db-bridge` via grep em
   `supabase/functions/external-db-bridge/index.ts`
   (`JSON.stringify({ data: result, success: true })`). Corrigido com uma
   interface `EdgeFunctionEnvelope` local e um único cast na fronteira.
2. **Genérico sem constraint quebrava o operador `in`**: `useExternalDatabase<T
   = Record<string, unknown>>` permitia `T` estruturalmente primitivo, então
   `'records' in result` (onde `result: T | QueryResult<T>`) falhava com
   `TS2638` em 3 pontos. Primeira tentativa, `T extends Record<string,
   unknown>`, **quebrou 22 dos 24 hooks especializados** (`useExternalProducts`,
   `useExternalCategories` etc.) — interfaces nomeadas como `ExternalProduct`
   não satisfazem `Record<string, unknown>` estruturalmente (mesma armadilha
   já documentada em `supabase-untyped.ts`). Corrigido com `T extends object`,
   que já é suficiente pra excluir primitivos do operando do `in` sem exigir
   compatibilidade de index signature.
3. **Tabela inválida em função já deprecated**: `useExternalCompanies()`
   chamava `useExternalDatabase<ExternalCompany>('companies')`, mas
   `'companies'` não existe nem em `PRODUCT_TABLES` nem em `BRIDGE_ALIASES`
   do `external-db-bridge` (confirmado em `src/lib/external-db/tables.ts`) —
   empresas/clientes são servidas por um bridge diferente
   (`crm-db-bridge`, via `useCrmCompanies()`, já apontado pelo aviso de
   deprecation existente). Não é só erro de tipo: a função já quebrava em
   runtime (toast de erro) sempre que chamada. Confirmado que ainda é
   chamada ao vivo em `src/pages/ExternalDatabaseTest.tsx` (rota dev
   `/external-db-test`, atrás de `DevRoute`). Corrigido convertendo
   `useExternalCompanies()` pro mesmo padrão de stub já usado em
   `useExternalBusinessSectors()` (fallback vazio, sem chamar o bridge
   errado), preservando a assinatura completa (`data`, `isLoading`, `error`,
   `fetchAll`, etc.) que `ExternalDatabaseTest.tsx` consome — corrige o bug
   de runtime pré-existente como efeito colateral, não muda a página.

Sem teste dedicado no repo pra nenhum dos dois arquivos.

## `useMagicUpState.ts` (etapa 17, 8 → 0 erros)

Seis causas independentes:

1. **`Tables<>` completo vs. `.select()` com coluna explícita**: o `.map()`
   da query de `magic_up_campaigns` anotava o parâmetro como
   `Tables<"magic_up_campaigns">` (linha completa da tabela), mas a query
   usa `.select("id, title, status, ...")` com lista explícita de colunas —
   o shape real inferido é mais estreito. Corrigido removendo a anotação e
   deixando o TS inferir do resultado da query.
2. **`MagicUpProduct.images` não batia com o dado real**: a interface
   declarava `images` como array de objetos ricos
   (`{ url_cdn?, url_original?, is_primary?, ... }`), mas o valor real vem
   de `fetchPromobrindProducts()` → `PromobrindProduct.images: string[] |
   null` (confirmado em `src/lib/external-db/product-types.ts`). Grep em
   `src/pages/magic-up/`, `src/components/magic-up/` e
   `useMagicUpGeneration.ts` confirmou zero consumidores lendo `.images` no
   shape rico — corrigido o tipo da interface pra `string[] | null`,
   batendo com o dado real em vez de forçar o dado no shape errado.
3. **Cadeia `.filter().map().filter()` sem tipo intermediário**: o `.map()`
   que monta `ProductImage[]` (a partir de `Record<string, unknown>` vindo
   do bridge) não tinha o retorno anotado, então o array intermediário
   ficava com propriedades `unknown`; o `.filter()` seguinte, anotado
   explicitamente como `(img: ProductImage) =>`, falhava com `TS2769` (nenhum
   overload bate). Corrigido anotando o retorno do `.map()` como
   `ProductImage` (com `String()`/`Boolean()`/cast inline pros campos vindos
   de `unknown`) e deixando o `.filter()` seguinte inferir o parâmetro.
4. **Chave de `Map<string, T>` vinda de `unknown`**: `v.color_name` (de
   `Record<string, unknown>`) era usado direto como chave de
   `Map<string, ProductColor>`, gerando `TS2345: '{}' não é atribuível a
   'string'`. Corrigido extraindo `color_name` pra uma variável local
   `string | undefined` antes de usar como chave (mesmo padrão aplicado aos
   outros campos do objeto `ProductColor`).
5. **`shape: string` vs. união `AreaShape`**: `printAreas` monta
   `PrintAreaWithTechniques[]`, cujo campo `shape` exige a união `AreaShape`
   (`@/types/gravacao`), mas `CustomizationOption.shape` (origem do valor,
   `useMockupTechniques.ts`) é `string` puro. Corrigido com cast explícito
   `as AreaShape` na atribuição — o valor real é confiável (vem de uma lista
   fixa de formas cadastradas), só a tipagem de origem é mais larga.
6. **Propriedades mortas sobrescritas pelo spread seguinte**: o retorno do
   hook setava `qualityDiagnosis: generation.qualityDiagnosis` e
   `curationStatus: generation.curationStatus` explicitamente, mas o mesmo
   objeto retornado espalha `...generation` logo depois — que já contém as
   duas chaves idênticas (confirmado via grep no retorno de
   `useMagicUpGeneration.ts`). O spread sempre vence, então as duas
   propriedades explícitas eram código morto (`TS2783`). Corrigido
   removendo as duas, sem mudança de comportamento.

Efeito colateral: a remoção da anotação `Tables<"magic_up_campaigns">`
deixou o import `Tables` sem uso — removido do import (mantidos
`TablesInsert`/`TablesUpdate`, ainda usados em outros pontos do arquivo).

Sem teste dedicado pro hook em si. Suíte relacionada
`tests/hooks/useMagicUpGeneration-onda5.test.tsx` (não tocado, mas
consome `MagicUpProduct` via mock) — 4/4 passando. Verificado também que
`useMagicUpGeneration.ts` não regrediu (`TS2322` em `tags.filter(Boolean)`
na linha 129 é pré-existente, confirmado via `git stash` — não relacionado
a esta mudança).

## `FavoritesPage.tsx` (etapa 17, 8 → 0 erros — achado: import de `Product` errado propagado em 4 arquivos)

Causa única, não 8 causas independentes: `useEnrichedFavoriteItems.ts`
importava `Product` de `@/types/product` (shape de linha crua do banco,
snake_case, ex. `category_id: number | null`) quando o dado real que
circula por `product: map.get(item.product_id)` vem de
`useProductsContext()` → `@/hooks/useProducts` → `@/types/product-catalog`
(shape de catálogo/UI, camelCase, ex. `category: { id, name }`,
`stockStatus`, `brand?`). São duas interfaces **genuinamente diferentes**
com o mesmo nome `Product`, não um alias — confirmado lendo os dois
arquivos lado a lado. Isso fazia `EnrichedFavoriteItem.product` "vazar" o
tipo errado, e todo ponto de `FavoritesPage.tsx` que misturava
`enriched[].product`/`productWithVariant` (tipo errado) com
`legacyFavoriteProducts` (`getProductsByIds()` direto, tipo certo) virava
`(Product | Product)[]` — os 8 erros originais eram todos sintoma do mesmo
import errado.

Corrigido o import em `useEnrichedFavoriteItems.ts` pra
`@/types/product-catalog`. Isso revelou, em cascata (mesmo bug, mesmo
padrão, arquivos diferentes — confirmado via grep que cada um tem
consumidor único), o mesmo import errado em mais 3 componentes que
recebem produtos favoritados como prop:

- `FavoritesViewHeader.tsx` (`products?: Product[]`)
- `FavoritePresentationLauncher.tsx` (`products: Product[]`)
- `ExportFavoritesButton.tsx` (`products: Product[]`, consumido só por
  `FavoritesViewHeader.tsx`)

Todos corrigidos pro mesmo import certo. Como efeito colateral, 4
comentários `// @ts-expect-error` que suprimiam acessos a `p.brand`,
`p.category_name`/`p.category` (campos que só existem no shape de
catálogo, não no shape de linha crua) ficaram órfãos (`TS2578: Unused
'@ts-expect-error'`) — removidos, já que o tipo corrigido cobre esses
campos nativamente.

Achado bônus fora do escopo original (revelado só por já estar editando
`ExportFavoritesButton.tsx`): `products[i]` num loop `while (i <
products.length)` (geração de PDF) gerava `TS18048` (`noUncheckedIndexedAccess`)
em 5 pontos — pré-existente, confirmado via `git stash` antes desta
mudança. Corrigido com asserção de não-nulo (`products[i]!` + comentário
do invariante do loop) em vez de guarda `if (!p) continue`, porque a
guarda elevava a complexidade cognitiva da função de 15→16 (limite do
lint) — a asserção é o fix mínimo real, já que o invariante do `while` já
garante o índice válido.

Sem teste dedicado no repo pra nenhum dos 5 arquivos.

## `GestorApprovalsPage.tsx` (+ variante `sicoob/`) (etapa 17, 10 → 0 erros — achado: embed PostgREST quebrado em produção)

**Achado real de bug de produção** (mesma categoria do achado anterior em
`useExternalCompanies()`): as duas páginas de aprovação usavam sintaxe de
embed do PostgREST para trazer nome/e-mail do aprovador/criador junto com
a query principal:

```ts
// src/pages/GestorApprovalsPage.tsx
.select(`*, order:order_id(...), approver:approver_id(full_name, email)`)

// src/services/sicoob/approvalService.ts
.select(`*, sicoob_orders (..., profiles:created_by (full_name))`)
```

O TS acusava `SelectQueryError<"could not find the relation between X
and Y">` — não é um incômodo de tipagem, é o gerador de tipos do Supabase
confirmando que a relação não existe no cache de embeds do PostgREST.
Confirmado via migration original
(`20260504211355_...715f426eade7.sql`): `approver_id UUID REFERENCES
auth.users(id)` — a FK aponta pra `auth.users`, schema interno do
Supabase, que o PostgREST não embute (cross-schema) e que nem expõe
`full_name`/`email` como colunas públicas. Mesmo padrão confirmado pra
`sicoob_orders.created_by` (sem entrada em `Relationships` no
`types.ts`). Ou seja: os embeds `approver:approver_id(...)` e
`profiles:created_by(...)` muito provavelmente nunca funcionaram em
runtime — sempre retornaram vazio/null silenciosamente.

**Fix aplicado** (decisão de dev sênior, sem pausar pra perguntar: é
correção de código de aplicação, não migration de schema — não há
mudança de arquitetura nem dado destrutivo envolvido): removido o embed
quebrado da query principal e adicionada uma segunda busca em
`public.profiles` (que tem `user_id UUID REFERENCES auth.users(id)`,
`full_name`, `email`) filtrada pelos ids únicos de aprovador/criador já
retornados na primeira query, com merge no client via `Map`. Aplicado
nos dois locais (`GestorApprovalsPage.tsx` e
`sicoobApprovalService.listPendingApprovals()`), preservando o shape
consumido pelos componentes (`h.approver?.full_name`,
`req.sicoob_orders?.profiles?.full_name`).

Optou-se por **não** criar migration adicionando FK
`order_approval_history.approver_id → profiles.user_id` (ou equivalente
pra `sicoob_orders.created_by`) porque isso seria mudança de schema em
produção — fora do escopo de "zerar erros de tipo" e um trade-off de
arquitetura que merece decisão própria, não implícita numa etapa de
type-fix.

Demais erros do lote (não relacionados ao embed):
- `TS2769` (`format(new Date(h.created_at), ...)`) — `created_at` é
  `string | null` no tipo gerado (embora NOT NULL na prática, com
  default `now()`). Extraída função `toSafeDate()` no topo do arquivo
  em vez de inline `h.created_at ?? 0` — inline elevava a complexidade
  ciclomática de 2 arrow functions de 10→11 (limite do lint), function
  extraída não conta como branch adicional.
- `TS2345` (`formatCurrency(h.subtotal_at_time)`, `number | null` não
  assinalável a `number`) — trocado o import de `formatCurrency` de
  `@/lib/utils` (deprecated, `value: number`) pra `@/lib/format`
  (`value: number | null | undefined`), já o padrão usado no resto do
  código (ex.: `ExportFavoritesButton.tsx`).
- `TS2322` (`title={h.reason}` / `title={req.request_reason}`, `string |
  null` não assinalável a `string | undefined`) — `?? undefined` nos 2
  pontos.

Verificado: `tscheck-files.mjs` nos 3 arquivos → 0 erros (9 no programa
inteiro, era 19 antes). `check-eslint-baseline.mjs` → 1ª tentativa
acusou regressão de `complexity` (+2, ver acima), corrigida com a
extração de `toSafeDate()`; 2ª verificação → zero regressão. Teste
dedicado `tests/services/sicoobApprovalService.test.ts` (só cobre
`rejectOrderWithoutApproval`, não exercita `listPendingApprovals`) → 1/1
passou.

## `src/pages/sicoob/orders/OrderDetailPage.tsx` (etapa 17, 8 → 0 erros — achado: dead code + drift de tipo hand-written)

Três causas raiz distintas, nenhuma delas incômodo de tipagem — todas
bugs reais de código:

**1. Dead code disfarçado de "uso" pra enganar lint de import não
usado**:

```ts
const [_unused_MessageSquare, set_unused_MessageSquare] = useState(MessageSquare);
const [_unused_Badge, set_unused_Badge] = useState(Badge);
const [_unused_Tooltip, set_unused_Tooltip] = useState(Tooltip);
```

Passar um componente React (tipo função) pro `useState` faz o TS cair no
overload de lazy-initializer (`() => S`) e falhar (`TS2345`, componente
exige props pra ser chamado, não há `S` válido). Confirmado via grep que
`MessageSquare` e `Badge` são usados de verdade como JSX em outros
pontos do arquivo (imports ficam); `Tooltip` (diferente de
`TooltipContent`/`TooltipProvider`/`TooltipTrigger`) não tinha nenhum
uso real — bloco inteiro deletado, import de `Tooltip` removido também.

**2. `TS18048` (`orderData` possivelmente `undefined`) em 3 handlers**
(`handleRequestApproval`, `handleApprove`, `handleEscalate`) que
acessavam `orderData.status` sem guarda — enquanto `handleReject`, no
mesmo arquivo, já tinha `if (!orderData) return;` no topo. Aplicado o
mesmo guard-clause nos 3 handlers, por consistência e porque os handlers
podem legitimamente ser chamados antes do load completar.

**3. Drift de tipo em interface hand-written vs. schema real do banco**:
`SicoobOrder` (`src/types/sicoob/orders.ts`) não tinha o campo
`approval_policy_version`, presente na tabela real (`sicoob_orders`,
adicionado pelas migrations `20260912120000_sicoob_approval_policy_guards.sql`
e `20260915143442_sicoob_reconciliation_baseline.sql`) e no `types.ts`
gerado (`Row.approval_policy_version: string | null`). Como
`sicoobOrderService.getOrderById()` faz `.select("*")` e depois `return
data as SicoobOrder`, o campo sempre existiu em runtime — só faltava no
tipo hand-written. Adicionado `approval_policy_version?: string | null;`
na interface, terceira instância confirmada de "types.ts drift" nesta
sessão (depois de `use2FA.ts`/`user_2fa_settings` e dos embeds quebrados
do lote anterior).

Verificado: `tscheck-files.mjs` em `OrderDetailPage.tsx` +
`src/types/sicoob/orders.ts` + `src/pages/OrderDetailPage.tsx` → 0 erros
nos arquivos-alvo (72 no programa inteiro, era 80). `check-eslint-baseline.mjs`
→ "Drift positivo: 3 erro(s) eliminado(s)", zero regressão. Teste
dedicado `tests/services/sicoobOrderService.test.ts` → 10/10 passou (não
existe teste dedicado pra `OrderDetailPage.tsx`/`useSicoobOrder.ts`
componente/hook em si).

## `src/hooks/useQuoteTemplates.ts` (etapa 17, 2 → 0 erros — achado: `items_data` não é `Json`-serializável no tipo + 2 campos com drift de nulidade)

**Causa raiz 1**: `createTemplate`/`updateTemplate` passavam o objeto
`CreateTemplateInput` (derivado da interface app-level `QuoteTemplate`,
com `items_data: QuoteTemplateItem[] | null`) direto pro `.insert()`/
`.update()` do Supabase, cujo tipo gerado espera `items_data?: Json |
null`. `QuoteTemplateItem` tem `personalizations?:
QuoteTemplatePersonalization[]`, e `QuoteTemplatePersonalization` tem
`[key: string]: unknown` — `unknown` não faz parte da união recursiva
de `Json`, então o TS rejeita a atribuição (corretamente: em tese
alguém poderia colocar uma função ali, que não serializa). Aplicado o
mesmo padrão já usado em 3 outros hooks do projeto pro mesmo problema
(`useKitVariants.ts`, `useTemplateSnapshot.ts`, `useKitAutoSave.ts`):
`JSON.parse(JSON.stringify(template.items_data))` antes de enviar —
os dados são sempre serializáveis em runtime (vêm de formulário/estado
local), só o tipo estático não provava isso.

**Causa raiz 2**: `QuoteTemplate.seller_id` estava tipado `string |
null`, mas a coluna real (`quote_templates.seller_id`) é `NOT NULL` —
confirmado no `Row`/`Insert`/`Update` gerados (nenhum tem `| null`).
Corrigido pra `seller_id: string`.

**Causa raiz 3**: `CreateTemplateInput` (`Partial<Omit<QuoteTemplate,
...>>`) tornava `name` opcional, mas a coluna é `NOT NULL` sem default
— `createTemplate({})` sem nome quebraria em runtime só na constraint
do banco, não no tipo. Corrigido: `CreateTemplateInput = Partial<...> &
Pick<QuoteTemplate, 'name'>` (nome obrigatório, resto opcional,
espelhando a constraint real). Efeito colateral positivo: eliminou 2
erros pré-existentes em `QuoteTemplateForm.tsx`
(`formData.name is possibly 'undefined'`, linhas 68 e 375) que a
tipagem antiga permitia mas o form sempre evitava em runtime (guard
`if (!formData.name.trim()) return;`).

Verificado: `tscheck-files.mjs` em `useQuoteTemplates.ts` isolado → 0
erros (23 no programa inteiro, era 25). Mesma checagem incluindo
`QuoteTemplateForm.tsx`/`useQuoteBuilderState.ts` (consumidores)
confirma via `git stash`: 10 erros antes → 8 depois — os 8 restantes
são pré-existentes e fora do escopo deste arquivo (não relacionados a
`items_data`/`seller_id`/`name`), candidatos a uma futura unidade de
trabalho própria. `check-eslint-baseline.mjs` → zero regressão. Teste
dedicado `tests/hooks/useQuoteTemplates.test.tsx` → 1/1 passou (smoke
test, não exercita `createTemplate`/`updateTemplate` diretamente).

## `src/components/admin/products/new-supplier/useNewSupplierForm.ts` (etapa 17, 7 → 0 erros — `noUncheckedIndexedAccess` em acesso a índice já guardado)

Mesmo padrão já visto em `FocusTrap.tsx`/`ProductVariationAxesConfig.tsx`
nesta sessão: todos os 7 erros são `TS2532` em acesso por índice
(`array[0]`) já protegido por checagem de `.length > 0` (ou invariante
estrutural) no mesmo bloco, que o TS não propaga pro tipo do acesso
indexado. Corrigido com asserção de não-nulo (`!`) nos 7 pontos:
- `next[0]!.principal = true` (guardado por `next.length > 0`).
- `contacts[0]!.id` (×2, em `handleCnpjLookup`) — `contacts` nunca fica
  vazio (`removeContact` bloqueia remover o último), comentário
  adicionado explicando o invariante.
- `existing.records[0]!.name`, `existingByName.records[0]!.name`
  (guardados por `records.length > 0`).
- `existingByTN.records[0]` usado 2× na mesma linha — extraída
  constante local `first` com a asserção uma única vez, evitando
  duplicar a asserção e encurtando a linha.

Verificado: `tscheck-files.mjs` → 0 erros (15 no programa inteiro, era
22). `check-eslint-baseline.mjs` → zero regressão. Sem teste dedicado
para este hook.

## `src/components/admin/products/ProductFormStepContent.tsx` (etapa 17, 7 → 0 erros — drift de tipo em prop compartilhada `FormSectionProps` + widening desnecessário local)

Três causas raiz distintas, todas do mesmo gênero (tipo hand-written que
não reflete a forma real do dado), tocando 3 arquivos:

1. **`skuStatus`/`duplicateName` (linhas 123-124)**: `StepContentProps`
   declarava `skuStatus: string` e `duplicateName: string | null`, mas a
   fonte real (`useSkuValidation.ts`) sempre retorna
   `'idle' | 'checking' | 'valid' | 'duplicate'` (union literal) e
   `duplicateName: string` (nunca `null` — inicializado como `''`). O
   widening era desnecessário e quebrava a atribuição pra
   `ProductInfoSection`, que exige o tipo preciso. Corrigido apertando
   `StepContentProps` pros tipos reais de origem, em vez de afrouxar o
   componente-folha.

2. **`FormSectionProps.watch`/`numericProps` (`ProductFormHelpers.tsx`,
   linhas 128/145/149/158/177 — `ProductDimensionsSection`,
   `ProductPackagingSection`, `ProductPriceSection`, `ProductFiscalSection`,
   `ProductSeoSection`)**: a interface compartilhada `FormSectionProps`
   declarava `watch` como uma assinatura genérica simplificada
   (`<T extends keyof ProductFormData>(name: T) => ProductFormData[T]`) em
   vez do tipo real do react-hook-form (`UseFormWatch<ProductFormData>`,
   que é sobrecarregado — suporta zero args, array de nomes, callback,
   etc.). O `numericProps` real (definido em `ProductFormFullscreen.tsx`)
   também não batia: parâmetro `keyof ProductFormData` vs. o
   `keyof ProductFormData | (string & {})` declarado, e retorno
   `object` vs. `Record<string, unknown>` exigido. Como o `watch`/
   `numericProps` reais só são construídos uma vez (em
   `ProductFormFullscreen.tsx`) e todo consumidor só chama
   `watch('campo')`/`numericProps('campo')` com uma chave só, a
   assinatura simplificada nunca trouxe benefício real — só drift.
   Corrigido trocando `FormSectionProps.watch` por
   `UseFormWatch<ProductFormData>` (tipo real do react-hook-form) e
   `numericProps` por `(name: keyof ProductFormData) => object`, iguais
   ao `FormProps` local já existente em `ProductFormStepContent.tsx`.

3. **Regressão descoberta pelo typecheck completo do projeto** (não
   aparecia no escopo isolado do arquivo-alvo): apertar o parâmetro de
   `numericProps` pra `keyof ProductFormData` (removendo o
   `| (string & {})`) quebrou 2 chamadas em
   `src/components/admin/products/sections/ProductDimensionsSection.tsx`,
   que passava `fId` vindo de `.map()` sobre um array de objetos literais
   sem `as const` — o TS alargava `id: 'height_cm'` etc. pra `string`
   puro na desestruturação. O `(string & {})` na interface original era
   uma bengala pra esse widening, não uma decisão de aceitar string
   arbitrária de propósito. Causa raiz real: os 10 ids usados
   (`height_cm`, `width_cm`, ..., `internal_diameter_cm`) são todos
   chaves genuínas de `ProductFormData` (confirmado em
   `ProductFormSchema.ts`) — só precisavam ficar literais. Corrigido
   envolvendo os 2 arrays com `as const`.

Verificado: `tscheck-files.mjs` → 0 erros nos 3 arquivos-alvo (41 no
programa inteiro, era 48; o único erro remanescente em
`ProductFormHelpers.tsx`, `TS7016` de declaração de tipo faltando pro
ícone `ruler` do `lucide-react`, é pré-existente — confirmado via
`git stash`, não foi introduzido por esta correção e está fora de
escopo). `check-eslint-baseline.mjs` → zero regressão nos 3 arquivos.
`npm run typecheck:baseline` → zero regressão no projeto inteiro
(965 vs. baseline 972, 1 arquivo melhorou); `--update` travou o ganho
(972 → 965 erros, 410 → 409 arquivos). Sem teste dedicado para nenhum
dos 3 arquivos.

## `src/components/cms/BannerCarousel.tsx` (etapa 17, 7 → 0 erros — drift de nulidade em `useCMS.ts` quebra a inferência de generics do `useQuery`)

Os 7 erros apareciam todos em `BannerCarousel.tsx` (`banners.length`,
`banners.map`, parâmetros implícitos `any`), mas a causa raiz estava em
`src/hooks/useCMS.ts`: a interface hand-written `CMSBanner` declarava
`is_active: boolean` e `sort_order: number`, enquanto as colunas reais
de `cms_banners` (confirmado em `types.ts` gerado) são
`is_active: boolean | null` e `sort_order: number | null` — mesmo
drift de nulidade já visto em `useQuoteTemplates.ts`/`OrderDetailPage.tsx`
nesta sessão. `CMSSection` tinha o mesmo problema pra `cms_sections`.
Como `useQuery<CMSBanner[]>({ queryFn: async () => {...} })` recebe só
o generic explícito e o `queryFn` retorna o shape real do banco
(`is_active: boolean | null`), nenhum dos overloads do `useQuery` batia
— e quando um generic overloaded do TanStack Query falha em todos os
overloads, o `TData`/`TQueryFnData` fica sem resolver e vaza como
`never[] | NonNullable<TQueryFnData>` pro tipo de `.data` no consumidor
(`useCMS.ts` não aparecia com erro no escopo isolado de
`BannerCarousel.tsx` — só apareceu ao rodar `tscheck-files.mjs` direto
nele). Corrigido widenando `is_active`/`sort_order` pra `| null` nas
duas interfaces, batendo com o `Row` real gerado.

Verificado: `tscheck-files.mjs` em `useCMS.ts` + `BannerCarousel.tsx`
→ 0 erros nos 2 (0 no programa inteiro). Único consumidor de
`useCMS`/`CMSBanner`/`CMSSection` no projeto é o próprio
`BannerCarousel.tsx` (confirmado por grep), que não referencia
`is_active`/`sort_order` no render — sem impacto de runtime.
`check-eslint-baseline.mjs` → zero regressão. `npm run
typecheck:baseline` → zero regressão (956 vs. baseline 965, 2 arquivos
melhoraram); `--update` travou o ganho (965 → 956 erros, 409 → 407
arquivos). Sem teste dedicado.

## `src/components/orders/OrderStatsBar.tsx` (etapa 17, 7 → 0 erros — **achado real de bug de crash em produção**)

`const { data: orders } = useOrdersList(user?.id, scope);` — mas
`useOrdersList` retorna um `useQuery` cujo `queryFn` resolve pra
`OrderService.list(...)`, que devolve o envelope paginado
`{ data: OrderRow[]; count: number | null }`, não um array direto
(confirmado comparando com o padrão já usado em `OrdersPage.tsx`:
`const { data: response } = useOrdersList(...); const orders =
response?.data || [];`, e em `ApprovalKanbanBoard.tsx`:
`ordersResult?.data`). Ou seja, a variável local `orders` em
`OrderStatsBar.tsx` sempre foi o objeto-envelope inteiro, nunca o
array de pedidos.

Isso não era só erro de tipo — era **crash de runtime real**: antes do
carregamento, `orders` é `undefined` e `orders?.filter(...)` faz
short-circuit pra `undefined` (daí `|| 0`, os cards mostravam 0
silenciosamente). Mas assim que a query resolve, `orders` vira o
objeto `{data, count}` — que não tem `.filter` — e
`orders?.filter(...)` **não** faz short-circuit (o objeto não é
nulo/undefined), então tenta chamar `orders.filter` como função e
lança `TypeError: orders.filter is not a function`.
`OrderStatsBar` está montado ativamente em `OrdersPage.tsx:93`
(confirmado — não é código morto), então este componente quebrava em
produção toda vez que a lista de pedidos carregava com sucesso.

Corrigido seguindo o mesmo padrão já usado nos outros 2 consumidores
de `useOrdersList`: `const orders = response?.data || [];` e uso
direto de `orders.length`/`orders.filter(...)` sem `?.`/`|| 0`
redundante (o array já é garantido). Ajuste adicional: a primeira
versão do fix (`const orders = response?.data;` mantendo `orders?.`
nos 4 usos) introduziu uma regressão de complexidade ciclomática no
ESLint (10 → 11, limite é 10) — resolvido eliminando os `?.`/`|| 0`
agora desnecessários ao garantir o fallback `[]` uma única vez.

Verificado: `tscheck-files.mjs` → 0 erros (24 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão (após o ajuste de
complexidade). `npm run typecheck:baseline` → zero regressão (949 vs.
baseline 956, 1 arquivo melhorou); `--update` travou o ganho
(956 → 949 erros, 407 → 406 arquivos). Sem teste dedicado.

## `src/hooks/tecnicas/usePrecoCalculation.ts` (etapa 17, 7 → 0 erros — **2º achado real de bug de crash em produção nesta etapa**)

Todos os 7 erros eram da família `noUncheckedIndexedAccess`
(TS18048/TS2532) em acesso a `tabela.faixas[N]`, mas cada um pedia um
diagnóstico diferente:

- `calcularPreco()` fazia `let faixaUtilizada = tabela.faixas[0];`
  **sem nenhum guard de `.length`** antes — diferente de
  `calculatePriceForQuantity()`, que já tinha
  `if (tabela.faixas.length === 0) return null;`. Investigado se
  `tabela.faixas` pode legitimamente vir vazio: `faixas` é montado em
  `rawToTabelaPrecoTecnica()` (`src/lib/personalization/transformers.ts:72-88`)
  varrendo as colunas `min_qty_1..15`/`price_1..15` do banco e só
  empurrando uma faixa quando ambas não são `null` — ou seja, uma
  tabela de preço cadastrada sem nenhuma faixa preenchida gera
  `faixas: []` de verdade, não é um estado impossível. E
  `calcularPreco()` é chamado em `PricingPanel.tsx:127`
  (`getSimulacao`) dentro de um `.map(tabelasGrupo)` sem guard nenhum,
  renderizando `formatCurrency(simulacao.precoUnitario)`
  incondicionalmente (`PricingPanel.tsx:342`) — ou seja, qualquer
  tabela de preço sem faixas configuradas quebraria esse painel em
  produção com `TypeError: Cannot read properties of undefined
  (reading 'precoUnitario')`. Mesmo padrão de bug do achado anterior
  em `OrderStatsBar.tsx`: o TS só expôs porque o tipo do array não
  garante não-vazio.
  Corrigido com um guard no topo de `calcularPreco()` (mesmo espírito
  do já existente em `calculatePriceForQuantity()`), retornando um
  `ResultadoCalculoPreco` zerado (`precoUnitario: 0`, `precoTotal: 0`,
  `slaDias: null`) em vez de deixar propagar `undefined` — mantém a
  assinatura não-nula da função (único chamador não trata `null`) e o
  painel mostra R$ 0,00 em vez de quebrar a tela.
- `calculatePriceForQuantity()` (linha 138) já tinha o guard
  `.length === 0`, mas TS não propaga essa checagem pro tipo do acesso
  indexado seguinte (`tabela.faixas[0]`) — precisa de `!` explícito no
  ponto de uso mesmo already-guarded. Aplicado `!` em
  `tabela.faixas[0]!` (linha 140) e `tabela.faixas[0]!.precoUnitario`
  (linha 151), justificado pelo guard 3 linhas acima.
- `extractPriceTiersFromTabela()`: `arr[idx + 1] ?
  arr[idx + 1].quantidadeMinima - 1 : null` fazia acesso duplo ao
  mesmo índice — clássico caso em que o TS não consegue provar que a
  segunda leitura ainda é o mesmo valor da primeira. Corrigido
  extraindo `const proxima = arr[idx + 1];` uma vez, mesmo padrão já
  usado em `existingByTN.records[0]` (`useNewSupplierForm.ts`) mais
  cedo nesta sessão.

Verificado: `tscheck-files.mjs` → 0 erros (36 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. `npm run
typecheck:baseline` → zero regressão (942 vs. baseline 949, 1 arquivo
melhorou); `--update` travou o ganho (949 → 942 erros, 406 → 405
arquivos). Sem teste dedicado para `usePrecoCalculation.ts` nem para
`PricingPanel.tsx`.

## `src/hooks/usePasswordResetRequests.ts` (etapa 17, 7 → 0 erros — drift de tabela ausente do `types.ts` gerado)

Todos os 7 erros vinham de `supabase.from('password_reset_requests')`
não bater com nenhum overload do client tipado — a tabela existe de
verdade no banco (migration dedicada
`supabase/migrations/20260916180000_create_password_reset_requests.sql`,
criada numa etapa anterior da sessão — etapa 26 — pra corrigir um bug
real e ao vivo: a página `/auth` de "esqueci minha senha" chamava
`createRequest()`, que fazia `INSERT` numa tabela que na época nem
existia, falhando silenciosamente pra todo usuário) mas nunca foi
regenerada no `src/integrations/supabase/types.ts` — mesmo padrão de
drift já resolvido em `use2FA.ts`/`user_2fa_settings` mais cedo nesta
sessão.

Corrigido trocando os 5 usos de `supabase.from('password_reset_requests')`
por `untypedFrom<PasswordResetRequest>('password_reset_requests')`
(`src/lib/supabase-untyped.ts`), eliminando também o cast
`as PasswordResetRequest[]` que existia em `fetchRequests` (agora
desnecessário, o wrapper já retorna o tipo certo). `supabase` continua
importado pro uso em `supabase.auth.getUser()`/
`supabase.auth.resetPasswordForEmail()`, que não mudam. Adicionado
`password_reset_requests` à union `UntypedTable` (documentação, sem
efeito em runtime).

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos (0 no
programa inteiro). `check-eslint-baseline.mjs` → zero regressão. `npm
run typecheck:baseline` → zero regressão (935 vs. baseline 942, 1
arquivo melhorou); `--update` travou o ganho (942 → 935 erros, 405 →
404 arquivos). Sem teste dedicado.

## `src/pages/admin/AdminAuditPage.tsx` (etapa 17, 7 → 0 erros — achado de bug grave e AO VIVO em produção fora do arquivo)

Os 7 erros vinham de acessar campos que não existem na tabela real
(`event_type`, `entity_type`, `entity_id`, `metadata`, `old_data`,
`new_data`) — a página foi escrita pra um schema imaginado de
`admin_audit_log`. O schema real (`src/integrations/supabase/types.ts`)
é `action`, `resource_type`, `resource_id`, `details` (JSONB), mais
campos de hash-chain (`previous_hash`/`current_hash`). Confirmado
contra os dois lugares que já leem/escrevem esse schema corretamente:
`RecentAuditTable.tsx` (leitor) e `useDiscountApproval.ts` (escritor).

Corrigido substituindo os nomes de campo 1:1 (`event_type`→`action`,
`entity_type`→`resource_type`, `entity_id`→`resource_id`) e tratando
o antigo objeto plano `{metadata, old_data, new_data}` como um objeto
aninhado dentro de `details` (JSONB) — mesma forma, só que embrulhado,
preservando 100% da lógica de UI/exportação já existente (badges de
evento, filtro por tipo, export XLSX). Também corrigido:
`query.order(sort.key)` usava `accessorKey: "event_type"` /
`"entity_type"` nas colunas ordenáveis — ordenar por essas colunas
inexistentes teria devolvido erro 500 do PostgREST; agora aponta pra
`action`/`resource_type` reais. Tipagem da função de export: extraído
`const details = (log.details ?? {}) as AuditLogDetails` (interface
local nova) em vez de tipar o parâmetro do `.map()` como `any` —
evita tanto `@typescript-eslint/no-explicit-any` quanto estourar o
limite de `complexity` (ficou em 12/10 numa primeira tentativa só
encadeando `?.` sem extrair a variável).

`AdminAuditPage` continua **código morto/não roteado** — confirmado
via grep, não aparece em nenhum arquivo de rotas (`src/routes/`) nem
em `route-matrix.ts`. O botão "Dossier Enterprise" (`/admin/auditoria/enterprise`)
e o próprio path da página (`/admin/auditoria`) também não têm rota
registrada. Corrigido mesmo assim (não é "3 linhas pra ignorar" — é
uma feature de auditoria administrativa real, só falta religar a rota
um dia).

**Achado maior, fora do escopo de erros de TS deste arquivo — bug ao
vivo em produção, não corrigido nesta sessão:** a mesma tabela
`admin_audit_log` é escrita pela Edge Function
`supabase/functions/admin-audit-hook/index.ts`, chamada por
`src/utils/adminAudit.ts` → `logAdminAction()`, que por sua vez é
importada e usada em 6 páginas administrativas **ativas e roteadas**
(`AdminRoute.tsx`, `AdminCampanhasPage.tsx`,
`DiscountApprovalQueue.tsx`, `AdminNewsletterPage.tsx`,
`CategoriesManager.tsx`, `AdminCMSPage.tsx`). A Edge Function faz
`INSERT` usando os MESMOS nomes de campo fictícios que este arquivo
tinha (`event_type`, `entity_type`, `entity_id`, `new_data`,
`old_data`, `metadata` direto na raiz) — todo `INSERT` falha no
Postgres por coluna inexistente. O wrapper cliente (`adminAudit.ts`)
engole o erro com `console.error`, sem re-lançar nem avisar o usuário.
Ou seja: **a trilha de auditoria (com hash-chain) provavelmente nunca
gravou uma linha válida em produção**, pra nenhuma ação administrativa
de CREATE/UPDATE/DELETE/PUBLISH/APPROVE/REJECT feita por essas 6
páginas. Não corrigido aqui porque (a) é código fora do escopo do
arquivo/erro de TS que motivou esta etapa, e (b) a sessão atual não
tem acesso de deploy ao projeto Supabase real deste repo
(`cfmzkthhgliqelozlmwu` — confirmado ausente de `supabase projects
list`, que só lista projetos de outros clientes). Reportado
separadamente ao usuário por gravidade (trilha de auditoria/compliance
sem funcionar silenciosamente).

Há também um `logAdminAction()` **diferente e não relacionado** em
`src/lib/audit-logger.ts` (assinatura posicional), com o mesmo
schema errado, mas confirmado via grep como código morto (zero
importadores) — item separado, de menor prioridade, na fila de 1 erro.

Verificado: `tscheck-files.mjs` → 0 erros no arquivo (2 no programa
inteiro, pré-existentes/não relacionados). `check-eslint-baseline.mjs`
→ zero regressão (a tentativa inicial introduziu 2 erros novos —
`no-explicit-any` e `complexity` — corrigidos antes do commit). `npm
run typecheck:baseline` → zero regressão (928 vs. baseline 935, 1
arquivo melhorou); `--update` travou o ganho (935 → 928 erros, 404 →
403 arquivos). Sem teste dedicado.

## `supabase/functions/admin-audit-hook/index.ts` (fora da etapa 17 — fix de código-fonte do bug ao vivo acima, deploy PENDENTE)

Corrigido o `INSERT` que gravava em `admin_audit_log` usando colunas
fictícias (`event_type`, `entity_type`, `entity_id`, `new_data`,
`old_data`, `metadata` soltos na raiz — nenhuma dessas existe na
tabela real). Enquanto investigava encontrei o padrão canônico já
usado por outras Edge Functions do repo: `supabase/functions/_shared/audit-log.ts`
exporta `writeAuditEntry()`, usado por `mcp-keys-issue` e
`secrets-manager`, com o schema real (`action`, `resource_type`,
`resource_id`, `ip_address`, `source`, `details`, mais os campos de
hardening `request_id`/`started_at`/`status`/etc.).

**Decisão**: não troquei `admin-audit-hook` para usar
`writeAuditEntry()` diretamente — esse helper não tem parâmetros pra
`previous_hash`/`current_hash`, e `admin-audit-hook` é especificamente
a função que implementa o hash-chain (motivo de ela existir separada
das outras). Trocar pelo helper genérico teria **removido** a
propriedade de tamper-evidence do hash-chain, uma regressão de
segurança disfarçada de fix. Em vez disso, apliquei o fix mínimo:
manter toda a lógica de hash-chain como estava (busca do
`previous_hash`, cálculo do `current_hash`) e só corrigir o `INSERT`
final pra usar as colunas reais — `action`/`resource_type`/`resource_id`
na raiz (mesmos nomes que `AdminAuditPage.tsx` já espera agora),
`previous_hash`/`current_hash` (já eram colunas reais, não precisavam
de fix), `ip_address` e `source` movidos pra colunas reais dedicadas
(antes enterrados dentro de `metadata`, que nem existe como coluna) e
o restante (`new_data`/`old_data`/`metadata` do payload original)
aninhado dentro de `details` (JSONB) — mesma forma de antes, só
embrulhada corretamente.

Achado bônus fora do escopo: `deno check` (não faz parte da lista do
`ci.yml` pra este arquivo — nunca foi verificado em CI) apontou
`TS18046` pré-existente no `catch (error)` final (`error.message` em
`unknown`) — corrigido com `error instanceof Error ? error.message :
String(error)`, mesmo padrão já usado em outros catches do projeto.

**Verificado**: `deno check supabase/functions/admin-audit-hook/index.ts`
→ limpo. **NÃO verificado em runtime** — a sessão não tem acesso de
deploy ao projeto Supabase real deste repo (`cfmzkthhgliqelozlmwu`,
ausente de `supabase projects list`). Este arquivo não é coberto por
nenhum gate de CI (não está na lista de `deno check` do `ci.yml`, e
`supabase/functions/**` é ignorado pelo ESLint). **Requer deploy
manual** (`supabase functions deploy admin-audit-hook`) por alguém
com acesso ao projeto pra entrar em produção — até lá, a trilha de
auditoria continua sem gravar nada, exatamente como antes deste fix.

## `src/pages/RolesPage.tsx` (etapa 17, 7 → 0 erros — mais um caso de drift schema real vs. tipos gerados, + bug real em `BackButton`)

Causa raiz do `TS2589` ("Type instantiation is excessively deep") na
linha 38 e dos 3× `TS2769`/`TS2345` seguintes: a tabela `roles`
**existe de fato no banco** (migração
`20251231023800_2b909a8a-cd0f-484e-8abf-bc0656fe3b54.sql`, colunas
`id`/`name`/`description`/`created_at` — exatamente a shape que a
interface local `Role` já esperava), mas **não está presente em
`src/integrations/supabase/types.ts`** (o gerado só tem `user_roles`,
uma tabela diferente). `supabase.from('roles')` contra um `Database`
que não conhece `'roles'` faz o TS tentar resolver os overloads
genéricos do query builder contra a união de todas as tabelas
conhecidas, estourando em "type instantiation excessively deep" —
mesmo padrão de drift já visto nesta sessão para
`password_reset_requests` (`usePasswordResetRequests.ts`).

Fix: troquei as 4 chamadas (`select`, `update`, `insert`, `delete`)
de `supabase.from('roles')` para `untypedFrom<Role>('roles')`
(`src/lib/supabase-untyped.ts`, wrapper já usado para exatamente este
cenário), e adicionei `"roles"` à lista de documentação
`UntypedTable`. Isso também resolveu de graça o `TS2345` da linha 44
(`ResultOne[]` vs `Role[]` no `setRoles`), já que `data` agora vem
tipado como `Role[] | null` em vez do tipo degenerado.

O 7º erro (`TS2322` na linha 102, `<BackButton fallbackPath="/admin" />`)
é um bug separado e real, não drift de schema:
`BackButtonProps` (`src/components/common/BackButton.tsx`) nunca
declarou `fallbackPath`, embora `useSmartNavigation().goBack(fallbackPath?, force?)`
já suportasse esse parâmetro desde sempre — o botão só nunca repassava
o valor (`onClick={goBack}`, sem argumento). Resultado: em **4
páginas** que já passavam `fallbackPath` (`RolesPage.tsx`,
`RolePermissionsPage.tsx`, `PermissionsPage.tsx`,
`KitBuilderHeader.tsx`), o botão voltar **nunca usava o fallback
configurado** — sempre caía na lógica de subida hierárquica genérica
(`/pedidos/123` → `/pedidos`) mesmo quando o dev explicitamente pediu
pra voltar para `/admin`. Corrigido adicionando `fallbackPath?: string`
a `BackButtonProps` e trocando o handler para
`onClick={() => goBack(fallbackPath)}`. Fix mínimo (2 linhas) num
componente compartilhado que corrige o TS2322 nos 4 arquivos de uma
vez só e restaura o comportamento de navegação pretendido — confirmado
via `tscheck-files.mjs` que o `TS2322` desapareceu das outras 3
páginas também (cada uma ainda tem erros pré-existentes não
relacionados, fora do escopo desta etapa).

Verificado: `tscheck-files.mjs` → 0 erros em `RolesPage.tsx`,
`BackButton.tsx` e `supabase-untyped.ts` (2 no programa inteiro,
pré-existentes/não relacionados). `check-eslint-baseline.mjs` → zero
regressão. Teste que mocka `BackButton`
(`tests/components/layout/MainLayout.breadcrumbs.test.tsx`) → 6/6
passando. `npm run typecheck:baseline` → zero regressão (917 vs.
baseline 928, 5 arquivos melhoraram: `RolesPage.tsx` + as 3 páginas
que ganharam o fix de `fallbackPath` + `BackButton.tsx`); `--update`
travou o ganho (928 → 917 erros, 403 → 400 arquivos).
