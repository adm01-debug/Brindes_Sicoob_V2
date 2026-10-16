# P0 E2E Flows

Cenários **P0** do `docs/RUNBOOK.md` em formato Playwright. Os cenários com
infraestrutura e contrato implementados executam normalmente. Os cenários ainda
marcados com `test.skip` permanecem no inventário exato validado por
`npm run check:critical-test-skips`; destrave cada entrada junto com sua UX,
fixture determinística e evidência de execução.

## Mapeamento

| Spec                           | Cenário                                         |
| ------------------------------ | ----------------------------------------------- |
| `01-auth-recovery.spec.ts`     | Auth fora do ar / sessão expirada               |
| `02-catalog-degraded.spec.ts`  | DB externo offline → cache + banner             |
| `03-quote-blocked.spec.ts`     | Bitrix/CRM offline durante criação de orçamento |
| `04-checkout-blocked.spec.ts`  | Edge functions de pagamento/order com 5xx       |
| `05-admin-down.spec.ts`        | full-op-diagnostics ou MCP fora do ar           |
| `06-auth-lifecycle.spec.ts`    | Login, refresh e logout (requer conta E2E)      |
| `07-rls-enforcement.spec.ts`   | Isolamento remoto entre personas                |
| `08-password-recovery.spec.ts` | Recuperação, validações e anti-enumeração       |

Mocks compartilhados em `_mocks.ts` (interceptam via `page.route()`).
