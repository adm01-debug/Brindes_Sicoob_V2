CREATE SCHEMA auth;

CREATE TABLE auth.users (id uuid PRIMARY KEY);
INSERT INTO auth.users (id) VALUES
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION public.can_manage(actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT actor_id = '11111111-1111-1111-1111-111111111111'::uuid
$$;

CREATE TABLE public.access_blocked_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text,
  ip_address text NOT NULL,
  block_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.access_blocked_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view access_blocked_log"
  ON public.access_blocked_log FOR SELECT
  USING (public.can_manage((SELECT auth.uid())));
CREATE POLICY "System insert blocked logs"
  ON public.access_blocked_log FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can insert blocked logs"
  ON public.access_blocked_log FOR INSERT WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_blocked_log TO PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_blocked_log TO anon, authenticated;
GRANT ALL ON public.access_blocked_log TO service_role;

CREATE TABLE public.catalog_marketing_terms (
  id uuid PRIMARY KEY,
  category text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL,
  is_active boolean NOT NULL
);
CREATE TABLE public.catalog_product_marketing (
  product_id text NOT NULL,
  term_id uuid NOT NULL REFERENCES public.catalog_marketing_terms(id),
  PRIMARY KEY (product_id, term_id)
);
ALTER TABLE public.catalog_marketing_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_product_marketing ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_marketing_terms_read
  ON public.catalog_marketing_terms FOR SELECT TO authenticated USING (true);
CREATE POLICY catalog_product_marketing_read
  ON public.catalog_product_marketing FOR SELECT TO authenticated USING (true);
GRANT SELECT ON public.catalog_marketing_terms, public.catalog_product_marketing TO authenticated;
GRANT SELECT ON public.catalog_marketing_terms, public.catalog_product_marketing TO service_role;
INSERT INTO public.catalog_marketing_terms
  (id, category, slug, name, description, sort_order, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333333', 'publico_alvo', 'agro', 'Agro', NULL, 10, true);
INSERT INTO public.catalog_product_marketing (product_id, term_id)
VALUES ('produto-1', '33333333-3333-3333-3333-333333333333');
CREATE VIEW public.catalog_marketing_term_usage
WITH (security_invoker = true)
AS
SELECT term.id, term.category, term.slug, term.name, term.description,
       term.sort_order, count(mapping.product_id)::bigint AS product_count
FROM public.catalog_marketing_terms AS term
LEFT JOIN public.catalog_product_marketing AS mapping ON mapping.term_id = term.id
WHERE term.is_active
GROUP BY term.id;
GRANT ALL ON public.catalog_marketing_term_usage TO PUBLIC, anon, authenticated, service_role;
