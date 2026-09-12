-- Corrige famílias históricas que encadearam parent_quote_id em vez de apontar
-- todas as versões diretamente para o orçamento raiz. O índice e a RPC de
-- versionamento passam a trabalhar sobre uma chave canônica única por família.

-- O índice anterior agrupava somente o pai imediato. Ele precisa sair antes de
-- reescrever uma cadeia antiga que possua mais de uma versão marcada como atual.
DROP INDEX IF EXISTS public.idx_quotes_one_latest_version_per_family;

-- Uma relação cíclica não possui raiz sem escolher arbitrariamente uma versão.
-- Interromper a migração preserva o histórico e exige correção explícita, em vez
-- de consolidar dados financeiros no orçamento errado.
DO $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE ancestry AS (
      SELECT
        q.id AS source_id,
        q.parent_quote_id AS next_id,
        ARRAY[q.id] AS path,
        false AS has_cycle
      FROM public.quotes q
      WHERE q.parent_quote_id IS NOT NULL

      UNION ALL

      SELECT
        ancestry.source_id,
        parent.parent_quote_id,
        ancestry.path || parent.id,
        parent.id = ANY(ancestry.path)
      FROM ancestry
      JOIN public.quotes parent ON parent.id = ancestry.next_id
      WHERE NOT ancestry.has_cycle
    )
    SELECT 1 FROM ancestry WHERE has_cycle
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Há uma cadeia cíclica de versões de orçamento; corrija parent_quote_id antes da migração.';
  END IF;
END;
$$;

-- Cada versão filha passa a apontar diretamente para a raiz. A recursão cobre
-- cadeias legadas de qualquer profundidade e mantém a raiz sem pai.
WITH RECURSIVE ancestry AS (
  SELECT
    q.id AS source_id,
    q.id AS ancestor_id,
    q.parent_quote_id AS next_id,
    ARRAY[q.id] AS path
  FROM public.quotes q

  UNION ALL

  SELECT
    ancestry.source_id,
    parent.id,
    parent.parent_quote_id,
    ancestry.path || parent.id
  FROM ancestry
  JOIN public.quotes parent ON parent.id = ancestry.next_id
  WHERE ancestry.next_id IS NOT NULL
    AND NOT parent.id = ANY(ancestry.path)
), canonical_roots AS (
  SELECT DISTINCT ON (source_id)
    source_id,
    ancestor_id AS root_id
  FROM ancestry
  WHERE next_id IS NULL
  ORDER BY source_id, cardinality(path) DESC
)
UPDATE public.quotes q
SET parent_quote_id = CASE WHEN q.id = roots.root_id THEN NULL ELSE roots.root_id END
FROM canonical_roots roots
WHERE q.id = roots.source_id
  AND q.parent_quote_id IS DISTINCT FROM CASE WHEN q.id = roots.root_id THEN NULL ELSE roots.root_id END;

-- Reaplica a invariável depois de normalizar as chaves de família. Em empate,
-- preserva a versão de maior número e, depois, a atualização mais recente.
WITH ranked_quotes AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY coalesce(parent_quote_id, id)
      ORDER BY version DESC, updated_at DESC, id DESC
    ) AS position
  FROM public.quotes
  WHERE deleted_at IS NULL
)
UPDATE public.quotes q
SET is_latest_version = ranked_quotes.position = 1
FROM ranked_quotes
WHERE q.id = ranked_quotes.id
  AND q.is_latest_version IS DISTINCT FROM (ranked_quotes.position = 1);

CREATE UNIQUE INDEX idx_quotes_one_latest_version_per_family
  ON public.quotes ((coalesce(parent_quote_id, id)))
  WHERE is_latest_version AND deleted_at IS NULL;

-- Impede que gravações futuras recriem uma cadeia. A RPC atômica já cria a
-- versão sob a raiz; este gatilho protege também fluxos administrativos.
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

  -- O UPDATE já bloqueia a linha filha. Bloquear também o pai evita que duas
  -- transações invertam a relação entre raízes distintas e formem um ciclo.
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

DROP TRIGGER IF EXISTS tr_normalize_quote_parent_root ON public.quotes;
CREATE TRIGGER tr_normalize_quote_parent_root
BEFORE INSERT OR UPDATE OF parent_quote_id ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.normalize_quote_parent_root();

CREATE OR REPLACE FUNCTION public.protect_latest_quote_version_deletion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_root_id uuid := COALESCE(OLD.parent_quote_id, OLD.id);
BEGIN
  IF TG_OP = 'UPDATE' AND NOT (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
    RETURN NEW;
  END IF;

  IF OLD.is_latest_version
     AND EXISTS (
       SELECT 1 FROM public.quotes q
       WHERE q.id <> OLD.id
         AND (q.id = v_root_id OR q.parent_quote_id = v_root_id)
         AND q.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'A versão vigente não pode ser excluída enquanto a família possuir outras versões.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.protect_latest_quote_version_deletion() FROM PUBLIC;
DROP TRIGGER IF EXISTS tr_protect_latest_quote_version_deletion ON public.quotes;
CREATE TRIGGER tr_protect_latest_quote_version_deletion
BEFORE DELETE OR UPDATE OF deleted_at ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.protect_latest_quote_version_deletion();

COMMENT ON FUNCTION public.normalize_quote_parent_root() IS
  'Normaliza parent_quote_id para a raiz canônica e bloqueia ciclos de versionamento.';
