-- ============================================================
-- GIFTS STORE - MIGRATION 07 - ESTRUTURA COMPLETA PARA BRINDES
-- Sistema Promobrind - Estrutura perfeita para catálogo
-- Data: 03/01/2025
-- ============================================================

-- ============================================================
-- PARTE 1: ADICIONAR CAMPO product_type EM products
-- ============================================================

-- Diferenciar produtos simples de kits
ALTER TABLE public.products
ADD COLUMN product_type TEXT DEFAULT 'simple' 
CHECK (product_type IN ('simple', 'kit', 'component'));

COMMENT ON COLUMN public.products.product_type IS '
simple = produto vendível normal
kit = conjunto de produtos vendido junto
component = componente usado apenas dentro de kits
';

-- ============================================================
-- PARTE 2: TABELA product_kit_components
-- Define quais produtos compõem um kit
-- ============================================================

CREATE TABLE public.product_kit_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Produto KIT pai
  kit_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Produto componente
  component_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Quantidade no kit
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  -- Componente é opcional ou obrigatório
  is_optional BOOLEAN DEFAULT false,
  
  -- Se componente pode ser substituído
  is_replaceable BOOLEAN DEFAULT false,
  
  -- Variantes permitidas (UUID[] ou JSONB)
  allowed_variant_ids JSONB DEFAULT '[]',
  
  -- Ordem de exibição
  display_order INTEGER DEFAULT 0,
  
  -- Notas sobre este componente
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que kit não aponta para si mesmo
  CHECK (kit_product_id != component_product_id),
  
  -- Garantir unicidade
  UNIQUE(kit_product_id, component_product_id)
);

COMMENT ON TABLE public.product_kit_components IS 
'Componentes que formam um produto KIT. Ex: Kit Executivo = Caneta + Caderno + Mouse Pad';

-- Índices
CREATE INDEX idx_kit_components_kit ON public.product_kit_components(kit_product_id);
CREATE INDEX idx_kit_components_component ON public.product_kit_components(component_product_id);

-- Trigger updated_at
CREATE TRIGGER update_product_kit_components_updated_at
  BEFORE UPDATE ON public.product_kit_components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PARTE 3: TABELA product_personalization_options
-- Define quais técnicas cada produto aceita e seus preços
-- ============================================================

CREATE TABLE public.product_personalization_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Produto
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Técnica de personalização
  technique_id UUID NOT NULL REFERENCES public.personalization_techniques(id) ON DELETE CASCADE,
  
  -- Preços específicos para ESTE produto + técnica
  base_price DECIMAL(10,2),
  price_per_color DECIMAL(10,2),
  price_per_position DECIMAL(10,2),
  price_per_unit DECIMAL(10,2),
  
  -- Quantidade mínima e máxima
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  
  -- Área máxima de impressão (específica para este produto)
  max_print_area JSONB,
  -- Ex: {"width": 10, "height": 10, "unit": "cm"}
  
  -- Máximo de cores permitidas (pode ser menor que técnica)
  max_colors INTEGER,
  
  -- Posições disponíveis neste produto
  available_positions JSONB DEFAULT '[]',
  -- Ex: ["frente", "costas", "manga_direita", "manga_esquerda", "bolso"]
  
  -- Tempo de produção específico (dias)
  production_days INTEGER,
  
  -- Observações técnicas
  technical_notes TEXT,
  
  -- Status
  is_available BOOLEAN DEFAULT true,
  is_recommended BOOLEAN DEFAULT false,
  
  -- Ordem de exibição
  display_order INTEGER DEFAULT 0,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Garantir unicidade produto + técnica
  UNIQUE(product_id, technique_id)
);

COMMENT ON TABLE public.product_personalization_options IS 
'Define quais técnicas de personalização cada produto aceita e preços específicos. Ex: Caneca aceita Serigrafia e Sublimação, mas NÃO Bordado.';

-- Índices
CREATE INDEX idx_personalization_options_product ON public.product_personalization_options(product_id);
CREATE INDEX idx_personalization_options_technique ON public.product_personalization_options(technique_id);
CREATE INDEX idx_personalization_options_available ON public.product_personalization_options(is_available) WHERE is_available = true;

-- Trigger updated_at
CREATE TRIGGER update_product_personalization_options_updated_at
  BEFORE UPDATE ON public.product_personalization_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PARTE 4: TABELA product_print_areas
-- Define áreas específicas de impressão em cada produto
-- ============================================================

CREATE TABLE public.product_print_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Produto
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Nome da área
  area_name TEXT NOT NULL,
  -- Ex: "Frente", "Costas", "Manga Direita", "Bolso", "Tampa"
  
  -- Dimensões da área
  max_width DECIMAL(10,2) NOT NULL,
  max_height DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'cm' CHECK (unit IN ('cm', 'mm', 'in')),
  
  -- Formato da área
  shape TEXT DEFAULT 'rectangle' CHECK (shape IN ('rectangle', 'circle', 'oval', 'custom')),
  
  -- Dados de posição para mockups (coordenadas)
  position_data JSONB,
  -- Ex: {"x": 150, "y": 200, "rotation": 0, "scale": 1}
  
  -- Técnicas aceitas NESTA área específica
  allowed_technique_ids JSONB DEFAULT '[]',
  -- Ex: ["uuid-serigrafia", "uuid-bordado"]
  
  -- Se esta área é a padrão/principal
  is_primary BOOLEAN DEFAULT false,
  
  -- Custo adicional por usar esta área
  additional_cost DECIMAL(10,2) DEFAULT 0,
  
  -- Ordem de preferência
  display_order INTEGER DEFAULT 0,
  
  -- Imagem de exemplo desta área
  example_image_url TEXT,
  
  -- Notas
  notes TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.product_print_areas IS 
'Áreas específicas de impressão em cada produto. Ex: Camiseta tem Frente, Costas, Manga, Bolso.';

-- Índices
CREATE INDEX idx_print_areas_product ON public.product_print_areas(product_id);
CREATE INDEX idx_print_areas_active ON public.product_print_areas(is_active) WHERE is_active = true;
CREATE INDEX idx_print_areas_primary ON public.product_print_areas(is_primary) WHERE is_primary = true;

-- Trigger updated_at
CREATE TRIGGER update_product_print_areas_updated_at
  BEFORE UPDATE ON public.product_print_areas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PARTE 5: TABELA product_technique_pricing_tiers
-- Tabela de preços escalonados por quantidade
-- ============================================================

CREATE TABLE public.product_technique_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Referência à opção de personalização
  personalization_option_id UUID NOT NULL REFERENCES public.product_personalization_options(id) ON DELETE CASCADE,
  
  -- Faixa de quantidade
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  max_quantity INTEGER CHECK (max_quantity IS NULL OR max_quantity >= min_quantity),
  
  -- Preços nesta faixa
  unit_price DECIMAL(10,2) NOT NULL,
  setup_fee DECIMAL(10,2) DEFAULT 0,
  
  -- Desconto percentual
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.product_technique_pricing_tiers IS 
'Preços escalonados por quantidade. Ex: 1-50 unidades = R$ 10,00 | 51-100 = R$ 8,50 | 101+ = R$ 7,00';

-- Índices
CREATE INDEX idx_pricing_tiers_option ON public.product_technique_pricing_tiers(personalization_option_id);

-- ============================================================
-- PARTE 6: VIEW - Produtos com Técnicas Disponíveis
-- ============================================================

CREATE OR REPLACE VIEW public.v_products_with_techniques AS
SELECT 
  p.id as product_id,
  p.name as product_name,
  p.sku,
  p.product_type,
  p.base_price,
  
  -- Técnicas disponíveis (agregado)
  COALESCE(
    json_agg(
      json_build_object(
        'technique_id', t.id,
        'technique_name', t.name,
        'technique_code', t.code,
        'base_price', po.base_price,
        'price_per_color', po.price_per_color,
        'max_colors', po.max_colors,
        'max_print_area', po.max_print_area,
        'available_positions', po.available_positions,
        'is_recommended', po.is_recommended,
        'production_days', COALESCE(po.production_days, t.production_time_days)
      ) ORDER BY po.display_order, t.name
    ) FILTER (WHERE t.id IS NOT NULL),
    '[]'::json
  ) as techniques,
  
  -- Áreas de impressão (agregado)
  (
    SELECT json_agg(
      json_build_object(
        'area_id', pa.id,
        'area_name', pa.area_name,
        'max_width', pa.max_width,
        'max_height', pa.max_height,
        'unit', pa.unit,
        'is_primary', pa.is_primary
      ) ORDER BY pa.display_order
    )
    FROM public.product_print_areas pa
    WHERE pa.product_id = p.id
      AND pa.is_active = true
  ) as print_areas,
  
  -- Se é kit, seus componentes
  CASE 
    WHEN p.product_type = 'kit' THEN (
      SELECT json_agg(
        json_build_object(
          'component_id', comp.id,
          'component_name', comp.name,
          'component_sku', comp.sku,
          'quantity', kc.quantity,
          'is_optional', kc.is_optional
        ) ORDER BY kc.display_order
      )
      FROM public.product_kit_components kc
      JOIN public.products comp ON comp.id = kc.component_product_id
      WHERE kc.kit_product_id = p.id
    )
    ELSE NULL
  END as kit_components

FROM public.products p
LEFT JOIN public.product_personalization_options po ON po.product_id = p.id AND po.is_available = true
LEFT JOIN public.personalization_techniques t ON t.id = po.technique_id AND t.is_active = true

WHERE p.is_active = true

GROUP BY p.id;

COMMENT ON VIEW public.v_products_with_techniques IS 
'View consolidada de produtos com todas as suas técnicas, áreas e componentes (se kit)';

-- ============================================================
-- PARTE 7: FUNCTION - Calcular Preço de Personalização
-- ============================================================

CREATE OR REPLACE FUNCTION public.calculate_personalization_price(
  p_product_id UUID,
  p_technique_id UUID,
  p_quantity INTEGER,
  p_num_colors INTEGER DEFAULT 1,
  p_num_positions INTEGER DEFAULT 1
)
RETURNS TABLE (
  base_price DECIMAL(10,2),
  color_cost DECIMAL(10,2),
  position_cost DECIMAL(10,2),
  quantity_discount DECIMAL(5,2),
  final_unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2)
) AS $$
DECLARE
  v_option RECORD;
  v_tier RECORD;
  v_base DECIMAL(10,2);
  v_color DECIMAL(10,2);
  v_position DECIMAL(10,2);
  v_discount DECIMAL(5,2) := 0;
  v_unit_price DECIMAL(10,2);
  v_total DECIMAL(10,2);
BEGIN
  -- Buscar opção de personalização
  SELECT * INTO v_option
  FROM public.product_personalization_options
  WHERE product_id = p_product_id
    AND technique_id = p_technique_id
    AND is_available = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Técnica não disponível para este produto';
  END IF;
  
  -- Preços base
  v_base := COALESCE(v_option.base_price, 0);
  v_color := COALESCE(v_option.price_per_color, 0) * (p_num_colors - 1); -- primeira cor já no base
  v_position := COALESCE(v_option.price_per_position, 0) * (p_num_positions - 1);
  
  -- Buscar tier de preço por quantidade
  SELECT * INTO v_tier
  FROM public.product_technique_pricing_tiers
  WHERE personalization_option_id = v_option.id
    AND p_quantity >= min_quantity
    AND (max_quantity IS NULL OR p_quantity <= max_quantity)
  ORDER BY min_quantity DESC
  LIMIT 1;
  
  IF FOUND THEN
    v_unit_price := v_tier.unit_price;
    v_discount := v_tier.discount_percentage;
  ELSE
    v_unit_price := v_base + v_color + v_position;
  END IF;
  
  -- Aplicar desconto
  IF v_discount > 0 THEN
    v_unit_price := v_unit_price * (1 - v_discount / 100);
  END IF;
  
  v_total := v_unit_price * p_quantity;
  
  RETURN QUERY SELECT 
    v_base,
    v_color,
    v_position,
    v_discount,
    v_unit_price,
    v_total;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.calculate_personalization_price IS 
'Calcula preço de personalização considerando quantidade, cores, posições e descontos progressivos';

-- ============================================================
-- PARTE 8: SEED DATA - Áreas de Impressão Comuns
-- ============================================================

-- Função para criar áreas padrão em produtos
CREATE OR REPLACE FUNCTION public.create_default_print_areas_for_product(
  p_product_id UUID,
  p_product_category TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Áreas para CAMISETAS
  IF p_product_category IN ('camisetas', 'polos', 'vestuario') THEN
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Frente', 20, 30, true, 1),
      (p_product_id, 'Costas', 25, 35, false, 2),
      (p_product_id, 'Manga Direita', 10, 10, false, 3),
      (p_product_id, 'Manga Esquerda', 10, 10, false, 4),
      (p_product_id, 'Bolso', 8, 8, false, 5);
  
  -- Áreas para CANECAS
  ELSIF p_product_category IN ('canecas', 'copos') THEN
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, shape, is_primary, display_order)
    VALUES
      (p_product_id, 'Frontal', 8, 8, 'rectangle', true, 1),
      (p_product_id, '360º', 24, 8, 'rectangle', false, 2);
  
  -- Áreas para CADERNOS
  ELSIF p_product_category IN ('cadernos', 'agendas') THEN
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Capa Frontal', 15, 21, true, 1),
      (p_product_id, 'Capa Traseira', 15, 21, false, 2),
      (p_product_id, 'Lombada', 2, 21, false, 3);
  
  -- Áreas para CANETAS
  ELSIF p_product_category IN ('canetas', 'escrita') THEN
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, shape, is_primary, display_order)
    VALUES
      (p_product_id, 'Corpo', 5, 0.8, 'rectangle', true, 1),
      (p_product_id, 'Clip', 3, 0.5, 'rectangle', false, 2);
  
  -- Áreas para MOCHILAS/BOLSAS
  ELSIF p_product_category IN ('mochilas', 'bolsas', 'necessaires') THEN
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Frente', 20, 20, true, 1),
      (p_product_id, 'Bolso Frontal', 15, 15, false, 2),
      (p_product_id, 'Lateral', 10, 20, false, 3);
  
  ELSE
    -- Área genérica padrão
    INSERT INTO public.product_print_areas 
      (product_id, area_name, max_width, max_height, is_primary, display_order)
    VALUES
      (p_product_id, 'Área Principal', 10, 10, true, 1);
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.create_default_print_areas_for_product IS 
'Cria áreas de impressão padrão baseado na categoria do produto';

-- ============================================================
-- PARTE 9: RLS POLICIES
-- ============================================================

-- PRODUCT_KIT_COMPONENTS
ALTER TABLE public.product_kit_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_kit_components"
ON public.product_kit_components FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_kit_components.kit_product_id
      AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
  )
);

CREATE POLICY "org_admins_manage_kit_components"
ON public.product_kit_components FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_kit_components.kit_product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_kit_components.kit_product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
);

-- PRODUCT_PERSONALIZATION_OPTIONS
ALTER TABLE public.product_personalization_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_personalization_options"
ON public.product_personalization_options FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_personalization_options.product_id
      AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
  )
);

CREATE POLICY "org_admins_manage_personalization_options"
ON public.product_personalization_options FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_personalization_options.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_personalization_options.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
);

-- PRODUCT_PRINT_AREAS
ALTER TABLE public.product_print_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_print_areas"
ON public.product_print_areas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_print_areas.product_id
      AND (organization_id IS NULL OR public.user_is_org_member(organization_id))
  )
);

CREATE POLICY "org_admins_manage_print_areas"
ON public.product_print_areas FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_print_areas.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.products
    WHERE id = product_print_areas.product_id
      AND public.is_org_owner_or_admin(organization_id)
  )
);

-- PRODUCT_TECHNIQUE_PRICING_TIERS
ALTER TABLE public.product_technique_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_view_pricing_tiers"
ON public.product_technique_pricing_tiers FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.product_personalization_options po
    JOIN public.products p ON p.id = po.product_id
    WHERE po.id = product_technique_pricing_tiers.personalization_option_id
      AND (p.organization_id IS NULL OR public.user_is_org_member(p.organization_id))
  )
);

CREATE POLICY "org_admins_manage_pricing_tiers"
ON public.product_technique_pricing_tiers FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.product_personalization_options po
    JOIN public.products p ON p.id = po.product_id
    WHERE po.id = product_technique_pricing_tiers.personalization_option_id
      AND public.is_org_owner_or_admin(p.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.product_personalization_options po
    JOIN public.products p ON p.id = po.product_id
    WHERE po.id = product_technique_pricing_tiers.personalization_option_id
      AND public.is_org_owner_or_admin(p.organization_id)
  )
);

-- ============================================================
-- PARTE 10: GRANTS
-- ============================================================

GRANT SELECT ON public.product_kit_components TO authenticated;
GRANT SELECT ON public.product_personalization_options TO authenticated;
GRANT SELECT ON public.product_print_areas TO authenticated;
GRANT SELECT ON public.product_technique_pricing_tiers TO authenticated;
GRANT SELECT ON public.v_products_with_techniques TO authenticated;

-- ============================================================
-- MENSAGEM DE SUCESSO
-- ============================================================

SELECT 
  '✅ Migration 07 executada com sucesso!' as message,
  'Sistema COMPLETO para catálogo de brindes promocionais' as status,
  '4 novas tabelas + 1 view + funções + RLS' as summary;
