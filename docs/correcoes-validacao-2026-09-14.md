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
