-- Drop function first to change return type
DROP FUNCTION IF EXISTS public.cleanup_test_auth_orphans(uuid[]);

-- Tabela para registro de execuções de teste
CREATE TABLE IF NOT EXISTS public.qa_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    finished_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'running', -- running, success, failure
    persona TEXT,
    scenario TEXT,
    report JSONB DEFAULT '{}'::jsonb,
    error TEXT,
    executed_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.qa_runs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Apenas administradores podem ver execuções de QA"
ON public.qa_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev'));

CREATE POLICY "Apenas administradores podem inserir execuções de QA"
ON public.qa_runs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'dev'));

-- RPC para limpeza de órfãos
CREATE OR REPLACE FUNCTION public.cleanup_test_auth_orphans(test_ids uuid[])
RETURNS TABLE(deleted_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    WITH deleted_users AS (
        DELETE FROM auth.users
        WHERE id = ANY(test_ids)
        RETURNING id, users.email
    )
    SELECT id, deleted_users.email FROM deleted_users;
END;
$$;

-- Revogar execução pública da RPC
REVOKE EXECUTE ON FUNCTION public.cleanup_test_auth_orphans(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.cleanup_test_auth_orphans(uuid[]) TO service_role;
