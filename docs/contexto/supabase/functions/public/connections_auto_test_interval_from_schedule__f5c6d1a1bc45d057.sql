CREATE OR REPLACE FUNCTION public.connections_auto_test_interval_from_schedule(p_schedule text)
 RETURNS integer
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  v_minute text;
  v_hour text;
BEGIN
  IF p_schedule IS NULL OR btrim(p_schedule) = '' THEN
    RETURN NULL;
  END IF;

  v_minute := split_part(p_schedule, ' ', 1);
  v_hour := split_part(p_schedule, ' ', 2);

  -- '*/N * * * *' -> N minutos. Passo de minuto combinado com passo de hora nao
  -- tem leitura unica em minutos, entao fica fora do contrato.
  IF v_minute LIKE '*/%' THEN
    IF v_hour IS DISTINCT FROM '*' THEN
      RETURN NULL;
    END IF;
    RETURN NULLIF(substring(v_minute FROM 3), '')::int;
  END IF;

  IF v_minute ~ '^[0-9]+$' THEN
    -- 'N * * * *' -> uma vez por hora.
    IF v_hour = '*' THEN
      RETURN 60;
    END IF;
    -- 'N */H * * *' -> uma vez a cada H horas.
    IF v_hour LIKE '*/%' THEN
      RETURN NULLIF(substring(v_hour FROM 3), '')::int * 60;
    END IF;
  END IF;

  RETURN NULL;
END
$function$
