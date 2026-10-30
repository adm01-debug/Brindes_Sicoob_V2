import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as XLSX from 'npm:xlsx@0.18.5'
import { createStructuredLogger } from '../_shared/structured-logger.ts'
import { getOrCreateRequestId } from '../_shared/request-id.ts'
import { requireInternalService } from '../_shared/internal-service-auth.ts'

type ExportType = 'csv' | 'excel' | 'pdf'
type ExportJob = {
  id: string
  user_id: string
  entity_type: 'orders' | 'quotes'
  export_type: ExportType
  filters: Record<string, unknown> | null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-request-id, x-sicoob-internal-secret',
}

const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'erro_desconhecido'
const escapeCsv = (value: unknown) => {
  const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  const protectedText = /^[=+\-@]/.test(text) ? `'${text}` : text
  return `"${protectedText.replaceAll('"', '""')}"`
}

function csvBytes(rows: Record<string, unknown>[]) {
  const keys = [...new Set(rows.flatMap(row => Object.keys(row)))].sort()
  const lines = [keys.map(escapeCsv).join(';'), ...rows.map(row => keys.map(key => escapeCsv(row[key])).join(';'))]
  return new TextEncoder().encode(`\uFEFF${lines.join('\r\n')}`)
}

function pdfBytes(rows: Record<string, unknown>[]) {
  const lines = rows.length === 0
    ? ['Exportação sem registros.']
    : rows.flatMap(row => Object.entries(row).map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')}`))
  const escaped = lines.map(line => line.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)'))
  const chunks = Array.from({ length: Math.ceil(escaped.length / 45) }, (_, index) => escaped.slice(index * 45, (index + 1) * 45))
  const pageIds = chunks.map((_, index) => 3 + index * 2)
  const fontId = 3 + chunks.length * 2
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`,
  ]
  chunks.forEach((chunk, index) => {
    const pageId = pageIds[index]
    const contentId = pageId + 1
    const content = ['BT', '/F1 9 Tf', '50 790 Td', ...chunk.flatMap((line, lineIndex) => lineIndex === 0 ? [`(${line.slice(0, 160)}) Tj`] : ['0 -14 Td', `(${line.slice(0, 160)}) Tj`]), 'ET'].join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    objects.push(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`)
  })
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  let pdf = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n` })
  const xref = new TextEncoder().encode(pdf).length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

function buildFile(rows: Record<string, unknown>[], exportType: ExportType) {
  if (exportType === 'csv') return { content: csvBytes(rows), extension: 'csv', contentType: 'text/csv; charset=utf-8' }
  if (exportType === 'excel') {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Dados')
    return { content: XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }), extension: 'xlsx', contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  }
  return { content: pdfBytes(rows), extension: 'pdf', contentType: 'application/pdf' }
}

async function exportRows(client: any, job: ExportJob) {
  const filters = job.filters && typeof job.filters === 'object' ? job.filters : {}
  if (job.entity_type === 'orders') {
    const { data, error } = await client.rpc('sicoob_export_orders_for_actor', { p_actor_id: job.user_id, p_filters: filters })
    if (error) throw error
    return (data ?? []) as Record<string, unknown>[]
  }
  const query = client.from('quotes').select('*').eq('seller_id', job.user_id).order('created_at', { ascending: false })
  if (typeof filters.status === 'string' && filters.status) query.eq('status', filters.status)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Record<string, unknown>[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'metodo_nao_permitido' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  const denied = await requireInternalService(req)
  if (denied) return denied

  const requestId = getOrCreateRequestId(req)
  const log = createStructuredLogger({ fn: 'process-batch-export', requestId, req })
  const client: any = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
  try {
    const { error: scheduleError } = await client.rpc('enqueue_due_sicoob_scheduled_exports')
    if (scheduleError) throw scheduleError
    const { data: jobs, error: claimError } = await client.rpc('claim_sicoob_export_jobs', { p_limit: 5 })
    if (claimError) throw claimError
    const results = []
    for (const job of (jobs ?? []) as ExportJob[]) {
      const jobLog = log.child({ job_id: job.id, entity_type: job.entity_type })
      try {
        const rows = await exportRows(client, job)
        const file = buildFile(rows, job.export_type)
        const filePath = `${job.user_id}/${job.id}/${job.entity_type}-export.${file.extension}`
        const { error: uploadError } = await client.storage.from('exports').upload(filePath, file.content, { contentType: file.contentType, upsert: false })
        if (uploadError) throw uploadError
        const { error: completeError } = await client.from('export_jobs').update({ status: 'completed', file_path: filePath, file_url: null, total_count: rows.length, updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing')
        if (completeError) throw completeError
        const { error: auditError } = await client.from('export_audit_log').insert({ job_id: job.id, user_id: job.user_id, export_type: job.export_type, filters: job.filters, record_count: rows.length, status: 'completed', file_url: null })
        if (auditError) throw auditError
        await client.from('workspace_notifications').insert({ user_id: job.user_id, title: 'Exportação concluída', message: `Sua exportação de ${job.entity_type} está pronta para download.`, type: 'success', category: 'exports', action_url: '/pedidos' })
        jobLog.info('processing_job_ok', { record_count: rows.length })
        results.push({ id: job.id, status: 'completed' })
      } catch (error) {
        const message = errorMessage(error)
        jobLog.error('processing_job_failed', { err: message })
        await client.from('export_jobs').update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'processing')
        results.push({ id: job.id, status: 'failed', error: message })
      }
    }
    return log.respond(new Response(JSON.stringify({ processed: results.length, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }))
  } catch (error) {
    const message = errorMessage(error)
    log.error('export_batch_failed', { err: message })
    return log.respond(new Response(JSON.stringify({ error: 'exportacao_indisponivel' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }))
  }
})
