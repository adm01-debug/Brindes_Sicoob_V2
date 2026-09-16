-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Etapa 30: fecha 2 policies abertas demais (decisao do usuario)
-- Gerado em 16/09/2026
-- ============================================================
BEGIN;

-- notifications: hoje qualquer pessoa sem login pode inserir
-- notificacao na caixa de qualquer usuario. O codigo real
-- (OrderService.notifyStatusChange) so roda autenticado e precisa
-- continuar podendo notificar OUTRO usuario (ex: gestor avisando
-- vendedor) — por isso restringe a "precisa estar logado", nao a
-- "so pode notificar a si mesmo".
DROP POLICY IF EXISTS "Systems can create notifications" ON public.notifications;
CREATE POLICY "authenticated_create_notifications" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (true);

-- price_history: historico de precos ficava visivel ate para quem
-- nunca fez login. Passa a exigir login.
DROP POLICY IF EXISTS "anyone_read_price_history" ON public.price_history;
CREATE POLICY "authenticated_read_price_history" ON public.price_history
FOR SELECT TO authenticated USING (true);

COMMIT;

-- ============================================================
-- VERIFICACAO — rode depois do COMMIT acima e me cole o resultado
-- ============================================================
select tablename, policyname, roles::text
from pg_policies
where schemaname='public' and tablename in ('notifications','price_history')
order by 1,2;
