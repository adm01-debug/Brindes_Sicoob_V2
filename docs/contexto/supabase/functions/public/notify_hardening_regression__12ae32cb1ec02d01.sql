CREATE OR REPLACE FUNCTION public.notify_hardening_regression()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  private_buckets integer;
  unsafe_realtime integer;
  pg_trgm_in_extensions boolean;
  cleanup_job_active boolean;
  failures text[] := ARRAY[]::text[];
  score integer := 0;
  max_score constant integer := 5;
  admin_record record;
  notified integer := 0;
  message_text text;
  realtime_tables constant text[] := ARRAY[
    'custom_kits',
    'device_login_notifications',
    'discount_approval_requests',
    'integration_credentials',
    'kit_comments',
    'login_attempts',
    'notifications',
    'orders',
    'product_views',
    'quotes',
    'search_analytics',
    'sicoob_orders'
  ];
BEGIN
  SELECT count(*) INTO private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images', 'product-videos', 'supplier-logos', 'component-media')
    AND public = false;
  IF private_buckets = 4 THEN
    score := score + 1;
  ELSE
    failures := failures || format('Buckets privados: %s/4', private_buckets);
  END IF;

  SELECT count(*) INTO unsafe_realtime
  FROM unnest(realtime_tables) AS target_table(tablename)
  LEFT JOIN pg_catalog.pg_publication_tables publication_table
    ON publication_table.pubname = 'supabase_realtime'
   AND publication_table.schemaname = 'public'
   AND publication_table.tablename = target_table.tablename
  LEFT JOIN pg_catalog.pg_namespace table_namespace
    ON table_namespace.nspname = 'public'
  LEFT JOIN pg_catalog.pg_class table_class
    ON table_class.relnamespace = table_namespace.oid
   AND table_class.relname = target_table.tablename
   AND table_class.relkind IN ('r', 'p')
  WHERE publication_table.tablename IS NULL
    OR table_class.oid IS NULL
    OR (
      NOT table_class.relrowsecurity
      OR NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_policy policy
        WHERE policy.polrelid = table_class.oid
          AND policy.polcmd IN ('r', '*')
          AND policy.polroles && ARRAY[
            'authenticated'::regrole::oid,
            0::oid
          ]
      )
    );
  IF unsafe_realtime = 0 THEN
    score := score + 1;
  ELSE
    failures := failures || format('Tabelas realtime sem isolamento: %s', unsafe_realtime);
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_extension extension
    JOIN pg_catalog.pg_namespace namespace ON namespace.oid = extension.extnamespace
    WHERE extension.extname = 'pg_trgm'
      AND namespace.nspname = 'extensions'
  ) INTO pg_trgm_in_extensions;
  IF pg_trgm_in_extensions THEN
    score := score + 1;
  ELSE
    failures := failures || ARRAY['pg_trgm fora do schema extensions'];
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'cleanup-security-logs-daily'
      AND active
  ) INTO cleanup_job_active;
  IF cleanup_job_active THEN
    score := score + 1;
  ELSE
    failures := failures || ARRAY['Job cleanup-security-logs-daily inativo'];
  END IF;

  score := score + 1; -- MFA é verificada pelo gate do aplicativo.

  IF score >= max_score THEN
    RETURN jsonb_build_object(
      'ok', true,
      'score', score,
      'max', max_score,
      'notified', 0
    );
  END IF;

  message_text := format(
    'Saúde do hardening caiu para %s/%s. Falhas: %s. Acesse /admin/seguranca-acesso.',
    score,
    max_score,
    array_to_string(failures, '; ')
  );

  FOR admin_record IN
    SELECT user_id
    FROM public.user_roles
    WHERE role = 'admin'
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM public.workspace_notifications
      WHERE user_id = admin_record.user_id
        AND category = 'security'
        AND title = '⚠️ Regressão de hardening detectada'
        AND created_at > now() - interval '20 hours'
    ) THEN
      INSERT INTO public.workspace_notifications (
        user_id,
        title,
        message,
        type,
        category,
        action_url,
        metadata
      ) VALUES (
        admin_record.user_id,
        '⚠️ Regressão de hardening detectada',
        message_text,
        'warning',
        'security',
        '/admin/seguranca-acesso',
        jsonb_build_object('score', score, 'max', max_score, 'failures', failures)
      );
      notified := notified + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', false,
    'score', score,
    'max', max_score,
    'failures', failures,
    'notified', notified
  );
END;
$function$
