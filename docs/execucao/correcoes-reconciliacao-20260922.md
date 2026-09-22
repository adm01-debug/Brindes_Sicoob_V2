# Execução da reconciliação — 22/09/2026

> Atualização após conexão administrativa: [retomada MCP e situação atual](retomada-mcp-20260922.md). Os números e bloqueios abaixo registram o estado anterior à aplicação no banco de construção.

Ambiente de construção. Base inicial: `60375b545`. Fonte: auditorias reais de
22/09 e plano corretivo de 50 etapas. O checkout principal tem edições de outro
trabalho; esta execução usa worktree próprio.

## Cenários revisados antes dos patches

| Cenário | Resultado esperado |
|---|---|
| Migration com prefixo de oito dígitos | Entra no inventário; não desaparece da comparação |
| SQL local diferente do ledger, versão idêntica | Drift explícito; nome igual não aprova conteúdo |
| Arquivo arquivado ou local sem registro | Classificação própria, sem recomendação automática de aplicação |
| Wrapper importado com alias/genérico e exemplo em comentário | Chamada real detectada; comentário ignorado |
| Tabela pai particionada com RLS | Auditoria considera `relkind = 'p'` |
| Policy de INSERT sem SELECT | Matriz não declara SELECT permitido |
| Usuário consultando auditoria de outra pessoa | RLS e email protegido impedem vazamento |
| Revogação MCP em duas requisições | Não prometer propagação de GUC transacional entre requisições |
| Health-check com erro de autorização ou RLS desligado | Não retornar migração aplicada |
| Webhook tentando escrever catálogo local inexistente | Rejeição explícita, sem escrita no catálogo externo |
| Cópia de regras interrompida depois de apagar componentes antigos | Transação inteira revertida; componentes antigos preservados |
| Grupo sem componentes no momento da cópia | Erro antes de qualquer exclusão no produto |
| Comprador ou usuário anônimo tentando alterar template | Operação negada por RLS/ACL e checagem da RPC |
| Passkey com `credential_id` conhecido, sem assinatura verificada | Login indisponível até integração WebAuthn no servidor |

## Lotes e checklist local

- [x] Verificadores: wrappers, migrations bidirecionais, conteúdo e preflight.
- [x] Controles SQL escritos: matriz, tabelas particionadas e view de concessões.
- [x] Complemento do contrato TypeScript: 8 tabelas, 4 colunas, 17 RPCs e 1 argumento.
- [x] Health-check, telemetria, webhook e chamada inválida de infraestrutura corrigidos.
- [x] Tendências: autoria de buscas em `user_id`, consultas tipadas e tratamento de falhas.
- [x] Inventário atualizado a partir da coleta real de 22/09: 202 relações, 167 RPCs, 13 buckets.
- [x] Simulações PostgreSQL e testes de regressão executados.
- [x] Revisão local, publicação da branch e abertura do PR #12 como rascunho.
- [x] Passkey insegura desativada até haver desafio e assinatura validados no servidor.
- [x] Templates de personalização e cópia atômica simulados em PostgreSQL descartável.
- [x] Duas interfaces de produto ligadas à RPC; técnicas externas resolvidas por ID na aplicação.
- [ ] Aplicação remota e revalidação com acesso administrativo.
- [ ] Homologação completa dos fluxos e CI executado no SHA final.

A chave da Data API não permite consultar/aplicar o ledger ou obter o código
publicado das Edge Functions. Reconexão do MCP solicitada enquanto o trabalho
local prossegue. Não marcar a última etapa com base apenas em teste local.
Os MCPs de Supabase visíveis nesta sessão apontam para outros projetos; nenhum
conector administrativo identificado aponta para `cfmzkthhgliqelozlmwu`.

## Correções e limites

1. **Ledger:** comparação nos dois sentidos, versões de oito dígitos, duplicações,
   arquivos arquivados e hash de SQL normalizado. A normalização não afirma
   equivalência semântica. Leitura em transação read-only; nenhum repair automático.
   Sem conexão administrativa o comando falha, não declara alinhamento.
2. **Referências:** AST identifica `untypedFrom`, aliases, genéricos e namespaces;
   referências dinâmicas ficam explícitas. As demais formas de cliente ainda usam
   heurísticas locais; a varredura não prova cobertura de chamadas arbitrárias.
3. **Permissões:** duas migrations novas, sem reescrever migrations históricas.
   A matriz deixa de confundir INSERT com SELECT e inclui partições pai. A view
   mantém RLS do invocador e resolve email por helper com acesso próprio/dev/servidor,
   sem conceder leitura de `auth.users` ao cliente. Matriz de policies não é teste
   de acesso real por cooperativa nem avaliação completa de predicados.
4. **Health-check:** autorização dev; metadados restritos ao servidor; qualquer
   erro de tabela/RPC ou RLS desligado impede `migration_applied: true`.
5. **Telemetria:** erros passam a usar `telemetry_events`, já existente, mantendo
   Sentry. Query e fragmento da URL não são enviados. Falha de envio é registrada;
   não há alegação de entrega garantida nem confirmação de DSN remoto.
6. **Catálogo externo:** `product-webhook` vira endpoint 410 sem efeitos colaterais.
   A sincronização local incompatível deixa de escrever; o catálogo externo continua
   sendo consultado. Publicação da Edge Function ainda pendente.
7. **Revogação MCP:** removida a RPC `set_config` inexistente. Mesmo um wrapper
   separado não propagaria `SET LOCAL` para a transação de UPDATE. A auditoria
   explícita existente registra o ator; atomicidade entre revogação e log não foi
   certificada por esta mudança.
8. **Tendências:** a API confirma `search_analytics.user_id`, não `seller_id`.
   Corrigidos filtro e projeção; erro deixa de virar KPI zero, atualização passa a
   refazer as quatro consultas, e o modo demonstrativo não faz essas consultas.

O complemento de tipos usa OpenAPI e migrations locais para os retornos RPC.
Não substitui geração administrativa completa: FKs, tipos SQL, overloads e corpos
remotos ainda precisam de reconciliação. O comparador não encontrou nomes de
relações/colunas/argumentos expostos ausentes dos tipos; **13 relações dos tipos
não aparecem na API**. Algumas são partições internas; ausência na API não prova
ausência no PostgreSQL. Não foram apagadas por suposição.

O lote de templates acrescenta tipos para duas colunas e uma RPC que **ainda não
constam do snapshot remoto**. A divergência é esperada até aplicar a migration e
refazer a coleta administrativa; o relatório anterior de tipos não certifica este
novo lote. As migrations antigas da mesma família também descrevem tabelas que
não apareceram na API; antes de aplicar qualquer SQL remoto é obrigatório
inspecionar `pg_catalog` e o ledger para evitar colisão com objetos ocultos.

## Evidência reproduzível

- [Simulação SQL](evidencias/correcoes-20260922/simulacao-controles.json): banco
  PostgreSQL descartável, sem rede, dados sintéticos, rollback prévio, reaplicação
  e cenários de autorização. Não representa aplicação no Supabase remoto.
- [Tipos versus API](evidencias/correcoes-20260922/tipos-versus-api.json): hashes
  dos arquivos comparados e divergências nas duas direções.
- [Referências restantes](evidencias/correcoes-20260922/referencias-runtime.json):
  arquivo/linha de cada ocorrência, incluindo itens da allowlist preexistente.
- `scripts/db/.inventory-cache.json` registra hashes do OpenAPI e da listagem de
  buckets coletados em 22/09. O importador não consulta rede nem certifica atualidade.

Comandos: `npm run test:scenarios`, `npm run typecheck:baseline`,
`npm run lint:baseline`, `npm run check:npm-audit`, `npm run build`,
`python3 scripts/qa/simular-controles-auditoria.py`,
`node scripts/check-edge-authorization.mjs` e os testes Vitest registrados no CI.
Para repetir a comparação, fornecer o snapshot administrativo ao comando
`node scripts/db/compare-types-api.mjs <openapi.json>`; divergências em qualquer
sentido resultam em código 1. Não contém nem solicita chave no código.

### Resultado dos checks locais

Base integrada: `1dee903c93` (inclui o trabalho concorrente publicado até esta
reconciliação). As mudanças de código deste lote passaram pelos checks abaixo.

| Check | Resultado |
|---|---|
| Vitest crítico do workflow | 138 testes aprovados, 21 arquivos |
| Cenários Node | 89 aprovados |
| Cenários PostgreSQL | 30 aprovados; remoto_validado=false, incluindo rollback integral, grupo vazio e código composto |
| Build Vite | Aprovado; artefato local gerado |
| Typecheck baseline | Sem regressão: 786 erros globais versus baseline 801; não é tipagem global zerada |
| Lint baseline | Sem regressão nos 15 arquivos de aplicação; 19 erros eliminados; dívida global permanece |
| Auditoria de dependências | Gate aprovado |
| Manifesto de autorização Edge | 104 entradas validadas estaticamente |
| Deno das três Edge Functions alteradas | Aprovado |
| Imutabilidade de migrations | Aprovada; somente arquivos SQL novos |
| Referências runtime | Reprovado: 58 ocorrências em 17 recursos, 27 bloqueantes |
| Contrato TypeScript versus API | Sem nomes expostos faltando nos tipos; 13 relações extras exigem classificação |
| Ledger real / funções publicadas / homologação remota | Não verificados nesta execução |

Os testes críticos usam dados sintéticos e mocks quando apropriado. Não há
alegação de login real, entrega de telemetria ou jornada completa no Supabase.

### Publicação e CI remoto

- Correções: [PR #12](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/12).
- Snapshot local/GitHub: [PR #13](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/13).
- Snapshot da API real: [PR #14](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/14).
- Reconciliação funcional e de segurança no banco de construção: [PR #16](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/16).

Os dois snapshots históricos foram validados novamente em seus próprios
worktrees antes da publicação (hashes, contagens, links e padrões de credenciais).
Eles registram estados anteriores às correções, não o estado após este lote.

Na publicação de `a4a3814f7`, o [job de qualidade](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/35742550546)
não iniciou: o GitHub informou bloqueio de orçamento do Actions; zero etapas
foram executadas. Não houve alteração de orçamento nem bypass dos checks. A
integração preexistente da Vercel iniciou preview automático ao abrir o PR; isso
não certifica paridade de banco nem homologação. Neste lote, 19 migrations foram
aplicadas com dry-run prévio e ledger exato no banco de construção autorizado.
Nenhuma publicação manual de Edge Functions foi executada. O ping administrativo
dos 103 nomes locais encontrou 98 respostas HTTP 200, quatro HTTP 404 e um timeout.
As ausências de `sicoob-artwork-register`, `sicoob-kit-quote` e `sicoob-reorder`
bloqueiam fluxos usados pelo frontend; o MCP não possui token de Management API
para comparar ou publicar o código.

## Pendências que impedem o aceite integral

O gate atual de referências aprovou as 1.128 chamadas analisadas, sem referência
quebrada e sem uso de allowlist. Permanecem como pendências independentes desse
gate: acesso completo e somente leitura ao catálogo externo, comparação do código
publicado das Edge Functions, revisão semântica das 468 migrations fora do ledger,
auditoria por ator dos contratos autenticados restantes e homologação com contas e
cooperativas reais de teste, armazenamento e fluxos completos.

**Contrato de somente leitura do catálogo:** a função `external-db-bridge` já
recusa operações de escrita no ingresso. Entretanto, há interfaces legadas que
ainda oferecem edição de produtos, imagens, variantes, fornecedores e técnicas
via essa ponte; elas falharão com `CATALOG_READ_ONLY`. Migrar essas operações
para entidades próprias locais ou retirar os controles após decidir o fluxo de
negócio. Não habilitar escrita no banco externo para fazer a interface parecer
funcional. O módulo de prompts também consultava técnicas no banco errado;
agora faz a consulta pela ponte externa de leitura.

## Reconciliação das 50 etapas corretivas

Referência: [plano de 17/09](../plano-implementacao/plano-correcoes-auditoria-50-etapas-20260917.md).
"Local" significa implementação/artefato validado neste checkout; não implantação.
Etapas sem prova atual permanecem abertas, mesmo quando um documento histórico
as trata como prontas. Este projeto está em construção, conforme orientação do usuário.

| Etapa | Estado e evidência/pendência |
|---:|---|
| 1 | Base origin/main consultada; execução isolada para preservar outro trabalho local |
| 2 | PR #12 aberto em rascunho; cobertura dos commits históricos precisa de reconciliação própria |
| 3 | Aberta: merge depende de revisão e checks; nenhum bypass autorizado pelo resultado local |
| 4 | Sem ação: artefatos de outros worktrees preservados; não fazem parte desta correção |
| 5 | Concluída: statements reais da baseline foram extraídos do ledger administrativo e preservados localmente |
| 6 | Concluída com limite explícito: baseline aplicada e arquivo local coincidem após normalização textual preliminar; isso não substitui prova semântica |
| 7 | Concluída: versão canônica preservada; nenhuma migration foi arquivada apenas por semelhança de nome |
| 8 | Concluída para a baseline: ledger consultado e reconciliado sem repair artificial; versões sem corpo permanecem declaradas |
| 9 | Aberta: Bitrix exige contrato atualizado e teste; não aplicar cluster histórico indiscriminadamente |
| 10 | Parcial: pacote de versionamento aplicado e ensaiado no banco de construção; concorrência real entre duas sessões ainda pendente |
| 11 | Parcial: helpers e health-check aplicados e testados no banco de construção; publicação de Edge Functions segue fora desta evidência |
| 12 | Parcial avançada: pacote Sicoob fechado, 80 funções de trigger sem RPC cliente e exposição anônima global de `SECURITY DEFINER` não-trigger reduzida de 96 para 15. Nove helpers foram limitados ao próprio ator; auditoria dos contratos autenticados remanescentes continua necessária |
| 13 | Parcial: 468/468 migrations fora do ledger classificadas estaticamente; revisão semântica e ordem de dependências continuam obrigatórias |
| 14 | Código da base já usa `cooperativa_budgets`/`pa_budgets`; homologação por período pendente |
| 15 | Parcial: webhook corrigido; restam dois usos de products em mockups e companies sem consumidor |
| 16 | Buckets antigos não aparecem no gate atual; upload autenticado ponta a ponta ainda pendente |
| 17 | Local: chamada morta de set_config removida e comentário corrigido; publicação pendente |
| 18 | Local: uso de telemetry_events e teste de envio; entrega remota não certificada |
| 19 | Parcial: AST para wrappers e inventário atualizado; 58 ocorrências ainda abertas, 27 bloqueantes |
| 20 | Gate ligado ao CI; novos testes incluídos; GitHub não iniciou o job por bloqueio de orçamento |
| 21 | Documento de órfãos preexistente; contagens não bastam para remover recursos |
| 22 | Aberta: confirmar FKs/dependências remotas antes de qualquer remoção da família de PAs |
| 23 | Aberta: blog_posts preservada; ausência de rota não autoriza concluir que não há uso externo |
| 24 | Aberta: Magic Up colaborativo ainda não tem aceite funcional completo |
| 25 | Parcial e bloqueante: módulos locais e consumidores existem, mas `sicoob-artwork-register`, `sicoob-kit-quote` e `sicoob-reorder` retornaram HTTP 404 no ambiente de construção |
| 26 | Parcial: SQL da view corrigido localmente; tela e leitura remota ainda precisam de aceite |
| 27 | Aberta: dependências internas e intenção de cada RPC exigem catálogo PostgreSQL completo |
| 28 | Parcial: 13 buckets vazios na coleta de 22/09; nenhum removido sem confirmar dependências |
| 29 | Concluída para o estado atual: comparador bidirecional executado contra o ledger real; 41 versões remotas, 509 locais e 468 locais fora do ledger |
| 30 | Parcial: auditoria anterior identificou bypass administrativo e ausência de checks obrigatórios; mitigação não concluída |
| 31 | Aberta: alerta periódico de commits sem PR não foi implementado neste lote |
| 32 | Runbook existente atualizado para banco de construção, simulação e reconciliação bidirecional |
| 33 | Varredura inclui storage multilinha; nenhuma ocorrência de bucket ausente no inventário de 22/09 |
| 34 | Relatório de 17/09 já versionado; esta execução acrescenta evidências datadas |
| 35 | Plano principal recebe ligação para os achados atuais, sem reescrever a evidência histórica |
| 36 | Métricas desta execução datadas acima; ledger remoto não substituído por contagem de arquivos |
| 37 | Decisões consolidadas atualizadas com correções feitas e pendências reais |
| 38 | Aberta: decisões de negócio remanescentes não foram inventadas nem comunicadas a terceiros |
| 39 | Concluída no gate estático atual: 1.128 referências analisadas, zero quebradas e zero entradas de allowlist |
| 40 | Parcial: testes e baselines locais validados; tipagem global mantém 668 erros preexistentes e o CI remoto não iniciou por orçamento |
| 41 | Aberta: quatro jornadas completas não homologadas; três delas dependem de Edge Functions Sicoob ainda ausentes no ambiente de construção |
| 42 | Aberta: branch isolada ainda depende de merge; não afirmar igualdade com main |
| 43 | Concluída no banco de construção: ledger revalidado após cada aplicação e 19 hashes exatos confirmados |
| 44 | Parcial: lote aplicado ao banco de construção autorizado; nenhuma comunicação a terceiros foi necessária |
| 45 | Nota de mudanças presente neste relatório; ainda não é release |
| 46 | Backlog técnico consolidado acima; responsáveis/prazos de negócio não foram inventados |
| 47 | Aberta: importação do snapshot reproduzível; atualização automática semanal ainda não concluída |
| 48 | Parcial: SQL ensaiado com rollback e aplicado no banco remoto de construção; jornadas completas e integrações externas ainda pendentes |
| 49 | Aberta: prazos dos responsáveis pelos módulos remanescentes ainda sem definição |
| 50 | Retrospectiva registrada abaixo; cobertura de chamadas indiretas permanece limitada e explícita |

## Retrospectiva do método

As auditorias anteriores perderam wrappers tipados como `untypedFrom<T>()`,
confundiram presença de policy com permissão de uma operação, ignoraram pais
particionados e compararam ledger apenas pelo nome. Os novos cenários reproduzem
esses casos. O health-check também podia transformar erro em sucesso; agora exige
todos os sinais válidos. Nenhum desses testes substitui teste autenticado em duas
cooperativas, inspeção do ledger ou comparação do código implantado.

As instruções antigas de "criar wrapper para set_config", "aplicar todas as
migrations ausentes" e "trocar todo products pelo cliente externo" não são
seguras de forma genérica. As dependências e transações foram analisadas antes
dos patches para evitar recriar estruturas incompatíveis com o projeto atual.
