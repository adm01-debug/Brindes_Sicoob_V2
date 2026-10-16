-- Executar após as migrations de search_analytics em banco descartável.
-- IDs capturados eliminam dependência de termos únicos e o ROLLBACK não deixa dados.
BEGIN;

CREATE TEMP TABLE fixture_search_analytics_ids (
  scenario text PRIMARY KEY,
  id uuid NOT NULL UNIQUE
) ON COMMIT DROP;
GRANT INSERT ON TABLE fixture_search_analytics_ids TO authenticated;

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);

WITH inserted AS (
  INSERT INTO public.search_analytics (
    search_term,
    results_count,
    seller_id,
    filters_used
  ) VALUES (
    'fixture legado',
    3,
    '22222222-2222-4222-8222-222222222222',
    '{"categoria":"canecas"}'::jsonb
  )
  RETURNING id
)
INSERT INTO fixture_search_analytics_ids (scenario, id)
SELECT 'legado', id FROM inserted;

WITH inserted AS (
  INSERT INTO public.search_analytics (
    user_id,
    search_term,
    results_count,
    search_context,
    seller_id,
    filters_used
  ) VALUES (
    '22222222-2222-4222-8222-222222222222',
    'fixture autoria canônica forjada',
    1,
    '{"origem":"canonica"}',
    '22222222-2222-4222-8222-222222222222',
    '{"origem":"legada"}'::jsonb
  )
  RETURNING id
)
INSERT INTO fixture_search_analytics_ids (scenario, id)
SELECT 'autoria_canonica_forjada', id FROM inserted;

RESET ROLE;

SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);
DO $anon_denied$
BEGIN
  BEGIN
    INSERT INTO public.search_analytics (search_term, results_count)
    VALUES ('fixture anon proibido', 0);
    RAISE EXCEPTION 'Anon inseriu telemetria sem autenticação.';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END
$anon_denied$;
RESET ROLE;

DO $assert$
DECLARE
  v_actor constant uuid := '11111111-1111-4111-8111-111111111111';
  v_legacy public.search_analytics%ROWTYPE;
  v_forged public.search_analytics%ROWTYPE;
BEGIN
  SELECT analytics.*
  INTO STRICT v_legacy
  FROM public.search_analytics AS analytics
  JOIN fixture_search_analytics_ids AS fixture
    ON fixture.id = analytics.id
  WHERE fixture.scenario = 'legado';

  IF v_legacy.user_id <> v_actor OR v_legacy.seller_id <> v_actor THEN
    RAISE EXCEPTION 'A autoria legada não foi normalizada para auth.uid().';
  END IF;

  IF v_legacy.search_context::jsonb <> '{"categoria":"canecas"}'::jsonb THEN
    RAISE EXCEPTION 'filters_used não foi convertido para search_context.';
  END IF;

  SELECT analytics.*
  INTO STRICT v_forged
  FROM public.search_analytics AS analytics
  JOIN fixture_search_analytics_ids AS fixture
    ON fixture.id = analytics.id
  WHERE fixture.scenario = 'autoria_canonica_forjada';

  IF v_forged.user_id <> v_actor OR v_forged.seller_id <> v_actor THEN
    RAISE EXCEPTION 'Autoria canônica forjada não foi sobrescrita por auth.uid().';
  END IF;

  IF v_forged.search_context::jsonb <> '{"origem":"canonica"}'::jsonb THEN
    RAISE EXCEPTION 'search_context canônico foi sobrescrito pelo payload legado.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.search_analytics WHERE search_term = 'fixture anon proibido'
  ) THEN
    RAISE EXCEPTION 'Insert anônimo proibido persistiu indevidamente.';
  END IF;
END
$assert$;

ROLLBACK;
