CREATE OR REPLACE FUNCTION public.sicoob_pa_notification_settings_set(p_pa_id uuid, p_channel text, p_webhook_url text DEFAULT NULL::text, p_recipient_email text DEFAULT NULL::text, p_is_active boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.is_supervisor_or_above(auth.uid()) THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Somente a administracao grava as configuracoes de notificacao.';
  END IF;

  -- Mesma exigencia de segundo fator da leitura do segredo.
  IF COALESCE((SELECT auth.jwt()) ->> 'aal', 'aal1') <> 'aal2' THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='Conclua a verificacao em duas etapas para alterar as configuracoes de notificacao.';
  END IF;

  IF p_channel NOT IN ('slack', 'email') THEN
    RAISE EXCEPTION USING ERRCODE='22023',
      MESSAGE='Canal de notificacao invalido: use slack ou email.';
  END IF;

  IF p_pa_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.postos_atendimento pa WHERE pa.id = p_pa_id) THEN
    RAISE EXCEPTION USING ERRCODE='23503',
      MESSAGE='PA inexistente para a configuracao de notificacao.';
  END IF;

  INSERT INTO public.pa_notification_settings (pa_id, channel, webhook_url, recipient_email, is_active)
  VALUES (p_pa_id, p_channel, p_webhook_url, p_recipient_email, COALESCE(p_is_active, false))
  ON CONFLICT (pa_id, channel) DO UPDATE
    -- Preservar o que nao veio no payload: o navegador manda so o campo alterado
    -- (ligar/desligar o canal nao pode apagar o destino ja gravado). NULL = "nao
    -- mexer"; string vazia = "limpar".
    SET webhook_url = COALESCE(EXCLUDED.webhook_url, public.pa_notification_settings.webhook_url),
        recipient_email = COALESCE(EXCLUDED.recipient_email, public.pa_notification_settings.recipient_email),
        is_active = COALESCE(p_is_active, public.pa_notification_settings.is_active);
END;
$function$
