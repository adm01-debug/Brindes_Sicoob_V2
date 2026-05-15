-- Performance Indices
CREATE INDEX IF NOT EXISTS idx_order_logistics_order_id ON public.order_logistics(order_id);
CREATE INDEX IF NOT EXISTS idx_order_invoices_order_id ON public.order_invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_order_comments_order_id ON public.order_comments(order_id);
CREATE INDEX IF NOT EXISTS idx_order_comments_parent_id ON public.order_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_user_id ON public.telemetry_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_logs_created_at ON public.telemetry_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_item_logs_order_id ON public.sicoob_order_item_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_sicoob_order_item_logs_item_id ON public.sicoob_order_item_logs(item_id);

-- Partitioned audit log indices (for current/recent months)
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_y2026_m05_created_at ON public.admin_audit_log_y2026_m05(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_y2026_m06_created_at ON public.admin_audit_log_y2026_m06(created_at DESC);
