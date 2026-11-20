# EDG-24 — Relatórios agendados: UI cria, ninguém envia

- Origem: E-mail / notificação (Edge Functions e integrações)
- Status auditoria: ORFA | Prioridade: P2 | Esforco: M
- Impacto no negocio: gestor agenda relatório e não recebe; se ligado como está, pode receber dados de outros vendedores.

## Estado real conferido

PARCIAL - filtro por dono IMPLEMENTADO: send-scheduled-reports/index.ts:133,160 filtra `seller_id = user_id`; process-scheduled-reports/index.ts:55,87 aplica getScheduledReportOwnerFilter(report.user_id); _shared/scheduled-report-email.ts:36,77-87 rejeita chave ausente, erro HTTP e recibo invalido antes de confirmar envio. PENDENTE (NAO VERIFICADO): consolidação/remetente Sicoob, ativacao do scheduling real e tipos faltantes.

## O que falta (auditoria)

nao duplicar as funcoes; confirmar remetente Sicoob e ativacao do agendamento (cron) ponta a ponta; implementar tipos faltantes.

## Camadas afetadas

- 

## Regras de negocio

- ver `docs/agentes/regras-dominio.md`

## Raio de impacto

- 

## Dependencias

- 

## Criterio de aceite

- 

## Estado final

- NAO INICIADO
