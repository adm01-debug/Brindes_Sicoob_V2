# Views


## public.catalog_marketing_term_usage (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=true |
| depende de | public.catalog_marketing_terms, public.catalog_product_marketing |
| populada | n/a |
| comentário | Opções editoriais ativas e quantidade real de produtos classificados. |


```sql
SELECT term.id,
    term.category,
    term.slug,
    term.name,
    term.description,
    term.sort_order,
    count(mapping.product_id) AS product_count
   FROM catalog_marketing_terms term
     LEFT JOIN catalog_product_marketing mapping ON mapping.term_id = term.id
  WHERE term.is_active
  GROUP BY term.id;
```

## public.sicoob_budget_audit (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.pa_budgets, public.postos_atendimento, public.sicoob_orders |
| populada | n/a |
| comentário |  |


```sql
SELECT pb.pa_id,
    pa.nome AS pa_nome,
    pb.ano,
    pb.mes,
    pb.verba_total,
    pb.verba_consumida AS verba_registrada,
    COALESCE(sum(so.total_amount), 0::numeric) AS verba_calculada_pedidos,
    pb.verba_consumida - COALESCE(sum(so.total_amount), 0::numeric) AS discrepancia
   FROM pa_budgets pb
     JOIN postos_atendimento pa ON pb.pa_id = pa.id
     LEFT JOIN sicoob_orders so ON so.pa_id = pb.pa_id AND (so.status = ANY (ARRAY['confirmed'::text, 'logistic'::text, 'completed'::text])) AND EXTRACT(year FROM so.created_at) = pb.ano::numeric AND EXTRACT(month FROM so.created_at) = pb.mes::numeric
  GROUP BY pb.id, pa.nome;
```

## public.telemetry_query_performance (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.query_telemetry |
| populada | n/a |
| comentário |  |


```sql
SELECT id,
    operation,
    table_name,
    duration_ms,
    severity,
    error_message,
    user_id,
    created_at
   FROM query_telemetry;
```

## public.v_full_scope_grants (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.profiles, public.step_up_audit_log |
| populada | n/a |
| comentário | Histórico completo de concessões de FULL scope (chaves MCP com escopo *). Restringida via RLS herdada de step_up_audit_log: apenas dev ou o próprio usuário. |


```sql
SELECT sual.id AS audit_id,
    sual.created_at AS granted_at,
    sual.user_id AS granted_to_user_id,
    p.full_name AS granted_to_name,
    audit_actor_email(sual.user_id)::character varying(255) AS granted_to_email,
    sual.action AS step_up_action,
    sual.metadata ->> 'operation'::text AS operation,
    (sual.metadata ->> 'key_id'::text)::uuid AS key_id,
    sual.metadata ->> 'key_prefix'::text AS key_prefix,
    (sual.metadata ->> 'expires_at'::text)::timestamp with time zone AS key_expires_at,
    sual.metadata ->> 'justification'::text AS justification,
    sual.challenge_id,
    sual.token_id,
    sual.ip_address,
    sual.user_agent,
    sual.metadata ->> 'request_id'::text AS request_id,
    sual.metadata -> 'verifications'::text AS verifications_applied,
    sual.metadata -> 'extra'::text AS extra
   FROM step_up_audit_log sual
     LEFT JOIN profiles p ON p.user_id = sual.user_id
  WHERE sual.event_type = 'full_scope_granted'::text;
```

## public.v_sicoob_hierarchy (view)

| campo | valor |
|---|---|
| owner | postgres |
| security_invoker | sim |
| opções | security_invoker=on |
| depende de | public.cooperativas, public.postos_atendimento, public.sicoob_centrais, public.sicoob_temas |
| populada | n/a |
| comentário |  |


```sql
SELECT c.id AS central_id,
    c.name AS central_name,
    c.primary_color AS central_color,
    s.id AS singular_id,
    s.nome AS singular_name,
    s.codigo AS singular_code,
    s.sicoob_tema_id AS tema_id,
    t.name AS tema_name,
    pa.id AS pa_id,
    pa.nome AS pa_name,
    pa.codigo AS pa_code
   FROM sicoob_centrais c
     JOIN cooperativas s ON s.central_id = c.id
     JOIN postos_atendimento pa ON pa.cooperativa_id = s.id
     LEFT JOIN sicoob_temas t ON s.sicoob_tema_id = t.id;
```
