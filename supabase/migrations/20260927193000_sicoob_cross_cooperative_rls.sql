-- Consolida o escopo de leitura do pedido Sicoob e fecha políticas históricas
-- que autorizavam gestores apenas pelo papel, sem conferir a cooperativa.

CREATE OR REPLACE FUNCTION public.sicoob_actor_can_manage_fulfillment(
  p_actor_id uuid,
  p_order_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT p_actor_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.sicoob_orders order_row
    WHERE order_row.id = p_order_id
      AND (
        order_row.created_by = p_actor_id
        OR EXISTS (
          SELECT 1 FROM public.user_roles actor_role
          WHERE actor_role.user_id = p_actor_id
            AND actor_role.role::text IN ('admin', 'manager', 'dev', 'supervisor')
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role::text IN ('gestor_compras', 'comprador_singular')
          )
          AND EXISTS (
            SELECT 1 FROM public.profiles actor_profile
            WHERE (actor_profile.user_id = p_actor_id OR actor_profile.id = p_actor_id)
              AND actor_profile.is_active IS TRUE
              AND actor_profile.deleted_at IS NULL
              AND actor_profile.cooperativa_id = order_row.cooperative_id
          )
        )
        OR (
          EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role::text IN ('gerente_pa', 'comprador_pac')
          )
          AND EXISTS (
            SELECT 1 FROM public.profiles actor_profile
            WHERE (actor_profile.user_id = p_actor_id OR actor_profile.id = p_actor_id)
              AND actor_profile.is_active IS TRUE
              AND actor_profile.deleted_at IS NULL
              AND actor_profile.pa_id = order_row.pa_id
          )
        )
      )
  );
$function$;

REVOKE ALL ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_manage_fulfillment(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_read_order(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_manage_fulfillment(auth.uid(), p_order_id);
$function$;

REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_read_order(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_read_order(uuid)
  TO authenticated, service_role;

-- O helper de aprovação contém controles versionados de autoaprovação e
-- associação ativa. Esta migration preserva sua implementação e fecha apenas
-- o acesso direto por identidade arbitrária.
REVOKE ALL ON FUNCTION public.sicoob_actor_can_approve(uuid, uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_actor_can_approve(uuid, uuid, boolean)
  TO service_role;

CREATE OR REPLACE FUNCTION public.sicoob_current_actor_can_approve_order(
  p_order_id uuid,
  p_board_only boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_approve(auth.uid(), p_order_id, p_board_only);
$function$;

REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_approve_order(uuid, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_approve_order(uuid, boolean)
  TO authenticated, service_role;

DO $block$
DECLARE
  target_table text;
  policy_row record;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'sicoob_orders',
    'sicoob_order_items',
    'sicoob_order_history',
    'sicoob_order_item_logs',
    'sicoob_approval_requests'
  ]
  LOOP
    FOR policy_row IN
      SELECT policy.policyname
      FROM pg_catalog.pg_policies policy
      WHERE policy.schemaname = 'public'
        AND policy.tablename = target_table
        AND policy.cmd = 'SELECT'
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', policy_row.policyname, target_table);
    END LOOP;
  END LOOP;
END;
$block$;

CREATE POLICY sicoob_orders_read_scoped
ON public.sicoob_orders FOR SELECT TO authenticated
USING (public.sicoob_current_actor_can_read_order(id));

CREATE POLICY sicoob_order_items_read_scoped
ON public.sicoob_order_items FOR SELECT TO authenticated
USING (public.sicoob_current_actor_can_read_order(order_id));

CREATE POLICY sicoob_order_history_read_scoped
ON public.sicoob_order_history FOR SELECT TO authenticated
USING (public.sicoob_current_actor_can_read_order(order_id));

CREATE POLICY sicoob_order_item_logs_read_scoped
ON public.sicoob_order_item_logs FOR SELECT TO authenticated
USING (public.sicoob_current_actor_can_read_order(order_id));

CREATE POLICY sicoob_approval_requests_read_scoped
ON public.sicoob_approval_requests FOR SELECT TO authenticated
USING (
  requester_id = auth.uid()
  OR approver_id = auth.uid()
  OR public.sicoob_current_actor_can_read_order(order_id)
);

DROP POLICY IF EXISTS "Approvers can update status"
  ON public.sicoob_approval_requests;
CREATE POLICY sicoob_approval_requests_update_scoped
ON public.sicoob_approval_requests FOR UPDATE TO authenticated
USING (
  requester_id = auth.uid()
  OR public.sicoob_current_actor_can_approve_order(order_id, false)
)
WITH CHECK (
  requester_id = auth.uid()
  OR public.sicoob_current_actor_can_approve_order(order_id, false)
);
