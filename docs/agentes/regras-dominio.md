# Regras de domínio que o código não deixa óbvio — referência para agentes

Ler quando mexer em papéis/RBAC, orçamento, verba de PA, kit, recompra, preço do catálogo, aprovação,
upload ou cleanup de E2E.

## Papéis e RBAC

- **Hierarquia oficial Sicoob:** `dev > gestor_compras > comprador_singular > gerente_pa >
  comprador_pac > agente` (`src/lib/roles.ts:4`). `vendedor` e `supervisor` são mapeados por contexto.
- **`admin` e `manager` são aliases legados** → `supervisor` (`src/lib/roles.ts:32-36`). Não introduza
  papel novo sem passar por aqui.
- **SSOT é a tabela `user_roles`**, espelhada em `profiles.role` (`SICOOB_TESTING.md:27`). **Não existe
  papel de nível Central** — "a Central é apenas organização" (`SICOOB_TESTING.md:30`).
- Rótulo que engana: `comprador_singular` aparece na UI como "Gestor Singular"
  (`src/lib/roles.ts:66-67`). Renomear rótulo ≠ renomear papel.
- **Policy nova nunca escreve `has_role(auth.uid(),'admin')`.** Use helper semântico: `is_dev`,
  `is_supervisor_or_above`, `can_view_audit_logs`, `can_view_telemetry`, `can_view_connections`,
  `can_manage_connections` (`docs/RBAC_HELPERS.md:3-5,23-24`, exemplos ✅/❌ em `:35-44`). `is_admin` é
  só alias de `is_supervisor_or_above` (`:13`). Só `dev` lê `admin_audit_log` (`:14`).
- Helper novo: `STABLE` + `SECURITY DEFINER` + `search_path=public` + `GRANT` a `authenticated, anon`
  (`docs/RBAC_HELPERS.md:25-26`) **e** entrada na matriz
  `tests/rls/telemetry-logs-connections-access.test.ts` (`:30-31`).
- Emissão de chave MCP é restrita a `is_dev` (`docs/RBAC_HELPERS.md:11`).

## Escopo de vendedor — é gate de CI, não convenção

`scripts/check-seller-scope.mjs` **falha o CI** se uma query Supabase a `quotes`, `orders` ou
`discount_approval_requests` (`:32`) não aplicar escopo de seller até 40 linhas depois do `.from`
(`:33`). Sinais aceitos (`:35-44`): `applySellerScope(`, `.eq`/`.in("seller_id")`, `.match({seller_id})`,
`.filter`, `.or("seller_id.eq…")`, `supabase.rpc(`. Escape só com comentário inline
`// rls-allow: <razão>` (`:46`). Isentos: `src/lib/auth/apply-seller-scope.ts`,
`src/lib/security/rls-denial-logger.ts` (`:51-54`).

## Catálogo externo

- **Contrato de colunas:** use `is_active`, `sale_price`, `primary_image_url`. Os nomes `active`,
  `base_price`, `image_url` **não existem** e fazem o PostgREST rejeitar a consulta inteira com 42703
  (`supabase/functions/_shared/external-product-contract.ts:3-6`). Use as constantes
  `EXTERNAL_PRODUCT_CORE_SELECT` / `_REORDER_SELECT` / `_LIGHTWEIGHT_SELECT`.
- **Somente leitura, imposta em código:** `_shared/external-read-only.ts` fixa a origem do catálogo e
  recusa qualquer coisa fora de `GET`/`HEAD` em `/rest/v1/` com `CATALOG_READ_ONLY` (`:19-21`). A
  interface não pode criar reserva fictícia nem gravar no mestre.
- Cache em memória TTL 10 min, fallback progressivo e retry com backoff (`README.md:256-260`).

## Preço defasado (price freshness)

- `stale` quando passa do threshold; `aging` quando passa da **metade** do threshold; default **60 dias**
  (`src/utils/price-freshness.ts:25,103-105`). O threshold por produto vem de
  `price_freshness_threshold_days` do catálogo externo.
- **Preço sem data não dispara aviso visual:** `status: "unknown"` com `shouldWarn: false` e a copy
  "Confirme o valor diretamente com o fornecedor antes de enviar o orçamento ao cliente"
  (`src/utils/price-freshness.ts:68-78`). Mudança nesse módulo roda com
  `npm run test:price-freshness` (+ `scripts/check-price-freshness-coverage.mjs`).

## Kit, recompra e verba

- **Conferência de catálogo do kit é tudo-ou-nada:** `assertCompleteVariantCatalog` falha se o catálogo
  não confirmar a contagem exata de variantes ou se divergir
  (`supabase/functions/sicoob-kit-quote/catalog.ts:99-109`). `kitQuantity` é inteiro entre 1 e 100.000
  (`catalog.ts:118-119`).
- **Idempotência de kit e de recompra é hash SHA-256 do intento canonicalizado**, com as linhas ordenadas
  por `line_id` (`sicoob-kit-quote/idempotency.ts:11-38`, `sicoob-reorder/idempotency.ts`,
  front `src/services/sicoob/reorderIdempotency.ts`). Mudar a ordem das linhas **não** deve gerar
  orçamento novo — não "melhore" essa ordenação.
- **Verba de PA é mensal, por período:** `pa_budgets` consultada com `.eq("ano", …).eq("mes", …)`
  (`src/services/sicoob/budgetService.ts:41-48`). O saldo livre é
  `planejado - reservado - comprometido - consumido`, onde `planejado` = `verba_planejada` (ou
  `verba_total` quando ausente) — mesma conta de `getRemainingBudget`
  (`src/hooks/usePaBudget.ts:49-55`) e de `readPaBudgetAmounts`
  (`src/lib/sicoob/paBudgetState.ts:41-55`). Reservado e comprometido **não** são gastos, mas já
  estão presos a pedidos: ignorá-los liberaria a mesma verba duas vezes para nova alocação. A
  autoridade de verba é validada por trigger **no banco**, não no front
  (`RELATORIO_AUDITORIA_EXAUSTIVA.md:175`).

## Edge functions

- **Toda edge nova entra no manifest de autorização no mesmo PR**:
  `supabase/functions/_shared/edge-authz-manifest.ts:20-22` — "O gate CI falha se houver função em
  `supabase/functions/<name>/index.ts` ausente do manifest". Categorias:
  `public | authenticated | supervisor | dev | service | scoped` (`:24-30`).
- Categoria `service` exige o segredo interno no header `x-sicoob-internal-secret` antes de criar cliente
  `service_role` (`docs/EDGE_FUNCTIONS.md:7`); sem o segredo, **falha fechado**
  (`supabase/config.toml:32-34`).
- Gate: `scripts/check-edge-authorization.mjs`; testes: `tests/security/edge-authz-bypass.test.ts`.
  Logging estruturado tem gate próprio (`scripts/check-edge-structured-logging.mjs`).

## E2E e QA

- **O cleanup de E2E tem 6 camadas e nunca apaga `auth.users`**
  (`supabase/functions/e2e-cleanup/index.ts:10-17`): e-mail precisa estar em
  `E2E_CLEANUP_ALLOWED_EMAILS`; o `user_id` é resolvido server-side por `auth.admin` (o cliente nunca
  passa UUID); `dryRun = true` por default, exigindo `{"dryRun": false}` explícito; apaga só dados de
  aplicação por `user_id`/`seller_id`; sem allowlist → `forbidden / allow_list_not_configured`
  (`:339-346`); rate limit default 30/60s; cada chamada audita em `public.e2e_cleanup_audit`.
- **Fixtures por papel são contas e IDs fixos** (`docs/FIXTURES_E2E_POR_PAPEL.md:5-16`):
  `qa+gerente@sicoob.test` → PA `PA-QA-001`, verba R$ 5.000 total / R$ 1.000 de alçada;
  `qa+gestor@sicoob.test` → Singular `SING-QA-001`, alçada R$ 10.000. O doc está incompleto por
  declaração própria (`:18`). Topologia do seed: Central `0001`, Singular `0002`, PA `01`
  (`SICOOB_TESTING.md:21-24`), recriada por `POST /functions/v1/sicoob-seed` com service role.
- **Não existe neste repo** a regra "fixture de produção que não pode ser apagada" (isso é do Zapp Web
  V2). Aqui a proteção é a allowlist + `dryRun` do `e2e-cleanup`.
- **Orçamento de skip de teste crítico é fixo:** `scripts/check-critical-test-skip-budget.mjs` (orçamento por arquivo, `BASELINE_BY_FILE`)
  varre `tests/p0`, `tests/rls`, `tests/security` contando `.skip`/`.todo`/`.only`/`skipIf`/`runIf`/`{ skip: true }`/`ctx.skip()`; se o número de qualquer arquivo
  **crescer**, o CI falha. Nunca resolva um teste vermelho com `skip`.

## UI

- **Cor hardcoded é proibida em caminho Sicoob:** `scripts/check-sicoob-hardcoded-colors.mjs:5-22`
  bloqueia `text-/bg-/border-` de `emerald`, `amber`, `red` e `blue` em `src/pages/sicoob` e
  `src/components/sicoob` (`:24-27`). Use os tokens (`bg-sicoob-green`, `text-sicoob-green-dark` —
  exemplos em `src/lib/roles.ts:63,70,77`).
- Grade de produto usa `role="grid"/"row"/"gridcell"`; interação complexa precisa de teclado e ARIA;
  imagem de produto usa `loading="lazy"` (`CONTRIBUTING.md` > "Padrões de Excelência").
