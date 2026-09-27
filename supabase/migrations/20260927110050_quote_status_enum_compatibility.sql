-- O banco de construção mantém quotes.status como text e não possui mais o tipo
-- legado quote_status. A RPC de status usa o enum como validação de entrada;
-- criá-lo apenas quando ausente preserva ambos os esquemas sem alterar a tabela.
-- Esta migration precede as adições de valores em 20260927110100.
DO $$
DECLARE
  v_type_kind "char";
BEGIN
  SELECT t.typtype INTO v_type_kind
  FROM pg_catalog.pg_type t
  JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public' AND t.typname = 'quote_status';

  IF v_type_kind IS NULL THEN
    CREATE TYPE public.quote_status AS ENUM (
      'draft', 'pending', 'sent', 'approved', 'rejected', 'expired'
    );
  ELSIF v_type_kind <> 'e' THEN
    RAISE EXCEPTION 'public.quote_status existe, mas não é enum';
  END IF;
END;
$$;
