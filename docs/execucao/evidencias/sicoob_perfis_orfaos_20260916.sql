-- ============================================================
-- APLICAR NO SUPABASE SQL EDITOR — projeto cfmzkthhgliqelozlmwu
-- Etapa 33: restaura o gatilho de criacao de perfil + corrige os
-- 3 usuarios que ficaram sem perfil (inclusive sua propria conta)
-- Gerado em 16/09/2026
-- ============================================================
BEGIN;

-- 1) Restaura o gatilho que cria profile + user_role padrao em
--    todo novo cadastro. Sem ele, ninguem que se cadastrar a
--    partir de agora teria perfil (mesmo bug que gerou os 3 orfaos).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Backfill dos 3 usuarios ja existentes sem perfil
INSERT INTO public.profiles (user_id, email, full_name)
VALUES
  ('6b6ffb10-1eab-450b-9da0-e11ebb9747b5', 'ti@promobrindes.com.br', ''),
  ('cc0434d3-4bb1-4245-81c0-e4503a47fbaa', 'qa+gerente@sicoob.test', ''),
  ('bb8c4047-a519-456c-905a-13d957f924f5', 'qa+gestor@sicoob.test', '')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('6b6ffb10-1eab-450b-9da0-e11ebb9747b5', 'admin'),
  ('cc0434d3-4bb1-4245-81c0-e4503a47fbaa', 'gerente_pa'),
  ('bb8c4047-a519-456c-905a-13d957f924f5', 'gestor_compras')
ON CONFLICT (user_id, role) DO NOTHING;

COMMIT;

-- ============================================================
-- VERIFICACAO — rode depois do COMMIT acima
-- ============================================================
select tgname, tgenabled from pg_trigger
where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created';

select u.email, p.full_name is not null as tem_perfil, ur.role
from auth.users u
left join public.profiles p on p.user_id = u.id
left join public.user_roles ur on ur.user_id = u.id
where u.email in ('ti@promobrindes.com.br','qa+gerente@sicoob.test','qa+gestor@sicoob.test')
order by 1;
