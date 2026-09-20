# Verificação de `VITE_SENTRY_DSN` — Etapa 18, 17/09/2026

**Sem acesso à env var real de produção nesta sessão** — só evidência indireta no repositório.

- `.env.production` (versionado): contém `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY`/`VITE_SUPABASE_ANON_KEY`/`VITE_SUPABASE_PROJECT_ID`. **Não contém `VITE_SENTRY_DSN`** — esperado, já que é secret e não deveria ir para um arquivo versionado.
- `.env.e2e.example`: não menciona Sentry.
- `.lovable/memory/infrastructure/hardening-roadmap.md` (memória de uma sessão anterior de IA, **não é fato verificado, é auto-relato**): linha 56, seção "Wire-ups" — *"Sentry: `VITE_SENTRY_DSN` em Build Secrets ativa em produção."* O mesmo documento se autodeclara "Score final: 10/10" em várias "ondas" de hardening — trato isso como **claim não verificado**, no mesmo espírito de não confiar cegamente em documentação anterior que já orientou esta auditoria inteira (ex.: a Etapa 9 do plano principal já achou casos de rótulo "código morto" que na verdade estavam ao vivo).

**Conclusão:** há evidência de que alguém configurou `VITE_SENTRY_DSN` via "Build Secrets" da plataforma de deploy (Lovable/Vercel), mas isso não foi confirmado de forma independente nesta sessão (exigiria acesso ao painel de secrets do ambiente de produção, fora do meu alcance). `error-reporter.ts` está de fato escrito para usar Sentry quando o DSN existir — o código-fonte do lado do cliente está correto; o que falta confirmar é só a variável de ambiente do lado do deploy.

**Recomendação para quem decide a Etapa 18 do plano de correções:** confirmar no painel de Build Secrets antes de decidir entre remover a escrita em `error_logs` (se Sentry realmente estiver ativo) ou priorizar a configuração do DSN (se não estiver).
