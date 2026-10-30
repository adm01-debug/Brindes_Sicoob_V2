# Inventário de segredos e variáveis de ambiente

Gerado originalmente em 2026-09-13 por varredura dos acessos a variáveis e secrets.
Este inventário é histórico e não deve ser tratado como retrato atual sem comparação
com os workflows e a execução mais recente. Em 30/10/2026, a PR #176 confirmou
variáveis do projeto E2E ausentes (run [41099125007](https://github.com/adm01-debug/Brindes_Sicoob_V2/actions/runs/41099125007)).
Etapa 47 do [plano de 50 etapas](./plano-melhorias-50-etapas.md).

**Estado atual conhecido:** os identificadores/URL do projeto E2E estavam
ausentes no run acima. As demais credenciais de E2E e compliance não foram
verificadas nesta execução e não devem ser classificadas como ausentes sem
evidência do painel ou de um gate que as valide.

## Lidos pelas edge functions (`Deno.env.get`)

| Variável | Onde é lida (função) | Configurado em |
|---|---|---|
| `SUPABASE_URL` | várias (client admin) | Supabase (automático) |
| `SUPABASE_SERVICE_ROLE_KEY` | várias (client admin) | Supabase (automático) |
| `SUPABASE_ANON_KEY` | várias | Supabase (automático) |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` | build do frontend | segredo/configuração do provedor de hospedagem; usar `.env.production.example` somente como modelo local |
| `EXTERNAL_SUPABASE_URL` / `EXTERNAL_SUPABASE_SERVICE_KEY` | `categories-api`, `external-db-inspect` (catálogo externo) | **preencher** |
| `CRM_SUPABASE_URL` / `CRM_SUPABASE_ANON_KEY` / `CRM_SUPABASE_SERVICE_KEY` | `crm-db-bridge` | **preencher** |
| `BITRIX24_WEBHOOK_URL` | `bitrix-sync` | **preencher** |
| `CNPJA_API_KEY` | `cnpj-lookup` | **preencher** |
| `DROPBOX_ACCESS_TOKEN` | `dropbox-list` | **preencher** |
| `ELEVENLABS_API_KEY` | `elevenlabs-scribe-token`, `elevenlabs-tts` | **preencher** |
| `RESEND_API_KEY` | e-mail da fila de aprovações Sicoob e relatórios | **configuração remota ainda não verificada** |
| `NOTIFICATION_FROM_EMAIL` | endereço remetente do Resend na fila de aprovações; somente email, sem nome de exibição | **configuração remota ainda não verificada** |
| `SICOOB_APPROVAL_WORKER_SECRET` | autenticação HTTP dedicada do worker da outbox, sem transmitir a service role | **configuração remota ainda não verificada** |
| `INTERNAL_FUNCTION_SECRET` | `send-notification`, `process-batch-export`, `monthly-health-report` e `connections-auto-test`; autentica chamadas de cron/Edge antes de criar cliente service role | **configurar nas Edge Functions antes de publicar** |
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

O agendamento da outbox exige ainda dois segredos no Supabase Vault:
`sicoob_project_url` (URL base HTTPS do projeto) e
`sicoob_approval_worker_secret` (o mesmo valor de
`SICOOB_APPROVAL_WORKER_SECRET`). Sem ambos, o job permanece inerte, registra
um aviso e não realiza chamadas externas.

As quatro funções internas acima exigem o mesmo
`INTERNAL_FUNCTION_SECRET` no ambiente das Edge Functions e o cabeçalho
`x-sicoob-internal-secret` em cada chamada de cron ou de outra função. Sem o
segredo, elas respondem `503`; com credencial ausente ou inválida, respondem
`401`. O valor deve ser aleatório, exclusivo deste ambiente e nunca pode ser
enviado ao navegador ou versionado no repositório.

Os crons de exportações e de conexões usam a cópia desse valor no Vault com o nome
`sicoob_internal_function_secret`; os dois nomes devem conter exatamente o
mesmo segredo. A URL usada por esse cron é `sicoob_project_url`, também no
Vault. Sem os dois valores, o job apenas registra aviso e não faz chamada HTTP.

A evidência da assinatura pública exige o segredo
`quote_approval_evidence_hmac` no Supabase Vault, com pelo menos 32 caracteres
aleatórios. A chave não deve ser colocada em variáveis `VITE_*` nem no
repositório. Sem ela, respostas assinadas falham de forma fechada e a transação
do orçamento é revertida.

Para rotacionar, crie primeiro um segredo novo com nome versionado
`quote_approval_evidence_hmac_vN` e pelo menos 32 caracteres, depois invoque
`rotate_quote_approval_evidence_key()` por uma operação administrativa
confiável. As chaves antigas não podem ser apagadas enquanto existirem
assinaturas que as referenciem, pois são necessárias para verificar o histórico.

## Lidos pelo GitHub Actions (`secrets.*`)

| Variável | Workflow | Status |
|---|---|---|
| `E2E_SUPABASE_PROJECT_ID` | `e2e.yml` | ❌ Nome ausente na lista de secrets do repositório consultada; o preflight do run 41099125007 confirma que pelo menos uma das três variáveis do projeto estava vazia. Secrets organizacionais não foram auditados |
| `VITE_SUPABASE_PROJECT_ID` / `VITE_SUPABASE_URL` | `e2e.yml` | ✅ Nomes presentes na lista do repositório; valor, URL e correspondência com o projeto isolado não foram verificados |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `e2e.yml` | ⚠️ Requerida; disponibilidade não verificada porque o preflight parou nos identificadores/URL |
| `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` | `e2e.yml` | ⚠️ Requerida; estado não verificado no run atual |
| `E2E_VIEWER_EMAIL` / `E2E_VIEWER_PASSWORD` | `e2e.yml` | ⚠️ Requerida; estado não verificado no run atual |
| `E2E_MANAGER_EMAIL` / `E2E_MANAGER_PASSWORD` | `e2e.yml` | ⚠️ Requerida; estado não verificado no run atual |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` / `E2E_ADMIN_TOTP_SECRET` | `e2e.yml` | ⚠️ Requerida; estado não verificado no run atual |
| `E2E_DEV_EMAIL` / `E2E_DEV_PASSWORD` / `E2E_DEV_TOTP_SECRET` | `e2e.yml` | ⚠️ Requerida; estado não verificado no run atual |
| `E2E_CLEANUP_TOKEN` | `e2e.yml` | ⚠️ Requerida pelo workflow; estado não verificado no run atual |
| `SUPABASE_SERVICE_ROLE_KEY` | `e2e.yml`, `security-compliance.yml` | ⚠️ Requerida para verificações remotas; estado atual não verificado |
| `SUPABASE_ACCESS_TOKEN` | `migration-ledger-drift.yml`, `apply-sicoob-migrations.yml` | ✅ Nome presente no environment `construction`; os workflows devem ser executados por main protegida e o projeto alvo é validado separadamente |
| `CONSTRUCTION_SUPABASE_PROJECT_REF` | `apply-sicoob-migrations.yml` e workflows de deploy | ❌ Nome não encontrado nos secrets do repositório nem no environment `construction`; secrets organizacionais não foram auditados. Bloqueia a identificação explícita do projeto de construção |
| `SUPABASE_DB_URL` | Não consumido pelos workflows atuais de migrations/drift | ✅ Nome presente no repositório; não confundir com as credenciais atualmente usadas, que são `SUPABASE_ACCESS_TOKEN` e `CONSTRUCTION_SUPABASE_PROJECT_REF` |
| `RLS_TEST_USER_A_EMAIL` / `_PASSWORD` | `security-compliance.yml` | estado atual não verificado |
| `RLS_TEST_USER_B_EMAIL` / `_PASSWORD` | `security-compliance.yml` | estado atual não verificado |
| `RLS_TEST_PRIVATE_QUOTE_B_ID` | `security-compliance.yml` | estado atual não verificado |
| `LHCI_GITHUB_APP_TOKEN` | `lighthouse.yml` | estado atual não verificado |
| `GITHUB_TOKEN` | vários (automático do Actions) | automático, não precisa configurar |

## Como usar isto

1. Diferencie ausência do nome, valor vazio e valor incorreto. A API de nomes
   não revela valores, e esta consulta não incluiu secrets organizacionais.
2. Atualize este inventário quando os workflows ou o estado do ambiente mudarem.
3. Criar um verificador automatizado que compare acessos no código e YAML com
   este inventário continua sendo uma melhoria pendente.
