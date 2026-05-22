
-- 1) order_audit_events
DROP POLICY IF EXISTS "Users can view audit events for orders they can see" ON public.order_audit_events;
DROP POLICY IF EXISTS "Users can view audit events of their orders" ON public.order_audit_events;
DROP POLICY IF EXISTS "order_audit_events_role_access" ON public.order_audit_events;
DROP POLICY IF EXISTS "Users can view audit events for orders they have access to" ON public.order_audit_events;
DROP POLICY IF EXISTS "Users can view audit events for relevant orders" ON public.order_audit_events;
DROP POLICY IF EXISTS "order_audit_events_select_scoped" ON public.order_audit_events;
CREATE POLICY "order_audit_events_select_scoped"
ON public.order_audit_events FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role)
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_audit_events.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT get_user_org_ids(auth.uid()))))
  OR EXISTS (SELECT 1 FROM public.sicoob_orders so LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE so.id = order_audit_events.order_id AND (
      so.created_by = auth.uid()
      OR (p.role='gestor_pa' AND so.pa_id = p.pa_id)
      OR (p.role='gestor_singular' AND so.cooperative_id = p.cooperativa_id)
      OR p.role IN ('supervisor','logistics')))
);

-- 2) order_comments
DROP POLICY IF EXISTS "Users can view comments of orders they can access" ON public.order_comments;
DROP POLICY IF EXISTS "order_comments_role_access" ON public.order_comments;
DROP POLICY IF EXISTS "order_comments_select" ON public.order_comments;
DROP POLICY IF EXISTS "order_comments_select_scoped" ON public.order_comments;
CREATE POLICY "order_comments_select_scoped"
ON public.order_comments FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role)
  OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_comments.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT get_user_org_ids(auth.uid()))))
  OR EXISTS (SELECT 1 FROM public.sicoob_orders so LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE so.id = order_comments.order_id AND (
      so.created_by = auth.uid()
      OR (p.role='gestor_pa' AND so.pa_id = p.pa_id)
      OR (p.role='gestor_singular' AND so.cooperative_id = p.cooperativa_id)
      OR p.role IN ('supervisor','logistics')))
);

-- 3) order_pilot_approvals
DROP POLICY IF EXISTS "Manage order pilot approvals" ON public.order_pilot_approvals;
DROP POLICY IF EXISTS "View order pilot approvals" ON public.order_pilot_approvals;
DROP POLICY IF EXISTS "Users can view pilot approvals of their orders" ON public.order_pilot_approvals;

-- 4) sicoob_order_history
DROP POLICY IF EXISTS "Users can view history of orders they can see" ON public.sicoob_order_history;
DROP POLICY IF EXISTS "sicoob_order_history_select" ON public.sicoob_order_history;
DROP POLICY IF EXISTS "sicoob_order_history_select_scoped" ON public.sicoob_order_history;
CREATE POLICY "sicoob_order_history_select_scoped"
ON public.sicoob_order_history FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role)
  OR EXISTS (SELECT 1 FROM public.sicoob_orders so LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE so.id = sicoob_order_history.order_id AND (
      so.created_by = auth.uid()
      OR (p.role='gestor_pa' AND so.pa_id = p.pa_id)
      OR (p.role='gestor_singular' AND so.cooperative_id = p.cooperativa_id)
      OR p.role IN ('supervisor','logistics')))
);

-- 5) sicoob_order_item_logs
DROP POLICY IF EXISTS "Users can view logs of orders they can see" ON public.sicoob_order_item_logs;
DROP POLICY IF EXISTS "sicoob_order_item_logs_select_scoped" ON public.sicoob_order_item_logs;
CREATE POLICY "sicoob_order_item_logs_select_scoped"
ON public.sicoob_order_item_logs FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role)
  OR EXISTS (SELECT 1 FROM public.sicoob_orders so LEFT JOIN public.profiles p ON p.id = auth.uid()
    WHERE so.id = sicoob_order_item_logs.order_id AND (
      so.created_by = auth.uid()
      OR (p.role='gestor_pa' AND so.pa_id = p.pa_id)
      OR (p.role='gestor_singular' AND so.cooperative_id = p.cooperativa_id)
      OR p.role IN ('supervisor','logistics')))
);

-- 6) file_scan_logs
DROP POLICY IF EXISTS "Apenas administradores podem visualizar logs de scan" ON public.file_scan_logs;
DROP POLICY IF EXISTS "file_scan_logs_select_admin" ON public.file_scan_logs;
CREATE POLICY "file_scan_logs_select_admin"
ON public.file_scan_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

-- 7) Replace jwt role policies with has_role
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.campaigns FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Admins can manage cooperativas_parceiras" ON public.cooperativas_parceiras;
CREATE POLICY "Admins can manage cooperativas_parceiras" ON public.cooperativas_parceiras FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Apenas admin e dev inserem qa_release_evidences" ON public.qa_release_evidences;
DROP POLICY IF EXISTS "Apenas admin e dev visualizam qa_release_evidences" ON public.qa_release_evidences;
DROP POLICY IF EXISTS "qa_release_evidences_admin_select" ON public.qa_release_evidences;
DROP POLICY IF EXISTS "qa_release_evidences_admin_insert" ON public.qa_release_evidences;
CREATE POLICY "qa_release_evidences_admin_select" ON public.qa_release_evidences FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));
CREATE POLICY "qa_release_evidences_admin_insert" ON public.qa_release_evidences FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Apenas admin e dev inserem qa_releases" ON public.qa_releases;
DROP POLICY IF EXISTS "Apenas admin e dev visualizam qa_releases" ON public.qa_releases;
DROP POLICY IF EXISTS "qa_releases_admin_select" ON public.qa_releases;
DROP POLICY IF EXISTS "qa_releases_admin_insert" ON public.qa_releases;
CREATE POLICY "qa_releases_admin_select" ON public.qa_releases FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));
CREATE POLICY "qa_releases_admin_insert" ON public.qa_releases FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Apenas admin e dev gerenciam qa_run_steps" ON public.qa_run_steps;
DROP POLICY IF EXISTS "qa_run_steps_admin_all" ON public.qa_run_steps;
CREATE POLICY "qa_run_steps_admin_all" ON public.qa_run_steps FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Apenas admin e dev inserem qa_runs" ON public.qa_runs;
DROP POLICY IF EXISTS "Apenas admin e dev visualizam qa_runs" ON public.qa_runs;

DROP POLICY IF EXISTS "Admins can manage singulares" ON public.singulares;
CREATE POLICY "Admins can manage singulares" ON public.singulares FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

DROP POLICY IF EXISTS "Admins can view telemetry" ON public.telemetry_logs;
CREATE POLICY "Admins can view telemetry" ON public.telemetry_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'dev'::app_role));

-- 8) Storage hardening
UPDATE storage.buckets SET public = false WHERE id IN ('exports','proposals');

DROP POLICY IF EXISTS "Public Access to exports" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to Proposals" ON storage.objects;
DROP POLICY IF EXISTS "Public access to order documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view order documents" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload order documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update their order documents" ON storage.objects;
DROP POLICY IF EXISTS "proposals_select_owner_or_admin" ON storage.objects;

CREATE POLICY "proposals_select_owner_or_admin"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proposals'
  AND (owner = auth.uid()
       OR has_role(auth.uid(),'admin'::app_role)
       OR has_role(auth.uid(),'dev'::app_role))
);
