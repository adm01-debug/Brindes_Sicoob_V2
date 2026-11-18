-- Reconciliação 16/09/2026 — Etapa 26. Achado real e ao vivo: useAuditLog.ts
-- (src/hooks/admin/useAuditLog.ts) é chamado por useProductRegistration.ts,
-- usado por ProductRegistrationForm.tsx, roteada em /admin/cadastros
-- (src/routes/config/admin.ts → ProductRegistrationPage). Toda vez que um
-- produto é registrado/editado, o app tenta gravar em audit_log -- tabela
-- que nunca existiu. Falha silenciosa (console.error, não bloqueia o save
-- do produto) -- por isso não foi percebido como quebrado, mas o rastro de
-- auditoria de cadastro de produtos nunca foi gravado.
--
-- Não redirecionado para admin_audit_log (existe, mas schema incompatível:
-- colunas old_values/new_values separadas vs details/payload_summary, e
-- admin_audit_log tem cadeia de hash tamper-evident previous_hash/
-- current_hash que não deve receber INSERT direto de client comum).

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at desc);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode registrar sua própria ação (é o que o código já
-- faz -- logAction sempre roda como o usuário logado que fez a alteração).
DROP POLICY IF EXISTS "authenticated_registra_propria_acao" ON public.audit_log;
CREATE POLICY "authenticated_registra_propria_acao" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Leitura restrita a admin/dev, mesmo padrão do admin_audit_log.
DROP POLICY IF EXISTS "admin_le_audit_log" ON public.audit_log;
CREATE POLICY "admin_le_audit_log" ON public.audit_log
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

REVOKE TRUNCATE ON public.audit_log FROM anon, authenticated;
