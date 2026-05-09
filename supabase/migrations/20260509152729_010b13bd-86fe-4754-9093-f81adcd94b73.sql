INSERT INTO storage.buckets (id, name, public) 
VALUES ('proposals', 'proposals', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for 'proposals' bucket
CREATE POLICY "Public Access to Proposals"
ON storage.objects FOR SELECT
USING (bucket_id = 'proposals');

CREATE POLICY "Authenticated users can upload proposals"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'proposals');

CREATE POLICY "Authenticated users can delete proposals"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'proposals');