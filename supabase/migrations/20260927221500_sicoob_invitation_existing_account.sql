-- O portal usa contas administradas. Impede links sem destinatário capaz de
-- autenticar; a conta deve ser criada no fluxo de usuários antes do vínculo.

CREATE OR REPLACE FUNCTION public.require_sicoob_invitation_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE lower(u.email) = NEW.email
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23503',
      MESSAGE = 'Crie a conta do usuário antes de emitir o convite institucional.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_sicoob_invitation_existing_account
  BEFORE INSERT ON public.sicoob_invitations
  FOR EACH ROW EXECUTE FUNCTION public.require_sicoob_invitation_account();

REVOKE ALL ON FUNCTION public.require_sicoob_invitation_account()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.require_sicoob_invitation_account() IS
'Recusa convite institucional para email sem conta administrada no Auth.';
