-- Corrige a correlação entre o disparo do worker e a resposta do pg_net.
--
-- Causa: o CTE `response_matches` exige `r.created >= d.requested_at`. O pg_net
-- grava `net._http_response.created` com resolução distinta da usada em
-- `dispatches.requested_at`, e em ~0,5% dos casos a resposta aparece alguns
-- milissegundos ANTES do timestamp do disparo (medido em produção: -1 ms e
-- -2 ms). A resposta existe, é descartada pelo JOIN e o registro vira
-- 'timed_out' 2 minutos depois — 120 a 180 timeouts/dia, ~8% dos disparos.
--
-- Correção: aceitar resposta até 5 s antes do disparo. O disparo anterior mais
-- próximo está a mais de 60 s (cron de 1 minuto), então a janela não correla a
-- resposta com o disparo errado; o DISTINCT ON por id continua escolhendo o
-- disparo mais recente quando o request_id for reciclado.
--
-- Reversão: reaplicar 20261015102000_fix_pg_net_recycled_request_ids.sql.
-- O backfill abaixo é forward-only: ele grava estado, código, mensagem e hora
-- que já existiam em net._http_response. Para desfazê-lo, reaplicar a migration
-- anterior e então rodar, para os disparos alterados,
--   UPDATE public.sicoob_approval_worker_dispatches SET
--     state='timed_out', status_code=NULL, error_message=NULL, completed_at=NULL
--   WHERE id IN (<ids>);   -- ids devolvidos pelo RETURNING do passo de backfill.

DO $patch$
DECLARE
  v_definition text;
  v_old_response text := $old_response$
      ON d.request_id=r.id AND d.state='queued' AND r.created>=d.requested_at$old_response$;
  v_new_response text := $new_response$
      ON d.request_id=r.id AND d.state='queued'
        AND r.created >= d.requested_at - interval '5 seconds'$new_response$;
BEGIN
  SELECT p.prosrc INTO v_definition
  FROM pg_proc p
  WHERE p.pronamespace='public'::regnamespace
    AND p.proname='monitor_sicoob_approval_worker'
    AND p.pronargs=0;
  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'monitor_sicoob_approval_worker() não existe';
  END IF;
  IF position(v_old_response IN v_definition) = 0 THEN
    IF position(v_new_response IN v_definition) > 0 THEN
      RAISE NOTICE 'Correção já aplicada';
      RETURN;
    END IF;
    RAISE EXCEPTION 'Definição inesperada de monitor_sicoob_approval_worker(): trecho não encontrado';
  END IF;

  -- prosrc é só o corpo; recria a função com a mesma assinatura e as mesmas
  -- propriedades de segurança da versão vigente.
  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.monitor_sicoob_approval_worker() '
    'RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog,public,net AS %L',
    replace(v_definition, v_old_response, v_new_response)
  );
END;
$patch$;

-- Backfill forward-only dos despachos que têm resposta no pg_net mas foram
-- marcados como 'timed_out' sem que ela fosse vista.
--
-- Reaproveitar a resposta de um timeout é ambíguo quando o request_id foi
-- reciclado: a resposta pode pertencer a um disparo mais novo. Por isso só são
-- recuperados os despachos em que a resposta é atribuível — ou seja, quando não
-- existe nenhum outro disparo com o mesmo request_id depois dele.
WITH candidatos AS (
  SELECT d.id, d.request_id, d.requested_at
  FROM public.sicoob_approval_worker_dispatches d
  WHERE d.state='timed_out'
    AND d.request_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM net._http_response r WHERE r.id=d.request_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.sicoob_approval_worker_dispatches novo
      WHERE novo.request_id=d.request_id
        AND novo.requested_at>d.requested_at
    )
), response_matches AS (
  SELECT DISTINCT ON (c.id)
    c.id AS dispatch_id, r.status_code, r.error_msg, r.content, r.timed_out, r.created
  FROM candidatos c
  JOIN net._http_response r ON r.id=c.request_id
  WHERE r.created >= c.requested_at - interval '5 seconds'
    AND r.created <= c.requested_at + interval '2 minutes'
  ORDER BY c.id, r.created ASC,
    r.status_code NULLS FIRST, r.error_msg NULLS FIRST, r.content NULLS FIRST
)
UPDATE public.sicoob_approval_worker_dispatches d SET
  state=CASE WHEN r.timed_out IS TRUE THEN 'timed_out'
    WHEN r.error_msg IS NOT NULL OR r.status_code NOT BETWEEN 200 AND 299 THEN 'failed'
    ELSE 'succeeded' END,
  status_code=r.status_code,
  error_message=left(COALESCE(r.error_msg,r.content),1000),
  completed_at=r.created
FROM response_matches r
WHERE d.id=r.dispatch_id;
