-- Policies não podem depender de helpers parametrizados privados: o chamador
-- precisa de EXECUTE antes que o predicado rode. Wrappers fixam o ator em
-- auth.uid() e mantêm os helpers que aceitam identidade arbitrária privados.
CREATE FUNCTION public.sicoob_current_actor_can_manage_consolidation(p_cooperative_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_manage_consolidation(auth.uid(), p_cooperative_id);
$$;
CREATE FUNCTION public.sicoob_current_actor_can_receive_consolidation(p_consolidation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_receive_consolidation(auth.uid(), p_consolidation_id);
$$;
CREATE FUNCTION public.sicoob_current_actor_can_receive_destination(p_destination_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_receive_destination(auth.uid(), p_destination_id);
$$;
CREATE FUNCTION public.sicoob_current_actor_can_view_all_consolidation(p_consolidation_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL
    AND public.sicoob_actor_can_view_all_consolidation(auth.uid(), p_consolidation_id);
$$;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_manage_consolidation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_receive_consolidation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_receive_destination(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sicoob_current_actor_can_view_all_consolidation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_manage_consolidation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_receive_consolidation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_receive_destination(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sicoob_current_actor_can_view_all_consolidation(uuid) TO authenticated;

DROP POLICY IF EXISTS "consolidations_read_in_scope" ON public.order_consolidations;
CREATE POLICY "consolidations_read_in_scope" ON public.order_consolidations
FOR SELECT TO authenticated USING (
  vendedor_id = auth.uid()
  OR public.sicoob_current_actor_can_manage_consolidation(singular_id)
  OR public.sicoob_current_actor_can_receive_consolidation(id)
);
DROP POLICY IF EXISTS "consolidation_orders_read_in_scope" ON public.order_consolidation_orders;
CREATE POLICY "consolidation_orders_read_in_scope" ON public.order_consolidation_orders
FOR SELECT TO authenticated USING (
  public.sicoob_current_actor_can_view_all_consolidation(consolidation_id)
);
DROP POLICY IF EXISTS "delivery_destinations_read_in_scope" ON public.sicoob_delivery_destinations;
CREATE POLICY "delivery_destinations_read_in_scope" ON public.sicoob_delivery_destinations
FOR SELECT TO authenticated USING (
  public.sicoob_current_actor_can_view_all_consolidation(consolidation_id)
  OR public.sicoob_current_actor_can_receive_destination(id)
);
DROP POLICY IF EXISTS "delivery_allocations_read_in_scope" ON public.sicoob_delivery_allocations;
CREATE POLICY "delivery_allocations_read_in_scope" ON public.sicoob_delivery_allocations
FOR SELECT TO authenticated USING (
  public.sicoob_current_actor_can_receive_destination(destination_id)
  OR EXISTS (
    SELECT 1 FROM public.sicoob_delivery_destinations d
    WHERE d.id = destination_id
      AND public.sicoob_current_actor_can_view_all_consolidation(d.consolidation_id)
  )
);
DROP POLICY IF EXISTS "delivery_receipts_read_in_scope" ON public.sicoob_delivery_receipt_events;
CREATE POLICY "delivery_receipts_read_in_scope" ON public.sicoob_delivery_receipt_events
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sicoob_delivery_allocations a
    JOIN public.sicoob_delivery_destinations d ON d.id = a.destination_id
    WHERE a.id = allocation_id
      AND (
        public.sicoob_current_actor_can_receive_destination(d.id)
        OR public.sicoob_current_actor_can_view_all_consolidation(d.consolidation_id)
      )
  )
);
