CREATE OR REPLACE FUNCTION public.get_sicoob_invitation(p_token text)
 RETURNS TABLE(invitation_id uuid, masked_email text, cooperative_name text, pa_name text, pa_code text, invited_role text, invitation_status text, invitation_expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT i.id,
         left(split_part(i.email, '@', 1), 1) || '***@' || split_part(i.email, '@', 2),
         c.nome,
         pa.nome,
         pa.codigo,
         i.role::text,
         CASE WHEN i.status = 'pending' AND i.expires_at <= now() THEN 'expired' ELSE i.status END,
         i.expires_at
    FROM public.sicoob_invitations i
    JOIN public.cooperativas c ON c.id = i.cooperative_id
    LEFT JOIN public.postos_atendimento pa ON pa.id = i.pa_id
   WHERE p_token ~ '^[0-9a-f]{64}$'
     AND i.token_hash = extensions.digest(p_token, 'sha256')
   LIMIT 1;
$function$
