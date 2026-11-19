# PLANO COMPLETO COM 36 ETAPAS — o sistema não sustenta 100 correções reais

Plano derivado dos 36 achados de [AUDITORIA.md](./AUDITORIA.md), coletados em 24/09/2026. A contagem se refere às evidências desta auditoria: não significa que os pontos não verificados estejam livres de problemas.

**Status: somente planejado. Nenhuma etapa foi executada nesta missão.** Estimativas de diff são aproximações, não medições. Novos nomes de funções são propostas, não objetos cuja existência foi presumida.

As etapas seguem severidade e dependências. Autorização de integrações e contratos de dados precedem refinamentos de UX. E-001 é pré-requisito de toda alteração posterior, mesmo quando a dependência direta foi omitida em favor de uma etapa intermediária.

- Cada etapa só conclui com sua verificação registrada no SHA correspondente.
- Usar worktree isolado e preservar alterações anteriores; nenhuma instalação, migration ou teste mutante faz parte desta auditoria.
- Não editar o catálogo externo: `doufsxqlfjyuvxuezpln` permanece somente leitura.
- Antes de qualquer SQL persistente, confirmar projeto `cfmzkthhgliqelozlmwu`, schema, ledger e privilégios efetivos. Migrations propostas não podem substituir essa verificação.
- Registrar resultado de erro e concorrência, não apenas cenário nominal. Testes de envio usam destinatários fictícios.
- O ambiente está em construção. Não há autorização implícita neste documento para enviar mensagens reais, assumir novos custos ou executar operações destrutivas.
- Não marcar implementação como implantada sem evidência do ambiente alvo. Não elevar baseline de tipagem para ocultar falhas.

### E-001 · [P1] · infra — Fixar uma base reproduzível sem perder o trabalho local

Corrige: A-001, A-003

Onde: repositório local · package-lock.json · package.json · .typecheck-baseline.json

Ação:

- Preservar as três alterações locais identificadas e criar worktree isolado a partir de uma main cujo SHA seja registrado.
- Instalar pelo lockfile com Node 24 nessa cópia e repetir o typecheck sem alterar o baseline para esconder erros; separar diagnósticos persistentes dos causados pelo SDK/compilador divergentes.

Diff estimado: 0 linhas de produto; worktree e instalação isolados

Depende de: —

Verificação: Registrar SHA local/remoto, git status, versões instaladas versus lock e resultado de tsc --noEmit para app/node; explicar qualquer diferença restante.

Risco: Perda de alterações durante reconciliação; preservar cópia verificável antes de mudar referências. Não descartar secretNormalizers.ts nem a documentação modificada.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-002 · [P1] · integrações — Autorizar disparo, teste e replay de webhooks

Corrige: A-022

Onde: supabase/functions/webhook-dispatcher/index.ts · _shared/authorize.ts · _shared/edge-authz-manifest.ts

Ação:

- Exigir credencial interna validada para disparos de serviço e authorize(supervisor) para teste/replay administrativo, antes de consultar destinos.
- Negar métodos não previstos e falhar antes de qualquer fetch quando identidade/escopo não forem válidos; atualizar os chamadores administrativos já inventariados.

Diff estimado: ~80–120 linhas · handler, manifesto e até 2 chamadores

Depende de: E-001

Verificação: Sem token, usuário comum e credencial interna inválida devem ser negados sem fetch; supervisor pode testar/repetir apenas o fluxo autorizado. Testes usam destinatário local fictício.

Risco: Cron antigo pode perder acesso; inventariar o chamador e disponibilizar sua credencial antes do corte. Não aceitar a publishable key como autorização de serviço.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-003 · [P1] · integrações — Vincular sincronização Bitrix ao orçamento e usuário persistidos

Corrige: A-026

Onde: supabase/functions/sync-quote-bitrix/index.ts · chamador da sincronização de orçamento

Ação:

- Validar sessão, receber identificador do orçamento e consultar cabeçalho/itens com escopo do ator antes de montar o payload do n8n.
- Resolver vendedor e empresa a partir do vínculo autorizado; não aceitar sellerEmail, quote_number e conteúdo comercial do body como fonte de identidade.

Diff estimado: ~100–160 linhas · handler e contrato do chamador

Depende de: E-001

Verificação: Ator de outro orçamento, sellerEmail adulterado e empresa incompatível não geram envio; orçamento permitido produz o payload esperado em destino mock.

Risco: Consumidores antigos podem enviar apenas o objeto completo; introduzir contrato por ID de forma compatível e bloquear o envio quando não houver vínculo verificável.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-004 · [P1] · frontend/API — Retirar o relacionamento inexistente das consultas de histórico

Corrige: A-009

Onde: src/components/quotes/QuoteHistoryTimeline.tsx · QuoteConsolidationPanel.tsx

Ação:

- Consultar quote_history sem profiles(full_name), coletar os user_id retornados e buscar profiles por user_id em lote, respeitando RLS.
- Mapear nomes disponíveis sem esconder eventos cujo perfil não seja visível; compartilhar apenas a pequena rotina de resolução entre as duas telas.

Diff estimado: ~60–100 linhas · 2 componentes e helper focal

Depende de: E-001

Verificação: Repetir leitura de contrato no Supabase e obter ausência de PGRST200; ensaiar autor visível, autor oculto e histórico vazio. Não usar mock de FK inexistente como única evidência.

Risco: RLS pode ocultar perfis; manter rótulo neutro sem elevar privilégio nem usar service_role no navegador.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-005 · [P1] · UX — Exibir falha e recuperação na timeline

Corrige: A-007

Onde: src/components/quotes/QuoteHistoryTimeline.tsx

Ação:

- Consumir isError/error e refetch da query antes de renderizar o estado vazio.
- Exibir mensagem de indisponibilidade e ação de nova tentativa; reservar Nenhum evento registrado para resposta válida sem linhas.

Diff estimado: ~20–35 linhas · 1 componente

Depende de: E-004

Verificação: Forçar rejeição de rede e erro de permissão em teste do componente; nenhum deles pode renderizar histórico vazio. Retry bem-sucedido mostra eventos.

Risco: Mensagem técnica pode revelar detalhes internos; usar texto público estável e registrar diagnóstico redigido.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-006 · [P1] · catálogo/UX — Distinguir catálogo indisponível de estoque insuficiente no kit

Corrige: A-020

Onde: src/hooks/useKitStockForecast.ts · src/components/kit-builder/KitStockForecastCard.tsx

Ação:

- Remover o catch que converte erro em records vazio e preservar o estado de falha da query.
- Mostrar previsão indisponível com retry no card, sem calcular déficit fictício a partir de falha de integração.

Diff estimado: ~25–45 linhas · hook e card

Depende de: E-001

Verificação: Reexecutar SIM-KIT-2: rejeição da bridge deve produzir estado de erro, não déficit 100. Resposta válida vazia continua distinguível.

Risco: Consumidor hoje depende de null silencioso; manter layout estável e evitar refetch infinito.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-007 · [P1] · frontend/contrato — Entregar itens reais à consolidação

Corrige: A-013

Onde: src/services/QuoteService.ts · src/pages/GestorOrcamentos.tsx · QuoteConsolidationPanel.tsx

Ação:

- Criar consulta focal de consolidação que hidrate quote_items e personalizações para os cabeçalhos elegíveis, com lotes limitados e escopo existente.
- Tipar o retorno com items obrigatório nesse fluxo e tratar loading/erro antes de apresentar totais; não adicionar N+1 a todas as listagens.

Diff estimado: ~70–110 linhas · serviço, tipo e consumidor

Depende de: E-001

Verificação: Orçamento sintético com 2 itens deve produzir2 itens no painel e quantidades corretas; erro de itens não pode apresentar total zero como válido.

Risco: Resposta maior e limite REST nos filhos; usar paginação/lotes explícitos e não assumir que um embed sempre devolve todas as linhas.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-008 · [P1] · catálogo — Calcular a data do kit pela cobertura das quantidades

Corrige: A-019

Onde: src/hooks/useKitStockForecast.ts · KitStockForecastCard.tsx

Ação:

- Acumular entradas previstas em ordem de data até cobrir o déficit de cada produto, sem reduzir tudo à primeira entrada.
- Só apresentar data ideal quando todos os itens deficientes tiverem cobertura; quando o contrato da fonte não fornecer entradas suficientes, apresentar previsão indeterminada.

Diff estimado: ~70–110 linhas · hook e mensagens do card

Depende de: E-006

Verificação: SIM-KIT-1 deve retornar data indeterminada; coberturas parciais, duas entradas suficientes e um item sem previsão devem produzir resultados distintos.

Risco: Fonte pode informar somente próxima entrada, não calendário completo; não inventar reposições futuras nem prometer estoque reservado.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-009 · [P1] · integrações — Condicionar o ACK do webhook à persistência

Corrige: A-024

Onde: supabase/functions/webhook-inbound/index.ts · webhook-dispatcher/index.ts

Ação:

- Verificar error nos registros de recebimento/entrega e retornar falha recuperável quando o evento não puder ser persistido.
- Separar assinatura válida, recebimento persistido e processamento de negócio; não definir processed=true apenas pela validade do HMAC.

Diff estimado: ~45–75 linhas · 2 handlers

Depende de: E-002

Verificação: Reexecutar SIM-WEBHOOK: insert com erro não pode responder received:true/200; evento válido persistido tem estado coerente. Falha do log de saída deve ficar observável.

Risco: Remetente pode repetir evento após erro; preservar identificação do evento e coordenar a deduplicação do destino antes de reenvios em massa.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-010 · [P1] · infra — Restabelecer execução dos checks bloqueados

Corrige: A-029

Onde: GitHub Actions do repositório · checks107633633050/107633636059

Ação:

- Resolver com o responsável pela conta o limite de uso que impediu o início dos jobs; qualquer aumento com custo exige sua autorização específica.
- Após liberar runners, executar os workflows para o SHA alvo e separar falha de orçamento de falhas reais de código/SQL.

Diff estimado: 0 linhas de produto; configuração de uso e novas execuções

Depende de: E-001

Verificação: Novos runs devem ter jobs iniciados e logs de etapas executadas; anotar SHA, IDs e conclusões. Não aceitar apenas status enfileirado.

Risco: Pode envolver custo e continuará pendente se não autorizado; não declarar testes aprovados nem desativá-los para obter verde.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-011 · [P1] · banco — Eliminar a colisão histórica de retorno no bootstrap SQL

Corrige: A-028

Onde: supabase/migrations/004_notification_functions.sql · 20260312110229_71c6cfbf-a5f2-4dc2-9e64-e8417272a070.sql · nova migration de compatibilidade

Classe (banco): aditiva no banco existente; exceção auditada de bootstrap histórico, sem DROP de função aplicada

Ação:

- Comparar primeiro ledger, assinaturas e consumidores; manter a assinatura legada aplicada sem tentar mudar seu retorno por CREATE OR REPLACE.
- Separar a implementação contadora sob nome novo, proposto cleanup_old_notifications_count_v1(), no bootstrap conflitante e numa migration forward equivalente; manter a função VOID legada da outra migration.
- Submeter a exceção histórica com hashes/justificativa e testar replay limpo e upgrade de cada assinatura existente, sem marcar migration como aplicada sem SQL correspondente.

Diff estimado: ~50–100 linhas · trecho histórico focal, migration aditiva e fixture de replay

Depende de: E-001, E-010

Verificação: Preview limpo percorre ambas as migrations sem 42P13; instâncias de teste com assinatura INT e VOID recebem a nova função sem mudar o contrato legado. Comparar ledger por conteúdo.

Risco: Modificar histórico sem inventário gera drift. Exigir leitura administrativa antes de aplicar em banco persistente; se for indispensável remover/trocar assinatura legada, abrir expand-contract separado com preview, rollback e consumidores migrados. Esta etapa não autoriza DROP nem repair fictício.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-012 · [P1] · infra — Impor os checks corretos na main

Corrige: A-002

Onde: GitHub branch protection de main · .github/workflows/ci.yml/security.yml

Ação:

- Vincular a proteção aos nomes reais dos checks de qualidade e segredos que voltaram a executar, habilitando aplicação das regras aos administradores.
- Manter revisão por PR e definir como falhas de preview impedem promoção; testar a regra com uma PR controlada de check falho.

Diff estimado: 0 linhas de produto; ajuste de proteção da branch

Depende de: E-010, E-011

Verificação: GET branches/main/protection mostra contextos exigidos e enforce_admins=true; PR controlada com falha não pode ser integrada pelo fluxo normal.

Risco: Nome incorreto de check bloqueia merges indefinidamente; usar nomes obtidos dos runs efetivos e registrar procedimento de recuperação administrado.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-013 · [P1] · banco/backend — Criar orçamento e seus filhos numa transação

Corrige: A-004, A-005

Onde: QuoteService.create · useQuotes.createQuote · quotes/quote_items/quote_item_personalizations/quote_history · nova RPC

Classe (banco): aditiva

Ação:

- Introduzir RPC focal de criação com ator obtido da sessão, validação de campos/escopo e persistência de cabeçalho, itens, personalizações e evento na mesma transação.
- Substituir o caminho create do QuoteService e retirar o evento duplicado do cliente; preservar regras comerciais existentes e devolver identificação estável por item.

Diff estimado: ~160–230 linhas · migration, serviço, chamador e casos de falha

Depende de: E-011

Verificação: Falha forçada no segundo item ou numa personalização não deixa cabeçalho/filhos/evento parcial; sucesso produz exatamente um evento e mapeia personalizações ao item correto.

Risco: Totais, descontos e IDs podem divergir do contrato atual; comparar com fixtures comerciais existentes e negar campos de proprietário arbitrários.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-014 · [P1] · banco/backend — Editar orçamento atomicamente com a versão da tela

Corrige: A-004, A-005, A-011

Onde: QuoteService.update · quoteHelpers · nova RPC de edição · tabelas do orçamento

Classe (banco): aditiva

Ação:

- Enviar a row_version do snapshot editado, validar a versão sob lock no servidor e aplicar cabeçalho/filhos/eventos numa única transação.
- Remover o DELETE e reinserts REST independentes do caminho de edição e não substituir a versão esperada por uma leitura recém-feita.

Diff estimado: ~160–240 linhas · migration, serviço e contrato de edição

Depende de: E-013

Verificação: Dois editores partem da mesma versão: apenas um salva; o outro recebe conflito e preserva seu rascunho. Falha em filho reverte toda a edição e seu histórico.

Risco: Chamadores sem versão devem falhar explicitamente e recarregar; não usar fallback para a versão atual, que recriaria o bug.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-015 · [P1] · banco/backend — Confirmar mudança individual de status no servidor

Corrige: A-006, A-005

Onde: src/hooks/quotes/useQuotes.ts:updateQuoteStatus · quotes · quote_history · RPC de status

Classe (banco): aditiva

Ação:

- Exigir versão esperada e transição permitida na RPC; retornar o registro efetivamente atualizado e persistir o evento junto da alteração.
- Só emitir sucesso e efeitos posteriores quando o retorno comprovar uma linha alterada; representar conflito/negação sem histórico falso.

Diff estimado: ~90–140 linhas · migration, hook e testes de concorrência

Depende de: E-014

Verificação: Versão obsoleta, registro inexistente e linha fora do escopo nunca geram toast de sucesso nem evento; transição válida gera uma alteração e um evento.

Risco: Restringir status pode expor inconsistências antigas; preservar catálogo de transições do domínio e comunicar rejeição sem mudar dados automaticamente.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-016 · [P1] · banco/backend — Dar resultado transacional à alteração em massa

Corrige: A-033

Onde: src/hooks/quotes/useQuotes.ts:bulkUpdateStatus · QuoteBulkActionsToolbar · RPC de alteração em lote

Classe (banco): aditiva

Ação:

- Levar IDs e versões esperadas para operação servidor com validação por ator e locks em ordem estável.
- Adotar contrato explícito de lote integral: todos elegíveis ou nenhum alterado; retornar IDs/contagem confirmados e gravar apenas eventos das alterações reais.

Diff estimado: ~110–170 linhas · migration e consumidor do lote

Depende de: E-015

Verificação: Lote com linha inexistente, fora do escopo ou versão obsoleta deve falhar sem mudanças; lote válido devolve todos os IDs únicos, sem histórico duplicado.

Risco: Lotes grandes podem manter locks; limitar tamanho no contrato e rejeitar duplicados, preservando rollback transacional.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-017 · [P1] · backend — Tratar falhas nos eventos restantes de histórico

Corrige: A-005

Onde: src/services/QuoteService.ts:logHistory · chamadores restantes fora das RPCs comerciais

Ação:

- Consumir o error do insert/RPC em logHistory e fazer cada chamador restante tratar a falha de forma explícita.
- Não recolocar registros comerciais no cliente após E-013–E-016; distinguir evento auxiliar não salvo de operação principal já confirmada para evitar repetição acidental.

Diff estimado: ~30–60 linhas · serviço e chamadores identificados por rg

Depende de: E-013, E-014, E-015, E-016

Verificação: Injetar retorno {error} sem rejeição de Promise; verificar que falha não desaparece e que nenhuma ação comercial é repetida ao tentar recuperar só o evento.

Risco: Lançar erro depois de negócio confirmado pode induzir duplicação; mensagem e contrato precisam preservar o resultado principal.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-018 · [P1] · banco/segurança — Retirar escrita direta na trilha de auditoria

Corrige: A-010

Onde: quote_history · policy Users can manage history via quote ownership · grants · chamadores remanescentes

Classe (banco): destrutiva por restringir contrato de escrita existente → expand-contract

Ação:

- Expandir com caminho autorizado de registro que fixe auth.uid e restrinja ações aceitas; migrar os chamadores restantes e comprovar que eventos comerciais já nascem nas RPCs.
- Na fase contract, revogar escrita direta de authenticated e retirar a policy FOR ALL, preservando SELECT por escopo e gravação de servidor autorizada.
- Não reescrever autoria histórica nem apagar eventos existentes.

Diff estimado: ~70–120 linhas · migrations separadas de expansão/contração e chamadores focais

Depende de: E-013, E-014, E-015, E-016, E-017

Verificação: Inspecionar policies/grants reais antes e depois; autor não consegue UPDATE/DELETE nem atribuir outro user_id; caminhos comerciais continuam gravando ator correto.

Risco: Preview obrigatório: contar eventos existentes e chamadores ainda dependentes, sem exportar PII; impacto previsto em linhas reescritas=0, a confirmar. Backfill não necessário; se surgir, executar em lotes por chave, nunca UPDATE global. Rollback restaura grants/policy capturados, com risco de reabrir a falha, ou suspende a contração antes do corte.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-019 · [P2] · catálogo — Recortar o histórico de estoque antes de limitar

Corrige: A-008

Onde: src/hooks/useStockHistory.ts · src/components/products/useStockChartData.ts

Ação:

- Enviar cutoff de summary_date para a consulta antes do limite e definir ordenação/paginação para o período solicitado.
- Manter agregação visual consistente com o conjunto efetivamente retornado, sinalizando truncamento se o contrato não entregar o período completo.

Diff estimado: ~25–45 linhas · hook e transformação do gráfico

Depende de: E-001

Verificação: Fixture com histórico anterior maior que days*20 e registros recentes deve retornar o período recente; verificar borda de data e ordenação.

Risco: Timezone e formato de data podem excluir o primeiro dia; usar o mesmo contrato temporal da coluna e do filtro da UI.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-020 · [P2] · frontend — Validar preferências persistidas da consolidação

Corrige: A-014

Onde: src/components/quotes/QuoteConsolidationPanel.tsx · helper focal de persistência

Ação:

- Encapsular leitura/escrita de localStorage com tratamento de exceções e validar estrutura de sortConfig e savedViews.
- Descartar somente o valor inválido dessa funcionalidade, preservando outras preferências e apresentando fallback utilizável quando o storage estiver bloqueado.

Diff estimado: ~45–75 linhas · helper e componente

Depende de: E-001

Verificação: JSON truncado, array/objeto de formato errado, chave de sort inválida e SecurityError não impedem montagem; preferências válidas continuam funcionando.

Risco: Limpeza ampla poderia apagar rascunhos; restringir às chaves quote_consolidation_* incompatíveis.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-021 · [P2] · exportação — Serializar o CSV com células seguras e liberar o download

Corrige: A-015

Onde: src/components/quotes/QuoteConsolidationPanel.tsx:exportToCSV · utilitário CSV existente ou helper focal

Ação:

- Escapar aspas, separadores e quebras de linha por célula e neutralizar prefixos de fórmula nos campos textuais, sem transformar valores numéricos válidos.
- Revogar o objectURL após disparar o download e garantir limpeza do elemento temporário.

Diff estimado: ~30–50 linhas · exportador e casos de serialização

Depende de: E-007

Verificação: Nome com vírgula/aspas/newline mantém seis colunas; texto começando =/+/-/@ não vira fórmula; repetir exportação revoga cada URL criada.

Risco: Neutralização pode alterar apresentação de SKU legítimo; aplicar política apenas a texto e documentar o prefixo de proteção.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-022 · [P2] · frontend — Reconciliar resumo e origens dos itens consolidados

Corrige: A-018

Onde: src/components/quotes/QuoteConsolidationPanel.tsx:consolidatedData/itemSources

Ação:

- Usar a mesma função de identidade no agrupamento, render e expansão, incluindo product_id quando SKU não existir.
- Somar todas as ocorrências de um item por orçamento no detalhamento e calcular o preço médio correspondente, substituindo find pela agregação.

Diff estimado: ~35–60 linhas · 1 componente/helper focal

Depende de: E-007

Verificação: Duas linhas do mesmo SKU no mesmo orçamento reconciliam quantidade e total; produtos sem SKU e mesmo nome, mas IDs distintos, não compartilham expansão.

Risco: Agrupar variantes incorretamente muda demanda; manter os campos de identidade acordados pelo catálogo, sem deduplicar só por nome.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-023 · [P2] · backend — Separar termo de busca da gramática PostgREST

Corrige: A-017

Onde: src/services/sicoob/orderService.ts:list

Ação:

- Codificar corretamente o termo literal para cada filtro usado em or, incluindo os caracteres reservados da gramática e política explícita para curingas.
- Reutilizar helper de escape existente se houver; não substituir o serviço inteiro nem montar SQL por concatenação.

Diff estimado: ~20–40 linhas · serviço/helper e casos de busca

Depende de: E-001

Verificação: Buscar texto com vírgula, parênteses, aspas, percentual e sublinhado preserva o valor pretendido e não produz erro de parser; RLS permanece aplicado.

Risco: Escape incorreto pode mudar buscas já utilizadas; documentar se curingas são permitidos e testar contra PostgREST da versão alvo.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-024 · [P2] · integrações — Identificar e deduplicar entregas de webhook

Corrige: A-023

Onde: webhook-dispatcher/index.ts · webhook_deliveries · contrato do destinatário

Classe (banco): aditiva se for necessário persistir identificador de evento

Ação:

- Atribuir identificador estável ao evento/entrega e preservá-lo em todas as tentativas e no replay, em vez de usar hash com timestamp novo como identidade.
- Transmitir a chave ao destinatário e só habilitar retry automático de efeito quando o contrato de deduplicação estiver comprovado; classificar resposta ambígua quando não estiver.

Diff estimado: ~70–110 linhas · handler, contrato e eventual coluna/index aditivo

Depende de: E-002, E-009

Verificação: Destino de teste confirma efeito e perde a resposta: retry/replay com a mesma chave não cria segundo efeito. Destino sem deduplicação produz estado incerto, não retry cego.

Risco: Destinatários podem ignorar a chave; não presumir idempotência. Se houver índice novo em tabela grande, CREATE INDEX CONCURRENTLY e prévia de volume/duplicatas.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-025 · [P2] · integrações — Limitar duração e corpo das tentativas de webhook

Corrige: A-023

Onde: supabase/functions/webhook-dispatcher/index.ts

Ação:

- Aplicar deadline por fetch e por invocação, incluindo test_mode, e ler o corpo de resposta com limite real de bytes.
- Validar backoff/max_attempts e parar antes do limite da Edge, persistindo o resultado da tentativa sem bloquear indefinidamente os destinos seguintes.

Diff estimado: ~45–75 linhas · handler/helper focal

Depende de: E-024

Verificação: Destino que nunca responde, corpo muito grande e backoff fora do limite terminam de forma controlada; distinguir timeout ambíguo de rejeição segura.

Risco: Abortar depois do efeito remoto não significa falha sem efeito; manter o estado incerto/deduplicação definido em E-024.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-026 · [P2] · banco — Atualizar contadores de webhook atomicamente

Corrige: A-025

Onde: inbound_webhook_endpoints · outbound_webhooks · handlers inbound/dispatcher

Classe (banco): aditiva

Ação:

- Criar RPCs restritas para incrementar contadores e atualizar consecutive_failures sob lock, com reset de sucesso na mesma decisão transacional.
- Substituir os cálculos baseados em snapshots antigos dos handlers; limitar execução ao backend autorizado.

Diff estimado: ~70–110 linhas · migration e 2 handlers

Depende de: E-002, E-009

Verificação: Executar tentativas concorrentes em banco isolado: contagem final corresponde aos eventos; limiar do breaker e reset após sucesso têm resultado determinístico.

Risco: Ordem de conclusão pode mudar o significado de falhas consecutivas; definir ordenação por tentativa confirmada e evitar privilégios genéricos de incremento.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-027 · [P2] · backend/storage — Reconciliar estado do documento antes de compensar Storage

Corrige: A-012

Onde: supabase/functions/sicoob-document-ingest/index.ts · registro de documento limpo

Ação:

- Consultar o estado persistido por documentId após resposta ambígua da RPC antes de excluir o objeto final.
- Verificar os retornos de cada Storage.remove; registrar cleanup pendente de forma recuperável e não remover arquivo associado a registro confirmado.

Diff estimado: ~60–100 linhas · handler e helper de reconciliação focal

Depende de: E-001

Verificação: Simular commit confirmado com resposta perdida, falha de remoção da quarentena e falha antes do registro; nenhum documento confirmado perde o arquivo e toda limpeza pendente fica rastreável.

Risco: Um segundo erro de banco pode impedir decisão; preservar o objeto em estado incerto e reconciliar depois, sem exclusão especulativa.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-028 · [P2] · qualidade/segurança — Exigir guarda também nas categorias autenticadas e de serviço

Corrige: A-030

Onde: scripts/check-edge-authorization.mjs · scripts/lib/edge-authorization-contract.mjs · edge-authz-manifest.ts

Ação:

- Estender o contrato estático para authenticated/scoped/service com evidência específica de identidade, assinatura ou segredo interno, conforme a categoria.
- Incluir fixtures de ausência de guarda exatamente para dispatcher e sync-quote-bitrix; declarar os limites da análise de fluxo e manter testes de requisição para esses handlers.

Diff estimado: ~80–130 linhas · gate, inspetor e fixtures focais

Depende de: E-002, E-003

Verificação: Versões sem guarda dos dois handlers devem falhar no gate; implementações corrigidas passam sem liberar exceções genéricas por categoria.

Risco: Heurística pode aceitar chamada morta ou rejeitar wrapper legítimo; fixtures precisam cobrir ambos e a saída não deve prometer prova completa de autorização.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-029 · [P2] · integrações — Aplicar deadline às chamadas CRM pelo wrapper

Corrige: A-031

Onde: supabase/functions/_shared/external-fetch.ts · bitrix-sync · sync-quote-bitrix

Ação:

- Definir timeout padrão no wrapper, combinando-o com o signal do chamador quando existir, e preservar cancelamento/contabilização do circuito.
- Não acrescentar retry de POST nessa correção; tratar timeout com resultado potencialmente incerto para operações de escrita.

Diff estimado: ~30–55 linhas · wrapper e tratamento dos 2 consumidores

Depende de: E-003

Verificação: Fetch pendente deve abortar no prazo; signal externo aborta antes; circuito contabiliza a falha e o serviço devolve erro estável sem repetir criação no CRM.

Risco: Timeout curto pode interromper operações legítimas; usar configuração limitada e medir latência antes de reduzir o prazo operacional.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-030 · [P2] · observabilidade — Retirar corpos de contatos dos logs do Bitrix

Corrige: A-027

Onde: supabase/functions/bitrix-sync/index.ts:108 e logs adjacentes

Ação:

- Substituir logging de bitrixData por status, requestId e contagens sem EMAIL/PHONE/ADDRESS ou corpo bruto.
- Passar mensagens de erro do provedor por redação antes de registro, mantendo diagnóstico suficiente para correlacionar a requisição.

Diff estimado: ~15–35 linhas · handler

Depende de: E-001

Verificação: Resposta fictícia com contatos identificáveis não aparece no coletor de logs; status/contagem/requestId continuam disponíveis.

Risco: Redação excessiva pode reduzir diagnóstico; manter códigos de erro e correlação, sem preservar dados de contato por conveniência.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-031 · [P2] · relatórios — Paginar o universo de orçamento e filtrar antes do limite

Corrige: A-034

Onde: QuoteService.list · useQuotes · GestorOrcamentos · consumidores de métricas

Ação:

- Expor paginação/count e filtros de status no serviço, aplicando elegibilidade antes do recorte da consolidação.
- Fazer indicadores distinguir página visível de universo completo; para totais globais, buscar agregado autorizado ou percorrer páginas de forma limitada e explícita.

Diff estimado: ~80–130 linhas · serviço, hook e consumidores afetados

Depende de: E-007

Verificação: Fixture com 501 orçamentos, incluindo aprovado antigo, mantém o elegível acessível; indicador não apresenta a primeira página como total global.

Risco: Alterar contrato de list afeta várias telas; preservar adaptador de compatibilidade temporário e migrar os consumidores identificados no inventário.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-032 · [P2] · backend/contrato — Validar o retorno de logística como remessa

Corrige: A-035

Onde: src/services/sicoob/fulfillmentService.ts · src/types/sicoob/orders.ts

Ação:

- Substituir o cast de parseShipment por validação dos campos obrigatórios do contrato SicoobOrderShipment, rejeitando arrays e objetos incompletos.
- Distinguir ausência legítima em getShipment de resposta inválida em updateShipment e manter mensagem recuperável no consumidor.

Diff estimado: ~25–45 linhas · serviço e teste de contrato

Depende de: E-001

Verificação: Reexecutar SIM-SHIPMENT com{},[],null e objeto válido: update rejeita os três primeiros; get aceita null somente como ausência contratual.

Risco: Contrato local pode estar desatualizado em relação à RPC; conferir resposta real com dados autorizados antes de exigir campo que o servidor não devolve.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-033 · [P2] · infra/banco — Provisionar a conexão do workflow de reconciliação

Corrige: A-036

Onde: .github/workflows/migration-ledger-drift.yml · scripts/db/check-migration-ledger-drift.mjs · secret SUPABASE_DB_URL

Ação:

- Provisionar no escopo do job uma conexão PostgreSQL do projeto correto, com TLS verificado e privilégios mínimos de leitura do ledger/catálogos.
- Guardar somente em GitHub Secrets e executar o workflow para comparar nomes, versões e conteúdo nos dois sentidos; registrar divergências sem executar repair automático.

Diff estimado: 0–15 linhas de workflow; 1 secret, sem valor versionado

Depende de: E-010

Verificação: Job chega à transação BEGIN READ ONLY e termina com comparação real, não por ausência de variável; relatório mostra SHA alvo e classificação das diferenças.

Risco: Credencial de projeto errado produz diagnóstico inválido; confirmar identificador do banco antes da consulta e nunca imprimir URL/password. Só aplicar correções ao ledger após reconciliação explícita.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-034 · [P3] · UX — Confirmar cópia antes de informar sucesso

Corrige: A-016

Onde: src/components/quotes/QuoteConsolidationPanel.tsx:generateShareLink

Ação:

- Aguardar clipboard.writeText e mostrar sucesso somente após resolução.
- Em rejeição ou indisponibilidade da API, oferecer o link em controle selecionável e explicar como copiar, sem toast de sucesso.

Diff estimado: ~15–25 linhas · 1 componente

Depende de: E-001

Verificação: Permissão negada mostra alternativa utilizável; operação resolvida mostra confirmação uma única vez; testar por teclado.

Risco: Fallback não deve compartilhar dados além dos filtros já codificados; manter o mesmo conteúdo do link.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-035 · [P3] · acessibilidade — Dar semântica e teclado aos controles de consolidação

Corrige: A-021

Onde: src/components/quotes/QuoteConsolidationPanel.tsx

Ação:

- Usar botões focáveis nos cabeçalhos de ordenação e na expansão, com aria-sort/aria-expanded coerentes.
- Nomear filtros e remoção de visão com labels/aria-label e preservar foco após excluir uma visão; não redesenhar a tabela inteira.

Diff estimado: ~35–65 linhas · 1 componente

Depende de: E-022

Verificação: Tab, Enter e Espaço ordenam/expandem sem mouse; leitor de tela identifica filtros, direção da ordem e botão de exclusão; conferir foco após remoção.

Risco: Botões aninhados em menus podem conflitar com handlers; evitar dupla ativação e manter a navegação oferecida pelos componentes de menu.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

### E-036 · [P3] · manutenção — Alinhar instruções de instalação com o projeto

Corrige: A-032

Onde: README.md:59,98 · package.json · package-lock.json

Ação:

- Atualizar o requisito de Node para a faixa >=24 <25 e a referência de Vite para a versão principal 6, coerentes com engines/lockfile.
- Explicar instalação por npm ci e distinguir tsc completo de gate de baseline, com comandos reais do package.json.

Diff estimado: ~8–15 linhas · README.md

Depende de: E-001

Verificação: Seguir a sequência em ambiente isolado e conferir versões; os comandos documentados devem existir no manifesto e não prometer ausência de dívida de tipos.

Risco: Não registrar versão instalada divergente como padrão; usar engines/lock como fonte de verdade.

- [ ] Concluída com evidência de execução e verificação anexada ao SHA alvo.

## Rastreabilidade

| Achado | Etapas |
|---|---|
| A-001 | E-001 |
| A-002 | E-012 |
| A-003 | E-001 |
| A-004 | E-013, E-014 |
| A-005 | E-013, E-014, E-015, E-017 |
| A-006 | E-015 |
| A-007 | E-005 |
| A-008 | E-019 |
| A-009 | E-004 |
| A-010 | E-018 |
| A-011 | E-014 |
| A-012 | E-027 |
| A-013 | E-007 |
| A-014 | E-020 |
| A-015 | E-021 |
| A-016 | E-034 |
| A-017 | E-023 |
| A-018 | E-022 |
| A-019 | E-008 |
| A-020 | E-006 |
| A-021 | E-035 |
| A-022 | E-002 |
| A-023 | E-024, E-025 |
| A-024 | E-009 |
| A-025 | E-026 |
| A-026 | E-003 |
| A-027 | E-030 |
| A-028 | E-011 |
| A-029 | E-010 |
| A-030 | E-028 |
| A-031 | E-029 |
| A-032 | E-036 |
| A-033 | E-016 |
| A-034 | E-031 |
| A-035 | E-032 |
| A-036 | E-033 |

## Critério de encerramento

As 36 etapas cobrem os achados confirmados; as lacunas de acesso da auditoria permanecem explicitamente pendentes até coleta de evidência. Não existe certificação de 100% do sistema por concluir esta lista. Novos achados exigem atualização da auditoria e do plano, sem inventar etapas para atingir 100.

