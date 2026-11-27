-- O worker de aprovacoes responde 200 {"processed":0} mesmo quando nao ha
-- nada na fila, mas o cron dispara a cada minuto e o pg_net nem sempre
-- observa a resposta dentro dos dois minutos. O monitor classificava esses
-- despachos vazios como falha, deixando healthy=false de forma permanente
-- (134 "falhas" por dia em 27/11/2026) e escondendo falha real no ruido.
--
-- Correcao: despacho sem trabalho pendente nao conta como falha. O estado
-- continua registrado; muda apenas a agregacao usada pelo painel de saude.
DO $patch$
DECLARE
  v_definition text;
  v_old_filter text := $old_filter$
  SELECT count(*) FILTER (WHERE state IN ('failed','timed_out')),
         count(*) FILTER (WHERE state='queued'),$old_filter$;
  v_new_filter text := $new_filter$
  SELECT count(*) FILTER (
           WHERE state='failed'
              OR (state='timed_out' AND completed_at > clock_timestamp()-interval '24 hours'
                  AND EXISTS (SELECT 1 FROM public.sicoob_approval_deliveries dl
                              WHERE dl.state IN ('pending','retry','uncertain')
                                AND dl.available_at <= clock_timestamp()))),
         count(*) FILTER (WHERE state='queued'),$new_filter$;
BEGIN
  SELECT pg_get_functiondef(oid) INTO v_definition
  FROM pg_proc WHERE proname='monitor_sicoob_approval_worker';

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'monitor_sicoob_approval_worker nao existe';
  END IF;

  IF position(v_new_filter IN v_definition) > 0 THEN
    RAISE NOTICE 'monitor_sicoob_approval_worker ja possui a agregacao corrigida';
    RETURN;
  END IF;

  IF position(v_old_filter IN v_definition) = 0 THEN
    RAISE EXCEPTION 'monitor_sicoob_approval_worker divergiu do formato esperado; correcao nao aplicada';
  END IF;

  EXECUTE replace(v_definition, v_old_filter, v_new_filter);
END;
$patch$;

COMMENT ON TABLE public.sicoob_approval_worker_dispatches IS
  'Despachos do worker de aprovacoes. timed_out de despacho sem entrega pendente e perda de resposta do pg_net, nao falha de entrega.';