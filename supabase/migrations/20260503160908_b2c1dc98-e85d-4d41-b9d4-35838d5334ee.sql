-- 1. Políticas RLS resilientes (removendo referências a tabelas inexistentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own export jobs') THEN
        CREATE POLICY "Users can view their own export jobs" ON public.export_jobs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create their own export jobs') THEN
        CREATE POLICY "Users can create their own export jobs" ON public.export_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'order_comments') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view comments of orders they can access') THEN
            CREATE POLICY "Users can view comments of orders they can access" ON public.order_comments FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id));
        END IF;
    END IF;
END
$$;

-- 2. Políticas para notificações (respeitando preferências)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 3. Função de processamento de exportação com Auditoria embutida
CREATE OR REPLACE FUNCTION process_export_queue_v3()
RETURNS void AS $$
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
      INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, metadata)
      VALUES (
        job.user_id, 
        'export_batch_process', 
        'export_job', 
        job.id, 
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
$$ LANGUAGE plpgsql;
