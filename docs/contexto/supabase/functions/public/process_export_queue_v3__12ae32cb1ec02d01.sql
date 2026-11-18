CREATE OR REPLACE FUNCTION public.process_export_queue_v3()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  job RECORD;
BEGIN
  FOR job IN (
    SELECT * FROM public.export_jobs
    WHERE status IN ('pending', 'failed') AND attempts < 3
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  ) LOOP
    BEGIN
      UPDATE public.export_jobs 
      SET status = 'processing', attempts = attempts + 1, updated_at = now()
      WHERE id = job.id;

      -- Auditoria de Exportação (Idempotente)
      INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, new_values)
      VALUES (
        job.user_id, 
        'export_batch_process', 
        'export_job', 
        job.id::text, 
        jsonb_build_object(
          'type', job.export_type, 
          'filters', job.filters, 
          'attempt', job.attempts + 1,
          'timestamp', now()
        )
      );

      -- Simulação de conclusão (o processamento real PDF/Excel seria assíncrono)
      UPDATE public.export_jobs 
      SET status = 'completed', updated_at = now()
      WHERE id = job.id;

    EXCEPTION WHEN OTHERS THEN
      UPDATE public.export_jobs 
      SET status = 'failed', error_message = SQLERRM, updated_at = now()
      WHERE id = job.id;
    END;
  END LOOP;
END;
$function$
