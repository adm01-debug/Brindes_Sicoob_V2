
-- Harden cms_banners
DROP POLICY IF EXISTS "Admins can manage cms_banners" ON public.cms_banners;
CREATE POLICY "Supervisors can manage cms_banners" 
ON public.cms_banners 
FOR ALL 
USING (is_supervisor_or_above(auth.uid()));

CREATE POLICY "Public can read active banners" 
ON public.cms_banners 
FOR SELECT 
USING (is_active = true);

-- Harden newsletter_subscribers
DROP POLICY IF EXISTS "Admins can manage newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Admins can view newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Supervisors can manage newsletter_subscribers" 
ON public.newsletter_subscribers 
FOR ALL 
USING (is_supervisor_or_above(auth.uid()));

CREATE POLICY "Anyone can subscribe to newsletter" 
ON public.newsletter_subscribers 
FOR INSERT 
WITH CHECK (true);

-- Harden product_categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.product_categories;
CREATE POLICY "Supervisors can manage categories" 
ON public.product_categories 
FOR ALL 
USING (is_supervisor_or_above(auth.uid()));

-- Harden cms_sections
DROP POLICY IF EXISTS "Admins can manage cms_sections" ON public.cms_sections;
CREATE POLICY "Supervisors can manage cms_sections" 
ON public.cms_sections 
FOR ALL 
USING (is_supervisor_or_above(auth.uid()));

CREATE POLICY "Public can read active sections" 
ON public.cms_sections 
FOR SELECT 
USING (is_active = true);

-- Ensure admin_audit_log is secure
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Devs can read audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Supervisors can insert audit entries" ON public.admin_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

CREATE POLICY "Supervisors can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (is_supervisor_or_above(auth.uid()));

CREATE POLICY "Authenticated can insert audit logs" 
ON public.admin_audit_log 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');
