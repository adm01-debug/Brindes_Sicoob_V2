ALTER TABLE public.admin_audit_log 
ADD COLUMN previous_hash TEXT,
ADD COLUMN current_hash TEXT;

CREATE INDEX idx_admin_audit_log_current_hash ON public.admin_audit_log(current_hash);
