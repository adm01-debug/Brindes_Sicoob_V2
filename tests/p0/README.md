# Contratos P0

Cenários **P0** (sistema fora do ar / dados corrompidos) conforme `docs/RUNBOOK.md`.

Todos os contratos deste diretório executam localmente. Integrações Deno e
políticas SQL são verificadas diretamente no artefato implantável; funções
TypeScript puras são exercitadas em runtime. A suíte falha quando uma guarda,
um fallback ou um efeito obrigatório é removido.

Cada cenário documenta:

1. **Cenário**: descrição do incidente P0 que cobre.
2. **Pré-condições**: estado do sistema necessário.
3. **Implementação**: artefato real que sustenta o comportamento.
4. **Critério de aceite**: encadeamento de guardas e efeitos que deve permanecer ativo.

## Convenção

- **Vitest** (este diretório): contratos de edge functions, integrações, webhooks, RLS.
- **Playwright** (`e2e/flows/p0/`): fluxos UI ponta-a-ponta dos mesmos cenários.

## Como validar

1. Rodar `npx vitest run tests/p0/` para os contratos locais.
2. Rodar `npm run check:critical-test-skips` para impedir regressão da dívida.
3. Rodar `npx playwright test e2e/flows/p0/` para os fluxos ponta a ponta.

## Mapeamento P0 → Arquivo

| Cenário RUNBOOK                          | Vitest                              | Playwright                           |
|------------------------------------------|-------------------------------------|--------------------------------------|
| Edge functions com falha typecheck       | `edge-functions-failing.test.ts`    | —                                    |
| Webhooks (Bitrix, n8n) caídos / 5xx      | `webhooks-resilience.test.ts`       | —                                    |
| Integrações externas (CRM, Cloudflare)   | `external-integrations.test.ts`     | —                                    |
| RLS exposto / dados corrompidos          | `rls-data-integrity.test.ts`        | —                                    |
| Auth quebrado / sessão inválida          | `auth-recovery.test.ts`             | `01-auth-recovery.spec.ts`           |
| Catálogo bloqueado (DB externo offline)  | —                                   | `02-catalog-degraded.spec.ts`        |
| Orçamento bloqueado                      | —                                   | `03-quote-blocked.spec.ts`           |
| Checkout bloqueado                       | —                                   | `04-checkout-blocked.spec.ts`        |
| Admin / governança fora do ar            | —                                   | `05-admin-down.spec.ts`              |
