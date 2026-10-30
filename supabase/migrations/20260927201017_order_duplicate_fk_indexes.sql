-- Índices das FKs que não são prefixo do índice idempotente composto.
CREATE INDEX IF NOT EXISTS idx_order_duplicate_requests_source_order
  ON public.order_duplicate_requests (source_order_id);

CREATE INDEX IF NOT EXISTS idx_order_duplicate_requests_duplicated_order
  ON public.order_duplicate_requests (duplicated_order_id);
