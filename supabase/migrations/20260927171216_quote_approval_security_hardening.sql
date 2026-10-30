-- Fecha os caminhos de escrita direta que contornavam as decisões
-- transacionais de orçamento. O portal ainda permite editar rascunhos, mas
-- status, aprovação, alçada e histórico de governança passam exclusivamente
-- pelas RPCs abaixo.

ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'revision';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'viewed';
ALTER TYPE public.quote_status ADD VALUE IF NOT EXISTS 'converted';

ALTER TABLE public.discount_approval_requests
  ADD COLUMN IF NOT EXISTS requested_quote_row_version integer,
  ADD COLUMN IF NOT EXISTS requested_real_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS approved_quote_row_version integer;

ALTER TABLE public.discount_approval_requests
  DROP CONSTRAINT IF EXISTS discount_approval_requested_percent_range,
  DROP CONSTRAINT IF EXISTS discount_approval_max_percent_range;

ALTER TABLE public.discount_approval_requests
  ADD CONSTRAINT discount_approval_requested_percent_range
    CHECK (requested_discount_percent >= 0 AND requested_discount_percent <= 100),
  ADD CONSTRAINT discount_approval_max_percent_range
    CHECK (max_allowed_percent >= 0 AND max_allowed_percent <= 100);

CREATE UNIQUE INDEX IF NOT EXISTS discount_approval_one_pending_per_quote_idx
  ON public.discount_approval_requests (quote_id)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.can_manage_quote_scope(
  p_actor_id uuid,
  p_quote_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT p_actor_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = p_quote_id
        AND (
          EXISTS (
            SELECT 1
            FROM public.user_roles ur
            WHERE ur.user_id = p_actor_id
              AND ur.role IN ('admin'::public.app_role, 'dev'::public.app_role)
          )
          OR (
            EXISTS (
              SELECT 1
              FROM public.user_roles ur
              WHERE ur.user_id = p_actor_id
                AND ur.role IN ('manager'::public.app_role, 'supervisor'::public.app_role)
            )
            AND (
              (q.organization_id IS NOT NULL AND q.organization_id IN (
                SELECT public.get_user_org_ids(p_actor_id)
              ))
              OR q.singular_id = (
                SELECT p.cooperativa_id FROM public.profiles p
                WHERE p.user_id = p_actor_id
                LIMIT 1
              )
              OR q.pa_id = (
                SELECT p.pa_id FROM public.profiles p
                WHERE p.user_id = p_actor_id
                LIMIT 1
              )
            )
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.user_id = p_actor_id
              AND p.cooperativa_id = q.singular_id
              AND p.role IN ('comprador_singular', 'gestor_compras')
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.can_manage_quote_scope(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_quote_scope(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF current_setting('app.quote_governance_write', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status, 'draft') <> 'draft'
       OR NEW.approved_by IS NOT NULL
       OR NEW.approved_at IS NOT NULL
       OR NEW.approved_pdf_url IS NOT NULL
       OR NEW.rejection_notes IS NOT NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'A criação de orçamento deve iniciar como rascunho.';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_pdf_url IS DISTINCT FROM OLD.approved_pdf_url
     OR NEW.rejection_notes IS DISTINCT FROM OLD.rejection_notes
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.singular_id IS DISTINCT FROM OLD.singular_id THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS aaa_guard_quote_governance_write ON public.quotes;
CREATE TRIGGER aaa_guard_quote_governance_write
BEFORE INSERT OR UPDATE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_governance_write();

CREATE OR REPLACE FUNCTION public.validate_quote_real_discount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_markup numeric := COALESCE(NEW.negotiation_markup_percent, 0);
  v_apparent_pct numeric := COALESCE(NEW.discount_percent, 0);
  v_presented numeric := COALESCE(NEW.subtotal, 0);
  v_real_sub numeric;
  v_final numeric;
  v_real_pct numeric;
  v_max_allowed numeric;
  v_is_admin boolean;
BEGIN
  v_real_sub := CASE WHEN v_markup > 0
    THEN v_presented / (1 + v_markup / 100)
    ELSE v_presented
  END;
  v_final := v_presented * (1 - v_apparent_pct / 100);
  v_real_pct := CASE WHEN v_real_sub > 0
    THEN ROUND(((v_real_sub - v_final) / v_real_sub) * 100, 2)
    ELSE 0
  END;

  NEW.real_subtotal := ROUND(v_real_sub, 2);
  NEW.real_discount_percent := v_real_pct;

  -- Rascunhos podem conter uma proposta acima da alçada para que o vendedor
  -- consiga corrigir uma recusa. A regra é exigida quando o orçamento avança.
  IF current_setting('app.quote_discount_approval_commit', true) IS DISTINCT FROM 'true'
     AND NEW.status IN ('pending', 'sent', 'approved')
     AND NEW.seller_id IS NOT NULL
     AND v_real_pct > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.seller_id AND role = 'admin'
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
      SELECT max_discount_percent INTO v_max_allowed
      FROM public.seller_discount_limits
      WHERE user_id = NEW.seller_id;

      IF v_max_allowed IS NOT NULL AND v_real_pct > v_max_allowed
         AND NOT EXISTS (
           SELECT 1
           FROM public.discount_approval_requests dar
           WHERE dar.quote_id = NEW.id
             AND dar.status = 'approved'
             AND dar.requested_real_discount_percent = v_real_pct
             AND TG_OP = 'UPDATE'
             AND dar.approved_quote_row_version = OLD.row_version
         ) THEN
        RAISE EXCEPTION
          'Desconto real (%.2f%%) excede o limite do vendedor e não possui aprovação vigente.',
          v_real_pct
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP POLICY IF EXISTS "dar_insert_scope" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "dar_update_scope" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "dar_delete_scope" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "dar_select_scope" ON public.discount_approval_requests;
CREATE POLICY "dar_select_scope" ON public.discount_approval_requests
FOR SELECT TO authenticated
USING (
  seller_id = (SELECT auth.uid())
  OR public.can_manage_quote_scope((SELECT auth.uid()), quote_id)
);

REVOKE INSERT, UPDATE, DELETE ON public.discount_approval_requests FROM anon, authenticated;

DROP POLICY IF EXISTS "quote_history_insert_actor" ON public.quote_history;
DROP POLICY IF EXISTS "quote_history_select_scope" ON public.quote_history;
CREATE POLICY "quote_history_select_scope"
ON public.quote_history FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = quote_history.quote_id
      AND (
        q.seller_id = (SELECT auth.uid())
        OR public.can_manage_quote_scope((SELECT auth.uid()), q.id)
      )
  )
);
REVOKE INSERT, UPDATE, DELETE ON public.quote_history FROM anon, authenticated;

DROP POLICY IF EXISTS "Singular Buyers can approve quotes" ON public.quotes;

-- O PDF assinado fica privado e precisa pertencer a um orçamento que o ator
-- realmente pode consultar. A regra também impede gravar objetos arbitrários
-- no bucket apenas por estar autenticado.
DROP POLICY IF EXISTS "proposals_select_owner_or_admin" ON storage.objects;
DROP POLICY IF EXISTS "proposals_quote_scope_select" ON storage.objects;
DROP POLICY IF EXISTS "proposals_quote_scope_insert" ON storage.objects;
DROP POLICY IF EXISTS "proposals_quote_scope_update" ON storage.objects;

CREATE POLICY "proposals_quote_scope_select" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'proposals'
  AND (
    owner = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = CASE
        WHEN (storage.foldername(name))[1] = 'quotes'
         AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN (storage.foldername(name))[2]::uuid
        ELSE NULL
      END
        AND (q.seller_id = (SELECT auth.uid())
          OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
    )
  )
);

CREATE POLICY "proposals_quote_scope_insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] = 'quotes'
  AND EXISTS (
    SELECT 1
    FROM public.quotes q
    WHERE q.id = CASE
      WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (storage.foldername(name))[2]::uuid
      ELSE NULL
    END
      AND (q.seller_id = (SELECT auth.uid())
        OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
  )
);

CREATE POLICY "proposals_quote_scope_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] = 'quotes'
  AND EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = CASE
      WHEN (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (storage.foldername(name))[2]::uuid
      ELSE NULL
    END
      AND (q.seller_id = (SELECT auth.uid())
        OR public.can_manage_quote_scope((SELECT auth.uid()), q.id))
  )
)
WITH CHECK (
  bucket_id = 'proposals'
  AND (storage.foldername(name))[1] = 'quotes'
);

CREATE OR REPLACE FUNCTION public.assert_quote_transition(
  p_actor_id uuid,
  p_quote public.quotes,
  p_new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_is_seller boolean := p_quote.seller_id = p_actor_id;
  v_is_manager boolean := public.can_manage_quote_scope(p_actor_id, p_quote.id);
  v_is_singular_buyer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = p_actor_id
      AND p.cooperativa_id = p_quote.singular_id
      AND p.role IN ('comprador_singular', 'gestor_compras')
  ) INTO v_is_singular_buyer;

  IF p_quote.deleted_at IS NOT NULL OR COALESCE(p_quote.is_latest_version, true) IS NOT TRUE THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O orçamento não está disponível para transição.';
  END IF;

  IF p_quote.status::text = p_new_status THEN
    RETURN;
  END IF;

  IF v_is_seller AND (
    (p_quote.status::text IN ('draft', 'rejected', 'rejected_singular', 'expired') AND p_new_status = 'draft')
    OR (p_quote.status::text = 'draft' AND p_new_status IN ('pending', 'sent', 'pending_singular_approval'))
    OR (p_quote.status::text = 'pending' AND p_new_status = 'sent')
  ) THEN
    RETURN;
  END IF;

  IF v_is_manager AND p_new_status = 'rejected'
     AND p_quote.status::text IN ('pending', 'sent') THEN
    RETURN;
  END IF;

  IF (v_is_singular_buyer OR v_is_manager)
     AND p_quote.status::text = 'pending_singular_approval'
     AND p_new_status IN ('approved_singular', 'rejected_singular') THEN
    RETURN;
  END IF;

  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'A transição de status não é permitida para este ator e orçamento.';
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_quote_transition(uuid, public.quotes, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_quote_transition(uuid, public.quotes, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_quote_history_note(
  p_quote_id uuid,
  p_action text,
  p_description text,
  p_field_changed text DEFAULT NULL,
  p_old_value text DEFAULT NULL,
  p_new_value text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_history_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF p_action NOT IN (
    'created', 'updated', 'item_added', 'item_removed', 'item_updated',
    'pdf_generated', 'pdf_exported_bulk', 'sync_started', 'sync_error',
    'sync_success', 'note'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tipo de anotação não permitido.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = p_quote_id
      AND (q.seller_id = v_actor_id OR public.can_manage_quote_scope(v_actor_id, q.id))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem acesso ao orçamento.';
  END IF;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, v_actor_id, p_action, left(p_description, 2000),
    p_field_changed, p_old_value, p_new_value, COALESCE(p_metadata, '{}'::jsonb)
  ) RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.append_quote_history_note(uuid, text, text, text, text, text, jsonb)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_quote_history_note(uuid, text, text, text, text, text, jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.request_discount_approval_atomic(
  p_quote_id uuid,
  p_expected_quote_row_version integer,
  p_requested_discount_percent numeric,
  p_seller_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid,
  quote_id uuid,
  seller_id uuid,
  quote_row_version integer,
  requested_discount_percent numeric,
  max_allowed_percent numeric,
  negotiation_markup_percent numeric,
  real_discount_percent numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_request public.discount_approval_requests%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_max_allowed_percent numeric;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação necessária.';
  END IF;
  IF p_expected_quote_row_version IS NULL
     OR p_requested_discount_percent IS NULL
     OR p_requested_discount_percent < 0
     OR p_requested_discount_percent > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de aprovação inválidos.';
  END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Orçamento não encontrado.';
  END IF;
  IF v_quote.seller_id IS DISTINCT FROM v_actor_id
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.status::text NOT IN ('draft', 'pending') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento não pode solicitar aprovação neste estado.';
  END IF;
  IF p_requested_discount_percent IS DISTINCT FROM v_quote.real_discount_percent THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O percentual solicitado deve corresponder ao desconto real do orçamento.';
  END IF;

  SELECT max_discount_percent INTO v_max_allowed_percent
  FROM public.seller_discount_limits
  WHERE user_id = v_actor_id;
  IF v_max_allowed_percent IS NULL OR v_max_allowed_percent < 0 OR v_max_allowed_percent > 100 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Limite de desconto do vendedor não configurado.';
  END IF;
  IF p_requested_discount_percent <= v_max_allowed_percent THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'O desconto não exige aprovação adicional.';
  END IF;

  INSERT INTO public.discount_approval_requests (
    quote_id, seller_id, requested_discount_percent, max_allowed_percent,
    seller_notes, requested_quote_row_version, requested_real_discount_percent
  ) VALUES (
    p_quote_id, v_actor_id, p_requested_discount_percent, v_max_allowed_percent,
    p_seller_notes, v_quote.row_version, v_quote.real_discount_percent
  ) RETURNING * INTO v_request;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes
  SET status = 'pending_approval', row_version = row_version + 1, updated_at = now()
  WHERE id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    p_quote_id, v_actor_id, 'discount_approval_requested',
    format('Solicitação de desconto real de %s%%', p_requested_discount_percent),
    'status', v_quote.status::text, 'pending_approval',
    jsonb_build_object('request_id', v_request.id, 'max_allowed_percent', v_max_allowed_percent,
      'requested_quote_row_version', v_quote.row_version,
      'requested_real_discount_percent', v_quote.real_discount_percent)
  );

  RETURN QUERY SELECT v_request.id, v_updated.id, v_request.seller_id,
    v_updated.row_version, v_request.requested_discount_percent,
    v_request.max_allowed_percent, v_quote.negotiation_markup_percent,
    v_quote.real_discount_percent;
END;
$function$;

CREATE OR REPLACE FUNCTION public.respond_discount_approval_atomic(
  p_request_id uuid,
  p_expected_quote_row_version integer,
  p_approved boolean,
  p_admin_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid,
  quote_id uuid,
  seller_id uuid,
  quote_row_version integer,
  requested_discount_percent numeric,
  max_allowed_percent numeric,
  request_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_request public.discount_approval_requests%ROWTYPE;
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_new_status text := CASE WHEN p_approved THEN 'pending' ELSE 'draft' END;
BEGIN
  IF v_actor_id IS NULL OR p_expected_quote_row_version IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Autenticação e versão esperada são obrigatórias.';
  END IF;

  SELECT * INTO v_request FROM public.discount_approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Solicitação de desconto não encontrada.';
  END IF;
  SELECT * INTO v_quote FROM public.quotes WHERE id = v_request.quote_id FOR UPDATE;
  IF NOT FOUND OR NOT public.can_manage_quote_scope(v_actor_id, v_request.quote_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Sem alçada para responder esta solicitação.';
  END IF;
  SELECT * INTO v_request FROM public.discount_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF v_request.status <> 'pending'
     OR v_quote.status::text <> 'pending_approval'
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.real_discount_percent IS DISTINCT FROM v_request.requested_real_discount_percent
     OR v_request.requested_quote_row_version + 1 IS DISTINCT FROM v_quote.row_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A solicitação não corresponde mais ao orçamento atual.';
  END IF;

  UPDATE public.discount_approval_requests
  SET status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
      admin_id = v_actor_id, admin_notes = p_admin_notes, responded_at = now(),
      approved_quote_row_version = CASE WHEN p_approved THEN v_quote.row_version + 1 ELSE NULL END,
      updated_at = now()
  WHERE id = p_request_id;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  PERFORM set_config('app.quote_discount_approval_commit', 'true', true);
  UPDATE public.quotes
  SET status = v_new_status::public.quote_status, row_version = row_version + 1, updated_at = now()
  WHERE id = v_quote.id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_quote.id, v_actor_id,
    CASE WHEN p_approved THEN 'discount_approved' ELSE 'discount_rejected' END,
    CASE WHEN p_approved THEN 'Desconto aprovado pelo responsável' ELSE 'Desconto rejeitado pelo responsável' END,
    'status', 'pending_approval', v_new_status,
    jsonb_build_object('request_id', v_request.id, 'admin_notes', p_admin_notes)
  );

  RETURN QUERY SELECT v_request.id, v_updated.id, v_request.seller_id,
    v_updated.row_version, v_request.requested_discount_percent,
    v_request.max_allowed_percent, CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.bulk_update_quote_status_atomic(
  p_quote_ids uuid[],
  p_expected_row_versions integer[],
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
  v_index integer;
BEGIN
  IF v_actor_id IS NULL
     OR cardinality(p_quote_ids) IS NULL
     OR cardinality(p_quote_ids) NOT BETWEEN 1 AND 100
     OR cardinality(p_quote_ids) <> cardinality(p_expected_row_versions)
     OR p_status NOT IN (
       'draft', 'pending', 'sent', 'rejected', 'expired',
       'pending_singular_approval',
       'approved_singular', 'rejected_singular'
     )
     OR (SELECT count(DISTINCT quote_id) FROM unnest(p_quote_ids) AS quote_id) <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de transição inválidos.';
  END IF;
  IF p_status = 'approved' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A aprovação final exige PDF assinado.';
  END IF;

  PERFORM 1 FROM public.quotes q WHERE q.id = ANY(p_quote_ids) ORDER BY q.id FOR UPDATE;
  IF (SELECT count(*) FROM public.quotes q WHERE q.id = ANY(p_quote_ids)) <> cardinality(p_quote_ids) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Um ou mais orçamentos não foram encontrados.';
  END IF;

  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_ids[v_index];
    IF v_quote.row_version IS DISTINCT FROM p_expected_row_versions[v_index] THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Um ou mais orçamentos foram modificados.';
    END IF;
    PERFORM public.assert_quote_transition(v_actor_id, v_quote, p_status);
  END LOOP;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  FOR v_index IN SELECT generate_subscripts(p_quote_ids, 1)
  LOOP
    SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_ids[v_index];
    UPDATE public.quotes q
    SET status = p_status::public.quote_status,
        rejection_notes = CASE WHEN p_status IN ('rejected', 'rejected_singular') THEN p_notes ELSE NULL END,
        approved_at = CASE WHEN p_status = 'approved_singular' THEN now() ELSE q.approved_at END,
        approved_by = CASE WHEN p_status = 'approved_singular' THEN v_actor_id ELSE q.approved_by END,
        row_version = q.row_version + 1,
        updated_at = now()
    WHERE q.id = v_quote.id
    RETURNING * INTO v_updated;

    INSERT INTO public.quote_history (
      quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
    ) VALUES (
      v_updated.id, v_actor_id, 'status_changed',
      format('Status alterado de "%s" para "%s"', v_quote.status, p_status),
      'status', v_quote.status, p_status, jsonb_build_object('notes', p_notes, 'bulk', true)
    );
    RETURN QUERY SELECT v_updated.id, v_updated.status::text, v_updated.row_version;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_quote_with_pdf_atomic(
  p_quote_id uuid,
  p_expected_quote_row_version integer,
  p_approved_pdf_url text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer, approved_pdf_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id uuid := auth.uid();
  v_quote public.quotes%ROWTYPE;
  v_updated public.quotes%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL OR p_expected_quote_row_version IS NULL
     OR p_approved_pdf_url IS NULL
     OR p_approved_pdf_url !~ '^quotes/[0-9a-fA-F-]+/[^/]+[.]pdf$'
     OR length(p_approved_pdf_url) > 1024 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Parâmetros de aprovação inválidos.';
  END IF;
  SELECT * INTO v_quote FROM public.quotes q WHERE q.id = p_quote_id FOR UPDATE;
  IF NOT FOUND
     OR NOT public.can_manage_quote_scope(v_actor_id, p_quote_id)
     OR v_quote.row_version IS DISTINCT FROM p_expected_quote_row_version
     OR v_quote.status::text NOT IN ('pending', 'sent')
     OR v_quote.deleted_at IS NOT NULL
     OR COALESCE(v_quote.is_latest_version, true) IS NOT TRUE
     OR p_approved_pdf_url !~ ('^quotes/' || v_quote.id::text || '/') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'O orçamento não pode ser aprovado com este documento.';
  END IF;

  PERFORM set_config('app.quote_governance_write', 'true', true);
  UPDATE public.quotes
  SET status = 'approved', approved_pdf_url = p_approved_pdf_url,
      approved_by = v_actor_id, approved_at = now(),
      row_version = quotes.row_version + 1, updated_at = now()
  WHERE quotes.id = p_quote_id
  RETURNING * INTO v_updated;

  INSERT INTO public.quote_history (
    quote_id, user_id, action, description, field_changed, old_value, new_value, metadata
  ) VALUES (
    v_updated.id, v_actor_id, 'quote_approved_with_pdf',
    'Orçamento aprovado com PDF assinado', 'status', v_quote.status::text, 'approved',
    jsonb_build_object('approved_pdf_path', p_approved_pdf_url, 'notes', p_notes)
  );
  RETURN QUERY SELECT v_updated.id, v_updated.status::text, v_updated.row_version, v_updated.approved_pdf_url;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text) TO authenticated;
