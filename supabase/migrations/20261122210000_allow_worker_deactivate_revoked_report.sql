-- EDG-24: o worker desativa o agendamento quando o dono perdeu o papel. O
-- trigger `trg_validate_report_email` compara `email_to` com o perfil em todo
-- UPDATE e barrava essa desativação quando o e-mail também tinha mudado — o
-- agendamento ficava ativo, vencido e travando o lote.
--
-- A validação de e-mail só faz sentido quando o e-mail é escrito: em um UPDATE
-- que não toca `email_to` ela não tem o que verificar.

CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.email_to IS NOT DISTINCT FROM OLD.email_to THEN
    RETURN NEW;
  END IF;

  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_email IS NULL OR NEW.email_to != user_email THEN
    RAISE EXCEPTION 'email_to must match your registered email address';
  END IF;

  RETURN NEW;
END;
$$;

-- Rollback: restaura a versão de 20260404171222 (sem o curto-circuito).
CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_email IS NULL OR NEW.email_to != user_email THEN
    RAISE EXCEPTION 'email_to must match your registered email address';
  END IF;

  RETURN NEW;
END;
$$;
