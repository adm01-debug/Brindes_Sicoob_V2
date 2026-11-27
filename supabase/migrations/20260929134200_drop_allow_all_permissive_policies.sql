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

-- Idempotente e tolerante a schema: categories, suppliers e products foram
-- removidas do schema em migrations posteriores. O DROP so roda na tabela
-- que ainda existir, para o arquivo poder ser reaplicado em qualquer estado.
DO $drop_allow_all$
DECLARE
  v_tabela text;
BEGIN
  FOREACH v_tabela IN ARRAY ARRAY['categories','suppliers','products','quotes'] LOOP
    IF to_regclass(format('public.%I', v_tabela)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Allow all" ON public.%I', v_tabela);
    END IF;
  END LOOP;
END;
$drop_allow_all$;
