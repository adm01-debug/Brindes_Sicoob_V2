-- Permite que rotinas administrativas e Edge Functions com service role
-- mantenham a hierarquia Sicoob sem quebrar o log obrigatório. O UUID zero
-- identifica explicitamente uma ação do sistema quando não existe JWT humano.
CREATE OR REPLACE FUNCTION public.log_sicoob_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  _actor_id uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  INSERT INTO public.admin_audit_log (
    action,
    resource_type,
    resource_id,
    user_id,
    details,
    source
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    _actor_id,
    jsonb_build_object('old', OLD, 'new', NEW),
    CASE WHEN auth.uid() IS NULL THEN 'database' ELSE 'user' END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  _definition text;
BEGIN
  SELECT pg_get_functiondef('public.log_sicoob_admin_action()'::regprocedure)
  INTO _definition;

  IF _definition NOT ILIKE '%COALESCE(auth.uid(), ''00000000-0000-0000-0000-000000000000''%'
     OR _definition NOT ILIKE '%SET search_path TO ''public'', ''pg_temp''%'
  THEN
    RAISE EXCEPTION 'Contrato de auditoria do ator de sistema não foi aplicado';
  END IF;
END;
$$;
