# P0 E2E Flows

Cenários **P0** do `docs/RUNBOOK.md` em formato Playwright. Os cenários com
infraestrutura e contrato implementados executam normalmente. Os que ainda estão
com `test.skip` são contabilizados por arquivo em `BASELINE_BY_FILE`, dentro de
`scripts/check-critical-test-skip-budget.mjs`: acrescentar um skip aqui quebra o
CI. Destrave cada cenário junto com sua UX de degradação e **baixe o número no
orçamento no mesmo PR** — a catraca só aperta.

## Mapeamento

| Spec                           | Cenário                                         | Skips no orçamento |
| ------------------------------ | ----------------------------------------------- | ------------------ |
| `01-auth-recovery.spec.ts`     | Auth fora do ar / sessão expirada               | 3 |
| `02-catalog-degraded.spec.ts`  | DB externo offline → cache + banner             | 3 |
| `03-quote-blocked.spec.ts`     | Bitrix/CRM offline durante criação de orçamento | 3 |
| `04-checkout-blocked.spec.ts`  | Edge functions de pagamento/order com 5xx       | 3 |
| `05-admin-down.spec.ts`        | full-op-diagnostics ou MCP fora do ar           | 4 |
| `06-auth-lifecycle.spec.ts`    | Login, refresh e logout (requer conta E2E)      | 4 |
| `07-rls-enforcement.spec.ts`   | Isolamento remoto entre personas                | 2 |
| `08-password-recovery.spec.ts` | Recuperação, validações e anti-enumeração       | 1 |

Mocks compartilhados em `_mocks.ts` (interceptam via `page.route()`).
