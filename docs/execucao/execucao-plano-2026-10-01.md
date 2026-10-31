# Execução do plano em 1 de outubro de 2026

Esta evidência atualiza a revisão do mesmo dia. O sistema continua em construção; os resultados abaixo comprovam o candidato e o banco canônico consultado, sem declarar operação real ou conclusão do piloto.

## Candidato consolidado

- Branch isolada: `fix/hermes-h860798-execucao-plano-100`.
- PR: [#87](https://github.com/adm01-debug/Brindes_Sicoob_V2/pull/87).
- O PR #75 foi reconciliado com a `main` e com o plano de 100 etapas.
- A falha de autorização em retry de status idêntico foi corrigida: a verificação de escopo ocorre antes do retorno idempotente.
- O `EXECUTE` das funções internas `assert_quote_transition` e `notify_singular_quote_submission` foi removido de `PUBLIC`, `anon` e `authenticated`.
- A colisão de canais Realtime que derrubava `/orcamentos/kanban` foi reproduzida a partir do artefato E2E do PR #86 e corrigida com canal exclusivo por montagem e callbacks mantidos por referência.

## Validações locais do mesmo candidato

| Gate | Resultado |
|---|---|
| Vitest | 404 arquivos aprovados, oito ignorados; 5.588 testes aprovados e 112 ignorados. |
| Realtime dirigido | Dois cenários aprovados: callback mutável não reassina; consumidores simultâneos recebem canais distintos. |
| Smoke da página inicial | Cinco repetições consecutivas aprovadas após um timeout isolado no pre-push. |
| Cenários Node | 202 cenários anteriores mais quatro cenários novos do auditor RLS aprovados. |
| PostgreSQL | Simulação em PostgreSQL 17 aprovada, inclusive tentativa de retry por ator de outra Singular e ACL da função interna. |
| Idempotência | Sete cenários aprovados em banco descartável. |
| TypeScript | 153 diagnósticos conhecidos contra baseline 153; nenhuma regressão. |
| ESLint diferencial | Nenhuma regressão; 16 erros removidos nos arquivos alterados. |
| Build | Build de produção aprovado. |
| Dependências | `npm audit` e gate do repositório com zero vulnerabilidades. |
| Migrations | Hashes allowlisted válidos e nenhuma migration já presente na `main` foi alterada. |

## Consulta administrativa do Supabase canônico

Consulta somente leitura realizada pela Management API oficial no projeto `cfmzkthhgliqelozlmwu`:

- projeto `Brindes_Sicoob_V2`, região `us-east-1`, estado `ACTIVE_HEALTHY`;
- PostgreSQL `17.6`;
- ledger com 97 registros e versão mais recente `20260927221500`;
- as migrations `20260928162048`, `20260928173500` e `20260928182000` ainda não constavam no ledger;
- `quotes`, `quote_history`, `workspace_notifications` e `profiles` existem;
- `quote_save_idempotency` ainda não existe;
- as funções `save_quote_atomic`, `bulk_update_quote_status_atomic`, `assert_quote_transition` e `can_manage_quote_scope` existem;
- extensão `pgcrypto` e `extensions.digest(text,text)` existem;
- nenhuma coluna exigida pelas três migrations está ausente;
- o enum `quote_status` contém todos os valores usados pelo novo contrato.

O banco não possui as relações locais legadas `categories`, `products` e `suppliers`. `quotes` está com RLS habilitado e cinco policies restritas a `authenticated`; não existe policy `Allow all`. Portanto, a migration proposta no PR #83 não corresponde ao banco canônico e tentaria remover policies de relações inexistentes. Ela não deve ser aplicada.

Resumo estruturado: [supabase-canonico-resumo.json](evidencias/supabase-canonico-resumo-20261001.json).

## Estado operacional

As migrations passaram no preflight remoto e nas simulações locais, mas a aplicação continua condicionada à integração do mesmo SHA em `main`, conforme o gate do repositório. O workflow de drift foi acionado, porém permaneceu enfileirado porque o runner auto-hospedado estava indisponível. A consulta pela Management API substituiu a incerteza sobre o estado do banco, mas não substitui CI nem o gate de integração.

Pesquisa com compradores, aceite formal de marca, piloto com duas cooperativas e observação por 30 dias dependem de pessoas e tempo real. Esses marcos não podem ser simulados nem marcados como concluídos por código.
