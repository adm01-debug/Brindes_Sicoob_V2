CREATE TABLE IF NOT EXISTS public.qa_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.qa_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admin e dev visualizam qa_releases" ON public.qa_releases FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Apenas admin e dev inserem qa_releases" ON public.qa_releases FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'dev'));

CREATE TABLE IF NOT EXISTS public.qa_release_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id UUID REFERENCES public.qa_releases(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.qa_release_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admin e dev visualizam qa_release_evidences" ON public.qa_release_evidences FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
CREATE POLICY "Apenas admin e dev inserem qa_release_evidences" ON public.qa_release_evidences FOR INSERT WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'dev'));

-- Bucket de storage para evidências (se não existir via Admin UI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qa-evidences', 'qa-evidences', true) ON CONFLICT (id) DO NOTHING;
