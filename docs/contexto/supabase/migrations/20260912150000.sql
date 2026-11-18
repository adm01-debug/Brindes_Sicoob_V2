-- Protege instalações que já receberam a normalização de famílias. O bloqueio
-- da versão-pai serializa reparentamentos concorrentes e evita ciclos inversos.

CREATE OR REPLACE FUNCTION public.normalize_quote_parent_root()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_id uuid;
BEGIN
  IF NEW.parent_quote_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS NOT NULL AND NEW.parent_quote_id = NEW.id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Uma versão de orçamento não pode ser pai de si mesma.';
  END IF;

  PERFORM 1
  FROM public.quotes
  WHERE id = NEW.parent_quote_id
  FOR UPDATE;

  WITH RECURSIVE ancestry AS (
    SELECT q.id, q.parent_quote_id, ARRAY[q.id] AS path
    FROM public.quotes q
    WHERE q.id = NEW.parent_quote_id

    UNION ALL

    SELECT parent.id, parent.parent_quote_id, ancestry.path || parent.id
    FROM ancestry
    JOIN public.quotes parent ON parent.id = ancestry.parent_quote_id
    WHERE NOT parent.id = ANY(ancestry.path)
  )
  SELECT id
  INTO v_root_id
  FROM ancestry
  WHERE parent_quote_id IS NULL
  ORDER BY cardinality(path) DESC
  LIMIT 1;

  IF v_root_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A versão-pai não possui uma raiz válida.';
  END IF;

  IF NEW.id IS NOT NULL AND v_root_id = NEW.id THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A relação de versões criaria um ciclo.';
  END IF;

  NEW.parent_quote_id := v_root_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_quote_parent_root() FROM PUBLIC;
