-- A conciliação de verba comparava o débito registrado apenas com pedidos em
-- 'confirmed', 'logistic' e 'completed', enquanto o gatilho de verba
-- (validate_sicoob_order_budget) mantém o débito em produção, separação,
-- trânsito e entrega. Todo pedido nesses quatro estados virava divergência
-- falsa na auditoria: em produção, o PA TESTE 01 fechou out/2026 com
-- 30200 debitados contra 26300 somados (R$ 3.900,00 do pedido em produção).
CREATE OR REPLACE VIEW public.sicoob_budget_audit
WITH (security_invoker = on) AS
SELECT
    pb.pa_id,
    pa.nome as pa_nome,
    pb.ano,
    pb.mes,
    pb.verba_total,
    pb.verba_consumida as verba_registrada,
    COALESCE(SUM(so.total_amount), 0) as verba_calculada_pedidos,
    (pb.verba_consumida - COALESCE(SUM(so.total_amount), 0)) as discrepancia
FROM public.pa_budgets pb
JOIN public.postos_atendimento pa ON pb.pa_id = pa.id
LEFT JOIN public.sicoob_orders so ON so.pa_id = pb.pa_id
    AND so.status IN (
        'confirmed', 'logistic', 'in_production', 'in_separation',
        'in_transit', 'delivered', 'completed'
    )
    AND EXTRACT(YEAR FROM so.created_at) = pb.ano
    AND EXTRACT(MONTH FROM so.created_at) = pb.mes
GROUP BY pb.id, pa.nome;
