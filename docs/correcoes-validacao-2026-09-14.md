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

## `src/pages/sicoob/PAWalletPage.tsx` (etapa 17, 7 → 0 erros — **3 bugs reais ao vivo em produção**, não drift de tipos)

Nenhuma das 3 causas raízes era drift comum de tipos gerados — todas
eram bugs genuínos que quebravam a feature de verba do PA em produção
há tempo indeterminado:

1. **Tabela errada em `budgetService.ts`**: `getBudgetByPa()` (única
   função realmente consumida, por `PAWalletPage.tsx` e
   `useSicoobBudget.ts`) consultava `supabase.from("sicoob_budgets")`
   — essa tabela **não existe** no banco (confirmado: zero ocorrência
   em `types.ts` gerado e zero migration que a crie). A tabela real é
   `pa_budgets` (colunas `verba_consumida`/`verba_total`/`limite_alcada`/
   `pa_id`, FK pra `postos_atendimento`) — o próprio
   `BudgetExceededBanner.tsx` já referenciava `budget.verba_consumida`/
   `budget.verba_total` corretamente, confirmando que esses são os
   nomes certos e que só o nome da tabela estava errado. Resultado em
   produção: toda consulta de verba sempre retornava `null`
   (`.maybeSingle()` contra tabela inexistente), `PAWalletPage`
   sempre mostrava R$ 0,00 em tudo, e `BudgetExceededBanner`
   (renderizado condicionalmente a partir do mesmo hook) **nunca
   disparava o alerta de verba estourada** — `if (!budget) return
   null;` sempre era `true`. Corrigido renomeando as 3 ocorrências de
   `"sicoob_budgets"` pra `"pa_budgets"` em `getBudgets()`,
   `getBudgetByPa()` e `updateBudget()` (as 3 únicas queries do
   arquivo); achado bônus ao corrigir `updateBudget()` (código morto,
   zero chamadores, mas já estava sendo tocado): também usava a coluna
   fictícia `used_amount` em vez da real `verba_consumida` — corrigido
   junto, mesmo fix, zero custo adicional.

2. **Campo inventado em `PAWalletPage.tsx`**: linha 114 lia
   `budget?.current_spent`, coluna que nunca existiu — o restante do
   mesmo arquivo (linhas 78-79) já usava corretamente
   `budget.verba_consumida`. Corrigido pro nome real, consistente com
   o resto do arquivo.

3. **`indicatorClassName` nunca implementado em `Progress`**
   (`src/components/ui/progress.tsx`): o componente compartilhado
   nunca aceitava essa prop — o indicador tinha `className` fixo
   (`"h-full w-full flex-1 bg-primary transition-all"`), sem nenhum
   jeito de sobrescrever a cor. Grep confirmou **5 arquivos** já
   passando `indicatorClassName` esperando que funcionasse
   (`PAWalletPage.tsx`, `PADashboardPage.tsx`,
   `WebVitalsPanel.tsx`, `SLABadge.tsx`,
   `OrderBudgetIntelligence.tsx`) — em todos, a barra de progresso
   nunca mudava de cor (ex.: nunca ficava vermelha acima de 90% de
   consumo de verba, nem em SLA estourado). Mesmo padrão do achado de
   `BackButtonProps.fallbackPath` desta mesma etapa: prop usada em
   múltiplos call-sites, nunca implementada no componente
   compartilhado. Corrigido adicionando
   `indicatorClassName?: string` à assinatura e aplicando via
   `cn(..., indicatorClassName)` no `ProgressPrimitive.Indicator`.
   Fix de 2 linhas que resolve o bug visual nos 5 arquivos de uma vez.

Verificado: `tscheck-files.mjs` → 0 erros em todos os 5 arquivos
tocados (9 no programa inteiro, não relacionados). Confirmado via
`tscheck-files.mjs` que o `TS2322` de `indicatorClassName` também
desapareceu dos outros 4 consumidores (`WebVitalsPanel.tsx`,
`SLABadge.tsx`, `OrderBudgetIntelligence.tsx`, `PADashboardPage.tsx`
— este último com 1 erro pré-existente não relacionado, fora do
escopo). `check-eslint-baseline.mjs` → zero regressão. Sem teste
dedicado (grep encontrou só falsos-positivos pela palavra
"progress"). `npm run typecheck:baseline` → zero regressão (897 vs.
baseline 917, 7 arquivos melhoraram); `--update` travou o ganho (917
→ 897 erros, 400 → 394 arquivos). **Não verificado em runtime** —
mesma limitação de acesso desta sessão (sem ambiente rodando pra
smoke-test visual), mas o fix é puramente de nomes reais confirmados
no schema gerado, sem lógica nova.

## `src/components/admin/categories/CategoriesManager.tsx` (etapa 17, 6 → 0 erros — abre o tier de 6 erros, drift de nulidade + tipagem solta em cascata)

1. **`Category` local com nulidade errada** (linha 49, `setCategories(data
   || [])`): a interface local declarava `sort_order: number`,
   `is_active: boolean` e `created_at?: string` (todos não-nuláveis),
   mas a tabela real `product_categories` (`types.ts`, linha 5951) tem
   `sort_order: number | null`, `is_active: boolean | null` e
   `created_at: string | null` — TS rejeitava a atribuição direta do
   retorno da query. Corrigido alargando os 3 campos pra bater com o
   schema real (`created_at` nunca é lido em nenhum outro ponto do
   arquivo — grep confirmou zero uso, então o alargamento não muda
   nenhum comportamento existente).

2. **`CategoryTreeDiagram.tsx` com `Category` própria e incompatível**
   (linha 303, `onEdit={(cat) => setEditingCategory(cat)}`): o
   componente compartilhado declarava sua própria interface `Category`
   local (`{id, name, slug, parent_id, [key: string]: any}`) — a
   assinatura de índice `[key: string]: any` não adiciona propriedades
   nomeadas ao tipo, então `cat` (inferido como essa `Category` "pobre")
   não tinha `description`/`sort_order`/`is_active` exigidos por
   `setEditingCategory` (que espera a `Category` completa de
   `CategoriesManager.tsx`). Corrigido tornando o componente genérico
   (`CategoryTreeDiagram<T extends TreeCategory>`, com `TreeCategory`
   contendo só os 4 campos que o componente realmente usa
   internamente) — agora `T` é inferido do `categories` passado pelo
   chamador, e `onEdit` devolve o tipo exato do chamador em vez de um
   tipo inventado. Sem outros consumidores do componente (grep
   confirmou uso único em `CategoriesManager.tsx`), zero risco de
   quebrar outro call site.

3. **`Partial<Category>` como estado de formulário** (linhas 359, 364,
   369, 423, dentro de `CategoryFormDialog`): o `formData` usava
   `useState<Partial<Category>>(...)` mesmo sempre inicializando com
   valores concretos (nunca `undefined`) — todo campo lido
   (`formData.name.trim()`, `validateSlug(formData.slug)`,
   `formData.sort_order < 0`, `value={formData.description}`) TS
   tratava como possivelmente `undefined`/`null`, embora o invariante
   real do componente garanta que não é. Mesmo padrão de bug de tipo já
   visto várias vezes nesta etapa (guarda estrutural que o TS não
   propaga). Corrigido com uma interface dedicada `CategoryFormData`
   (`{name: string; slug: string; description: string; parent_id:
   string | null; sort_order: number}`) — reflete exatamente o shape
   real do estado, sem optionals fantasmas — e `CategoryFormDialogProps.onSave`
   trocado de `(formData: any) => Promise<void>` pro tipo preciso
   `(formData: CategoryFormData) => Promise<void>`. `handleSave` (em
   `CategoriesManager`) também retipado de `Omit<Category, 'id' |
   'is_active'>` pra `CategoryFormData` diretamente — mais simples e
   sem depender do `Omit` genérico, já que o formulário nunca envia
   `is_active`.

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos tocados (15 no
programa inteiro, não relacionados). `check-eslint-baseline.mjs` →
zero regressão (drift positivo: 2 erros de lint eliminados de graça).
Sem teste dedicado pra `CategoriesManager.tsx`/`CategoryTreeDiagram.tsx`.
`npm run typecheck:baseline` → zero regressão (891 vs. baseline 897, 1
arquivo melhorou — só 1, não 2, porque `CategoryTreeDiagram.tsx` não
tinha erro próprio antes, só recebia o vazamento de tipo de quem o
chamava); `--update` travou o ganho (897 → 891 erros, 394 → 393
arquivos). **Não verificado em runtime** — mesma limitação de acesso
desta sessão, mas os 3 fixes são puramente de tipagem (nulidade real
do schema + generics), sem mudança de lógica de negócio.

## `src/components/admin/products/kit-components/VolumeValidation.tsx` (etapa 17, 6 → 0 erros)

Mesmo padrão de guarda estrutural já visto várias vezes nesta etapa
(`FocusTrap.tsx`, `useNewSupplierForm.ts`): `checkItemFits()` ordena
dois arrays de exatamente 3 elementos fixos (`[h, w, l].sort(...)` e
`[boxH, boxW, boxL].sort(...)`) e acessa os 3 índices — `.sort()`
preserva o tamanho do array, mas retorna `number[]`, então
`noUncheckedIndexedAccess` trata cada acesso por índice como `number |
undefined`, gerando 6 erros `TS2532` na mesma linha (2 arrays × 3
índices). Corrigido com asserção de não-nulo nos 6 pontos
(`dims[0]!`, `boxDims[0]!` etc.) — mesmo espírito das correções
anteriores, guarda de tamanho real e imutável do array que o TS não
consegue enxergar através de `.sort()`.

Verificado: `tscheck-files.mjs` → 0 erros (0 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Sem teste dedicado.
**Não verificado em runtime** — fix puramente de tipagem sem mudança
de lógica.

## `src/components/admin/products/ProductFormFullscreen.tsx` (etapa 17, 6 → 0 erros)

Dois bugs de tipagem independentes no mesmo arquivo, ambos sob
`noUncheckedIndexedAccess`:

1. **`STEPS[stepIndex] ?? STEPS[0]`** (linhas 276, 285 — TS18048): `STEPS`
   é um array literal const não-vazio (9 objetos `StepDef`), mas o `??`
   não elimina `undefined` do tipo porque ambos os operandos — o acesso
   indexado por `stepIndex` e o fallback `STEPS[0]` — são, cada um,
   `StepDef | undefined` sob `noUncheckedIndexedAccess`. TS não sabe que
   `STEPS[0]` é seguro para um array literal não-vazio. Corrigido com
   asserção de não-nulo no resultado final: `(STEPS[stepIndex] ??
   STEPS[0])!`.
2. **`flags.is_featured` / `flags.is_new` / `flags.is_on_sale` /
   `flags.is_active`** (linhas 383-384 — TS2322): `flags` é declarado
   como `Record<string, boolean>` (não uma interface com chaves
   nomeadas), então todo acesso por ponto vira `boolean | undefined`.
   Esse tipo largo **não é acidental**: `flags` é passado adiante para
   `ProductFormStepContent.tsx` → `ProductFlagsSection.tsx`, que faz
   acesso dinâmico por colchete (`flags[key]`, linha 72) dentro de um
   loop sobre uma configuração de flags — ou seja, o índice de string é
   genuinamente necessário no tipo compartilhado. Reduzir o tipo de
   `flags` na declaração quebraria esse consumidor dinâmico. Corrigido
   com asserção de não-nulo pontual apenas nos 4 usos de leitura direta
   dentro deste arquivo (`flags.is_featured!`, etc.), sem alterar o tipo
   compartilhado entre os três arquivos.

Verificado: `tscheck-files.mjs` → 0 erros (40 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Sem teste dedicado para
`ProductFormFullscreen.tsx` ou `ProductFlagsSection.tsx`.
**Não verificado em runtime** — fix puramente de tipagem sem mudança
de lógica; os 4 campos assertados (`is_featured`, `is_new`, `is_on_sale`,
`is_active`) são sempre inicializados com `?? false` duas dezenas de
linhas acima, então a asserção reflete uma garantia real do código.

## `src/components/collections/ExportCollectionButton.tsx` (etapa 17, 6 → 0 erros)

Mesmo padrão de `VolumeValidation.tsx`/`FocusTrap.tsx`/`useNewSupplierForm.ts`:
`const p = products[i];` dentro de `while (i < products.length)` é
`Product | undefined` sob `noUncheckedIndexedAccess`, apesar do laço
garantir que `i` está sempre dentro dos limites do array. Corrigido com
asserção de não-nulo: `products[i]!`.

Verificado: `tscheck-files.mjs` → 0 erros (14 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Sem teste dedicado.
**Não verificado em runtime** — fix puramente de tipagem sem mudança
de lógica.

## `src/components/command/GlobalCommandBar.tsx` + `commandActions.tsx` + `ThemeContext.tsx` (etapa 17, 6 → 0 erros)

Dois bugs de tipagem independentes:

1. **`grouped.quick` / `.navigation` / `.action` / `.settings` / `.help`**
   (TS2322): `grouped` era construído como `Record<string, CommandAction[]>`
   — a mesma classe de bug já vista em `ACTION_META`
   (`VoiceTranscriptPanel.tsx`): a anotação larga `Record<string, T>` faz
   todo acesso por ponto virar `T | undefined` sob
   `noUncheckedIndexedAccess`, mesmo a variável sendo inicializada com
   todas as chaves conhecidas. Corrigido substituindo o tipo por
   `Record<GroupKey, CommandAction[]>`, onde `GroupKey =
   Exclude<CommandAction["category"], "recent">` — um union fechado das
   5 categorias que de fato passam por `grouped` (categoria `"recent"` é
   tratada à parte via `recentActions`). O `forEach` que popula `g` ganhou
   um guard `if (a.category !== "recent")` para estreitar o tipo de
   `a.category` para `GroupKey` antes do acesso — sem esse guard, TS não
   permite `g[a.category]` porque `a.category` ainda incluiria
   `"recent"`, que não existe em `g`.
2. **`buildActions({ ..., setTheme, ... })`** (TS2322 — `(theme: Theme) =>
   void` não atribuível a `(t: string) => void`): `BuildActionsParams.
   setTheme` em `commandActions.tsx` estava tipado com o parâmetro
   solto `string`, mas o `setTheme` real vem de `useTheme()`
   (`ThemeContext.tsx`) e é `(theme: Theme) => void` com `Theme = 'light'
   | 'dark' | 'auto'`. Contravariância de parâmetros de função torna essa
   atribuição insegura de verdade (o código de `buildActions` só chama
   `setTheme` com `'light'`/`'dark'` literais, mas o tipo declarado
   permitia qualquer string). Corrigido exportando `Theme` de
   `ThemeContext.tsx` (`export type Theme = ...`) e usando-o em
   `BuildActionsParams.setTheme: (t: Theme) => void` — fix de causa raiz,
   não supressão.

Verificado: `tscheck-files.mjs` → 0 erros (11 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. **Teste dedicado existe**
(`tests/components/command/GlobalCommandBar.test.tsx`) — 2/2 passaram
após a mudança.

## `src/components/mockup/TechniqueTooltip.tsx` (etapa 17, 6 → 0 erros)

Mesma classe de bug de `ACTION_META` (`VoiceTranscriptPanel.tsx`) e
`grouped` (`GlobalCommandBar.tsx`): `TECHNIQUE_INFO` era declarado como
`Record<string, {...}>`. O acesso por ponto `TECHNIQUE_INFO.default`
(usado como fallback em `getTechniqueInfo` quando nenhuma técnica bate
com o `code`) virava `{...} | undefined` sob `noUncheckedIndexedAccess`,
mesmo `default` sendo uma chave sempre presente no objeto literal —
isso propagava `undefined` para o tipo de retorno de `getTechniqueInfo`
e, por consequência, para `info` em todo o componente (6 usos).
Corrigido trocando a anotação larga por um union fechado das 9 chaves
literais reais (`TechniqueInfoKey`), sem alterar a lógica do
`for...of Object.entries(...)` que já funcionava corretamente com
tipos concretos. `getTechniqueInfo` não é usado fora deste arquivo
(confirmado via grep).

Verificado: `tscheck-files.mjs` → 0 erros (0 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Sem teste dedicado.
**Não verificado em runtime** — fix puramente de tipagem sem mudança
de lógica.

## `src/components/navigation/Breadcrumbs.tsx` (etapa 17, 6 → 0 erros)

Mesmo padrão de `ExportCollectionButton.tsx`: `const segment =
segments[i];` dentro de `for (let i = 0; i < segments.length; i++)` é
`string | undefined` sob `noUncheckedIndexedAccess`, apesar do laço
garantir os limites. Isso propagava `undefined` para os 3 usos
seguintes de `segment` (regex de detecção de UUID/ID numérico,
`segment.slice(0, 8)`, e `routeLabels[segment]` — este último gerando
TS2538 porque `undefined` não pode ser usado como índice). Corrigido
com asserção de não-nulo: `segments[i]!`.

Verificado: `tscheck-files.mjs` → 0 erros (11 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. **Teste dedicado existe**
(`tests/components/layout/MainLayout.breadcrumbs.test.tsx`) — 6/6
passaram após a mudança.

## `src/components/notifications/NotificationsBadgeStatsPanel.tsx` + `useNotificationsMetricsPanel.ts` (etapa 17, 6 → 0 erros)

Diferente dos casos anteriores, aqui os erros de TS apontavam para
**3 bugs reais de runtime**, não apenas lacunas de tipagem — o painel
de debug (`debugOn && ...`, visível para dev/admin) quebraria ao
renderizar em pelo menos dois pontos:

1. **`sparkStats.min` / `sparkStats.max` inexistentes** (TS2339):
   `useNotificationsMetricsPanel.ts` calculava `{ avg, peak, latest }`,
   mas o componente lia `sparkStats.min.toFixed(2)` e
   `sparkStats.max.toFixed(2)`. `min` nunca foi calculado em nenhum
   momento — não é só um erro de nome, é uma métrica ausente. Em
   runtime, `sparkStats.min` seria `undefined` e `.toFixed(2)` geraria
   `TypeError: Cannot read properties of undefined`, quebrando a
   sparkline inteira sempre que `debugOn` estivesse ativo com pelo
   menos 1 amostra. Corrigido adicionando `min: Math.min(...ratios)` de
   verdade e renomeando `peak` → `max` (grep confirmou que `sparkStats.
   peak`/`.latest` não são usados em nenhum outro arquivo — troca seguro).
2. **`streakTrend.direction` perdendo o tipo literal** (TS2322 ao
   passar `streakTrend` para `<SuspiciousWarning streakTrend={...}>`):
   o `useMemo` de `streakTrend` tem 3 branches de retorno; as duas
   primeiras (`streakStartIdx < 0` e `window.length < 3`) escreviam
   `direction: "flat"` sem contexto de tipo, e o TS alarga (widen) para
   `string` na ausência de anotação — só a 3ª branch tinha `direction`
   pré-tipado via `const direction: "rising"|"flat"|"falling" = ...`.
   O tipo inferido da união das 3 branches ficava incompatível com o
   prop `streakTrend: { direction: "rising"|"flat"|"falling"; ... }`
   exigido por `SuspiciousWarning.tsx`. Corrigido extraindo um tipo
   `StreakTrend` (mesmo formato exato do prop de `SuspiciousWarning`) e
   anotando `useMemo<StreakTrend>(() => {...})` — a anotação de retorno
   dá contexto de tipo para as 3 branches, eliminando o widening sem
   tocar em nenhuma lógica.
3. **`snapshot.topContributors` nunca existiu** (TS2339 + TS2339 em
   cascata ao desestruturar `{ triggers, fetches }` de `unknown`): a
   seção "Top Contributors" do painel fazia
   `Object.entries(snapshot.topContributors)` — mas o tipo `Snapshot`
   (`src/lib/notifications-metrics.ts`) nunca teve esse campo; não é
   drift de schema, é um campo que nunca foi implementado no módulo de
   métricas. Em runtime, `Object.entries(undefined)` lança
   `TypeError: Cannot convert undefined or null to object` — a seção
   quebraria 100% das vezes que fosse renderizada. `Snapshot` já expõe
   `coalescingByTrigger: Record<TriggerSource, { triggers, fetches,
   saved, efficiency }>`, com exatamente os campos `triggers`/`fetches`
   por fonte que a UI consome e ordena por `fetches` — é semanticamente
   o que "Top Contributors" deveria mostrar (qual fonte de trigger mais
   contribui para fetches). Corrigido trocando `snapshot.topContributors`
   por `snapshot.coalescingByTrigger`, sem alterar o restante do JSX
   (sort/map já compatíveis com o formato real).

Verificado: `tscheck-files.mjs` → 0 erros (9 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão (2 arquivos). Sem teste
dedicado. **Não verificado em navegador** (painel só renderiza com
`debug:notifications=1` no localStorage ou em dev) — mas os 3 fixes
eliminam `TypeError`s garantidos que antes só não apareciam porque o
código nem compilava sob o baseline de tipos estrito.

## `src/components/pricing/calculator/QuantityComparisonTable.tsx` (etapa 17, 6 → 0 erros)

**Bug real de produção, não apenas tipagem** — a tabela de comparação de
preços por quantidade (visível em `/simulador`, página com badge
"Popular" no command bar) estava **sempre exibindo "N/D" em todas as
células**, para toda técnica e toda quantidade, desde sempre. Causa
raiz: `useCustomizationPricing()` (`useTecnicasUnificadas.ts:100`)
retorna `priceTables: []` — um array vazio hardcoded, comentado como
"Legado - não mais usado" no próprio hook. `QuantityComparisonTable.tsx`
não sabia disso e fazia `priceTables.find(t => t.table_code...)` para
tentar casar a técnica selecionada com uma tabela de preço por
correspondência difusa de string — busca que nunca encontrava nada
porque o array de origem está permanentemente vazio, então
`calculateForConfig` sempre retornava `null`. Os 6 erros de TS (`t` no
`.find()` inferido como `never`, já que `[]` sem anotação vira
`never[]`) eram, na prática, o compilador apontando para um caminho de
código morto.

O hook já expõe `calculatePrice(techniqueCode, quantity)` — que faz
exatamente esse casamento, mas contra os dados reais e atuais
(`tabelas` via `useTabelasPreco`), usando `techniqueCode` exato em vez
de correspondência difusa de texto. E `technique.techniqueCode` já
está disponível diretamente em `SelectedTechniqueConfig.technique`
(`types.ts`), sem precisar de nenhuma tabela intermediária. Corrigido
eliminando o `priceTables.find(...)` fuzzy-match morto e chamando
`calculatePrice(technique.techniqueCode, quantity)` diretamente; o
`price_by_color` (usado para o adicional de +10% por cor extra) passou
a vir de `techniques.find(t => t.code === technique.techniqueCode)
?.priceByColor` — mesmo dado, já exposto por `useCustomizationPricing()`
via `techniques: calc.techniques`.

Verificado: `tscheck-files.mjs` → 0 erros (40 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. **Teste dedicado existe**
(`tests/components/pricing/QuantityPriceCalculator.test.tsx`) — 2/2
passaram após a mudança. **Não verificado em navegador** — mudança de
comportamento real (a tabela deve passar a mostrar preços em vez de
"N/D"), recomenda-se validação visual em `/simulador` quando possível.

## `src/components/products/customization/VariationSelector.tsx` (etapa 17, 6 → 0 erros)

**Falso positivo de tipagem, sem bug de runtime** — os 6 erros eram
todos a mesma causa raiz repetida: `variations[0]` é tipado
`PrintAreaV2 | undefined` por causa do `noUncheckedIndexedAccess`, mas
os dois pontos de acesso (linha 25, dentro do `useEffect` de
auto-seleção; linha 31, no branch `if (variations.length === 1)`) só
executam quando `variations.length === 1` já foi verificado
explicitamente — o índice 0 é estruturalmente garantido pelo guard,
algo que o TS não consegue inferir a partir de `.length === 1`. Sem
essa garantia estrutural o array poderia legitimamente estar vazio (daí
o compilador não assumir por padrão). Os outros 4 erros (linhas 32, 49
×2, 55 ×2) eram consequência em cascata de `const area = variations[0]`
carregar o `| undefined` adiante.

Corrigido com asserção não-nula (`variations[0]!`) nos dois pontos de
indexação, já que o guard de `.length === 1` que os envolve garante a
existência do elemento — não há caminho de execução em que `area` seja
de fato `undefined` nesses branches.

Verificado: `tscheck-files.mjs` → 0 erros (14 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Nenhum teste dedicado
encontrado para este componente (nem referência em outros testes).

## `src/hooks/bi/useClientSeasonality.ts` (etapa 17, 6 → 0 erros)

**Falso positivo de tipagem, sem bug de runtime** — dois padrões de
`noUncheckedIndexedAccess` já vistos nesta etapa: (1) `MONTH_LABELS[m -
1]` — array de 12 posições, acessado dentro de loops `for (let m = 1; m
<= 12; m++)`, então o índice `m - 1` está sempre em `0..11`,
estruturalmente válido; (2) em `buildIndustryCells`, `monthly[m]` é um
`Record<number, T>` preenchido explicitamente para todo `m` de 1 a 12
num loop anterior (linha 119-121), mas o TS não consegue provar isso
num segundo loop independente sobre o mesmo range. Ambos corrigidos com
asserção não-nula (`!`) nos 3 pontos de acesso — não há caminho de
execução em que os valores sejam de fato `undefined`.

Verificado: `tscheck-files.mjs` → 0 erros (10 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Nenhum teste dedicado
encontrado.

## `src/hooks/gravacao/useTecnicasGravacao.ts` (etapa 17, 6 → 0 erros)

**Mistura de dois casos: acesso genuinamente opcional + bug real de
tipagem.** `InvokeResult<T>` (`external-db/invoke.ts`) declara
`records?: T[]` e `count?: number | null` como **genuinamente
opcionais** — respostas de uma ponte HTTP externa (`external-db-bridge`)
podem legitimamente vir sem esses campos em cenários de erro parcial,
diferente dos outros casos desta etapa onde a garantia era estrutural.
Corrigido com fallbacks defensivos (`?? []`, `?? 0`, `?.[0]`,
`?? undefined`) em vez de asserção não-nula, nos 4 pontos de uso em
`useTecnicasGravacao()` e `useTecnicaGravacao(id)`.

Ao corrigir esses acessos, um **bug real de tipagem foi exposto**: a
query da tabela `tecnica_gravacao_variante` em `useTecnicaGravacao(id)`
usava o genérico `invokeExternalDb<TecnicaGravacao>` — tipo da tabela
*pai* (`tecnica_gravacao`), não da tabela de variantes
(`tecnica_gravacao_variante`) que estava sendo de fato consultada. O
erro só ficou visível depois dos fallbacks acima, quando o TS pôde
finalmente comparar o tipo do array retornado contra
`TecnicaGravacaoWithVariantes.variantes: TecnicaGravacaoVarianteRaw[]`.
Corrigido trocando o genérico para `TecnicaGravacaoVariante` (=
`TecnicaGravacaoVarianteRaw`, já exportado por
`types/gravacao-database.ts`). Sem esse fix, o objeto retornado por essa
query teria o *shape* de execução correto (o bridge devolve o que o
banco tem, independente do genérico TS) mas o autocomplete/tipagem para
quem consome `variantes` estaria mentindo sobre os campos disponíveis.

Verificado: `tscheck-files.mjs` → 0 erros (14 no programa inteiro).
`check-eslint-baseline.mjs` → zero regressão. Nenhum teste dedicado
encontrado.

## `src/hooks/useQuoteBuilderState.ts` + `useQuoteTemplates.ts` + `quote/useQuoteInitialization.ts` (etapa 17, 6 → 0 erros)

**Dois bugs reais de UX escondidos atrás de erros de tipagem, não falsos positivos.**

**Bug A — tags do orçamento nunca restauradas ao editar.** A interface
`InitParams.setters` em `useQuoteInitialization.ts` já declarava
`setTags: (v: string[]) => void` como obrigatória, mas (1) o efeito de
carregamento (`fetchQuote(quoteId).then(...)`) nunca a invocava, e (2)
`useQuoteBuilderState.ts` nem sequer passava `setTags` no objeto
`setters` — apesar de `const [tags, setTags] = useState<string[]>([])`
já existir no mesmo arquivo e `Quote.tags?: string[]` existir no tipo.
Resultado real de produção: ao abrir um orçamento existente para edição,
as tags salvas eram descartadas silenciosamente e o campo de tags
sempre iniciava vazio. Corrigido adicionando `if (quote.tags)
setters.setTags(quote.tags);` ao efeito, e incluindo `setTags` no
objeto `setters` passado por `useQuoteBuilderState.ts`.

**Bug B — `QuoteTemplateItem`/`QuoteTemplatePersonalization` com tipos
defasados em relação ao shape real persistido.** `getTemplateItems()`
(lado de escrita, mesmo arquivo) já monta e salva objetos com
`productSku`, `productImageUrl`, `colorName`, `colorHex`, `techniqueId`,
`techniqueName`, `colorsCount`, `positionsCount` — mas os tipos em
`useQuoteTemplates.ts` nunca declaravam esses campos, então
`applyTemplate` (lado de leitura, mesmo arquivo) não compilava ao lê-los
de volta. Corrigido estendendo `QuoteTemplateItem` e
`QuoteTemplatePersonalization` com esses campos opcionais, mantendo a
assinatura de índice `[key: string]: unknown` existente. Como
`QuoteItemPersonalization.technique_id` é obrigatório (`string`) e a
origem passa a ser `string | undefined`, adicionado fallback `|| ""` em
`technique_id: p.techniqueId || ""` em `applyTemplate`, seguindo o
padrão já usado no mesmo bloco (`product_id: item.productId || ""`).

Verificado: `tscheck-files.mjs` → 0 erros nos 3 arquivos (819 no
programa inteiro). `check-eslint-baseline.mjs` → zero regressão. Teste
dedicado `tests/hooks/useQuoteTemplates.test.tsx` → passou (1/1).
Baseline de typecheck do projeto atualizado: 825 → 819 erros (382 → 381
arquivos).

## `src/hooks/useReplenishments.ts` (etapa 17, 6 → 0 erros)

**Mesmo padrão de `useTecnicasGravacao.ts`: `InvokeResult<T>.records` genuinamente
opcional.** Todos os 6 erros eram acessos diretos a `.records` (via
`invokeExternalDb`) sem considerar que o campo é opcional na resposta da
ponte HTTP externa. Corrigido com fallback `?? []` em 5 pontos e
`?.[0]` em 1 ponto (`supResult.records?.[0]?.name`), sem nenhuma
mudança de comportamento — os dados sempre estavam presentes em
operação normal, o fallback só cobre o cenário de resposta parcial já
tratado em `useTecnicasGravacao.ts`.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão. Testes dedicados `tests/hooks/useReplenishments.test.ts`
+ `tests/hooks/useReplenishmentsSelectionMode.test.ts` → passaram
(23/23).

## `src/hooks/useSecretsManager.ts` (etapa 17, 6 → 0 erros)

**Peculiaridade real do compilador TypeScript, não bug de lógica** —
isolada e confirmada via reprodução mínima (`unknown ?? null` sozinho,
fora de qualquer contexto deste arquivo, já produz o tipo `{} | null`
em vez de `unknown | null`, porque o operador `??` remove `null`/
`undefined` de `unknown` mas o "resto" que sobra é tipado como `{}`, não
`unknown`). Os 6 erros vinham de `data?.previous_suffix ?? null`,
`data?.masked_suffix ?? null` e `data?.length ?? value.length`, onde
`data` tem um índice `[k: string]: unknown` para campos não
tipados explicitamente. Corrigido com `as` explícito antes do `??`
(`(data?.previous_suffix as string | null | undefined) ?? null`),
seguindo o mesmo idioma já usado na linha seguinte do próprio arquivo
(`data?.secret as SecretStatus | undefined`). Nenhuma mudança de
comportamento — os campos sempre vieram como `string | null` / `number`
do edge function `secrets-manager` quando a operação é bem-sucedida,
conforme o contrato já declarado em `SecretMutationResult`.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão (drift positivo: 1 erro de lint eliminado). Nenhum
teste dedicado encontrado.

## `src/hooks/useSwipeBack.ts` (etapa 17, 6 → 0 erros)

**Bug real de design exposto pela tipagem, não falso positivo.** O
código usava `(touchStartRef as any).current_y = ...` para pendurar uma
propriedade extra (`current_y`) diretamente no objeto do ref do React
— que deveria conter apenas `{ current: number | null }` — e depois lia
essa mesma propriedade sem nenhum cast (`touchStartRef.current_y`),
gerando `TS2551: Property 'current_y' does not exist...`. Isso só
"funcionava" em runtime porque escrita e leitura acessavam o mesmo
objeto JS dinamicamente tipável, mas é um antipadrão frágil (qualquer
lib de swipe/gesto real usaria um ref dedicado ou um objeto `{x, y}`).
Corrigido substituindo o hack por um segundo ref tipado
(`touchStartYRef = useRef<number | null>(null)`), resetado junto com os
demais. Os outros 5 erros eram `noUncheckedIndexedAccess` genuíno em
`e.touches[0]`/`e.changedTouches[0]` (eventos de toque podem, em teoria,
chegar com listas vazias) — corrigidos com guards de existência
(`if (!touch) return;`) em vez de asserção não-nula, por ser handler de
gesto de UI onde uma lista vazia deve simplesmente ser ignorada, não
forçada.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão. Nenhum teste dedicado encontrado.

Baseline de typecheck do projeto atualizado: 819 → 801 erros (381 → 378
arquivos).

## `src/lib/personalization/repositories/priceTable.repository.ts` (etapa 17, 6 → 0 erros)

**Mesmo padrão já visto em `useTecnicasGravacao.ts`/`useReplenishments.ts`:**
`InvokeResult<T>.records?: T[]` é genuinamente opcional no bridge de BD
externo (`invokeExternalDb`), então 5 dos 6 erros eram `TS2532`/`TS18048`
em `result.records` acessado sem fallback — corrigidos com
`result.records ?? []` (em `findAll`, `findTechniqueNames`,
`findTableCodes`) e `result.records?.[0]` (em `findById`,
`findByCodeOption`). O 6º erro era `noUncheckedIndexedAccess` em
`findBestMatch()`, na linha `tabelaAdequada = tabelas[tabelas.length - 1]`:
estruturalmente seguro porque a função já faz `if (tabelas.length === 0)
return null;` antes, garantindo `tabelas.length >= 1` — corrigido com
asserção não-nula (`!`), não com guard redundante.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão. Nenhum teste dedicado encontrado.

## `src/lib/security/rls-denial-logger.ts` (etapa 17, 6 → 0 erros)

**Incompatibilidade de tipo entre fallback `?? null` e a assinatura
gerada da RPC.** A RPC `log_rls_denial` (ver
`src/integrations/supabase/types.ts`, linhas 10204-10218) declara todos
os parâmetros opcionais como `string | undefined` — nunca `string | null`
(ex.: `p_endpoint?: string`, `p_error_code?: string`). O código original
usava `?? null` / ternário `: null` para os campos ausentes, produzindo
`string | null`, incompatível com `string | undefined`. Corrigido
trocando todos os fallbacks de `null` para `undefined` — comportamento
idêntico, já que `supabase.rpc()` serializa os parâmetros via
`JSON.stringify`, que omite chaves com valor `undefined`, deixando o
Postgres aplicar o `DEFAULT NULL` de cada parâmetro. `p_error_code` e
`p_error_message` não estavam entre os 6 erros originalmente apontados
(porque `PostgrestError.code`/`.message` são `string` não-nulável, então
o TS simplifica `string ?? null` para `string`), mas foram trocados
junto por consistência no mesmo bloco de edição — sem efeito de
comportamento.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão. Nenhum teste dedicado encontrado.

## `src/pages/advanced-price-search/ResultViews.tsx` (etapa 17, 6 → 0 erros)

**Bug real: propriedade inexistente, não só tipo desatualizado.** O
componente usava `product.image` em 3 lugares (`ProductCardResult`,
`ProductTableResult`, `ProductListResult`), mas `Product` (em
`src/types/product-catalog.ts`) nunca teve campo `image` — sempre foi
`images: string[]`. Isso quer dizer que a miniatura do produto nunca
apareceu nessas 3 views (sempre caía no fallback do ícone `Package`),
um bug visual silencioso desde que o componente foi escrito. Corrigido
para `product.images[0]`, seguindo a mesma convenção já usada em todo o
resto do app (`ProductsManager.tsx`, `RelatedProducts.tsx`,
`ProductListItem.tsx`, etc.) — os 6 erros eram `TS2551: Property
'image' does not exist... Did you mean 'images'?`, um a mais do que os
3 sites porque o TS aponta tanto a condição quanto o uso no `src=`.

Verificado: `tscheck-files.mjs` → 0 erros. `check-eslint-baseline.mjs`
→ zero regressão. Nenhum teste dedicado encontrado.

Baseline de typecheck do projeto atualizado: 801 → 783 erros (378 → 375
arquivos).

## `src/pages/product-detail/ProductDetailHero.tsx` (etapa 17, 6 → 0 erros)

**3 causas diferentes, uma delas com achado bônus em cascata:**

1. `product.video` — campo que **nunca existiu** no tipo `Product`
   (`src/types/product-catalog.ts`): sempre foi `productVideos?: ProductVideo[]`
   (array), nunca um `video?: string` singular (esse campo só existe em
   `KitComponent`, tipo diferente). Em runtime `product.video` sempre foi
   `undefined`, então a prop nunca teve efeito — código morto desde que foi
   escrito. Removida a prop (já opcional em `ProductGallery`).
2. `product.category` (`{ id: string | number; name: string }`) passado pra
   `ProductCategoryBadges`, que espera `Category` (`src/data/mockData.ts`,
   `id: number`) — drift de tipo: categorias reais vêm do BD com UUID
   (`string`), o mock legado assumia IDs numéricos sequenciais. Corrigido
   alargando `Category.id` pra `number | string` na fonte (`mockData.ts`) —
   único consumidor do tipo é `ProductCategoryBadges.tsx`, que só usa `id`
   como `key`, em interpolação de string e em `===`, nunca aritmeticamente,
   então o alargamento é seguro. **Achado bônus**: a mesma correção zerou de
   graça o erro idêntico e pré-existente em `ProductCard.tsx:249` e reduziu
   `ProductQuickView.tsx:281` (ambos passavam `product.category` pro mesmo
   componente) — nenhum dos dois fazia parte do lote desta etapa, ficam mais
   leves como efeito colateral correto da correção na raiz.
3. `hasCommercialPackaging`/`packingType`/`repackingType`/`packagingContext`
   — os 4 campos são opcionais (`?:`) em `Product`, então o tipo inferido
   inclui `undefined`, mas `PackagingBadgeProps` (single consumer, só usado
   aqui) só aceita `| null`. Corrigido com `?? null` nos 4 pontos, único call
   site do componente.

Verificado: `tscheck-files.mjs` → 0 erros no arquivo (mais os 2 bônus
reduzidos em `ProductCard.tsx`/`ProductQuickView.tsx`, não zerados — fora do
escopo, erros remanescentes são de outra causa). `check-eslint-baseline.mjs`
→ zero regressão. Teste dedicado `ProductDetailHero.priceFreshness.test.tsx`
→ 5/5 passou.

Baseline de typecheck do projeto atualizado: 783 → 774 erros (375 → 373
arquivos).

## QuoteBitrixSync.ts (etapa 17)

6 erros TS, todos com a mesma raiz de tipo `Quote` (`src/hooks/quotes/quoteTypes.ts`)
sendo mais permissivo do que o uso real da função:

1. `quote.id` é opcional (`id?: string`) em `Quote` — faz sentido pro tipo
   genérico (cobre orçamento ainda não salvo), mas `syncQuoteToBitrix` só é
   chamada a partir de `useQuoteViewData.ts::handleSyncBitrix`, sobre um
   orçamento já carregado do BD por id (sempre com `id` definido em tempo de
   execução). Corrigido com guard-clause no topo da função
   (`if (!quote.id) return { success: false }`) que produz uma constante
   local `quoteId: string` estreitada, usada nos 6 sites que antes recebiam
   `quote.id` diretamente (2 `logQuoteHistory`, 1 template de filename, 1
   storage path, 1 `.eq("id", ...)`, mais 1 `logQuoteHistory` de sucesso) —
   elimina os 4 `TS2345` (linhas 69, 104, 117, 120) e o `TS2532` (linha 76,
   `.replace()` sobre `quote.quote_number || quote.id` que podia ser
   `undefined`).
2. `TS2322` na linha 129 (`updatedQuote: Partial<Quote>`) — `bitrix_quote_id`
   é `string | null` na coluna real do BD (confirmado em
   `src/integrations/supabase/types.ts:7116`) e portanto `string` no tipo de
   domínio `Quote`, mas o código montava `bitrixQuoteIdFromResponse` como
   `number` (via `Number(result.quote_id)`) e atribuía direto tanto em
   `crmUpdates.bitrix_quote_id` (update no Supabase) quanto no retorno
   `updatedQuote.bitrix_quote_id`. Corrigido convertendo com `String(...)`
   nos dois pontos de atribuição — mantém a validação numérica
   (`!isNaN`) que já existia, só ajusta o tipo na borda de saída.

Verificado: `tscheck-files.mjs` → 0 erros no arquivo (42 → 36 no programa
inteiro). `check-eslint-baseline.mjs` → zero regressão. Nenhum teste
dedicado encontrado para este arquivo.

Baseline de typecheck do projeto atualizado: 774 → 768 erros (373 → 372
arquivos).

## useQuotesDashboard.ts (etapa 17)

6 erros TS, 2 causas de drift entre o tipo de domínio `Quote`
(`src/hooks/quotes/quoteTypes.ts`) e o schema real do BD
(`src/integrations/supabase/types.ts`):

1. `total_cost` (linhas 100, 126) — coluna real `quotes.total_cost: number
   | null` existe no BD (usada pro cálculo de lucro bruto/margem do
   dashboard) mas nunca foi declarada no tipo de domínio `Quote` — drift de
   schema, mesma categoria dos achados de `total_cost`/`use2FA.ts` em
   etapas anteriores. Corrigido adicionando `total_cost?: number | null` ao
   `Quote` (fonte, não cast pontual). **Achado bônus**: a mesma adição
   zerou de graça 1 erro idêntico pré-existente em
   `QuoteKanbanBoard.tsx:454` (`quote.total_cost || 0`), fora do escopo
   desta etapa.
2. `created_at` (linhas 91, 110, 120) — `Quote.created_at?: string` é
   opcional no tipo de domínio (correto: cobre orçamento em memória ainda
   não persistido, ex. `Partial<Quote>` durante criação), mas a coluna real
   é `NOT NULL` e os `quotes` consumidos aqui vêm 100% de
   `useQuotes()`/`QuoteService.list()` — sempre linhas já persistidas.
   Corrigido com asserção de não-nulo (`q.created_at!`) nos 3 usos dentro
   de `new Date(...)`/`format(...)`, sem alargar nem estreitar o tipo
   compartilhado (que precisa continuar opcional pros outros consumidores
   que lidam com orçamento em criação).
3. Linha 216 — `q.quote_number || q.id` no export de PDF podia resultar em
   `string | undefined` (ambos opcionais em `Quote`) passado pra
   `RowInput` do `jspdf-autotable`, que não aceita `undefined`. Corrigido
   com fallback final `|| ""` (nunca dispara na prática — mesmo raciocínio
   de "sempre populado" do item 2 — mas evita literal `"undefined"` na
   tabela caso algum dia não esteja).

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos (34 → 28 no
programa inteiro, medido antes do merge abaixo). `check-eslint-baseline.mjs`
→ zero regressão (referência já em `518a816b6`, confirmando que o push
anterior chegou). Nenhum teste dedicado encontrado.

**Nota**: entre a validação acima e o commit, `origin/main` avançou com o
PR externo `#12` ("Reconcilia contratos, protege passkeys e torna regras de
grupo atômicas", commit `9bf9b2554`), que regenerou
`src/integrations/supabase/types.ts` e trouxe outras melhorias de tipo não
relacionadas a esta etapa. Fast-forward local limpo (sem conflito nos
arquivos desta correção), `npm install` pra sincronizar `package-lock.json`,
e reconfirmado `tscheck-files.mjs` → 0 erros nos 2 arquivos contra o
`types.ts` novo antes de recomputar o baseline global. Baseline de
typecheck do projeto atualizado pra refletir o estado combinado (esta
correção + PR #12): 746 erros em 368 arquivos.

## SicoobReportsPage.tsx (etapa 17)

3 erros de tipo, causas independentes:

1. Linha 105 — `o.total_amount.toLocaleString(...)` no export de PDF.
   `total_amount` é `number | null` na tabela real `sicoob_orders`, mas
   tratado como sempre-presente. Corrigido com fallback `(o.total_amount ||
   0)`, mesmo padrão já usado no cálculo de `totalSpent` (linha 78) do
   próprio arquivo.
2. Linha 112 — `headStyles: { fillStyle: 'fill', fillColor: [...] }` na
   chamada de `autoTable`. `fillStyle` não existe no tipo `Partial<Styles>`
   do `jspdf-autotable` (confirmado em `node_modules/jspdf-autotable/dist/
   index.d.ts`) — provável confusão com a propriedade `fillStyle` da API
   Canvas do browser. Removido: não tinha efeito funcional real, já que
   `fillColor` já define a cor de preenchimento do cabeçalho da tabela.
3. Linha 288 — `<OrderStatusBadge status={order.status} />`. A coluna
   `status` de `sicoob_orders` é `string` solto no banco (sem enum/check
   constraint refletido no `types.ts`), mas o componente `OrderStatusBadge`
   exige `status: OrderStatus` (união fechada de 9 valores em
   `@/types/sicoob/orders.ts`). Corrigido com cast `order.status as
   OrderStatus` — mesmo padrão de confiança já usado em
   `services/sicoob/orderService.ts:191` (`currentStatus as OrderStatus`),
   já que todo o app assume os valores da coluna como membros da união
   (`ORDER_STATUS_CONFIG`, `SICOOB_VALID_TRANSITIONS`).

Verificado: `tscheck-files.mjs` → 0 erros no arquivo (12 → 9 no programa
inteiro). `check-eslint-baseline.mjs` → zero regressão (referência já em
`bee873b314`, confirmando que o push anterior chegou). Nenhum teste
dedicado encontrado para esta página. Baseline de typecheck do projeto
atualizado: 746 → 743 erros (368 → 367 arquivos).

## OrderService.ts + src/types/orders.ts (etapa 17)

6 erros de tipo, 3 causas independentes:

1. Linhas 126, 132 — `OrderInvoice` (tipo hand-written em `src/types/orders.ts`)
   nunca correspondeu à tabela real `order_invoices`: campos inventados
   `file_url`/`total_amount` (nulável) vs. reais `pdf_url`/`xml_url`/`amount`
   (NOT NULL)/`status`/`serie`/`issue_date`/`due_date`/`notes`/`created_by`/
   `updated_at` (confirmado em `src/integrations/supabase/types.ts:4998`).
   Corrigido reescrevendo `OrderInvoice` pra bater com o schema real.
   **Achado bônus de código morto confirmado**: `OrderService.listInvoices`/
   `addInvoice` não têm NENHUM chamador em todo o app (`grep` de
   `OrderService.listInvoices\|OrderService.addInvoice` não retornou nada).
   A UI real de notas fiscais (`OrderInvoicesManager.tsx`,
   `OrderInvoicesTab.tsx`) usa o hook `useOrderInvoices.ts`, que consulta
   diretamente a tabela `sicoob_order_invoices` (schema totalmente
   diferente) via `supabase.rpc('add_sicoob_order_invoice', ...)`. Ou seja,
   `order_invoices`/`OrderInvoice`/`listInvoices`/`addInvoice` formam um
   sistema de NF paralelo, nunca conectado a nenhuma tela — não removido
   nesta etapa (fora do escopo de "zerar erro de tipo", risco de deletar
   contrato que outro agente/PR possa estar prestes a conectar), mas
   sinalizado aqui pra quem for revisar arquitetura de notas fiscais.
   `addInvoice(orderId, values: Partial<OrderInvoice>)` ainda falhava o
   overload de `insert` mesmo com o tipo corrigido, porque `Partial<...>`
   torna `invoice_number`/`amount` (únicos campos NOT NULL sem default)
   opcionais — corrigido com `Partial<OrderInvoice> & Pick<OrderInvoice,
   "invoice_number" | "amount">`.
2. Linhas 356, 382 — `duplicate()` desestruturava `{ order: original, items
   }` do retorno de `getById()` (que pode ser `null`) ANTES do guard
   `if (!original) throw ...`, que na verdade checava o campo interno, não
   o objeto. TypeScript corretamente rejeitava a desestruturação direta de
   um tipo `{...} | null`. Corrigido: `const result = await
   this.getById(orderId); if (!result) throw ...; const { order: original,
   items } = result;`. **Achado bônus**: essa mesma correção zerou de graça
   o erro em cascata na linha 382 (`it` implícito `any` no
   `.map()` de `items`) — sem o guard, o TS não conseguia propagar o tipo
   `OrderItem[]` através da desestruturação de um tipo unido a `null`.
3. Linha 504 — `convertQuoteToOrder` retornava `order` (do
   `.select("id, order_number, status, total").single()`, onde `total:
   number | null` reflete a coluna real) diretamente como `ConvertedOrder`,
   que exige `total: number`. Na prática o valor nunca é `null` nesse call
   site (`quote.total` é `NOT NULL` em `Quote` e é o valor inserido —
   linha 468), mas o tipo da coluna no BD permite `null` por design mais
   amplo. Corrigido com fallback `total: order.total ?? 0` no retorno, sem
   alargar `ConvertedOrder` (único consumidor, `useOrders.ts`, nem usa o
   campo `total` no `onSuccess`).

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos (7 → 1 no programa
probe, resíduo de dependência pré-existente fora do escopo). `tsc --noEmit`
completo do projeto → 743 → 737 erros (exatamente os 6 corrigidos, sem
regressão). `check-eslint-baseline.mjs` → zero regressão (referência já em
`27d89ee683`, confirmando que o push anterior chegou). Teste dedicado
`tests/services/orderService.test.ts` → 5/5 passou. Baseline de typecheck
do projeto atualizado: 743 → 737 erros (367 → 366 arquivos).

## StepUpload.tsx + ComparisonPresentationLauncher.tsx (etapa 17)

**Arquivo 1:** `src/components/admin/products/bulk-import/StepUpload.tsx`
(5 erros TS → 0)

1. Linhas 28, 32 — `parseCSV()` indexava `text.split('\n')[0]` (usado como
   `firstLine`) e `lines[0]` (passado a `parseCSVLine`) sob
   `noUncheckedIndexedAccess`, ambos tipados como possivelmente
   `undefined`. Estruturalmente garantidos: `String.prototype.split`
   sempre retorna ao menos 1 elemento (linha 28); `lines[0]` é acessado
   após o guard `if (lines.length < 2) return { headers: [], rows: [] };`
   (linha 31), então na linha 32 `lines.length >= 2` é garantido.
   Corrigido com asserção não-nula (`!`) nos dois pontos — sem alargar o
   tipo de retorno nem adicionar checagem redundante.
2. Linhas 70/73 (originais) — bloco XLSX indexava `wb.Sheets[wb.SheetNames[0]]`
   e `json[0]` sem guard. Diferente do caso CSV, `wb.SheetNames[0]` vem de
   um arquivo enviado pelo usuário (upload arbitrário) — uma planilha
   malformada/sem abas é uma possibilidade real, não apenas um artefato do
   `noUncheckedIndexedAccess`. Corrigido com guard explícito e feedback ao
   usuário (`toast.error`) em vez de asserção cega, e o bloco inteiro foi
   extraído para uma função dedicada `parseXLSX(file)` (espelhando o
   padrão já existente de `parseCSV(text)` como função top-level fora do
   componente) — isso também resolveu de graça uma regressão de
   `sonarjs/cognitive-complexity` em `handleFileUpload` (16 vs. limite 15)
   introduzida pelo guard adicional, sem precisar reestruturar o restante
   da função. `json[0]` dentro de `parseXLSX` recebeu asserção não-nula,
   guardado pelo `if (json.length === 0) return null;` logo acima.

**Arquivo 2:** `src/components/compare/ComparisonPresentationLauncher.tsx`
(5 erros TS → 0)

1. Linhas 23, 25 — o componente desestruturava `{ items: scoreItems } =
   useComparisonScore(products)` e reduzia manualmente `scoreItems` para
   achar o vencedor via `cur.score > arr[best].score`. Divergência de
   contrato: `useComparisonScore()` (`src/hooks/useComparisonScore.ts`)
   retorna `ProductScore[]` diretamente (não um wrapper `{ items }`), e
   `ProductScore` não tem campo `.score` (é `.total`) — o hook já calcula
   `isWinner`/`rank` internamente, tornando o `.reduce()` manual
   redundante e desatualizado em relação à API real do hook. Corrigido
   consumindo o hook corretamente (`const scoreItems =
   useComparisonScore(products)`) e usando o campo já calculado
   (`scoreItems.findIndex(s => s.isWinner)`), eliminando também os 4 erros
   de parâmetro implicitamente `any` do `.reduce()` removido. A ordem de
   `scoreItems` é garantida igual à de `products` (o hook mapeia
   `products.map((p, i) => ...)` sem reordenar o array retornado — apenas
   uma cópia local `sorted` é ordenada para calcular `rank`/`isWinner`).

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos (12 no programa
probe). `check-eslint-baseline.mjs` → zero regressão após correção da
cognitive-complexity (referência `a8d6488fc8`, confirmando que o push
anterior chegou). Teste dedicado `tests/hooks/useComparisonScore.test.ts`
→ 5/5 passou (nenhum teste dedicado para `StepUpload.tsx`). Baseline de
typecheck do projeto atualizado: 737 → 727 erros (366 → 364 arquivos).

## FutureStockDialog.tsx + KitSmartSuggestions.tsx (etapa 17)

**Arquivo 1:** `src/components/inventory/FutureStockDialog.tsx` (5 erros TS → 0)

1. Linhas 150, 209 (×2), 211 — `statusConf = STATUS_CONFIG[entry.status] ||
   STATUS_CONFIG.pending`. `STATUS_CONFIG` é `Record<string, {...}>` com
   apenas 4 chaves (`confirmed`/`pending`/`in_transit`/`partial`), enquanto
   `FutureStockEntry.status` é a união fechada `'pending' | 'confirmed' |
   'in_transit' | 'partial' | 'completed' | 'cancelled'` — **diferente**
   dos casos já documentados de `ACTION_META`/`TECHNIQUE_INFO` (onde o
   `Record<string,T>` alargava de forma redundante um mapa que já cobria
   100% das chaves), aqui o mapa **genuinamente não cobre** `completed`/
   `cancelled`, então o acesso por índice pode legitimamente vir
   `undefined` em runtime — daí o fallback `|| STATUS_CONFIG.pending`
   já existir no código. O TS não sabia que o próprio fallback
   (`STATUS_CONFIG.pending`, chave literal sempre presente no objeto)
   nunca é `undefined`, pois o tipo declarado (`Record<string, T>`)
   descarta essa garantia. Corrigido com asserção de não-nulo apenas no
   fallback: `STATUS_CONFIG.pending!`.
2. Linha 356 — `filtered.reduce(..., filtered[0].expectedDate)` dentro do
   ramo `filtered.length > 0 ? ... : null` — `filtered[0]` garantido
   pelo guard imediatamente anterior. Asserção de não-nulo.

**Arquivo 2:** `src/components/kit-builder/KitSmartSuggestions.tsx`
(5 erros TS → 0)

1. Linhas 49, 50, 54, 55, 57 — `items = (kit.items_data as unknown[]) ||
   []` seguido de `for (const item of items)` acessando `item.id`/
   `.name`/`.imageUrl` num valor tipado `unknown`. Investigado a origem
   real de `custom_kits.items_data` (`useCustomKitPersistence.ts:86`,
   `useKitAutoSave.ts:96`): é persistido como
   `JSON.parse(JSON.stringify(kitState.items))`, ou seja, o shape real em
   runtime é `KitItem[]` (de `@/lib/kit-builder`, já importado no
   arquivo). Corrigido trocando o cast de `unknown[]` para
   `unknown as KitItem[]` — tipo correto na fonte, não supressão; isso
   também eliminou a necessidade do `(i: any)` avulso no `.map()` da
   linha 44 (agora inferido como `KitItem`). Ajuste em cascata: o `Map`
   de co-ocorrência espera `imageUrl?: string`, mas `KitItem.imageUrl` é
   `string | null` — `?? undefined` na atribuição.

Verificado: `tscheck-files.mjs` → 0 erros nos 2 arquivos (9 no programa
probe). `check-eslint-baseline.mjs` → zero regressão (referência
`832c9cdff9`, confirmando que o push anterior chegou; drift positivo de
1 erro de lint eliminado de graça). Nenhum teste dedicado encontrado para
os 2 arquivos. Baseline de typecheck do projeto atualizado: 727 → 717
erros (364 → 362 arquivos).

## PdfGenerationDialog.tsx + QuoteItemDetailSheet.tsx + WorkflowStepCard.tsx (etapa 17)

**Arquivos:** `src/components/quotes/PdfGenerationDialog.tsx`, `src/components/quotes/QuoteItemDetailSheet.tsx`, `src/components/workflows/WorkflowStepCard.tsx`

**Diagnóstico:** os 3 arquivos compartilham o mesmo padrão raiz — acesso indexado (`arr[i]`) a um array literal fixo, estruturalmente sempre presente no ponto de acesso, mas tipado como possivelmente `undefined` por causa de `noUncheckedIndexedAccess`.

- `PdfGenerationDialog.tsx` (5 erros TS2532, linhas 130/136/137/146/147): `PROGRESS_STEPS` é um array literal fixo de 3 elementos (linhas 41-45); os acessos `PROGRESS_STEPS[0]`, `PROGRESS_STEPS[1]`, `PROGRESS_STEPS[2]` são a índices fixos e válidos dentro do array. Corrigido com asserção não-nula (`!`) em cada acesso.
- `QuoteItemDetailSheet.tsx` (5 erros, linha 72 e 74×4): `QUANTITY_TIERS` é um array literal fixo de 8 elementos (linhas 8-17); o loop `for (let i = QUANTITY_TIERS.length - 1; i >= 0; i--)` garante `i` sempre dentro do range válido. Corrigido com `!` em `QUANTITY_TIERS[i]!.min` e `const t = QUANTITY_TIERS[i]!;`.
- `WorkflowStepCard.tsx` (5 erros, linhas 26/38/46/47/52): `STEP_TYPES` é um array literal fixo de 4 elementos; o fallback `STEP_TYPES.find(...) || STEP_TYPES[0]` acessa o índice 0, sempre presente. Corrigido com `STEP_TYPES[0]!`.

**Correção:** asserção não-nula (`!`) pontual em cada acesso estruturalmente garantido, sem alterar lógica de runtime.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) em cada um dos 3 arquivos (15 erros eliminados no total).
- `check-eslint-baseline.mjs`: 0 regressões de lint nos 3 arquivos.
- Sem testes dedicados para os 3 arquivos (busca por nome de arquivo não retornou spec/test).
- `typecheck:baseline`: 717 → 702 (359 arquivos), baseline atualizado com `--update`.

## useWizardPricing.ts + wizardReducer.ts + simulator-wizard.ts (etapa 17)

**Arquivos:** `src/hooks/simulator/useWizardPricing.ts`, `src/hooks/simulator/wizardReducer.ts`, `src/types/domain/simulator-wizard.ts`

**Diagnóstico:** 5 erros TS em `useWizardPricing.ts`, com causa raiz compartilhada em 2 outros arquivos:

- **`_needsRecalc` sem tipo** (linha 33): o reducer (`wizardReducer.ts`, 2 sites) marca uma personalização como "precisa recalcular" gravando `{ ...p.pricing, _needsRecalc: true }` e forçando o resultado com `as Record<string, unknown>`, porque `Personalization['pricing']` (em `simulator-wizard.ts`) nunca declarava esse campo. O lado de leitura em `useWizardPricing.ts` precisava então castar `p.pricing as unknown` pra acessar a flag. Corrigido na raiz: adicionado `_needsRecalc?: boolean` ao tipo `Personalization.pricing`, eliminando os 2 casts de escrita no reducer e o cast de leitura aqui — achado bônus: isso também zerou de graça 3 erros pré-existentes em `wizardReducer.ts` (`TS2322` nas linhas 42 e 158×2, mesma causa).
- **`adaptPriceResponse(result)` com interface nomeada sem index signature** (linhas 67, 160): `result` é `CustomizationPriceResponse` (interface fechada, sem `[key:string]`), e `adaptPriceResponse` espera `Record<string, unknown> | null | undefined` — TS recusa a atribuição direta de uma interface nomeada a um tipo com index signature. Corrigido com o mesmo padrão já usado em `simulationPriceFetcher.ts:225` (`as unknown as Record<string, unknown>`) nos 2 call sites, sem alterar a assinatura da função compartilhada (usada por outros 6+ consumidores fora do escopo desta etapa — mesmo erro identificado em `ConfigurationPanel.tsx:120`, não corrigido aqui por estar fora do arquivo-alvo).
- **`cheapest`/`fastest` possivelmente `undefined`** (linhas 201-202): `[...available].sort(...)[0]` dentro de `if (available.length > 0)` — acesso estruturalmente garantido não presente após `.sort()` (retorna array solto). Corrigido com asserção de não-nulo nos 2 pontos.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos 3 arquivos (8 erros eliminados no total: 5 do alvo + 3 bônus em `wizardReducer.ts`; confirmado via `git stash` que os 4 erros remanescentes no probe — `REMOVE_ALL_PERSONALIZATIONS` não comparável e `WizardStep | undefined` vs. `| null`, em `wizardReducer.ts:87` e `simulator-wizard.ts:284/292/325` — já existiam antes desta mudança, fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões de lint.
- Teste dedicado `tests/integration/simulator-wizard-pricing-parity.test.ts` 5/5 passou.
- `typecheck:baseline`: 702 → 694 (358 arquivos), baseline atualizado com `--update`.

## useTabelasPreco.ts (etapa 17)

**Arquivo:** `src/hooks/tecnicas/useTabelasPreco.ts`

**Diagnóstico:** mesmo padrão já documentado em `useTecnicasGravacao.ts`/`useReplenishments.ts`/`priceTable.repository.ts`: `InvokeResult<T>.records` (`src/lib/external-db/invoke.ts:46`) é genuinamente opcional (`records?: T[]`), e os 5 acessos (`useTabelasPreco`, `useTabelasPorTecnica`, `useTabelaPorCodigo`, `useNomesTecnicasPreco`, `buscarTabelaAdequada`) tratavam o retorno de `invokeExternalDb()` como sempre populado.

**Correção:** fallback defensivo `?? []` (ou `?.[0]` no acesso pontual de `useTabelaPorCodigo`) nos 5 sites, sem alterar lógica de runtime.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões de lint.
- Sem testes dedicados encontrados.
- `typecheck:baseline`: 694 → 689 (357 arquivos), baseline atualizado com `--update`.

## useBulkImportFile.ts + ImportExportManager.tsx (etapa 17)

**Arquivos:** `src/hooks/useBulkImportFile.ts`, `src/components/admin/common/ImportExportManager.tsx`

**Diagnóstico:** 5 erros TS em `useBulkImportFile.ts`, com uma causa raiz de infraestrutura que afetava um segundo arquivo de graça:

- **`papaparse` sem tipos** (3 erros: `TS7016` na importação + `TS7006` nos parâmetros `results`/`error` dos callbacks de `Papa.parse`): o pacote `papaparse` não expõe `types` no seu `package.json` e o projeto não tinha `@types/papaparse` instalado — diferente de outras libs sem tipos embutidos já cobertas no projeto (`@types/canvas-confetti`, `@types/jszip`, `@types/pdf-parse`, etc.). Corrigido instalando `@types/papaparse` como devDependency, seguindo a mesma convenção. Achado bônus: isso zerou de graça 3 dos 4 erros de `ImportExportManager.tsx`, que também usa `Papa.parse` sem tratamento local.
- **`workbook.Sheets[workbook.SheetNames[0]]` (linha 68)**: sob `noUncheckedIndexedAccess`, `SheetNames[0]` é `string | undefined`, e usá-lo diretamente como índice é rejeitado (`TS2538`). Corrigido extraindo `firstSheetName` com guard real (`if (!firstSheetName) throw new Error(...)`) — é upload arbitrário do usuário (XLSX pode legitimamente vir sem abas), não um acesso estruturalmente garantido, então guard em vez de asserção. Mesmo padrão exigiu um segundo guard em `workbook.Sheets[firstSheetName]` (retorna `WorkSheet | undefined`), que só apareceu depois de resolver o primeiro (`TS2769` no overload de `sheet_to_json`). O mesmo bug existia em `ImportExportManager.tsx:91-92` (`wb.SheetNames[0]`/`wb.Sheets[wsname]`) — corrigido com os mesmos 2 guards, zerando o erro restante do arquivo.
- **`updateMapping()` com cast solto** (linha 99): `targetField as string` alargava o campo pra `string`, incompatível com `ColumnMapping.targetField: keyof ProductFormData | ''` (`useProductRegistration.ts:90`). Corrigido trocando o cast pro tipo de destino correto (`targetField as ColumnMapping['targetField']`), sem alterar a assinatura pública da função (consumida por `BulkImportSteps.tsx`/`BulkImportPanel.tsx`, fora do escopo desta etapa).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos 2 arquivos.
- `check-eslint-baseline.mjs`: 0 regressões de lint.
- Sem testes dedicados encontrados.
- `typecheck:baseline`: 689 → 680 (355 arquivos), baseline atualizado com `--update`.

## useColorEnrichment.ts (etapa 17)

**Arquivo:** `src/hooks/useColorEnrichment.ts`

**Diagnóstico:** 5 erros TS, 2 causas independentes:

- **Cache de módulo com tipo mais estrito que o dado real** (linha 97): `cachedColorVariations` era declarado como `Array<{ ...; hex_code?: string }>` (campo opcional, `string | undefined`), mas o valor atribuído (linha 97, cast explícito) é `hex_code: string | null` — reflexo real da coluna nullable do banco, nunca ausente. Corrigido alinhando o tipo da variável de cache pra `hex_code: string | null`.
- **Acessos por índice estruturalmente garantidos** (linhas 256, 258, 265, 266): `validImages[0]`/`v.images[0]` guardados por `if (validImages.length > 0)`/`if (v.images.length > 0)` na linha imediatamente anterior; `variants[0].color_name`/`.color_hex` guardado por `variants.length > 0` na condição do `if` que envolve o bloco. `noUncheckedIndexedAccess` não propaga essas garantias — corrigido com asserção de não-nulo nos 3 pontos (mesmo padrão já usado em `FocusTrap.tsx`/`useNewSupplierForm.ts`/`VolumeValidation.tsx`).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões de lint.
- Sem testes dedicados encontrados.
- `typecheck:baseline`: 680 → 675 (354 arquivos), baseline atualizado com `--update`.

## useCommercialIntelligence.ts (etapa 17)

**Arquivo:** `src/hooks/useCommercialIntelligence.ts`

**Diagnóstico:** 5 erros TS, 2 causas independentes:

- **`.toISOString().split('T')[0]` usado como chave de `Map<string, ...>`** (linhas 272, 292, 293, 294): sob `noUncheckedIndexedAccess`, `.split('T')[0]` é `string | undefined`. O formato ISO 8601 sempre contém exatamente um `'T'` separando data e hora, então o índice `[0]` está estruturalmente garantido. Corrigido com asserção de não-nulo nos 4 pontos.
- **`invokeExternalDb({...})` sem argumento de tipo** (linha 365, dentro de `useCategoryRanking`): sem `<T>` explícito, `T` não tem como ser inferido dos argumentos e o retorno assume `unknown`, fazendo `result.records` ser `unknown[] | undefined` — incompatível com o callback `.forEach((snap: Record<string, unknown>) => ...)`. Corrigido com `invokeExternalDb<Record<string, unknown>>(...)`, mesmo padrão já usado em `techniques.ts:78` e `price-tables.ts:39`.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões de lint.
- Teste dedicado `tests/components/intelligence/commercial-intelligence.test.ts` 111/111 passou.
- `typecheck:baseline`: 675 → 670 (353 arquivos), baseline atualizado com `--update`.

## Reconciliação com origin/main (PR #15) + useSpeechRecognition.ts (etapa 17)

**Contexto:** entre o commit de `useCommercialIntelligence.ts` e o próximo push, `origin/main` avançou com um commit externo (`a5b2f41dc`, "Reconcilia contratos do portal com banco de construção e MFA seguro #15", 28 arquivos, sem overlap com os arquivos desta etapa). Resolvido com `git rebase origin/main` (sem force-push — commit local ainda não publicado). A revalidação pós-rebase revelou que a mudança externa zerou incidentalmente os 2 erros de `src/pages/QuotesKanbanPage.tsx`; baseline corrigida de 670 para 668 num commit próprio (`chore(baseline)`).

**Arquivo:** `src/hooks/useSpeechRecognition.ts`

**Diagnóstico:** 5 erros TS, causa raiz única: o hook redeclarava localmente toda a superfície ambiente do Web Speech API (`SpeechRecognitionEvent`, `SpeechRecognitionResultList`, `SpeechRecognitionResultItem`, `SpeechRecognitionAlternative`, `SpeechRecognitionErrorEvent`, `SpeechRecognition`, e um `declare global { interface Window { SpeechRecognition: new () => SpeechRecognition; ... } }`) — duplicando e conflitando com a declaração ambiente canônica já existente em `src/types/speech-recognition.d.ts` (e reexposta em `src/types/browser.d.ts`). O merge de `Window.SpeechRecognition`/`webkitSpeechRecognition` entre a versão local (não-opcional, `new () => SpeechRecognition`) e a global (opcional, `{ new(): SpeechRecognition; prototype: SpeechRecognition } | undefined`) gerava `TS2687`/`TS2717`; o mesmo conflito de tipo se propagava para `setRecognition(recognitionInstance)` (`TS2345`).

**Correção:** removidas as 6 interfaces + o bloco `declare global` redundantes do hook, mantendo apenas seu próprio `interface SpeechRecognitionResult` (formato de retorno do hook, sem colisão pois é local ao módulo). Adicionado guard `if (!SpeechRecognitionAPI) return;` após `window.SpeechRecognition || window.webkitSpeechRecognition`, já que o tipo ambiente global é opcional.

**Achado bônus (lint):** a remoção do shadow local expôs um falso-positivo pré-existente do ESLint: `no-undef` não reconhece tipos ambientes globais declarados em `.d.ts` que não constam no pacote `globals` (`SpeechRecognition` não é um global padrão). Corrigido registrando `SpeechRecognition`/`webkitSpeechRecognition` como globals customizados em `eslint.config.js` (bloco `src/**/*.{ts,tsx}`), mesmo padrão de extensão de `globals.browser` já usado no arquivo.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões de lint (referência origin/main e89f82c6b4).
- Teste dedicado `tests/hooks/useSpeechRecognition.test.ts` 1/1 passou.
- `typecheck:baseline`: 668 → 663 (351 arquivos), baseline atualizado com `--update`.

## forecast.ts (etapa 17)

**Arquivo:** `src/lib/forecast.ts`
**Erros:** 5× `TS2532` ("Object is possibly 'undefined'") sob `noUncheckedIndexedAccess`.

**Diagnóstico:** todos os 5 acessos por índice são estruturalmente seguros em runtime, mas o TypeScript não consegue provar isso:
- `linearRegression()`: `xs[i]` e `values[i]` são dois arrays paralelos de mesmo comprimento `n`, acessados dentro de `for (let i = 0; i < n; i++)` — 4 ocorrências (2 no loop de soma `num`/`den`, 1 no loop de resíduos `sumSq`).
- `projectForecast()`: `series[series.length - 1]` é acessado logo após o guard `if (series.length < 3) return ...`, que garante `series.length >= 3` naquele ponto.

**Correção:** asserções de non-null (`!`) nos 3 pontos de acesso (5 ocorrências), sem alterar lógica.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main b6c06ae465); 3342 erros globais (sem alteração — arquivo não tinha issues de lint).
- Teste dedicado: não encontrado (`tests/**/*forecast*` vazio).
- `typecheck:baseline`: 663 → 658 (350 arquivos), travado via `--update`.

## calculators.ts (etapa 17)

**Arquivo:** `src/lib/personalization/calculators.ts`
**Erros:** 5× (`TS2322` + 4×`TS18048`) — "possibly undefined" sob `noUncheckedIndexedAccess`.

**Diagnóstico:** todos os 5 acessos são estruturalmente seguros, cada um imediatamente após um guard de comprimento:
- `findPriceTier()` (linha 108): `selectedTier = sortedTiers[0]` — guard `if (tiers.length === 0) return null;` na linha 92 garante `sortedTiers.length >= 1`.
- `calculateTierSavings()` (linha 166): `firstTier = [...tiers].sort(...)[0]` — guard `if (tiers.length === 0) return undefined;` na linha 163.
- `getMaximumQuantity()` (linha 219): `lastTier = [...tiers].sort(...)[0]` — guard `if (tiers.length === 0) return null;` na linha 216.
- `suggestNextTier()` (linhas 240, 243): `nextTier = sortedTiers[currentIndex + 1]` — guard `if (currentIndex === -1 || currentIndex >= sortedTiers.length - 1) return null;` garante `currentIndex + 1 < sortedTiers.length`.

**Correção:** asserções de non-null (`!`) nos 4 pontos de acesso (5 ocorrências), sem alterar lógica.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main 4ecd791e1a); 3342 erros globais (sem alteração).
- Teste dedicado: não encontrado (nenhum teste em `tests/` importa `personalization/calculators`).
- `typecheck:baseline`: 658 → 653 (349 arquivos), travado via `--update`.

## DevInfraGate.ts (etapa 17)

**Arquivo:** `src/lib/system/dev-gate/DevInfraGate.ts`
**Erros:** 5× (`TS2322`×2 + `TS2345` + `TS2532`×2).

**Diagnóstico:**
- **Bug real (linha 8):** `DEFAULT_ALLOWED_ROLES` incluía o literal `'admin'`, que não é um `AppRole` válido — o tipo `AppRole` (`src/lib/roles.ts`) é `dev | gestor_compras | comprador_singular | gerente_pa | comprador_pac | agente | vendedor | supervisor`. `'admin'` é apenas um alias legado mapeado para `'supervisor'` em `ROLE_ALIASES` (não aplicado em nenhum ponto do código — roles vindas de `useAuth()` já chegam tipadas como `AppRole`, nunca contendo a string `'admin'`). O valor era código morto/inalcançável. Corrigido removendo `'admin'` do array (permissão de `'supervisor'` já cobre a intenção original).
- **4 acessos por índice estruturalmente seguros sob `noUncheckedIndexedAccess`:**
  - `DefaultAccessPolicy.hasAccess()`: `userRoles[i]` dentro de `for (let i = 0; i < len; i++)`.
  - `generateCacheKey()`: `roles[0]` guardado por `if (len === 1) return roles[0];`.
  - `generateCacheKey()`: `roles[i]`/`roles[i+1]` dentro de `for (let i = 0; i < len - 1; i++)`, garantindo `i+1 < len`.

**Correção:** remoção do literal inválido `'admin'` + non-null assertions nos 3 pontos de acesso por índice (4 ocorrências).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (14→9 no programa da sonda, os 5 deste arquivo eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main fdec5ef996); 3342 erros globais (sem alteração).
- Testes dedicados: 7 arquivos / 25 testes (`DevInfraGate.test.ts` ×2, `DevInfraGateSSR/Matrix/Stability/Hydration/ErrorResilience.test.tsx`) — todos passaram, confirmando que nenhum teste dependia do literal `'admin'` removido.
- `typecheck:baseline`: 653 → 648 (348 arquivos), travado via `--update`.

## bridgeCallMetrics.ts (etapa 17)

**Arquivo:** `src/lib/telemetry/bridgeCallMetrics.ts`
**Erros:** 5× (`TS18048` + `TS2538` + `TS2322` + `TS2532`×2) sob `noUncheckedIndexedAccess`.

**Diagnóstico:** todos os 5 acessos por índice são estruturalmente seguros:
- `estimatePayloadBytes()` (linha 118): `keys[i]` dentro de `for (let i = 0; i < sampleCount; i++)`, onde `sampleCount = Math.min(keys.length, 5)`.
- `percentile()` (linha 187): `sortedAsc[idx]` — guard `if (sortedAsc.length === 0) return 0;` garante `sortedAsc.length >= 1`; `idx` é clampado por `Math.min(sortedAsc.length - 1, ...)`.
- `aggregateByEndpoint()` (linhas 209-210): `arr[0].bridge`/`arr[0].op` — `arr` vem de `groups.get(key)` (Map construído via `else groups.set(key, [s])`), garantindo que todo array no Map tem ao menos 1 elemento.

**Correção:** asserções de non-null (`!`) nos 3 pontos de acesso (5 ocorrências), sem alterar lógica.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main c24afb02b1); 3342 erros globais (sem alteração).
- Testes dedicados: 4 arquivos / 8 testes (`BridgeMetricsOverlay-ProdGate.test.tsx`, `useBridgeMetrics.test.ts`, `useBridgeMetricsCleanup.test.ts`, `useBridgeMetricsPerformance.test.ts`) — todos passaram.
- `typecheck:baseline`: 648 → 643 (347 arquivos), travado via `--update`.

## ReleaseEvidencesPage.tsx (etapa 17)

**Arquivo:** `src/pages/admin/qa/ReleaseEvidencesPage.tsx`
**Erros:** 5× (`TS18048`×3 + `TS2345` + `TS2769`).

**Diagnóstico (NÃO são assertions cegas — são valores genuinamente opcionais em runtime):**
- **`handleFileUpload()` (linhas 69, 72, 85, 86):** `const file = e.target.files[0]` — o guard existente (`if (!e.target.files || !selectedReleaseId) return;`) verifica apenas que o `FileList` existe, não que tem elementos. Um `FileList` vazio é um objeto truthy com `length === 0`, então `file` pode genuinamente ser `undefined` em runtime.
- **Linha 138:** `new Date(release.created_at)` — `qa_releases.created_at` é `string | null` no schema (`src/integrations/supabase/types.ts`), coluna nullable de verdade; `Date` não aceita `null` em nenhum overload.

**Correção (tratamento real, não bypass de tipo):**
- Adicionado guard explícito `if (!file) return;` logo após a leitura de `file`, cobrindo os 4 usos subsequentes.
- Linha 138: renderização condicional `release.created_at && new Date(release.created_at).toLocaleDateString()`, seguindo o padrão já estabelecido em `QuoteKanbanBoard.tsx:211` (`quickViewQuote?.created_at && new Date(...)`).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main 7d286c5cf9); 3342 erros globais (sem alteração).
- Teste dedicado: não encontrado.
- `typecheck:baseline`: 643 → 638 (346 arquivos), travado via `--update`.

## NotificationSettingsTab.tsx (etapa 17)

**Arquivo:** `src/pages/admin/sicoob/tabs/NotificationSettingsTab.tsx`
**Erros:** 5× (`TS2769` + `TS2322`×4).

**Diagnóstico:**
- **Linha 44:** `pa_id: selectedPa` no payload de `upsert()` — `pa_notification_settings.pa_id` é `string` (obrigatório) no schema, mas `selectedPa` é tipado `string | null`. Os handlers que disparam essa mutação (`Switch.onCheckedChange`, `Input.onBlur`) só são renderizados dentro do guard `{selectedPa && (...)}` (linha 92), garantindo `selectedPa` truthy no momento em que podem ser acionados pelo usuário.
- **Linhas 103, 129:** `getSetting(channel).is_active` — `is_active` é `boolean | null` no schema (nullable); o componente `Switch` (Radix) aceita `checked?: boolean` (não aceita `null`).
- **Linhas 113, 139:** `getSetting(channel).webhook_url` / `.recipient_email` — ambos `string | null` no schema; `Input.defaultValue` (React) não aceita `null`.

**Correção:**
- Linha 44: non-null assertion (`selectedPa!`), justificada pelo guard de renderização.
- Linhas 103/129: fallback `?? false`, alinhado ao default já usado no objeto de fallback de `getSetting()` (`is_active: false`).
- Linhas 113/139: fallback `?? ''`, alinhado ao default já usado no objeto de fallback de `getSetting()` (`webhook_url: ''`, `recipient_email: ''`).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main 1c37076eb6); 3341 erros globais (sem alteração).
- Teste dedicado: não encontrado.
- `typecheck:baseline`: 638 → 633 (345 arquivos), travado via `--update`.

## NotificationsPage.tsx (etapa 17)

**Arquivo:** `src/pages/NotificationsPage.tsx`
**Erros:** 5× (`TS2339`×3 + `TS2322` + `TS2769`).

**Diagnóstico:**
- **Linhas 61, 71, 79:** o componente lia `n.read`, mas `WorkspaceNotification`
  (`src/hooks/useWorkspaceNotifications.tsx`) define o campo como `is_read: boolean`.
  `read` nunca existiu no tipo — **bug real**, não falso-positivo do TS: a lógica de
  destaque visual de não-lidas e o botão "Marcar como lida" nunca funcionavam
  corretamente (a expressão `n.read` sempre avaliava `undefined`).
- **Linha 71:** `<Badge variant="primary" .../>` — `primary` não é uma variante
  válida de `badgeVariants` (`src/components/ui/badge.tsx`); as opções são
  `default | secondary | destructive | outline | accent | success | warning`.
- **Linha 85:** `navigate(n.action_url)` — `action_url` é `string | null` no tipo;
  o guard externo `{n.action_url && (...)}` não propaga a narrow para dentro do
  arrow function do `onClick` (TS não estreita member expressions através de
  fronteiras de função).

**Correção:**
- Linhas 61/71/79: `n.read` → `n.is_read` (nome correto do campo).
- Linha 71: `variant="primary"` → `variant="default"` (variante brand/primária
  real do Badge).
- Linha 85: `navigate(n.action_url!)` — non-null assertion justificada pelo guard
  de renderização `{n.action_url && (...)}` que envolve o botão.

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main 7c52a93e8b); 3341 erros globais (sem alteração).
- Teste dedicado: não encontrado.
- `typecheck:baseline`: 633 → 628 (344 arquivos), travado via `--update`.

## QuoteActionHandlers.ts (etapa 17)

**Arquivo:** `src/pages/quote-view/QuoteActionHandlers.ts`
**Erros:** 5× (`TS2345`×3 + `TS2532` + `TS2345` no `setQuote`).

**Diagnóstico:**
Todos os 5 erros estavam dentro de `handleSyncBitrix` (linhas 50-140), uma
função exportada mas **nunca importada em lugar nenhum do projeto**
(confirmado via grep exaustivo em `src/` e `tests/` — o único import do
módulo, em `useQuoteViewData.ts`, traz apenas `formatCurrency`,
`calcPersTotal` e `formatCNPJ`). Investigação adicional mostrou que:
- `handleDownloadPDF` e `buildWhatsAppUrl` (também exportadas aqui) são
  igualmente código morto — `useQuoteViewData.ts` define suas próprias
  versões locais (`handleDownloadPDF` linha 144, `handleWhatsAppShare`
  linha 169), que são as efetivamente usadas por `QuoteViewPage.tsx`.
- A sincronização real com o Bitrix24 passa por
  `useQuoteViewData.ts::handleSyncBitrix` (linha 205) → `QuoteBitrixSync.ts`
  (`syncQuoteToBitrix`) — módulo dedicado, já corrigido em etapa 17 anterior
  (ver seção `QuoteBitrixSync.ts` acima), com a mesma lógica só que correta
  (guard de `quote.id` com `quoteId` local, `String(bitrixQuoteIdFromResponse)`
  em vez de `number`, circuit breaker).

Ou seja: `handleSyncBitrix` neste arquivo é uma versão **desatualizada e
duplicada** da função que já foi extraída e corrigida em `QuoteBitrixSync.ts`,
deixada para trás sem uso. Os 5 erros TS eram sintomas de bugs reais
(`quote.id` opcional usado sem guard; `bitrix_quote_id` atribuído como
`number` a um campo `string`) dentro de código inalcançável — corrigir esses
bugs manteria lógica morta e enganosa no código-fonte.

**Correção:**
Removidas as 3 funções mortas (`handleDownloadPDF`, `buildWhatsAppUrl`,
`handleSyncBitrix`, ~130 linhas) e os imports que só elas usavam (`supabase`,
`generateProposalPDFv2`, `downloadPDF`, `ProposalTemplateData`, `Quote`,
`toast`, `format`/`ptBR`, `logger`). Mantido apenas o que é realmente
consumido: `calcPersTotal` e o re-export de `formatCurrency`/`formatCNPJ`
(usados por `useQuoteViewData.ts`, `QuoteTotalsSummary.tsx`,
`QuoteItemsTable.tsx` etc.).

**Validação:**
- `tscheck-files.mjs`: 0 erro(s) nos arquivos pedidos (5 eliminados).
- `check-eslint-baseline.mjs`: 0 regressões (referência origin/main 939000f68d);
  3341 → 3336 erros globais (drift positivo: 5 erros de lint eliminados junto
  com o código morto).
- Teste dedicado: não encontrado.
- `typecheck:baseline`: 628 → 623 (343 arquivos), travado via `--update`.

## QuotesListPage.tsx (etapa 17)

**Erros TS originais (5):**
```
src/pages/QuotesListPage.tsx(83,50): error TS2339: Property 'duplicateQuote' does not exist on type '{ quotes: Quote[]; ... }'.
src/pages/QuotesListPage.tsx(253,21): error TS2554: Expected 2 arguments, but got 1.
src/pages/QuotesListPage.tsx(264,21): error TS2554: Expected 2 arguments, but got 1.
src/pages/QuotesListPage.tsx(419,60): error TS2345: Argument of type 'string' is not assignable to parameter of type '"pending" | "rejected" | "draft" | "sent" | "approved" | "expired" | "pending_approval" | "pending_singular_approval" | "approved_singular" | "rejected_singular"'.
src/pages/QuotesListPage.tsx(439,23): error TS2554: Expected 1 arguments, but got 2.
```

**Diagnóstico raiz (4 bugs reais distintos, não apenas ruído de tipagem):**

1. **`duplicateQuote` nunca existiu no hook `useQuotes`** (linha 83). O hook (`src/hooks/quotes/useQuotes.ts`) nunca exportou essa função — a duplicação de orçamento é implementada por `reorderQuote(quoteId, itemIds?)`, que já produz o toast "Orçamento duplicado!" e cria o novo orçamento como rascunho. A página estava desestruturando um nome que nunca existiu; o botão "Duplicar" (`onDuplicate={(id) => duplicateQuote(id)}`, linha ~453) chamaria `undefined(id)` em runtime — bug real, não só erro de compilação.

2. **Dois `exportToExcel`/`exportToPDF` com assinaturas incompatíveis, confundidos em 3 pontos:**
   - `src/utils/orderExportUtils.ts` exporta `exportToExcel(data: any[], filename: string)` e `exportToPDF(data: any[], filename: string)` — assinatura **posicional**, gera CSV simples usando a constante interna `QUOTE_EXPORT_COLUMNS` (não aceita parâmetro de colunas).
   - `src/utils/excelExport.ts` exporta `exportToExcel(config: ExcelExportConfig)` — assinatura de **objeto de configuração** (`{filename, columns, data, sheetName?, includeTimestamp?}`), gera `.xlsx` real via `@e965/xlsx`.
   - O menu de exportação (botões "Excel (.xlsx)" e "PDF (.pdf)" no dropdown do topo, linhas ~253/264) importava as funções de `orderExportUtils.ts` (posicional) mas chamava com um objeto `{ items: data, filename: 'orcamentos', columns: QUOTE_EXPORT_COLUMNS }` — em runtime, `data` (1º parâmetro posicional) recebia o objeto inteiro, não um array; `data.map(...)` dentro da função quebrava (`TypeError`, capturado pelo try/catch interno, exibindo apenas "Erro na exportação"). **Os dois botões de exportação do topo estavam quebrados em produção.**
   - O handler `onBulkExport` (exportação de selecionados, linha ~439) importava dinamicamente `exportToExcel` de `excelExport.ts` (a versão de config) mas chamava com 2 argumentos posicionais (`array, string`) — `config.columns` ficava `undefined`, `columns.forEach(...)` lançava exceção dentro do try/catch de `excelExport.ts`, rejeitando a Promise sem tratamento (`.then()` sem `.catch()`) — **exceção não tratada em runtime, exportação de selecionados também quebrada.**

3. **Cast incorreto de `status` para `string` genérico** (linha 419, dentro de `onBulkStatusChange`): o parâmetro `status` já chega tipado como `string` solto (assinatura do prop em `QuotesConfigurableList.tsx`: `onBulkStatusChange?: (ids: string[], status: string) => void`), mas `updateQuoteStatus(quoteId, status: Quote["status"], notes?)` exige a união literal de status. O cast `as string` não resolvia nada (já era string); corrigido para `as Quote["status"]`, coerente com os valores literais reais que `QuotesConfigurableList.tsx` de fato emite (`"pending"`, `"approved"`, etc.).

**Fix aplicado (`src/pages/QuotesListPage.tsx`):**
- `duplicateQuote` → `reorderQuote` (desestruturação do hook e no `onDuplicate`).
- Export do topo: chamadas de `exportToExcel(data, filename)` / `exportToPDF(data, filename)` corrigidas para a assinatura posicional real de `orderExportUtils.ts`; removido o import não utilizado de `QUOTE_EXPORT_COLUMNS` (a função já usa a constante internamente).
- Export em massa (`onBulkExport`): chamada de `exportToExcel` (de `excelExport.ts`) corrigida para a assinatura de config `{filename, columns, data}`, com `columns` mapeando as mesmas chaves em português já usadas na montagem das linhas (`Número`, `Empresa`, `Contato`, `Status`, `Valor`, `Data`).
- Cast de status: `status as string` → `status as Quote["status"]` (novo `import type { Quote } from "@/hooks/quotes/quoteTypes";`).

**Validação:**
- `node scripts/tscheck-files.mjs src/pages/QuotesListPage.tsx` → 0 erros (30 no programa inteiro).
- `node scripts/check-eslint-baseline.mjs src/pages/QuotesListPage.tsx` → 0 regressões (referência origin/main 9862ad376c, 3336 erros globais).
- Nenhum teste dedicado encontrado para este arquivo.
- `npm run typecheck:baseline -- --update` → baseline 623→618 (342 arquivos).

**Nota de risco funcional:** os 3 bugs de export (itens 1 e 2 acima) eram falhas silenciosas em produção — os botões "Excel", "PDF" e "Exportar selecionados" da tela de Orçamentos lançavam exceção e exibiam apenas um toast genérico de erro, sem nunca gerar o arquivo. Recomenda-se validação manual em navegador dessas 3 ações (não realizada nesta sessão, apenas correção estática + typecheck).

## HorizontalStepper.tsx (etapa 17)

**Erros TS originais (4):**
```
src/components/admin/products/HorizontalStepper.tsx(58,30): error TS2532: Object is possibly 'undefined'.
src/components/admin/products/HorizontalStepper.tsx(59,50): error TS2532: Object is possibly 'undefined'.
src/components/admin/products/HorizontalStepper.tsx(107,24): error TS2532: Object is possibly 'undefined'.
src/components/admin/products/HorizontalStepper.tsx(133,24): error TS2532: Object is possibly 'undefined'.
```

**Diagnóstico raiz:** o componente recebe `steps: StepDef[]`, `stepErrors: number[]` e `missingFields: string[][]` como props separadas, esperadas como arrays paralelos (mesmo índice `i` referencia a mesma etapa em todos). Como `noUncheckedIndexedAccess` está ativo e o TypeScript não tem garantia estrutural de que `stepErrors`/`missingFields` têm o mesmo tamanho de `steps` (são props vindas de fora, não um único array desestruturado), todo acesso `stepErrors[i]` e `missingFields[i]` é tipado como `T | undefined`.

**Fix aplicado:** fallback defensivo em vez de non-null assertion, por serem arrays vindos de props (o contrato de paralelismo não é garantido pelo compilador nem pelo runtime caso o componente pai algum dia passe arrays de tamanhos diferentes):
- `stepErrors[i] > 0` → `(stepErrors[i] ?? 0) > 0`
- `missingFields[i].length > 0` → `(missingFields[i] ?? []).length > 0`
- `missingFields[i].length` (badge de contagem) → `(missingFields[i] ?? []).length`
- `missingFields[i].map(...)` → `(missingFields[i] ?? []).map(...)`

**Validação:**
- `node scripts/tscheck-files.mjs` → 0 erros (0 no programa inteiro, arquivo isolado sem outras dependências com erro).
- `node scripts/check-eslint-baseline.mjs` → 0 regressões (referência origin/main a34ba09dd2, 3336 erros globais).
- Nenhum teste dedicado encontrado para este arquivo.
- `npm run typecheck:baseline -- --update` → baseline 618→614 (341 arquivos).

## useProductImageGallery.ts (etapa 17)

**Arquivo:** `src/components/admin/products/image-gallery/useProductImageGallery.ts`

**Erros originais (4×):** `TS2345` — argumentos possivelmente `undefined` passados para funções que exigem valor definido, em 4 pontos de acesso a array/`splice`:
1. `parts[1]` (linha do split de URL do storage) — usado após `if (parts.length < 2) return;`.
2. `files[i]` (loop de upload) — `i` sempre dentro de `0..files.length-1` pelo próprio `for`.
3. `moved` (desestruturado de `newImages.splice(idx, 1)` em `handleSetPrimary`) — usado após guarda `if (idx <= 0) return;`.
4. `moved` (desestruturado de `newImages.splice(dragIndex, 1)` em `handleDrop`) — usado após guarda `if (dragIndex === null || dragIndex === dropIndex) { ...; return; }`.

**Diagnóstico:** em todos os 4 casos, uma guarda precedente já garante estruturalmente que o valor existe — o TypeScript apenas não consegue provar isso por narrowing através de comparações de `.length` ou do tipo array de retorno de `.splice()`. Diferente do caso de `HorizontalStepper.tsx` (props externas sem garantia de paridade de tamanho), aqui a garantia é local e estrutural.

**Fix:** asserção de não-nulo (`!`) em cada um dos 4 acessos, já que o guard clause imediatamente anterior torna a asserção comprovadamente segura.

**Validação:**
- `tscheck-files.mjs`: 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões.
- Teste dedicado: não encontrado.
- `typecheck:baseline`: 614 → 610 (340 arquivos), travado via `--update`.

## useProductsManager.ts (etapa 17)

**Arquivo:** `src/components/admin/products/useProductsManager.ts`

**Erros originais (4×):** confusão de tipos entre 3 modelos de produto distintos e sobrepostos:
- `PromobrindProduct` (`@/lib/external-db/product-types`) — tipo real retornado por `fetchPromobrindProducts`.
- `ExternalProduct` (`@/types/external-db`) — outro tipo, de outro módulo, com index signature `[key: string]: unknown`, usado indevidamente aqui como cast de escape para ler campos que não existem em `PromobrindProduct`.
- `AdminProduct` (definido neste próprio arquivo) — ~60 campos, o formato interno da tela de produtos do admin.

O código fazia `result as { products: ExternalProduct[]; count }`, mas `fetchPromobrindProducts` genuinamente retorna `{ products: PromobrindProduct[]; count }` — os dois tipos não têm overlap suficiente (TS2352). Isso também quebrava as chamadas a `getProductImageUrl(p)`/`getProductStock(p)`, que exigem formato `PromobrindProduct` (TS2345), e o objeto mapeado final não batia com `AdminProduct[]` (TS2322).

**Diagnóstico:** o cast para `ExternalProduct` era um "escape hatch" para ler ~30 campos fiscais/embalagem/frete/SEO (`ncm_code`, `icms_rate`, `is_textil`, `allows_personalization`, `packaging_material`, `stock_unit`, `meta_title`, `slug` etc.) que **não existem em `PromobrindProduct`** porque as constantes `PRODUCT_SELECT_FIELDS_WITH_SALE/LEGACY/DETAIL` (`product-types.ts`) nunca os selecionam na query ao banco externo.

**⚠️ Nota de risco funcional:** esses ~30 campos ficam **sempre `undefined` em produção hoje**, independente do que exista na linha real do banco — a lista de produtos do admin sempre mostra os fallbacks (`null`/`false`/`[]`) para NCM, alíquotas fiscais, tipo/material de embalagem, unidade de estoque, meta title/slug/SEO, etc. Corrigir isso exigiria estender o `SELECT` para essas colunas (risco de "column does not exist" se a coluna não existir de fato no banco externo — fora do escopo desta correção pontual de tipos). Recomenda-se investigação futura dedicada.

**Fix aplicado:**
1. Removido o cast para `ExternalProduct` (tipo errado/não relacionado). Criado um tipo local `PromobrindProductRow = PromobrindProduct & {...~30 campos opcionais...}` que documenta exatamente essa lacuna, com fallback `?? null`/`?? false` já existente no mapeamento (comportamento em runtime não muda).
2. Removidos 2 casts redundantes: `p.is_bestseller`/`p.is_kit` já existem em `PromobrindProduct` — o cast para `ExternalProduct` era desnecessário.
3. **Bug real encontrado e corrigido:** `colors: Array.isArray(p.colors) ? p.colors : []` — `PromobrindProduct.colors` pode conter tanto strings soltas (`"Azul"`) quanto objetos (`{name, hex, stock}`), mas `AdminProduct.colors` exige só objetos com `name`. Entradas string vazavam sem normalização, quebrando qualquer código que lesse `.name` (ex.: exibição de cor no admin). Corrigido normalizando string → `{ name: c }`.
4. **Bug real encontrado e corrigido:** `materials: p.materials ? (typeof p.materials === 'string' ? [p.materials] : p.materials) : []` — mesma classe de bug: quando `p.materials` já é array, objetos genéricos (`Record<string, unknown>`) vazavam sem normalização, embora `AdminProduct.materials` exija `string[]`. Corrigido reaproveitando `parseMaterials()` (helper já existente e testado em `src/utils/product-mapper.ts`, apenas exportado — antes era privado do módulo) em vez de duplicar lógica de normalização.

**Validação:**
- `tscheck-files.mjs`: 0 erros (20 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões.
- Teste dedicado: `tests/utils/product-mapper.test.ts` (15 testes) — passou integralmente após exportar `parseMaterials`.
- `typecheck:baseline`: 610 → 606 (339 arquivos), travado via `--update`.

## RoleMigrationPanel.tsx (etapa 17)

**Arquivo:** `src/components/admin/security/role-migration/RoleMigrationPanel.tsx`

**Erros originais (4× TS18048 "'meta' is possibly 'undefined'"):** linhas 326 (×2) e 360 (×2), ambos em expressões `<Badge variant={meta.variant} className={meta.className}>`.

**Diagnóstico:** `STATUS_BADGE` é tipado como `Record<string, { variant: ...; className?: string }>`. Com `noUncheckedIndexedAccess` ativo, isso afeta **qualquer** acesso resolvido via assinatura de índice — inclusive `STATUS_BADGE.pending` em notação de ponto, já que a chave `pending` não é uma propriedade explícita da assinatura `Record<string, ...>`, apenas mais uma chave coberta pelo índice genérico. Ou seja, mesmo o fallback `STATUS_BADGE[status] ?? STATUS_BADGE.pending` resolve para `{...} | undefined`, porque o segundo operando do `??` já carrega `| undefined` em seu próprio tipo.

**Fix aplicado:** asserção de não-nulo apenas no fallback (`STATUS_BADGE.pending!`), nos dois pontos de uso (linha 316 e 357). Justificativa: `pending` é uma chave literal declarada diretamente no objeto `STATUS_BADGE` poucas linhas acima no mesmo módulo — presença garantida estruturalmente pelo próprio código-fonte, não uma suposição sobre dado externo. `STATUS_BADGE[status]` (a busca dinâmica) continua sem asserção, preservando a checagem real de índice dinâmico.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `ed88282fe2`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 606 → 602 (338 arquivos), travado via `--update`.

## BridgesLiveCard.tsx (etapa 17)

**Arquivo:** `src/components/admin/telemetry/BridgesLiveCard.tsx`

**Erros originais (4×):** TS2345 (linha 147, argumento `number | undefined` não atribuível a `number` em `formatMs(totals.p50Ms)`), TS18048×2 (linhas 153 e 155, `totals.p95Ms` possivelmente `undefined` em comparações relacionais), TS2345 (linha 160, mesmo padrão em `formatMs(totals.p95Ms)`).

**Diagnóstico:** `p50` e `p95` são calculados via `sortedDur[Math.min(sortedDur.length - 1, Math.floor(f * sortedDur.length))]`. Sob `noUncheckedIndexedAccess`, todo acesso por índice a array retorna `T | undefined`, mesmo quando o índice é matematicamente garantido estar dentro dos limites — aqui, `Math.min(sortedDur.length - 1, ...)` clampa o índice ao intervalo válido `[0, length-1]`, e o próprio ternário só entra nesse ramo quando `sortedDur.length` é truthy (array não vazio). Ou seja, o acesso é estruturalmente seguro, mas o TS não consegue provar isso via análise de fluxo.

**Fix aplicado:** asserção de não-nulo (`!`) nos dois acessos por índice (`sortedDur[...]!"`), preservando o fallback `: 0` para o caso de array vazio.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `c4508bbee2`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 602 → 598 (337 arquivos), travado via `--update`.

## MiniCart.tsx + useCart.ts (etapa 17)

**Arquivos:** `src/components/cart/MiniCart.tsx`, `src/hooks/cart/useCart.ts`

**Erros originais (4× TS2339):** `updateQuantity.isPending` (linhas 117, 133) e `updateQuantity.mutate` (linhas 121, 137) — "Property does not exist on type '(itemId: string, quantity: number) => void'".

**⚠️ Bug real de produção encontrado (não apenas erro de tipo):** o hook `useCart()` expõe `updateQuantity: debouncedUpdateQuantity` — uma função simples `(itemId, quantity) => void` (versão com debounce de 1s para evitar spam no banco), **não** o objeto de mutation do React Query. `MiniCart.tsx` tratava esse valor como se fosse a mutation crua, chamando `.mutate({...})` e lendo `.isPending`. Como `updateQuantity` é uma função (sem essas propriedades), `updateQuantity.mutate` é `undefined` em runtime — clicar em "+"/"-" para alterar quantidade no carrinho lançaria `TypeError: updateQuantity.mutate is not a function`, quebrando a funcionalidade de ajuste de quantidade do carrinho em produção. Confirmado via grep que `MiniCart.tsx` é o único consumidor de `useCart()` que usa esse campo, então o bug era isolado a este componente.

**Fix aplicado:**
- `useCart.ts`: adicionado `isUpdatingQuantity: updateQuantity.isPending` ao objeto retornado, expondo o estado de pendência da mutation real sem alterar o comportamento de debounce já existente.
- `MiniCart.tsx`: troca de `disabled={updateQuantity.isPending}` por `disabled={isUpdatingQuantity}` (2 pontos) e de `updateQuantity.mutate({ itemId: item.id, quantity: ... })` por `updateQuantity(item.id, ...)` (2 pontos), chamando a função debounced diretamente como o hook já esperava ser usada.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros em `MiniCart.tsx` (12 no programa inteiro — 1 erro pré-existente em `useCart.ts:79`, já contabilizado no baseline antes desta mudança, sem relação com o fix).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `c4508bbee2`).
- Nenhum teste dedicado encontrado para `useCart`/`MiniCart`.
- `typecheck:baseline`: 598 → 594 (336 arquivos), travado via `--update`.

## CollectionsHeatmap.tsx (etapa 17)

**Arquivo:** `src/components/collections/CollectionsHeatmap.tsx`

**Erros originais (4×):** TS2532 (linha 31, `arr[maxI]` possivelmente `undefined` dentro do `reduce`), TS18048×3 (linhas 33 e 60×2, `peak` possivelmente `undefined`).

**Diagnóstico:** dois acessos por índice estruturalmente seguros mas não comprováveis pelo TS sob `noUncheckedIndexedAccess`:
- `arr[maxI]` dentro do `reduce` que computa `peakIdx`: `maxI` é inicializado em `0` e só reatribuído para `i`, que é sempre um índice válido de `arr` (o próprio array recebido pelo callback do `reduce`) — nunca pode estar fora dos limites.
- `data[peakIdx]`: `peakIdx` é o resultado desse mesmo `reduce`, garantido estar em `[0, data.length - 1]`, e o guard `if (!data || data.length === 0) return null;` já garante `data` não vazio antes deste ponto.

**Fix aplicado:** asserção de não-nulo nos dois acessos (`arr[maxI]!` e `data[peakIdx]!`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (9 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `ec9b6c5543`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 594 → 590 (335 arquivos), travado via `--update`.

## SyncedZoomGallery.tsx (etapa 17)

**Arquivo:** `src/components/compare/SyncedZoomGallery.tsx`

**Erros originais (4×):** TS2345 (linha 85, `value[0]` possivelmente `undefined` passado a `setZoom`), TS18048 (linha 95, `sourceProduct` possivelmente `undefined`), TS2538 (linha 149, `undefined` usado como índice), TS2464 (linha 213, nome de propriedade computada precisa ser `string`).

**Diagnóstico:** três acessos por índice estruturalmente seguros sob `noUncheckedIndexedAccess`:
- `value[0]` no callback `onValueChange` do `Slider`: o componente é sempre montado com `value={[zoom]}` (array de 1 elemento), então o callback sempre recebe um array de mesmo tamanho — `value[0]` nunca é `undefined` na prática.
- `products[slotIdx]` dentro de `selectColor`: função local (não exportada), chamada apenas de `onClick={() => selectColor(slotIdx, idx)}` dentro do `products.map(...)`, onde `slotIdx` é sempre um índice válido de `products`.
- `productKeys[slotIdx]` dentro do render principal: `productKeys = products.map((_, i) => \`slot-${i}\`)` tem exatamente o mesmo tamanho de `products`, então indexar por um `slotIdx` vindo de `products.map(...)` é sempre válido — essa era a causa raiz dos dois erros aparentemente distintos (TS2538 na linha 149 e TS2464 na linha 213), ambos decorrentes do mesmo `slotKey: string | undefined` se propagando para usos downstream.

**Fix aplicado:** asserção de não-nulo nos três pontos de origem (`value[0]!`, `products[slotIdx]!`, `productKeys[slotIdx]!`), corrigindo também os dois erros derivados do `slotKey`.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `b022d80b8b`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 590 → 586 (334 arquivos), travado via `--update`.

## useExpertChat.ts (etapa 17)

**Arquivo:** `src/components/expert/chat/useExpertChat.ts`

**Erros originais (4×):** TS2345×2 (linhas ~102 e ~105, `msgs[0]`/`msgs[idx]` possivelmente `undefined` passados a `setThinkingMessage`), TS2345 (linha ~122, `profile.full_name.split(" ")[0]` possivelmente `undefined` passado a `setSellerFirstName`), TS2532 (linha ~394, segundo acesso não-guardado a `n[n.length - 1]` após um guard opcional-chained anterior no mesmo bloco).

**Diagnóstico:**
- Rotação de mensagens de "pensando": `msgs` é sempre `THINKING_MESSAGES` ou `THINKING_MESSAGES_CRM`, ambos arrays literais não vazios declarados no topo do módulo; `idx` sempre orbita em `[0, msgs.length - 1]` via `(idx + 1) % msgs.length` — acesso estruturalmente seguro.
- `profile.full_name.split(" ")[0]`: `String.prototype.split` sempre retorna um array com ao menos 1 elemento — acesso estruturalmente seguro.
- `n[n.length - 1]` no updater de `setMessages`: o guard `n[n.length - 1]?.role === "assistant"` não propaga a garantia de "definido" para o segundo acesso não-opcional (`n[n.length - 1].content = ...`) na mesma expressão, pois são duas leituras de índice distintas aos olhos do TS.

**Fix aplicado:**
- Asserção de não-nulo nos dois acessos de rotação de mensagens (`msgs[0]!`, `msgs[idx]!`) e no `split(" ")[0]!`.
- Para o terceiro caso, em vez de asserção, extração para uma constante local (`const last = n[n.length - 1]; if (last?.role === "assistant") last.content = assistantMessage;`) — evita duplicar o acesso por índice e é mais limpo que uma segunda asserção.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (18 no programa inteiro, erros pré-existentes não relacionados).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `5b77710cc1`).
- Teste dedicado encontrado e executado: `tests/components/expert/ExpertChatDialog.test.tsx` — 2/2 passaram.
- `typecheck:baseline`: 586 → 582 (333 arquivos), travado via `--update`.

## FavoritesHeatmap.tsx (etapa 17)

**Arquivo:** `src/components/favorites/FavoritesHeatmap.tsx`

**Erros originais (4×):** TS2532 (linha 32, `arr[maxI]` possivelmente `undefined` dentro do `reduce`), TS18048×3 (linhas 34 e 61×2, `peak` possivelmente `undefined`).

**Diagnóstico:** padrão idêntico ao já corrigido em `CollectionsHeatmap.tsx` — dois acessos por índice estruturalmente seguros sob `noUncheckedIndexedAccess`:
- `arr[maxI]` dentro do `reduce` que computa `peakIdx`: `maxI` inicia em `0` e só é reatribuído para `i`, sempre um índice válido do próprio `arr`.
- `data[peakIdx]`: `peakIdx` é o resultado desse `reduce`, garantido em `[0, data.length - 1]`, com `data` não vazio assegurado pelo guard anterior (`if (!data || data.length === 0) return null;`).

**Fix aplicado:** asserção de não-nulo nos dois acessos (`arr[maxI]!` e `data[peakIdx]!`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (9 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `f52399ff49`).
- Nenhum teste dedicado encontrado para este componente (`tests/hooks/useFavorites.test.ts` e `tests/stores/useFavoritesStore.test.ts` cobrem hook/store, não este componente).
- `typecheck:baseline`: 582 → 578 (332 arquivos), travado via `--update`.

## FilterPanel.tsx (etapa 17)

**Arquivo:** `src/components/filters/FilterPanel.tsx`

**Erros originais (4×):** TS2322 (linha 239, props inválidas passadas a `GenderBadge`), TS2551 (linha 239, `filters.genders` não existe em `FilterState` — quis dizer `gender`), TS2345 (linha 240, `"genders"` não é uma chave válida de `FilterState`), TS2345 (linha 281, `sectionRenderers[sId]` possivelmente `undefined` passado para um parâmetro não opcional).

**Diagnóstico — bug real de produção, não apenas erro de tipo:** a seção "gênero" do painel de filtros usava `GenderBadge` (`@/components/products/GenderBadge`) como se fosse um chip de filtro clicável, mas esse componente é somente leitura — suas props são só `gender`, `size`, `className` (usado em `ProductCard.tsx`/`ProductListItem.tsx`/`ProductDetailHero.tsx` exclusivamente para exibir o gênero de um produto). As props `selected` e `onClick` passadas em `FilterPanel.tsx` não existem em `GenderBadgeProps` — ou seja, clicar em "Masculino/Feminino/Unissex" no filtro **não fazia nada**: nenhum `onClick` era de fato ligado ao DOM, e não havia nenhum estado visual de seleção. Somado a isso, o código referenciava `filters.genders` (chave inexistente — o campo real em `FilterState` é `gender: string[]`) e passava a string `"genders"` para `toggleArrayFilter`, que exige `keyof FilterState`.

**Fix aplicado:**
- Seção "genero" reescrita para renderizar botões de toggle no mesmo padrão já usado na seção "temas" (chip com classe condicional `isSelected`), corrigindo `filters.genders` → `filters.gender` e `"genders"` → `"gender"`.
- Import de `GenderBadge` removido de `FilterPanel.tsx` (permanece em uso normal nos demais arquivos).
- `renderSection`: segundo parâmetro tornado opcional (`renderContent?: () => React.ReactNode`) com guard `if (!config || !renderContent) return null;`, no mesmo estilo defensivo já usado para `config` — protege contra o caso (hoje impossível, mas não comprovável pelo TS) de um id em `SECTION_GROUPS` sem entrada correspondente em `sectionRenderers`.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (14 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `8693dee067`).
- Teste dedicado encontrado e executado: `tests/components/filters/FilterPanel.test.tsx` — 2/2 passou.
- `typecheck:baseline`: 578 → 574 (331 arquivos), travado via `--update`.

## TrendsHeatmap.tsx + supabase-untyped.ts + TopCategoriesCard.tsx (etapa 17)

**Arquivos:** `src/components/intelligence/TrendsHeatmap.tsx`, `src/lib/supabase-untyped.ts`, `src/components/intelligence/TopCategoriesCard.tsx`

**Erros originais em `TrendsHeatmap.tsx` (4×):** TS2339×2 (linhas 28-29, `.gte()` não existe em `UntypedFilterBuilder<Record<string, unknown>>`), TS2532×2 (linha 36, `matrix[d.getDay()]` possivelmente `undefined`).

**Diagnóstico — lacuna real no wrapper compartilhado, não apenas erro de tipo no call site:** `UntypedFilterBuilder` (`src/lib/supabase-untyped.ts`) declarava os métodos `eq`, `neq`, `in`, `order`, `limit`, `select`, `single`, `maybeSingle`, mas **não `gte`** — apesar do objeto retornado em runtime ser o query builder real do Supabase (que sempre teve `.gte()`), só faltava a declaração de tipo. `TrendsHeatmap.tsx` e `TopCategoriesCard.tsx` (`src/components/intelligence/TopCategoriesCard.tsx`) já usavam `.gte("created_at", ...)` — ambos os arquivos eram consumidores reais dessa lacuna, então o método foi adicionado ao wrapper compartilhado (fix de causa raiz, não um workaround local) em vez de contornar cada call site individualmente.

**Efeito colateral esperado ao corrigir o wrapper:** com `.gte()` agora tipado, o TS passou a checar toda a cadeia de tipos que antes era interrompida no primeiro erro (`Record<string, unknown>[] | null` inferido por `untypedFrom(...)` sem parâmetro genérico explícito) — revelando um erro TS2345 pré-existente e até então mascarado em cada arquivo (`fill(views)` em `TrendsHeatmap.tsx`; o callback do `.forEach` em `TopCategoriesCard.tsx`). Corrigido parametrizando `untypedFrom<T>(...)` explicitamente com o shape de linha esperado em cada chamada (`{ created_at: string }` e `{ product_name: string | null; created_at: string }`, respectivamente).

**`matrix[d.getDay()]` (TS2532×2):** `matrix` é `Array.from({ length: 7 }, ...)` (sempre 7 elementos) e `Date.prototype.getDay()` sempre retorna um inteiro em `[0, 6]` — acesso estruturalmente seguro, mas em `matrix[d.getDay()][d.getHours()] += 1` o erro repetia na mesma posição porque a atribuição composta (`+=`) exige tanto leitura quanto escrita do valor, e o `!` isolado em `matrix[d.getDay()]!` não elimina o `undefined` do resultado da segunda indexação (`row[hora]`) sob `noUncheckedIndexedAccess`. Extraído `const row = matrix[d.getDay()]!;` e aplicado `row[d.getHours()]! += 1;` (segunda asserção necessária na leitura/escrita do valor incrementado, também estruturalmente segura: `row` tem sempre 24 posições e `getHours()` sempre retorna `[0, 23]`).

**Validação:**
- `tscheck-files.mjs` (3 arquivos): 4 → 0 erros em `TrendsHeatmap.tsx`, 1 → 0 em `TopCategoriesCard.tsx` (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `e95964a00c`).
- Nenhum teste dedicado encontrado para nenhum dos três arquivos.
- `typecheck:baseline`: 574 → 569 (329 arquivos), travado via `--update`.

## KitHealthCard.tsx (etapa 17)

**Arquivo:** `src/components/kit-builder/KitHealthCard.tsx`

**Erros originais (4×):** TS2322 (linha 32, `sorted[lo]` possivelmente `undefined` retornado como `number`), TS2532×3 (linha 33, `sorted[lo]`/`sorted[hi]` possivelmente `undefined` em expressão aritmética).

**Diagnóstico:** função `percentile(sorted, p)` — `lo = Math.floor(idx)` e `hi = Math.ceil(idx)`, onde `idx = (p / 100) * (sorted.length - 1)`. Como a função só é chamada com `p` em `{25, 75}` e o guard `if (!sorted.length) return 0;` garante `sorted` não vazio, `idx` está sempre em `[0, sorted.length - 1]`, então tanto `lo` quanto `hi` são sempre índices válidos de `sorted` — acesso estruturalmente seguro sob `noUncheckedIndexedAccess`.

**Fix aplicado:** asserção de não-nulo nos três acessos (`sorted[lo]!`, `sorted[hi]!`, reaproveitado na expressão de interpolação linear).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3336 erros globais, referência `origin/main` em `8b9ea1fc40`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 569 → 565 (328 arquivos), travado via `--update`.

## AdImageResult.tsx (etapa 17)

**Arquivo:** `src/components/magic-up/AdImageResult.tsx`

**Erros originais (4×):** TS2300×2 (linhas 16 e 20, identificador duplicado `MagicUpCurationStatus`), TS2693 (linha 300, `MagicUpCurationStatus` só se refere a um tipo mas é usado como valor), TS7006 (linha 300, parâmetro `status` com tipo implícito `any`).

**Diagnóstico:** colisão real de nomes entre dois imports distintos e legítimos — o arquivo precisa tanto do **tipo** `MagicUpCurationStatus` (de `@/pages/magic-up/magicUpStrategy`, usado para tipar `curationStatus`/`onSetCurationStatus`) quanto do **componente** `MagicUpCurationStatus` (de `./MagicUpCurationStatus`, renderizado como `<MagicUpCurationStatus value={...} onChange={...} />` na linha 300). Como vêm de módulos diferentes, TS não os mescla como faria com uma classe (tipo+valor do mesmo símbolo) — resulta em identificador duplicado. Isso também impedia o TS de inferir corretamente o tipo do parâmetro `status` no callback `onChange` (cascata do import quebrado).

**Fix aplicado:** import do tipo renomeado via alias (`MagicUpCurationStatus as CurationStatus`), mantendo o nome original do componente para o uso em JSX. Atualizadas as 2 declarações de tipo que usavam o nome original (`curationStatus?: CurationStatus`, `onSetCurationStatus?: (status: CurationStatus) => void`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões — **drift positivo**: 1 erro de lint eliminado como efeito colateral (3336 → 3335 erros globais, referência `origin/main` em `3092287f83`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 565 → 561 (327 arquivos), travado via `--update`.

## TechniqueColorConfigDialog.tsx (etapa 17)

**Arquivo:** `src/components/mockup/TechniqueColorConfigDialog.tsx`

**Erros originais (4×):** TS18048 (linhas 128-129, `color` possivelmente `undefined` ao acessar `color.hex`, `color.selectedPantone`, `color.pantoneMatch?.pantoneCode`, `color.name`).

**Diagnóstico:** em `handleConfirm`, `config.selectedColors = selectedIndices.map((idx) => { const color = detectedColors[idx]; ... })` — sob `noUncheckedIndexedAccess`, `detectedColors[idx]` é `DetectedColor | undefined`. Diferente dos casos anteriores desta etapa, aqui o acesso **não** é estruturalmente seguro: `selectedIndices` é inicializado a partir de `currentConfig?.selectedPantoneIndices` (uma configuração salva em uma sessão anterior), enquanto `detectedColors` é a lista de cores *atual*, vinda de uma nova análise de logo. Se o logo for reanalisado (novo array `detectedColors`, possivelmente com tamanho diferente) e o diálogo reabrir com uma `currentConfig` antiga, `selectedIndices` pode conter índices que não existem mais no array atual — um caso real de dado potencialmente ausente em runtime, não apenas uma lacuna de tipagem.

**Fix aplicado:** guard real em vez de asserção de não-nulo — `selectedIndices.map((idx) => detectedColors[idx]).filter((color): color is DetectedColor => color !== undefined).map((color) => ({ hex: color.hex, pantoneCode: ... }))`. Índices órfãos (referentes a cores que não existem mais) são silenciosamente descartados, preservando o comportamento correto (não é possível reutilizar uma cor que já não está na lista detectada).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro, após a correção — apenas 1 erro restante no programa, não relacionado a este arquivo).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `a5737dbbba`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 561 → 557 (326 arquivos), travado via `--update`.

## OrderPilotWorkflow.tsx (etapa 17)

**Arquivo:** `src/components/orders/OrderPilotWorkflow.tsx`

**Erros originais (4×):** TS2339 (linha 21, propriedade `data` não existe no retorno de `usePilotApprovals`), TS2353 (linha 32, `photo_url` não existe em `Partial<PilotApproval>`), TS7053×2 (linhas 59-60, `statusConfig[latestApproval.status]` com índice implicitamente `any`).

**Diagnóstico — bug real de nomes de campo, não apenas gap de tipagem:** `usePilotApprovals` retorna `{ approvals, isLoading, error, createApproval, updateStatus }` (ver `src/hooks/usePilotApprovals.ts:88-94`), mas o componente desestruturava `{ data: approvals, ... }` — propriedade `data` nunca existiu no retorno do hook. Esse erro raiz também produzia efeito cascata: como a desestruturação falhava, `approvals` (e por consequência `latestApproval`) ficava com tipo `any` implícito, mascarando os TS7053 subsequentes ao indexar `statusConfig` com `latestApproval.status`.
Adicionalmente, o componente usava nomes de campo que nunca existiram no tipo `PilotApproval`/na tabela `order_pilot_approvals` (ver migration `20260502174252_...`): `photo_url` (campo real: `mockup_url`) e `comments` (campo real: `reviewer_notes`) — tanto no payload de criação (`createApproval.mutate`) quanto na leitura (`latestApproval.photo_url`, `latestApproval.comments`). Havia ainda `latestApproval.label`, um campo que nunca existiu no tipo (sempre `undefined` em runtime, mascarado pelo `any` cascata) — removido por ser código morto redundante com `statusConfig[status].label`.

**Fix aplicado:** desestruturação corrigida para `{ approvals, createApproval, updateStatus, isLoading }`; `photo_url` → `mockup_url` (nos 3 usos: payload de criação, preview de imagem, condicional de exibição); `comments` → `reviewer_notes` (payload de criação e exibição); removida a referência morta a `latestApproval.label`.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `fec859a22f`).
- Nenhum teste dedicado encontrado para este componente ou hook.
- `typecheck:baseline`: 557 → 553 (325 arquivos), travado via `--update`.

## CustomizationOptions.tsx (etapa 17)

**Arquivo:** `src/components/pricing/simulator/CustomizationOptions.tsx`

**Erros originais (4×):** TS2532 (linhas 52, 55, 155×2) — acesso a `colorOptions[0]`/`sizeOptions[0]` possivelmente `undefined`.

**Diagnóstico:** todos os 4 acessos são estruturalmente seguros sob `noUncheckedIndexedAccess`: linhas 52/55 estão dentro de `if (colorOptions.length > 0 ...)`/`if (sizeOptions.length > 0 ...)`, e a linha 155 está dentro de `{sizeOptions.length === 1 && (...)}` — em ambos os casos o guard de tamanho garante que o índice `0` existe.

**Fix aplicado:** asserção de não-nulo nos 4 acessos (`colorOptions[0]!.value`, `sizeOptions[0]!.value`, `sizeOptions[0]!.label`, `sizeOptions[0]!.areaCm2`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `2eef64359f`).
- Nenhum teste dedicado encontrado para este componente (`useProductCustomizationOptions.smoke.test.ts` testa um hook diferente).
- `typecheck:baseline`: 553 → 549 (324 arquivos), travado via `--update`.

## SearchWithSuggestions.tsx (etapa 17)

**Arquivo:** `src/components/search/SearchWithSuggestions.tsx`

**Erros originais (4×):** TS2345×2 (linhas 68-69, `allSuggestions[selectedIndex]` possivelmente `undefined` passado para `setQuery`/`onSearch`), TS2532×2 (linha 94, `event.results[0][0].transcript` — dois níveis de indexação possivelmente `undefined`).

**Diagnóstico:**
- **Linhas 68-69 (guard real, não estruturalmente seguro):** o handler de `Enter` só verificava `selectedIndex >= 0`, mas `selectedIndex` é estado independente de `allSuggestions` (que deriva de props `suggestions`/`recentSearches` e do `query` atual) — se a lista de sugestões encolher entre uma navegação por seta e o Enter (ex.: prop `suggestions` atualiza de forma assíncrona), `selectedIndex` pode ficar fora dos limites do array atual, tornando `allSuggestions[selectedIndex]` genuinamente `undefined` em runtime.
- **Linha 94:** `event.results[0][0].transcript` na Web Speech API — `results[0]` e `results[0][0]` são estruturalmente garantidos pelo contrato do navegador (o evento `onresult` só dispara com pelo menos um resultado contendo pelo menos uma alternativa), mas o tipo `SpeechRecognitionResultList`/`SpeechRecognitionResult` usa assinatura de índice numérico, disparando `noUncheckedIndexedAccess` em ambos os níveis.

**Fix aplicado:**
- Guard real: `if (selected !== undefined) { setQuery(selected); onSearch(selected); setIsFocused(false); }` — evita disparar busca/seleção com valor inválido quando `selectedIndex` está desatualizado.
- Asserção de não-nulo nos dois níveis de indexação da Web Speech API (`event.results[0]![0]!.transcript`), estruturalmente seguro pelo contrato da API do navegador.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `b24ac5e904`).
- Nenhum teste dedicado encontrado para este componente.
- `typecheck:baseline`: 549 → 545 (323 arquivos), travado via `--update`.

## useAuthAAL.ts (etapa 17) — BUG REAL DE SEGURANÇA

**Arquivo:** `src/hooks/auth/useAuthAAL.ts`

**Erros originais (4×):** TS2339×4 (linhas 12-13, propriedades `currentLevel`/`nextLevel` não existem no retorno de `authService.fetchAAL()`).

**Diagnóstico — bug real, não apenas gap de tipagem:** `authService.fetchAAL()` (`src/services/authService.ts:7-15`) retorna `{ currentAAL, nextAAL, hasMFA }`, mas o hook lia `data.currentLevel`/`data.nextLevel` — nomes que nunca existiram no objeto retornado. Isso significa que `setCurrentAAL`/`setNextAAL` sempre recebiam `undefined`, e os estados `currentAAL`/`nextAAL` do hook **nunca refletiam o AAL real do usuário** após qualquer chamada a `fetchAAL()`.
Esse hook é consumido por `AuthContext.tsx` (linha 88), que calcula `mfaRequired: nextAAL === 'aal2' && currentAAL !== 'aal2'` (linha 383) — com `nextAAL` sempre `undefined`, essa condição **nunca era verdadeira**, o que significa que a detecção de "step-up MFA necessário" (quando a política do usuário exige `aal2` mas a sessão atual está em `aal1`) estava **completamente inoperante em produção**, silenciosamente, sem erro visível — apenas os tipos genéricos `undefined` mascarados por `'aal1' | 'aal2' | null` tornavam o gap invisível até o `noUncheckedIndexedAccess`/checagem estrita revelar o TS2339 pela ausência real das propriedades.

**Fix aplicado:** correção dos nomes de campo lidos do retorno de `fetchAAL()`: `data.currentLevel` → `data.currentAAL`, `data.nextLevel` → `data.nextAAL`.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa, considerando o próprio arquivo).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `13a08d15d2`).
- Teste dedicado `tests/contexts/AuthContext.test.tsx`: 5/5 passou.
- `typecheck:baseline`: 545 → 541 (322 arquivos), travado via `--update`.

**Recomendação:** validar manualmente em produção/staging que o fluxo de step-up MFA (usuário com fator TOTP verificado, política exigindo `aal2`) agora bloqueia corretamente ações sensíveis até a segunda etapa de autenticação ser completada — esse comportamento estava quebrado antes desta correção.

## useUndoRedo.ts (etapa 17)

**Arquivo:** `src/hooks/simulator/useUndoRedo.ts`

**Erros originais (4×):** TS2322×2 (linhas 45, 54 — `history.past[...]`/`history.future[0]` possivelmente `undefined` atribuído a `present: S`), TS2345×2 (linhas 90, 94 — `historyDispatch({ type: '__UNDO__' } as unknown)`/`as unknown` não atribuível ao parâmetro esperado).

**Diagnóstico:**
- Linhas 45/54: acesso estruturalmente seguro — ambos protegidos por early-return no bloco anterior (`if (history.past.length === 0) return history;` / `if (history.future.length === 0) return history;`), garantindo que o índice acessado existe.
- Linhas 90/94: causa raiz é o próprio cast `as unknown` — o literal `{ type: '__UNDO__' }` já é diretamente atribuível ao parâmetro esperado de `historyDispatch` (inferido do `useReducer` como `A | { type: '__UNDO__' } | { type: '__REDO__' }`); o `as unknown` alargava o tipo para `unknown` e então quebrava a atribuição de volta — o cast nunca deveria ter existido.

**Fix aplicado:** asserção de não-nulo nos dois acessos estruturalmente seguros (`history.past[...]!`, `history.future[0]!`); remoção do cast `as unknown` desnecessário nas duas chamadas de `historyDispatch`.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `839095c1c5`).
- Teste dedicado `tests/hooks/useUndoRedo.test.ts`: 10/10 passou.
- `typecheck:baseline`: 541 → 537 (321 arquivos), travado via `--update`.

## useComparisonScore.ts (etapa 17)

**Arquivo:** `src/hooks/useComparisonScore.ts`

**Erros originais (4×):** TS2345 (linhas 91, 92, 93, 96 — `prices[i]`/`stocks[i]`/`mins[i]`/`leadTimes[i]` possivelmente `undefined` passados para parâmetros `number`).

**Diagnóstico:** `prices`, `stocks`, `mins`, `leadTimes` são todos derivados via `products.map(...)` e indexados pelo mesmo `i` do `products.map((p, i) => ...)` externo — como todos têm exatamente `products.length` elementos e `i` sempre está no intervalo `[0, products.length - 1]`, o acesso é estruturalmente seguro sob `noUncheckedIndexedAccess`. Curiosidade: `colorCounts[i]` (mesma linha de raciocínio, linha 94) não disparou erro porque `colorCounts` é inferido como `any[]` (a expressão `p.colors?.length ?? 0` nunca perde o `any` de `p: any`, ao contrário de `prices`/`stocks`/`mins`/`leadTimes` que passam por `Number(...)`, forçando o tipo `number[]`).

**Fix aplicado:** asserção de não-nulo nos 4 acessos (`prices[i]!`, `stocks[i]!`, `mins[i]!`, `leadTimes[i]!`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `85e68c4559`).
- Teste dedicado `tests/hooks/useComparisonScore.test.ts`: 5/5 passou.
- `typecheck:baseline`: 537 → 533 (320 arquivos), travado via `--update`.

## useGravacaoPriceV2.ts (etapa 17)

**Arquivo:** `src/hooks/useGravacaoPriceV2.ts`

**Erros originais (4×):**
- TS18048 (linha 235 — `techResults.records` possivelmente `undefined`).
- TS2345 ×3 (linhas 325, 365, 392 — `CustomizationPriceResponse` não atribuível a `Record<string, unknown>` no parâmetro de `adaptPriceResponse`).

**Diagnóstico 1 — guarda real (não é o mesmo padrão de `areasResult.records` no mesmo arquivo):** `techResults = await invokeExternalDb<TabelaOficialRaw>({...})` retorna `InvokeResult<T>` (`src/lib/external-db/invoke.ts`), cujo campo `records` é `T[] | undefined` — genuinamente opcional no contrato de tipo da API. Isso contrasta com `areasResult.records` (linhas 219/243, mais acima no mesmo arquivo), que vem de um objeto literal `{ records: fetchedAreas as unknown as ProductPrintAreaRaw[] }` com `records` não-opcional, e por isso corretamente não gera erro. Como a ausência de `records` é uma possibilidade real de runtime (não apenas um ponto cego do TS), o fix é uma guarda real, não uma asserção de não-nulo.

**Fix 1 aplicado:** `for (const t of techResults.records) {` → `for (const t of techResults.records ?? []) {`.

**Diagnóstico 2 — padrão já estabelecido no código:** `adaptPriceResponse(resp: Record<string, unknown> | null | undefined)` (`src/lib/personalization/adapters/price-response.adapter.ts`) não aceita diretamente o tipo mais específico `CustomizationPriceResponse` retornado por `invokeExternalRpc<CustomizationPriceResponse>(...)`. O mesmo cast já é usado em `src/hooks/simulator/useWizardPricing.ts` (linhas 67, 160) e `src/hooks/simulation/simulationPriceFetcher.ts` (linha 225) para o mesmo cenário — reaproveitado aqui em vez de inventar uma solução nova (zero churn).

**Fix 2 aplicado (3 call sites):** `adaptPriceResponse(result)` → `adaptPriceResponse(result as unknown as Record<string, unknown>)` em `useCustomizationPriceV2().calculatePrice` (linha 325), `useCustomizationPriceReactive()` (linha 365, variável `data`) e `calculateCustomizationPrice()` (linha 392).

**Nota:** o mesmo erro TS2345 existe em `src/components/pricing/ConfigurationPanel.tsx:120` (`adaptPriceResponse(result)`) — não corrigido aqui por estar fora do escopo deste arquivo; candidato natural quando seu próprio tier for alcançado.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `927b0ca921`).
- Teste dedicado `tests/hooks/useGravacaoPriceV2.test.ts`: 8/8 passou.
- `typecheck:baseline`: 533 → 529 (319 arquivos), travado via `--update`.

## useMarketIntelligenceMacro.ts (etapa 17)

**Arquivo:** `src/hooks/useMarketIntelligenceMacro.ts`

**Erros originais (4×):**
- TS18048 (linha 82 — `result.records` possivelmente `undefined`).
- TS18048 ×3 (linhas 83, 111, 135 — `cutoffStr`/`d7Str` possivelmente `undefined`).

**Diagnóstico:**
- `result.records` — mesmo padrão de `useGravacaoPriceV2.ts`: `invokeExternalDb<T>` retorna `InvokeResult<T>` com `records?: T[]`, genuinamente opcional no contrato de tipo.
- `cutoffStr`/`d7Str` — ambos derivados de `date.toISOString().split('T')[0]`. `Date.prototype.toISOString()` sempre retorna o formato ISO 8601 estendido (ex: `2026-09-22T12:34:56.789Z`), que contém exatamente um `'T'` — logo `.split('T')` sempre produz um array de 2 elementos, tornando o acesso `[0]` estruturalmente seguro sob `noUncheckedIndexedAccess`, apesar do TS não conseguir provar isso.

**Fix aplicado:**
- `for (const row of result.records) {` → `for (const row of result.records ?? []) {` (guarda real).
- `cutoff.toISOString().split('T')[0]` → `cutoff.toISOString().split('T')[0]!` (asserção de não-nulo na declaração, estruturalmente segura).
- `d7.toISOString().split('T')[0]` → `d7.toISOString().split('T')[0]!` (idem — resolve os 2 usos nas linhas 111 e 135, já que a asserção é aplicada uma vez na declaração).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `67f05e5bf5`).
- Nenhum teste dedicado encontrado para este hook.
- `typecheck:baseline`: 529 → 525 (318 arquivos), travado via `--update`.

## useTechniquePricing.ts (etapa 17)

**Arquivo:** `src/hooks/useTechniquePricing.ts`

**Erros originais (4×):**
- TS2362/TS2363 (linha 87 — operandos de multiplicação tipados `unknown`).
- TS2322 ×2 (linhas 185, 188 — `TechniquePriceOption | undefined` não atribuível a `TechniquePriceOption | null`).

**Diagnóstico:**
- Linha 87: `areaCm2: (t.max_area_width_cm || 0) * (t.max_area_height_cm || 0)` — `t: Record<string, unknown>` (parâmetro anotado explicitamente no `.map()`), então `t.max_area_width_cm` é `unknown`. Diferente dos campos vizinhos (`maxColors: t.max_colors || 1`, etc.), que não geram erro porque `matchingTables` é `any` (herdado de `data.data.records` vindo de `supabase.functions.invoke(...)`, não tipado) — quando a base é `any`, `.map()`/`.filter()` retornam `any` e a atribuição a `TechniquePriceOption[]` não é checada. Mas a operação aritmética `unknown * unknown` é checada independentemente do contexto de atribuição, pois o TS valida os operandos do operador `*` pela própria expressão.
- Linhas 185/188: `findMatchingTable` já retorna cedo (`if (priceOptions.length === 0) return null;`) antes de qualquer uso de `priceOptions[0]` — logo, no restante da função, `priceOptions[0]` é estruturalmente garantido definido, apesar do TS não propagar essa garantia sob `noUncheckedIndexedAccess`.

**Fix aplicado:**
- `(t.max_area_width_cm || 0) * (t.max_area_height_cm || 0)` → `(Number(t.max_area_width_cm) || 0) * (Number(t.max_area_height_cm) || 0)` (coerção numérica explícita).
- `priceOptions[0]` → `priceOptions[0]!` nas duas linhas de retorno (asserção de não-nulo, estruturalmente segura pela guarda de `length === 0` no topo da função).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `6a5a23c6f6`).
- Teste dedicado `tests/hooks/useTechniquePricing.test.ts`: 16/16 passou.
- `typecheck:baseline`: 525 → 521 (317 arquivos), travado via `--update`.

## webSpeechFallback.ts (etapa 17)

**Arquivo:** `src/hooks/voice/webSpeechFallback.ts`

**Erros originais (4×):**
- TS2322 (linha 48 — `{ new (): SpeechRecognition; prototype: SpeechRecognition; }` não atribuível a `SpeechRecognitionConstructor`).
- TS18048/TS2532 (linha 80 — `result` possivelmente `undefined`).
- TS18048 (linha 82 — `result` possivelmente `undefined`).

**Diagnóstico:**
- Linha 48: o arquivo declarava localmente suas próprias interfaces `SpeechRecognitionEvent`, `SpeechRecognition` e o tipo `SpeechRecognitionConstructor` — duplicando (com shape ligeiramente diferente) as declarações ambiente globais já existentes em `src/types/speech-recognition.d.ts` (usadas por outras partes do app: busca por voz, chat expert). Como o arquivo é um módulo (tem `import`/`export`), suas interfaces locais *sombreiam* as globais só dentro dele — mas `window.SpeechRecognition`/`window.webkitSpeechRecognition` (tipados via `interface Window` global) sempre resolvem para a interface `SpeechRecognition` **global**, que não é estruturalmente idêntica à local (ex.: assinaturas de `onerror`/`onresult` com `this` diferente). Resultado: incompatibilidade de tipo.
- Linhas 80/82: `const result = event.results[i];` — `event.results` é `SpeechRecognitionResultList` (global, com `[index: number]: SpeechRecognitionResult`), então sob `noUncheckedIndexedAccess` o acesso por índice é `SpeechRecognitionResult | undefined`. O laço `for (let i = event.resultIndex; i < event.results.length; i++)` garante estruturalmente que `i` está sempre dentro do intervalo válido — o TS não propaga essa garantia. Da mesma forma, `result[0]` assume a 1ª alternativa de reconhecimento, garantida pelo contrato da Web Speech API (sempre ≥1 alternativa) e reforçada aqui por `recognition.maxAlternatives = 1`.

**Fix aplicado:**
- Removidas as declarações locais duplicadas (`SpeechRecognitionEvent`, `SpeechRecognitionConstructor`, `SpeechRecognition`) — reaproveitando as globais de `speech-recognition.d.ts` (zero churn, elimina a causa raiz do conflito em vez de adicionar mais um cast).
- `const SpeechRecognitionClass: SpeechRecognitionConstructor | undefined = ...` → `const SpeechRecognitionClass = ...` (inferência direta a partir do tipo global do `Window`).
- `event.results[i]` → `event.results[i]!` e `result[0]` → `result[0]!` (asserções de não-nulo, estruturalmente seguras pela guarda do laço e pelo contrato da API, mesmo padrão já aplicado em `SearchWithSuggestions.tsx` nesta sessão).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `93b57b0527`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 521 → 517 (316 arquivos), travado via `--update`.

## mockData.ts (etapa 17)

**Arquivo:** `src/lib/bi/mockData.ts`

**Erros originais (4×):** TS2532 ×2 (linhas 69, 70 — `base[4]`/`base[2]` possivelmente `undefined`); TS2322 ×2 (linhas 117, 127 — `monthLabel: string | undefined` não atribuível a `monthLabel: string`).

**Diagnóstico:** todos os 3 pontos de acesso indexado são estruturalmente seguros sob `noUncheckedIndexedAccess`:
- `base[4]`/`base[2]` — `base` é um array literal fixo com exatamente 10 elementos; os índices 4 e 2 estão sempre dentro do intervalo.
- `MONTH_LABELS_PT[i]` (2 ocorrências, em `client`/`industry`) — `MONTH_LABELS_PT` tem exatamente 12 elementos, e `i` vem de `.map((q, i) => ...)` sobre `clientPattern`/`industryPattern`, ambos também com exatamente 12 elementos (comentário do código confirma "12 meses") — `i` sempre está no intervalo `[0, 11]`, o mesmo de `MONTH_LABELS_PT`.

**Fix aplicado:** asserção de não-nulo nos 4 pontos (`base[4]!`, `base[2]!`, `MONTH_LABELS_PT[i]!` ×2).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `bb3cdf3af8`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 517 → 513 (315 arquivos), travado via `--update`.

## product-bounds-detector.ts (etapa 17)

**Arquivo:** `src/lib/product-bounds-detector.ts`

**Erros originais (4×):** TS18048 (linhas 110, 113 ×3 — `a`/`r`/`g`/`b` possivelmente `undefined`).

**Diagnóstico:** `data` é um `Uint8ClampedArray` (`ImageData.data` do canvas), e `noUncheckedIndexedAccess` também se aplica a typed arrays. `i = (y * w + x) * 4` com `x` variando em `[0, w-1]` e `y` em `[0, h-1]` (ambos garantidos pelos laços `for`) — o índice máximo `i + 3` nunca excede `data.length - 1`, já que o contrato da Canvas API garante `data.length === w * h * 4`. Estruturalmente seguro.

**Fix aplicado:** asserção de não-nulo nos 4 acessos (`data[i]!`, `data[i + 1]!`, `data[i + 2]!`, `data[i + 3]!`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `7bffabccea`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 513 → 509 (314 arquivos), travado via `--update`.

## supplier-colors.ts (etapa 17)

**Arquivo:** `src/lib/supplier-colors.ts`

**Erros originais (4×):** TS2322 (linhas 61, 64, 67, 71 — `SupplierColorConfig | undefined` não atribuível a `SupplierColorConfig`).

**Diagnóstico:** `SUPPLIER_COLORS` era tipado explicitamente como `Record<string, SupplierColorConfig>`. Sob `noUncheckedIndexedAccess`, o acesso por ponto (`SUPPLIER_COLORS.xbz`, `.spot`, `.asia`, `.default`) a uma propriedade que só existe via assinatura de índice (`[key: string]: T`) — e não como propriedade nomeada no tipo — é tratado como leitura pela assinatura de índice, retornando `T | undefined`, mesmo a chave sendo um literal conhecido definido no próprio objeto.

**Fix aplicado:** troca da anotação explícita `Record<string, SupplierColorConfig>` por `satisfies Record<string, SupplierColorConfig>` no fechamento do objeto literal. Isso preserva o tipo literal inferido do objeto (com as chaves exatas `xbz`, `spot`, `stricker`, `asia`, `default` como propriedades nomeadas, não via índice) enquanto ainda valida que cada entrada cumpre `SupplierColorConfig` — fix de causa raiz (não é uma asserção mascarando o sintoma), e reaproveita um padrão já usado no codebase (`useMagicUpState.ts`, `useClientCategoryAffinity.ts`, `product-search.ts`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `19a7c52ae1`).
- Teste dedicado `tests/lib/supplier-colors.test.ts`: 8/8 passou.
- `typecheck:baseline`: 509 → 505 (313 arquivos), travado via `--update`.

## useCollectionsPageState.ts (etapa 17)

**Arquivo:** `src/pages/collections/useCollectionsPageState.ts`

**Erros originais (4×):** TS2322 (linhas 54, 55, 91×2 — `defaultColors[0]`/`defaultIcons[0]` tipados `string | undefined` não atribuíveis a `color`/`icon: string`).

**Diagnóstico:** `defaultColors`/`defaultIcons` vêm de `useCollectionsContext()`, cuja interface (`CollectionsContextType` em `src/contexts/CollectionsContext.tsx`) os declara como `string[]` — um array plano sem garantia de não-vazio no tipo, embora a única implementação real (`DEFAULT_COLORS`/`DEFAULT_ICONS` em `src/hooks/useCollections.ts`) seja um array literal fixo de 8 elementos. Como o contrato do tipo do Context não garante isso (diferente de um array literal indexado na mesma função), tratado como genuinely-nullable-per-contrato, não como acesso estruturalmente seguro.

**Fix aplicado:** fallback real nos 3 pontos de uso (`defaultColors[0] ?? "#8B5CF6"`, `defaultIcons[0] ?? "📁"`), usando os mesmos valores do primeiro elemento de `DEFAULT_COLORS`/`DEFAULT_ICONS` como default — mesmo padrão já usado em outros consumidores do mesmo context (`CollectionsPage.tsx` usa `col.color || defaultColors[0]`).

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (36 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `d5034bfffa`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 505 → 501 (312 arquivos), travado via `--update`.

## useFiltersPageState.ts (etapa 17)

**Arquivo:** `src/pages/filters/useFiltersPageState.ts`

**Erros originais (4×):** TS2345 (linhas 119, 121 — `1`/`2` não atribuíveis a `SetStateAction<ColumnCount>`), TS2339 (linha 205 — `toLowerCase` não existe em `never`), TS2322 (linha 273 — `string | undefined` não atribuível a `string`).

**Diagnóstico — bug real de produção encontrado (linhas 119/121):** o `useEffect` "Responsive clamp" chamava `setGridColumns(1)`/`setGridColumns(2)` em telas estreitas. Arqueologia via `git log`/`git show` confirmou que `ColumnCount` (`3 | 4 | 5 | 6 | 8`, em `ColumnSelector.tsx`) nunca incluiu `1` ou `2` desde a criação do tipo (commit `cb8ffe894`, 2026-02-26) — e o bloco de clamp foi adicionado depois (commit `a0572f847`, 2026-04-05) sem alinhar com o tipo já existente. Ou seja, **o código nasceu type-invalid**, não é regressão de refactor posterior. Como o Vite não type-checa em runtime, o bloco executava de fato e gravava valores `1`/`2` fora do domínio do tipo — e como nem esse efeito nem o `ColumnSelector.tsx` (que tem seu próprio `useEffect` interno, sempre montado, que já clampa pra baixo até o piso válido de `3` quando a tela estreita) restauram o valor ao alargar a tela de novo, isso criava um bug latente de "grid preso em contagem baixa de colunas após redimensionar de volta pro desktop". Confirmado também que `LayoutPopover.tsx` e `FiltersPage.tsx` só consomem `gridColumns` como `ColumnCount` estrito — nenhum consumidor depende dos valores 1/2.

**Fix aplicado (119/121):** removido o bloco inteiro do `useEffect` "Responsive clamp" (era redundante com o clamp interno de `ColumnSelector.tsx`, sempre montado na página via `columnSelector={<ColumnSelector value={state.gridColumns} onChange={state.setGridColumns} />}` em `FiltersPage.tsx`) — corrige o erro de tipo e o bug latente na mesma mudança, sem introduzir nenhum comportamento novo.

**Diagnóstico (linha 205):** `Product.materials` (`src/types/product-catalog.ts`) é tipado `string[]` sempre (não-opcional, nunca `string`). Sob esse tipo, o branch `else` do ternário `Array.isArray(product.materials) ? ... : (product.materials || '')` é estruturalmente inalcançável — o TS prova isso estreitando `product.materials` pra `never` nesse branch, e a expressão `(never || '').toLowerCase()` propaga o `never`, travando o erro.

**Fix aplicado (205):** simplificado o ternário para `product.materials.join(' ').toLowerCase()` (remoção de código morto comprovadamente inalcançável, sem mudança de comportamento — o branch `else` nunca executava).

**Nota de risco funcional (fora do escopo desta correção de tipo):** `mapLightweightToProduct` em `src/hooks/useProductsLightweight.ts` (linha 59) grava `materials: []` sempre, hardcoded — ou seja, pra qualquer produto carregado via `useProductsCatalog` (usado por esta página), `product.materials` é sempre um array vazio em produção. Isso significa que o filtro de fallback por texto livre (`filters.materiais`, quando `!hasMaterialFilter`) nunca encontra nenhum produto: `materialsStr` é sempre `''`, e `''.includes(qualquerTermoNãoVazio)` é sempre `false`, então **todo produto é filtrado quando esse fallback está ativo**. Não corrigido nesta etapa — populair `materials` de verdade no mapper "lightweight" é mudança funcional/de dados fora do escopo de um fix de tipo (`useProductsLightweight.ts` documenta explicitamente no cabeçalho que não faz enriquecimento de cor/variante; pode ser decisão de design deliberada). Fica registrado para investigação futura.

**Diagnóstico (linha 273):** `filters.datasComemorativas[0]` é acessado dentro de um `if (filters.datasComemorativas.length > 0)` — a guarda de `.length` garante estruturalmente que o índice 0 existe, mas o TS não propaga esse narrowing pra acesso indexado sob `noUncheckedIndexedAccess`.

**Fix aplicado (273):** asserção de não-nulo (`filters.datasComemorativas[0]!`), mesmo padrão já usado no restante da sessão para acessos indexados protegidos por checagem de `.length` que o TS não propaga.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (21 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3335 erros globais, referência `origin/main` em `fc8523743b`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 501 → 497 (311 arquivos), travado via `--update`.

## SystemStatusPage.tsx (etapa 17)

**Arquivo:** `src/pages/SystemStatusPage.tsx` (+ `src/lib/crm-db.ts`, tipo compartilhado)

**Erros originais (4×):** TS2769 (linha 161 — overload de `.from()` não bate), TS2322 (linha 202 — `"batch"` não atribuível ao union de `operation`), TS2339 ×2 (linhas 210, 215 — propriedade `error` não existe no retorno de `invokeCrmDb`).

**Diagnóstico — bug real encontrado (linha 161, tabela inexistente):** `infraTables` incluía `"error_logs"`, uma tabela que **nunca existiu** no schema — confirmado via `grep` em `src/integrations/supabase/types.ts` (ausente) e busca em todas as migrations (nenhum `CREATE TABLE ... error_logs`). Arqueologia via `git log -S` mostrou que essa string foi introduzida uma única vez (commit `a1e122973`, genérico "Changes" de codegen) e nunca corrigida. O `as any` no acesso (`(supabase.from(t) as any).select(...)`) mascarava o erro de tipo, mas o efeito real em produção era o check "Infraestrutura de Segurança" **sempre reportar falha** (a query numa tabela inexistente sempre retorna erro), mesmo com IP whitelist, city whitelist e telemetria 100% operacionais — falso alarme permanente nesta página de diagnóstico.

**Fix aplicado (161):** removida `"error_logs"` do array `infraTables` (não havia substituto óbvio — nenhuma tabela real de "log de erro genérico" foi encontrada no schema nem em uso em nenhum outro lugar do código; documentado aqui como achado, não inventada uma tabela nova). Removido também o `as any`, que não é mais necessário — com as 3 tabelas restantes (`ip_whitelist`, `city_whitelist`, `telemetry_events`, todas reais), `.from(t)` resolve nos overloads corretos do client tipado.

**Diagnóstico (linhas 202/210/215, uso incorreto de API):** `runCrmHealthCheck` chamava `invokeCrmDb<...>({ operation: "batch", ... })` — mas `CrmQuery.operation` (em `src/lib/crm-db.ts`) só aceita `"select" | "search" | "insert" | "update" | "delete"`, nunca `"batch"` (erro na linha 202). Além disso, o tipo de retorno de `invokeCrmDb`, `CrmResponse<T> = { data: T; count?: number }`, **nunca** tem campo `error` — em caso de falha, a função lança exceção (`throw`) em vez de retornar um objeto com `.error` (erros 210/215). O código parecia ter sido escrito assumindo um contrato de API que `invokeCrmDb` nunca teve. Já existe, no mesmo arquivo, uma função dedicada e testada pra exatamente esse caso: `invokeCrmBatch(queries: CrmBatchQuery[]): Promise<CrmBatchResult[]>` (coberta por `tests/lib/crm-db-fixed.test.ts`), que já é usada internamente pelo endpoint de batch e devolve o array de resultados por tabela diretamente.

**Fix aplicado (202/210/215):** troca de `invokeCrmDb({ operation: "batch", ... })` por `invokeCrmBatch(queries)` (reaproveitamento de helper já testado — "zero churn", não duplicação de lógica), com tratamento de erro via `try/catch` (já que `invokeCrmBatch` lança exceção em vez de retornar `.error`) preservando a mesma mensagem de fallback pro usuário. Corrigido também um gap real de tipo em `CrmBatchResult` (interface compartilhada em `crm-db.ts`): faltavam os campos `unavailable?: boolean` e `warning?: string`, que a edge function `crm-db-bridge` **já envia de verdade** no modo batch (confirmado lendo `supabase/functions/crm-db-bridge/index.ts`, linhas 610-611) — a interface client-side estava desatualizada em relação ao contrato real do servidor.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros em `SystemStatusPage.tsx` (1 erro pré-existente e não relacionado permanece em `crm-db.ts`, linha 168 — `BridgeOperation` — já estava no baseline antes desta correção, não foi introduzido nem tocado por ela).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `0bb7a408cd`) — **drift positivo**: 1 erro eliminado (o `as any` removido).
- Teste dedicado `tests/lib/crm-db-fixed.test.ts` (cobre `invokeCrmBatch`, tocado indiretamente): 14/14 passou. Nenhum teste dedicado para `SystemStatusPage.tsx`.
- `typecheck:baseline`: 497 → 493 (310 arquivos), travado via `--update`.

## materialService.ts (etapa 17)

**Arquivo:** `src/services/materialService.ts`

**Erros originais (4×):** TS2322/TS2345 nas funções `getGroups`, `getTypes`, `getTypesByGroupSlug` e `getComplete` — os objetos retornados pelo `.map()` não eram atribuíveis a `MaterialGroup`/`MaterialType`/`MaterialComplete`.

**Diagnóstico:** as 4 funções mapeiam `Record<string, unknown>[]` (resposta bruta da API `materials-api`, formato ainda não 100% padronizado — por isso os fallbacks entre nomes de chave alternativos, ex. `g.group_id ?? g.id`) para as interfaces de domínio fortemente tipadas. Como cada elemento é `Record<string, unknown>`, qualquer acesso por ponto resolve pra `unknown`, e encadear `??` entre múltiplos nomes de chave possivelmente diferentes não estreita esse tipo — o resultado de `(g.group_id ?? g.id ?? "")` continua `unknown`, incompatível com os campos `string`/`number`/`boolean` das interfaces de destino.

**Fix aplicado:** cast explícito por campo bruto (`(campo as TipoEsperado | undefined) ?? fallback`) antes de cada `??`, mesmo padrão já estabelecido em outros pontos de fronteira com API não tipada no mesmo repo (`src/services/QuoteService.ts`, `src/hooks/useGravacaoV2.ts`, `src/hooks/useSimilarKits.ts`, `src/hooks/useDuplicateKitDetector.ts`). Aplicado nas 4 funções: `getGroups` (9 campos), `getTypes`/`getTypesByGroupSlug` (bloco idêntico, 9 campos cada), `getComplete` (13 campos).

**Ajuste intermediário (ESLint):** nos campos de `properties`/`type_properties` (tipados `Record<string, any> | null` nas interfaces `MaterialType`/`MaterialComplete`, `any` pré-existente e fora de escopo), o cast inicial usou `Record<string, any> | null | undefined`, o que introduziu 6 novos usos de `any` e quebrou o gate `@typescript-eslint/no-explicit-any` (base=3 → atual=9). Corrigido trocando para `Record<string, unknown> | null | undefined` — `unknown` não aciona a regra, e `Record<string, unknown>` continua estruturalmente atribuível a `Record<string, any> | null` (todo valor é atribuível a `any`), preservando o fix de tipo sem tocar nas declarações pré-existentes das interfaces.

**Validação:**
- `tscheck-files.mjs`: 4 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `739620b9f4`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 493 → 489 (309 arquivos), travado via `--update`.

## ConnectionTestHistoryPanel.tsx (etapa 17)

**Arquivo:** `src/components/admin/connections/ConnectionTestHistoryPanel.tsx`

**Erros originais (3×):** TS18048 ×2 (linha 183 — `last` possivelmente `undefined`), TS2532 (linha 430 — objeto possivelmente `undefined`).

**Diagnóstico:** ambos os pontos são acesso indexado protegido por checagem de `.length` que o `noUncheckedIndexedAccess` não propaga. Linha 183: `const last = points[points.length - 1]` dentro de `LatencySparkline`, com guarda anterior `if (sorted.length < 2) return null;` — `points` é derivado de `sorted.map(...)`, mesma cardinalidade, então `sorted.length >= 2` garante `points.length >= 2` e `last` sempre definido. Linha 430: `items[0].id` dentro de `if (items.length > 0) setHighlightId(items[0].id);` — a guarda garante o índice 0.

**Fix aplicado:** asserção de não-nulo nos 2 pontos (`last!.x`/`last!.y`, `items[0]!.id`), mesmo padrão já usado no restante da sessão para acessos indexados estruturalmente protegidos por checagem de `.length` que o TS não propaga.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (3 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `87cb3ee53b`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 489 → 486 (308 arquivos), travado via `--update`.

## ImageUploadButton.tsx (etapa 17)

**Arquivo:** `src/components/admin/ImageUploadButton.tsx`

**Erros originais (3×):** TS18046 ×2 (linha 85 — `error` do tipo `unknown`), TS2322 (linha 120 — `string | undefined` não atribuível a `string`).

**Diagnóstico — bug real de produção encontrado (linha 85):** dentro do `catch (error: unknown)`, o código já extraía corretamente `const err = error as Error & { status?: number; context?: any };` (linha 81), mas na linha seguinte usava `error.status`/`error.context` (a variável `unknown` original, não tipada) em vez de `err.status`/`err.context` — erro de digitação que quebrava a checagem de tipo. Efeito em produção: a lógica de "interromper retry em bloqueio de segurança 403" nunca compilaria sem o cast incorreto camuflado — o `err` extraído existia sem propósito, e o código só funcionava em runtime porque JS não é tipado (o acesso a `.status` em `unknown` não falha em runtime, mas o TS corretamente barra em compile-time).

**Fix aplicado (85):** trocado `error.status`/`error.context` por `err.status`/`err.context` (usar a variável já corretamente tipada, sem introduzir cast novo).

**Diagnóstico (linha 120):** `urlParts[1]` acessado dentro de `if (urlParts.length > 1)` — guarda estrutural garante o índice, mas `noUncheckedIndexedAccess` não propaga.

**Fix aplicado (120):** asserção de não-nulo (`urlParts[1]!`), mesmo padrão já usado para acessos indexados protegidos por checagem de `.length`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `263b141289`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 486 → 483 (307 arquivos), travado via `--update`.

## MockupPromptManager.tsx (etapa 17)

**Arquivo:** `src/components/admin/MockupPromptManager.tsx` (+ tipo compartilhado `src/components/admin/mockup-prompts/PromptDialogs.tsx`)

**Erros originais (3×):** TS2345 (linha 58 — `Technique[] | undefined` não atribuível a `Technique[]`), TS2769 (linha 70 — nenhuma sobrecarga de `.insert()` compatível), TS2352 (linha 85 — cast `as PromptHistory[]` "pode ser um engano").

**Diagnóstico — bug real de produção encontrado (linhas 66-82, `handleSave`):** o código fazia `.insert()` manual em `mockup_prompt_history` usando um schema desatualizado (coluna `prompt_text`, sem a coluna obrigatória `config_key`). Investigação nas migrations (`20260222134246_...` vs `20260416200125_...`) e em `src/integrations/supabase/types.ts` (fonte de verdade do schema ao vivo) revelou que: (1) a tabela `mockup_prompt_history` viva usa `config_key`/`old_prompt`/`new_prompt`, não `prompt_text`; (2) existe um trigger `BEFORE UPDATE` (`trg_log_mockup_prompt_change`, função `log_mockup_prompt_change()`) em `mockup_prompt_configs` que já incrementa `version` e insere automaticamente a linha de histórico correta sempre que `prompt_text`/`ai_model` muda. Ou seja, o insert manual era redundante com o trigger E usava um schema errado — em produção, **todo salvamento de prompt quebrava antes de chegar ao update real**, pois o insert malformado lançava exceção primeiro.

**Fix aplicado (66-82):** removido o insert manual; o histórico agora é gravado automaticamente pelo trigger do banco. Como o trigger não recebe `change_notes` (feature de UI existente em `PromptEditor.tsx`, input de texto), foi adicionado um `.update()` de acompanhamento em `mockup_prompt_history` (filtrado por `config_id` + `version`) para anexar a nota à linha que o trigger acabou de criar — preserva a feature sem duplicar a lógica de versionamento do trigger.

**Fix aplicado (interface `PromptHistory`, em `PromptDialogs.tsx`):** realinhado campo a campo com o `Row` real da tabela (`config_key: string; old_prompt: string | null; new_prompt: string;` substituindo o antigo `prompt_text: string`). Atualizado o único outro uso do campo (`HistoryDialog`, exibição do `<pre>`: `entry.prompt_text` → `entry.new_prompt`) e, em `MockupPromptManager.tsx`, `restoreVersion` (`entry.prompt_text` → `entry.new_prompt` ao restaurar uma versão antiga no editor).

**Fix aplicado (linha 58):** `setTechniques(tr.records)` → `setTechniques(tr.records ?? [])` — mesmo padrão já estabelecido no repo para respostas opcionais de `invokeExternalDb`/`InvokeResult<T>.records`.

**Fix aplicado (linha 85, `openHistory`):** com a interface `PromptHistory` agora idêntica ao `Row` gerado da tabela, o cast `(data || []) as PromptHistory[]` tornou-se redundante — confirmado via `tscheck-files.mjs` que `setHistory(data || [])` (sem cast) compila com 0 erros.

**Nota arquitetural (fora de escopo):** o trigger `trg_log_mockup_prompt_change` não captura `change_notes` no seu `INSERT` fixo — poderia ser corrigido na própria função do trigger (mudança de migration/arquitetura), mas isso está fora do escopo desta tarefa de zerar erros de TS ("zero churn"; só se justificaria mudança de arquitetura por decisão de negócio).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros em ambos os arquivos (10 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `357f80600f`).
- Nenhum teste dedicado encontrado para `MockupPromptManager.tsx`/`PromptDialogs.tsx`.
- `typecheck:baseline`: 483 → 480 (306 arquivos), travado via `--update`.

## useProductVideoGallery.ts (etapa 17)

**Arquivo:** `src/components/admin/products/video-gallery/useProductVideoGallery.ts`

**Erros originais (3×):** TS2345 (linha 197 — `File | undefined` não atribuível a `File`), TS2532 (linha 199 — objeto possivelmente `undefined`), TS2345 (linha 290 — `ExternalVideo | undefined` não atribuível a `ExternalVideo`).

**Diagnóstico:** todos os 3 são acessos estruturalmente protegidos que o `noUncheckedIndexedAccess` não propaga. Linhas 197/199: `files[i]` dentro de `for (let i = 0; i < files.length; i++)` — o laço garante `i < files.length`. Linha 290: `const [moved] = reordered.splice(dragIndex, 1);` dentro de `handleVideoDrop` — `dragIndex` é sempre um índice válido de `reordered` (`= [...filteredVideos]`), pois é definido via `handleVideoDragStart(index)` chamado a partir de `filteredVideos.map((video, index) => ...)` em `VideoGrid.tsx` (confirmado por grep), garantindo `splice` sempre retorna exatamente 1 elemento removido.

**Fix aplicado:** asserção de não-nulo nos 3 pontos (`files[i]!` nas linhas 197/199, `moved!` na linha 290), mesmo padrão já usado no restante da sessão para acessos indexados/desestruturados estruturalmente garantidos por laço ou por origem do índice.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `aa64b3cfff`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 480 → 477 (305 arquivos), travado via `--update`.

## CompareTableView.tsx (etapa 17)

**Arquivo:** `src/components/compare/CompareTableView.tsx`

**Erros originais (3×):** TS18048 (linha 80 — `entry` possivelmente `undefined`), TS2538 (linha 326 — `undefined` não pode ser usado como tipo de índice), TS2345 (linha 333 — `number | undefined` não atribuível a `number`).

**Diagnóstico:** linha 80 — `([entry]) => setHeaderStuck(!entry.isIntersecting)` desestrutura o array de entradas do `IntersectionObserver`; como só um elemento (`headerSentinelRef.current`) é observado (`observer.observe(el)`), o callback sempre recebe exatamente 1 entrada correspondente a esse alvo — garantia do próprio contrato da API `IntersectionObserver`, não propagada pelo TS via `noUncheckedIndexedAccess`. Linhas 326/333 — dentro de `HighlightedNumberRow`, `highlights` (retorno de `useComparisonHighlight(values, mode)`) e `values` (`= products.map(valueFn)`) têm sempre o mesmo comprimento de `products`, e a iteração é `products.map((_, idx) => ...)` — logo `highlights[idx]` e `values[idx]` são estruturalmente garantidos definidos pelo mesmo invariante de comprimento de array usado em `idx`.

**Fix aplicado:** asserção de não-nulo nos 3 pontos (`entry!.isIntersecting`, `highlights[idx]!`, `values[idx]!`), mesmo padrão já usado na sessão para garantias estruturais de contrato de API ou de invariante de comprimento de array entre arrays irmãos.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (7 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `7610d92924`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 477 → 474 (304 arquivos), travado via `--update`.

## ChatInputBar.tsx (etapa 17)

**Arquivo:** `src/components/expert/chat/ChatInputBar.tsx`

**Erros originais (3×):** TS2532 ×2 (linha 32 — acesso encadeado possivelmente `undefined`), TS2322 (linha 59 — `RefObject<HTMLTextAreaElement | null>` não atribuível a `LegacyRef<HTMLTextAreaElement> | undefined`).

**Diagnóstico (linha 32):** `event.results[0][0].transcript` dentro do callback `recognition.onresult` — `results[0]` (primeiro resultado reconhecido) e `[0]` (primeira alternativa, com `maxAlternatives = 1` configurado na linha 29) são garantidos presentes pelo próprio contrato da Web Speech API: o evento `onresult` só dispara quando há ao menos 1 resultado com ao menos 1 alternativa. `noUncheckedIndexedAccess` não propaga essa garantia de contrato de API do navegador.

**Diagnóstico (linha 59):** o prop `inputRef: RefObject<HTMLTextAreaElement | null>` não é estruturalmente aceito pelo atributo JSX `ref` da tag `<textarea>` (que espera `LegacyRef<HTMLTextAreaElement>`), sob a versão instalada de `@types/react` (18.3.12). Mesmo padrão de discrepância entre `RefObject<T | null>` e o `ref` prop de elemento já resolvido alhures no repo (`src/components/bi/BIAiCopilot.tsx:147`, `scrollRef as React.RefObject<HTMLDivElement>`).

**Fix aplicado:** asserção de não-nulo em cascata na linha 32 (`event.results[0]![0]!.transcript`), mesmo padrão já usado na sessão para garantias de contrato de API de plataforma. Linha 59: cast `inputRef as RefObject<HTMLTextAreaElement>` (usando o `RefObject` já importado do módulo, não `React.RefObject`, pois o arquivo não importa o namespace `React` — evita novo erro `no-undef` do ESLint), mesmo padrão já estabelecido em `BIAiCopilot.tsx`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `84f4b0a318`) — tentativa inicial com `React.RefObject` introduziu 1 regressão `no-undef` (`React` não importado), corrigida usando o `RefObject` local já importado.
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 474 → 471 (303 arquivos), travado via `--update`.

## MarketIntelligenceChart.tsx (etapa 17)

**Arquivo:** `src/components/intelligence/MarketIntelligenceChart.tsx`

**Erros originais (3×):** TS2322 (linha 65 — `string | undefined` não atribuível a `string`), TS18048 ×2 (linha 90 — `topDay` possivelmente `undefined`).

**Diagnóstico (linha 55/65):** `d.toISOString().split('T')[0]` dentro de `generateMockMarketData` — `Date.prototype.toISOString()` sempre retorna o formato fixo `YYYY-MM-DDTHH:mm:ss.sssZ` conforme especificação ECMA-262, logo `.split('T')` sempre produz exatamente 2 elementos não vazios. `noUncheckedIndexedAccess` não propaga essa garantia de contrato de plataforma.

**Diagnóstico (linhas 74/90):** `topDay = daily.reduce((best, d) => ..., daily[0])` — `daily[0]` é possivelmente `undefined` se `daily` estiver vazio, o que depende do parâmetro `days` recebido pelo componente (não garantido estruturalmente pela própria função `generateMockMarketData`, diferente do caso de `dateStr` acima). Verificado `src/hooks/useMarketIntelligenceMacro.ts` (linhas 27-34, 130, 137-138, 177): o hook real (dados não-mock) já define `MacroMarketKpis.topDepletionDay` como `{ date: string; value: number } | null` e usa seu próprio padrão `let topDepletionDay: ... | null = null;`, só atribuindo valor quando existe um "top day" válido. O consumidor no render (linha 292, `{kpis?.topDepletionDay && (...)}`) já trata `null`/ausência normalmente.

**Fix aplicado:** asserção de não-nulo em `dateStr` (`d.toISOString().split('T')[0]!`), garantia de contrato de plataforma. Para `topDay`/`topDepletionDay`: guarda condicional real (`daily.length > 0 ? daily.reduce(..., daily[0]!) : null`, e `topDepletionDay: topDay ? { date: topDay.date, value: topDay.depleted } : null`), espelhando o padrão null-safe já estabelecido pelo hook real irmão — preferido a uma asserção de não-nulo pois o invariante de não-vacuidade de `daily` depende do parâmetro `days` recebido pelo chamador, não é intrínseco ao código da própria função.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (7 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `0afdcbff16`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 471 → 468 (302 arquivos), travado via `--update`.

## KitComparisonDialog.tsx (etapa 17)

**Arquivo:** `src/components/kit-builder/KitComparisonDialog.tsx`

**Erros originais (3×):** TS2532 (linha 61 — `Object is possibly 'undefined'` no `.id` do resultado de `reduce`), TS18048 ×2 (linha 61 — `min` possivelmente `undefined` em `min.total_price` e `min.kit_quantity`).

**Diagnóstico:** `kits.reduce((min, k) => ..., kits[0])` usa `kits[0]` como valor inicial do `reduce`, tipado `KitForComparison | undefined` sob `noUncheckedIndexedAccess`, o que propaga `undefined` para o tipo de `min` no callback e para o retorno do `reduce` (`.id` na linha 61). A linha 34, `if (kits.length < 2) return null;`, é um guard estrutural no topo do próprio componente que garante `kits.length >= 2` antes de qualquer execução da linha 61 — invariante intrínseco à função, não dependente de quem a chama.

**Fix aplicado:** asserção de não-nulo em `kits[0]!` (valor inicial do `reduce`), justificada pelo guard `kits.length < 2` já presente no início da função.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `5ad652109e`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 468 → 465 (301 arquivos), travado via `--update`.

## SidebarReorganized.tsx (etapa 17)

**Arquivo:** `src/components/layout/SidebarReorganized.tsx`

**Erros originais (3×):** TS2741 ×3 (linhas 174, 179, 184 — `Property 'href' is missing in type '{...}' but required in type 'NavItem'`) nos itens "Estrutura SICOOB", "Marketing" e "Financeiro" do grupo `admin`, que têm `children` mas não definem `href` própria.

**Diagnóstico — bug real de produção encontrado:** `NavItem.href` é `string` obrigatório em `SidebarNavGroup.tsx`, mas os 3 itens acima (grupos que só existem para abrir um submenu, sem rota própria) nunca definiram essa propriedade — o componente já tolera isso na renderização (`if (item.children && item.children.length > 0) { ... }` nunca lê `item.href` nesse ramo), mas `hasActiveItem = group.items.some((item) => isItemActive(item.href, item.exact))` (linha 78 de `SidebarNavGroup.tsx`) roda para **todo** item do grupo, inclusive os 3 sem href, e o wrapper local `isItemActive` (linha 66) chama `href.includes('?')` **sem guarda de nulidade** antes de delegar para `isNavItemActive` (que só aí trata `if (!href) return false`). Resultado: `TypeError: Cannot read properties of undefined (reading 'includes')` ao renderizar a sidebar para um admin em qualquer rota que não seja alcançada pelos itens anteriores do grupo `admin` no `.some()` — por exemplo `/admin/singulares`, `/admin/pas`, `/admin/cooperativas`, `/admin/newsletter`, `/admin/campanhas`, `/admin/cms`, `/admin/verbas` (todas rotas-filhas desses 3 grupos, cujo próprio pai nunca tem href e é alcançado antes de qualquer `return true` do `.some()`). O teste dedicado existente (`tests/components/layout/SidebarNavGroup.test.tsx`) não cobre esse cenário (usa apenas item folha com `href` definida), por isso o bug não foi pego antes.

**Fix aplicado:** adicionada `href: ''` aos 3 itens-contêiner, dentro do próprio `SidebarReorganized.tsx` (sem tocar no tipo compartilhado `NavItem` nem em `SidebarNavGroup.tsx`, mantendo diff mínimo). `''` satisfaz o tipo, `''.includes('?')` não lança, e `isNavItemActive(pathname, '', exact)` já retorna `false` por sua própria guarda `if (!href) return false` — comportamento idêntico ao item nunca estar "ativo" por si mesmo, que é o correto (a expansão do submenu já é decidida separadamente via `item.children?.some(child => isItemActive(child.href, ...))`, usando o href de cada filho).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (234 → 231 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `19e663b687`).
- Teste dedicado `tests/components/layout/SidebarNavGroup.test.tsx`: 1 passou (não cobre o cenário do bug corrigido, ver diagnóstico acima).
- `typecheck:baseline`: 465 → 462 (300 arquivos), travado via `--update`.

## LogoSizeControls.tsx (etapa 17)

**Arquivo:** `src/components/mockup/logo-editor/LogoSizeControls.tsx`

**Erros originais (3×):** TS2345 ×3 (linhas 64, 81, 114 — `number | undefined` não atribuível a `number` nos callbacks `onValueChange` dos 3 `Slider`).

**Diagnóstico:** `src/components/ui/slider.tsx` é um wrapper fino sobre `@radix-ui/react-slider`, com exatamente 1 `SliderPrimitive.Thumb` renderizado. Os 3 usos neste arquivo sempre passam `value` como array de 1 elemento (`[logoWidth]`, `[logoHeight]`, `[logoScale]`) — o contrato do Radix Slider garante que `onValueChange` sempre retorna um array do mesmo tamanho que `value` (uma posição por thumb), logo `v[0]` é sempre definido. `noUncheckedIndexedAccess` não propaga essa garantia de contrato de biblioteca.

**Fix aplicado:** asserção de não-nulo em `v[0]!` nos 3 pontos, mesma classe de garantia de contrato de biblioteca/API já usada nesta sessão (ex.: `IntersectionObserver` em `CompareTableView.tsx`).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `3610add7a1`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 462 → 459 (299 arquivos), travado via `--update`.

## logoTechniqueFilters.ts (etapa 17)

**Arquivo:** `src/components/mockup/logo-editor/logoTechniqueFilters.ts`

**Erros originais (3×):** TS2322 ×3 (linhas 47, 51, 54 — `TechniqueFilter | undefined` não atribuível a `TechniqueFilter` nos retornos de `getTechniqueFilter`).

**Diagnóstico:** `TECHNIQUE_FILTERS: Record<string, TechniqueFilter>` faz com que qualquer acesso (`TECHNIQUE_FILTERS.default`, `TECHNIQUE_FILTERS[rule.key]`) retorne `TechniqueFilter | undefined` sob `noUncheckedIndexedAccess`, mesmo para chaves conhecidas por acesso literal. Verificado programaticamente que toda `key` usada em `TECHNIQUE_MATCH_ORDER` (14 entradas) existe como propriedade literal em `TECHNIQUE_FILTERS` (14 chaves, incluindo `default`) — invariante fechado e estático dentro do próprio arquivo, sem dependência de dado externo/runtime.

**Fix aplicado:** asserção de não-nulo nos 3 pontos de retorno (`TECHNIQUE_FILTERS.default!`, `TECHNIQUE_FILTERS[rule.key]!`, `TECHNIQUE_FILTERS.default!`), justificada pela correspondência fechada e verificada entre as duas listas de chaves no mesmo arquivo.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `d28b11da01`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 459 → 456 (298 arquivos), travado via `--update`.

## OrderStatusTimeline.tsx (etapa 17)

**Arquivo:** `src/components/orders/OrderStatusTimeline.tsx` (+ `src/services/OrderService.ts`)

**Erros originais (3×):**
- TS7053 (linha 57): `ORDER_STATUS_LABELS[status]` — `status` é `string` solto (prop do componente), mas `ORDER_STATUS_LABELS: Record<OrderStatus, string>` exige uma chave do union literal `OrderStatus`.
- TS2339 (linha 75) e TS2769 (linha 76): `latestApproval.approver?.full_name` e `format(new Date(latestApproval.created_at), ...)` — ambos poluídos pelo tipo de erro do PostgREST (`SelectQueryError<"could not find the relation...">`), efeito colateral do bug real descrito abaixo.

**Diagnóstico:**
1. **Cast de status (zero-churn):** convenção já estabelecida em `src/hooks/orders/useOrders.ts` (linhas 53, 69-70) para indexar `ORDER_STATUS_LABELS` com uma variável de status tipada como `string` solto: `ORDER_STATUS_LABELS[status as OrderStatus] || fallback`.
2. **Bug real de produção (não é só erro de tipo):** `OrderService.getApprovalHistory` fazia um join embutido do Supabase `approver:approver_id(full_name)`. Conferido em `src/integrations/supabase/types.ts` que `order_approval_history.Relationships` só tem FK para `orders` via `order_id` — **não existe FK de `approver_id` para `profiles`** (`approver_id` referencia `auth.users(id)`, tabela que o PostgREST não consegue embutir via join declarativo). Resultado: essa query lança erro (`if (error) throw error`) **toda vez que é executada em produção**, deixando o badge "Decisão de Alçada" em `OrderStatusTimeline.tsx` permanentemente quebrado/invisível, de forma silenciosa (o `useQuery` só retorna `data: undefined`, sem UI de erro visível). O mesmo bug, com a mesma causa raiz, já está documentado e corrigido em `src/pages/GestorApprovalsPage.tsx` (linhas 89-90, comentário inline explicando exatamente isso).
3. **Data nula:** ao remover o join quebrado, `created_at: string | null` (tipo real da coluna) deixou de estar mascarado pelo erro de tipo do PostgREST, expondo a necessidade real de guarda contra `null` — mesmo padrão já usado no componente irmão `src/components/orders/OrderHistoryTimeline.tsx` (linha 38: `event.created_at && format(new Date(event.created_at), ...)`).

**Fix aplicado:**
- `OrderStatusTimeline.tsx` linha 57: `ORDER_STATUS_LABELS[status as OrderStatus] || status.replace('_', ' ')`.
- `OrderService.getApprovalHistory`: removido o join embutido quebrado; query agora busca `order_approval_history.*` isolada, coleta os `approver_id` distintos, busca `profiles(user_id, full_name)` separadamente, monta um `Map` e mescla `approver: approverMap.get(h.approver_id) ?? null` em cada linha — replicando o padrão de duas etapas já estabelecido e testado em `GestorApprovalsPage.tsx`.
- `OrderStatusTimeline.tsx`: extraída a formatação da data para uma função de módulo `formatApprovalDate(createdAt: string | null)` (guarda o `null` fora do escopo do componente) em vez de um `&&` inline no JSX — isso evitou um novo ponto de decisão dentro de `OrderStatusTimeline` (que já estava na complexidade ciclomática máxima permitida, 10/10; um guard inline elevaria para 11 e quebraria o lint). Também trocado o import de `OrderStatus` para `import { type OrderStatus }`, satisfazendo `@typescript-eslint/consistent-type-imports` (é usado apenas como tipo).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (9 → 6 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `b2bfb9e928`).
- Teste dedicado `tests/services/orderService.test.ts`: 5 passaram (não cobre especificamente `getApprovalHistory`, mas confirma que nenhum outro método do `OrderService` regrediu).
- `typecheck:baseline`: 456 → 453 (297 arquivos), travado via `--update`.

## LogoWithTransparentBg.tsx (etapa 17)

**Arquivo:** `src/components/pdf/proposal/LogoWithTransparentBg.tsx`

**Erros originais (3×):** TS18048 ×3 (linha 35 — `r`, `g`, `b` "possibly undefined" na leitura dos canais RGB de um pixel).

**Diagnóstico:** `d = imageData.data` é um `Uint8ClampedArray` retornado por `CanvasRenderingContext2D.getImageData()` — pela própria especificação da API Canvas, o formato é sempre RGBA (4 bytes por pixel), logo `d.length` é sempre múltiplo de 4. O loop `for (let i = 0; i < d.length; i += 4)` garante que `i`, `i+1`, `i+2` estão sempre dentro dos limites do array em cada iteração — invariante do contrato da API de plataforma (Canvas/`ImageData`), não do código da aplicação.

**Fix aplicado:** asserção de não-nulo em `d[i]!`, `d[i + 1]!`, `d[i + 2]!`, mesma classe de garantia de contrato de API de plataforma já usada nesta sessão (ex.: `Date.prototype.toISOString()`).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `26fb457fe4`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 453 → 450 (296 arquivos), travado via `--update`.

## ProposalProductTable.tsx (etapa 17)

**Arquivo:** `src/components/pdf/proposal/ProposalProductTable.tsx`

**Erros originais (3×):** TS2532 (linha 72 — `groups[groups.length - 1]` possivelmente `undefined`); TS2345 ×2 (linhas 136-137 — `dimMatch[1]`/`dimMatch[2]` como `string | undefined` passados para `parseFloat(string)`).

**Diagnóstico:**
- Linha 72: dentro do `items.forEach`, `groups.push(...)` roda sempre que `gid !== currentGroupId || gid === null`. Na primeira iteração `currentGroupId` é `undefined` e `gid` nunca é `undefined` (é `string | null`), então a condição é sempre verdadeira e `groups.push` sempre roda antes do primeiro acesso a `groups[groups.length - 1]`. Nas iterações em que a condição é falsa (sem push), isso só acontece porque uma iteração anterior já teve `gid === currentGroupId`, o que exige que essa iteração anterior tenha rodado o push — logo `groups.length >= 1` é um invariante de loop garantido dentro da própria função, mesma classe de garantia já usada em `KitComparisonDialog.tsx`.
- Linhas 136-137: `dimMatch` vem de `p.notes.match(/\|\s*([\d.]+)×([\d.]+)cm/)`, checado com `if (dimMatch)`. Os 2 grupos de captura do regex são obrigatórios (sem `?` opcional), então sempre que `dimMatch` é truthy, `dimMatch[1]` e `dimMatch[2]` são strings garantidas — invariante fechado e verificável estaticamente pelo próprio padrão do regex, confinado a este arquivo.

**Fix aplicado:** asserção de não-nulo nos 3 pontos (`groups[groups.length - 1]!`, `dimMatch[1]!`, `dimMatch[2]!`).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (2 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `f03632768f`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 450 → 447 (295 arquivos), travado via `--update`.

## TechniqueSelector.tsx (etapa 17)

**Arquivo:** `src/components/personalization/TechniqueSelector.tsx`

**Erros originais (3×):** TS18048 (linha 94 — `result.records` possivelmente `undefined`); TS2352 ×2 (linhas 96-97 — conversão de `Technique` para `ExternalTechnique` via `as` direto, tipos sem overlap suficiente).

**Diagnóstico:**
- `invokeExternalDb<T>` retorna `InvokeResult<T>` (`src/lib/external-db/invoke.ts`), cujo campo `records?: T[]` é genuinamente opcional — não é um falso positivo de `noUncheckedIndexedAccess`, é uma possibilidade real (ex.: resposta sem a chave `records`). Convenção já estabelecida em `src/lib/external-db/products.ts:73` (`result.records ?? []`).
- `Technique` (interface local deste arquivo) e `ExternalTechnique` (`src/types/external-db.ts`, com índice `[key: string]: unknown`) não têm overlap estrutural suficiente para um `as` direto (`code: string | null` vs `code?: string`, `is_active` só existe em `Technique`, etc.) — mas ambos representam a mesma linha de dado bruto do BD externo, só que com "lentes" de tipagem diferentes (uma view estreita da app vs. o formato bruto com campos extras como `setup_price`/`handling_price`). Mesmo padrão já usado em `src/hooks/useExternalSimulator.ts:268` (`as unknown as ExternalPrintArea[]`).

**Fix aplicado:** `result.records ?? []` (fallback real, não asserção — o valor é genuinamente opcional); `(t as unknown as ExternalTechnique)` nos 2 pontos, seguindo a recomendação do próprio compilador e o padrão já estabelecido no codebase.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `ca80716c26`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 447 → 444 (294 arquivos), travado via `--update`.

## TechniqueSLACard.tsx (etapa 17)

**Arquivo:** `src/components/personalization/TechniqueSLACard.tsx`

**Erros originais (3×):** TS18048 (linha 83 — `result.records` possivelmente `undefined`); TS2352 ×2 (linhas 85-86 — conversão de `Technique` para `ExternalTechnique` via `as` direto).

**Diagnóstico:** idêntico ao de `TechniqueSelector.tsx` (mesma sessão) — mesma interface local `Technique`, mesmo `invokeExternalDb<Technique>` com `InvokeResult<T>.records?: T[]` genuinamente opcional, mesmo cast para `ExternalTechnique` (campos extras `setup_price`/`handling_price` do BD externo não presentes na view estreita `Technique`).

**Fix aplicado:** `result.records ?? []` (fallback real); `(t as unknown as ExternalTechnique)` nos 2 pontos — mesmo padrão aplicado em `TechniqueSelector.tsx` nesta mesma etapa.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `ef816309db`).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 444 → 441 (293 arquivos), travado via `--update`.

## upsell-engine.ts (etapa 17)

**Arquivo:** `src/components/pricing/simulator/upsell/upsell-engine.ts`

**Erros originais (3×):** TS18048 (linhas 119, 121, 122 — `best` possivelmente `undefined`).

**Diagnóstico:**
- Dentro de `suggestTechniqueUpgrades`, `const upgrades = availableTechniques.filter(...)` produz `ProductTechnique[]`; o `noUncheckedIndexedAccess` torna `upgrades[0]` do tipo `ProductTechnique | undefined`.
- O guard `if (upgrades.length > 0) { const best = upgrades[0]; ... }` garante estruturalmente, dentro do mesmo escopo de função, que `upgrades[0]` está definido — mesma classe de justificativa já usada em `KitComparisonDialog.tsx` nesta sessão (guard de comprimento controlando diretamente o acesso ao índice).

**Fix aplicado:** `const best = upgrades[0]!;` — asserção não-nula justificada pelo guard de comprimento imediatamente anterior, sem alterar comportamento em runtime.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3334 erros globais, referência `origin/main` em `a07bfed97a`).
- Teste dedicado encontrado (`tests/components/simulator/UpsellPlusPlus.test.ts`, importa `upsell-engine.ts`): 11/11 passaram.
- `typecheck:baseline`: 441 → 438 (292 arquivos), travado via `--update`.

## InlinePriceCalculator.tsx (etapa 17)

**Arquivo:** `src/components/products/InlinePriceCalculator.tsx`

**Erros originais (3×):** TS2532 (linha 62 — `tiers[0]` possivelmente `undefined`); TS2339 ×2 (linhas 88, 92 — `Property 'records' does not exist on type '{}'`).

**Diagnóstico:**
- Linha 62: `tiers.length > 0 ? tiers[0].unitPrice : basePrice` — guard de comprimento no próprio ternário garante `tiers[0]` definido no ramo verdadeiro; padrão já usado nesta sessão (`KitComparisonDialog.tsx`, `upsell-engine.ts`).
- Linhas 88/92: `variantResponse?.data?.records || variantResponse?.records || [...]` — **código morto/incorreto**. `invokeExternalDb<T>` (`src/lib/external-db/bridge.ts`) já retorna `InvokeResult<T>` desembrulhado (não existe campo `.data` no retorno — isso é `response.data` já resolvido internamente antes de retornar). O acesso `.data` só existiria via a assinatura de índice `[key: string]: unknown`; combinado a encadeamento opcional (`?.`), o TypeScript estreita `unknown` para `{}` (`NonNullable<unknown>`), daí o erro "`records` não existe em `{}`". Esse padrão `.data?.records` é característico de quem chama `invokeBridge` diretamente (que retorna `{success, data, error}`), não `invokeExternalDb` (já desembrulhado) — confirmado lendo a implementação de `invokeExternalDb` em `bridge.ts`. Como o campo `.data` nunca existe de fato no retorno de `invokeExternalDb`, o ramo era sempre `undefined` em runtime — remover não muda comportamento, só corrige o código morto/confuso.
- Ao remover `.data?.records`, restou `variantResponse?.records` com `T` não inferível (nenhum argumento depende de `T`) — `variants[0].id` gerava novo erro TS2571 (`Object is of type 'unknown'`). Corrigido especificando o parâmetro de tipo explícito `invokeExternalDb<{ id: string }>(...)`, consistente com o retorno já tipado usado em `sources[0] as SupplierSourcePricing` logo abaixo.

**Fix aplicado:**
- `tiers[0]!.unitPrice` (asserção justificada pelo guard `tiers.length > 0` no mesmo ternário).
- Remoção do ramo morto `variantResponse?.data?.records` / `sourceResponse?.data?.records`, mantendo `variantResponse?.records || []` / `sourceResponse?.records || []` (mesma convenção de fallback real já usada em `products.ts:73`).
- `invokeExternalDb<{ id: string }>(...)` para o fetch de `product_variants`, permitindo `variants[0]!.id` sem cast (guard `variants.length === 0` já garante o retorno antecipado).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3333 erros globais, referência `origin/main` em `a694d598eb`) — **drift positivo**: 1 erro de lint eliminado como bônus (código morto removido).
- Nenhum teste dedicado encontrado para este arquivo.
- `typecheck:baseline`: 438 → 435 (291 arquivos), travado via `--update`.

## StockHistoryChart.tsx (etapa 17)

**Arquivo:** `src/components/products/StockHistoryChart.tsx` (fix aplicado em `src/components/products/useStockChartData.ts`)

**Erros originais (3×):** TS2532 (linhas 161, 164, 165 — `demandLabel[marketDemandLevel]` possivelmente `undefined`).

**Diagnóstico:**
- `demandLabel` (definido em `useStockChartData.ts`) era tipado como `Record<string, { text: string; color: string }>`. Com `noUncheckedIndexedAccess`, QUALQUER indexação em `Record<string, T>` produz `T | undefined`, independente do tipo da chave.
- `marketDemandLevel` vem de um `useMemo` cujo corpo só retorna 5 literais fixos (`'very-high' | 'high' | 'moderate' | 'low' | 'unknown'`) — uma enumeração fechada e estaticamente verificável dentro do mesmo arquivo — e `demandLabel` já cobre exatamente essas 5 chaves.
- Em vez de suprimir com asserção de não-nulo em 3 pontos de uso (no arquivo consumidor), a correção correta na origem é estreitar o tipo de `demandLabel` para `Record<MarketDemandLevel, {...}>` (chave literal fechada, não `string` genérico) — o TypeScript então sabe que a indexação é exaustiva e para de adicionar `| undefined`, eliminando os 3 erros no arquivo consumidor sem tocar nele.

**Fix aplicado (em `useStockChartData.ts`):**
- Novo tipo exportado `export type MarketDemandLevel = 'very-high' | 'high' | 'moderate' | 'low' | 'unknown';`.
- `useMemo<MarketDemandLevel>(...)` anota explicitamente o retorno do cálculo de `marketDemandLevel`.
- `demandLabel: Record<MarketDemandLevel, { text: string; color: string }>` substitui `Record<string, ...>`.
- Zero mudanças em `StockHistoryChart.tsx` — o fix na origem do tipo já elimina os 3 erros no consumidor.

**Validação:**
- `tscheck-files.mjs` (`StockHistoryChart.tsx` e `useStockChartData.ts`): 3 → 0 erros (7 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3333 erros globais, referência `origin/main` em `f10e70b225`).
- Nenhum teste dedicado encontrado para nenhum dos dois arquivos.
- `typecheck:baseline`: 435 → 432 (290 arquivos), travado via `--update`.

## TemplateGridView.tsx (etapa 17)

**Arquivos:** `src/components/quotes/admin-templates/TemplateGridView.tsx`, `src/hooks/useQuoteTemplates.ts`, `src/utils/templateExport.ts` (regressão colateral corrigida)

**Erros originais (3×, nos 2 primeiros arquivos):** TS18047 ×2 (linha 58 — `template.items_data` possivelmente `null`); TS2339 (linha 61 — `Property 'updated_at' does not exist on type 'QuoteTemplate'`).

**Diagnóstico:**
- Linha 58: `template.items_data` é `QuoteTemplateItem[] | null` no tipo `QuoteTemplate` — reflete fielmente a coluna `items_data: Json | null` do banco (genuinamente nulável em runtime, não uma lacuna de tipo). Mesmo padrão de fallback já usado em `AdminTemplatesManager.tsx:106` e `useQuoteBuilderState.ts:250`.
- Linha 61: `QuoteTemplate` (em `useQuoteTemplates.ts`) nunca declarava `created_at`/`updated_at`, embora (a) o `Row` real de `quote_templates` em `src/integrations/supabase/types.ts` (linhas 7349-7414) declare ambos como `string` sempre presentes; (b) `fetchTemplates` faça `select("*")` e depois `data as QuoteTemplate[]` (o objeto em runtime sempre tem os dois campos); (c) `CreateTemplateInput` já referenciasse `Omit<QuoteTemplate, 'id' | 'created_at' | 'updated_at'>`, indicando que os campos deveriam existir na interface. Lacuna de completude de tipo, não risco de runtime — corrigido na origem (interface), não com cast no consumidor.

**Fix aplicado:**
- `TemplateGridView.tsx`: `(template.items_data ?? []).length` (×2), substituindo `template.items_data.length`.
- `useQuoteTemplates.ts`: adicionados `created_at: string;` e `updated_at: string;` à interface `QuoteTemplate`.

**Regressão colateral detectada e corrigida:**
- O gate obrigatório `npm run typecheck:baseline` (sem `--update`) revelou que alargar `QuoteTemplate` com campos obrigatórios quebrou `src/utils/templateExport.ts` (0 → 1 erro, TS2322): `ExportedTemplate.templates` era tipado como `Omit<QuoteTemplate, 'id' | 'seller_id'>[]`, e o literal construído em `exportTemplatesToJson` (linha 19) nunca incluiu `created_at`/`updated_at` — um formato de exportação/importação que legitimamente não carrega timestamps (são regenerados na criação/importação).
- Fix: `Omit<QuoteTemplate, 'id' | 'seller_id' | 'created_at' | 'updated_at'>[]`, mesma convenção já usada por `CreateTemplateInput` em `useQuoteTemplates.ts`.

**Validação:**
- `tscheck-files.mjs` (3 arquivos): 3 → 0 erros (10 no programa inteiro).
- `check-eslint-baseline.mjs` (3 arquivos): 0 regressões (3333 erros globais, referência `origin/main` em `2f420e6e8a`).
- Teste dedicado encontrado (`tests/hooks/useQuoteTemplates.test.tsx`): 1/1 passou. Nenhum teste dedicado para `templateExport.ts`.
- `typecheck:baseline`: 432 → 428 (289 arquivos), travado via `--update` — gate confirmou "✅ Sem regressões de tipagem" após o fix de `templateExport.ts`.

## QuoteAutoSave.tsx (etapa 17)

**Arquivo:** `src/components/quotes/QuoteAutoSave.tsx`

**Erros originais (3×):** TS2339 ×2 (linha 47 — `Property 'saveDraft'/'loadDraft' does not exist on type '{ restore: () => unknown; clear: () => void; lastSaved: string; }'`); TS2345 (linha 47 — argumento `string | undefined` incompatível com `AutoSaveOptions<unknown>`).

**Diagnóstico — bug funcional real, não só lacuna de tipo:**
- O componente chamava `const { saveDraft, loadDraft } = useAutoSave(quoteId)`, assumindo uma API antiga do hook (`saveDraft(data): boolean`, `loadDraft(): T | null`, chamada posicional com `quoteId`).
- O hook real em `src/hooks/useAutoSave.ts` tem assinatura completamente diferente: `useAutoSave<T>({ key, data, onSave, interval, enabled })`, retornando `{ restore, clear, lastSaved }`. Não existem `saveDraft`/`loadDraft`.
- **Isso não é apenas um erro de compilação — é um bug ativo em produção.** `QuoteAutoSave` é renderizado em `src/pages/QuoteBuilderPage.tsx` (tela de criação/edição de orçamento) com `onRestore` sempre definido. Em runtime (ignorando tipos), `saveDraft`/`loadDraft` desestruturados do retorno real do hook são `undefined`. O efeito de restauração no mount chama `loadDraft()` imediatamente — `TypeError: loadDraft is not a function` ao montar a página; e `handleSave` (disparado pelo debounce 2s após qualquer edição) chama `saveDraft(...)` — mesmo erro. O auto-save de orçamentos estava quebrado.

**Fix aplicado:**
- Reescrita da integração com o hook real: `useAutoSave({ key: quoteId || "new", data, enabled: true, onSave: () => {...} })`, deixando o hook cuidar da persistência (localStorage) e do debounce interno (2s, fixo) — elimina o timer duplicado que o componente mantinha (`timeoutRef`/`handleSave` manual), que reimplementava exatamente o que o hook já faz.
- Removido o prop `debounceMs` (não usado por nenhum call site real — único consumidor é `QuoteBuilderPage.tsx`, que não o passa — e o hook atual não expõe um debounce configurável; manter o prop seria uma configuração morta/enganosa).
- `loadDraft()` → `restore()` (mesma semântica: lê o rascunho salvo do `localStorage`).
- Indicador de status "offline" preservado via checagem de `navigator.onLine` na detecção de mudanças (persistência local em si não depende de rede, então o `useAutoSave` continua salvando mesmo offline — o indicador é só informativo, correção de um design smell do código antigo que bloqueava o save local por falta de rede).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3332 erros globais, referência `origin/main` em `6c17008a2b`) — drift positivo: 1 erro de lint eliminado.
- Nenhum teste dedicado pré-existente. **Teste de fumaça temporário criado e executado** (`@testing-library/react`, não commitado — apenas para diagnóstico): (1) monta sem lançar erro e chama `onRestore` com o draft salvo do `localStorage`, confirmando o fix do crash de mount; (2) após mudança de `data` + avanço de 2.1s de timers falsos, confirma persistência real no `localStorage`. Ambos passaram; removido do repositório após validação.
- `typecheck:baseline`: 428 → 425 (288 arquivos), travado via `--update`.

## QuoteHistoryTimeline.tsx (etapa 17)

**Arquivo:** `src/components/quotes/QuoteHistoryTimeline.tsx`

**Erros originais (3×):** TS2339 (linhas 74, 82, 84 — `Property 'rejection_notes' does not exist on type 'string | number | boolean | { [key: string]: Json | undefined; } | Json[]'`).

**Diagnóstico:**
- `quote_history.metadata` é `Json | null` no banco (coluna sem schema fixo) — `event.metadata?.rejection_notes` tentava acessar uma propriedade nomeada diretamente na união `Json`, que inclui `string | number | boolean | Json[]` (nenhum desses tem `.rejection_notes`), além do shape de objeto.
- Mesmo padrão já resolvido nesta base em `OrderAuditTimeline.tsx:111`: guard de runtime (`typeof === 'object'` e não-array) + cast para `Record<string, unknown>` + checagem de tipo por campo (`typeof x === 'string'`), já que o conteúdo de uma coluna JSON não tem garantia de schema em tempo de compilação.

**Fix aplicado:**
- Nova função de módulo `getRejectionNotes(metadata: unknown): string | null` — guard `object`/`!Array.isArray` + `typeof notes === 'string'`, mesma convenção de `OrderAuditTimeline.tsx`.
- `const rejectionNotes = getRejectionNotes(event.metadata);` dentro do `.map()`, substituindo os 3 acessos diretos a `event.metadata.rejection_notes`.
- Extração para função de módulo (em vez de inline no `.map()`) foi necessária para manter a complexidade ciclomática do callback dentro do limite do lint (`complexity` máx. 10 — inline gerava 12).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3332 erros globais, referência `origin/main` em `10a0b137f4`) — a versão inline (sem extrair a função) gerou uma regressão real de `complexity` (0→1), corrigida extraindo a lógica para `getRejectionNotes`.
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 425 → 422 (287 arquivos), travado via `--update`.

## ContactSelector.tsx (etapa 17)

**Arquivo:** `src/components/quotes/company-contact/ContactSelector.tsx`

**Erros originais (3×):** TS2322 (linha 43, colunas 123/145/167 — `Type 'string | null' is not assignable to type 'string | undefined'`).

**Diagnóstico:**
- `ContactDropdown` (dentro do `onClick` do botão de cada contato) repassa `contact.email`, `contact.phone`, `contact.cargo` diretamente para `onContactInfoChange`, cujo parâmetro é `SelectedContactInfo` (`src/components/quotes/CompanyContactSelector.tsx:17`) — `email?`, `phone?`, `cargo?` como `string | undefined`.
- `ContactOption` (`src/components/quotes/company-contact/shared-types.tsx:16-22`) declara esses 3 campos como `string | null` (dados vindos do banco, coluna nullable) — incompatibilidade estrutural `null` vs `undefined`.
- O componente irmão no mesmo arquivo, `SingleContactDisplay` (linhas 56-64), já resolve exatamente essa conversão corretamente com `contact.email || undefined` etc. — padrão já estabelecido e só não replicado em `ContactDropdown`.

**Fix aplicado:**
- Linha 43: `email: contact.email, phone: contact.phone, cargo: contact.cargo` → `email: contact.email || undefined, phone: contact.phone || undefined, cargo: contact.cargo || undefined`, espelhando o padrão já correto de `SingleContactDisplay` no mesmo arquivo (zero churn — nenhuma abstração nova, só replicação do padrão existente).

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (1 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3332 erros globais, referência `origin/main` em `aef3042ecc`).
- Teste dedicado do componente pai encontrado e executado: `tests/components/quotes/CompanyContactSelector.test.tsx` — 2/2 passaram.
- `typecheck:baseline`: 422 → 419 (286 arquivos), travado via `--update`.

## SegmentoCheckbox.tsx (etapa 17)

**Arquivo:** `src/components/ramo-atividade/SegmentoCheckbox.tsx`

**Erros originais (3×):** TS2339 (linha 72×2, 79 — `Property 'product_count' does not exist on type 'SegmentoComplete'`).

**Diagnóstico:**
- O componente exibia um badge com `segmento.product_count`, mas `SegmentoComplete` (`src/types/ramo-atividade.ts:87-101`) nunca declarou esse campo.
- Rastreamento completo do pipeline de dados (`ramoAtividadeService.getSegmentosCompletos` → `useSegmentosCompletos` → `RamoAtividadeGroupAccordion` → `SegmentoCheckbox`): **nenhum ponto do domínio ramo-atividade calcula contagem de produtos por segmento**. O campo irmão `RamoAtividadeGroup.products_using` (mesmo domínio, nível de grupo) existe no tipo mas também nunca é atribuído em `getRamosComEstatisticas` — confirma que a funcionalidade de contagem de produtos nunca foi implementada em nenhum nível deste domínio (diferente do domínio paralelo `materialService.ts`, que de fato calcula e atribui `products_using`).
- Não é um campo nullable de runtime (não é caso de guard `?? undefined`) — é uma propriedade que estruturalmente nunca existiu em nenhuma fonte de dados real; portanto não fabricar suporte de tipo para um dado que nunca é calculado.

**Fix aplicado:**
- Removido o bloco morto do badge de contagem (linhas 72-81) — mesmo princípio do prop `debounceMs` removido em `QuoteAutoSave.tsx`: código nunca alimentado por nenhum dado real não deve fingir suporte de tipo, deve ser removido.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `43e517e964`) — drift positivo: 1 erro de lint eliminado.
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 419 → 416 (285 arquivos), travado via `--update`.

## VoiceVisualEffects.tsx (etapa 17)

**Arquivo:** `src/components/search/voice/VoiceVisualEffects.tsx`

**Erros originais (3×):** TS2532 (linhas 223, 224, 225 — `Object is possibly 'undefined'`, componente `SpectrumWaveform`).

**Diagnóstico:**
- `barOffsets` é `number[]` calculado via `useMemo` com `Array.from({ length: barCount })` (mesma constante `barCount = 15` usada no loop externo `Array.from({ length: barCount }).map((_, i) => ...)`).
- Com `noUncheckedIndexedAccess`, `barOffsets[i]` tipa como `number | undefined`, mas `i` sempre está no intervalo `[0, barCount)` e `barOffsets` sempre tem exatamente `barCount` elementos — mesmo padrão de garantia estrutural (dois arrays construídos a partir da mesma constante de tamanho) já resolvido com asserção de não-nulo em `FocusTrap.tsx` (etapa 17 anterior).

**Fix aplicado:**
- `barOffsets[i]` → `barOffsets[i]!` nos 3 usos dentro do cálculo de `duration` da transição do Framer Motion.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (4 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `a16350e4f5`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 416 → 413 (284 arquivos), travado via `--update`.

## usePhaseColors.ts (etapa 17)

**Arquivo:** `src/components/search/voice/usePhaseColors.ts`

**Erros originais (3×):** TS2322 (linha 8 — `Type 'number | undefined' is not assignable to type 'number'`, retorno de `getThemeHSL()`).

**Diagnóstico:**
- `parts = raw.split(/\s+/).map(parseFloat)` é `number[]`; com `noUncheckedIndexedAccess`, `parts[0]`/`parts[1]`/`parts[2]` tipam como `number | undefined`.
- O guard `parts.length >= 3 && !parts.some(isNaN)` na mesma linha garante estruturalmente que os índices 0, 1 e 2 existem e são números válidos, mas o TS não propaga essa garantia de `.length` para o acesso por índice — mesmo padrão de guarda já resolvido em `ProductVariationAxesConfig.tsx`/`VirtualizedReplenishmentList.tsx`.

**Fix aplicado:**
- `[parts[0], parts[1], parts[2]]` → `[parts[0]!, parts[1]!, parts[2]!]`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (1 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `f337ef7d31`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 413 → 410 (283 arquivos), travado via `--update`.

## OrderAddItemDialog.tsx (etapa 17)

**Arquivo:** `src/components/sicoob/orders/OrderAddItemDialog.tsx`

**Erros originais (3×):** TS2322 (linha 89 — `Type 'string | number' is not assignable to type 'string'`), TS2345 (linha 136 — `(color: string) => JSX.Element` não compatível com callback esperado), TS18048 (linha 161 — `'selectedProduct.colors.length' is possibly 'undefined'`).

**Diagnóstico:**
- Linha 89: `Category.id` (`src/hooks/useCategories.ts:6`) é `string | number` (dado vindo do catálogo externo Promobrind, sem tipo fixo), mas `SelectItem`'s `value` exige `string`. Mesmo padrão já resolvido em `IntelligenceFilterBar.tsx:148-149` (`String(cat.id)`).
- Linha 136: `selectedProduct.colors` é `ProductColor[]` (`src/types/product-catalog.ts:8-17` — objeto com `name`, `hex`, `group`, etc.), não `string[]`. O código tratava cada `color` como string diretamente, quando deveria usar `color.name`.
- Linha 161: `selectedProduct?.colors?.length > 0` — com encadeamento opcional, o resultado de `selectedProduct?.colors?.length` é `number | undefined` (por causa do `selectedProduct?.`, já que `colors` em si é campo obrigatório do tipo `Product`); comparar `undefined > 0` é rejeitado pelo TS em modo estrito.

**Fix aplicado:**
- `value={c.id}` → `value={String(c.id)}` (e `key` também, por consistência), replicando o padrão de `IntelligenceFilterBar.tsx`.
- `selectedProduct.colors.map((color: string) => ...)` → `.map((color) => ...)` usando `color.name` para key, comparação e label (tipo `ProductColor` inferido corretamente).
- `selectedProduct?.colors?.length > 0` → `(selectedProduct?.colors?.length ?? 0) > 0`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `9d901baaa7`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 410 → 407 (282 arquivos), travado via `--update`.

## MockupPreview.tsx (etapa 17)

**Arquivo:** `src/components/simulator/MockupPreview.tsx`

**Erros originais (3×):** TS2532 (linha 49 — `Object is possibly 'undefined'`), TS2345×2 (linhas 216, 229 — callbacks de `onValueChange` do `Slider` retornando `{x: number|undefined}`/`{y: number|undefined}` incompatíveis com `SetStateAction<{x:number,y:number}>`).

**Diagnóstico:**
- `logoScale` é `number[]` (`useState([100])`); com `noUncheckedIndexedAccess`, `logoScale[0]` tipa como `number | undefined`.
- Nos 2 sliders de posição, a desestruturação `([x]) => ...`/`([y]) => ...` do array `number[]` recebido no callback do `Slider` (Radix) também tipa o elemento como `number | undefined` pelo mesmo motivo.
- Diferente dos casos anteriores de índice "estruturalmente garantido por array de mesmo tamanho construído localmente" (ex.: `FocusTrap.tsx`, `VoiceVisualEffects.tsx`), aqui o array vem de um callback de biblioteca terceira (Radix `Slider`) — não é uma garantia que o código do projeto controla diretamente, então optou-se por fallback defensivo em vez de asserção de não-nulo.

**Fix aplicado:**
- `logoScale[0] / 100` → `(logoScale[0] ?? 100) / 100` (100 é o valor inicial padrão do estado).
- `setLogoPosition(p => ({ ...p, x }))` → `setLogoPosition(p => ({ ...p, x: x ?? p.x }))` (mantém a posição anterior se o callback não fornecer valor).
- Mesma correção espelhada para `y`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `b9b9e8948d`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 407 → 404 (281 arquivos), travado via `--update`.

## WizardMockupPreview.tsx (etapa 17)

**Arquivo:** `src/components/simulator/wizard/WizardMockupPreview.tsx`

**Erros originais (3×):** TS2532 (linha 46) + TS2345×2 (linhas 180, 190) — idênticos aos de `MockupPreview.tsx` (o próprio cabeçalho do arquivo documenta que foi "Adapted from MockupPreview for the wizard's Personalization type").

**Diagnóstico:** mesma causa raiz de `MockupPreview.tsx`: `logoScale[0]` (`noUncheckedIndexedAccess`) e desestruturação `([x])`/`([y])` do callback `onValueChange` do `Slider` (Radix) tipando como `number | undefined`.

**Fix aplicado:** idêntico a `MockupPreview.tsx` — `(logoScale[0] ?? 100) / 100`, e `x: x ?? p.x` / `y: y ?? p.y` nos dois `setLogoPosition`.

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (3 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `7ecef7650e`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 404 → 401 (280 arquivos), travado via `--update`.

## input-otp.tsx (etapa 17)

**Arquivo:** `src/components/ui/input-otp.tsx`

**Erros originais (3×):** TS2339 (linha 29) — `char`, `hasFakeCaret`, `isActive` não existem em `SlotProps | undefined`.

**Diagnóstico:** componente shadcn/ui (`InputOTPSlot`) não usado em nenhum lugar do código-fonte (`grep` confirma zero consumidores além do próprio arquivo e do barrel `src/components/ui/index.ts`) — mas é um primitivo de UI reutilizável, não uma feature morta, então não foi removido. `inputOTPContext.slots[index]` (contexto da biblioteca terceira `input-otp`, tipo `RenderProps.slots: SlotProps[]`) tipa como `SlotProps | undefined` sob `noUncheckedIndexedAccess`, pois `index` é uma prop fornecida por quem renderiza o slot (fora do controle deste arquivo) — sem garantia estrutural local de que está dentro dos limites do array.

**Fix aplicado:** fallback defensivo (não asserção), consistente com o precedente de `MockupPreview.tsx`/`WizardMockupPreview.tsx` para dados vindos de biblioteca terceira:
```tsx
const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index] ?? {
  char: null,
  hasFakeCaret: false,
  isActive: false,
  placeholderChar: null,
};
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `994485fdbe`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 401 → 398 (279 arquivos), travado via `--update`.

## useCatalogState.ts (etapa 17)

**Arquivo:** `src/hooks/useCatalogState.ts` (fix aplicado nos hooks de origem: `useColorEnrichment.ts` e `useFavoriteQuickAdd.ts`)

**Erros originais (3×):**
- TS2339 (linha 155) — `isFetching` não existe no retorno de `useColorEnrichment`.
- TS2345 ×2 (linhas 236, 240) — `Product` de `@/types/product-catalog` não é atribuível a `Product` de `@/types/product` (dois tipos `Product` distintos no codebase: um DB-oriented, outro runtime/UI).

**Diagnóstico:**
1. `useColorEnrichment.ts` retornava apenas `{ data, isLoading }`, mas o hook internamente já usa `useQuery` (React Query) que expõe `isFetching` — gap real de API, não um erro de uso. `isFetching` é a semântica correta aqui (o hook faz enriquecimento incremental em background conforme novos produtos entram na página, então `isLoading` sozinho não cobre re-fetches subsequentes).
2. `useFavoriteQuickAdd.ts` importava `Product` de `@/types/product` (tipo DB-oriented), mas seu único consumidor (`useCatalogState.ts`) sempre passa produtos do tipo `@/types/product-catalog` (runtime/UI, usado em todo o catálogo). Confirmado via `grep` que `useFavoriteQuickAdd` não tem outros consumidores no codebase. O hook só acessa `product.id` e `product.price`, presentes em ambos os tipos — a incompatibilidade era puramente estrutural/nominal em campos não utilizados.

**Fix aplicado:**
- `useColorEnrichment.ts`: `return { data: resultMap, isLoading: query.isLoading, isFetching: query.isFetching };`
- `useFavoriteQuickAdd.ts`: `import type { Product } from "@/types/product-catalog";` (era `@/types/product`) — corrige na fonte em vez de fazer cast no ponto de chamada.

**Validação:**
- `tscheck-files.mjs` (3 arquivos): 3 → 0 erros (22 no programa inteiro, era 25).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `a5adfc5cfe`).
- Nenhum teste dedicado encontrado para nenhum dos 3 arquivos.
- `typecheck:baseline`: 398 → 395 (278 arquivos), travado via `--update`.

## useCategoryIcons.ts (etapa 17)

**Arquivo:** `src/hooks/useCategoryIcons.ts`

**Erros originais (3×):**
- TS2769 (linha 17) — `useQuery<CategoryIcon[]>` sem overload compatível: `description` retornado pelo Supabase é `string | null`, mas a interface `CategoryIcon.description` era `string | undefined` (opcional sem `null`).
- TS18048 (linha 122) + TS2345 (linha 124) — `nameLower.split(/[\s|]/)[0]` tipando como `string | undefined` sob `noUncheckedIndexedAccess`.

**Diagnóstico:** gap real entre o schema do Supabase (coluna `description` nullable) e a interface local `CategoryIcon`, que só previa `undefined`. Corrigido na fonte (o tipo, não o call site). Para `firstWord`, `String.prototype.split()` garante array não-vazio pela spec ECMAScript — precedente já estabelecido no codebase em `useMarketIntelligenceMacro.ts:54,80` (`.split('T')[0]!`), reaplicado aqui.

**Fix aplicado:**
- `description?: string;` → `description?: string | null;`
- `nameLower.split(/[\s|]/)[0]` → `nameLower.split(/[\s|]/)[0]!`

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `4f328fdb9a`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 395 → 390 (275 arquivos) — o fix na fonte eliminou também 2 erros em cascata (`ExternalCategoryFilter.tsx` e `ProductCategoryBadges.tsx`, 1 cada, consumidores de `getCategoryIcon`/`CategoryIcon`), travado via `--update`.

## useKitUndoRedo.ts (etapa 17)

**Arquivo:** `src/hooks/useKitUndoRedo.ts`

**Erros originais (3×):** TS2322 (linhas 47, 57) + TS2345 (linha 55) — `noUncheckedIndexedAccess` em `newHistory[newHistory.length - 1]` (em `undo`) e na desestruturação `const [next, ...rest] = future` (em `redo`), ambos tipando como `| undefined` contra o retorno declarado `UndoRedoSnapshot | null`.

**Diagnóstico:** ambos os casos são estruturalmente seguros pelo próprio controle de fluxo da função:
- `undo()`: guard `if (history.length <= 1) return null;` garante `history.length >= 2`; após `newHistory.pop()`, `newHistory.length >= 1`, então `newHistory[newHistory.length - 1]` sempre existe.
- `redo()`: guard `if (future.length === 0) return null;` garante `future.length >= 1`, então `future[0]` sempre existe.

**Fix aplicado:** asserção não-nula nos dois pontos, já que a garantia vem do próprio guard local (mesmo padrão de `FocusTrap.tsx`/`VoiceVisualEffects.tsx`):
```ts
// undo():
const prev = newHistory[newHistory.length - 1]!;

// redo(): trocada a desestruturação (não é possível aplicar `!` num binding pattern) por indexação explícita
const next = future[0]!;
const rest = future.slice(1);
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `41168f357f`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 390 → 387 (274 arquivos), travado via `--update`.

## useMockupTechniques.ts (etapa 17)

**Arquivo:** `src/hooks/useMockupTechniques.ts`

**Erros originais (3×):** TS18048 (linhas 132, 144, 153) — `noUncheckedIndexedAccess`/optionalidade em `techResult.records` e `faixaResult.records`, retornados por `invokeExternalDb<T>()`.

**Diagnóstico:** `InvokeResult<T>.records` (`src/lib/external-db/invoke.ts:46`) é declarado como `records?: T[]` — opcionalidade real e intencional, não um gap de tipagem: o próprio `invokeExternalDbSingle` (`src/lib/external-db/bridge.ts:100`) já guarda com `if (!result.records?.length)` antes de acessar `records[0]`. É um valor de fronteira (resposta de bridge HTTP externo) que pode legitimamente não trazer `records` em certos payloads — mesma categoria de "fallback defensivo" já aplicada em `input-otp.tsx`/`WizardMockupPreview.tsx` nesta etapa, não um caso de asserção não-nula.

**Fix aplicado:** fallback defensivo nos 3 pontos de acesso:
```ts
if (!techResult.records?.length) return new Map(...);
for (const f of faixaResult.records ?? []) { ... }
for (const tech of techResult.records ?? []) { ... }
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (8 → 5 no programa inteiro — sem cascata adicional).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `4d734d409b`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 387 → 384 (273 arquivos), travado via `--update`.

## useProductImages.ts (etapa 17)

**Arquivo:** `src/hooks/useProductImages.ts`

**Erros originais (3×):** TS2322 (linha 71) + TS18048 (linhas 100, 133) — mesmo padrão de `useMockupTechniques.ts`: `InvokeResult<T>.records` é `T[] | undefined` por design (valor de fronteira do bridge externo), usado sem guard em `fetchProductImages`, `fetchProductImagesBatch` e `fetchPrimaryImage`.

**Diagnóstico:** idêntico ao caso anterior — `records` opcional intencional, não gap de tipagem. Fallback defensivo é o fix correto.

**Fix aplicado:**
```ts
return result.records ?? [];                    // fetchProductImages
(result.records ?? []).forEach(image => { ... }); // fetchProductImagesBatch
return result.records?.[0]?.url_cdn || null;     // fetchPrimaryImage
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (8 → 5 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `c0727e8118`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 384 → 381 (272 arquivos), travado via `--update`.

## useProductInsights.ts (etapa 17)

**Arquivo:** `src/hooks/useProductInsights.ts`

**Erros originais (3×):** TS2531 + TS18047 (linha 57) — `allQuantities.reduce((a, b) => a + (b ?? 0), 0)` com array `(number | null)[]` fazia o TS escolher o overload de `reduce` sem generics (`(T, T) => T`), tipando o acumulador `a` também como `number | null`; TS2345 (linha 72) — `orderIds` como `(string | null)[]` não assinalável a `readonly string[]` esperado por `.in('id', orderIds)`.

**Diagnóstico:** `quote_items.quantity`/`order_items.quantity`/`order_items.order_id` são colunas nullable no Supabase. O `b ?? 0` já existente dentro do `reduce` mostrava a intenção correta (tratar quantidade nula como 0) — só precisava ser aplicado na construção do array, não dentro do callback, para o TS inferir `number[]` e escolher o overload genérico correto. Para `orderIds`, aplicado o mesmo padrão de type-guard filter já usado em `useReplenishments.ts:161-162`/`useKitStockValidation.ts:44`.

**Fix aplicado:**
```ts
const allQuantities = [
  ...(quoteItems || []).map(q => q.quantity ?? 0),
  ...(orderItems || []).map(o => o.quantity ?? 0)
];
// ...
const averageQuantity = allQuantities.reduce((a, b) => a + b, 0) / allQuantities.length;

const orderIds = (orderItems || []).map(o => o.order_id).filter((id): id is string => id !== null);
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (4 → 1 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `08a17a1d6d`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 381 → 378 (271 arquivos), travado via `--update`.

## useTechniqueRecommendations.ts (etapa 17)

**Arquivo:** `src/hooks/useTechniqueRecommendations.ts`

**Erros originais (3×):** TS18048 (linha 158) + TS2322 (linhas 177, 214) — `noUncheckedIndexedAccess` em `POPULARITY_SCORES[popularityKey]` (índice `string` dinâmico, mesmo vindo de `Object.keys(POPULARITY_SCORES).find(...)` do próprio objeto) e em `reasons[0]` (guardado por `reasons.length > 0` na mesma função).

**Diagnóstico:**
- `popularityScore` (2 ocorrências, linhas 157 e 204): `POPULARITY_SCORES[popularityKey]` tipa `number | undefined` mesmo com `popularityKey` garantidamente uma chave válida do objeto — TS não correlaciona `Object.keys(obj).find` com o índice do próprio `obj`. Fallback defensivo (`?? 30`) mantém a mesma semântica do `else` já existente no ternário.
- `reasons[0]` (linha 177): estruturalmente seguro pelo guard local `reasons.length > 0` da mesma função — mesmo padrão de `useKitUndoRedo.ts` nesta etapa.

**Fix aplicado:**
```ts
const popularityScore = popularityKey ? (POPULARITY_SCORES[popularityKey] ?? 30) : 30;
// ...
reason: reasons.length > 0 ? reasons[0]! : 'Técnica compatível',
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (3 → 0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `40fa7d2384`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 378 → 375 (270 arquivos), travado via `--update`.

## useTecnicasUnificadas.ts (etapa 17)

**Arquivo:** `src/hooks/useTecnicasUnificadas.ts`

**Erros originais (3×):** TS18048 (linhas 185, 204) + TS2532 (linha 191) — `noUncheckedIndexedAccess` em `tiers[0]` (função deprecated `calculatePriceForQuantityLegacy`), usado tanto para inicializar `selectedTier` quanto para calcular `minTierPrice`.

**Diagnóstico:** estruturalmente seguro pelo guard local da própria função — `if (tiers.length === 0) return null;` logo acima garante `tiers.length >= 1` para ambos os acessos a `tiers[0]`. Mesmo padrão de `useKitUndoRedo.ts`/`useTechniqueRecommendations.ts` nesta etapa.

**Fix aplicado:**
```ts
let selectedTier = tiers[0]!;
// ...
const minTierPrice = tiers[0]!.unitPrice;
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (15 → 12 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `8e8943e29a`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 375 → 372 (269 arquivos), travado via `--update`.

## auth-utils.ts (etapa 17)

**Arquivo:** `src/lib/auth/auth-utils.ts`

**Erros originais (3×):** TS2322 (linhas 33, 34) + TS2678 (linha 64) — literais `"admin"` e `"manager"` em `ROLE_HIERARCHY: AppRole[]` e `case "admin":` no `switch` de `getDefaultRouteByRole`, mas `AppRole` (`src/lib/roles.ts:20-28`) não inclui esses valores — só existem como aliases legados.

**Diagnóstico:** não é gap de tipagem — são literais mortos. Confirmado via `src/lib/access/role-policy.ts:7` (`normalizeAssignedRoles`) que já normaliza `"admin"`/`"manager"` → `"supervisor"` no ponto em que as roles são buscadas do banco (`useUserRoles.ts:38`), antes de qualquer valor tipado `AppRole` circular pelo app. Ou seja, um `AppRole` genuíno nunca pode ser literalmente `"admin"`/`"manager"` — são remanescentes de antes do rename canônico para `"supervisor"`.

**Fix aplicado:** remoção dos literais mortos (não substituição/cast):
```ts
// ROLE_HIERARCHY: removidas as linhas "admin" e "manager" (supervisor já cobre a posição na hierarquia)
// switch: removido `case "admin":` (supervisor já cobre a mesma rota)
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (5 → 2 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `294d159c0b`).
- Nenhum teste dedicado encontrado (consumidores `Auth.tsx`/`AuthContext.tsx` não têm teste direto destas funções).
- `typecheck:baseline`: 372 → 369 (268 arquivos), travado via `--update`.

## kit-og-image.ts (etapa 17)

**Arquivo:** `src/lib/kit-og-image.ts`

**Erros originais (3×):** TS2345 (linha 86) + TS2322 (linhas 89, 102) — dentro de `wrapText()`, `words[n]` (de `const words = text.split(/\s+/)`) tipado `string | undefined` sob `noUncheckedIndexedAccess`, usado em `test`/`line` que exigem `string`.

**Diagnóstico:** não é valor genuinamente nullable — é o caso clássico de for-loop limitado (`for (let n = 0; n < words.length; n++)`), onde `n` está sempre dentro do intervalo de `words` por construção. Confirmado precedente já estabelecido no código para exatamente este padrão: `useProductVideoGallery.ts:197` (`files[i]!`), `useProductImageGallery.ts:213` (`files[i]!`), `webSpeechFallback.ts:58-59` (`event.results[i]!`, `result[0]!.transcript`).

**Fix aplicado:** asserção de não-nulo nos 3 pontos de acesso a `words[n]` dentro do loop limitado:
```ts
// antes:
const test = line ? `${line} ${words[n]}` : words[n];
// ...
line = words[n];
// depois:
const test = line ? `${line} ${words[n]!}` : words[n]!;
// ...
line = words[n]!;
```
(O erro da linha 102 — `line = test;` — resolveu junto, como consequência do tipo de `test` virar `string`.)

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (3 → 0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `21bf897289`).
- Nenhum teste dedicado encontrado (`find` por `*kit-og-image*` só retorna o próprio arquivo fonte).
- `typecheck:baseline`: 369 → 366 (267 arquivos), travado via `--update`.

## pricing.service.ts (etapa 17)

**Arquivo:** `src/lib/personalization/services/pricing.service.ts`

**Erros originais (3×):** TS18048 (linhas 284, 308, 315) — em `calculatePriceFromTable()`, `let tierUsed = table.faixas[0]` tipado `FaixaQuantidade | undefined` sob `noUncheckedIndexedAccess`, usado depois como se fosse sempre definido (`tierUsed.precoUnitario`, `tierUsed.faixa`, `tierUsed.slaDias`).

**Diagnóstico:** não é caso estruturalmente provável (não é for-loop limitado nem guarda local pré-existente) — `table.faixas` é dado de fronteira genuíno: construído em `transformers.ts:73-88` a partir de até 15 campos opcionais (`min_qty_N`/`price_N`) vindos do banco externo, podendo legitimamente resultar em array vazio pra uma tabela de preço malformada/incompleta. O `PriceTableRepository.findBestMatch()` que fornece a tabela não garante `faixas.length > 0`. Sem guarda, hoje em runtime um `faixas` vazio já geraria um `TypeError` genérico (`Cannot read properties of undefined`) ao acessar `tierUsed.precoUnitario` — mascarado, não evitado.

**Fix aplicado:** guarda explícita no início da função, que falha com mensagem descritiva (mesmo padrão de `invokeExternalDbSingle` em `bridge.ts`, que lança erro claro ao invés de deixar `undefined` se propagar), preservando a assinatura pública da função (usada em 4 pontos de chamada como `PriceCalculationResult` não-nulo — mudar o retorno pra nullable geraria churn desnecessário nesses consumidores):
```ts
// antes:
let tierUsed = table.faixas[0];
// depois:
if (table.faixas.length === 0) {
  throw new Error(`Tabela de preço "${table.codigoTabelaOpcao}" não possui faixas de quantidade configuradas`);
}
let tierUsed = table.faixas[0]!;
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (8 → 5 no programa inteiro, cascata).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `fda841f3b5`).
- Nenhum teste dedicado encontrado; busca por consumidores (`calculatePricing`, `calculateBatchPricing`, `comparePricing`, `findBestTechnique`, `calculateQuantitySavings`) em `tests/` não retornou nenhum arquivo.
- `typecheck:baseline`: 366 → 363 (266 arquivos), travado via `--update`.

## AdminVerbasPage.tsx (etapa 17)

**Arquivo:** `src/pages/admin/AdminVerbasPage.tsx`

**Erros originais (3×):** TS2339 (linhas 62, 63, 64) — em `exportAuditToCSV()`, acesso a `log.event_type`, `log.metadata` e `log.payload`, campos que nunca existiram na tabela real `admin_audit_log` (confirmado em `src/integrations/supabase/types.ts:483-503`: colunas reais são `action`, `details`, `user_id`, `resource_type`, etc.).

**Diagnóstico:** não é gap de tipagem — é drift de schema. A query já usa `select('*')` na tabela real, então o tipo inferido reflete corretamente as colunas existentes; o código é que referenciava nomes de colunas de uma versão anterior/diferente do schema. Confirmado o mapeamento correto comparando com o padrão já estabelecido em `RecentAuditTable.tsx` (mesma tabela): `action` pro nome do evento, `details` (Json) pro payload, `user_id` pra identificar o usuário (sem campo de e-mail embutido — `RecentAuditTable.tsx` resolve e-mail via join separado com `profiles`, fora do escopo desta correção pontual). Sem essa correção, a exportação CSV já estava quebrada em produção: `event_type`/`metadata`/`payload` sempre `undefined` em runtime, então toda linha exportava "Evento" vazio, "Usuario" sempre "Sistema" e "Detalhes" como a string `"undefined"` — não era um recurso funcionando.

**Fix aplicado:**
```ts
// antes:
Evento: log.event_type,
Usuario: log.metadata?.user_email || 'Sistema',
Detalhes: JSON.stringify(log.payload)
// depois:
Evento: log.action,
Usuario: log.user_id || 'Sistema',
Detalhes: JSON.stringify(log.details)
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `654f73dc95`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 363 → 360 (265 arquivos), travado via `--update`.

## QARunDetailPage.tsx (etapa 17)

**Arquivo:** `src/pages/admin/qa/QARunDetailPage.tsx`

**Erros originais (3×):** TS2345 (linhas 28, 41) — `id` de `useParams()` tipado `string | undefined`, usado em `.eq("id", id)`/`.eq("run_id", id)` que exigem `string`; TS2322 (linha 157) — `variant={step.status === 'blocked' ? 'warning' : 'outline'}` no `Button`, mas `"warning"` não existe na união de variantes do componente.

**Diagnóstico (id):** inicialmente apliquei o padrão `useParams<{ id: string }>()` usado em 8 outras páginas de detalhe do projeto (`QuoteDetailPage.tsx`, `OrderDetailPage.tsx`, etc.), mas isso sozinho não resolveu os erros — nesta versão do react-router (`useParams<ParamsOrKey>()` retorna `Partial<ParamsOrKey>` quando `ParamsOrKey` é um objeto), o genérico não elimina o `undefined`. Inspecionando `QuoteDetailPage.tsx` mais a fundo, o padrão completo usado lá é `enabled: !!id` no `useQuery` (garante que a `queryFn` só roda com `id` truthy) + `id!` no ponto de uso — mesma categoria de "guarda no mesmo escopo" já usada nesta etapa, só que via `enabled` do React Query em vez de um `if`.

**Diagnóstico (variant "warning"):** não existe variante `"warning"` no `Button` (`src/components/ui/button.tsx`). Padrão já usado no mesmo arquivo (botão PASS, linha 143) e em `PasswordResetApproval.tsx:49` pra estado "warning": `variant="outline"` fixo + `className` condicional com os tokens Tailwind `bg-warning`/`text-warning`/`border-warning` (que existem e já são usados amplamente no projeto).

**Fix aplicado:**
```ts
// useParams — antes: const { id } = useParams();
// depois:
const { id } = useParams<{ id: string }>();
// ...
const { data: run, isLoading: loadingRun } = useQuery({
  queryKey: ["qa_run", id],
  enabled: !!id,
  queryFn: async () => {
    const { data, error } = await supabase.from("qa_runs").select("*").eq("id", id!).single();
    // ...
// (mesmo padrão aplicado ao segundo useQuery, .eq("run_id", id!))

// Button variant — antes:
variant={step.status === 'blocked' ? 'warning' : 'outline'}
// depois:
variant="outline"
className={step.status === 'blocked' ? 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20' : ''}
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `900ee841db`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 360 → 357 (264 arquivos), travado via `--update`.

## useQuoteViewData.ts (etapa 17)

**Arquivo:** `src/pages/quote-view/useQuoteViewData.ts`

**Erros originais (3×):** TS2339 (linha 21) — `duplicateQuote` desestruturado de `useQuotes()` mas inexistente no retorno do hook; TS2339 (linha 98) — `profile?.signature_url`, campo inexistente no tipo `Profile`; TS2322 (linha 215) — `logQuoteHistory` passado pra `syncQuoteToBitrix` com assinatura incompatível (4º parâmetro obrigatório vs. opcional esperado).

**Diagnóstico (duplicateQuote):** função de fato existiu em `useQuotes.ts` (implementação completa, ver histórico git — commit `e4a7d038`), mas foi removida numa refatoração posterior. No hook atual (`src/hooks/quotes/useQuotes.ts`), a mesma funcionalidade já existe sob outro nome: `reorderQuote(quoteId)` (sem `itemIds`) cria uma cópia completa do orçamento como rascunho — confirmado como o substituto real porque `QuotesListPage.tsx:453` já usa exatamente `onDuplicate={(id) => reorderQuote(id)}` pro mesmo botão "Duplicar". `useQuoteViewData.ts` e seu consumidor `QuoteViewPage.tsx` (menu "Duplicar", linha 180) simplesmente não foram atualizados quando a função foi renomeada — bug de refatoração incompleta, não uma funcionalidade nova a implementar.

**Diagnóstico (signature_url):** `Profile` (`src/types/users.ts`) e a tabela real `profiles` (`src/integrations/supabase/types.ts`) nunca tiveram coluna `signature_url` — campo sempre foi `undefined` em runtime também, não só em tipo. Como `signatureUrl` é opcional em `ProposalTemplateData.seller` (`ProposalHtmlTemplate.tsx:55`), a linha foi removida sem alterar comportamento (mesmo resultado: campo ausente).

**Diagnóstico (logQuoteHistory):** o bug real estava em `useQuotes.ts:338` — `logQuoteHistory` declarava o 4º parâmetro `opts: Record<string, unknown>` como obrigatório, mas 3 outros call sites no projeto (`QuoteBitrixSync.ts:77`, `QuoteSingularApprovalActions.tsx:69`, e a própria função repassada pra `syncQuoteToBitrix`) já chamam/esperam esse parâmetro como opcional — `SyncBitrixParams.logQuoteHistory` (`QuoteBitrixSync.ts:18`) declara `meta?: Record<string, unknown>`. Corrigindo `opts` pra opcional na fonte (`useQuotes.ts`) resolve o erro do arquivo alvo e, como efeito colateral correto (mesma causa raiz), também zera 2 erros TS2554 pré-existentes em `QuoteManagerApprovalBanner.tsx:45` e `QuoteSingularApprovalActions.tsx:69` ("Expected 4 arguments, but got 3"), que já estavam quebrados por chamar a função com 3 argumentos.

**Fix aplicado:**
```ts
// useQuotes.ts — antes: opts: Record<string, unknown>
// depois:
logQuoteHistory: (id: string, action: string, desc: string, opts?: Record<string, unknown>) =>
  QuoteService.logHistory({ quoteId: id, userId: user?.id || "", action, description: desc, ...opts })

// useQuoteViewData.ts — antes: const { fetchQuote, logQuoteHistory, duplicateQuote } = useQuotes();
// depois:
const { fetchQuote, logQuoteHistory, reorderQuote } = useQuotes();
// (mesma troca no objeto de retorno do hook)
// removida a linha: signatureUrl: profile?.signature_url || undefined,

// QuoteViewPage.tsx — antes: const newQuote = await duplicateQuote(id!);
// depois:
const newQuote = await reorderQuote(id!);
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros no arquivo alvo; efeito colateral zera também os 2 erros TS2554 em `QuoteManagerApprovalBanner.tsx` e `QuoteSingularApprovalActions.tsx`.
- `check-eslint-baseline.mjs`: 0 regressões nos 3 arquivos alterados (`useQuoteViewData.ts`, `useQuotes.ts`, `QuoteViewPage.tsx`).
- Nenhum teste dedicado encontrado (`tests/hooks/useQuotes-helpers.test.ts` testa apenas helpers puros, sem importar o hook).
- `typecheck:baseline`: 357 → 352 (261 arquivos; 3 arquivos melhoraram), travado via `--update`.
- **Nota:** durante a validação, foi descoberto um erro pré-existente e não-relacionado em `useQuotes.ts:56` (`newQuote.id` possivelmente `undefined` atribuído a `quoteId: string` em `QuoteService.logHistory`) — fora do escopo desta correção (não está entre os 3 erros do arquivo alvo, e existia antes desta mudança); candidato para uma futura etapa.

## RolePermissionsPage.tsx (etapa 17)

**Arquivo:** `src/pages/RolePermissionsPage.tsx`

**Erros originais (3×):** TS2345 (linha 71) — `setRolePermissions(rolePermRes.data || [])`, dado real não bate com a interface local `RolePermission`; TS2769 (linha 131) — `supabase.from('role_permissions').insert(toAdd)`, nenhum overload bate com o shape enviado; TS2532 (linha 182) — `acc[perm.category].push(perm)` possivelmente `undefined` no reduce de agrupamento.

**Diagnóstico (schema drift, TS2345 + TS2769):** a interface local `RolePermission` (linha 26-30) e toda a lógica do componente assumiam uma FK `permission_id: string` ligando `role_permissions` → `permissions.id`. A tabela real (`src/integrations/supabase/types.ts`) não tem essa coluna — `role_permissions` só tem `permission_code: string`, que referencia `permissions.code` (não `permissions.id`). Isso não era só um erro de tipo: em runtime, `rp.permission_id` sempre foi `undefined` pra toda linha retornada do Supabase, então `hasPermission()` sempre retornava `false` e a matriz de permissões sempre aparecia zerada/desmarcada pra qualquer role — bug real de produção, não só de tipagem. Fix: renomear o campo pra `permission_code` na interface e em toda comparação/gravação (`hasPermission`, `togglePermission`, `saveChanges`, `selectAllForRole`, `deselectAllForRole`), e trocar o identificador usado como chave de casamento de `perm.id` pra `perm.code` em todos os pontos de chamada (a UI React/`Checkbox id=`/`key=` continuam usando `perm.id` normalmente, pois ali é só identidade única de DOM/lista, não a chave de negócio).

**Diagnóstico (TS2532):** mesmo padrão de group-by-reduce já resolvido em `TechniqueMultiSelector.tsx:49` — `if (!acc[k]) acc[k] = []` seguido de `acc[k].push(...)` em statement separado não propaga a garantia de não-nulo sob `noUncheckedIndexedAccess`. Reaproveitado o idioma já usado lá: `(acc[k] ??= []).push(...)`, que resolve guarda + atribuição numa única expressão.

**Fix aplicado:**
```ts
// interface — antes: permission_id: string;
// depois:
permission_code: string;

// hasPermission/togglePermission — comparação:
// antes: rp.permission_id === permissionId
// depois:
rp.permission_code === permissionCode

// saveChanges — insert/delete:
// antes: { role, permission_id: permissionId } / .eq('permission_id', item.permission_id)
// depois:
{ role, permission_code: permissionCode } / .eq('permission_code', item.permission_code)

// call sites (hasPermission/togglePermission/selectAllForRole/deselectAllForRole):
// antes: hasPermission(perm.id, role) / togglePermission(perm.id, role)
// depois:
hasPermission(perm.code, role) / togglePermission(perm.code, role)

// groupedPermissions — antes:
if (!acc[perm.category]) acc[perm.category] = [];
acc[perm.category].push(perm);
// depois:
(acc[perm.category] ??= []).push(perm);
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `a9445d5100`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 352 → 349 (260 arquivos), travado via `--update`.

## GestorAuditPage.tsx (etapa 17)

**Arquivo:** `src/pages/sicoob/GestorAuditPage.tsx`

**Erros originais (3×):** TS2339 (linhas 43 e 123) — `Property 'postos_atendimento' does not exist on type 'SelectQueryError<"could not find the relation between sicoob_manager_audit and sicoob_orders">'`; TS2769 (linha 105) — `format(new Date(log.created_at), ...)`, nenhum overload do construtor `Date` bate.

**Diagnóstico (TS2339 ×2 — bug real de produção, não só de tipagem):** a query fazia `supabase.from('sicoob_manager_audit').select('*, sicoob_orders(id, total_amount, postos_atendimento(nome))')`, um embed que depende de FK declarada entre as duas tabelas. Conferindo o schema real (`src/integrations/supabase/types.ts`) e a migration original (`supabase/migrations/20260503220418_...sql:38-45`), `sicoob_manager_audit.order_id` é `UUID NOT NULL` **sem** `REFERENCES sicoob_orders(id)` — a tabela nunca teve essa FK no banco, por isso `Relationships: []` no tipo gerado e o PostgREST nunca consegue resolver esse embed, nem em runtime (não é só o TS reclamando — a query real do Supabase sempre retornaria erro "could not find a relationship..." pra essa combinação). Ou seja, a tela de auditoria do gestor está quebrada desde a origem: `auditLogs` nunca carrega dados de fato, e a UI cai num estado "sem mensagem nem lista" (não bate `length === 0` pois `data` fica `undefined` no erro). Confirmado que `sicoob_orders.pa_id → postos_atendimento.id` tem FK válida (usada com sucesso em `GestorConsolidatedOrdersPage.tsx:122` com o mesmo shape `"id, total_amount, postos_atendimento(nome)"`), então o problema é específico do lado `sicoob_manager_audit → sicoob_orders`. Fix seguindo o padrão já estabelecido no repo para exatamente essa forma de erro (`useStepUpAttempts.ts:85-104`, busca em 2 etapas com merge via `Map` no cliente): busca `sicoob_manager_audit.select('*')` isolado, extrai os `order_id` únicos, busca `sicoob_orders` (com o embed `postos_atendimento` que tem FK válida) via `.in('id', orderIds)`, e mescla no cliente atribuindo `sicoob_orders` a cada log. Resolve tanto o erro de tipo quanto o bug real de runtime, sem exigir migration de schema (que ficaria fora do alcance desta etapa — alterar constraint em produção é mudança de schema, não fix de código).

**Diagnóstico (TS2769):** `sicoob_manager_audit.created_at` é `string | null` no schema (nullable, apesar do `DEFAULT now()` na migration). `new Date(log.created_at)` não aceita `null` em nenhum overload do construtor `Date`. Fix: guarda condicional antes de formatar, mesmo padrão já usado em `useQuoteViewData.ts` (`quote.created_at ? format(...) : ''`).

**Fix aplicado:**
```ts
// antes:
const { data, error } = await supabase
  .from('sicoob_manager_audit')
  .select(`*, sicoob_orders (id, total_amount, postos_atendimento (nome))`)
  .order('created_at', { ascending: false })
  .limit(100);
if (error) throw error;
return data;

// depois:
const { data, error } = await supabase
  .from('sicoob_manager_audit')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(100);
if (error) throw error;

const orderIds = Array.from(new Set((data ?? []).map((log) => log.order_id)));
const { data: orders, error: ordersError } = await supabase
  .from('sicoob_orders')
  .select('id, total_amount, postos_atendimento (nome)')
  .in('id', orderIds);
if (ordersError) throw ordersError;

const ordersById = new Map((orders ?? []).map((order) => [order.id, order]));
return (data ?? []).map((log) => ({
  ...log,
  sicoob_orders: ordersById.get(log.order_id) ?? null,
}));

// JSX — antes: {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}
// depois:
{log.created_at ? format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss') : '-'}
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `bf5edf0479`).
- Nenhum teste dedicado encontrado (`find` por `*GestorAudit*` só retorna o próprio componente e o bundle de build).
- `typecheck:baseline`: 349 → 346 (259 arquivos), travado via `--update`.
- **Nota (achado, fora de escopo):** a causa raiz de fato é a ausência da FK `sicoob_manager_audit.order_id → sicoob_orders.id` no banco real — o fix de código acima resolve o erro de tipo e o bug de runtime sem precisar de migration, mas o ideal a longo prazo seria adicionar essa constraint via migration formal (`supabase/migrations/`) pra permitir embed nativo do PostgREST; não aplicado aqui por exigir validação de dados órfãos em produção antes de adicionar a constraint, o que foge do escopo desta etapa (fix de erros de TS).

## simulator-wizard.ts (etapa 17)

**Arquivo:** `src/types/domain/simulator-wizard.ts`

**Erros originais (3×):** TS2322 (linhas 285 e 293) — `return WIZARD_STEPS[index ± 1]` em `getNextStep`/`getPreviousStep`, tipo `WizardStep | undefined` não bate com o retorno declarado `WizardStep | null`; TS2345 (linha 326) — `isStepComplete(WIZARD_STEPS[i], state)` em `canNavigateToStep`, argumento `WizardStep | undefined` não bate com o parâmetro `WizardStep`.

**Diagnóstico:** mesmo padrão de guarda-não-propagada de `noUncheckedIndexedAccess` já resolvido em `FocusTrap.tsx` nesta etapa — acesso por índice a um array (`WIZARD_STEPS`, 4 elementos fixos) já protegido por checagem numérica anterior, mas o TS não propaga essa garantia pro tipo do acesso indexado. Em `getNextStep`/`getPreviousStep`, o `if (index < WIZARD_STEPS.length - 1)` / `if (index > 0)` já garante que `index ± 1` está dentro dos limites do array antes do acesso. Em `canNavigateToStep`, o loop `for (let i = 0; i < targetIndex; i++)` com `targetIndex = getStepIndex(targetStep)` (sempre em `[0, WIZARD_STEPS.length - 1]`, já que `WizardStep` é união fechada de 4 literais todos presentes em `WIZARD_STEPS`) garante `i` sempre dentro dos limites. Todos os 3 pontos são seguros por construção — aplicada asserção de não-nulo (`!`), mesmo idioma já usado em `FocusTrap.tsx`.

**Fix aplicado:**
```ts
// getNextStep/getPreviousStep — antes: return WIZARD_STEPS[index + 1]; / return WIZARD_STEPS[index - 1];
// depois:
return WIZARD_STEPS[index + 1]!; / return WIZARD_STEPS[index - 1]!;

// canNavigateToStep — antes: if (!isStepComplete(WIZARD_STEPS[i], state)) {
// depois:
if (!isStepComplete(WIZARD_STEPS[i]!, state)) {
```

**Validação:**
- `tscheck-files.mjs`: 3 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `2bdef0344a`).
- Nenhum teste dedicado encontrado (`tests/integration/simulator-wizard-pricing-parity.test.ts` testa paridade de preço, não importa nenhuma das funções alteradas). Consumidores identificados via grep (`useSimulatorWizard.ts`, `WizardStepIndicator.tsx`) não têm teste dedicado.
- `typecheck:baseline`: 346 → 343 (258 arquivos), travado via `--update`.

## AdminDataTable.tsx (etapa 17)

**Arquivo:** `src/components/admin/common/AdminDataTable.tsx`

**Erros originais (2×):** TS2322 (linhas 282-283) — `columns={columns}` e `onRowClick={onRowClick}` passados pro subcomponente `DataTableRow`, `Column<T>[]` e `((row: T) => void) | undefined` (tipos do componente pai, genéricos em `T`) não batem com `Column<{ id?: string | number | undefined }>[]` e `((row: { id?: string | number | undefined }) => void) | undefined` (tipos "achatados" do subcomponente).

**Diagnóstico:** limitação conhecida de TypeScript + `React.memo` — `DataTableRow` é um componente genérico (`<T extends { id?: string | number }>`), mas a assinatura de tipo de `React.memo` (`memo<P extends object>(Component: FunctionComponent<P>): NamedExoticComponent<P>`) não preserva parâmetros de tipo genéricos: ao envolver `DataTableRow` em `React.memo(...)`, o TS precisa fixar `T` num tipo concreto único, e resolve isso usando o *constraint* declarado (`{ id?: string | number }`) em vez do `T` real de cada chamada. Resultado: o componente memoizado exportado fica com props "achatadas" pro constraint, incompatíveis com o `T` específico usado no componente pai (`AdminDataTable<T>`). Não é um bug de runtime — é só a assinatura de tipo do wrapper `memo` que perde a genericidade; o comportamento em runtime já estava correto. Fix: idioma padrão do ecossistema React+TS pra esse caso — fazer cast do resultado de `React.memo(...)` de volta pra uma função genérica explícita via `as <T extends ...>(props: {...}) => React.ReactElement`, preservando tanto a genericidade nos call sites quanto a memoização em runtime (não removida, já que remover o memo seria mudança de comportamento/performance não pedida pelo erro de tipo).

**Fix aplicado:**
```tsx
// antes:
const DataTableRow = React.memo(function DataTableRow<T extends { id?: string | number }>({ ... }: {...}) {
  // ...
});

// depois:
const DataTableRow = React.memo(function DataTableRow<T extends { id?: string | number }>({ ... }: {...}) {
  // ...
}) as <T extends { id?: string | number }>(props: {
  row: T;
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}) => React.ReactElement;
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `620d9ce914`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 343 → 341 (257 arquivos), travado via `--update`.

## ExportButton.tsx (etapa 17)

**Arquivo:** `src/components/admin/connections/ExportButton.tsx`

**Erros originais (2×):** TS2345 (linha 84) — `handle(fmt)`, `"csv" | "json" | undefined` não bate com o parâmetro `"csv" | "json"`; TS18048 (linha 88) — `fmt.toUpperCase()`, `fmt` possivelmente `undefined`.

**Diagnóstico:** mesmo padrão de guarda-não-propagada de `noUncheckedIndexedAccess` já resolvido em `FocusTrap.tsx`/`simulator-wizard.ts` nesta etapa — `const fmt = formats[0]` dentro do bloco `if (formats.length === 1)` já está protegido pela checagem de tamanho imediatamente acima (garante que o índice 0 existe), mas o TS não propaga essa garantia pro tipo do acesso indexado. Aplicada asserção de não-nulo.

**Fix aplicado:**
```ts
// antes: const fmt = formats[0];
// depois:
const fmt = formats[0]!;
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros no arquivo alvo (1 erro remanescente no programa/probe, pré-existente e não-relacionado, fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `684b32e516`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 341 → 339 (256 arquivos), travado via `--update`.

## SecretsManagerHealthPanel.tsx (etapa 17)

**Arquivo:** `src/components/admin/connections/SecretsManagerHealthPanel.tsx`

**Erros originais (2×):** TS18048 (linha 110, 2 ocorrências na mesma linha) — `s.action === "list" || s.action === "status"`, `s` possivelmente `undefined`.

**Diagnóstico:** mesmo padrão de guarda-não-propagada de `noUncheckedIndexedAccess` já resolvido várias vezes nesta etapa — `samples[i]` dentro de um loop `for (let i = samples.length - 1; i >= 0; i--)` está sempre dentro dos limites do array por construção (`i` varre de `length - 1` até `0`), mas o TS não propaga essa garantia pro tipo do acesso indexado. Aplicada asserção de não-nulo.

**Fix aplicado:**
```ts
// antes: const s = samples[i];
// depois:
const s = samples[i]!;
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `3aac0e0fda`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 339 → 337 (255 arquivos), travado via `--update`.

## OrdersHeatmap.tsx (etapa 17)

**Arquivo:** `src/components/admin/OrdersHeatmap.tsx`

**Erros originais (2×):** TS2532 (linha 29, 2 ocorrências na mesma linha/coluna) — `matrix[d.getDay()][d.getHours()] += 1`, dois riscos separados de "Object is possibly undefined": o acesso `matrix[d.getDay()]` (array externo) e, em seguida, indexar o resultado com `[d.getHours()]` (array interno).

**Diagnóstico:** `noUncheckedIndexedAccess` torna QUALQUER acesso indexado a array em `T | undefined`, mesmo quando o índice é provadamente válido por construção — aqui `d.getDay()` retorna sempre 0-6 (`matrix` tem exatamente 7 linhas, `Array.from({length: 7}, ...)`) e `d.getHours()` retorna sempre 0-23 (cada linha tem exatamente 24 colunas, `Array(24).fill(0)`), mas o TS não propaga essa garantia geométrica. Como são 2 indexações encadeadas na mesma expressão (`matrix[row][col]`), o compilador reporta o erro 2×. Fix: extrair a linha (`row = matrix[d.getDay()]!`, único ponto que precisa de asserção de não-nulo, já que a garantia de índice válido é a mesma usada em toda a etapa) e trocar a atribuição composta `+= 1` por atribuição direta com fallback `??` na leitura (`row[h] = (row[h] ?? 0) + 1`), que evita precisar de uma segunda asserção — grava (write) num índice de array sempre é permitido pra um valor `number`, mesmo que o tipo de leitura (read) daquele índice seja `number | undefined`.

**Fix aplicado:**
```ts
// antes:
matrix[d.getDay()][d.getHours()] += 1;

// depois:
const row = matrix[d.getDay()]!;
row[d.getHours()] = (row[d.getHours()] ?? 0) + 1;
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (3331 erros globais, referência `origin/main` em `54d5ba150f`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 337 → 335 (254 arquivos), travado via `--update`.

## usePersonalizationData.ts (etapa 17)

**Arquivo:** `src/components/admin/personalization/usePersonalizationData.ts`

**Erros originais (2×):** TS2352 (linhas 141 e 170) — `Conversion of type 'Record<string, unknown>[] | null' to type 'Location[]' may be a mistake because neither type sufficiently overlaps with the other` (e o mesmo para `LocationTechnique[]`).

**Diagnóstico:** `untypedFrom<T>(table)` é genérico e por padrão assume `T = Record<string, unknown>` quando o chamador não especifica o parâmetro de tipo — foi exatamente o caso aqui: `untypedFrom("product_component_locations")` e `untypedFrom("product_component_location_techniques")` foram chamados sem `<Location>`/`<LocationTechnique>`, então `data` ficou tipado como `Record<string, unknown>[] | null`, tipo estrutural genérico demais pra conversão direta via `as` para as interfaces específicas (índice de assinatura vs. campos nomeados não se sobrepõem o suficiente aos olhos do TS). Não é um bug de runtime — a query e os dados retornados sempre foram corretos — apenas a inferência de tipo não usava o parâmetro genérico que a própria função já provê para esse propósito.

**Fix aplicado:**
```ts
// antes:
const { data, error } = await untypedFrom("product_component_locations")...
return data as Location[];

// depois:
const { data, error } = await untypedFrom<Location>("product_component_locations")...
return data as Location[];
```
(mesmo padrão para `untypedFrom<LocationTechnique>("product_component_location_techniques")`.)

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (5 no programa inteiro, pré-existentes/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `490337b20`).
- Nenhum teste dedicado encontrado; consumidores (`ProductPersonalizationManager.tsx`, `GroupInheritance.tsx`, `ProductSelector.tsx`) também sem testes dedicados.
- `typecheck:baseline`: 335 → 333 (253 arquivos), travado via `--update`.

## ProductPersonalizationManager.tsx (etapa 17)

**Arquivo:** `src/components/admin/ProductPersonalizationManager.tsx`

**Erros originais (2×):** TS2532 (linhas 92 e 93) — `Object is possibly 'undefined'` em `reordered[i].sort_order` e `reordered[i].id` dentro do loop de reordenação de drag-and-drop.

**Diagnóstico:** mesmo padrão de guarda de índice não-propagada já visto repetidamente nesta etapa: `for (let i = 0; i < reordered.length; i++)` garante `i` sempre dentro dos limites de `reordered`, mas o TS não propaga essa garantia para os 2 acessos por índice dentro do corpo do loop (`.sort_order` e `.id`).

**Fix aplicado:**
```ts
// antes:
for (let i = 0; i < reordered.length; i++) {
  if (reordered[i].sort_order !== i) {
    await supabase.from("product_components").update({ sort_order: i }).eq("id", reordered[i].id);
  }
}

// depois:
for (let i = 0; i < reordered.length; i++) {
  const item = reordered[i]!;
  if (item.sort_order !== i) {
    await supabase.from("product_components").update({ sort_order: i }).eq("id", item.id);
  }
}
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (5 no programa inteiro, pré-existentes/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `99127776c`).
- Nenhum teste dedicado encontrado (existe um componente homônimo em `personalization-manager/`, não relacionado).
- `typecheck:baseline`: 333 → 331 (252 arquivos), travado via `--update`.

## VideoMetaEditor.tsx (etapa 17)

**Arquivo:** `src/components/admin/products/video-gallery/VideoMetaEditor.tsx` (+ `VideoGrid.tsx` e `useProductVideoGallery.ts`, mesma cadeia de tipo)

**Erros originais (2×):** TS2322 (linha 42) — `Type 'string | null' is not assignable to type 'string | undefined'` em `title: title.trim() || null` e `description: description.trim() || null`.

**Diagnóstico:** `git log -p` no arquivo mostra que essas 2 linhas usavam originalmente `null as any` — um cast explícito pra contornar exatamente essa incompatibilidade de tipo — que foi removido numa limpeza anterior sem corrigir a declaração de tipo subjacente. Ou seja, `null` aqui é comportamento **intencional**: o objeto `data` é serializado via `JSON.stringify` dentro de `supabase.functions.invoke` (edge function `external-db-bridge`, operação `update`), e `JSON.stringify` **preserva** chaves com valor `null` mas **descarta** chaves com valor `undefined` — então usar `null` é o que de fato permite ao usuário limpar o título/descrição do vídeo salvando o campo vazio; usar `undefined` (pra satisfazer o tipo `string | undefined` declarado) quebraria essa funcionalidade silenciosamente, já que a chave nem seria enviada no update. O fix correto é alargar o tipo — não o valor — pra refletir o comportamento real e intencional, em toda a cadeia de props que carrega esse shape (`VideoMetaEditor.onSave` → `VideoGrid.updateVideoMeta` → `useProductVideoGallery.updateVideoMeta`).

**Fix aplicado (3 arquivos, mesmo campo em cada um):**
```ts
// antes:
{ title?: string; description?: string; video_type?: string }

// depois:
{ title?: string | null; description?: string | null; video_type?: string }
```

**Validação:**
- `tscheck-files.mjs` (3 arquivos): 2 → 0 erros (1 no programa inteiro, pré-existente/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `155e558b0`).
- Nenhum teste dedicado encontrado para os 3 arquivos.
- `typecheck:baseline`: 331 → 329 (251 arquivos), travado via `--update`.

## useUserManagement.ts (etapa 17)

**Arquivo:** `src/components/admin/users/useUserManagement.ts`

**Erros originais (2×):** TS2367 (linha 32) — comparações `newRole === "admin"` e `newRole === "manager"` sem overlap possível com o tipo `AppRole`.

**Diagnóstico:** `AppRole` (em `src/lib/roles.ts`) já não inclui mais `"admin"`/`"manager"` como valores válidos — esses são apenas aliases legados mapeados para `"supervisor"` via `ROLE_ALIASES` (usado em outro ponto do fluxo de dados, antes de chegar como `AppRole`). Como `newRole` é o parâmetro `newRole: AppRole` de `handleRoleChange`, e o único chamador (`AdminUsuariosPage.tsx` → `RoleChangeDialog.onConfirm`) já entrega um `AppRole` estritamente tipado, as 2 comparações são código morto: nunca podem ser verdadeiras. Confirmado via grep que não há nenhum outro ponto de entrada pra essa função. Fix: remover as 2 comparações mortas, mantendo a lógica (supervisor → "Supervisor", resto → "Agente") idêntica.

**Fix aplicado:**
```ts
// antes:
const label =
  newRole === "dev" ? "Dev"
  : newRole === "supervisor" || newRole === "admin" || newRole === "manager" ? "Supervisor"
  : "Agente";

// depois:
const label =
  newRole === "dev" ? "Dev"
  : newRole === "supervisor" ? "Supervisor"
  : "Agente";
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (2 no programa inteiro, pré-existentes/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `40dd1337b`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 329 → 327 (250 arquivos), travado via `--update`.

## AIChat.tsx (etapa 17)

**Arquivo:** `src/components/ai/AIChat.tsx`

**Erros originais (2×):** TS2322 (linha 68) — `match[1]`/`match[2]` (`string | undefined`) não atribuíveis a `id: string`/`name: string` de `ProductMention`.

**Diagnóstico:** mesmo padrão de guarda não-propagada, desta vez em captura de regex: `PRODUCT_PATTERN = /\[\[PRODUTO:([^:]+):([^:]+)(?::([^\]]+))?\]\]/g` tem os grupos 1 e 2 obrigatórios (sem `?`) e o grupo 3 opcional (`(?:...)?`, refletido corretamente em `imageUrl?: string`). Dentro do loop `while ((match = PRODUCT_PATTERN.exec(text)) !== null)`, se `match` não é `null`, os grupos 1 e 2 sempre casaram (a regex exige ambos pra dar match), mas `noUncheckedIndexedAccess` torna `match[1]`/`match[2]` em `string | undefined` mesmo assim.

**Fix aplicado:**
```ts
// antes:
mentions.push({ id: match[1], name: match[2], imageUrl: match[3] });

// depois:
mentions.push({ id: match[1]!, name: match[2]!, imageUrl: match[3] });
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (0 no programa inteiro).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `24dc11fd0`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 327 → 325 (249 arquivos), travado via `--update`.

## QuickTestLogin.tsx (etapa 17)

**Arquivo:** `src/components/auth/QuickTestLogin.tsx`

**Erros originais (2×):** TS2322 (linhas 165 e 186) — `checkIntegrity` (`(attempt?: number) => Promise<void>`) e `runSeed` (`(silent?: boolean) => Promise<boolean>`) passados diretamente como `onClick`, incompatíveis com `MouseEventHandler<HTMLButtonElement>`.

**Diagnóstico:** bug real de comportamento, não só de tipagem — como `onClick={checkIntegrity}`/`onClick={runSeed}` passam a função direto, o React invoca com o `MouseEvent` do clique como primeiro argumento. Em `checkIntegrity(attempt = 0)`, o clique manual no botão de refresh passaria o `MouseEvent` como `attempt`, quebrando o backoff (`attempt < 2`) caso o check falhe nesse clique. Em `runSeed(silent = false)`, o clique no botão "Corrigir Agora" passaria o `MouseEvent` como `silent` — como um objeto é sempre truthy, `if (!silent)` nunca é verdadeiro nesse fluxo, então o toast de sucesso ("Seed realizado com sucesso!") **nunca aparecia** ao clicar manualmente em "Corrigir Agora", mesmo quando o seed funcionava — silenciando indevidamente o feedback pro usuário.

**Fix aplicado:**
```tsx
// antes:
onClick={checkIntegrity}
...
onClick={runSeed}

// depois:
onClick={() => checkIntegrity()}
...
onClick={() => runSeed()}
```
Preserva os valores default dos parâmetros (`attempt = 0`, `silent = false`) independente do evento de clique, corrigindo tanto o erro de tipo quanto o bug real de feedback ausente.

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (2 no programa inteiro, pré-existentes/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `582cafbc0`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 325 → 323 (248 arquivos), travado via `--update`.

## EnrichedOrdersTimeline.tsx (etapa 17)

**Arquivo:** `src/components/bi/EnrichedOrdersTimeline.tsx`

**Erros originais (2×):** TS2532 (linhas 38 e 39) — `sparkData[0].value` e `sparkData[sparkData.length - 1].value`.

**Diagnóstico:** mesmo padrão de guarda não-propagada: `if (sparkData.length < 2) return "stable";` garante, no restante da função, que `sparkData` tem pelo menos 2 elementos — logo `sparkData[0]` e `sparkData[sparkData.length - 1]` são sempre seguros. TS não propaga a garantia do early-return pra essas 2 indexações.

**Fix aplicado:**
```ts
// antes:
const first = sparkData[0].value;
const last = sparkData[sparkData.length - 1].value;

// depois:
const first = sparkData[0]!.value;
const last = sparkData[sparkData.length - 1]!.value;
```

**Validação:**
- `tscheck-files.mjs`: 2 → 0 erros (2 no programa inteiro, pré-existentes/fora de escopo).
- `check-eslint-baseline.mjs`: 0 regressões (referência `origin/main` em `09edea12a`).
- Nenhum teste dedicado encontrado.
- `typecheck:baseline`: 323 → 321 (247 arquivos), travado via `--update`.
