# Retomada da auditoria com acesso real à API — 22/09/2026

**Parecer: o acesso a dados foi restabelecido e as divergências abaixo foram
verificadas no projeto real. A equivalência integral local ↔ GitHub ↔ banco
ainda não está demonstrada.** O ledger, as definições SQL completas e o código
publicado das Edge Functions continuam fora do alcance da API de dados usada.

Este relatório atualiza a auditoria anterior de 22/09. O ambiente é de
construção. Não houve deploy, mudança de permissões, aplicação de migration,
upload ou alteração de dados de negócio. As credenciais recebidas foram usadas
em memória, sem inclusão no repositório ou nos arquivos de evidência.

## 1. Acesso e recorte temporal

- Projeto: `cfmzkthhgliqelozlmwu`, confirmado pelo host de todas as requisições.
- A chave secreta fornecida foi aceita para API de dados, Auth administrativo
  e Storage. A chave pública foi aceita para consultas de dados e Auth.
- O endpoint OpenAPI exige chave secreta: HTTP 401 com chave pública nesse
  endpoint **não significa que a chave pública seja inválida**.
- As duas chaves legadas de `.env.production` também retornaram HTTP 200 em
  `profiles?select=id&limit=0` nesta retomada. O diagnóstico de acesso recusado
  da captura anterior não deve ser reutilizado como estado atual. Não se
  determinou a causa da mudança de comportamento.
- O endpoint JWKS respondeu HTTP 200; isso confirma disponibilidade da chave
  pública de verificação, sem comprovar todos os fluxos de login.
- Snapshot de código analisado: `a9a22c589582312ee81ea5524058b779e2373142`.
  O checkout principal continuou avançando durante a auditoria.
- Às **10:59:52 BRT**, `main` local e GitHub coincidiam em
  `836896f62df1e089989c7f94519cc4c717bf844a`. As datas de cada coleta estão
  nos JSONs. As consultas não formam uma única transação consistente.

As chaves de aplicação autorizam serviços de dados; o JWKS serve à verificação
de assinaturas. Não equivalem a uma sessão administrativa de gerenciamento.
Referência: [documentação oficial de chaves Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

## 2. O que foi efetivamente conferido

| Verificação | Resultado observado |
|---|---|
| Contrato OpenAPI administrativo | 202 relações e 167 nomes de RPC |
| Contagem sem baixar registros | 201 relações consultadas com sucesso; uma view bloqueada por permissão |
| API anônima, somente HEAD | 202 relações verificadas; linhas visíveis apenas em `cms_banners` (3) e `sicoob_temas` (4) |
| Storage | 13 buckets listados; todos vazios |
| Auth ↔ perfis | 5 usuários e 5 perfis; nenhuma ausência ou referência órfã entre os conjuntos |
| Papéis de usuários | 4 atribuições distribuídas entre 3 usuários; 2 usuários sem linha em `user_roles` |
| Estado RLS de tabelas comuns | 215 tabelas retornadas por `check_tables_rls`, todas com RLS habilitado |
| Matriz de políticas | 476 combinações tabela/operação retornadas pela RPC de auditoria |
| Auditoria de permissões de funções | 391 apontamentos, correspondentes a 186 assinaturas distintas |
| Código ↔ API atual | 83 referências estáticas a 22 recursos não encontrados no contrato exposto |

HTTP 206 nas contagens representa sucesso com faixa parcial, não falha.
Os números de relações e funções são da API exposta, não uma contagem completa
dos catálogos PostgreSQL. As 18 partições de auditoria presentes no inventário
antigo não aparecem como endpoints independentes; isso não prova exclusão.

## 3. Código e banco: divergências confirmadas

### 3.1 Recursos usados pelo código e indisponíveis na API

As seguintes **18 tabelas** responderam HTTP 404 com `PGRST205` ao tentar
seleção vazia, sem ler dados pessoais:

`bitrix_clients`, `bitrix_deals`, `bitrix_sync_logs`, `color_nuances`,
`companies`, `error_logs`, `personalization_simulations`,
`personalization_techniques`, `product_component_location_techniques`,
`product_group_components`, `product_group_location_techniques`,
`product_group_locations`, `products`, `roles`, `sales_goals`,
`sicoob_budgets`, `user_2fa_settings`, `user_passkeys`.

Os quatro nomes de RPC **`create_quote_version_atomic`, `check_rls_enabled`,
`get_enum_values` e `set_config`** não constam no OpenAPI administrativo.
Não foram chamadas funções de alteração de negócio para testar sua ausência.
A conclusão é indisponibilidade no contrato examinado; não se certifica que
os nomes inexistam em todos os schemas ou sob outros papéis.

O scanner existente voltou a terminar com código 1. A análise complementar
pela AST resolveu 73 chamadas de `untypedFrom`, 50 delas a relações não
expostas. A consolidação mantém **83 chamadas a 22 recursos**; arquivo e linha
estão em `referencias-versus-api.json`. Parte dos fluxos pode ser legada ou
sem consumidor atual: não são 83 falhas de usuário reproduzidas.

`quoteVersionService.ts` usa `create_quote_version_atomic`, de modo que a
mera existência das migrations locais não fecha o contrato do versionamento.
`product-webhook` continua sendo referência interna a `products`; não deve
ser redirecionado para escrever no catálogo externo autorizado apenas para
consulta. O catálogo `doufsxqlfjyuvxuezpln` não foi acessado com estas chaves.

### 3.2 Tipos locais incompletos

A comparação pela AST, sobre os tipos gerados do snapshot, encontrou:

- **8 relações expostas sem tipos locais:** `audit_log`,
  `notification_templates`, `password_reset_requests`,
  `sicoob_kit_quote_requests`, `sicoob_order_shipments`,
  `sicoob_reorder_requests`, `webhook_configs`, `webhook_logs`.
- **4 colunas reais sem declaração local:** `profiles.singular_id`,
  `profiles.carteira_id`, `quote_item_personalizations.catalog_checked_at` e
  `sicoob_orders.order_number`.
- **17 nomes de RPC expostos sem tipos locais**, incluindo operações de kit,
  logística, políticas de aprovação e verificações de autorização Sicoob.
- **1 assinatura com argumento omitido:**
  `reorder_sicoob_order_as_quote` recebe `p_request_hash` na API, mas o tipo
  local não declara esse argumento.
- 13 relações aparecem somente nos tipos: nove são partições de auditoria
  não expostas; as outras quatro são `admin_audit_log_archive`,
  `admin_audit_log_old`, `personalization_simulations`, `sales_goals`.

A AST reconhece 150 nomes de funções nos tipos; a contagem textual de 149 do
relatório anterior subestimava essa estrutura. Esta comparação examina nomes
de colunas/argumentos, não certifica tipos SQL, nulabilidade ou todos os overloads.

**Fechamento:** regenerar os tipos do schema correto, revisar consumidores e
reduzir os desvios escondidos por casts/wrappers; repetir a checagem de contrato.

## 4. Falhas reais nos controles de auditoria

### 4.1 View exposta, porém sem leitura funcional

`v_full_scope_grants` falhou com HTTP 403, SQLSTATE `42501`,
`permission denied for table users`, mesmo na consulta de servidor.
O SQL local da view acessa `auth.users` e usa `security_invoker`.
Também faz join de `step_up_audit_log.user_id` com `profiles.id`, enquanto
`profiles.user_id` é a referência a Auth. Esse join local deve ser revisto.

**Fechamento:** definir o contrato de leitura administrativa sem conceder
acesso genérico a `auth.users`; conferir o vínculo de perfil e provar a leitura
com as permissões corretas. O corpo SQL remoto completo ainda não foi obtido.

### 4.2 Matriz Sicoob executável anonimamente e com erro SQL

Uma chamada GET usando apenas a chave pública para
`check_sicoob_access_matrix(_test_role=admin)` entrou na função e terminou com
SQLSTATE `42883`: `operator does not exist: name[] @> text[]`.
É erro interno de operador SQL, não um `PGRST202` de função inexistente.

A migration local `20260502151143_05456950-0a02-4d21-a024-95dab632aced.sql`
revoga a execução de `PUBLIC`, `anon` e `authenticated`. A auditoria de ACL
remota, entretanto, lista `PUBLIC` e `anon`, coerentemente com a sonda.
Há, portanto, divergência entre a restrição declarada nesse arquivo e o
comportamento atual; o ledger é necessário para reconstruir sua causa.

O SQL local combina arrays `name[]` e literais inferidos como `text[]`;
o cálculo `can_select` também não filtra `cmd` por `SELECT/ALL`.
Corrigir somente o cast não tornaria a matriz uma prova de autorização.

### 4.3 Limites e falsos positivos dos verificadores

`audit_rls_matrix` retornou quatro alertas críticos para `admin_audit_log`.
A consulta local considera `pg_class.relkind = 'r'` ao buscar a flag RLS,
deixando de fora a tabela pai particionada (`relkind = 'p'`). Os alertas
**não comprovam RLS desativado na tabela pai**. É necessário consultar seu
estado diretamente e corrigir a cobertura do verificador.

`audit_rls_coverage` apontou 55 tabelas com operações sem policy: duas com
severidade `high` (`access_blocked_log`, `webhook_configs`) e 53 `medium`.
Ausência de policy geralmente bloqueia a operação para os papéis afetados;
logs somente de inserção ou tabelas exclusivas de servidor podem ter essa
configuração deliberadamente. Não adicionar políticas amplas para zerar a lista.

## 5. Permissões de execução e isolamento

O RPC `audit_security_definer_acl` retornou:

| Regra do verificador | Ocorrências |
|---|---:|
| Execução concedida a `PUBLIC` | 147 |
| Execução por `anon`, fora da whitelist da função | 184 |
| Função de trigger executável por `authenticated` | 60 |
| Total | 391 |

São **186 assinaturas distintas**, não 391 funções nem 391 explorações
demonstradas. Algumas funções podem precisar de acesso público e validar a
identidade internamente; a whitelist atual só contempla dois nomes. O gate
local `check-security-definer-acl.mjs` considera qualquer linha uma falha;
esses dados não satisfazem seu critério de zero ocorrências.

As sondas anônimas de leitura de `get_sicoob_reorder_idempotency` e
`get_sicoob_kit_quote_idempotency` foram negadas com SQLSTATE `42501`, como
prevê o hardening local. Essas duas funções não aparecem na lista de ACLs
criticadas. A auditoria não fez chamadas anônimas de alteração de pedidos.

Nos 202 HEADs anônimos, somente banners (3) e temas (4) retornaram contagens
positivas. As outras relações negaram acesso ou devolveram zero linhas.
Isso não comprova o isolamento entre dois usuários/cooperativas autenticados,
nem a segurança de tabelas atualmente vazias. Testes de escrita ficaram fora
desta rodada de leitura.

## 6. Dados, Storage e documentos externos

Existem cinco usuários de Auth e cinco perfis correspondentes. Não foram
encontrados perfis sem usuário nem usuários sem perfil. Quatro atribuições de
papel abrangem três usuários; dois usuários não têm linha em `user_roles`.
É necessário classificar essas contas antes de alterar permissões.
IDs e emails foram comparados somente em memória; as evidências guardam totais.

`quotes`, `sicoob_orders` e as tabelas operacionais Sicoob consultadas estão
vazias, ressalvados os cadastros auxiliares listados na evidência de contagens.
Fluxos como aprovação, logística, financeiro, arte, kits e recompra não ficam
validados por contar tabelas vazias. Eles ainda precisam de cenários autenticados
com dados de construção e limpeza controlada.

Os 13 buckets foram listados com paginação e travessia de pastas: **zero objetos**.
Os 13 documentos originais fornecidos, portanto, não estão nesses buckets.
`personalization-images-secondary`, `qa-evidences` e `avatars` são públicos;
os outros dez são privados. Buckets vazios não validam upload, permissões de
download ou integridade de anexos.

Não existe base local de linhas transacionais identificada como fonte canônica
para comparação registro a registro. O código e os documentos não devem ser
copiados indistintamente para tabelas de negócio; é necessário definir destino,
formato e manifesto de preservação para cada conjunto de arquivos.

## 7. GitHub e alterações desde o primeiro relatório

O lote de correções de aprovações/pedidos que estava somente no working tree
foi publicado por outro trabalho em andamento, incluindo o commit
`47a5e9be7`. O diagnóstico anterior de 11 arquivos pendentes ficou superado.
Na captura desta retomada, restavam três ocorrências preexistentes de arquivos
modificados: `.temp/cli-latest` no principal e `.gitignore`/`.temp/cli-latest`
no worktree antigo. As duas branches locais de auditoria são artefatos novos,
deliberadamente não publicados nesta rodada.

O snapshot auditado precede `836896f62` por um commit, que altera seis arquivos
de carteira, progresso, serviço de verba e documentação. Esse diff foi lido;
não altera o arquivo de tipos, migrations ou lista dos 22 recursos auditados.
Não foi alegado teste funcional de todas as alterações concorrentes.

As 495 migrations ativas e 20 arquivadas mantêm os mesmos hashes da primeira
auditoria. O manifesto desta rodada também registra 167 arquivos dentro de
`supabase/functions`, incluindo testes e arquivos compartilhados. Seus hashes
são locais; não equivalem ao código efetivamente publicado no Supabase.

O bloqueio de orçamento do Actions, as regras de branch e o inventário de
documentos externos permanecem evidências da primeira captura. Não foram
reconsultados nesta retomada nem assumidos como invariáveis.

## 8. O que ainda depende de acesso administrativo

As tentativas de selecionar os schemas `supabase_migrations`, `pg_catalog`,
`information_schema` e `storage` via Data API retornaram HTTP 406,
`PGRST106: Invalid schema`. Não foram criadas RPCs para contornar essa limitação,
nem ampliada a exposição de schemas.

Para concluir a auditoria integral, ainda faltam:

1. Ledger atual com versões, nomes e SQL/hashes, cruzado nos dois sentidos
   com as 515 migrations locais.
2. Definições completas e atuais de funções, views, constraints, triggers,
   permissões, policies fora da matriz disponível e estado da tabela pai
   particionada; leitura dos jobs de cron relevantes.
3. Lista e código efetivamente publicados das Edge Functions, dependências,
   configuração de JWT e nomes de secrets, sem exportar seus valores.
4. Estado do catálogo externo e da integração de leitura, com credenciais
   próprias desse projeto.
5. Cenários autenticados e evidências de CI no SHA que será integrado.

Uma sessão MCP administrativa reconectada ao projeto correto, ou uma conexão
PostgreSQL apropriada com consultas somente de leitura, resolve a lacuna de
metadados. Nenhuma dessas credenciais deve ser colocada no frontend.

## 9. Ordem de reconciliação

| Prioridade | Ação | Critério de fechamento |
|---|---|---|
| 1 | Corrigir os controles que hoje falham e revisar a exposição da matriz Sicoob | View legível pelo papel certo; RPC sem erro de arrays; chamadas anônimas negadas quando exigido |
| 2 | Classificar as 391 ocorrências de ACL | Intenção documentada por assinatura; grants e guards compatíveis; gate com critérios confiáveis |
| 3 | Obter metadados administrativos e comparar migrations/funções publicadas | Diferenças de conteúdo e de implantação identificadas, com evidência atual |
| 4 | Reconciliar os 22 contratos não encontrados e os tipos gerados | Recursos corretos e consumidores ativos comprovados; sem criar tabelas legadas por tentativa |
| 5 | Validar usuários, fluxo completo Sicoob e anexos | Cenários autenticados entre cooperativas; evidências de resultados e isolamento |
| 6 | Preservar documentos e fechar Git/CI em um SHA estável | Destinos e hashes rastreáveis, checks executados e artefatos de auditoria publicados quando autorizado |

## 10. Evidências

- [Acesso, datas e contrato atual](acesso-atual.json), [OpenAPI](openapi-servidor.json),
  [revalidação da configuração pública anterior](configuracao-publica-antiga.json).
- [Contagens administrativas](contagens-api.json), [contagens anônimas](leitura-anonima.json),
  [integridade de usuários](integridade-usuarios.json).
- [Buckets](buckets.json), [objetos de Storage](objetos-storage.json).
- [Resultados de RLS e ACL](controles-rls.json), [sondas anônimas de RPC](acl-anonima.json),
  [recursos ausentes e erro da view](recursos-verificados.json).
- [Tipos versus API](tipos-versus-api.json), [referências com arquivo/linha](referencias-versus-api.json).
- [Git na retomada](git-retomada.json), [hashes dos contratos locais](manifesto-contratos-locais.json).
- Coletores: [API](consultar-api.py), [controles](consultar-controles.py),
  [ACL anônima](consultar-acl-anonima.py), [leitura anônima](consultar-leitura-anonima.py),
  [tipos](comparar-tipos.cjs), [wrappers](auditar-wrappers.cjs), [consolidação](consolidar.py).
- [Validação de consistência](validar-evidencias.py) e [hashes do pacote](SHA256SUMS).

Os coletores recebem credenciais pelo stdin, sem salvá-las. As requisições são
GET/HEAD, exceto o POST do endpoint de **listagem** de Storage, que não altera
objetos. Os arquivos de metadados não contêm registros pessoais exportados.

**Conclusão:** o bloqueio total de acesso ao banco foi superado. Existem agora
evidências atuais de contratos, permissões, usuários e Storage, com falhas reais
e limites delimitados. Ainda não é correto declarar paridade integral ou
liberação de deploy antes de reconciliar os pontos acima.
