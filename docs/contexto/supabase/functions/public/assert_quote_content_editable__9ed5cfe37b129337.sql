CREATE OR REPLACE FUNCTION public.assert_quote_content_editable(p_quote_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_status text;
  v_is_latest boolean;
BEGIN
  IF p_quote_id IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'O item precisa pertencer a um orçamento válido.';
  END IF;

  SELECT q.status::text, COALESCE(q.is_latest_version, true)
    INTO v_status, v_is_latest
  FROM public.quotes q
  WHERE q.id = p_quote_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Orçamento do item não encontrado.';
  END IF;

  IF NOT v_is_latest
     OR v_status NOT IN ('draft', 'revision', 'rejected', 'rejected_singular') THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Os itens de um orçamento enviado ou decidido são imutáveis; crie uma nova versão para alterá-los.';
  END IF;
END;
$function$
