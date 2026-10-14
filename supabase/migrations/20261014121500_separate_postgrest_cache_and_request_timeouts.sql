-- O cache completo dos schemas public e graphql_public excede 30 segundos.
-- O papel de conexão precisa de uma janela maior para reconstruí-lo, enquanto
-- cada requisição REST continua limitada a oito segundos pelo pre-request.
CREATE OR REPLACE FUNCTION public.set_postgrest_request_timeout()
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
  SELECT set_config('statement_timeout', '8s', true);
$function$;

REVOKE ALL ON FUNCTION public.set_postgrest_request_timeout() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_postgrest_request_timeout() TO anon, authenticated, service_role;

ALTER ROLE authenticator SET statement_timeout = '2min';
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.set_postgrest_request_timeout';

NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
