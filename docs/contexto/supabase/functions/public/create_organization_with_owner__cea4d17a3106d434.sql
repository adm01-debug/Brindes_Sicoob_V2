CREATE OR REPLACE FUNCTION public.create_organization_with_owner(_name text, _slug text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  -- Add the caller as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'owner');

  RETURN _org_id;
END;
$function$
