-- Validações para pa_budgets
ALTER TABLE public.pa_budgets 
ADD CONSTRAINT check_positive_verba_total CHECK (verba_total >= 0),
ADD CONSTRAINT check_positive_verba_consumida CHECK (verba_consumida >= 0),
ADD CONSTRAINT check_positive_limite_alcada CHECK (limite_alcada >= 0);

-- Validações para sicoob_approval_requests
ALTER TABLE public.sicoob_approval_requests
ADD CONSTRAINT check_positive_amount CHECK (amount_at_request >= 0),
ADD CONSTRAINT check_positive_threshold CHECK (threshold_at_request >= 0);

-- Validações para sicoob_orders
ALTER TABLE public.sicoob_orders
ADD CONSTRAINT check_positive_total CHECK (total_amount >= 0);

-- Validações para sicoob_order_items
ALTER TABLE public.sicoob_order_items
ADD CONSTRAINT check_positive_unit_price CHECK (unit_price >= 0),
ADD CONSTRAINT check_positive_quantity CHECK (quantity > 0);
