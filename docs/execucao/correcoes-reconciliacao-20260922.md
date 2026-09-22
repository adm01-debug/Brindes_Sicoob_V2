# Execução da reconciliação — 22/09/2026

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

## Lotes e checklist local

- [x] Verificadores: wrappers, migrations bidirecionais, conteúdo e preflight.
- [x] Controles SQL escritos: matriz, tabelas particionadas e view de concessões.
- [x] Complemento do contrato TypeScript: 8 tabelas, 4 colunas, 17 RPCs e 1 argumento.
- [x] Health-check, telemetria, webhook e chamada inválida de infraestrutura corrigidos.
- [x] Tendências: autoria de buscas em `user_id`, consultas tipadas e tratamento de falhas.
- [x] Inventário atualizado a partir da coleta real de 22/09: 202 relações, 167 RPCs, 13 buckets.
- [x] Simulações PostgreSQL e testes de regressão executados.
- [x] Revisão local, publicação da branch e abertura do PR #12 como rascunho.
- [ ] Aplicação remota e revalidação com acesso administrativo.
- [ ] Homologação completa dos fluxos e CI executado no SHA final.

A chave da Data API não permite consultar/aplicar o ledger ou obter o código
publicado das Edge Functions. Reconexão do MCP solicitada enquanto o trabalho
local prossegue. Não marcar a última etapa com base apenas em teste local.

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

Base integrada: `cbaf329833` (inclui o trabalho concorrente publicado até esta
reconciliação). As mudanças de código deste lote passaram pelos checks abaixo.

| Check | Resultado |
|---|---|
| Vitest crítico do workflow | 137 testes aprovados, 20 arquivos |
| Cenários Node | 89 aprovados |
| Cenários PostgreSQL | 19 aprovados; remoto_validado=false |
| Build Vite | Aprovado; artefato local gerado |
| Typecheck baseline | Sem regressão: 848 erros globais versus baseline 861; não é tipagem global zerada |
| Lint baseline | Sem regressão nos 5 arquivos de aplicação; 4 erros eliminados; dívida global permanece |
| Auditoria de dependências | Gate aprovado |
| Manifesto de autorização Edge | 104 entradas validadas estaticamente |
| Deno das três Edge Functions alteradas | Aprovado |
| Imutabilidade de migrations | Aprovada; somente arquivos SQL novos |
| Referências runtime | Reprovado: 71 ocorrências, 39 bloqueantes |
| Contrato TypeScript versus API | Sem nomes expostos faltando nos tipos; 13 relações extras exigem classificação |
| Ledger real / funções publicadas / homologação remota | Não verificados nesta execução |

Os testes críticos usam dados sintéticos e mocks quando apropriado. Não há
alegação de login real, entrega de telemetria ou jornada completa no Supabase.

### Publicação e CI remoto

- Correções: [PR #12](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/12).
- Snapshot local/GitHub: [PR #13](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/13).
- Snapshot da API real: [PR #14](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/14).

Os dois snapshots históricos foram validados novamente em seus próprios
worktrees antes da publicação (hashes, contagens, links e padrões de credenciais).
Eles registram estados anteriores às correções, não o estado após este lote.

Na publicação de `a4a3814f7`, o [job de qualidade](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/35742550546)
não iniciou: o GitHub informou bloqueio de orçamento do Actions; zero etapas
foram executadas. Não houve alteração de orçamento nem bypass dos checks. A
integração preexistente da Vercel iniciou preview automático ao abrir o PR; isso
não certifica paridade de banco, aplicação de migrations ou homologação.
Nenhuma migration remota ou publicação manual de Edge Functions foi executada.

## Pendências que impedem o aceite integral

O gate de referências termina com código 1: **71 ocorrências em 17 recursos**,
sendo **39 fora da allowlist**. A allowlist não foi ampliada para esconder achados.

| Família | Ocorrências | Reconciliação necessária |
|---|---:|---|
| Grupos, componentes e locais de personalização | 29 | Definir e validar o contrato das quatro tabelas ausentes; não escrever no catálogo externo |
| `personalization_techniques`, `color_nuances`, `personalization_simulations` | 8 | Separar dados de catálogo e configurações locais; validar referências |
| `products` em mockups/rascunhos | 2 | Verificar FKs remotas e preservar identificação do produto externo; trocar cliente sem isso pode gerar violação de FK |
| `user_2fa_settings`, `user_passkeys` | 10 | Autenticação precisa de validação no servidor; criar tabelas de segredos no cliente não resolve o fluxo |
| Bitrix: clientes, negócios e logs | 10 | Confirmar integração e contrato externo; migrations históricas têm permissões inadequadas |
| `sales_goals`, `roles`, `companies` | 11 | Implementar contrato/consumo correto ou documentar retirada; não confundir `roles` com `user_roles` |
| `create_quote_version_atomic` | 1 | Aplicar pacote existente somente após validação administrativa e testar concorrência remota |

Também permanecem: ledger completo, comparação do código publicado das Edge
Functions, classificação das 186 assinaturas apontadas pela auditoria de ACL,
homologação com usuários/tenants reais de teste, armazenamento e fluxos completos.
Os 391 apontamentos de ACL não equivalem a 391 vulnerabilidades confirmadas.

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
| 5 | Bloqueada por acesso: extrair statements reais da baseline do ledger |
| 6 | Bloqueada pela etapa 5: comparar baseline aplicada com arquivo local |
| 7 | Bloqueada pela comparação; não arquivar migration por semelhança de nome |
| 8 | Bloqueada por acesso; não executar repair para apenas silenciar drift |
| 9 | Aberta: Bitrix exige contrato atualizado e teste; não aplicar cluster histórico indiscriminadamente |
| 10 | Parcial: pacote de versionamento existe; RPC ausente na API de 22/09; aplicação remota pendente |
| 11 | Local: helpers reescritos e health-check testado; aplicação/publicação remotas pendentes |
| 12 | Parcial: novos controles testados em SQL; auditoria remota por função ainda necessária |
| 13 | Parcial: inventários anteriores e novas referências identificados; classificação integral não concluída |
| 14 | Código da base já usa `cooperativa_budgets`/`pa_budgets`; homologação por período pendente |
| 15 | Parcial: webhook corrigido; restam dois usos de products em mockups e companies sem consumidor |
| 16 | Buckets antigos não aparecem no gate atual; upload autenticado ponta a ponta ainda pendente |
| 17 | Local: chamada morta de set_config removida e comentário corrigido; publicação pendente |
| 18 | Local: uso de telemetry_events e teste de envio; entrega remota não certificada |
| 19 | Parcial: AST para wrappers e inventário atualizado; 71 ocorrências ainda abertas |
| 20 | Gate ligado ao CI; novos testes incluídos; GitHub não iniciou o job por bloqueio de orçamento |
| 21 | Documento de órfãos preexistente; contagens não bastam para remover recursos |
| 22 | Aberta: confirmar FKs/dependências remotas antes de qualquer remoção da família de PAs |
| 23 | Aberta: blog_posts preservada; ausência de rota não autoriza concluir que não há uso externo |
| 24 | Aberta: Magic Up colaborativo ainda não tem aceite funcional completo |
| 25 | Parcial: módulos de aprovações/logística já têm consumidores; homologação integrada não refeita |
| 26 | Parcial: SQL da view corrigido localmente; tela e leitura remota ainda precisam de aceite |
| 27 | Aberta: dependências internas e intenção de cada RPC exigem catálogo PostgreSQL completo |
| 28 | Parcial: 13 buckets vazios na coleta de 22/09; nenhum removido sem confirmar dependências |
| 29 | Local: comparador bidirecional e job existentes corrigidos; ledger real não acessível |
| 30 | Parcial: auditoria anterior identificou bypass administrativo e ausência de checks obrigatórios; mitigação não concluída |
| 31 | Aberta: alerta periódico de commits sem PR não foi implementado neste lote |
| 32 | Runbook existente atualizado para banco de construção, simulação e reconciliação bidirecional |
| 33 | Varredura inclui storage multilinha; nenhuma ocorrência de bucket ausente no inventário de 22/09 |
| 34 | Relatório de 17/09 já versionado; esta execução acrescenta evidências datadas |
| 35 | Plano principal recebe ligação para os achados atuais, sem reescrever a evidência histórica |
| 36 | Métricas desta execução datadas acima; ledger remoto não substituído por contagem de arquivos |
| 37 | Decisões consolidadas atualizadas com correções feitas e pendências reais |
| 38 | Aberta: decisões de negócio remanescentes não foram inventadas nem comunicadas a terceiros |
| 39 | Executada e reprovada: 71 ocorrências, 39 bloqueantes; evidência anexada |
| 40 | Parcial: testes e baselines locais validados; tipagem global tem dívida e testes remotos pendem |
| 41 | Aberta: quatro jornadas completas não homologadas no banco de construção |
| 42 | Aberta: branch isolada ainda depende de merge; não afirmar igualdade com main |
| 43 | Bloqueada por acesso: ledger não revalidado |
| 44 | Não enviada: este lote não foi publicado no banco e não houve instrução para contactar terceiros |
| 45 | Nota de mudanças presente neste relatório; ainda não é release |
| 46 | Backlog técnico consolidado acima; responsáveis/prazos de negócio não foram inventados |
| 47 | Aberta: importação do snapshot reproduzível; atualização automática semanal ainda não concluída |
| 48 | Parcial: SQL simulado em ambiente isolado; staging remoto completo ainda pendente |
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
