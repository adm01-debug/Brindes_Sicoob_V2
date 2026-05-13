# Disaster Recovery (DR) Plan — Promo Gifts

## 1. Estratégia de Backup
* **Supabase PITR:** Point-in-time recovery ativo (30 dias).
* **Snapshots Diários:** Exportação de dados críticos para Storage secundário.

## 2. RTO & RPO (Metas)
* **RPO (Recovery Point Objective):** 5 minutos (perda máxima de dados).
* **RTO (Recovery Time Objective):** 2 horas (tempo máximo para restabelecer serviço).

## 3. Cenários de Falha
### Cenário A: Indisponibilidade Regional (Supabase)
* **Ação:** Lovable Cloud gerencia o failover de infraestrutura.
* **Comunicação:** Status page disparada via Sentry.

### Cenário B: Corrupção de Dados / Deleção Acidental
* **Ação:** Restore via PITR para timestamp imediatamente anterior ao incidente.

## 4. Procedimento de Recuperação de Emergência
1. Identificar o incidente e declarar estado de emergência.
2. Isolar o ambiente (Enable Maintenance Mode via feature flag `MAINTENANCE_MODE`).
3. Executar o restore (via Supabase Dashboard ou CLI).
4. Validar integridade via `/admin/qa/preflight`.
5. Reativar tráfego gradualmente.
