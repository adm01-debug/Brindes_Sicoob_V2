# Revisão dos planos — 27/09/2026

**Não implementamos integralmente todas as melhorias.** Houve avanços em `main`, mas persistem funcionalidades parciais, requisitos não localizados, diferenças no Supabase e homologações não realizadas. Não há evidência para declarar 100% ou nota 10/10.

Código auditado: `3094cbab22adfa012edcca5278680fa739df46ca`, após os PRs #40/#41. O sistema segue em construção. Produção, primeira compra real e segunda cooperativa são etapas futuras, não incidentes de produção. Esta rodada revisa e documenta; não modifica funcionalidades, não aplica migrations e não publica funções.

## Escopo e grau de verificação

- Os quatro planos principais somam **250 etapas documentais**, com sobreposição: produto 100, reconciliação 50, correções da auditoria 50 e melhorias técnicas 50.
- O benchmark acrescenta **32 melhorias**. **82 das 282 avaliações foram explicitamente reavaliadas** nesta rodada; **200 diagnósticos de 24/09 foram preservados como históricos**, com data visível em cada linha. Não confundir preservação com revalidação funcional.
- Os **1.000 subitens** do plano de produto estão indexados com o texto original, aceite e pendência da etapa. **Não houve 1.000 testes individuais nesta rodada**. Não se transferiu automaticamente o resultado de uma etapa aos seus dez subitens.
- O inventário registra nomes, tamanhos e hashes dos **355 arquivos de `docs` no commit auditado**. Inventariar não equivale a revisar semanticamente cada linha desses documentos.
- Foram executados **54 testes direcionados**, **seis sondas de aplicação** e **duas sondas SQL**. As oito sondas passaram porque reproduziram problemas; não contam como oito funcionalidades aprovadas.

Artefatos:

- [Matriz de 250 etapas](revisao-plano-20260927/matriz-250-etapas.md), [CSV](revisao-plano-20260927/matriz-250-etapas.csv), [JSON](revisao-plano-20260927/matriz-250-etapas.json).
- [Benchmark de 32 melhorias](revisao-plano-20260927/benchmark-32.md).
- [Índice de 1.000 requisitos](revisao-plano-20260927/requisitos-1000.csv), [resumo e legenda](revisao-plano-20260927/resumo.json).
- [Inventário de documentos](revisao-plano-20260927/inventario-docs.csv), [avaliações alteradas](revisao-plano-20260927/reavaliacoes.json).

`L` significa implementação no escopo local/documental delimitado; `P`, parcial; `N`, não localizado no escopo pesquisado; `V`, validação externa pendente; `H`, histórico; `R`, premissa substituída. Nenhum desses rótulos dispensa o aceite formal exigido pelo plano. **Zero etapas de produto têm encerramento integral certificado**, o que não significa ausência de implementação.

## Avanços efetivamente incorporados

A [consulta ao GitHub](revisao-plano-20260927/github-prs.json) confirma os PRs #21 a #41 incorporados. As pendências de merge #24–#29 descritas na revisão de 24/09 estão superadas.

| Mudança | Evidência em main | Limite de conclusão |
|---|---|---|
| Documentos/exportações e crons protegidos | #24; migrations `20260923130000` e `20260923140000` | Aplicação remota dessas versões e execução real precisam de verificação própria. |
| Controles operacionais por papel e remoção da aprovação pública legada | #25/#26; `order-permissions.ts` e abas operacionais | UI coerente não certifica todos os predicados RLS remotos. |
| CSP Vercel e workers internos autenticados | #27/#28; `vercel.json` e funções | Header e código efetivamente publicados ainda não foram comparados. |
| Erros da recompra sanitizados | #29 | Função remota continua 404. |
| Logística usa consultas, filtros e estados reais | #32 | Paginação incompleta reproduzida; não equivale a rastreio integrado de transportadora. |
| Autosave distingue novos rascunhos e expõe erro de escrita | #32; testes do hook aprovados | Recuperação após remontagem e identidade da sessão continuam incompletas. |
| Previsão por variante e reposições; estoque e histórico reais | #33/#35/#38 | Confiança de prazo, frescor e homologação da origem ainda pendem. |
| Remoção de selos e inteligência ilustrativos da página de produto | #34/#36 | Não encerra validação de conteúdo e design da loja inteira. |
| Consolidação por eventos, variantes preservadas, histórico imutável e integrações endurecidas | #39/#40 | Dependem de migrations/código remoto e cobertura de todos os escritores. |
| Status individual/em lote usa RPC transacional | #41 | RPC não exposta na coleta anterior de 27/09; sequência SQL requer compatibilidade e migração de escritores restantes. |

O [PR #42](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/42) permanece aberto no momento da coleta. Contém compatibilidade do enum e normalização de segredos; **não está em main** e não deve ser contabilizado como aplicado ao banco.

## Falhas e implementações parciais confirmadas

Prioridades indicam ordem de correção no ambiente de construção. P1 bloqueia a homologação do fluxo afetado; P2 é lacuna funcional ou operacional a planejar. As condições abaixo são critérios de fechamento, não correções executadas nesta revisão.

| ID | Prioridade / etapas | Constatação e efeito | Evidência / condição de fechamento |
|---|---|---|---|
| F01 | P1 — R35, E054/E055/E078/E079 | Cinco funções seguem 404: `sicoob-approval-reconciliation`, `sicoob-artwork-register`, `sicoob-document-ingest`, `sicoob-kit-quote`, `sicoob-reorder`. | [Sondagens atuais](revisao-plano-20260927/sondagem-edge.json). Publicar versões revisadas e testar sucesso, negação e repetição autenticados. OPTIONS 200 nas outras funções não prova versão nem autorização. |
| F02 | P1 — R21/R26, E018/E059 | Duas chamadas à `bulk_update_quote_status_atomic` não encontram contrato no cache; gate de referências falhou. A coleta de API anterior de 27/09 também não encontrou a RPC. | [Hook](../../src/hooks/quotes/useQuotes.ts), [checks](revisao-plano-20260927/checks.json). Reconciliar/aplicar contrato e renovar catálogo; não adicionar allowlist para esconder o problema. |
| F03 | P1 — R12/R21 | `20260927110100` executa ALTER TYPE sobre `public.quote_status`. Coleta anterior encontrou status text e enum ausente; sonda reproduz a falha nesse schema. | [Sonda SQL](revisao-plano-20260927/sondas-status.json). Revisar/integrar #42, aplicar na ordem e validar ledger/definições no projeto correto. Não reaplicar todo o histórico. |
| F04 | P1 — E057/E059/E061, B06 | Criação grava cabeçalho antes de itens/personalizações. Falha posterior pode deixar orçamento parcial. Edição grava cabeçalho/histórico, apaga e recria itens por requisições independentes. | [QuoteService](../../src/services/QuoteService.ts), [sondas](revisao-plano-20260927/sondas-lacunas.json). Transação única com itens, personalizações e histórico; injetar falhas em cada passagem e comprovar rollback/idempotência. |
| F05 | P1 — E059/E085 | Edição substitui a versão que o formulário conhecia pela versão recém-consultada; detecta corrida após a leitura nova, mas não necessariamente edição baseada em tela antiga. Erro REST ao excluir itens é ignorado. | `QuoteService.update`; sonda confirmou filtro na versão 7 apesar de entrada 1 e retorno de sucesso com erro de exclusão. Preservar versão esperada e rejeitar falhas antes de anunciar sucesso. |
| F06 | P1 — E068 | Migration de status remove `tr_log_quote_status_change`, mas ainda existem updates diretos, inclusive em `QuoteViewPage`. `logHistory` também ignora `error` retornado pela API. | [Migration](../../supabase/migrations/20260927110000_bulk_quote_status_atomic.sql), [página](../../src/pages/QuoteViewPage.tsx), [aprovação de desconto](../../src/hooks/useDiscountApproval.ts). Sonda mínima comprova perda do evento desse gatilho, não ausência de todos os possíveis eventos remotos. Centralizar escritores e provar exatamente um evento por transição. |
| F07 | P1 — E025/E057/E085, B16 | Novo rascunho recebe UUID a cada montagem e não é reencontrado após remontagem. Orçamento existente usa `quoteId` sem usuário/cooperativa; logout não limpa `autosave_*`. | [Componente](../../src/components/quotes/QuoteAutoSave.tsx), [Auth](../../src/contexts/AuthContext.tsx), sondas. Salvar identidade recuperável, validar escopo de sessão e testar recarga/troca de ator. A sonda não simula login real de dois usuários. |
| F08 | P1 — E075/E089 | Relatório carrega somente os 500 pedidos mais recentes e filtra status depois, ignorando `total`. Pode mostrar logística vazia se os pedidos logísticos estiverem fora dessa página. | [Serviço](../../src/services/sicoob/logisticsReportService.ts), sonda com total 501. Filtrar/paginar no servidor e validar totais com mais de 500 pedidos. |
| F09 | P2 — E029/E063 | Caminho individual de status grava notificações após a transação e ignora erro; caminho em lote não faz esse despacho. | [useQuotes](../../src/hooks/quotes/useQuotes.ts). Unificar regra de notificação em outbox idempotente e testar individual/lote/falha/retry. Outbox de outro módulo não cobre automaticamente esse caminho. |
| F10 | P1 — R02/R46/T07 | Actions não iniciou a publicação por orçamento; main exige uma revisão, mas não checks, e permite bypass administrativo. | [Annotation](revisao-plano-20260927/github-bloqueio-ci.json), [proteção](revisao-plano-20260927/github-protecao.json), [run](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/36329081604). Restabelecer execução e comprovar bloqueio dos gates adequados. |
| F11 | P1 — R07/R12/R13/R37 | Não há leitura administrativa integral atual do ledger, hashes, funções, triggers, grants e cron. Tipos e inventário não demonstram paridade completa. | Histórico da [auditoria de paridade](auditoria-paridade-local-github-supabase-2026-09-24.md) e [coleta anterior de 27/09 no PR42](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/42). Management API retornou 401/403 naquela coleta. Restabelecer identidade no projeto canônico e fazer comparação bidirecional. |
| F12 | P2 — E055, B19/B26 | Kit valida preço, mínimo, variante e demanda; não foi localizado gate físico de capacidade da embalagem. Previsão ainda usa buffer fixo de três dias e não fornece confiança validada. | [Validador](../../supabase/functions/sicoob-kit-quote/catalog.ts), [previsão](../../src/hooks/useKitStockForecast.ts). Distinguir dimensões da personalização de capacidade da embalagem e estabelecer regra para informação desconhecida. |

As sondas SQL usam schema mínimo em PostgreSQL 17 sem rede; não substituem ensaio com todas as policies e triggers do Supabase. Não se afirmou exploração remota nem perda efetiva de dados de clientes.

## Requisitos de produto ainda sem entrega completa

| Grupo | Situação e trabalho restante |
|---|---|
| Convites institucionais — E016 | Não localizado fluxo completo de convite com papel, cooperativa, validade, reenvio e revogação. Convite de kit não satisfaz o requisito. |
| Cotações institucionais — E060 | Comparador de produtos não implementa duas/três propostas de fornecedores, normalização e exceção autorizada de fornecedor único. |
| Delegações temporárias — E067 | Não localizado fluxo de competências, vigência/revogação e identificação do delegante no histórico. |
| Campanhas — E051/E052 | Briefing criativo existe; campanha institucional com verba, destinos, marcos regressivos e conflitos permanece parcial no diagnóstico histórico. |
| Verba — E017/E062 | Controles atômicos existem; estados financeiros completos e virada de competência não têm aceite integral demonstrado. |
| Cancelamento, qualidade e avaria — E069/E072/E077 | Eventos e recebimento parcial existem; encerramento completo por item/destino, lote, reposição/crédito e reabertura permanece parcial no diagnóstico histórico. |
| Magic Up e auditoria administrativa — C24/C26 | Nova busca em `src`, excluindo tipos gerados, não encontrou consumidores de `magic_up_comments`, `magic_up_public_shares`, `magic_up_reactions`, `sicoob_budget_audit` e `v_full_scope_grants`. Isso não prova ausência de consumidor externo. Implementar ou formalizar retirada de escopo. |
| Loja, marca e acessibilidade — E030–E046/E081–E088 | Demo e componentes existem; falta aceite da jornada conectada, marca e tarefas observadas, teclado, zoom, leitor e dispositivos reais. Código/teste unitário não substitui esse aceite. |
| Operação e piloto — E090–E100 | Faltam compra completa com três destinos, arte revisada, fornecedor, recebimento e conciliação; treinamento, cooperativa piloto e expansão são etapas futuras. |

As buscas adicionais desta rodada sustentam os itens de convites, comparação, delegação, embalagem e consumidores nomeados. Os demais diagnósticos de negócio vêm da matriz histórica, sem nova execução individual. Não foram inventados participantes, decisões comerciais ou aceite de marca.

## Documentação e fontes conflitantes

- `docs/README.md` ainda aponta para `MELHORIAS_PENDENTES_PLANO_IMPLEMENTACAO.md`, que não existe no commit auditado, e apresenta contexto antigo de Gifts Store. O resumo de auditoria da raiz também apontava somente para 22/09. Esta revisão adiciona um acesso ao adendo atual sem apagar o histórico.
- [Roadmap legado](../05_ROADMAP_PROXIMOS_PASSOS.md) anuncia banco/Auth/Edges prontos e contém ações de escrita em produtos. Essas afirmações não certificam o Sicoob atual e não autorizam escrita no catálogo externo. O contrato vigente mantém `doufsxqlfjyuvxuezpln` exclusivamente de consulta.
- [Plano de segurança legado](../SECURITY_PLAN.md) referencia Promo Gifts e um endereço de rotação com prefixo relativo duplicado. Metas de SLA e pentests agendados são intenções; falta evidência de execução no portal Sicoob.
- PDF, XLSX, HTML e CSV do plano são representações da mesma origem, não novos planos a somar. Checklists históricos não foram preenchidos artificialmente.
- No diretório principal permanecem três alterações rastreadas e `AUDITORIA.md`/`PLANO_100.md` não rastreados. Este último descreve 36 etapas, apesar do nome. São artefatos locais fora de `main/docs`; não entraram silenciosamente no total de 250.
- Fonte de implantação: main atual não inclui #42. Fonte do banco: somente o projeto `cfmzkthhgliqelozlmwu`. MCPs de outros projetos não foram usados como evidência do Sicoob.

## Validação executada e limites

| Verificação desta rodada | Resultado |
|---|---|
| Instalação isolada | `npm ci --ignore-scripts --no-audit --no-fund` passou. |
| Testes direcionados aos lotes incorporados | [54 passaram, zero falharam/ignorados](revisao-plano-20260927/testes-direcionados.json), 14 arquivos selecionados. |
| Sondas de aplicação | [Seis lacunas/comportamentos reproduzidos](revisao-plano-20260927/sondas-lacunas.json). |
| Sondas de migration/histórico | [Duas lacunas reproduzidas](revisao-plano-20260927/sondas-status.json). Primeira tentativa teve corrida na inicialização da fixture; prontidão TCP corrigida e execução concluída. Containers descartados. |
| Autorização Edge | Gate estático passou, 106/106. |
| Imutabilidade de migrations | Gate passou; nenhuma migration foi alterada nesta revisão. |
| Referências de runtime | **Falhou**: duas chamadas da nova RPC ausentes do cache; 2055 arquivos/1080 referências. Cache de 22/09. |
| Sondagens remotas | Cinco funções operacionais 404, três funções de integração 200 em OPTIONS. Sem chamadas de negócio ou escrita remota. |
| Consistência documental | Gerador verifica unicidade de 250+32 IDs, 1000 requisitos e existência das fontes reavaliadas. |

A suíte integral **anterior**, do lote #40/#41, registrou 5518 aprovados e 112 ignorados, TypeScript 163 erros contra baseline 166, lint global 3288 e build aprovado. Esses números **não são nova execução nesta rodada** nem representam qualidade global sem dívida. A revisão atual concentrou a execução nas mudanças e riscos novos; não executou E2E autenticado nem certificou cobertura integral.

## Ordem de encerramento e checklist obrigatório

1. Recuperar CI e acesso administrativo **ao projeto correto**; registrar inventário/ledger/versões antes de publicar.
2. Revisar #42 e os demais problemas do status, cobrindo todos os escritores e histórico; validar sequência SQL completa em clone isolado.
3. Fechar transação de criação/edição de orçamento, versão esperada e tratamento de erros de itens/histórico/notificações.
4. Corrigir recuperação/escopo dos rascunhos e paginação/métricas logísticas.
5. Publicar o lote revisado de migrations/funções e testar arte, documentos, aprovações, kits e recompra com duas cooperativas/personas.
6. Fechar requisitos de negócio pendentes com responsável/revisor e executar jornada de compra integral; só então avançar ao piloto.

Para encerrar **cada requisito**, exigir:

- [ ] Critério original e dependências identificados; retirada de escopo somente documentada e aprovada.
- [ ] Implementação revisada e incorporada em main, com commit e arquivos.
- [ ] Quando remoto: migration/definição/código publicado no projeto canônico comprovados.
- [ ] Caminho feliz, negação por escopo, falha, concorrência e repetição testados conforme aplicável.
- [ ] Evidência anexada com ambiente, data, resultado e limites.
- [ ] Responsável e revisor nominais, aceite funcional/comercial/visual quando exigido.

Reprodução: `python3 scripts/revisao/gerar-revisao-2026-09-27.py`; `npx vitest run --config scripts/revisao/vitest-lacunas-20260927.config.ts`; `python3 scripts/revisao/simular-status-20260927.py`. As duas últimas sondagens devem ser lidas como diagnósticos de lacunas e adaptadas após a correção, sem transformá-las em metas de comportamento desejado.
