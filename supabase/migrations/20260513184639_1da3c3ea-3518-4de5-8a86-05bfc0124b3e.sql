-- Create secondary bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('personalization-images-secondary', 'personalization-images-secondary', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for parity
CREATE POLICY "Public Access Secondary" ON storage.objects
FOR SELECT USING (bucket_id = 'personalization-images-secondary');

CREATE POLICY "Authenticated Upload Secondary" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'personalization-images-secondary' AND auth.role() = 'authenticated');
