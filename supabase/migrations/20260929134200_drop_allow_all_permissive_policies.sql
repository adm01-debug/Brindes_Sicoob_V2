-- Migration: dropa políticas PERMISSIVE "Allow all" que anulavam RLS
--
-- Contexto:
--   20250102000000_gifts_production.sql linhas 87-90 criou:
--     CREATE POLICY "Allow all" ON public.categories FOR ALL USING (true);
--     CREATE POLICY "Allow all" ON public.suppliers FOR ALL USING (true);
--     CREATE POLICY "Allow all" ON public.products   FOR ALL USING (true);
--     CREATE POLICY "Allow all" ON public.quotes     FOR ALL USING (true);
--
--   Em PostgreSQL, políticas PERMISSIVE são combinadas com OR.
--   Uma policy USING(true) sem WITH CHECK anula as demais policies de
--   leitura (SELECT) e sobrepõe as de escrita (INSERT/UPDATE/DELETE).
--   Resultado: qualquer usuário autenticado bypassa seller_id e org_id.
--
-- Impacto do drop:
--   As policies de seller-scope e organization-scope existentes em cada
--   tabela voltam a ser as únicas ativas. Zero mudança funcional para
--   usuários com acesso legítimo.

DROP POLICY IF EXISTS "Allow all" ON public.categories;
DROP POLICY IF EXISTS "Allow all" ON public.suppliers;
DROP POLICY IF EXISTS "Allow all" ON public.products;
DROP POLICY IF EXISTS "Allow all" ON public.quotes;
