-- Table for storing test results
CREATE TABLE IF NOT EXISTS public.test_suites_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_type TEXT NOT NULL, -- 'webhook-sim', 'load-test', 'fuzzing'
    results JSONB NOT NULL,
    metadata JSONB,
    executed_at TIMESTAMPTZ DEFAULT now()
);

GRANT ALL ON public.test_suites_runs TO service_role;
GRANT SELECT ON public.test_suites_runs TO authenticated;

-- Ensure RLS
ALTER TABLE public.test_suites_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage test results" 
ON public.test_suites_runs 
USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));
