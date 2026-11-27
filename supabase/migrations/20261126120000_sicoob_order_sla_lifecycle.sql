-- SIC-043: o prazo de SLA do pedido parou de existir quando o gatilho histórico
-- `trigger_sicoob_order_flow_intelligence` foi removido em
-- 20260912120000_sicoob_approval_policy_guards.sql:340 — ele reescrevia `status`
-- e furava as guardas formais de aprovação. A remoção estava correta, mas levou
-- junto o efeito colateral que definia `sla_deadline`; sem prazo,
-- `check_order_sla` nunca saiu de 'normal' e o painel passou a anunciar
-- "Todos SLAs em conformidade" mesmo com pedido parado há dias.
--
-- Aqui o prazo volta a ser definido sem tocar em `status`.

CREATE OR REPLACE FUNCTION public.set_sicoob_order_sla_deadline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_entrou_em_aprovacao boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_entrou_em_aprovacao := NEW.status IN ('waiting_approval', 'escalated_to_board');
  ELSE
    v_entrou_em_aprovacao := NEW.status IN ('waiting_approval', 'escalated_to_board')
      AND OLD.status IS DISTINCT FROM NEW.status;
  END IF;

  IF v_entrou_em_aprovacao THEN
    NEW.sla_deadline := now() + interval '48 hours';
    NEW.sla_status := 'normal';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_sicoob_order_sla_deadline() FROM PUBLIC, anon, authenticated;

-- Fica antes de `trigger_check_order_sla` na ordem alfabética dos gatilhos BEFORE,
-- que recalcula `sla_status` a partir do prazo recém-definido.
DROP TRIGGER IF EXISTS set_sicoob_order_sla_deadline ON public.sicoob_orders;
CREATE TRIGGER set_sicoob_order_sla_deadline
BEFORE INSERT OR UPDATE OF status ON public.sicoob_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_sicoob_order_sla_deadline();

-- O limiar de 'warning' era de 2 h restantes, ou seja ~96% de um ciclo de 48 h.
-- A regra documentada (docs/execucao/lacunas-funcionalidades-2026-10-11/
-- 09-fluxos-sicoob.md) é avisar a 80% do prazo consumido, o que equivale a 20%
-- de 48 h restantes = 9 h 36 min. `check_order_sla` (usado em toda escrita) e a
-- rotina de recálculo precisam do mesmo limiar, senão a próxima alteração do
-- pedido rebaixa para 'normal' o que o recálculo marcou como 'warning'.
CREATE OR REPLACE FUNCTION public.check_order_sla()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.sla_deadline IS NOT NULL THEN
    IF NEW.sla_deadline < now() THEN
      NEW.sla_status := 'critical';
    ELSIF NEW.sla_deadline < now() + interval '9 hours 36 minutes' THEN
      NEW.sla_status := 'warning';
    ELSE
      NEW.sla_status := 'normal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- `sla_status` só era recalculado quando alguém escrevia no pedido: um pedido
-- parado continuava 'normal' até a próxima alteração. A rotina abaixo recalcula
-- o estado real dos pedidos em fluxo para o painel de alertas.
CREATE OR REPLACE FUNCTION public.refresh_sicoob_order_sla_status()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  UPDATE public.sicoob_orders o
     SET sla_status = a.novo_status
    FROM alvo a
   WHERE o.id = a.id
     AND o.sla_status IS DISTINCT FROM a.novo_status;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_sicoob_order_sla_status() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_sicoob_order_sla_status() TO service_role;

-- Pedidos que já estão em fluxo não têm prazo nenhum no banco; o prazo mais
-- antigo possível é a criação do pedido, então quem está parado aparece como
-- vencido de verdade em vez de seguir apresentado como "em conformidade".
--
-- `sla_status` entra na lista de SET mesmo já sendo recalculado por
-- `check_order_sla`: o gatilho canônico de eventos
-- (`tr_record_sicoob_order_status_event`, AFTER UPDATE OF status, sla_status em
-- 20260912110000_sicoob_order_status_events.sql) só dispara quando a coluna
-- consta no UPDATE. Sem isso o pedido vira crítico em silêncio e o solicitante
-- nunca recebe o aviso de SLA.
UPDATE public.sicoob_orders
   SET sla_deadline = created_at + interval '48 hours',
       sla_status = sla_status
 WHERE sla_deadline IS NULL
   AND status IN ('waiting_approval', 'escalated_to_board');

SELECT public.refresh_sicoob_order_sla_status();

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
      FROM cron.job
     WHERE jobname = 'sicoob-refresh-order-sla';

    PERFORM cron.schedule(
      'sicoob-refresh-order-sla',
      '*/15 * * * *',
      $cron$SELECT public.refresh_sicoob_order_sla_status();$cron$
    );
  END IF;
END
$block$;
