-- Remover função antiga para evitar erro de mudança de tipo de retorno
DROP FUNCTION IF EXISTS public.search_products_semantic(text, jsonb, integer);

-- Habilitar a extensão pg_trgm se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Criar a função RPC para busca semântica (re-ranking) com retorno explícito de tabela
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  _query TEXT,
  _products JSONB,
  _limit INT DEFAULT 20
)
RETURNS TABLE (
  product_id UUID,
  score FLOAT,
  matched_field TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p_item JSONB;
BEGIN
  -- Iterar sobre a lista de produtos fornecida (JSONB)
  FOR p_item IN SELECT * FROM jsonb_array_elements(_products)
  LOOP
    DECLARE
        p_id UUID := (p_item->>'id')::UUID;
        p_name TEXT := COALESCE(p_item->>'name', '');
        p_description TEXT := COALESCE(p_item->>'description', '');
        p_category TEXT := COALESCE(p_item->>'category', '');
        p_tags TEXT[];
        v_score FLOAT;
        v_matched_field TEXT;
    BEGIN
        -- Extrair tags como array de texto
        SELECT ARRAY_AGG(x)::TEXT[] INTO p_tags 
        FROM jsonb_array_elements_text(COALESCE(p_item->'tags', '[]'::jsonb)) x;

        -- Calcular similaridade usando pg_trgm
        v_score := similarity(p_name, _query) * 1.0;
        v_matched_field := 'name';

        IF similarity(p_category, _query) * 0.8 > v_score THEN
            v_score := similarity(p_category, _query) * 0.8;
            v_matched_field := 'category';
        END IF;

        IF p_tags IS NOT NULL AND array_length(p_tags, 1) > 0 THEN
            DECLARE
                tag_text TEXT := array_to_string(p_tags, ' ');
                tag_score FLOAT := similarity(tag_text, _query) * 0.7;
            BEGIN
                IF tag_score > v_score THEN
                    v_score := tag_score;
                    v_matched_field := 'tags';
                END IF;
            END;
        END IF;

        IF similarity(p_description, _query) * 0.5 > v_score THEN
            v_score := similarity(p_description, _query) * 0.5;
            v_matched_field := 'description';
        END IF;

        -- Retornar se houver similaridade mínima
        IF v_score > 0.05 THEN
          product_id := p_id;
          score := v_score;
          matched_field := v_matched_field;
          RETURN NEXT;
        END IF;
    END;
  END LOOP;
  RETURN;
END;
$$;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.search_products_semantic(TEXT, JSONB, INT) TO anon, authenticated, service_role;
