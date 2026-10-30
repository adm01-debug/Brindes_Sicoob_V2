# Auditoria local ↔ GitHub ↔ Supabase — 22/09/2026

**Parecer: não há equivalência integral demonstrada entre os três ambientes.**
O código commitado está publicado no GitHub, mas existem edições locais sem commit e
documentos fora do Git. A comparação atual com o banco está bloqueada por
autenticação. O inventário de 17/09 ainda permite identificar divergências e
falhas dos verificadores, mas não comprova o schema remoto em 22/09.

O ambiente é **de construção**, conforme confirmação expressa do usuário.
Os termos “produção” nos documentos e commits antigos não alteram essa
classificação. Esta rodada é de auditoria: não aplicou migrations, não publicou
Edge Functions, não fez merge/push e não alterou dados de negócio.

## 1. Escopo, método e precisão

- Repositório privado `adm01-debug/Brindes_Sicoob_V2`.
- Cinco branches preexistentes e quatro worktrees preexistentes. O worktree
  `audit/sicoob-20260922`, criado para este relatório, foi excluído das contagens
  de pendências preexistentes.
- Três pastas externas: documentos fornecidos, análise e plano de implementação.
- Projeto operacional `cfmzkthhgliqelozlmwu`; catálogo externo
  `doufsxqlfjyuvxuezpln` exclusivamente para leitura.
- Comparação de SHA de commits, árvores e blobs Git, hashes SHA-256 dos
  documentos/migrations, APIs do GitHub, leitura dos verificadores e análise
  complementar de chamadas pela AST TypeScript.
- Capturas Git às **08:47:20 e 08:50:30 de 22/09/2026, America/Sao_Paulo**.
  O checkout principal recebeu edições entre as capturas; não foi tratado como
  uma fotografia imutável. Ambas estão anexadas.
- Commit de referência: `e984c4b1117e766e6a0d9df5cfd54a33c6ba0c68`.
  Árvore de `main`: `07d63887ce35a4cc16bb3fe628c59ee560a73e9d`.

O grafo Graphify de 11/09, na pasta de análise, foi consultado com os termos
existentes `audit`, `banco`, `migration`, `schema` e `storage`. A travessia local
cobriu 17 nós e orientou a leitura documental; não foi usado para afirmar o
estado atual de GitHub ou Supabase. Nenhum grafo novo foi gerado.

**Classes de evidência:** “atual” é observação desta rodada; “histórica” é
inventário/documento de data anterior; “pendente” depende de acesso ou teste
que não ocorreu. Ausência numa busca estática não prova que um recurso possa
ser excluído: gatilhos, cron, consumidores externos e chamadas dinâmicas podem
usá-lo.

## 2. Matriz de reconciliação

| Direção | Resultado | Evidência |
|---|---|---|
| Commits locais → GitHub | Cinco branches com SHA idêntico ao remoto; zero commits alcançáveis somente por refs locais antes deste relatório | `git.json`, `git rev-list --all --not --remotes=origin` |
| GitHub → objetos Git locais | Cinco branches obtidas; nenhuma sem branch local; conectividade dos objetos aprovada | `git.json`, `git fsck --connectivity-only --no-dangling` |
| Arquivos em edição → GitHub | **11 ocorrências de arquivos modificados em dois worktrees**; seus blobs não aparecem nas pontas das branches remotas conferidas | `git.json` |
| Documentos externos → GitHub | 101 arquivos examinados; 35 com blob idêntico; **66 sem cópia idêntica nas pontas remotas** | `arquivos-externos.json` |
| Código → inventário histórico do banco | **83 chamadas a 22 identificadores ausentes do cache de 17/09**; precisam de revalidação ao vivo | `referencias-consolidadas.json` |
| Tipos → inventário histórico | 203 tabelas tipadas contra 216 no cache; 4 somente nos tipos e 17 somente no cache | `tipos-versus-cache.json` |
| Migrations → banco atual | 495 ativas e 20 arquivadas inventariadas; ledger atual não acessível | `migrations.json`, `acesso-banco.json` |
| Banco atual → código | Sem leitura administrativa nesta rodada; igualdade de schema, funções, políticas, dados e Storage **não certificada** | `acesso-banco.json` |
| Edge Functions locais ↔ publicadas | 103 entrypoints locais com manifesto de arquivos; lista/código remoto atual não acessível | `edge-local.json` |
| CI do GitHub | Últimas execuções dos dez workflows encontrados falharam; jobs não iniciaram por orçamento do Actions | `github-ci.json` |

Igualdade de commit não inclui alterações sem commit. Igualdade de nome de
migration não prova igualdade do SQL aplicado. Tabelas/dados operacionais não
devem ser copiados indiscriminadamente para o GitHub: a reconciliação correta
envolve contratos, migrations, configurações e procedimentos de backup.

## 3. Git, arquivos locais e documentos fornecidos

### 3.1 Código publicado

`main` local e remoto coincidem. Os **3.551 blobs** da árvore de `main` estão
representados na cópia Git local; não há submódulos nem ponteiros LFS encontrados.
As cinco branches preexistentes estão publicadas com SHA idêntico.
Não há tags locais/remotas, stashes ou releases no GitHub na consulta adicional.

PRs #8, #9, #10 e #11 estão **MERGED**. O #11 foi incorporado em 21/09/2026.
Assim, o diagnóstico antigo de “PR retroativa ainda pendente” está superado.
Branches antigas permanecem publicadas após merges por squash; a presença
delas, por si só, não significa perda de código em `main`.

### 3.2 Conteúdo que ainda está somente no working tree

Última captura: nove arquivos modificados em `main`:

1. `.typecheck-baseline.json`;
2. `docs/correcoes-validacao-2026-09-14.md`;
3. `docs/plano-melhorias-50-etapas.md`;
4. `src/pages/GestorApprovalsPage.tsx`;
5. `src/pages/sicoob/GestorApprovalsPage.tsx`;
6. `src/pages/sicoob/orders/OrderDetailPage.tsx`;
7. `src/services/sicoob/approvalService.ts`;
8. `src/types/sicoob/orders.ts`;
9. `supabase/.temp/cli-latest`.

No worktree `execucao/sicoob-reconciliacao-20260915`:

10. `.gitignore` — acrescenta `graphify-out/`;
11. `supabase/.temp/cli-latest`.

Os dois outros worktrees estavam limpos. A primeira captura tinha seis
modificações em `main`; três surgiram durante esta rodada. Não fiz stash,
reset ou commit dessas edições de terceiros.

O diff de `approvalService.ts` e da página genérica de aprovações contém
correções de joins de perfis, além de tipagem/imports. Essas correções locais
ainda não integram o código publicado. A existência do diff não comprova que
ele esteja testado ou pronto para merge.

**Reconciliação:** revisar e testar esse lote no worktree do responsável,
publicá-lo por PR; tratar `.temp/cli-latest` como metadado da ferramenta,
separando-o das correções funcionais. Preservar edições em andamento.

### 3.3 Acervo fora do repositório

| Pasta | Arquivos | Blob idêntico em alguma branch remota | Sem blob idêntico |
|---|---:|---:|---:|
| Brindes Sicoob V2 - Docs | 26 | 0 | 26 |
| Brindes Sicoob V2 - Analise | 53 | 23 | 30 |
| Brindes Sicoob V2 - Plano de Implementacao | 22 | 12 | 10 |
| Total | 101 | 35 | 66 |

Os 26 arquivos de documentos incluem **13 originais e 13 metadados Windows
`:Zone.Identifier`**. Nenhum original tem blob idêntico nas pontas remotas
conferidas. Resumos dos documentos no repositório não equivalem à preservação
dos originais. Exemplos: `Portal de Compras - Sicoob.xlsx`,
`Manual-do-Fornecedor-SICOOB-Centro-1.pdf`, `Presentes Final de Ano - Br Supply.pdf`.

Nas outras pastas, as ausências incluem ZIPs de entrega, PDFs/HTMLs exportados,
capturas visuais, manifestos e o grafo Graphify. São **103.457.061 bytes** sem
blob idêntico no conjunto verificado. Isso mede igualdade binária nas branches
atuais, não prova que nunca tenham existido em todo o histórico nem que uma
versão com conteúdo equivalente não esteja presente.

**Reconciliação:** definir armazenamento durável para os 13 originais e
artefatos de entrega, com manifesto de hashes e links versionados. Arquivos
gerados, metadados Windows, `node_modules`, `dist`, caches, sessões E2E e
credenciais não devem ser enviados automaticamente ao repositório ou banco.
A lista completa, com nomes, tamanhos e hashes, está anexada.

## 4. Acesso atual ao banco e limites da conclusão

Sondas GET executadas em 22/09:

| Meio de acesso | Resultado atual |
|---|---|
| Chave `VITE_SUPABASE_ANON_KEY` de `.env.production` | HTTP 401, `Invalid API key` |
| Chave `VITE_SUPABASE_PUBLISHABLE_KEY` do mesmo arquivo | HTTP 401, `Invalid API key` |
| Credencial da CLI, leitura dos metadados do projeto correto | HTTP 403, privilégios insuficientes |
| MCP `brindes_sicoob_v2` | Configurado para o projeto correto, mas ausente das ferramentas desta sessão; sessão salva expirada |

O conteúdo de `.env.production` é idêntico ao versionado em `origin/main`.
As chaves codificam o projeto esperado e ainda têm expiração futura, mas foram
recusadas pela API. Não se concluiu se a causa é revogação, assinatura inválida
ou outra configuração do projeto. Variáveis efetivamente usadas no Vercel e
valores criptografados dos GitHub Secrets não foram lidos; não se pode extrapolar
esse teste para todos os ambientes publicados.

A renovação padrão da sessão OAuth não se completou: o endpoint exigiu um
`client_secret` que a sessão salva não fornece. Nenhuma credencial foi impressa
no relatório. Foi solicitada a reconexão do MCP pelo canal de interação.

**Consequência:** não foi possível consultar o ledger atual, comparar definições
de SQL/RPC, ACL/RLS, objetos de Storage, dados de negócio, logs, cron ou o código
efetivamente publicado das Edge Functions. Também não foi validado o catálogo
externo. A consulta `inventario-remoto-pendente.sql` está preparada, mas **não foi
executada**. Ela faz somente leitura e evita exportar registros pessoais.

## 5. Código ↔ contratos de banco: achados reproduzidos

### 5.1 O verificador existente não cobre todas as chamadas

`node scripts/db/check-runtime-refs.mjs --json` terminou com código **1**.
O scanner examinou 2.036 arquivos e reconheceu 1.109 referências internas.
Comparando com o cache de 17/09:

- 37 chamadas sem objeto correspondente;
- 32 são toleradas pela allowlist;
- 5 bloqueiam o check, todas em `supabase/functions/product-webhook/index.ts`,
  referenciando `products`.

Essas chamadas usam o cliente construído com `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY`, não o cliente do catálogo externo. O handler
inclui operações de exclusão e inserção/atualização de produto. Não foi invocado
na auditoria. A existência/publicação dele no remoto precisa ser conferida;
não se deve redirecionar suas escritas ao catálogo que foi autorizado apenas
para consulta.

O scanner retorna cedo para arquivos que não importam diretamente o cliente
Supabase e não correspondem à heurística Deno. Isso exclui chamadas de
`untypedFrom`, que por sua vez usa o cliente interno em
`src/lib/supabase-untyped.ts`.

A análise adicional pela AST encontrou **64 chamadas reais de `untypedFrom`**,
das quais **46** apontam a recursos ausentes do cache. Desconsiderou exemplos
em comentários e acompanhou os imports do wrapper.

### 5.2 Resultado consolidado: 83 chamadas, 22 identificadores

| Recurso ausente do cache | Chamadas identificadas |
|---|---:|
| bitrix_clients | 4 |
| bitrix_deals | 2 |
| bitrix_sync_logs | 4 |
| check_rls_enabled | 1 |
| color_nuances | 2 |
| companies | 1 |
| create_quote_version_atomic | 1 |
| error_logs | 1 |
| get_enum_values | 1 |
| personalization_simulations | 3 |
| personalization_techniques | 3 |
| product_component_location_techniques | 10 |
| product_group_components | 7 |
| product_group_location_techniques | 6 |
| product_group_locations | 6 |
| products | 7 |
| roles | 4 |
| sales_goals | 6 |
| set_config | 1 |
| sicoob_budgets | 3 |
| user_2fa_settings | 4 |
| user_passkeys | 6 |

Sete identificadores adicionais escapam do resultado do scanner existente:
`color_nuances`, `product_component_location_techniques`,
`product_group_components`, `product_group_location_techniques`,
`product_group_locations`, `user_2fa_settings` e `user_passkeys`.

Há consumidores em componentes de 2FA/passkeys, filtros de cores e administração
de personalização. Nem toda referência representa um fluxo ativo: por exemplo,
`sales_goals` e o módulo de white-label têm classificação histórica de código
sem consumidor. Os números são chamadas estáticas a contratos não encontrados
no inventário, **não 83 falhas de usuário reproduzidas no banco atual**.

**Reconciliação:** renovar o inventário ao vivo; corrigir o scanner para wrappers,
imports indiretos e chamadas dinâmicas relevantes; classificar cada recurso por
origem e consumidor; corrigir código ou schema conforme o contrato vigente.
Não criar todas as tabelas pelo nome nem ressuscitar migrations legadas de
Bitrix com permissões amplas. Arquivo/linha de cada chamada estão em
`referencias-consolidadas.json`.

### 5.3 Tipos gerados não acompanham nem o inventário histórico

- Tabelas: 203 tipadas, 216 no cache; interseção de 199.
- Somente nos tipos: `admin_audit_log_archive`, `admin_audit_log_old`,
  `personalization_simulations`, `sales_goals`.
- Somente no cache: nove partições de auditoria e oito tabelas:
  `audit_log`, `notification_templates`, `password_reset_requests`,
  `sicoob_kit_quote_requests`, `sicoob_order_shipments`,
  `sicoob_reorder_requests`, `webhook_configs`, `webhook_logs`.
- Views: os quatro nomes coincidem.
- Funções: 149 nomes nos tipos e 243 no cache. As 94 diferenças incluem
  funções de gatilho/internas que não necessariamente devem virar RPCs tipadas;
  a diferença bruta não é uma lista de 94 defeitos.

As listas são nominais. A auditoria não certifica equivalência de colunas,
assinaturas ou privilégios sem o schema atual. Regenerar tipos exige antes
definir qual schema/ambiente é a fonte de verdade.

## 6. Migrations e fidelidade do histórico

Há **495 migrations ativas e 20 arquivadas**, todas com manifesto SHA-256.
Não há prefixos duplicados entre as ativas. Cinco usam prefixos históricos de
três dígitos e uma tem prefixo de oito dígitos:
`20260102_20260102205635_add_soft_delete_support.sql`.

O script de drift aceita somente três ou quatorze dígitos no prefixo; portanto
ignora esse arquivo de oito dígitos. Além disso:

1. Consulta somente versões do ledger, sem SQL/hashes.
2. Detecta apenas ledger → arquivo ausente; não compara arquivo → ledger.
3. Considera migrations arquivadas junto das ativas.
4. Depende de `pg`, que não é declarado no `package.json`.
5. Precisa de `SUPABASE_DB_URL`, ausente nos secrets de repositório listados.
6. Nesta sessão terminou com código **2**, por falta da variável de conexão.

Esses limites não devem ser confundidos com uma auditoria bidirecional.

O baseline `20260915143442_sicoob_reconciliation_baseline.sql` está agora em
`main`; o rascunho `20260915160000` está arquivado. Isso resolve a ausência do
arquivo descrita anteriormente. O ledger atual e a identidade do SQL aplicado
ainda precisam de revalidação.

Entre o merge #10 e o `main` atual, arquivos já existentes de migrations de
16/09 tiveram conteúdo alterado: `20260916100000_security_hardening.sql` e
`20260916120000_admin_audit_log_operations.sql`. Há explicações no histórico do
PR #11, mas somente ler nomes de versões não distingue a primeira aplicação
das correções posteriores. Comparar `schema_migrations.statements` e definições
atuais com os arquivos é requisito para declarar fidelidade do histórico.

O documento de 20/09 registra `create_quote_version_atomic` como ainda não
aplicada e fornece um pacote SQL. O cache também não contém essa função.
**Estado atual: pendente de confirmação**, não “aplicada” por existir código.
Da mesma forma, 495 arquivos locais menos a quantidade histórica de registros
do ledger não é uma quantidade segura de migrations a executar automaticamente.

## 7. Storage, Edge Functions, dados e sentido inverso

O preflight ainda exige o bucket **`art-files`**, embora o ADR aceito determine
**`proposals`** e os consumidores já tenham sido alterados. Isso é uma
divergência atual entre a regra de auditoria e o código. O preflight também
verifica funções por nome, sem assinatura, ACL, corpo ou dependências; presença
não comprova funcionamento.

Há 103 diretórios com `index.ts` de Edge Function; a pasta `tests` explica a
contagem bruta de 104 diretórios fora de `_shared`. O manifesto inclui também
hashes dos arquivos de `_shared` e da configuração local Supabase.
A comparação com o remoto
precisa incluir o código do entrypoint **e suas dependências compartilhadas**,
configuração JWT e versões. Contar funções ou obter HTTP 200 não prova paridade.

Os documentos históricos classificam tabelas, views, funções e buckets sem
consumidor de frontend conhecido. Essas listas precisam ser cruzadas com
gatilhos, cron, chamadas SQL e integrações antes de qualquer exclusão. Não
classifiquei objetos remotos atuais como órfãos sem conseguir consultá-los.

Não foram exportados dados pessoais para o Git. Totais antigos de usuários,
perfis, pedidos, cooperativas, objetos de Storage e catálogo não foram
reutilizados como contagens atuais. Não há dataset local canônico identificado
que permita alegar igualdade linha a linha com dados transacionais remotos.
Quando houver seeds/fixtures, eles devem ser identificados explicitamente e
comparados separadamente dos dados criados pela aplicação.

## 8. GitHub Actions e proteção da branch

As últimas execuções encontradas de dez workflows têm conclusão `failure`.
As anotações dos jobs com falha informam: **“The job was not started because an Actions
budget is preventing further use.”** Os steps estão vazios; um job dependente de
regressão E2E aparece como `skipped`. Isso é bloqueio de
execução; não comprova falha de teste, de build ou de CodeQL no commit atual.

Os oito workflows do SHA `e984c4b11` foram disparados em 22/09 às 11:34 UTC.
Os outros dois resultados mais recentes são `Migration ledger drift` e
`Portal Sicoob`, sobre `f8954f367`. URLs, IDs e anotações estão em `github-ci.json`.

Proteção atual de `main`:

- Uma revisão obrigatória e descarte de aprovação antiga.
- Histórico linear; force-push e exclusão desabilitados.
- **`enforce_admins=false`**: administradores podem contornar a proteção.
- **Nenhum required status check configurado**.
- Nenhum ruleset adicional retornado pela API.

Quatro secrets estão listados no nível do repositório, todos de configuração
pública Supabase. Faltam, nessa lista, as quatro credenciais E2E,
`SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_DB_URL`, que os workflows referenciam.
Não se leem valores criptografados pela API. Secrets herdados/ambientes de
outros serviços não foram certificados. Os jobs conferidos não declaram um
environment que forneça essas credenciais.

**Reconciliação:** restabelecer capacidade do Actions; configurar credenciais
dedicadas de teste/auditoria no escopo correto; executar os checks do mesmo SHA
que será integrado; definir checks obrigatórios e política de exceção para
administradores. A auditoria não alterou orçamento ou regras da conta.

## 9. Documentação e controles contraditórios

- O relatório de 15/09 ainda fala em 503 migrations, 11 tabelas Sicoob ausentes
  e ausência de proteção. É histórico, não deve ser usado como diagnóstico atual.
- O relatório de 17–20/09 e as decisões pendentes ainda mencionam falta de PR
  retroativa; o PR #11 já foi mesclado.
- A allowlist ainda sugere uma migration para `check_rls_enabled/get_enum_values`
  e possível rename de `sicoob_budgets`, hipóteses refutadas em documentos
  posteriores. Também conserva exceções de buckets já renomeados.
- O plano corretivo contém checkboxes não marcados para artefatos que já
  existem, como scripts e documentos. Checkboxes isolados não medem conclusão.
- README e índice de documentação conservam identidade/estatísticas antigas
  de Promo Brindes/Gifts Store; precisam de atualização com fatos verificados.

## 10. Reconciliação priorizada e critérios de fechamento

| Ordem | Ação | Evidência exigida para fechar |
|---|---|---|
| 1 | Reautenticar o MCP do projeto correto e validar a configuração pública | Inventário novo, data/identidade do projeto; GET autenticado válido com chave destinada ao frontend |
| 2 | Preservar, revisar e publicar as edições locais de aprovação/pedido | PR com diff aprovado e testes; árvore de trabalho sem pendências funcionais inadvertidas |
| 3 | Resolver bloqueio de orçamento do Actions e secrets necessários | Jobs realmente executados no SHA auditado, com testes autenticados |
| 4 | Atualizar inventário e comparar ledger nos dois sentidos | Versão, nome, hash/conteúdo, objetos/assinaturas/ACL; exceções históricas classificadas |
| 5 | Cobrir wrappers e revisar os 22 recursos identificados | Scanner reproduz achados conhecidos; todos resolvidos ou explicitamente classificados; inventário atual |
| 6 | Reconciliar 103 funções e dependências com o publicado | Manifestos/hashes local ↔ remoto, configurações e chamadas autenticadas de leitura/contrato |
| 7 | Alinhar tipos, preflight, nomes de buckets e referências | Tipos gerados do ambiente correto; preflight coerente com ADR e contratos ativos |
| 8 | Preservar acervo externo com rastreabilidade | Destino durável para originais/entregas e manifesto verificável; metadados/cache tratados separadamente |
| 9 | Atualizar documentação/planos e endurecer critérios de merge | Documentos datados sem status contraditório; política de checks efetiva |
| 10 | Repetir a auditoria sobre um estado estável | Mesmo SHA, inventário recente, CI real, diferenças justificadas e nenhuma lacuna sem classificação |

**Conclusão:** o histórico Git está publicado, mas o conteúdo local completo
não está reconciliado. Há diferenças verificadas de arquivos e de controles,
além de 83 chamadas a contratos ausentes do inventário histórico. A parte
Supabase ao vivo permanece explicitamente pendente; afirmar que “tudo está no
GitHub e no banco, e vice-versa” excederia as evidências disponíveis.

## 11. Pacote de evidências e reprodução

- [Git no início](git-inicio.json) e [segunda captura](git.json).
- [Tags, stashes e releases](git-refs-adicionais.json).
- [Documentos externos e hashes](arquivos-externos.json).
- [PRs](github-prs.json), [proteção](github-protecao.json),
  [CI e anotações](github-ci.json), [nomes dos secrets](github-secrets-nomes.json).
- [Sondas de acesso](acesso-banco.json).
- [Migrations e hashes](migrations.json), [tipos versus cache](tipos-versus-cache.json).
- [Scanner existente](referencias-runtime.json), [AST dos wrappers](referencias-wrappers.json),
  [lista consolidada com arquivo/linha](referencias-consolidadas.json).
- [Manifesto local de Edge Functions](edge-local.json).
- [Coletor local/GitHub](coletar.py), [análise AST](auditar-wrappers.cjs),
  [sondas GET](verificar-acesso.py), [SQL remoto pendente](inventario-remoto-pendente.sql).
- [Validação interna do pacote](validar-evidencias.py) e
  [checksums das evidências](SHA256SUMS).

Os coletores são específicos deste workspace e não fazem instalação de
dependências. A análise AST utiliza o TypeScript já instalado no checkout
principal. A execução normal dos scripts escreve apenas estas evidências
locais. O SQL preparado não foi contado como teste aprovado. Este pacote é um
novo artefato local da auditoria, não foi enviado ao GitHub nesta rodada.

Validação do pacote executada com `python3
docs/execucao/auditoria-20260922/validar-evidencias.py`: aprovada para contagens,
hashes dos arquivos locais inventariados, localização das chamadas, links
internos e ausência de padrões reconhecíveis de credenciais nas evidências.
Essa verificação não executa a aplicação nem substitui a consulta ao banco.
