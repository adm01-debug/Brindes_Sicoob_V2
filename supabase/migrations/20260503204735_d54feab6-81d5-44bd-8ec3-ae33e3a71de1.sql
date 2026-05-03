-- Table for Releases
CREATE TABLE IF NOT EXISTS public.qa_releases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_tag TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'testing', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE
);

-- Table for Evidences
CREATE TABLE IF NOT EXISTS public.qa_release_evidences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id UUID REFERENCES public.qa_releases(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Granular steps for QA Runs
CREATE TABLE IF NOT EXISTS public.qa_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.qa_runs(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'blocked', 'skipped')),
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qa_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_release_evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_run_steps ENABLE ROW LEVEL SECURITY;

-- Policies (Admin only for now)
CREATE POLICY "Admins can manage QA releases" ON public.qa_releases FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))
);

CREATE POLICY "Admins can manage QA evidences" ON public.qa_release_evidences FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))
);

CREATE POLICY "Admins can manage QA steps" ON public.qa_run_steps FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))
);

-- Storage bucket for QA evidences
INSERT INTO storage.buckets (id, name, public) VALUES ('qa-evidences', 'qa-evidences', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Anyone can view QA evidences" ON storage.objects FOR SELECT USING (bucket_id = 'qa-evidences');
CREATE POLICY "Admins can upload QA evidences" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'qa-evidences' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'diretoria'))
);
