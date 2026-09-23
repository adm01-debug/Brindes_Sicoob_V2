-- Fecha o isolamento de leitura do domínio Sicoob e torna a fila de
-- exportações determinística, recuperável e privada por usuário.

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_read_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), p_order_id);
$$;

REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_read_order(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_read_order(uuid) TO authenticated;

DROP POLICY IF EXISTS "sicoob_shipment_read_in_order_scope" ON public.sicoob_order_shipments;
CREATE POLICY "sicoob_shipment_read_in_order_scope"
  ON public.sicoob_order_shipments FOR SELECT TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id));

DROP POLICY IF EXISTS "sicoob_invoices_read_in_order_scope" ON public.sicoob_order_invoices;
CREATE POLICY "sicoob_invoices_read_in_order_scope"
  ON public.sicoob_order_invoices FOR SELECT TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id));

DROP POLICY IF EXISTS "sicoob_payments_read_in_order_scope" ON public.sicoob_order_payments;
CREATE POLICY "sicoob_payments_read_in_order_scope"
  ON public.sicoob_order_payments FOR SELECT TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id));

DROP POLICY IF EXISTS "sicoob_artwork_read_in_order_scope" ON public.sicoob_order_artwork_versions;
CREATE POLICY "sicoob_artwork_read_in_order_scope"
  ON public.sicoob_order_artwork_versions FOR SELECT TO authenticated
  USING (public.sicoob_current_actor_can_read_order(order_id));

DROP POLICY IF EXISTS "sicoob_order_documents_read_in_order_scope" ON storage.objects;
CREATE POLICY "sicoob_order_documents_read_in_order_scope"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'sicoob-order-documents'
    AND name ~ '^[0-9a-fA-F-]+/.+'
    AND public.sicoob_current_actor_can_read_order(split_part(name, '/', 1)::uuid)
  );

-- `user_roles` não tem created_at. O UUID fornece desempate estável para a
-- seleção do ator técnico sem alterar a preferência pelo solicitante.
CREATE OR REPLACE FUNCTION public.sync_external_connections_from_credentials(
  _trigger_secret_name text DEFAULT NULL,
  _trigger_op text DEFAULT 'manual',
  _trigger_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  _system_uid uuid;
  _env_keys text[] := ARRAY['promobrind', 'crm'];
  _env_key text;
  _url_name text;
  _anon_name text;
  _svc_name text;
  _has_url boolean;
  _has_svc boolean;
  _status text;
  _name text;
  _processed int := 0;
  _created int := 0;
  _updated int := 0;
  _is_insert boolean;
  _start timestamptz := clock_timestamp();
  _result jsonb;
  _err text;
BEGIN
  SELECT user_id INTO _system_uid
  FROM public.user_roles
  WHERE role IN ('dev', 'supervisor', 'admin', 'manager')
  ORDER BY CASE WHEN user_id = _trigger_user_id THEN 0 ELSE 1 END, user_id ASC
  LIMIT 1;

  IF _system_uid IS NULL THEN
    INSERT INTO public.external_connections_sync_log (
      triggered_by_user_id, triggered_by_secret_name, trigger_op,
      processed, created_count, updated_count, status, error_message, duration_ms
    ) VALUES (
      _trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'),
      0, 0, 0, 'no_admin', 'no_privileged_system_actor',
      EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int
    );
    RETURN jsonb_build_object('ok', false, 'reason', 'no_privileged_system_actor');
  END IF;

  BEGIN
    FOREACH _env_key IN ARRAY _env_keys LOOP
      _url_name := 'EXTERNAL_' || upper(_env_key) || '_URL';
      _anon_name := 'EXTERNAL_' || upper(_env_key) || '_ANON_KEY';
      _svc_name := 'EXTERNAL_' || upper(_env_key) || '_SERVICE_ROLE_KEY';
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _url_name AND length > 0) INTO _has_url;
      SELECT EXISTS (SELECT 1 FROM public.integration_credentials WHERE secret_name = _svc_name AND length > 0) INTO _has_svc;
      _status := CASE WHEN _has_url AND _has_svc THEN 'active' ELSE 'unconfigured' END;
      _name := CASE _env_key WHEN 'promobrind' THEN 'Catálogo Promobrind' WHEN 'crm' THEN 'CRM Promobrind' ELSE initcap(_env_key) END;
      SELECT NOT EXISTS (SELECT 1 FROM public.external_connections WHERE env_key = _env_key AND type = 'supabase') INTO _is_insert;
      INSERT INTO public.external_connections (type, name, env_key, config, secret_refs, status, created_by)
      VALUES ('supabase', _name, _env_key, jsonb_build_object('mirrored_from', 'integration_credentials'), ARRAY[_url_name, _anon_name, _svc_name], _status, _system_uid)
      ON CONFLICT (env_key, type) WHERE env_key IS NOT NULL DO UPDATE
      SET status = EXCLUDED.status, secret_refs = EXCLUDED.secret_refs, name = EXCLUDED.name, updated_at = now();
      IF _is_insert THEN _created := _created + 1; ELSE _updated := _updated + 1; END IF;
      _processed := _processed + 1;
    END LOOP;
    INSERT INTO public.external_connections_sync_log (triggered_by_user_id, triggered_by_secret_name, trigger_op, processed, created_count, updated_count, status, duration_ms, details)
    VALUES (_trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'), _processed, _created, _updated, 'ok', EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int, jsonb_build_object('env_keys', _env_keys));
    _result := jsonb_build_object('ok', true, 'processed', _processed, 'created', _created, 'updated', _updated, 'ran_at', now());
    RETURN _result;
  EXCEPTION WHEN OTHERS THEN
    _err := SQLERRM;
    INSERT INTO public.external_connections_sync_log (triggered_by_user_id, triggered_by_secret_name, trigger_op, processed, created_count, updated_count, status, error_message, duration_ms)
    VALUES (_trigger_user_id, _trigger_secret_name, COALESCE(_trigger_op, 'manual'), _processed, _created, _updated, 'error', _err, EXTRACT(MILLISECONDS FROM (clock_timestamp() - _start))::int);
    RAISE;
  END;
END;
$function$;

ALTER TABLE public.export_jobs ADD COLUMN IF NOT EXISTS file_path text;
CREATE INDEX IF NOT EXISTS idx_export_jobs_pending_claim
  ON public.export_jobs (created_at, id)
  WHERE status IN ('pending', 'failed');

INSERT INTO storage.buckets (id, name, public)
VALUES ('exports', 'exports', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "export_files_read_by_owner" ON storage.objects;
CREATE POLICY "export_files_read_by_owner" ON storage.objects
FOR SELECT TO authenticated USING (
  bucket_id = 'exports'
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE OR REPLACE FUNCTION public.claim_sicoob_export_jobs(p_limit integer DEFAULT 5)
RETURNS SETOF public.export_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT id FROM public.export_jobs
    WHERE status IN ('pending', 'failed')
      AND attempts < COALESCE(max_attempts, 3)
    ORDER BY created_at ASC, id ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 5), 25))
  )
  UPDATE public.export_jobs job
  SET status = 'processing', attempts = COALESCE(job.attempts, 0) + 1,
      error_message = NULL, updated_at = now()
  FROM candidates
  WHERE job.id = candidates.id
  RETURNING job.*;
END;
$function$;

CREATE OR REPLACE FUNCTION public.retry_own_sicoob_export_job(p_job_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE = '42501'; END IF;
  UPDATE public.export_jobs
  SET status = 'pending', attempts = 0, error_message = NULL, updated_at = now()
  WHERE id = p_job_id AND user_id = auth.uid() AND status = 'failed';
  IF NOT FOUND THEN RAISE EXCEPTION 'export_job_not_retryable' USING ERRCODE = '42501'; END IF;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_due_sicoob_scheduled_exports()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE item public.scheduled_exports%ROWTYPE; count_created integer := 0;
BEGIN
  IF auth.role() <> 'service_role' THEN RAISE EXCEPTION 'service_role_required' USING ERRCODE = '42501'; END IF;
  FOR item IN
    SELECT * FROM public.scheduled_exports
    WHERE is_active = true AND COALESCE(next_run_at, created_at, now()) <= now()
    ORDER BY COALESCE(next_run_at, created_at), id
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.export_jobs (user_id, entity_type, export_type, filters, status)
    VALUES (item.user_id, item.entity_type, item.export_type, item.filters, 'pending');
    UPDATE public.scheduled_exports SET last_run_at = now(), next_run_at = now() + CASE item.frequency
      WHEN 'daily' THEN interval '1 day' WHEN 'weekly' THEN interval '1 week' ELSE interval '1 month' END,
      updated_at = now() WHERE id = item.id;
    count_created := count_created + 1;
  END LOOP;
  RETURN count_created;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sicoob_export_orders_for_actor(p_actor_id uuid, p_filters jsonb DEFAULT '{}'::jsonb)
RETURNS SETOF public.sicoob_orders
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.* FROM public.sicoob_orders o
  WHERE public.sicoob_actor_can_manage_fulfillment(p_actor_id, o.id)
    AND (NULLIF(p_filters->>'status', '') IS NULL OR o.status = p_filters->>'status')
    AND (NULLIF(p_filters->>'start_date', '') IS NULL OR o.created_at >= (p_filters->>'start_date')::timestamptz)
    AND (NULLIF(p_filters->>'end_date', '') IS NULL OR o.created_at < ((p_filters->>'end_date')::date + 1)::timestamptz)
  ORDER BY o.created_at DESC, o.id;
$$;

REVOKE ALL ON FUNCTION public.claim_sicoob_export_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_due_sicoob_scheduled_exports() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sicoob_export_orders_for_actor(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retry_own_sicoob_export_job(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_sicoob_export_jobs(integer), public.enqueue_due_sicoob_scheduled_exports(), public.sicoob_export_orders_for_actor(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_own_sicoob_export_job(uuid) TO authenticated;
