import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createStructuredLogger } from "../_shared/structured-logger.ts";
import { getOrCreateRequestId } from "../_shared/request-id.ts";
import { requireInternalService } from "../_shared/internal-service-auth.ts";

const errorMessage = (error: unknown) => error instanceof Error ? error.message : "erro_desconhecido";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'metodo_nao_permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const denied = await requireInternalService(req)
  if (denied) return denied

  const requestId = getOrCreateRequestId(req);
  const log = createStructuredLogger({ fn: "process-batch-export", requestId, req });
  log.info("export_batch_start");

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: jobs, error: fetchError } = await supabaseClient
      .from('export_jobs')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .limit(5)

    if (fetchError) {
      log.error("fetch_jobs_failed", { err: fetchError.message });
      throw fetchError;
    }

    const results = []

    for (const job of (jobs || [])) {
      const jobLog = log.child({ job_id: job.id, entity_type: job.entity_type });
      jobLog.info("processing_job_start");

      try {
        await supabaseClient
          .from('export_jobs')
          .update({ status: 'processing', attempts: job.attempts + 1, updated_at: new Date().toISOString() })
          .eq('id', job.id)

        let exportData = []
        if (job.entity_type === 'orders') {
          const query = supabaseClient.from('sicoob_orders').select('*')
          if (job.filters) {
            if (job.filters.status) query.eq('status', job.filters.status)
            if (job.filters.start_date) query.gte('created_at', job.filters.start_date)
            if (job.filters.end_date) query.lte('created_at', job.filters.end_date)
          }
          const { data, error } = await query
          if (error) throw error
          exportData = data
        } else if (job.entity_type === 'quotes') {
          const query = supabaseClient.from('quotes').select('*')
          if (job.filters) {
            if (job.filters.status) query.eq('status', job.filters.status)
          }
          const { data, error } = await query
          if (error) throw error
          exportData = data
        }

        const fileName = `${job.entity_type}_export_${job.id}.${job.export_type}`
        const bucketName = 'exports'
        const content = JSON.stringify(exportData)
        
        const { error: uploadError } = await supabaseClient.storage
          .from(bucketName)
          .upload(fileName, content, {
            contentType: job.export_type === 'pdf' ? 'application/pdf' : 'text/csv',
            upsert: true
          })

        if (uploadError && uploadError.message !== 'The resource already exists') {
           jobLog.warn('storage_upload_warning', { err: uploadError.message });
        }

        const { data: { publicUrl } } = supabaseClient.storage
          .from(bucketName)
          .getPublicUrl(fileName)

        await supabaseClient
          .from('export_jobs')
          .update({ 
            status: 'completed', 
            file_url: publicUrl, 
            total_count: exportData.length,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id)

        await supabaseClient
          .from('export_audit_log')
          .insert({
            job_id: job.id,
            user_id: job.user_id,
            export_type: job.export_type,
            filters: job.filters,
            record_count: exportData.length,
            status: 'completed',
            file_url: publicUrl
          })

        jobLog.info("processing_job_ok", { record_count: exportData.length });
        results.push({ id: job.id, status: 'completed' })
      } catch (jobError) {
        const message = errorMessage(jobError);
        jobLog.error("processing_job_failed", { err: message });
        await supabaseClient
          .from('export_jobs')
          .update({ 
            status: 'failed', 
            error_message: message,
            updated_at: new Date().toISOString() 
          })
          .eq('id', job.id)
        
        results.push({ id: job.id, status: 'failed', error: message })
      }
    }

    log.info("export_batch_complete", { processed: results.length });

    return log.respond(new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    const message = errorMessage(error);
    log.error("export_batch_failed", { err: message });
    return log.respond(new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    }));
  }
})
