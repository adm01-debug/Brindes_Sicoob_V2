-- Reconciliação 16/09/2026 — restaura o gatilho que cria profile +
-- user_role padrão em todo novo cadastro. A função handle_new_user()
-- já existia, mas o gatilho em auth.users tinha sido perdido em algum
-- momento — todo cadastro desde então ficou sem perfil (achado durante
-- a investigação de 3 usuários órfãos, incluindo a conta operacional).
-- Registrado aqui como documentação as-built (já executado via SQL Editor).

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
