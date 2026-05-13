# 📑 Revisão de SLAs e Acordos de Serviço

Documento de revisão trimestral das metas de performance e disponibilidade.

## SLAs Vigentes (Q2 2026)

| Funcionalidade | Meta de Latência (P95) | Disponibilidade |
|---|---|---|
| Autenticação (AAL1/AAL2) | < 800ms | 99.9% |
| Quote Builder (Save/Update) | < 1200ms | 99.5% |
| Product Search (Bridge) | < 600ms | 99.0% |
| PDF Generation | < 3000ms | 98.5% |

## Procedimento de Review
1. **Mensal**: Auditoria dos relatórios do Sentry e Telemetria de Bridge.
2. **Trimestral**: Reajuste de thresholds de `slow-query` no bridge conforme evolução do banco externo.
3. **Anual**: Revisão total da infraestrutura com stakeholders.

## Penalidades e Notificações
- Falhas em SLAs críticos por > 2h consecutivas disparam alertas SMS para a equipe de infraestrutura.
- Relatórios de performance são enviados automaticamente para `management@promogifts.com.br` todo dia 01 do mês.
