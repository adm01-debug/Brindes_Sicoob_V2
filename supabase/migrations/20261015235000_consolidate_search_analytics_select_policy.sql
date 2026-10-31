-- Evita avaliar duas policies permissivas em toda leitura. A regra única
-- preserva o acesso ao próprio histórico e a visão gerencial autorizada.

DROP POLICY IF EXISTS "Users read own search analytics"
  ON public.search_analytics;
DROP POLICY IF EXISTS "Managers read search analytics"
  ON public.search_analytics;
DROP POLICY IF EXISTS "Authorized users read search analytics"
  ON public.search_analytics;

CREATE POLICY "Authorized users read search analytics"
ON public.search_analytics
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.is_manager_or_admin())
  )
);
