CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  user_id uuid UNIQUE,
  cooperativa_id uuid,
  pa_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz
);
CREATE TABLE public.user_roles (user_id uuid NOT NULL, role text NOT NULL);
CREATE TABLE public.sicoob_orders (
  id uuid PRIMARY KEY,
  cooperative_id uuid NOT NULL,
  pa_id uuid NOT NULL,
  created_by uuid NOT NULL
);
CREATE TABLE public.sicoob_order_items (id uuid PRIMARY KEY, order_id uuid NOT NULL);
CREATE TABLE public.sicoob_order_history (id uuid PRIMARY KEY, order_id uuid NOT NULL);
CREATE TABLE public.sicoob_order_item_logs (id uuid PRIMARY KEY, order_id uuid NOT NULL);
CREATE TABLE public.sicoob_approval_requests (
  id uuid PRIMARY KEY,
  order_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  approver_id uuid,
  status text NOT NULL DEFAULT 'pending'
);

-- Representa o contrato preexistente de aprovação: perfil ativo, papel e
-- escopo organizacional. A migration S20 deve preservá-lo.
CREATE FUNCTION public.sicoob_actor_can_approve(
  p_actor_id uuid,
  p_order_id uuid,
  p_board_only boolean DEFAULT false
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sicoob_orders order_row
    JOIN public.profiles actor_profile
      ON actor_profile.user_id = p_actor_id OR actor_profile.id = p_actor_id
    WHERE order_row.id = p_order_id
      AND actor_profile.is_active IS TRUE
      AND actor_profile.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.user_roles actor_role
          WHERE actor_role.user_id = p_actor_id
            AND actor_role.role IN ('admin', 'manager', 'dev', 'supervisor')
        )
        OR (
          actor_profile.cooperativa_id = order_row.cooperative_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role IN ('gestor_compras', 'comprador_singular')
          )
        )
        OR (
          p_board_only IS FALSE
          AND actor_profile.pa_id = order_row.pa_id
          AND EXISTS (
            SELECT 1 FROM public.user_roles actor_role
            WHERE actor_role.user_id = p_actor_id
              AND actor_role.role = 'gerente_pa'
          )
        )
      )
  );
$$;

ALTER TABLE public.sicoob_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_order_item_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sicoob_approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY legacy_orders_global_role ON public.sicoob_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view items of their PA orders" ON public.sicoob_order_items FOR SELECT USING (true);
CREATE POLICY "sicoob_order_history_select_scoped" ON public.sicoob_order_history FOR SELECT USING (true);
CREATE POLICY "sicoob_order_item_logs_select_scoped" ON public.sicoob_order_item_logs FOR SELECT USING (true);
CREATE POLICY "Users can view their own approval requests" ON public.sicoob_approval_requests
  FOR SELECT USING (requester_id = auth.uid());
CREATE POLICY "Managers and supervisors can view all requests in their scope" ON public.sicoob_approval_requests
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='gestor_compras'));
CREATE POLICY "Approvers can update status" ON public.sicoob_approval_requests
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='gestor_compras'));

GRANT USAGE ON SCHEMA public, auth TO authenticated, anon, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE(status) ON public.sicoob_approval_requests TO authenticated;
