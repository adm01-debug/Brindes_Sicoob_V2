-- Índices para sicoob_orders (Filtros críticos e RLS)
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_cooperative_id ON public.sicoob_orders (cooperative_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_pa_id ON public.sicoob_orders (pa_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_created_by ON public.sicoob_orders (created_by);
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_status ON public.sicoob_orders (status);

-- Índices para sicoob_order_items (Detail view performance)
CREATE INDEX IF NOT EXISTS idx_sicoob_order_items_order_id ON public.sicoob_order_items (order_id);

-- Índices para sicoob_order_history (Timeline performance)
CREATE INDEX IF NOT EXISTS idx_sicoob_order_history_order_id ON public.sicoob_order_history (order_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_history_created_at ON public.sicoob_order_history (created_at DESC);

-- B-tree index para busca por ID (usado no OrdersPage)
CREATE INDEX IF NOT EXISTS idx_sicoob_orders_id_text ON public.sicoob_orders (id);
