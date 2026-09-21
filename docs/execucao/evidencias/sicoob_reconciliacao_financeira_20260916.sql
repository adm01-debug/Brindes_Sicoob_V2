-- Etapa 27 — consulta de reconciliação financeira versionada.
-- Compara o total do pedido (sicoob_orders.total_amount) com a soma dos
-- pagamentos confirmados (sicoob_order_payments, status='paid'). Qualquer
-- linha com discrepancia != 0 é um caso a investigar manualmente.
-- Seguro para rodar a qualquer momento (somente leitura).

select
  o.id as order_id,
  o.total_amount,
  coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as total_pago,
  o.total_amount - coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) as discrepancia
from public.sicoob_orders o
left join public.sicoob_order_payments p on p.order_id = o.id
group by o.id, o.total_amount
having o.total_amount - coalesce(sum(p.amount) filter (where p.status = 'paid'), 0) <> 0;

-- Estado em 16/09/2026: ambiente sem pedidos reais (sicoob_orders = 0 linhas),
-- consulta retorna vazio por ausência de dados, não por reconciliação
-- comprovada em volume. Rodar de novo após a Etapa 16 (seed) ou em produção
-- real para ter evidência com dados.
