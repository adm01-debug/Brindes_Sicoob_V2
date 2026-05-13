-- Step 1: Rename the old table, its primary key and indexes
ALTER TABLE public.admin_audit_log RENAME TO admin_audit_log_old;
ALTER TABLE public.admin_audit_log_old RENAME CONSTRAINT admin_audit_log_pkey TO admin_audit_log_old_pkey;

ALTER INDEX IF EXISTS idx_admin_audit_log_action RENAME TO idx_admin_audit_log_old_action;
ALTER INDEX IF EXISTS idx_admin_audit_log_created_at RENAME TO idx_admin_audit_log_old_created_at;
ALTER INDEX IF EXISTS idx_admin_audit_log_request_id RENAME TO idx_admin_audit_log_old_request_id;
ALTER INDEX IF EXISTS idx_admin_audit_log_resource_lookup RENAME TO idx_admin_audit_log_old_resource_lookup;
ALTER INDEX IF EXISTS idx_admin_audit_log_user_id RENAME TO idx_admin_audit_log_old_user_id;
ALTER INDEX IF EXISTS idx_admin_audit_log_status RENAME TO idx_admin_audit_log_old_status;
ALTER INDEX IF EXISTS idx_admin_audit_log_source RENAME TO idx_admin_audit_log_old_source;

-- Step 2: Create the new partitioned table
CREATE TABLE public.admin_audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    request_id TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status TEXT,
    payload_summary JSONB DEFAULT '{}'::jsonb,
    source TEXT,
    CONSTRAINT admin_audit_log_partitioned_pkey PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Step 3: Create initial partitions
CREATE TABLE public.admin_audit_log_y2024 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE public.admin_audit_log_y2025 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE public.admin_audit_log_y2026_m01 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE public.admin_audit_log_y2026_m02 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE public.admin_audit_log_y2026_m03 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE public.admin_audit_log_y2026_m04 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE public.admin_audit_log_y2026_m05 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE public.admin_audit_log_y2026_m06 PARTITION OF public.admin_audit_log
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- Default partition
CREATE TABLE public.admin_audit_log_default PARTITION OF public.admin_audit_log DEFAULT;

-- Step 4: Re-create indexes
CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log (action);
CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_log_request_id ON public.admin_audit_log (request_id) WHERE request_id IS NOT NULL;
CREATE INDEX idx_admin_audit_log_resource_lookup ON public.admin_audit_log (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_admin_audit_log_user_id ON public.admin_audit_log (user_id);
CREATE INDEX idx_admin_audit_log_status ON public.admin_audit_log (status, created_at DESC) WHERE status IS NOT NULL;
CREATE INDEX idx_admin_audit_log_source ON public.admin_audit_log (source, created_at DESC) WHERE status IS NOT NULL;

-- Step 5: Enable RLS and re-create policies
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can insert audit logs" ON public.admin_audit_log
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Supervisors can view audit logs" ON public.admin_audit_log
    FOR SELECT USING (is_supervisor_or_above(auth.uid()));

CREATE POLICY "admins_view_audit_log" ON public.admin_audit_log
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ));

-- Step 6: Migrate existing data
INSERT INTO public.admin_audit_log 
SELECT * FROM public.admin_audit_log_old;
