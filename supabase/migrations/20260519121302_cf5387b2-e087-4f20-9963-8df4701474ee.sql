-- 1. Ensure sicoob_centrais exists (should already exist based on UI)
-- and add relationship to cooperativas

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooperativas' AND column_name = 'central_id') THEN
        ALTER TABLE public.cooperativas ADD COLUMN central_id UUID REFERENCES public.sicoob_centrais(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooperativas' AND column_name = 'alcada_superior_threshold') THEN
        ALTER TABLE public.cooperativas ADD COLUMN alcada_superior_threshold NUMERIC(15,2) DEFAULT 50000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooperativas' AND column_name = 'sicoob_tema_id') THEN
        ALTER TABLE public.cooperativas ADD COLUMN sicoob_tema_id UUID REFERENCES public.sicoob_temas(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cooperativas' AND column_name = 'is_active') THEN
        ALTER TABLE public.cooperativas ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 2. Add localization columns to postos_atendimento
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postos_atendimento' AND column_name = 'endereco') THEN
        ALTER TABLE public.postos_atendimento ADD COLUMN endereco TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postos_atendimento' AND column_name = 'cidade') THEN
        ALTER TABLE public.postos_atendimento ADD COLUMN cidade TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postos_atendimento' AND column_name = 'uf') THEN
        ALTER TABLE public.postos_atendimento ADD COLUMN uf CHAR(2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'postos_atendimento' AND column_name = 'is_active') THEN
        ALTER TABLE public.postos_atendimento ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 3. Update approval requests to track levels
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sicoob_approval_requests' AND column_name = 'metadata') THEN
        ALTER TABLE public.sicoob_approval_requests ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 4. Audit Log function for Sicoob Operations
CREATE OR REPLACE FUNCTION public.log_sicoob_admin_action()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.admin_audit_log (
        action,
        resource_type,
        resource_id,
        user_id,
        details
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        auth.uid(),
        jsonb_build_object('old', OLD, 'new', NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach triggers if they don't exist
DROP TRIGGER IF EXISTS tr_audit_cooperativas ON public.cooperativas;
CREATE TRIGGER tr_audit_cooperativas
AFTER INSERT OR UPDATE OR DELETE ON public.cooperativas
FOR EACH ROW EXECUTE FUNCTION public.log_sicoob_admin_action();

DROP TRIGGER IF EXISTS tr_audit_pas ON public.postos_atendimento;
CREATE TRIGGER tr_audit_pas
AFTER INSERT OR UPDATE OR DELETE ON public.postos_atendimento
FOR EACH ROW EXECUTE FUNCTION public.log_sicoob_admin_action();

-- 6. Ensure RLS is sane for administrators (Supervisors/Admins)
-- Note: Assuming roles are 'admin', 'supervisor', 'gestor_singular', 'gestor_pa', 'vendedor'

-- Grant full access to supervisors on Sicoob hierarchy
CREATE POLICY "Supervisors can manage cooperativas" 
ON public.cooperativas 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

CREATE POLICY "Supervisors can manage postos_atendimento" 
ON public.postos_atendimento 
FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
);

-- Profiles sync (vínculos)
CREATE POLICY "Supervisors can update user assignments" 
ON public.profiles 
FOR UPDATE 
USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'supervisor'))
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'supervisor'))
);