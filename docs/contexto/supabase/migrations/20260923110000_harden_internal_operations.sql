-- Fecha operações administrativas que ainda estavam acessíveis a authenticated.
-- Acesso de aplicação segue por Edge Functions autenticadas; cron e integrações
-- internas usam somente service_role ou segredo dedicado de serviço.

REVOKE ALL ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_notification(uuid, text, text, text, text, text, jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.acquire_ai_quota(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_ai_quota(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.retry_failed_webhook_deliveries() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_failed_webhook_deliveries() TO service_role;

REVOKE ALL ON FUNCTION public.sync_external_connections_from_credentials() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_external_connections_from_credentials() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.generate_sicoob_performance_report(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_sicoob_performance_report(text, text) TO service_role;

-- O frontend usa esta RPC apenas para a própria lista. Service role continua
-- necessário para jobs e backfills, mas qualquer outro ator é recusado.
CREATE OR REPLACE FUNCTION public.ensure_default_favorite_list(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _list_id uuid;
BEGIN
  IF _user_id IS NULL OR (auth.role() <> 'service_role' AND _user_id IS DISTINCT FROM auth.uid()) THEN
    RAISE EXCEPTION 'favorite_list_actor_mismatch' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO _list_id
  FROM public.favorite_lists
  WHERE user_id = _user_id AND is_default = true
  LIMIT 1;

  IF _list_id IS NULL THEN
    INSERT INTO public.favorite_lists (user_id, name, icon, color, is_default, position)
    VALUES (_user_id, 'Meus Favoritos', 'Heart', '#EF4444', true, 0)
    RETURNING id INTO _list_id;
  END IF;

  RETURN _list_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.ensure_default_favorite_list(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_favorite_list(uuid) TO authenticated, service_role;

-- system_settings é administrativo. Remove qualquer SELECT amplo, inclusive
-- policies históricas, e libera somente supervisor/dev pelo helper canônico.
DO $block$
DECLARE policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_settings'
      AND cmd IN ('SELECT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.system_settings', policy_name);
  END LOOP;
END;
$block$;
CREATE POLICY system_settings_supervisor_read
  ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));
CREATE POLICY system_settings_supervisor_write
  ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (public.is_supervisor_or_above(auth.uid()));

-- O bucket legado não possui consumidores. O domínio Sicoob usa o bucket
-- sicoob-order-documents com políticas por pedido; qualquer acesso ao legado
-- fica reservado à service_role, que ignora RLS.
UPDATE storage.buckets SET public = false WHERE id = 'order-documents';
DO $block$
DECLARE policy_name text;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      -- A aspa inicial torna a comparação literal: não pode atingir o bucket
      -- ativo `sicoob-order-documents`, cujo identificador contém este sufixo.
      AND (COALESCE(qual, '') LIKE '%''order-documents''%' OR COALESCE(with_check, '') LIKE '%''order-documents''%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_name);
  END LOOP;
END;
$block$;
