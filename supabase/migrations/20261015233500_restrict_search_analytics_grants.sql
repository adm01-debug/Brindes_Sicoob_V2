-- Fecha privilégios herdados que não fazem parte do contrato de telemetria.
-- Usuários autenticados registram e consultam buscas conforme a RLS, mas não
-- alteram nem apagam eventos históricos.

REVOKE ALL ON TABLE public.search_analytics FROM anon;
REVOKE ALL ON TABLE public.search_analytics FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.search_analytics TO authenticated;
GRANT ALL ON TABLE public.search_analytics TO service_role;

COMMENT ON TABLE public.search_analytics IS
  'Telemetria imutável de buscas: authenticated possui apenas SELECT/INSERT sujeitos à RLS.';
