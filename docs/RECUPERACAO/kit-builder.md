# Persistência do Kit Builder — anexo do ledger de recuperação

Índice e regra em [`README.md`](README.md).

## Veredito 23/11/2026 — 13 lacunas fechadas

Levantamento refeito contra o `main` (`aac38a48f` + esta PR). Nenhuma lacuna
deste documento continua aberta no caminho automático; duas das treze eram
consequência direta de outra (sem CAS, o item 3 e o 10 são a mesma causa), o
item 9 só foi corrigido nesta PR e os itens 3 e 10 guardam a nuance do
salvamento manual, abaixo da tabela.

Onde a evidência é um símbolo (`flushPending`, `isEnabled`…), o número da linha
fica junto do arquivo só quando ele é estável: âncora por nome não envelhece a
cada edição.

| # | lacuna | veredito | evidência no código |
| --- | --- | --- | --- |
| 1 | Baseline assíncrona (adoptBaseline) | fechada antes | `useKitAutoSave.ts` — `isReady` + `hasReadyBaselineRef` |
| 2 | Autosave e manual sem fila/alvo | fechada antes | `useKitAutoSave.ts` — `saveQueueRef`, `pendingSavesRef`, `flushPending` + `KitBuilderPage.tsx` — `handleSaveKit` (retrato → `flushAutoSave` → grava → `syncPersistedVersion`) |
| 3 | CAS por `updated_at` | fechada no autosave — ver nuance | `useKitAutoSave.ts:100,148` (`KitConflitoDeEdicao`, `updateWithOptimisticLock`) |
| 4 | Salvamento manual fora da fila | fechada antes | `KitBuilderPage.tsx:347-371` — `handleSaveKit` (retrato → `flushAutoSave` → grava → `syncPersistedVersion`) |
| 5 | Baseline quando o kit termina de carregar | fechada antes | `useKitAutoSave.ts` — `isReady`/`hasReadyBaselineRef` + `KitBuilderPage.tsx:221` (`isHydrated`) |
| 6 | `isDirty` exposto + guarda de saída | fechada nesta PR | `useKitAutoSave.ts:29` (tipo) e retorno do hook + `KitBuilderPage.tsx:447-454` |
| 7 | Atualizar template zera categoria e reativa desativado | fechada antes | `useTemplateSnapshot.ts:55-58` (`is_active` fora do UPDATE; categoria só se pedida) |
| 8 | Template sobrescrito com 'Geral'/`is_active=true` | fechada antes — mesma causa do 7 | `useTemplateSnapshot.ts:56` |
| 9 | Modo template gravando em `custom_kits` | fechada nesta PR | `useKitAutoSave.ts:230,257-258,351,490` (`isEnabled`) + `KitBuilderPage.tsx:164,211` (`emEdicaoDeTemplate`) |
| 10 | Edição em outra aba sobrescrita em silêncio | fechada no autosave — ver nuance | `useKitAutoSave.ts:148` |
| 11 | Kit recém-carregado regravado sem edição | fechada antes | `useKitAutoSave.ts` — `loadedUpdatedAt`, `knownUpdatedAtRef` + `KitBuilderPage.tsx:221` |
| 12 | Autosave e manual sem fila (duplicata do 2) | fechada antes | `useKitAutoSave.ts` — `saveQueueRef`, `pendingSavesRef`, `flushPending` |
| 13 | Autosave não ligado à guarda de saída | fechada nesta PR | `KitBuilderPage.tsx:447-454,489` + `useKitAutoSave.ts:29` |

Regressões cobertas por teste: modo template não grava em `custom_kits`,
leitura do template não conta como edição pendente, edição no template marca
pendente e gravação concluída limpa o pendente
(`tests/hooks/useKitAutoSave.test.tsx`); saída por dentro do app só navega
depois da confirmação e a rota fica declarada como suja
(`tests/pages/kit-builder-guarda-saida.test.tsx`).

**Nuance dos itens 3 e 10: o CAS existe no caminho automático.** O salvamento
manual (`src/hooks/useCustomKitPersistence.ts:45-62`) atualiza por `id` +
`user_id`, sem comparar `updated_at`: duas abas que clicarem em "Salvar" ao
mesmo tempo (ou dois cliques manuais depois de um autosave de outra aba)
seguem com último-escreve-vence. É o mesmo mecanismo do item 3, ou seja, é o
único furo conhecido desta família de lacunas — fechado só no autosave.

**Revisão da PR (23/11/2026) — o que passou a ficar coberto:**

- saída por dentro do app pergunta antes de descartar: o botão "Biblioteca" sai
  por `guardNavigation` e a rota é declarada suja para o voltar global
  (`KitBuilderPage.tsx:447-454` + `:489`);
- vendedor que abre `?template=` (widget de kits semelhantes) usa o template
  como base do kit dele: autosave pessoal ligado e "Salvar" grava na biblioteca
  em vez de tentar atualizar a linha do sistema, o que o RLS recusava
  (`KitBuilderPage.tsx:164,211,331-346`);
- "Atualizar template" avisa o autosave do que foi gravado
  (`KitBuilderPage.tsx:331-346` → `syncPersistedVersion`), então a tela não
  segue marcada como pendente depois de salvar com sucesso; e no modo template
  esse aviso não reagenda gravação (`useKitAutoSave.ts:489-495`);
- troca de `?template=` sem desmontar a página volta a contar a leitura como
  leitura (`KitBuilderPage.tsx:192-194,283-290`).

- escolher um kit semelhante com um kit pessoal aberto desfaz o vínculo com
  ele: a composição do template deixa de ser gravada por cima do kit do
  vendedor e o próximo autosave cria linha nova (`KitBuilderPage.tsx:308-318` →
  `useKitAutoSave.ts:506-519`, coberto em `tests/hooks/useKitAutoSave.test.tsx`);
- a troca de template grava o pendente antes de substituir a composição, senão
  o "Sair e gravar" do aviso prometia uma gravação que o desmonte não faria
  (não há desmonte): `gravarPendente` (`KitBuilderPage.tsx` `trocarDeTemplate`),
  falha na gravação segura o vendedor na composição e uma gravação já em voo
  não é repetida;
- gravação que responde depois da troca de escopo não readota a linha antiga
  (`saveToDb` confere a geração depois do `persistAutoSave`), então a edição
  seguinte cria linha nova em vez de sobrescrever o kit anterior;
- clicar num kit semelhante passa pela guarda da página em vez de navegar
  direto, então troca de template com edição pendente pergunta antes
  (`KitBuilderPage.tsx:607` → `SimilarKitsWidget.tsx:51`,
  `tests/components/SimilarKitsWidget.test.tsx`);
- o diálogo de saída diz o que a saída faz com o trabalho e age como disse:
  "Sair sem salvar" quando o pendente não será gravado (template, erro de
  gravação ou conflito — nesses casos confirmar descarta, sem repetir a
  gravação que já falhou) e "Sair e gravar" no kit pessoal
  (`src/lib/kit-builder/saida-da-tela.ts`, `UnsavedChangesDialog.tsx:26`,
  coberto em `tests/lib/saida-da-tela.test.ts` e
  `tests/components/UnsavedChangesDialog.test.tsx`). A política é lida na
  confirmação (`saidaAtualRef`), não no clique: o rótulo pode mudar com o aviso
  aberto e a ação tem que acompanhar.

O documento abaixo fica como registro do diagnóstico original (estado da PR
#119) e não como lista de pendências.

## Persistência do Kit Builder: 13 lacunas confirmadas contra a PR #119

| lacuna | impacto |
|---|---|
| Não existe adoção de baseline assíncrona com geração esperada (adoptBaseline) | Abrir um kit salvo por /montar-kit?kit=ID: currentKitId já vem preenchido no mount (KitBuilderPage.tsx:148), o baseline é fixado com o kit vazio (useKitAutoSave.ts:163-168) e, quando loadCustomKit ter |
| Autosave e salvamento manual não compartilham fila nem alvo | O usuário monta um kit novo, o autosave dispara o INSERT e, antes da resposta, ele clica em 'Salvar kit'. Em KitBuilderPage.tsx:271 o editingId é `currentKitId \|\| autoSavedKitId`, ambos ainda indefi |
| CAS por updated_at (trava otimista) ao atualizar custom_kits | Duas abas (ou aba + autosave após voltar de outro kit) sobrescrevem uma à outra em silêncio: a última gravação ganha e as alterações da outra somem sem aviso. Nada na tela indica perda. |
| Salvamento manual fora da fila e do baseline do autosave | Clicar em Salvar dentro da janela de 5s dispara uma segunda gravação logo depois (duplicada). Em kit NOVO é pior: o INSERT manual e o INSERT do autosave correm em paralelo e o usuário acaba com dois k |
| Baseline adotado quando o kit termina de carregar (flag enabled) | Só abrir um kit existente já provoca uma gravação automática ~5s depois, regravando o mesmo conteúdo e mexendo em updated_at (a lista 'Meus kits', ordenada por updated_at, reordena sozinha). Com a tra |
| isDirty exposto e guarda de saída no Kit Maker | Sair do Kit Maker (fechar aba, voltar, clicar em outro menu) dentro dos 5s de debounce, ou depois de um autosave que falhou, perde as alterações sem nenhum aviso. |
| Atualizar template pelo Kit Builder zera a categoria e reativa template desativado | Dois estragos reais, em produção, num clique só (botão "Atualizar template", KitBuilderHeader.tsx:78-80, em /montar-kit?template=<id>): (1) template que o admin desativou pelo olho fechado em src/page |
| Template existente é sobrescrito com categoria 'Geral' e is_active=true | Bug vivo em produção, não só teste faltando: salvar um template do sistema a partir do builder reclassifica o template para a categoria 'Geral' e reativa um template que o admin havia desativado. O ca |
| Modo template continua gravando em custom_kits por autosave | Editar um template do sistema (?template=...) cria/atualiza kits em custom_kits do admin a cada 5s. O painel 'Meus kits' do admin enche de kits-fantasma gerados por edição de template. |
| Sem CAS por updated_at: edição em outra aba é sobrescrita em silêncio | Duas abas (ou aba + realtime) no mesmo kit: a última gravação vence e apaga as alterações da outra sem aviso. Perda de trabalho do vendedor, silenciosa. |
| Kit recém-carregado pode ser regravado sem edição do usuário | Abrir um kit salvo (sem tocar em nada) pode disparar um UPDATE em custom_kits, mexendo em updated_at e na ordenação de 'Meus kits' — e, com o payload da main, podendo reescrever status a partir de um  |
| Autosave e salvamento manual não compartilham fila nem alvo | Clicar em 'Salvar' enquanto o autosave de um kit novo está em voo pode gerar DUAS linhas em custom_kits (o manual não espera o id criado pelo autosave). E, dentro do hook, uma gravação travada bloquei |
| Autosave não está ligado a guarda de saída de página | Sair do montador com alteração ainda não gravada não gera aviso vindo do autosave; a sujeira do kit não chega a nenhuma guarda. |

#### Não existe adoção de baseline assíncrona com geração esperada (adoptBaseline)

**O que falta:** O coordinator expõe adoptBaseline(snapshot, expectedGeneration) para registrar como 'já persistido' o conteúdo que acabou de ser carregado do banco, recusando a adoção se o escopo já mudou. A main só define o baseline de forma síncrona: no primeiro render e na troca de escopo, usando o kitState daquele instante — que, ao abrir um kit por URL, ainda é o kit vazio.

**Impacto no usuário:** Abrir um kit salvo por /montar-kit?kit=ID: currentKitId já vem preenchido no mount (KitBuilderPage.tsx:148), o baseline é fixado com o kit vazio (useKitAutoSave.ts:163-168) e, quando loadCustomKit termina de carregar (KitBuilderPage.tsx:219-221), o snapshot passa a diferir do baseline (useKitAutoSave.ts:171-177) e o autosave regrava no banco, 5s depois, exatamente o que acabou de ler. Efeitos visíveis: updated_at do kit muda sem o usuário ter editado nada (reordena a lista de kits, ordenada por updated_at em useCustomKitPersistence.ts:83), aparece 'salvo automaticamente' sem edição, e se outra aba tiver alterado o kit entre a leitura e esse write-back o conteúdo lido antigo é reescrito por cima.

**Na PR #119:** src/lib/kit-builder/persistence-coordinator.ts:58-62 `adoptBaseline(snapshot, expectedGeneration = this.generation) { if (expectedGeneration !== this.generation) return false; this.persistedSnapshot = snapshot; return true; }`. Teste: src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:106-115 (adoção recusada para a geração antiga, aceita na ativa).

**Na `main`:** src/hooks/useKitAutoSave.ts:103 (persistedSnapshotRef) só recebe valor em três pontos, todos síncronos: :166 (primeiro render, com o kitState vazio), :214 (troca de escopo) e :140 (após gravar). Não há API para o carregamento assíncrono informar o baseline; o carregamento vive fora do hook, em src/pages/KitBuilderPage.tsx:219-221.

<details><summary>Refutação tentada</summary>

Confirmei a lacuna lendo os dois lados; não consegui derrubá-la.

MAIN (f2db0f8d0) — não há equivalente:
- `git grep -nE "adoptBaseline|persistence-coordinator|markPersisted|baselineSnapshot" origin/main -- src tests e2e` só casa `baselineSnapshot` em e2e/flows/14-favorites-remove-persistence.spec.ts:255 (favoritos, fluxo distinto). Não existe src/lib/kit-builder/persistence-coordinator.ts na main.
- src/hooks/useKitAutoSave.ts:103 (persistedSnapshotRef) recebe valor em três pontos, todos síncronos: :166 (primeiro render), :214 (troca de escopo) e :140 (após gravar). Não há API para o carregamento assíncrono informar o baseline.
- O carregamento vive fora do hook: src/pages/KitBuilderPage.tsx:218-222 dispara `void loadCustomKit(...)`, que só chama `loadKit(customKitPayload(data))` após o round-trip (KitBuilderPage.tsx:123-125).

O fluxo existe e dispara write-back:
- currentKitId já nasce preenchido no mount (KitBuilderPage.tsx:148), logo kitIdRef.current já é o ID (useKitAutoSave.ts:105) e scopeRef já é `uid:ID` (:106). A rota é lazy (src/routes/config/tools.ts:25-28) e o AuthContext seta o user no getSession do localStorage (src/contexts/AuthContext.tsx:180,277-280), então o escopo não muda após o mount e o efeito de :187-216 sai no early-return de :189 — nenhum reset de baseline.
- Quando loadKit chega, :171-177 detecta newSnapshot !== persistedSnapshotRef.current e agenda saveToDb em 5s (AUTO_SAVE_DELAY_MS, :15). O guard isEmptyKit (:67-69 usado em :123) não protege (kit carregado tem caixa/itens). Cai em persistAutoSave com kitId → UPDATE custom_kits (:76-85).

Dano real verificado:
- buildCustomKitPayload grava `updated_at: new Date().toISOString()` (src/lib/kit-builder/custom-kit-payload.ts:62) e a lista é ordenada por esse campo (src/hooks/useCustomKitPersistence.ts:83) → reordena sem edição.
- setLastSavedAt(new Date()) em useKitAutoSave.ts:141 acende "salvo automaticamente" sem edição.
- O UPDATE filtra só id+user_id (useKitAutoSave.ts:79-82), sem guarda de updated_at: não há concorrência otimista na main, então um conteúdo lido antes sobrescreve alteração feita em outra aba. A PR #119 tinha expectedUpdatedAt (src/hooks/useKitPersistenceCoordinator.ts:309).

PR #119 — a API não é código morto: persistence-coordinator.ts:58-62 é chamado em useKitPersistenceCoordinator.ts:286, na transição enabled false→true (:279-289), e enabled = persistenceReady = `!requestedResourceKey || loadedResourceKey === requestedResourceKey` (src/pages/KitBuilderPage.tsx:137,141), ou seja, amarrado ao fim do carregamento. Teste: src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:111,113. Também não há teste na main cobrindo isso (tests/hooks/useKitAutoSave.test.tsx cobre status, identidade, erro/retry, serialização e adoção de ID recém-criado — nada sobre carregamento).

NÃO VERIFICADO: não executei o fluxo em runtime (sem teste rodado nem navegador). A conclusão vem da leitura do código e da ordem de resolução getSession (localStorage) vs. select HTTP do kit; num ambiente em que o user resolvesse depois do carregamento, o efeito de :187-216 mascararia o write-back por acaso — sorte de timing, não cobertura.

</details>

#### Autosave e salvamento manual não compartilham fila nem alvo

**O que falta:** O coordinator serializa qualquer intenção de gravação (automática ou manual) na mesma fila e no mesmo targetId, de modo que o salvamento manual enfileirado atrás de um INSERT de autosave recebe o id criado e vira UPDATE. Na main os dois caminhos são módulos independentes, sem fila e sem alvo comum.

**Impacto no usuário:** O usuário monta um kit novo, o autosave dispara o INSERT e, antes da resposta, ele clica em 'Salvar kit'. Em KitBuilderPage.tsx:271 o editingId é `currentKitId || autoSavedKitId`, ambos ainda indefinidos porque o INSERT não respondeu, então useCustomKitPersistence.ts:61 faz um segundo INSERT: dois kits idênticos na lista do usuário, e as edições seguintes atualizam só um deles. Mesmo problema no caminho de compartilhar (KitPresentablePreview.tsx:22 chama saveKit sem id quando currentKitId está vazio).

**Na PR #119:** src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:17-38 — 'serializa autosave e salvamento manual no mesmo alvo': o manual não executa enquanto o automático está pendente (:29) e, ao executar, recebe o id criado (`expect(manualExecute).toHaveBeenCalledWith('kit-1')`, :35). Mecanismo em src/lib/kit-builder/persistence-coordinator.ts:66-67 e :72/:77; o hook que liga as duas intenções é src/hooks/useKitPersistenceCoordinator.ts:16-19.

**Na `main`:** Caminhos separados: autosave em src/hooks/useKitAutoSave.ts:119-159 (fila própria, :108) e manual em src/hooks/useCustomKitPersistence.ts:93-110 / :132-136 (react-query mutation, sem fila nem alvo compartilhado); o único acoplamento é o id resolvido no componente, src/pages/KitBuilderPage.tsx:271 `const editingId = currentKitId || autoSavedKitId || undefined;`.

<details><summary>Refutação tentada</summary>

Tentei derrubar por quatro vias (outro caminho na main, fluxo inexistente, evidência errada, PR pior) e nenhuma se sustentou.

LADO PR #119 (confirmado, não é alegação vazia): `src/lib/kit-builder/persistence-coordinator.ts:64-90` tem uma fila única por geração — `persistence-coordinator.ts:66` pega a cauda da fila da geração corrente e `:72` executa `input.execute(this.targetId)` só depois dela, `:77` adota o id devolvido (`if (input.adoptTarget !== false && result.targetId) this.targetId = result.targetId`). O teste citado existe e bate: `src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:17-38`, com `expect(manualExecute).not.toHaveBeenCalled()` em `:29` e `expect(manualExecute).toHaveBeenCalledWith('kit-1')` em `:35`. As duas intenções entram na MESMA fila pelo mesmo hook: `src/hooks/useKitPersistenceCoordinator.ts:301` (automático, disparado em `:350`) e `:357-361` (`saveNow` → `runPersistence('manual', ...)`), ambos via `coordinatorRef.current.enqueue`.

LADO MAIN (confirmado que falta): são dois módulos sem nada em comum. O autosave tem fila própria e só dele — `src/hooks/useKitAutoSave.ts:108` (`saveQueueRef`), `:129-135` (`await previousSave`) e `:137` (`persistAutoSave(payload, kitIdRef.current, ...)`), com `kitIdRef` interno ao hook (`:105`) e exposto só depois da resposta, via `adoptCreatedId` em `:112-117`. O manual é uma mutation react-query sem fila: `src/hooks/useCustomKitPersistence.ts:93-102` → `persistCustomKit` em `:45-64`, onde `:50 if (kitId)` decide UPDATE e `:61` faz `insert` quando `kitId` é undefined. O único acoplamento é no componente: `src/pages/KitBuilderPage.tsx:271` `const editingId = currentKitId || autoSavedKitId || undefined;` — `autoSavedKitId` é state setado só em `useKitAutoSave.ts:115`, ou seja, depois que o INSERT responde. Busquei cobertura por outro caminho e não há: `git grep -niE "persistencecoordinator|persistence-coordinator|saveQueue|enqueue" origin/main -- src` só retorna o `saveQueueRef` do próprio `useKitAutoSave.ts:108`; não há constraint de banco que impeça o kit duplicado (a única UNIQUE sobre `custom_kits` na main é `idx_custom_kits_one_pinned_per_user`, `supabase/migrations/20261118130400_pin_custom_kit_atomically.sql:56`); e os testes da main cobrem apenas concorrência interna do autosave (`tests/hooks/useKitAutoSave.test.tsx:135` e `:165`), nenhum com salvamento manual.

JANELA REAL (tentei refutar por aqui e falhou): o botão Salvar NÃO é bloqueado durante o autosave — `src/components/kit-builder/KitBuilderHeader.tsx:88` usa `disabled={props.isSaving || !props.hasContent}`, onde `isSaving` é só a mutation manual (`KitBuilderPage.tsx:164`), enquanto o autosave em voo aparece apenas como badge "Salvando…" (`KitBuilderHeader.tsx:54`, alimentado por `isAutoSaving` em `KitBuilderPage.tsx:338`). Logo o clique durante o INSERT pendente é possível e produz um segundo INSERT. Mesmo buraco no compartilhar: `src/components/kit-builder/KitPresentablePreview.tsx:43` `let kitId = currentKitId;` e `:46` `await saveKit(kitState, kitQuantity)` sem id (o id vem de `resolvedKitId`, `KitBuilderPage.tsx:328`/`:426`).

CORREÇÕES NA EVIDÊNCIA DO OUTRO AGENTE (não mudam o veredito): (a) a citação `KitPresentablePreview.tsx:22` está errada — linha 22 é o fim da interface de props; a chamada sem id está em `:46`; (b) `useCustomKitPersistence.ts:61` é o `insert` dentro do helper `persistCustomKit`, e não "linha 61 faz um segundo INSERT" a partir do hook — o caminho é `:101` → `:50` → `:61`; (c) existe mitigação PARCIAL que ele não citou: `KitBuilderPage.tsx:249-263` (`confirmNewKitSave`) consulta o banco (`src/hooks/useDuplicateKitDetector.ts:73-78`) e avisa de kit similar — mas só com 2+ itens (`:250`), só se o INSERT do autosave já tiver committado, e o default de auto-close/dismiss é salvar assim mesmo (`:259-260`). Portanto atenua, não impede.

Dano real: duas linhas idênticas em `custom_kits` para o mesmo usuário, e as edições seguintes atualizam só uma delas (o pai adota um id, `useKitAutoSave.ts:116` → `KitBuilderPage.tsx:170`, enquanto o outro kit fica órfão na lista). A lacuna existe e é a descrita.

</details>

#### CAS por updated_at (trava otimista) ao atualizar custom_kits

**O que falta:** A PR #119 envia o UPDATE com filtro .eq('updated_at', expectedUpdatedAt), gera um updated_at novo estritamente maior, guarda a versão retornada em ref e falha com mensagem explícita quando nenhuma linha casa. A main atualiza filtrando só id + user_id, sem versão, e nem lê updated_at de volta.

**Impacto no usuário:** Duas abas (ou aba + autosave após voltar de outro kit) sobrescrevem uma à outra em silêncio: a última gravação ganha e as alterações da outra somem sem aviso. Nada na tela indica perda.

**Na PR #119:** src/hooks/useKitPersistenceCoordinator.ts:81-99 (exige expectedUpdatedAt, .eq('updated_at', expectedUpdatedAt), erro 'Este kit foi alterado em outra aba...'), :252,:266,:309-312 (expectedUpdatedAtRef atualizado a cada gravação); teste em src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:159-197 e :286-305

**Na `main`:** src/hooks/useKitAutoSave.ts:77-85 (update .eq('id').eq('user_id').select('id') — sem updated_at) e src/hooks/useCustomKitPersistence.ts:50-60 (idem no salvamento manual); nenhum uso de expectedUpdatedAt em src/hooks nem em src/pages/KitBuilderPage.tsx

<details><summary>Refutação tentada</summary>

Confirmei a lacuna lendo os dois lados e o banco ao vivo. MAIN: src/hooks/useKitAutoSave.ts:77-85 faz update(payload).eq('id').eq('user_id').select('id').maybeSingle() — sem filtro de versão e sem reler updated_at; src/hooks/useCustomKitPersistence.ts:51-60 idem no salvamento manual; src/lib/kit-builder/custom-kit-payload.ts:62 grava updated_at do relógio do cliente sem comparar com a linha. git grep expectedUpdatedAt em origin/main só retorna src/hooks/orders/extensions/useOrderPayments.ts:29,74,91,95 (pagamentos via RPC) — o padrão existe no repo mas não em custom_kits. PR #119: src/hooks/useKitPersistenceCoordinator.ts:81-99 exige expectedUpdatedAt, gera updated_at estritamente maior (:85-86), filtra .eq('updated_at', expectedUpdatedAt) (:93), relê select('id, updated_at') (:94) e falha com 'Este kit foi alterado em outra aba...' (:96); :252,:266,:309-312 atualizam expectedUpdatedAtRef; testes em src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx cobrem a lista de filtros e o erro de versão; a PR aplicava CAS também no manual (refs/verif/pr119:src/hooks/useCustomKitPersistence.ts:59-78,118-132). NENHUM caminho alternativo cobre: useCustomKitsRealtime.ts:15-37 só invalida a query de lista; KitBuilderPage.tsx carrega o kit uma vez (hasLoadedRef, efeito com loadCustomKit) e usa useKitAutoSave (:22,:169-171) e saveKit (:273), logo o fluxo existe; useKitCollaboration.ts é colaborador/comentário, sem lock; no projeto oficial cfmzkthhgliqelozlmwu os únicos triggers de public.custom_kits são trg_owner__custom_kits__user_id (BEFORE INSERT) e trg_validate_kit_status (BEFORE INSERT/UPDATE), nenhum toca updated_at nem versão, e a policy de UPDATE (sicoob_merged_539e08070cdd273f_update) checa só posse/admin. Ressalva (impacto menor que o alegado): o sub-cenário 'autosave após voltar de outro kit' JÁ está tratado na main por scopeGenerationRef (useKitAutoSave.ts:127,136,187-216, testes tests/hooks/useKitAutoSave.test.tsx:135,165). Permanece real e sem aviso o caso de duas abas/dispositivos com o mesmo kit aberto: sem filtro de updated_at o UPDATE sempre casa, então a última gravação sobrescreve a outra em silêncio (o tratamento de zero linhas em useKitAutoSave.ts:84 só dispara por permissão/linha ausente). Não achei defeito que tornasse a solução da PR pior: como não há trigger de updated_at na tabela, o updated_at monotônico do cliente é aceito e a versão é relida do banco.

</details>

#### Salvamento manual fora da fila e do baseline do autosave

**O que falta:** Na PR #119 saveNow cancela o timer de debounce e entra na MESMA fila/baseline do autosave. Na main o Salvar manual usa outra mutation (useCustomKitPersistence), que não cancela o timer do useKitAutoSave nem atualiza o persistedSnapshotRef dele; o hook de autosave sequer expõe API para isso.

**Impacto no usuário:** Clicar em Salvar dentro da janela de 5s dispara uma segunda gravação logo depois (duplicada). Em kit NOVO é pior: o INSERT manual e o INSERT do autosave correm em paralelo e o usuário acaba com dois kits iguais na lista.

**Na PR #119:** src/hooks/useKitPersistenceCoordinator.ts:357-361 (saveNow limpa timerRef e chama runPersistence) + :291-342 (mesma fila coordinatorRef.enqueue para manual e automático) + persistence-coordinator.ts:64-90,78

**Na `main`:** src/pages/KitBuilderPage.tsx:164,265-276 (handleSaveKit → saveKit do useCustomKitPersistence) vs src/hooks/useKitAutoSave.ts:102,108,176-181,224 (timerRef, saveQueueRef e persistedSnapshotRef privados; o retorno expõe só lastSavedAt/isSaving/autoSavedKitId/lastSaveError/retry) e src/hooks/useCustomKitPersistence.ts:93-110 (mutation independente)

<details><summary>Refutação tentada</summary>

CONFIRMADA (com um exagero corrigido). A main realmente tem a lacuna: o Salvar manual passa por outra mutation, fora do autosave — src/pages/KitBuilderPage.tsx:265-276 (handleSaveKit → saveKit) → src/hooks/useCustomKitPersistence.ts:132-136 → saveMutation :93-110 → persistCustomKit :45-64 (INSERT puro em :61 quando não há kitId). E o hook de autosave não expõe nada para o manual: src/hooks/useKitAutoSave.ts:224 retorna só {lastSavedAt, isSaving, autoSavedKitId, lastSaveError, retry}; timerRef (:102), persistedSnapshotRef (:103) e saveQueueRef (:108) são privados, e a fila de :129-135 serializa apenas o autosave consigo mesmo; o timer de 5s é armado em :176-177. A PR #119 de fato coordena: src/hooks/useKitPersistenceCoordinator.ts:357-361 (saveNow limpa timerRef e chama runPersistence('manual')) + :291-342 (mesmo coordinatorRef.enqueue para manual e automático) + src/lib/kit-builder/persistence-coordinator.ts:64-80 (serialização; adoção de targetId/baseline em :77-78), e a página da PR usa isso (refs/verif/pr119:src/pages/KitBuilderPage.tsx:138,262). Nenhum outro caminho cobre na main: não existe índice único em custom_kits contra kit duplicado (o único UNIQUE é idx_custom_kits_one_pinned_per_user, supabase/migrations/20261118130400_pin_custom_kit_atomically.sql:56); useCustomKitsRealtime só invalida a query (src/hooks/useCustomKitsRealtime.ts:28-30); confirmNewKitSave (KitBuilderPage.tsx:249-263) é heurística de SKU com confirmação do usuário; e o botão Salvar não é bloqueado pelo autosave em voo (src/components/kit-builder/KitBuilderHeader.tsx:88 desabilita por props.isSaving, que KitBuilderPage.tsx:338 liga ao isSaving do useCustomKitPersistence, não ao isAutoSaving) — logo a corrida vale nos dois sentidos e produz dois INSERTs, ou seja, dois kits iguais na lista. CORREÇÕES à afirmação: (1) "não cancela o timer nem atualiza o persistedSnapshotRef" é falso no kit NOVO — quando o INSERT manual retorna, KitBuilderPage.tsx:274 chama setCurrentKitId, o que muda o escopo e dispara useKitAutoSave.ts:187-216, limpando o timerRef em :207 e reescrevendo persistedSnapshotRef em :214; a main mitiga, só que depois do round-trip, não no clique, então a janela de corrida continua aberta; (2) no kit EXISTENTE o impacto está superestimado: as duas rotas montam o mesmo payload (useKitAutoSave.ts:125 e useCustomKitPersistence.ts:101, ambas buildCustomKitPayload), então a "segunda gravação" é um UPDATE redundante idêntico na mesma linha, sem perda de dado nem divergência. Dano real comprovado: apenas o kit duplicado no fluxo de kit novo.

</details>

#### Baseline adotado quando o kit termina de carregar (flag enabled)

**O que falta:** A PR #119 recebe enabled=persistenceReady e, na transição para pronto, adota o conteúdo carregado como baseline sem marcar sujo nem gravar. A main não tem esse conceito: o kit carregado por loadCustomKit chega depois do primeiro render e é tratado como edição do usuário.

**Impacto no usuário:** Só abrir um kit existente já provoca uma gravação automática ~5s depois, regravando o mesmo conteúdo e mexendo em updated_at (a lista 'Meus kits', ordenada por updated_at, reordena sozinha). Com a trava otimista ausente, essa gravação espúria também é uma chance a mais de sobrescrever outra aba.

**Na PR #119:** src/hooks/useKitPersistenceCoordinator.ts:32,279-289 (adoptBaseline na virada de enabled) + src/pages/KitBuilderPage.tsx:137-147 (persistenceReady) ; testes useKitPersistenceCoordinator.test.tsx:109-130 e :132-157 (A→B→A sem nenhuma gravação)

**Na `main`:** src/pages/KitBuilderPage.tsx:169-171 (nenhum parâmetro de prontidão) + :218-222 (loadCustomKit assíncrono, depois do primeiro render) vs src/hooks/useKitAutoSave.ts:110,162-182 (baseline só no primeiro render; qualquer mudança posterior agenda gravação) e :187-189 (o efeito de escopo não reavalia porque kitIdParam já era o escopo inicial)

<details><summary>Refutação tentada</summary>

NÃO REFUTADA — tentei quatro caminhos de derrubada e todos confirmaram a lacuna.

1) PR #119 (refs/verif/pr119) tem mesmo o conceito: `enabled?: boolean` em src/hooks/useKitPersistenceCoordinator.ts:32, consumido no efeito de autosave em :346 (`if (!enabled || ...) return;`) e, na virada para pronto, o efeito :279-289 chama `coordinator.adoptBaseline(latestSerializedRef.current, generation)` (implementação em src/lib/kit-builder/persistence-coordinator.ts:58-62 — só troca `persistedSnapshot`, não grava). A página passa `enabled: persistenceReady` com `persistenceReady = !requestedResourceKey || loadedResourceKey === requestedResourceKey` (src/pages/KitBuilderPage.tsx:137 e :141-148 do ref da PR). Os testes citados existem e batem: src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:109-130 ("adota o conteúdo carregado como baseline sem disparar autosave", `expect(mocks.from).not.toHaveBeenCalled()`) e :132-157 (A→B→A, idem).

2) A main não tem nada equivalente, nem por outro caminho. src/pages/KitBuilderPage.tsx:169-171 chama `useKitAutoSave(kitState, kitQuantity, currentKitId, ...)` sem qualquer parâmetro de prontidão, e o kit só chega depois do primeiro render pelo efeito assíncrono :218-222 (`void loadCustomKit(...)`). No hook, o baseline é fixado uma única vez no primeiro render (src/hooks/useKitAutoSave.ts:162-168) e qualquer mudança posterior agenda gravação em 5s (:171-177).

3) O escape que eu procurava — o efeito de escopo re-fixar o baseline (src/hooks/useKitAutoSave.ts:187-216) — não ocorre. O escopo é `${user?.id ?? 'anon'}:${currentKitId ?? 'new'}` (:106, :188) e retorna cedo quando não muda (:189). `currentKitId` já nasce com `kitIdParam` (src/pages/KitBuilderPage.tsx:148) e `user?.id` já está resolvido no mount, porque a rota /montar-kit (src/routes/config/tools.ts:24-27) fica sob `<Route element={<ProtectedRoute />}>` (src/App.tsx:99), e o ProtectedRoute só renderiza o filho depois de `isLoading`/`rolesLoaded` e com `user` presente (src/components/layout/ProtectedRoute.tsx:57-65). Ou seja: escopo estável → baseline vazio preservado → `saveToDb` roda com `user.id` já disponível (useKitAutoSave.ts:119-123) e faz UPDATE na linha existente (:77-86).

4) O dano também se confirma, e não é pré-existente. O payload do autosave grava `updated_at: new Date().toISOString()` explicitamente (src/lib/kit-builder/custom-kit-payload.ts:62), e a lista "Meus kits" ordena por esse campo (src/pages/KitLibraryPage.tsx:306-308, `.order('updated_at', { ascending: false })`). Testei a hipótese de que o `bumpLastUsed` do próprio carregamento já reordenaria a lista de qualquer jeito: não — ele só escreve `last_used_at` (src/hooks/useCustomKitPersistence.ts:144-156) e não há trigger de `updated_at` em `public.custom_kits` no projeto oficial cfmzkthhgliqelozlmwu (consulta read-only de triggers: só `trg_owner__custom_kits__user_id` BEFORE INSERT e `trg_validate_kit_status` BEFORE INSERT/UPDATE). Logo, quem bagunça a ordenação ao simplesmente abrir um kit é exatamente essa gravação espúria.

Também não há teste na main cobrindo isso: tests/hooks/useKitAutoSave.test.tsx tem 6 casos (linhas 50, 68, 100, 120, 135, 165) e nenhum trata de baseline pós-carregamento.

Verificação de integridade das evidências: todos os arquivos da main que li na árvore de trabalho são idênticos a origin/main (`git diff --quiet origin/main -- <arquivo>` sem diferença para ProtectedRoute.tsx, KitLibraryPage.tsx, useCustomKitPersistence.ts, AuthContext.tsx, tools.ts, KitBuilderPage.tsx e custom-kit-payload.ts).

Ressalva (NÃO VERIFICADO em runtime): não executei o fluxo no navegador nem escrevi teste novo — a conclusão vem de leitura do código e da checagem de triggers no banco. A sequência de efeitos é determinística pelo que está escrito, mas não há prova de execução.

</details>

#### isDirty exposto e guarda de saída no Kit Maker

**O que falta:** A PR #119 expõe isDirty e a página registra useDirtyGuard('kit-builder', ...) num store central de navegação (useDirtyGuard.ts + useNavigationGuardStore.ts). Na main nenhum dos dois arquivos existe, o useKitAutoSave não expõe isDirty e a única guarda disponível (useUnsavedChangesGuard) está ligada apenas ao QuoteBuilder.

**Impacto no usuário:** Sair do Kit Maker (fechar aba, voltar, clicar em outro menu) dentro dos 5s de debounce, ou depois de um autosave que falhou, perde as alterações sem nenhum aviso.

**Na PR #119:** src/hooks/useKitPersistenceCoordinator.ts:407 (isDirty no retorno) + src/pages/KitBuilderPage.tsx:317-321 (useDirtyGuard) + src/hooks/useDirtyGuard.ts:1-12 + src/stores/useNavigationGuardStore.ts:29-58; teste useKitPersistenceCoordinator.test.tsx:60-68,96-106 (hasDirty acompanha o estado)

**Na `main`:** src/hooks/useKitAutoSave.ts:224 (retorno sem isDirty); src/hooks/useDirtyGuard.ts e src/stores/useNavigationGuardStore.ts inexistentes em origin/main (git cat-file -e falha); src/hooks/useUnsavedChangesGuard.ts:15-34 usado só em src/pages/QuoteBuilderPage.tsx:133 — nenhuma ocorrência em src/pages/KitBuilderPage.tsx

<details><summary>Refutação tentada</summary>

Lacuna confirmada lendo os dois lados; não consegui derrubá-la. MAIN: src/hooks/useKitAutoSave.ts:17-23 (interface AutoSaveResult) e :224 retornam {lastSavedAt, isSaving, autoSavedKitId, lastSaveError, retry} — sem isDirty; o estado sujo fica só em refs internos (:103-104). src/hooks/useDirtyGuard.ts e src/stores/useNavigationGuardStore.ts não existem (git cat-file -e origin/main:<path> falha nos dois; git ls-tree origin/main -- src/stores lista apenas oracleVoiceBridge, useComparisonStore, useConfirmDialogStore, useFavoritesStore, useNavigationStore, useRecentlyViewedStore). A única guarda é src/hooks/useUnsavedChangesGuard.ts:23-34 (beforeunload) + :37-47, único arquivo de src/ com beforeunload na main, usado só em src/pages/QuoteBuilderPage.tsx:133,135 — nenhuma ocorrência em src/pages/KitBuilderPage.tsx. Nenhum caminho alternativo: src/hooks/useSmartNavigation.ts:23,32,35 só emite telemetria (trackUx 'guard.shown'/'guard.cancel'/'guard.confirm') sem bloquear; src/stores/useNavigationStore.ts não tem dirty/unsaved/guard; banco/RLS não ajuda porque o dado perdido nunca chega lá. Fluxo ativo e vulnerável: src/routes/config/tools.ts:26 registra /montar-kit; src/pages/KitBuilderPage.tsx:22,169 usa useKitAutoSave com debounce de 5s (useKitAutoSave.ts:15 AUTO_SAVE_DELAY_MS=5000, :177 setTimeout); o estado é só memória React (src/hooks/useKitBuilder.ts:7 useState) e não há rascunho local — o único localStorage do módulo é a flag do tour (src/components/kit-builder/KitOnboardingTour.tsx:25). PR #119: src/hooks/useKitPersistenceCoordinator.ts:407 expõe isDirty; src/pages/KitBuilderPage.tsx:53 e :317-321 registram useDirtyGuard('kit-builder', persistenceReady && persistence.isDirty, ...); src/hooks/useDirtyGuard.ts:5-11 alimenta src/stores/useNavigationGuardStore.ts:32-41; o bloqueio é efetivo e montado — src/routes/app-router.tsx:14,48 monta NavigationBlockerBridge, que usa useBlocker (NavigationBlockerBridge.tsx:32), beforeunload (:58-66) e UnsavedChangesDialog (:85-92). Mitigação parcial da main que não anula a lacuna: em falha de autosave há toast e erro exposto (useKitAutoSave.ts:148-151) com retry no header (KitBuilderPage.tsx:338-339) — avisa, mas não impede a saída; na janela de 5s de debounce não há aviso nenhum. Evidência citada pelo outro agente confere integralmente; a proposta da PR não é pior que a main.

</details>

#### Atualizar template pelo Kit Builder zera a categoria e reativa template desativado

**O que falta:** Na main, `persistTemplate` usa o MESMO payload no UPDATE e no INSERT: src/hooks/useTemplateSnapshot.ts:43 chama `buildTemplatePayload(input)` e o aplica tanto em `.update(payload).eq('id', input.templateId)` (:45-50) quanto em `.insert(payload)` (:54-58). Esse payload fixa `category: category || 'Geral'` (:30) e `is_active: true` (:37). Nenhum chamador passa `category`: src/components/kit-builder/KitBuilderHeader.tsx:80 chama `saveAsTemplate({ kitState, templateId: props.templateId })` e src/pages/KitBuilderPage.tsx:268 chama `saveAsTemplate({ kitState, templateId: templateIdParam })` — o campo `category?` de `SnapshotInput` (:13) é parâmetro morto. Falta a variante de update sem metadado editorial que a PR #119 tinha.

**Impacto no usuário:** Dois estragos reais, em produção, num clique só (botão "Atualizar template", KitBuilderHeader.tsx:78-80, em /montar-kit?template=<id>): (1) template que o admin desativou pelo olho fechado em src/pages/admin/KitTemplatesAdminPage.tsx:151 volta sozinho a `is_active = true` e reaparece para todos os vendedores — a listagem filtra `.eq('is_active', true)` em src/hooks/useKitTemplates.ts:43 e os similares em src/hooks/useSimilarKits.ts:54; (2) a categoria curada (ex.: "Natal", "Posse de Conselho") é trocada por 'Geral', quebrando o badge de categoria (KitTemplatesAdminPage.tsx:135) e a busca por categoria (KitTemplatesAdminPage.tsx:57). Nada avisa o admin: o toast diz só 'Template do sistema salvo!' (useTemplateSnapshot.ts:71).

**Na PR #119:** refs/verif/pr119:src/lib/kit-builder/persistence.ts:116-119 — comentário "Atualizações do builder não alteram metadados editoriais do template." e `buildKitTemplateUpdatePayload` que faz `const { category: _category, is_active: _isActive, ...payload } = buildKitTemplatePayload(snapshot)`; `buildKitTemplatePayload` (:95-114) é que traz `category: options.category || 'Geral'` (:101) e `is_active: true` (:111). Consumo: refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:115 usa `buildKitTemplateUpdatePayload(snapshot)` no `.update()` e :125 usa `buildKitTemplatePayload(snapshot)` no `.insert()`.

**Na `main`:** origin/main:src/hooks/useTemplateSnapshot.ts:26-40 (`buildTemplatePayload` com `category` :30 e `is_active: true` :37), :43-52 (mesmo payload no UPDATE); chamadores sem `category`: origin/main:src/components/kit-builder/KitBuilderHeader.tsx:80 e origin/main:src/pages/KitBuilderPage.tsx:267-268. Colunas atingidas: origin/main:src/integrations/supabase/types.ts:3948 (`category?`) e :3954 (`is_active?`).

<details><summary>Refutação tentada</summary>

CONFIRMADO lendo o código dos dois lados. Tentei refutar por quatro caminhos e todos falharam.

1) Evidência da main confere linha a linha. `origin/main:src/hooks/useTemplateSnapshot.ts:26-40` monta um payload único com `category: category || 'Geral'` (:30) e `is_active: true` (:37); `persistTemplate` (:42-61) usa ESSE MESMO objeto no `.update(payload).eq('id', input.templateId)` (:44-52) e no `.insert(payload)` (:54-58). Nenhum chamador passa `category`: `origin/main:src/components/kit-builder/KitBuilderHeader.tsx:80` (`saveAsTemplate({ kitState, templateId: props.templateId })`) e `origin/main:src/pages/KitBuilderPage.tsx:268` (`saveAsTemplate({ kitState, templateId: templateIdParam })`) — são os dois ÚNICOS consumidores (git grep de `saveAsTemplate` em `src`, `tests`, `e2e`: só `useTemplateSnapshot.ts:77`, `KitBuilderHeader.tsx:75,80` e `KitBuilderPage.tsx:165,268`). O campo `category?` em `SnapshotInput` (:13) é de fato parâmetro morto.

2) Nenhum outro caminho cobre isso. RLS não protege coluna: `origin/main:supabase/migrations/20260418183756_107f80f6-c724-4ce3-a61f-d3b256419118.sql:57-61` dá UPDATE total ao admin (`USING/WITH CHECK has_role(auth.uid(),'admin')`), sem restrição de coluna. O único trigger na tabela é `trg_kit_templates_updated_at` (mesmo arquivo, :68-70), que só toca `updated_at`. Não há nenhuma outra migration com lógica sobre `kit_templates` (as outras duas que citam o nome, `20260426134707_...sql:76` e `20260426142016_...sql:129`, só listam a tabela num loop de auditoria). Nenhum teste cobre o fluxo (git grep de `useTemplateSnapshot`/`Atualizar template` em `tests` e `e2e`: zero resultados).

3) O fluxo existe e é alcançável na main. `KitBuilderPage.tsx:147` lê `template` da URL, `:228` carrega via `loadKitTemplate`, `:342` passa `templateId={templateIdParam}` ao header, e `KitBuilderHeader.tsx:78-80` troca o rótulo para "Atualizar template" e dispara o update. O link in-app existe: `origin/main:src/components/kit-builder/SimilarKitsWidget.tsx:70` navega para `/montar-kit?template=${id}`.

4) A perda de dado é irreversível pela UI, não é "sobrescrever com o mesmo valor": `KitState` (`origin/main:src/lib/kit-builder/types.ts:108-128`) NÃO tem campo `category` — o builder nunca carrega a categoria curada do template, então o update sempre grava literalmente `'Geral'`. Isso quebra o badge (`origin/main:src/pages/admin/KitTemplatesAdminPage.tsx:135`) e a busca por categoria (:57), e o toast só diz 'Template do sistema salvo!' (`useTemplateSnapshot.ts:71`). Colunas aceitam a escrita: `origin/main:src/integrations/supabase/types.ts:3946` (`category?: string`) e `:3954` (`is_active?: boolean`).

5) A variante da PR #119 existe e é melhor, não pior: `refs/verif/pr119:src/lib/kit-builder/persistence.ts:116-119` — comentário "Atualizações do builder não alteram metadados editoriais do template." e `buildKitTemplateUpdatePayload` fazendo `const { category: _category, is_active: _isActive, ...payload } = buildKitTemplatePayload(snapshot)`; `buildKitTemplatePayload` (:95-114) é quem traz `category: options.category || 'Geral'` (:101) e `is_active: true` (:111). Consumo coerente: `refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:115` usa a variante de update no `.update()` e `:125` o payload completo no `.insert()`. Não achei efeito colateral da variante — ela só omite duas colunas do UPDATE, mantendo nome, identidade, dados e preços.

RESSALVA (único ponto onde o impacto alegado é menor do que o enunciado, não suficiente para refutar): a parte "template desativado reaparece" é alcançável só por URL direta/histórico/favorito, porque o único link in-app para `/montar-kit?template=<id>` (`SimilarKitsWidget.tsx:70`) é alimentado por `origin/main:src/hooks/useSimilarKits.ts:54`, que filtra `.eq('is_active', true)`; a listagem de admin (`KitTemplatesAdminPage.tsx:149-158`) só oferece olho/lápis/lixeira, sem link para o builder. Já a parte "categoria curada vira 'Geral'" é 100% alcançável pelo fluxo normal e é dano real em produção num clique.

</details>

#### Template existente é sobrescrito com categoria 'Geral' e is_active=true

**O que falta:** persistence.test.ts:59 'não sobrescreve categoria nem ativação ao atualizar template existente' não tem equivalente nenhum: não há um único teste na main que mencione kit_templates (git grep -l kit_templates origin/main -- tests/ não retorna nada).

**Impacto no usuário:** Bug vivo em produção, não só teste faltando: salvar um template do sistema a partir do builder reclassifica o template para a categoria 'Geral' e reativa um template que o admin havia desativado. O catálogo de templates perde a curadoria sem ninguém ter pedido.

**Na PR #119:** refs/verif/pr119:src/lib/kit-builder/__tests__/persistence.test.ts:59-64 exige que o payload de update não tenha 'category' nem 'is_active'; a função que garante isso é refs/verif/pr119:src/lib/kit-builder/persistence.ts:117-119 (buildKitTemplateUpdatePayload).

**Na `main`:** origin/main:src/hooks/useTemplateSnapshot.ts:30 ('category: category || Geral') e :37 ('is_active: true') entram no MESMO payload usado no update de :44-50; chamado por origin/main:src/pages/KitBuilderPage.tsx:268. Nenhum teste cobre isso.

<details><summary>Refutação tentada</summary>

Tentei derrubar e não consegui: a lacuna existe e causa dano real. (1) Fluxo vivo na main: origin/main:src/pages/KitBuilderPage.tsx:133-138 (loadKitTemplate lê kit_templates), :226-229 (ativa com ?template=), :267-268 (await saveAsTemplate({ kitState, templateId: templateIdParam })); entradas na UI em origin/main:src/components/kit-builder/SimilarKitsWidget.tsx:70 (navigate `/montar-kit?template=${id}`) e origin/main:src/components/kit-builder/KitBuilderHeader.tsx:78-80 (botão "Atualizar template" chamando saveAsTemplate com templateId). (2) Payload: origin/main:src/hooks/useTemplateSnapshot.ts:30 (`category: category || 'Geral'`) e :37 (`is_active: true`) estão no MESMO objeto usado no update de :44-50; nenhum call-site passa `category` (KitBuilderPage.tsx:268 e KitBuilderHeader.tsx:80 passam só kitState/templateId) e loadKitTemplate (KitBuilderPage.tsx:133-138) não guarda a categoria no kitState — logo o update grava sempre 'Geral' e reativa. (3) A curadoria sobrescrita existe de fato: origin/main:src/pages/admin/KitTemplatesAdminPage.tsx:192 (campo categoria), :151 e :209 (ligar/desligar), via origin/main:src/hooks/useAdminKitTemplates.ts:69-81 (toggleActive grava is_active); rota em origin/main:src/routes/config/admin.ts:79. (4) Nenhuma cobertura por outro caminho: origin/main:supabase/migrations/20260418183756_107f80f6-c724-4ce3-a61f-d3b256419118.sql:19-23 só define `category text NOT NULL DEFAULT 'Geral'`, :45-66 a RLS apenas exige has_role(...,'admin') — e o admin é justamente quem usa o builder, então não protege —, e :68-70 o único trigger é update_updated_at_column; `git grep "buildKitTemplate|KitPersistenceCoordinator" origin/main -- src/` não retorna nada. (5) Sem teste: `git grep -l kit_templates origin/main -- tests/ e2e/` e `git grep -l "useTemplateSnapshot|TemplateSnapshot" origin/main -- tests/ e2e/` não retornam nada. (6) A PR não é pior: refs/verif/pr119:src/lib/kit-builder/persistence.ts:117-119 só remove category e is_active do payload de update (mantendo nome, identidade, dados e preços), ligado em refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:115, e travado por refs/verif/pr119:src/lib/kit-builder/__tests__/persistence.test.ts:59-64. Ressalva NÃO VERIFICADO: não executei o fluxo em produção nem consultei dados reais de kit_templates para medir quantas linhas têm categoria != 'Geral' ou is_active=false; a confirmação é por leitura de código e DDL.

</details>

#### Modo template continua gravando em custom_kits por autosave

**O que falta:** useKitPersistenceCoordinator.test.tsx:199 'não grava custom_kits no modo template e salva apenas sob ação manual' não tem equivalente: na main não existe o conceito de modo de persistência.

**Impacto no usuário:** Editar um template do sistema (?template=...) cria/atualiza kits em custom_kits do admin a cada 5s. O painel 'Meus kits' do admin enche de kits-fantasma gerados por edição de template.

**Na PR #119:** refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:199-226 — após 30s só kit_templates é tocado, e apenas em saveNow(), com toast 'Template do sistema salvo!'.

**Na `main`:** origin/main:src/pages/KitBuilderPage.tsx:169-171 chama useKitAutoSave incondicionalmente, inclusive quando templateIdParam está definido (origin/main:src/pages/KitBuilderPage.tsx:147,267-268); origin/main:src/hooks/useKitAutoSave.ts:87 insere em custom_kits sem qualquer verificação de modo.

<details><summary>Refutação tentada</summary>

Confirmado lendo os dois lados: a lacuna existe na main. origin/main:src/pages/KitBuilderPage.tsx:147 lê ?template=, :226-229 carrega a linha de kit_templates via loadKitTemplate (:131-139, que chama loadKit) e :267-268 desvia só o botão Salvar para saveAsTemplate; o autosave em :169-171 chama useKitAutoSave sem condição nem parâmetro de modo/enabled. Em origin/main:src/hooks/useKitAutoSave.ts:87 há insert em custom_kits (e :78-79 update) sem verificação de modo — o único bloqueio é kit vazio (:63-65,:127) — e como loadKit altera o snapshot (:162-178) o debounce de 5s (:16) dispara. Não há cobertura por outro caminho: git grep -ln useKitAutoSave origin/main -- src tests e2e retorna apenas o hook, a página e dois testes, e tests/hooks/useKitAutoSave.test.tsx (201 linhas) não menciona template; o payload (src/lib/kit-builder/custom-kit-payload.ts:45-63) grava user_id do próprio usuário, permitido pela RLS por desenho. Lado PR: refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:199-226 prova que com mode {kind:'template'} nada é gravado após 30s e só saveNow() toca kit_templates com o toast 'Template do sistema salvo!' (mesmo toast de origin/main:src/hooks/useTemplateSnapshot.ts:71). Correções ao enunciado, que não o derrubam: (a) não é um kit novo a cada 5s — o primeiro autosave insere UMA linha e adota o id (useKitAutoSave.ts:112-117,138 -> setCurrentKitId em KitBuilderPage.tsx:170), os seguintes são update na mesma linha, logo um kit-fantasma por sessão de edição de template, reescrito a cada 5s; (b) o único link ?template= na UI da main é src/components/kit-builder/SimilarKitsWidget.tsx:70 (widget renderizado em KitBuilderPage.tsx:470-471, aberto a qualquer usuário) — o painel admin de templates é outra tela (src/pages/admin/KitTemplatesAdminPage.tsx:48) e não navega para o builder; (c) no mesmo caminho há dano maior que o alegado: o botão Salvar em modo template sobrescreve a linha de kit_templates (KitBuilderPage.tsx:267-268) em vez do kit do usuário. NÃO VERIFICADO: se existe trigger/policy em custom_kits rejeitando esses inserts — não consultei o banco e nada no código indica isso.

</details>

#### Sem CAS por updated_at: edição em outra aba é sobrescrita em silêncio

**O que falta:** useKitPersistenceCoordinator.test.tsx:159 'aplica CAS por updated_at ao salvar um kit existente' não tem equivalente porque a main não implementa o filtro de concorrência.

**Impacto no usuário:** Duas abas (ou aba + realtime) no mesmo kit: a última gravação vence e apaga as alterações da outra sem aviso. Perda de trabalho do vendedor, silenciosa.

**Na PR #119:** refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:159-197 exige exatamente os filtros [id, user_id, updated_at].

**Na `main`:** origin/main:src/hooks/useKitAutoSave.ts:77-83 filtra só .eq('id').eq('user_id'); origin/main:src/hooks/useCustomKitPersistence.ts:51-57 idem. O payload até manda updated_at novo (origin/main:src/lib/kit-builder/custom-kit-payload.ts:62) mas nunca o usa como condição.

<details><summary>Refutação tentada</summary>

Confirmada lendo os dois lados. (1) Main sem CAS: origin/main:src/hooks/useKitAutoSave.ts:76-83 faz update(payload).eq('id').eq('user_id') e nada mais; origin/main:src/hooks/useCustomKitPersistence.ts:50-57 idem no salvamento manual; origin/main:src/lib/kit-builder/custom-kit-payload.ts:62 manda updated_at novo mas nunca como condição, e o payload reescreve o estado inteiro (custom-kit-payload.ts:50-61: box_data, items_data, personalization_data, preços, identidade). (2) Nenhum caminho alternativo cobre: origin/main:src/hooks/useCustomKitsRealtime.ts:28-30 só faz invalidateQueries(['custom-kits']) — invalida a lista, não recarrega nem avisa o builder aberto (KitBuilderPage.tsx:167); consulta read-only a pg_trigger no projeto oficial cfmzkthhgliqelozlmwu devolve só trg_owner__custom_kits__user_id (BEFORE INSERT, enforce_user_id_owner) e trg_validate_kit_status (validate_status_fields) — nenhum trigger de updated_at nem guarda de concorrência, logo o updated_at é escrito pelo cliente e o servidor aceita escrita obsoleta; RLS (supabase/migrations/20260322133758_7dc8f3c8-e0a0-4b62-b9e6-75995b2199c5.sql:26,34) só filtra dono, e as duas abas são o mesmo dono; a fila/geração de escopo de useKitAutoSave.ts:103-105,124-131 é por instância do hook, serializa só a própria aba. (3) O fluxo existe e está ligado na main: rota em origin/main:src/routes/config/tools.ts:27 -> KitBuilderPage; KitBuilderPage.tsx:148 lê ?kit= em currentKitId e :169-171 liga o autosave (delay de 5s em useKitAutoSave.ts:15). Duas abas no mesmo ?kit=X: a última gravação vence, sem erro e sem aviso. (4) A PR #119 não é pior: mode.kitId vem do param da URL (refs/verif/pr119:src/pages/KitBuilderPage.tsx:144), então o scopeKey não muda quando o insert cria o id e o expectedUpdatedAtRef não é zerado (refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:146,252,266); a versão é realimentada do retorno do banco (:94-106, :310-311) e o update só passa com a versão esperada, devolvendo erro explícito de conflito (:88-96). O teste citado existe e exige os três filtros (refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:159,191-194). Ressalva que não muda o veredito: sem trigger de updated_at, o CAS depende do relógio do cliente, e a própria PR trata isso forçando updated_at > expectedUpdatedAt (useKitPersistenceCoordinator.ts:84-87).

</details>

#### Kit recém-carregado pode ser regravado sem edição do usuário

**O que falta:** useKitPersistenceCoordinator.test.tsx:109 'adota o conteúdo carregado como baseline sem disparar autosave' não tem equivalente: nenhum teste da main exercita a chegada assíncrona do kit carregado.

**Impacto no usuário:** Abrir um kit salvo (sem tocar em nada) pode disparar um UPDATE em custom_kits, mexendo em updated_at e na ordenação de 'Meus kits' — e, com o payload da main, podendo reescrever status a partir de um isValid ainda não recalculado.

**Na PR #119:** refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:109-130 usa a flag 'enabled' para adotar o conteúdo carregado como baseline e verifica que supabase.from nunca é chamado em 10s.

**Na `main`:** origin/main:src/hooks/useKitAutoSave.ts:163-168 só adota baseline no PRIMEIRO render (isFirstRender) e o hook não aceita 'enabled'; o carregamento acontece depois, em origin/main:src/pages/KitBuilderPage.tsx:226-229 (loadKitTemplate/loadKit assíncrono). Sem teste cobrindo essa janela.

<details><summary>Refutação tentada</summary>

CONFIRMADA (com uma parte do impacto alegado incorreta). Tentei derrubar por cinco caminhos e nenhum sustentou.

1) A janela existe e é síncrona na montagem. `origin/main:src/pages/KitBuilderPage.tsx:148` já define `currentKitId = kitIdParam` no primeiro render, e `:169-171` monta `useKitAutoSave(kitState, kitQuantity, currentKitId, ...)` com o `kitState` ainda VAZIO. O baseline é fixado aí: `origin/main:src/hooks/useKitAutoSave.ts:163-168` (`isFirstRender`) grava o snapshot do kit vazio em `persistedSnapshotRef`. O conteúdo real só chega depois, em `origin/main:src/pages/KitBuilderPage.tsx:218-222` → `loadCustomKit` → `loadKit(...)` em `:125`. Como `currentKitId` não muda, o efeito de escopo `origin/main:src/hooks/useKitAutoSave.ts:181-205` retorna cedo (`scopeRef.current === nextScope`) e NÃO readota baseline. O efeito `:170-179` vê snapshot ≠ baseline e arma o timer de 5s.

2) Reproduzi, não deduzi. Escrevi um teste temporário (`tests/hooks/__tmp_verif_load_autosave.test.tsx`, já removido) que monta o hook com `currentKitId='kit-1'` e kit vazio, faz UM rerender com o kit carregado (nenhuma edição) e avança 5s: `update` foi chamado 1 vez, com `status: "ready"` e `updated_at: "2026-11-18T20:12:38.487Z"`. Ou seja, abrir um kit salvo e não tocar em nada dispara UPDATE em `custom_kits` com `updated_at` novo.

3) Nenhum outro caminho cobre isso na main. `origin/main:tests/hooks/useKitAutoSave.test.tsx` tem 6 testes (linhas 50, 68, 100, 120, 135, 165) e todos partem de um kit já populado e simulam EDIÇÃO; nenhum exercita a chegada assíncrona sobre baseline vazio. Nenhum teste ou e2e renderiza `KitBuilderPage` (`git grep -ln KitBuilderPage origin/main -- tests e2e` → vazio) e nenhum e2e abre `?kit=`.

4) O dano é real e não é absorvido por outro mecanismo. `RecentKitsWidget.tsx:30` e `KitLibraryPage.tsx:308` ordenam por `.order('updated_at', { ascending: false })`. Tentei refutar pelo `bumpLastUsed`, que também roda ao abrir (`KitBuilderPage.tsx:129`), mas ele só escreve `last_used_at` (`origin/main:src/hooks/useCustomKitPersistence.ts:147-151`) e NÃO há trigger de `updated_at` em `custom_kits`: consulta read-only no projeto oficial `cfmzkthhgliqelozlmwu` retorna apenas `trg_owner__custom_kits__user_id` (BEFORE INSERT) e `trg_validate_kit_status` (BEFORE INSERT/UPDATE). Logo o bump de `updated_at` vem exatamente desse autosave fantasma. Agravante: a main não tem CAS (`origin/main:src/hooks/useKitAutoSave.ts:71-80` filtra só por `id` + `user_id`), então essa regravação cega devolve ao banco o conteúdo lido no load e pode reverter uma alteração feita em outra aba entre o SELECT e o UPDATE 5s depois.

5) A PR #119 realmente resolve e o `enabled` não é flag órfã: `refs/verif/pr119:src/pages/KitBuilderPage.tsx:137` calcula `persistenceReady = !requestedResourceKey || loadedResourceKey === requestedResourceKey` e passa em `:141`; `loadedResourceKey` só é setado após o load em `:206`/`:227`. O teste `refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:109-130` ("adota o conteúdo carregado como baseline sem disparar autosave") corresponde ao fluxo real da PR.

PARTE DA ALEGAÇÃO QUE ESTÁ ERRADA (não anula a lacuna, corrige o relatório): "podendo reescrever status a partir de um isValid ainda não recalculado" é falso. `isValid` é derivado de forma síncrona por `useMemo` no mesmo render do `loadKit` (`origin/main:src/hooks/useKitBuilder.ts:82` e `:161`), então nos 5s de debounce ele já reflete o conteúdo carregado — meu repro gravou `status: "ready"`, coerente. E nada no front escreve `'shared'`/`'archived'` (só aparecem em `src/lib/kit-builder/status.ts:12-13`), então não há rebaixamento desses estados. O dano verificado é o bump indevido de `updated_at` (reordena "Meus kits"/RecentKits) e a regravação cega sem CAS.

</details>

#### Autosave e salvamento manual não compartilham fila nem alvo

**O que falta:** persistence-coordinator.test.ts:17 'serializa autosave e salvamento manual no mesmo alvo' e :56 'não deixa uma gravação pendente de A bloquear o salvamento de B' não têm equivalente, e o comportamento testado nem existe na main.

**Impacto no usuário:** Clicar em 'Salvar' enquanto o autosave de um kit novo está em voo pode gerar DUAS linhas em custom_kits (o manual não espera o id criado pelo autosave). E, dentro do hook, uma gravação travada bloqueia a próxima (a fila espera antes de checar a geração).

**Na PR #119:** refs/verif/pr119:src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:17-38 (o manual só executa depois e já recebe 'kit-1') e :56-71 (B não espera A).

**Na `main`:** São dois caminhos independentes: autosave com fila própria em origin/main:src/hooks/useKitAutoSave.ts:108,129-137 e salvamento manual em origin/main:src/hooks/useCustomKitPersistence.ts:93-110,132-136, acionado por origin/main:src/pages/KitBuilderPage.tsx:273 — sem fila comum e sem troca do id criado. Em origin/main:src/hooks/useKitAutoSave.ts:135-136 o 'await previousSave' vem ANTES do teste de geração, então uma gravação pendente segura a seguinte.

<details><summary>Refutação tentada</summary>

NÃO CONSEGUI DERRUBAR — a lacuna existe na main e o dano é real, embora a janela seja estreita e exista mitigação parcial.

1) Alvo não compartilhado (duas linhas em custom_kits), confirmado linha a linha:
- origin/main:src/hooks/useKitAutoSave.ts:137-138 — o id criado só é adotado DEPOIS que o INSERT responde (`const createdId = await persistAutoSave(...); adoptCreatedId(createdId)`); antes disso `autoSavedKitId` continua null (inicializado em :100 com `currentKitId || null`).
- origin/main:src/pages/KitBuilderPage.tsx:271,273 — o manual calcula `editingId = currentKitId || autoSavedKitId || undefined` e chama `saveKit(kitState, kitQuantity, editingId)`; com o INSERT do autosave ainda em voo, `editingId` é undefined.
- origin/main:src/hooks/useCustomKitPersistence.ts:50-63 (via :101) — sem kitId o caminho é `supabase.from('custom_kits').insert(payload)`. O payload não carrega `id` (origin/main:src/lib/kit-builder/custom-kit-payload.ts:45-60), logo são DUAS linhas, não conflito de PK.
- Não há guarda de UI: origin/main:src/components/kit-builder/KitBuilderHeader.tsx:88 desabilita o botão só com `props.isSaving || !props.hasContent`, e origin/main:src/pages/KitBuilderPage.tsx:338 passa `isSaving` do salvamento manual (origin/main:src/hooks/useCustomKitPersistence.ts:185), nunca `isAutoSaving`. O botão fica clicável durante o autosave.
- Não há guarda de banco: o único índice único em custom_kits é o de destaque (origin/main:supabase/migrations/20261118130400_pin_custom_kit_atomically.sql:56, `idx_custom_kits_one_pinned_per_user`).

2) Fila comum: a PR #119 realmente serializa os dois caminhos no mesmo objeto — refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:64-80 (enqueue encadeia na fila da geração e repassa `this.targetId` ao execute, adotando `result.targetId` em :77), usado tanto pelo autosave (refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:291,301,349) quanto pelo manual (:357,370), ligado na página em refs/verif/pr119:src/pages/KitBuilderPage.tsx:260-262. Ou seja, não é teste órfão: o comportamento testado em refs/verif/pr119:src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:17-38 está de fato implementado e ligado lá, e não existe equivalente na main (não há persistence-coordinator.ts nem useKitPersistenceCoordinator.ts em origin/main; `git ls-tree -r origin/main` lista só custom-kit-payload.ts, status.ts, types.ts, price-calculator.ts, volume-calculator.ts, mock-data.ts e index.ts em src/lib/kit-builder/).

3) Fila que bloqueia (segunda metade da alegação): confirmada em origin/main:src/hooks/useKitAutoSave.ts:135-136 — `await previousSave` vem antes de `if (operationGeneration !== scopeGenerationRef.current) return;`, enquanto refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:66 usa fila POR geração (`this.queues.get(operationGeneration)`), então B não espera A (teste :56-71). Impacto menor do que o alegado: na main a gravação de B é atrasada, não descartada — ela executa depois que A resolve, porque a geração de B é a corrente. Só vira perda se A nunca resolver ou se o escopo mudar outra vez durante a espera.

Ressalvas que enfraquecem o impacto, mas não derrubam:
- A corrida só existe no PRIMEIRO autosave de um kit novo e só na janela do round-trip do INSERT (debounce de 5 s em origin/main:src/hooks/useKitAutoSave.ts:15,177). Clicar "Salvar" antes do autosave disparar não duplica: o manual cria a linha, `setCurrentKitId` (KitBuilderPage.tsx:274) muda o escopo e o efeito em useKitAutoSave.ts:187-216 limpa o timer e incrementa a geração.
- Existe mitigação parcial, não guarda: origin/main:src/pages/KitBuilderPage.tsx:249-263 chama `findDuplicate`, que consulta custom_kits ao vivo (origin/main:src/hooks/useDuplicateKitDetector.ts:73-81) e acharia a linha recém-inserida pelo autosave com ratio 1.0 — mas só com 2+ itens (KitBuilderPage.tsx:250) e o default de dispensar/auto-fechar o toast é `resolve(true)`, ou seja, salva mesmo assim (:259-260).

Nenhum outro caminho da main (RLS, trigger, realtime em useCustomKitsRealtime, índice único) cobre o caso, e o fluxo continua existindo e sendo usado.

</details>

#### Autosave não está ligado a guarda de saída de página

**O que falta:** A segunda metade de useKitPersistenceCoordinator.test.tsx:83 (isDirty do autosave alimentando a guarda de navegação) não tem equivalente: useDirtyGuard e useNavigationGuardStore não existem na main.

**Impacto no usuário:** Sair do montador com alteração ainda não gravada não gera aviso vindo do autosave; a sujeira do kit não chega a nenhuma guarda.

**Na PR #119:** refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:60-68 (useGuardedPersistence) e :96-106 (useNavigationGuardStore.hasDirty() acompanha isDirty).

**Na `main`:** NÃO EXISTE na main: git ls-tree origin/main src/hooks/useDirtyGuard.ts src/stores/useNavigationGuardStore.ts não retorna nada e git grep -l useDirtyGuard origin/main -- src/ tests/ é vazio. Além disso origin/main:src/hooks/useKitAutoSave.ts:17-23 não expõe isDirty.

<details><summary>Refutação tentada</summary>

Confirmei a lacuna lendo os dois lados. MAIN: origin/main:src/hooks/useKitAutoSave.ts:17-23 não expõe nenhum sinal de sujeira (só lastSavedAt, isSaving, autoSavedKitId, lastSaveError, retry); origin/main:src/pages/KitBuilderPage.tsx:169 é o consumidor e nas importações (linhas 9-57) não há guarda nenhuma. A única guarda da main, origin/main:src/hooks/useUnsavedChangesGuard.ts:15-34 (beforeunload), é usada só em origin/main:src/pages/QuoteBuilderPage.tsx:133 — `git grep -n beforeunload origin/main -- src/` só acha esse arquivo. A confirmação de voltar (origin/main:src/hooks/useSmartNavigation.ts:22-36) depende de isCriticalPathname (:77-81), que cobre apenas /simulador, /orcamentos/novo e /mockup-generator; a rota do montador é /montar-kit (origin/main:src/routes/config/tools.ts:26), fora da lista. Não existe bloqueio central: `git grep -n useBlocker origin/main -- src/` é vazio e src/components/navigation/ + src/stores/ da main não têm NavigationBlockerBridge nem useNavigationGuardStore. Não há rascunho local de recuperação: `git grep -n localStorage origin/main -- src/hooks/useKitBuilder.ts src/hooks/useCustomKitPersistence.ts src/pages/KitBuilderPage.tsx src/lib/kit-builder/` é vazio. DANO REAL: origin/main:src/hooks/useKitAutoSave.ts:15 usa debounce de 5000 ms e :176-181 limpa o timer no cleanup do efeito, ou seja, desmontar a página cancela a gravação pendente — sair até 5 s após uma edição perde a edição em silêncio; e quando o autosave falha (:149-152) só há um toast ("Tente salvar novamente antes de sair") e lastSaveError, sem nada que impeça a saída, podendo perder o kit inteiro. EVIDÊNCIA DA PR CONFERE: refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:59-68 (useGuardedPersistence com useDirtyGuard('kit-builder', persistence.isDirty) em :66) e asserções de hasDirty() em :97, :99 e :106; a guarda é real e ligada em produção — refs/verif/pr119:src/hooks/useDirtyGuard.ts:5-11 -> src/stores/useNavigationGuardStore.ts:29-59 -> src/components/navigation/NavigationBlockerBridge.tsx:32 (useBlocker) e :58-66 (beforeunload), montada em src/routes/app-router.tsx:48, com src/pages/KitBuilderPage.tsx:317-321 registrando o escopo. RESSALVA (não refuta, encarece o conserto): a ponte da PR exige data router (refs/verif/pr119:src/routes/app-router.tsx:6, createBrowserRouter) e a main ainda monta <BrowserRouter> em origin/main:src/App.tsx:79, onde useBlocker não funciona — portar exige migrar o router ou implementar a guarda só com beforeunload mais confirmação nos pontos de saída.

</details>


### Lacunas apontadas e derrubadas na refutação

- **Adoção do id recém-criado acontece ANTES da checagem de geração (contaminação cruzada de kit)** — REFUTADA — a diferença de ordem existe literalmente no código, mas o cenário e o dano alegados não acontecem na main.

1) O gatilho do cenário não existe. A alegação depende de `currentKitId` passar de `undefined` para o kit B dentro da mesma instância, "invalidando o escopo em useKitAutoSave.ts:205-215". Na main, `currentKitId` é estado local de `KitBuilderPage` inicializado só no mount (`src/pages/KitBuilderPage.tsx:148 — useState<string|undefined>(kitIdParam || undefined)`) e só muda em três pontos, todos lidos no arquivo inteiro: `src/pages/KitBuilderPage.tsx:170` (o próprio `onKitIdCreated`), `:274` (resultado do salvamento manual, que devolve o id do próprio kit salvo) e `:283` (`handleResetKit` → `undefined`). Não há efeito sincronizando `kitIdParam` → `currentKitId`: o efeito de carga em `src/pages/KitBuilderPage.tsx:218-222` só chama `loadCustomKit` e nem toca no estado, e ainda é protegido por `hasLoadedRef` (`:219-220`), de modo que abrir "um kit salvo B" a partir da própria tela nem recarrega conteúdo quando já houve uma carga. Abrir B é sempre `navigate('/montar-kit?kit=B')` (ex.: `src/pages/KitBuilderPage.tsx:257`) e a rota não remonta a página: `src/App.tsx:112-114` mapeia `toolRoutes` com `key={r.path}` e `src/routes/config/tools.ts:26` registra `path: "/montar-kit"` — mudar a query string mantém o mesmo elemento montado. Logo `kitIdRef.current` nunca recebe o kit B (`src/hooks/useKitAutoSave.ts:208`), o escopo nunca é invalidado por essa troca e o INSERT tardio não tem o que sobrescrever. O vazamento descrito ("toda edição do kit B gravada na linha do kit novo", `src/hooks/useKitAutoSave.ts:77-85`) não se produz por esse caminho — e, se a tela realmente carregasse B sem mudar `currentKitId`, o escopo continuaria `user:new` e a guarda da PR (`src/lib/kit-builder/persistence-coordinator.ts:73-77`, que só compara geração) também não impediria nada, porque nenhuma geração mudaria.

2) O único caminho que de fato sobe a geração com um INSERT em voo é o salvamento manual concorrente: `src/pages/KitBuilderPage.tsx:271-274` calcula `editingId = currentKitId || autoSavedKitId || undefined` e, com ambos nulos, `useCustomKitPersistence` faz INSERT (`src/hooks/useCustomKitPersistence.ts:61`) e `:274` chama `setCurrentKitId(X)` — aí sim `src/hooks/useKitAutoSave.ts:189-208` incrementa `scopeGenerationRef` e põe `kitIdRef = X`, e a resposta do INSERT do autosave é adotada fora da guarda (`:138` antes de `:139`), levando `kitIdRef`/`onKitIdCreated` para o id Y. O efeito é duas linhas `custom_kits` e a edição seguindo em Y, não contaminação de um kit B existente; e a linha duplicada Y nasce do próprio salvamento manual concorrente, que existiria com ou sem a guarda. A janela é o intervalo em que o INSERT manual responde ANTES do INSERT do autosave disparado antes dele. Não consegui demonstrar perda de conteúdo de outro kit por esse caminho: NÃO VERIFICADO que haja dano real.

3) A evidência citada na main está correta quanto ao texto (`src/hooks/useKitAutoSave.ts:112-117`, `:137-139`, `:85 vs :87-88`), mas a narrativa de impacto (`:205-215` pondo kit B) está errada quanto ao wiring real da página. A main cobre o caso que importa de verdade — adoção legítima do id recém-criado sem invalidar a fila — por outro mecanismo: `isCreatedKitAdoption` (`src/hooks/useKitAutoSave.ts:57-65`) + ramo de adoção (`:194-203`), com teste de regressão em `tests/hooks/useKitAutoSave.test.tsx:165-200` (edição enfileirada preservada; `update` com 'Edição feita durante a criação').

Conclusão: lacuna de ordenação real no código, cenário e impacto alegados não reproduzíveis na main → refutada.
- **Fila única global em vez de uma fila por geração: gravação pendente do kit A trava o salvamento do kit B** — REFUTADA — o mecanismo citado existe, mas o cenário e o dano alegados não se sustentam na main.

1) O que confere. A fila da main é única por instância do hook: `saveQueueRef` (src/hooks/useKitAutoSave.ts:108), lido sem olhar a geração (:129), encadeado em `await previousSave` (:135) e só liberado no `finally` da operação anterior (:153), com `setIsSaving(true)` antes do await (:133). A PR #119 usa Map por geração (src/lib/kit-builder/persistence-coordinator.ts:31, :66, :83) e tem o teste citado (src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:56-71). Todos os números de linha citados nos dois lados estão corretos.

2) O cenário alegado ("edita o kit A, troca para o kit B") NÃO ocorre na main. O único consumidor é src/pages/KitBuilderPage.tsx:169. `currentKitId` nasce só do valor inicial do `useState` (KitBuilderPage.tsx:148) e não há nenhum efeito que o sincronize com `?kit=`; o carregamento é travado por `hasLoadedRef` (KitBuilderPage.tsx:219-221). Logo, navegar de `?kit=A` para `?kit=B` dentro da mesma montagem não muda o escopo do hook (useKitAutoSave.ts:188-189 sai cedo) — nem sequer carrega o kit B. E vir de outra rota (ex.: Meus Kits) desmonta a página: hook novo, `saveQueueRef` novo (:108 é por instância), zero encadeamento com a requisição de A. Não existe, na main, uma instância do hook que segure kit A e kit B. Único ponto de troca de escopo na mesma instância é "Novo kit" (`handleResetKit`, KitBuilderPage.tsx:283 → geração++ em useKitAutoSave.ts:206), que é A → kit novo, não A → B.

3) O dano alegado não se sustenta. O bloqueio é limitado pelo término da requisição anterior (`releaseQueue()` no `finally`, useKitAutoSave.ts:153) — não é espera indefinida; sob latência normal são centenas de ms de atraso, invisíveis. A tese "requisição pendurada para sempre" é hipótese: NÃO VERIFICADO qualquer caminho na main que deixe o fetch do supabase-js pendente sem settle. E a perda por fechar a aba já existe igual nos dois lados pelo debounce de 5 s (useKitAutoSave.ts:15 e :172) — a janela extra é a latência residual de A, não "as edições de B se perdem".

4) A serialização única é intencional e testada dentro do mesmo kit: tests/hooks/useKitAutoSave.test.tsx:135-163 ("serializa gravações concorrentes e persiste por último o estado mais recente") e :165-200 (edição enfileirada preservada na adoção do id recém-criado). Trocar isso por fila por geração sem a arquitetura inteira da PR é regressão: o remédio da #119 só funciona acoplado a src/hooks/useKitPersistenceCoordinator.ts, que carrega travamento otimista por `updated_at` (:85-99) que a main não possui.

5) Risco residual que encontrei e que NÃO é o item alegado (registro honesto, por leitura de código, NÃO VERIFICADO em execução): no caminho "Novo kit" durante um INSERT em voo, `adoptCreatedId` roda sem checar geração (useKitAutoSave.ts:138, antes do `releaseQueue` :153), então a gravação do kit novo pode sair com `kitIdRef.current` já apontando para o id criado do kit anterior (:137). Isso é contaminação de id, não "trava o salvamento de B", e exigiria um item próprio.
- **Resultado da gravação não informa stale/executed ao chamador** — REFUTADA. A diferença de tipo existe, mas não falta comportamento na main nem há dano real — a própria afirmação admite "Impacto alegado: Hoje nenhum".

1) A main NÃO "descarta em silêncio": usa a mesma informação de obsolescência, só que internamente, em vez de devolvê-la. src/hooks/useKitAutoSave.ts:127 captura `operationGeneration` e os quatro pontos de decisão existem: :136 descarta ANTES de emitir a escrita (`if (operationGeneration !== scopeGenerationRef.current) return;`, antes do `persistAutoSave` em :137); :139-143 não contamina baseline/`lastSavedAt`/`lastSaveError` quando o escopo mudou durante o request em voo; :145 não mostra erro de escopo morto; :155-157 não mexe no `isSaving`. É o mesmo conjunto de decisões que a PR #119 toma a partir de `stale`/`executed` em src/lib/kit-builder/persistence-coordinator.ts:68-79. Falta o valor de retorno, não a conduta.

2) O único consumidor que a PR #119 construiu para `stale`+`executed` não tem par possível na main. Na PR, `stale && executed && escopo voltou` vira `staleWriteRevision` (src/hooks/useKitPersistenceCoordinator.ts:210-215, :259, :319-321, :408), e esse contador serve a UMA coisa: ser dependência do efeito de carga em src/pages/KitBuilderPage.tsx:235 (`[kitIdParam, templateIdParam, loadKit, bumpLastUsed, persistence.staleWriteRevision]`), que recarrega o kit. Na main o efeito equivalente é disparo único travado por ref: src/pages/KitBuilderPage.tsx:219-220 (`if (!kitIdParam || hasLoadedRef.current) return; hasLoadedRef.current = true;`). Ele não pode re-rodar; logo, mesmo que `saveToDb` devolvesse `{stale, executed}`, não haveria nada a fazer com o valor. Recuperar o tipo sem recuperar o carregador re-executável da PR não muda um único comportamento.

3) O cenário que produz `stale: true, executed: true` é inalcançável na main. Ele exige escopo A→B→A (a geração só avança quando o `scopeKey` muda — persistence-coordinator.ts:33-40; na main, useKitAutoSave.ts:188-189 + :206). O escopo da main é `${user?.id}:${currentKitId ?? 'new'}` (useKitAutoSave.ts:106 e :188) e `currentKitId` em src/pages/KitBuilderPage.tsx:148 só é inicializado pela URL e só muda por `setCurrentKitId(id)` na adoção do ID criado (:170) — não há outro `setCurrentKitId` no arquivo. Essa transição `new`→ID criado é explicitamente isentada de invalidar a fila em useKitAutoSave.ts:194-203 (`isCreatedKitAdoption`), com teste em tests/hooks/useKitAutoSave.test.tsx:165-199. Trocar de kit pela URL muda `kitIdParam`, não `currentKitId` (useState só lê o param na montagem, :148), então o escopo nem se mexe.

4) A "melhoria" é, na janela que importa, igual ou pior. A main bloqueia a escrita obsoleta ANTES de chegar ao banco (:136, antes de :137); a PR faz a mesma checagem prévia (persistence-coordinator.ts:68-70) e acrescenta apenas o relato posterior (:73-75) de uma escrita que JÁ foi ao banco. O único efeito prático desse relato é o recarregamento de KitBuilderPage.tsx:235, que sobrescreve o estado em edição do usuário com o que está no banco — e a própria afirmação classifica o descarte da edição pendente como "o comportamento desejado, não um bug".

5) A condição que a afirmação aponta para virar lacuna real ("só vira lacuna real se o salvamento manual passar a usar a mesma fila") não ocorre na main: o salvamento manual é outro caminho, `useCustomKitPersistence` (src/pages/KitBuilderPage.tsx:164), separado do autosave de :169. Lacuna condicionada a uma refatoração que ninguém fez.

6) Imprecisão na evidência citada: useKitAutoSave.ts:121 é linha em branco; o `return;` desse par está em :120 (`if (!user?.id) return;`). Os demais (:123, :136, :145, :177, :221) conferem, assim como os da PR (persistence-coordinator.ts:8-12, :69, :74, :79; src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:51, :66, :70).

NÃO VERIFICADO: não rodei aplicação nem testes; toda a análise é leitura de código via `git show` em origin/main e refs/verif/pr119.
- **Autosave dispara no modo template e cria kit custom fantasma** — REFUTADA: a "proteção" da PR #119 nunca roda no app — é código morto exercitado só pelo teste unitário, e no fluxo real a PR grava em `custom_kits` no modo `?template=` exatamente como a main.

1) Único consumidor do coordinator na PR #119 é a própria página, e ela fixa `kind: 'custom'`:
- `refs/verif/pr119:src/pages/KitBuilderPage.tsx:138-147` — `useKitPersistenceCoordinator({ ..., mode: { kind: 'custom', kitId: kitIdParam || undefined, expectedUpdatedAt: loadedKitUpdatedAt, sessionKey: `${persistenceSession}:${templateIdParam ?? productIdParam ?? 'blank'}` } })`. O `templateIdParam` entra apenas como texto do `sessionKey`; o `kind` é literal `'custom'`, inclusive quando a URL tem `?template=`.
- `git grep "kind: 'template'" refs/verif/pr119 -- src tests` retorna só 2 ocorrências: a declaração do tipo em `refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:26` e o teste `refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:213`. Nenhum caller de produção.
- Logo a guarda `refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:346` (`if (!enabled || modeKind !== 'custom' || ...) return;`) nunca é satisfeita em runtime; o único arquivo que usa o hook além dele mesmo é a página e o teste (`git grep -l useKitPersistenceCoordinator refs/verif/pr119 -- src tests`).
- O teste citado (`...test.tsx:199-226`) renderiza o hook direto com `mode: { kind: 'template', templateId: 'template-1' }`, estado que a página nunca produz: ele prova o comportamento do hook, não o da tela.

2) Na PR #119 o `?template=` NEM É modo "editar template do sistema": é "aplicar template e salvar cópia nos meus kits" — gravar em `custom_kits` é o comportamento pretendido:
- `refs/verif/pr119:src/pages/KitBuilderPage.tsx:219-228` — carrega `kit_templates` e dá `toast.success('Template aplicado ao kit', { description: 'Personalize e salve uma cópia nos seus kits.' })`.
Ou seja, abrir `/montar-kit?template=X` na PR #119 produz o mesmo "kit em Meus kits" que a main produz — só que anunciado como feature.

3) Do lado da main a mecânica alegada existe, mas não é uma lacuna "em relação à PR #119":
- `origin/main:src/pages/KitBuilderPage.tsx:169-171` chama `useKitAutoSave` sem condição; `:226-229` carrega o template; `:138` avisa que salvar atualiza o template; `:267-268` manda o Salvar para `saveAsTemplate` (kit_templates).
- `origin/main:src/hooks/useKitAutoSave.ts:67-69` só pula kit vazio (`isEmptyKit`) e `:84-86` insere em `custom_kits`.
A diferença real entre os dois lados é SEMÂNTICA do botão Salvar (main: atualiza o template do sistema; PR #119: salva cópia pessoal), não a existência de uma trava de autosave. Adotar a guarda da PR #119 na main não mudaria nada, porque na PR #119 ela nunca é alcançada a partir da UI.

4) Observação que enfraquece ainda mais o recorte "admin": em ambos os lados quem navega para `?template=` é qualquer usuário pelo widget de kits semelhantes (`origin/main:src/components/kit-builder/SimilarKitsWidget.tsx:70` → `navigate('/montar-kit?template=' + id)`), não só admin.

NÃO VERIFICADO: não executei a tela nem conferi RLS/trigger de `custom_kits` em produção; a refutação se apoia no código dos dois lados, que já basta — a PR #119 não entrega, no fluxo real, a proteção que a afirmação diz faltar na main.
- **staleWriteRevision: recarregar o kit quando uma gravação obsoleta foi para o banco** — REFUTADA. A ausência literal do contador é verdade (`git grep staleWrite origin/main -- src tests` = zero ocorrências), mas o comportamento não falta na main: nem o gatilho nem o consumidor existem lá, e o remédio da PR seria pior.

1) O consumidor não existe na main — a dependência seria código morto. Na PR #119 o efeito de carregamento é re-executável: `refs/verif/pr119:src/pages/KitBuilderPage.tsx:121` (`loadGenerationRef`), `:198`/`:220` (`setLoadedResourceKey(null)`) e `:235` (`}, [kitIdParam, templateIdParam, loadKit, bumpLastUsed, persistence.staleWriteRevision])`. Na main o mesmo efeito é one-shot: `origin/main:src/pages/KitBuilderPage.tsx:218-222` → `if (!kitIdParam || hasLoadedRef.current) return; hasLoadedRef.current = true;`. Com esse guarda, acrescentar qualquer dependência (inclusive um `staleWriteRevision`) não recarrega nada — o efeito sai na primeira linha. Portar o contador sem reescrever o efeito não muda uma linha de comportamento.

2) O gatilho não existe na main — gravação obsoleta não chega ao banco pela fila. `origin/main:src/hooks/useKitAutoSave.ts:135-137`: `await previousSave;` → `if (operationGeneration !== scopeGenerationRef.current) return;` → só então `persistAutoSave(...)`. Ou seja, o caso que a PR #119 classifica como `stale && executed` (`refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:70-76`, consumido em `src/hooks/useKitPersistenceCoordinator.ts:210-216` e `:319-321`) é descartado antes da execução na main. Sobra apenas a gravação já em voo.

3) E a gravação em voo nunca pode pertencer ao escopo ativo. Escopo da main: `origin/main:src/hooks/useKitAutoSave.ts:106` e `:188` → `${user?.id ?? 'anon'}:${currentKitId ?? 'new'}`. Em `origin/main:src/pages/KitBuilderPage.tsx`, `currentKitId` só muda em `:170` (adoção do id recém-criado, isenta de bump por `useKitAutoSave.ts:194-204`), `:274` (após salvar manual) e `:283` (reset). `kitIdParam` nunca reescreve `currentKitId` depois da montagem (`:148` é só inicializador do `useState`). Logo não existe o vaivém A→B→A sobre um kit persistido que a condição `operationScope === activeScope` da PR #119 exige. Troca de usuário também não contamina: o update filtra `.eq('user_id', userId)` (`useKitAutoSave.ts:76-83`).

4) O único retorno de nome de escopo possível é `u:new` → `u:ID` (`:274`) → reset (`:283`) → `u:new`. A gravação atrasada ali faz um INSERT de linha nova e a tela não tem kit aberto (sem `kitIdParam`) — o próprio efeito da PR #119 também não recarregaria nada nesse estado. Dano real: nenhum.

5) O "conserto" da PR é pior que o problema alegado: ao re-disparar o efeito, `refs/verif/pr119:src/pages/KitBuilderPage.tsx:207` chama `loadKit(...)` e `toast.success('Kit carregado para edição')` — uma gravação tardia sobrescreveria com a linha do banco tudo o que o usuário digitou depois, com toast de "kit carregado" no meio da edição. Troca uma divergência invisível por perda silenciosa de edição em memória.

NÃO VERIFICADO: não rodei a aplicação nem testes para reproduzir a corrida; a análise é leitura de código dos dois lados. O impacto alegado pelo próprio autor já era "baixo e derivado".
- **Nenhum teste na main trava a regra de não sobrescrever metadado editorial** — A parte factual da afirmação se confirma, mas ela não é uma lacuna de comportamento e a "proteção" da PR #119 não protege o que o item diz proteger.

1) Confirmado (sem disputa): na main não há teste tocando o fluxo. `git grep -l useTemplateSnapshot origin/main` só retorna src/hooks/useTemplateSnapshot.ts, src/hooks/useQuoteTemplates.ts, src/components/kit-builder/KitBuilderHeader.tsx, src/pages/KitBuilderPage.tsx (+3 docs e inventario/estado/rotas.json); `git grep -n "saveAsTemplate|TemplateSnapshot" origin/main -- tests e2e scripts` retorna zero; nenhum arquivo em tests/ cita `kit_templates`; `git ls-tree origin/main src/lib/kit-builder/` não tem `__tests__/`. Também não há guarda no banco: supabase/migrations/20260418183756_107f80f6-c724-4ce3-a61f-d3b256419118.sql:47-66 só filtra por papel admin e o único trigger é `trg_kit_templates_updated_at` (:68-70) — nada protege `category`/`is_active`.

2) Mas isto é um item derivado, não um comportamento ausente. O dano citado ("template desativado reaparece") é produzido pelo bug do item 1 — src/hooks/useTemplateSnapshot.ts:30 (`category: category || 'Geral'`) e :37 (`is_active: true`) indo também no caminho de UPDATE (:44-50), acionado em src/pages/KitBuilderPage.tsx:267-268 e src/components/kit-builder/KitBuilderHeader.tsx:80 — não pela ausência do teste. Corrigido o item 1, o dano restante é hipotético ("pode voltar"), não um comportamento que falte hoje.

3) A evidência da PR não é portável para a main e é mais fraca do que anunciada. O teste citado (refs/verif/pr119:src/lib/kit-builder/__tests__/persistence.test.ts:59-63) importa `buildKitTemplateUpdatePayload` de src/lib/kit-builder/persistence.ts (:117-119), módulo que não existe na main, cujo único consumidor é src/hooks/useKitPersistenceCoordinator.ts:115 — hook que também não existe na main (`git grep useKitPersistenceCoordinator origin/main` = vazio; a main escreve em kit_templates por useTemplateSnapshot.ts:46 e :55). Na main o equivalente `buildTemplatePayload` é função local NÃO exportada (useTemplateSnapshot.ts:26, só `useTemplateSnapshot` é exportado em :63), então o teste citado não pode sequer ser copiado: fechar essa "lacuna" exige o refactor inteiro da camada de persistência, não um arquivo de teste.

4) A própria PR #119 não trava a regra no ponto de escrita. O único teste que exercita o UPDATE real de kit_templates é refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:201-225: o mock `update = vi.fn(() => ({ eq: ... }))` (:201-203) descarta o payload e as asserções (:223-225) são apenas tabela, contagem de chamadas e toast — nenhuma verifica ausência de `category`/`is_active`. Ou seja, a regressão que o item teme (alguém, no próximo ajuste do builder, voltar a mandar os campos no `.update()`, p.ex. trocando `buildKitTemplateUpdatePayload` por `buildKitTemplatePayload`) passaria verde na suíte da PR #119. A "catraca" é só uma asserção de forma sobre um helper puro.

NÃO VERIFICADO: não rodei nenhuma suíte (leitura estática de origin/main e refs/verif/pr119 apenas); e não avaliei o mérito do item 1, que é real e reachable por admin (gate useRBAC em KitBuilderHeader.tsx:74,77).
- **items: a main serializa só 8 dos ~21 campos do KitItem** — REFUTADA — a diferença textual existe, mas não há comportamento faltando: nenhum campo "não observado" pode mudar sem que um campo observado mude junto.

1) A diferença citada é real (confirmei os dois lados):
- PR #119: `items: clone(kitState.items)` em `src/lib/kit-builder/persistence.ts:52`, tipo em `:9`.
- main: `items: kitState.items.map(...)` com 8 campos em `src/hooks/useKitAutoSave.ts:28-37`, contra o escritor `items_data: JSON.parse(JSON.stringify(kitState.items))` em `src/lib/kit-builder/custom-kit-payload.ts:52`.

2) Mas os 14 campos "fora da detecção" são FUNÇÃO DO `item.id`, que ESTÁ no snapshot (`useKitAutoSave.ts:29`). Em `src/hooks/useKitBuilderTransformers.ts:95-113`, `transformToKitItem` grava name/width/height/depth/volume/weight/material/category/isOptional/isReplaceable/allowsPersonalization/allowedVariantIds uma única vez, na construção do item, derivados do produto. Depois disso NENHUM caminho da main reescreve esses campos. Verifiquei TODOS os 11 `setSelectedItems` da main (`src/hooks/useKitBuilder.ts:183, 211, 220, 227, 254, 269, 286, 294, 342, 354, 374`):
- `:207-211` e `:220` (addItem) só mexem em `quantity` ou acrescentam elemento novo ao array;
- `:227` (removeItem) e `:294-303` (toggleOptionalItem) tiram/põem elemento;
- `:254-256` (quantity), `:269-281` (updateItemVariant → só `selectedVariantId`, `selectedColor`, `selectedSize`, `sku`, `imageUrl`, `price`) e `:286-288` (color) tocam apenas campos observados;
- `:342-347` (reorderItems) muda a ordem, e o snapshot é um array ordenado de ids (`useKitAutoSave.ts:28-37`) → detecta;
- `:183`, `:354`, `:374` substituem o array inteiro.
Ou seja: mudar um dos 14 campos exige trocar o item (id novo) ou recarregar o array — ambos detectados.

3) Três dos campos listados nem são populados no montador: `isPackaging` (`types.ts:69`), `personalizationNotes` (`types.ts:72`) e `personalization` do item (`types.ts:76`) não aparecem no literal de `transformToKitItem` (`useKitBuilderTransformers.ts:95-113`) nem em qualquer `setSelectedItems`. A personalização por item vive em `kitState.personalization.items[itemId]`, escrita em `useKitBuilder.ts:306-315` — e ESSE objeto ESTÁ no snapshot da main (`useKitAutoSave.ts:38`). Os usos de `item.personalizationNotes`/`item.isPackaging` que existem na main são de outro tipo, na página de produtos (`src/components/products/kit-composition/KitComponentCard.tsx:98,108-115`), fora do montador.

4) A comparação ainda é entre arquiteturas diferentes: a PR #119 APAGA `useKitAutoSave` (não existe `src/hooks/useKitAutoSave.ts` em refs/verif/pr119) e troca por `useKitPersistenceCoordinator` (`refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:243-248`). O snapshot da PR também carrega derivados (`prices`, `volumeUsagePercent`, `isValid` — `persistence.ts:53-63`), o que só aumenta disparo, não cobre caso algum que a main perca.

5) O próprio autor da alegação já escreve "NÃO VERIFICADO que exista hoje um caminho de UI que faça isso" e "O risco é de regressão futura, não de perda medida hoje". Risco hipotético de regressão não é lacuna de comportamento na main.

Conclusão: nenhum dado do vendedor deixa de ser gravado hoje por causa disso. Lacuna inexistente na prática.
- **volumeUsagePercent fora do snapshot da main** — A afirmação confunde o papel do snapshot nas duas arquiteturas e o cenário de perda exige um caminho de código que não existe na main.

1) Na PR #119 o snapshot É a fonte do payload — por isso `volumeUsagePercent` precisa estar nele; não é "rede de segurança". Prova: `src/lib/kit-builder/persistence.ts:62` monta o snapshot com `volumeUsagePercent: kitState.volumeUsagePercent`, e `persistence.ts:69,82` grava `volume_usage_percent: snapshot.volumeUsagePercent` em `buildCustomKitPayload(userId, snapshot)`; o chamador é `src/hooks/useKitPersistenceCoordinator.ts:79` (`const payload = buildCustomKitPayload(userId, snapshot)`). Sem o campo no snapshot, a coluna simplesmente não seria gravada lá.

2) Na main o payload vem do ESTADO VIVO, não do snapshot. `src/hooks/useKitAutoSave.ts:125` chama `buildCustomKitPayload(user.id, kitState, kitQuantity)` e `src/lib/kit-builder/custom-kit-payload.ts:45,59` lê `volume_usage_percent: kitState.volumeUsagePercent` no instante da gravação. O snapshot de `useKitAutoSave.ts:26-45` é só string de comparação para detectar sujeira (`useKitAutoSave.ts:161`: `if (newSnapshot === persistedSnapshotRef.current) return;`). Consequência: toda gravação da main grava o `volume_usage_percent` atual; nunca grava valor defasado.

3) O dano alegado exige `item.volume` mudar no lugar, sem add/remove — e nenhum caminho da main faz isso. Todas as mutações de `selectedItems` em `src/hooks/useKitBuilder.ts`: addItem (:207-211 e :220), removeItem (:227), updateItemQuantity (:254-258), updateItemVariant (:269-282), updateItemColor (:285-291), toggleOptionalItem (:293-304), reorderItems (:341-348), resetKit (:354), loadKit (:374). Nenhuma toca `volume`, `width`, `height` ou `depth`; a troca de variante (:269-282) altera só `selectedVariantId/selectedColor/selectedSize/sku/imageUrl/price`, todos presentes no subconjunto do snapshot (`useKitAutoSave.ts:31-37`). `item.volume` é calculado uma única vez em `src/hooks/useKitBuilderTransformers.ts:93` e atribuído em `:104`; `git grep -E "\.volume\s*=[^=]|volume:\s" origin/main -- src/` não retorna nenhuma outra escrita em `KitItem.volume` (apenas `src/lib/kit-builder/mock-data.ts:75-165` e o tipo em `src/lib/kit-builder/types.ts:48`).

4) As demais entradas de `calculateVolumeUsagePercent` (`src/hooks/useKitBuilder.ts:58-62`) já estão cobertas pelo snapshot da main: `box` entra inteiro (`useKitAutoSave.ts:30`) e `item.quantity` entra item a item (`useKitAutoSave.ts:32`), e `src/lib/kit-builder/volume-calculator.ts:40` depende só de `volume × quantity` e de `box.internalVolume`. Trocar caixa, adicionar, remover, reordenar ou mudar quantidade dispara autosave na main.

5) A própria afirmação admite "nenhum fluxo de UI altera `item.volume` sem add/remove do array" e marca o impacto como "NÃO VERIFICADO como perda atual". Mesmo num hipotético caminho futuro, a main erraria apenas o momento do autosave, nunca o valor gravado (ponto 2).

Único fato correto da afirmação: `volumeUsagePercent` realmente não aparece em `useKitAutoSave.ts:26-45`. Isso é diferença de desenho (hash enxuto de detecção vs. snapshot-payload), não lacuna de comportamento nem dano real.
- **isValid fora do snapshot da main — e isValid define o status gravado** — REFUTADA. `isValid` é campo derivado puro: incluí-lo no snapshot não acrescenta detecção nem na PR #119, e a main grava o status sempre a partir do estado vivo.

1) `isValid` não tem insumo próprio — depende só de (box, items, quantidade). `src/hooks/useKitBuilder.ts:66` calcula `volumeUsagePercent` de `input.items`+`input.box`; `:63` calcula `itemsWeight = Σ item.weight*item.quantity`; `:82` faz `isValid: validationErrors.length === 0` a partir de `kitValidationErrors(box, items, volumeUsagePercent, itemsWeight)` (`:31-45`). Logo `isValid = f(box, items)`.

2) Esses insumos ESTÃO no snapshot da main. `src/hooks/useKitAutoSave.ts:27` grava o objeto `box` inteiro (com `internalVolume` e `maxWeight`, `src/lib/kit-builder/types.ts:24` e `:34`); `:29` `id`, `:30` `quantity`, `:31` `selectedVariantId`; `:41` `qty`. Falta `weight`/`width`/`height`/`depth` por item — mas esses campos NUNCA mudam para um `id` já selecionado: os únicos mutadores de `selectedItems` são `addItem` (`src/hooks/useKitBuilder.ts:187-224`), `removeItem` (`:226`), `updateItemQuantity` (`:234-259`), `updateItemVariant` (`:261-283`), `updateItemColor` (`:285`), `toggleOptionalItem` (`:293`), `reorderItems` (`:341`), `resetKit` (`:350`) e `loadKit` (`:362`). O de variante (`:269-282`) copia apenas `selectedVariantId`, `selectedColor`, `selectedSize`, `sku`, `imageUrl`, `price` — não toca `weight`, `width`, `height`, `depth` nem `volume`. Não existe, no código da main, caminho em que `isValid` vire sem que o snapshot mude. A "perda potencial" alegada não é potencial: é inalcançável.

3) O próprio campo é redundante na PR #119: `src/lib/kit-builder/persistence.ts:51-52` clona `box` e `items` INTEIROS no snapshot, e `:63` deriva `isValid` deles. Um campo derivado de outros dois já presentes não muda o resultado de `serializeKitPersistenceSnapshot` (`:67-69`) em nenhum cenário. Ou seja, a main não carece de comportamento algum que a PR tenha.

4) O status gravado na main nunca é obsoleto em relação à gravação feita: o snapshot é só verificação de sujeira (`src/hooks/useKitAutoSave.ts:171-177`); o payload é montado do estado VIVO no instante do save — `src/hooks/useKitAutoSave.ts:125` (`buildCustomKitPayload(user.id, kitState, kitQuantity)`) → `src/lib/kit-builder/custom-kit-payload.ts:49` (`status: customKitStatus(kitState)`, `:24-26`). Como o efeito reagenda o timer a cada mudança de `kitState` (`:182` lista `kitState` nas deps), qualquer alteração observada reescreve o status correto. Na PR #119 o payload sai do snapshot capturado (`src/hooks/useKitPersistenceCoordinator.ts:79` e `:297`), ou seja, não é mais fresco que o da main.

5) O selo de RecentKitsWidget (`src/components/dashboard/RecentKitsWidget.tsx:67-68`, lendo `status` de `:29`) também é atualizado pelo salvamento manual, que usa o mesmo payload de estado vivo: `src/hooks/useCustomKitPersistence.ts:101` (`buildCustomKitPayload(user.id, kitState, kitQuantity)`), chamado por `src/pages/KitBuilderPage.tsx:273`.

6) A própria afirmação se autodeclara sem dano ("a perda é potencial — NÃO VERIFICADO como perda atual"). Sem cenário executável, não há lacuna de comportamento a recuperar.

NÃO VERIFICADO: não executei o fluxo no navegador nem consultei linhas reais de `custom_kits`; a refutação é por leitura de código dos dois lados.
- **main tem DOIS caminhos independentes (detector e payload); a PR #119 tem um só** — REFUTADA. A divergência alegada é inalcançável na main: todo campo do payload que não está no detector é função pura dos campos que ESTÃO no detector.

1) Os 4 "grupos divergentes" são derivados, não estado.
`src/hooks/useKitBuilder.ts:161-169` monta `kitState` com `useMemo(() => buildKitState({name, kitType, box, items, personalization, identity, quantity}), [kitName, kitType, selectedBox, selectedItems, personalization, kitQuantity, identity])`. Dentro de `buildKitState` (`src/hooks/useKitBuilder.ts:57-85`): `volumeUsagePercent` vem de `calculateVolumeUsagePercent(totalItemsVolume, boxVolume)` (:62), `boxPrice/itemsPrice/personalizationPrice/totalPrice` de `calculateTotalKitPrice(box, items, personalization, quantity)` (:65, :78-81) e `isValid` de `validationErrors.length === 0` sobre `kitValidationErrors(box, items, volumeUsagePercent, itemsWeight)` (:66, :82). Não há `setState` para nenhum deles — não existem como estado próprio. O detector `createSnapshot` (`src/hooks/useKitAutoSave.ts:25-45`) hasheia exatamente box, items, personalization, name, kitType, qty e identity. Logo nenhum desses derivados pode mudar sem que o hash mude antes. O `status` do payload (`src/lib/kit-builder/custom-kit-payload.ts:49` via `customKitStatus` :24-26) depende só de `isValid`, idem.

2) O "items completos vs subset" também não é alcançável.
O payload grava `items` inteiros (`custom-kit-payload.ts:52`); o detector hasheia id, quantity, selectedVariantId, selectedColor, selectedSize, sku, price, imageUrl (`useKitAutoSave.ts:29-39`). Varri TODOS os mutadores de `selectedItems` na main: `addItem` (`useKitBuilder.ts:187-224`, muda id/quantity), `removeItem` (:226-232), `updateItemQuantity` (:234-259), `updateItemVariant` (:261-283 — escreve só selectedVariantId, selectedColor, selectedSize, sku, imageUrl, price: todos hasheados), `updateItemColor` (:285-291), `toggleOptionalItem` (:293-304, add/remove por id) e `reorderItems` (:341-348 — ordem do array, que o hash preserva porque é `items.map` em ordem). Campos fora do subset (name, width/height/depth, volume, weight, category, material, flags, allowedVariantIds) só entram junto com um item novo via `addItem`/`toggleOptionalItem`, que já alteram o hash. `loadKit` (:362-387) é troca de kit e cai no efeito de escopo (`useKitAutoSave.ts:187-216`), que rebaseia o snapshot.

3) O cabeçalho citado documenta OUTRA classe de bug, e essa já está fechada na main.
`src/lib/kit-builder/custom-kit-payload.ts:1-11` fala de salvamento manual vs automático montando payloads diferentes ("o automático fixava `status: 'draft'` e não enviava identidade"). Na main os dois montam o MESMO payload pelo mesmo módulo: `src/hooks/useCustomKitPersistence.ts:101` e `src/hooks/useKitAutoSave.ts:125` chamam `buildCustomKitPayload(user.id, kitState, kitQuantity)`. A alegação transplanta esse cabeçalho para uma classe diferente (detector vs payload) que ele não descreve. E o acoplamento detector↔payload está documentado no próprio detector: `useKitAutoSave.ts:41-44` ("A identidade entra no snapshot porque entrou no payload").

4) A própria alegação admite dano zero, e o ganho da PR é menor do que afirma.
Texto da alegação: "nenhum causa perda medida"; o resto é risco hipotético de campo futuro — não é comportamento faltando na main. E na PR #119 a "fonte única" continua sendo uma lista escrita à mão: `createKitPersistenceSnapshot` (`refs/verif/pr119:src/lib/kit-builder/persistence.ts:44-63`) mapeia KitState→snapshot campo a campo; `buildCustomKitPayload(userId, snapshot)` (:70-92) e `isDirty(serializedSnapshot)` (`refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts:243-248, 347`) só consomem esse mapa. A PR move a lista de camada (2 listas → 1), não a elimina; é preferência de manutenibilidade, não correção de comportamento. Colateral: o hash da PR inclui clone integral de `items` e os derivados (prices, volumeUsagePercent, isValid) — mais superfície para disparar gravação do que o subset deliberado da main.

NÃO VERIFICADO: não executei o app nem testes; a conclusão é por leitura de código dos dois refs. Não encontrei na main teste que trave a coerência detector↔payload (`tests/lib/custom-kit-status.test.ts:13-29` cobre só `customKitStatus`) — isso é lacuna de teste, não de comportamento.
- **Troca de kit A → B → A sem teste de geração/baseline** — REFUTADA em quatro pontos, todos verificados por leitura e execução.

1) A evidência citada sobre a main está factualmente errada. A afirmação diz "nenhum [caso] troca currentKitId". Troca sim: `tests/hooks/useKitAutoSave.test.tsx:165-200` ("preserva a edição enfileirada quando o pai adota o ID recém-criado") renderiza o hook com `const [kitId, setKitId] = useState<string>()` (`:172`) passando `kitId` como `currentKitId` e `setKitId` como `onKitIdCreated` (`:175`); o próprio hook muda esse valor em `src/hooks/useKitAutoSave.ts:116` (`onKitIdCreated?.(createdId)`). Isso faz o efeito de escopo `src/hooks/useKitAutoSave.ts:187-216` rodar com escopo alterado (`usuario-1:new` → `usuario-1:kit-criado`) e exercitar o ramo `isCreatedKitAdoption` (`:57-65`, `:194-203`). A asserção `:196-199` (update chamado 1x com "Edição feita durante a criação", sem erro) só passa se a geração NÃO tiver sido invalidada — ou seja, a máquina de escopo/geração está sob teste na main, não "sem nenhum teste". A diferença real é de cobertura de um ramo (dois ids distintos), não ausência de teste.

2) O comportamento alegado como ausente existe e funciona — provei rodando. Escrevi em worktree temporário (já removido; `git status` limpo) dois casos no formato da suíte da main, contra `src/hooks/useKitAutoSave.ts` idêntico ao de origin/main (`git diff --stat origin/main HEAD -- src/hooks/useKitAutoSave.ts tests/hooks/useKitAutoSave.test.tsx src/pages/KitBuilderPage.tsx` = vazio): (a) gravação pendente de A, troca para B, volta para A, resposta antiga resolve → `lastSavedAt` continua `null`, `lastSaveError` null, `autoSavedKitId` 'kit-a'; (b) A→B→A sem editar → nenhum `insert`/`update` em 10s. `npx vitest run` com esses dois mais a suíte existente: **8 testes passaram, 2 arquivos**. O guard é `src/hooks/useKitAutoSave.ts:136` (`operationGeneration !== scopeGenerationRef.current → return`), com rebaseline em `:206,213-215`. Logo não há regressão latente nem dano hoje: é pedido de teste adicional, não lacuna de comportamento.

3) Os dois casos citados da PR #119 não têm "equivalente" porque testam um módulo que a main não possui: `refs/verif/pr119:src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:40-54` importa `KitPersistenceCoordinator` de `refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts`, e `refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:132-157` testa `refs/verif/pr119:src/hooks/useKitPersistenceCoordinator.ts`. Nenhum dos dois arquivos existe em origin/main (`git ls-tree -r --name-only origin/main | grep -i coordinator` → vazio). Comparar "casos sem equivalente" aqui é comparar a suíte de uma reescrita de arquitetura com a suíte do hook que a main manteve; não mede falta de cobertura do comportamento.

4) Onde há diferença semântica, a main é mais conservadora que a PR, não pior. O teste da PR aceita que a gravação velha de A seja **executada** e só marcada como obsoleta: `refs/verif/pr119:src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:51` espera `{ stale: true, executed: true }`. A main, quando a troca acontece com a gravação ainda na fila, retorna antes de emitir o write (`src/hooks/useKitAutoSave.ts:134-137`: `await previousSave` → guard de geração → só então `persistAutoSave`), ou seja, não escreve na linha do kit abandonado. A "melhoria" da PR, nesse ponto, é mais permissiva.

5) Reforço sobre o dano alegado: no único consumidor (`src/pages/KitBuilderPage.tsx:169-170`), `currentKitId` é estado local inicializado do parâmetro `?kit=` (`:148`) e só muda em três pontos — adoção do id criado (`:170`), id devolvido pelo salvamento manual (`:274`) e reset para `undefined` (`:283`). Não existe efeito sincronizando `kitIdParam → setCurrentKitId`, e o carregamento do kit é travado por `hasLoadedRef` (`:219-220`). A transição de prop A→B→A com dois ids distintos, na mesma montagem, não tem produtor no produto; se houver remontagem de rota, todas as refs nascem zeradas e também não há contaminação. O cenário "usuário vê 'salvo' num kit que não foi salvo" não tem caminho demonstrado na main.

NÃO VERIFICADO: se a rota `/montar-kit` remonta ou não ao mudar só a query string (não inspecionei o renderer de `src/routes/config/tools.ts:27`); irrelevante para a conclusão, porque nos dois desfechos o dano não ocorre.

Conclusão: a lógica existe (`src/hooks/useKitAutoSave.ts:106-107,127,136,139,145,155,187-216`), está parcialmente testada (`tests/hooks/useKitAutoSave.test.tsx:165-200`) e passa nos dois cenários A→B→A quando executada. O que resta é cobertura extra de um ramo — item de backlog de testes, não lacuna funcional com dano real.
- **Snapshot de mudança ignora preços, volume, validade e quantidade** — A lacuna não existe na main, por três razões verificadas no código.

1) Preços são derivados puros dos campos que já estão no snapshot. origin/main:src/hooks/useKitBuilder.ts:57-85 (buildKitState) calcula boxPrice/itemsPrice/personalizationPrice/totalPrice/volumeUsagePercent/isValid, e o useMemo em origin/main:src/hooks/useKitBuilder.ts:161-169 tem como únicas entradas kitName, kitType, selectedBox, selectedItems, personalization, kitQuantity e identity — não há estado de preço independente. origin/main:src/lib/kit-builder/price-calculator.ts:56-86 depende só de box.price, item.price, item.quantity, personalization e kitQuantity, todos presentes no snapshot de origin/main:src/hooks/useKitAutoSave.ts:25-46 (box inteiro na linha 27, item.quantity linha 30, item.price linha 35, personalization linha 38, qty linha 41). Portanto é impossível o preço calculado mudar sem o snapshot mudar. Incluir prices no snapshot, como refs/verif/pr119:src/lib/kit-builder/persistence.ts:56-61, é redundância, não sensibilidade extra.

2) O cenário concreto alegado (recálculo após troca de variante com mesmo id/quantidade) é falso. origin/main:src/hooks/useKitBuilder.ts:260-282 (updateItemVariant) sempre grava selectedVariantId (linha 274) e selectedColor (linha 275), ambos no snapshot em origin/main:src/hooks/useKitAutoSave.ts:31-32; sku, imageUrl e price da variante (linhas 277-279) também estão no snapshot (linhas 34-36). A troca de variante dispara autosave, e nem altera volume/weight.

3) Não há caminho na main que altere volume ou peso de um item mantendo todos os campos do snapshot iguais. Todos os setSelectedItems de origin/main:src/hooks/useKitBuilder.ts (linhas 183, 211, 220, 227, 254, 269, 286, 294, 342, 354, 374) mudam a lista de ids, a quantity (208/254), a variante/cor (269/286), a ordem do array (342) ou zeram a lista (183/354/374) — tudo capturado pelo snapshot; refetchItems não reescreve selectedItems.

Reparos na evidência citada: (a) o payload gravado não vem do snapshot — origin/main:src/hooks/useKitAutoSave.ts:125 monta buildCustomKitPayload(user.id, kitState, kitQuantity) a partir do estado vivo, que inclui box_price/items_price/personalization_price/total_price/volume_usage_percent e status via customKitStatus (origin/main:src/lib/kit-builder/custom-kit-payload.ts:25-27,49,55-60), logo nunca grava números velhos quando um save ocorre; (b) o teste citado como prova, refs/verif/pr119:src/lib/kit-builder/__tests__/persistence.test.ts:35-45, apenas verifica o formato de um objeto puro sobre um KitState literal com box: null e items: [] — não exercita detecção de alteração, hook, debounce nem gravação, e passaria contra qualquer implementação que devolvesse esses campos.

Única diferença real (não a alegada): refs/verif/pr119:src/lib/kit-builder/persistence.ts:52 clona items por inteiro (inclui volume/weight), enquanto origin/main:src/hooks/useKitAutoSave.ts:29-37 projeta campos. Como nenhum fluxo da main altera volume/weight isoladamente, a diferença é teórica, sem gatilho, e custa serialização maior a cada render.
- **Cópia para template e adoção de baseline por geração (API do coordinator)** — REFUTADA. Os três testes citados só existem porque a PR #119 criou o perigo que eles cobrem; na main o perigo não existe por construção, e o próprio autor da afirmação já admite que o impacto é "baixo hoje" e "vacuamente verdadeiro".

1) "serializa uma cópia sem trocar alvo nem limpar a sujeira" (refs/verif/pr119:src/lib/kit-builder/__tests__/persistence-coordinator.test.ts:117-131) e "cria template pela fila sem limpar alterações do kit customizado" (refs/verif/pr119:src/hooks/__tests__/useKitPersistenceCoordinator.test.tsx:228-252) testam os flags `adoptTarget:false`/`adoptBaseline:false`, que existem apenas porque a PR passou a criar template PELA MESMA FILA do autosave: refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:17-18 (declaração dos flags) e :77-78 (`if (input.adoptTarget !== false && result.targetId) this.targetId = ...` / `if (input.adoptBaseline !== false) this.persistedSnapshot = ...`). Na main o salvar-como-template é mutation React Query totalmente separada, sem nenhum estado compartilhado com o autosave: origin/main:src/hooks/useTemplateSnapshot.ts:63-79 (retorna só `saveAsTemplate`/`isSavingTemplate`, escreve apenas em `kit_templates` via :42-61) e é chamada em origin/main:src/pages/KitBuilderPage.tsx:268, dentro de `handleSaveKit` (:265-267: `if (templateIdParam) { await saveAsTemplate(...); return; }`) — retorna antes de tocar em `saveKit`/`setCurrentKitId`. O autosave vive em instância isolada, origin/main:src/pages/KitBuilderPage.tsx:169-171, e seu alvo e baseline são refs privadas do hook (origin/main:src/hooks/useKitAutoSave.ts:103-108 `persistedSnapshotRef`/`kitIdRef`), não exportadas (:224 retorna só `lastSavedAt, isSaving, autoSavedKitId, lastSaveError, retry`). Logo é IMPOSSÍVEL, na main, a criação de template trocar o alvo ou limpar a sujeira do kit. Teste de propriedade garantida por estrutura não é cobertura faltante.

2) "adota baseline somente na geração ainda ativa" (refs/verif/pr119:.../persistence-coordinator.test.ts:106-115) cobre `adoptBaseline(snapshot, expectedGeneration)` — API pública assíncrona introduzida pela PR (refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:58-59: `if (expectedGeneration !== this.generation) return false;`). Na main não há adoção de baseline fora de ordem para proteger: o baseline é recalculado SINCRONAMENTE a partir das props, no mesmo tick em que a geração é incrementada — origin/main:src/hooks/useKitAutoSave.ts:206 (`scopeGenerationRef.current += 1`) seguido de :213-215 (`const snapshot = createSnapshot(kitState, kitQuantity); persistedSnapshotRef.current = snapshot; latestSnapshotRef.current = snapshot;`), tudo dentro do mesmo efeito (:187-216). Não existindo callback assíncrono que adote baseline, não há geração obsoleta possível. A proteção que importa — resposta antiga não contaminar escopo novo — a main já tem e exercita: origin/main:src/hooks/useKitAutoSave.ts:136, :139 e :145 (checagens de `operationGeneration !== scopeGenerationRef.current` antes de adotar snapshot, marcar erro ou gravar), mais a adoção do id recém-criado em :57-65 e :194-203.

3) A "melhoria" é, nesse ponto, pior: o coordinator da PR acopla template e autosave na mesma fila e protege o acoplamento com flags booleanos que fazem opt-OUT, com default perigoso (refs/verif/pr119:src/lib/kit-builder/persistence-coordinator.ts:77-78 — `!== false`): qualquer chamador futuro que esqueça `adoptTarget:false` passa a sobrescrever o id do kit com o id do template recém-criado e a marcar o kit sujo como salvo. A main elimina a classe inteira de bug ao não acoplar.

Nenhum dano real na main: NÃO VERIFICADO nada em contrário — li os dois lados e não há caminho em que "Salvar como template" na main altere alvo ou sujeira do autosave.


