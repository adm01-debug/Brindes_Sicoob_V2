# Plano de correções e melhorias — 150 etapas

**Versão 1.0 — 2026-09-27. Somente planejamento: 150 etapas e 900 itens de checklist pendentes.**

Base: [relatório da auditoria de 27/09](https://github.com/adm01-debug/Brindes_Sicoob_V2/blob/372ef24a6f13673a218dc73d23468e26dd09eaf4/docs/execucao/revisao-do-plano-2026-09-27.md), código `3094cbab22adfa012edcca5278680fa739df46ca` e auditoria `372ef24a6f13673a218dc73d23468e26dd09eaf4`. PRs #42 e #43 estavam abertos na elaboração; o plano referencia a evidência por commit e não presume seu merge. Os fatos de 27/09 devem ser revalidados antes de implementar.

## Objetivo e limites

Encerrar as falhas F01–F12, completar as capacidades institucionais e homologar uma loja Sicoob conectada aos fluxos reais de compra. Aproveitar o código integrado e corrigir somente o que a evidência exigir. Etapas que já estiverem atendidas precisam de prova atual; não devem gerar reimplementação.

O projeto segue em construção. As etapas P147–P150 exigem operação real e dependem de decisão de lançamento; não são executadas automaticamente pela criação deste plano. O banco operacional é `cfmzkthhgliqelozlmwu` e o catálogo `doufsxqlfjyuvxuezpln` permanece exclusivamente de consulta. Não aplicar migrations históricas em bloco, fabricar entradas de ledger, expor segredos ou confundir MCP de outro projeto com o canônico.

Este plano organiza execução; não cancela os 1.000 subitens originais nem soma suas etapas a eles para produzir um percentual de produto pronto. P003 reconcilia a rastreabilidade completa e P004 revalida as 200 avaliações históricas. [Rastreabilidade das origens citadas](rastreabilidade.csv) mostra relações explícitas; não é prova de cobertura integral dos 1.000 subitens. Retirada de escopo exige decisão documentada do responsável de negócio.

## Como executar e encerrar

1. Confirmar baseline, dependências e premissas antes de editar; reproduzir a falha quando houver.
2. Executar o lote em worktree isolado, com diff mínimo, revisão e testes proporcionais ao risco.
3. Para mudança remota: conferir alvo e recuperação, validar em ambiente isolado, integrar revisão, publicar lote aprovado e verificar o resultado no canônico. Merge e OPTIONS 200 não comprovam implantação.
4. Registrar ambiente, data, commit, entrada sintética, resultado esperado/observado e limitações. Anexar logs sanitizados e evidência de autorização negativa quando aplicável.
5. Preencher executor e revisor nominais, seis itens do checklist e critério específico. Documento ou configuração só exige publicação remota quando isso fizer parte do seu aceite. Aceite local nunca fecha sozinho uma etapa operacional.
6. Reabrir etapa se teste regredir, evidência expirar ou dependência deixar de estar atendida. Não trocar falha por skip/allowlist e não contabilizar sonda que reproduz defeito como produto aprovado.

Responsáveis abaixo são funções sugeridas; nomes e capacidade serão definidos em P005. Não há datas de entrega ou esforço inventados. P1 bloqueia o aceite do fluxo afetado; P2 é requisito de completude do produto, também obrigatório antes do encerramento integral. Não se presume incidente em produção.

**Numeração não é ordem linear nem duração.** Dependências explícitas podem apontar a número posterior e são verificadas como grafo sem ciclos. Exemplo: P076 depende de P096, pois publicar o kit exige a validação física da embalagem. As frentes de catálogo, arte e design podem avançar antes da publicação; nunca começar a mudança dependente enquanto seu pré-requisito estiver aberto. [Ondas de precedência](validacao.json) são ordem técnica possível, não agenda de pessoas. Custos, escolha de política comercial e liberação de produção permanecem decisões dos responsáveis.

**Recuperação:** cada fase inclui contingência. Antes de mudança em banco, registrar backup/restauração e impacto de versão anterior; preferir correção progressiva de schema quando desfazer significar perder dados. Não executar DDL ad hoc sem rastreabilidade. Nos recursos externos, somente testar envio/alteração dentro do escopo autorizado.

## Frentes e marcos

| Etapas | Frente | Entrega de fechamento |
|---|---|---|
| P001–P010 | Governança, preservação e critérios | Plano operacional com dependências sem ciclo e gates de integração claramente definidos. |
| P011–P020 | Acesso, CI e ambiente de homologação | Relatório de restore com tempos medidos e lacunas conhecidas; PITR somente se disponível e testado. |
| P021–P030 | Reconciliação de schema, contratos e segurança | Baseline reproduzível e versionada; pacote de schema liberado para contratos de negócio. |
| P031–P040 | Status, concorrência e histórico de orçamentos | Aceite do módulo de status com evidência remota e nenhum bloqueador do lote aberto. |
| P041–P050 | Criação e edição transacional de orçamentos | Aceite do agregado com testes locais e remotos e plano de recuperação comprovado. |
| P051–P060 | Rascunhos, identidade e recuperação | Aceite de autosave com evidência de sessão real, sem dados de outro ator. |
| P061–P070 | Notificações, outbox e observabilidade | Evidências de entrega e recuperação completas, com limites e latência medida. |
| P071–P080 | Publicação e homologação de Edge Functions | Lote remoto homologado, sem 404 nos contratos previstos e com diferenças explicitamente resolvidas. |
| P081–P090 | Convites, alçadas, cotações e delegações | Aceite técnico e dos responsáveis de negócio com decisões rastreáveis. |
| P091–P100 | Catálogo, kits, embalagem e recompra | Aceite comercial e técnico com origem dos dados e limites de prazo explícitos. |
| P101–P110 | Marca, arte e documentos protegidos | Política executável e ensaiada sem assumir que backup SQL contém arquivos. |
| P111–P120 | Logística, distribuição e pós-entrega | Aceite operacional do lote logístico com evidência por PA e recuperação de falha. |
| P121–P130 | Campanhas, finanças e operação administrativa | Aceite de negócio com números conciliados e pendências identificadas. |
| P131–P140 | Experiência de loja, marca e acessibilidade | Aceite de compradores/marketing registrado e problemas críticos de jornada encerrados. |
| P141–P150 | Qualidade integrada, release e operação real | Termo de aceite com evidências, responsáveis e backlog residual aprovado; nenhuma nota 10/10 autodeclarada. |

## Fontes de execução

- Diagnóstico F01–F12: relatório fixado acima. Matrizes históricas: `docs/execucao/revisao-plano-20260924/`; aceites de produto: `docs/plano-implementacao/plano-100-etapas.md`.
- Orçamentos: `src/services/QuoteService.ts`, `src/hooks/quotes/useQuotes.ts`, `src/pages/QuoteViewPage.tsx`, `src/hooks/useDiscountApproval.ts` e migrations de status `2026092711*`.
- Rascunhos: `src/components/quotes/QuoteAutoSave.tsx`, `src/hooks/useAutoSave.ts` e `src/contexts/AuthContext.tsx`.
- Logística e kits: `src/services/sicoob/logisticsReportService.ts`, `src/services/sicoob/fulfillmentService.ts`, `src/hooks/useKitStockForecast.ts`, `supabase/functions/sicoob-kit-quote/catalog.ts`.
- Implantação: `.github/workflows/deploy-sicoob-functions.yml`, `supabase/config.toml`, manifesto de autorização e runbooks em `docs/`.
- Segurança da Data API: tratar grants de objetos e RLS de linhas como controles distintos e validar ambos. [Documentação oficial Supabase](https://supabase.com/docs/guides/api/securing-your-api).
- Antes da implementação, consultar changelog e documentação vigentes. A revisão de 25/09 sobre PostgreSQL pede verificar aplicabilidade de extensões/operadores; não significa que o projeto esteja afetado. [Changelog oficial](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).

## Etapas detalhadas

Todos os 282 IDs históricos (250 etapas e 32 melhorias) possuem destino explícito no CSV de rastreabilidade. Isso é cobertura documental de encaminhamento, não certificação funcional dos 1.000 subitens.

| Achado confirmado | Etapas de tratamento e verificação |
|---|---|
| F01 | P071, P073, P074, P075, P076, P077, P080, P107, P109 |
| F02 | P024, P028, P034, P037, P039, P080 |
| F03 | P016, P031, P032, P038, P039 |
| F04 | P041, P042, P043, P044, P047, P050, P058 |
| F05 | P033, P043, P046, P047, P050 |
| F06 | P035, P036, P038, P048, P050 |
| F07 | P051, P052, P053, P054, P056, P058, P060 |
| F08 | P111, P120 |
| F09 | P061, P062, P063, P069 |
| F10 | P010, P014, P015 |
| F11 | P001, P010, P011, P012, P021, P022, P024, P080, P144 |
| F12 | P095, P096, P097 |


## Fase 01 — Governança, preservação e critérios

**Risco a controlar:** Perder trabalho local ou dar baixa em requisito sem prova.

**Contingência:** Preservar snapshots e reabrir decisões sem sobrescrever histórico.


### P001 — Fixar a referência auditada

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** Nenhuma; ponto de partida. **Origem:** E001, C01, C42, F11, C34.

**Ação:** Registrar SHAs de main, relatório e PRs #42/#43, data, ambiente e diferença entre código local, publicado e banco. Manter relatório da comparação tripla versionado com evidências sanitizadas.

**Simulação obrigatória:** Comparar árvore local limpa, checkout sujo e commit remoto sem sobrescrever trabalho existente.

**Entregável e aceite:** Inventário com hashes e origem inequívoca de cada evidência.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P002 — Preservar alterações e worktrees existentes

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P001 **Origem:** T01, T02, T49, C04, T09, T11.

**Ação:** Inventariar diffs, commits órfãos, AUDITORIA.md e PLANO_100.md; identificar conteúdo já absorvido e conteúdo exclusivo. Distinguir evidências intencionais de caches e sondas temporárias; não apagar artefato antes de reconciliar sua origem.

**Simulação obrigatória:** Reconstituir cada alteração em worktree descartável sem excluir arquivos do diretório principal.

**Entregável e aceite:** Mapa de preservação com destino e checksum de cada artefato exclusivo.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P003 — Consolidar a rastreabilidade dos planos

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P002 **Origem:** E010, C35, C36.

**Ação:** Relacionar as 250 etapas, 32 melhorias e 1000 subitens aos novos pacotes, mantendo sobreposições e histórico.

**Simulação obrigatória:** Detectar requisito sem responsável, sem etapa de destino ou coberto apenas por diagnóstico antigo.

**Entregável e aceite:** Matriz de rastreabilidade sem requisito silenciosamente descartado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P004 — Revalidar os diagnósticos históricos

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P003 **Origem:** C13, C39, E090.

**Ação:** Reexaminar as 200 avaliações preservadas da auditoria e priorizar leitura de contratos e dependências alterados.

**Simulação obrigatória:** Confrontar amostra remota e implementação; registrar indisponibilidade como bloqueio e não como ausência comprovada.

**Entregável e aceite:** Cada diagnóstico recebe evidência atual ou bloqueio explícito, sem promoção automática a concluído.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P005 — Atribuir responsáveis e capacidade

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P004 **Origem:** E005, E010, C38, C46.

**Ação:** Nomear executor, revisor técnico e responsável de negócio por pacote; estimar esforço após descoberta e registrar capacidade.

**Simulação obrigatória:** Simular indisponibilidade de um responsável e disputa entre correção crítica e melhoria estética.

**Entregável e aceite:** Fila priorizada com donos reais, capacidade e previsão revisável, sem prazo fictício.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P006 — Definir critérios e estados de acompanhamento

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P005 **Origem:** E100, C35.

**Ação:** Separar planejado, em execução, validado localmente, integrado, publicado, homologado e encerrado; definir evidência mínima por estado.

**Simulação obrigatória:** Tentar encerrar item sem teste, sem implantação aplicável ou com dependência incompleta.

**Entregável e aceite:** Registro impede conclusão indevida e preserva justificativa de reabertura.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P007 — Atualizar decisões arquiteturais e comerciais

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P006 **Origem:** C21, C37, C38, C49.

**Ação:** Revisar decisões antigas sobre Bitrix, RPCs, legado, colaboração e alçadas; manter o que já foi resolvido com prova.

**Simulação obrigatória:** Comparar decisão antiga que diz recurso ausente com inventário atual que o encontra.

**Entregável e aceite:** Registro único de decisões com alternativas, impacto, dono e data de revisão.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P008 — Definir plano de recuperação por lote

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P007 **Origem:** R05, R49, E020, C32.

**Ação:** Estabelecer snapshot anterior, rollback de aplicação, correção progressiva de schema e interrupção segura de publicação. Ensaiar runbook DDL com contexto transacional correto e trilha do lote.

**Simulação obrigatória:** Simular falha após schema novo e antes de publicar consumidor, preservando gravações já aceitas.

**Entregável e aceite:** Procedimento por tipo de mudança com gatilho de interrupção e responsável.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P009 — Preparar cenários e dados sintéticos

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P008 **Origem:** R16, E013, E099.

**Ação:** Definir duas cooperativas, múltiplos PAs, compradores, gestores, marketing e operadores com dados fictícios identificáveis.

**Simulação obrigatória:** Simular acesso cruzado, papel revogado, usuário sem PA, três destinos e orçamento com duas versões.

**Entregável e aceite:** Catálogo de personas e fixtures reproduzíveis, com limpeza limitada aos próprios dados de teste.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P010 — Estabelecer os marcos de execução

**Prioridade:** P1 · **Responsável funcional:** Coordenação técnica e produto · **Estado:** Planejada.

**Dependências:** P009 **Origem:** E010, R50, F10, F11, R01.

**Ação:** Ordenar os lotes por integridade, implantação, negócio e experiência; separar bloqueios externos do trabalho local independente. Como o ambiente é de construção, substituir congelamento genérico por controle explícito do lote e dos escritores afetados.

**Simulação obrigatória:** Simular CI indisponível e acesso SQL negado sem interromper desenho ou testes locais possíveis.

**Entregável e aceite:** Plano operacional com dependências sem ciclo e gates de integração claramente definidos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 02 — Acesso, CI e ambiente de homologação

**Risco a controlar:** Usar projeto errado, expor segredo ou contratar recurso sem orçamento.

**Contingência:** Interromper publicação; revogar acesso inadequado e restaurar configuração anterior.


### P011 — Confirmar o projeto canônico e seus ambientes

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P001, P005 **Origem:** E001, E003, F11.

**Ação:** Validar ref cfmzkthhgliqelozlmwu, endpoints e identidade administrativa; identificar staging e catálogo externo somente leitura.

**Simulação obrigatória:** Tentar usar configuração de outro projeto e exigir interrupção antes de qualquer escrita.

**Entregável e aceite:** Mapa de ambientes validado por metadados e checks de identidade.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P012 — Restabelecer acesso administrativo mínimo

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P011 **Origem:** R03, R07, F11.

**Ação:** Obter identidade autorizada para ledger, catálogo SQL e publicação; guardar credenciais em mecanismo seguro com escopo e validade.

**Simulação obrigatória:** Exercitar leitura administrativa autorizada e recusa de identidade sem privilégio sem expor tokens.

**Entregável e aceite:** Acesso comprovado ao alvo com limites, dono e expiração registrados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P013 — Revisar credenciais e configuração pública

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P012 **Origem:** E002, R34, T29, T47.

**Ação:** Inventariar nomes, consumidores e rotação; validar chave pública no frontend e segredo apenas em servidor/CI.

**Simulação obrigatória:** Inspecionar bundle e logs; invalidar credencial substituída em ensaio controlado e testar recuperação.

**Entregável e aceite:** Inventário de credenciais sem valores, builds sem segredo e rotação comprovada onde necessária.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P014 — Restabelecer execução do GitHub Actions

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P013 **Origem:** F10, R46.

**Ação:** Diagnosticar orçamento e quotas com administrador; executar workflow mínimo e impedir dispatch repetitivo sem runner.

**Simulação obrigatória:** Validar execução iniciada, artefato produzido e falha claramente reportada; custo adicional exige decisão do responsável.

**Entregável e aceite:** CI executa com orçamento autorizado e dono operacional definido.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P015 — Exigir checks e revisão em main

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P014 **Origem:** R02, T07, T12, T31, F10, C30.

**Ação:** Selecionar checks estáveis obrigatórios, revisão e política de bypass adequada à equipe; manter proteção contra force-push. Registrar a causa do gap histórico e comprovar que a regra vigente bloqueia o caminho antes permitido.

**Simulação obrigatória:** Abrir PR sintético com teste falhando e comprovar bloqueio; confirmar caminho de emergência auditado.

**Entregável e aceite:** Proteção configurada e testada, sem depender somente de hook local.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P016 — Reconciliar PRs #42 e #43

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P014, P015 **Origem:** C03, T06, F03, R04, C02, T05.

**Ação:** Revisar compatibilidade SQL, normalização e relatório; integrar somente após validar diff e dependências atualizadas. Conferir também PRs históricos #8/#9 e commits sem revisão, registrando revisão retroativa quando cabível, sem reaplicar conteúdo já absorvido.

**Simulação obrigatória:** Reproduzir conflito de merge e conferir que correções não desapareceram após squash.

**Entregável e aceite:** Histórico de PRs e commits integrado com resultado de checks, sem contar branch aberta como main.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P017 — Criar homologação Supabase segregada

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P016 **Origem:** R14, R15, E020, C48.

**Ação:** Provisionar ambiente isolado com Auth, Storage e Edge equivalentes; usar snapshot sanitizado e configuração própria. Distinguir PostgreSQL mínimo descartável de homologação completa com Auth, Storage e provedores.

**Simulação obrigatória:** Garantir que testes destrutivos locais não alcançam canonical nem catálogo externo; estimar custo antes de criar recurso pago.

**Entregável e aceite:** Ambiente reproduzível, identificado e sem dados pessoais reais.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P018 — Configurar execução autenticada de contratos

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P017 **Origem:** T03, T04, T34, R17, E014, E015, R33, B09.

**Ação:** Cadastrar personas e secrets por ambiente; validar login, recuperação, MFA quando exigido, renovação e revogação. Manter passkey desativada até existir verificação de desafio/assinatura no servidor e aceite do método. Reconciliar auth.users/profiles, perfis duplicados/órfãos e fluxo autenticado de primeiro orçamento.

**Simulação obrigatória:** Executar login, recuperação expirada, sessão revogada e duas personas; ausência de segredo obrigatório deve falhar explicitamente, sem skip que aparente sucesso.

**Entregável e aceite:** E2E autenticado operacional com artefatos sanitizados e escopo restrito.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P019 — Consolidar automações sem perder cobertura

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P018 **Origem:** T37, C20, C31, C47, C29, T08, T15, T38.

**Ação:** Revisar workflows, concurrency, permissões e setup comum; acrescentar alerta de branch sem PR e atualização semanal de inventário. Consolidar npm/lockfile, nomes de scripts e separação build/auditoria de rede; demonstrar execução do drift de ledger.

**Simulação obrigatória:** Simular push rápido, job cancelado, cache expirado e branch abandonada sem duplicar publicações.

**Entregável e aceite:** Mapa de automações, agenda e responsáveis com execução demonstrada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P020 — Ensaiar backup e restauração

**Prioridade:** P1 · **Responsável funcional:** Plataforma e administração do projeto · **Estado:** Planejada.

**Dependências:** P019 **Origem:** R05, R06, R08.

**Ação:** Produzir backup autorizado, hash e política de retenção; restaurar schema, dados necessários e referências de Storage em ambiente isolado.

**Simulação obrigatória:** Medir restauração e verificar vínculos, funções, policies e possibilidade real de recuperar arquivos externos ao dump.

**Entregável e aceite:** Relatório de restore com tempos medidos e lacunas conhecidas; PITR somente se disponível e testado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 03 — Reconciliação de schema, contratos e segurança

**Risco a controlar:** Aplicar histórico incompatível ou ampliar privilégio inadvertidamente.

**Contingência:** Reverter aplicação quando compatível; corrigir schema progressivamente a partir de snapshot ensaiado.


### P021 — Inventariar PostgreSQL e extensões

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P012, P020 **Origem:** F11, R07, T27, E011.

**Ação:** Coletar versão, extensões, operadores, collations e objetos afetados por atualizações relevantes; consultar changelog vigente. Incluir modelo canônico, tabelas operacionais e relações entre módulos.

**Simulação obrigatória:** Verificar aplicabilidade de mudanças sem presumir uso de ltree, pgcrypto ou btree_gist; simular restore com extensões instaladas.

**Entregável e aceite:** Inventário de compatibilidade e ações justificadas; nenhuma atualização automática sem necessidade.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P022 — Comparar ledger, arquivos e definições

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P021 **Origem:** F11, R12, R13, C43, R18.

**Ação:** Extrair versões, nomes, hashes e DDL efetivo; comparar nos dois sentidos com migrations e snapshots versionados. Revalidar as 11 tabelas Sicoob previamente aplicadas por definição e ledger; existência histórica não autoriza recriação.

**Simulação obrigatória:** Identificar versão só local, só remota, hash divergente e objeto alterado sem migration.

**Entregável e aceite:** Relatório de drift com classificação por objeto e origem, sem repair artificial.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P023 — Classificar o histórico de migrations

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P022 **Origem:** R09, R10, R11, C05, C06, C07, C08.

**Ação:** Separar aplicadas, equivalentes, substituídas, pendentes e incompatíveis; documentar dependência de cada lote candidato.

**Simulação obrigatória:** Ensaiar subconjunto mínimo e detectar migration antiga que recria objeto ou amplia acesso.

**Entregável e aceite:** Backlog classificado e ordem justificada; vedada aplicação indiscriminada do histórico.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P024 — Reconciliar tipos e contratos de API

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P023 **Origem:** R22, R37, T22, F02, F11, C10, C11.

**Ação:** Regenerar tipos do ambiente correto e comparar RPCs, overloads, colunas, nullabilidade e relações com consumidores. Conferir create_quote_version_atomic, check_rls_enabled e get_enum_values já existentes antes de planejar aplicação adicional.

**Simulação obrigatória:** Detectar RPC ausente, argumento renomeado, resultado nulo e coluna text divergente de enum.

**Entregável e aceite:** Tipos e contratos revisados com gate de drift contra fonte autenticada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P025 — Revalidar RLS e políticas de escrita

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P024 **Origem:** R20, R28, R29, R30, E013, C12.

**Ação:** Catalogar policies de tabelas expostas e testar leitura, inserção, edição e exclusão por ator/cooperativa/PA. Reauditar contratos Bitrix e helpers aplicados com personas e método de ACL apropriado.

**Simulação obrigatória:** Testar zero linhas afetadas, mudança de ownership, papel revogado e acesso direto pela API.

**Entregável e aceite:** Matriz positiva e negativa com evidência por operação; RLS habilitado sozinho não encerra etapa.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P026 — Auditar funções privilegiadas e views

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P025 **Origem:** R24, R31, T27, C17.

**Ação:** Revisar necessidade de SECURITY DEFINER, search_path, ACLs, autorização interna e security_invoker nas views aplicáveis. Revalidar revogação de chaves MCP e seu log na mesma transação; não usar set_config em requisição separada para simular contexto persistente.

**Simulação obrigatória:** Invocar RPC como anon, autenticado fora do escopo e ator autorizado; tentar leitura cruzada via view.

**Entregável e aceite:** Privilégios mínimos demonstrados sem usar service_role para simular usuário final.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P027 — Revisar índices e integridade referencial

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P026 **Origem:** R19, R44, R45.

**Ação:** Inspecionar constraints, FKs, índices inválidos, duplicados e consultas críticas com planos representativos.

**Simulação obrigatória:** Executar consultas grandes, updates concorrentes e inserção de referência inválida em homologação.

**Entregável e aceite:** Índices justificados por plano de execução e constraints validadas sem perda de dados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P028 — Renovar inventário de runtime

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P027 **Origem:** R26, C19, C33, C39, C47, F02, C16.

**Ação:** Atualizar snapshot autenticado de tabelas, RPCs e buckets; incluir validade, hash e chamadas dinâmicas conhecidas. Conferir buckets reais e call-sites Storage multilinha, além de nomes presentes em tipos.

**Simulação obrigatória:** Remover recurso apenas em fixture e comprovar detecção; testar snapshot vencido e erro de coleta.

**Entregável e aceite:** Gate confiável sem allowlist para esconder bulk_update_quote_status_atomic ausente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P029 — Reconciliar recursos legados e órfãos

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P028 **Origem:** C21, C22, C23, C27, C28, C49.

**Ação:** Atribuir destino a famílias de PAs, blog, funções e buckets; levantar consumidores externos e regras de retenção.

**Simulação obrigatória:** Conferir objetos armazenados, crons e referências antes de propor arquivamento ou exclusão.

**Entregável e aceite:** Decisão por recurso com dono; recursos mantidos ou retirados com prova, sem apagar por nome ou contagem antiga.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P030 — Validar baseline e proteção de migrations

**Prioridade:** P1 · **Responsável funcional:** Engenharia de banco de dados · **Estado:** Planejada.

**Dependências:** P029 **Origem:** R06, R08, R47, T14.

**Ação:** Reproduzir schema mínimo aprovado a partir da baseline reconciliada; conferir ordem, unicidade e imutabilidade no CI.

**Simulação obrigatória:** Simular arquivo aplicado modificado e ledger divergente; comprovar falha do gate e caminho de correção progressiva.

**Entregável e aceite:** Baseline reproduzível e versionada; pacote de schema liberado para contratos de negócio.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 04 — Status, concorrência e histórico de orçamentos

**Risco a controlar:** Gravar transição sem alçada, versão ou evento correspondente.

**Contingência:** Bloquear escritor inseguro e restaurar consumidor compatível; nunca apagar histórico para esconder falha.


### P031 — Definir contrato canônico dos status

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P024, P025, P026, P030 **Origem:** E018, E059, F03.

**Ação:** Inventariar status em quotes, UI, RPCs e integrações; documentar estados e transições permitidas por ator.

**Simulação obrigatória:** Comparar enum existente, coluna text e valores históricos; identificar estado usado na UI mas recusado no banco.

**Entregável e aceite:** Matriz única de estados/transições e compatibilidade de leitura/escrita.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P032 — Resolver compatibilidade do enum

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P016, P031 **Origem:** F03, R21.

**Ação:** Revisar solução do #42 frente ao schema real e preservar migrations imutáveis; gerar ajuste novo se necessário.

**Simulação obrigatória:** Aplicar sequência em schema text sem enum e schema enum existente, incluindo valores já persistidos.

**Entregável e aceite:** Sequência passa nos dois cenários suportados sem conversão destrutiva nem repair fictício.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P033 — Preservar versão esperada na transição

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P032 **Origem:** F05, E059, E085.

**Ação:** Definir versão observada pela tela como pré-condição, sem substituí-la por leitura recente que mascara edição desatualizada.

**Simulação obrigatória:** Dois atores leem versão 1; após um gravar versão 2, o outro recebe conflito sem mutação.

**Entregável e aceite:** Contrato de conflito reproduzível e mensagem de recuperação com preservação do trabalho.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P034 — Completar autorização da RPC de status

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P033 **Origem:** E012, E018, F02.

**Ação:** Validar ownership, papel, cooperativa, estado inicial e valores nulos em cada transição; avaliar limites e duplicatas de lote.

**Simulação obrigatória:** Testar IDs mistos, ator sem escopo, supervisor de outra unidade, status inválido e lote com versão divergente.

**Entregável e aceite:** Lote inteiro negado quando qualquer item falha; aprovação exige alçada correta.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P035 — Centralizar todos os escritores de status

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P034 **Origem:** F06, E068.

**Ação:** Mapear QuoteViewPage, descontos, hooks, webhooks e rotinas; encaminhar mutações ao contrato autorizado.

**Simulação obrigatória:** Exercitar cada consumidor e detectar update direto remanescente que contorne versão ou histórico.

**Entregável e aceite:** Mapa de escritores sem caminho de negócio fora do contrato definido.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P036 — Garantir histórico exatamente uma vez

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P035 **Origem:** F06, E068.

**Ação:** Escolher responsabilidade única entre trigger e RPC sem perder eventos de escritores existentes; proteger eventos contra alteração.

**Simulação obrigatória:** Mudar status individual/em lote, repetir chamada e falhar ao inserir histórico; exigir rollback ou evento único conforme contrato.

**Entregável e aceite:** Cada transição aceita produz um evento íntegro com ator, versão e estado anterior correto.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P037 — Endurecer invariantes e concorrência do lote

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P036 **Origem:** R21, T39, F02.

**Ação:** Definir comportamento de lote vazio, repetido, acima do limite, status idêntico e conflito parcial; manter locks ordenados.

**Simulação obrigatória:** Executar lotes sobrepostos simultâneos e interrupção de conexão; verificar ausência de sucesso parcial e deadlock evitável.

**Entregável e aceite:** Resultado transacional determinístico e erros categorizados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P038 — Reproduzir e converter sondas de status

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P037 **Origem:** F03, F06, C40.

**Ação:** Preservar evidências da auditoria e criar regressões do comportamento desejado após correção.

**Simulação obrigatória:** Sonda antiga reproduz problema na base; teste novo falha na base e passa no candidato com schema representativo.

**Entregável e aceite:** Suíte distingue diagnóstico histórico e proteção contra regressão.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P039 — Aplicar contrato revisado no banco de construção

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P015, P016, P020, P038 **Origem:** F02, F03, R21.

**Ação:** Conferir identidade, backup, janela e diff; aplicar somente lote aprovado e verificar ledger, ACLs e assinatura RPC.

**Simulação obrigatória:** Executar chamada autorizada e negada após aplicação; simular consumidor anterior compatível e rollback de aplicação.

**Entregável e aceite:** RPC exposta com versão comprovada e efeitos/histórico conciliados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P040 — Homologar fluxo completo de status

**Prioridade:** P1 · **Responsável funcional:** Backend e banco de dados · **Estado:** Planejada.

**Dependências:** P039 **Origem:** E018, E068, E090.

**Ação:** Validar tela, RPC, histórico, atualização de lista e recuperação de conflito com personas reais de teste.

**Simulação obrigatória:** Aprovar, rejeitar, enviar para singular e repetir lote; confirmar ausência de confirmação falsa.

**Entregável e aceite:** Aceite do módulo de status com evidência remota e nenhum bloqueador do lote aberto.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 05 — Criação e edição transacional de orçamentos

**Risco a controlar:** Aceitar agregado parcial ou sobrescrever edição concorrente.

**Contingência:** Suspender gravação do caminho afetado e reconciliar por identidade/versionamento, preservando dados.


### P041 — Definir agregado transacional de orçamento

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P030, P033 **Origem:** F04, E057, E058.

**Ação:** Especificar cabeçalho, itens, variantes, personalizações, totais, histórico e chave idempotente como unidade de escrita.

**Simulação obrigatória:** Injetar falha em cada componente e definir estado final esperado sem registros parciais.

**Entregável e aceite:** Contrato de agregado revisado e invariantes explícitas de dinheiro e quantidade.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P042 — Implementar criação atômica

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P041 **Origem:** F04, B06.

**Ação:** Criar caminho servidor para gravar agregado inteiro com autorização e validação comercial; retornar identidade e versão.

**Simulação obrigatória:** Falhar após cabeçalho, durante itens e na personalização; retry não deve criar segundo orçamento.

**Entregável e aceite:** Criação produz tudo ou nada, com resposta recuperável por chave idempotente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P043 — Implementar edição atômica

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P042 **Origem:** F04, F05.

**Ação:** Aplicar atualização de cabeçalho, diferença de itens, personalizações e histórico na mesma transação.

**Simulação obrigatória:** Recusar exclusão de item ou gravação de personalização e conferir rollback de todo o agregado.

**Entregável e aceite:** Edição preserva consistência e não anuncia sucesso diante de erro interno.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P044 — Preservar identidades e referências dos itens

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P043 **Origem:** E047, E059, F04.

**Ação:** Manter IDs estáveis quando item não mudou e tratar vínculos com arte/documentos ao substituir variante ou remover item.

**Simulação obrigatória:** Editar quantidade sem quebrar referência; remover item com vínculo protegido e validar regra definida.

**Entregável e aceite:** Relacionamentos permanecem válidos e mudanças destrutivas são rejeitadas ou explicitamente versionadas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P045 — Validar totais no servidor

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P044 **Origem:** E017, E058, R27.

**Ação:** Recalcular subtotais, descontos, markup, personalização, frete e arredondamento; preservar snapshot comercial aprovado.

**Simulação obrigatória:** Enviar total adulterado, quantidade negativa, casas decimais extremas e desconto acima da alçada.

**Entregável e aceite:** Total persistido é reproduzível e não depende de confiança no cálculo do navegador.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P046 — Proteger a edição contra tela antiga

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P045 **Origem:** F05, E085.

**Ação:** Enviar row_version original do editor e devolver conflito estruturado com diferenças relevantes.

**Simulação obrigatória:** Dois editores alteram o mesmo orçamento; o segundo não sobrescreve silenciosamente dados novos.

**Entregável e aceite:** Conflito preserva rascunho local e permite revisão antes de nova tentativa.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P047 — Integrar QuoteService ao contrato novo

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P046 **Origem:** F04, F05.

**Ação:** Substituir a sequência REST de create/update pelos caminhos atômicos; tratar erro e zero linhas sem sucesso falso.

**Simulação obrigatória:** Simular erro de rede, rejeição de autorização, resposta incompleta e erro ao excluir itens.

**Entregável e aceite:** Todos os consumidores recebem sucesso somente após commit integral confirmado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P048 — Garantir auditoria e idempotência da edição

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P047 **Origem:** F06, B06.

**Ação:** Tornar evento parte da transação e diferenciar mesma chave/mesmo payload de mesma chave/payload divergente.

**Simulação obrigatória:** Perder resposta após commit e reenviar; conferir evento e itens sem duplicação.

**Entregável e aceite:** Repetição segura e colisão de intenção recusada com rastreabilidade.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P049 — Testar conversão orçamento para pedido

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P048 **Origem:** E059, E061, R27.

**Ação:** Validar que conversão usa versão aprovada, preço e arte corretos, preserva verba e impede pedidos duplicados.

**Simulação obrigatória:** Converter simultaneamente, alterar orçamento após aprovação e repetir solicitação com três destinos.

**Entregável e aceite:** Pedido aponta snapshot consistente; verba e histórico reconciliam com o orçamento.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P050 — Homologar editor e contratos comerciais

**Prioridade:** P1 · **Responsável funcional:** Backend e frontend comercial · **Estado:** Planejada.

**Dependências:** P017, P040, P049 **Origem:** F04, F05, F06, E090.

**Ação:** Integrar e publicar o lote aprovado de contratos e consumidores no ambiente de construção; executar criação, edição, versionamento e conversão reais com duas personas e falhas induzidas.

**Simulação obrigatória:** Conferir banco após cada falha e interface após recarga; não usar apenas mock de RPC.

**Entregável e aceite:** Aceite do agregado com testes locais e remotos e plano de recuperação comprovado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 06 — Rascunhos, identidade e recuperação

**Risco a controlar:** Perder rascunho ou restaurar dados de outra sessão.

**Contingência:** Desabilitar restauração insegura, preservar dados recuperáveis no escopo correto e aplicar migração de formato.


### P051 — Definir identidade persistente do rascunho

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P009, P010 **Origem:** F07, E025, E057.

**Ação:** Associar rascunho a usuário, cooperativa, PA e ID estável recuperável; definir troca de contexto e múltiplos rascunhos.

**Simulação obrigatória:** Criar dois rascunhos simultâneos e recarregar página preservando a identidade correta.

**Entregável e aceite:** Contrato de chave e índice local não mistura atores nem perde localização do rascunho.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P052 — Implementar recuperação de rascunho novo

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P051 **Origem:** F07, B16.

**Ação:** Persistir referência recuperável e oferecer retomada ou descarte consciente antes de restaurar conteúdo.

**Simulação obrigatória:** Desmontar página, fechar aba e reabrir aplicação; escolher entre dois rascunhos do mesmo usuário.

**Entregável e aceite:** Conteúdo salvo reaparece no contexto correto sem sobrescrever rascunho distinto.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P053 — Proteger rascunhos de orçamentos existentes

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P052 **Origem:** F07, E013.

**Ação:** Incluir identidade de sessão/contexto e verificar autorização atual antes da restauração de dados de um quoteId.

**Simulação obrigatória:** Usuário B usa o mesmo navegador após A; ID conhecido não permite restaurar dados de A.

**Entregável e aceite:** Isolamento demonstrado por teste de duas sessões reais e componentes.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P054 — Tratar logout, revogação e troca de unidade

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P053 **Origem:** F07, E087.

**Ação:** Definir expiração e limpeza seletiva de armazenamento/memória; preservar somente o que a política permite.

**Simulação obrigatória:** Logout, token expirado, papel revogado e troca de PA enquanto autosave está pendente.

**Entregável e aceite:** Nenhum save atrasado reaparece sob outro ator; limpeza tem política documentada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P055 — Expor estados verdadeiros de persistência

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P054 **Origem:** E027, E028, B16.

**Ação:** Distinguir salvo localmente, salvo no servidor, alteração pendente e falha; mostrar recuperação sem confundir offline.

**Simulação obrigatória:** Negar acesso ao storage, exceder quota e recuperar disponibilidade; verificar indicador e mensagem.

**Entregável e aceite:** Interface reflete resultado real e oferece ação de recuperação sem prometer sincronização inexistente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P056 — Controlar concorrência entre abas

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P055 **Origem:** E085, F07.

**Ação:** Definir versão do rascunho e tratamento de mudanças de outra aba; evitar sobrescrita por debounce antigo.

**Simulação obrigatória:** Editar em duas abas, alternar foco e restaurar versão divergente após suspensão do navegador.

**Entregável e aceite:** Conflito é apresentado e dados de ambas as edições podem ser recuperados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P057 — Versionar formato e retenção local

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P056 **Origem:** E057, E087.

**Ação:** Definir schema do rascunho, migração de formato, validade e destino das chaves antigas autosave_new.

**Simulação obrigatória:** Ler JSON inválido, versão antiga, registro expirado e payload excessivo sem travar o editor.

**Entregável e aceite:** Recuperação ou descarte explícito, sem restauração silenciosa de conteúdo incompatível.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P058 — Conectar rascunho à gravação atômica

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P050, P057 **Origem:** F04, F07, B06.

**Ação:** Remover ou arquivar rascunho somente após confirmação de criação/edição; manter referência em timeout ambíguo.

**Simulação obrigatória:** Perder resposta após commit e recuperar por idempotência sem criar orçamento duplicado.

**Entregável e aceite:** Rascunho e registro canônico reconciliam após falha sem perda de trabalho.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P059 — Validar resiliência da jornada de edição

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P058 **Origem:** E081, E082, E085.

**Ação:** Combinar recarga, navegação, rede instável, erro de formulário e upload interrompido com mensagens acessíveis.

**Simulação obrigatória:** Executar sequência offline → edição → reconexão → conflito → recuperação em dispositivo móvel.

**Entregável e aceite:** Roteiro reproduzível preserva trabalho e informa limites de armazenamento.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P060 — Homologar isolamento e retomada

**Prioridade:** P1 · **Responsável funcional:** Frontend e qualidade · **Estado:** Planejada.

**Dependências:** P059 **Origem:** F07, E090.

**Ação:** Executar matriz completa de dois usuários, duas cooperativas, múltiplas abas e novos/existentes orçamentos.

**Simulação obrigatória:** Reproduzir a lacuna antiga e comprovar que os testes de regressão agora exigem o comportamento correto.

**Entregável e aceite:** Aceite de autosave com evidência de sessão real, sem dados de outro ator.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 07 — Notificações, outbox e observabilidade

**Risco a controlar:** Perder notificação ou enviar dados a destinatário inelegível.

**Contingência:** Pausar dispatcher, preservar intenções pendentes e retomar com deduplicação.


### P061 — Catalogar eventos e destinatários

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P030, P040 **Origem:** F09, E029.

**Ação:** Mapear status, aprovações, arte, documentos, remessas e avarias a notificações necessárias e responsáveis.

**Simulação obrigatória:** Comparar ação individual e lote, evento repetido e ausência de destinatário ativo.

**Entregável e aceite:** Catálogo sem eventos silenciosamente perdidos ou destinatários fora do escopo.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P062 — Unificar notificações em outbox transacional

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P050, P061 **Origem:** F09, E063.

**Ação:** Registrar intenção de entrega na mesma transação do evento de negócio; reutilizar mecanismo existente quando compatível.

**Simulação obrigatória:** Falhar ao criar evento/outbox e verificar consistência; não enviar mensagem antes do commit.

**Entregável e aceite:** Evento aceito possui intenção durável única ou dispensa de notificação documentada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P063 — Definir chave de deduplicação

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P062 **Origem:** E029, F09.

**Ação:** Associar chave a evento, versão, canal e destinatário; impedir duplicação por retry individual ou lote.

**Simulação obrigatória:** Repetir despacho com mesma chave e variar destinatário/versão para confirmar distinção correta.

**Entregável e aceite:** Chave determinística e restrição de unicidade testadas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P064 — Implementar processamento seguro e retomável

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P063 **Origem:** E020, E029, R43.

**Ação:** Definir claim, timeout, tentativas, recuo e estado terminal; controlar concorrência entre workers.

**Simulação obrigatória:** Derrubar worker após envio e antes de confirmação; conciliar ambiguidade com idempotência do provedor quando suportada.

**Entregável e aceite:** Não prometer entrega exatamente uma vez sem suporte; duplicatas residuais são detectáveis e tratadas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P065 — Resolver destinatários no momento correto

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P064 **Origem:** E012, E063, E087.

**Ação:** Validar vínculo, papel, vigência, preferências e canal permitido; definir snapshot para auditoria.

**Simulação obrigatória:** Revogar aprovador após gerar evento e antes do envio; substituir por responsável elegível.

**Entregável e aceite:** Nenhum destinatário inelegível recebe dado sensível; reencaminhamento fica auditado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P066 — Validar provedor e templates

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P065 **Origem:** E029, R48.

**Ação:** Configurar ambiente de teste do canal aprovado, templates e variáveis; separar mensagens operacionais de conteúdo sensível.

**Simulação obrigatória:** Simular provedor indisponível, template inválido, destinatário rejeitado e entrega confirmada.

**Entregável e aceite:** Envio de teste autorizado confirmado com rastreabilidade e sem vazamento de dados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P067 — Reconciliar estados de entrega

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P066 **Origem:** E029, R43.

**Ação:** Receber callbacks autenticados, tratar ordem invertida e manter estados de aceitação, entrega e falha.

**Simulação obrigatória:** Repetir callback, enviar assinatura inválida e receber falha após evento intermediário.

**Entregável e aceite:** Estado final respeita contrato do provedor e mantém histórico de processamento.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P068 — Criar visibilidade de falhas operacionais

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P067 **Origem:** E020, E080, R48.

**Ação:** Exibir filas pendentes, erro sanitizado, tentativas e reprocessamento autorizado por escopo.

**Simulação obrigatória:** Operador sem papel tenta reprocessar; retry legítimo não duplica intenção nem altera conteúdo aprovado.

**Entregável e aceite:** Painel permite diagnóstico e recuperação com trilha e sem segredos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P069 — Testar paridade individual e lote

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P068 **Origem:** F09, E063.

**Ação:** Acionar o mesmo evento por uma e várias solicitações e comparar destinatários, conteúdo e resultado.

**Simulação obrigatória:** Lote parcialmente inelegível, retry integral e destinatário duplicado; validar regra transacional definida.

**Entregável e aceite:** Contrato consistente entre interfaces, sem caminho esquecido de workspace_notifications.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P070 — Homologar notificação de ponta a ponta

**Prioridade:** P1 · **Responsável funcional:** Backend e integrações · **Estado:** Planejada.

**Dependências:** P018, P069 **Origem:** E029, E090.

**Ação:** Executar decisão → outbox → worker → provedor → confirmação → painel com falhas e retomadas.

**Simulação obrigatória:** Usar destinatários sintéticos/autorizados; mensagem a terceiro real exige autorização específica.

**Entregável e aceite:** Evidências de entrega e recuperação completas, com limites e latência medida.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 08 — Publicação e homologação de Edge Functions

**Risco a controlar:** Publicar código sem dependência SQL ou configuração válida.

**Contingência:** Interromper lote, restaurar versão compatível e manter fila/estado para reconciliação.


### P071 — Preparar manifesto de publicação Edge

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P019, P030 **Origem:** F01, R35, R36.

**Ação:** Relacionar função, dependências SQL, versão, autenticação, secrets e consumidores para cada lote.

**Simulação obrigatória:** Comparar arquivos locais com inventário remoto; OPTIONS não deve ser aceito como prova de código publicado.

**Entregável e aceite:** Manifesto reproduzível com hash ou artefato verificável e ordem de publicação.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P072 — Revalidar autenticação das funções

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P071 **Origem:** E086, R32, T24, T33.

**Ação:** Revisar manifesto e controles internos para funções públicas, de serviço e por escopo sem confiar só em verify_jwt.

**Simulação obrigatória:** Exercitar sem token, token inválido, chave pública sem usuário, ator legítimo e ator sem escopo.

**Entregável e aceite:** Contratos positivos/negativos cobrem as 106 funções inventariadas ou alterações justificadas desse universo.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P073 — Publicar reconciliação de aprovações

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P070, P072, P083 **Origem:** F01, E063.

**Ação:** Publicar sicoob-approval-reconciliation com dependências e autenticação conferidas; validar limite do job.

**Simulação obrigatória:** Repetir reconciliação, interromper execução e tentar chamada por comprador sem privilégio.

**Entregável e aceite:** Rota responde no projeto correto e reconcilia apenas eventos elegíveis sem duplicação.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P074 — Publicar registro de arte

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P073, P104 **Origem:** F01, E054, E065.

**Ação:** Publicar sicoob-artwork-register com contrato de identidade/versionamento e Storage validado.

**Simulação obrigatória:** Enviar arquivo sem autorização, versão repetida e arte incompatível com o item.

**Entregável e aceite:** Registro remoto produz vínculo íntegro e recusa casos inválidos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P075 — Publicar ingestão documental

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P074, P108 **Origem:** F01, E078.

**Ação:** Publicar sicoob-document-ingest com scanner/configuração pronta e política de falha fechada.

**Simulação obrigatória:** Scanner indisponível, conteúdo malicioso sintético e arquivo de outro pedido não podem ser liberados.

**Entregável e aceite:** Ingestão remota mantém quarentena e vínculo autorizado até decisão válida.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P076 — Publicar cotação de kit

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P075, P096 **Origem:** F01, E055.

**Ação:** Publicar sicoob-kit-quote com validações comerciais e de embalagem aprovadas.

**Simulação obrigatória:** Repetir solicitação e alterar preço, quantidade ou variante no payload; conferir recálculo/recusa.

**Entregável e aceite:** Kit remoto validado sem confiar em dados comerciais enviados pelo navegador.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P077 — Publicar recompra

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P076, P099 **Origem:** F01, E079.

**Ação:** Publicar sicoob-reorder com reconsulta da origem, idempotência e erros sanitizados.

**Simulação obrigatória:** Produto retirado, preço novo, estoque insuficiente e retry após timeout.

**Entregável e aceite:** Recompra cria nova intenção válida sem alterar pedido anterior nem catálogo mestre.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P078 — Homologar webhooks e Bitrix

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P040, P077 **Origem:** C09, E086.

**Ação:** Comparar versão implantada das funções endurecidas e validar assinatura, autorização, ACK durável e sincronização.

**Simulação obrigatória:** Callback repetido, payload inválido, falha de persistência, timeout e destino externo indevido.

**Entregável e aceite:** Integração recuperável com logs sanitizados e identidade da versão comprovada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P079 — Verificar cron, segredos e tarefas internas

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P078 **Origem:** R40, R41, R42, R43, T26.

**Ação:** Conferir jobs ativos, Vault/segredos, permissões, retenção e particionamento; revisar migrate-helper e ferramentas técnicas.

**Simulação obrigatória:** Executar tarefa autorizada e negada; validar última execução real, horizonte de partições e falha visível.

**Entregável e aceite:** Agenda e ferramentas internas documentadas com nenhum endpoint técnico exposto indevidamente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P080 — Certificar paridade do lote publicado

**Prioridade:** P1 · **Responsável funcional:** Plataforma e backend · **Estado:** Planejada.

**Dependências:** P039, P070, P079 **Origem:** F01, F02, F11, E090, C25.

**Ação:** Comparar consumidores, funções, tipos, migrations e versões remotas; registrar diferenças restantes sem encobri-las. Confirmar que políticas, relatórios e remessas possuem consumidores reais e contratos publicados coerentes.

**Simulação obrigatória:** Rodar smoke autenticado dos cinco fluxos e verificador runtime com snapshot renovado.

**Entregável e aceite:** Lote remoto homologado, sem 404 nos contratos previstos e com diferenças explicitamente resolvidas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 09 — Convites, alçadas, cotações e delegações

**Risco a controlar:** Autorizar decisão com política, vínculo ou delegação indevidos.

**Contingência:** Revogar concessão problemática; reabrir decisão afetada com trilha e responsável.


### P081 — Modelar convite institucional

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P009, P025, P030 **Origem:** E016.

**Ação:** Definir papel, cooperativa/PA, emissor autorizado, validade e identidade única do convite.

**Simulação obrigatória:** Tentativa de autoelevar papel, convidar para outra cooperativa ou usar email já vinculado.

**Entregável e aceite:** Contrato com limites organizacionais e decisão de múltiplos vínculos documentada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P082 — Implementar aceite, reenvio e revogação

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P081 **Origem:** E016, E041.

**Ação:** Criar UI/servidor do convite com token protegido, consumo atômico e trilha; evitar perfil duplicado.

**Simulação obrigatória:** Convite adulterado, expirado, revogado e usado simultaneamente; reenvio invalida conforme regra definida.

**Entregável e aceite:** Vínculo criado uma vez com papel correto e estados compreensíveis.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P083 — Versionar políticas e alçadas

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P082 **Origem:** E008, E018, E064, B10.

**Ação:** Definir vigência, competências, limites e snapshot usado por solicitação em cada cooperativa. Obter aceite dos responsáveis para alçadas, verba, arte e cancelamento; não inferir regra comercial apenas do schema.

**Simulação obrigatória:** Alterar política durante aprovação e testar duas cooperativas com limites diferentes.

**Entregável e aceite:** Decisão reproduzível com política vigente explicitamente identificada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P084 — Completar fila e decisão de aprovação

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P050, P083 **Origem:** E063, E064, B22.

**Ação:** Mostrar contexto comercial, verba, documentos, justificativa e autoridade; usar contrato servidor protegido. Validar compartilhamento expirável de aprovação, token, OTP quando adotado, reuso e revogação sem restaurar aprovação pública legada insegura.

**Simulação obrigatória:** Aprovar sem alçada, decisão concorrente, documento ausente e pedido já cancelado.

**Entregável e aceite:** Decisões válidas são atômicas e negativas preservam estado e explicação ao usuário.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P085 — Modelar delegação temporária

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P084 **Origem:** E067.

**Ação:** Definir delegante, substituto, competências, início, fim, revogação e limites de subdelegação.

**Simulação obrigatória:** Delegação circular, autoridade superior à do delegante e vigência inválida.

**Entregável e aceite:** Modelo impede escalada e distingue ação própria de ação delegada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P086 — Aplicar delegação ao servidor e à interface

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P085 **Origem:** E067, E068.

**Ação:** Validar vigência em cada operação e registrar ator real/delegante no evento; expor administração de delegações.

**Simulação obrigatória:** Token antigo após revogação, delegação expirada durante decisão e troca de PA.

**Entregável e aceite:** Nenhuma decisão fora da competência; trilha reconstrói fundamento da delegação.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P087 — Cadastrar cotações institucionais comparáveis

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P086 **Origem:** E049, E060, B15.

**Ação:** Modelar fornecedor, validade, quantidade, personalização, embalagem, frete, tributos e anexos da proposta. Apresentar diferenças relevantes à decisão institucional e justificar alternativas comerciais equivalentes.

**Simulação obrigatória:** Comparar duas/três propostas com escopos diferentes e proposta vencida.

**Entregável e aceite:** Comparação sinaliza diferenças e não escolhe pelo menor preço incomparável.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P088 — Formalizar escolha e fornecedor único

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P087 **Origem:** E060, E066.

**Ação:** Registrar critérios, justificativa, política exigida e autoridade para exceção; preservar versões das propostas.

**Simulação obrigatória:** Tentar selecionar fornecedor sem cotações mínimas ou exceção autorizada; revisar proposta escolhida.

**Entregável e aceite:** Escolha auditável e mudança material reabre aprovação conforme política.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P089 — Validar orçamento disponível e exceções

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P088 **Origem:** E017, E062, E066.

**Ação:** Integrar alçadas à reserva/compromisso de verba, vigência e justificativas sem bypass por UI.

**Simulação obrigatória:** Duas aprovações disputam saldo e delegação termina durante a transação.

**Entregável e aceite:** Saldo não fica negativo por corrida e exceção tem autorização e efeitos explícitos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P090 — Homologar governança com duas cooperativas

**Prioridade:** P2 · **Responsável funcional:** Produto, backend e gestores da cooperativa · **Estado:** Planejada.

**Dependências:** P073, P089 **Origem:** E008, E013, E099.

**Ação:** Executar convite → vínculo → proposta → comparação → delegação → aprovação com regras distintas.

**Simulação obrigatória:** Ator tenta atravessar cooperativas e usar política/delegação da outra; ensaiar revogação de sessão.

**Entregável e aceite:** Aceite técnico e dos responsáveis de negócio com decisões rastreáveis.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 10 — Catálogo, kits, embalagem e recompra

**Risco a controlar:** Prometer preço, disponibilidade ou encaixe sem confirmação.

**Contingência:** Suspender promessa/confirmação automática e encaminhar análise manual autorizada.


### P091 — Comprovar catálogo mestre somente leitura

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P010, P024 **Origem:** E003, B04, B08, C15.

**Ação:** Inspecionar identidade de acesso na origem e remover controles de escrita incompatíveis; preservar ponte de consulta. Conferir products/companies nos call-sites externos e remover tentativa de mutação pela ponte de consulta.

**Simulação obrigatória:** Tentar escrita apenas em fixture ou com teste não destrutivo aprovado; validar negativas de API sem alterar catálogo.

**Entregável e aceite:** Privilégio mínimo e contrato somente leitura comprovados administrativamente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P092 — Padronizar preço, estoque e variante

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P091 **Origem:** E022, E073, B13, B17.

**Ação:** Definir origem, timestamp, unidade, SKU/variante, mínimos e tratamento de nulos e produtos removidos.

**Simulação obrigatória:** Cor sem estoque, produto com variantes repetidas, preço vencido e erro da origem.

**Entregável e aceite:** Dados comerciais possuem procedência e incerteza explícitas em catálogo e orçamento.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P093 — Homologar busca, filtros e ordenação

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P092 **Origem:** E023, E024, E044, E045, B01, B02.

**Ação:** Validar intenção, sinônimos, faixa de orçamento, paginação, acessibilidade e persistência no catálogo real.

**Simulação obrigatória:** Buscar sem resultado, caracteres especiais, filtros incompatíveis e retorno de página após erro.

**Entregável e aceite:** Consultas prioritárias do comprador produzem resultados explicáveis e recuperáveis.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P094 — Validar cálculo e apresentação de kit

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P093 **Origem:** E055, B18, B19.

**Ação:** Conferir agregação de demanda, múltiplos, mínimos, personalização e preço total por composição.

**Simulação obrigatória:** Repetir a mesma variante em dois itens e alterar quantidade de kits após precificação.

**Entregável e aceite:** Cálculo cliente/servidor é reconciliável; composição inválida é recusada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P095 — Modelar capacidade física da embalagem

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P094 **Origem:** F12, E055, B19.

**Ação:** Definir dimensões úteis, peso, restrições de montagem e decisão manual quando informação falta.

**Simulação obrigatória:** Itens cabem em volume somado mas não em geometria; excesso de peso e dimensão desconhecida.

**Entregável e aceite:** Regra não promete encaixe sem evidência e encaminha casos incertos à análise técnica.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P096 — Validar embalagem no servidor

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P095 **Origem:** F12, E055.

**Ação:** Aplicar regra física aprovada ao confirmar composição, com versão da especificação e justificativas.

**Simulação obrigatória:** Adulterar dimensão no cliente e mudar embalagem depois de aprovar orçamento.

**Entregável e aceite:** Composição confirmada respeita contrato ou exige revisão técnica autorizada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P097 — Revisar previsão e confiança de reposição

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P096 **Origem:** F12, E048, B26.

**Ação:** Distinguir estoque confirmado, previsão do fornecedor e margem operacional; substituir buffer arbitrário por política aprovada.

**Simulação obrigatória:** Reposição insuficiente, atrasada, duplicada, sem data ou de variante diferente.

**Entregável e aceite:** Prazo mostra origem e nível de confiança justificável, sem transformar previsão em garantia.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P098 — Conectar templates, favoritos e coleções

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P097 **Origem:** E050, B14, B18, B25.

**Ação:** Curar modelos por ocasião/verba e validar visibilidade/compartilhamento, vistos recentes e troca de usuário. Validar recomendações por ocasião/histórico com regras comerciais explicáveis, sem selos ou confiança inventados.

**Simulação obrigatória:** Compartilhamento expirado, item removido e coleção acessada por outra cooperativa.

**Entregável e aceite:** Curadoria útil com dados atuais e isolamento testado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P099 — Completar jornada de recompra

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P098 **Origem:** E079, B27.

**Ação:** Revalidar disponibilidade, preços, mínimos e personalização antes de gerar nova solicitação; comunicar diferenças.

**Simulação obrigatória:** Recomprar pedido antigo com produto indisponível, nova embalagem e política comercial alterada.

**Entregável e aceite:** Usuário confirma diferenças antes do novo compromisso; origem histórica é preservada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P100 — Homologar catálogo, kit e recompra

**Prioridade:** P2 · **Responsável funcional:** Produto, integrações e operação comercial · **Estado:** Planejada.

**Dependências:** P080, P099 **Origem:** E046, E055, E073, E079.

**Ação:** Executar catálogo → kit → orçamento → recompra com dados reais de consulta e cenários de erro.

**Simulação obrigatória:** Falhar ponte externa e recuperar sem aceitar preço fictício nem escrever no catálogo.

**Entregável e aceite:** Aceite comercial e técnico com origem dos dados e limites de prazo explícitos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 11 — Marca, arte e documentos protegidos

**Risco a controlar:** Liberar conteúdo malicioso, arte antiga ou documento de outro pedido.

**Contingência:** Recolocar arquivo em quarentena e revogar compartilhamento preservando evidências.


### P101 — Consolidar biblioteca institucional de marca

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P009, P030, P050 **Origem:** E031, E053.

**Ação:** Definir propriedade, permissão de uso, vigência, formato e versão de logos/arquivos por cooperativa.

**Simulação obrigatória:** Marca vencida, arquivo de outra cooperativa e ativo sem autorização de uso.

**Entregável e aceite:** Biblioteca com origem e direitos operacionais registrados sem mistura de escopos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P102 — Definir vínculo entre item, arte e versão

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P101 **Origem:** E047, E054, E059.

**Ação:** Associar prova técnica ao item/variante e especificação comercial; definir quando mudança invalida aprovação.

**Simulação obrigatória:** Trocar cor, tamanho ou técnica depois de aprovar a prova.

**Entregável e aceite:** Vínculo imutável e invalidação explícita de aprovação quando necessário.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P103 — Completar elaboração da prova técnica

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P102 **Origem:** E035, E054, B30.

**Ação:** Registrar posição, técnica, dimensões, cores, embalagem e limites da simulação visual.

**Simulação obrigatória:** Mockup bonito mas tecnicamente incompatível; informação incompleta exige revisão humana identificada.

**Entregável e aceite:** Prova contém especificação verificável e distingue simulação de resultado contratado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P104 — Implementar decisão formal de arte

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P083, P103 **Origem:** E065, E072.

**Ação:** Aplicar competência de marketing/marca, versão, comentários e decisão auditável no servidor.

**Simulação obrigatória:** Aprovar versão antiga, arquivo trocado, ator sem papel ou decisão concorrente.

**Entregável e aceite:** Apenas versão vigente autorizada libera a produção, com ator e evidência.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P105 — Consolidar metadados e autorização documental

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P104 **Origem:** E013, E078.

**Ação:** Modelar tipo, pedido, versão, proprietário, hash, tamanho e classificação de acesso de cada documento.

**Simulação obrigatória:** Anexar arquivo de outro pedido, adulterar metadados ou acessar URL assinada fora da validade.

**Entregável e aceite:** Metadados e leitura respeitam escopo e vínculo comercial.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P106 — Validar upload e quarentena

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P105 **Origem:** E078, T33.

**Ação:** Controlar extensão, MIME real, limites, nomes, caminho e estado antes de permitir uso operacional.

**Simulação obrigatória:** Arquivo executável disfarçado, upload interrompido, arquivo vazio e repetição de upload.

**Entregável e aceite:** Conteúdo fica inacessível para uso final até validação; recuperação não cria anexos órfãos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P107 — Homologar scanner e falha fechada

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P106 **Origem:** E078, F01.

**Ação:** Integrar scanner aprovado, autenticar resposta, vincular resultado ao hash e manter fila de reprocessamento.

**Simulação obrigatória:** Scanner indisponível, resposta atrasada de versão antiga e artefato malicioso de teste.

**Entregável e aceite:** Somente conteúdo avaliado e liberado é utilizável; falhas não equivalem a arquivo limpo.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P108 — Validar Storage, exportação e dossiê

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P107 **Origem:** R25, E071, E078.

**Ação:** Testar policies de leitura/escrita/substituição, URLs temporárias e exportações por papel; incluir apenas versões autorizadas.

**Simulação obrigatória:** Comprador de outra cooperativa tenta baixar nota; exportação contém arquivo em quarentena ou já revogado.

**Entregável e aceite:** Dossiê íntegro e protegido, sem URL duradoura indevida ou bypass por exportação.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P109 — Homologar arte e documentos remotos

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P080, P108 **Origem:** F01, E054, E065, E078.

**Ação:** Executar registro → inspeção → aprovação → revisão → exportação com funções publicadas e personas de teste.

**Simulação obrigatória:** Repetir envio após timeout e trocar versão durante inspeção sem liberar conteúdo errado.

**Entregável e aceite:** Fluxo autenticado termina com arquivo aprovado e vínculo correto no banco canônico.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P110 — Definir retenção, revogação e recuperação de anexos

**Prioridade:** P1 · **Responsável funcional:** Marketing, backend e segurança · **Estado:** Planejada.

**Dependências:** P109 **Origem:** E087, R42.

**Ação:** Estabelecer retenção com responsável, bloqueio legal quando aplicável, descarte e recuperação incluindo Storage.

**Simulação obrigatória:** Revogar compartilhamento, restaurar arquivo com metadado e tratar blob órfão sem excluir documento ainda referenciado.

**Entregável e aceite:** Política executável e ensaiada sem assumir que backup SQL contém arquivos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 12 — Logística, distribuição e pós-entrega

**Risco a controlar:** Omitir entrega, exceder saldo ou perder vínculo com destino.

**Contingência:** Suspender mutação afetada e reconciliar remessa/recebimento com eventos compensatórios aprovados.


### P111 — Corrigir consulta e paginação logística

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P009, P024, P050 **Origem:** F08, E075, E089.

**Ação:** Filtrar status antes da paginação e definir total, cursor/ordem estável e consulta de remessas no escopo.

**Simulação obrigatória:** Usar mais de 500 pedidos, com logísticos apenas após a primeira página e alteração durante navegação.

**Entregável e aceite:** Nenhuma entrega elegível é omitida; totais e páginas conciliam com a fonte.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P112 — Reconciliar remessas e destinos

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P111 **Origem:** E056, E070, E074, B31.

**Ação:** Definir relação entre remessa global, distribuição por PA, alocações e endereços versionados.

**Simulação obrigatória:** Dividir pedido entre três destinos, alterar endereço antes/depois de expedir e validar política.

**Entregável e aceite:** Quantidades e destino físico são reconstruíveis sem duplicação de entrega.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P113 — Implementar importação assistida de distribuição

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P112 **Origem:** E056, B31.

**Ação:** Oferecer planilha/modelo, validação por linha, prévia e confirmação atômica das alocações.

**Simulação obrigatória:** CSV inválido, PA desconhecido, destino duplicado e soma maior que quantidade disponível.

**Entregável e aceite:** Importação mostra erros antes de gravar e preserva somas válidas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P114 — Reconfirmar disponibilidade antes da expedição

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P092, P113 **Origem:** E073, E074, B12.

**Ação:** Definir evidência de compromisso do fornecedor sem escrever/reservar no catálogo mestre.

**Simulação obrigatória:** Estoque muda após aprovação; cotação de frete vence; item deixa de existir.

**Entregável e aceite:** Expedição usa confirmação válida ou retorna para decisão comercial com histórico.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P115 — Registrar expedição e comprovantes

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P108, P114 **Origem:** E074, E076.

**Ação:** Validar saldo por item/destino, transportadora, código, data e documento liberado; aplicar idempotência.

**Simulação obrigatória:** Expedir acima do saldo, repetir operação ou anexar comprovante de outro pedido.

**Entregável e aceite:** Saldo e evento são atômicos e nenhum destino recebe quantidade excedente.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P116 — Integrar rastreio e previsão de entrega

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P115 **Origem:** E007, E026, E075.

**Ação:** Definir integração disponível, fonte, frequência e estados; mostrar atualização manual quando não houver automação.

**Simulação obrigatória:** Evento fora de ordem, transportadora indisponível e prazo vencido sem nova previsão.

**Entregável e aceite:** Rastreio informa fonte/horário e não promete tempo real sem integração comprovada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P117 — Completar recebimento e conferência

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P110, P116 **Origem:** E076, B31.

**Ação:** Registrar responsável, destino, quantidade recebida, falta, avaria e documento em operação idempotente.

**Simulação obrigatória:** Recebimento parcial, retry, excesso e usuário de outro PA.

**Entregável e aceite:** Recebimentos reconciliam saldo e prova, preservando eventos anteriores.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P118 — Controlar revisão e cancelamento parcial

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P117, P124 **Origem:** E069, E066.

**Ação:** Definir cancelamento por item/destino, aceite do fornecedor e efeitos em verba, produção e remessa.

**Simulação obrigatória:** Cancelar item já expedido, cancelar duas vezes e mudar quantidade após aceite do fornecedor.

**Entregável e aceite:** Transição permitida reconcilia obrigações; caso impossível vira exceção explícita.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P119 — Resolver avarias, faltas e devoluções

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P118 **Origem:** E077, E080.

**Ação:** Implementar protocolo, investigação, evidência, decisão, reposição/crédito, reabertura e comunicação.

**Simulação obrigatória:** Recebimento com falta gera reposição parcial e crédito restante; reabrir protocolo encerrado requer autoridade.

**Entregável e aceite:** Ocorrência possui responsável, prazo e encerramento reconciliado com pedido/verba.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P120 — Homologar logística distribuída integral

**Prioridade:** P1 · **Responsável funcional:** Operação logística e backend · **Estado:** Planejada.

**Dependências:** P119 **Origem:** F08, E070, E074, E076, E077.

**Ação:** Executar três destinos, expedições/recebimentos parciais, cancelamento e avaria com relatório paginado.

**Simulação obrigatória:** Conferir por SQL autorizado que alocações, entregas, ocorrências e totais não divergem.

**Entregável e aceite:** Aceite operacional do lote logístico com evidência por PA e recuperação de falha.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 13 — Campanhas, finanças e operação administrativa

**Risco a controlar:** Divergir verba, faturamento e obrigação comercial.

**Contingência:** Bloquear fechamento divergente e efetuar ajuste auditado sem reescrever período encerrado.


### P121 — Estruturar briefing institucional de campanha

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P010, P050 **Origem:** E051, B28, B29.

**Ação:** Definir objetivo, público, ocasião, verba, destinos, prazo e responsável conectados à compra.

**Simulação obrigatória:** Briefing incompleto, prazo inviável e cooperativa sem orçamento aprovado.

**Entregável e aceite:** Briefing orienta catálogo/kit/orçamento sem confundir geração criativa com solicitação formal.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P122 — Implementar marcos regressivos de campanha

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P121 **Origem:** E052, E048.

**Ação:** Calcular datas de cotação, aprovação, arte, produção e expedição a partir do evento e capacidades confirmadas.

**Simulação obrigatória:** Antecipar evento, atrasar arte e alterar fornecedor; recalcular impactos e alertas.

**Entregável e aceite:** Cronograma mostra dependências e conflitos sem prometer prazo irreal.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P123 — Resolver colaboração Magic Up

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P122 **Origem:** C24, E051.

**Ação:** Decidir com produto o uso de comentários, compartilhamentos e reações; implementar fluxo aprovado ou registrar retirada de escopo.

**Simulação obrigatória:** Compartilhamento expirado, comentário fora da cooperativa e exclusão solicitada pelo autor.

**Entregável e aceite:** Decisão auditável; implementação aprovada tem UI, autorização e testes, sem contabilizar tabela isolada como funcionalidade.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P124 — Completar ciclo financeiro de verba

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P083, P123 **Origem:** E017, E062, R27, C14.

**Ação:** Definir planejado, reservado, comprometido e consumido com transições e invariantes monetárias. Confirmar uso de cooperativa_budgets/pa_budgets; não recriar sicoob_budgets por nomenclatura antiga.

**Simulação obrigatória:** Duas solicitações disputam saldo; cancelamento parcial devolve somente valor elegível.

**Entregável e aceite:** Saldo derivado de eventos/compromissos reconciliáveis, sem dupla contabilização.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P125 — Tratar competência e virada de período

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P124 **Origem:** E017, E062.

**Ação:** Definir abertura/fechamento, compromissos pendentes, saldo e transferência conforme política aprovada.

**Simulação obrigatória:** Pedido atravessa mês/ano, pagamento retroativo e estorno após período fechado.

**Entregável e aceite:** Fechamento reproduzível e ajustes auditados sem reescrever decisão histórica.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P126 — Conciliar notas, pagamentos e entregas

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P110, P120, P125 **Origem:** E078, E058.

**Ação:** Vincular documentos financeiros e liquidação aos pedidos/recebimentos; tratar divergências, parcialidades e créditos.

**Simulação obrigatória:** Nota duplicada, pagamento parcial, devolução e diferença entre contratado, faturado e recebido.

**Entregável e aceite:** Conciliação identifica e resolve diferença com responsável e justificativa.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P127 — Ligar views administrativas ao painel

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P126 **Origem:** C26, E089.

**Ação:** Validar semântica e escopo de sicoob_budget_audit/v_full_scope_grants antes de expor no dashboard.

**Simulação obrigatória:** Admin autorizado consulta; papel comum tenta acessar dados de concessões e outra cooperativa.

**Entregável e aceite:** Painel usa fonte real, minimiza dados sensíveis e cobre estados vazios/erro.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P128 — Consolidar indicadores e linha do tempo

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P127 **Origem:** E009, E068, E089, B21, B23.

**Ação:** Unificar eventos de orçamento, verba, arte, pedido, entrega e ocorrência; definir fórmula e período de cada KPI.

**Simulação obrigatória:** Comparar totais do painel com amostra de pedidos e mudanças de fuso/período.

**Entregável e aceite:** Indicadores reproduzíveis sem números ilustrativos; evento aponta origem e ator.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P129 — Implementar suporte e alertas operacionais

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P128 **Origem:** E020, E080, R48, T48, C18.

**Ação:** Associar protocolo de atendimento a pedido/campanha e configurar alertas de falha com responsável e instrução de resposta. Revalidar telemetry_events e Sentry opcional; não recriar error_logs sem decisão justificada e consumidor necessário.

**Simulação obrigatória:** Incidente controlado interrompe fluxo; alerta chega ao canal autorizado e operador recupera a tarefa.

**Entregável e aceite:** Suporte acompanha caso até resolução com tempo medido e logs sem segredos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P130 — Homologar campanha e fechamento financeiro

**Prioridade:** P2 · **Responsável funcional:** Produto, financeiro e operação · **Estado:** Planejada.

**Dependências:** P090, P129 **Origem:** E051, E052, E062, E078, E090.

**Ação:** Percorrer briefing → marcos → compra → entrega → nota → pagamento → fechamento de verba.

**Simulação obrigatória:** Campanha atravessa competência com atraso, avaria e crédito; conferir efeitos integrais.

**Entregável e aceite:** Aceite de negócio com números conciliados e pendências identificadas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 14 — Experiência de loja, marca e acessibilidade

**Risco a controlar:** Interface bonita ocultar incerteza comercial ou impedir tarefa acessível.

**Contingência:** Reverter variante visual problemática preservando contrato funcional e conteúdo validado.


### P131 — Validar jornada com compradores e marketing

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P009, P010 **Origem:** E004, E005, E006, E088.

**Ação:** Recrutar participantes autorizados e observar tarefas, vocabulário, responsabilidades e pontos de decisão.

**Simulação obrigatória:** Comprador solicita kit; marketing aprova arte; gestor compara propostas sem orientação do facilitador.

**Entregável e aceite:** Registro de sessões e problemas priorizados; pesquisa pública não substitui tarefa observada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P132 — Homologar identidade visual Sicoob

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P131 **Origem:** E031, E033, E034, E036, E040.

**Ação:** Validar ativos, cores, tipografia e aplicação de marca com responsável competente; consolidar tokens e exceções.

**Simulação obrigatória:** Revisar catálogo, login, proposta e documentos em temas/tamanhos diferentes.

**Entregável e aceite:** Aceite de marca documentado e biblioteca coerente, sem ativos presumidos como autorizados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P133 — Consolidar arquitetura de loja e navegação

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P132 **Origem:** E021, E025, E041, E042, E043.

**Ação:** Definir início, catálogo, categorias, busca e acesso às solicitações preservando contexto de cooperativa/PA.

**Simulação obrigatória:** Novo comprador encontra produto, retorna de detalhe e troca unidade sem perder contexto indevidamente.

**Entregável e aceite:** Navegação validada por tarefas e rotas conectadas, além de loja-demo.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P134 — Aprimorar cards e página de produto

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P092, P133 **Origem:** E022, E035, E046, B13, B17, T42.

**Ação:** Apresentar imagens adequadas, variante, disponibilidade, personalização, validade do preço e pedido de orçamento claro. Verificar que dados simulados e telas de demonstração não entram silenciosamente na jornada comercial publicada.

**Simulação obrigatória:** Produto sem foto, nome longo, estoque desconhecido e técnica indisponível.

**Entregável e aceite:** Página apoia decisão com dado real e distingue estimativa de condição contratada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P135 — Refinar carrinho, editor e resumo comercial

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P050, P060, P134 **Origem:** E027, E038, E048, E057, E058, B20.

**Ação:** Organizar etapas e resumo de quantidade, personalização, frete, prazo e verba; reduzir entrada redundante.

**Simulação obrigatória:** Pedido grande, endereço extenso e valor elevado; comparar resumo com payload e total do servidor.

**Entregável e aceite:** Resumo legível e comercialmente consistente em desktop e mobile.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P136 — Padronizar estados de interface e feedback

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P135 **Origem:** E026, E028, E037, E039.

**Ação:** Uniformizar carregamento, vazio, erro, permissão negada, conflito, offline e sucesso com ações de recuperação.

**Simulação obrigatória:** API demora, upload falha e estado muda por outro usuário; preservar foco e trabalho.

**Entregável e aceite:** Nenhuma tela aparenta sucesso sem confirmação; mensagens apontam próximo passo útil.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P137 — Auditar acessibilidade ponta a ponta

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P090, P100, P110, P120, P130, P136 **Origem:** E034, E081, B11.

**Ação:** Executar teclado, leitor, zoom 200/400%, contraste e redução de movimento nas jornadas conectadas.

**Simulação obrigatória:** Aprovar arte, editar itens, tratar erro e receber pedido sem mouse ou identificação por cor.

**Entregável e aceite:** Barreiras registradas e corrigidas com reteste manual e automação complementar.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P138 — Validar dispositivos e conteúdo extremo

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P137 **Origem:** E032, E082, E083, B03, B20.

**Ação:** Testar aparelhos móveis e larguras representativas, orientação, upload e ações fixas com textos extensos.

**Simulação obrigatória:** Teclado virtual aberto, conexão lenta, tabela grande e endereço com múltiplas linhas.

**Entregável e aceite:** Sem conteúdo/ação encobertos; tarefas móveis críticas concluídas com evidência visual.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P139 — Medir desempenho por jornada

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P138 **Origem:** E084, T41, T44, T45, B24, T10.

**Ação:** Definir metas de carregamento/interação e orçamento por rota; medir catálogo, editor e painéis além do login. Conferir documentos grandes em public, arquivos servidos e impacto no carregamento antes de mover ativos.

**Simulação obrigatória:** Primeiro acesso, cache frio, rede móvel e grande volume; avaliar lazy loading sem perder funcionalidade.

**Entregável e aceite:** Metas aprovadas e medições reproduzíveis; regressão relevante bloqueia release.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P140 — Retestar usabilidade e aprovar experiência

**Prioridade:** P2 · **Responsável funcional:** Design, frontend e participantes autorizados · **Estado:** Planejada.

**Dependências:** P139 **Origem:** E030, E088, E092.

**Ação:** Repetir tarefas após correções e validar compreensão de preço, prazo, aprovação, erro e recuperação.

**Simulação obrigatória:** Comparar conclusão das tarefas e barreiras antes/depois sem inventar percentual com amostra inadequada.

**Entregável e aceite:** Aceite de compradores/marketing registrado e problemas críticos de jornada encerrados.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Fase 15 — Qualidade integrada, release e operação real

**Risco a controlar:** Promover candidato sem paridade ou declarar piloto concluído sem operação.

**Contingência:** Abortar promoção ou aplicar rollback previsto; reabrir aceites afetados e registrar incidente.


### P141 — Reduzir dívida técnica prioritária

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P030, P050 **Origem:** R38, T13, T16, T17, T18, T19, T20, T21, T23, T50, T43.

**Ação:** Atacar erros TS/lint nos fluxos corrigidos, casts inseguros, arquivos extensos e logs; definir convenção de testes e ratchets. Preservar proveniência e verificação funcional de vendor/pptxgenjs-browser; não substituir dependência sem evidência de necessidade.

**Simulação obrigatória:** Introduzir erro em arquivo crítico e confirmar bloqueio; refatoração preserva contratos e cobertura pertinente.

**Entregável e aceite:** Dívida medida por arquivo com tendência, sem supressão indiscriminada nem churn sem benefício.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P142 — Executar regressão e fechar testes ignorados

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P040, P050, P060, P070, P080, P090, P100, P110, P120, P130, P140, P141 **Origem:** E019, C40, T33, T34, T35, T36, T39, R23, R39, T40.

**Ação:** Rodar suíte completa, contratos Node/Deno/SQL e E2E; classificar skips por dono, motivo, risco e prazo. Preservar simuladores Python úteis como ferramentas de QA e distinguir testes mínimos de invariantes da integração com staging.

**Simulação obrigatória:** Converter sondas de falha em regressões; teste obrigatório sem segredo deve falhar, não desaparecer.

**Entregável e aceite:** Relatório por suíte com falhas resolvidas e quarentena aprovada; cobertura informa arquivos efetivamente medidos.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P143 — Auditar segurança integrada e privacidade

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P142 **Origem:** E086, E087, T25, T27, T30, T32, B05, B07.

**Ação:** Testar escopo, sessões revogadas, JWT, Storage, URLs externas, SSRF, rate limiting e exposição de dados por papel. Verificar redação de custo/margem por papel e bloqueio de indexação do portal privado, incluindo sitemap e headers publicados.

**Simulação obrigatória:** Ator hostil usa ID conhecido, metadata editável, token antigo, URL interna e replay em instâncias distintas.

**Entregável e aceite:** Riscos críticos encerrados com evidência; dados pessoais e segredos não aparecem em logs/bundle.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P144 — Reconciliar o candidato de release

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P143 **Origem:** F11, C45, R36, R49, T46, T28.

**Ação:** Comparar main, artefatos, tipos, ledger, DDL, Edge, configuração e domínio efetivo; validar CSP e documentação vigente. Comprovar CSP entregue pelo domínio e compatibilidade das integrações, além de configuração presente no repositório.

**Simulação obrigatória:** Detectar um artefato antigo ou função divergente e interromper promoção; executar geração limpa e comparação bidirecional.

**Entregável e aceite:** Manifesto único do candidato sem divergência não explicada; notas de release e tag propostas.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P145 — Ensaiar a compra institucional completa

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P144 **Origem:** E090, E091, C41.

**Ação:** Executar pedido com três destinos, revisão de arte, aprovação por alçada, fornecedor, entrega parcial e conciliação. Cobrir explicitamente login, catálogo, mockup/arte e integração Bitrix quando parte da jornada contratada.

**Simulação obrigatória:** Adicionar conflito, retry, delegação e avaria durante a jornada sem manipulação manual indevida do banco.

**Entregável e aceite:** Compra sintética completa e recuperável no ambiente de homologação com aceite funcional.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P146 — Preparar operação e decisão de piloto

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P145 **Origem:** E093, E094, E095, R50, C44.

**Ação:** Treinar operadores/suporte, definir cooperativa, políticas, dados, SLA, RTO/RPO e responsáveis; revisar custo e riscos residuais. Preparar nota de mudanças; envio a stakeholders externos somente com autorização específica e destinatários confirmados.

**Simulação obrigatória:** Equipe independente executa runbook e simulação de incidente; reproduz restauração e comunicação interna.

**Entregável e aceite:** Pacote de liberação revisável com decisão explícita de negócio antes de iniciar produção.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P147 — Publicar piloto controlado

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P146 **Origem:** E096.

**Ação:** Após decisão de liberação, publicar artefatos aprovados com observação, rollback de aplicação e migrations compatíveis.

**Simulação obrigatória:** Executar smoke no domínio publicado e interromper se contrato crítico, segurança ou integridade divergirem.

**Entregável e aceite:** Ambiente produtivo corresponde ao candidato e aceite de publicação está registrado.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P148 — Acompanhar primeira compra real

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P147 **Origem:** E097.

**Ação:** Com autorização e participantes reais, acompanhar solicitação até recebimento/financeiro e registrar intervenções necessárias.

**Simulação obrigatória:** Reconciliar eventos e documentos reais sem substituir falha por ajuste manual sem trilha.

**Entregável e aceite:** Primeira compra encerrada com confirmação de comprador, operação e financeiro.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P149 — Validar segunda cooperativa e medir resultados

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** P148 **Origem:** E098, E099, B32.

**Ação:** Executar operação com política, alçada e PAs distintos; comparar indicadores e barreiras do piloto e corrigir causas comprovadas.

**Simulação obrigatória:** Testar isolamento, delegação e troca de contexto entre cooperativas com regras diferentes.

**Entregável e aceite:** Expansão validada e melhorias baseadas em resultados observados, sem extrapolar amostra.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


### P150 — Encerrar o plano e instituir evolução contínua

**Prioridade:** P1 · **Responsável funcional:** Qualidade, plataforma e responsáveis de negócio · **Estado:** Planejada.

**Dependências:** Todas as etapas P001–P149. **Origem:** E100, C46, C50, T50.

**Ação:** Revisar os 150 aceites e a rastreabilidade dos planos originais, estabelecer revisões de segurança, dívida, UX e operação.

**Simulação obrigatória:** Reabrir item cuja evidência venceu ou requisito regrediu; impedir encerramento com dependência ou decisão pendente.

**Entregável e aceite:** Termo de aceite com evidências, responsáveis e backlog residual aprovado; nenhuma nota 10/10 autodeclarada.

**Checklist de conclusão:**

- [ ] Premissas e dependências verificadas; baseline e diagnóstico registrados.
- [ ] Ação e entregável desta etapa realizados, revisados e versionados quando aplicável.
- [ ] Simulação específica executada, resultado esperado/observado registrado e falhas tratadas.
- [ ] Critério de aceite específico demonstrado; integração/publicação comprovadas quando exigidas.
- [ ] Evidência sanitizada anexada com ambiente, data, commit e limites; contingência verificada.
- [ ] Executor e revisor nominais assinaram o aceite; nenhuma dependência ou decisão obrigatória aberta.

**Registro a preencher:** executor —; revisor —; evidência —; data —; bloqueio —.


## Controle dos artefatos

`plano.json` é a definição estruturada; Markdown e CSV são derivados. O checklist publicado é uma definição inicial: todas as marcações permanecem pendentes. Registrar execução e assinaturas em evidência separada vinculada ao ID, sem alterar a definição silenciosamente. O validador desta versão verifica o plano inicial, não autentica pessoas nem certifica o produto.

Regerar: `python3 scripts/revisao/gerar-plano-150-20260927.py`. Conferir sem escrever: `python3 scripts/revisao/gerar-plano-150-20260927.py --check`. Mudança de escopo exige revisão da definição e de todos os derivados; manter histórico das decisões e avaliações anteriores.
