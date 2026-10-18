# Relatório curado — PR #105 versus estado de 16/10/2026

## Conclusão

A PR #105 não deve ser mesclada como está. Ela auditou a base `fff0b4cb6`, enquanto o estado reconciliado usa `495f33da1759a7c6e479259419186c5f7076ca5a`. A comparação é divergente; a API de comparação atingiu seu limite de 300 arquivos e a PR mantém 38 threads de revisão não resolvidas. Seu pacote adiciona 89 arquivos e 327.445 linhas, com snapshots temporais, caches, cópias SQL, scripts presos ao ambiente do operador e referências que já foram superadas pelas correções posteriores.

A curadoria preserva o valor analítico da PR em cinco artefatos pequenos, atualiza os P0 conforme o código e o banco canônico e elimina dados não portáveis. Nenhuma evidência histórica foi promovida a prova atual sem revalidação.

## Método

- metadados, arquivos e threads da PR #105 foram lidos pelas APIs do GitHub; cabeça `77cb30af95c0f93a806d06c3d6577b5e77c291f9`;
- o código vigente foi lido no SHA funcional `495f33da1759a7c6e479259419186c5f7076ca5a` e no complemento do worker `0e1fc9ebad2d638a4198de354a3604d278ce6ec8`;
- ledger, publicação Realtime, cron e existência de objetos foram consultados no banco canônico em modo somente leitura;
- a lista de nomes de Edge secrets foi consultada sem revelar valores;
- caminhos de evidência foram aceitos somente quando existentes no SHA vigente.

## Evidência atual

| Frente | Estado | Evidência decisiva |
|---|---|---|
| G01 | Implementado em construção | `20261013115605` aplicada; 34/34 asserções de autoridade de verbas |
| G02 | Implementado em construção | `20261013120512` aplicada; 31/31 cenários de conversão |
| G03 | Implementado em construção | mesma migration aplicada; 68/68 cenários de aprovação/rollback |
| G04 | Implementado em construção | `20261013120512` e `20261013123000` aplicadas; conteúdo congelado e salvamento sob RLS |
| G05 | Implementado em construção | `verify-email` ACTIVE v8, `verify_jwt=true`, handler inerte para UUID |
| **G06** | **ABERTO P0** | schema e buckets privados existem; zero segredo com os nomes do scanner real; falha fechada sem configuração |
| G07 | Aberto | `supabase_realtime` com zero tabelas e `puballtables=false` |
| G08 | Implementado em construção | `20261015102000` aplicada; ledger, índice parcial e correlação pelo disparo recente validados |
| G39 | Parcial | 6.122 Vitest e 11/11 Playwright focal aprovados; 27 skips críticos permanecem |
| G47 | Aberto | minimização técnica entregue; decisão DPO/jurídica pendente |

As migrations `20261016160000`, `20261016163000`, `20261016170000`, `20261016171500`, `20261016172000` e `20261016173000` também constam no ledger canônico. Elas sustentam validação de telemetria, quotas de IA, compartilhamento público mínimo de favoritos e remoção de policy redundante.

## G06 — bloqueio crítico preservado

O fluxo implementado recebe bytes em bucket privado de quarentena, valida assinatura/MIME, calcula SHA-256, exige veredito limpo, promove ao bucket final e registra a evidência por RPC restrita a `service_role`. A ausência de URL/token do scanner produz 503, comportamento seguro.

O P0 continua aberto porque:

1. não há credenciais do scanner real com os nomes consumidos pelo handler;
2. não há smoke conectado de malware, timeout e veredito inconclusivo;
3. o upload de arte precisa usar o mesmo contrato de quarentena e hash;
4. ainda falta provar compensação quando Storage, scanner ou registro falham em pontos diferentes.

A onda de serviços não pode ficar atrás da evolução comercial: G06 entra no primeiro lote bloqueador junto com a estabilização da jornada autenticada.

## O que foi descartado da PR #105

- dumps de schema, policies, funções, cron, GitHub e HTTP, pois envelhecem e podem conter caminhos internos;
- `marcadores-documentacao.json` e inventários gigantes, por ruído e custo de revisão;
- cópias de SQL extraídas do banco, porque migrations versionadas são a fonte de verdade;
- scripts de reprodução com caminhos absolutos, importação de `/tmp`, cleanup inseguro e resultados potencialmente falsos;
- consulta HTML com filtro de prioridade inconsistente;
- hashes e manifests de artefatos que discordavam entre si;
- nomes de usuário, worktrees e diretórios pessoais;
- valores de segredo, tokens e snapshots de credenciais.

## Qualidade do conjunto curado

- 56 frentes preservadas com estado e base explícitos;
- 100 etapas preservadas, cada uma com prioridade, frente, falta e critério de aceite;
- referências internas limitadas a arquivos existentes no SHA atual;
- JSON validado por parser;
- varredura negativa para caminhos pessoais e padrões usuais de segredo;
- nenhuma afirmação de produção: o ambiente permanece em construção.

## Distribuição dos estados

### Frentes

- `ABERTO_DECISAO_PRIVACIDADE`: 1
- `ABERTO_DEPENDENCIA_EXTERNA`: 1
- `ABERTO_P0_CONFIGURACAO_AUSENTE`: 1
- `ABERTO_PENDENTE_REVALIDACAO`: 40
- `ABERTO_PROVEDOR_NAO_HOMOLOGADO`: 1
- `ABERTO_RECONCILIACAO_GITHUB`: 1
- `ABERTO_SEM_PUBLICACAO_REALTIME`: 1
- `IMPLEMENTADO_EM_CONSTRUCAO`: 7
- `PARCIAL_BASELINE_CONTROLADA`: 1
- `PARCIAL_CURADORIA_NECESSARIA`: 1
- `PARCIAL_REGRESSAO_VERDE_COM_SKIPS`: 1

### Etapas

- `BLOQUEADA_EXTERNA`: 8
- `BLOQUEADA_P0`: 4
- `IMPLEMENTADO_EM_CONSTRUCAO`: 4
- `NAO_INICIADA`: 18
- `PARCIAL`: 66
