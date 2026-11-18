-- Helpers mantidos para policies com role public não podem aceitar UUID de
-- terceiro vindo de uma chamada RPC. Policies usam auth.uid(); service_role
-- permanece autorizado para rotinas de servidor.

CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role IN ('admin', 'manager')
     )
$function$;

CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND (
       public.is_admin_strict(_user_id)
       OR public.has_role(_user_id, 'manager'::public.app_role)
       OR public.has_role(_user_id, 'dev'::public.app_role)
     )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT organization_id
    FROM public.organization_members
   WHERE user_id = _user_id
     AND _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = _user_id
          AND ur.role = _role
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin'::public.app_role, 'dev'::public.app_role)
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_dev(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role = 'dev'::public.app_role
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_kit_collaborator(_kit_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.kit_collaborators
        WHERE kit_id = _kit_id AND user_id = _user_id
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_kit_owner(_kit_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.custom_kits
        WHERE id = _kit_id AND user_id = _user_id
     )
$function$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND (auth.role() = 'service_role' OR _user_id = auth.uid())
     AND EXISTS (
       SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN (
            'dev'::public.app_role,
            'supervisor'::public.app_role,
            'admin'::public.app_role,
            'manager'::public.app_role
          )
     )
$function$;

-- Reforça ausência de grant herdado de PUBLIC; os grants diretos necessários
-- às policies para anon/authenticated permanecem explícitos.
REVOKE EXECUTE ON FUNCTION public.can_manage(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_view_all_sales(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_dev(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_kit_collaborator(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_kit_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) FROM PUBLIC;
