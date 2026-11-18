CREATE OR REPLACE FUNCTION public.guard_profile_authority_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_is_trusted_writer boolean :=
    current_user = pg_catalog.pg_get_userbyid((
      SELECT relation.relowner
        FROM pg_catalog.pg_class AS relation
       WHERE relation.oid = TG_RELID
    ))
    OR pg_catalog.pg_has_role(current_user, 'service_role', 'member')
    OR public.is_admin((SELECT auth.uid()));
BEGIN
  IF NOT v_is_trusted_writer THEN
    IF TG_OP = 'INSERT' AND (
      NEW.user_id IS DISTINCT FROM (SELECT auth.uid())
      OR NEW.role IS DISTINCT FROM 'vendedor'
      OR NEW.is_active IS DISTINCT FROM false
      OR NEW.deleted_at IS NOT NULL
      OR NEW.cooperativa_id IS NOT NULL
      OR NEW.pa_id IS NOT NULL
      OR NEW.singular_id IS NOT NULL
      OR NEW.carteira_id IS NOT NULL
      OR NEW.approval_threshold NOT IN (5000)
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'O autocadastro de perfil deve permanecer inativo e sem autoridade institucional.';
    ELSIF TG_OP = 'UPDATE' AND (
      NEW.id IS DISTINCT FROM OLD.id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
      OR NEW.cooperativa_id IS DISTINCT FROM OLD.cooperativa_id
      OR NEW.pa_id IS DISTINCT FROM OLD.pa_id
      OR NEW.singular_id IS DISTINCT FROM OLD.singular_id
      OR NEW.carteira_id IS DISTINCT FROM OLD.carteira_id
      OR NEW.approval_threshold IS DISTINCT FROM OLD.approval_threshold
    ) THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Campos de autoridade do perfil só podem ser alterados pela administração.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
