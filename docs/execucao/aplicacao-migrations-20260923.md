# Aplicação das três migrations de operações internas

Ambiente de construção: projeto `cfmzkthhgliqelozlmwu`.
Fonte SQL: `main`, commit `d389b4be7`. Aplicação em 23/09/2026.

## Resultado

| Versão | Alteração | Estado remoto |
| --- | --- | --- |
| `20260923110000` | RPCs administrativas, configurações e bucket legado | Aplicada |
| `20260923111000` | Despacho autenticado e cron de exportações | Aplicada |
| `20260923112000` | Sincronização de conexões, favoritos e search_path | Aplicada |

Cada arquivo foi aplicado em uma transação própria, com trava consultiva,
checagem de versão ausente, validação de estado e inserção no ledger antes do
commit. O conteúdo registrado foi comparado integralmente com o arquivo da
`main`; os hashes SHA-256 estão nas evidências. O ledger passou de 63 para 66
versões. O histórico antigo não foi reaplicado nem declarado reconciliado.

## Validação

- As cinco Edge Functions do lote recusaram chamadas anônimas com HTTP 401 antes da aplicação.
- As três migrations foram simuladas juntas e revertidas; o marcador explícito da simulação confirmou zero versões novas persistidas.
- Sete assinaturas administrativas ficaram sem EXECUTE para `anon`/`authenticated`, mantendo acesso por `service_role`.
- A RPC de favoritos mantém acesso autenticado, recusa acesso ao favorito de outro ator e retorna a mesma lista em chamadas repetidas. O teste com identidade autenticada foi revertido.
- `system_settings` passou a ter duas políticas baseadas no helper de supervisor.
- As seis políticas do bucket legado `order-documents` foram removidas; ele continua privado. O bucket estava vazio.
- As políticas de `sicoob-order-documents` foram comparadas antes e depois e permaneceram idênticas.
- O histórico de sincronização usa a política de supervisor.
- O job `process-export-queue` está ativo, uma vez por minuto, chamando a função de despacho que consulta o Vault.
- Um despacho real pelo banco recebeu HTTP 200 da Edge Function, sem timeout ou erro, com `processed: 0`.
- O cron registrou execução automática `succeeded` às 19:19 UTC de 23/09/2026.

## Limites da comprovação

A fila de exportações estava vazia. O teste confirma autenticação e comunicação
entre PostgreSQL e Edge Function; não comprova a geração nem o download de
arquivos. Os testes de favoritos comprovam isolamento e idempotência sequencial,
sem substituir uma simulação de concorrência com múltiplas conexões.

O token do CLI retornou 403 para SQL pela Management API nesta execução. As
migrations foram aplicadas pelo MCP administrativo do mesmo projeto, cujo acesso
ao banco foi confirmado antes de qualquer mudança.

## Evidências

Arquivos sem valores de segredos em
[`../evidencias/aplicacao-migrations-20260923/`](../evidencias/aplicacao-migrations-20260923/):
precondições, simulação revertida, confirmações individuais de aplicação,
estado final, validação de permissões/favoritos e resposta HTTP do worker.
