-- 1. Redefine is_admin to be strict (only admin and dev)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin'::public.app_role, 'dev'::public.app_role)
  );
$function$;

-- 2. Harden notification_channels (Was ALL true for public)
DROP POLICY IF EXISTS "Admin can manage channels" ON public.notification_channels;
CREATE POLICY "Admin can manage channels" 
ON public.notification_channels 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view channels" 
ON public.notification_channels 
FOR SELECT 
TO authenticated
USING (true);

-- 3. Harden order_invoices (Was ALL true for public)
DROP POLICY IF EXISTS "Manage order invoices" ON public.order_invoices;
DROP POLICY IF EXISTS "View order invoices" ON public.order_invoices;

CREATE POLICY "Users can view invoices for their own orders" 
ON public.order_invoices 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_invoices.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage invoices" 
ON public.order_invoices 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 4. Harden order_logistics (Was ALL true for public)
DROP POLICY IF EXISTS "Manage order logistics" ON public.order_logistics;
DROP POLICY IF EXISTS "View order logistics" ON public.order_logistics;

CREATE POLICY "Users can view logistics for their own orders" 
ON public.order_logistics 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_logistics.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage logistics" 
ON public.order_logistics 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 5. Harden order_payments (Was ALL true for public)
DROP POLICY IF EXISTS "Manage order payments" ON public.order_payments;
DROP POLICY IF EXISTS "View order payments" ON public.order_payments;

CREATE POLICY "Users can view payments for their own orders" 
ON public.order_payments 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_payments.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage payments" 
ON public.order_payments 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 6. Harden order_approval_history (Was SELECT true for public)
DROP POLICY IF EXISTS "Gestores can view all approval history" ON public.order_approval_history;

CREATE POLICY "Users can view approval history for relevant orders" 
ON public.order_approval_history 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_approval_history.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  ) OR public.is_admin(auth.uid())
);

-- 7. Harden order_audit_events (Was SELECT true for public)
DROP POLICY IF EXISTS "Audit events are read-only" ON public.order_audit_events;
DROP POLICY IF EXISTS "View order audit events" ON public.order_audit_events;

CREATE POLICY "Users can view audit events for relevant orders" 
ON public.order_audit_events 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_audit_events.order_id
    AND (o.seller_id = auth.uid() OR o.organization_id IN (SELECT public.get_user_org_ids(auth.uid())))
  ) OR public.is_admin(auth.uid())
);

-- 8. Harden pa_category_thresholds (Was ALL true for public)
DROP POLICY IF EXISTS "Admins can manage category thresholds" ON public.pa_category_thresholds;

CREATE POLICY "Admins can manage category thresholds" 
ON public.pa_category_thresholds 
FOR ALL 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view category thresholds" 
ON public.pa_category_thresholds 
FOR SELECT 
TO authenticated
USING (true);
