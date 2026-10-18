# Execução e validação do lote de segurança e concorrência — 18/10/2026

## Resultado

Este lote implementa correções verificáveis identificadas na auditoria do plano: isolamento dos relatórios agendados por proprietário, controle otimista de concorrência nos kits, sincronização monotônica de notificações entre abas, preservação do orçamento durante carregamento de sugestões BI, tratamento de falhas nos filtros de catálogo, remoção de uma projeção sazonal sem base cronológica, hardening dos endpoints públicos de saúde/compartilhamento e restrição de ACLs no log de bloqueios e na view de uso de taxonomia.

O lote não conclui o plano integral de 100 etapas. A ingestão de documentos ainda depende de scanner antimalware real e credenciais dedicadas; a publicação Realtime e os fluxos autenticados continuam pendentes de homologação conectada. Não há evidência para declarar o produto pronto para produção.

## Alterações e evidências

| Frente | Implementação | Verificação |
|---|---|---|
| Relatórios agendados | Queries de orçamento e pedidos agora filtram `seller_id` pelo `user_id` dono do relatório; IDs ausentes e erros de consulta falham explicitamente. | Testes unitários de escopo e `deno check` passaram. |
| Kits | Salvamentos comparam `updated_at`; gravação concorrente retorna conflito em vez de sobrescrever outra aba. A nova versão retornada pelo banco passa a ser a base do próximo salvamento. | 20 testes focados passaram; sem mudança de schema. |
| Notificações | Atualizações de leitura são limitadas ao usuário e a linhas ainda não lidas; `BroadcastChannel` propaga confirmações e consultas antigas preservam leituras confirmadas. | Testes focados de notificações passaram. |
| BI e catálogo | A carga de sugestões não substitui campos que o usuário já editou; falhas relacionais mantêm resultados anteriores e mostram erro; a previsão sazonal deixa de aplicar regressão a agregados mensais sem série temporal. | 21 testes focados passaram; ESLint sem erros nos arquivos tocados. |
| Edge | `health-check` expõe apenas liveness; `bi-share-dossier` exige `BI_SHARE_SECRET` e não usa a chave de serviço como fallback nem devolve detalhes internos. | 3 testes de contrato, `deno check` e cenários de segurança passaram. |
| ACL de banco | Nova migration restringe INSERT de `access_blocked_log` a `service_role` e remove DML de `catalog_marketing_term_usage`, preservando leitura autorizada. | Simulação Supabase PostgreSQL 17 passou em 13 cenários; cenário Node passou em 3 testes. Nenhuma escrita no banco canônico. |

## Validação integrada

- Vitest completo: **6.260 aprovados, 67 ignorados; 542 arquivos aprovados e 4 ignorados**.
- Typecheck: **0 erros e nenhuma regressão** sobre baseline.
- ESLint baseline: **0 erros globais e nenhuma regressão** nos 220 arquivos de aplicação examinados.
- Contratos Node: **32/32 aprovados**.
- Imutabilidade das migrations: aprovada.
- `check-runtime-refs`: 0 referências quebradas fora da allowlist; três objetos previstos continuam ausentes do snapshot remoto por dependerem das migrations pendentes já autorizadas.
- Build Vite concluiu duas vezes após transformar 6.233 módulos; o segundo build carregou a configuração local e não acusou variáveis Vite ausentes. Permaneceram avisos de divisão de chunks já existentes.
- `apply-sicoob-migrations.mjs --check` não executou nesta worktree porque `SUPABASE_DB_URL` não está no ambiente. A leitura anterior do banco canônico indicava quatro migrations autorizadas pendentes; com esta migration nova, são cinco pendências esperadas, sujeitas a rechecagem após integração. Nenhuma migration foi aplicada remotamente.
- A jornada E2E autenticada continua sem certificação: faltam credenciais de persona de teste nesta execução.

## Coordenação

Cinco frentes especializadas cobriram relatórios/Edge, BI e catálogo, kits e notificações, ACL/migration e auditoria de segurança. O merge continua condicionado aos checks obrigatórios do GitHub. Na última leitura, a PR #119 estava bloqueada por falhas dos checks do Actions e revisão requerida; o preview da Vercel estava aprovado. Não se deve contornar os gates nem aplicar as migrations canônicas antes da integração aprovada.
