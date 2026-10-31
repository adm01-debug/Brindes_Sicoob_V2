# Estratégia para 5 migrations só no remoto

Data de referência: 26 de agosto de 2026.

## Escopo

Os cinco registros abaixo existem como efeito operacional no ambiente remoto, mas não devem ser “recriados retroativamente” no repositório com o mesmo histórico:

- `20260826010000_restaurar_exec_sql_wrapper_e03`
- `20260826020000_fix_cron_source_check_e23_e24`
- `20260826030000_add_colunas_ausentes_e30`
- `20260826040000_fechar_policies_abertas_e06_e08`
- `20260826050000_revoke_execute_authenticated_e09`

## Regra

Não falsificar histórico.

Isso significa:

- não inventar o corpo exato dessas migrations se ele não estiver preservado;
- não renumerar migrations atuais para “encaixar” no passado;
- não inserir registros em `schema_migrations` sem prova de equivalência do efeito;
- não usar `DROP` para “sincronizar” o remoto com o repo.

## Procedimento seguro

1. Confirmar o efeito real de cada item no ambiente remoto por evidência de catálogo, grants, policies, funções e constraints.
2. Se o efeito remoto estiver correto, recuperar o SQL original a partir do agente/artefato que o aplicou; não usar `migration repair` para esconder a ausência local.
3. Se o efeito remoto divergir do esperado, criar uma migration nova, aditiva e com timestamp atual, corrigindo o estado presente.
4. Se parte do efeito existir e parte não, tratar a diferença como drift atual e não como “reexecução histórica”.

## Aplicação prática

- `20260827090000_reconciliar_integration_secrets_sem_drop.sql` já foi aplicada remotamente; por isso o hardening adicional não deve ser embutido nela.
- O reforço para `integration_secrets` e `mv_benchmark_setorial` foi movido para a migration nova `20260827102000_guardrails_integration_secrets_mv_benchmark.sql`.
- Essa migration nova é idempotente, não destrutiva e adequada tanto para staging quanto para reconciliação futura do canônico.

## Resultado esperado

- histórico do repo permanece honesto;
- o remoto não perde rastreabilidade;
- o drift é tratado como drift atual, não como ficção retrospectiva.
