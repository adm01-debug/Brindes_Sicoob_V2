# 🛡️ Cronograma de Segurança e Monitoramento

Este documento define o plano de manutenção preventiva de longo prazo.

## 1. Monitoramento de Uptime (Externo)
Recomendamos a configuração de um serviço externo (Better Stack, Checkly ou UptimeRobot) para monitorar os seguintes endpoints:
1. **Frontend**: `https://promogifts.com.br` (Status 200)
2. **Bridge Catalog**: `https://<ref>.supabase.co/functions/v1/external-db-bridge` (POST /ping)
3. **CRM Bridge**: `https://<ref>.supabase.co/functions/v1/crm-db-bridge` (POST /ping)

### Meta (SLA)
- **Uptime**: 99.9%
- **Tempo de Resposta**: < 500ms (P90)

## 2. Pen Tests (Testes de Intrusão)
Meta: Realizar teste de intrusão externo trimestralmente.

| Período | Foco | Status |
|---|---|---|
| Q2 2026 | Bypass de RLS e Escalação de Privilégios | Agendado |
| Q3 2026 | Sanitização de Entradas (XSS/SQLi) | Pendente |
| Q4 2026 | Vulnerabilidades em Dependências (Supply Chain) | Pendente |

## 3. Rotação de Credenciais
Seguir o [Runbook de Rotação de Credenciais](docs/RUNBOOKS/CREDENTIAL_ROTATION.md) a cada 6 meses ou em caso de turnover na equipe de engenharia.
