-- Reconciliação 16/09/2026 — Etapa 26. Achado real e ao vivo: a página
-- /auth ("esqueci minha senha", roteada em src/routes/config/public.ts)
-- chama usePasswordResetRequests().createRequest(), que faz INSERT em
-- password_reset_requests -- tabela que nunca existiu. Todo usuário
-- tentando recuperar senha recebia erro de banco (silencioso, sem toast de
-- erro explícito no fluxo de submit, mas a solicitação nunca era salva).
-- Schema derivado do uso real em src/hooks/usePasswordResetRequests.ts.

CREATE TABLE IF NOT EXISTS public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewer_notes text
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email_status
  ON public.password_reset_requests(email, status);
CREATE INDEX IF NOT EXISTS idx_password_reset_requests_requested_at
  ON public.password_reset_requests(requested_at desc);

ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- anon (a página roda antes do login) e authenticated podem criar solicitação,
-- mas só no estado pending/não revisado -- WITH CHECK impede que um payload
-- manipulado insira já 'approved' e se auto-aprove sem revisão de admin.
DROP POLICY IF EXISTS "criar_solicitacao_pendente" ON public.password_reset_requests;
CREATE POLICY "criar_solicitacao_pendente" ON public.password_reset_requests
FOR INSERT TO anon, authenticated
WITH CHECK (status = 'pending' AND reviewed_at IS NULL AND reviewed_by IS NULL AND user_id IS NULL);

DROP POLICY IF EXISTS "admin_gerencia_solicitacoes_reset" ON public.password_reset_requests;
CREATE POLICY "admin_gerencia_solicitacoes_reset" ON public.password_reset_requests
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

REVOKE TRUNCATE ON public.password_reset_requests FROM anon, authenticated;

-- NOTA: isto corrige o crash de submissão. O lado admin (PasswordResetApproval.tsx)
-- só é importado por AdminUsuariosPage.tsx, que não está roteada em lugar
-- nenhum do app (confirmado via grep) -- ou seja, hoje não existe UI viva
-- para revisar/aprovar as solicitações que passam a ser salvas. Registrar
-- como item de produto separado (rotear a página ou construir uma nova).
