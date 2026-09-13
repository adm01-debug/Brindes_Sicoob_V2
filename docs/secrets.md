# Inventário de segredos e variáveis de ambiente

Gerado em 2026-09-13 por `grep -rhoE "Deno\.env\.get\(...)" supabase/functions` e
`grep -rhoE "secrets\.\w+" .github/workflows`. Etapa 47 do
[plano de 50 etapas](./plano-melhorias-50-etapas.md).

**Preencher a coluna "Configurado em" — hoje é a lacuna real**: os secrets de E2E
(etapa 03) e de compliance (etapa 04) faltam no GitHub Actions, e é assim que os
dois gates de CI ficam vermelhos. Ninguém tinha essa lista consolidada antes.

## Lidos pelas edge functions (`Deno.env.get`)

| Variável | Onde é lida (função) | Configurado em |
|---|---|---|
| `SUPABASE_URL` | várias (client admin) | Supabase (automático) |
| `SUPABASE_SERVICE_ROLE_KEY` | várias (client admin) | Supabase (automático) |
| `SUPABASE_ANON_KEY` | várias | Supabase (automático) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | build do frontend | GitHub secret + `.env.production` |
| `EXTERNAL_SUPABASE_URL` / `EXTERNAL_SUPABASE_SERVICE_KEY` | `categories-api`, `external-db-inspect` (catálogo externo) | **preencher** |
| `CRM_SUPABASE_URL` / `CRM_SUPABASE_ANON_KEY` / `CRM_SUPABASE_SERVICE_KEY` | `crm-db-bridge` | **preencher** |
| `BITRIX24_WEBHOOK_URL` | `bitrix-sync` | **preencher** |
| `CNPJA_API_KEY` | `cnpj-lookup` | **preencher** |
| `DROPBOX_ACCESS_TOKEN` | `dropbox-list` | **preencher** |
| `ELEVENLABS_API_KEY` | `elevenlabs-scribe-token`, `elevenlabs-tts` | **preencher** |
| `RESEND_API_KEY` | e-mail transacional | **preencher** |
| `VIRUSTOTAL_API_KEY` | scan de upload | **preencher** |
| `GITHUB_PAT` | `github-credentials-test`, `github-fix-config` | **preencher — escopo mínimo necessário** |
| `LOVABLE_API_KEY` | integração Lovable | **preencher** |
| `N8N_PRODUCT_WEBHOOK_SECRET` / `N8N_QUOTE_WEBHOOK_URL` | integração n8n | **preencher** |
| `SALESPRO_WEBHOOK_URL` | integração SalesPro | **preencher** |
| `QUOTE_SYNC_API_KEY` | sync de orçamento | **preencher** |
| `BI_SHARE_SECRET` | `bi-share-dossier` | **preencher** |
| `WEBHOOK_HMAC_SECRET` | validação de assinatura de webhook | **preencher** (usado também em `ci.yml`) |
| `E2E_CLEANUP_TOKEN` | `e2e-cleanup` | **GitHub secret — pendente (etapa 03)** |
| `E2E_CLEANUP_ALLOWED_EMAILS` / `_RATE_LIMIT_MAX` / `_RATE_LIMIT_WINDOW_SECONDS` | `e2e-cleanup` (guarda-corpo) | **preencher** |
| `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` / `TEST_ADMIN_JWT` | testes internos | **preencher** |
| `SICOOB_TEST_EMAIL_CENTRAL` / `_GESTOR` / `_PA` / `_SINGULAR` / `SICOOB_TEST_USER_PASSWORD` | simulação de papéis Sicoob em CI | **preencher** |
| `PUBLIC_APP_URL` | geração de links públicos | **preencher** |
| `VITE_CRM_BRIDGE_URL` / `VITE_EXTERNAL_DB_URL` | build (aponta para bridges) | **preencher** |
| `ALLOW_HTTP_FETCH` | flag de dev (permite fetch não-HTTPS) | **confirmar que é `false`/ausente em produção** |
| `LOG_CREDENTIAL_RESOLUTION` / `LOG_CRM_BRIDGE_VERBOSE` | flags de debug | **confirmar desligadas em produção** |

## Lidos pelo GitHub Actions (`secrets.*`)

| Variável | Workflow | Status |
|---|---|---|
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | `e2e.yml` | ❌ **ausente — causa da falha do PR #6 (etapa 03)** |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | `e2e.yml` | ❌ **ausente — idem** |
| `SUPABASE_SERVICE_ROLE_KEY` | `security-compliance.yml` | ❌ **ausente — causa da falha do job agendado em `main` (etapa 04)** |
| `VITE_SUPABASE_URL` | `ci.yml`, `security-compliance.yml` | verificar se está presente |
| `LHCI_GITHUB_APP_TOKEN` | `lighthouse.yml` | verificar |
| `GITHUB_TOKEN` | vários (automático do Actions) | automático, não precisa configurar |

## Como usar isto

1. As linhas marcadas ❌ são bloqueio confirmado — configurar antes de mesclar qualquer PR.
2. As linhas "preencher" precisam que alguém com acesso ao Supabase Dashboard e às
   integrações confirme se o secret já existe (nomes diferentes?) ou se está faltando.
3. Depois de preenchido, um script (`scripts/check-secrets-inventory.mjs`, a criar)
   pode comparar este arquivo contra o `grep` acima e falhar o CI se aparecer uma
   variável nova sem documentação — fecha o ciclo para isso não precisar ser
   redescoberto lendo log de CI de novo.
