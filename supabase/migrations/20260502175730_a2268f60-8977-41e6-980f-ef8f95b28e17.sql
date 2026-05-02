-- Create storage bucket for order documents if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-documents', 'order-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for order-documents
CREATE POLICY "Public access to order documents" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'order-documents');

CREATE POLICY "Authenticated users can upload order documents" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'order-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their order documents" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'order-documents' AND auth.role() = 'authenticated');
