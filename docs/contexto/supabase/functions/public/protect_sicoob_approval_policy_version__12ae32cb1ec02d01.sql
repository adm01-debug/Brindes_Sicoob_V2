CREATE OR REPLACE FUNCTION public.protect_sicoob_approval_policy_version()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Políticas de aprovação publicadas não podem ser excluídas.';
  END IF;

  IF NEW.cooperative_id IS DISTINCT FROM OLD.cooperative_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.effective_from IS DISTINCT FROM OLD.effective_from
     OR NEW.forbid_self_approval IS DISTINCT FROM OLD.forbid_self_approval
     OR NEW.require_active_membership IS DISTINCT FROM OLD.require_active_membership THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A versão publicada da política é imutável; crie uma nova versão.';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
