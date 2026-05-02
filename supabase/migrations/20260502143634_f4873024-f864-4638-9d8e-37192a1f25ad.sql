-- Add new roles to the app_role enum type
-- Note: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block in older Postgres versions, 
-- but Supabase/Postgres 15+ supports it. We do it one by one.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gestor_compras';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente_pa';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'vendedor';