# E2E (Playwright)

Suíte de testes ponta-a-ponta cobrindo os fluxos críticos por módulo, com
captura automática de evidências em qualquer falha.

## Estrutura

```
e2e/
├── fixtures/
│   ├── auth.setup.ts       Login uma vez e salva storageState.json
│   ├── test-base.ts        test estendido com captura de console/erros e
│   │                        afterEach que coleta evidências em falha
│   └── selectors.ts        SSOT de seletores frágeis
├── helpers/
│   ├── evidence.ts         Screenshot, DOM, console.json, meta.json
│   ├── nav.ts              gotoAndSettle, expectNoConsoleErrors
│   └── forms.ts            fill/click resilientes
└── flows/
    ├── 01-auth.spec.ts
    ├── 02-navigation.spec.ts
    ├── 03-products.spec.ts
    ├── 04-quotes.spec.ts
    ├── 05-orders.spec.ts
    ├── 06-kit-builder.spec.ts
    ├── 07-collections.spec.ts
    ├── 08-favorites.spec.ts
    ├── 09-simulator.spec.ts
    ├── 10-admin.spec.ts
    └── 11-errors.spec.ts
```

## Configuração local

1. Copie `.env.e2e.example` para `.env.e2e`:
   ```bash
   cp .env.e2e.example .env.e2e
   ```
2. Configure um projeto de QA isolado. Preencha os cinco valores de destino/chaves e a allowlist com o mesmo project ref, além das contas de teste:
   ```
   E2E_SUPABASE_URL=https://<project-ref>.supabase.co
   E2E_SUPABASE_PROJECT_ID=<project-ref>
   E2E_ALLOWED_PROJECT_ID=<project-ref>
   E2E_SUPABASE_PUBLISHABLE_KEY=...
   E2E_SUPABASE_SERVICE_ROLE_KEY=...
   E2E_CLEANUP_TOKEN=...
   E2E_USER_EMAIL=teste@exemplo.com
   E2E_USER_PASSWORD=SuaSenhaForte
   ```
3. Carregue antes de rodar:
   ```bash
   set -a && source .env.e2e && set +a
   npm run test:e2e
   ```

O cleanup só usa `E2E_SUPABASE_URL` e exige que URL, project ref e allowlist
coincidam. Os project refs canônicos do portal e do catálogo mestre são
recusados. Sem configuração válida, o cleanup falha fechado.

## Comandos

| Comando                       | Descrição                            |
|-------------------------------|--------------------------------------|
| `npm run test:e2e`            | Headless, todos os specs             |
| `npm run test:e2e:ui`         | Modo UI interativo                   |
| `npm run test:e2e:headed`     | Browser visível                      |
| `npm run test:e2e:debug`      | Inspector do Playwright              |
| `npm run test:e2e:report`     | Abre relatório HTML                  |
| `npm run test:e2e:install`    | Instala browser do Chromium          |

## Evidências em falha

Quando um teste falha, a fixture `evidence` anexa automaticamente ao relatório:

- `screenshot.png` (full page)
- `dom.html` (snapshot do HTML)
- `console.json` (todos os logs de console capturados)
- `page-errors.json` (se houver erros de runtime)
- `meta.json` (URL, viewport, título, timestamp)

Além disso, o Playwright gera por padrão (config):
- `trace.zip` (`retain-on-failure`)
- `video.webm` (`retain-on-failure`)

Tudo fica em `playwright-report/` (relatório HTML) e `e2e-artifacts/` (raw).

## CI

Workflow em `.github/workflows/e2e.yml`:
- PR executa apenas os projetos públicos, com valores locais fictícios e sem secrets.
- A jornada autenticada e os shards só executam por `workflow_dispatch` na `main`,
  no environment `e2e-qa`, após validação da allowlist.
- A configuração do environment deve conter os secrets `E2E_SUPABASE_URL`,
  `E2E_SUPABASE_PROJECT_ID`, `E2E_SUPABASE_PUBLISHABLE_KEY`,
  `E2E_SUPABASE_SERVICE_ROLE_KEY` e os dados das personas. A variável não secreta
  `E2E_ALLOWED_PROJECT_ID` precisa ser idêntica ao project ref do QA.
- Configure required reviewers em `e2e-qa`; criar o environment sem aprovadores
  não fornece aprovação manual.
- O workflow de compliance só executa o teste RLS destrutivo por dispatch na
  `main`, também protegido por `e2e-qa` e pela mesma allowlist.
- As secrets environment-scoped não são enumeradas pelo inventário de secrets
  do repositório; confirme apenas os nomes, nunca grave valores em documentação.

## Cobertura por módulo

| Módulo       | Login | Nav | Criar/Editar | Submeter | Erro |
|--------------|:-----:|:---:|:------------:|:--------:|:----:|
| Auth         |   ✓   |  —  |      —       |    ✓     |  ✓   |
| Navegação    |   —   |  ✓  |      —       |    —     |  ✓   |
| Produtos     |   —   |  ✓  |      ✓ filtro|    ✓     |  ✓   |
| Orçamentos   |   —   |  ✓  |      ✓       |    —*    |  ✓   |
| Pedidos      |   —   |  ✓  |      —       |    —     |  ✓   |
| Kit Builder  |   —   |  ✓  |      —       |    —     |  ✓   |
| Coleções     |   —   |  ✓  |      —       |    —     |  ✓   |
| Favoritos    |   —   |  ✓  |      ✓       |    ✓     |  ✓   |
| Simulador    |   —   |  ✓  |      —       |    —     |  ✓   |
| Admin        |   —   |  ✓  |      —       |    —     |  ✓   |
| Erros        |   —   |  —  |      —       |    —     |  ✓   |

\* Submissão de orçamentos é validada apenas até abertura do builder para
evitar criação de dados de teste no BD compartilhado. Para suíte completa
com cleanup, configure uma edge function `e2e-cleanup` gated por header
secreto.

## Cleanup automático (pós-suite)

Para evitar acúmulo de favoritos, carrinhos, coleções, comparações e
orçamentos criados pelos testes, o `globalTeardown` chama a edge function
`e2e-cleanup` ao final da suite.

### Configuração

Os PRs executam apenas jornadas públicas, sem secrets. Para executar jornadas
autenticadas, configure o environment protegido `e2e-qa` com revisores
obrigatórios e os secrets listados em `docs/secrets.md`. O destino precisa ser
um projeto Supabase descartável de QA; URL, project ref e allowlist são
validados antes da instalação das dependências e antes de cada job remoto.

Defina os secrets no environment `e2e-qa`:

| Variável                       | Onde                  | Descrição                                                     |
|--------------------------------|-----------------------|---------------------------------------------------------------|
| `E2E_CLEANUP_TOKEN`            | Backend + CI          | Token compartilhado (gere com `openssl rand -hex 32`).        |
| `E2E_CLEANUP_ALLOWED_EMAILS`   | Backend (CSV)         | Lista de emails permitidos. Defesa em profundidade.           |
| `E2E_USER_EMAIL`               | CI                    | Email do usuário de teste — alvo do cleanup.                  |
| `E2E_ADMIN_EMAIL`              | CI (opcional)         | Email do admin de teste — também é limpo.                     |
| `E2E_SUPABASE_URL`             | `e2e-qa`              | URL exclusiva do projeto descartável de QA.                   |
| `E2E_SUPABASE_PROJECT_ID`      | `e2e-qa`              | Project ref que deve corresponder à URL.                      |
| `E2E_ALLOWED_PROJECT_ID`       | Variável `e2e-qa`      | Project ref autorizado; nunca use o portal nem o catálogo.   |
| `E2E_SUPABASE_PUBLISHABLE_KEY` | `e2e-qa`              | Chave publicável do projeto de QA.                            |
| `E2E_SUPABASE_SERVICE_ROLE_KEY`| `e2e-qa`              | Chave privilegiada exclusiva de QA.                           |
| `E2E_CLEANUP_DRY_RUN`          | `e2e-qa` (opcional)   | Default é simulação; use exatamente `0` para remover dados.   |

### Como funciona (camadas de segurança)

1. **Token** — `x-e2e-cleanup-token` precisa bater com `E2E_CLEANUP_TOKEN`.
2. **Allow-list** — o `email` do body precisa estar em
   `E2E_CLEANUP_ALLOWED_EMAILS`. Sem isso, mesmo com o token correto, 403.
3. **Lookup server-side** — `user_id` é resolvido via `auth.admin`; o
   cliente nunca passa UUID.
4. **Dry-run default** — o cliente só envia `dryRun: false` quando
   `E2E_CLEANUP_DRY_RUN=0` estiver definido explicitamente.

### Rodar manualmente

```bash
curl -X POST "$E2E_SUPABASE_URL/functions/v1/e2e-cleanup" \
  -H "x-e2e-cleanup-token: $E2E_CLEANUP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"e2e-tester@promogifts.com.br","dryRun":true}'
```

Resposta:

```json
{
  "ok": true,
  "dryRun": true,
  "userId": "…",
  "deleted": { "favorite_items": 12, "seller_carts": 2, "quotes": 1 },
  "totalMs": 184
}
```

### Adicionar novas tabelas

Edite `supabase/functions/e2e-cleanup/index.ts`:

- Tabela com `user_id` → adicione em `USER_ID_TABLES` (filhos antes dos pais).
- Tabela filha de `quotes` (FK `quote_id`) → adicione em
  `QUOTE_CHILD_TABLES_BY_QUOTE_ID`.

A function nunca toca em `auth.users`, no catálogo externo nem em tabelas
globais (admin_settings, ai_usage_*, etc.).

## Convenção de seletores (anti-flakiness)

Os specs evitam strings frágeis (texto traduzido, `h1, h2`, `article`).
Toda referência a elementos passa pelo SSOT em `e2e/fixtures/selectors.ts`:

```ts
import { Sel } from "../fixtures/selectors";
await page.fill(Sel.login.email, "x@y.com");
await page.locator(Sel.login.submit).first().click();
await expect(page.locator(Sel.page.title("orcamentos")).first()).toBeVisible();
```

Grupos disponíveis: `Sel.login`, `Sel.sidebar`, `Sel.page`, `Sel.product`,
`Sel.quote`, `Sel.favorites`, `Sel.cart`, `Sel.app`.

### Adicionando um novo seletor

1. No componente React, adicione `data-testid="kebab-case"` (sufixos
   recomendados: `-input`, `-submit`, `-toggle`, `-list`, `-item`, `-card`).
2. No `selectors.ts`, exponha como `[data-testid="..."]` — opcionalmente com
   um fallback de transição (`, h1, h2`, `, #id`, role-based).
3. Use `Sel.<grupo>.<chave>` no spec; nunca hard-code o seletor.

Quando todos os componentes-alvo já têm o testid, remova o fallback do SSOT
para evitar matches espúrios.
