# Revisão do plano e da implementação — 12/09/2026

**Ainda não implementamos todas as melhorias.** A revisão reconhece avanços verificáveis e identifica funções parciais, funções sem implementação demonstrada e dependências externas. Não há evidência para declarar 10/10, compra integral homologada ou implantação concluída.

Código auditado: [`cfbcd8f14f023d385ae4329a3ac037c1b19c7b17`](https://github.com/adm01-debug/Brindes_Sicoob_V2/commit/cfbcd8f14f023d385ae4329a3ac037c1b19c7b17), na [PR #6](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/6). A revisão anterior, de `6f1c5f9`, foi preservada como registro histórico. Esta auditoria altera documentação e executores de revisão; não modifica o produto nem aplica migrations remotas.

## Resultado dos 1.000 requisitos

| Classificação | Revisão anterior | Revisão atual | Significado |
|---|---:|---:|---|
| L — evidência local delimitada | 76 | **88** | Há evidência suficiente apenas para o escopo descrito no item. |
| P — atendimento parcial | 622 | **622** | Existe trabalho aproveitável, mas o requisito inteiro permanece incompleto. |
| N — não demonstrado/localizado | 157 | **145** | Não foi localizada evidência suficiente no material revisado; não prova inexistência absoluta em processos externos. |
| V — validação externa necessária | 145 | **145** | Falta comprovação com ambiente, participantes, política, marca ou operação reais. |
| Total | 1.000 | **1.000** | 100 etapas, cada uma com dez diagnósticos individuais. |

**0 de 100 etapas formalmente concluídas.** O checklist original mantém 1.000 itens pendentes, sem responsáveis nominais, revisores e aceite completo. As classificações reconhecem trabalho técnico; não concedem baixa automática nem representam percentual de implantação.

Foram relidos os 1.000 requisitos e as 32 melhorias do benchmark. **126 diagnósticos foram reescritos**; 874 mantêm o diagnóstico histórico, explicitamente identificado na matriz. Doze itens passaram de N para P e doze de P para L; por isso o total parcial permaneceu igual. A revisão documental integral não equivale a executar 1.000 comportamentos ou inspecionar novamente cada linha do repositório.

- [Consulta pesquisável dos 1.000 requisitos](revisao-implementacao-2026-09-12/consulta.html), para abrir no navegador após baixar a pasta.
- [Matriz completa em Markdown](revisao-implementacao-2026-09-12/matriz.md), [CSV](revisao-implementacao-2026-09-12/matriz.csv) e [JSON](revisao-implementacao-2026-09-12/matriz.json).
- [Resumo das 100 etapas](revisao-implementacao-2026-09-12/resumo-100-etapas.md), [20 achados](revisao-implementacao-2026-09-12/achados.md) e [32 melhorias do benchmark](revisao-implementacao-2026-09-12/benchmark-32-melhorias.md).
- [Metodologia e mudanças de classificação](revisao-implementacao-2026-09-12/metadados.json), [fontes com hash](revisao-implementacao-2026-09-12/fontes.json), [validação estrutural](revisao-implementacao-2026-09-12/validacao.json) e [verificação da consulta no navegador](revisao-implementacao-2026-09-12/validacao-navegador.json).

## Avanços confirmados e limites

Seis achados anteriores foram corrigidos localmente no escopo original: logística canônica (A01), versionamento transacional (A07), histórico da busca principal segregado (A09), redação comercial recursiva (A10), exportação de campanhas (A11) e eventos/notificações in-app atômicos (A12). Ainda exigem implantação e homologação no ambiente próprio.

Também melhoraram a recompra, o autosave, a seleção de variante, a troca explícita de organização, as rotas públicas e a entrada. As falhas residuais abaixo impedem concluir esses fluxos. Há **20 achados rastreados: seis corrigidos localmente, oito parciais e seis abertos**; quatro achados foram adicionados nesta revisão.

A experiência de loja continua aproveitável: vitrine, intenções de compra, faixas de orçamento, cards, busca, comparação, favoritos, kits e ações móveis. A evidência visual de entrada/demo não comprova usabilidade da compra autenticada nem conformidade integral de acessibilidade. Propostas, arte, aprovação, recebimento e documentos precisam da mesma consistência visual e funcional. A tela ativa de agregados ainda contém lotes, valores, rastreio e efeitos sem fonte operacional.

## Pendências que impedem encerrar a implementação

P0 indica impedimento para liberar o fluxo afetado. P1 indica risco relevante que precisa de correção ou tratamento documentado antes de ampliar o uso. Nenhuma classificação afirma que houve incidente em produção.

| Prioridade | Achado | Evidência atual e impacto | Condição de fechamento |
|---|---|---|---|
| P0 | A17/A15 — política de aprovação | ID/versão gravados não congelam o conteúdo. Editar uma política pode retirar retroativamente o impedimento de autoaprovação; fallback global/específico não tem precedência própria. | Snapshot imutável, referências protegidas, precedência aceita, vínculo/competência vigente e política homologada. |
| P0 | A02 — financeiro e piloto | Notas usam FK do domínio legado. Pagamentos retornam lista vazia; piloto retorna lista vazia e função de alteração sem efeito. | Persistência canônica, revisão de arte com identidade/versão e conciliação documental real. |
| P0 | A03 — recompra | Consulta produto-base, mas cabeçalho e itens são gravados separadamente; erro da exclusão compensatória é ignorado. | Criação idempotente/transacional, validação de SKU, mínimo/múltiplo, endereço e mapeamento de PA/cliente. |
| P0 | A04 — autosave | Erro explícito foi corrigido, mas update sem linha afetada ainda preenche “salvo”. | Confirmar registro persistido, detectar zero linhas e testar concorrência/troca de kit/sessão. |
| P0 | A05 — estoque de kit | Cor selecionada é respeitada; duas linhas sintéticas do mesmo SKU são comparadas separadamente ao mesmo estoque. | Agregar demanda e validar composição/estoque no servidor; impedir aceitação de kit inconsistente. |
| P0 | A08 — contexto | Troca explícita melhorou; consulta antiga pode repor organização/papel após mudança de sessão. Catch conserva estado anterior. | Descartar respostas obsoletas e testar logout, revogação e retornos fora de ordem. |
| P0 | A14 — homologação | CI verde exclui projetos autenticados sem credenciais. | Gate que exija jornada autenticada e duas cooperativas segregadas, com resultados persistidos. |
| P1 | A18 — itens aprovados | Trigger aceita alteração após confirmação e verifica apenas o destino ao transferir um item. | Proteger composição aprovada e ambos os pedidos; revisão formal e total consistente. |
| P1 | A06 — indicadores | Remoção parcial de dados fictícios; agregados ainda usa mocks e statsService converte erros em zero. | Fonte operacional, estado indisponível e conciliação dos indicadores. |
| P1 | A16 — distribuição | RPC cria grupo sem vincular pedidos; remessa canônica é única por pedido. | Destinos e quantidades por item, parciais, divergências e conciliação. |
| P1 | A19 — qualidade dos testes | Happy aceita qualquer heading; timeout aceita body. Fluxo de catálogo até orçamento só navega. | Verificar dados esperados, ações e efeitos persistidos; resposta errada deve fazer o teste falhar. |
| P1 | A20 — vistos recentemente | Logout remove chave, mas lista permanece no store em memória. | Separar por identidade/contexto e limpar estado/timers ao trocar sessão. |
| P1 | A13 — CodeQL | SARIF atual contém 13 resultados pendentes de triagem. | Analisar caminhos/impacto, corrigir ou justificar cada resultado, definir gate de severidade. |

Referências diretas para revisão do código:

- Política: [resolvedor e guardas](../../supabase/migrations/20260912120000_sicoob_approval_policy_guards.sql), em especial `get_sicoob_order_approval_policy` e `freeze_sicoob_order_while_approval_pending`.
- Financeiro/piloto: [hooks provisórios](../../src/hooks/orders/extensions/index.ts), [notas fiscais](../../src/hooks/orders/extensions/useOrderInvoices.ts) e importação no [detalhe Sicoob](../../src/pages/sicoob/orders/OrderDetailPage.tsx).
- Recompra: [orderService.ts](../../src/services/sicoob/orderService.ts), inserts de `quotes` e `quote_items` em `reorderOrder`.
- Rascunhos e estoque: [useKitAutoSave.ts](../../src/hooks/useKitAutoSave.ts), [useKitStockValidation.ts](../../src/hooks/useKitStockValidation.ts) e [KitSummary.tsx](../../src/components/kit-builder/KitSummary.tsx).
- Contexto e memória: [OrganizationContext.tsx](../../src/contexts/OrganizationContext.tsx), [AuthContext.tsx](../../src/contexts/AuthContext.tsx) e [store de vistos](../../src/stores/useRecentlyViewedStore.ts).
- Dados fixos: [agregados](../../src/pages/sicoob/GestorConsolidatedOrdersPage.tsx) e [statsService.ts](../../src/services/sicoob/statsService.ts).

## Nove lacunas reproduzidas

As seis primeiras usam PostgreSQL 16 descartável, sem rede, fixture mínima e quatro migrations do candidato. Escritas diretas são executadas como `postgres`: demonstram lacunas de invariantes, **não** explorabilidade por comprador via RLS. A API e o schema remoto completo não foram testados por esse executor.

| Caso | Resultado observado | Requisito ainda não atendido |
|---|---|---|
| S01 | Pedido registra `baseline-tecnica-v1`, mas passa a resolver `local-v1` após sua publicação. | Política de pedido em análise preservada. |
| S02 | Editar a política muda autoaprovação de recusada para permitida; versão registrada continua `local-v1` e resolvedor retorna `local-v2`. | Conteúdo e impedimentos imutáveis. |
| S03 | Política global mais recente vence a específica da cooperativa. | Precedência explícita e validada; a expectativa de prioridade da específica precisa de aceite de negócio. |
| S04 | Pedido em `waiting_approval` aceita troca direta de referência/versão. | Congelamento da política aplicada. |
| S05 | Pedido confirmado conserva total 100; itens passam a totalizar 200. | Composição aprovada e despesa consistentes. |
| S06 | Item sai de pedido em análise e passa a draft, sem bloqueio do trigger. | Validação do pedido anterior e do destino. |
| S07 | Duas linhas de seis unidades aceitam estoque dez sem alerta. | Agregação da demanda por SKU. |
| S08 | Update com `error: null`, zero linhas e nenhum registro ainda gera `lastSavedAt`. | Confirmação efetiva de persistência. |
| S09 | Limpeza de `recently-viewed-products` não limpa o store real em memória. | Isolamento de navegação entre sessões/contextos. |

S07–S09 executam módulos reais com dependências simuladas. S07 não prova que a interface normal permita criar linhas duplicadas; testa a robustez do contrato recebido pelo hook. S08 simula resposta sem linha atualizada. S09 exercita a remoção de chave usada no logout, sem simular toda a sessão. Todos esses limites acompanham os resultados.

[Evidência SQL](revisao-implementacao-2026-09-12/simulacoes.json), [executor SQL](../../scripts/revisao/simular-pendencias-2026-09-12.py), [evidência dos testes dirigidos](revisao-implementacao-2026-09-12/testes-dirigidos.json) e [reproduções em hooks/store](../../scripts/revisao/pendencias-2026-09-12.cenarios.tsx). O sucesso desses nove casos significa **falha reproduzida**, não produto aprovado. No mesmo lote, **37 testes de regressão das correções existentes passaram**.

As reproduções históricas ficam fora da suíte normal do produto; executam apenas pela [configuração explícita de auditoria](../../scripts/revisao/vitest-pendencias-2026-09-12.config.ts). O JSON registra o comando utilizado. Isso evita incorporar expectativas de comportamento incorreto ao gate regular de aprovação.

## O que a CI atual comprova

Todos os checks executáveis consultados do candidato `cfbcd8f` passaram. Supabase Preview ficou ignorado. A coleta preserva nomes, horários, commit e links dos jobs no [registro de CI](revisao-implementacao-2026-09-12/ci.json).

Na publicação desta auditoria, o hook local `pre-push` executou `npm run typecheck` e falhou nos erros globais já existentes em `src/`. O diff confirmou que código de produto, migrations, testes do produto, dependências e workflows permaneceram idênticos ao candidato. O envio da documentação e executores foi realizado sem repetir esse hook, mantendo os checks remotos e a PR aberta. Isso não converte a checagem global em aprovada; ela continua pendente. [Registro do hook local](revisao-implementacao-2026-09-12/hook-local.json).

| Verificação | Resultado observado | Limite |
|---|---|---|
| Qualidade, contratos e build | Sucesso | Comparadores toleram dívida histórica; não significa lint/tipos globais zerados. |
| Typecheck global no hook local | Falhou | Erros preexistentes de `src/`; o commit da auditoria não os corrige. |
| Verba/aprovação e entrada/demo | Sucesso | Cenários isolados e telas delimitadas; não percorrem compra real completa. |
| Smoke E2E | 6 passados, 33 ignorados | Ignorados não contam como aprovados. |
| E2E shard 1 | 40 passados, 2 flaky | Dois casos precisaram de retry. |
| E2E shard 2 | 37 passados, 4 flaky | Quatro casos precisaram de retry. |
| E2E shard 3 | 39 passados, 2 flaky | Dois casos precisaram de retry. |
| E2E shard 4 | 41 passados | Setup é repetido entre shards. |
| Projetos autenticados | Excluídos sem credenciais | Exclusão via `testIgnore` pode não aparecer na contagem de skipped. |
| Lighthouse | Sucesso no login | Não mede compra autenticada nem Core Web Vitals de tráfego real. |
| CodeQL | Análise concluída, 13 resultados SARIF | Sem gate de severidade; triagem pendente. |

Os shards somam 157 casos passados sem flake e oito que passaram após retry, com setup repetido. Não devem ser anunciados como 165 jornadas independentes ou 165 casos estáveis. A redução de 26 para 13 resultados CodeQL não comprova que 13 vulnerabilidades foram corrigidas: é preciso comparar caminhos e fazer a triagem. [Resumo atual do SARIF](revisao-implementacao-2026-09-12/resumo-codeql.json).

As [asserções genéricas](../../e2e/routes/_factories.ts) e o [fluxo 26](../../e2e/flows/26-complete-flow.spec.ts) explicam por que tela renderizada não equivale a compra funcional. A CI passou no escopo configurado; a homologação completa continua pendente.

## Funções sugeridas ainda sem atendimento integral

| Tema | Situação atual | Etapas principais |
|---|---|---|
| Política institucional e delegação | Base técnica configurável; falta snapshot íntegro, competência de marca, delegação e aceite vigente. | E008, E012, E064–E069, E099 |
| Briefing e campanha por cooperativa | Componentes e cadastro genéricos; briefing institucional, marcos/destinos e colaboração incompletos. | E051–E052 |
| Arte para produção | Mockups e uploads existem; aceite imutável, revisão formal e bloqueio de produção por arte alterada não demonstrados. | E053–E054, E065 |
| Validação comercial de kits no servidor | Cálculos locais e variantes; capacidade, preço, demanda e regras não validados integralmente no backend. | E047, E055, E058 |
| Distribuição e recebimento parcial | Sem alocação/reconciliação por destino e item; consolidação visível ainda usa dados fixos. | E056, E074–E078 |
| Avaria, falta, reposição e crédito | Jornada rastreável de ocorrência até solução não demonstrada. | E077 |
| Conciliação financeira | Notas legadas e pagamentos provisórios; proposta, entrega, documentos e saldo não conciliados. | E078 |
| Previsão de estoque confiável | Interface não comprova modelo, qualidade ou nível de confiança. | E073, E089 |
| Usabilidade e acessibilidade da compra | Evidência local de amostras; faltam participantes, teclado, zoom e leitor de tela no ciclo completo. | E081, E088, E092 |
| Operação real e expansão | Faltam piloto, responsáveis, compra conciliada, tráfego real e segunda cooperativa. | E091, E093–E100 |

No benchmark de 32 melhorias: **6 com evidência local delimitada, 18 parciais, 4 não demonstradas e 4 dependentes de validação externa**. Não há conclusão formal do benchmark. Cada melhoria conserva diagnóstico anterior e atual para comparação.

## Correções de interpretação dos registros anteriores

O [registro das correções de 12/09](correcoes-revisao-2026-09-12.md) descreve avanços reais, mas algumas frases precisam de escopo mais preciso:

- “Preserva a versão aplicada” significa que grava ID/texto; S01–S04 demonstram que não preserva conteúdo imutável.
- “Exige vínculo ativo” verifica `profiles.is_active/deleted_at`, não o vínculo vigente em `organization_members`.
- “O rascunho é removido” descreve tentativa compensatória; o erro do delete não é verificado.
- “Estoque revalidado” na recompra significa produto-base; não cobre variante, mínimo, múltiplo e demanda agregada.
- Autosave trata erro explícito; ainda pode indicar salvo sem atualizar registro.
- Histórico da busca principal segregado não implica isolamento de todos os stores.
- Remover previsões das páginas de pedidos não remove dados fixos de todo o sistema.
- CI verde não substitui cenários autenticados, triagem de segurança ou evidência de produção.

Há ainda divergência de configuração: o frontend aponta ao banco próprio `cfmzkthhgliqelozlmwu`, enquanto [supabase/config.toml](../../supabase/config.toml) registra `hgbzltfwozdkcudofypy`. É necessário reconciliar o destino antes de executar migrations. O catálogo `doufsxqlfjyuvxuezpln` continua exclusivamente de consulta. README de produto e índice documental também conservam descrições históricas que precisam ser reconciliadas com o estado publicado.

## Ordem de execução após a revisão

1. Corrigir invariantes de política e itens, com os nove casos reproduzidos transformados em regressões que exijam comportamento correto.
2. Integrar notas, pagamentos e arte ao domínio Sicoob, preservando identidade, versão e histórico.
3. Tornar recompra/criação transacionais e completar validação de SKU, kit e persistência de rascunho.
4. Corrigir respostas obsoletas de organização e limpar todos os stores por identidade/contexto.
5. Substituir mocks ativos e completar distribuição, parciais, ocorrências e conciliação.
6. Fortalecer asserções, remover flakiness e executar homologação autenticada com duas cooperativas segregadas.
7. Reconciliar configuração, schema e políticas vigentes; validar marca, acessibilidade e tarefas com compradores/marketing.
8. Percorrer piloto completo até conciliação, obter aceite nominal e comprovar operação real antes de baixar etapas finais.

Cada uma das 1.000 linhas contém requisito original, diagnóstico, classificação anterior/atual, referências, dependências e condição de baixa. O encerramento continua exigindo dez evidências, entregável verificável, responsável nominal, revisor, aceite específico e dependências concluídas.
