-- Curadoria editorial do catálogo do portal Sicoob.
--
-- Os produtos pertencem ao banco externo e são somente leitura neste portal.
-- Por isso, classificações editoriais (público-alvo, endomarketing e temas)
-- ficam no banco canônico local, vinculadas pelo identificador externo.

CREATE TABLE IF NOT EXISTS public.catalog_marketing_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('publico_alvo', 'endomarketing', 'tema_sicoob')),
  slug text NOT NULL CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 2 AND 120),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT catalog_marketing_terms_category_slug_key UNIQUE (category, slug)
);

CREATE TABLE IF NOT EXISTS public.catalog_product_marketing (
  product_id text NOT NULL CHECK (length(btrim(product_id)) BETWEEN 1 AND 200),
  term_id uuid NOT NULL REFERENCES public.catalog_marketing_terms(id) ON DELETE CASCADE,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_catalog_product_marketing_term_product
  ON public.catalog_product_marketing (term_id, product_id);

CREATE OR REPLACE VIEW public.catalog_marketing_term_usage
WITH (security_invoker = true)
AS
SELECT
  term.id,
  term.category,
  term.slug,
  term.name,
  term.description,
  term.sort_order,
  count(mapping.product_id)::bigint AS product_count
FROM public.catalog_marketing_terms AS term
LEFT JOIN public.catalog_product_marketing AS mapping ON mapping.term_id = term.id
WHERE term.is_active
GROUP BY term.id;

DROP TRIGGER IF EXISTS set_catalog_marketing_terms_updated_at
  ON public.catalog_marketing_terms;
CREATE TRIGGER set_catalog_marketing_terms_updated_at
  BEFORE UPDATE ON public.catalog_marketing_terms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.catalog_marketing_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_product_marketing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Atores ativos leem termos de marketing" ON public.catalog_marketing_terms;
CREATE POLICY "Atores ativos leem termos de marketing"
  ON public.catalog_marketing_terms
  FOR SELECT TO authenticated
  USING (public.sicoob_actor_is_active((SELECT auth.uid())));

DROP POLICY IF EXISTS "Curadores inserem termos de marketing" ON public.catalog_marketing_terms;
CREATE POLICY "Curadores inserem termos de marketing"
  ON public.catalog_marketing_terms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Curadores atualizam termos de marketing" ON public.catalog_marketing_terms;
CREATE POLICY "Curadores atualizam termos de marketing"
  ON public.catalog_marketing_terms
  FOR UPDATE TO authenticated
  USING (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  )
  WITH CHECK (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Curadores removem termos de marketing" ON public.catalog_marketing_terms;
CREATE POLICY "Curadores removem termos de marketing"
  ON public.catalog_marketing_terms
  FOR DELETE TO authenticated
  USING (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Atores ativos leem classificacoes de marketing" ON public.catalog_product_marketing;
CREATE POLICY "Atores ativos leem classificacoes de marketing"
  ON public.catalog_product_marketing
  FOR SELECT TO authenticated
  USING (public.sicoob_actor_is_active((SELECT auth.uid())));

DROP POLICY IF EXISTS "Curadores inserem classificacoes de marketing" ON public.catalog_product_marketing;
CREATE POLICY "Curadores inserem classificacoes de marketing"
  ON public.catalog_product_marketing
  FOR INSERT TO authenticated
  WITH CHECK (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND created_by = (SELECT auth.uid())
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "Curadores removem classificacoes de marketing" ON public.catalog_product_marketing;
CREATE POLICY "Curadores removem classificacoes de marketing"
  ON public.catalog_product_marketing
  FOR DELETE TO authenticated
  USING (
    public.sicoob_actor_is_active((SELECT auth.uid()))
    AND (
      public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'supervisor'::public.app_role)
      OR public.has_role((SELECT auth.uid()), 'dev'::public.app_role)
    )
  );

REVOKE ALL ON TABLE public.catalog_marketing_terms FROM anon;
REVOKE ALL ON TABLE public.catalog_product_marketing FROM anon;
REVOKE ALL ON TABLE public.catalog_marketing_term_usage FROM anon;
GRANT SELECT ON TABLE public.catalog_marketing_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_marketing_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.catalog_product_marketing TO authenticated;
GRANT SELECT ON TABLE public.catalog_marketing_term_usage TO authenticated;

INSERT INTO public.catalog_marketing_terms (category, slug, name, sort_order)
VALUES
  ('publico_alvo', 'homem', 'Homem', 10),
  ('publico_alvo', 'mulher', 'Mulher', 20),
  ('publico_alvo', 'crianca', 'Criança', 30),
  ('publico_alvo', 'unissex', 'Unissex', 40),
  ('publico_alvo', 'medico', 'Médico', 50),
  ('publico_alvo', 'advogado', 'Advogado', 60),
  ('publico_alvo', 'engenheiro', 'Engenheiro', 70),
  ('publico_alvo', 'contador', 'Contador', 80),
  ('publico_alvo', 'secretaria', 'Secretária', 90),
  ('publico_alvo', 'executivo', 'Executivo', 100),
  ('publico_alvo', 'professor', 'Professor', 110),
  ('publico_alvo', 'enfermeiro', 'Enfermeiro', 120),
  ('publico_alvo', 'produtor-rural', 'Produtor rural', 130),
  ('publico_alvo', 'veterinario', 'Veterinário', 140),
  ('publico_alvo', 'dentista', 'Dentista', 150),
  ('endomarketing', 'onboarding-kit-boas-vindas', 'Onboarding | Kit boas-vindas', 10),
  ('endomarketing', 'tempo-de-casa-aniversario-empresa', 'Tempo de casa | Aniversário da empresa', 20),
  ('endomarketing', 'cipa-sipat', 'CIPA | SIPAT', 30),
  ('endomarketing', 'premiacao-incentivo', 'Premiação | Incentivo', 40),
  ('endomarketing', 'reconhecimento', 'Reconhecimento', 50),
  ('endomarketing', 'integracao-team-building', 'Integração | Team building', 60),
  ('endomarketing', 'treinamento-capacitacao', 'Treinamento | Capacitação', 70),
  ('endomarketing', 'fim-de-ano-confraternizacao', 'Fim de ano | Confraternização', 80),
  ('endomarketing', 'qualidade-de-vida', 'Qualidade de vida', 90),
  ('endomarketing', 'campanha-interna', 'Campanha interna', 100),
  ('endomarketing', 'convencao-de-vendas', 'Convenção de vendas', 110),
  ('tema_sicoob', 'agro', 'Agro', 10),
  ('tema_sicoob', 'sul', 'Sul', 20),
  ('tema_sicoob', 'praia', 'Praia', 30),
  ('tema_sicoob', 'corporativo', 'Corporativo', 40)
ON CONFLICT (category, slug) DO UPDATE
SET name = EXCLUDED.name,
    sort_order = EXCLUDED.sort_order;

COMMENT ON TABLE public.catalog_marketing_terms IS
  'Vocabulário editorial do portal para classificar produtos externos sem alterar o cadastro mestre.';
COMMENT ON TABLE public.catalog_product_marketing IS
  'Associa produtos do catálogo externo a termos editoriais do portal Sicoob.';
COMMENT ON VIEW public.catalog_marketing_term_usage IS
  'Opções editoriais ativas e quantidade real de produtos classificados.';
