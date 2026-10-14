# Auditoria de cobertura — Smoke E2E

> **Gerado automaticamente** por `scripts/e2e-smoke-coverage-doc.mjs` em 2026-10-14.
> **Não edite à mão** — a fonte de verdade é `e2e/routes/_catalog.ts` + `SMOKE_COVERAGE` em `e2e/flows/20-all-features-smoke.spec.ts`.

## Resumo

| Métrica | Valor |
|---|---|
| Rotas no catálogo | **80** |
| Rotas `smoke: true` | **33** |
| Features autenticadas cobertas | **31** |
| Smoke público (sem auth) | **2** |

Suíte: [`e2e/flows/20-all-features-smoke.spec.ts`](../e2e/flows/20-all-features-smoke.spec.ts) · Project Playwright: `chromium-smoke` (workers=1, retries=0).

## Smoke autenticado — features × rotas

Ordem do array `SMOKE_COVERAGE`. Numeração bate com os títulos `NN · Nome` no relatório do Playwright.

| # | Feature | Descrição | Rota | Restrição |
|---|---|---|---|---|
| `01` | `dashboard-home` | Vitrine inicial | `/` | — |
| `02` | `dashboard-custom` | Dashboard customizável | `/dashboard` | — |
| `03` | `catalog` | Catálogo de produtos | `/produtos` | — |
| `04` | `catalog-filters` | Filtros avançados | `/filtros` | — |
| `05` | `news` | Novidades | `/novidades` | — |
| `06` | `trends` | Tendências | `/tendencias` | — |
| `07` | `favorites` | Favoritos | `/favoritos` | — |
| `08` | `collections` | Coleções | `/colecoes` | — |
| `09` | `comparison` | Comparador de produtos | `/comparar` | — |
| `10` | `carts` | Carrinhos do vendedor | `/carrinhos` | — |
| `11` | `quotes-list` | Lista de orçamentos | `/orcamentos` | — |
| `12` | `quotes-dashboard` | Dashboard de orçamentos | `/orcamentos/dashboard` | — |
| `13` | `quotes-kanban` | Funil (Kanban) de orçamentos | `/orcamentos/kanban` | — |
| `14` | `quotes-templates` | Templates de orçamento | `/orcamentos/templates` | — |
| `15` | `quote-new` | Criar novo orçamento (wizard) | `/orcamentos/novo` | — |
| `16` | `simulator` | Simulador (wizard) | `/simulador` | — |
| `17` | `help-center` | Central de ajuda | `/ajuda` | — |
| `18` | `price-simulator` | Simulador de preços | `/simulador-precos` | — |
| `19` | `price-search` | Busca avançada de preço | `/busca-preco` | — |
| `20` | `stock` | Estoque | `/estoque` | — |
| `21` | `restock` | Reposição | `/reposicao` | — |
| `22` | `kit-builder` | Kit Builder | `/montar-kit` | — |
| `23` | `my-kits` | Meus Kits | `/meus-kits` | — |
| `24` | `mockup-generator` | Gerador de Mockup | `/mockup-generator` | — |
| `25` | `mockup-history` | Histórico de Mockups | `/mockups/historico` | — |
| `26` | `magic-up` | Magic Up (publicidade IA) | `/magic-up` | — |
| `27` | `commercial-intel` | Inteligência comercial | `/inteligencia-comercial` | — |
| `28` | `bi` | Business Intelligence | `/ferramentas/bi` | — |
| `29` | `bi-compare` | BI — Comparador de clientes | `/ferramentas/bi/comparar` | — |
| `30` | `match` | Match de produtos | `/match` | — |
| `31` | `dropbox` | Dropbox browser | `/dropbox` | — |

## Smoke público (sem auth)

| # | Feature | Descrição | Rota |
|---|---|---|---|
| `90` | `login` | Tela de login | `/login` |
| `91` | `reset-password` | Recuperação de senha | `/reset-password` |

## Governança

✅ Nenhuma rota `smoke: true` órfã (todas listadas em `SMOKE_COVERAGE`).

✅ Nenhuma feature fantasma em `SMOKE_COVERAGE`.

---
_Para regenerar:_ `node scripts/e2e-smoke-coverage-doc.mjs`
_Para validar no CI:_ `node scripts/e2e-smoke-coverage-doc.mjs --check`
