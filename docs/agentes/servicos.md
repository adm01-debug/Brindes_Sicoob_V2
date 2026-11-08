# Serviços (deploy, domínios, integrações) — referência para agentes

Ler quando for confirmar um deploy, mexer em env var de hospedagem, domínio, CSP ou integração externa.

## Deploy do front — ambiguidade aberta, não resolvida

**Há dois publicadores declarados para a mesma branch e nenhuma decisão registrada.** Antes de afirmar
que algo "subiu", diga por qual trilha e com que evidência.

| Fonte | O que diz |
|---|---|
| `README.md:317-326` | "O deploy é gerenciado automaticamente pelo **Lovable Cloud**"; produção = `https://criar-together-now.lovable.app`, preview = `https://id-preview--*.lovable.app` |
| `docs/DEPLOYMENT.md:10-12` | "Não existe script `npm run deploy`. A publicação do frontend depende do provedor configurado para o projeto e deve ser comprovada pelo respectivo deploy e smoke test" — **não nomeia o provedor** |
| GitHub (API) | `homepage: https://brindes-sicoob-v2.vercel.app` |
| `vercel.json` | existe na raiz, com rewrites de SPA e headers de segurança |
| `supabase/functions/_shared/cors.ts:10,22` | aceita `https://brindes-sicoob-v2.vercel.app` e previews `^https://brindes-sicoob-v2(-[a-z0-9-]+)?\.vercel\.app$` |

Pendência explícita já registrada:
`docs/plano-implementacao/plano-encerramento-100-etapas-20261001/rastreabilidade-250.json:4323` —
"Definir em docs/DEPLOYMENT.md quem é produção: Vercel ou Lovable. Hoje dois publicadores para o mesmo
branch." Risco associado (`:4305`, marcado como **não revalidado** em `:4307`): "Vercel publica main sem
esperar CI… 50 merges com CI vermelha já foram para produção".

**Nenhum dos 13 workflows publica o front.** Merge em `main` dispara o publicador externo (integração
Vercel e/ou Lovable), não o CI. "Vercel Agent Review" aparece nos checks como `neutral` por billing
desabilitado (`PENDENCIAS.md:326`).

### Deploy de backend — manual e com confirmação

- **Edge functions:** `.github/workflows/deploy-sicoob-functions.yml`, só `workflow_dispatch`, input
  `PUBLICAR`, environment `construction`, allowlist de **13 funções**. Detalhe em
  `docs/agentes/banco.md`. Nunca `supabase functions deploy` direto.
- **Migrations:** `.github/workflows/apply-sicoob-migrations.yml`, input `APLICAR`, environment
  `construction`. **Proibido** `supabase db push`, `--linked` ou `--include-all`
  (`docs/DEPLOYMENT.md:35-39`).

## Env vars e CSP

- Front (`.env.production.example:3-5`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
  `VITE_SUPABASE_PROJECT_ID`. Valores reais só no provedor de hospedagem.
- Outras `VITE_*` lidas pelo código: `VITE_SENTRY_DSN`, `VITE_APP_ENCRYPTION_KEY`, `VITE_LOVABLE_PREVIEW`,
  `VITE_ENABLE_DEMO_PAGES`, `VITE_SHOW_DEV_INFRA_MESSAGES`, `VITE_DEV_CONTACT_EMAIL`,
  `VITE_EXTERNAL_DB_URL`, `VITE_CRM_BRIDGE_URL`, `VITE_SICOOB_TEST_EMAIL_{PA,SINGULAR,CENTRAL,GESTOR}`,
  `VITE_SICOOB_TEST_USER_PASSWORD`.
- **Toda `VITE_*` vai para o bundle e é pública.** `VITE_APP_ENCRYPTION_KEY` é `VITE_*` — tratar como
  público, não como segredo.
- **Nunca** colocar chave de servidor na hospedagem do front: `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_*`,
  `SUPABASE_JWT_SECRET`, `LOVABLE_API_KEY`, `ELEVENLABS_API_KEY`, `RESEND_API_KEY` e afins são das edge
  functions (`supabase secrets` / dashboard Supabase).
- E2E: `.env.e2e.example` lista `E2E_SUPABASE_*`, `E2E_CLEANUP_TOKEN`, `E2E_CLEANUP_DRY_RUN` e as personas
  (`E2E_USER_*`, `E2E_VIEWER_*`, `E2E_MANAGER_*`, `E2E_ADMIN_*`, `E2E_DEV_*`). O destino é validado por
  `scripts/e2e-target.mjs` — ver `docs/agentes/banco.md`.
- **CSP duplicada:** `vercel.json:43` (headers Vercel) e `public/_headers:1-12` (formato Netlify/Lovable).
  `docs/SECURITY.md:21` manda manter as duas idênticas — hoje **não estão**: `public/_headers` tem
  `X-Frame-Options: SAMEORIGIN` e `X-XSS-Protection` que o `vercel.json` não tem, e o `vercel.json` não
  define o cache de `/assets/*` nem o `no-store` de `/sw.js` que o `_headers` define
  (`public/_headers:14-21`). Mexeu em uma, mexa na outra no mesmo PR.
- CORS das edges: allowlist exata + padrões em `supabase/functions/_shared/cors.ts:4-28` (Vercel do
  projeto, `*.lovable.app`, `*.lovableproject.com`, `promogifts.com.br`, localhost). Adicionar origem é
  mudança de perímetro — entra no PR com justificativa.

## Integrações externas

| Integração | Código | Segredo (nome, nunca o valor) |
|---|---|---|
| **Lovable AI Gateway** (Gemini/GPT — 17 funções: `semantic-search`, `generate-mockup`, `ai-recommendations`, `magic-up-score`, `expert-chat`, `bi-copilot`, `kit-ai-builder`, `comparison-ai-advisor`, `visual-search`…) | `supabase/functions/*` | `LOVABLE_API_KEY` |
| **Sentry** | `src/lib/sentry.ts`, `src/lib/telemetry/structuredLogger.ts` | `VITE_SENTRY_DSN` (público) |
| **ElevenLabs** (TTS + Scribe + voz) | `supabase/functions/elevenlabs-tts/`, `elevenlabs-scribe-token/`, `voice-agent/`; front `src/stores/oracleVoiceBridge.ts` | `ELEVENLABS_API_KEY` |
| **Bitrix24 (CRM)** | `supabase/functions/bitrix-sync/`, `sync-quote-bitrix/` | `BITRIX24_WEBHOOK_URL`. Regra: `crm.item.get` com `entityTypeId=4` para Smart Companies; OAuth2 obrigatório (`CONTRIBUTING.md:95-96`) |
| **CRM Supabase externo** | `supabase/functions/crm-db-bridge/`, `src/lib/crm-db.ts` | `CRM_SUPABASE_URL`, `CRM_SUPABASE_SERVICE_KEY`, `CRM_SUPABASE_ANON_KEY` |
| **Catálogo externo (Promobrind)** | `supabase/functions/external-db-bridge/`, `external-db-inspect/`, `_shared/external-product-contract.ts`, `src/lib/external-db/` | `VITE_EXTERNAL_DB_URL` + credenciais via `_shared/credentials.ts`. **Somente leitura imposta em código** |
| **Resend** (e-mail) | `send-transactional-email/`, `process-scheduled-reports/`, `_shared/approval-delivery.ts` | `RESEND_API_KEY`, `NOTIFICATION_FROM_EMAIL` |
| **n8n / SalesPro** | `quote-sync/`, `sync-quote-bitrix/` | `N8N_QUOTE_WEBHOOK_URL`, `SALESPRO_WEBHOOK_URL`, `QUOTE_SYNC_API_KEY` |
| **CNPJa** (consulta de CNPJ) | `supabase/functions/cnpj-lookup/` | `CNPJA_API_KEY`; host `api.cnpja.com` liberado na CSP |
| **VirusTotal** | `supabase/functions/secure-upload/` | `VIRUSTOTAL_API_KEY` |
| **Scanner de malware Sicoob** | `sicoob-document-ingest/` (`inspection.ts`, `scanner.ts`) | `SICOOB_MALWARE_SCANNER_URL`, `SICOOB_MALWARE_SCANNER_TOKEN` |
| **Dropbox** | `supabase/functions/dropbox-list/`, `src/pages/DropboxBrowserPage.tsx` | `DROPBOX_ACCESS_TOKEN` |
| **GitHub (pelas edges)** | `github-fix-config/`, `github-credentials-test/` | `GITHUB_PAT` |
| **BI share / dossiê público** | `bi-share-dossier/`, `src/lib/bi/dossierPdfGenerator.ts`, `pptxGenerator.ts` | `BI_SHARE_SECRET` |
| **MCP próprio** | `mcp-server/`, `mcp-keys-{issue,revoke,rotate,update}/`, `src/lib/mcp/` | tabela `mcp_api_keys`; emissão restrita a `is_dev` |
| **Cloudflare** | DNS/WAF em `infra/modules/cloudflare/main.tf`; Stream liberado na CSP | — |
| **Excel / PDF / PPTX / ZIP** | `@e965/xlsx`, `jspdf(+autotable)`, `pptxgenjs` (via `vendor/`), `jszip`, `html2canvas` | — |
| **PWA** | `public/manifest.json`, `public/sw.js`, `offline.html`, `playwright.pwa.config.ts` | — |

- **Chamada a serviço externo passa pelo `CircuitBreaker`** (`src/lib/security/circuit-breaker.ts`,
  ADR `docs/adr/0005-resilience-circuit-breaker.md`) — `CONTRIBUTING.md:101-102`.
- Não há `OPENAI_API_KEY` no código: `api.openai.com` e `generativelanguage.googleapis.com` só aparecem na
  CSP; as chamadas de IA passam pelo `LOVABLE_API_KEY`.
- Secrets declarados e **sem nenhum leitor** (código morto): `BITRIX24_DOMAIN`, `BITRIX24_USER_ID`,
  `BITRIX24_TOKEN`, `MCP_SHARED_SECRET`.
- Tabela completa de secrets, com o que está "preencher": `docs/secrets.md:34-62`. Rotação:
  `docs/RUNBOOKS/CREDENTIAL_ROTATION.md`.

## Runner self-hosted

`infrastructure/github-runner/docker-compose.yml` — imagem `myoung34/github-runner:ubuntu-jammy`, deploy
por **Portainer**, variável obrigatória `RUNNER_TOKEN`. Nenhum workflow versionado hoje usa
`runs-on: self-hosted`; confira antes de supor que um job roda nele.
