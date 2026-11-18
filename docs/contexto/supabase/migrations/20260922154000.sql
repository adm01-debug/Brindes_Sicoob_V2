-- Metas individuais só são consultadas e alteradas por usuários autenticados.
-- A política RLS já restringe cada linha ao dono (ou administrador), mas o
-- projeto concede acesso direto a anon por padrão; removemos essa concessão.
REVOKE ALL ON TABLE public.sales_goals FROM anon;
