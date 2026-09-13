# Validação do plano de 50 etapas — correções encontradas (2026-09-13)

Antes de executar o [plano de 50 etapas](./plano-melhorias-50-etapas.md), cada etapa
de risco foi simulada contra o código e o histórico reais. Isto documenta o que
mudou em relação ao plano original — para não redescobrir os mesmos gaps depois.

## Achados que invalidam etapas do plano original

| Etapa original | Alegação original | Realidade verificada | Ação tomada |
|---|---|---|---|
| 08 (lockfiles) | "dois lockfiles, remover um" | `ci.yml` e `security-compliance.yml` rodam **9 e 7 comandos `bun`** cada — são os dois jobs mais críticos (quality-gate e compliance). Os outros 5 workflows usam `npm`. Ambos os lockfiles são carga viva hoje. | **Nenhuma ação.** Consolidar em um só gerenciador é um projeto próprio (migrar 5 workflows para bun, validar que resolve o mesmo grafo de deps) — não uma deleção de arquivo. |
| 11 (probe files) | "script não limpa em erro" | `scripts/tscheck-files.mjs` já tem `finally { unlinkSync(cfgPath) }`. Os 101 arquivos commitados vieram de outra fonte (provavelmente `tsc -p` manual fora do wrapper), e o `origin/main` já removeu os arquivos e adicionou o padrão ao `.gitignore`. | **Nenhuma ação — já resolvido.** |
| 24 (8 edge functions sem auth) | heuristica de grep (`getUser\|Authorization\|service_role\|...`) | De 8, **6 eram falso-positivo**: `migrate-helper` e `cleanup-novelties` já são stubs `410 Gone`; `external-db-inspect` já tem `authorize(req, {requireRole:"dev"})`; `image-proxy` já tem allowlist de domínio + anti-hotlinking + rate limit; `get-visitor-info` é público por design (ecoa dados do próprio chamador); `rate-limit-check` é intencionalmente público (é o próprio pre-check). | Corrigido apenas o que era real: ver abaixo. |
| 25 (SSRF em image-proxy) | "aceita URL arbitrária" | Já tem `ALLOWED_DOMAINS` fixo (2 domínios), `ALLOWED_REFERER_HOSTS`, `runBotProtection` (200/min) e circuit breaker. | **Nenhuma ação.** |
| 26 (remover/gatear migrate-helper e external-db-inspect) | "sem auth, provavelmente órfã" | `external-db-inspect` tem 3 chamadores reais (`AdminExternalDbPage.tsx`, `useExternalDbInspect.ts`, `engraving-schema-diff.ts` — este último só referencia o nome em comentário, não chama) e já exige role `dev`. `migrate-helper` **não tem nenhum chamador** em `src/` (confirmado por grep exato, sem falso-positivo) — já é stub 410 corretamente, órfã de verdade. | **Nenhuma ação de código.** |
| 29 (dedupe .env.production) | "ANON_KEY é duplicata não usada" | `client.ts` só lê `VITE_SUPABASE_PUBLISHABLE_KEY`, mas `VITE_SUPABASE_ANON_KEY`/`PROJECT_ID` são usados em `PublicComparisonPage.tsx`, `PublicDossierPage.tsx`, `PublicCollectionPage.tsx`, `imageProxy.ts`, `scripts/test-rls-compliance.mjs`. | **Nenhuma ação — arquivo não tocado.** Mapear todos os 4 usos antes de qualquer limpeza futura. |

## Achado novo, fora do plano original

**`generate-mockup-nanobanana`** não tinha nenhum `Deno.serve()` — só imports (8 linhas).
Histórico: era uma implementação completa de 278 linhas (`df11e18c4`, "feat(mockup-ai): add
Nano Banana API integration"), foi esvaziada para 0 linhas em `68aeeb6e5` e voltou como stub
incompleto (sem handler) em `77efbe053`. **Sem chamador em `src/`** — foi substituída por
`generate-mockup` (287 linhas, ativa). Corrigido para o mesmo padrão `410 Gone` que
`migrate-helper`/`cleanup-novelties` já usam, referenciando a function ativa.

## Correções aplicadas nesta sessão

1. `dependencies.json`, `api_usage.json`, `service_map.txt`, `triage-edge-typecheck.json`,
   `audit_report.pdf` — removidos do git (eram saída de `scripts/generate_api_map.js` /
   `scripts/api_map.cjs`, sem leitor em runtime), adicionados ao `.gitignore`.
2. 13 PDFs de `public/` (10,3 MB, zero referência em `src/`/`index.html`) movidos para
   `docs/execucao/evidencias/audit-reports/` — saem do bundle servido, continuam no repo.
3. `supabase/functions/categories-api/index.ts` — adicionado `runBotProtection` (mesma
   política de `external-db-inspect`: 60 req/min, bloqueio de 30 min). Era a única das
   8 functions originalmente flagadas com gap real: lê o catálogo externo com credencial
   de service role e não tinha nenhuma camada de rate limit.
4. `supabase/functions/generate-mockup-nanobanana/index.ts` — convertido para stub `410`
   (achado novo acima).
5. `package.json`: `"lint": "tsc --noEmit"` (nome enganoso — quem roda `npm run lint`
   esperando ESLint rodava o compilador) virou `"lint": "npm run lint:check"` (alias fiel
   do ESLint real). Confirmado por grep que nenhum workflow/husky chamava o `lint` antigo
   diretamente — só `lint:baseline` e `lint:check`, que não mudaram. Removido
   `typecheck:all` (redundante: `typecheck` já cobre `tsconfig.app.json` +
   `tsconfig.node.json`, superconjunto do `tsc --noEmit` isolado).

## Pendências que ficaram de fora desta rodada (motivo)

- **Hook `commit-msg` com commitlint**: exige `npm install` de nova devDependency +
  teste isolado antes de virar hook ativo — um `commit-msg` quebrado bloqueia *todo*
  commit do usuário. Adiar até testar em isolamento.
- **Consolidação de lockfile** (bun vs npm): precisa de migração deliberada de 5
  workflows, não é uma etapa de "escolher um".
- **`.env.production`**: mapear os 4 usos reais de `ANON_KEY`/`PROJECT_ID` antes de
  decidir se algo ali é de fato redundante.
