CREATE OR REPLACE FUNCTION public.refresh_sicoob_order_sla_status()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  WITH alvo AS (
    SELECT id,
           CASE
             -- Pedido já aprovado/concluído não tem mais prazo: continua no
             -- recorte de status abaixo por ser histórico, mas não pode voltar
             -- a entrar em 'critical' e reaparecer na faixa vermelha do painel.
             WHEN status::text NOT IN ('pending', 'waiting_approval', 'escalated_to_board') THEN 'normal'
             WHEN sla_deadline < now() THEN 'critical'
             WHEN sla_deadline < now() + interval '9 hours 36 minutes' THEN 'warning'
             ELSE 'normal'
           END AS novo_status
      FROM public.sicoob_orders
     WHERE sla_deadline IS NOT NULL
       AND (status IN ('pending', 'waiting_approval', 'escalated_to_board')
            OR sla_status IN ('critical', 'warning'))
  )
  -- O gatilho `check_order_sla` roda no BEFORE deste UPDATE e, com o prazo
  -- ainda vencido, regravaria 'critical' em cima do 'normal'. Ele agora ignora
  -- status fora do fluxo, então basta gravar o estado real do prazo.
  --
  -- O encerramento histórico NÃO é fabricado aqui: `sla_closed_*` só é escrito
  -- pelo gatilho `close_sicoob_order_sla`, que vê a transição real. Preencher
  -- na rotina carimbava 'approved' com atraso em pedido recusado ou decidido
  -- dentro do prazo, usando a data da execução como data da decisão.
  UPDATE public.sicoob_orders o
     SET sla_status = a.novo_status
    FROM alvo a
   WHERE o.id = a.id
     AND o.sla_status IS DISTINCT FROM a.novo_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$
