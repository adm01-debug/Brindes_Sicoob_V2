# Validação integrada — 18/10/2026

## Escopo

Validação das correções de banco, Realtime, Storage, views administrativas,
notificações e transferência de sugestões do BI. O banco canônico não foi
alterado durante esta validação.

## Correções verificadas

1. O gate de referências de runtime compara o inventário remoto com o ledger
   de migrations autorizadas. Ele projeta apenas objetos das migrations ainda
   pendentes, com SHA-256 validado; RPCs históricas ausentes do snapshot não
   são mais aceitas por engano.
2. `notify_hardening_regression()` percorre as doze tabelas publicadas no
   Realtime, detecta ausência de publicação/RLS/policy SELECT e retorna
   `ok=false` quando há regressão.
3. As views `sicoob_budget_audit`, `telemetry_query_performance`,
   `v_full_scope_grants` e `v_sicoob_hierarchy` recebem `security_invoker=on`
   e ACL somente de leitura para `authenticated` e `service_role`.
4. A criação direta em `notifications` passou a exigir que `user_id` seja o
   usuário autenticado; criação para terceiros é negada.
5. O modal de sugestões do BI não usa mais uma estimativa com quantidades
   inventadas e diferencia corretamente linhas de sugestões repetidas.

## Evidências executadas

| Verificação | Resultado |
| --- | --- |
| Vitest completo | 6.247 aprovados, 67 ignorados, 540 arquivos aprovados |
| TypeScript | 0 diagnósticos |
| Build Vite | aprovado (6.233 módulos) |
| Simulação Storage/ACL | 21 cenários aprovados |
| Simulação Realtime | publicação seletiva, reaplicação e regressão de RLS aprovadas |
| Simulação de views/notificações | `security_invoker`, RLS e bloqueio de destinatário alheio aprovados |
| Gate de referências | 1.076 referências, 0 quebradas fora da allowlist |
| Imutabilidade de migrations | aprovada |

## Estado remoto observado

O ledger remoto continha 38 migrations autorizadas aplicadas. Permanecem
pendentes para a próxima implantação atômica:

- `20261016180000_harden_storage_and_public_favorites_acl`
- `20261016190000_enable_scoped_business_realtime`
- `20261016193000_pin_custom_kit_atomically`
- `20261016201500_restore_view_invoker_and_notification_scope`

O lint geral ainda possui 871 avisos históricos de tamanho/complexidade. Após
as correções deste lote, os arquivos alterados não têm erros de lint.
