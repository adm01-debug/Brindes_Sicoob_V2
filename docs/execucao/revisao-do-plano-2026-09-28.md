# Revisão das melhorias e correções — 28/09/2026

**Não implementamos integralmente o plano.** Há avanços incorporados e aplicados ao banco, mas também funções parciais, requisitos não localizados, regressões nos checks da `main` e homologações ainda não comprovadas. O projeto continua em construção.

Referência auditada: `8028c879dedb011cda4946ccd8d0e86a75558bef`, após o merge do PR #70 e das atualizações de dependências #66/#67. Diretório original preservado, inclusive alterações locais e arquivos não rastreados. Revisão feita em worktree isolado. Não foram aplicadas migrations, alterados dados remotos nem enviadas mensagens a terceiros nesta revisão.

**Nota de publicação:** após a coleta, `main` recebeu os commits `21e382274` (policies das nove tabelas internas) e `89ca16ef4` (Chromium no runner Lighthouse). Este relatório preserva a fotografia do commit auditado; esses dois ajustes posteriores não foram revalidados pelos testes aqui apresentados.

## Resultado das 150 etapas

| Classificação | Quantidade | Interpretação |
|---|---:|---|
| Implementação evidenciada no escopo indicado — I | 19 | Entrega delimitada localizada e sustentada pelas fontes da linha. Não equivale a aceite institucional ou operação em produção. |
| Parcial — P | 90 | Existe implementação, mas faltam partes do requisito ou há falha concreta. |
| Não localizada — N | 11 | Ausência no escopo de código/documentação pesquisado; não prova inexistência em serviço externo. |
| Validação/homologação insuficiente — V | 26 | Não há evidência suficiente para atestar o aceite. Não significa necessariamente falta de código. |
| Operação futura — F | 4 | Piloto, compra real, segunda cooperativa e encerramento dependem de lançamento e responsáveis. |
| **Total** | **150** | **Nenhum encerramento integral certificado nesta revisão.** |

A [matriz completa](revisao-plano-20260928/matriz-150.md) detalha cada etapa, constatação, fontes e pendência. O [JSON](revisao-plano-20260928/matriz-150.json) preserva ação, cenário, aceite, origens e dependências do plano original; o [CSV](revisao-plano-20260928/matriz-150.csv) permite acompanhar a fila.

As classificações não formam um percentual de produto pronto. O plano original ainda tem 150 estados `Planejada`, 900 checkboxes falsos e responsáveis/revisores nominais não preenchidos. Isso revela falta de atualização do acompanhamento, não ausência de todas as entregas. Mantive o planejamento original e o histórico, sem preencher aceites fictícios.

## Avanços que não devem ser refeitos

- **Banco e Edge:** a reconciliação administrativa anterior de 28/09 registrou 97 versões no ledger, todas as migrations de setembro presentes e 142 arquivos das 100 funções publicadas idênticos ao código de referência. Entre essa referência (`55638f79`) e o commit auditado não há mudança em `src/` ou `supabase/`; houve mudanças de dependências, workflows e documentação. [Evidência administrativa](evidencias/paridade-online-20260928.json).
- **Publicação Sicoob:** as cinco funções antes apontadas como ausentes estão publicadas. Nesta revisão, as cinco responderam HTTP 401 a POST sem sessão. Isso confirma a negativa de autenticação, sem certificar o fluxo de negócio autenticado. [Sondagem atual](revisao-plano-20260928/sondagem-remota.json).
- **Orçamentos:** criação/edição usam `save_quote_atomic`; falha no meio da gravação reverte cabeçalho, itens, personalizações e histórico. `logHistory` passou a propagar erros. A simulação local atual confirmou atomicidade e recusa de versão obsoleta **quando a versão correta é enviada à RPC**. [Simulações](revisao-plano-20260928/simulacoes-locais.json).
- **Convites e delegações:** existem UI, RPCs, autoridade por escopo, vigência, revogação e trilha. Reexecutei os simuladores de convites, delegações e RLS cruzada em PostgreSQL descartável; passaram. As evidências remotas anteriores continuam datadas como anteriores, sem serem promovidas a teste remoto novo.
- **Recompra, consolidação e experiência:** há revalidação do catálogo, confirmação das diferenças comerciais, recebimento por PA, métricas sem números ilustrativos e correções de acessibilidade em formulários. Os PRs #54/#56/#59/#60 são avanços reais; não encerram sozinhos os aceites completos desses módulos.

A afirmação antiga de que faltavam publicar as cinco funções, bem como a de que convites/delegações não existiam, está superada. O relatório de 27/09 continua válido como fotografia daquele commit, não como retrato da `main` atual.

## Falhas e lacunas prioritárias

P1 bloqueia o aceite do fluxo afetado no ambiente de construção; P2 representa completude funcional/operacional. Não se presume incidente em produção.

| ID | Prioridade / etapas | Constatação e efeito | Correção e prova necessárias |
|---|---|---|---|
| A01 | P1 — P033/P043/P046 | `QuoteService.update` recebe uma versão antiga da tela, consulta o orçamento novamente e envia a versão recém-lida. A sonda com entrada 1 enviou 7. Assim, a proteção SQL não detecta necessariamente edição baseada em tela antiga. [Serviço](../../src/services/QuoteService.ts#L180), [sonda](revisao-plano-20260928/sondas.json). | Preservar a versão conhecida pelo editor; duas telas devem produzir conflito recuperável, sem sobrescrita silenciosa. |
| A02 | P1 — P042/P048/P058 | A criação não recebe chave idempotente. Duas chamadas com o mesmo payload produziram dois IDs de orçamento na fixture SQL. [Sonda SQL](revisao-plano-20260928/sondas-sql.json). | Persistir intenção/payload e recuperar a resposta após timeout. Repetição não pode criar novo compromisso involuntário. |
| A03 | P1 — P044/P102 | A edição apaga/recria os itens. Mesmo salvando a mesma composição, o ID mudou na fixture. A transação evita gravação parcial, mas não preserva identidade. [Migration](../../supabase/migrations/20260927190000_atomic_quote_save.sql), [sonda](revisao-plano-20260928/sondas-sql.json). | Preservar IDs ou versionar/rejeitar alterações conforme os vínculos de arte/pedido. Não foi demonstrada perda de vínculo no banco remoto; falta testar todas as FKs reais. |
| A04 | P1 — P051–P060 | Novo rascunho usa UUID por montagem e não é reencontrado. Orçamento existente usa chave sem ator/unidade; logout não limpa `autosave_*`. [Autosave](../../src/components/quotes/QuoteAutoSave.tsx), [Auth](../../src/contexts/AuthContext.tsx), [sondas](revisao-plano-20260928/sondas.json). | Identidade recuperável, escopo de sessão, cancelamento de saves atrasados, retenção/versionamento e conflito entre abas. Testar dois usuários reais no mesmo navegador. |
| A05 | P1 — P111/P120 | Relatório consulta só página 1, tamanho 500, e filtra status depois. Com 500 rascunhos e total 501, retorna logística vazia sem pedir a segunda página. [Serviço](../../src/services/sicoob/logisticsReportService.ts#L37). | Filtrar no servidor e paginar com ordem estável/total; testar pedidos elegíveis depois da primeira página. |
| A06 | P1 — P075/P107/P109 | Função de ingestão existe, mas URL/token do scanner estavam ausentes na coleta administrativa anterior. A implementação bloqueia o uso sem configuração, em vez de liberar conteúdo sem análise. [Reconciliação](reconciliacao-online-2026-09-28.md), [scanner](../../supabase/functions/sicoob-document-ingest/scanner.ts). | Configurar scanner real e homologar arquivo válido, malicioso sintético, timeout e parecer inválido. Não tratar publicação da função como upload operacional. |
| A07 | P1 — P014/P141/P142 | `main` falha em 22 testes e no gate TypeScript: 179 diagnósticos contra baseline 166, com 15 arquivos em regressão. A suíte anterior verde usava dependências anteriores. [Resultados](revisao-plano-20260928/verificacoes.json), [falhas](revisao-plano-20260928/falhas-vitest.txt). | Revisar atualizações/contratos e corrigir erros sem aumentar baseline ou trocar falha por skip. As 22 falhas observadas são de seletores/classes de ícones Lucide, não prova de cálculo comercial incorreto. |
| A08 | P1 — P015/P024/P028 | Main exige revisão, mas nenhum status check obrigatório; bypass administrativo continua permitido. Gate runtime usa cache de 22/09 e aponta 24 referências ausentes nesse cache. [GitHub](revisao-plano-20260928/github.json), [runtime](revisao-plano-20260928/runtime.json). | Corrigir os gates, atualizar inventário de fonte autenticada e testar proteção de merge. Não recriar RPCs existentes para satisfazer cache antigo. |
| A09 | P1 — P143/P144 | GET no domínio `brindes-sicoob-v2.vercel.app` retornou 200 sem header CSP, embora `vercel.json` contenha CSP. A página conserva meta `noindex, nofollow`; ausência de X-Robots-Tag não prova indexação permitida. [Sondagem](revisao-plano-20260928/sondagem-remota.json). | Reconciliar configuração e deployment associados ao domínio, conferir CSP na resposta efetiva e compatibilidade das integrações. A causa da divergência não foi determinada nesta revisão. |
| A10 | P2 — P061–P070 | `useQuotes` insere notificações depois da RPC e não confere `error`; o caminho em lote não faz o mesmo despacho. Outbox de aprovações de pedidos não cobre automaticamente esse fluxo. [Hook](../../src/hooks/quotes/useQuotes.ts#L127). | Criar intenção durável/deduplicada na transação e validar paridade individual/lote, destinatário inelegível e retry. |
| A11 | P2 — P094/P097 | Chave de cache de previsão do kit inclui produtos, variantes e quantidade de kits, mas não unidades por item. A sonda mostrou mesma chave ao mudar um item de 1 para 100 unidades. Buffer segue fixo de 3 dias. [Hook](../../src/hooks/useKitStockForecast.ts#L219), [sonda](revisao-plano-20260928/sondas.json). | Incluir a composição quantitativa na identidade do cálculo e validar prazo/confiança/entradas vencidas. A sonda prova colisão de chave, não uma promessa incorreta já exibida a um cliente real. |
| A12 | P2 — P095/P096 | Cotação de kit valida estoque, preço, mínimos e técnica, mas não capacidade geométrica/peso da embalagem. Campos de largura/altura existentes se referem à personalização. [Validador](../../supabase/functions/sicoob-kit-quote/catalog.ts). | Definir regra física e estado de revisão técnica para dados desconhecidos, com validação no servidor. |
| A13 | P2 — P124/P125 | `getBudgetByPa` consulta só PA e usa `maybeSingle`, sem período; o filtro opcional `cooperative_id` não existe no tipo atual de `pa_budgets` e gera erro TS. [Serviço](../../src/services/sicoob/budgetService.ts), [diagnósticos](revisao-plano-20260928/typecheck.txt). | Validar competência explícita e relacionamento correto com cooperativa. Testar duas competências para o mesmo PA; não foi reproduzida falha remota desse caso nesta rodada. |

A gravação SQL recalcula totais de cabeçalho, mas ainda soma parcelas `personalizations[].total_cost` fornecidas no payload. A etapa P045 permanece parcial até definir e demonstrar o contrato de validação dessas parcelas e preços; teste que altera apenas o total do cabeçalho não cobre todo esse requisito.

## O que continua não localizado ou sem entrega completa

As 11 classificações N são específicas: responsáveis nominais (P005); concorrência entre abas e formato/retenção do autosave (P056/P057); propostas institucionais e exceção de fornecedor único (P087/P088); capacidade física de embalagem (P095/P096); importação assistida de distribuição (P113); marcos regressivos de campanha (P122); colaboração Magic Up (P123); consumidores das views de auditoria (P127).

A [busca registrada](revisao-plano-20260928/buscas.json) não encontrou chamadas em `src`, excluindo tipos gerados, para `magic_up_comments`, `magic_up_public_shares`, `magic_up_reactions`, `sicoob_budget_audit` e `v_full_scope_grants`. Isso não declara que as tabelas/views estão ausentes nem exclui consumidores externos.

Continuam parciais o ciclo de campanha/verba, fechamento de competência, conciliação de notas/pagamentos/entregas, cancelamento por item/destino e tratamento de avarias até reposição/crédito/reabertura. Existem componentes e RPCs aproveitáveis; falta comprovar o processo completo e as decisões de negócio. A matriz descreve a pendência de cada etapa.

A loja possui navegação, catálogo e componentes com identidade visual, mas login/demo e testes de componentes não certificam a compra conectada. Permanecem abertos pesquisa com compradores/marketing, aceite de marca, tarefas autenticadas em mobile, leitor de tela/zoom e medições de desempenho por jornada.

## Validações executadas e limites

| Verificação nova nesta revisão | Resultado |
|---|---|
| Instalação isolada após atualizações de dependências | `npm ci` passou; audit da instalação reportou zero vulnerabilidades. |
| Suíte Vitest da aplicação | 5.547 aprovados, 22 falhos, 112 ignorados; 397 arquivos aprovados, 3 falhos, 8 ignorados. |
| Cenários Node | 202 aprovados, zero falhas/ignorados. |
| TypeScript | Gate falhou: 179 diagnósticos, baseline 166; regressão em 15 arquivos. |
| Lint | 3.269 erros globais. Gate sem regressão, mas com **zero arquivos de aplicação alterados analisados**; não equivale a lint global limpo. |
| Build Vite | Passou; alertou sobre chunks grandes e variáveis públicas Supabase não fornecidas ao build isolado. Não comprova configuração do artefato implantado. |
| Simulações PostgreSQL | Atomicidade, convites, delegações e RLS cruzada passaram em fixtures descartáveis. |
| Sondas de lacunas | Seis de aplicação/serviço/cache e duas SQL reproduziram limitações. “Passar” nessas sondas significa encontrar a falha. |
| Runtime | 24 referências bloqueantes contra cache antigo; exige reconciliação do inventário. |
| Rede sem autenticação | Cinco funções com HTTP 401; domínio Vercel HTTP 200 sem CSP. |
| GitHub | Compliance executou e falhou no scan RLS; outras runs estavam em fila/pending/canceladas. |

O scan de compliance reportou **nenhuma tabela sem RLS**, mas rejeitou nove tabelas sem policies. Isso exige revisar se são tabelas internas bloqueadas intencionalmente e conferir grants; **não é prova de vazamento**, nem justificativa para criar policies permissivas apenas para deixar o workflow verde. A lista e o link da execução estão no [JSON GitHub](revisao-plano-20260928/github.json).

Não foram executados nesta revisão: E2E autenticado integral, ensaio real de provedor/Bitrix/scanner, restauração completa, aceite de marca, pesquisa com pessoas ou compra real. A informação administrativa do banco vem da reconciliação anterior de 28/09, preservando sua data; não houve nova auditoria SQL remota completa. Hash de migration no ledger não certifica automaticamente todos os efeitos atuais do schema.

Os 1.000 subitens originais e as 200 avaliações históricas não receberam 1.200 novos testes individuais. O plano complementar de [100 etapas de workflows](../plano-implementacao/plano-workflows-github-100-etapas-20260927.md) foi identificado como backlog adicional: os gates atuais foram verificados, mas seus 100 aceites não estão certificados por esta matriz de 150. Sua integração à rastreabilidade permanece em P003/P019. O Graphify existente não encontrou nós para a consulta de planos/módulos; a análise prosseguiu pelos arquivos atuais, sem reconstruir o grafo.

## Ordem recomendada de fechamento

1. Corrigir as regressões de CI/TypeScript e reconciliar o deployment/configuração do domínio; renovar o inventário de runtime.
2. Fechar concorrência de edição, idempotência e identidade dos itens; testar a cadeia editor → RPC → arte/pedido.
3. Corrigir autosave, paginação logística, notificação individual/lote e identidade do cache de previsão.
4. Configurar/homologar scanner e demais integrações com dados e destinatários autorizados.
5. Completar propostas institucionais, embalagem física, distribuição, campanhas e ciclo financeiro com regras aprovadas.
6. Executar compra sintética integral com duas cooperativas e três destinos, realizar os aceites de UX/negócio e ensaiar restauração. Somente depois decidir o piloto.

Para dar baixa em cada etapa, registrar implementação/commit, teste positivo e negativo, publicação aplicável, cenário original, dependências resolvidas e aceite nominal. Nenhum desses campos deve ser inferido de uma contagem de testes ou de uma nota autodeclarada.
