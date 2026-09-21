# Etapa 26 — Views `sicoob_budget_audit` e `v_full_scope_grants` → proposta pra `AuditEvidenceDashboard.tsx`

Ambas confirmadas com `security_invoker=on` (seguro expor). Schema real (via `pg_views`):

## `sicoob_budget_audit`
```sql
SELECT pb.pa_id, pa.nome AS pa_nome, pb.ano, pb.mes, pb.verba_total,
  pb.verba_consumida AS verba_registrada,
  COALESCE(sum(so.total_amount), 0) AS verba_calculada_pedidos,
  (pb.verba_consumida - COALESCE(sum(so.total_amount), 0)) AS discrepancia
FROM pa_budgets pb
JOIN postos_atendimento pa ON pb.pa_id = pa.id
LEFT JOIN sicoob_orders so ON so.pa_id = pb.pa_id
  AND so.status = ANY (ARRAY['confirmed','logistic','completed'])
  AND extract(year FROM so.created_at) = pb.ano
  AND extract(month FROM so.created_at) = pb.mes
GROUP BY pb.id, pa.nome;
```
Reconciliação financeira: verba registrada vs. soma real de pedidos confirmados/logísticos/concluídos no período, com `discrepancia` calculada. **Proposta de card:** tabela "Reconciliação de verba por PA" — colunas PA, período, verba total, verba registrada, verba calculada, discrepância (destacar em vermelho se `discrepancia != 0`). Encaixa na mesma seção onde `rls_denial_log` já foi corrigido.

## `v_full_scope_grants`
```sql
SELECT sual.id AS audit_id, sual.created_at AS granted_at, sual.user_id AS granted_to_user_id,
  p.full_name AS granted_to_name, u.email AS granted_to_email, sual.action AS step_up_action,
  metadata->>'operation' AS operation, (metadata->>'key_id')::uuid AS key_id,
  metadata->>'key_prefix' AS key_prefix, (metadata->>'expires_at')::timestamptz AS key_expires_at,
  metadata->>'justification' AS justification, sual.challenge_id, sual.token_id,
  sual.ip_address, sual.user_agent, metadata->>'request_id' AS request_id,
  metadata->'verifications' AS verifications_applied, metadata->'extra' AS extra
FROM step_up_audit_log sual
LEFT JOIN profiles p ON p.id = sual.user_id
LEFT JOIN auth.users u ON u.id = sual.user_id
WHERE sual.event_type = 'full_scope_granted';
```
Trilha de auditoria de **concessão de escopo total** via step-up auth (quem recebeu acesso elevado, quando, de qual IP, com qual justificativa, pra qual chave/operação). Dado sensível — card deveria ser restrito a admin/dev. **Proposta de card:** tabela "Concessões de escopo total" — usuário, e-mail, quando, IP, justificativa, chave afetada, prazo de expiração.

## Não implementado nesta sessão
UI real é trabalho de frontend maior que uma correção mecânica — fica como especificação pronta pra quem for implementar (schema + proposta de card já resolvidos, só falta o componente React).
