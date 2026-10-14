-- Encapsula os escritores autorizados pelo gate de governança e congela o
-- conteúdo comercial fora dos estados de edição. Os wrappers restauram o
-- contexto mesmo quando o núcleo lança erro.

ALTER FUNCTION public.convert_quote_to_sicoob_order(uuid)
  RENAME TO convert_quote_to_sicoob_order_core_20261013;
REVOKE ALL ON FUNCTION public.convert_quote_to_sicoob_order_core_20261013(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.convert_quote_to_sicoob_order(p_quote_id uuid)
RETURNS TABLE(id uuid, order_number text, status text, total_amount numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY
    SELECT result.id, result.order_number, result.status, result.total_amount
    FROM public.convert_quote_to_sicoob_order_core_20261013(p_quote_id) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$;

REVOKE ALL ON FUNCTION public.convert_quote_to_sicoob_order(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_sicoob_order(uuid)
  TO authenticated, service_role;

ALTER FUNCTION public.create_quote_version_atomic(uuid)
  RENAME TO create_quote_version_atomic_core_20261013;
REVOKE ALL ON FUNCTION public.create_quote_version_atomic_core_20261013(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.create_quote_version_atomic(p_source_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
  v_result uuid;
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    v_result := public.create_quote_version_atomic_core_20261013(p_source_quote_id);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_quote_version_atomic(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_version_atomic(uuid)
  TO authenticated, service_role;

ALTER FUNCTION public.apply_local_quote_approval_response(
  text, text, text, text, text, text, text, text
)
  RENAME TO apply_local_quote_approval_response_core_20261013;
REVOKE ALL ON FUNCTION public.apply_local_quote_approval_response_core_20261013(
  text, text, text, text, text, text, text, text
)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.apply_local_quote_approval_response(
  _token text,
  _response text,
  _response_notes text,
  _signer_name text,
  _signer_document text,
  _signature_data_url text,
  _signer_ip text,
  _signer_user_agent text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_previous_context text := current_setting('app.quote_governance_write', true);
  v_result boolean;
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    v_result := public.apply_local_quote_approval_response_core_20261013(
      _token,
      _response,
      _response_notes,
      _signer_name,
      _signer_document,
      _signature_data_url,
      _signer_ip,
      _signer_user_agent
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
  RETURN v_result;
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_local_quote_approval_response(
  text, text, text, text, text, text, text, text
)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_local_quote_approval_response(
  text, text, text, text, text, text, text, text
)
  TO service_role;

-- Demais RPCs transacionais que escrevem campos protegidos recebem o mesmo
-- invólucro: núcleo inacessível, contexto temporário e restauração também em
-- erro. Cada núcleo mantém suas validações de ator, alçada, lock e versão.
ALTER FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  RENAME TO bulk_update_quote_status_atomic_core_20261013;
REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic_core_20261013(uuid[], integer[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.bulk_update_quote_status_atomic(
  p_quote_ids uuid[], p_expected_row_versions integer[], p_status text,
  p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT result.id, result.status, result.row_version
    FROM public.bulk_update_quote_status_atomic_core_20261013(
      p_quote_ids, p_expected_row_versions, p_status, p_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bulk_update_quote_status_atomic(uuid[], integer[], text, text)
  TO authenticated, service_role;

ALTER FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text)
  RENAME TO approve_quote_with_pdf_atomic_core_20261013;
REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic_core_20261013(uuid, integer, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.approve_quote_with_pdf_atomic(
  p_quote_id uuid, p_expected_quote_row_version integer,
  p_approved_pdf_url text, p_notes text DEFAULT NULL
)
RETURNS TABLE(id uuid, status text, row_version integer, approved_pdf_url text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT result.id, result.status, result.row_version, result.approved_pdf_url
    FROM public.approve_quote_with_pdf_atomic_core_20261013(
      p_quote_id, p_expected_quote_row_version, p_approved_pdf_url, p_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_quote_with_pdf_atomic(uuid, integer, text, text)
  TO authenticated, service_role;

ALTER FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text)
  RENAME TO request_discount_approval_atomic_core_20261013;
REVOKE ALL ON FUNCTION public.request_discount_approval_atomic_core_20261013(uuid, integer, numeric, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.request_discount_approval_atomic(
  p_quote_id uuid, p_expected_quote_row_version integer,
  p_requested_discount_percent numeric, p_seller_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid, quote_id uuid, seller_id uuid, quote_row_version integer,
  requested_discount_percent numeric, max_allowed_percent numeric,
  negotiation_markup_percent numeric, real_discount_percent numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT
      result.request_id, result.quote_id, result.seller_id, result.quote_row_version,
      result.requested_discount_percent, result.max_allowed_percent,
      result.negotiation_markup_percent, result.real_discount_percent
    FROM public.request_discount_approval_atomic_core_20261013(
      p_quote_id, p_expected_quote_row_version,
      p_requested_discount_percent, p_seller_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_discount_approval_atomic(uuid, integer, numeric, text)
  TO authenticated, service_role;

ALTER FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text)
  RENAME TO respond_discount_approval_atomic_core_20261013;
REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic_core_20261013(uuid, integer, boolean, text)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.respond_discount_approval_atomic(
  p_request_id uuid, p_expected_quote_row_version integer,
  p_approved boolean, p_admin_notes text DEFAULT NULL
)
RETURNS TABLE(
  request_id uuid, quote_id uuid, seller_id uuid, quote_row_version integer,
  requested_discount_percent numeric, max_allowed_percent numeric,
  request_status text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public
AS $function$
DECLARE v_previous_context text := current_setting('app.quote_governance_write', true);
BEGIN
  PERFORM set_config('app.quote_governance_write', 'true', true);
  BEGIN
    RETURN QUERY SELECT
      result.request_id, result.quote_id, result.seller_id, result.quote_row_version,
      result.requested_discount_percent, result.max_allowed_percent, result.request_status
    FROM public.respond_discount_approval_atomic_core_20261013(
      p_request_id, p_expected_quote_row_version, p_approved, p_admin_notes
    ) AS result;
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
    RAISE;
  END;
  PERFORM set_config('app.quote_governance_write', COALESCE(v_previous_context, ''), true);
END;
$function$;
REVOKE ALL ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_discount_approval_atomic(uuid, integer, boolean, text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_quote_governance_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_commercial_keys constant text[] := ARRAY[
    'quote_number', 'client_id', 'client_name', 'client_email', 'client_phone',
    'client_company', 'client_cnpj', 'subtotal', 'discount_percent',
    'discount_amount', 'total', 'notes', 'payment_terms', 'delivery_time',
    'shipping_type', 'shipping_cost', 'internal_notes', 'valid_until',
    'negotiation_markup_percent', 'real_subtotal', 'real_discount_percent',
    'suggested_modifications', 'tags', 'total_cost', 'row_version'
  ];
  v_old_commercial jsonb;
  v_new_commercial jsonb;
  v_call_context text;
  v_table_owner name := pg_catalog.pg_get_userbyid((
    SELECT relation.relowner
    FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = TG_RELID
  ));
BEGIN
  GET DIAGNOSTICS v_call_context = PG_CONTEXT;

  IF current_setting('app.quote_governance_write', true) = 'true'
     AND current_user = v_table_owner THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF NOT COALESCE(OLD.is_latest_version, true)
       OR OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Um orçamento enviado ou decidido não pode ser excluído; preserve seu histórico.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.status::text, 'draft') <> 'draft'
       OR NEW.approved_by IS NOT NULL
       OR NEW.approved_at IS NOT NULL
       OR NEW.approved_pdf_url IS NOT NULL
       OR NEW.rejection_notes IS NOT NULL
       OR NEW.client_response IS NOT NULL
       OR NEW.client_response_at IS NOT NULL
       OR NEW.client_response_notes IS NOT NULL
       OR NEW.sent_at IS NOT NULL
       OR NEW.deleted_at IS NOT NULL
       OR NEW.parent_quote_id IS NOT NULL
       OR NEW.consolidation_id IS NOT NULL
       OR (
         (
           NEW.reorder_source_order_id IS NOT NULL
           OR NEW.reorder_source_quote_id IS NOT NULL
           OR NEW.catalog_revalidated_at IS NOT NULL
           OR NEW.catalog_valid_until IS NOT NULL
           OR COALESCE(NEW.reorder_price_changed_items, 0) <> 0
         )
         AND NOT (
           current_user = v_table_owner
           AND current_setting('app.sicoob_reorder_operation', true) = 'create'
         )
       )
       OR COALESCE(NEW.catalog_stock_is_reserved, false) IS TRUE
       OR NEW.version IS DISTINCT FROM 1
       OR NEW.row_version IS DISTINCT FROM 1
       OR NEW.is_latest_version IS DISTINCT FROM true
       OR NEW.is_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'A criação de orçamento deve iniciar como rascunho canônico, sem decisão ou histórico forjado.';
    END IF;
    RETURN NEW;
  END IF;

  -- A consolidação histórica é SECURITY DEFINER e já valida papel, Singular,
  -- elegibilidade e locks. Ela só pode preencher o vínculo uma vez e não pode
  -- aproveitar esta exceção estreita para alterar qualquer outro campo.
  IF TG_OP = 'UPDATE'
     AND current_user = v_table_owner
     AND OLD.status::text = 'approved_singular'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND OLD.consolidation_id IS NULL
     AND NEW.consolidation_id IS NOT NULL
     AND (to_jsonb(NEW) - ARRAY['consolidation_id', 'updated_at'])
         IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['consolidation_id', 'updated_at']) THEN
    RETURN NEW;
  END IF;

  -- A recompra originada de pedido primeiro reutiliza a RPC transacional
  -- legada e, em seguida, anexa o snapshot vigente do catálogo ao rascunho
  -- recém-criado. A exceção exige a pilha real da RPC SECURITY DEFINER e
  -- limita a alteração exatamente aos campos de linhagem e validade.
  IF TG_OP = 'UPDATE'
     AND current_user = v_table_owner
     AND v_call_context ~ 'PL/pgSQL function (public\.)?reorder_sicoob_order_as_quote\('
     AND OLD.reorder_source_order_id IS NULL
     AND OLD.reorder_source_quote_id IS NULL
     AND OLD.catalog_revalidated_at IS NULL
     AND NEW.reorder_source_order_id IS NOT NULL
     AND NEW.reorder_source_quote_id IS NULL
     AND NEW.catalog_revalidated_at IS NOT NULL
     AND NEW.catalog_valid_until > NEW.catalog_revalidated_at
     AND COALESCE(NEW.catalog_stock_is_reserved, false) IS FALSE
     AND COALESCE(NEW.reorder_price_changed_items, 0) >= 0
     AND (to_jsonb(NEW) - ARRAY[
           'reorder_source_order_id', 'catalog_revalidated_at',
           'catalog_valid_until', 'catalog_stock_is_reserved',
           'reorder_price_changed_items', 'updated_at'
         ]) IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY[
           'reorder_source_order_id', 'catalog_revalidated_at',
           'catalog_valid_until', 'catalog_stock_is_reserved',
           'reorder_price_changed_items', 'updated_at'
         ]) THEN
    RETURN NEW;
  END IF;

  -- A remoção de um usuário no Auth aciona a FK histórica
  -- quotes.seller_id ON DELETE SET NULL. A atualização acontece em um trigger
  -- referencial aninhado, com a identidade do proprietário da tabela. Aceita-se
  -- somente essa nulificação e nenhuma outra alteração no orçamento.
  IF TG_OP = 'UPDATE'
     AND pg_trigger_depth() > 1
     AND current_user = v_table_owner
     AND OLD.seller_id IS NOT NULL
     AND NEW.seller_id IS NULL
     AND (to_jsonb(NEW) - ARRAY['seller_id', 'updated_at'])
         IS NOT DISTINCT FROM
         (to_jsonb(OLD) - ARRAY['seller_id', 'updated_at']) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_pdf_url IS DISTINCT FROM OLD.approved_pdf_url
     OR NEW.rejection_notes IS DISTINCT FROM OLD.rejection_notes
     OR NEW.client_response IS DISTINCT FROM OLD.client_response
     OR NEW.client_response_at IS DISTINCT FROM OLD.client_response_at
     OR NEW.client_response_notes IS DISTINCT FROM OLD.client_response_notes
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.parent_quote_id IS DISTINCT FROM OLD.parent_quote_id
     OR NEW.is_latest_version IS DISTINCT FROM OLD.is_latest_version
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (
       NEW.updated_at IS DISTINCT FROM OLD.updated_at
       AND NOT (
         current_setting('app.quote_atomic_save', true) = 'true'
         AND v_call_context ~ 'PL/pgSQL function (public\.)?save_quote_atomic\('
         AND COALESCE(OLD.is_latest_version, true)
         AND OLD.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular')
       )
     )
     OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
     OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     OR NEW.is_active IS DISTINCT FROM OLD.is_active
     OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.singular_id IS DISTINCT FROM OLD.singular_id
     OR NEW.consolidation_id IS DISTINCT FROM OLD.consolidation_id
     OR NEW.reorder_source_order_id IS DISTINCT FROM OLD.reorder_source_order_id
     OR NEW.reorder_source_quote_id IS DISTINCT FROM OLD.reorder_source_quote_id
     OR NEW.catalog_revalidated_at IS DISTINCT FROM OLD.catalog_revalidated_at
     OR NEW.catalog_valid_until IS DISTINCT FROM OLD.catalog_valid_until
     OR NEW.catalog_stock_is_reserved IS DISTINCT FROM OLD.catalog_stock_is_reserved
     OR NEW.reorder_price_changed_items IS DISTINCT FROM OLD.reorder_price_changed_items THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Campos de governança do orçamento só podem ser alterados por fluxo autorizado.';
  END IF;

  IF NOT COALESCE(OLD.is_latest_version, true)
     OR OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      INTO v_old_commercial
    FROM jsonb_each(to_jsonb(OLD)) AS entry
    WHERE entry.key = ANY(v_commercial_keys);

    SELECT COALESCE(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
      INTO v_new_commercial
    FROM jsonb_each(to_jsonb(NEW)) AS entry
    WHERE entry.key = ANY(v_commercial_keys);

    IF v_new_commercial IS DISTINCT FROM v_old_commercial THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'O conteúdo comercial de um orçamento enviado ou decidido é imutável.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_quote_governance_write()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS aaa_guard_quote_governance_write ON public.quotes;
CREATE TRIGGER aaa_guard_quote_governance_write
BEFORE INSERT OR UPDATE OR DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_governance_write();

CREATE OR REPLACE FUNCTION public.assert_quote_content_editable(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_status text;
  v_is_latest boolean;
BEGIN
  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'O item precisa pertencer a um orçamento válido.';
  END IF;

  SELECT q.status::text, COALESCE(q.is_latest_version, true)
    INTO v_status, v_is_latest
  FROM public.quotes q
  WHERE q.id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Orçamento do item não encontrado.';
  END IF;

  IF NOT v_is_latest
     OR v_status NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Os itens de um orçamento enviado ou decidido são imutáveis; crie uma nova versão para alterá-los.';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_quote_content_editable(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.guard_quote_item_content_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = OLD.quote_id) THEN
      PERFORM public.assert_quote_content_editable(OLD.quote_id);
    ELSIF pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Orçamento do item não encontrado.';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    PERFORM public.assert_quote_content_editable(OLD.quote_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.quote_id IS DISTINCT FROM OLD.quote_id) THEN
    PERFORM public.assert_quote_content_editable(NEW.quote_id);
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_quote_item_content_write()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS aaa_guard_quote_item_content_write ON public.quote_items;
CREATE TRIGGER aaa_guard_quote_item_content_write
BEFORE INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_item_content_write();

CREATE OR REPLACE FUNCTION public.guard_quote_personalization_content_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_old_quote_id uuid;
  v_new_quote_id uuid;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT qi.quote_id INTO v_old_quote_id
    FROM public.quote_items qi
    WHERE qi.id = OLD.quote_item_id;

    -- Na exclusão em cascata o item pai já não é visível. A exclusão dele foi
    -- validada pelo gatilho de quote_items antes de iniciar a cascata.
    IF FOUND THEN
      PERFORM public.assert_quote_content_editable(v_old_quote_id);
    ELSIF TG_OP <> 'DELETE' OR pg_trigger_depth() <= 1 THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Item de orçamento da personalização não encontrado.';
    END IF;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE')
     AND (TG_OP = 'INSERT' OR NEW.quote_item_id IS DISTINCT FROM OLD.quote_item_id) THEN
    SELECT qi.quote_id INTO v_new_quote_id
    FROM public.quote_items qi
    WHERE qi.id = NEW.quote_item_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '23503',
        MESSAGE = 'Item de orçamento da personalização não encontrado.';
    END IF;
    PERFORM public.assert_quote_content_editable(v_new_quote_id);
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_quote_personalization_content_write()
  FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS aaa_guard_quote_personalization_content_write
  ON public.quote_item_personalizations;
CREATE TRIGGER aaa_guard_quote_personalization_content_write
BEFORE INSERT OR UPDATE OR DELETE ON public.quote_item_personalizations
FOR EACH ROW EXECUTE FUNCTION public.guard_quote_personalization_content_write();

-- Uma revisão ou rejeição volta explicitamente a rascunho antes de novo envio.
-- Isso mantém a trilha de status coerente com a edição comercial liberada.
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
  SELECT public.sicoob_actor_is_active(p_actor_id)
    AND EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = p_quote_id
        AND (
          public.has_role(p_actor_id, 'admin'::public.app_role)
          OR public.has_role(p_actor_id, 'dev'::public.app_role)
          OR (
            (
              public.has_role(p_actor_id, 'manager'::public.app_role)
              OR public.has_role(p_actor_id, 'supervisor'::public.app_role)
            )
            AND (
              (q.organization_id IS NOT NULL AND q.organization_id IN (
                SELECT public.get_user_org_ids(p_actor_id)
              ))
              OR q.singular_id = (
                SELECT p.cooperativa_id
                FROM public.profiles p
                WHERE p.user_id = p_actor_id
                  AND p.is_active IS TRUE
                  AND p.deleted_at IS NULL
                LIMIT 1
              )
              OR q.pa_id = (
                SELECT p.pa_id
                FROM public.profiles p
                WHERE p.user_id = p_actor_id
                  AND p.is_active IS TRUE
                  AND p.deleted_at IS NULL
                LIMIT 1
              )
            )
          )
          OR (
            (
              public.has_role(p_actor_id, 'comprador_singular'::public.app_role)
              OR public.has_role(p_actor_id, 'gestor_compras'::public.app_role)
            )
            AND EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE p.user_id = p_actor_id
                AND p.cooperativa_id = q.singular_id
                AND p.is_active IS TRUE
                AND p.deleted_at IS NULL
            )
          )
        )
    );
$function$;

REVOKE ALL ON FUNCTION public.can_manage_quote_scope(uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_manage_quote_scope(uuid, uuid)
  TO authenticated;

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
  v_actor_is_active boolean := public.sicoob_actor_is_active(p_actor_id);
  v_is_seller boolean := v_actor_is_active AND p_quote.seller_id = p_actor_id;
  v_is_manager boolean := public.can_manage_quote_scope(p_actor_id, p_quote.id);
  v_is_singular_buyer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    WHERE profile.user_id = p_actor_id
      AND profile.cooperativa_id = p_quote.singular_id
      AND profile.is_active IS TRUE
      AND profile.deleted_at IS NULL
      AND (
        public.has_role(p_actor_id, 'comprador_singular'::public.app_role)
        OR public.has_role(p_actor_id, 'gestor_compras'::public.app_role)
      )
  ) INTO v_is_singular_buyer;

  IF p_quote.deleted_at IS NOT NULL
     OR COALESCE(p_quote.is_latest_version, true) IS NOT TRUE THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'O orçamento não está disponível para transição.';
  END IF;

  IF p_quote.status::text = p_new_status THEN
    RETURN;
  END IF;

  IF v_is_seller AND (
    (p_quote.status::text IN ('draft', 'revision', 'rejected', 'rejected_singular', 'expired')
      AND p_new_status = 'draft')
    OR (p_quote.status::text = 'draft'
      AND p_new_status IN ('pending', 'sent', 'pending_singular_approval'))
    OR (p_quote.status::text = 'pending' AND p_new_status = 'sent')
  ) THEN
    RETURN;
  END IF;

  IF v_is_manager
     AND p_new_status = 'rejected'
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

REVOKE ALL ON FUNCTION public.assert_quote_transition(uuid, public.quotes, text)
  FROM PUBLIC, anon, authenticated, service_role;

DO $postflight$
BEGIN
  IF has_function_privilege('anon',
       'public.convert_quote_to_sicoob_order_core_20261013(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.convert_quote_to_sicoob_order_core_20261013(uuid)', 'EXECUTE')
     OR has_function_privilege('service_role',
       'public.convert_quote_to_sicoob_order_core_20261013(uuid)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.apply_local_quote_approval_response_core_20261013(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.apply_local_quote_approval_response_core_20261013(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR has_function_privilege('service_role',
       'public.apply_local_quote_approval_response_core_20261013(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR has_function_privilege('anon',
       'public.create_quote_version_atomic_core_20261013(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.create_quote_version_atomic_core_20261013(uuid)', 'EXECUTE')
     OR has_function_privilege('service_role',
       'public.create_quote_version_atomic_core_20261013(uuid)',
       'EXECUTE')
     OR has_function_privilege('anon',
       'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
     OR has_function_privilege('service_role',
       'public.assert_quote_transition(uuid,public.quotes,text)', 'EXECUTE')
     OR EXISTS (
       SELECT 1
       FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS external_role(name)
       CROSS JOIN (VALUES
         ('public.bulk_update_quote_status_atomic_core_20261013(uuid[],integer[],text,text)'::regprocedure),
         ('public.approve_quote_with_pdf_atomic_core_20261013(uuid,integer,text,text)'::regprocedure),
         ('public.request_discount_approval_atomic_core_20261013(uuid,integer,numeric,text)'::regprocedure),
         ('public.respond_discount_approval_atomic_core_20261013(uuid,integer,boolean,text)'::regprocedure)
       ) AS internal_routine(oid)
       WHERE has_function_privilege(external_role.name, internal_routine.oid, 'EXECUTE')
     ) THEN
    RAISE EXCEPTION 'Os núcleos internos mantiveram EXECUTE indevido.';
  END IF;

  IF has_function_privilege('anon',
       'public.convert_quote_to_sicoob_order(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.convert_quote_to_sicoob_order(uuid)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR has_function_privilege('authenticated',
       'public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)',
       'EXECUTE')
     OR has_function_privilege('anon',
       'public.create_quote_version_atomic(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.create_quote_version_atomic(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.create_quote_version_atomic(uuid)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.approve_quote_with_pdf_atomic(uuid,integer,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.approve_quote_with_pdf_atomic(uuid,integer,text,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.approve_quote_with_pdf_atomic(uuid,integer,text,text)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.request_discount_approval_atomic(uuid,integer,numeric,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.request_discount_approval_atomic(uuid,integer,numeric,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.request_discount_approval_atomic(uuid,integer,numeric,text)', 'EXECUTE')
     OR has_function_privilege('anon',
       'public.respond_discount_approval_atomic(uuid,integer,boolean,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated',
       'public.respond_discount_approval_atomic(uuid,integer,boolean,text)', 'EXECUTE')
     OR NOT has_function_privilege('service_role',
       'public.respond_discount_approval_atomic(uuid,integer,boolean,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'As ACLs públicas dos wrappers não correspondem ao contrato.';
  END IF;

  IF (SELECT count(*) FROM pg_trigger
      WHERE NOT tgisinternal
        AND tgname IN (
          'aaa_guard_quote_governance_write',
          'aaa_guard_quote_item_content_write',
          'aaa_guard_quote_personalization_content_write'
        )) <> 3 THEN
    RAISE EXCEPTION 'Os gatilhos de imutabilidade comercial não foram instalados.';
  END IF;

  IF (SELECT prosecdef
        FROM pg_proc
       WHERE oid = 'public.guard_quote_governance_write()'::regprocedure)
     OR NOT EXISTS (
       SELECT 1
         FROM pg_trigger
        WHERE tgrelid = 'public.quotes'::regclass
          AND tgname = 'aaa_guard_quote_governance_write'
          AND NOT tgisinternal
          AND (tgtype::integer & 8) = 8
     ) THEN
    RAISE EXCEPTION 'O gate principal precisa ser SECURITY INVOKER e cobrir DELETE.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_proc AS routine
     WHERE routine.oid IN (
       'public.convert_quote_to_sicoob_order(uuid)'::regprocedure,
       'public.create_quote_version_atomic(uuid)'::regprocedure,
       'public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)'::regprocedure,
       'public.bulk_update_quote_status_atomic(uuid[],integer[],text,text)'::regprocedure,
       'public.approve_quote_with_pdf_atomic(uuid,integer,text,text)'::regprocedure,
       'public.request_discount_approval_atomic(uuid,integer,numeric,text)'::regprocedure,
       'public.respond_discount_approval_atomic(uuid,integer,boolean,text)'::regprocedure
     )
       AND (
         NOT routine.prosecdef
         OR routine.proowner <> (
           SELECT relation.relowner
             FROM pg_class AS relation
            WHERE relation.oid = 'public.quotes'::regclass
         )
       )
  ) THEN
    RAISE EXCEPTION 'Os wrappers autorizados não executam com o proprietário de quotes.';
  END IF;

  IF has_function_privilege('anon', 'public.assert_quote_content_editable(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.assert_quote_content_editable(uuid)', 'EXECUTE')
     OR has_function_privilege('service_role', 'public.assert_quote_content_editable(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'A função interna de imutabilidade possui EXECUTE indevido.';
  END IF;

END;
$postflight$;

COMMENT ON FUNCTION public.assert_quote_content_editable(uuid) IS
'Validação interna fail-closed dos estados em que o conteúdo comercial do orçamento ainda pode ser alterado.';
