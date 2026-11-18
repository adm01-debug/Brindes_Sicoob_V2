CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_delegation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Delegações não podem ser excluídas.';
  END IF;
  IF current_setting('app.sicoob_delegation_operation', true) <> 'revoke' THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Delegação só pode ser alterada pela revogação formal.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.delegator_id IS DISTINCT FROM OLD.delegator_id
     OR NEW.delegate_id IS DISTINCT FROM OLD.delegate_id
     OR NEW.cooperative_id IS DISTINCT FROM OLD.cooperative_id
     OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
     OR NEW.competencies IS DISTINCT FROM OLD.competencies
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='O escopo de uma delegação é imutável.';
  END IF;
  IF OLD.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='Delegação já revogada.';
  END IF;
  RETURN NEW;
END;
$function$
