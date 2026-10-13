-- Corrige os dois escritores autorizados que passaram a ser bloqueados pelo
-- gatilho de governança e congela o conteúdo comercial fora dos estados de
-- edição. Os wrappers restauram o contexto mesmo quando o núcleo lança erro.

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
    'suggested_modifications', 'tags', 'total_cost'
  ];
  v_old_commercial jsonb;
  v_new_commercial jsonb;
BEGIN
  IF current_setting('app.quote_governance_write', true) = 'true'
     AND current_user = pg_catalog.pg_get_userbyid((
       SELECT relation.relowner
       FROM pg_catalog.pg_class AS relation
       WHERE relation.oid = TG_RELID
     )) THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
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

  IF OLD.status::text NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
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
  WHERE q.id = p_quote_id;

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
       'EXECUTE') THEN
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
       'EXECUTE') THEN
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
       'public.apply_local_quote_approval_response(text,text,text,text,text,text,text,text)'::regprocedure
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
