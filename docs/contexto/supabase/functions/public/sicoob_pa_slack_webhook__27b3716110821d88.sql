CREATE OR REPLACE FUNCTION public.sicoob_pa_slack_webhook(p_pa_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_url text;
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Somente a administracao consulta o webhook do Slack.';
  END IF;

  -- O segredo so sai do banco para sessao com segundo fator concluido, como
  -- ja ocorre em sicoob_centrais: a RPC e SECURITY DEFINER e nao herda o
  -- filtro de policy, entao a exigencia precisa estar aqui.
  IF COALESCE((SELECT auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Conclua a verificacao em duas etapas para consultar o webhook do Slack.';
  END IF;

  SELECT s.webhook_url INTO v_url
    FROM public.pa_notification_settings s
   WHERE s.pa_id = p_pa_id
     AND s.channel = 'slack'
   LIMIT 1;

  RETURN v_url;
END;
$function$
