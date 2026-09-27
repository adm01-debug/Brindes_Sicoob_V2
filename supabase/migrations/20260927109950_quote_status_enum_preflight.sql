-- A RPC de transição abaixo usa quote_status como contrato de validação.
-- O banco canônico ainda conserva quotes.status como text e não tem o tipo
-- legado; esta pré-condição precisa rodar antes da primeira RPC que o cita.
DO $$
DECLARE
  v_type_kind "char";
BEGIN
  SELECT t.typtype INTO v_type_kind
  FROM pg_catalog.pg_type AS t
  JOIN pg_catalog.pg_namespace AS n ON n.oid = t.typnamespace
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
