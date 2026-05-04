-- Cria a tabela de arquivo com a mesma estrutura
CREATE TABLE IF NOT EXISTS public.admin_audit_log_archive (
    LIKE public.admin_audit_log INCLUDING ALL
);

-- Habilita RLS no arquivo também
ALTER TABLE public.admin_audit_log_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view admin audit archive" ON public.admin_audit_log_archive FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Função para realizar o arquivamento
CREATE OR REPLACE FUNCTION public.archive_old_admin_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    moved_count integer;
    cutoff_date timestamp with time zone;
BEGIN
    cutoff_date := now() - interval '24 months';
    
    -- Insere no arquivo
    WITH moved_rows AS (
        DELETE FROM public.admin_audit_log
        WHERE created_at < cutoff_date
        RETURNING *
    )
    INSERT INTO public.admin_audit_log_archive
    SELECT * FROM moved_rows;
    
    GET DIAGNOSTICS moved_count = ROW_COUNT;
    
    RETURN moved_count;
END;
$$;
