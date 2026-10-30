# Plano de Segurança e Monitoramento

Revisado em 30/10/2026. As metas abaixo são planejamento; o repositório não contém evidência de contratação, agendamento ou conclusão dos testes externos.

## 1. Monitoramento de uptime (proposta)
Avaliar serviço externo para monitorar endpoints de cada ambiente. Os endereços de produção e a configuração de monitoramento precisam ser confirmados antes de habilitar sondas:
1. **Frontend**: domínio do ambiente a confirmar com o responsável pelo provedor antes de configurar a sonda; `promogifts.com.br` não está confirmado como endpoint deste projeto.
2. **Bridge Catalog**: validar rota e método suportados em `external-db-bridge` antes de criar uma sonda; não há endpoint `/ping` confirmado.
3. **CRM Bridge**: validar rota e método suportados em `crm-db-bridge` antes de criar uma sonda; não há endpoint `/ping` confirmado.

### Meta proposta (não é SLA vigente)
- **Uptime**: 99.9%
- **Tempo de Resposta**: < 500ms (P90)

## 2. Pen Tests (Testes de Intrusão)
Meta: Realizar teste de intrusão externo trimestralmente.

| Período planejado | Foco | Situação em 30/10/2026 |
|---|---|---|
| Q2 2026 | Bypass de RLS e Escalação de Privilégios | Sem evidência de execução; período encerrado |
| Q3 2026 | Sanitização de Entradas (XSS/SQLi) | Sem evidência de execução; período encerrado |
| Q4 2026 | Vulnerabilidades em Dependências (Supply Chain) | Planejado; evidência de execução ainda não registrada |

## 3. Rotação de Credenciais
Seguir o [Runbook de Rotação de Credenciais](RUNBOOKS/CREDENTIAL_ROTATION.md) conforme política aprovada. A cadência semestral é uma recomendação e não comprova que houve rotação.
