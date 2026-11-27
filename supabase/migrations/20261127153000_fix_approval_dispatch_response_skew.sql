-- Corrige a correlação entre o disparo do worker e a resposta do pg_net.
--
-- Causa: o CTE `response_matches` exigia `r.created >= d.requested_at`. O pg_net
-- grava `net._http_response.created` com resolução distinta da usada em
-- `dispatches.requested_at`, e em ~0,5% dos casos a resposta aparece alguns
-- milissegundos ANTES do timestamp do disparo (medido em produção: -1 ms e
-- -2 ms). A resposta existia, era descartada pelo JOIN e o registro virava
-- 'timed_out' em 120 s exatos — 120 a 180 timeouts/dia contínuos.
--
-- Correção: aceitar resposta até 5 s antes do disparo. O disparo anterior mais
-- próximo nunca fica a menos de 60 s (cron de 1 minuto), então a janela não
-- correla a resposta com o disparo errado, e o DISTINCT ON por id continua
-- escolhendo o disparo mais recente quando o request_id for reciclado.
--
-- A condição de timeout de 2 minutos passa a ser comparada com `>` (e não com
-- `<` do corte) para não marcar como morto o registro que venceu no mesmo
-- instante em que a resposta chegou.

DO $patch$
DECLARE
  v_definition text;
  v_old text := $old$
      ON d.request_id=r.id AND d.state='queued' AND r.created>=d.requested_at$old$;
  v_new text := $new$
      ON d.request_id=r.id AND d.state='queued'
        AND r.created >= d.requested_at - interval '5 seconds'$new$;
BEGIN
  SELECT p.prosrc INTO v_definition
  FROM pg_proc p
  WHERE p.pronamespace='public'::regnamespace
    AND p.proname='monitor_sicoob_approval_worker'
    AND p.pronargs=0;
  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'monitor_sicoob_approval_worker() não existe';
  END IF;
  IF position(v_old IN v_definition) = 0 THEN
    IF position(v_new IN v_definition) > 0 THEN
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
    replace(v_definition, v_old, v_new)
  );
END;
$patch$;

-- Os despachos que têm resposta no pg_net e foram marcados como 'timed_out'
-- sem que ela fosse vista podem ser reconciliados agora.
WITH response_matches AS (
  SELECT DISTINCT ON (r.id)
    d.id AS dispatch_id, r.status_code, r.error_msg, r.content, r.timed_out, r.created
  FROM net._http_response r
  JOIN public.sicoob_approval_worker_dispatches d
    ON d.request_id=r.id
   AND d.state='timed_out'
   AND r.created >= d.requested_at - interval '5 seconds'
   AND r.created <= d.requested_at + interval '2 minutes'
  ORDER BY r.id, d.requested_at DESC, r.created ASC, d.id DESC,
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
