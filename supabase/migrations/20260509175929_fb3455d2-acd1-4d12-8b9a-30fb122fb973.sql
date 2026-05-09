-- Adicionar colunas faltantes se necessário ou renomear conforme padrão sugerido
ALTER TABLE public.quote_templates ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
ALTER TABLE public.quote_templates ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Se created_by estiver nulo e seller_id existir, popular created_by
UPDATE public.quote_templates SET created_by = seller_id WHERE created_by IS NULL AND seller_id IS NOT NULL;

-- Garantir políticas RLS (remover antigas se necessário para evitar duplicidade ou conflito)
DROP POLICY IF EXISTS "Templates are viewable by everyone in org or if public" ON public.quote_templates;
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.quote_templates;
DROP POLICY IF EXISTS "Admins can manage all templates" ON public.quote_templates;

-- Criar políticas robustas
CREATE POLICY "Templates viewable by everyone in org or if public"
ON public.quote_templates FOR SELECT
TO authenticated
USING (is_public OR created_by = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Users can manage their own templates"
ON public.quote_templates FOR ALL
TO authenticated
USING (created_by = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Admins can manage all templates"
ON public.quote_templates FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
