CREATE TABLE IF NOT EXISTS public.qa_run_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES public.qa_runs(id) ON DELETE CASCADE,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pass', 'fail', 'blocked')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.qa_run_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admin e dev gerenciam qa_run_steps" ON public.qa_run_steps FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'dev'));
