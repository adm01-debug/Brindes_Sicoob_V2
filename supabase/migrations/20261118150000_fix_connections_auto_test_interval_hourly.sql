-- get_connections_auto_test_interval lia somente o campo de MINUTO do cron, e
-- por isso nao fechava o ciclo com set_connections_auto_test_interval, que grava
-- schedule de hora para os intervalos longos:
--
--   5/10/15/30 min -> '*/N * * * *'   (lido corretamente)
--   60 min         -> '0 * * * *'     (lido corretamente, pelo ramo numerico)
--   120 min        -> '0 */2 * * *'   <- minuto '0' casava com ^[0-9]+$ e a
--   240 min        -> '0 */4 * * *'      funcao devolvia 60, nao 120 nem 240
--
-- Efeitos no produto, com 2h ou 4h escolhidos pelo administrador em
-- AutoTestIntervalCard (INTERVAL_OPTIONS oferece as duas):
--   1. a tela relia 60 e mostrava "1 hora" logo depois de salvar "2 horas", como
--      se a configuracao nao tivesse sido gravada;
--   2. quem deriva o prazo de frescor do auto-teste desse valor passa a cobrar
--      teste a cada 60 minutos num cron que roda a cada 120 ou 240, gerando
--      notificacao de teste vencido para conexao saudavel.
--
-- Esta migration so corrige a LEITURA. set_connections_auto_test_interval nao
-- muda: os schedules que ele grava ja estao certos. Nenhum dado e alterado e
-- nenhum cron e reagendado.
--
-- Estado medido no projeto cfmzkthhgliqelozlmwu antes de aplicar: o job
-- 'connections-auto-test' esta em '*/15 * * * *', que a versao antiga ja lia
-- certo (15). O defeito esta latente e so aparece quando alguem escolhe 2 ou 4
-- horas na tela.
--
-- O parsing sai para uma funcao pura, separada da leitura do cron. Assim o
-- contrato fica verificavel por SELECT, sem precisar reagendar nada.

CREATE OR REPLACE FUNCTION public.connections_auto_test_interval_from_schedule(p_schedule text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = pg_catalog
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
$function$;

REVOKE ALL ON FUNCTION public.connections_auto_test_interval_from_schedule(text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.connections_auto_test_interval_from_schedule(text)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_connections_auto_test_interval()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, cron
AS $function$
DECLARE
  v_schedule text;
BEGIN
  SELECT schedule INTO v_schedule
    FROM cron.job
   WHERE jobname = 'connections-auto-test'
   LIMIT 1;
  RETURN public.connections_auto_test_interval_from_schedule(v_schedule);
END
$function$;

REVOKE ALL ON FUNCTION public.get_connections_auto_test_interval() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_connections_auto_test_interval()
  TO authenticated, service_role;

DO $assert$
DECLARE
  v_esperado jsonb := jsonb_build_object(
    '*/5 * * * *', 5,
    '*/10 * * * *', 10,
    '*/15 * * * *', 15,
    '*/30 * * * *', 30,
    '0 * * * *', 60,
    '0 */2 * * *', 120,
    '0 */4 * * *', 240
  );
  v_chave text;
  v_lido integer;
BEGIN
  -- Fecha o ciclo com os 7 valores que set_connections_auto_test_interval aceita.
  FOR v_chave IN SELECT jsonb_object_keys(v_esperado) LOOP
    v_lido := public.connections_auto_test_interval_from_schedule(v_chave);
    IF v_lido IS DISTINCT FROM (v_esperado ->> v_chave)::integer THEN
      RAISE EXCEPTION
        'Contrato inválido: schedule % deveria ler % minutos, leu %',
        v_chave, v_esperado ->> v_chave, COALESCE(v_lido::text, 'nulo');
    END IF;
  END LOOP;

  -- Schedule que o setter nunca grava nao tem leitura em minutos.
  IF public.connections_auto_test_interval_from_schedule('7,22,37,52 * * * *') IS NOT NULL
     OR public.connections_auto_test_interval_from_schedule('*/5 */2 * * *') IS NOT NULL
     OR public.connections_auto_test_interval_from_schedule('0 3 1 * *') IS NOT NULL
     OR public.connections_auto_test_interval_from_schedule(NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Contrato inválido: schedule fora do contrato deveria ler nulo.';
  END IF;

  IF NOT COALESCE((
    SELECT p.prosecdef
       AND p.proconfig @> ARRAY['search_path=pg_catalog, public, cron']::text[]
       AND NOT pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
       AND pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      FROM pg_catalog.pg_proc AS p
     WHERE p.oid = 'public.get_connections_auto_test_interval()'::regprocedure
  ), false) THEN
    RAISE EXCEPTION 'Contrato inválido: leitura do intervalo de auto-teste exposta fora do esperado.';
  END IF;
END
$assert$;
